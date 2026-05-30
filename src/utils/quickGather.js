// src/utils/quickGather.js
// ─────────────────────────────────────────────────────────────────────────────
// STUB: Quick Gather logic for the Wizard's Tomes "Quick Gather" node.
// Cost: 3 Dragon Eggs. Yield: 3hr + 10% of tile RSS rate for its power level.
// Ineligible: HQ tiles, fort tiles, P1 tiles.
//
// TODO (multiplayer): deduct Dragon Eggs from player inventory server-side,
//   record the gather server-side, and return actual rss delta.
// ─────────────────────────────────────────────────────────────────────────────

import { POWER_DEFS, RSS } from "../../shared/constants/map.js";

const DRAGON_EGG_COST = 3;
const GATHER_HOURS    = 3;
const GATHER_BONUS    = 0.10; // +10%

/**
 * Calculate the RSS yield for a quick gather on a tile.
 * @param {object} tile  - selTile (needs .powerLevel, .rss)
 * @returns {{ rssKey: string, amount: number } | null}
 */
export function calcQuickGatherYield(tile) {
  const pl = tile?.powerLevel ?? 0;
  if (pl < 2 || tile?.isHQ || !tile?.rss) return null;

  const rateDef = POWER_DEFS[pl];
  if (!rateDef) return null;

  // Parse numeric rate from label e.g. "10/hr" → 10
  const ratePerHr = parseFloat(rateDef.label);
  if (!ratePerHr) return null;

  const amount = Math.floor(ratePerHr * GATHER_HOURS * (1 + GATHER_BONUS));
  return { rssKey: tile.rss, amount };
}

/**
 * Stub handler — call this when the player confirms Quick Gather.
 * Deduct 3 Dragon Eggs and credit the RSS yield.
 *
 * @param {string}   tileKey
 * @param {object}   tile
 * @param {object}   playerResources  - mutable ref or state setter context
 * @param {Function} setResources     - state setter: prev => newResources
 * @param {number}   dragonEggs       - current egg count
 * @param {Function} setDragonEggs    - state setter
 * @returns {boolean} success
 */
export function doQuickGather(tileKey, tile, dragonEggs, setDragonEggs, setResources) {
  if (dragonEggs < DRAGON_EGG_COST) {
    console.warn("[QuickGather] Not enough Dragon Eggs");
    return false;
  }
  const result = calcQuickGatherYield(tile);
  if (!result) {
    console.warn("[QuickGather] Tile ineligible", tileKey);
    return false;
  }

  // Deduct eggs
  setDragonEggs(prev => Math.max(0, prev - DRAGON_EGG_COST));

  // Credit RSS — stub: caller wires up setResources to actual game state
  setResources(prev => ({
    ...prev,
    [result.rssKey]: (prev[result.rssKey] ?? 0) + result.amount,
  }));

  console.log(`[QuickGather] ${tileKey}: +${result.amount} ${result.rssKey} (−${DRAGON_EGG_COST} eggs)`);
  return true;
}
