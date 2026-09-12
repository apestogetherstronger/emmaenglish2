import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, initializeRewards, creditPractice, earnBonusChests, bonusProgress, pendingChests, chooseChestStyle, avatarDrySpell, earnDailyChest, tapChest, normalizeGame, mergeGames, inventory, bonusXP, equipItem, normalizeProfile, DEFAULT_PROFILE, REWARD_ITEMS } from '../dist/game.js';
import { SENTENCES, assessSpeech, cleanSpeaking, mergeSpeaking, createSpeechCapture } from '../dist/speaking.js';

const fixedGame = (seed = 0) => initializeRewards(createGame(), 100, () => seed / 4294967296);
const open = (game, id, now = 200) => { for (let i = 0; i < 3; i++) game = tapChest(game, id, now + i).game; return game; };

test('first chest offers one of three styles only after three taps, with stable choices and one claim', () => {
  let game = fixedGame();
  assert.equal(earnDailyChest(game, '2026-09-12', 29, 30), game);
  game = earnDailyChest(game, '2026-09-12', 30, 30, 101);
  const original = structuredClone(game), id = game.chests[0].id;
  assert(game.chests[0].avatarPrize); assert(game.chests[0].xp >= 20 && game.chests[0].xp <= 50);
  game = tapChest(game, id).game; game = tapChest(game, id).game;
  game = normalizeGame(JSON.parse(JSON.stringify(game)));
  assert.equal(game.chests[0].taps, 2); assert.equal(bonusXP(game), 0); assert.equal(inventory(game).size, 0);
  const third = tapChest(game, id); assert(third.opened); game = third.game;
  const choices = game.chests[0].choices, xp = game.chests[0].xp;
  assert.equal(choices.length, 3); assert.equal(new Set(choices).size, 3);
  assert.equal(bonusXP(game), xp); assert.equal(inventory(game).size, 0);
  assert.deepEqual(normalizeGame(JSON.parse(JSON.stringify(game))).chests[0].choices, choices);
  const invalid = REWARD_ITEMS.find(item => !choices.includes(item.id)).id;
  assert.equal(chooseChestStyle(game, id, invalid), game);
  game = chooseChestStyle(game, id, choices[0], 400);
  assert.deepEqual([...inventory(game)], [choices[0]]);
  assert.equal(chooseChestStyle(game, id, choices[1]), game);
  assert.equal(tapChest(game, id).game, game);
  game = mergeGames(original, mergeGames(game, game));
  assert.equal(game.chests.length, 1); assert.equal(bonusXP(game), xp);
  assert.deepEqual([...inventory(game)], [choices[0]]);
  const reward = REWARD_ITEMS.find(item => item.id === choices[0]); game = equipItem(game, reward.id, 500);
  assert.equal(normalizeGame(game).profile[reward.field], reward.value);
  assert.equal(earnDailyChest(game, '2026-09-12', 90, 5), game, 'Only one daily chest, even after changing the goal');
});

test('bonus chests use only practice credits, retain overflow overnight, and coexist with daily rewards', () => {
  let game = fixedGame(); const target = bonusProgress(game).target;
  assert(target >= 240 && target <= 400);
  for (let i = 0; i < Math.ceil(target / 10) - 1; i++) game = creditPractice(game, `q:first-${i}`, 10, '2026-09-12', 102 + i);
  assert.equal(game.chests.length, 0);
  const before = bonusProgress(game);
  game = normalizeGame(JSON.parse(JSON.stringify(game)));
  assert.deepEqual(bonusProgress(game), before, 'Reload does not reroll the threshold');
  game = earnDailyChest(game, '2026-09-12', 30, 30, 150);
  assert.deepEqual(bonusProgress(game), before, 'Daily chests do not spend bonus progress');
  game = creditPractice(game, 'q:tomorrow', 10, '2026-09-13', 160);
  const bonus = game.chests.find(c => c.kind === 'bonus'); assert(bonus);
  assert.equal(bonus.cost, target); assert.equal(bonus.day, '2026-09-13');
  assert.equal(bonusProgress(game).progress, Math.ceil(target / 10) * 10 - target);
  const after = bonusProgress(game);
  game = open(game, game.chests[0].id);
  assert.deepEqual(bonusProgress(game), after, 'Chest XP never earns another chest');
  game = chooseChestStyle(game, game.chests[0].id, game.chests[0].choices[0]);
  game = open(game, bonus.id);
  assert.deepEqual(bonusProgress(game), after);
  assert.equal(creditPractice(game, 'q:tomorrow', 10, '2026-09-13'), game);
  assert.equal(creditPractice(game, 'chest:reward', 50, '2026-09-13'), game);
  for (let i = 0; i < 90; i++) game = creditPractice(game, `q:extra-${i}`, 10, '2026-09-13', 170 + i);
  game = earnDailyChest(game, '2026-09-13', 90, 30, 300);
  const today = game.chests.filter(c => c.day === '2026-09-13');
  assert(today.filter(c => c.kind === 'bonus').length >= 3);
  assert.equal(today.filter(c => c.kind === 'daily').length, 1);
  assert.equal(normalizeGame(game).chests.length, game.chests.length, 'Multiple chests on one day survive normalization');
});

