# orcs-skills-20260923

Copy each file to the same path in the repo (branch codex/core-fixes-20260919). Includes everything from skills-engine-20260923 (battle.js, skills.js, test file are newer versions of those).

| File | Change vs last zip (skills-engine-20260923) |
|---|---|
| shared/utils/battle.js | All orc skill mechanics; persistent skill state; overwrite/heal-block/burn bug fixes |
| shared/constants/skills.js | Siege-per-troop skill bonus (`skillSiegeBonus`) |
| shared/constants/orcs_skills.js | NEW in zips — Lifeline of the Tribe max key → orcCombatSpd |
| src/hooks/useMarch.js | NEW in zips — siege power includes Orc Explosives |
| src/hooks/useFortressSiege.js | NEW in zips — same for fortress sieges |
| tests/commanderSkills.test.js | +5 orc tests |
| ReadMeAI.md | Changelog |

Tests 432/432, build OK.
