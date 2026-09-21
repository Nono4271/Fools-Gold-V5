# Crew 2.0 — UI pass (war table + HQ screens)

Builds on the foundation zip (`shared/constants/crew.js`, `shared/utils/
crewRules.js`, `shared/utils/crewFortress.js` — unchanged, not re-sent here).
Build (`npm run build`) and full test suite (`npm test`, 348/348) both pass.

## New files — `src/components/game/crew/`
- `CrewScreen.jsx` — the new top-level screen. Replaces `CrewPanel.jsx`
  (deleted — nothing imports it anymore). Not in a crew → `CrewLanding`;
  in one → `CrewHQ`.
- `CrewLanding.jsx` — the single "war table" splash for a player not in a
  crew: CSS scene (no image asset), flavor text, Find a Crew / Found a Crew.
- `CrewCreate.jsx` — revamped creation: emblem picker, name, abbr,
  description, and the open/locked/private privacy choice.
- `CrewBrowse.jsx` — search list, privacy-aware (private crews never show),
  join button reads "Join" vs "Request to Join" depending on privacy.
- `CrewHQ.jsx` — the in-crew screen: emblem/name/level+XP bar header, a
  table hero with Diplomacy/Boosts hotspots (Kingdom dropped per your
  note), and a tab bar for Members/Structures/Store/Help/Diplomacy/Boosts/
  Cooperation/Records.
- `CrewMembers.jsx` — role-aware member list: promote/demote/kick buttons
  only show for whoever's actually allowed to use them.
- `CrewStructures.jsx` — lists built/building fortresses (siege HP,
  stationed count), a "Build a Fortress" action gated on role + free slots.
- `CrewStore.jsx` — Contribution Points balance + the starter item catalog.
- `CrewHelp.jsx` — shows your Crew Hall's real help stats
  (`crewHallStats()`); the button itself is disabled until per-upgrade
  "helps used" tracking is wired (see below).
- `CrewComingSoon.jsx`, `Emblem.jsx`, `crewStyles.js` — shared bits.

## Edited
- `src/GameView.jsx` — swapped `CrewPanel` for `CrewScreen`, rewired
  create/join/leave through `createCrew()`/the privacy join-mode, and added
  the new handlers (promote/demote/kick/disband, store purchase, voluntary
  fortress demolish).
- `shared/utils/aiCrews.js` — AI crews now go through the same `createCrew()`
  as the player, so they carry proper privacy/emblem/level/officers/etc.
  Also: AI crews now start at the level-1 member cap (50, was hardcoded
  100) since they don't level up yet — see the note in that file.

## Deleted
- `src/components/game/CrewPanel.jsx` — fully superseded by `CrewScreen.jsx`.

## Explicitly NOT done this pass (needs more of your input or bigger wiring)
- **Fortress placement on the map.** "Build a Fortress" closes the crew
  screen but doesn't yet drop you into tile-picking mode — that's a
  cross-screen flow through the world map/`TilePopup.jsx` I haven't touched.
- **Fortress siege combat.** The rules exist (`crewFortress.js`) but aren't
  hooked into `shared/utils/battle.js` yet.
- **Crew Help is display-only.** It shows real Crew Hall stats but the
  button is disabled — needs "helps used per upgrade" tracked against your
  actual build-queue timers, which live in `Game.jsx`/hooks I haven't
  touched this pass.
- **Store items beyond resource packs are inert.** Buying a relocation
  token or speedup deducts Contribution Points but doesn't grant the item
  yet (needs hooking into the relocation/build-timer systems).
- **Diplomacy/Boosts/Cooperation/Records** are clearly-labeled placeholder
  panels, per your call that diplomacy has no real teeth pre-multiplayer.

Want me to tackle the fortress map-placement flow next, or wire Crew Help
into the real build timers first?
