# Diplomacy — this session's changes

Implements crew Diplomacy per spec: founder/officer set Ally/Neutral/Enemy
standing toward other crews; members see a read-only list of what's flagged
(or a flavor line if nothing is). Purely cosmetic — only changes tile/
structure outline color, no gameplay effect, and it's one-way.

## New files
- `src/components/game/crew/CrewDiplomacy.jsx` — the Diplomacy tab UI
  (founder/officer full-list view + member read-only view).
- `tests/crewDiplomacy.test.js` — 9 tests for the new pure logic.

## Changed files
- `shared/constants/crew.js` — added `CREW_DIPLOMACY_STATUS`
  (`ally`/`enemy`; neutral = no entry), `crew.diplomacy: {}` default in
  `createCrew()`.
- `shared/utils/crewRules.js` — added `canSetDiplomacy`,
  `setDiplomacyStatus`, `diplomacyStatusOf`, `flaggedDiplomacyCrews`,
  `diplomacyPlayerIdSets` (resolves a crew's diplomacy map into ally/enemy
  playerId Sets for map coloring).
- `src/components/game/crew/CrewHQ.jsx` / `CrewScreen.jsx` — wired the new
  `CrewDiplomacy` component in place of the old "coming soon" stub; threaded
  `crews` and a new `onSetDiplomacy` callback down.
- `src/GameView.jsx` — new `onSetDiplomacy` handler (mirrors the existing
  `onSetTarget`/`onClearTarget` handlers); passes `diplomacyPlayerIds` to
  the main map `MapRenderer`.
- `src/Game.jsx` — new `diplomacyPlayerIds` memo (mirrors the existing
  `crewmatePlayerIds` memo).
- `src/MapRenderer.jsx` — `ownerTint()` now takes a 6th `diplomacyPids` arg:
  **same-faction tiles changed from orange to purple (`0xaa44ff`)**; new
  **ally = orange (`0xe87830`)** and **enemy = darker red (`0x8a1414`)**
  colors, checked before the faction/default-enemy fallback. Threaded
  through every draw call that already threaded crew coloring
  (`drawAllTiles`, `_buildOneHQ`, `buildHQLayer`, the main component).
- `ReadMeAI.md` — session 20 log entry with full detail.

## Known follow-up (not done, flagged not silent)
`Minimap.jsx` and `WorldMap.jsx` still only distinguish player/crewmate/
enemy — they don't show the new ally/enemy diplomacy colors. Only the main
map (`MapRenderer.jsx`) does.

## Verified
Full test suite: 361/361 pass (352 prior + 9 new). `npm run build` clean.
