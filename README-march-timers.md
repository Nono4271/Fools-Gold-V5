# March countdowns + clickable coordinates — changes since the sync-fix zip

Unzip, then copy FILES (not folders) into the matching repo folders:

| Zip folder | Files |
|---|---|
| (top level) | ReadMeAI.md |
| shared/utils | marchMotion.js |
| src | GameView.jsx |
| src/utils | commanderIcons.js |
| src/components/game | GameBar.jsx, MarchTimer.jsx (NEW) |
| tests | marchMotion.test.js |

What changed:
- Map: "MARCHING 1m 23s" under your marching commanders' feet
- Left-rail busts: 🥾 countdown under marching commanders
- Commander card: 🥾 MARCHING · time left, and origin → destination coordinates;
  tap either coordinate to jump the map there
