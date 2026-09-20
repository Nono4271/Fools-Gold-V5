// shared/utils/garrisonUtils.js
// ─────────────────────────────────────────────────────────────────────────────
// Garrison helper functions extracted from battle.js.
//
// WHY THIS FILE EXISTS:
// battle.js imports skills.js, which creates a module init cycle when Rollup
// flattens the battle.worker bundle:
//   battle.js → skills.js → (6 faction skill files)
//   battle.js → heroes.js → (also used by skills.js consumers)
// This caused a TDZ crash ("Cannot access 'at' before initialization") in the
// main bundle whenever useMarch.js imported garrison helpers from battle.js,
// because that pulled the full battle.js → skills.js chain into the shared chunk
// in an order Rollup couldn't guarantee.
//
// These three functions (garrisonWaveCount, garrisonDefCmd, garrisonWaveDefCmd)
// only need map.js, troops.js, and heroes.js — none of them need skills.js.
// Moving them here severs the connection entirely.
//
// useMarch.js imports from here. battle.js keeps simBattle and its skill logic.

import { POWER_DEFS } from "../constants/map.js";
import { FACTION_TROOPS, COMMAND_COST } from "../constants/troops.js";
import { npcForPowerLevel, factionDefCmdForTile, FACTION_BRANCHES_EXPORT } from "../constants/heroes.js";

// ── Local helpers (duplicated from battle.js — kept private, not exported) ────

function buildTroopSlots(faction, tierSplit, seed) {
  const factionBranches = FACTION_BRANCHES_EXPORT[faction];
  if (!factionBranches || !factionBranches.length) return [];
  const fTroops = FACTION_TROOPS[faction];
  if (!fTroops) return [];

  const allSlots = [];

  tierSplit.forEach(({ tier, budget }, groupIdx) => {
    if (budget <= 0) return;
    const groupSeed = (seed + groupIdx * 1000003) >>> 0;
    const numSlots  = 1 + (groupSeed % 3);
    let remaining   = budget;

    for (let i = 0; i < numSlots && remaining > 0; i++) {
      const branchKey = factionBranches[(groupSeed + i * 7) % factionBranches.length];
      const branchDef = fTroops.branches?.find(b => b.key === branchKey);
      const cost      = COMMAND_COST[branchDef?.size || "small"] || 1;

      if (remaining < cost) break;

      let share;
      if (i === numSlots - 1) {
        share = remaining;
      } else {
        const frac      = 0.3 + 0.4 * (((groupSeed >> (i * 4)) & 0xf) / 15);
        const raw       = Math.round(remaining * frac);
        const slotsLeft = numSlots - i - 1;
        share = Math.min(raw, remaining - slotsLeft * cost);
        share = Math.max(cost, share);
      }

      const troops = Math.floor(share / cost);
      if (troops <= 0) continue;
      allSlots.push({ branch: { faction, branch: branchKey, tier }, troops });
      remaining -= troops * cost;
    }
  });

  return allSlots;
}

