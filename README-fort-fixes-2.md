# Fort fixes, part 2 (2026-09-23): changes since the fort-fixes zip

Copy FILES (not folders) into the matching repo folders:
| Zip folder | Files |
|---|---|
| (top level) | ReadMeAI.md, PreAlpha-Testing-Checklist.md |
| src | Game.jsx |
| src/hooks | useForts.js |
| src/components/game | TilePopup.jsx |
| src/components/game/popup | FortPanel.jsx |

1 Fort is offline until built: no range, no stationing, no MOVE button, no auto-station at build
2 Moving a commander to a fort needs at least 1 troop (recall-to-fort with 0 troops still works)
3 Stationed commanders' busts show right away (the popup was reading old fort data)
4 Demolish/abandon sends stationed commanders home (works now that stationing registers)
