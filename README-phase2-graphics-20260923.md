# Fools Gold V5 — Phase 2 Map Graphics Pass — 2026-09-23

This pass is based on the uploaded `Fools-Gold-V5-codex-core-fixes-20260919 17(1).zip`.

## Scope

The pass improves the existing dark-map visual treatment without replacing the map architecture, tile geometry, camera, commander system, or Phase 1 HQ work.

### Changed

- `src/MapRenderer.jsx`
  - Uses the new material variants only through the existing `fillVisualGround()` path.
  - Keeps the original `grass-ground.webp` asset untouched.
  - Adds one shared low-alpha resource contact-shadow Graphics layer.
  - Resource shadows use the existing `resourceFootprint()` positions, so selection/footprint alignment is unchanged.
  - No changes to HQ sprite selection, offsets, scales, or Pirate HQ handling.
  - No changes to commander walking/atlas behavior.

- `src/utils/mapVisualPolish.js`
  - Centralizes the Phase 2 terrain-material asset mapping and deterministic subtle terrain tone.
  - Defines the resource contact-shadow sizing.

- `tests/mapVisualPolish.test.js`
  - Verifies material mapping, deterministic tone, and shadow sizing.

- `public/props/dark-map/*-ground-v2.webp`
  - New refined terrain materials.
  - The original `grass-ground.webp` is preserved.

- `public/props/dark-map/ART.md`
  - Documents the Phase 2 material pass.

## Verification

Focused Phase 2 + existing map/sprite tests:

- 13 tests run
- 13 passed
- 0 failed

Full repository test command:

- 473 tests discovered
- 470 passed
- 3 could not run because the uploaded repository does not contain installed dependencies:
  - `tests/armyMenus.test.js` — missing `esbuild`
  - `tests/commanderIcons.test.js` — missing `pixi.js`
  - `tests/resourceSprites.test.js` — missing `pixi.js`

No test result is being represented as a successful production build. The focused tests and all dependency-free repository tests pass.

## Intentional non-changes

- Original HQ assets remain untouched.
- Pirate HQ remains untouched.
- Existing commander walking assets remain untouched.
- Existing `commanderGait.js` remains untouched.
- Existing map geometry and camera behavior remain untouched.
