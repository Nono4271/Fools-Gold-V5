# Fort fixes, part 3 (2026-09-23): changes since the fort-fixes-2 zip

Copy FILES (not folders) into the matching repo folders:
| Zip folder | Files |
|---|---|
| (top level) | ReadMeAI.md |
| src | Game.jsx, main.tsx |
| src/hooks | useForts.js |
| src/components/game/popup | FortPanel.jsx |

- Commanders standing on a fort's tile auto-station the moment it finishes building
- Busts show when stationed. Real cause: marches lost their destination after the first step,
  so arriving at a fort never registered (also fixes recall losing its starting point)
- MOVE to fort always opens the commander picker
- Tapping rows like the picker works on phones again (the touch guard was eating the tap)
Verified in the browser: build → auto-station → move 2nd commander in (2/2) → demolish → both walk home.
