import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, normalizeSettings } from '../dist/core.js';
import { hebrew, translate, dayLabel } from '../dist/i18n.js';
import { createAnswerSounds } from '../dist/sounds.js';

test('the 30-exercise default upgrades old defaults and preserves later choices', () => {
  assert.equal(createState().settings.goal, 30);
  assert.equal(normalizeSettings({ goal: 10 }).goal, 30);
  assert.equal(normalizeSettings({ goal: 20 }).goal, 20);
  const custom = normalizeSettings({ goal: 10, goalVersion: 2, questions: 30, language: 'he', effects: false, sound: true });
  assert.equal(custom.goal, 10);
  assert.equal(custom.questions, 30);
  assert.equal(custom.language, 'he');
  assert.equal(custom.effects, false);
  assert.equal(custom.sound, true);
  assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(custom))), custom);
  assert.equal(normalizeSettings(null).goal, 30);
  assert.equal(normalizeSettings({ language: '<script>', effects: 'false', goal: 300 }).language, 'en');
});

test('interface translations retain all parameters and cover literal UI labels', async () => {
  for (const [english, translation] of Object.entries(hebrew)) {
    const tokens = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    assert.deepEqual(tokens(english), tokens(translation), english);
    assert(/[\u0590-\u05ff]/.test(translation), `Missing Hebrew for ${english}`);
  }
  const app = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
  const shell = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const keys = [...app.matchAll(/\b(?:t|toast)\('([^']+)'/g)].map(m => m[1])
    .concat([...shell.matchAll(/data-i18n(?:-label)?="([^"]+)"/g)].map(m => m[1]));
  for (const key of keys) assert(Object.hasOwn(hebrew, key), `Untranslated interface label: ${key}`);
  assert.equal(translate('he', 'Question {current} of {total}', { current: 3, total: 30 }), 'שאלה 3 מתוך 30');
  assert.equal(translate('en', 'Question {current} of {total}', { current: 3, total: 30 }), 'Question 3 of 30');
  assert.equal(dayLabel('2026-09-09', 'en'), 'Wed');
  assert(/[\u0590-\u05ff]/.test(dayLabel('2026-09-09', 'he')));
});

test('answer sounds are distinct, can be muted, and tolerate unavailable audio', () => {
  const frequencies = [], oscillators = [];
  let contexts = 0, resumes = 0;
  class AudioContext {
    constructor() { contexts++; this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    resume() { resumes++; this.state = 'running'; return Promise.resolve(); }
    createOscillator() {
      const oscillator = { frequency: { setValueAtTime: n => frequencies.push(n) }, connect() {}, disconnect() {}, start() {}, stop() { this.stopped = true; this.onended?.(); } };
      oscillators.push(oscillator); return oscillator;
    }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  }
  const sounds = createAnswerSounds({ webkitAudioContext: AudioContext });
  sounds.play(true, false);
  assert.equal(contexts, 0, 'Muting must not initialize audio');
  sounds.play(true);
  assert.deepEqual(frequencies.splice(0), [523.25, 659.25, 783.99]);
  sounds.play(false);
  assert.deepEqual(frequencies.splice(0), [233.08, 174.61]);
  assert.equal(contexts, 1); assert.equal(resumes, 1);
  sounds.stop(); assert(oscillators.every(o => o.stopped));
  assert.doesNotThrow(() => createAnswerSounds({}).play(true));
  assert.doesNotThrow(() => createAnswerSounds({ AudioContext: class { constructor() { throw new Error('blocked'); } } }).play(false));
});
