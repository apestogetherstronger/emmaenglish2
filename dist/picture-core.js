import { localDay, shuffled, selectLesson, summarizeWords } from './core.js?v=2.5.0';
import { createGame, normalizeGame, mergeGames, initializeRewards, creditPractice, earnDailyChest, earnBonusChests, bonusXP } from './game.js?v=2.4.0';

// This mode never reads or writes the English–Hebrew app's storage key.
export const PICTURE_STORAGE_KEY = 'emmaenglish2:pictures:v1';
export const PICTURE_CATEGORIES = Object.freeze({ all: 'All pictures', animals: 'Animals', food: 'Food', objects: 'Everyday things', home: 'At home', nature: 'Outside', play: 'Toys & transport' });
const groups = {
  animals: ['cat', 'dog', 'cow', 'horse', 'lion', 'elephant', 'monkey', 'rabbit', 'bird', 'fish', 'turtle', 'butterfly', 'snake', 'frog', 'penguin', 'bee'],
  food: ['apple', 'banana', 'orange', 'strawberry', 'grapes', 'watermelon', 'carrot', 'tomato', 'potato', 'bread', 'cheese', 'egg', 'milk', 'cake', 'pizza', 'ice cream'],
  objects: ['ball', 'book', 'pencil', 'chair', 'bed', 'table', 'shoe', 'sock', 'hat', 'shirt', 'dress', 'bag', 'cup', 'spoon', 'clock', 'key'],
  home: ['door', 'window', 'lamp', 'sofa', 'pillow', 'blanket', 'towel', 'toothbrush', 'soap', 'bath', 'toilet', 'mirror', 'plate', 'fork', 'bowl', 'bottle'],
  nature: ['sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'rainbow', 'tree', 'flower', 'leaf', 'grass', 'rock', 'beach', 'mountain', 'river', 'sea'],
  play: ['car', 'bus', 'train', 'truck', 'plane', 'boat', 'bike', 'helicopter', 'teddy bear', 'doll', 'kite', 'balloon', 'robot', 'puzzle', 'drum', 'crayon'],
};
const extraWords = {
  animals: [['mouse', '🐭'], ['sheep', '🐑'], ['pig', '🐷'], ['chicken', '🐔'], ['duck', '🦆'], ['bear', '🐻'], ['giraffe', '🦒'], ['zebra', '🦓']],
  food: [['pear', '🍐'], ['peach', '🍑'], ['lemon', '🍋'], ['corn', '🌽'], ['cucumber', '🥒'], ['cookie', '🍪'], ['sandwich', '🥪'], ['rice', '🍚']],
  objects: [['phone', '📱'], ['camera', '📷'], ['umbrella', '☂️'], ['glasses', '👓'], ['brush', '🪥'], ['scissors', '✂️'], ['ruler', '📏'], ['box', '📦']],
  home: [['fridge', '🧊'], ['oven', '♨️'], ['shower', '🚿'], ['sink', '🚰'], ['stairs', '🪜'], ['garden', '🪴'], ['kitchen', '🍳'], ['bedroom', '🛏️']],
  nature: [['forest', '🌲'], ['desert', '🏜️'], ['island', '🏝️'], ['lake', '🏞️'], ['fire', '🔥'], ['wind', '💨'], ['earth', '🌍'], ['sky', '🌌']],
  play: [['scooter', '🛴'], ['skateboard', '🛹'], ['soccer ball', '⚽'], ['blocks', '🧱'], ['guitar', '🎸'], ['yo-yo', '🪀'], ['swing', '🎠'], ['slide', '🛝']],
};
export const PICTURE_ATLASES = Object.freeze(Object.keys(groups));
// Four home cards need slightly shifted square crops: the fork and bottle
// extend above the nominal row boundary in the 1254px illustration.
const crops = { bath: [324, 627, 292], mirror: [951, 627, 292], fork: [314, 921, 313], bottle: [941, 921, 313] };
export const PICTURE_WORDS = Object.freeze(Object.entries(groups).flatMap(([category, words]) => [
  ...words.map((en, cell) => Object.freeze({ id: en.replaceAll(' ', '-'), en, category, cell, ...(crops[en] ? { crop: Object.freeze(crops[en]) } : {}) })),
  ...extraWords[category].map(([en, emoji]) => Object.freeze({ id: en.replaceAll(' ', '-'), en, category, emoji })),
]));
const wordIds = new Set(PICTURE_WORDS.map(w => w.id));
export const PICTURE_MODES = Object.freeze({ mixed: 'Pictures + words', listen: 'Listen + pictures', read: 'Words + pictures' });
export const PICTURE_GOALS = Object.freeze([5, 10, 15, 20, 30]);
export function newPictureState() {
  // Keep the storage key stable. Version 3 stops older tabs from discarding
  // the avatar and rewards; formats 1 and 2 still migrate without losing answers.
  return { version: 3, settings: { category: 'all', mode: 'mixed', goal: 30, effects: true, voice: true }, answers: [], game: createGame() };
}
export function parsePictureState(raw) {
  if (raw === null) return newPictureState();
  const data = JSON.parse(raw);
  if (!data || ![1, 2, 3].includes(data.version) || !Array.isArray(data.answers) || data.answers.length > 100000) throw new Error('Unsupported picture progress.');
  const settings = data.settings || {};
  const state = newPictureState();
  for (const [key, options] of [['category', PICTURE_CATEGORIES], ['mode', PICTURE_MODES]]) if (Object.hasOwn(options, settings[key])) state.settings[key] = settings[key];
  if (PICTURE_GOALS.includes(settings.goal)) state.settings.goal = settings.goal;
  for (const key of ['voice', 'effects']) if (typeof settings[key] === 'boolean') state.settings[key] = settings[key];
  state.answers = data.answers.filter(a => a && typeof a.id === 'string' && a.id.length <= 100 && wordIds.has(a.wordId) &&
    typeof a.correct === 'boolean' && Number.isFinite(Date.parse(a.ts)) && (a.chosen === null || wordIds.has(a.chosen)))
    .map(a => ({ id: a.id, wordId: a.wordId, chosen: a.chosen, correct: a.correct && a.chosen === a.wordId, ts: new Date(a.ts).toISOString() }));
  state.answers = mergePictureAnswers([], state.answers);
  state.game = normalizeGame(data.game);
  return state;
}
function mergePictureAnswers(a, b) {
  return [...new Map([...a, ...b].map(answer => [answer.id, answer])).values()].sort((x, y) => x.ts.localeCompare(y.ts));
}
export function createPictureStore(storage) {
  let state = newPictureState(), protectedSave = false, message = '';
  try { state = parsePictureState(storage.getItem(PICTURE_STORAGE_KEY)); }
  catch { protectedSave = true; message = 'Your saved picture progress could not be read. You can practise, but saving is paused to protect it.'; }
  function readLatest() {
    if (protectedSave) return;
    try {
      const raw = storage.getItem(PICTURE_STORAGE_KEY);
      if (raw === null) return;
      const latest = parsePictureState(raw);
      latest.answers = mergePictureAnswers(state.answers, latest.answers);
      latest.game = mergeGames(state.game, latest.game);
      state = latest;
    } catch { protectedSave = true; message = 'Saving is paused to protect your picture progress. Refresh this page before continuing.'; }
  }
  return {
    get state() { return state; },
    get message() { return message; },
    get canSave() { return !protectedSave; },
    refresh() { readLatest(); state = refreshPictureRewards(state); return state; },
    update(change) {
      readLatest();
      state = refreshPictureRewards(change(state));
      if (!protectedSave) {
        try { storage.setItem(PICTURE_STORAGE_KEY, JSON.stringify(state)); message = ''; }
        catch { message = 'Progress is only saved for this visit. Your browser could not save it on this device.'; }
      }
      return state;
    },
  };
}
export function refreshPictureRewards(state, now = Date.now()) {
  const today = localDay(now), count = state.answers.filter(a => localDay(a.ts) === today).length;
  let game = initializeRewards(state.game, now);
  game = earnDailyChest(game, today, count, state.settings.goal, now);
  game = earnBonusChests(game, today, now);
  return game === state.game ? state : { ...state, game };
}
export function recordPictureAnswer(state, record) {
  if (state.answers.some(answer => answer.id === record.id)) return state;
  const game = record.correct ? creditPractice(state.game, `q:${record.id}`, 10, localDay(record.ts), Date.parse(record.ts)) : state.game;
  return { ...state, answers: [...state.answers, record], game };
}
export const picturePool = category => PICTURE_WORDS.filter(w => category === 'all' || w.category === category);
export function pictureLesson(state, { reviewOnly = false, random = Math.random, now = Date.now() } = {}) {
  return selectLesson(picturePool(state.settings.category), summarizeWords(state.answers), 10, { reviewOnly, random, now });
}
// A learner should never be marked wrong for another valid reading of an image.
// For example, a penguin is a bird, and the rain picture also contains a cloud.
const overlappingPictures = [
  ['bird', 'penguin'], ['blanket', 'towel'], ['plate', 'bowl'], ['sofa', 'pillow'],
  ['cloud', 'rain'], ['cloud', 'snow'], ['snow', 'mountain'],
  ['tree', 'leaf'], ['tree', 'grass'], ['flower', 'leaf'], ['flower', 'grass'],
  ['beach', 'river', 'sea'], ['mountain', 'rock'],
];
export function pictureChoices(word, random = Math.random) {
  const excluded = new Set(overlappingPictures.filter(group => group.includes(word.id)).flat());
  const others = shuffled(picturePool(word.category).filter(w => w.id !== word.id && !excluded.has(w.id)), random).slice(0, 3);
  return shuffled([word, ...others], random);
}
export function pictureTotals(state, now = new Date()) {
  const stats = summarizeWords(state.answers), today = localDay(now);
  return {
    xp: state.answers.filter(a => a.correct).length * 10 + bonusXP(state.game),
    today: state.answers.filter(a => localDay(a.ts) === today).length,
    confident: [...stats.values()].filter(s => s.streak >= 3).length,
    seen: stats.size,
    due: picturePool(state.settings.category).filter(w => stats.has(w.id) && stats.get(w.id).due <= new Date(now).getTime()).length,
  };
}
