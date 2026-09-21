# Session 24 — Boosts tab → Level tab

## What changed
- `shared/constants/crew.js` — added `crewLevelPerks(level)`: returns the perk(s) that unlock at exactly a level (`+5 Member Cap` every 2 levels up to 20, `+1 Fortress Slot` at 15/30/45).
- `src/components/game/crew/CrewLevel.jsx` — **new file.** The Level tab UI: current level/XP bar + a row for every level 1–50 (real perk badge or "Placeholder — perk TBD").
- `src/components/game/crew/CrewHQ.jsx` — renamed the "Boosts" hotspot to "Level {crew.level}", wired the new `level` tab to `CrewLevel`, swapped the icon path, cleaned up stale "Boosts" comments.
- `src/components/game/crew/CrewComingSoon.jsx` — comment cleanup (Boosts/Diplomacy no longer use this stub).
- `tests/crewLevelPerks.test.js` — **new file.** Covers the member-cap schedule, fortress-slot levels, the 20-level cap ceiling, and that all 50 levels resolve.
- `ReadMeAI.md` — added the session 24 change-log entry.

## Verified
`npm test` — 367/367 passing. `npm run build` — clean, 610 modules (up from 609, confirming `CrewLevel.jsx` is bundled).
