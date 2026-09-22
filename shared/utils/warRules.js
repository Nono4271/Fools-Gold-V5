// ─────────────────────────────────────────────────────────────────────────────
//  warRules.js — the enemy-territory siege debuff. Pure, no React/DOM/state.
//
//  Territory model: capturing a region's Keep flips the WHOLE region's
//  territory to the capturing crew's faction (owner-goal decision — regions
//  are the unit of territory control, not individual tiles). `regionOwners`
//  is a plain map `{ [regionKey]: factionKey }`, built up over the game by
//  calling recordRegionCapture() whenever a Keep tile is captured (see the
//  call sites in useMarch.js). A region with no entry is neutral (never
//  captured yet).
//
//  The debuff: any siege army hitting an enemy-owned tile/keep/fort/
//  fortress inside a region controlled by an OPPOSING faction takes -70%
//  siege power, UNLESS the attacker's own crew is currently at war (see
//  crewRules.js's crewWarPhase/isWarActive) — war lifts the debuff
//  entirely. A tile in a neutral region, or in a region your own crew's
//  faction already controls, never gets the debuff, war or not.
// ─────────────────────────────────────────────────────────────────────────────
import { REGIONS } from "../constants/regions.js";

export const WAR_TERRITORY_DEBUFF_MULT = 0.30; // -70%

// The region's Keep sits at exactly (cx, cy) — see mapGen.worker.js's region
// placement loop (`idx = reg.cy*COLS + reg.cx`, `keepMeta[\`${reg.cx},${reg.cy}\`]`).
export function regionKeepTileKey(regionKey) {
  const region = REGIONS[regionKey];
  if (!region) return null;
  return `${region.cx},${region.cy}`;
}

// Pure, immutable update — call after a Keep tile capture succeeds.
export function recordRegionCapture(regionOwners, regionKey, faction) {
  if (!regionKey || !faction) return regionOwners;
  if (regionOwners?.[regionKey] === faction) return regionOwners; // no-op, same owner
  return { ...(regionOwners || {}), [regionKey]: faction };
}

// The multiplier to apply to a computed siege-power number before it's
// checked against a tile's/fort's/fortress's remaining siege HP.
// `tile` needs only `regionKey`. `regionOwners` is the map above.
// `attackerFaction` is the attacking player's own crew's faction (facKey).
// `atWar` is whether the attacker's own crew is currently in the "active"
// war phase (crewRules.js's isWarActive) — pass this in already resolved
// rather than a crew object, so this file stays framework/state-shape free.
export function siegeTerritoryMultiplier({ tile, regionOwners, attackerFaction, atWar }) {
  if (atWar) return 1;
  const regionKey = tile?.regionKey;
  if (!regionKey) return 1;
  const owner = regionOwners?.[regionKey];
  if (!owner || owner === attackerFaction) return 1; // neutral region, or your own faction's territory
  return WAR_TERRITORY_DEBUFF_MULT;
}
