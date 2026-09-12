import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../dist/core.js';
import * as i18n from '../dist/i18n.js';
import * as game from '../dist/game.js';
import * as speaking from '../dist/speaking.js';
import { avatarDataUri } from '../dist/vendor/avatar.js';
import { createAnswerSounds } from '../dist/sounds.js';

// Exercise the actual application handlers with inert document/audio adapters.
// This is a state/markup smoke test, not browser or visual testing.
const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
const fixture = Array.from({ length: 40 }, (_, i) => ({ en: `word ${i}`, he: `מילה ${i}` }));
async function boot(saved = new Map(), speechHost = {}, soundFactory = createAnswerSounds) {
  const elements = new Map(), listeners = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: '', dataset: {}, style: {}, attributes: {}, addEventListener() {}, setAttribute(k, v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; }, focus() {}, querySelectorAll() { return []; }, showModal() { this.open = true; }, close() { this.open = false; } });
    return elements.get(selector);
  };
  const context = vm.createContext({
    ...core, ...i18n, ...game, ...speaking, avatarDataUri, createAnswerSounds: soundFactory, URL, performance, console,
    translate(language, key, values) {
      if (language === 'he' && /[A-Za-z]/.test(key) && !/[\u0590-\u05ff]/.test(key)) assert(Object.hasOwn(i18n.hebrew, key), `Missing dynamic translation: ${key}`);
      return i18n.translate(language, key, values);
    },
    document: { querySelector: element, querySelectorAll: () => [], documentElement: {}, body: { classList: { toggle() {} } }, addEventListener: (name, fn) => listeners.set(name, fn) },
    window: { addEventListener() {}, scrollTo() {}, matchMedia: () => ({ matches: true }), speechSynthesis: {}, SpeechSynthesisUtterance: class {}, setTimeout: () => 0, clearTimeout() {}, ...speechHost },
    speechSynthesis: { cancel() {}, getVoices: () => [], speak() {} }, SpeechSynthesisUtterance: class {},
    localStorage: { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v) },
    history: { replaceState() {} }, location: { hash: '', reload() {} },
    fetch: async () => ({ ok: true, json: async () => fixture }),
    setTimeout: () => 0, clearTimeout() {},
  });
  const app = source.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', JSON.stringify(new URL('../dist/app.js', import.meta.url).href));
  vm.runInContext(`${app}\nglobalThis.api = { actions, answer, nextQuestion, startLesson, choosePair, render, navigate, showSettings, openChest, tapDailyTreasure, closeChest, wearReward, updateAvatar, renderProfile, renderSpeaking, get state() { return state; }, get session() { return session; }, get match() { return match; }, get view() { return view; }, whenReady: () => ready };`, context);
  // Init awaits two fetches and normalization; settle it without timers or a server.
  for (let i = 0; i < 12 && !context.api.whenReady(); i++) await Promise.resolve();
  assert(context.api.whenReady());
  return { api: context.api, context, elements, saved, listeners };
}

test('treasure audio prepares before the lock, follows accepted taps, and wrong answers respect muting', async () => {
  const events = [];
  const soundFactory = () => ({ prepare: enabled => events.push(['prepare', enabled]), playTreasure: (tap, enabled) => events.push(['treasure', tap, enabled]), play: (correct, enabled) => events.push(['answer', correct, enabled]), stop() {} });
  const { api, context } = await boot(new Map(), {}, soundFactory);
  context.navigator = { locks: { async request(_name, apply) { await Promise.resolve(); return apply(); } } };
  api.state.game = game.earnDailyChest(api.state.game, core.localDay(), 30, 30);
  api.openChest();
  for (let tap = 1; tap <= 3; tap++) {
    const pending = api.tapDailyTreasure();
    assert.deepEqual(events.at(-1), ['prepare', true], 'Audio activation happens before awaiting the lock');
    await api.tapDailyTreasure(); // A second click during the lock must be ignored.
    await pending;
    assert.deepEqual(events.at(-1), ['treasure', tap, true]);
  }
  const count = events.length; await api.tapDailyTreasure();
  assert.equal(events.length, count, 'Opened chests cannot replay rewards');
  api.closeChest(); events.length = 0;
  api.startLesson();
  const incorrect = () => api.session.current.options.findIndex(option => option !== api.session.current.word.he);
  api.answer(incorrect()); api.answer(incorrect());
  assert.deepEqual(events, [['answer', false, true]], 'A wrong answer plays exactly one error sound');
  api.actions['toggle-effects'](); api.nextQuestion(); api.answer(incorrect());
  assert.deepEqual(events.at(-1), ['answer', false, false]);
  api.actions.match();
  const [first, second] = api.match.pairs;
  api.choosePair({ dataset: { side: 'en', word: first.id, pair: `en:${first.id}` } });
  api.choosePair({ dataset: { side: 'he', word: second.id, pair: `he:${second.id}` } });
  assert.deepEqual(events.at(-1), ['answer', false, false], 'A mismatched pair uses the same muted error feedback');
});

