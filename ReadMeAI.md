# ReadMeAI — Change Log for AI Collaborators

This file is for other AI tools (GPT, Astra, etc.) working on this repo.
It's updated with every change so you can follow what's been done and why,
without needing to re-diff the whole codebase.

Branch: codex/core-fixes-20260919

---

# CURRENT AUDIT AND ROADMAP — READ THIS FIRST

Last consolidated: 2026-09-20. The repository is the source of truth. The
dated entries below are history and may describe bugs that were fixed later.

## Rules for AI collaborators

1. Items marked **COMPLETE — DO NOT RECHECK** were already audited, fixed and
   tested. Do not spend usage re-auditing or redesigning them unless the owner
   reports a regression or your current change directly touches that system.
2. Run only the tests related to files you change, plus the normal build gate
   when code changes. Documentation-only changes do not need a full test run.
3. Do not assume a feature is missing from the main file. Trace its component,
   hook, worker, shared constant and server event before changing it.
4. Do not invent requirements. This game follows LOTR: Rise to War 1.0 as its
   functional reference, uses one-commander armies, and keeps original Fool's
   Gold names, art and presentation.
5. Work on `codex/core-fixes-20260919`. Do not merge to main or deploy to the
   production branch without the owner's instruction. Update this file after
   every change.

## Locked owner decisions

- Final target is landscape mobile; browser/Cloudflare is the current test
  platform. Respect phone safe areas and prevent camera/UI overlap.
- Resources are stone, wood, gas and food. Ore does not exist. Training costs
  no stone; food is normally highest, while wood/gas vary by faction.
- One command is 100 small, 50 medium or 4 large troops. Lower tiers train
  faster. Small commands take roughly 10–35 minutes, medium longer, large
  longer, and nothing exceeds one hour. Costs and times vary modestly by
  faction/branch. See `docs/training-values.md`.
- Training and forts cannot be sped up. Building, healing and recall require
  specific speedups; universal speedups may also apply. Do not silently extend
  speedups to training or fort timers.
- Wounded troops go to the healing tent and return to their original barracks
  troop branch. Healing is manual by default with an optional auto-heal toggle.
- Voluntary relocation requires all armies home, keeps all owned territory and
  only moves the HQ. Forced relocation returns armies instantly, chooses a
  valid open 3x3 pad on faction-owned land in any faction region, relaxes
  border restrictions only if necessary, and falls back to the faction capital
  even if enemies own it.
- Captures occur immediately on arrival. A captured tile receives three minutes
  of protection. Deleting/abandoning a tile takes five minutes.
- Background/offline timer progress is required in the finished game.

## 1. Current architecture

- **Client:** React UI with most live game state coordinated in `src/Game.jsx`.
- **World renderer:** PixiJS in `src/MapRenderer.jsx`; map, HQ, fort, prop,
  selection, commander and march visuals are separate display layers.
- **Game systems:** hooks in `src/hooks/` handle AI, battle, marches,
  pathfinding, resources, forts, gacha, training, upgrades and server sync.
- **Heavy work:** browser workers in `src/workers/` run map generation,
  pathfinding, marching, battle, spawning, forts and the game loop.
- **Shared rules/data:** `shared/constants/` and `shared/utils/` hold troops,
  factions, commanders, skills, buildings, items, gear, map values, battle,
  economy, relocation, income and movement rules.
- **Server prototype:** `server/index.js` is a Node WebSocket session server.
  It accepts initialization and broadcasts selected world changes. It is not a
  complete authoritative multiplayer server or durable database.
- **Tests:** `tests/` covers troop economy, healing, battle roster execution,
  resources, march motion, commander sprite lifecycle and current map visuals.
- **Current persistence:** primarily client/session state. Durable accounts,
  cross-device saves and authoritative world recovery are not complete.

## 2. Complete systems

Do not re-audit these without a reported regression or a directly related
change.

- **COMPLETE — DO NOT RECHECK:** ore removal and canonical stone/wood/gas/food
  resource flow, including repaired AI and tile income.
- **COMPLETE — DO NOT RECHECK:** building costs and build-time rebalance.
- **COMPLETE — DO NOT RECHECK:** T1–T3 training costs/times, faction variation,
  command sizes, no-stone rule, capacity reservation and completed-command
  delivery. The 72 reviewed values are in `docs/training-values.md`.
