import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../dist/core.js';
import * as i18n from '../dist/i18n.js';
import { createAnswerSounds } from '../dist/sounds.js';

// Exercise the actual application handlers with inert document/audio adapters.
// This is a state/markup smoke test, not browser or visual testing.
const source = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
const fixture = Array.from({ length: 40 }, (_, i) => ({ en: `word ${i}`, he: `מילה ${i}` }));
async function boot(saved = new Map()) {
  const elements = new Map(), listeners = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: '', dataset: {}, style: {}, attributes: {}, setAttribute(k, v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; }, focus() {}, querySelectorAll() { return []; }, showModal() {}, close() {} });
    return elements.get(selector);
  };
  const context = vm.createContext({
    ...core, ...i18n, createAnswerSounds, URL, performance, console,
    translate(language, key, values) {
      if (language === 'he' && /[A-Za-z]/.test(key) && !/[\u0590-\u05ff]/.test(key)) assert(Object.hasOwn(i18n.hebrew, key), `Missing dynamic translation: ${key}`);
      return i18n.translate(language, key, values);
    },
    document: { querySelector: element, querySelectorAll: () => [], documentElement: {}, body: { classList: { toggle() {} } }, addEventListener: (name, fn) => listeners.set(name, fn) },
    window: { addEventListener() {}, scrollTo() {}, matchMedia: () => ({ matches: true }), speechSynthesis: {}, SpeechSynthesisUtterance: class {} },
    speechSynthesis: { cancel() {}, getVoices: () => [], speak() {} }, SpeechSynthesisUtterance: class {},
    localStorage: { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v) },
    history: { replaceState() {} }, location: { hash: '', reload() {} },
    fetch: async () => ({ ok: true, json: async () => fixture }),
    setTimeout: () => 0, clearTimeout() {},
  });
  const app = source.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', JSON.stringify(new URL('../dist/app.js', import.meta.url).href));
  vm.runInContext(`${app}\nglobalThis.api = { actions, answer, nextQuestion, startLesson, choosePair, render, navigate, showSettings, get state() { return state; }, get session() { return session; }, get match() { return match; }, get view() { return view; }, whenReady: () => ready };`, context);
  // Init awaits two fetches and normalization; settle it without timers or a server.
  for (let i = 0; i < 12 && !context.api.whenReady(); i++) await Promise.resolve();
  assert(context.api.whenReady());
  return { api: context.api, context, elements, saved, listeners };
}

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
  api.actions.home(); api.actions.words(); api.navigate('progress'); assert.match(elements.get('#main').innerHTML, /השבוע שלך במילים/); api.actions.home();
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