test('merging tabs or backups combines practice without rerolling or duplicating a bonus', () => {
  const base = fixedGame(); let a = base, b = base;
  for (let i = 0; i < 16; i++) {
    a = creditPractice(a, `q:a-${i}`, 10, '2026-09-12', 101 + i);
    b = creditPractice(b, `q:b-${i}`, 10, '2026-09-12', 101 + i);
  }
  assert.equal(a.chests.length + b.chests.length, 0);
  let combined = earnBonusChests(mergeGames(a, b), '2026-09-12', 130);
  assert.equal(combined.chests.length, 1); assert.equal(bonusProgress(combined).earned, 320);
  const snapshot = structuredClone(combined);
  combined = earnBonusChests(mergeGames(combined, mergeGames(b, a)), '2026-09-12', 140);
  assert.deepEqual(combined, snapshot);
  assert.deepEqual(mergeGames(a, b), mergeGames(b, a));
});

test('five missed avatar prizes guarantee the sixth, including across reloads and days', () => {
  let game = fixedGame(4);
  for (let day = 1; day <= 7; day++) {
    game = earnDailyChest(game, `2026-01-${String(day).padStart(2, '0')}`, 30, 30, 100 + day);
    game = normalizeGame(JSON.parse(JSON.stringify(game)));
  }
  assert.deepEqual(game.chests.map(c => c.avatarPrize), [true, false, false, false, false, false, true]);
  assert.equal(avatarDrySpell(game), 0);
  const original = structuredClone(game); const id = game.chests[0].id;
  game = open(game, id); const choices = game.chests[0].choices;
  assert.equal(tapChest(game, game.chests[1].id).game, game, 'Finish the existing style choice before opening another chest');
  game = chooseChestStyle(game, id, choices[0]);
  game = open(game, game.chests[1].id);
  assert.equal(game.chests[1].itemId, null); assert.deepEqual(game.chests[1].choices, []);
  assert.equal(inventory(game).size, 1);
  assert.equal(pendingChests(mergeGames(original, game)).length, 5);
});

test('unselected styles can return later, duplicate items stay excluded, and a full collection earns XP-only chests', () => {
  let game = fixedGame(4), firstUnselected = [];
  for (let i = 0; i < 100 && inventory(game).size < REWARD_ITEMS.length; i++) {
    const day = new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10);
    game = earnDailyChest(game, day, 30, 30, 101 + i);
    const id = game.chests.at(-1).id; const owned = inventory(game);
    game = open(game, id); const chest = game.chests.at(-1);
    if (chest.avatarPrize) {
      assert(chest.choices.length > 0 && chest.choices.length <= 3);
      assert(chest.choices.every(choice => !owned.has(choice)));
      if (!firstUnselected.length) firstUnselected = chest.choices.slice(1);
      game = chooseChestStyle(game, id, chest.choices[0]);
    }
  }
  assert.equal(inventory(game).size, REWARD_ITEMS.length);
  assert(firstUnselected.every(id => inventory(game).has(id)));
  game = earnDailyChest(game, '2026-12-31', 30, 30, 1000);
  const last = game.chests.at(-1); assert.equal(last.avatarPrize, false); assert(last.xp >= 20 && last.xp <= 50);
});

test('legacy chests keep their original prizes and tap count when upgraded or restored', () => {
  const old = { profile: { ...DEFAULT_PROFILE, accessories: 'sunglasses', updatedAt: 4 }, chests: [
    { day: '2026-09-10', goal: 30, taps: 3, itemId: 'sunglasses', xp: 40, earnedAt: 1, openedAt: 2 },
    { day: '2026-09-11', goal: 30, taps: 2, itemId: 'explorer-hat', xp: 40, earnedAt: 3, openedAt: 0 },
    { day: '2026-09-12', goal: 30, taps: 0, itemId: null, xp: 80, earnedAt: 4, openedAt: 0 },
  ] };
  let game = initializeRewards(normalizeGame(old), 100, () => 0);
  assert.equal(game.profile.accessories, 'sunglasses'); assert.equal(bonusProgress(game).earned, 0);
  game = tapChest(game, 'daily:2026-09-11', 200).game;
  assert(inventory(game).has('explorer-hat')); assert.equal(bonusXP(game), 80);
  game = open(game, 'daily:2026-09-12', 300);
  assert.equal(bonusXP(mergeGames(old, game)), 160);
  assert.deepEqual([...inventory(mergeGames(game, old))].sort(), ['explorer-hat', 'sunglasses']);
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
