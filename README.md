# two-sided-battle-20260923

Copy each file to the same path (branch codex/core-fixes-20260919).

| File | Change vs command-revert-20260923 |
|---|---|
| shared/utils/battle.js | Round loop rewritten: attacker and defender use identical code (skills, heals, statuses, speed order). Defender troop skills no longer help the attacker. |
| tests/commanderSkills.test.js | +3 PvP parity tests; orc tests averaged over 10 seeds |
| src/components/game/BattleLog.jsx | NEW in zips — defender heals not counted as your healing |
| ReadMeAI.md | Changelog |

(tests/crewStructures.test.js from the last zip is unchanged — keep it.)
Tests 436/436, build OK.
