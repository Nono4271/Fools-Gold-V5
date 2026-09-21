# MapRenderer — Phase 1 HQ dark-v2 patch merged in

Merged the owner-supplied "Phase 1 HQ MapRenderer CLEAN" drop-in onto the
current `src/MapRenderer.jsx` (which already has this session's Diplomacy
tile-coloring work) instead of overwriting it — that file was built from an
older snapshot and a blind replace would have reverted Diplomacy.

## What actually changed
Diffed the supplied file against the exact pre-Diplomacy baseline to find
the real delta: just `_buildOneHQ`'s `HQ_OFFSETS` table (per-faction dark-v2
HQ scale bump: orcs/ai 1.12, wizards/nightcreatures/ashen_dead 1.10,
dragons/coldborns 1.08, holyknights 1.05) and the `targetH` calc, which no
longer squashes dark-v2 art to the old 0.80 height clamp
(`useDarkHQArt ? targetW : targetW * 0.80`). Applied only that block.
Diplomacy's tile-coloring changes (`ownerTint`, etc.) are untouched.

All 8 `hq_*_dark_v2.webp` assets the patch's README asked for were already
in `public/hq/` — nothing else to add.

## File
- `src/MapRenderer.jsx` — replace the one at `src/MapRenderer.jsx`.
- `ReadMeAI.md` — replace at the repo root (adds session 21's log entry).

## Verified
Full test suite: 361/361 pass. `npm run build` clean.
