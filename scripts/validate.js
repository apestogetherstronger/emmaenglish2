import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { normalizeDictionary, forPack, buildChoices, selectPairs, WORD_COLLECTIONS, WORD_TAGS } from '../dist/core.js';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const path of ['dist/app.js', 'dist/core.js', 'dist/game.js', 'dist/speaking.js', 'dist/vendor/avatar.js', 'dist/i18n.js', 'dist/sounds.js', 'scripts/serve.js', 'scripts/build-avatar.mjs', 'scripts/avatar-entry.js', 'scripts/validate.js']) {
  execFileSync(process.execPath, ['--check', resolve(root, path)], { stdio: 'inherit' });
  const source = await readFile(resolve(root, path), 'utf8');
  for (const match of source.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)) assert((await stat(resolve(root, path, '..', match[1].split('?')[0]))).isFile(), `Missing module ${match[1]} in ${path}`);
}
const html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) assert((await stat(resolve(root, 'dist', match[1].split('?')[0]))).isFile(), `Missing ${match[1]}`);
const css = await readFile(resolve(root, 'dist/styles.css'), 'utf8');
for (const match of css.matchAll(/url\(['"](\.\/[^'"]+)['"]\)/g)) assert((await stat(resolve(root, 'dist', match[1]))).isFile(), `Missing CSS asset ${match[1]}`);
assert((await stat(resolve(root, 'dist/vendor/avatar-LICENSE.txt'))).isFile());
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate HTML IDs');
const lists = await Promise.all(['dictionary.json', 'StrangerThings.json'].map(async name => JSON.parse(await readFile(resolve(root, 'dist/data', name), 'utf8'))));
for (const word of lists.flat()) if (word.tags !== undefined) assert(Array.isArray(word.tags) && word.tags.every(tag => WORD_TAGS.includes(tag)), `Unknown vocabulary tag for ${word.en}`);
const words = normalizeDictionary(...lists);
assert(words.length > 1000, 'Vocabulary unexpectedly small');
for (const pack of Object.keys(WORD_COLLECTIONS)) {
  const pool = forPack(words, pack);
  for (const word of pool) for (const reverse of [false, true]) for (const count of [4, 7]) {
    const options = buildChoices(word, pool, count, reverse, () => 0.5);
    assert.equal(options.length, count, `Missing options for ${word.en}`);
    assert.equal(new Set(options).size, options.length, `Duplicate choices for ${word.en}`);
    assert(options.includes(reverse ? word.en : word.he), `Correct answer missing for ${word.en}`);
  }
  const pairs = selectPairs(pool, 4, () => 0.5);
  assert.equal(pairs.length, 4);
  assert.equal(new Set(pairs.map(w => w.he)).size, 4);
}
console.log(`Validated static entrypoint, JavaScript, and 4/7-choice support across ${words.length} unique words and all ${Object.keys(WORD_COLLECTIONS).length} word collections.`);
