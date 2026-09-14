// Device-local rewards. Practice credits, chest claims and avatar ownership merge by stable IDs.
export const AVATAR_GROUPS = {
  top: { label: 'Hair & hats', choices: [['shortFlat', 'Short hair'], ['shortCurly', 'Short curls'], ['bob', 'Bob'], ['bun', 'Bun'], ['curly', 'Long curls'], ['straight01', 'Long straight hair'], ['fro', 'Afro'], ['shavedSides', 'Shaved sides'], ['hijab', 'Hijab'], ['turban', 'Turban']] },
  clothing: { label: 'Clothes', choices: [['shirtCrewNeck', 'T-shirt'], ['hoodie', 'Hoodie'], ['blazerAndShirt', 'Blazer']] },
  accessories: { label: 'Accessories', choices: [['none', 'No glasses'], ['prescription01', 'Everyday glasses']] },
  eyes: { label: 'Eyes', choices: [['default', 'Bright eyes'], ['happy', 'Happy'], ['wink', 'Wink'], ['surprised', 'Surprised']] },
  mouth: { label: 'Smile', choices: [['smile', 'Big smile'], ['default', 'Relaxed'], ['twinkle', 'Little smile'], ['tongue', 'Playful']] },
  frame: { label: 'Avatar frame', choices: [['plain', 'Classic'], ['blue', 'Blue outline']] },
  backdrop: { label: 'Avatar background', choices: [['solid', 'Solid color']] },
};
export const AVATAR_COLORS = { skinColor: 'Skin tone', hairColor: 'Hair color', clothesColor: 'Clothes color', hatColor: 'Hat color', accessoriesColor: 'Glasses color', backgroundColor: 'Background color' };
export const REWARD_ITEMS = [
  { id: 'sunglasses', field: 'accessories', value: 'sunglasses', label: 'Sunshine shades' },
  { id: 'explorer-hat', field: 'top', value: 'hat', label: 'Explorer hat' },
  { id: 'star-shirt', field: 'clothing', value: 'graphicShirt', label: 'Diamond shirt' },
  { id: 'gold-frame', field: 'frame', value: 'gold', label: 'Golden glow' },
  { id: 'winter-hat', field: 'top', value: 'winterHat02', label: 'Cozy winter hat' },
  { id: 'heart-eyes', field: 'eyes', value: 'hearts', label: 'Heart eyes' },
  { id: 'round-glasses', field: 'accessories', value: 'round', label: 'Round glasses' },
  { id: 'overalls', field: 'clothing', value: 'overall', label: 'Adventure overalls' },
  { id: 'aurora-frame', field: 'frame', value: 'aurora', label: 'Aurora glow' },
  { id: 'wayfarers', field: 'accessories', value: 'wayfarers', label: 'Weekend shades' },
  { id: 'sweater', field: 'clothing', value: 'collarAndSweater', label: 'Cozy sweater' },
  { id: 'frida', field: 'top', value: 'frida', label: 'Flower crown' },
  { id: 'snow-day-beanie', field: 'top', value: 'winterHat1', label: 'Snow day beanie' },
  { id: 'striped-beanie', field: 'top', value: 'winterHat03', label: 'Striped beanie' },
  { id: 'pom-pom-beanie', field: 'top', value: 'winterHat04', label: 'Pom-pom beanie' },
  { id: 'headband-afro', field: 'top', value: 'froBand', label: 'Headband afro' },
  { id: 'adventure-locs', field: 'top', value: 'dreads01', label: 'Adventure locs' },
  { id: 'wavy-hair', field: 'top', value: 'longButNotTooLong', label: 'Wavy hair' },
  { id: 'v-neck-shirt', field: 'clothing', value: 'shirtVNeck', label: 'V-neck shirt' },
  { id: 'smart-sweater', field: 'clothing', value: 'blazerAndSweater', label: 'Smart sweater' },
  { id: 'bold-glasses', field: 'accessories', value: 'prescription02', label: 'Bold glasses' },
  { id: 'cheeky-wink', field: 'eyes', value: 'winkWacky', label: 'Cheeky wink' },
  { id: 'sunset-frame', field: 'frame', value: 'sunset', label: 'Sunset glow' },
  { id: 'ocean-frame', field: 'frame', value: 'ocean', label: 'Ocean glow' },
  { id: 'mint-frame', field: 'frame', value: 'mint', label: 'Mint sparkle' },
  { id: 'candy-frame', field: 'frame', value: 'candy', label: 'Candy swirl' },
  { id: 'galaxy-frame', field: 'frame', value: 'galaxy', label: 'Galaxy glow' },
  { id: 'rainbow-frame', field: 'frame', value: 'rainbow', label: 'Rainbow halo' },
  { id: 'starfield-background', field: 'backdrop', value: 'starfield', label: 'Starry sky' },
  { id: 'bubbles-background', field: 'backdrop', value: 'bubbles', label: 'Bubble party' },
  { id: 'confetti-background', field: 'backdrop', value: 'confetti', label: 'Confetti party' },
  { id: 'sunset-background', field: 'backdrop', value: 'sunset', label: 'Golden sunset' },
  { id: 'waves-background', field: 'backdrop', value: 'waves', label: 'Ocean waves' },
  { id: 'meadow-background', field: 'backdrop', value: 'meadow', label: 'Flower meadow' },
  { id: 'diamonds-background', field: 'backdrop', value: 'diamonds', label: 'Lavender diamonds' },
  { id: 'clouds-background', field: 'backdrop', value: 'clouds', label: 'Cloud nine' },
];
export const DEFAULT_PROFILE = Object.freeze({ name: '', top: 'shortCurly', clothing: 'hoodie', accessories: 'none', eyes: 'happy', mouth: 'smile', frame: 'plain', backdrop: 'solid', skinColor: 'edb98a', hairColor: '4a312c', clothesColor: '49c0f8', hatColor: 'ff4b55', accessoriesColor: '262e33', backgroundColor: '183c4a', updatedAt: 0 });
export function createGame() { return { profile: { ...DEFAULT_PROFILE }, chests: [], rewards: null }; }
export const isDay = day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
const safeTime = value => Number.isFinite(value) && value >= 0 && value <= 8640000000000000 ? value : 0;
export function inventory(game) { return new Set(game.chests.filter(c => c.taps === 3 && c.itemId).map(c => c.itemId)); }
export function profileChoices(field, owned = new Set()) {
  return [...(AVATAR_GROUPS[field]?.choices || []).map(([value, label]) => ({ value, label, locked: false })), ...REWARD_ITEMS.filter(item => item.field === field).map(item => ({ value: item.value, label: item.label, itemId: item.id, locked: !owned.has(item.id) }))];
}
export function normalizeProfile(raw, owned = new Set()) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const profile = { ...DEFAULT_PROFILE, name: typeof raw.name === 'string' ? raw.name.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 24) : '', updatedAt: safeTime(raw.updatedAt) };
  for (const field of Object.keys(AVATAR_GROUPS)) if (profileChoices(field, owned).some(choice => !choice.locked && choice.value === raw[field])) profile[field] = raw[field];
  for (const field of Object.keys(AVATAR_COLORS)) if (typeof raw[field] === 'string' && /^[a-f\d]{6}$/i.test(raw[field])) profile[field] = raw[field].toLowerCase();
  return profile;
}
const itemExists = id => REWARD_ITEMS.some(item => item.id === id);
const isSeed = value => Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
const chestOrder = (a, b) => a.earnedAt - b.earnedAt || a.id.localeCompare(b.id);
function randomValue(seed, key) {
  // The saved seed and stable keys keep every draw unchanged on refresh or backup restoration.
  let value = seed ^ 2166136261;
  for (const char of key) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}
