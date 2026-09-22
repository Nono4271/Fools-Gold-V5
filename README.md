# Fools Gold V5: Map icons for Fortress, Well and Contract Outpost (2026-09-22)

Copy these files into your project at the same paths; they replace the existing files.

## Changes since the last zip (crew-structures)

Crew Fortresses, Wells and Contract Outposts now show on the map, not just in the tile popup.

- **Fortress:** a stone keep with a banner.
- **Well:** a round stone well with water and a small roof.
- **Contract Outpost:** a wooden notice board with pinned contracts and a banner.

The ring and banner color show who owns it:
- blue = your crew
- purple = ally
- red = enemy
- tan = any other crew

While a structure is being built, its icon is faded and has a dashed ring.

These are drawn shapes, not image files. They're placeholders until real art exists, and can be swapped later without changing anything else.

## Files

- `src/MapRenderer.jsx`: draws the icons (new `syncCrewStructures` plus one draw function per structure).
- `src/GameView.jsx`: builds the list of every crew's structures and passes it to the map.
- `ReadMeAI.md`: changelog entry.

## Checked

- `npm test`: 402/402 tests pass.
- `npm run build`: succeeds.
- All 3 icons were rendered in all 4 colors, plus the under-construction look, in a headless browser with no errors.
