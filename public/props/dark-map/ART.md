# Dark map resource art

Generated with the built-in image-generation tool, then trimmed/resized and encoded as WebP. Transparent sprites retain alpha. Existing wood/stone/food/gas.webp images now serve the P10–P13 developed-site family.

New project assets:
- wood-small.webp — single tree; code places 2–5 trees on P2–P9.
- stone-small.webp — natural boulders; code places 2–5 outcrops.
- food-small.webp — simple wheat plot; code places 2–5 plots.
- gas-small.webp — primitive gas seep; code places 2–5 vents.
- grass-ground.webp — opaque 512×512 repeating grass surface.

## Generation prompts

The four small sprite prompts share this framing:

Use case: stylized-concept. Asset type: single transparent game sprite for an isometric dark fantasy strategy world map. Style: crisp miniature hand-painted realistic 3D game asset, earthy muted colors, matching a medieval dark fantasy world, fine details readable at 40px. Camera: orthographic isometric, view from above about 34 degrees, no perspective convergence. Light softly from upper left. Object centered horizontally, base near bottom with generous empty transparent margin, entire object visible. Truly transparent RGBA background, no white/black background, no rectangular ground slab or floating island, no text, no watermark, no scene. No hard cast shadow beyond base. Only the requested single sprite.

Subjects:
- Wood: ONE single handsome dark evergreen fir tree, natural green-grey needle foliage, textured bark, visible trunk base, a few exposed roots. No buildings, no tree cluster. The single tree will be instanced two to five times by game code.
- Stone: ONE small natural cluster of three grey limestone boulders with sharp readable facets, small scattered chips at base. NO quarry machinery, no crane, no buildings.
- Food: ONE modest small plot of ripe golden wheat, an isometric rhombus of short wheat rows, tiny earthy margin only. NO farmhouse, windmill, fences, carts or buildings.
- Gas: ONE small primitive dark-fantasy gas seep, a low ring of weathered charcoal rocks around a faint turquoise vapor vent, ONE small old brass pipe/cap nestled in the rock. NO refinery, no tanks, no tall chimneys, no buildings.

Ground prompt:

Use case: stylized-concept. Asset type: seamless repeating ground texture for an isometric dark fantasy world map. A square tileable texture viewed directly overhead, covering the entire canvas edge to edge: natural softly mottled grey-olive grass meadow, muted moss, fine short grass blades, subtle dry earth patches, tiny scattered pebbles. Like the grassy ground of a detailed medieval strategy game miniature landscape. Medium-light muted sage olive green dominant, subtle worn brown-grey earth 15 percent, soft diffused daylight, no gradients/vignette or directional cast shadows, flat uniform lighting. Intricate fine grain painterly natural texture visible at game scale, not a solid flat fill. Organic, low contrast, no obvious repeated clumps, completely seamlessly tileable on all four edges. NO objects, no trees, no buildings, no paths, no flowers, no border, no lettering, no large stones, no dark dramatic spotlight. Full square opaque image.

## Rendering

`src/utils/resourceSprites.js` declares asset-specific ground anchors and preserves proportions. `src/utils/spawnVisualTest.js` supplies count/size layouts and shared tile-footprint centres. Baking combines the parts into a cached texture, preserving one sprite per resource tile. Original source images are never destroyed by map cleanup.

## Phase 2 material pass — 2026-09-23

The original `grass-ground.webp` remains untouched. The map renderer now uses a second material set for the new-world visual mode:

- `grass-ground-v2.webp` — refined neutral meadow surface
- `forest-ground-v2.webp` — cooler/darker mossy forest floor
- `mountain-ground-v2.webp` — desaturated rocky soil tone
- `desert-ground-v2.webp` — muted warm dry-earth tone
- `ruin-ground-v2.webp` — darker desaturated worn ground

These are derived from the existing approved ground language rather than replacing the original source. They remain opaque, seamless-use textures with no objects or UI.

The renderer also adds a single shared contact-shadow layer beneath resource props so existing sprites sit into the terrain instead of appearing pasted onto it. This is intentionally low-alpha and does not change the resource artwork itself.
