# ReadMeAI — Change Log for AI Collaborators

This file is for other AI tools (GPT, Astra, etc.) working on this repo.
It's updated with every change so you can follow what's been done and why,
without needing to re-diff the whole codebase.

Branch: codex/core-fixes-20260919

---

## 2026-09-20 — Codex

### Map polish: ground selection, P10+ placement, existing faction HQs
- Reviewed all five user screenshots (IMG_8524–8528).
- Selection layer now sits below resource sprites, forts and HQs, so outlines no longer cut across trees/rocks. Selection strokes are thinner and slightly warmer.
- P10–P13 main clusters moved 12 world pixels toward the front of their unchanged 2×2 footprint; accompanying details adjusted to match. No selection/hit area or gameplay geometry enlarged.
- Retained all eight original faction HQ sprites. In the 25-tile HQ visual-test area, a lightweight render filter warms the palette and blends pale lower sand skirts toward grass; Coldborn blue-white snow is exempt from the skirt treatment. Added subtle contact shading.
- HQ ownership borders within the test area changed from thick black/neon strokes to thin, muted ownership colours. Existing relation colours, click areas and base positions are preserved.
- HQ visual cache now accounts for the test-area boundary; HQ redraws read the current player HQ after relocation.
- No replacement base art or source-image edits. Full phone visual/performance confirmation remains needed; automated tests/build and a source-scope check pass.

---

## 2026-09-20 — Codex

### Graphics revision: two resource families, centred props, continuous grass
- P2–P9 use new simple tree/boulder/wheat/gas-vent assets; each resource grows from two objects at P2 to five at P9, with size changes between levels.
- P10–P13 use the developed forest/quarry/farm/refinery designs, larger sizing and added resource details at successive levels.
- Props use per-asset ground/root anchors and preserve image proportions. Shared footprint geometry places large resource props at the centre of their selection diamond.
- Added a world-aligned repeating grass texture to ordinary, P10+ and static-keep ground in the existing 25-tile HQ test radius. Eliminates the old yellow P10+ patches; preserves special water/crossing terrain.
- Clusters are baked once per resource/power and reused as one sprite per tile. Load callbacks refresh graphics; cleanup preserves source textures for reopening the map.
- Added asset notes/prompts in `public/props/dark-map/ART.md`.
- Validation: 112 tests pass; production build passes. Reviewed an asset/footprint composition sheet. Cloud browser cannot open the local preview, so full in-game phone rendering/performance remains to be checked by the user.
- No resource rates, tile powers, map generation, march rules or other gameplay values changed.

---

## 2026-09-20 — Codex (Sol Medium)

### Playable graphics test around the random player spawn
- **Area:** a 25-tile radius centered on the actual player HQ, so every new random spawn opens inside the test area.
- Added original dark-fantasy Wood, Stone, Food, and Gas sprite assets under `public/props/dark-map/`.
- Resource sprites scale with existing tile power; higher-power tiles render larger clusters. Existing resource types, rates, tile powers, and gameplay data are unchanged.
- Test-area ground uses a darker blended palette. Adjacent tiles owned by the same player share an exterior territory outline instead of showing borders between every tile.
- Outside the test radius retains the existing renderer for direct comparison.
- Verified with all 110 automated tests and a production build.

---

## 2026-09-19 — Codex (Sol Medium)

### Fix: landing capture delay and diagonal marches
- **Files:** pathfinding/march workers, `shared/utils/pathfinding.js`, `shared/utils/marchMotion.js`, `src/MapRenderer.jsx`, and march tests.
- Capture/battle now begins when the army reaches the target. The prior code waited one extra full tile time (often about 5 seconds).
- March routes can use diagonal steps and choose the quickest passable route. Attack/foothold adjacency remains edge-only and blocked terrain cannot be corner-cut.
- March motion is 15% faster overall. Diagonal timing accounts for its longer distance, so it does not create an uncontrolled speed jump.
- Added arrival, diagonal routing, adjacency, and speed tests. All 107 tests and the production build pass.

