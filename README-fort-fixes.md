# Fort fixes + save export (2026-09-23): changes since the bug-fix-batch zip

Copy FILES (not folders) into the matching repo folders:
| Zip folder | Files |
|---|---|
| (top level) | ReadMeAI.md, PreAlpha-Testing-Checklist.md |
| src | Game.jsx |
| src/components/game/popup | FortPanel.jsx |
| src/hooks | useForts.js |
| src/testmode | TestUi.jsx, useTestMode.js |

- Fort shows "UNDER CONSTRUCTION · 1:59:30 left" (it was building — the panel just didn't say so)
- Can't upgrade a fort mid-build/upgrade (that used to jam it)
- Admin → Timers has separate rows for fort construction and fort DEMOLISH/ABANDON
- Commanders on a demolished fort walk home instead of vanishing
- Admin → Saves: Export file / Import → Slot 3
- Checklist: T1–T4, T6, T7 ticked
