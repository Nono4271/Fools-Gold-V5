# Crew 2.0 — camp/keep button fix + ReadMeAI update

Files changed in this zip vs. the last delivery:

- `src/components/game/TilePopup.jsx` — the "BUILD CREW FORTRESS" button
  now hides entirely (not just disables) on camps/keeps/gates/ruins/the win
  tile. Those are separate special-tile systems with their own ATTACK
  button and wave/siege rules; a fortress could never be built there
  anyway, so the button showing up disabled on top of the camp/keep UI was
  just clutter. Regular camp/keep combat itself was never touched by the
  fortress-siege work — it runs through the existing ATTACK button/
  `useMarch.js` path, untouched. Fortress siege combat only ever fires for
  an actual built Crew Fortress (a march type the camp/keep path never
  produces), so there's no overlap between the two systems.
- `ReadMeAI.md` — updated the roadmap sections to reflect that Crew 2.0's
  core (roles, levels, Store, Structures/Fortress siege) is now built, not
  missing; added a session 16 changelog entry with a TODO flagged for when
  real multiplayer exists: Crew Help is currently self-serve (you click it
  for your own build) because there's no other real player yet — it should
  become crewmate-to-crewmate help once multiplayer is in.

## Answering your questions

1. **Crew Help** — left as self-serve for now per your call, with the TODO
   above logged in ReadMeAI.md so it isn't forgotten.
2. **Camps/keeps** — checked: their combat is a completely separate system
   (`useMarch.js`'s existing attack/wave/siege handling) that the fortress
   work never touches. Only fix needed was the button-visibility cleanup
   above.
3. **Crew files** — you said you found the issue (wrong path) on your end.

Verified: full test suite (352/352) and production build both pass.
