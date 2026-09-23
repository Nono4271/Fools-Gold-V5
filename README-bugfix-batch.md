# Test-play bug batch (2026-09-23): changes since the test-campaign zip

Copy FILES (not folders) into the matching repo folders:
| Zip folder | Files |
|---|---|
| (top level) | ReadMeAI.md, PreAlpha-Testing-Checklist.md |
| shared/constants | buildings.js |
| src | Game.jsx |
| src/components/game | HQMenu.jsx |
| src/components/screens | FactionScreen.jsx |
| src/hooks | useMarch.js, useRelocation.js |
| src/testmode | adminRules.js, useTestMode.js |
| tests | buildingGates.test.js (NEW), testMode.test.js |

Fixes:
1 Starting troops usable right away (starting branch building now applied)
2 Barracks/Training circular requirement, and HQ couldn't pass Lv1 or Lv3
3 Army slider can't go past the troops you have
4 Gems/resources refill instantly in test mode
5 Lowering respect undoes promotions and skill points
6 Non-adjacent attacks now fight and capture in test mode
+ Relocating the HQ brings the commanders at HQ with it (normal play too)