---

## 2026-09-19 — Codex (Sol Light)

### Fix: commander icon crash after march update
- **File:** `src/MapRenderer.jsx`.
- Fixed `ReferenceError: Can't find variable: renderCommanderIcons` by calling the renderer through the map's existing shared redraw reference.
- The WebSocket offline warning is separate from this visual crash.

---

## 2026-09-19 — Codex (Sol Medium)

### Fix: missing march route and stop-start commander movement
- **Files:** `src/MapRenderer.jsx`, `src/workers/march.worker.js`, `src/workers/gameLoop.worker.js`, `shared/utils/marchMotion.js`, march creators, and `tests/marchMotion.test.js`.
- Route lines were only refreshed when no commander was marching, so a new march never showed its line. Lines now refresh on every march state change and show the full route plus endpoint.
- Movement previously waited one tile time before animating, eased to a stop at every centre, and skipped timing the final segment. The animation now starts immediately and moves at constant speed across the whole route; every segment takes its configured time. Existing speed formulas/rates are unchanged.
- Existing BFS already selects the shortest passable adjacent-tile route and does not require owned land. Existing attack eligibility/adjacency checks are unchanged.
- Three focused tests cover constant motion, final-segment timing, and shortest adjacent pathfinding. Full automated suite and production build pass. Phone visual confirmation still needed.

---

## 2026-09-19 — Codex (Astra)

### Fix: map freezes / Gacha crashes from destroyed commander sprites
- **Files:** `src/MapRenderer.jsx`, `src/utils/commanderIcons.js`, `tests/commanderIcons.test.js`.
- **Confirmed code defect:** overlay redraws destroyed every commander picture but left the march ticker's `cmdSpriteRef` pointing at them. Moving a destroyed Pixi Sprite reproduces the screenshot's `transform.position` error; destroying it again reproduces `_texture.off`. A ticker exception can stop map painting even while tile taps still work. Gacha unmounts the map and hit the second destruction. The exact 30-second timing is not yet reproduced on-device.
- **Fix:** redraws and animation now share one persistent icon renderer; removed the two obsolete destroy/recreate renderers. Cleanup clears the icon cache once, cancels pending pan callbacks, and clears HQ/fort caches for returning from Gacha. Late HQ/fort image loads avoid destroyed containers.
- **Verified:** four focused tests using real Pixi Sprite/Container objects cover redraw/marching reuse, Gacha-style cleanup, commander removal/return, and hidden portraits. Production build passes. Cloud browser lacks a working map renderer, so phone confirmation is still needed: pan/select beyond 30 seconds, open Gacha, return, repeat.
- **Stamina:** Claude's `CommanderDetail` context fix is present in the current branch; unchanged. Old screenshots do not establish that this error still occurs on the latest deployment.
- Keep `?debug` instrumentation until phone retest confirms both symptoms are gone. No gameplay rates changed.

---

## 2026-09-19 — Claude (Sonnet)

### Fix: troops not attaching to commander on Confirm
**File:** `src/Game.jsx` — `setTroopSlot()` (~line 2400)

**Bug:** The function tried to compute `finalTroops` by mutating a variable
from *inside* the `setTroopCounts(updater)` callback, then read that variable
on the next line. React does not run state updater callbacks synchronously,
so `final` was always read as the old value (0 for any brand-new slot
assignment). Result: hitting Confirm on a new troop assignment always took
the "empty slot" branch and silently deleted it instead of saving it.

**Fix:** Compute `drawn`, `returned`, and `final` synchronously up front
(reading directly from the `troopCounts` closure value), then pass the
already-known `drawn`/`returned` numbers into the `setTroopCounts` updater
just to apply them to the pool. No more reliance on the updater's side
effect for control flow.

### Fix: crew mutation corrupting state (touch freeze / crash)
**File:** `src/Game.jsx` — AI crew ticker `useEffect` (~line 1306, `setInterval(..., 30000)`)

