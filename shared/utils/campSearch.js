// Pure search rules for neutral/ancient camps (used by the in-game Search panel).
import { TIER_POWER_LEVEL, ANCIENT_POWER_LEVEL } from "./neutralCamps.js";

// Search filters: a camp's tier is fixed by its power level (see neutralCamps.js).
export const CAMP_TIERS = [
  { key: "t1",      label: "T1 Camps",      powerLevel: TIER_POWER_LEVEL[0] },
  { key: "t2",      label: "T2 Camps",      powerLevel: TIER_POWER_LEVEL[1] },
  { key: "t3",      label: "T3 Camps",      powerLevel: TIER_POWER_LEVEL[2] },
  { key: "ancient", label: "Ancient Camps", powerLevel: ANCIENT_POWER_LEVEL },
];

export function campTierForPowerLevel(pl) {
  return CAMP_TIERS.find(t => t.powerLevel === pl) ?? null;
}

// Camps within `radius` tiles of (cc, cr), nearest first. `tierKeys` is a Set of
// CAMP_TIERS keys. Only a camp's primary tile counts (isCamp), so a 2x2 camp is
// one result, not four. `tiles` may be the lazy tile map: unknown keys are skipped.
export function findCamps(tiles, cc, cr, tierKeys, { radius = 100, limit = 20 } = {}) {
  if (!tiles || !tierKeys?.size) return [];
  const wanted = new Set(CAMP_TIERS.filter(t => tierKeys.has(t.key)).map(t => t.powerLevel));
  const out = [];
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const dist = Math.sqrt(dc * dc + dr * dr);
      if (dist > radius) continue;
      const c = cc + dc, r = cr + dr;
      if (c < 0 || r < 0) continue;
      const key = `${c},${r}`;
      const tile = tiles[key];
      if (!tile?.isCamp || !wanted.has(tile.powerLevel)) continue;
      out.push({ key, c, r, pl: tile.powerLevel, name: tile.campName ?? "Camp", dist });
    }
  }
  out.sort((a, b) => a.dist - b.dist);
  return out.slice(0, limit);
}
