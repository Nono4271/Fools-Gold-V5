# Test Campaign (admin mode + saves): changes since the march-timers zip

## Turn it on for your deployed site (one time)
Cloudflare Pages → your project → Settings → Environment variables →
add `VITE_TEST_MODE` = `1` → redeploy. The title screen then shows 🛠 TEST CAMPAIGN.
Remove the variable (or set it to 0) to hide it again, e.g. for the pre-alpha build.
(In `npm run dev` it's always on.)

## Copy FILES (not folders) into the matching repo folders
| Zip folder | Files |
|---|---|
| (top level) | ReadMeAI.md |
| src | Game.jsx, GameView.jsx, MapRenderer.jsx |
| src/testmode (NEW folder, create it) | TestUi.jsx, adminRules.js, saveStore.js, useTestMode.js |
| src/components/game | TilePopup.jsx |
| src/components/screens | CommanderScreen.jsx, TitleScreen.jsx |
| src/hooks | useMapInit.js |
| src/workers | mapGen.worker.js |
| tests | testMode.test.js (NEW) |

## What you get
- Every commander, any alignment, as soon as the map loads
- Attack anything: no adjacency or range limits (toggle in Admin → Map)
- Admin → Commanders: set level (5–50) and respect (0–15), refill stamina, arrive now
- Admin → Timers: ⚡ finish marches, building upgrades, training, healing, forts, crew builds (or all at once)
- Relocate HQ anywhere: 🛠 button in any tile's popup, or Admin → Map
- Crews start at level 50; gems, eggs, void orbs and wood/stone/gas/food never run out
- Saves: autosave every minute and when you close the app, plus 3 slots (Admin → Saves).
  Saves stay in that browser on that device.

Also fixed: after any HQ relocation, the old castle stayed on the map.