**Bug:** When a non-founder AI player joined an existing crew, the code did
`target.members = [...]` directly on an object pulled out of `options`,
which was ultimately still a reference to the crew object inside
`prevCrews` (the ticker's `nextCrews` was only a **shallow** array copy — the
crew objects inside it were the same references as in `prevCrews`). This
mutated React state in place outside of `setState`, which is undefined
behavior in React and a likely cause of the ~30s touch-freeze and the crash
on the next menu open (state consumers get inconsistent/stale reads after
an in-place mutation).

**Fix:** Build a new crew object (`{ ...target, members: [...] }`) and
replace it by id in `nextCrews` (and in `newCrews` if it was just created
this tick), instead of mutating the original object.

**Not yet addressed:** This ticker still does an O(n) pass over every AI
player on the map every 30 seconds (`aiPlayerIdMapRef.current`). If the
freeze persists after this fix, the next suspect is the raw cost of that
loop on lower-end devices — may need throttling/chunking.

### Update: crew-mutation fix did NOT resolve the freeze/crash
Confirmed in-game: the ~30s pan freeze and crash on menu-open are still
happening after the fix above. New repro details from testing:
- Freeze happens even with zero interaction (just sitting on the map).
- During the freeze: tapping a tile still opens its popup fine — it's
  specifically **drag-panning** that stops moving the map.
- The HQ tile specifically won't open on a single tap (needs multiple).
- Menu crashes are narrowed to **Gacha** and **Commander** screens
  specifically (not "any" menu as first thought).

**Working theory:** `isPanning.current` (a ref in `MapRenderer.jsx`) gets
set `true` at drag-start and is only reset `false` at touch-end. Ordinary
tile-tap selection runs through a different handler that doesn't check
this ref (which is why taps still work), but HQ-tile clicks and map
redraws do check it — if it ever gets stuck `true` (e.g. an exception
inside a touch handler before the reset line runs), that alone would
explain "panning stuck + HQ won't open with one tap" together. The
Gacha/Commander crash is still unexplained — nothing in those two screens
touches `troopSlots` directly, so it's probably unrelated to the troop-slot
fix and is a separate bug.

**Added (not a fix — instrumentation):**
- `index.html`: loads [eruda](https://github.com/liriliri/eruda) (an
  on-screen mobile JS console) when the URL has `?debug` on it, e.g.
  `https://<preview-url>/?debug`. Tap the floating circle it adds to open
  a console panel and read real errors/logs on-device — no computer
  needed. Remove this whole block once we've root-caused the crash.
- `src/MapRenderer.jsx`: behind the same `?debug` flag —
  - Logs which DOM element is blocking canvas touches whenever
    `isUITarget()` returns true (tests the "stuck overlay" theory).
  - Logs every time `isPanning.current` flips true/false, with a
    timestamp (tests the "stuck ref" theory).
  - A 3-second heartbeat that logs `isPanning.current`'s value even with
    no touch input, so a stuck-true state is visible without needing to
    catch it mid-touch.
  - Touch handlers (`onTS`/`onTM`/`onTE`) are now wrapped so a thrown
    exception is logged instead of silently aborting the handler — this
    was the accidental gap that could leave `isPanning` stranded `true`.
  - Logs when an HQ tile click is blocked because `isPanning` is stuck.

