# Session 25 — Records tab scoped (documentation only, no code)

## What changed
- `ReadMeAI.md` — added the session 25 log entry and updated the section 4
  roadmap line (Diplomacy/Level are now real tabs; Records is scoped but
  held).

## Why no code
Records targets world-map Keeps, which have no crew-ownership or
"who attacked this" tracking today. Ranking "active participants" only
makes sense once real multiplayer exists (other real crewmates, not just
AI), so this is held the same way Crew Help was — scoped now, built later.

## What's decided for the eventual build
- Target: world-map Keep tiles (`isKeep`, powerLevel ≥10) — not Crew
  Fortresses.
- Two tracked numbers per capture, each a **sum across every attack**:
  total damage to defenders (combat damage) and total siege damage
  (siege-power hits). Siege runs higher since it doesn't cost troops and
  can repeat, limited only by stamina.
- Blocked on real multiplayer before it can mean anything with more than
  one real participant.
