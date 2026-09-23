# targeting-20260923

Copy each file to the same path (branch codex/core-fixes-20260919).

| File | Change vs pirates-skills-20260923 |
|---|---|
| shared/utils/battle.js | Per-unit targeting: normal attacks hit 1 unit (frontline first); skills hit N separate units / every unit, each vs that unit's own DEF & bonuses |
| tests/commanderSkills.test.js | +4 targeting tests |
| ReadMeAI.md | Changelog |

(README.md from the last zip is unchanged — keep it.)
Tests 443/443, build OK.
