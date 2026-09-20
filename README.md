# What's in this zip

New content only — apply these on top of your existing project, not as a full replacement.

## New files
- `shared/constants/neutralTroops.js` — 15 neutral units (Beastfolk, Stoneborn, Sandrunner, 8 faction renegades), tags, 5 tag-synergy abilities
- `shared/constants/ancientTroops.js` — 4 Ancients (T4, large-only, above every faction's T4), skills A/B/C + passive "only one per army" skill D
- `tests/neutralTroops.test.js`
- `tests/ancientTroops.test.js`

## Edited files
- `shared/constants/troops.js` — added a fallback lookup so Ancients resolve through the same code faction troops use (1 new import, 1 changed line)
- `shared/utils/battle.js` — threaded ally-slot info into the skill system so tag-synergy abilities can find a matching ally; added the 5 new tag-effect types; added the Ancients fallback lookup
- `shared/utils/troopSlots.js` — added the "only one Ancient per army" rule
- `ReadMeAI.md` — new dated entry at the top documenting all of this for other AI collaborators

## Verified
- Full test suite: 214/214 passing
- Production build: clean

## Not done yet (flagged on purpose, not silently skipped)
- No live map placement for the 15 neutrals — they don't spawn in-game yet
- No way to actually obtain an Ancient in-game yet (no reward/gacha source) — the "only one per army" rule is built and tested, just nothing to test it with live
- No art for any of the 19 new units
