// Device-local game state. XP and ownership are derived from one chest per calendar day.
export const AVATAR_GROUPS = {
  top: { label: 'Hair & hats', choices: [['shortFlat', 'Short hair'], ['shortCurly', 'Short curls'], ['bob', 'Bob'], ['bun', 'Bun'], ['curly', 'Long curls'], ['straight01', 'Long straight hair'], ['fro', 'Afro'], ['shavedSides', 'Shaved sides'], ['hijab', 'Hijab'], ['turban', 'Turban']] },
  clothing: { label: 'Clothes', choices: [['shirtCrewNeck', 'T-shirt'], ['hoodie', 'Hoodie'], ['blazerAndShirt', 'Blazer']] },
  accessories: { label: 'Accessories', choices: [['none', 'No glasses'], ['prescription01', 'Everyday glasses']] },
  eyes: { label: 'Eyes', choices: [['default', 'Bright eyes'], ['happy', 'Happy'], ['wink', 'Wink'], ['surprised', 'Surprised']] },
  mouth: { label: 'Smile', choices: [['smile', 'Big smile'], ['default', 'Relaxed'], ['twinkle', 'Little smile'], ['tongue', 'Playful']] },
  frame: { label: 'Avatar frame', choices: [['plain', 'Classic'], ['blue', 'Blue outline']] },
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
];
export const DEFAULT_PROFILE = Object.freeze({ name: '', top: 'shortCurly', clothing: 'hoodie', accessories: 'none', eyes: 'happy', mouth: 'smile', frame: 'plain', skinColor: 'edb98a', hairColor: '4a312c', clothesColor: '49c0f8', hatColor: 'ff4b55', accessoriesColor: '262e33', backgroundColor: '183c4a', updatedAt: 0 });
export function createGame() { return { profile: { ...DEFAULT_PROFILE }, chests: [] }; }
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
function cleanChest(raw) {
  if (!raw || !isDay(raw.day) || ![5, 10, 15, 20, 30].includes(raw.goal) || !Number.isInteger(raw.taps) || raw.taps < 0 || raw.taps > 3) return null;
  if (raw.itemId !== null && !REWARD_ITEMS.some(item => item.id === raw.itemId)) return null;
  return { day: raw.day, goal: raw.goal, taps: raw.taps, itemId: raw.itemId, xp: raw.itemId ? 40 : 80, earnedAt: safeTime(raw.earnedAt), openedAt: raw.taps === 3 ? safeTime(raw.openedAt) : 0 };
}
export function normalizeGame(raw) {
  const days = new Map();
  for (const value of Array.isArray(raw?.chests) ? raw.chests.slice(0, 20000) : []) {
    const chest = cleanChest(value); if (!chest) continue;
    const existing = days.get(chest.day);
    if (!existing) days.set(chest.day, chest);
    else {
      // Stable reward choice plus monotonic tap count reconciles old backups / other tabs.
      const first = existing.earnedAt < chest.earnedAt || (existing.earnedAt === chest.earnedAt && String(existing.itemId) <= String(chest.itemId)) ? existing : chest;
      days.set(chest.day, { ...first, taps: Math.max(existing.taps, chest.taps), openedAt: Math.max(existing.openedAt, chest.openedAt) });
    }
  }
  const game = { chests: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)) };
  game.profile = normalizeProfile(raw?.profile, inventory(game));
  return game;
}
export function mergeGames(a, b) {
  a = normalizeGame(a); b = normalizeGame(b);
  const profile = a.profile.updatedAt >= b.profile.updatedAt ? a.profile : b.profile;
  return normalizeGame({ profile, chests: [...a.chests, ...b.chests] });
}
export function earnDailyChest(game, day, count, goal, now = Date.now(), random = Math.random) {
  if (!isDay(day) || ![5, 10, 15, 20, 30].includes(goal) || count < goal || game.chests.some(chest => chest.day === day)) return game;
  const reserved = new Set(game.chests.map(chest => chest.itemId));
  const candidates = REWARD_ITEMS.filter(item => !reserved.has(item.id));
  const index = Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)));
  const itemId = candidates[index]?.id || null;
  return { ...game, chests: [...game.chests, { day, goal, taps: 0, itemId, xp: itemId ? 40 : 80, earnedAt: now, openedAt: 0 }] };
}
export function tapChest(game, day, now = Date.now()) {
  const chest = game.chests.find(c => c.day === day);
  if (!chest || chest.taps >= 3) return { game, chest, opened: false };
  const next = { ...chest, taps: chest.taps + 1, openedAt: chest.taps === 2 ? now : 0 };
  return { game: { ...game, chests: game.chests.map(c => c.day === day ? next : c) }, chest: next, opened: next.taps === 3 };
}
export const bonusXP = game => game.chests.filter(c => c.taps === 3).reduce((total, c) => total + c.xp, 0);
export function equipItem(game, itemId, now = Date.now()) {
  const item = REWARD_ITEMS.find(item => item.id === itemId);
  if (!item || !inventory(game).has(itemId)) return game;
  return { ...game, profile: normalizeProfile({ ...game.profile, [item.field]: item.value, updatedAt: now }, inventory(game)) };
}