**Next step:** reproduce the freeze with `?debug` on the URL, open the
eruda console, and screenshot whatever `[PAN_DEBUG]` lines appear (or
don't — their absence is also informative) plus any Gacha/Commander crash
error. That will tell us which theory is right instead of guessing further.

### Update: root cause found for the Commander-screen crash (pan-stuck theory disproved)
Console logs captured via the `?debug` eruda console (see instrumentation
above) showed:
- `isPanning` toggling true/false normally on every drag, with no stuck
  state and no `isUITarget` blocks logged anywhere. **The stuck-ref theory
  is disproved** — panning itself isn't the bug.
- `[ServerSync] Disconnected — reconnecting in 30000 ms` firing on a 30s
  cadence — this is expected right now since there's no real multiplayer
  server running yet, not a bug. Coincidentally similar cadence to the
  reported "30s freeze," but not the actual cause (confirmed with the
  project owner).
- The actual crash:
  ```
  ReferenceError: Can't find variable: staminaMax
  TypeError: null is not an object (evaluating 'this._texture.off')
  ```

**Root cause (fixed):** `CommanderDetail` in `src/components/screens/CommanderScreen.jsx`
renders a Stamina block that references `staminaMax` directly, but the
component never pulls it from context or props — it's simply undefined in
that scope, so React throws the moment this component renders. This is
the component rendered for a selected commander's full detail view, which
explains the **Commander screen crash**.

**Fix:** added `const { staminaMax = 150 } = useGameContext();` at the top
of `CommanderDetail` (the `useGameContext` import already existed in this
file — it's used by another component in the same file).

**Still open:**
- The **Gacha screen crash is a separate, still-uncaptured bug** —
  `GachaScreen.jsx` never renders `CommanderDetail` and doesn't reference
  `staminaMax` at all, so this fix does not touch it. Needs its own
  `?debug` repro: trigger the Gacha crash specifically (without also
  opening Commander) and grab whatever error eruda shows.
- The secondary `TypeError: null is not an object (evaluating
  'this._texture.off')` is a PixiJS-level error — likely fallout from the
  `staminaMax` crash aborting a render mid-way and leaving a texture
  cleanup path in a bad state, but not confirmed. Worth re-checking once
  the Gacha crash is also fixed, in case it stops happening on its own.
- The `?debug` pan instrumentation in `MapRenderer.jsx`/`index.html` can
  stay in for now since it's harmless (gated behind the URL flag) and may
  still be useful for the Gacha repro — remove once both crashes are
  confirmed fixed.

### Known open items (not fixed yet)
- Confirm the crew-mutation fix actually resolves the freeze/crash — needs
  in-game retest since diagnosis was from static code reading (no console
  access on mobile).
- Consider batching/throttling the AI crew ticker if freeze recurs.

---

## 2026-09-19 — Claude (Sonnet), session 2

### Fix: leftover "ore" prop where "gas" belongs (tiles, AI economy, spawn rewards)
Context: `ore` was renamed to `gas` as a resource type at some point, but a
few spots never got updated and still reference the old name/shape. Note
the current canonical resource set is **stone, wood, gas, food** —
`resourceIncome.js` and `mapGen.worker.js`'s `RSS_ENC`/`RSS_DEC` confirm
this; freshly generated tiles never get `rss: "ore"` at all anymore.

**File:** `src/MapRenderer.jsx` (~line 663) — the tile highlight/glow color
picker still explicitly checked `tile.rss === "ore"` (dead — no tile can
have that value) and lumped **both** `"gas"` and `"food"` tiles into one
leftover default color (mislabeled `// gas` in the comment). Fixed: gas
now gets its own explicit color (reusing the old ore color, since gas
visually replaced ore — see the "Mine shaft" prop art for gas tiles), food
gets a new distinct color instead of silently sharing gas's.

**File:** `src/hooks/useAI.js` (`tickAiRss`, the per-second AI faction
resource tick) — this was a real functional bug, not just cosmetic: it
computed `gas: p.ore + 5` and `food: p.gas + 5` (reading from the wrong/
nonexistent prop), then returned `gas: Math.min(9990000, n.ore)` (`n.ore`
was never set on `n` at all — this evaluated to `NaN`) and `food:
Math.min(9990000, n.gas)` (returned gas's value instead of food's). Net
effect: **AI factions' gas income was broken (NaN) and food silently
mirrored gas.** Fixed to read/write the correct `gas`/`food` keys
throughout. Confirmed the default shape used elsewhere (`Game.jsx`'s
`setAiRssMap`, `gameLoop.worker.js`) is already `{stone,wood,gas,food}` —
no `ore` — so this fix matches the real shape.

**File:** `src/utils/spawnUtils.js` — `RSS_TYPES` (the reward-type pool for
defeating spawn commanders) was `["gas","wood","stone","ore"]`, missing
`food` entirely and still offering the dead `ore` type as a reward.
Changed to `["gas","wood","stone","food"]`.

**Comments only (no logic change):** stale `{stone,wood,ore,gas}` shape
comments in `Game.jsx` (`aiRssMapRef`) and `gameLoop.worker.js`
(`rssUpdates`) corrected to `{stone,wood,gas,food}` to match reality.

**Left alone (dead code, out of scope):** `MapRenderer.jsx` line ~39 has
an unused `RC` resource-color palette object still keyed `wood/stone/ore/
gas` (no `food`) — grepped the whole file and confirmed `RC` is never
referenced anywhere, so it's inert. Left as-is to keep this change
targeted; flag for cleanup whenever that file gets touched next.

### Fix: Commander and Battle Reports shared the same icon
**File:** `src/components/game/GameBar.jsx` — both the "Reports" button
(opens Battle Log) and the "Commander" button used icon `⚔`. Changed
Commander's icon to `🎖` so they're visually distinct. Reports keeps `⚔`.

---

## 2026-09-19 — Claude (Sonnet), session 3

### New: real gas prop art — replaces the old mine-shaft/smelter/nugget visuals
Design process: built an HTML/SVG mockup with several concept directions,
iterated with the project owner (bubbles → wispy steam → wispy **green**
steam matching the existing in-game placeholder look), landed on
"Concept 7 — Gas Pool, wispy & green" with three distinct looks across the
power-level tiers (same pattern as wood's Lumber camp → Ancient Grove and
food's Plague Storehouse → Cursed Granary). Implemented into the real
isometric renderer.

**File:** `src/MapRenderer.jsx`, `drawRssProp()`, `rss === "gas"` branch
(~line 948) — replaced entirely:
- **P2–P9 — Gas Pool:** a small dark, faintly green-glowing pool with
  curling green wisps rising from it (2 chained bezier curves per wisp,
  3 wisps, colors `0x3ad966` / `0x7af08c` / `0xc6ffcf` for depth). Scales
  continuously with `sizeMult` like the other resources; a second smaller
  pool appears once `sizeMult > 0.60`, same as the old nugget behavior.
- **P10–P11 — "Gas Well":** the same pool, now with a simple wooden
  collection frame straddling it and a small tank with a glowing green
  window: still leaks a couple of uncontained wisps around the rig.
- **P12–P13 — "Gas Refinery":** pool + a cluster of storage tanks
  (glowing level windows), connecting pipes, and a flare stack venting a
  large wispy green plume; P13 (`pl >= 25`) gets two tanks instead of one,
  mirroring the old shaft-count pattern.
- Added two shared local helpers used by all three tiers:
  `drawGasWisps(ox, oy, wsc)` (the wisp-cluster art) and
  `drawGasPool(px, py, prx, pry)` (the pool base). Both are plain PIXI
  Graphics calls (`bezierCurveTo`, `drawEllipse`, `drawRoundedRect`, etc.),
  no new dependencies.

**File:** `src/MapRenderer.jsx` (~line 663) — the tile highlight-glow
color for `gas` was `0xd4a020` (amber, matched the old mining theme from
the previous session's fix). Changed to `0x3ad966` (green) to match the
new pool art.

**Verified:** full production build (`npm run build`) and full test suite
(`npm test`, 107/107) pass after the change. Not yet visually confirmed
on-device — next step is a phone playtest to check the wisps read well at
actual isometric tile scale and the tank/pipe proportions look right at
each tier.

**Mockup reference:** the approved concept sheet (all 7 directions
considered) is at the artifact this was designed in — ask the project
owner if you need to see it again; it's not part of the repo.


- Add a new dated entry above (don't overwrite prior entries).
- Note: file changed, function/line, what was broken, what the fix does,
  and any follow-up/known issues.
- Keep entries short — this is a change log, not a full diff.
