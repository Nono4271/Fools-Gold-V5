# Build fix + Commander card on marching sprites / left-rail busts

Why the build failed: several files from earlier zips never made it into the repo
(missing: shared/utils/crewStructures.js, structureDefense.js), and others landed
in the wrong folder or as older versions. This zip holds every file that differs
from your uploaded project. Unzip over the project root, keeping folder paths.
Verified: this zip applied to your upload builds and passes 412/412 tests.

DELETE these misplaced duplicates from the repo:
- src/components/game/popup/BagScreen.jsx       (belongs in src/components/screens/)
- src/components/game/popup/CommanderScreen.jsx (belongs in src/components/screens/)
- shared/utils/crewLevelPerks.test.js           (belongs in tests/)
- shared/utils/crewStructures.test.js           (belongs in tests/)

Tip: GitHub's web "Add files via upload" drops folder paths unless you drag the
folders themselves (shared/, src/, tests/), not the individual files.

Restored / updated (were missing or old in the repo):
- shared/utils: crewStructures.js (NEW, fixes the build), structureDefense.js (NEW),
  armyEconomy.js, battle.js, pathfinding.js, resourceIncome.js, tactics.js,
  training.js, troopSlots.js
- src/hooks/useResources.js
- src/components/game/popup/CommanderCard.jsx, CrewStructurePanel.jsx
- src/components/screens/BagScreen.jsx, CommanderScreen.jsx
- tests: crewLevelPerks, crewRules, crewStructures (NEW), structureDefense (NEW)

New feature (Commander card):
- src/MapRenderer.jsx — tapping a marching commander sprite opens its card
- src/components/game/GameBar.jsx — tapping a left-rail bust opens its card
- src/GameView.jsx — floating card with ✕ and recall; tapping a tile closes it
- ReadMeAI.md — changelog entry
