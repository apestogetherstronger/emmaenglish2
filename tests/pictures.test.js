import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as pictures from '../dist/picture-core.js';
import { STORAGE_KEY, createState, summarizeWords, wordStatus, localDay } from '../dist/core.js';
import * as game from '../dist/game.js';
import { avatarDataUri } from '../dist/vendor/avatar.js';

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
  for (const bad of ['not json', '{"version":4,"answers":[]}']) {
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
  const elements = new Map(), listeners = new Map(), windowListeners = new Map(), sounds = [], spoken = [], treasureSounds = [], prepared = [];
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: '', textContent: '', hidden: false, open: false, listeners: new Map(), setAttribute() {}, focus() {}, addEventListener(name, callback) { this.listeners.set(name, callback); }, showModal() { this.open = true; }, close() { this.open = false; } });
    return elements.get(selector);
  };
  const context = vm.createContext({
    ...pictures, ...game, avatarDataUri, summarizeWords, wordStatus, localDay, URL, console,
    document: { querySelector: element, querySelectorAll: () => [], addEventListener: (name, fn) => listeners.set(name, fn) },
    window: { addEventListener: (name, fn) => windowListeners.set(name, fn), scrollTo() {}, ...(speech ? { speechSynthesis: { cancel() {}, getVoices: () => [], speak: u => spoken.push(u) }, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } } } : {}) },
    localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
    createAnswerSounds: () => ({ play: (...args) => sounds.push(args), playTreasure: (...args) => treasureSounds.push(args), prepare: enabled => prepared.push(enabled), stop() {} }),
    Image: class { set src(value) { assert.match(value, /\/assets\/picture-(animals|food|objects|home|nature|play)\.webp/); if (failedImage) this.onerror(); else this.onload(); } },
  });
  const app = source.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', JSON.stringify(new URL('../dist/pictures.js', import.meta.url).href));
  vm.runInContext(`${app}\nglobalThis.api = { actions, answer, startLesson, render, updateAvatar, openChest, closeChest, tapTreasure, claimTreasureStyle, get state() { return store.state; }, get session() { return session; }, get page() { return page; }, get ready() { return picturesReady; } };`, context);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  return { api: context.api, saved, elements, listeners, windowListeners, sounds, spoken, treasureSounds, prepared };
}

