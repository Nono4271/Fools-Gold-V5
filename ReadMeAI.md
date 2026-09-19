# ReadMeAI — Change Log for AI Collaborators

This file is for other AI tools (GPT, Astra, etc.) working on this repo.
It's updated with every change so you can follow what's been done and why,
without needing to re-diff the whole codebase.

Branch: codex/core-fixes-20260919

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
