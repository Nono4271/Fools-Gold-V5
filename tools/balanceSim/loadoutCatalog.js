// ─────────────────────────────────────────────────────────────────────────────
//  loadoutCatalog.js — enumerates every "loadout" (one troop line) the
//  balance simulator can build an army from, grouped into tier brackets so
//  the matrix generator can do apples-to-apples (same-tier) comparisons.
//
//  Tier brackets (see ReadMeAI entry for this tool):
//    0/1/2 → T1/T2/T3 of each faction's 3 regular branches, plus neutral
//            units whose own `tier` field (0/1/2, a power bracket — see
//            neutralTroops.js header) matches.
//    3     → every faction's T4 capstone branch, plus all 4 Ancients.
// ─────────────────────────────────────────────────────────────────────────────
import { FACTION_TROOPS, COMMAND_COST } from "../../shared/constants/troops.js";
import { NEUTRAL_TROOPS } from "../../shared/constants/neutralTroops.js";
import { ANCIENT_TROOPS, ANCIENT_FACTION_KEY } from "../../shared/constants/ancientTroops.js";
import { NEUTRAL_FACTION_KEY, installNeutralBridge } from "./neutralBridge.js";

installNeutralBridge();

export const TIER_BRACKETS = ["T1", "T2", "T3", "T4"];

function label(loadout) {
  switch (loadout.kind) {
    case "faction":  return `${loadout.faction}/${loadout.branch}${loadout.capstone ? "" : ` T${loadout.tier + 1}`}`;
    case "neutral":  return `neutral/${loadout.key}`;
    case "ancient":  return `ancient/${loadout.key}`;
    default:         return "unknown";
  }
}

// One loadout = one troop line, not yet sized to a troop count.
function makeLoadout(fields) {
  const l = { ...fields };
  l.label = label(l);
  return l;
}

export function branchRefFor(loadout) {
  if (loadout.kind === "faction")  return { faction: loadout.faction, branch: loadout.branch, tier: loadout.tier };
  if (loadout.kind === "neutral")  return { faction: NEUTRAL_FACTION_KEY, branch: loadout.key, tier: 0 };
  if (loadout.kind === "ancient")  return { faction: ANCIENT_FACTION_KEY, branch: loadout.key, tier: 0 };
  throw new Error(`Unknown loadout kind: ${loadout.kind}`);
}

export function buildCatalog() {
  const loadouts = [];

  // ── Faction branches: T1-T3 regular, T4 capstone ──────────────────────────
  // (skip the synthetic "neutral" key the bridge installs onto FACTION_TROOPS
  // — those units are enumerated separately below as kind:"neutral")
  for (const [faction, def] of Object.entries(FACTION_TROOPS)) {
    if (faction === NEUTRAL_FACTION_KEY) continue;
    for (const branch of def.branches) {
      if (branch.capstone) {
        loadouts.push(makeLoadout({
          kind: "faction", faction, branch: branch.key, tier: 0, capstone: true,
          size: branch.size, tierBracket: 3,
        }));
      } else {
        for (let tier = 0; tier < branch.tiers.length; tier++) {
          loadouts.push(makeLoadout({
            kind: "faction", faction, branch: branch.key, tier,
            size: branch.size, tierBracket: tier,
          }));
        }
      }
    }
  }

  // ── Neutral units — bracket = the unit's own tier field (0/1/2) ──────────
  for (const u of NEUTRAL_TROOPS) {
    loadouts.push(makeLoadout({
      kind: "neutral", key: u.key, size: u.size, tierBracket: u.tier,
    }));
  }

  // ── Ancients — grouped with T4 capstones ──────────────────────────────────
  for (const u of ANCIENT_TROOPS) {
    loadouts.push(makeLoadout({
      kind: "ancient", key: u.key, size: u.size, tierBracket: 3,
    }));
  }

  return loadouts;
}

export function loadoutsByBracket(loadouts = buildCatalog()) {
  const buckets = { 0: [], 1: [], 2: [], 3: [] };
  for (const l of loadouts) buckets[l.tierBracket].push(l);
  return buckets;
}

// Troop count for a loadout at a given command-point budget, so a small-unit
// army and a large-unit army are budget-equal, not troop-count-equal.
export function troopsForBudget(loadout, budget) {
  const cost = COMMAND_COST[loadout.size] ?? COMMAND_COST.small;
  return Math.max(1, Math.floor(budget / cost));
}