- **COMPLETE — DO NOT RECHECK:** healing flow: wounded reservation, original
  troop-type return, food payment, manual/auto toggle, tent requirement,
  capacity safety and healing speedups.
- **COMPLETE — DO NOT RECHECK:** march timing formula, shortest diagonal routes,
  constant movement, immediate start, final segment timing and arrival capture.
  Attack eligibility still requires valid tile adjacency.
- **COMPLETE — DO NOT RECHECK:** battle initialization/confusion crash fixes and
  execution coverage for the existing 72 T1–T3 faction troops.
- **COMPLETE — DO NOT RECHECK:** five-minute tile deletion and three-minute
  post-capture protection. (Deletion was actually 15 s in code until Claude's
  2026-09-20 split fix; now `TILE_DELETE_MS` in `shared/utils/tileTimers.js`.)
- **COMPLETE — DO NOT RECHECK:** item definitions, Bag replacing the old Gear
  shortcut, building/healing/universal timer speedups and resource boosts.
- **COMPLETE — DO NOT RECHECK:** voluntary and forced HQ relocation behavior.
  Relocation gameplay is entered through the HQ flow; the Bag token message is
  a separate UI cleanup item.
- **COMPLETE — DO NOT RECHECK:** fort construction/upgrade timers and existing
  fort build, station, recall, demolish and abandon flow.
- **COMPLETE — DO NOT RECHECK:** leaderboard UI and calculation.
- **COMPLETE — DO NOT RECHECK:** Commander detail `staminaMax` crash, Gacha/map
  Pixi sprite-destruction crash, troop-slot Confirm bug and crew state-mutation
  bug.
- **COMPLETE — DO NOT RECHECK:** Pirate HQ redesign, HQ centering, adjacent
  prop/selection presentation, and the current spawn-area dark map test.

## 3. Partially implemented systems

- **Gacha/shop:** Summon Gate pulls, gems/medallions, commander rewards,
  duplicates/respect, schematics and gear rewards exist. The original roadmap
  phrase “shop integration” is not defined in the repository. Do not invent a
  store or monetization design; ask the owner or locate the original design
  source before expanding it.
- **Troop roster:** Eight factions have T1–T3 branches, art and battle data.
  Tier 4 and neutral-unit roster integration remain unfinished.
- **Neutral PvE:** tile garrisons, defender commanders and spawn encounters
  exist. A complete neutral unit roster with its own integrated data/art is not
  present.
- **Crew:** create, browse, join/request, leave, member list, basic level field,
  AI crews and a Crew Help placeholder exist. This is not Crew 2.0.
- **Gear:** inventory, slots, rarity, rolled stats, equipping, gacha drops and
  battle/stat application exist. The planned gear rework still needs an
  owner-approved design and balance pass.
- **Map graphics:** the dark grass and two resource-art families work inside a
  25-tile test radius around the random player spawn. Full-world conversion,
  more terrain/prop variation, crossings, gates, keeps and seven faction bases
  remain.
- **Commander map visuals:** circular commander portraits render and move on
  the map. Purpose-built map sprites are still required.
- **Multiplayer:** WebSocket sessions and broadcasts exist for selected tile,
  siege and fort changes. Authority, persistence, identity, reconnect recovery
  and scaling are incomplete.
- **Mobile/UI:** landscape safe-area work and touch fixes exist, but all screens
  still need device testing and a consistent visual polish pass.
- **Offline progression:** timer data uses deadlines in several systems, but
  durable background/offline recovery is not complete across the whole game.

## 4. Missing systems and content

- Tier 4 troops built through the existing faction branch/tier architecture.
- Neutral units built through the same troop/battle architecture, not a
  disconnected combat system.
- Remaining troop roster additions and corresponding balance/art.
- Season Chapters framework and chapter data.
- Chapter locks for map crossings/gates, the Holy Grail/endgame area, war
  declarations, major systems, objectives and events.
- Crew 2.0: officer ranks, Crew levels/XP, functional Help, currency, Store,
  Boosts, Diplomacy, War Declaration, Structures, records/logs and an original
  headquarters/table interaction screen inspired functionally by Fellowship in
  Rise to War 1.0.
- World, faction and Crew chat.
- Tutorial and task/progression framework.
- Remaining gear rework decisions and implementation.
- Full map art conversion and final mobile graphics/UI polish.
- Durable, server-authoritative seasons and real multiplayer infrastructure.

