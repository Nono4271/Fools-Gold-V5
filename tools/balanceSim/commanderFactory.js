// ─────────────────────────────────────────────────────────────────────────────
//  commanderFactory.js — builds a minimal, IDENTICAL-on-both-sides commander
//  shell around a loadout's troops, so any win-rate difference between two
//  loadouts is attributable to the troop line itself, not to commander stats,
//  class bonuses, hero skills, or gear.
//
//  Gear is deliberately never attached (cmd.gear stays undefined → gearStats
//  bonuses are simply never computed) — per the brief, gearStats.js is a
//  known placeholder and must not be baked into these thresholds.
// ─────────────────────────────────────────────────────────────────────────────
import { branchRefFor } from "./loadoutCatalog.js";

// Fixed, faction/tier-agnostic commander baseline. Same numbers `tests/battle.test.js`
// already uses for its fixture commander (atk 50/foc 20/spd 50), bumped to the
// engine's own documented defaults (atk 150) so mid-level troop skills/army
// stats — not a deliberately weak fixture — drive outcomes.
export const BASE_COMMANDER = {
  lvl: 10,
  atk: 150,
  foc: 0,
  spd: 60,
};

export function buildCommander(loadout, troops, opts = {}) {
  const branch = branchRefFor(loadout);
  return {
    id: 0,
    n: loadout.label,
    lvl: opts.lvl ?? BASE_COMMANDER.lvl,
    atk: opts.atk ?? BASE_COMMANDER.atk,
    foc: opts.foc ?? BASE_COMMANDER.foc,
    spd: opts.spd ?? BASE_COMMANDER.spd,
    troops,
    troopBranch: branch,
    troopSlots: [{ branch, troops }],
    troopSkillLevels: opts.troopSkillLevels || {},
    // no cls, no rarity override, no gear — see file header
  };
}
