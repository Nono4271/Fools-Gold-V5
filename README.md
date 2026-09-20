# What changed in this zip

This is part 2 of the neutral/Ancient camp work — wiring the camp plan
(delivered in the previous zip) into the actual live map. Full test suite
(239/239) and production build both pass.

## Files in this zip

- **`src/workers/mapGen.worker.js`** — added camp flag bits, a placement
  pass that finds real tile locations for every planned camp and stamps
  them onto the map (same pattern the game already uses for keeps), and
  camp data added to what the map generator hands off when it's done.
- **`shared/utils/worldTiles.js`** — reads those new camp tiles back out
  so the rest of the game can see a camp's name/unit/faction, and keeps
  the existing PvE spawn system from placing monsters on top of a camp.
- **`tests/worldTiles.test.js`** — 2 new tests covering the above.
- **`ReadMeAI.md`** — new dated entry at the top documenting this pass,
  including a flagged gap: camps aren't yet checked against water/mountain
  terrain, so a camp could visually land somewhere odd until a phone
  playtest confirms placement looks right.

## Bottom line

Neutral and Ancient camps are now real, attackable structures on the map —
same attack/siege/capture flow as a keep, no new combat code needed. Only
thing left before this is fully done: eyeball it on a phone to make sure
camps aren't spawning on water or cliffs.