## 5. Technical debt to fix before multiplayer

- `src/Game.jsx` owns too many unrelated systems and large mutable/ref-backed
  maps. Split domain state before adding server authority.
  **Done (Claude):** 10-step split — see the dated entries below. Background
  timer catch-up (resources, egg/stamina regen, marches, reinforcements) is
  also done — see the 2026-09-20 entry. State still lives in `Game.jsx`.
- Game rules are divided between React callbacks, hooks and workers. Move every
  multiplayer-sensitive rule into shared deterministic functions callable by
  the server.
- The client currently creates/holds too much world truth. The server must own
  captures, combat results, resources, timers, inventory, troops, relocation,
  chapters, crews and diplomacy.
- Replace session-only state with durable storage, migrations, account/player
  IDs, world/season IDs and reconnect snapshots.
- Add command validation, idempotency and server timestamps so duplicate or
  delayed messages cannot spend/capture twice.
- Replace full-map client/server transfers with region/chunk snapshots and
  small validated updates suitable for thousands of players.
- ~~Remove temporary `?debug`/mobile diagnostics after the related phone tests
  are complete.~~ **Done (Claude)** — see the 2026-09-20 "tech-debt cleanup" entry.
- ~~Resolve the Bag relocation-token “coming soon” message so it directs players
  to the existing HQ relocation flow or opens it.~~ **Done (Claude)** — same entry.
- ~~Add the required recall-specific speedup; keep training and forts excluded.~~
  **Done (Claude)** — same entry.

## 6. Current Alpha/Beta launch blockers

- Tier 4 and neutral units are required before multiplayer conversion.
- Season Chapters and their progression gates do not exist.
- Crew 2.0 and chat do not exist.
- The world art conversion, remaining seven faction bases, keep/mob/commander
  map sprites and mobile UI polish are incomplete.
- No durable authoritative server, account persistence or reconnect recovery.
- Battle execution tests pass for the current roster, but balance, mixed armies,
  long wars, wounded/healing loops and large-scale regression playtests remain.
- Offline progression is incomplete across all timers.
- No currently reproduced Gacha/Commander/map-freeze crash remains after the
  fixes above. Treat a new occurrence as a regression and collect the exact
  phone console error before re-auditing those systems.

## 7. Dependencies

- Finish T4 + neutral roster/data before final battle balancing and before
  generating all missing troop/mob art.
- Define Season Chapters before gates, crossings, Holy Grail access, war
  declarations, seasonal objectives and server APIs.
- Define Crew 2.0 roles/data before Crew chat permissions, diplomacy, wars,
  structures, logs and the table UI.
- Finalize deterministic shared battle/economy rules before making the server
  authoritative.
- Finish full-world terrain/prop rules before final keep/gate/base placement
  polish and performance tuning.
- Complete server identity/persistence before real chat, Crew ownership,
  diplomacy and season progression.

## 8. Recommended Alpha/Beta implementation order

1. Finish the current map-art direction: full-world tiles/props, seven faction
   bases, keep sprites, gate/crossing tuning, mob sprites, commander sprites and
   dotted march lines/arrows.
2. Add T4 troops and neutral units through existing troop/branch/battle data.
3. Run focused battle balance/playtests with all tiers and neutral encounters.
4. Build the Season Chapters data model and unlock checks in shared code, then
   connect gates, Holy Grail, war declarations, objectives and events.
5. Build Crew 2.0 data/functions, then the headquarters/table UI.
6. Add world/faction/Crew chat using the future player/server identity model.
7. Complete gear rework, tutorial and task progression.
8. Finish offline/background recovery and remaining mobile UI/graphics polish.
9. Stabilize all systems in the browser Alpha/Beta before converting authority
   to the real multiplayer server.

## 9. Must be complete before real multiplayer conversion

- T4 troops, neutral units and roster completion.
- Final deterministic battle, march, healing, training, item, fort, relocation
  and resource rules shared by client and server.
- Season Chapters with server-owned unlock state.
- Crew 2.0 rules, chat permissions, diplomacy and war declaration rules.
- Stable map/gate/crossing/keep/Holy Grail data and IDs.
- Offline timer semantics and reconnect behavior.
- Tutorial/task state that can be stored server-side.
- Full Alpha/Beta regression playtest and mobile performance pass.
- A migration plan from browser state to accounts and persistent worlds.

## Approved graphics/map backlog

