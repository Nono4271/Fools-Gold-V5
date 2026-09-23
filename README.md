# command-revert-20260923

Copy each file to the same path (branch codex/core-fixes-20260919). Same 4 files as command-fix-20260923.

| File | Change vs command-fix-20260923 |
|---|---|
| shared/utils/battle.js | Command fix reverted (PvE back to previous balance). Identical to orcs-skills-2 version. |
| tests/crewStructures.test.js | Back to original |
| tests/commanderSkills.test.js | Unchanged (kept "wins sooner or deals more" comparison) |
| ReadMeAI.md | Changelog: fix investigated + reverted |

Tests 433/433, build OK.
