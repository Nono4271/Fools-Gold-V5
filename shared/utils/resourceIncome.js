import { rssRate, storageMax } from '../constants/buildings.js';
const KEYS = ['stone','wood','gas','food'];
const BUILDINGS = {stone:'quarry',wood:'lumber',gas:'forge',food:'refinery'};
export const TILE_RATE_BY_PL = {2:240,3:280,4:360,5:420,6:560,7:640,8:720,9:800,10:1000,11:1200,12:1400,13:1600};
// elapsedMs defaults to one minute (the normal tick period) so callers that
// don't pass it behave exactly as before. Passing the real elapsed time lets
// a tick that fires late (backgrounded tab, locked phone) credit the full
// gap instead of losing it.
// Per-hour base income (200 + building rate + flat crew-perk bonus) for one
// elapsed period. Shared by the player's and the AI's income tick so both
// follow the same rules. `crewBonus` is a flat +N/hr per resource (Crew
// Level perks like Woodworking/Resource Trove — see shared/constants/crew.js
// crewResourceRateBonus) — flat, not tile-power-scaled, so it lives in the
// base income rather than addTileIncome.
function baseGains(buildings, mins, crewBonus = {}) {
  return Object.fromEntries(KEYS.map(key => [key, (200 + (buildings[BUILDINGS[key]] > 0 ? rssRate(buildings[BUILDINGS[key]]) : 0) + (crewBonus[key] || 0)) * mins / 60]));
}
// Adds one owned resource tile's hourly income to `gains`.
function addTileIncome(gains, tile, bonuses, mins, facBonus = 0) {
  const power = tile.powerLevel || 1;
  if (power === 1) for (const resource of KEYS) gains[resource] += 50 * mins / 60;
  else gains[tile.rss] += (TILE_RATE_BY_PL[power] ?? TILE_RATE_BY_PL[2]) * (1 + (bonuses[tile.rss] ?? 0) + facBonus) * mins / 60;
}
function applyGains(previous, gains, buildings) {
  const cap = storageMax(buildings.storage || 0);
  const next = Object.fromEntries(KEYS.map(key => [key, Math.min(cap, previous[key] + gains[key])]));
  return KEYS.every(key => next[key] === previous[key]) ? previous : next;
}

// Real per-hour income rate for display (e.g. the HUD's "+N/h" labels).
// Same base+tile rules as resourceIncomeTick, just returned as an hourly
// rate instead of applied/capped against a stored total. `pKeys` are the
// player's owned tile keys (HUD already computes this for tileCount/power).
export function hourlyRssRate(tiles, pKeys = [], buildings = {}, forts = [], bonuses = {}, facBonus = 0, crewBonus = {}) {
  const gains = baseGains(buildings, 60, crewBonus);
  const fortKeys = new Set(forts.map(fort => fort.tileKey));
  for (const key of pKeys) {
    const tile = tiles?.[key];
    if (!tile || !KEYS.includes(tile.rss) || fortKeys.has(key)) continue;
    addTileIncome(gains, tile, bonuses, 60, facBonus);
  }
  return Object.fromEntries(KEYS.map(key => [key, Math.floor(gains[key])]));
}

export function resourceIncomeTick(previous, tiles, buildings = {}, forts = [], bonuses = {}, elapsedMs = 60000, facBonus = 0, crewBonus = {}) {
  const mins = elapsedMs / 60000;
  const gains = baseGains(buildings, mins, crewBonus);
  const fortKeys = new Set(forts.map(fort => fort.tileKey));
  for (const [key, tile] of Object.entries(tiles)) {
    if (tile.owner !== 'player' || !KEYS.includes(tile.rss) || fortKeys.has(key)) continue;
    addTileIncome(gains, tile, bonuses, mins, facBonus);
  }
  return applyGains(previous, gains, buildings);
}

// AI faction income: exactly the player's per-HOUR rates (200 base + building rate,
// per-tile rates by power level, storage cap), credited for the real time that
// passed. `tileKeys` are the faction's owned tile keys; `tiles` is the tile map.
// (This used to add +5 and rssRate() per tile every SECOND, i.e. thousands of
// times the player's income.)
export function aiResourceIncomeTick(previous, tiles, tileKeys, buildings = {}, elapsedMs = 1000) {
  if (!(elapsedMs > 0)) return previous;
  const mins = elapsedMs / 60000;
  const gains = baseGains(buildings, mins);
  for (const key of tileKeys || []) {
    const tile = tiles?.[key];
    if (!tile || !KEYS.includes(tile.rss)) continue;
    addTileIncome(gains, tile, {}, mins);
  }
  return applyGains(previous, gains, buildings);
}
