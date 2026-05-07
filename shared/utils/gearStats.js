/* ─────────────────────────────────────────────────────────────────────────────
   gearStats.js — resolves a commander's effective stats from equipped gear
   
   Exports:
     resolveGearBonuses(cmd, gearInventory)
       → { atk, foc, spd, armyAtk, armyFoc, armySpd, armySiege }
         All values are flat bonuses ON TOP of the commander's base stats.

     applyGearToCmd(cmd, gearInventory)
       → commander object with atk/foc/spd boosted by gear primaries + secondaries
         (army boost fields attached separately for battle.js to use)
───────────────────────────────────────────────────────────────────────────── */

import { STAT_BASE, GEAR_RARITY } from "../constants/gear.js";

/**
 * Given a gear instance, return the effective primary stat value
 * accounting for rarity multiplier and silver stars.
 */
function primaryValue(piece) {
  const base    = STAT_BASE[piece.primaryStat]?.base ?? 7;
  const mult    = GEAR_RARITY[piece.rarity]?.statMult ?? 1;
  const starMod = 1 + (piece.stars ?? 0) * 0.12;
  return Math.round(base * mult * starMod);
}

/**
 * Collect all bonuses from a commander's equipped gear.
 * Returns flat bonus amounts — caller adds them to base stats.
 */
export function resolveGearBonuses(cmd, gearInventory) {
  const bonuses = { atk: 0, foc: 0, spd: 0, armyAtk: 0, armyFoc: 0, armySpd: 0, armySiege: 0 };
  if (!cmd?.gear || !gearInventory?.length) return bonuses;

  const slotKeys = ["helmet", "armor", "bracers", "accessory"];
  for (const slot of slotKeys) {
    const instanceId = cmd.gear[slot];
    if (!instanceId) continue;
    const piece = gearInventory.find(g => g.instanceId === instanceId);
    if (!piece) continue;

    // ── Primary stat ──
    const pVal = primaryValue(piece);
    if      (piece.primaryStat === "ATK") bonuses.atk += pVal;
    else if (piece.primaryStat === "FOC") bonuses.foc += pVal;
    else if (piece.primaryStat === "SPD") bonuses.spd += pVal;

    // ── Secondary stats ──
    for (const sec of piece.secStats ?? []) {
      const v = Number(sec.value) || 0;
      switch (sec.key) {
        case "ATK":        bonuses.atk      += v; break;
        case "FOC":        bonuses.foc      += v; break;
        case "SPD":        bonuses.spd      += v; break;
        case "ARMY_ATK":   bonuses.armyAtk  += v; break;
        case "ARMY_FOC":   bonuses.armyFoc  += v; break;
        case "ARMY_SPD":   bonuses.armySpd  += v; break;
        case "ARMY_SIEGE": bonuses.armySiege+= v; break;
        default: break;
      }
    }
  }

  return bonuses;
}

/**
 * Returns a commander object with gear bonuses baked in.
 * Does NOT re-apply Lv25 class stat bonuses — those are applied once by applyXp()
 * when the commander crosses Lv25 and are already baked into cmd.atk.
 * Adds gearBonuses field so battle.js can apply army boosts separately.
 * Adds classBonusActive flag so callers can check if Lv25 bonus is live.
 */
export function applyGearToCmd(cmd, gearInventory) {
  const b = resolveGearBonuses(cmd, gearInventory);
  const lvl = cmd.lvl ?? 5;

  return {
    ...cmd,
    atk: (cmd.atk ?? 0) + b.atk,
    foc: (cmd.foc ?? 0) + b.foc,
    spd: (cmd.spd ?? 0) + b.spd,
    gearBonuses: b,   // battle.js reads armyAtk/armyFoc/armySpd/armySiege from here
    classBonusActive: lvl >= 25,
  };
}
