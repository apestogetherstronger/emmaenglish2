import { localDay, shuffled, selectLesson, summarizeWords } from './core.js?v=2.5.0';

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
export const PICTURE_ATLASES = Object.freeze(Object.keys(groups));
// Four home cards need slightly shifted square crops: the fork and bottle
// extend above the nominal row boundary in the 1254px illustration.
const crops = { bath: [324, 627, 292], mirror: [951, 627, 292], fork: [314, 921, 313], bottle: [941, 921, 313] };
export const PICTURE_WORDS = Object.freeze(Object.entries(groups).flatMap(([category, words]) => words.map((en, cell) => Object.freeze({ id: en.replaceAll(' ', '-'), en, category, cell, ...(crops[en] ? { crop: Object.freeze(crops[en]) } : {}) }))));
const wordIds = new Set(PICTURE_WORDS.map(w => w.id));
export const PICTURE_MODES = Object.freeze({ mixed: 'Pictures + words', listen: 'Listen + pictures', read: 'Words + pictures' });
export const PICTURE_GOALS = Object.freeze([5, 10, 15, 20, 30]);
export function newPictureState() {
  // Keep the storage key stable. Version 2 stops older, 48-word tabs from
  // discarding answers for the newly added words when they next save.
  return { version: 2, settings: { category: 'all', mode: 'mixed', goal: 30, effects: true, voice: true }, answers: [] };
}
export function parsePictureState(raw) {
  if (raw === null) return newPictureState();
  const data = JSON.parse(raw);
  if (!data || ![1, 2].includes(data.version) || !Array.isArray(data.answers) || data.answers.length > 100000) throw new Error('Unsupported picture progress.');
  const settings = data.settings || {};
  const state = newPictureState();
  for (const [key, options] of [['category', PICTURE_CATEGORIES], ['mode', PICTURE_MODES]]) if (Object.hasOwn(options, settings[key])) state.settings[key] = settings[key];
  if (PICTURE_GOALS.includes(settings.goal)) state.settings.goal = settings.goal;
  for (const key of ['voice', 'effects']) if (typeof settings[key] === 'boolean') state.settings[key] = settings[key];
  state.answers = data.answers.filter(a => a && typeof a.id === 'string' && a.id.length <= 100 && wordIds.has(a.wordId) &&
    typeof a.correct === 'boolean' && Number.isFinite(Date.parse(a.ts)) && (a.chosen === null || wordIds.has(a.chosen)))
    .map(a => ({ id: a.id, wordId: a.wordId, chosen: a.chosen, correct: a.correct && a.chosen === a.wordId, ts: new Date(a.ts).toISOString() }));
  state.answers = mergePictureAnswers([], state.answers);
  return state;
}
function mergePictureAnswers(a, b) {
  return [...new Map([...a, ...b].map(answer => [answer.id, answer])).values()].sort((x, y) => x.ts.localeCompare(y.ts));
}
export function createPictureStore(storage) {
  let state = newPictureState(), protectedSave = false, message = '';
  try { state = parsePictureState(storage.getItem(PICTURE_STORAGE_KEY)); }
  catch { protectedSave = true; message = 'Your saved picture progress could not be read. You can practise, but saving is paused to protect it.'; }
  return {
    get state() { return state; },
    get message() { return message; },
    update(change) {
      if (!protectedSave) {
        try {
          const latest = parsePictureState(storage.getItem(PICTURE_STORAGE_KEY));
          latest.answers = mergePictureAnswers(state.answers, latest.answers);
          state = latest;
        } catch { protectedSave = true; message = 'Saving is paused to protect your picture progress. Refresh this page before continuing.'; }
      }
      state = change(state);
      if (!protectedSave) {
        try { storage.setItem(PICTURE_STORAGE_KEY, JSON.stringify(state)); message = ''; }
        catch { message = 'Progress is only saved for this visit. Your browser could not save it on this device.'; }
      }
      return state;
    },
  };
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
    xp: state.answers.filter(a => a.correct).length * 10,
    today: state.answers.filter(a => localDay(a.ts) === today).length,
    confident: [...stats.values()].filter(s => s.streak >= 3).length,
    seen: stats.size,
    due: picturePool(state.settings.category).filter(w => stats.has(w.id) && stats.get(w.id).due <= new Date(now).getTime()).length,
  };
}
