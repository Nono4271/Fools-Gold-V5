// Every trainable troop "faction" in one lookup map: the 8 real factions plus
// the synthetic Ancients and Neutrals wrappers (see ancientTroops.js /
// neutralTroops.js). Use this for LOOKUPS of a player's troop branch
// (`TROOP_FACTIONS[branch.faction]`), never for "list the 8 factions" —
// FACTION_TROOPS / FACTION_KEYS stay the source of truth for that.
import { FACTION_TROOPS } from "./troops.js";
import { ANCIENT_FACTIONS, ANCIENT_FACTION_KEY, resolveAncientUnit } from "./ancientTroops.js";
import { NEUTRAL_FACTIONS, NEUTRAL_FACTION_KEY, resolveNeutralUnit } from "./neutralTroops.js";

export const TROOP_FACTIONS = { ...FACTION_TROOPS, ...ANCIENT_FACTIONS, ...NEUTRAL_FACTIONS };

export function findTroopBranchDef(branch) {
  if (!branch) return null;
  return TROOP_FACTIONS[branch.faction]?.branches?.find(b => b.key === branch.branch) ?? null;
}

// Camp unit key (tile.campUnitKey) → the barracks-pool faction it trains
// under, or null if unknown.
export function unitTroopFaction(unitKey) {
  if (resolveNeutralUnit(unitKey)) return NEUTRAL_FACTION_KEY;
  if (resolveAncientUnit(unitKey)) return ANCIENT_FACTION_KEY;
  return null;
}
