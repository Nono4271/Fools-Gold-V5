# Balance-testing system — file changes

First delivery of this feature, so everything below is new unless marked (modified).

## New: tools/balanceSim/ (the tool)
- cli.js               — `npm run balance-report` entry point
- loadoutCatalog.js     — enumerates every troop line (99 total) into 4 tier brackets
- neutralBridge.js      — makes neutral units resolvable by simBattle (in-memory only, no source edits)
- commanderFactory.js   — identical minimal commander shell per loadout
- runner.js             — seeded battle trials + aggregation
- matrix.js             — coverage matrix + outlier detection (matchup + efficiency)
- report.js             — JSON/Markdown report builders
- reports/report.json, reports/report.md — sample output from a 60-trial run (regenerate with `npm run balance-report`)

## New: tests/balance/ (the gate)
- coverage.test.js — sanity tests on the tooling itself
- outliers.test.js — the actual "no unit is overpowered" gate (run via `npm run test:balance`)

## Modified
- package.json — added `test:balance` and `balance-report` scripts (existing `test`/`build` scripts untouched)
- ReadMeAI.md  — dated entry at the top documenting the system, thresholds chosen, and what's already flagged

## Already flagged in current game data (see ReadMeAI.md for full detail)
- Efficiency outliers (overperforming): neutral/feral_bloodfang (T2), dragons/dragonkin T3,
  neutral/rogue_battlemage (T3), dragons/sovereign_wyrm (T4)
- Dead units (0% win rate vs every T1 opponent): coldborns/raiders T1, coldborns/frost_giants T1

Run `npm run test:balance` to reproduce the gate result, `npm run balance-report` for the full matrix.
