import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as pictures from '../dist/picture-core.js';
import { STORAGE_KEY, createState, summarizeWords, wordStatus } from '../dist/core.js';

test('picture storage is independent, merges another tab, and protects unreadable saves', () => {
  const bilingual = JSON.stringify({ ...createState(), xp: 920 });
  const saved = new Map([[STORAGE_KEY, bilingual]]), keys = [];
  const storage = { getItem: key => { keys.push(key); return saved.get(key) ?? null; }, setItem: (key, value) => { keys.push(key); saved.set(key, value); } };
  const a = pictures.createPictureStore(storage), b = pictures.createPictureStore(storage);
  assert.equal(a.state.settings.goal, 30);
  const answer = (id, wordId) => ({ id, wordId, chosen: wordId, correct: true, ts: '2026-09-17T12:00:00Z' });
  a.update(s => ({ ...s, answers: [...s.answers, answer('a', 'cat')] }));
  b.update(s => ({ ...s, answers: [...s.answers, answer('b', 'dog')] }));
  const restored = pictures.createPictureStore(storage);
  assert.equal(restored.state.answers.length, 2);
  assert.equal(pictures.pictureTotals(restored.state, new Date('2026-09-17T13:00:00Z')).xp, 20);
  assert.equal(saved.get(STORAGE_KEY), bilingual);
  assert(keys.every(key => key === pictures.PICTURE_STORAGE_KEY));
  for (const bad of ['not json', '{"version":2,"answers":[]}']) {
    saved.set(pictures.PICTURE_STORAGE_KEY, bad);
    const locked = pictures.createPictureStore(storage);
    locked.update(s => ({ ...s, answers: [answer('c', 'bird')] }));
    assert.match(locked.message, /paused/);
    assert.equal(saved.get(pictures.PICTURE_STORAGE_KEY), bad);
  }
  const unavailable = pictures.createPictureStore({ getItem: () => null, setItem() { throw new Error('Quota'); } });
  unavailable.update(s => ({ ...s, answers: [answer('d', 'bird')] }));
  assert.equal(unavailable.state.answers.length, 1);
  assert.match(unavailable.message, /only saved for this visit/);
});

test('picture lessons filter topics, include missed words, and avoid ambiguous bird choices', () => {
  const state = pictures.newPictureState();
  state.settings.category = 'animals';
  state.answers.push({ id: '1', wordId: 'cat', chosen: 'dog', correct: false, ts: '2026-09-16T12:00:00Z' });
  const lesson = pictures.pictureLesson(state, { now: Date.parse('2026-09-17T12:00:00Z') });
  assert.equal(lesson.length, 10);
  assert.equal(new Set(lesson.map(w => w.id)).size, 10);
  assert(lesson.every(w => w.category === 'animals'));
  assert(lesson.some(w => w.id === 'cat'));
  assert.deepEqual(pictures.pictureLesson(state, { reviewOnly: true }).map(w => w.id), ['cat']);
  for (const word of pictures.PICTURE_WORDS) {
    const choices = pictures.pictureChoices(word);
    assert.equal(new Set(choices.map(w => w.id)).size, 4);
    assert(choices.some(w => w.id === word.id));
    assert(choices.every(w => w.category === word.category));
    if (word.id === 'bird') assert(!choices.some(w => w.id === 'penguin'));
    if (word.id === 'penguin') assert(!choices.some(w => w.id === 'bird'));
  }
});

const source = await readFile(new URL('../dist/pictures.js', import.meta.url), 'utf8');
async function boot({ saved = new Map(), speech = false, failedImage = false } = {}) {
  const elements = new Map(), listeners = new Map(), sounds = [], spoken = [];
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: '', textContent: '', hidden: false, setAttribute() {}, focus() {} });
    return elements.get(selector);
  };
  const context = vm.createContext({
    ...pictures, summarizeWords, wordStatus, URL, console,
    document: { querySelector: element, querySelectorAll: () => [], addEventListener: (name, fn) => listeners.set(name, fn) },
    window: { addEventListener() {}, scrollTo() {}, ...(speech ? { speechSynthesis: { cancel() {}, getVoices: () => [], speak: u => spoken.push(u) }, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } } } : {}) },
    localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
    createAnswerSounds: () => ({ play: (...args) => sounds.push(args), stop() {} }),
    Image: class { set src(value) { assert.match(value, /\/assets\/picture-(animals|food|objects)\.webp/); if (failedImage) this.onerror(); else this.onload(); } },
  });
  const app = source.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', JSON.stringify(new URL('../dist/pictures.js', import.meta.url).href));
  vm.runInContext(`${app}\nglobalThis.api = { actions, answer, startLesson, render, get state() { return store.state; }, get session() { return session; }, get page() { return page; }, get ready() { return picturesReady; } };`, context);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  return { api: context.api, saved, elements, listeners, sounds, spoken };
}