- **DONE:** Pirate HQ redesign and placement.
- Redesign faction bases for Wizards, Orcs, Dragons, Holy Knights, Creatures of
  the Night, Coldborns and Ashen Dead. Show each design for owner approval.
- Expand the new terrain/resource tile and prop treatment across the whole map.
- Monitor and tweak gates/crossings to match the owner's desired Rise to War
  style, chapter locks and play flow.
- **DONE:** March routes use dotted lines, repeated directional arrows and a
  clear target endpoint.
- Create purpose-built commander sprites for the world map.
- Create sprites for all remaining mobs/neutral encounters.
- Create sprites for keeps and blend them with the new map style.

---

## 2026-09-20 — Claude (Sonnet)

### Small tech-debt cleanup batch (roadmap section 5, remaining small items)
Three small items left in "Technical debt to fix before multiplayer":

- **Removed temp `?debug` pan-freeze diagnostics** (`src/MapRenderer.jsx`): owner confirmed phone pan-freeze testing is done. Removed the `PAN_DEBUG` flag, the `[PAN_DEBUG]` console logging, and the 3s heartbeat interval. Kept the underlying try/catch wrappers around the touch handlers (`safeTS`/`safeTM`/`safeTE`) since those aren't debug-only — they're real defensive code that resets `isPanning` if a handler throws — just switched their logging from debug-gated to a plain unconditional `console.error` so a real failure there is never silent.
- **Fixed the Bag's "Relocation Token" item** (`src/hooks/useConsumables.js`): using it from the Bag used to consume the token, immediately give it back (`restoreOne`), and show "Relocation coming soon!" — a dead stub, since the real relocation flow already exists and works fine from `TilePopup.jsx` (tap a valid pad tile → "RELOCATE HQ HERE"). Now it just shows a message pointing the player to that flow and doesn't touch the token count at all — there's no target tile picked yet from the Bag, so there's nothing to actually relocate.
- **Added the recall-specific speedup** (per the locked decision: "Building, healing and recall require specific speedups; universal speedups may also apply"): recall marches (`cmd.march.type === "recall"` — set when a fort is destroyed/decommissioned or a commander is otherwise recalled) previously had no speedup path at all. Added `su_recall_*` consumable defs (`shared/constants/consumables.js`, same duration tiers as building/healing) and a "Recall Speed Ups" Bag group. New pure function `speedUpRecall(cmds, durationMs)` in `shared/utils/consumables.js` shifts the recalling commander's `march.lastStepTime` back by the speedup duration — this reuses the exact catch-up mechanism from the background-timer work above (`advanceMarch`), so the worker naturally covers the skipped distance on its next tick rather than needing separate fast-forward logic. Universal speedups now also apply to recall. Training and forts remain excluded, per the locked no-speedup rule — untouched.

New/updated tests: `tests/splitRules.test.js` gained a `speedUpRecall` test (player-only, recall-march-only, AI/other-march-types/no-march all left untouched). Full suite: 165 passing, 0 failing. Build clean, live smoke test shows no runtime errors.

---

## 2026-09-20 — Claude (Sonnet)

### Background/offline timer catch-up (roadmap item 4)
Scope, per owner: catch up timers when the phone locks or the tab is backgrounded — not a full save/persistence system.

Audited all six systems named in the roadmap item (training, building upgrades, healing, forts, marches, resources). Training queues, healing queue (`shared/utils/armyEconomy.js` `tick`), building upgrades (`useUpgrades.js`) and forts (`useForts.js`) already compared progress against absolute timestamps (`nextAt`/`endsAt`/`completesAt`) and gather/training *orders* (`shared/utils/tactics.js` `ticksOwed`) already computed whole ticks owed from elapsed real time — all of these already catch up correctly and needed no change.

