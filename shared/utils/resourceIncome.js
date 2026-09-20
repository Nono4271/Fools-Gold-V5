import { rssRate, storageMax } from '../constants/buildings.js';
const KEYS = ['stone','wood','gas','food'];
const BUILDINGS = {stone:'quarry',wood:'lumber',gas:'forge',food:'refinery'};
export const TILE_RATE_BY_PL = {2:240,3:280,4:360,5:420,6:560,7:640,8:720,9:800,10:1000,11:1200,12:1400,13:1600};
// elapsedMs defaults to one minute (the normal tick period) so callers that
// don't pass it behave exactly as before. Passing the real elapsed time lets
// a tick that fires late (backgrounded tab, locked phone) credit the full
// gap instead of losing it.
export function resourceIncomeTick(previous, tiles, buildings = {}, forts = [], bonuses = {}, elapsedMs = 60000) {
  const mins = elapsedMs / 60000;
  const gains = Object.fromEntries(KEYS.map(key => [key, (200 + (buildings[BUILDINGS[key]] > 0 ? rssRate(buildings[BUILDINGS[key]]) : 0)) * mins / 60]));
  const fortKeys = new Set(forts.map(fort => fort.tileKey));
  for (const [key, tile] of Object.entries(tiles)) {
    if (tile.owner !== 'player' || !KEYS.includes(tile.rss) || fortKeys.has(key)) continue;
    const power = tile.powerLevel || 1;
    if (power === 1) for (const resource of KEYS) gains[resource] += 50 * mins / 60;
    else gains[tile.rss] += (TILE_RATE_BY_PL[power] ?? TILE_RATE_BY_PL[2]) * (1 + (bonuses[tile.rss] ?? 0)) * mins / 60;
  }
  const cap = storageMax(buildings.storage || 0);
  const next = Object.fromEntries(KEYS.map(key => [key, Math.min(cap, previous[key] + gains[key])]));
  return KEYS.every(key => next[key] === previous[key]) ? previous : next;
}
