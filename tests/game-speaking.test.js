import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, earnDailyChest, tapChest, normalizeGame, mergeGames, inventory, bonusXP, equipItem, normalizeProfile, DEFAULT_PROFILE, REWARD_ITEMS } from '../dist/game.js';
import { SENTENCES, assessSpeech, cleanSpeaking, mergeSpeaking, createSpeechCapture } from '../dist/speaking.js';

test('daily treasure unlocks only on the third tap, including across reloads and backup merges', () => {
  let game = createGame();
  assert.equal(earnDailyChest(game, '2026-09-12', 29, 30), game);
  game = earnDailyChest(game, '2026-09-12', 30, 30, 1000, () => 0);
  assert.equal(game.chests.length, 1);
  const unopened = structuredClone(game), item = REWARD_ITEMS[0];
  assert.equal(equipItem(game, item.id), game, 'Unclaimed styles remain locked');
  for (let tap = 1; tap <= 2; tap++) {
    game = tapChest(game, '2026-09-12', 1000 + tap).game;
    game = normalizeGame(JSON.parse(JSON.stringify(game)));
    assert.equal(game.chests[0].taps, tap);
    assert.equal(bonusXP(game), 0);
    assert.equal(inventory(game).size, 0);
  }
  const third = tapChest(game, '2026-09-12', 1003);
  assert(third.opened); game = third.game;
  assert.equal(bonusXP(game), 40);
  assert(inventory(game).has(item.id));
  assert.equal(tapChest(game, '2026-09-12').game, game);
  game = mergeGames(unopened, mergeGames(game, game));
  assert.equal(game.chests.length, 1); assert.equal(game.chests[0].taps, 3);
  assert.equal(bonusXP(game), 40, 'Merging old or duplicate backups cannot award XP twice');
  assert.equal(earnDailyChest(game, '2026-09-12', 90, 5), game, 'Changing goals cannot award a second daily chest');
  game = equipItem(game, item.id, 2000);
  assert.equal(game.profile[item.field], item.value);
  assert.equal(normalizeGame(JSON.parse(JSON.stringify(game))).profile[item.field], item.value);
});

test('treasures reserve different styles, then award extra XP when the collection is complete', () => {
  let game = createGame();
  for (let i = 1; i <= REWARD_ITEMS.length + 1; i++) {
    const day = `2026-09-${String(i).padStart(2, '0')}`;
    game = earnDailyChest(game, day, 30, 30, i, () => 0);
  }
  assert.equal(new Set(game.chests.slice(0, -1).map(c => c.itemId)).size, REWARD_ITEMS.length);
  const extra = game.chests.at(-1);
  assert.equal(extra.itemId, null); assert.equal(extra.xp, 80);
  for (let i = 0; i < 3; i++) game = tapChest(game, extra.day).game;
  assert.equal(bonusXP(game), 80);
  assert.equal(inventory(game).size, 0, 'Other unopened chests still reserve, but do not unlock, styles');
});

test('older and malformed game data cannot equip locked styles or inject arbitrary avatar values', () => {
  assert.deepEqual(normalizeGame(undefined), createGame());
  const profile = normalizeProfile({ accessories: 'sunglasses', top: '<script>', hairColor: 'url(evil)', name: ' Emma\u0000 ', frame: 'gold' });
  assert.equal(profile.accessories, DEFAULT_PROFILE.accessories);
  assert.equal(profile.frame, 'plain'); assert.equal(profile.top, DEFAULT_PROFILE.top);
  assert.equal(profile.hairColor, DEFAULT_PROFILE.hairColor); assert.equal(profile.name, 'Emma');
  const valid = { day: '2026-09-12', goal: 30, taps: 3, itemId: 'sunglasses', xp: 999999, earnedAt: 1, openedAt: 2 };
  const game = normalizeGame({ chests: [valid, { ...valid, day: '2026-02-30' }, { ...valid, day: '2026-09-13', taps: 4 }] });
  assert.equal(game.chests.length, 1); assert.equal(bonusXP(game), 40);
});