Three things did NOT catch up — each added/advanced a fixed amount per timer firing instead of scaling with real elapsed time, so time spent backgrounded was silently lost rather than credited on return:
- **Resources** (`shared/utils/resourceIncome.js` `resourceIncomeTick`, `src/hooks/useResources.js`): assumed the interval always fired every 60s. Now takes `elapsedMs` and scales gains by it; the hook tracks the last tick's real timestamp and also runs one catch-up tick immediately on `visibilitychange` (tab foreground) instead of waiting for the next scheduled interval.
- **Dragon-egg and stamina regen** (`shared/utils/tactics.js` `regenEggs`/`regenStamina`, `src/hooks/useTacticTicks.js`): same fix pattern — both now take `elapsedMs`, defaulting to their normal tick period so existing call sites are unaffected, and the hook does the same elapsed-tracking + `visibilitychange` catch-up.
- **Marches** (`shared/utils/marchMotion.js` new `advanceMarch`, used by `src/workers/gameLoop.worker.js`'s `tickMarch`) and **reinforcement convoys** (`shared/utils/reinforcements.js` `stepReinforcement`): both only advanced one step per timer/worker firing regardless of how much real time had passed, so a march due to arrive during a long background pause just sat there until enough *live* ticks accumulated after resume — delaying arrival by the whole paused duration. Both now loop internally and fast-forward through every step the elapsed time actually covers, so a commander or reinforcement convoy arrives on schedule (by wall-clock time) even after a long pause.

New tests: `tests/backgroundCatchup.test.js` (7 tests) covering elapsed-based resource income, egg/stamina catch-up, and multi-step march/reinforcement catch-up. Full suite: 164 passing, 0 failing. Verified live via the cloud-browser Playwright smoke test (world gen → 35s of play, no runtime errors).

Known non-issue: building upgrade/fort timer intervals themselves may still fire late if the tab was fully suspended, but since they compare against absolute `endsAt`/`completesAt` timestamps they resolve correctly the next time they do fire — no separate catch-up logic was needed there.

Not done (out of scope per owner): a full offline/save-and-resume system, and multi-step catch-up for AI crew ticks (`useAiCrews.js`) — AI-side pacing isn't player-visible in the same way.

---

## 2026-09-20 — Claude (Opus)

### Game.jsx split complete (steps 1–10) + army Confirm and reinforcement fixes
Owner-approved plan: split `src/Game.jsx` one system at a time. Pure rules go to `shared/utils/` (for the future server) and React wiring goes to `src/hooks/`. After the split comes timer catch-up after phone lock/backgrounding (no save system yet). The split keeps behavior the same except for the fixes listed below. `Game.jsx` went from 3,228 to 1,432 lines; it now holds state, derived values, remaining actions (march/recall/forts/tile click) and screen routing. State (`useState`) stays in `Game.jsx` for now; hooks receive state and setters as arguments.

| Step | Rules (pure) | Hook | Exposed to Game.jsx |
|---|---|---|---|
| 1 Troop slots | `shared/utils/troopSlots.js` | `src/hooks/useTroopSlots.js` | `setTroopSlot`, `setArmySlots` (new), `assignTroops`, `returnTroops` |
| 2 HQ relocation | `shared/utils/relocation.js` (`checkPlannedRelocation`, `hqMovePatches`, `allHqKeyList`) | `src/hooks/useRelocation.js` | `performRelocation`, `onForcedRelocate` |
| 3 Consumables | `shared/utils/consumables.js` | `src/hooks/useConsumables.js` | `useConsumable`, `onExpedience` |
| 4 Tile timers | `shared/utils/tileTimers.js` | `src/hooks/useTileTimers.js` | `registerProtection` |
| 5 Egg/stamina/gather/training ticks | `shared/utils/tactics.js` | `src/hooks/useTacticTicks.js` | — (effects only) |
| 6 AI crews | `shared/utils/aiCrews.js` | `src/hooks/useAiCrews.js` | — (effect only) |
| 7 Reinforcements | `shared/utils/reinforcements.js` | `src/hooks/useReinforcements.js` | `startReinforcement` |
| 8 Tactics | `shared/utils/tactics.js` | `src/hooks/useTactics.js` | `onQuickGather`, `onRecon`, `onGather`, `onSweep`, `onLongMarch`, `onQuickMarch` |
| 9 World generation | `shared/utils/worldTiles.js` (`createTileMap` Proxy tile map, `stampPlayerHq`, `aiHqKeysByFaction`, `initialAiCommanders`, `crewFounders`, `primaryAiFaction`, `spawnEligibleKeys`) | `src/hooks/useMapInit.js` (mapGen worker, world reset, `mapReady`) | — (effects only) |
| 10 Game screen layout | — | `src/GameView.jsx` (all in-game JSX; receives ~220 props from `Game.jsx`) | `<GameView {...} />` |

`shared/utils/resourceIncome.js` now exports `TILE_RATE_BY_PL`, which replaces two copies that were in `Game.jsx`. The on-screen perf logger (`perfLog`, `PerfOverlay`) moved to `src/utils/perfLog.jsx`.

**Adding something to the game screen:** declare it in `Game.jsx`, add it to the `<GameView {...{ }} />` list at the bottom, and to the destructure at the top of `GameView.jsx`. A missing prop is not a build error; it fails at runtime. Check with a script that lists unbound identifiers, such as `@babel/traverse` scope bindings.

**Fixes (behavior changes):**
- **Army Confirm:** `HQMenu.jsx` `ManageShipScreen` now calls `setArmySlots(uid, slots)` once. It returns the commander's current troops, then draws each slot in order, limited by the pool and the command cap. Previously it called `setTroopSlot` three times with a stale pool, so clearing slot 1 shifted the other slots and could draw or return the wrong troops. `setTroopSlot` is kept for single-slot edits in TilePopup.
- **Tile abandonment:** now takes the 5 minutes the locked owner decision requires. The code used 15 s while the popup counted down from 5:00.
- **AI crews:** several AIs joining the same crew in one tick all stay. Previously each joiner overwrote the last, so crews grew by only 1 per tick, and every tick re-rendered even when nothing changed.
- **Reinforcements:** returning troops now go to the current HQ. The HQ key was fixed when the effect started, so it pointed at the old HQ after a relocation.
- **Stamina regen:** now uses the current max. It had used the max from when the game started, missing tome upgrades.
- **Sweep battle log:** now shows the resource rewards that were actually credited. They were rolled a second time just for the log.
- **Reinforcement sizes:** arriving troops now go into the slot of their own type (or a free slot) and use their real command size (small 0.01 / medium 0.02 / large 0.25). Previously all troops counted as small and were spread across every slot, including slots of other types. The reinforce panel's max also uses the real size and only that troop type's barracks count (it used the all-types total), and a march never takes more troops than that type has. Rules: `reinforcementRoom`, `mergeReinforcement`, `commandUsed` in `shared/utils/reinforcements.js`; UI in `BottomPanel.jsx`.
- `BottomPanel.jsx` troop label showed a literal "2014" where an em dash was intended.

**Found, not changed:**
- `TilePopup.jsx` has its own copy of the training XP table (`POWER_COMMAND`).
- Resource boosts are only rechecked when `Game.jsx` re-renders. The timer pass will handle this.
- Side effects (floaty, `setDragonEggs`, `setTroopCounts`) still run inside some `setState` updaters. This is harmless without StrictMode; a server port should compute results first.

**Tests:** `tests/troopSlots.test.js` (12), `tests/splitRules.test.js` (23), `tests/worldTiles.test.js` (4). All 157 tests pass and the build passes. The reinforce panel was also rendered server-side: with 100 Gunners and a cap of 5 it shows Max 150 and "Barracks 1,000" (the Gunner count).

**Browser checks:** the cloud browser runs the full game with Chromium flags `--use-gl=swiftshader --enable-unsafe-swiftshader`. Each batch gets the same smoke test: start a game, wait past the 30 s tickers, open every menu, then pan. There were no page errors; the only console errors are the expected offline WebSocket ones. AI crews filled to 40/40 plus 9 after one tick. Army edit, end to end: assigned 200 Deckhands, then Confirm; barracks went from 2,000 to 1,800; a second Confirm without changes left it at 1,800.

---

## 2026-09-20 — Codex

### Fynn and Brine world-map sprites
- Added transparent 6-column / 4-direction sprite atlases for Redwake Fynn (h1) and Admiral Brine (h13), matching existing portraits. Standing frame plus five walking frames per direction; other commanders retain their portraits outdoors.
- `commanderMapSprites.js` handles atlas frames, facing, and HQ visibility; `commanderIcons.js` integrates them with the existing march worker positions. No movement speed or gameplay rules changed.
- All commanders, including AI, are hidden inside HQ centre/footprint tiles. Marchers appear after leaving the footprint and disappear when returning inside. Removed stationary rings left behind by marching groups.
- Generated with built-in image generation. Prompt: gritty realistic dark-fantasy isometric full-body atlas, preserve portrait costume/identity, four facing directions, idle plus five walking poses, transparent background. Assets: `public/commanders/map/h1-walk-v1.png`, `h13-walk-v1.png`.
- Validation: eight focused commander lifecycle/visibility/animation tests pass; production build passes. Phone appearance still needs owner review.

---

## 2026-09-20 — Codex

### Dotted march routes, joined HQ borders and protection glow
- Replaced solid march paths with terrain-readable dotted paths, repeated directional arrows and the existing target endpoint. Player routes remain green; reinforcement routes remain blue.
- HQ ownership borders now check all 12 outer 3x3 edge segments. A segment disappears when it touches territory belonging to the same player, matching normal connected-tile borders.
- HQ borders refresh immediately when nearby tile ownership changes.
- Moved the protection shield to the tile center and added a soft blue fill/outline glow to the protected tile.
- No pathfinding, march timing, protection duration, ownership, capture or attack rules changed.
- Validation: 114 automated tests pass and the production build succeeds.

---

## 2026-09-20 — Codex

### HQ centering v3 and centered neighboring props
- Moved the approved Pirate HQ halfway back from the over-corrected south position, using the midpoint between the two phone-tested placements.
- Removed the rejected outward prop shift. Every resource prop is centered on its own tile again, preventing adjacent clusters from being pushed together.
- The HQ now repaints only its occupied 3x3 ground footprint above the prop layer. This hides only prop pixels that intrude beneath the physical base; no resource tile, prop, ring or surrounding land is removed.
- The selected tile still omits only the edge shared directly with the HQ border.
- Validation: 113 tests and production build pass. Phone screenshot confirmation remains required.

---

## 2026-09-20 — Codex

### Consolidated audit and cross-AI roadmap
- Added the current architecture, completed/partial/missing systems, technical debt, launch blockers, dependencies, implementation order and pre-multiplayer requirements above the historical log.
- Marked verified finished systems **COMPLETE — DO NOT RECHECK** to prevent repeated audits and wasted usage unless a regression is reported or related code changes.
- Added the approved graphics backlog: seven faction bases, full-map props/tiles, gate tuning, dotted arrow march paths, commander map sprites, remaining mob sprites and keep sprites.

---

## 2026-09-20 — Codex

### HQ centering and neighboring-tile presentation
- User approved and installed the revised Pirate HQ artwork: darker natural stone, weathered timber, desaturated roofs, softer light, dimmer windows and reduced cartoon-style outlines.
- Corrected the approved Pirate HQ's ground anchor: its visible base now reaches the true south point of the 3x3 HQ footprint instead of sitting almost one tile too high.
- Resource props on tiles immediately beside an HQ remain visible and keep their gameplay tile, but their artwork shifts slightly outward to prevent tall clusters crossing the base wall.
- A selected tile beside an HQ keeps its full-size outline but omits only the edge shared with the HQ border. Other edges remain unchanged.
- No resources, tile positions, relocation rules, ownership, rates or hit areas changed.

---

## 2026-09-20 — Codex

### Approved Pirate HQ art and removal of the rejected clearance ring
- Restored every resource prop outside the actual HQ footprint; removed the one-tile hiding rule and its obsolete test.
- Restored full tile selection diamonds beside HQs. Existing ground-selection layering remains below props and buildings.
- The previous ring only hid artwork: it never removed resources or changed relocation rules. This change restores their visibility without changing gameplay.
- User approved the new Pirate HQ design. Added transparent `public/hq/hq_pirates_dark_v2.webp`; it renders for Pirate HQs in the existing spawn visual-test area, with natural proportions and a grounded anchor. Original art remains available outside the test area.
- Other seven factions still use their original artwork; new faction designs need user approval.
- Validation: 112 tests and production build pass. Phone visual confirmation is still needed; the cloud browser cannot initialize the map renderer.
- Existing thin ownership borders and resource power/size variations remain.

---

## 2026-09-20 — Codex

### Hotfix: restore HQ sprites and protect the base boundary
- Removed the HQ pixel filter introduced in the previous graphics pass. On the phone it rendered the faction base invisible and exposed a black commander marker beneath it.
- Kept the approved thin, muted ownership border and subtle contact shading. Original faction HQ sprites render directly again.
- Added a one-tile clear ring outside every 3×3 HQ footprint inside the graphics test: resource props in that ring are hidden so tall art cannot cross the base boundary.
- Selection outlines for tiles in the clear ring shrink inward so they do not touch or cross the HQ outline.
- No tiles, resources, rates, ownership or selection behavior changed; this is rendering only.
- Validation: 113 tests and production build pass.

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
