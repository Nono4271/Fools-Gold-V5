# ReadMeAI — Change Log for AI Collaborators

This file is for other AI tools (GPT, Astra, etc.) working on this repo.
It's updated with every change so you can follow what's been done and why,
without needing to re-diff the whole codebase.

Branch: codex/core-fixes-20260919

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

## Guidelines for future changes made by other AI tools
- Add a new dated entry above (don't overwrite prior entries).
- Note: file changed, function/line, what was broken, what the fix does,
  and any follow-up/known issues.
- Keep entries short — this is a change log, not a full diff.