test('language switching preserves an active answer, progress and saved sound settings', async () => {
  const { api, context, elements, saved } = await boot();
  assert.equal(api.state.settings.goal, 30);
  api.startLesson();
  const question = api.session.current, options = JSON.stringify(question.options);
  api.actions['toggle-language']();
  assert.equal(context.document.documentElement.dir, 'rtl');
  assert.equal(context.document.documentElement.lang, 'he');
  assert.equal(api.session.current, question);
  assert.equal(JSON.stringify(api.session.current.options), options);
  assert.match(elements.get('#main').innerHTML, /בוחרים את הפירוש בעברית/);
  const correctIndex = question.options.indexOf(question.word.he);
  api.answer(correctIndex); api.answer(correctIndex);
  assert.equal(api.state.answers.length, 1, 'Double selection must still score once');
  api.actions['toggle-language']();
  assert.equal(api.session.current.answered, true);
  assert.equal(context.document.documentElement.dir, 'ltr');
  api.actions['toggle-effects']();
  assert.equal(api.state.settings.effects, false);
  assert.equal(api.state.settings.sound, true, 'Feedback muting must not change pronunciation');
  api.actions['toggle-language']();
  const restored = await boot(saved);
  assert.equal(restored.api.state.settings.language, 'he');
  assert.equal(restored.api.state.settings.effects, false);
  assert.equal(restored.api.state.answers.length, 1);
});

test('completing a goal opens a three-tap chest, and the avatar reward persists in both interfaces', async () => {
  let app = await boot();
  app.api.state.settings = core.normalizeSettings({ questions: 5, goal: 5, language: 'he', bonus: false, sound: false });
  app.api.startLesson();
  while (app.api.session) {
    const q = app.api.session.current;
    app.api.answer(q.options.indexOf(q.word.he)); app.api.actions.next();
  }
  assert(app.elements.get('#chest-dialog').open, 'Continue at the daily goal offers the treasure');
  assert.equal(app.api.state.game.chests.length, 1);
  await app.api.tapDailyTreasure(); await app.api.tapDailyTreasure();
  assert.equal(game.bonusXP(app.api.state.game), 0);
  app = await boot(app.saved);
  app.api.openChest();
  assert.equal(app.api.state.game.chests[0].taps, 2);
  await app.api.tapDailyTreasure(); await app.api.tapDailyTreasure();
  assert.equal(game.bonusXP(app.api.state.game), 40);
  const reward = game.REWARD_ITEMS.find(item => item.id === app.api.state.game.chests[0].itemId);
  app.api.wearReward(); app.api.closeChest(); app.api.actions.profile();
  assert.equal(app.api.state.game.profile[reward.field], reward.value);
  app.api.updateAvatar('name', '<Emma>', false); app.api.updateAvatar('hairColor', 'ff0000', false);
  app.api.actions['toggle-language'](); app.api.actions['toggle-language']();
  app.api.actions.speaking();
  assert.match(app.elements.get('#main').innerHTML, /dir="ltr" lang="en"|lang="en" dir="ltr"/);
  const restored = await boot(app.saved);
  assert.equal(restored.api.state.game.profile.name, '<Emma>');
  assert.equal(restored.api.state.game.profile.hairColor, 'ff0000');
  assert.equal(restored.api.state.game.profile[reward.field], reward.value);
  restored.api.actions.profile(); assert.match(restored.elements.get('#main').innerHTML, /&lt;Emma&gt;/);
});

