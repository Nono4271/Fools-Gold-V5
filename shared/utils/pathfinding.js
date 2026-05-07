import { COLS, ROWS } from "../constants/geometry.js";
import { TROOP } from "../constants/troops.js";

// ── Impassable tile set ───────────────────────────────────────────────────────
// Populated once after map generation with ocean/border-mountain tile keys.
// Using a module-level Set avoids threading tiles through every adj() call.
const IMPASSABLE = new Set();

export function setImpassableTiles(keys) {
  IMPASSABLE.clear();
  for (const k of keys) IMPASSABLE.add(k);
}

export function isShore(c, r) {
  return c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1;
}

export function adj(c, r) {
  const nbrs = [[c-1,r],[c+1,r],[c,r-1],[c,r+1]];
  return nbrs
    .filter(([tc,tr]) => {
      if (tc < 0 || tr < 0 || tc >= COLS || tr >= ROWS) return false;
      if (isShore(tc, tr)) return false;
      if (IMPASSABLE.has(`${tc},${tr}`)) return false;
      return true;
    })
    .map(([tc,tr]) => `${tc},${tr}`);
}

export function bfsPath(fromKey, toKey) {
  if (fromKey === toKey) return [fromKey];
  const queue = [[fromKey, [fromKey]]];
  const visited = new Set([fromKey]);
  while (queue.length) {
    const [cur, path] = queue.shift();
    const [cc, cr] = cur.split(",").map(Number);
    for (const nk of adj(cc, cr)) {
      if (visited.has(nk)) continue;
      visited.add(nk);
      const newPath = [...path, nk];
      if (nk === toKey) return newPath;
      queue.push([nk, newPath]);
    }
  }
  return null;
}

export function effectiveMarchSpd(cmdSpd, troopType, armySpdBonus = 0) {
  if (!troopType || !TROOP[troopType]) return (cmdSpd || 60) + armySpdBonus;
  const tSpd = TROOP[troopType].spd;
  return Math.round(tSpd * 0.80 + ((cmdSpd || 60) + armySpdBonus) * 0.20);
}

export function marchStepMs(effSpd) {
  return Math.max(200, 1400 - (effSpd || 60) * 10);
}
