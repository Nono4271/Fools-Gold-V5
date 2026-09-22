# Guard / Wounded / Mobile polish — changes since structure-combat zip

Unzip over the project root. 21 files.

New:
- shared/utils/commanderStatus.js — Wounded (10 min) + Guard rules
- tests/commanderStatus.test.js

Changed:
- src/hooks/useMarch.js, useFortressSiege.js — once-only battle claim (no duplicate reports), wounded on loss, guard fights first
- src/hooks/useTactics.js — Sweep/Gather blocked while wounded
- src/Game.jsx, GameView.jsx — startGuard/cancelGuard, wounded gates, offline badge fix, slider CSS
- src/MapRenderer.jsx — protection glow in owner color, smaller shield
- src/components/game/popup/CommanderCard.jsx — Guard toggle, wounded banner, cooldown
- GameBar.jsx, BattleLog.jsx, HQMenu.jsx, HUD.jsx, WizardsTomes.jsx, BagScreen.jsx, CommanderScreen.jsx, TilePopup.jsx — status badges, wave labels, bigger touch targets, training slider hint
- src/main.tsx, src/index.css — touch scrolling + touch-friendly sliders
- ReadMeAI.md — changelog entry
