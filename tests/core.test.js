import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDictionary, forPack, buildChoices, selectPairs, selectLesson, summarizeWords, wordStatus, cleanAnswers, mergeAnswers, parseCSV, toCSV, answerRecord, streakDays, weekActivity, localDay, normalizeSettings } from '../dist/core.js';

const base = [
  { en: 'house', he: 'בית' }, { en: 'home', he: 'בית' }, { en: ' Talk ', he: 'לדבר' }, { en: 'talk', he: 'דיבור' },
  { en: 'apple', he: 'תפוח' }, { en: 'water', he: 'מים' }, { en: 'sun', he: 'שמש' }, { en: 'book', he: 'ספר' },
  { en: 'tree', he: 'עץ' }, { en: 'car', he: 'מכונית' }, { en: 'get', he: 'לקבל/להשיג' }, { en: 'receive', he: 'לקבל' },
];
const words = normalizeDictionary(base, [{ en: 'TALK', he: 'לשוחח' }, { en: 'curious', he: 'סקרן' }]);
const find = id => words.find(w => w.id === id);
const rec = (id, correct, ts) => answerRecord(find(id), correct ? find(id).he : 'other', correct, 'translate', 1234, ts);

test('merges duplicate English words, retains alternate translations and source sets', () => {
  assert.deepEqual(find('talk').translations, ['לדבר', 'דיבור', 'לשוחח']);
  assert.deepEqual(find('talk').packs, ['everyday', 'stories']);
  assert.equal(forPack(words, 'stories').length, 2);
  assert.equal(words.filter(w => w.id === 'talk').length, 1);
});
test('collection tags merge across existing words without duplicating their learning identity', () => {
  const tagged = normalizeDictionary([
    { en: ' Talk ', he: 'לדבר', tags: ['whenever-wherever', 'whenever-wherever', 'unknown'] },
    { en: 'apple', he: 'תפוח' },
  ], [{ en: 'TALK', he: 'לשוחח', tags: ['whenever-wherever'] }, { en: 'word', he: 'מילה', tags: 'whenever-wherever' }]);
  const focused = forPack(tagged, 'whenever-wherever');
  assert.equal(focused.length, 1);
  assert.equal(focused[0], forPack(tagged, 'all')[0]);
  assert.deepEqual(focused[0].tags, ['whenever-wherever']);
  assert.deepEqual(focused[0].translations, ['לדבר', 'לשוחח']);
  assert.deepEqual(focused[0].packs, ['everyday', 'stories']);
  const stats = summarizeWords([rec('talk', true, '2026-09-08T12:00:00Z')]);
  assert.equal(stats.get(focused[0].id).correct, 1);
});

