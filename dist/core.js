import { createGame } from './game.js?v=2.2.0';
// Pure learning and data functions. No browser or network dependencies.
export const STORAGE_KEY = 'emmaenglish2:v1';
export const DEFAULT_SETTINGS = Object.freeze({ pack: 'everyday', questions: 10, choices: 4, sound: true, effects: true, language: 'en', rate: 0.85, bonus: true, goal: 30, goalVersion: 2 });
const DAY = 86400000;
export const wordId = value => String(value).trim().toLocaleLowerCase('en-US');
export const localDay = (value = new Date()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function createState() { return { version: 1, settings: { ...DEFAULT_SETTINGS }, answers: [], sessions: [], speaking: [], game: createGame(), xp: 0 }; }
export function normalizeSettings(settings = {}) {
  if (!settings || typeof settings !== 'object') settings = {};
  // Upgrade the previous ten-exercise default once; later explicit choices are retained.
  const goal = settings.goalVersion !== 2 && Number(settings.goal) === 10 ? 30 : Number(settings.goal);
  return {
    pack: ['everyday', 'stories', 'all'].includes(settings.pack) ? settings.pack : 'everyday',
    questions: [5, 10, 15, 20, 30].includes(Number(settings.questions)) ? Number(settings.questions) : 10,
    choices: [4, 7].includes(Number(settings.choices)) ? Number(settings.choices) : 4,
    sound: typeof settings.sound === 'boolean' ? settings.sound : true,
    effects: typeof settings.effects === 'boolean' ? settings.effects : true,
    language: settings.language === 'he' ? 'he' : 'en',
    rate: [0.7, 0.85, 1].includes(Number(settings.rate)) ? Number(settings.rate) : 0.85,
    bonus: typeof settings.bonus === 'boolean' ? settings.bonus : true,
    goal: [5, 10, 15, 20, 30].includes(goal) ? goal : 30,
    goalVersion: 2,
  };
}
export function normalizeDictionary(base, stories) {
  const map = new Map();
  for (const [pack, list] of [['everyday', base], ['stories', stories]]) {
    if (!Array.isArray(list)) throw new Error('A vocabulary list is not an array.');
    for (const item of list) {
      if (typeof item?.en !== 'string' || typeof item?.he !== 'string') continue;
      const en = item.en.trim(), he = item.he.trim(), id = wordId(en);
      if (!en || !he || en.length > 150 || he.length > 300) continue;
      if (!map.has(id)) map.set(id, { id, en, he, translations: [], packs: [] });
      const word = map.get(id);
      if (!word.translations.includes(he)) word.translations.push(he);
      if (!word.packs.includes(pack)) word.packs.push(pack);
    }
  }
  return [...map.values()];
}
export const forPack = (words, pack) => pack === 'all' ? words : words.filter(w => w.packs.includes(pack));
export function shuffled(values, random = Math.random) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
export function summarizeWords(answers) {
  const result = new Map();
  for (const answer of answers) {
    const id = answer.wordId || wordId(answer.en);
    const stat = result.get(id) || { attempts: 0, correct: 0, streak: 0, last: null, lastCorrect: false, due: 0 };
    stat.attempts++; stat.correct += answer.correct ? 1 : 0;
    stat.streak = answer.correct ? stat.streak + 1 : 0;
    stat.last = answer.ts; stat.lastCorrect = answer.correct;
    const days = answer.correct ? [1, 2, 4, 7, 14, 30][Math.min(stat.streak - 1, 5)] : 0;
    stat.due = Date.parse(answer.ts) + days * DAY;
    result.set(id, stat);
  }
  return result;
}
export const wordStatus = stat => !stat ? 'new' : stat.streak >= 3 ? 'confident' : !stat.lastCorrect ? 'review' : 'learning';
export function selectLesson(words, stats, count, { reviewOnly = false, now = Date.now(), random = Math.random } = {}) {
  const due = shuffled(words.filter(w => stats.has(w.id) && stats.get(w.id).due <= now), random);
  const fresh = shuffled(words.filter(w => !stats.has(w.id)), random);
  const later = shuffled(words.filter(w => stats.has(w.id) && stats.get(w.id).due > now), random);
  // Interleave due and new cards: a large review backlog must not starve new learning.
  const mixed = [];
  while (due.length || (!reviewOnly && fresh.length)) {
    if (due.length) mixed.push(due.shift());
    if (due.length) mixed.push(due.shift());
    if (!reviewOnly && fresh.length) mixed.push(fresh.shift());
  }
  return (reviewOnly ? mixed : [...mixed, ...later]).slice(0, count);
}
const hebrewParts = word => new Set(word.translations.flatMap(t => [t, ...t.split(/[/;،,]/).map(x => x.trim()).filter(Boolean)]));
const overlap = (a, b) => [...a].some(v => b.has(v));
export function buildChoices(current, words, count = 4, reverse = false, random = Math.random) {
  const correct = reverse ? current.en : current.he;
  const translations = hebrewParts(current);
  const seen = new Set([correct]);
  const choices = [correct];
  for (const word of shuffled(words, random)) {
    // Exclude synonyms/alternative translations, which otherwise produce two valid answers.
    if (word.id === current.id || overlap(translations, hebrewParts(word))) continue;
    const label = reverse ? word.en : word.he;
    if (seen.has(label)) continue;
    choices.push(label); seen.add(label);
    if (choices.length >= count) break;
  }
  return shuffled(choices, random);
}
export function selectPairs(words, count = 4, random = Math.random) {
  const selected = []; const used = new Set();
  for (const word of shuffled(words, random)) {
    const parts = hebrewParts(word);
    if (selected.some(w => w.id === word.id) || overlap(used, parts)) continue;
    selected.push(word); for (const part of parts) used.add(part);
    if (selected.length >= count) break;
  }
  return selected;
}
export function answerRecord(word, chosen, correct, mode, responseMs, ts = new Date().toISOString()) {
  return { ts, wordId: word.id, en: word.en, he: word.he, chosen, correct: Boolean(correct), mode, responseMs: Math.max(0, Math.round(responseMs)) };
}
export function cleanAnswers(answers) {
  if (!Array.isArray(answers) || answers.length > 100000) throw new Error('The answer history is too large or has an invalid format.');
  return answers.filter(a => a && typeof a.en === 'string' && a.en.trim() && a.en.length <= 150 &&
    typeof a.he === 'string' && a.he.length <= 300 && typeof a.correct === 'boolean' && Number.isFinite(Date.parse(a.ts)))
    .map(a => ({ ts: new Date(a.ts).toISOString(), wordId: wordId(a.en), en: a.en.trim(), he: a.he.trim(),
      chosen: String(a.chosen ?? a.he).slice(0, 300), correct: a.correct,
      mode: ['translate', 'reverse', 'listen'].includes(a.mode) ? a.mode : 'translate',
      responseMs: Number.isFinite(a.responseMs) ? Math.max(0, a.responseMs) : 0 }));
}
export function mergeAnswers(existing, incoming) {
  const map = new Map();
  for (const a of [...existing, ...incoming]) map.set(`${a.ts}|${a.wordId}|${a.chosen}|${a.correct}`, a);
  return [...map.values()].sort((a, b) => a.ts.localeCompare(b.ts));
}
export function parseCSV(text) {
  const rows = []; let row = [], value = '', quoted = false;
  const csv = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') { if (quoted && csv[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(value); value = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && csv[i + 1] === '\n') i++;
      row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = '';
    } else value += c;
  }
  if (quoted) throw new Error('The CSV has an unclosed quote.');
  if (value || row.length) { row.push(value); rows.push(row); }
  if (!rows.length) throw new Error('The CSV is empty.');
  const header = rows.shift().map(h => h.trim().toLowerCase());
  if (!['timestamp', 'english', 'hebrew', 'result'].every(k => header.includes(k))) throw new Error('Use an Emma English answer-history CSV.');
  const get = (r, k) => r[header.indexOf(k)];
  return cleanAnswers(rows.filter(r => ['correct', 'incorrect'].includes(get(r, 'result'))).map(r => ({
    ts: get(r, 'timestamp'), en: get(r, 'english'), he: get(r, 'hebrew'), chosen: get(r, 'chosen') ?? get(r, 'hebrew'),
    correct: get(r, 'result') === 'correct', mode: get(r, 'mode'), responseMs: Number(get(r, 'response_ms') || 0)
  })));
}
export function toCSV(answers) {
  // Quoting alone does not stop spreadsheet formula execution.
  const cell = value => { const s = String(value ?? ''); return '"' + (/^[\s]*[=+@\-\t\r]/.test(s) ? "'" : '') + s.replace(/"/g, '""') + '"'; };
  const rows = answers.map(a => [a.ts, a.en, a.he, a.correct ? 'correct' : 'incorrect', a.chosen, a.mode, a.responseMs]);
  return '\uFEFF' + [['timestamp', 'english', 'hebrew', 'result', 'chosen', 'mode', 'response_ms'].join(','), ...rows.map(r => r.map(cell).join(','))].join('\r\n');
}
export function streakDays(answers, now = new Date()) {
  const dates = new Set(answers.map(a => localDay(a.ts)));
  const date = new Date(now); date.setHours(12, 0, 0, 0);
  if (!dates.has(localDay(date))) date.setDate(date.getDate() - 1);
  let count = 0;
  while (dates.has(localDay(date))) { count++; date.setDate(date.getDate() - 1); }
  return count;
}
export function weekActivity(answers, now = new Date()) {
  const counts = new Map(); for (const a of answers) { const key = localDay(a.ts); counts.set(key, (counts.get(key) || 0) + 1); }
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (6 - i));
    return { day: localDay(d), label: d.toLocaleDateString('en', { weekday: 'short' }), count: counts.get(localDay(d)) || 0 };
  });
}
