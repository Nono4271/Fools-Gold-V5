# wizards-20260923

## Changed since burn-orcs-pirates-20260923
- `shared/utils/battle.js`:
  - All Wizard commander skills (h5, h6, h17, h18, h29, h30) now work per their descriptions.
  - Fix: final troop losses are counted per slot. Mixed-size armies (e.g. Spellblades + Golems) used to show 0 losses.
- `tests/commanderSkills.test.js`: 4 new Wizard tests (465 total, all pass).
- `ReadMeAI.md`: new changelog entry, "Wizards fully implemented + mixed-army loss fix".
