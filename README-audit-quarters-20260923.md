# audit-quarters-20260923

## Changed since coldborns-20260923
- `shared/constants/buildings.js`: new quarter and branch upgrade times and costs.
- `src/components/game/HQMenu.jsx`:
  - The Quarters screen starts a timed upgrade (UNLOCK / ^ LvN, time, countdown). It used to level up instantly.
  - Building timers show hours.
- `src/Game.jsx`: `upgrade()` also queues quarter and branch upgrades.
- `src/hooks/useUpgrades.js`: finished quarter upgrades land in quarter levels.
- `src/testmode/TestUi.jsx`, `src/testmode/useTestMode.js`, `src/testmode/adminRules.js`: new Admin → Timers → "MAX ALL BUILDINGS & QUARTERS" button.
- `src/GameView.jsx`: fixes a crash when buying a consumable in the Crew Store.
- `src/hooks/useGameLoop.js`, `src/MapRenderer.jsx`: the game-loop and march workers now start in dev/test mode.
- `shared/utils/battle.js`: dead-code cleanup; troop-skill Frostbite now works.
- `tests/quarterUpgrades.test.js`: new file (4 tests).
- `ReadMeAI.md`: new changelog entry.

## Please delete from the repo (unused leftovers)
- `shared/battle.js`: an old copy of `shared/utils/battle.js` in the wrong folder.
- Every `README-*.md` at the repo root (zip notes), plus `tests/README.md`, `tests/ReadMeAI.md` and `src/testmode/readme`.