function tierSplitForPowerLevel(plvl, budget) {
  if (plvl >= 11) return [{ tier: 2, budget }];
  if (plvl === 10) {
    const half = Math.floor(budget / 2);
    return [{ tier: 1, budget: half }, { tier: 2, budget: budget - half }];
  }
  if (plvl >= 6) {
    const half = Math.floor(budget / 2);
    return [{ tier: 0, budget: half }, { tier: 1, budget: budget - half }];
  }
  return [{ tier: 0, budget }];
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function garrisonWaveCount(tile) {
  if (tile?.garrisonWaves != null) return tile.garrisonWaves;
  if (tile?.isGate || tile?.isKeep) return 2;
  if ((tile?.powerLevel ?? 0) >= 10) return 2;
  return 1;
}

export function garrisonDefCmd(tile, playerFaction) {
  const plvl   = tile.powerLevel || 1;
  const pd     = POWER_DEFS[plvl] || POWER_DEFS[1];
  const budget = tile.garrisonTroops || pd.command;

  if (plvl >= 4 && playerFaction) {
    const fc = factionDefCmdForTile(tile.c ?? 0, tile.r ?? 0, playerFaction, plvl);
    if (fc) {
      const seed  = (((tile.c ?? 0) + 1) * 73856093 ^ ((tile.r ?? 0) + 1) * 19349663) >>> 0;
      const split = tierSplitForPowerLevel(plvl, budget);
      const slots = buildTroopSlots(fc.faction, split, seed);
      const totalTroops = slots.reduce((s, sl) => s + sl.troops, 0);
      return {
        ...fc,
        troops:        totalTroops,
        commandBudget: budget,
        troopSlots:    slots.length > 0 ? slots : undefined,
        troopBranch:   slots[0]?.branch ?? fc.troopBranch,
      };
    }
  }

  const npc          = npcForPowerLevel(plvl);
  const npcBranch    = npc.troopBranch;
  const npcBranchDef = npcBranch
    ? FACTION_TROOPS?.[npcBranch.faction]?.branches?.find(b => b.key === npcBranch.branch)
    : null;
  const npcCost   = COMMAND_COST[npcBranchDef?.size || "small"] || COMMAND_COST.small;
  const npcTroops = Math.max(1, Math.floor(budget / npcCost));
  return {
    lvl:           pd.cmdLvl,
    troops:        npcTroops,
    commandBudget: budget,
    troopBranch:   npcBranch || null,
    atk:           npc.atk * pd.cmdLvl,
    spd:           npc.spd + pd.cmdLvl * 2,
    n:             npc.n,
    icon:          npc.icon,
    cls:           npc.cls,
    faction:       null,
    rarity:        "soldier",
  };
}

export function garrisonWaveDefCmd(tile, waveIndex, playerFaction) {
  const c      = tile.c ?? tile.cx ?? 0;
  const r      = tile.r ?? tile.cy ?? 0;
  const budget = tile.garrisonTroops || tile.garrison || 2100;

  const baseSeed = (((c + 1) * 73856093) ^ ((r + 1) * 19349663)) >>> 0;
  const waveSeed = (baseSeed ^ (waveIndex * 2654435761)) >>> 0;

  const waveC      = (c + waveIndex * 997) | 0;
  const waveR      = (r + waveIndex * 1009) | 0;
  const powerLevel = tile.powerLevel || 1;

  if (powerLevel < 4) return garrisonDefCmd(tile, playerFaction);

  let baseCmd = factionDefCmdForTile(waveC, waveR, playerFaction, powerLevel, waveIndex);
  if (!baseCmd) return garrisonDefCmd(tile, playerFaction);

  // Camps: every wave has the same level AND the same troop layout/count as
  // wave 0 (owner spec: "same level and troop count, just a second wave").
  // Only the commander differs, picked from wave 0's faction so the commander
  // matches the troops. Other tiles keep their per-wave variety.
  let layoutFaction = baseCmd.faction;
  let layoutSeed = waveSeed;
  if (tile.isCamp && waveIndex > 0) {
    const wave0 = factionDefCmdForTile(c, r, playerFaction, powerLevel, 0);
    if (wave0) {
      layoutFaction = wave0.faction;
      layoutSeed = baseSeed;
      for (let k = 0; k < 24 && !(baseCmd.faction === wave0.faction && baseCmd.n !== wave0.n); k++) {
        const cand = factionDefCmdForTile((waveC + k * 7919) | 0, (waveR + k * 104729) | 0, playerFaction, powerLevel, waveIndex);
        if (cand && cand.faction === wave0.faction && cand.n !== wave0.n) baseCmd = cand;
      }
    }
  }

  const split = tierSplitForPowerLevel(powerLevel, budget);
  const slots = buildTroopSlots(layoutFaction, split, layoutSeed);
  const totalTroops = slots.reduce((s, sl) => s + sl.troops, 0);

  return {
    ...baseCmd,
    troops:        totalTroops,
    commandBudget: budget,
    troopSlots:    slots.length > 0 ? slots : undefined,
    troopBranch:   slots[0]?.branch ?? baseCmd.troopBranch,
  };
}
