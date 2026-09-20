# Battle engine fixes + troop tuning — changes since the last zip

Only files touched THIS round are included (the balance-sim tooling itself is unchanged from the
previous delivery — not re-included here).

## Modified

- shared/utils/battle.js
  1. `on_hit` bonus-damage stacking bug fixed — a single "bonus damage" skill proc was being
     applied to EVERY hit in a double-attack round instead of just the hit that triggered it.
     Now consumed (zeroed) after the first application.
  2. `coldborns/raiders`'s "Frostbite Strike" skill was dead code — it set a variable that
     nothing else ever read, so the debuff never actually applied. Now rolls the chance and
     applies Frostbite, same as its working sibling case just below it in the file.

- shared/constants/troops.js — stat/skill tuning, tier-average-targeted:
  - `coldborns/raiders` T1: dmg 8-11→12-16, def 11→14, hp 14→24, siege 6→10
  - `coldborns/frost_giants` T1: dmg 175-185→270-290, def 30→37, hp 610→780, siege 205→345
  - `coldborns/bear_riders` T1 (found during this pass, see ReadMeAI): dmg 14-17→18-22,
    def 18→20, hp 36→50, siege 6→10
  - `dragons/dragonkin` T3 ("Ashfang"): dmg 25-32→22-28; Ember Trail bonus-damage 140%→70%
  - `dragons/sovereign_wyrm` (capstone): dmg 33-36→28-31; Dragonfire Breath bonus-damage 150%→90%

- shared/constants/neutralTroops.js — stat/skill tuning:
  - `feral_bloodfang` (T2): dmg 26-32→20-25, hp 48→36, spd 78→70
  - `rogue_battlemage` (T3): dmg 24-30→20-25, hp 50→42, spd 75→64; Forbidden Surge
    bonus-damage 100%→50%

- ReadMeAI.md — new dated entry (top of file) with full detail, before/after numbers, and the
  iteration notes on why a handful of DIFFERENT units now sit just over the outlier threshold
  (distribution-shift side effect of nerfing the originals — explained in the entry, not acted
  on this round).

- tools/balanceSim/reports/report.json, report.md — regenerated output reflecting the fixed
  engine + tuned data (regenerate anytime with `npm run balance-report`).

## Verified
- `npm test`: 275/275 pass
- `npm run build`: clean
- `npm run test:balance`: 6/7 pass (dead-unit check now clean; efficiency-outlier test still
  flags a handful of borderline units — see ReadMeAI for why)

## Still flagged (borderline, not acted on this round)
wizards/spellblades T1, neutral/wolf_rider, dragons/drake_riders T2 & T3, neutral/dune_raider,
neutral/pirate_deserter, ancient/aeonspire — all z 2.0-2.6, notably weaker signal than the
original findings (z 2.7-3.7). dragons/drake_riders showing up at both T2 and T3 may be worth a
look at the dragons faction generally.
