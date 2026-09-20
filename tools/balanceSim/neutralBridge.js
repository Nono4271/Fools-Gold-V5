// ─────────────────────────────────────────────────────────────────────────────
//  neutralBridge.js — makes the 15 neutral units resolvable by simBattle
//
//  battle.js's internal `resolveBranch()` only looks in two places it imports
//  at module scope: `FACTION_TROOPS` (shared/constants/troops.js) and
//  `ANCIENT_FACTIONS` (shared/constants/ancientTroops.js). Ancients are
//  already wired for this (ancientTroops.js wraps them as a capstone-shaped
//  "faction" for exactly this reason — see that file's header comment), but
//  neutral units are NOT: neutralTroops.js's own header says plainly that
//  `getNeutralSlotForBattle` is "purely additive — nothing in simBattle calls
//  this yet."
//
//  This is a dev-tooling-only, test-runner problem: to run neutral units
//  through the real `simBattle`, something has to make them resolvable the
//  same way Ancients already are. We are NOT allowed to touch battle.js or
//  troops.js (combat logic / troop data are off-limits per the brief), so
//  instead of adding a third lookup branch inside `resolveBranch`, this file
//  mutates the *in-memory* `FACTION_TROOPS` object at runtime — adding one
//  new key, `"neutral"`, whose `branches` array is built from
//  `NEUTRAL_TROOPS` — so the existing `FACTION_TROOPS[faction] ||
//  ANCIENT_FACTIONS[faction]` lookup finds it for free. Nothing on disk
//  changes; only this process's copy of the constant gets the extra key.
//
//  Each neutral unit becomes a plain (non-capstone) single-tier branch, tier
//  index 0 only, with only `skills.a` populated (matches the "only `a` is
//  ever populated today" convention documented in neutralTroops.js) — this
//  mirrors exactly how `getTierSkillsForBattle` already resolves a real T1
//  branch (`tier === 0` → `skills.a` only), so no new code path in battle.js
//  is exercised, just the existing generic one.
// ─────────────────────────────────────────────────────────────────────────────
import { FACTION_TROOPS } from "../../shared/constants/troops.js";
import { NEUTRAL_TROOPS } from "../../shared/constants/neutralTroops.js";

export const NEUTRAL_FACTION_KEY = "neutral";

let installed = false;

export function installNeutralBridge() {
  if (installed) return;
  if (!FACTION_TROOPS[NEUTRAL_FACTION_KEY]) {
    FACTION_TROOPS[NEUTRAL_FACTION_KEY] = {
      quarters: "Unaligned",
      branches: NEUTRAL_TROOPS.map(u => ({
        key: u.key,
        label: u.label,
        size: u.size,
        dmgType: u.dmgType,
        role: u.role,
        tags: u.tags || [],
        skills: { a: u.skills?.a, b: u.skills?.b },
        tiers: [u.stats],
      })),
    };
  }
  installed = true;
}