test('speaking uses final transcripts, counts daily practice once, and cancels on navigation', async () => {
  const recognitions = [];
  class Recognition {
    constructor() { recognitions.push(this); }
    start() { this.onstart(); }
    stop() {}
    abort() { this.aborted = true; this.onend?.(); }
    emit(transcript, isFinal = true) { this.onresult({ results: [Object.assign([{ transcript }], { isFinal })] }); }
  }
  const { api, elements, saved } = await boot(new Map(), { SpeechRecognition: Recognition, isSecureContext: true });
  api.actions['toggle-language'](); api.actions.speaking();
  api.actions['record-sentence'](); recognitions.at(-1).emit('hello', false);
  assert.equal(api.state.speaking.length, 0);
  recognitions.at(-1).emit(speaking.SENTENCES[0].en);
  assert.equal(api.state.speaking.length, 1); assert.equal(api.state.speaking[0].score, 100);
  assert.match(elements.get('#main').innerHTML, /100%/);
  api.actions['record-sentence'](); recognitions.at(-1).emit(speaking.SENTENCES[0].en);
  assert.equal(api.state.speaking.length, 1);
  for (const error of ['not-allowed', 'audio-capture', 'network', 'no-speech']) {
    api.actions['record-sentence'](); recognitions.at(-1).onerror({ error });
    assert.match(elements.get('#main').innerHTML, /role="alert"/);
  }
  api.actions['record-sentence'](); const canceled = recognitions.at(-1); api.actions.profile();
  assert(canceled.aborted); canceled.emit('a late result');
  assert.equal(api.state.speaking.length, 1);
  const restored = await boot(saved);
  assert.equal(restored.api.state.speaking.length, 1); assert.equal(restored.api.state.speaking[0].score, 100);
});

test('a 30-question lesson finishes, reloads, and all practice views render in Hebrew', async () => {
  const { api, saved, elements } = await boot();
  api.state.settings = core.normalizeSettings({ questions: 30, goal: 30, language: 'he', bonus: false, sound: false });
  api.startLesson();
  while (api.session) {
    const q = api.session.current;
    api.answer(q.options.indexOf(q.word.he)); api.nextQuestion();
  }
  assert.equal(api.view, 'summary');
  assert.match(elements.get('#main').innerHTML, /השיעור הושלם/);
  assert.equal(api.state.sessions[0].total, 30);
  assert.equal(api.state.answers.length, 30);
  api.closeChest(); api.actions.home(); api.actions.words(); api.navigate('progress'); assert.match(elements.get('#main').innerHTML, /השבוע שלך במילים/); api.actions.home();
  api.showSettings();
  assert.match(elements.get('#settings-dialog').innerHTML, /30 תרגילים ביום/);
  api.actions.reverse(); assert.match(elements.get('#main').innerHTML, /בוחרים את הפירוש באנגלית/);
  api.startLesson('listen'); assert.match(elements.get('#main').innerHTML, /מה פירוש המילה/);
  api.actions.match(); assert.match(elements.get('#main').innerHTML, /לוחצים על הזוגות המתאימים/);
  const pair = api.match.pairs[0];
  api.choosePair({ dataset: { side: 'en', word: pair.id, pair: `en:${pair.id}` } });
  api.choosePair({ dataset: { side: 'he', word: pair.id, pair: `he:${pair.id}` } });
  assert.equal(api.match.matched.size, 1);
  const restored = await boot(saved);
  assert.equal(restored.api.state.sessions[0].total, 30, 'Reload validation must retain 30-question lessons');
});
