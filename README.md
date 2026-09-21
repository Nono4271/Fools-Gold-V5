# Crew 2.0 — Foundation pass (data model + rules)

New files only, nothing existing touched yet. All pure `shared/` logic —
no UI wiring (`CrewPanel.jsx`/`GameView.jsx`) yet, since that depends on the
emblem art and the LOTR-based in-crew screen layout we're still designing.

## Files
- `shared/constants/crew.js` — roles, privacy levels, emblem catalog
  (shape/icon/color combos — no image uploads), level 1–50 schedule
  (member cap +5 every 2 levels to 100 at Lv20; fortress slots 2→5 at
  Lv15/30/45), fortress cost/build-time constants, and a first real Crew
  Store item catalog (Contribution Points currency).
- `shared/utils/crewRules.js` — role permissions (founder/officer/member),
  crew creation + validation (name/abbr/description/emblem/privacy),
  privacy-based search/join behavior (open/locked/private), crew XP →
  level/cap syncing, and Contribution Point earn/spend.
- `shared/utils/crewFortress.js` — fortress build eligibility (p10+ tile,
  no camp, unclaimed, affordable), build timer, commander stationing (2 per
  member, crew-wide cap), and siege rules: must clear all stationed armies
  first, then siege damage; 0 HP destroys the fortress, reverts the tile,
  and hands it to whoever landed the last hit.
- `tests/crewRules.test.js`, `tests/crewFortress.test.js` — 26 tests
  covering all of the above. All pass (`node --test tests/*.test.js`).

## Decisions baked in from our discussion
- Roles: Founder (promote/demote/kick/disband/subchannels), up to 4
  Officers (kick members only, build/demolish fortress, invite/accept),
  Members.
- Privacy: **open** (instant join), **locked** (request + accept),
  **private** (invite-only, never shows in search).
- Fortress: 150k wood / 250k stone / 175k gas, 3h build, p10+ non-camp
  tile only, not upgradable, 2 commander slots per member, no inherent
  defenders — attacker clears stationed armies then sieges it down.
- Crew level 1–50: member cap 50→100 (+5 every 2 levels), fortress slots
  2→5 (+1 at 15/30/45).
- Store: Contribution Points earned from Crew Help + activity, spent on a
  small starter catalog (relocation token, speedups, resource packs).

## Not done yet (needs the emblem art / screen mockups first)
- `CrewPanel.jsx` replacement (single "war table" screen for non-members,
  LOTR-referenced screen for members) — Kingdom button dropped per your
  note.
- Wiring fortress siege into the existing battle system
  (`shared/utils/battle.js`) and the tile map (`worldTiles.js`).
- Wiring the existing-but-unused Crew Hall `crewHelpAmount()` into an
  actual "Help a Member" action.
- Diplomacy tab (simulated-only, per your call).