test('speech feedback tolerates punctuation, contractions and number transcription while flagging missed words', () => {
  assert.equal(SENTENCES.length, 30);
  assert.equal(assessSpeech('Hello, how are you today?', 'HELLO how are you today').score, 100);
  assert.equal(assessSpeech('I am happy to see you.', "I'm happy to see you").score, 100);
  assert.equal(assessSpeech('There are three birds in the tree.', 'There are 3 birds in the tree').score, 100);
  const missing = assessSpeech('I like to read a book.', 'I like to read book');
  assert(missing.score < 100); assert.deepEqual(missing.words.filter(w => !w.correct).map(w => w.text), ['a']);
  assert(assessSpeech('I like books.', 'I really like books').score < 100);
  assert.equal(assessSpeech('Hello.', '').score, 0);
});

test('daily speaking rewards count a sentence once, retain the best attempt, and ignore imported scores', () => {
  const record = { sentenceId: 'hello', transcript: 'hello', ts: '2026-09-12T12:00:00Z', score: 100 };
  const better = { ...record, transcript: SENTENCES[0].en, ts: '2026-09-12T12:01:00Z' };
  assert(cleanSpeaking([record])[0].score < 100);
  const today = mergeSpeaking([record, better], [record, better]);
  assert.equal(today.length, 1); assert.equal(today[0].score, 100);
  assert.equal(mergeSpeaking(today, [{ ...better, ts: '2026-09-13T12:00:00Z' }]).length, 2);
  assert.equal(cleanSpeaking([{ ...record, sentenceId: 'invented' }, { ...record, transcript: '' }, { ...record, ts: 'bad' }]).length, 0);
});

function speechHarness() {
  const instances = [], events = [], timers = new Map(); let timerId = 0;
  class Recognition {
    constructor() { instances.push(this); }
    start() { this.onstart(); }
    stop() { this.stopped = true; }
    abort() { this.aborted = true; this.onend?.(); }
    emit(transcript, isFinal = true) { this.onresult({ results: [Object.assign([{ transcript }], { isFinal })] }); }
  }
  const host = { SpeechRecognition: Recognition, isSecureContext: true, setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id) };
  const callbacks = { onState: (...args) => events.push(['state', ...args]), onResult: text => events.push(['result', text]), onError: error => events.push(['error', error]) };
  return { capture: createSpeechCapture(callbacks, host), callbacks, instances, events, timers };
}

test('speech capture scores final results once and ignores callbacks after cancellation', () => {
  const { capture, instances, events, timers } = speechHarness();
  capture.start(); const recognition = instances[0];
  assert.equal(recognition.lang, 'en-US'); recognition.emit('hello', false);
  assert(!events.some(e => e[0] === 'result'));
  recognition.emit('Hello, how are you today?');
  recognition.emit('duplicate callback');
  assert.equal(events.filter(e => e[0] === 'result').length, 1);
  assert(recognition.aborted); assert.equal(timers.size, 0);
  capture.start(); const canceled = instances[1]; capture.cancel(); canceled.emit('late sentence');
  assert.equal(events.filter(e => e[0] === 'result').length, 1);
  assert(!events.some(e => e[0] === 'error'), 'Deliberate cancellation is not a speech failure');
});

test('microphone denial, empty capture, service timeout and unsupported browsers give recoverable errors', () => {
  const { capture, callbacks, instances, events, timers } = speechHarness();
  capture.start(); instances.at(-1).onerror({ error: 'not-allowed' });
  assert.deepEqual(events.at(-1), ['error', 'not-allowed']);
  capture.start(); instances.at(-1).onend();
  assert.deepEqual(events.at(-1), ['error', 'no-speech']);
  capture.start(); capture.stop(); assert(instances.at(-1).stopped);
  [...timers.values()][0](); assert.deepEqual(events.at(-1), ['error', 'network']);
  assert.equal(timers.size, 0);
  const unsupported = createSpeechCapture(callbacks, {});
  assert.equal(unsupported.supported, false); assert.equal(unsupported.start(), false);
  assert.deepEqual(events.at(-1), ['error', 'unsupported']);
});
