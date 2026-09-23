# skills-engine-20260923

Copy each file to the same path in the repo (branch codex/core-fixes-20260919).

| File | Change |
|---|---|
| shared/utils/battle.js | Commander skills (effect-type format) now run in combat: level scaling, max-level bonuses. Flat DEF-down points fixed. Captain's Honor uses the scaled value. |
| shared/constants/skills.js | Battle/passives now read `cmd.skillPoints` (where spent points are actually saved). Max-level march speed bonus. |
| shared/constants/pirates_skills.js | REPLACED with your new pirate set. Renamed pir_protect_the_weak / pir_cleanse / pir_many_trades. Treasure Hunter live. Captain's Honor 4%→20%. |
| tests/commanderSkills.test.js | NEW |
| ReadMeAI.md | Changelog entry |

Tests 427/427, build OK.
