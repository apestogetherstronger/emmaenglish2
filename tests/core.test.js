import test from 'node:test';
import assert from 'node:assert/strict';
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
  assert.equal(settings.questions, 10); assert.equal(settings.choices, 4); assert.equal(settings.pack, 'everyday'); assert.equal(settings.sound, true);
});