test('picture page scores one answer once, reaches 30, restores progress, and renders no Hebrew', async () => {
  const original = JSON.stringify({ ...createState(), xp: 810 });
  const app = await boot({ saved: new Map([[STORAGE_KEY, original]]) });
  assert(app.api.ready);
  assert.match(app.elements.get('#picture-main').innerHTML, /Start picture practice/);
  assert.equal(app.api.state.settings.goal, 30);
  for (let lesson = 0; lesson < 3; lesson++) {
    app.api.startLesson();
    assert.equal(app.api.session.queue.length, 10);
    for (let i = 0; i < 10; i++) {
      const q = app.api.session.question;
      assert.equal(q.kind, i % 2 ? 'picture' : 'read');
      app.api.actions.next(); // Unanswered questions cannot be skipped by advancing.
      assert.equal(app.api.session.index, i);
      const chosen = i === 0 ? q.options.find(w => w.id !== q.word.id).id : q.word.id;
      app.api.answer(chosen); app.api.answer(chosen);
      assert.equal(app.api.state.answers.length, lesson * 10 + i + 1);
      assert.doesNotMatch(app.elements.get('#picture-main').innerHTML, /[\u0590-\u05ff]/);
      app.api.actions.next();
    }
    assert.equal(app.api.page, 'summary');
  }
  assert.equal(app.api.state.answers.length, 30);
  assert.equal(app.sounds.length, 30);
  assert.equal(app.sounds.filter(([correct]) => !correct).length, 3);
  assert.equal(pictures.pictureTotals(app.api.state).xp, 270);
  assert.equal(pictures.pictureTotals(app.api.state).today, 30);
  const reloaded = await boot({ saved: app.saved });
  assert.equal(reloaded.api.state.answers.length, 30);
  assert.match(reloaded.elements.get('#picture-main').innerHTML, /Daily goal complete!/);
  reloaded.api.actions.words();
  assert.equal((reloaded.elements.get('#picture-main').innerHTML.match(/class="picture-word-card"/g) || []).length, 48);
  assert.equal(app.saved.get(STORAGE_KEY), original);
});

test('listening has slow/reveal/error fallbacks, and missing images prevent scored practice', async () => {
  const state = pictures.newPictureState(); state.settings.mode = 'listen';
  const saved = new Map([[pictures.PICTURE_STORAGE_KEY, JSON.stringify(state)]]);
  const app = await boot({ saved, speech: true });
  app.api.startLesson();
  assert.equal(app.api.session.question.kind, 'listen');
  assert.equal(app.spoken.length, 1);
  assert.equal(app.spoken[0].text, app.api.session.question.word.en);
  assert.equal(app.spoken[0].lang, 'en-US');
  app.api.actions.slow(); assert.equal(app.spoken.at(-1).rate, .65);
  app.spoken.at(-1).onerror({ error: 'voice-unavailable' });
  assert(app.api.session.question.revealed);
  assert.match(app.elements.get('#picture-notice').textContent, /could not play/);
  app.api.actions.skip(); assert.equal(app.api.state.answers[0].correct, false);
  const silent = await boot({ saved }); silent.api.startLesson();
  assert.equal(silent.api.session.question.kind, 'read');
  const missing = await boot({ failedImage: true }); missing.api.startLesson();
  assert.equal(missing.api.session, null);
  assert.equal(missing.api.state.answers.length, 0);
  assert.match(missing.elements.get('#picture-notice').textContent, /pictures could not load/);
});