function cleanRewards(raw) {
  if (!raw || !isSeed(raw.seed)) return null;
  const credits = new Map();
  for (const credit of Array.isArray(raw.credits) ? raw.credits.slice(-150000) : []) {
    if (!credit || typeof credit.id !== 'string' || credit.id.length > 1100 || !/^[qs]:/.test(credit.id) || credit.xp !== (credit.id.startsWith('q:') ? 10 : 5)) continue;
    credits.set(credit.id, { id: credit.id, xp: credit.xp });
  }
  return { seed: raw.seed, startedAt: safeTime(raw.startedAt), credits: [...credits.values()].sort((a, b) => a.id.localeCompare(b.id)) };
}
export function initializeRewards(game, now = Date.now(), random = Math.random) {
  if (game.rewards) return game;
  return { ...game, rewards: { seed: Math.floor(random() * 4294967296) >>> 0, startedAt: now, credits: [] } };
}
function cleanChest(raw) {
  if (!raw || !isDay(raw.day) || !Number.isInteger(raw.taps) || raw.taps < 0 || raw.taps > 3) return null;
  if (raw.itemId !== null && !itemExists(raw.itemId)) return null;
  const base = { day: raw.day, taps: raw.taps, itemId: raw.itemId, earnedAt: safeTime(raw.earnedAt), openedAt: raw.taps === 3 ? safeTime(raw.openedAt) : 0 };
  if (raw.rewardVersion === undefined || raw.rewardVersion === 1) {
    if (![5, 10, 15, 20, 30].includes(raw.goal)) return null;
    // Existing chests retain their original 40/80 XP and promised collectible, even if unopened.
    return { ...base, id: `daily:${raw.day}`, kind: 'daily', goal: raw.goal, rewardVersion: 1, xp: raw.itemId ? 40 : 80, avatarPrize: Boolean(raw.itemId), choices: [], chosenAt: 0, cost: 0, seed: 0 };
  }
  if (raw.rewardVersion !== 2 || !isSeed(raw.seed) || !Number.isInteger(raw.xp) || raw.xp < 20 || raw.xp > 50 || typeof raw.avatarPrize !== 'boolean') return null;
  if (raw.kind === 'daily') {
    if (raw.id !== `daily:${raw.day}` || ![5, 10, 15, 20, 30].includes(raw.goal)) return null;
  } else if (raw.kind === 'bonus') {
    if (typeof raw.id !== 'string' || !/^bonus:\d{1,10}:\d{1,6}$/.test(raw.id) || !Number.isInteger(raw.cost) || raw.cost < 240 || raw.cost > 400) return null;
  } else return null;
  const choices = raw.taps === 3 && raw.avatarPrize && Array.isArray(raw.choices) ? [...new Set(raw.choices.filter(itemExists))].slice(0, 3) : [];
  const itemId = choices.includes(raw.itemId) ? raw.itemId : null;
  return { ...base, itemId, id: raw.id, kind: raw.kind, goal: raw.kind === 'daily' ? raw.goal : null, rewardVersion: 2, xp: raw.xp, avatarPrize: raw.avatarPrize, choices, chosenAt: itemId ? safeTime(raw.chosenAt) : 0, cost: raw.kind === 'bonus' ? raw.cost : 0, seed: raw.seed };
}
function mergeChest(a, b) {
  const first = [a, b].sort((x, y) => x.rewardVersion - y.rewardVersion || chestOrder(x, y) || x.seed - y.seed || String(x.itemId).localeCompare(String(y.itemId)))[0];
  const opened = [a, b].filter(c => c.taps === 3).sort((x, y) => x.openedAt - y.openedAt || JSON.stringify(x.choices).localeCompare(JSON.stringify(y.choices)))[0];
  const merged = { ...first, taps: Math.max(a.taps, b.taps), openedAt: opened?.openedAt || 0 };
  if (first.rewardVersion === 2 && opened) {
    merged.avatarPrize = opened.avatarPrize;
    merged.choices = opened.choices;
    const selected = [a, b].filter(c => c.itemId && merged.choices.includes(c.itemId)).sort((x, y) => x.chosenAt - y.chosenAt || x.itemId.localeCompare(y.itemId))[0];
    merged.itemId = selected?.itemId || null; merged.chosenAt = selected?.chosenAt || 0;
  }
  return merged;
}
export function normalizeGame(raw) {
  const chests = new Map();
  for (const value of Array.isArray(raw?.chests) ? raw.chests.slice(-20000) : []) {
    const chest = cleanChest(value); if (!chest) continue;
    chests.set(chest.id, chests.has(chest.id) ? mergeChest(chests.get(chest.id), chest) : chest);
  }
  const game = { chests: [...chests.values()].sort(chestOrder), rewards: cleanRewards(raw?.rewards) };
  game.profile = normalizeProfile(raw?.profile, inventory(game));
  return game;
}
export function mergeGames(a, b) {
  a = normalizeGame(a); b = normalizeGame(b);
  const profile = a.profile.updatedAt >= b.profile.updatedAt ? a.profile : b.profile;
  const first = [a.rewards, b.rewards].filter(Boolean).sort((x, y) => x.startedAt - y.startedAt || x.seed - y.seed)[0];
  const rewards = first ? { ...first, credits: [...(a.rewards?.credits || []), ...(b.rewards?.credits || [])] } : null;
  return normalizeGame({ profile, chests: [...a.chests, ...b.chests], rewards });
}
export function avatarDrySpell(game) {
  let misses = 0;
  for (const chest of [...game.chests].sort(chestOrder)) misses = chest.avatarPrize ? 0 : misses + 1;
  return Math.min(misses, 5);
}
function rewardSlots(game) {
  const reserved = new Set(game.chests.filter(c => c.itemId).map(c => c.itemId));
  const awaiting = game.chests.filter(c => c.avatarPrize && !c.itemId).length;
  return Math.max(0, REWARD_ITEMS.length - reserved.size - awaiting);
}
function addChest(game, details, now) {
  const seed = game.rewards.seed, id = details.id;
  const avatarPrize = rewardSlots(game) > 0 && (game.chests.length === 0 || avatarDrySpell(game) >= 5 || randomValue(seed, `${id}:avatar`) < 0.2);
  // Preserve earning order when several rewards land within the same millisecond.
  const earnedAt = Math.max(now, ...game.chests.map(c => c.earnedAt + 1));
  const chest = { ...details, rewardVersion: 2, seed, taps: 0, itemId: null, choices: [], chosenAt: 0, xp: 20 + Math.floor(randomValue(seed, `${id}:xp`) * 31), avatarPrize, earnedAt, openedAt: 0 };
  return { ...game, chests: [...game.chests, chest] };
}
export function earnDailyChest(game, day, count, goal, now = Date.now(), random = Math.random) {
  if (!isDay(day) || ![5, 10, 15, 20, 30].includes(goal) || count < goal || game.chests.some(chest => chest.id === `daily:${day}` || (!chest.id && chest.day === day))) return game;
  game = initializeRewards(game, now, random);
  return addChest(game, { id: `daily:${day}`, kind: 'daily', day, goal, cost: 0 }, now);
}
export function bonusProgress(game) {
  if (!game.rewards) return { earned: 0, spent: 0, progress: 0, target: 0, index: 1 };
  const earned = game.rewards.credits.reduce((sum, credit) => sum + credit.xp, 0);
  const spent = game.chests.reduce((sum, chest) => sum + (chest.cost || 0), 0);
  const prefix = `bonus:${game.rewards.seed}:`;
  const index = 1 + Math.max(0, ...game.chests.filter(c => c.id.startsWith(prefix)).map(c => Number(c.id.slice(prefix.length))));
  return { earned, spent, progress: Math.max(0, earned - spent), target: 240 + Math.floor(randomValue(game.rewards.seed, `threshold:${index}`) * 161), index };
}
export function earnBonusChests(game, day, now = Date.now()) {
  if (!game.rewards || !isDay(day)) return game;
  let progress = bonusProgress(game);
  while (progress.earned - progress.spent >= progress.target) {
    game = addChest(game, { id: `bonus:${game.rewards.seed}:${progress.index}`, kind: 'bonus', day, goal: null, cost: progress.target }, now);
    progress = bonusProgress(game);
  }
  return game;
}
export function creditPractice(game, id, xp, day, now = Date.now()) {
  if (typeof id !== 'string' || id.length > 1100 || !/^[qs]:/.test(id) || xp !== (id.startsWith('q:') ? 10 : 5)) return game;
  game = initializeRewards(game, now);
  if (game.rewards.credits.some(credit => credit.id === id)) return game;
  game = { ...game, rewards: { ...game.rewards, credits: [...game.rewards.credits, { id, xp }] } };
  return earnBonusChests(game, day, now);
}
export function pendingChests(game) {
  const complete = inventory(game).size === REWARD_ITEMS.length;
  return [...game.chests].sort(chestOrder).filter(c => c.taps < 3 || (c.avatarPrize && !c.itemId && !complete));
}
function availableChoices(game, chest) {
  const reserved = new Set(game.chests.filter(c => c.itemId).map(c => c.itemId));
  return REWARD_ITEMS.filter(item => !reserved.has(item.id)).sort((a, b) => randomValue(chest.seed, `${chest.id}:${a.id}`) - randomValue(chest.seed, `${chest.id}:${b.id}`)).slice(0, 3).map(item => item.id);
}
export function tapChest(game, id, now = Date.now()) {
  const chest = game.chests.find(c => c.id === id || (c.kind === 'daily' && c.day === id));
  if (!chest || chest.taps >= 3 || pendingChests(game)[0]?.id !== chest.id) return { game, chest, opened: false };
  const next = { ...chest, taps: chest.taps + 1, openedAt: chest.taps === 2 ? now : 0 };
  if (next.taps === 3 && next.rewardVersion === 2 && next.avatarPrize) {
    next.choices = availableChoices(game, next);
    if (!next.choices.length) next.avatarPrize = false;
  }
  return { game: { ...game, chests: game.chests.map(c => c.id === chest.id ? next : c) }, chest: next, opened: next.taps === 3 };
}
export function chooseChestStyle(game, id, itemId, now = Date.now()) {
  const chest = game.chests.find(c => c.id === id);
  if (!chest || chest.taps !== 3 || !chest.avatarPrize || chest.itemId || !chest.choices.includes(itemId) || inventory(game).has(itemId)) return game;
  return { ...game, chests: game.chests.map(c => c.id === id ? { ...c, itemId, chosenAt: now } : c) };
}
export const bonusXP = game => game.chests.filter(c => c.taps === 3).reduce((total, c) => total + c.xp, 0);
export function equipItem(game, itemId, now = Date.now()) {
  const item = REWARD_ITEMS.find(item => item.id === itemId);
  if (!item || !inventory(game).has(itemId)) return game;
  return { ...game, profile: normalizeProfile({ ...game.profile, [item.field]: item.value, updatedAt: now }, inventory(game)) };
}