test('the song collection contains all 74 requested words, with Hebrew, in mixed practice too', async () => {
  const lists = await Promise.all(['dictionary.json', 'StrangerThings.json'].map(async name => JSON.parse(await readFile(new URL(`../dist/data/${name}`, import.meta.url), 'utf8'))));
  const all = normalizeDictionary(...lists), tagged = forPack(all, 'whenever-wherever');
  const requested = 'lucky born far away make fun distance love foreign land fact existence baby climb solely count freckles body imagine million ways somebody see feet whenever wherever meant together near deal dear hereunder wonder always play ear lips mumble spill kisses fountain breasts small humble confuse mountains strong legs mother run cover need eyes day leave cry river above think loud say again tell time live lost head heels nothing left fear really feel way'.split(' ');
  assert.deepEqual(tagged.map(word => word.id).sort(), requested.sort());
  assert.equal(all.length, new Set(all.map(word => word.id)).size);
  assert(tagged.every(word => /[\u0590-\u05ff]/.test(word.he)));
  assert(tagged.every(word => word.tags.includes('song')));
  assert(tagged.every(word => forPack(all, 'all').includes(word)));
  assert.equal(tagged.find(word => word.id === 'feet').he, 'כפות רגליים');
  assert.equal(tagged.find(word => word.id === 'legs').he, 'רגליים');
  assert.notEqual(tagged.find(word => word.id === 'way'), tagged.find(word => word.id === 'ways'));
});
test('song collections retain their vocabulary and Songs is the deduplicated union of all three', async () => {
  const lists = await Promise.all(['dictionary.json', 'StrangerThings.json'].map(async name => JSON.parse(await readFile(new URL(`../dist/data/${name}`, import.meta.url), 'utf8'))));
  const all = normalizeDictionary(...lists), aeroplane = forPack(all, 'aeroplane'), firstSong = forPack(all, 'whenever-wherever'), shakeItOff = forPack(all, 'shake-it-off'), songs = forPack(all, 'song');
  const expected = 'like|pleasure|spiked|pain|music|aeroplane|songbird|sweet|sour|always|looking|eyes|find|love|want|someone|better|slap|start|rust|decompose|rear-view mirror|mirror|make|disappear|fear|sitting|kitchen|girl|turning|dust|again|melancholy|baby|star|push|voice|inside|overcoming|gravity|easy|sad|note|float|away|song|wrote|lay|choke|lie|cut|throat|die'.split('|');
  assert.deepEqual(aeroplane.map(w => w.id).sort(), expected.sort());
  assert(aeroplane.every(w => w.tags.includes('song') && /[\u0590-\u05ff]/.test(w.he)));
  const union = new Set([...aeroplane, ...firstSong].map(w => w.id));
  assert.equal(union.size, 119);
  assert.equal(shakeItOff.length, 57);
  assert(shakeItOff.every(w => w.tags.includes('song') && /[\u0590-\u05ff]/.test(w.he)));
  for (const word of shakeItOff) union.add(word.id);
  assert.equal(songs.length, 166);
  assert.deepEqual(new Set(songs.map(w => w.id)), union);
  for (const word of songs) assert.equal(word, all.find(w => w.id === word.id));
  assert.equal(songs.filter(w => w.id === 'love').length, 1);
  assert.deepEqual(songs.find(w => w.id === 'love').translations, ['אהבה']);
  assert.equal(aeroplane.find(w => w.id === 'looking').he, 'מחפש', 'Existing translations stay unchanged');
  assert.equal(aeroplane.find(w => w.id === 'turning').he, 'פונה');
  for (const excluded of ['mazzy', 'must', 'fuck', "motherfucker's", 'jane', 'lord', 'i', 'and', 'my', 'the', "it's", 'just', 'one']) assert(!aeroplane.some(w => w.id === excluded));
  for (const row of lists.flat()) {
    if (row.tags?.some(tag => ['aeroplane', 'whenever-wherever', 'shake-it-off'].includes(tag))) assert(row.tags.includes('song'));
    if (expected.includes(row.en.trim().toLowerCase())) assert(row.tags.includes('aeroplane'));
    if (row.tags) assert.equal(row.tags.length, new Set(row.tags).size);
  }
});
test('choices are unique and exclude synonyms in both directions', () => {
  for (const reverse of [true, false]) {
    const choices = buildChoices(find('house'), words, 7, reverse, () => 0.4);
    assert.equal(choices.length, 7); assert.equal(new Set(choices).size, 7);
    assert(choices.includes(reverse ? 'house' : 'בית'));
    if (reverse) assert(!choices.includes('home'));
    const getChoices = buildChoices(find('get'), words, 7, reverse, () => 0.4);
    assert(!getChoices.includes(reverse ? 'receive' : 'לקבל'));
  }
});
test('small vocabulary sets return only available distinct choices without looping', () => {
  assert.deepEqual(buildChoices(find('house'), [find('house'), find('home')], 7), ['בית']);
});
test('matching never includes duplicate English prompts or Hebrew synonyms', () => {
  const pairs = selectPairs([find('house'), find('house'), find('home'), ...words], 7, () => 0.99999);
  assert.equal(pairs.length, 7);
  assert.equal(new Set(pairs.map(w => w.id)).size, 7);
  assert.equal(new Set(pairs.map(w => w.he)).size, 7);
});
test('review scheduling resets on errors and expands after consecutive correct answers', () => {
  const t = '2026-09-08T10:00:00.000Z';
  let history = [rec('apple', true, t), rec('apple', true, t), rec('apple', true, t)];
  let s = summarizeWords(history).get('apple');
  assert.equal(wordStatus(s), 'confident'); assert.equal(s.due, Date.parse(t) + 4 * 86400000);
  history.push(rec('apple', false, '2026-09-08T11:00:00.000Z'));
  s = summarizeWords(history).get('apple');
  assert.equal(wordStatus(s), 'review'); assert.equal(s.streak, 0); assert.equal(s.due, Date.parse('2026-09-08T11:00:00.000Z'));
});
test('lessons interleave due reviews and new words without repetitions', () => {
  const now = Date.parse('2026-09-08T12:00:00Z');
  const stats = summarizeWords([rec('house', false, '2026-09-08T10:00:00Z'), rec('apple', false, '2026-09-08T10:00:00Z'), rec('book', true, '2026-09-08T10:00:00Z')]);
  const lesson = selectLesson(words, stats, 7, { now, random: () => 0.4 });
  assert.equal(lesson.length, 7); assert.equal(new Set(lesson.map(w => w.id)).size, 7);
  assert(stats.has(lesson[0].id)); assert(!stats.has(lesson[2].id));
  const reviews = selectLesson(words, stats, 7, { now, reviewOnly: true });
  assert.deepEqual(reviews.map(w => w.id).sort(), ['apple', 'house']);
  assert.deepEqual(selectLesson(words, new Map(), 10, { reviewOnly: true }), []);
});
test('old CSV imports quoted Hebrew, commas, newlines and escaped quotes', () => {
  const rows = parseCSV('\uFEFFtimestamp,english,hebrew,result\r\n"2026-09-08T10:00:00Z","say, \"\"hello\"\"","שלום\nעולם","correct"\r\n');
  assert.equal(rows.length, 1); assert.equal(rows[0].en, 'say, "hello"'); assert.equal(rows[0].he, 'שלום\nעולם'); assert.equal(rows[0].correct, true);
  assert.throws(() => parseCSV('not,a,quiz'), /Emma English/);
  assert.throws(() => parseCSV('"unterminated'), /unclosed/);
});
test('CSV export round trips, preserves Hebrew, and neutralizes spreadsheet formulas', () => {
  const answers = [rec('apple', true, '2026-09-08T10:00:00.000Z'), rec('water', false, '2026-09-08T11:00:00.000Z')];
  assert.deepEqual(parseCSV(toCSV(answers)), answers);
  const output = toCSV([{ ...answers[0], en: '=HYPERLINK("https://example.com")' }]);
  assert(output.includes('"\'=HYPERLINK('));
});
test('history imports ignore malformed records and remain idempotent', () => {
  const a = rec('apple', true, '2026-09-08T10:00:00.000Z');
  const clean = cleanAnswers([a, { ...a, correct: 'false' }, { ...a, ts: 'bad' }, null]);
  assert.equal(clean.length, 1); assert.deepEqual(mergeAnswers([a], [a]), [a]);
  assert.throws(() => cleanAnswers({}), /invalid format/);
});
test('daily streak survives until the following day and stops at gaps', () => {
  const now = new Date(2026, 8, 8, 15);
  const a = date => rec('apple', true, new Date(2026, 8, date, 12).toISOString());
  assert.equal(streakDays([a(6), a(7)], now), 2);
  assert.equal(streakDays([a(6), a(7), a(8), a(8)], now), 3);
  assert.equal(streakDays([a(5), a(6)], now), 0);
  const week = weekActivity([a(7), a(8), a(8)], now);
  assert.equal(week.at(-1).day, localDay(now)); assert.equal(week.at(-1).count, 2); assert.equal(week.at(-2).count, 1);
});
test('untrusted settings cannot create empty or oversized lessons', () => {
  const settings = normalizeSettings({ questions: 0, choices: 900, rate: -1, goal: NaN, pack: 'missing', sound: 'true' });
  assert.equal(settings.questions, 10); assert.equal(settings.choices, 4); assert.equal(settings.pack, 'all'); assert.equal(settings.sound, true);
});