test('picture page scores one answer once, reaches 30, restores progress, and renders no Hebrew', async () => {
  const original = JSON.stringify({ ...createState(), xp: 810 });
  const app = await boot({ saved: new Map([[STORAGE_KEY, original]]) });
  assert(app.api.ready);
  assert.match(app.elements.get('#picture-main').innerHTML, /Start picture practice/);
  assert.equal(app.api.state.settings.goal, 30);
  for (let lesson = 0; lesson < 3; lesson++) {
    app.api.startLesson();
    if (app.elements.get('#chest-dialog').open) app.api.closeChest();
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
      if (app.elements.get('#chest-dialog').open) app.api.closeChest();
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
  assert.equal((reloaded.elements.get('#picture-main').innerHTML.match(/class="picture-word-card"/g) || []).length, 144);
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

test('new beginner collections retain earlier progress and work in lessons, listening, and review', async () => {
  const legacy = {
    version: 1,
    settings: { category: 'animals', mode: 'listen', goal: 20, effects: false, voice: true },
    answers: [{ id: 'old-answer', wordId: 'cat', chosen: 'cat', correct: true, ts: '2026-09-01T12:00:00Z' }],
  };
  const app = await boot({ saved: new Map([[pictures.PICTURE_STORAGE_KEY, JSON.stringify(legacy)]]), speech: true });
  assert.equal(app.api.state.version, 3);
  assert.equal(app.api.state.settings.goal, 20);
  assert.equal(app.api.state.settings.effects, false);
  assert.equal(app.api.state.answers[0].wordId, 'cat');
  assert.equal(pictures.pictureTotals(app.api.state).xp, 10);
  for (const category of ['home', 'nature', 'play']) {
    app.listeners.get('change')({ target: { dataset: { setting: 'category' }, value: category } });
    app.api.actions.words();
    const markup = app.elements.get('#picture-main').innerHTML;
    assert.equal((markup.match(/class="picture-word-card"/g) || []).length, 24);
    assert.equal((markup.match(new RegExp(`data-category="${category}"`, 'g')) || []).length, 24);
    assert.equal((markup.match(/picture-emoji/g) || []).length, 8);
    app.api.startLesson();
    assert.equal(app.api.session.queue.length, 10);
    assert(app.api.session.queue.every(w => w.category === category));
    assert.equal(app.api.session.question.kind, 'listen');
    assert.equal(app.spoken.at(-1).text, app.api.session.question.word.en);
    app.api.answer(app.api.session.question.word.id);
    app.api.actions.home();
  }
  const restored = await boot({ saved: app.saved });
  assert.equal(restored.api.state.answers.length, 4);
  assert.equal(pictures.pictureTotals(restored.api.state).xp, 40);
  assert.equal(restored.api.state.settings.category, 'play');
  assert.equal(restored.api.state.settings.goal, 20);
  assert.equal(JSON.parse(app.saved.get(pictures.PICTURE_STORAGE_KEY)).version, 3);
});

test('pictures with overlapping meanings do not compete as quiz answers', () => {
  const pairs = [['cloud', 'rain'], ['cloud', 'snow'], ['snow', 'mountain'], ['beach', 'sea'], ['beach', 'river'], ['river', 'sea'], ['blanket', 'towel'], ['plate', 'bowl'], ['sofa', 'pillow'], ['tree', 'leaf'], ['flower', 'leaf']];
  for (const [first, second] of pairs) for (const [id, other] of [[first, second], [second, first]]) {
    const word = pictures.PICTURE_WORDS.find(w => w.id === id);
    assert(word, `Missing beginner word: ${id}`);
    for (let seed = 0; seed < 16; seed++) {
      const choices = pictures.pictureChoices(word, () => seed / 16);
      assert.equal(choices.length, 4);
      assert(!choices.some(w => w.id === other), `${id} must not compete with ${other}`);
    }
  }
});

test('picture rewards migrate both old formats, preserve XP, and credit only new practice once', () => {
  const ts = new Date().toISOString();
  const answer = id => ({ id, wordId: 'cat', chosen: 'cat', correct: true, ts });
  for (const version of [1, 2]) {
    const old = { version, settings: { goal: 30, category: 'animals', effects: false }, answers: Array.from({ length: 30 }, (_, i) => answer(`old-${i}`)) };
    const saved = new Map([[pictures.PICTURE_STORAGE_KEY, JSON.stringify(old)]]);
    const storage = { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v) };
    const store = pictures.createPictureStore(storage);
    store.update(s => s);
    assert.equal(store.state.version, 3);
    assert.equal(store.state.settings.category, 'animals');
    assert.equal(store.state.settings.effects, false);
    assert.equal(pictures.pictureTotals(store.state).xp, 300);
    assert.equal(game.bonusProgress(store.state.game).earned, 0, 'Old answers do not create retroactive bonus chests');
    assert.equal(store.state.game.chests.length, 1, 'Today’s completed daily goal still earns its chest');
    for (let i = 0; i < 40; i++) {
      const record = answer(`new-${i}`);
      store.update(s => pictures.recordPictureAnswer(s, record));
      store.update(s => pictures.recordPictureAnswer(s, record));
    }
    assert.equal(store.state.answers.length, 70);
    assert.equal(game.bonusProgress(store.state.game).earned, 400);
    assert.equal(store.state.game.chests.filter(c => c.kind === 'daily').length, 1);
    const bonus = store.state.game.chests.filter(c => c.kind === 'bonus');
    assert.equal(bonus.length, 1);
    assert(bonus[0].cost >= 240 && bonus[0].cost <= 400);
    const reloaded = pictures.createPictureStore(storage);
    assert.deepEqual(reloaded.state.game, store.state.game);
    assert.equal(pictures.pictureTotals(reloaded.state).xp, 700);
  }
});

test('picture chests save each tap, play rising sounds, unlock one wearable style, and keep the main profile separate', async () => {
  const main = createState(); main.game.profile.name = 'Main learner';
  const mainSave = JSON.stringify(main), state = pictures.newPictureState(); state.settings.goal = 5;
  let app = await boot({ saved: new Map([[STORAGE_KEY, mainSave], [pictures.PICTURE_STORAGE_KEY, JSON.stringify(state)]]), speech: true });
  app.api.actions.profile();
  assert.match(app.elements.get('#picture-main').innerHTML, /avatar-choice-preview/);
  assert.match(app.elements.get('#picture-main').innerHTML, /Find in treasures/);
  app.api.updateAvatar('name', 'Scout'); app.api.updateAvatar('clothesColor', 'aabbcc');
  app.api.updateAvatar('accessories', 'sunglasses');
  assert.equal(app.api.state.game.profile.accessories, 'none', 'Locked accessories cannot be equipped');
  app.api.startLesson();
  for (let i = 0; i < 5; i++) {
    app.api.answer(i === 4 ? null : app.api.session.question.word.id);
    app.api.actions.next();
  }
  assert(app.elements.get('#chest-dialog').open);
  assert.equal(app.api.state.game.chests.length, 1);
  assert.equal(app.api.state.game.profile.name, 'Scout');
  assert.equal(app.api.state.game.profile.clothesColor, 'aabbcc');
  assert.equal(game.bonusProgress(app.api.state.game).earned, 40);
  const index = app.api.session.index;
  app.api.actions.next(); app.api.answer(app.api.session.question.word.id);
  assert.equal(app.api.session.index, index, 'The chest pauses the lesson');
  assert.equal(app.api.state.answers.length, 5);
  await app.api.tapTreasure();
  assert.deepEqual(app.treasureSounds, [[1, true]]);
  app.api.closeChest();
  app = await boot({ saved: app.saved }); app.api.openChest();
  assert.equal(app.api.state.game.chests[0].taps, 1);
  await app.api.tapTreasure(); app.api.actions.sound(); await app.api.tapTreasure();
  assert.deepEqual(app.treasureSounds, [[2, true], [3, false]]);
  assert.deepEqual(app.prepared, [true, false]);
  const chest = app.api.state.game.chests[0];
  assert.equal(chest.taps, 3); assert(chest.avatarPrize); assert.equal(chest.choices.length, 3);
  assert.match(app.elements.get('#chest-dialog').innerHTML, /Choose one style/);
  assert.doesNotMatch(app.elements.get('#chest-dialog').innerHTML, /[\u0590-\u05ff]/);
  assert.equal(pictures.pictureTotals(app.api.state).xp, 40 + chest.xp);
  assert.equal(game.bonusProgress(app.api.state.game).earned, 40, 'Chest XP never fuels bonus chests');
  await app.api.claimTreasureStyle(chest.choices[0]); await app.api.claimTreasureStyle(chest.choices[1]);
  assert.equal(game.inventory(app.api.state.game).size, 1);
  const item = game.REWARD_ITEMS.find(i => i.id === chest.choices[0]);
  assert.equal(app.api.state.game.profile[item.field], item.value);
  await app.api.tapTreasure();
  assert.equal(app.treasureSounds.length, 2, 'An opened chest cannot replay taps or add XP');
  app.api.closeChest(); app.api.actions.profile();
  assert.match(app.elements.get('#picture-main').innerHTML, /Scout/);
  const restored = await boot({ saved: app.saved });
  assert.equal(restored.api.state.game.profile[item.field], item.value);
  assert.equal(game.inventory(restored.api.state.game).size, 1);
  assert.equal(restored.saved.get(STORAGE_KEY), mainSave);
});

test('picture reward merges retain taps, one style choice, and profile edits across tabs', () => {
  const saved = new Map(), storage = { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v) };
  const a = pictures.createPictureStore(storage), b = pictures.createPictureStore(storage);
  a.update(s => ({ ...s, settings: { ...s.settings, goal: 5 }, answers: Array.from({ length: 5 }, (_, i) => ({ id: `a-${i}`, wordId: 'cat', chosen: 'cat', correct: true, ts: new Date().toISOString() })) }));
  const id = a.state.game.chests[0].id;
  for (const store of [a, b, a]) store.update(s => ({ ...s, game: game.tapChest(s.game, id).game }));
  const choices = a.state.game.chests[0].choices;
  b.update(s => ({ ...s, game: game.equipItem(game.chooseChestStyle(s.game, id, choices[0]), choices[0]) }));
  a.update(s => ({ ...s, game: game.chooseChestStyle(s.game, id, choices[1]) }));
  a.refresh(); b.refresh();
  assert.equal(a.state.game.chests[0].itemId, choices[0]);
  assert.deepEqual(a.state.game, b.state.game);
  assert.equal(game.inventory(a.state.game).size, 1);
  assert.equal(pictures.pictureTotals(a.state).xp, 50 + a.state.game.chests[0].xp);
  const item = game.REWARD_ITEMS.find(i => i.id === choices[0]);
  assert.equal(a.state.game.profile[item.field], item.value);
});
