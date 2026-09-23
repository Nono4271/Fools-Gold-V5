# ReadMeAI — Change Log for AI Collaborators

This file is for other AI tools (GPT, Astra, etc.) working on this repo.
It's updated with every change so you can follow what's been done and why,
without needing to re-diff the whole codebase.

Branch: codex/core-fixes-20260919

---

## 2026-09-20 — Claude (Sonnet 5) — Chat: DM/group picker's Cancel/Start buttons were unreachable

Owner feedback: could select players for a DM or group but had no way to confirm — the buttons were there in the code (`confirmPicker`, wired since the picker was first built) but lived inside the SAME scrollable div as the player-row checkboxes, at the bottom. Combined with the touch-scroll bug fixed directly below (this picker div had neither `.scr` nor `.chat-scroll` originally), a long player list or a short viewport made them functionally unreachable.

**Fix**, `src/components/game/ChatPanel.jsx`: split the picker view the same way the message view already splits messages from the compose bar — the header/input/player-rows stay in the scrollable `.scr.chat-scroll` region, and Cancel/Start now sit in their own `flexShrink: 0` footer row below it, always visible regardless of list length or scroll position.

**Tests:** none (pure layout). Suite: 275 pass, 0 fail. `npm run build` clean.

---

## 2026-09-20 — Claude (Sonnet 5) — Chat history still wasn't touch-scrollable (root cause: a global gesture blocker, not CSS)

Follow-up to the entry directly below — the previous flex `min-height` fix was correct (verified: the message list's `scrollHeight` genuinely exceeds its `clientHeight`, and programmatic scroll — the new auto-scroll effect — moved it fine) but the owner still couldn't manually scroll to read history. Root cause was one level up: `src/main.tsx` has a document-level `touchstart` listener (added for iOS pull-to-refresh/swipe-back blocking) that calls `preventDefault()` on any touch that isn't on an interactive element (`button`/`input`/etc.) or inside a specific class allowlist (`.roster-scroll`, `.battle-popup`, `.gear-picker-list`, `.find-tiles-popup`). `ChatPanel`'s scrollable `<div>`s weren't on that list, so touch-drag scrolling was blocked at the document level before it ever reached the panel — invisible to any CSS inspection, and irrelevant to a mouse wheel/programmatic test, which is why it looked fixed from the "auto-scroll now works" checkpoint.

**Fix:** added `"chat-scroll"` to `src/main.tsx`'s allowlist (`e.target.closest(".chat-scroll")`) and tagged all three of `ChatPanel.jsx`'s scrollable regions — the channel list, the message list, and the DM/group picker list — with `className="scr chat-scroll"` (also added the missing `minHeight: 0` to the picker list, same flex-clipping fix as the other two got last time). Left a comment in `ChatPanel.jsx` explaining both classes are required on any new scrollable region added there. `CrewPanel.jsx` and other panels using bare `.scr` without a matching allowlist entry likely have this exact same latent bug on touch devices — out of scope here (untouched, not part of the chat brief), but worth flagging for a follow-up pass.

**Tests:** no new tests (this is a global touch-gesture/event-handling behavior, outside the pure-function test suite's reach — would need an actual touch-device or Playwright-with-real-touch-input check, not `node:test`). Suite: 275 pass, 0 fail. `npm run build` clean.

---

## 2026-09-20 — Claude (Sonnet 5) — Chat: auto-scroll, scrollable history, un-censorable profanity toggle

Owner feedback after trying the wired-up chat panel (screenshot showed the message list not scrolling to new messages).

1. **Auto-scroll + scrollable history**, `src/components/game/ChatPanel.jsx`: the message list is a flex child of a flex column that never got `minHeight: 0`, so it grew to fit all its content instead of clipping to the panel and scrolling — a classic flexbox gotcha (a flex item's default `min-height: auto` lets it overflow its container instead of shrinking). Added `minHeight: 0` to the message-view column, the message list itself, and the channel-list column for the same reason. A new effect scrolls the message list (`msgListRef.current.scrollTop = scrollHeight`) to the bottom whenever the active channel's message count changes or the channel switches.
2. **Profanity toggle now affects history, not just new messages.** Previously `useChat.js` censored text once at send/generate time and stored only the censored string, so toggling the filter off did nothing for anything already in the list. Messages are now always stored with their raw text; `censorText()` (`shared/utils/profanity.js`) is applied at render time in `ChatPanel.jsx` based on the current `profanityFilterEnabled` state, so flipping the 🛡 toggle re-masks or reveals every message in the channel immediately, past and future alike.

No shared/rules changes — `shared/utils/chatRules.js`, `aiChatter.js`, `profanity.js` untouched; this was all in the two wiring files (`useChat.js`, `ChatPanel.jsx`).

**Tests:** no new tests (UI/display-timing behavior, not covered by the existing pure-function suite). Suite: 275 pass, 0 fail. `npm run build` clean.

---

## 2026-09-20 — Claude (Sonnet 5) — Chat wired into the game + profanity filter

Follow-up to the chat system entry directly below. Two owner-requested changes:

**1. Wired up.** `ChatPanel` is now live:
- `src/Game.jsx`: `chatOpen` state next to `crewOpen`; calls `useChat({screen, playerId:"player", playerName: facName, playerFacKey: facKey, crews, aiPlayerIds: chatKnownPlayerIds})` right after the `useAiCrews` ticker. `chatKnownPlayerIds` is `[...aiPlayerIdMapRef.current.values()]`, memoized on `mapReady` (that map is filled once at map init and never changes after — same assumption `useAiCrews`/`crewmatePlayerIds` already make about it).
- **Crew-membership quirk found while wiring this up:** `GameView.jsx`'s crew create/join/leave handlers store the local player's own membership as their **faction key** (e.g. `"pirates"`), not a player id — only AI members (`shared/utils/aiCrews.js`) use the full `ai_<faction>_<i>` id. `chatRules.js` assumes `crew.members` holds real player ids, so `src/hooks/useChat.js` now has a `normalizeCrewsForPlayer` step that swaps a bare-faction-key entry for the real `playerId` before handing crews to `canPost`/`resolveChannelsFor`/AI chatter. Nothing in `aiCrews.js` or the crew-formation flow itself was touched, per the original brief — this is purely a read-side adapter in the chat wiring.
- `src/GameView.jsx`: imports and renders `<ChatPanel>` the same way `<CrewPanel>` is rendered (open/close state, same `crews`/`facName` props already in scope); passes `chatOpen`/`setChatOpen` down to `GameBar`.
- `src/components/game/GameBar.jsx`: new "💬 Chat" `ActionButton`, leftmost in the bottom-right icon row (i.e. the one closest to the Wizard's Tomes circle at bottom-left) — same green/blue active-state coloring pattern as the Crew button.

**2. Profanity filter**, since the owner wants it now so it "just carries over" once the server exists:
- `shared/utils/profanity.js` (new, pure): `censorText(text, wordList = DEFAULT_PROFANITY_WORDS)` — whole-word, case-insensitive masking (`"shit"` → `"s***"`). No dependencies, so the exact same function can run server-side unchanged later.
- `src/hooks/useChat.js`: `profanityFilterEnabled` (default **on**) + `setProfanityFilterEnabled`, applied to the local player's outgoing text in `sendMessage` and to generated AI chatter lines before they're appended (defense in depth — the chatter pool is already clean, but it runs through the same filter for consistency).
- `src/components/game/ChatPanel.jsx`: 🛡 toggle button in the header (green when on).
- Client-side only today, same as the rest of chat — no server to enforce it yet.

**Tests:** `tests/profanity.test.js` (4) — masking, whole-word boundary (`"class"` isn't touched by an `"ass"` filter word), empty input/word-list. Suite: 275 pass, 0 fail. `npm run build` clean (576 modules now, was 570 — confirms the new files are actually pulled into the bundle this time).

---

## 2026-09-20 — Claude (Sonnet 5) — Chat system: World / Faction / Crew / DM / Group (new)

New feature, built against today's reality: there is no real multiplayer server yet (that's the last roadmap item, "a ways away"). The only real player is the local user (id `"player"`); everyone else is a simulated AI (`ai_<faction>_<i>`, `shared/utils/worldTiles.js` `aiPlayerId`) with simulated crews (`shared/utils/aiCrews.js`). So the design is rules-in-`shared/`, wiring-in-`src/`, same split the rest of the codebase uses — a real server can adopt the exact same channel/message/permission functions later with zero rewrite.

**`shared/constants/chat.js`** — channel types (`world`/`faction`/`crew`/`dm`/`group`), message shape (`{id, channelId, senderId, senderName, text, ts}`), `MESSAGE_MAX_LEN` (280) and `POST_COOLDOWN_MS` (unused today, left for a server to enforce).

**`shared/utils/chatRules.js`** — pure, framework-free:
- `aiFactionOf(playerId)` reads the faction straight off an AI id (`"ai_ashen_dead_0"` → `"ashen_dead"`; faction keys with an underscore are handled). `factionOf(playerId, ctx)` adds `ctx.factions` (a `{playerId: facKey}` map) for the real player, who has no such id.
- `canPost(playerId, channel, ctx)`: world = anyone; faction = `factionOf(playerId) === channel.faction`; crew = `crew.members.includes(playerId)` (crew looked up from `ctx.crews` by `channel.crewId`); dm/group = `channel.participants.includes(playerId)`. Unknown channel types always reject.
- `createMessage`, `createDmChannel` (deterministic id from the sorted pair, so the same two players always land in the same DM), `createGroupChannel`.
- `resolveChannelsFor(playerId, {crews, factions, dms, groups})` — every channel a player currently sees: world, their faction (if resolvable), every crew they're in, every DM/group they participate in.

**`shared/utils/aiChatter.js`** — deterministic, seedable flavor-message generator for AI players so World/Faction/Crew don't sit empty. Templated text (6ish lines per faction, faction-flavored; a small set of crew-banter templates), picked with the same seeded LCG already used in `src/workers/spawn.worker.js` (`seededRng`/`hashStr`, duplicated here rather than imported from a worker). NOT a live LLM call — cheap and testable. `eligibleAiSenders(channel, ctx)` picks which AI ids may speak in a channel (all AI for world, same-faction AI for faction, crew members for crew); `generateAiChatter` picks a sender + line and returns a message via `createMessage`, or `null` when nobody's eligible (e.g. an empty crew). `aiDisplayName("ai_pirates_3")` → `"Raider 3"` for UI display (this codebase has no AI display-name scheme yet; crew UI just shows the raw id today).

**`src/hooks/useChat.js`** — wires the above into local React state (`messages`, `dms`, `groups`). **LOCAL PERSISTENCE ONLY, and in fact no persistence at all right now**: state lives in memory for the tab's lifetime and does not survive a reload. This was a deliberate choice, not an oversight — the rest of `src/hooks/` has *no* save/load pattern to match yet (confirmed: zero `localStorage`/`indexedDB` usage anywhere in the repo; ReadMeAI itself already notes "there is no save system yet" for forts). **TODO before/during the multiplayer transition: give chat real persistence** (and, once the server exists, move message storage server-side). A `setInterval` (45s, gated on `screen === "game"`, same gating pattern as `useFortRemovals`) generates AI flavor chatter into World/Faction/Crew.

**`src/components/game/ChatPanel.jsx`** — tabs for World/Faction/Crew/DMs/Groups, a channel list + message view + compose box, inline "start a DM" (pick one known player) and "start a group" (pick 2+) pickers. Styled to match the existing dark-fantasy panel look (`CrewPanel.jsx` conventions: fixed slide-in panel, gold/`Cinzel` text, tab bar). **Not yet wired into `Game.jsx`** — nothing in Game.jsx imports or renders it, and no button opens it; that wiring (plus supplying real `crews`/`aiPlayerIds`/`playerFacKey` props) is left for the owner or a follow-up pass.

Explicitly out of scope (per the brief): no real backend/socket/server integration, no moderation/profanity filtering, `aiCrews.js`'s crew-formation logic untouched (only crew membership is read).

**Tests:** `tests/chatRules.test.js` (14) — channel-permission checks for all 5 types incl. a rejected case for each (wrong faction, not in the crew, not a dm/group participant, unknown channel type), DM/group channel creation (dedupe, deterministic DM id, default group name), and `resolveChannelsFor` for both the real player and an AI id. Suite: 271 pass, 0 fail (ran with a real `npm install` this time — no `esbuild`/`pixi.js` fails). `npm run build` clean.

---

## 2026-09-20 — Claude (Sonnet 5) — Camps now spread across each region instead of clustering at its keep

**Problem (from an on-device screenshot):** every camp of a region used the region-centre as its `findCampSlot` anchor, so all 30-50 camps packed into the nearest free tiles around the keep. Measured on a generated map: median distance from the keep 4 tiles, max ~6, mean nearest-neighbour distance ~1 tile.

**Fix:** `shared/utils/campPlacement.js` gets two pure, deterministic helpers: `regionCandidates` (grid of usable points inside a region, 4-tile step, kept 10 tiles off the region border, skipping blocked terrain/structures) and `spreadPoints` (farthest-point sampling: each pick is as far as possible from earlier picks and from the keep). `mapGen.worker.js` groups the plan by region (neutral + Ancient camps of the same region together, e.g. Finalhope = 50), picks one spread anchor per camp, and searches from that anchor with a small radius (12); if that fails it falls back to the old region-centre search (radius 80), so no camp is skipped. Still all 2150 camps placed. After: median distance from keep ~77 tiles, mean nearest-neighbour ~30 tiles (regions are ~205x145 tiles).

**Tests:** `tests/campPlacement.test.js` +3 (spreadPoints separation/avoid/determinism, too-few-candidates, regionCandidates border margin and blocked tiles); the end-to-end test in `tests/campSearch.test.js` now asserts per-region median distance from keep > 30 and mean nearest-neighbour > 12. Suite: 248 pass; same 3 `esbuild`/`pixi.js` missing-package fails. Not looked at on device.

---

## 2026-09-20 — Claude (Sonnet 5) — Camps: map icon, 2 waves, popup name; double-tap closes popup

Owner feedback after the first on-device look at camps (tile popup showed the region name "Salthaven", 1/1 waves, no icon, no way to close the popup).

1. **Camp icon on the map.** `src/MapRenderer.jsx`: new `drawCampMarker` (tent on a ring with a pennant) drawn into a new `campGfx` layer inside `doProps`, so it redraws with props and only at zoom >= 0.5 (same gate as props). Pennant/ring colour = tier by power level (P7 green, P9 gold, P11 orange, P13/Ancient purple); green once the player owns it. Icon size scales with footprint (1x1/1x2/2x2) and is centred on the footprint. To avoid scanning every visible tile, `createTileMap` (`shared/utils/worldTiles.js`) now attaches a non-enumerable `__camps` list (`{key,c,r,w,h}`) to the tile store; `Object.keys(store)` is unchanged. `mapGen.worker.js` `campMeta` now carries `campW`/`campH`; tiles expose `campW`/`campH`. Art is vector placeholder (no sprite asset); swap `drawCampMarker` when real camp art exists.
2. **Every camp has 2 waves.** `neutralCamps.js`: `CAMP_GARRISON_WAVES = 2`, set as `template.garrisonWaves` (flows through `campMeta` -> `tile.garrisonWaves`; popup wave bar, `garrisonWaveCount`, and the multi-wave battle loop in `useMarch.js` already key off that). Power level, level and troop budget are unchanged. `garrisonWaveDefCmd` (`shared/utils/garrisonUtils.js`) now gives camp waves the SAME level and the SAME troop layout/count as wave 0 (same faction, same seed); only the commander differs (picked from wave 0's faction). Other tiles' per-wave variety is untouched. The duplicate `garrisonWaveDefCmd` in `battle.js` is not imported anywhere and was left as is.
3. **Popup shows the camp name.** `TilePopup.jsx` title now `🏕 {campName}` for `isCamp` tiles (was falling through to `regionName`); same branch added to `TileInfoPanel.jsx`. Clicking any tile of a 2x2/1x2 camp now redirects to the camp's primary tile (`Game.jsx` `onTileClick`: `isKeepPart || isCampPart`).
4. **Double-tap closes the popup.** `Game.jsx` `onTileClick`: a second tap on the already-selected tile within 400 ms (and >= 60 ms, since the renderer can report one physical tap through two hit targets) closes the popup, in normal view mode only (not while picking a march destination). Rule in `shared/utils/doubleTap.js`.

**Tests:** `tests/doubleTap.test.js` (3); `tests/neutralCamps.test.js` +1 (all templates 2 waves); `tests/campSearch.test.js` end-to-end test extended (camp name, 2 waves, `campW/H`, `__camps` count and non-enumerable, wave 0 vs wave 1 same level/troops/layout on ~60 real generated camps). Suite: 245 pass; the 3 fails are still the `esbuild`/`pixi.js` missing-package tests. **Not verified visually** (no Pixi/renderer or `npm run build` in the sandbox): the icon drawing, its placement/size, and the double-tap feel need an on-device look.

---

## 2026-09-20 — Claude (Sonnet 5) — Bug fix: camps were never placed on the map (Camps search showed "none in range")

**Root cause (not a search bug):** the plan entries from `planAllCamps` (`shared/utils/neutralCamps.js`) had no `cx`/`cy`, but the camp pass in `mapGen.worker.js` reads `entry.cx`/`entry.cy` as the `findCampSlot` anchor. With `undefined` anchors `findCampSlot` returned `{c: undefined, r: undefined}` (every bounds/blocked check passes on NaN), so writes went to NaN typed-array indexes (silent no-ops) and `campMeta` got a single junk `"undefined,undefined"` entry. Result: 0 camp tiles on the map. Reproduced by running the real generator in Node before the fix.

**Fix:** `planCampsForBand` and `planAncientZoneCamps` now add `cx: region.cx, cy: region.cy` to every entry (the region-center anchor mapGen searches outward from). After the fix, all 2150 planned camps place (0 skipped; 126 P7, 978 P9, 966 P11, 80 P13 primaries), every `campMeta` key is a real `"c,r"`, and Find Camps returns results from the real lazy tile map (incl. the 4 Ancient zones).

**Tests:** `tests/neutralCamps.test.js` +1 (every plan entry has an in-bounds integer anchor); `tests/campSearch.test.js` +1 end-to-end (runs the real `mapGen.worker.js` in-process, decodes with `decodeBuffers`/`createTileMap`, asserts placed count == planned count, real coordinate keys, and that `findCamps` finds camps incl. Ancients). Suite: 241 pass; 3 fail = `esbuild`/`pixi.js` missing-package tests (no `node_modules` in sandbox).

**Note:** the earlier "part 2/3" entries below say camps were wired into the live map, but the anchors were missing in the copy of `neutralCamps.js` this repo has, so that never actually worked until now. Not verified visually (no renderer here); camp art/rendering is still the open item noted in part 3.

---

## 2026-09-20 — Claude (Sonnet 5) — Fort removal survives closing the popup + "Camps" tab in Search

**1. Fort demolish/abandon timer now survives the popup.** Follow-up to the entry below: the countdown was accurate but still lived in `FortPanel` state, so closing the popup cancelled the demolition. Now the deadline is stored on the fort: `fort.removal = { mode, endsAt }`.
- `shared/utils/fortRemoval.js` (new, pure): `FORT_REMOVAL_MS` (30 min demolish / 45 min abandon), `withFortRemoval` (won't reset a running timer), `withoutFortRemoval`, `dueFortRemovals(forts, now)`.
- `src/hooks/useForts.js`: new `startFortRemoval(fortId, mode)` / `cancelFortRemoval(fortId)` (both `emitFortUpdate` with actions `removal` / `removalCancel`; the server side of `FORT_UPDATE` was not checked, it may ignore these).
- `src/hooks/useFortRemovals.js` (new, called in `Game.jsx` right after `abandonFort`): 1 s interval + `visibilitychange`, calls `demolishFort`/`abandonFort` once when a deadline passes, whether or not the panel is open.
- `FortPanel.jsx` now only displays the countdown from `fort.removal` and calls start/cancel. Its `demolishFort`/`abandonFort` props are replaced by `startFortRemoval`/`cancelFortRemoval` (wired through `Game.jsx` → `GameView.jsx` → `TilePopup.jsx`).
- Not persisted across a page reload (forts are in-memory state; there is no save system yet).

**2. Search panel: new 🏕 CAMPS tab** (`src/components/game/GameBar.jsx` `TileSearch`). Pick T1/T2/T3/Ancient camps, "Find Camps" lists up to 20 within the same 100-tile radius as the other tabs, nearest first, showing camp name (e.g. "Wolf Rider Camp"), tier and coordinates; tapping jumps the map there. Pure search rules are in `shared/utils/campSearch.js` (`findCamps`, `CAMP_TIERS`); it matches `tile.isCamp` (primary tile only, so a 2x2 camp is one result) and maps tier by power level (P7/P9/P11/P13). The TILES tab now skips camp tiles (`isCamp`/`isCampPart`) so a P13 search doesn't list Ancient camps as plain tiles.

**Tests:** `tests/fortRemoval.test.js` (4) and `tests/campSearch.test.js` (4). Suite: 239 pass; the 3 fails are the `esbuild`/`pixi.js` missing-package tests (sandbox has no `node_modules`). `npm run build` not run here; import resolution (302+ relative imports) and syntax/undefined-identifier checks pass.

---

## 2026-09-20 — Claude (Sonnet 5) — Offline catch-up: leftover Tomes + Fort countdown

Follow-up to "Background/offline timer catch-up (roadmap item 4)" below. Same bug class (fixed amount per interval firing, so backgrounded time is lost); two more places had it. Copied the existing fix pattern exactly, no new pattern.

**Fixed:**
- **Wizard's Tomes power pool** (`src/hooks/useTomes.js`): did `setPowerPool(prev => prev + pph/360)` per 10 s firing. Math moved to new `shared/utils/tomes.js` `tomesPowerTick(currentPool, powerPerHr, elapsedMs = TOMES_TICK_MS)` (returns the same value when nothing is owed). The hook tracks the last real tick time, passes actual elapsed ms, and runs one catch-up tick on `visibilitychange` when the tab is visible — same as `useResources.js` / `useTacticTicks.js`. The default elapsed is the normal 10 s tick, so any caller not passing it gets the old `pph/360`. Catch-up uses the current `powerPerHrRef` (same approximation the resource/egg fixes make).
- **Fort demolish/abandon countdown** (`src/components/game/popup/FortPanel.jsx`): the 30/45 min countdown did `setCountdown(prev => prev - 1)` per 1 s firing and called `demolishFort`/`abandonFort` from inside the state updater when it hit 0, so a backgrounded tab stalled the countdown (and the demolition). Now stores an absolute deadline, displays `secsUntil(deadline, now)` (new helper in `shared/utils/tileTimers.js`), re-checks on `visibilitychange`, fires the action once (guarded), and no longer runs side effects inside a state updater.

**Audited every `setInterval` in `src/hooks/`, `src/components/`, `src/workers/` — confirmed correct, no change:**
- Already-cleared list (not re-flagged): `useForts.js` (both), `useTraining.js`, `useTileTimers.js` (both), `gameLoop.worker.js` `tickSiegeReset`.
- Absolute timestamps / real `Date.now()`: `useUpgrades.js` (`endsAt`), `useReinforcements.js` (`stepReinforcement` catches up multiple steps), `useMarch.js` draw-rematch timer (`drawTimer` deadline), `gameLoop.worker.js` `tickMarch` (`advanceMarch`) and `tickDraw` (`drawTimer`), `spawn.worker.js` `tick` (`respawnAt`), `TilePopup.jsx` protection countdown (`protectedUntil`), `useResources.js`, `useTacticTicks.js` (egg/stamina fixed; gather/training use `gatherStartMs`/`trainingStartMs`).
- Display-only clocks that just re-read `Date.now()` (nothing accumulates): `HQMenu.jsx` (both `setNow`), `WorldMap.jsx` (100 ms viewport-centre poll), `useGameLoop.js` `sendSnapshot`, `Game.jsx` spawn-worker `tick` message (worker compares `respawnAt`), `march.worker.js` frame loop (`positionAlongRoute` from `startTime`).
- Out of scope, untouched: `useAiCrews.js` and the AI-side ticks (`useAI` `tickAiRss`/`tickAiEcon`, worker `aiRss`/`aiMarch`/`aiEcon`) — AI-side pacing, per the locked decision.
- Dead code noted, not changed: `gameLoop.worker.js` `tickRein` steps one convoy step per firing, but `Game.jsx` passes no `onReinStep`, so its `reinStep` messages are ignored; real convoy movement is `useReinforcements.js`. If `onReinStep` is ever wired up, switch `tickRein` to `stepReinforcement` first.

**Tests:** `tests/backgroundCatchup.test.js` +4 (Tomes default tick, Tomes catch-up, Tomes no-income/no-elapsed, fort countdown deadline). Written in a sandbox with no `node_modules` and no network, so `npm run build` could not run and `armyMenus`, `commanderIcons` and `resourceSprites` (missing `esbuild`/`pixi.js`) fail on import — they fail identically on the untouched zip. Everything else passes (219/222 incl. new tests). Touched files were syntax-checked with TypeScript's parser. Re-run `npm install && npm test && npm run build` locally to confirm.

---

## 2026-09-20 — Claude (Sonnet) — Camp placement now avoids water/roads/keeps/HQs (part 3)

Follow-up correction to part 2 directly below. That first wiring pass only
avoided keep footprints and border/crossing tiles — it ran BEFORE roads,
HQs and P10-P13 special tiles were placed, so nothing stopped a camp from
landing on water, a road, or getting overwritten later by an HQ. Owner
caught this; fixed properly rather than patched around.

**`src/workers/mapGen.worker.js`:**
- Moved the entire camp-placement pass from right after the keep loop to
  the very end of generation — after starter-keep ownership, the
  anti-lockout pass, road generation, HQ placement, AND P10-P13 special-tile
  placement are all finished. Camps are a tiny slice of a ~2.4M-tile map, so
  searching for free spots this late is cheap and means the grid it's
  searching is the FINAL one, not a half-built one.
- Added an `isCampBlocked(c, r)` check (on top of the existing
  keep-footprint/impassable-tile Set) that now also rejects: any
  `F_KEEP|F_KEEPPART|F_HQ|F_HQPART|F_GATE|F_BORDER`-flagged tile, any
  `ROAD_TILE_SET` road tile, and water/mountain/road terrain
  (`river`/`rockymountain`/`road`/`hellfire`). Passed into
  `findCampSlot`'s new `isBlocked` param (see below) — a real camp can no
  longer land on water, a road, a keep, or an HQ.
- Mob/monster spawns were already covered from the other direction (see
  part 2's `spawnEligibleKeys` change) — this repo generates no mob tiles
  inside `mapGen.worker.js` itself, so there was nothing else to check
  there.

**`shared/utils/campPlacement.js`:** `footprintFits`/`findCampSlot` take an
optional `isBlocked(c, r)` callback now, checked alongside the `occupied`
Set. Kept optional and backward compatible — every existing call site
(tests, and the plain-Set-only usage) is untouched. This is what lets the
worker check terrain/flags directly off its live arrays instead of having
to pre-build a multi-hundred-thousand-entry Set of every water/road tile
up front. Covered by a new test in `tests/campPlacement.test.js` (rejects a
cell the callback flags even when the occupied Set says it's free, then
finds a real free slot around it).

**Verified:** full suite green — 240/240 tests, `npm run build` clean.

**Not done (flagged, not silently added):** no visual/phone playtest yet —
this is a logic-level guarantee (grid data says no overlap), not a
confirmation that camps look right on screen. Still worth an eyeball pass
once camp art exists.

---

## 2026-09-20 — Claude (Sonnet) — Neutral/Ancient camps wired into the live map (part 2)

Follow-up to the camp placement PLAN directly below — this entry wires that
plan into the actual live map generator, so camps are now real, attackable
tiles, not just planning data.

**`src/workers/mapGen.worker.js`:**
- Added `F_CAMP = 1<<9` and `F_CAMPPART = 1<<10` flag bits (bits 0-8 were
  already used; these are the next free ones).
- After the existing keep-placement loop, added a camp-placement pass:
  calls `planAllCamps({campsPerRegion:30, campsPerZone:20})` from
  `shared/utils/neutralCamps.js`, then for each planned camp uses
  `findCampSlot`/`occupyFootprint` (new pure module, see below) to find a
  free w×h footprint near that camp's named region, avoiding existing keep
  footprints (`KEEP_FOOTPRINT_SET`) and other impassable tiles
  (`impassKeys`) plus every camp already placed this pass. Stamps
  terrain/power/garrison/siege/siegeMax/flags on the primary tile (mirrors
  how keeps stamp their primary tile) and `F_CAMPPART` + `keepPrimArr`
  pointer on the rest of the footprint (same generic footprint-part
  mechanism keeps already use — no new pointer array needed). Builds a
  `campMeta[key]` entry (campName/campUnitKey/campFaction/garrisonWaves)
  the same way `keepMeta` already works. If no free slot is found within
  the search radius, that one camp is skipped rather than overlapping
  anything (silent per-camp skip, not a hard failure).
- `F_CAMP`, `F_CAMPPART`, `campMeta` added to the final `postMessage`'s
  `meta` object so the main thread receives them.

**New file `shared/utils/campPlacement.js`:** pure, dependency-free grid
search (`footprintCells`, `footprintFits`, `findCampSlot`, `occupyFootprint`)
extracted so it's unit-testable without any worker/typed-array setup.
Expanding-ring search outward from the camp's anchor region, deterministic
(fixed scan order), returns `null` if nothing fits within `maxRadius` (the
worker skips that camp in that case). Covered by
`tests/campPlacement.test.js` (7 tests: cell coverage, bounds/overlap
rejection, anchor-first placement, outward search when blocked, null on
failure, no-overlap across a 30-camp stress run).

**`shared/utils/worldTiles.js` (`createTileMap`):** decodes the new flags —
`tile.isCamp`, `tile.isCampPart` — and, for a camp's primary tile, pulls
`campName`/`campUnitKey`/`campFaction` from `campMeta` and folds
`garrisonWaves` into the same field keeps already populate
(`km?.garrisonWaves ?? cm?.garrisonWaves ?? 1`). `keepPrimaryKey` resolution
(already shared by keep/HQ parts) now also covers camp parts. Backward
compatible: `campMeta`/`F_CAMP`/`F_CAMPPART` are optional on `meta`, so
older map data / existing tests with no camp fields still decode exactly as
before. Also updated `spawnEligibleKeys` to exclude camp tiles from the
mob-spawn-eligible set (`F_CAMP`/`F_CAMPPART` OR'd into `blocked`, guarded
with `|| 0` so it's a no-op when those flags aren't present) — camps are a
separate PvE structure from the existing spawn/mob system and shouldn't
double up on the same tile.

**No changes needed to combat/capture code.** Confirmed (as previously
found) that the existing generic garrison/siege system in
`garrisonUtils.js` + `useMarch.js` already handles any tile shaped like
one — the camp-aware branches added there last entry are all that was
needed; attacking, sieging, and capturing a camp goes through the exact
same code path as a keep.

**Corrected by part 3 above:** this pass ran before roads/HQs/P10-P13 were
placed and didn't check water/mountain terrain — camp placement was moved
later and made terrain/road/HQ-aware. Left this entry intact for history.

**Not done (flagged, not silently added):**
- Camp art/portraits are still blocked on the same ChatGPT-art item as
  everything else in that queue (roadmap item #1) — camps render with
  whatever generic keep-like placeholder the map view already uses for
  flagged structures, nothing camp-specific yet.
- No renderer/UI work to show a camp's name/unit on the map view itself —
  the data is there (`tile.campName`, `tile.campUnitKey`) but nothing
  currently reads it for display.

---

## 2026-09-20 — Claude (Sonnet) — Neutral/Ancient camp placement plan (map integration, part 1)

Follow-up to the neutral units + Ancients entry directly below. Owner spec
(this session): camps are keep-like structures players attack, sized by
their unit's size (small 1x1 / medium 1x2 / large 2x2), each with 2
defenders whose strength matches a specific power tile (T1~P7, T2~P9,
T3~P11, T4/Ancient~P13), siege HP 100k-500k scaled by tier, named
"{unit label} Camp". Placement: the 15 neutrals' 3 region bands get ~30
camps per named sub-region in that band; the 4 Ancients go one each to
Dawngate/Twilightspire/Lastwatch/Finalhope (the keeps ringing the Holy
Grail), 20 camps per zone.

**Fixed first (`shared/constants/neutralTroops.js`):** the `region` field
on 7 of the 15 units was wrong. It was assigned by flavor before any map
work existed and didn't track real geography — checked against the actual
`REGION_LIST`/`FACTION_REGIONS` in `src/workers/mapGen.worker.js`: all 8
faction home regions sit at the map's north/south edges, NONE in the
middle third (the middle third is contested ground — Holy Grail +
the 4 Ancient gate zones live there, no faction owns it). Corrected split:
north (top third) = the 4 top-cluster renegades (wizard, dragon, coldborn,
nightcreature) + Ruin Colossus; south (bottom third) = the 4 bottom-cluster
renegades (orc, holyknight, pirate, ashen-dead) + Dune Raider; mid (middle
third, no faction ties) = all 3 Beastfolk + Rubble Warden + Scavenger
Chief. Moved: `swarmwing_broodmother`, `rubble_warden`, `scavenger_chief`
(north/south → mid), `rogue_battlemage`, `wyrm_poacher` (mid/south →
north), `warband_outcast`, `fallen_paladin` (mid → south). Unchanged: the
other 8. `tests/neutralTroops.test.js`'s region-split test already
tolerated 4-6 per band, so it needed no change and still passes.

**New file `shared/constants/mapRegions.js`:** a shared-accessible mirror
of `REGION_LIST`/`FACTION_REGIONS` (key/name/cx/cy/factions only — layer/
keepName omitted, not needed here). `shared/` can't import from a browser
worker, same constraint already flagged in the roadmap's tech-debt section,
so this mirrors the fields camp placement needs — MUST STAY IN SYNC by
hand if the real `REGION_LIST` changes (same convention already used for
`FACTION_BRANCHES_EXPORT` in heroes.js). Adds `regionBand(cy)`: cy<435 =
"north", 435-870 = "mid", >=870 = "south" (ROWS=1305, so thirds). Also
exports `ANCIENT_ZONE_NAMES` and `findRegionByName` for the 4 gate zones
(looked up by `name`, since the raw region list's `key`/`name` pairs are
mismatched leftovers — e.g. the region named "Dawngate" has key
"battlemarsh").

**New file `shared/utils/neutralCamps.js`:** pure, deterministic camp
planning — `campFootprint`/`CAMP_FOOTPRINTS` (small/medium/large →
1x1/1x2/2x2), `campPowerLevel` (T1/T2/T3 → P7/P9/P11, Ancients → P13),
`campSiegeMax` (100000/235000/365000/500000 by tier bracket — evenly
spaced across the owner's 100k-500k range, scaled by tier per their
explicit choice over a flat random roll), `campName` ("{label} Camp"),
`campDefenders` (exactly 2, garrisoned with the camp's own unit, strength
from the comparable power level's `cmdLvl`), `buildCampTemplate` (bundles
all of the above for one unit), `planCampsForBand`/`planAllNeutralCamps`
(deterministically assigns ~30 camps per named sub-region per band, one of
that band's 5 units per camp via a seeded hash — same camp count/unit
every run, no RNG dependency), and `planAncientZoneCamps`/`planAllCamps`
for the 4 gate zones (20 camps each, all one assigned Ancient — pairing is
a documented, trivially-reassignable judgment call: Dawngate→Nameless
Colossus, Twilightspire→Voidmaw, Lastwatch→Aeonspire, Finalhope→
Ruinfather).

**Scope note (explicit):** this is a placement PLAN, not a live map wire-
in. It does not touch `mapGen.worker.js`'s tile arrays, the renderer, or
attack/capture flow — it answers "how many camps, what stats, which named
region, what unit," which is the correctness-critical part to get right
before touching a ~1900-line procedural generator. The next follow-up
chunk is resolving each planned camp into an actual (c,r) tile (finding
empty tiles of the right footprint size near its named region, the way
keeps/spawns already do), then wiring siege/capture combat and the
renderer. Not done, not silently skipped.

**Tests:** `tests/neutralCamps.test.js` (12 tests — footprint-by-size,
power-level-by-tier, siege scaling, naming, defender count/strength,
per-band region coverage, deterministic re-planning, Ancient zone
assignment). Full suite: 226 passing, 0 failing. Production build clean.

---

## 2026-09-20 — Claude (Sonnet) — Neutral units (15) + The Ancients (4 T4 unaligned units)

Roadmap item: "Missing systems and content" → neutral units, "built through the
existing troop/branch/battle architecture, not a disconnected combat system."
Owner design conversation (this session) settled the exact roster before any
code was written; implemented as described, nothing invented beyond that.

### Part 1 — 15 neutral units (`shared/constants/neutralTroops.js`, new file)
- 7 units across 3 brand-new races — **Beastfolk** (Wolf Rider T1/small,
  Bear Shaman T2/medium, Swarmwing Broodmother T3/large), **Stoneborn**
  (Rubble Warden T2/medium, Ruin Colossus T3/large), **Sandrunner** (Dune
  Raider T2/small, Scavenger Chief T3/medium) — plus 8 **Renegade** units,
  one per existing faction (a rogue/deserter/outcast flavor of that
  faction's race, e.g. Pirate Deserter, Rogue Battlemage). 1 T1, rest T2/T3
  per owner's "more T2/T3, only a couple T1" instruction. Placed ~5/5/5
  across a `region: "south"|"mid"|"north"` field (data only — no live map
  placement/garrison spawning wired up, see Scope note below).
- **New shared tag vocabulary** (`NEUTRAL_TAGS`): `beast`, `pack`,
  `construct`, `armored`, `raider`, `swarm`, `renegade`. Only neutrals use
  tags today; existing faction troops could adopt them later with zero
  migration (every tag check added below no-ops safely via optional
  chaining if `branchDef.tags` is undefined).
- **Tag synergy = active abilities, not a passive stat bonus** (explicit
  owner correction mid-design). Exactly 5 of the 15 units carry a
  tag-conditional skill; the other 10 use normal single-unit skills reusing
  existing effect types (lifesteal, bonus_damage, dmg_reduce, def_down,
  double_attack, atk_stack, ignore_def_pct). The 5 synergy units/effects:
  Bear Shaman (`tag_shield_ally`), Swarmwing Broodmother
  (`tag_buff_allies_tag`), Rubble Warden (`tag_intercept_for_tag`), Ruin
  Colossus (`tag_full_shield_ally`), Scavenger Chief (`tag_heal_ally_on_hit`)
  — each requires another allied slot with the matching tag to be present in
  the same army; with none present the ability simply has no target and
  does nothing (no passive fallback bonus).
- **Battle engine plumbing** (`shared/utils/battle.js`): `procTroopSkills`
  gained two new optional trailing params, `alliedSlots` (the resolved slot
  array for the SAME side as the acting unit) and `actingSlot` (so a unit
  can exclude itself when scanning for a tagged ally). All 5 existing call
  sites updated to pass the correct same-side slot array
  (`atkSlotResolved`/`defSlotResolved`, already in scope at each site) —
  fully additive, no existing effect type or call site's prior behavior
  changed. Added the 5 new `case` branches for the tag effects above.

### Part 2 — The Ancients (`shared/constants/ancientTroops.js`, new file)
4 units, a new unaligned race said to predate the 8 factions and every
other neutral race. Owner spec: large-only, T4 power bracket, stats 15-20%
above faction T4, "only one Ancient may be used in an army."
- **Voidmaw, the First Devourer** (physical/melee), **Aeonspire, the Silent
  Watcher** (magical/siege), **Ruinfather, Who Walked Before**
  (physical/melee), **The Nameless Colossus** (physical/siege).
- **Stats:** baselined against the average of the 3 faction T4 capstones
  that are actually large-sized (Abyssal Leviathan / Doomcaller / Bone
  Colossus — the other 5 capstones were deliberately scaled down to
  medium/small by an earlier owner decision, so they're excluded from this
  baseline): dmgLo 553, dmgHi 585, def 97, hp 1817, siege 767, spd 47. Each
  Ancient individually scaled 15-20% above that (checked in
  `tests/ancientTroops.test.js`), not identical to each other.
- **Skills A/B/C + D, per owner clarification:** each Ancient has 3 real
  combat abilities (A/B/C), every one carrying `procBase`/`procMax` exactly
  like every other troop skill in the game — they level 1-10 through the
  existing generic `skillProcAtLevel`/`skillOrbCost` system with zero new
  upgrade plumbing. Checked the existing faction T4 capstones too: their
  `a`/`b`/`c` skills already carried `procBase`/`procMax`, so they were
  already upgradable before this change — nothing there needed fixing.
  Skill **D** is NOT a combat ability — it's the "only one Ancient per
  army" rule, added as a real 4th skill entry for visibility, but
  `trigger: "passive"` with no `procBase`/`procMax`/`effect`, so it cannot
  be leveled (the one skill in this whole change without a %, by design).
- **Structural reuse:** each Ancient is a capstone-shaped branch object
  (`capstone: true`, one `tiers[0]` block, skills `a/b/c` fielded together)
  so it resolves through the exact same path as every faction's T4 capstone
  in both `troops.js` and `battle.js`, with only an additive fallback
  lookup added to each (`ANCIENT_FACTIONS`, checked after `FACTION_TROOPS`)
  — zero new branching logic in either file's resolution functions.
  Ancients are kept OUT of `FACTION_TROOPS`/`FACTION_KEYS` (only reachable
  via the synthetic `faction: "ancients"` key) so nothing assuming "8 real
  factions" anywhere in the codebase is affected.
- **"Only one Ancient per army" — real enforcement**
  (`shared/utils/troopSlots.js`): new `isAncientUniqueBranch`/
  `armyHasOtherAncient` helpers keyed off each Ancient branch's
  `uniqueSlot: true` flag. `planTroopSlot` now refuses (no-ops, returns
  `blocked: "ancient_unique"`) placing a 2nd Ancient into a different slot
  than one already carried. `planArmySlots` (army Confirm) only places the
  *first* Ancient encountered in the desired-slots list and skips any
  further one (reported via a new optional `blockedKeys` field, empty/
  omitted for any army with 0-1 Ancients — verified this doesn't change the
  return shape for ordinary all-faction-troop armies). The rule blocks any
  second Ancient, not just a duplicate of the same one.

### Scope note (explicit, not silently narrowed)
Both parts are **data + battle-engine + army-composition-rule support
only**. Not done in this change:
- No live map placement or garrison spawning for the 15 neutrals (the
  existing `src/utils/spawnUtils.js`/`src/workers/spawn.worker.js` per-
  faction leveled "spawn" system is untouched and is a different, already-
  complete feature — do not confuse the two).
- No acquisition path for Ancients (no gacha entry, no reward/quest source)
  — there is currently no way for a player to actually get an Ancient into
  a barracks pool to test the uniqueSlot rule in the live UI, only via the
  pure functions directly (see tests).
- No portrait/unit art for any of the 19 new units (portrait path helpers
  added and follow existing naming conventions, ready for when art exists).

**Tests:** `tests/neutralTroops.test.js` (15-unit roster, tag-synergy
firing/non-firing, region split) and `tests/ancientTroops.test.js` (4-unit
roster, stat-ratio bounds, skill A/B/C upgradability, skill D shape,
capstone-path resolution, `planTroopSlot`/`planArmySlots` unique-slot
enforcement). Full suite: 214 passing, 0 failing (`npm install` was needed
— this upload's `node_modules` wasn't present, same as the last session).
Production build clean.

---

## 2026-09-20 — Claude (Sonnet) — T4 capstone troops, brought into this build

This upload was the pre-T4 baseline (3 branches/faction, no `capstone`) plus other
AI collaborators' unrelated work (3D demo, commander gait v3, sprite/UI polish —
see entries below). Re-implemented the previously-designed T4 capstone system on
top of it, since it wasn't present in this file yet. Design, unchanged from the
version delivered earlier: each faction gets exactly 1 T4 unit as a 4th branch
(not a tier inside the existing 3) — a single fixed elite unit, all 3 skills
(A+B+signature) active from the start, unlocking at **Quarter level 9**. The
branch has 6 upgrade levels: level 1 unlocks it for training, levels 2-6 reduce
its own training cost/time by 10%/level, capped at 50% off at level 6.

- **New branches** (`shared/constants/troops.js`): every faction's `branches` grew
  from 3 to 4 — Abyssal Leviathan (pirates, large), Void Warden (wizards, medium),
  Doomcaller (orcs, large), Sovereign Wyrm (dragons, small), Seraph Vanguard
  (holyknights, medium), Umbral Colossus (nightcreatures, medium), Frostbound
  Titan (coldborns, small), Bone Colossus (ashen_dead, large). Sizes are mixed
  per owner request ("don't want all large") — the 5 non-large units have their
  stat blocks (dmgLo/dmgHi/def/hp/siege/spd) scaled down to match their command
  batch size (50 or 100 per command vs. 4 for large), using the same large →
  medium → small ratios the game's regular tiered branches already use (dmg/hp/
  siege drop steeply, def less so, speed rises). `resolveTroopTier`/`getTierSkills`
  special-case `branch.capstone` to resolve the single stat block with all 3
  skills together.
- **Unlock/level gating** (`shared/constants/buildings.js`): `BRANCH_UNLOCK_Q`
  gained a 4th entry (`9`); new `B4_MAX` makes the capstone's full level 1-6
  range available as soon as Quarter hits 9. Reuses `BRANCH_COST`/`BRANCH_DUR`
  unchanged.
- **Battle engine** (`shared/utils/battle.js`): `getTierSkillsForBattle` (the
  separate hardcoded copy used by actual combat resolution) also special-cases
  `capstone` branches to field all 3 skills. Also fixed a real bug found while
  re-wiring this: the `"lifesteal"` troop-skill effect type (used by Umbral
  Colossus's Consume Essence) had no matching `case` in `procTroopSkills`, so it
  would have silently never healed anything — added `case "lifesteal"` next to
  the other single-target on-hit effects, feeding the existing `rs.lifesteal`
  field that command-level combat already reads.
- **Capstone training discount** (`shared/utils/training.js`): capstone units are
  priced above the normal T3 bracket (`CAPSTONE_BASE_COST`/`CAPSTONE_BASE_MINUTES`)
  and `capstoneTrainDiscount(branchLevel)` scales 0%→50% off as the branch levels
  1→6, applied to both cost and time via `trainingQuote`'s new `costTimeDiscount`
  param. Wired end-to-end: `Game.jsx`'s `queueTraining` computes the discount from
  the branch's stored level and passes it through `armyEconomy.js`'s `train`
  action → `trainingQuote`; `HQMenu.jsx`'s training-queue preview computes and
  applies the same discount so the displayed quote matches what's charged.
  (Confirmed again: the general "-10% train cost & time per branch level" label
  shown for the other 3 branches, `BRANCH_LVL_BONUS`, is still pure display text
  with no backing calculation — pre-existing, out of scope, left as-is.)
- **UI** (`HQMenu.jsx`): capstone units show a ★ instead of a roman-numeral tier
  badge in the branch list and troop detail modal, since they aren't "tier one"
  of anything.

New/updated tests: `tests/capstoneTroops.test.js` (structure, unlock gating,
discount curve, and a check that capstone sizes aren't all the same).
`tests/armyEconomy.test.js` updated for the capstone cost/time bracket and a
discount-scaling test. Full suite: 185 passing, 0 failing (`npm install` was
also needed — this upload's `node_modules` wasn't present). Build clean, live
Playwright smoke test shows no console/runtime errors.

Not done (flagged, not silently added): capstone portrait art (none exists,
same as the rest of the roster).

---

# CURRENT AUDIT AND ROADMAP — READ THIS FIRST

**Rewritten 2026-09-22 (Claude, Sonnet 5) — full re-audit against the actual
repository, reconciling the prior "consolidated 2026-09-20" audit with
everything built in sessions 4-27 below (chat, Relations, Nyro, Crew 2.0
Fortress/Diplomacy/Level, and the Records/Rally scoping docs), which had
drifted out of sync with that audit. History below this section is
unchanged. Items confirmed complete and working have been removed from the
active lists below rather than re-described; see "Complete systems" for
what that covers.**

## Separate 3D demo polish v2

- Updated only demo visuals/controls plus an early touch-handler exemption in
  `src/main.tsx` for `?demo3d=1`. Normal game rules/rendering are unchanged.
- Pirate fort now has masonry, courtyard walls, battlements, gate, windows,
  barrels and animated flag. Added terrain shading, irregular conifers,
  commander boots/belt, joined sample territory border and camera-angle button.
- HQ exclusion now matches its 3x3 footprint; no extra empty resource ring.
- Replaced tile picking with ground-plane coordinate selection and unified
  pointer handling (tap, pan, pinch, cancel). Initial valid destination enables
  March immediately. Active destination is frozen until arrival; speed is constant.
- Batched repeated static props to reduce drawing overhead; route meshes are
  disposed when replaced. Still procedural preview art, not final assets.
- Validation: production build and Node scene/input/march checks passed using
  actual Three.js geometry with mocked renderer. Chromium download timed out;
  GPU rendering and iPhone visuals/performance require owner playtest.

## Separate 3D camera feasibility demo

A standalone `/three-demo.html` test page was added to evaluate a true 3D map
without replacing or changing the live PixiJS game. It uses Three.js and simple
procedural test models: a pirate HQ, all four resources, selectable land, fixed
tilted perspective camera, pan/zoom, dotted route and an articulated walking
commander. This is a camera/performance prototype, not approved production art
or a commitment to rebuild the main map. Do not connect it to live game state
until the owner approves the direction after phone testing.
Cloudflare may route unknown HTML paths back to the normal game, so the reliable
test entry is `/?demo3d=1`; the standard URL continues loading the normal game.

## Commander walking revision — v3

Owner approved the separate-limb preview, stronger arm swing and fixed boot
facing for cleanup and test-branch deployment. Previous v1/v2 completion
claims are superseded: timing/alignment alone did not fix the same-leg artwork.
- Fynn/Brine now use v3 atlases: 33 columns (idle + 32 walking frames), four
  direction rows (SE, SW, NE, NW), 112px cells, 3696x448 transparent PNGs.
- Front/back rigs have independently alternating legs; left-facing rows mirror
  the matching right-facing rig. Boots do not inherit calf rotation. Small
  overlaps cover ankle joins; padded cells avoid cutting off moving boots.
- Actual character size is 15% smaller (52 to 44.2 source-equivalent pixels).
  Padding is compensated in sprite size/anchor so it does not shrink twice.
- Animation starts at first contact, loops every 1100ms, and returns to the
  correct idle direction at arrival. Hidden while undeployed inside HQ;
  visible while marching over the HQ. No march/path/gameplay timing changes.
- Rebuild: `node scripts/preview-commander-gait.mjs --bake` requires Sharp
  in the art-build environment, not the game runtime. Joint helpers live in
  `src/utils/commanderGait.js`; existing v2 source sheets are kept for rebuilds.
- Validation: 14 focused gait/renderer tests and production build passed;
  both atlases have transparent frame edges (no clipped feet). Cloud browser previously
  lacked a usable Pixi renderer; final phone playtest still needed. Do not
  claim automated tests prove on-device animation quality.
- **Correction (2026-09-22 audit):** only **16 of 60 commanders** have real
  map-walk sprites today (`public/commanders/map/`: h1, h5, h9, h11, h13,
  h17, h21, h23, h37, h38, h43, h45, h50, h52, h57, h59). The prior
  "Fynn/Brine only" framing in older entries below is out of date — do not
  assume only 2 exist. **44 commanders still need map-walk sprites.**

The repository is the source of truth. The dated entries below (from
"2026-09-20 — Codex — Full-world map graphics rollout" onward) are history
and may describe bugs that were fixed later or systems later completed or
scoped by sessions 4-27 — cross-check against this section, not against an
individual historical entry.

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
6. **This file is periodically re-consolidated.** When you finish a change,
   add a dated entry to the log below as always, but also check whether it
   should move an item between "Complete," "Partial," "Missing," or the
   phase roadmap sections above — an accurate top section matters more than
   an exhaustive log.

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
- Diplomacy is deliberately cosmetic-only (tile-color/UI signal). It does not
  gate attacks or combat. This is a design decision, not an unfinished state
  — do not "finish" it into a real alliance-enforcement system without the
  owner asking for that.

## 1. Current architecture

- **Client:** React UI with most live game state coordinated in `src/Game.jsx`.
- **World renderer:** PixiJS in `src/MapRenderer.jsx`; map, HQ, fort, prop,
  selection, commander and march visuals are separate display layers.
- **Game systems:** hooks in `src/hooks/` handle AI, battle, marches,
  pathfinding, resources, forts, gacha, training, upgrades, chat, relations,
  crew/fortress siege and server sync.
- **Heavy work:** browser workers in `src/workers/` run map generation,
  pathfinding, marching, battle, spawning, forts and the game loop.
- **Shared rules/data:** `shared/constants/` and `shared/utils/` hold troops,
  factions, commanders, skills, buildings, items, gear, map values, battle,
  economy, relocation, income, movement, chat, relations, crew and diplomacy
  rules.
- **Server prototype:** `server/index.js` is a Node WebSocket session server.
  It accepts initialization and broadcasts selected world changes. It is not a
  complete authoritative multiplayer server or durable database. **Chat,
  Relations, crews and diplomacy are all local/in-memory to one browser tab
  today — nothing about them is actually shared between two real players
  yet**, even though the rule-functions are written server-portable.
- **Tests:** `tests/` covers troop economy, healing, battle roster execution,
  resources, march motion, commander sprite lifecycle, chat/relations rules,
  crew/fortress rules and current map visuals.
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
  post-capture protection.
- **COMPLETE — DO NOT RECHECK:** item definitions, Bag replacing the old Gear
  shortcut, building/healing/recall/universal timer speedups and resource
  boosts.
- **COMPLETE — DO NOT RECHECK:** voluntary and forced HQ relocation behavior.
- **COMPLETE — DO NOT RECHECK:** fort construction/upgrade timers and existing
  fort build, station, recall, demolish and abandon flow, including the
  removal countdown surviving popup close and offline catch-up.
- **COMPLETE — DO NOT RECHECK:** leaderboard UI and calculation (the separate
  "War Ranking" panel on the same screen is its own unbuilt stub — see
  section 4).
- **COMPLETE — DO NOT RECHECK:** Commander detail `staminaMax` crash, Gacha/map
  Pixi sprite-destruction crash, troop-slot Confirm bug and crew state-mutation
  bug.
- **COMPLETE — DO NOT RECHECK:** Pirate HQ redesign, HQ centering, adjacent
  prop/selection presentation, and full-world rollout of the approved dark
  terrain and two-family resource art.
- **COMPLETE — DO NOT RECHECK:** neutral camp placement, spread, terrain/road/
  HQ avoidance, 2-wave garrisons, map icon and name popup (art is still a
  vector placeholder — see section 4/art inventory).
- **COMPLETE — DO NOT RECHECK:** Tier 4 capstone troops (data/battle-engine/
  training discount) for all 8 factions; the 15 neutral units and 4 Ancients
  (data/battle-engine/unique-slot rule) — all art-blocked, not logic-blocked
  (see art inventory below).
- **COMPLETE — DO NOT RECHECK:** the full chat system — World/Faction/Crew/
  DM/Group channels, sub-channels (#Announcement + #General, cap 5),
  auto-scroll/touch-scroll, profanity filter, Relations (friends/blacklist),
  Nyro AI companion, emoji picker, translation ("Aa" button — works, but see
  the reliability caveat in section 4), unread badges, replies, reactions,
  @mentions, mute, typing indicator, scroll-lock and in-channel search. All
  wired into `Game.jsx`/`GameView.jsx` and confirmed present, not just
  described. Still local-only, no real backend — that's Crew/Chat's shared
  multiplayer dependency, not a bug (see section 6/Phase A).
- **COMPLETE — DO NOT RECHECK:** Crew create/browse/join/leave, 3-tier roles
  with permission matrix, Contribution Points, Crew Store (real item
  grants), founder-editable announcement, 24-icon recolorable emblem
  system, Crew Fortress (build, station, and full multi-defender siege
  combat via `shared/utils/crewFortress.js` + `src/hooks/useFortressSiege.js`),
  and Diplomacy (Ally/Neutral/Enemy, real UI + data + map tile-tinting —
  deliberately cosmetic-only, see Locked owner decisions). Crew Help is real
  but still self-serve, not crewmate-to-crewmate (see section 4). **Crew
  level/XP itself (the mechanism) is complete — the level REWARDS are not,
  see section 3.**

## 3. Partially implemented systems

- **Gacha/shop:** Summon Gate pulls, gems/medallions, commander rewards,
  duplicates/respect, schematics and gear rewards exist. The original roadmap
  phrase "shop integration" is not defined in the repository. Do not invent a
  store or monetization design; ask the owner or locate the original design
  source before expanding it.
- **Troop roster:** all 8 factions have T1-T4 (capstone) branches, art and
  battle data; the 15 neutrals and 4 Ancients have full data/battle-engine
  support. What's missing across all of these is portrait/map art (art-queue
  item, see art inventory), not implementation.
- **Neutral PvE:** camps are placed, garrisoned, named and searchable on the
  live map; combat/capture reuses the existing generic garrison/siege system.
  Camp and neutral-unit art is a placeholder (vector marker), not final.
  **Neutral/Ancient units are now trainable** (2026-09-22): owning a camp
  unlocks its unit with no daily cap; a crew Contract Outpost unlocks up to 2
  neutral units (Ancients excluded) at 100 training commands/player/day.
  Trained neutrals/Ancients use the normal barracks → army slots → battle
  pipeline. No troop portraits exist yet for them (UI falls back to an icon).
- **Spawns (Sweep):** fixed 2026-09-22 — sweeping a Spawn now actually runs a
  battle (it previously crashed silently in the worker and only spent
  stamina).
- **Crew 2.0:** **Crew level rewards for all of levels 1-50 are now
  owner-approved and wired** (see the two 2026-09-22 "Crew level rewards"
  changelog entries below), including the two new crew structures they
  unlock — the **Well** (lvl 31/40) and **Contract Outpost** (lvl 35/42/50).
  Every level 2-50 has at least one real perk; level 1 is the default. Crew
  Fortresses, Wells and Outposts now have vector map markers (placeholder until
  real art — see the "Map markers" entry below). Two further items are waiting on real multiplayer
  identity: (1) Crew Help is self-serve, not crewmate-to-crewmate; (2)
  Records and Cooperation/Rally are fully spec'd (sessions 25-27 below) but
  still literal "coming soon" stubs in `CrewHQ.jsx` — zero code. Rally
  Target is a free-text label, not yet wired to the Objectives/map-pin
  system session 19 said it needs.
- **Gear:** inventory, slots, rarity, rolled stats, equipping, gacha drops and
  battle/stat application exist. The planned gear rework still needs an
  owner-approved design and balance pass.
- **Map graphics:** the dark grass, joined territory treatment and two
  resource-art families now cover the full world. Only the Pirate HQ's
  dark-v2 art is owner-approved. **FLAGGED FOR GPT/ChatGPT ART REVIEW:** the
  other **7 faction HQ redesigns (Wizards, Orcs, Dragons, Holy Knights,
  Creatures of the Night, Coldborns, Ashen Dead)** — files exist in
  `public/hq/` and are already wired in code, but `public/hq/ART.md` still
  lists all 7 as unapproved/pending review. GPT should review each against
  the Pirate HQ's approved look (darker natural stone, weathered timber,
  desaturated roofs, softer light, reduced cartoon outlines) and edit any
  that don't match before the owner signs off. **Owner (2026-09-22): good
  enough for Pre-Alpha — not a blocker, keep the flag for a real pass before
  Beta/Launch.** More terrain/prop variation, crossings, gates, keep sprites
  and mob/camp sprites remain (see art inventory).
- **Commander map visuals:** 16 of 60 commanders have purpose-built walking/
  standing map sprites (see the v3 entry above for the exact list). The other
  44 still use circular portraits on the map.
  **FLAGGED FOR GPT/ChatGPT ART REVIEW:** of those 16, only Fynn (h1) and
  Brine (h13) went through the full owner-approved v3 pipeline (separate-limb
  rig, fixed boot facing, size correction — see "Commander walking revision
  v3" above). The other **14 (h5, h9, h11, h17, h21, h23, h37, h38, h43, h45,
  h50, h52, h57, h59)** were generated earlier and have NOT been confirmed
  against the same v3 quality bar. GPT should review and, where needed,
  re-edit these 14 to match the v3 standard before treating "16 commanders
  done" as final. **Owner (2026-09-22): good enough for Pre-Alpha — not a
  blocker, keep the flag for a real pass before Beta/Launch.**
- **Multiplayer:** WebSocket sessions and broadcasts exist for selected tile,
  siege and fort changes. Authority, persistence, identity, reconnect
  recovery and scaling are incomplete. Chat/Relations/Crew/Diplomacy state
  is entirely client-local — nothing is actually shared between two players'
  browsers yet.
- **Mobile/UI:** landscape safe-area work and touch fixes exist, but all
  screens still need device testing and a consistent visual polish pass.
- **Offline progression:** timer data uses deadlines and catch-up logic in
  resources, egg/stamina regen, marches, reinforcements, Tomes power and fort
  countdowns. Durable save-across-reload (not just background/lock catch-up)
  is not implemented anywhere in the app — closing the tab loses all
  session state.

## 4. Missing systems and content

- Season Chapters framework and chapter data.
- Chapter locks for map crossings/gates, the Holy Grail/endgame area, war
  declarations, major systems, objectives and events.
- The Objectives/map-pin system Rally Target depends on (owner decision,
  session 19) — build this before wiring Rally Target to anything real.
- Crew Records tab (Keep-capture log/leaderboard) and Crew Cooperation/Rally
  tab (join a crewmate's march on a Keep) — both fully spec'd in sessions
  25-27 below, zero code written, intentionally held until real multiplayer
  gives crews actual other-player members to rally or rank against.
- True crewmate-to-crewmate Crew Help (today it only speeds your own timer).
- Tutorial and task/progression framework.
- Remaining gear rework decisions and implementation.
- Durable, server-authoritative seasons and real multiplayer infrastructure
  (chat, relations, crews and diplomacy currently have no cross-player
  sharing at all — see section 1).
- Full map art conversion and final mobile graphics/UI polish (see art
  inventory below for the current asset gap in detail).
- **Small loose ends found in this audit:**
  - **FIXED (2026-09-22, Claude):** `src/components/game/HUD.jsx`'s `rssRate`
    display used to be hardcoded. New `hourlyRssRate()` in
    `shared/utils/resourceIncome.js` computes the player's real per-hour
    stone/wood/gas/food rate from owned tiles + buildings + active resource
    bonuses (same rule the real income tick already uses); threaded through
    as new `bldgs`/`forts`/`rssBonus` props on `HUD`, `GameView.jsx`, and
    `Game.jsx`'s `<GameView>` spread.
  - **FIXED (2026-09-22, Claude):** the 2 orc + 2 nightcreature "Coming
    Soon" passives (Orc March/Scurrier march-speed, both Supply Specialist
    gathering-bonus) are real, intentional PvE (non-combat) skills, not
    stubs — owner confirmed not every commander skill needs to be a battle
    effect. Removed their `notImplemented` flag and wired the actual
    effect: `getPassiveBonuses()` now exposes `marchSpeedBonus`/
    `gatheringBonus`, applied in `useMarch.js`'s `cmdMarchSpd()` (real march
    time reduction) and `tactics.js`'s `gatherTick()` (real extra resources
    while gathering). See the 2026-09-22 "PvE passives" changelog entry
    below for the full breakdown. `CommanderScreen.jsx` still has the ⏳/
    "not yet implemented" UI support built in (harmless, currently unused)
    for a future skill that's genuinely a stub.
  - **FIXED (2026-09-22, Claude):** `src/components/screens/FactionScreen.jsx`'s
    literal `Placeholder` string in the "Faction Bonus" box is gone. Owner
    supplied 8 "vanilla" bonuses, randomly assigned one-per-faction (see the
    2026-09-22 "Faction bonuses" changelog entry below) and wired into real
    systems via new `shared/constants/factionBonuses.js`. The screen now
    shows the real label per faction.
  - `src/components/screens/Leaderboard.jsx` — a separate "War Ranking"
    panel on the same screen is a "coming soon" stub unrelated to the real,
    working main leaderboard above it.
  - `src/components/game/WizardsTomes.jsx` — two skill nodes ("Spawn
    Slayer", "Faction Mastery") are stubs pending the mob/faction-mastery
    systems they depend on; one `// TODO` notes daily-cooldown reset needs a
    real UTC day boundary once multiplayer exists (currently client-local).
  - `src/components/game/CrewPanel.jsx` — appears to be dead code (not
    imported anywhere; superseded by `CrewHQ.jsx`). Safe to delete once
    confirmed, to stop it from misleading the next collaborator who greps
    for "Crew Help."
  - `src/utils/translate.js` — message translation uses an unofficial,
    keyless Google Translate endpoint that can rate-limit (HTTP 429) under
    load. Fine for solo/small-group testing; needs a real translation API
    key/quota before Alpha-scale traffic.

## 5. Technical debt to fix before multiplayer

- `src/Game.jsx` owns too many unrelated systems and large mutable/ref-backed
  maps. **Done:** 10-step split into `shared/utils/` + `src/hooks/` (see the
  dated entry below) plus background timer catch-up. State still lives in
  `Game.jsx`.
- Game rules are divided between React callbacks, hooks and workers. Move every
  multiplayer-sensitive rule into shared deterministic functions callable by
  the server. Chat/Relations/Crew/Diplomacy rules already follow this split
  (`shared/utils/chatRules.js`, `relationsRules.js`, `crewRules.js`,
  `crewFortress.js`) and are ready for a server to adopt; they just aren't
  connected to one yet.
- The client currently creates/holds too much world truth. The server must own
  captures, combat results, resources, timers, inventory, troops, relocation,
  chapters, crews, chat and diplomacy.
- Replace session-only state with durable storage, migrations, account/player
  IDs, world/season IDs and reconnect snapshots. This is the single biggest
  gap for Phase A (see roadmap below) — right now closing the tab erases
  everything, including crew membership and chat history.
- Add command validation, idempotency and server timestamps so duplicate or
  delayed messages cannot spend/capture twice.
- Replace full-map client/server transfers with region/chunk snapshots and
  small validated updates suitable for thousands of players (needed by Beta/
  Launch scale, not Phase A/B).

## 6. Current Alpha/Beta launch blockers

- No durable authoritative server, account persistence, identity or reconnect
  recovery — chat, relations, crews and diplomacy are invisible to anyone
  but the local browser tab today. This blocks even a 5-15 person pre-alpha
  test, since testers can't see each other.
- Tier 4 and neutral units are logic-complete but need final art before a
  real playtest looks finished.
- Season Chapters and their progression gates do not exist.
- Crew Records and Cooperation/Rally are spec'd but unbuilt; Crew Help is
  still self-serve.
- The remaining 7 faction HQ art approvals, 44 commander map sprites, camp/
  mob sprites, added terrain variation, gate/crossing polish and mobile UI
  polish are incomplete.
- Battle execution tests pass for the current roster, but balance, mixed
  armies, long wars, wounded/healing loops and large-scale regression
  playtests remain.
- No save-across-reload; only background/lock catch-up exists.
- No currently reproduced Gacha/Commander/map-freeze crash remains after the
  fixes below. Treat a new occurrence as a regression and collect the exact
  phone console error before re-auditing those systems.

## 7. Dependencies

- **Art still needed from the owner's ChatGPT-art queue (blocked on weekly
  usage reset, per owner):** the 4 Ancients (T4), the 15 neutral units, the
  neutral/Ancient camp structures, 44 remaining commander map sprites, and
  final sign-off on the 7 non-Pirate faction HQ dark-v2 redesigns.
- Define Season Chapters before gates, crossings, Holy Grail access, war
  declarations, seasonal objectives and server APIs.
- Build the Objectives/map-pin system before Rally Target can point at
  anything real; define real multiplayer identity before Records, Rally and
  crewmate-to-crewmate Crew Help can be built.
- Finalize deterministic shared battle/economy/chat/crew rules (already
  mostly done, see section 5) before making the server authoritative.
- Complete server identity/persistence before real chat, crew ownership,
  diplomacy and season progression actually work between two different
  players.

## 8. Roadmap — Pre-Alpha through Launch

This replaces the old single "recommended implementation order." Each phase
lists what must be true to call that phase reached; items already marked
**COMPLETE — DO NOT RECHECK** above aren't repeated here even when they're a
prerequisite.

### Phase A — Pre-Alpha: basic multiplayer testing (5-15 people, one shared session)

Goal: a handful of testers can be in the same world at once and see each
other's actions. This is the single largest gap in the project today — every
system below is logic-complete but invisible across browsers.

1. Stand up a minimal authoritative server (extend `server/index.js` or
   replace it): stable player identity across reconnect, server-held world
   state for tiles/captures/crews/chat/diplomacy, broadcasting changes to
   all connected clients. In-memory/non-durable is acceptable for this
   phase — durability is a Phase B requirement, not A.
2. Move chat, Relations, Crew membership/roles/diplomacy and Crew Fortress
   siege state onto that server so a message, friend request, crew join or
   diplomacy change one tester makes is visible to the others. The pure
   rule functions for all of these already exist in `shared/utils/` and are
   written to be server-portable — this is a wiring task, not a redesign.
3. Add basic command validation (reject a capture/spend from a player who
   doesn't own the source, reject a duplicate message id) so simultaneous
   testers can't desync or double-spend each other.
4. Fix the small wiring/stub issues in section 4 that a live multiplayer
   playtest would otherwise surface as bugs: HUD's hardcoded `rssRate`,
   the passive skills that don't do anything yet, and delete the dead
   `CrewPanel.jsx`.
5. ~~Get the owner's sign-off on the 7 pending faction HQ redesigns~~ —
   **owner (2026-09-22): current art is good enough for Pre-Alpha.** Not
   pulled from the GPT-art-review flags elsewhere in this file (still worth
   a real pass before Beta/Launch), just no longer a Pre-Alpha blocker.
6. Playtest the full core loop (spawn, build, train, march, capture, chat,
   crew up, fortress siege) with 5-15 real concurrent testers and fix
   whatever that surfaces.

### Phase B — Alpha (1 server, ~100-200 concurrent)

Builds on Phase A's shared server.

1. Durable persistence: accounts, migrations, reconnect snapshots — state
   survives a server restart and a player closing their browser.
2. Finish the art queue enough that T4/neutral/Ancient units and camps don't
   look like placeholders (owner's ChatGPT-art queue, section 7).
3. Run focused battle balance/playtests with all tiers, neutral camps and
   Ancients in the mix.
4. Build Crew Records and Cooperation/Rally for real now that there are
   actual other players to rank against and rally with (specs already
   written, sessions 25-27 below); wire Rally Target to a real Objectives/
   map-pin system; upgrade Crew Help to crewmate-to-crewmate.
5. Finish offline/background recovery gaps and a real mobile UI/graphics
   polish pass across all screens.
6. Add server-side command idempotency/timestamps (section 5) now that
   100-200 concurrent players can actually collide.
7. Swap the unofficial translate endpoint for a real, quota-backed
   translation API before message volume grows.

### Phase C — Beta (1 server, ~1000 concurrent)

1. Replace full-map client/server transfers with region/chunk snapshots and
   validated incremental updates (section 5) — required at this scale, not
   before.
2. Build the Season Chapters data model and unlock checks in shared code,
   then connect gates, crossings, Holy Grail access, war declarations,
   objectives and events.
3. Complete the gear rework, tutorial and task/progression framework.
4. Full regression + load playtest at Beta scale; finish any remaining
   commander/mob/keep art and terrain variation.

### Phase D — Launch (multiple servers, ~2000 cap per server)

1. Multi-world/server provisioning and a server-select/matchmaking flow.
2. A migration plan from any earlier Alpha/Beta world state to permanent
   Launch worlds/accounts.
3. Monitoring, ops runbooks and capacity headroom for the 2000-per-server
   target.
4. Final balance pass and launch-readiness polish across every system above.

## Approved graphics/map backlog

- **DONE:** Pirate HQ redesign and placement.
- **PENDING OWNER SIGN-OFF (assets + code already exist):** the other 7
  faction HQ dark-v2 redesigns — `public/hq/ART.md` still lists them as
  unapproved even though the files are in the repo and wired in code.
- **DONE:** Expanded the approved terrain/resource tile and prop treatment
  across the whole map while keeping drawing limited to the visible area.
- Monitor and tweak gates/crossings to match the owner's desired Rise to War
  style, chapter locks and play flow.
- **DONE:** March routes use dotted lines, repeated directional arrows and a
  clear target endpoint.
- **IN PROGRESS:** 16 of 60 commanders have purpose-built map sprites
  (listed above); the other 44 still use circular portraits on the map.
- Create sprites for all remaining mobs/neutral encounters — currently only
  1 spawn sprite exists in `public/spawns/`.
- Create sprites for the 15 neutral units, 4 Ancients, and neutral/Ancient
  camp structures — logic/data is complete, art is not (art-queue item).
- Create sprites for keeps and blend them with the new map style.

---

## 2026-09-22 — Claude (Sonnet 5) — HUD resource rate + skipped "not implemented" skills, plus roadmap corrections

Follow-up to the 2026-09-22 audit/rewrite above. Owner flagged three things
in that audit for immediate action; two were code fixes, one needs owner
input rather than a guess.

**1. HUD resource-rate display was fake.** `src/components/game/HUD.jsx`
showed a hardcoded `{stone:200, wood:200, gas:200, food:2400}` per-hour rate
regardless of the player's real tiles/buildings. New `hourlyRssRate(tiles,
pKeys, buildings, forts, bonuses)` in `shared/utils/resourceIncome.js`
mirrors the real income-tick math (`baseGains` + per-tile `addTileIncome`,
same 200-base-plus-building-rate and per-power-level tile rates) but returns
an hourly rate for display instead of an applied/capped total. Threaded
`bldgs`/`forts`/`rssBonus` as new HUD props, added `rssBonus` to
`GameView.jsx`'s destructure and to `Game.jsx`'s `<GameView>` prop spread
(both already had `bldgs`/`forts` in scope; `rssBonus` did not previously
reach `GameView.jsx` at all).

**2. Two factions have skill passives that silently did nothing — CORRECTED,
now actually implemented (see item 5), not just blocked.** Initial pass
(same session, superseded within the hour): `shared/constants/orcs_skills.js`
(Orc March, Supply Specialist) and `shared/constants/nightcreatures_skills.js`
(2 more) self-flagged `notImplemented: true`, and nothing in the UI read
that flag — a player could spend a real skill point on a passive with zero
effect. First fix made `src/components/screens/CommanderScreen.jsx` show a
⏳ and block spending on them. **Owner correction: these are real,
intentional PvE (non-combat) skills, not stubs — not every commander skill
needs to be a damage/battle effect.** They needed to be wired to a real
effect, not walled off. See item 5 for the actual fix; the
`notImplemented`/⏳ UI support in `CommanderScreen.jsx` was left in place
as general-purpose infrastructure (it now simply doesn't trigger for these
4, since their data no longer sets the flag) in case a genuinely
unfinished skill needs it later.

**3. FactionScreen's "Placeholder" text — NOT fixed, needs owner input.**
`src/components/screens/FactionScreen.jsx`'s "Faction Bonus" box literally
renders the word "Placeholder". There is no per-faction gameplay bonus
defined anywhere in `shared/constants/` to put there instead — training
cost/time already vary "modestly by faction/branch" per the locked
decisions, but that's not itself an explicit "faction bonus" stat. Per Rule
4 (don't invent requirements), this needs the owner to say what each of the
8 factions' bonus actually is — or confirm the box should say "None yet" /
be hidden — before a collaborator fills it in. **Resolved later the same
day — see the "Faction bonuses" changelog entry below.**

**4. Roadmap corrections (owner-reported, not previously caught):**
Crew 2.0 is NOT fully complete — moved the "Complete" claim back to
"Partial" in section 2/3 above. `crewLevelPerks()` only defines real
rewards at the member-cap steps (every 2 levels) and the 3 fortress-slot
levels (15/30/45); every other level 1-50 renders as an empty placeholder
row in the "Level" tab. Needs an owner-approved reward table for the
remaining levels. **Levels 1-27 got that table — see the 2026-09-22 "Crew
level rewards" changelog entry below; 28-50 are still open.** Also added
explicit GPT-art-review flags in sections 3/4
above: the 14 non-Fynn/Brine commander map sprites (h5, h9, h11, h17, h21,
h23, h37, h38, h43, h45, h50, h52, h57, h59) haven't been checked against
the v3 quality pass, and the 7 non-Pirate faction HQ redesigns are wired in
code but still unapproved per `public/hq/ART.md`.

**5. The 4 "PvE passive" skills now actually work (owner clarification,
same session).** These are real, intentional world-map (non-combat)
commander passives — March Speed and Gathering — not every skill needs to
be a battle effect. Wired for real instead of just gated:
- `shared/constants/skills.js` `getPassiveBonuses(cmd)`: added
  `marchSpeedBonus`/`gatheringBonus` fields, summed from any of the
  commander's leveled passive skills whose `effect.type` is
  `"march_speed_bonus"` / `"gathering_bonus"` (these 4 skills don't use the
  existing `passiveXxx` boolean-flag pattern since they're non-combat, so
  they needed their own small branch here).
- `src/hooks/useMarch.js` `cmdMarchSpd(cmd, boostedCmd)`: now multiplies the
  gear-boosted effective speed by `(1 + marchSpeedBonus)` before returning
  it, so Orc March / Scurrier genuinely shorten march time for that
  commander's own marches (both outgoing and retreat/recall paths that go
  through this function). AI-side march speed paths are untouched (separate
  code, same "AI-side pacing" exclusion used elsewhere in this file).
- `shared/utils/tactics.js` `gatherTick(cmd, tile, now, gatheringBonusPct)`:
  new 4th param multiplies the per-tick resource amount by
  `(1 + gatheringBonusPct)`. `src/hooks/useTacticTicks.js` computes that
  from `getPassiveBonuses(cmd).gatheringBonus` and passes it through, so
  Supply Specialist genuinely gives more resources while that commander is
  parked gathering on a tile. **Scope note:** the instant "Quick Gather"
  tactic (`onQuickGather`/`quickGatherReward`) is a Wizard's Tomes action
  with no commander attached, so it isn't eligible for a commander passive
  — only the timed, commander-parked gather order is affected, which
  matches what "Supply Specialist" (a commander skill) should mean.
- Removed `notImplemented: true` and the "— Coming Soon" wording from all 4
  skill definitions now that they have a real effect. Descriptions now read
  "(Non-Combat Passive)".
- Moved to section 2 (Complete) below: real commander PvE passives (march
  speed, gathering bonus).

**Tests:** not run in this sandbox (no `node_modules`/`npm install` — same
constraint earlier entries note). All 8 touched files were syntax-checked
individually with `esbuild` (no bundling, no type errors) and compiled
clean. Re-run `npm install && npm test && npm run build` before merging;
worth a manual playtest of a march with Orc March/Scurrier leveled and a
gather order with Supply Specialist leveled to confirm the numbers feel
right, since no automated test yet covers this path — add one to
`tests/splitRules.test.js` or a new `tests/skillPassives.test.js` next.

---

## 2026-09-22 — Claude (Sonnet 5) — Faction bonuses (owner-specified, all 8 wired) + FactionScreen fix

Follow-up to the entry above. Owner supplied 8 "vanilla" per-faction bonuses
(deliberately modest — no faction is strictly better, each leans slightly
toward one part of the game) and asked for them assigned randomly, wired
into real systems, and shown on `FactionScreen.jsx` in place of the old
"Placeholder" text.

**New file `shared/constants/factionBonuses.js`.** One `FACTION_BONUSES`
map, one entry per faction, each `{ key, kind, value, label }`. `kind` says
how a consumer applies it (`reduceTime`, `reduceCost`, `addRate`,
`addFlat`). Two helpers: `factionBonus(facKey)` (for display) and
`factionBonusValue(facKey, bonusKey, neutral=0)` (for wiring — returns the
faction's value only if its bonus matches `bonusKey`, else a neutral
default, so every call site can unconditionally ask "does my faction have
this bonus?" without a branch).

**Random assignment (Fisher-Yates, generated once, not to be re-rolled):**
- pirates → -10% Training Time
- nightcreatures → -10% Training Cost
- ashen_dead → +10% March Speed
- dragons → +10% Resources from Gathering
- holyknights → +5% Resource Production (owned-tile income)
- wizards → +5% Damage in PvE Battles
- orcs → +5 Max Dragon Eggs
- coldborns → -10% Healing Time

**Wiring, one bonus at a time:**
- **Training time/cost** (`shared/utils/training.js` `trainingQuote`): new
  5th param `costMult` applies only to `perCommandCost` (wood/gas/food), kept
  separate from the existing capstone `discMult` which also affects time —
  otherwise the "cost" bonus would've silently also cut training time.
  `Game.jsx` computes `trainingCostMult = 1 - factionBonusValue(facKey,
  "trainCost")` and `trainingSpeedMult` now also folds in `trainTime`.
  Threaded through `armyEconomy.js`'s `train` action and `HQMenu.jsx`'s
  training-quote preview so the UI shows the same number that gets charged.
- **March speed** (`src/hooks/useMarch.js` `cmdMarchSpd`): adds
  `factionBonusValue(cmd.faction, "marchSpeed")` on top of the existing
  skill-passive march bonus (additive stacking, one `pct` applied once).
- **Gathering yield** (`src/hooks/useTacticTicks.js`): adds
  `factionBonusValue(cmd.faction, "gatherYield")` on top of the Supply
  Specialist skill bonus before calling `gatherTick`.
- **Resource production / tile income** (`shared/utils/resourceIncome.js`):
  `addTileIncome` takes a new `facBonus` param, added to the existing Tomes
  `bonuses[tile.rss]` inside the per-power-level tile-rate multiplier (does
  NOT touch the flat power-1 tiles or the base 200/building income, since
  the bonus is "resource production" from owned tiles specifically).
  Threaded through `hourlyRssRate` (HUD display) and `resourceIncomeTick`
  (the real tick). `Game.jsx` computes `facTileYield =
  factionBonusValue(facKey, "tileYield")` and passes it into `useResources`
  and down through `GameView.jsx` into `HUD.jsx`.
- **Damage in PvE battles** (`shared/utils/battle.js` `simBattle`): new
  `isPveBattle = defTile?.owner === "neutral" || defTile?.owner === "ai"`
  check (same ownership test the existing `neutral_tile_dmg_bonus` skill
  effect already used to mean "not a real player"). When true,
  `facPveDmgMult = 1 + factionBonusValue(cmd.faction, "pveDmg")` seeds both
  `rs.cmdMult` and `rs.troopAtkMult` at the top of each round, so it stacks
  multiplicatively with every other in-battle bonus. Never applies to PvP
  (defTile.owner === "player").
- **Max Dragon Eggs** (`Game.jsx`): `dragonEggsCap = 20 + tomeNodeLv("tr") +
  factionBonusValue(facKey, "eggCap")` — flat add, same pattern as the
  existing Tomes egg-cap node.
- **Healing speed** (`shared/utils/armyEconomy.js` `healingRate`): new
  `healSpeedMult` param (>1 heals faster) multiplies the existing rate
  formula. `Game.jsx` computes `healSpeedMult = 1 / (1 -
  factionBonusValue(facKey, "healSpeed"))` so "-10% healing time" reads as
  the rate going up ~11%. Threaded through `startHealing`, the `tick()`
  auto-heal path, `useTraining.js`, and `HQMenu.jsx`'s Repair Bay screen.

**FactionScreen fix:** `src/components/screens/FactionScreen.jsx` imports
`factionBonus` and replaces the literal `Placeholder` span with
`factionBonus(faction.key)?.label`, so each faction's card now shows its
real bonus text.

**Tests:** not run in this sandbox (no `node_modules`). All touched files
(`factionBonuses.js`, `resourceIncome.js`, `battle.js`, `training.js`,
`armyEconomy.js`, `useMarch.js`, `useTacticTicks.js`, `useResources.js`,
`useTraining.js`, `HQMenu.jsx`, `HUD.jsx`, `GameView.jsx`, `Game.jsx`,
`FactionScreen.jsx`) syntax-checked individually with `esbuild` and compiled
clean (one pre-existing, unrelated duplicate-case warning in `battle.js`
around `frostbitten_enemy_spd_down`/`per_round_frostbite_aoe_chance`, not
touched by this change). Re-run `npm install && npm test && npm run build`
before merging; worth a manual playtest per faction to confirm each bonus
feels right at these modest values — no automated test yet covers this
path.

---

## 2026-09-22 — Claude (Sonnet 5) — Crew level rewards, levels 1-27 (owner-specified)

Follow-up to the audit's "Crew 2.0 NOT 100% done" flag. Owner supplied a
reward table for levels 1-27 and a fortress-slot schedule change; levels
28-50 are still open (member-cap/fortress-slot milestones that land in that
range still fire, everything else is still a placeholder row).

**Fortress slots:** crews now start with **1** fortress slot (was 2), with
the 2nd unlocking at **level 5** (new) rather than only at 15/30/45.
`shared/constants/crew.js`: `CREW_BASE_FORTRESS_SLOTS` 2→1,
`CREW_FORTRESS_SLOT_LEVELS` `[15,30,45]` → `[5,15,30,45]`. Max stays 5.

**New resource-production perks (levels 3-26), 3 tiers each:**
Woodworking (wood), Stone Masonry (stone), Gas Collector (gas), Food Farmer
(food) — flat +500/hr (tier 1), +750/hr (tier 2), +1000/hr (tier 3) each,
staggered so no two land on the same level (3/7/9/11 → 13/17/19/21 →
22/23/24/26).

**New level-25 perk:** Faster Together I — +5% march speed.

**New level-27 perk:** Resource Trove I — +1200/hr to all 4 resources at
once, stacking with the per-resource perks above.

**Wiring (same pattern as the faction bonuses — applied to the player's own
income/march speed for now; real crew-wide sharing waits on a server):**
- `shared/constants/crew.js`: new `crewResourceRateBonus(level)` (cumulative
  flat +N/hr per resource from every unlocked perk) and
  `crewMarchSpeedBonus(level)` (cumulative march-speed %), both used by
  `crewLevelPerks()` for display and by the wiring below for effect.
- `shared/utils/resourceIncome.js`: `baseGains()` takes a new `crewBonus`
  param, added into the flat per-resource base rate (alongside the existing
  200 + building rate) — flat, not tile-power-scaled, unlike the faction
  tile-yield bonus. Threaded through `hourlyRssRate()` and
  `resourceIncomeTick()`.
- `src/hooks/useResources.js`, `src/GameView.jsx`, `src/Game.jsx`,
  `src/components/game/HUD.jsx`: new `crewRssBonus` prop threaded the same
  way `facTileYield` was, computed in `Game.jsx` as
  `crewResourceRateBonus(myCrew?.level || 1)`.
- `Game.jsx`: `marchSpeedMult`'s consumers (the two march `stepMs`
  calculations) now also multiply by `(1 - crewMarchBonus)`, where
  `crewMarchBonus = crewMarchSpeedBonus(myCrew?.level || 1)` — same
  "reduces stepMs" mechanism the Tomes/faction march bonuses already use.
  (Not threaded into `useMarch.js`'s separate `cmdMarchSpd` spd-stat path,
  which has no notion of the player's crew on a bare commander object —
  the stepMs path above is what actually times a march.)

**Tests:** `tests/crewRules.test.js` and `tests/crewLevelPerks.test.js`
updated for the new fortress-slot schedule and new perks — `node --test`
run directly (no `npm install` needed, pure `node:test`), all 25 cases
pass. Also re-ran `tests/resources.test.js`, `tests/aiIncome.test.js`,
`tests/backgroundCatchup.test.js` to confirm the `baseGains()` signature
change didn't break existing income-tick behavior — all 24 pass. All
touched files syntax-checked clean with `esbuild`. Worth a playtest to
confirm the stacked resource numbers feel right at max level.

---

## 2026-09-22 — Claude — Crew level rewards 28-50, Well + Contract Outpost, neutral training, Sweep fix

Owner supplied levels 28-50 and specified the two new structures. Also fixed
the pre-existing Sweep bug at the owner's request.

**Levels 28-50** (`shared/constants/crew.js`, all cumulative per tier):
Healer I/II (28/41, -5%/-10% recovery time) · Woodworking/Stone Masonry/Gas
Collector/Food Farmer IV (29/32/33/34, +1250/hr) · Well I/II (31/40) ·
Contract Board I/II/III (35/42/50) · Scholars I/II (36/47, +5%/+10% training
XP) · Gatherers I/II (37/46, +5%/+10% gathering) · Faster Together II (38,
+7.5% march) · Treasure Trove II (39, +2000/hr all) · Spawn Sweeper (43, +10%
dmg vs Spawns) · PvE (44, +10% dmg vs neutral/AI tiles) · Efficient Trainer
(48, -5% training time) · Cost Effective (49, -10% training cost). Every
numeric perk is wired: heal/train-time/train-cost/XP fold into the existing
Game.jsx multipliers next to the faction bonuses; gathering into
`useTacticTicks.js`; PvE/Spawn damage ride on `boostedCmd.crewPveDmgMult` /
`crewSpawnDmgMult` into `battle.js` (faction "PvE damage" applies to tiles AND
Spawns; the crew PvE perk to tiles only; Spawn Sweeper to Spawns only).
`myCrew` moved above the Tome block in Game.jsx so these can use it.

**Well** (`shared/utils/crewStructures.js`, `crew.wells[]`): founder-only,
unclaimed p10+ tile (same tile rules as a Fortress, plus no other crew
structure on it). 1 at crew level 31, 2 at 40. Once built, any crew member
can STATION an idle commander there from anywhere (interpreting "no range" as
not limited by march range — it teleports the commander onto the Well tile,
`stationedWellId`), then GATHER through the normal gather drawer. A Well
yields all 4 resources, each at a p11 tile's gather rate
(`tactics.js gatherTick(..., isWell)`); gathering stops if the commander
leaves or the Well is demolished.

**Contract Outpost** (`crew.outpost`): founder-only, p10+ tile, one per crew,
crew level 35. Founder picks 1 neutral unit (2 at level 50; Ancients
rejected). Every crew member can then train it. Outpost-sourced training is
capped at `OUTPOST_DAILY_COMMAND_LIMIT` = 100 commands/player/day
(`armyEconomy.js` 'train' `dailyLimit`, tracked in `contractDaily`, reset by
local calendar day). Contract Board II gives -10% training time on
Outpost-sourced units. Owning a camp for a neutral or Ancient unit trains it
with no daily cap (per owner's neutral-unit rules); camp wins if both apply.

**Placeholders to tune (owner gave no numbers):** Well/Outpost build cost and
time = Fortress's (3h; 150k wood/250k stone/175k gas). Neutral training
cost/time reuse `trainingQuote` — neutrals priced by their own T1/T2/T3
bracket (`branch.costTier`), Ancients at capstone price. Daily reset is
client-local like the Tomes reset.

**Neutral/Ancient troop pipeline:** `neutralTroops.js` now exports a
`NEUTRAL_FACTIONS` wrapper (same trick as `ANCIENT_FACTIONS`; `singleTier` +
`costTier` flags) so pool key `neutrals:<unit>:0` resolves everywhere via
additive fallbacks in troops.js, battle.js, troopSlots.js, pathfinding.js and
training.js. New `shared/constants/allTroops.js` `TROOP_FACTIONS` is used for
branch lookups in HQMenu (training + army screens), CommanderPicker,
BottomPanel, CommanderCard, BattleLog and the siege-power calls. Game.jsx
builds `trainableUnlocked` (normal unlocks + available/owned neutral units)
for HQMenu and the train reducer.

**Sweep fix** (`src/hooks/useTactics.js`): `onSweep` called
`runBattle({ atkCmd, defCmd, ... })`, which doesn't match
`runBattle(cmd, attackerTroops, defTile, wallLvl)`, and never awaited it, so
the worker threw and nothing happened except stamina loss. It now builds a
real defTile (`tactics.js spawnDefTile`), awaits the battle with the gear-
boosted commander, applies troop losses + 30% wounded (`sweepTroopLosses`,
same rule as marches), then credits XP/orbs/resources/rare drop on a win.

**UI:** new `src/components/game/popup/CrewStructurePanel.jsx` mounted in
TilePopup (build buttons, construction countdown, station/gather/demolish,
Outpost unit picker + daily commands left). HQMenu Training shows the unit's
source (camp = no limit / Outpost = N/100 left).

**Tests:** `npm install` worked in this sandbox this time, so the full suite
ran: `npm test` 402/402 pass, `npm run build` succeeds. New
`tests/crewStructures.test.js` (Well/Outpost rules, neutral sources, daily
cap, well gather, neutral/Ancient quotes, Sweep resolves via simBattle, Spawn
Sweeper affects Spawn fights only); `crewLevelPerks.test.js` extended.
CrewStructurePanel smoke-rendered in all states. Not yet playtested in a
live browser session — worth a pass building a Well/Outpost with a crew
forced to level 50.

---

## 2026-09-22 — Claude — Map markers for Crew Fortress / Well / Contract Outpost

These three structures used to show only in the tile popup. `src/MapRenderer.jsx` now draws a
vector marker for each (same approach as `drawCampMarker`; no art assets):
a stone keep with a banner (Fortress), a round stone well with water and an
A-frame roof (Well), and a timber notice board with contracts and a banner
(Contract Outpost). The ring and banner colour show the relationship to the player's crew:
blue = yours, purple = ally, red = enemy, tan = other crews. While a structure
is under construction its marker is faded with a dashed ring.

Wiring: `GameView.jsx` builds a `crewStructures` list
(`[{ tileKey, kind, built, rel }]`, memoised on crews/myCrew/nowTick) and
passes it to `<MapRenderer crewStructures>`. `syncCrewStructures()` keeps one
`PIXI.Graphics` per tile on the existing fort layer and only redraws a marker
when its kind/built/rel signature changes. It also syncs once when the Pixi app
initialises, and its cache is cleared on init/unmount alongside the fort cache.
Checked by rendering all 3 kinds × 4 relationships plus the under-construction
state in headless Chromium (no console errors). Real sprites can replace the
draw functions later without touching the wiring.

---

## 2026-09-22 — Claude — Well/Outpost combat + "standing before stationed" defense order

Owner spec: Wells and Contract Outposts fight like Fortresses, and ANY tile
defends in this order:
**commanders standing on the tile (moved there, not stationed) → stationed
commanders (only structures that allow it) → structure defenders (keeps'
garrison waves only) → siege.** Siege to 0 destroys a crew structure; the tile
reverts to a plain p10+ tile owned by whoever landed the last hit. Players can
MOVE onto any of their crew's structures (and their own keeps) to stand guard;
keeps and Outposts can't hold stationed armies.

- **New `shared/utils/structureDefense.js`**: `STRUCTURE_RULES`
  (fortress/well: stationing; outpost/keep: none; keep: garrison) and
  `structureDefenderQueue()` — the ordered standing→stationed fight list
  (standing newest arrival first, same rule the draw-rematch loop already
  used; commanders with 0 troops or mid-march don't count).
- **`useFortressSiege.js` now handles all three crew structures** (looked up
  with `crewStructures.js findCrewStructureAt`; march type is still
  `"siegeFortress"`). Before, it only fought stationed Fortress defenders.
  Now: standing → stationed → siege. Defeated AI defenders lose their army and
  march home. On destroy, `updateCrewStructure(..., null)` removes it and the
  tile is patched to the player.
- **Wells/Outposts have siege HP**: `siege`/`siegeMax` (PLACEHOLDER
  `STRUCTURE_SIEGE_MAX` = 1,000,000, same as the Fortress default), filled
  when the build completes. `structureSiege()` tolerates ones built before
  this change.
- **`useMarch.js` keep/tile attacks**: the old "one combined fight vs the tile's
  defCmd" is replaced by fighting each standing AI commander in turn, THEN the
  garrison waves, THEN siege. Also fixed two issues there: the attacker's
  losses against standing commanders weren't carried into the wave loop, and
  the "all waves already cleared → siege only" shortcut skipped standing
  commanders.
- **AI attacks** now skip crew-structure tiles. The AI has no structure-siege
  path yet, so before this it could capture the bare tile out from under a
  structure. **Follow-up for multiplayer:** give AI/other players a real
  structure-siege path using the same `structureDefenderQueue`.
- **UI** (`TilePopup.jsx` / `CrewStructurePanel.jsx`): Wells and Outposts show
  siege HP. Other crews' Wells/Outposts get ATTACK (goes through the siege
  march). You can no longer ATTACK your own crew's Fortress. The plain
  capture ATTACK is hidden on any crew-structure tile. MOVE is available on
  your crew's structure tiles (`Game.jsx startMarch` treats them as "move").
  Only commanders STATIONED at a Well can gather there; a commander that just
  moved onto it stands guard. Any completed march clears `stationedWellId`.
- **Tests:** new `tests/structureDefense.test.js`. `npm test` 409/409,
  `npm run build` OK, panel smoke-rendered in all states including another
  crew's Well/Outpost with ATTACK. Note: in the current single-player build
  no AI crew builds Fortresses/Wells/Outposts, so the enemy-structure siege
  path can't happen in play yet. It's there for multiplayer.

---

## 2026-09-23 — Claude — Audit + timed Quarter/Branch upgrades + admin "Max all"

**Timed quarters and branches (owner spec):**
- Quarter and branch upgrades were instant. They now use the building upgrade queue (`upgQueue`, same speed-ups / crew help / admin finish):
  - quarter key `q_<faction>`, completed into `quarterLevels` by `useUpgrades`;
  - branch key `b_<faction>_<branch>`, a `bldgs` key like any building, so `unlockedBranches` follows.
  - `upgrade(type, { lvl, ceil })` in Game.jsx takes the gate from the Quarters screen.
- **Quarter:** Lv1 unlock takes 5 min, rising geometrically to 24 h for Lv10.
- **Branch:** Lv1 unlock takes 10 min, rising geometrically to 12 h for Lv6.
- **Costs:** 75th percentile of the total RSS of the 8 building upgrades closest in length, made monotonic, split ~25/52/23 wood/stone/gas (`QUARTER_COST` / `BRANCH_COST`).
- **Unlocking:** your own quarter still starts at Lv1 with its first branch at Lv1. Other quarters now start locked (Lv0) and need the 5-min unlock. Branches no longer auto-unlock at their quarter level; each needs the 10-min unlock.
- **Older saves:** a quarter with no stored level counts as Lv1 if one of its branches was already built (`effQuarterLvl`).
- **UI:** the Quarters screen shows UNLOCK / ^ LvN, the time, and a live countdown while an upgrade runs.

**Admin (test mode) → Timers → 🏰 MAX ALL BUILDINGS & QUARTERS:**
- Every building goes to its max level, every quarter of your alignment to Lv10, and every branch in them to Lv6.
- It clears any of those still in the upgrade queue.
- Implemented in `adminMaxedBase` (adminRules.js).

**Audit fixes:**
- **GameView:** `setConsumables` was used but never destructured. Buying a consumable from the Crew Store threw a ReferenceError.
- **Dev mode:** the `gameLoop` and `march` workers use `import` but were created as classic workers. In `npm run dev` (test mode) they failed to start ("Cannot use import statement outside a module"), so marches/AI ticks didn't run. Both are now `{ type: "module" }`; the build was already fine.
- **Upgrade timers:** 24 h upgrades showed as "1440m 0s". They now show h/m (`fmtDurMs`).
- **battle.js:**
  - unreachable leftover code after `dmg_resist_vs_alignment_branch`;
  - 4 duplicate round-state keys;
  - the last duplicate `case` (`on_hit_frostbite_chance`) — lint is now clean.
  - Troop-skill Frostbite (Raiders on-hit, Frostbite Carol troop skill) only set flags nothing read. It now freezes the unit hit or every enemy unit, using the per-unit Frostbite.

**Stray files in the upload (not used by anything) — owner to delete:**
- `shared/battle.js`: an old copy of `shared/utils/battle.js` uploaded to the wrong folder.
- `README-*.md` at the repo root: zip notes.
- `tests/README.md`, `tests/ReadMeAI.md`, `src/testmode/readme`.

**Checks:**
- `npm test` 476/476 (new `tests/quarterUpgrades.test.js`), build OK, eslint no-undef/dupe/unreachable clean.
- Browser run (test campaign): quarter upgrade queued 10m → finished; branch unlock queued 10m; MAX ALL puts everything at max; no console errors.
- PvP mirror 91/180, PvE unchanged.

## 2026-09-23 — Claude — Coldborns fully implemented (all 8 factions done)

All 6 commanders (h49 Bjorn, h50 Valdris, h51 Leif, h52 Eira, h53 Halvard, h54 Knut) were checked against their descriptions. 36 handler types were rewritten for the per-unit commander path; the troop/legacy path is kept. 20 unreachable duplicate `case` blocks (later copies of the same labels, dead code in the switch) were removed. `no-duplicate-case` went from 23 to 1.

**Frostbite (new, per unit):**
- Frostbite was only a flag nothing read.
- `freezeUnits` / `rollFreeze` mark enemy units in `cs.frostbite` (ti → last round, 2 rounds).
- A frostbitten unit deals -40% (`frostbiteDmgPenalty`) and loses `frostSpdDown` SPD in the turn order (Permafrost, The Long Winter, Skald's Curse max).
- `vsMult` matches `frostbitten` units (Frozen Prey / Frostbitten Foes / Calculated Cruelty, Cold Logic Focus-only, Howling Blizzard max).
- Applications are logged in `cs.frostApps` (Shattered Defenses: DEF -1 for 2 rounds per application).
- Cleanse removes Frostbite.
- `rs.frostbiteApplied` is still set while any unit is frostbitten, for the old conditional checks.

**Notable fixes:**
- Every Frostbite active now hits specific units, and each unit rolls its own Frostbite:
  - Icevein's Strike, Glacial Strike, Winter's Edge;
  - Blood on Ice, Frost Cleave, Völva's Wrath, Winter Storm (per-hit chance);
  - Frozen Verse, Bitter Cold, Cold Snap, Frost Tactics, Skald's Arrow;
  - Frost and Fire (Frostbite or Burn per unit), Carol / Tide of Ice / Winter's Frost.
- Shatter needs a frostbitten unit (full hit, removes it, DEF -5 for 2 rounds); with none frostbitten it deals half damage.
- Shield Splitter: permanent DEF -3 on the unit hit. Its max-level Frostbite read the wrong key (`frostbiteOnHit` vs `applyFrostbite`).
- Howling Blizzard max read `frostbittenSkillDmgUp`; the key is `frostbittenSkillDmgTakenUp`. It is now handler-owned.
- Raider's Will / Northern Resolve / Valdris Stands give commander Stun Immunity, per their text (they gave Confusion immunity).
- Berserker's Rush: flat ATK +N and SPD -2 per round, permanent; max: enemy DEF -10.
- War Scars: +X% CMD damage per hit the troops took last round (max 5).
- Frozen Throne is lost for good once one of our units dies. It was never lost.
- Cold Fury / Frost Fury follow real frostbitten units; Frost Fury stacks persist.
- Follow-ups now matter:
  - War Drums, Völva's Sight, Song of Courage, Thane's Charge, Frost Chant (their field was unread);
  - War Drums max: +40% Focus hit on the normal attack;
  - Thane's Charge max: once-per-battle 50% evade per unit.
- Seer's Vision: army stun immunity (+ max Burn immunity) rounds 1–3.
- Völva's Blessing: 40% per-unit cleanse; max healing received +15%.
- Völva's Shield: Coldborn units only. Coldborn Brotherhood: only vs Creature attackers.
- Bear's Endurance (HP +8, was unread), Cold Calculation (flat FOC/SPD).
- Ancient Rite's DMG buff lasts 2 rounds.

**Coverage:** every Coldborn combat skill changes combat except:
- Siege of the North: map-only.
- Frost Salve: in Eira's full kit, the heals already restore all lost HP each round.

**Checks:**
- Whole game: 476/576 commander skills change combat in single-skill isolation (the rest are map-only or need a partner/condition).
- PvP mirror 91/180. PvE unchanged.
- Tests: 3 new. `npm test` 472/472, build OK.

## 2026-09-23 — Claude — Ashen Dead fully implemented

All 6 commanders (h55 Malgrath, h56 Varak, h57 Dreadmourne, h58 Veyra, h59 Mordwyn, h60 Cael) were checked against their descriptions. 44 handler types were rewritten for the per-unit commander path; the troop/legacy path is kept. Shared Coldborn types stay generic:
- `heal_all_cleanse`, `passive_heal_per_round`, `dmg_resist_vs_alignment` ("all_coldborn" keeps the old army-wide reduce);
- `physical_damage_frostbitten_slow`: the Coldborn version still needs Frostbite; the Ashen version slows for certain.

**Life Drain (new, per unit):**
- `drainUnits` marks enemy units in `cs.lifeDrain` (ti → last round).
- In the heal step, the share of a side's healing that would go to its drained units (by missing HP) is lost, and 50% of it hits those units ("🩸 Life Drain — healing turned to damage").
- Drain applications are counted per unit (`cs.drainApps`, for Death Touched) and per round (`cs.drainAppliedNow`, for The Eternal Knight).
- `vsMult` matches `drained` units.

**Other engine support:**
- `vsTarget` entries with `foc: true` only apply to Focus damage (`vsMult(..., isFoc)`).
- `addPoison` takes a fixed target `ti`.
- `prioRank` supports "highestHp".
- `cmdNormalUsesFoc`: Death Knell max makes the commander's normal attacks deal Focus damage.
- `normalHitsAll`: Cael's Rampage, the normal attack hits every unit.
- `cs.normalAttacks`: The Haunting.
- `buffBlockUnits`: Bone Crusher strips that unit's per-unit buffs for 2 rounds.
- `cleanseUnits`: Ethereal Mending / Winter's Warmth remove N debuffs from each allied unit (stun/confuse/blind/burn/min-dmg/DEF-down/slow/DoT/Life Drain).

**Notable fixes:**
- Almost every active used `cmdMult`/`focusDmgBonus` and army-wide statuses. They are now per-unit hits with per-unit Burn/Poison/Slow/Confusion/Life Drain. Covers:
  - Malgrath: Eternal Gaze, Malgrath's Curse (highest HP, DEF -5 permanent), Necrotic Touch, Plague.
  - Varak: Dread Surge (3 hits on every unit), Death Knell.
  - Veyra: Poison Touch / Grave Poison, Revenant's Fury / Hollow Barrage (Coldborn bonus), Veyra's Hunt.
  - Cael: Burning Charge, Risen Fury, Poison Sweep, Cael's Rampage (Large bonus), Death from Below.
  - Dreadmourne: Bone Splitter / Hollow Strike / Slow Strike / Hollow Assault.
- Varak's Verdict applied Confusion instead of Silence, and its max FOC was lost (handler-owned key); both fixed.
- Iron Decree (and every `dmg_resist_vs_alignment`) was an empty case that fell through to the next one. It is now damage FROM Human/Creature units -X%.
- Flat commander stats (Death's Patience, Resolve, Cael's Fury, Dominion) were applied as % or not at all.
- Branch buffs now affect only their branches:
  - Iron Dominion, Vanguard, Rite, Tomb's Blessing;
  - Undead Resilience, Mordwyn's Command, Ancient Power, Death Knight's Honor.
- Dead Man's Weight: all enemy units SPD -N for 3 rounds + per-unit Confusion. It used to add a flat +5% damage taken.
- Stacks now persist:
  - The Haunting: ATK per round attacked.
  - Relentless Dead: ATK per round an enemy is slowed.
  - Death Touched: DEF -1.5 per drain on that unit.
- Dead Weight, Rotting Armor, Rotting Flesh and Veyra's Hunt max apply DEF-down to the slowed/poisoned units only.

**Coverage:** every Ashen Dead skill changes combat in leave-one-out. In single-skill isolation, the conditional ones (drained/poisoned/slowed enemies, Focus-only) need their partner skills, as intended.

**Checks:**
- Whole game: 470/576 in single-skill isolation; Dark Presence now only boosts Focus damage.
- PvP mirror 91/180. PvE unchanged.
- Tests: 3 new. `npm test` 469/469, build OK.

## 2026-09-23 — Claude — Wizards fully implemented + mixed-army loss fix

All 6 commanders (h5 Vex, h6 Mira, h17 Dov, h18 Oren, h29 Theon, h30 Ryn) were checked against their descriptions. The Wizard skill set is `BOUNTYHUNTERS_SKILLS` in `wizards_skills.js`. 38 handler types were rewritten for the per-unit commander path; the troop/legacy path is kept. Shared types (`cmd_foc_passive`, `army_evasion_per_round_chance`, `enemy_status_def_down` incl. frostbite, `cmd_focus_dmg_bonus`, `multi_hit_random_atk_stack`) stay generic for Coldborns/Ashen Dead.

**Engine support:**
- `skillSlotPred` accepts a function.
- New ctx helpers:
  - `defSlotSpd` (for % Slow);
  - `dotUnits(kind)`, the enemy units carrying our DoTs;
  - `clearDots(ti)`.
- `vsMult` matches `slowed` / `poisoned` units and applies Wise Wizard's escalation (`rs.escalate`, per hit the unit has taken).
- Commander:
  - `cmdFocDmgUp` (Meditation, focus damage);
  - `normalIgnoreDef` (Hit the Gym);
  - `cs.focVuln` (A Wizard's Power: the unit's next Focus hit taken +X%, from the next round);
  - `burnDmgResist` on Burn-type hits (Tidal Wave).
- Units:
  - `minDmgUnits` (Powerful Suppression: minimum damage next round);
  - `slotBurnImmune` (Bound to Me max).
- `troopLossReduce` (Tiler) is applied to the attacker's final losses (max 50%).

**Notable fixes:**
- Nearly every Wizard active added its damage to the legacy focus pool or `cmdMult` and applied stun/burn/confusion/poison army-wide. They are now per-unit hits and statuses:
  - Shock Wave, Blade of Fire, Lightning Blade, Riddle Me This, Hourglass;
  - Poison Arrow, Poisoned Blade (highest DEF);
  - Flaming Arrow (Dragon priority), Many Trophies (+60% on Dragon units);
  - Hexblade (6 random hits, +10 CMD ATK per unique unit);
  - Blinding Speed (SPD-scaled), Lieutenant of Spellblades (SPD +100% for 2 rounds).
- Game Over hits each enemy unit for 10% plus 100% per debuff it strips from that unit (stun/confuse/blind/burn/DEF-down/slow/our DoTs).
- Mind Games: guaranteed enemy commander Confusion; allies +X% vs slowed units for the rest of the battle.
- Battle Mage / Small and Quick: flat commander FOC / ATK / SPD (they were ignored or used as %).
- Mage's Secret Knowledge / Hit the Gym read the commander's FOC / ATK this round.
- Front Line Combat, Destroy All Creatures, Feel the Burn and A Bad Time now apply only to the matching units (they were army-wide).
- Bound to Me, Golem Master, Wizard Onslaught: only their branch.
- Plenty of Stamina max gives commander confusion immunity (it gave stun immunity).
- Keep Taker max: commander stun immunity at a Keep.

**Mixed-army loss fix (all factions):**
- Final losses used the PRIMARY slot's HP per troop for the whole army. In an army mixing unit sizes (e.g. Spellblades + Golems) that made losses read as 0.
- Losses, `atkSlotTroopsEnd` and `defTroopsEnd` are now counted per slot from each slot's own HP per troop.
- PvE results are unchanged. Per-hit log counts (`atkRemaining` etc.) still use the primary slot's HP per troop.

**Owner decisions (follow-up):**
- **Still Standing?:** DEF -N lasts 1 round.
- **Testing the Water:** only DEF scales, 9% → 40% at 7/7 (`perLevel: 0.31/6` in `wizards_skills.js`). DMG -9% is fixed.
- **Game Over max:** a unit killed by a Game Over hit sets `cs.pendingSkillBonus` = 20%, so the next skill activation deals +20% (hit option `onKillBonus`, logged "kill!").

**Coverage:** every Wizard combat skill changes combat except Curtain Call (round 10), Still Standing (round 7), Tidal Wave (needs enemy Burn) and Keep Taker (Keep tiles). The other 7 are map-only.

**Checks:**
- Whole game: 471/576 commander skills change combat.
- PvP mirror 91/180. PvE unchanged.
- Tests: 5 new. `npm test` 466/466, build OK.

## 2026-09-23 — Claude — Pirate + Orc Burn is per unit

Owner: "fix the pirate skills", then "fix orcs too" (Burn should work like the Dragons' per-unit Burn).
- **Hot Sauce:** every enemy unit is Burned individually. Its max level (burned units DEF -10) now applies to those units only; it used to be army-wide. That max key is marked handler-owned.
- **Flaming Skillet (max):** each of the 3 units hit rolls its own Burn.
- **Soup's Hot:** only the attacking unit is Burned (-20% on its own damage). An attacking commander gets `cmdBurned`. It used to Burn-debuff the whole attacking army.
- **Cook's Barrage** (+X% vs Burn) and **Keeping the Heat Up** (follow-up vs Burn) check the unit being hit. They used to apply whenever any Burn was active, and Keeping the Heat Up doubled all troop damage on a roll.
- **Fire Breath** was converted in the Dragons batch.
- **Orcs:**
  - **Shaman's Final Surprise:** the unit hit rolls its 40% Burn.
  - **Master of None:** each enemy unit rolls its 30% Burn (poison and bleed unchanged).
  - **Easy Targets (max):** the Ranged unit hit rolls its 30% Burn.
  - All three used to Burn the whole enemy army. No commander skill calls the army-wide `applyBurn` any more; troop skills still do.

**Checks:** every Samuel skill, and every Orc Burn skill, helps in leave-one-out. PvP mirror 92/180, PvE unchanged. 1 new test; `npm test` 461/461, build OK.

## 2026-09-23 — Claude — Dragons fully implemented

All 6 commanders (h11 Emberclaw, h12 Scaleveil, h23 Kraul, h24 Cinderfang, h35 Skar, h36 Nyxara) were checked against their descriptions. 39 handler types were rewritten for the per-unit commander path; the troop-skill path keeps its old behaviour. Types that other factions share (`focus_damage_single`, `branch_flat_def_bonus`, `branch_phys_dmg_reduce`, `aoe_focus_damage_foc_mod`, `heal_two_units_dragon_bonus`) are written generically, and branch `"all"` means every unit.

**New per-unit statuses (commander skills):**
- **Burn** (`burnUnits`, `rs.burnedUnits`): each unit rolls its own chance, and a burned unit deals -20% this round. "Vs burning" bonuses (Charred, Dragon Inferno max) check the unit being hit. Pirate burns still use the older army-wide Burn.
- **Blind** (`rs.blindedUnits`): the unit's next attack misses.
- **Slow** (`rs.unitSpdDown`): -N SPD for that unit in the turn order.

**Other new engine support:**
- `slotPhysResist`: physical damage received -X% on a unit.
- `slotConfusionImmune`, `slotVenomImmune`.
- Thorns (`rs.thorns`): Tough Skin reflects physical hits back to the attacking unit.
- `firstHitsRed`: Elder Dragon, each unit's first N hits.
- `stripBuffs`: Clear the Air removes the enemy's positive stat buffs for the round.
- Heal-on-debuff: You Get a Heal!, after both sides' skills.
- Fixed-target skill hits (`ti`).
- `prioRank` now accepts singular faction names ("prioritiseWizard").

**Notable fixes:**
- Flame Dive: `bleedChance: 0` fell back to a 60% Bleed. It now applies its 45% Burn to the units hit.
- Fire Volley: 5 hits on random units, each rolling Burn on its own unit (was an army-wide multiplier). The max-level bonus hit on a Wizard unit is added.
- Ember's Entertainment: Burn damage to every unit on the normal attack, plus the max-level 15% Burn chance.
- Flame Dancer / Future King / To Become an Elder / My Will vs Yours / Dragon Supremacy: flat commander ATK/FOC/SPD were applied as % or not at all.
- Flat DEF/HP skills (Dragon Garrison, Me Little Army Big, I'll Work With It, Dragon Supremacy) were applied as +N%.
- Superior Race, Tough Scales, Dragon Dance, Fire Fight, Locked In and I'll Work With It now affect only their branch or unit type.
- Dusk's Blast, On the Prowl and Earthquake: every unit is hit and each rolls its own stun/slow (was the whole army at once).
- Sniper, Meet Your Maker, Lightning Storm, Dragon Snack (melee +50%), Dragon Inferno, I Can Help and Don't Underestimate Me now use per-unit hits and statuses.
- Mind over Matter: guaranteed enemy commander stun, with ATK -N for 2 rounds.
- Dragon Scales: each Dragon unit rolls Poison/Venom immunity once, at battle start.
- Back Line Healer / Dragon's Song: heals limited to the units they name.
- Cauterize: when it fires, this round's incoming debuffs get its cleanse chance.

**Coverage:** every Dragon skill changes combat in leave-one-out except:
- Map-only: Siege ×2, Gatherer, Pather.
- Dragon's Hope: round-8 heal.
- Cauterize and You Get a Heal!: need enemy debuffs; You Get a Heal! is verified in tests.

**Checks:**
- Whole game: 469/576 commander skills change combat.
- PvP mirror 92/180 attacker wins. PvE unchanged.
- Tests: 5 new. `npm test` 460/460, build OK.

## 2026-09-23 — Claude — Holy Knights fully implemented

All 6 commanders (h37 Aldric, h38 Vayne, h39 Brennan, h40 Seraph, h41 Dante, h42 Mourne) were checked against their descriptions. 35 handler types were rewritten for the per-unit commander path; troop-skill users of the same types (`decaying_dmg_reduce`, `per_round_def_stack`) keep their old behaviour.

**Engine support (small, shared):**
- Stun immunity: `rs.cmdStunImmune` (commander), `rs.unitStunImmuneAll` / `rs.slotStunImmune` (units). `earlyRoundStunImmune` (Commander Guidance max) is now read too.
- `rs.selfConfusedUnits`: our own units confused by our own skill.
- `requiresNormal` skill hits: "after the commander attacks" extras only fire if the normal attack happened.
- Per-unit hit counters in `damageSlot` (`cs.unitHits`, `cs.hitsTaken`).
- `rs.decayRed`: The People's Hero, per unit and per hit, in `vsMult`.
- `rs.firstHitsEvade`: Commander In Arms, each unit's first N hits.
- `rs.divinePrayer`: cleanse roll when our commander is stunned, confused or silenced; a failed roll adds a DEF stack.
- `rs.healCut`: Last Hope's permanent heal block on its units' share.

**Notable fixes:**
- Heaven's Hammer added focus damage and stunned the whole army. It is now physical, 1 unit, guaranteed stun. Got Ya: focus, 1 unit, guaranteed stun.
- Smite / Last Ride now hit every enemy unit (they were a flag nothing read).
- Mourne's Special / The Wise now deal their Focus damage after the normal attack (were never read).
- Will of the Templar / Will of an Inquisitor: enemy DMG -X% for rounds 1–4. They wrote fields nothing read.
- Defense in Numbers stacks now persist through the battle and are +5 flat DEF. They reset each round and were +5%.
- Warrior's Burden: from round 4 Aldric's FOC and SPD are halved and HK units get HP/DEF +N for the rest of the fight. It was only a log line.
- Promise Land: +N commander ATK per hit the army takes (max 6).
- Power Drain: enemy commander ATK down (7 × level, -10 per round).
- Maniac's Poison: a poison DoT on 2 units plus heal block. It used the frontline legacy venom.
- Priests' Prayer / Power of Sun (day only): max-damage chance on HK units. Do You Believe: HK unit focus resist.
- Here We Go Again: at night, HK take less damage from COTN; at day (max level), HK deal +10% to COTN. It used to reduce damage from everything.
- Erratic Eradication, Target Practice, Mad Ruler, Blessed Judgement (HK heal + melee max bonus), HK Protector (second heal on a 50% roll), Healing Touch, Patch You Up, Rally the Inquisitors (follow-up + permanent unit stun immunity), Inquisitor's Domain, Cleansing Faith, Heaven's Protection (one roll, rounds 1–4), Stoic Hero, Divine Prayer.
- **Whatever It Takes:** each unit rolls. Level scales both chances, ally 7% → 49% and enemy 10% → 70% at 7/7. Owner: intended as high risk, high reward.

**Coverage:** every HK skill changes combat in leave-one-out except Last Resort (round-8 heal; battles rarely reach round 8). Divine Prayer and the stun immunities only show against a stunning enemy; verified in tests.

**Checks:**
- Whole game: 466/576 commander skills change combat.
- PvP mirror 92/180 attacker wins. PvE unchanged.
- Tests: 7 new. `npm test` 455/455, build OK.

## 2026-09-23 — Claude — Per-unit DoTs/statuses + Night Creatures fully implemented

**Per-unit (owner: "fix venom/bleed ticks, %HP strikes, confused self-hits"):**
- **DoTs:**
  - Each side keeps `S.dots` (`{ ti, kind: venom|bleed, pct, rounds, start }`). A DoT ticks on the unit it landed on (venom = applier's FOC, bleed = applier's ATK) and ends when that unit dies.
  - Commander skills attach DoTs to their hits (`hit.dot`, with optional per-unit `chance`, and `spread` for Bleed-spread max). Evaded hits don't apply them.
  - `addPoison` makes a DoT-only hit on n units; `attachBleed` rides the skill's own hit.
  - Legacy flags (`pendingVenomDmg`/`bleedApplied` from troop skills and unconverted factions) become a DoT on the enemy's frontline unit at round end.
- %HP strikes hit one unit (frontline first) for X% of that unit's max HP. A confused commander hits one own unit.
- **Stun / Confuse are per unit.**
  - Commander skills set `rs.stunnedUnits` / `rs.confusedUnits` (enemy slot indexes; each unit rolls its own chance) or `rs.enemyCmdStunned` / `rs.enemyCmdConfused`. A stunned unit skips its action; the rest of the army still fights.
  - Legacy army-wide counters remain for troop skills.
  - Converted: `stun_chance`, `physical_damage_stun_chance`, `cmd_stun_chance`, `on_skill_stun_chance`, `aoe_multi_status` (stun max), `confusion_vs_alignment`, `cmd_stun_or_confuse_by_faction`. Orc and pirate results unchanged in the leave-one-out sweep.
- **Other per-unit engine support:**
  - `targetEvades` (army evasion + unit `slotEvadeNext` / `slotEvadeChance` / `invisibleSlots`; Bleed-prevents-evasion);
  - `unitDefFlatDown`, `unitVuln`;
  - own-slot `slotAtkMult` / `slotDmgTakenMult` / `slotMaxDmgChance` / `slotFocusResist` (focus skills, focus normal attacks, magical troops, venom);
  - `useStat:"spd"` for "(modified by SPD)" skills;
  - `nth` (each hit on a different unit);
  - first-N-hits protection and Leader's Rage hooks in `damageSlot`;
  - enemy commander FOC down;
  - `ctx.isNight` (`defTile.isNight` override, else UTC 18:00–06:00, same rule as before).

**Night Creatures:** all 6 commanders (h43 Serava, h44 Malachar, h45 Groth, h46 Korrax, h47 Skitter, h48 Thalyssa) were checked against their descriptions and implemented, with 48 handler types rewritten. Notable fixes:
- Eight Eyes cleared the ENEMY's confusion; it now grants our immunity (rolled once, rounds 1–4).
- Fangs Ambush dealt focus instead of physical damage.
- Vampire's Thrall / Compulsion confused the whole enemy army; now 2 units / the enemy commander.
- War General's FOC was applied as focus-skill damage.
- Protect My Children / Pack Protection flat DEF was applied as %.
- Night Terror's day penalty now shrinks with level (20% → 6% at 7/7, per its text).
- Pack's Charge hit count = skill value, with the night max-level range.

**`mal_double_tap`:** the Dragons "shared skills" copy used type `cmd_normal_atk_bonus_focus` (no handler) and overrode the NC original in `ALL_SKILLS`. It now uses the same `focus_damage` type. The key is kept so spent points aren't lost.

**Coverage:** Leave-one-out shows every NC skill changes combat except:
- Supply Specialist and Scurrier: map-only.
- Power in Numbers: all-Spider army only; verified.
- Thick Skin: needs focus/poison damage on mounted units; verified, losses 6,158 → 5,728.

`mal_blood_transfusion` is still flat-format and works via the flat path.

**Checks:**
- Whole game: 456/576 commander skills change combat.
- PvP mirror 92/180 attacker wins.
- PvE unchanged vs the targeting batch.
- Tests: 5 new. `npm test` 448/448, build OK.

## 2026-09-23 — Claude — Per-unit targeting (owner spec)

The owner's rule: an AoE that hits an army with 3 different units deals 3 separate hits, one per unit, because the units have different stats and skills. Owner answers:
- multi-target skills hit that many separate units, chosen by priority;
- normal attacks hit a single unit, **frontline first**.

**Normal attacks** (troops and commanders, both sides):
- One target unit: melee → mounted → ranged/siege, and within a group the unit with the most troops.
- The damage uses that unit's DEF (× its side's DEF buffs, − the attacker's DEF-down debuffs), size modifier and "vs X" bonuses.
- Overkill spills to the next unit in frontline order (`damageSlot`).
- `on_hit_received` and the counter-attack come from the unit that was hit.
- Miss/evade stop only the normal attack. Extra normal attacks (Pirate Vet, Creature Hunter) are real extra attacks.

**Commander skill damage = separate hits** (`rs.skillHits`, `addSkillHit`), resolved in `commanderAct` after the normal attack:
- `n` units (`targets: 2`, `hits: 3` different units), `"all"` (one hit per living unit), or `random` (independent random picks: Cannon Volley, Korgath's Brutality, Ironjaw Crush).
- Priority from skill data: `prioritise`/`target` (ranged, melee, mounted, large, lowestDef, highestDef, highestDmg, faction). Unknown keys fall back to frontline order.
- Per-target bonuses: `bonusIf` (Easy Targets vs Ranged, Experienced Fighter max vs Melee, Large Bonus). `onlyIf` (Orc Hunter's "+Y% to 1 random Orc unit" only hits an Orc unit).
- Formulas: the engine's existing, previously unused `calcCmdPhysicalSkillDmg` (ATK × coefficient × (2 + command factor), vs the target's DEF) and `calcCmdFocusSkillDmg` (FOC skills / Burn, ignore DEF).
- Each hit rolls crit and target evasion separately. "Skill DMG +X%" and "Burn DMG +X%" scale the queued hits.
- "+X% vs <faction/alignment/role/size> units" passives are now checked per unit hit (`rs.vsTarget`, `vsMult`). "Damage received FROM <faction> units −X%" is checked per attacker (`rs.resistFrom`).
- Normal-attack-only modifiers moved off `cmdMult`:
  - `cmd_normal_atk_bonus` → `rs.normalAtkBonus`;
  - "normal attacks also hit all units" and "normal attacks add X% Burn" → extra hits;
  - `rs.cmdMult` now means "all commander damage".
- Converted for orcs and pirates (all their damage types). Other factions still use the old single-multiplier path; any leftover `focusDmgBonus` on a physical commander becomes one focus hit. All 446/576 working skills still work (no regressions in the per-skill sweep).

**Results:**
- PvP mirror: 84/180 attacker wins (47%).
- PvE vs original engine (orc army, no skills): P1–P5 within a few %. **P6–P8 are easier** (P6 at equal Command 50% → 95% wins), because focus fire kills enemy units, and their damage, sooner. P10–P12 unchanged to slightly harder. Garrison tuning may be wanted.
- Not per-unit yet: DoT ticks (venom/bleed), %HP nukes and confusion self-damage still spread over all units.

Tests: 4 targeting tests. `npm test` 443/443, build OK.

## 2026-09-23 — Claude — Commander skills Phase 2: Pirates fully implemented

All 6 pirate commanders (h1 Fynn, h2 Samuel, h13 Brine, h14 Saltwhisper, h25 Reck, h26 Seyne), 71 unique skills (owner's custom set), were checked against their descriptions and implemented in `shared/utils/battle.js`. Leave-one-out test: full kit maxed, each skill removed in turn, 4 army mixes × 4 enemy factions × 2 seeds. Every pirate skill changes combat except:
- Crew's Anchor and Treasure Hunter: non-combat (march / gathering), already wired;
- Around the Block and Defense Against Dark: need an enemy that stuns or deals focus damage. Verified separately: resists stuns vs Bruk; losses 5,745 → 4,953 vs Grix.

**New engine hooks (both sides, via the two-sided loop):**
- Incoming debuffs on a commander can be resisted: `rs.cmdDebuffImmune` (Shadow's Drunken Warrior), `rs.debuffChanceReduction` (Around the Block), `rs.debuffResistChance` (Cleanse, troops too).
- Self-confusion: Captain's Honor sets `rs.selfConfused`, going through `debuffCommander`, so it can be cleansed or trigger Retaliation. Per-round confusion immunity (`cmdConfusionImmune`/`atkConfusionImmune`) blocks it.
- Pursuit (`rs.pursuitActive` troops, `rs.cmdPursuit` commander at Seeing Through Fog max) skips miss/evade checks.
- `rs.evadeHits`: Fog of War evades the next N enemy hits.
- `rs.focusDmgResist` (Defense Against Dark) reduces enemy focus-commander hits and magical-troop hits.
- `rs.onEnemyAttackBurnChance` (Soup's Hot): an attacker can Burn itself when it hits this side.
- `rs.healReceivedBonus` (Steady Hands) is applied to all heals at heal time.
- **Focus skill damage for ATK commanders.** `rs.focusDmgBonus` (Burn/FOC-mod skills) used to count only when the commander's normal attack was FOC-based. It now adds its own FOC-scaled skill part, ignoring DEF, on physical commanders too. This helps every faction's focus skills.
- Burn damage tracking (`addBurnDmg`): Used to Heat's "Burn DMG +X%" scales it, Keeping it Spicy's max adds to it, and Pirate Cook stacks DEF per burn-damage instance.
- Drunk (`markDrunk`) lasts **the round it lands + the next round** so Reck's Whiskey Barrel (3/6/9) feeds Cat Got Your Tongue (4/8). Assumption; the skill text gives no duration.
- `ctx.isAttacking`: "While Attacking" / "Defending" skills (I Charge, Lead the Charge, Onboarding, Leader of the Tribe defending bonus) now respect which side the commander is on.
- Slot/group matching supports "humans"/"creatures" alignment (Protect the Weak, Gather My Crew).
- `cs.buffs` apply functions receive `(rs, roundLog, actor)` so delayed effects can log.

**Shared handlers changed (also affect other factions using the same type):**
- `hk_triple_stat_bonus`: DEF/SPD now real, level-scaled, on own-faction units.
- `physical_damage_faction_bonus`: bonus only vs that faction; level-scaled.
- `physical_damage_stun_chance`: log uses the skill name.
- `faction_def_bonus`: now applies.
- `dmg_type_resist_all`: now applies.
- `aoe_burn_guaranteed` / `burn` handlers no longer reduce our own damage.
- `dmg_bonus_vs_alignment`, `dmg_bonus_vs_role`, `dmg_bonus_vs_faction_all`, `confusion_vs_alignment`, `enemy_faction_vulnerability`: now conditional.
- `per_round_confusion_immune_chance`: sets real immunity flags.
- `heal_all`: uses the level-scaled value.
- Removed a dead duplicate `faction_dmg_bonus` case and the orphaned `debuff_chance_reduction` lines.

**Open design question:** multi-target / AoE skills ("[2 Enemy Units] X%", "All enemies X%") deal X% once against the pooled enemy HP. "Normal attacks hit ALL enemies" (Korgath's Surprise, Sweeping Strike) is the exception and scales by enemy unit count.

Tests: 3 new pirate tests. `npm test` 439/439, build OK. Mirror PvP ≈ 47% attacker wins; PvE unchanged vs last batch. 446/576 commander skills now change combat (other factions still to do).

## 2026-09-23 — Claude — Two-sided battle engine (PvP parity) + defender troop skills fixed

`simBattle`'s round loop is rewritten so **both armies run through the same code** (owner: "PvP should function the same when real players are on the map; speed determines turn order"). Setup, report, XP and win-% are unchanged.

**Before:**
- Only the attacker had commander skills, heals, DoTs and statuses.
- Every troop skill of **both** sides wrote into the attacker's round state. A defender's "bonus damage"/"double attack" boosted the attacker's next hit; its "enemy DEF down" lowered the defender's own DEF; the attacker's counter-attack skill made the *defender* counter.
- Attacker skills that "block enemy heals" blocked the attacker's own heals.
- The attacker's own `enemyAtkReduce` was subtracted from its own damage.
- The walls/fort bonus also multiplied attacker troop damage.
- Commander strikes, venom, bleed and %HP nukes reduced `defTroopHp` but not `defSlotHp`, so the next troop hit (which recomputes HP from slots) erased that damage. Same on the defender side.

**Now:**
- Sides `A`/`D` each have their own round state `S.rs`, commander-skill state (`S.cs`), duration buffs, DoTs, heal-block counter, lost-HP / heal-decay pools and class bonuses (attacker/strategist/balanced for the defender too).
- Per round:
  1. each side's hero skills (flat + structured) run into its own state;
  2. venom/bleed ticks;
  3. round_start troop skills;
  4. skill log;
  5. heal block (a side's `blockHeal` blocks the other side);
  6. walls/fort bonus on defender damage only;
  7. heals for both sides;
  8. %HP nukes;
  9. speed order across both commanders + all slots (own SPD buffs, enemy SPD-down debuffs; speed ties decided by one coin flip per round instead of always attacker);
  10. `commanderAct` / `slotAct` identical for both sides — a side's "enemy*" fields (stun, silence, confuse, miss, evade, ATK/DMG down, DEF down, burn) act on the other side;
  11. round_end troop skills.
- All damage goes through `damageSide()` (spread over living slots by HP share); heals through `healSideHp()`.
- Defender log lines keep their labels ("Enemy Cmd", "Defenders") and are tagged `isPlayer:false`. `BattleLog.jsx` no longer counts defender heals as attacker healing.
- `defCommand`: PvE garrisons keep `commandBudget`, Spawns keep `troops`. A player commander defending (PvP) now uses the attacker's army-command formula instead of the raw troop count.
- AI faction garrison commanders (P4+) already carried `skillPoints`, so they now actually use their skills.

**Verification:**
- Mirror PvP: identical armies, 4 commanders × skills on/off, 20–30 seeds. Attacker win rate ≈ 47% (was up to 2:1 before the tie-break fix).
- PvE vs old engine (orc army, no skills, 20 seeds): P1–P6 within a few %; P7–P8 easier (commander damage no longer erased); P12 somewhat harder (AI commander skills).
- Tests: 3 new PvP tests. Orc skill tests aggregate over 10 seeds. `npm test` 436/436, build OK.

## 2026-09-23 — Claude — Commander skills Phase 2: Orcs fully implemented

All 6 orc commanders (h9 Grimtusk, h10 Ashgrip/Groth, h21 Warcroak, h22 Grix, h33 Korgath, h34 Bruk), 71 unique skills, were checked against their descriptions and implemented in `shared/utils/battle.js`. Tested leave-one-out: full kit maxed, each skill removed in turn, 4 army mixes × 4 enemy factions × 2 seeds.

**Engine additions:**
- Persistent per-battle commander state (`newCommanderSkillState`, `ctx.cs`). It carries timed buffs, multi-round poison, stacks and self-debuffs across rounds; `rs` is rebuilt every round.
- Actives now resolve before passives, so "vs stunned / bleeding / poisoned" passives see this round's statuses.
- "Skill damage +X%" (Grim's Focus, Human Scum, Retaliation, first-skill max bonus) now scales that round's active-skill damage.
- Helpers:
  - `armyShare`/`armyAvg`/`armyAll`: branch/faction/"mounted"-role bonuses scale by the share of the army they cover, and flat +N DEF/HP become multipliers from real unit stats;
  - `enemyIs`: faction or alignment conditions;
  - `applyBurn` (enemy DMG −X% this round, new `rs.enemyBurnPenalty`);
  - `addPoison` (multi-round DoT);
  - `setBuff`;
  - `debuffCommander` (Can't Stop Me cleanse + Retaliation trigger).
- New consumers:
  - `rs.atkEvadeNextHit` (next enemy hit can be evaded);
  - `rs.enemyBurnPenalty` (defender cmd + slot damage);
  - `rs.enemyHealBlocked`. Commander heal-block used to set `rs.blockHeal`, which blocked the *attacker's own* heals.
- "mounted" group = `branchDef.role === "mounted"` (adds inquisitors and werewolves).

**Bugs fixed in shared handlers (also help other factions using the same types):**
- `physical_damage_followup`, `physical_damage_self_debuff`, `physical_damage_large_bonus` did `rs.cmdMult = 0.27 / 1.0 / 0.30`. That overwrote commander damage instead of adding to it.
- `physical_damage_bleed` had no damage component.
- `burn_damage_apply` also added `enemyAtkReduce`, which is subtracted from *our* damage.
- `dual_poison_dot_def_down` set `bleedRoundsLeft`.
- Flat "+N DEF" skills (Iron Dense, Lead the Charge) were applied as N%.
- Faction/size-conditional skills applied against every enemy.
- Removed 2 dead duplicate `case` labels (`dmg_bonus_vs_size`, `physical_damage_heal_block`). 24 other duplicate labels + 2 unreachable blocks remain in other factions' sections. One is pirate `debuff_chance_reduction`, whose `case` label is missing.

**Data:** `war_lifeline_of_tribe` max key `werewolfCombatSpd` → `orcCombatSpd` (owner: "should be orcs").

**Non-combat:** Orc Explosives / `army_siege_bonus` → `getPassiveBonuses().siegePerTroop`. `skillSiegeBonus(cmd, troops)` is added to the siege bonus in `useMarch` (incl. `attackerComposition`, so the server recomputes the same number) and `useFortressSiege`. Interpreted as +N siege **per troop**.

**Still not active (by design / pending):**
- Retaliation and Can't Stop Me only trigger on debuffs to our own commander. Grimtusk has no self-debuff and enemy commander skills don't run yet.
- Focus Fire (Coordinated Assault) has no extra effect in the pooled-HP model; its damage works.
- Stun/confusion/madness immunities have no enemy source yet.

**War Leader's Plans (owner spec):**
- Rule: +N DEF and +N HP (flat, per unit) for every **4** Command more than the enemy. N is the skill value, 7 at max.
- Command = troops × `COMMAND_COST`, so 57 command = 5,700 small troops. It's computed for both sides from what is alive each round (`ctx.atkCmdReal`/`defCmdReal`).
- Example: 80 vs 55 → 6 steps → +42/+42.
- Desc updated to "every 4 more Command".

**Siege:** owner confirmed "+N per troop".

**Command units (investigated, reverted):**
- `atkCommand` = `totalArmyCommand` (costs 1/2/25) is 100× real Command.
- Defenders use `dc.commandBudget` (real Command, PvE garrisons) or `dc.troops` (player commanders, so PvP is on the same 100× scale).
- Making both sides real Command made PvE need ~2× the tile's Command. The owner said PvE is tuned around the current behavior, so the change was reverted. PvP was already roughly symmetric.
- Orc tests keep the "wins sooner or deals more" comparison.

**Other finding:** `mal_double_tap` exists in both nightcreatures and dragons with DIFFERENT definitions; the dragons one wins in `ALL_SKILLS`.

Tests: 5 new orc tests in `tests/commanderSkills.test.js`. `npm test` 432/432, build OK.

## 2026-09-23 — Claude — Commander skills now apply in combat (Phase 1) + new pirate skill set

**Audit findings (before this change):**
- No commander skill worked in real play. CommanderScreen saves spent levels to `cmd.skillPoints`, but `getActiveSkills`/`getPassiveBonuses` only read `cmd.skillLevels`, which nothing sets. That also switched off the Supply Specialist / Orc March passives.
- Even with levels present, structured skills (`effect:{type}`: 560 across 8 factions) never reached combat. Battle only applied the old flat fields (`cmdMult`, `healPct`, …). The `case` handlers in `procTroopSkills` were only ever called for troop skills.
- `maxLevelEffect` sits on the skill, but handlers read `eff.maxLevelEffect`, so all 190 max-level effects did nothing.
- 22 handlers added flat DEF points (5, 10 …) to `rs.enemyDefDown`, which damage treats as a fraction. That would have produced negative DEF once the handlers ran.

**Fixes (`shared/utils/battle.js`, `shared/constants/skills.js`):**
- `getActiveSkills`/`getPassiveBonuses` read `cmd.skillLevels ?? cmd.skillPoints`.
- `procTroopSkills`' switch moved into `applySkillEffect()` (troop behavior unchanged). Free variables it referenced (`defTile`, `atkSlotResolved`, `cmdAtkStat`, `bleedRoundsActive` …) now come from a `ctx` argument.
- New `applyCommanderSkillEffects()` runs right after `applyInstantEffects`. Actives run on their fire rounds, passives every round. `effect.value` = level-scaled `base + perLevel×(lvl-1)`. At max level (main 15 / side 7), `maxLevelEffect` is attached and its param keys override effect params.
- New `applyMaxLevelBonuses()` handles the common max bonuses generically:
  - commander ATK/FOC/SPD +X (new `rs.cmdAtkFlat`/`cmdFocFlat`; `rs.cmdSpdBonus` now affects turn order);
  - enemy ATK/SPD −X;
  - unit-group HP/DEF/DMG range/combat SPD/DMG%, with groups pirate/orc/hk/dragon/coldborn/warg/werewolf/skeleton/mummy/spider/mounted/army;
  - conditional "vs drunk / debuffed / poisoned / bleed-or-burn / frostbitten" DMG;
  - conditional DEF −X vs burned / slowed / drunk / creatures.
- Flat DEF points moved to a new `rs.enemyDefFlatDown` (subtracted from DEF). The fraction is capped at 0.9.
- World-map: a skill at max with `maxLevelEffect.marchSpeedBonus` adds to march speed.
- Measured with each skill maxed alone, vs 4 enemy factions: **392/576 skills now change combat** (was ~16). **125/190 max-level effects** change combat.

**Pirates (`shared/constants/pirates_skills.js`):**
- Replaced with the owner's custom 72-skill set.
- Renamed the keys that collided in `ALL_SKILLS`: `mou_protect_the_weak`→`pir_protect_the_weak` (Holy Knights), `bre_cleanse`→`pir_cleanse` (Holy Knights), `tha_many_trades`→`pir_many_trades` (Night Creatures).
- Treasure Hunter: removed `notImplemented` / "Coming Soon". Gathering exists and `gathering_bonus` is wired.
- Captain's Honor scales from +4% (Lv1) to +20% (Lv7). Its handler now uses the level-scaled value.
- `"humans"` alignment tags are intentional (owner).

**Still not working (Phase 2+, per faction):**
- ~184 skills still don't change a battle:
  - they set state nothing reads (248 of 280 handler state fields are unread: burn damage, confusion on self, evasion, pursuit, first-skill bonus …);
  - or they're non-combat;
  - or they're immunities.
- Defending commanders' skills never apply, in any format, so enemy stuns/confusion don't exist yet and immunities have nothing to block.
- 262 handlers ignore `eff.value`, so those skills don't scale with level.
- Data notes:
  - `war_lifeline_of_tribe` max key is `werewolfCombatSpd` but the text says "Orc Units SPD";
  - Night Creatures `mal_blood_transfusion` is still flat-format (works via the flat path).
- Balance will shift a lot now that skills apply; some self-debuff skills (double-edge) currently net-hurt.
- Tests: new `tests/commanderSkills.test.js`. `npm test` 427/427, build OK.

## 2026-09-23 — Claude — Real cause of "fort busts missing" + tap fix (verified end-to-end in the browser)

- **March fields lost after the first step (affects everything)**: the game-loop worker's march snapshot carries only timing fields, and Game's `onMarchStep` *replaced* `cmd.march` with it. So `dest`, `origin` and `destFortId` disappeared after one step:
  - reposition arrivals never stationed (no busts, and demolish recalled nobody);
  - `recallMarch` lost its origin.
  
  The step patch is now merged into the existing march, and a late step from a replaced march (different `startedAt`) is ignored.
- **Taps on clickable `<div>`s were dead on phones**, e.g. the fort commander picker rows. The `main.tsx` touch guard (mobile polish batch) called `preventDefault` on any non-button touch outside a scroll area, which cancels the click. Targets with `cursor:pointer` now pass through.
- **Forts**:
  - When the build completes, the fort auto-stations the player's commanders standing on its tile, up to capacity (`useForts` ticker, now every 2s).
  - FortPanel 📍 MOVE always opens the picker, even with one commander.
- Verified with Playwright (test campaign): assign troops → capture a tile → build → finish → auto-station shows the bust → MOVE picker → reposition → 2/2 stationed → demolish → finish → both commanders march home.

## 2026-09-23 — Claude — Forts: offline until built, army needed to move in, stationing fixes

- **Offline until built:**
  - `buildAnchors` skips `isBuilding` forts.
  - TilePopup `checkRange` ignores an unbuilt station fort.
  - `stationAtFort` and `startReposition` refuse an unbuilt fort, and FortPanel hides 📍 MOVE while building.
  - `buildFort` no longer auto-stations the commanders standing on the tile.
- **Moving to a fort needs ≥1 troop**: enforced in `startReposition`, FortPanel and the reposition picker, using `cmdTroopCount`. `recallToFort` (a 0-troop commander going back to its fort) is unchanged.
- **Stale fort data**:
  - `useForts.fortsRef` and Game's `fortsRef` now update during render, not in an effect. `getFortAtTile` had been returning the previous state, so the popup could show "0/2 stationed" and no busts after stationing.
  - TilePopup now reads the fort from the `forts` prop.
  - A reposition arriving at a missing or unbuilt fort just stands there instead of setting a dangling `stationedFortId`.
- With stationing fixed, demolish/abandon recalls the stationed commanders home (the `bfsPath` fix from the previous entry).

## 2026-09-23 — Claude — Fort fixes + test save export/import

- **FortPanel** now shows the build/upgrade countdown (`completesAt`) and hides UPGRADE while busy. Before, a fort looked finished right away even though it was really building for 2 hours.
- **useForts**:
  - `upgradeFort` refuses while building/upgrading. Upgrading mid-build overwrote the build timer and left the fort stuck.
  - `destroyFort`: commanders standing on the fort get a real recall path (`bfsPath` + `marchStepMs(60)`). Before, their march had `path: null`, the game loop cleared it with `tk: undefined`, and the commander vanished.
- **Game.jsx**: the demolish/abandon floaties passed `null` as the tile key, and `floaty()` then threw (`k.split`). They now use the fort's tile.
- **Test mode**:
  - Admin → Timers lists fort demolish/abandon timers separately from build/upgrade (`finishFortRemoval`); FINISH EVERYTHING includes them.
  - Saves → Export file / Import → Slot 3.
  - IndexedDB saves are per-origin, and every Cloudflare deployment link is a different origin, so testers must use the branch alias URL or export/import.

## 2026-09-23 — Claude — Test-play bug batch (building gates, army slider, starting troops, relocation)

- **Building deadlocks (affects normal play)**, in `shared/constants/buildings.js`:
  - Barracks and Training each required the other at the target level, so neither could leave Lv0. Now Barracks Lv N needs Training Lv N-1, and Training Lv N needs Barracks Lv N.
  - `hqUpgradeBlocker` required Barracks/Training at `target×2`, which is above their cap at the current HQ, so HQ could never pass Lv1. It now requires `(target-1)×2`.
  - HQMenu read the faction quarter from `bldgs.quarters`, which never existed, so HQ Lv4+ was also blocked. It now reads `quarterLevels[playerFaction]`.
  - `tests/buildingGates.test.js` checks that every building can reach its max.
- **Starting troops unusable until Quarters was opened**: FactionScreen computed the starting branch building (`startingBldgPatch`) but never applied it. It now calls `setBldgs`.
- **Army slider could exceed owned troops**: `maxSlider` added the slot's own *draft* value, so every drag raised the cap. It's now barracks pool + troops the commander already holds of that type − other draft slots.
- **HQ relocation**: `useRelocation.applyHqMove` now moves commanders standing on the old HQ to the new one (normal, forced and admin relocation).
- **Test mode**:
  - Gems and resources refill to their targets immediately (every 0.4s) instead of only below a floor.
  - Lowering respect undoes promotions (never below natural rarity) and removes the skill points it granted.
  - Arrivals skip the foothold check when "ignore adjacency" is on (`useMarch` `ignoreAdjacency`), so non-adjacent attacks now fight and capture.
- 422/422 tests pass.

## 2026-09-22 — Claude — TEST CAMPAIGN (admin mode + local saves) — REMOVE BEFORE LAUNCH

Owner-requested solo testing mode. All of it lives in `src/testmode/`, plus small mount points marked `TEST MODE`.
- **Turning it on:** the title screen shows 🛠 TEST CAMPAIGN when `import.meta.env.DEV` is true or the build has `VITE_TEST_MODE=1`. Production builds without that variable hide it.
- **Admin powers** (`useTestMode.js`, rules in `adminRules.js`):
  - All HDEFS commanders granted at start (any alignment; CommanderScreen `ignoreAlignment`).
  - Adjacency and range bypass: `testNoAdj` in Game.jsx `canAtk`/`cmdsAdjToSel`, and TilePopup `ignoreRange`.
  - Set commander level (real `applyXp` going up; strips growth and skill points going down) and respect (promotions at 7/12).
  - ⚡ finish for marches, upgrades, training, healing, forts and crew structures. Marches are finished by shifting the march clock, so the normal arrival and battle still run.
  - Relocate the HQ to any structurally valid 3x3 pad; commanders at the old HQ move with it.
  - Crews start at level 50.
  - Gems, eggs, void orbs and the 4 resources are topped up every second.
- **UI** (`TestUi.jsx`): the title menu (new game or continue from a slot), a 🛠 ADMIN panel (Commanders / Timers / Map / Saves), a 🛠 RELOCATE row in the tile popup, and ⚡ ARRIVE NOW on the floating commander card.
- **Saves** (`saveStore.js`): stored in IndexedDB as autosave (every 60s and when the app is hidden) plus 3 slots.
  - The world is rebuilt from a **map seed**: `mapGen.worker.js` swaps `Math.random` for mulberry32 when given `seed`; `useMapInit` passes and keeps `mapSeedRef`. So a save only stores the tile store (changed tiles), commanders, AI refs, the army reducer state and ~35 state values.
  - Loading reloads the page (sessionStorage flag) and applies the snapshot on `mapReady`.
  - Wild spawns are not saved.
- **Bug fix (affects normal play):** `buildHQLayer` now removes castles whose tile is no longer an HQ. Before, the old castle stayed on the map after any HQ relocation.
- **Known (not fixed):** normal `performRelocation` leaves commanders' `tk` on the old HQ tile.
- **To remove:**
  - Delete `src/testmode/` and `tests/testMode.test.js`.
  - Undo the `TEST MODE` lines in Game.jsx, GameView.jsx, TilePopup.jsx, CommanderScreen.jsx and TitleScreen.jsx.
  - The seed support in useMapInit and mapGen can stay.
- Tests: `tests/testMode.test.js` (7). 420/420 pass.

## 2026-09-22 — Claude — March countdowns + clickable march coordinates

- `marchMsLeft(march, now)` in `shared/utils/marchMotion.js`: time left on a march (sum of remaining segments minus time into the current one).
- Map: "MARCHING 1m 23s" label under the feet of the player's marching commanders (`src/utils/commanderIcons.js`, `entry.marchLabel`; text only changes once a second).
- Left rail busts: 🥾 countdown pill under a marching commander's bust (replaces the 🏰 badge while marching). New `src/components/game/MarchTimer.jsx` (self-ticking).
- Floating Commander card: "🥾 MARCHING · 1m 23s" plus `origin → destination` coordinates. Tapping a coordinate pans the map there (`teleportTo`).
- Test added to `tests/marchMotion.test.js`.

## 2026-09-22 — Claude — Commander card from marching sprites + left-rail busts

- Tapping one of your MARCHING commanders on the map (the moving sprite) now opens its Commander card (`CommanderCard`) instead of selecting the tile underneath. Hit test: `hitMarchingCmd` in `src/MapRenderer.jsx` (uses the march worker positions; new `onCommanderTap` prop).
- Tapping a bust icon in the left rail (`GameBar.jsx`, commanders not at HQ) still pans to it and now also opens the card (`onOpenCmdCard`).
- The card floats beside the left rail (`GameView.jsx`, `focusCmdUid`), shows "MARCHING → dest" or the tile, and has a ✕. Tapping any tile closes it. This is the primary way to recall a march in progress (↩ button).

## 2026-09-22 — Claude — Duplicate battle reports, Wounded, Guard, protection glow, mobile polish

- **Duplicate reports fixed:** arrival effects re-ran while a battle was awaited, so one battle could fire 2-3 times. `useMarch.js` / `useFortressSiege.js` now claim each arrival once (`claimBattle` / `claimedRef`). Multi-wave or multi-defender fights now label each report (`Wave x/y`, `Defender i/n`) in BattleLog.
- **Wounded** (`shared/utils/commanderStatus.js`): a player commander that loses a battle is wounded for 10 minutes. `canCommanderAct` blocks marches, gathering, training, sweeps, guarding and stationing while wounded. The auto-retreat home still runs. Shows 🩸 in GameBar and a banner in CommanderCard.
- **Guard:** toggled in the commander popup. It costs 10 stamina; cancelling is free but starts a 3-minute cooldown. A guard covers its own tile plus the 8 around it (`guardCoverageKeys`), but only player-owned tiles, crewmate tiles and my crew's structures. Neutral, ally, same-faction-not-crew, HQ and keep tiles are never covered. An attack on a covered tile fights the most recently posted guard first. A guard that loses is wiped, wounded and un-guarded. Moving the commander ends the guard.
- **Protection glow** now uses the tile's owner color (green mine / blue crew / red enemy). The shield badge is smaller.
- **Mobile polish:**
  - Bigger touch targets: HQ Back/Close, BattleLog ✕, Tomes ✕, HUD gear, Commander +, Bag tabs, auto-heal checkbox, GameBar labels.
  - Range sliders are now 32px tall and jump to your finger.
  - `main.tsx` touch guard now lets any scrollable area scroll (iOS).
  - The offline badge no longer covers overlay close buttons.
  - The training slider shows why it's disabled.
- **Known limitation:** single-player AI never attacks player, crew or structure tiles (`isFriendlyTile`), so guard fights, defensive wounding and enemy structure attacks won't show up until the server/PvP work lands.
- Tests: `tests/commanderStatus.test.js` (412/412 pass).

## 2026-09-20 — Codex

### Full-world map graphics rollout
- Removed the 25-tile player-spawn limit from the approved dark terrain,
  resource props, joined territory borders and Pirate HQ blending.
- The renderer still creates tiles and props only for the screen plus its
  existing 10-tile buffer, so the 2048×2048 world is not drawn at once.
- All four resources keep their approved P2–P9 clusters and P10–P13 developed
  site art. P1 remains intentionally prop-free.
- Renamed the old spawn-test helper to `worldVisuals.js`.
- Do not recheck unless the owner reports a regression.

---

## 2026-09-20 — Codex

### Commander walk stabilization
- Repacked the Fynn and Brine atlases as v2 with each pose aligned to the same torso center and foot line. This removes the whole-body jump that made marching look like shaking.
- Slowed the five-pose cycle from 130 ms to 200 ms per pose so both legs read as steps at the small map size.
- March speed, path, timing and gameplay are unchanged.
- Do not recheck unless the owner reports a regression.

---

## 2026-09-20 — Codex

### Commander walking and HQ deployment correction
- Fixed Fynn/Brine sliding: the asynchronously loaded atlas frames were attached to a discarded copy, leaving the live sprite permanently on its first frame. The displayed entry now receives all 24 frames and cycles through the five walking poses.
- HQ hiding now follows deployment state. An undeployed commander at an HQ/HQ-part tile is hidden; any active march remains visible while leaving, crossing, or returning over the HQ artwork. After arrival home ends the march, the commander hides again.
- No path, speed, arrival, recall, battle or ownership rules changed.
- Validation: nine focused commander tests pass, including delayed atlas loading; production build passes.

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


## 2026-09-20 — Claude (Sonnet), session 4

### New: Relations (friends/blacklist) + chat visual overhaul
Reworked the chat panel's navigation and look per the owner's reference
screenshots, and added a full friends/blacklist subsystem behind it.

**New — Relations rules (local-only, same pattern as chat):**
- `shared/constants/relations.js` — `RELATION_STATUS` (none/pendingOut/
  pendingIn/friend/blocked), `MAX_RELATION_NAME_LEN`.
- `shared/utils/relationsRules.js` — pure status-transition functions
  (`sendRequest`, `acceptRequest`, `confirmRequest`, `declineRequest`,
  `cancelRequest`, `removeFriend`, `block`, `unblock`, `listByStatus`,
  `searchCandidates`). A real server can adopt these unchanged.
- `tests/relationsRules.test.js` — 12 tests, all passing.
- `src/hooks/useRelations.js` — React state wrapper. `addFriend` sends +
  auto-confirms a request in the same tick (local "instant accept" —
  there's no other real player to actually respond, same pattern as
  CrewPanel's join request). In-memory only, does not survive a reload —
  same TODO as chat (see the multiplayer-transition note further down).
- `src/components/game/RelationsPanel.jsx` — Request / List / Blacklist /
  Add tabs; Add searches by name or player ID.

**Changed — `src/components/game/ChatPanel.jsx`:** replaced the old flat
5-tab bar (World/Faction/Crew/DMs/Groups) with two top toggle buttons per
the owner's spec:
- **Chats** — World, Faction, Guild(Crew), a "+ New Group" row, then
  Groups listed below Guild (not a separate tab anymore).
- **Direct** — a "Relations" row (opens `RelationsPanel` in place of the
  message view) followed by the DM channel list. New DMs are now started
  from a friend's "Message" button in Relations rather than a separate
  DM picker (the old dm-picker code path was removed; group creation
  still uses the same picker UI as before).
- Message sender headers now show `[ABBR] Name` when the sender belongs
  to a crew (`crewAbbrFor()`/`taggedName()` — crews already carry a
  4-char `abbr`), matching the reference screenshots.

**Changed — `src/hooks/useChat.js`:** now also returns `normalizedCrews`
(the local player's crew membership swapped from their faction key to
their real playerId — see the comment on `normalizeCrewsForPlayer`) so
`[ABBR]` tagging resolves correctly for the player's own messages, and
`getRecentMessages(n)` (last N messages across every channel the player
sees, newest last) for the new closed-state preview below.

**New — `src/components/game/ChatPreview.jsx`:** a small bottom-left
panel showing the last couple of chat messages even while the chat panel
itself is closed (per the owner's "chat is more than just a button"
spec); tapping it opens the panel. Rendered from `GameView.jsx` whenever
`!chatOpen`.

**Wiring — `src/Game.jsx` / `src/GameView.jsx`:** added `useRelations`
alongside the existing `useChat` call, threaded both the relations props
and `chatNormalizedCrews`/`chatRecentMessages` down to `ChatPanel`/
`ChatPreview`.

**Verified:** full test suite (`npm test`, 287/287) and production build
(`npm run build`) both pass.

## 2026-09-20 — Claude (Sonnet), session 5

### Chat preview is now the permanent chat entry point; Chat icon removed from GameBar
**File:** `src/components/game/ChatPreview.jsx` — dropped the
`messages.length === 0` early return, so the preview always renders (an
empty state shows a plain "💬 Chat" row when there are no messages yet).
Moved it from bottom-left to bottom-center (`left: 50%` +
`translateX(-50%)`), between the Wizard's Tomes trigger (bottom-left,
`GameView.jsx`) and GameBar's bottom-right icon cluster, per the owner's
request.

**File:** `src/components/game/GameBar.jsx` — removed the 💬 "Chat"
`ActionButton` from the bottom-right icon row and the now-unused
`chatOpen`/`setChatOpen` props from its destructure — ChatPreview is the
only way to open chat now.

**File:** `src/GameView.jsx` — stopped passing `chatOpen`/`setChatOpen`
down into `GameBar` (dead props after the button's removal); still used
locally to gate `ChatPreview`/`ChatPanel` rendering.

**Verified:** full test suite (`npm test`, 287/287) and production build
(`npm run build`) both pass.

## 2026-09-20 — Claude (Sonnet), session 6

### New: sub-channels inside crew and group chat
Crew and group chat are no longer single channels — each is now a
container of nested sub-channels. World/Faction/DM are unaffected (still
flat, per the owner's spec).

**New — pure rules:**
- `shared/constants/chat.js` — `MAX_SUBCHANNELS` (5), `defaultCrewSubchannels()`
  (#Announcement, leader-only to post + #General, both `locked: true` — can't
  be deleted or reordered), `defaultGroupSubchannels()` (#General only),
  `isSubchannelShape()`.
- `shared/utils/subchannels.js` — `subchannelId`/`parseSubchannelId` (the
  `"<parentChannelId>::<subId>"` composite id a message actually posts to),
  `subchannelsOf` (defaults for a crew/group that predates this feature),
  `addSubchannel`/`removeSubchannel`/`moveSubchannel` (locked ones protected,
  cap enforced), `canManageSubchannels` (crew: `crew.founder` only; group:
  `channel.ownerId` only), `canPostInSubchannel` (container membership +
  the leader-only gate).
- `tests/subchannels.test.js` — 10 tests, all passing.
- **No officer role yet** — the owner confirmed leader-only for
  `#Announcement` posting is fine for now; a real officer/rank system (and
  extending the leader-only check) is future work, not blocking.

**Changed — crew data now carries a real `founder` + `subChannels`:**
`src/GameView.jsx` (`onCreateCrew`) and `shared/utils/aiCrews.js` (AI crew
founding) both set `founder`/`subChannels: defaultCrewSubchannels()` at
creation. Incidentally fixes a latent bug — `CrewPanel.jsx` already
referenced `myCrew.founder` but nothing ever set it, so it always rendered
blank.

**Changed — `shared/utils/chatRules.js`:** exported `findCrew` (now reused
by subchannels.js); `createGroupChannel` gains `ownerId` (the creator —
only they can manage that group's sub-channels) and seeds
`subChannels: defaultGroupSubchannels()`.

**Changed — `src/hooks/useChat.js`:**
- `sendMessage` now recognizes a composite sub-channel id and checks
  `canPostInSubchannel` instead of the old container-level `canPost`.
- `normalizeCrewsForPlayer` also swaps `founder` (same facKey-vs-playerId
  quirk as `members`).
- `startGroup` sets `ownerId` on the new group.
- Added `addGroupSubchannel`/`removeGroupSubchannel`/`moveGroupSubchannel`
  (groups own their sub-channel list directly, unlike crews).
- AI flavor chatter in a crew now always lands in that crew's #General —
  never #Announcement, and there's no "AI officer" concept.
- `getRecentMessages` (the closed-state preview) now also sweeps every
  crew/group's sub-channels, not just the container id.

**New — `src/components/game/SubchannelManager.jsx`:** the popover behind
ChatPanel's gear icon — Add tab (name a channel) and Manage tab (▲/▼
reorder, ✕ delete; locked ones show a 🔒 and no controls).

**Changed — `src/components/game/ChatPanel.jsx`:** opening a crew or group
now shows its sub-channel list first (🔒 marks a leader-only one) instead
of jumping straight to messages; picking one opens its thread with a `‹`
back breadcrumb. The compose bar is replaced with "🔒 Only the leader can
post here" when the viewer can't post in that sub-channel. A ⚙ gear icon
appears in the header — next to the profanity/close buttons — only when
the viewer can manage the currently-open crew/group's channels (crew
founder or group creator), opening `SubchannelManager`.

**Wiring — `src/GameView.jsx`/`src/Game.jsx`:** added `manageCrewSubchannels`
(GameView, since crew data lives in its `crews` state) and threaded the
three new `useChat.js` group-subchannel mutators down to `ChatPanel`.

**Verified:** full test suite (`npm test`, 297/297) and production build
(`npm run build`) both pass.

## 2026-09-20 — Claude (Sonnet), session 7

### Sub-channels moved into the left column (nested under Guild/Group), default to #General
Follow-up to session 6's crew/group sub-channels — the owner wanted them
in the left nav, not a right-pane picker screen.

**File:** `src/components/game/ChatPanel.jsx`:
- New `SubchannelRows` component — renders directly under a crew or group
  row in the left column, only while that row is the open one; smaller/
  indented buttons than the World/Faction/Guild rows, 🔒 marks a
  leader-only one (#Announcement).
- Removed the old right-pane "pick a sub-channel" screen entirely.
  `activeSub` now falls back to `#General` (then the first sub-channel) any
  time nothing more specific is selected — opening Guild or a Group lands
  straight in #General, per the owner's spec, and picking a different
  sub-channel is just a click in the left column. Dropped the now-unneeded
  `‹` back button from the message view; it keeps a small header showing
  which sub-channel you're in.

**Verified:** full test suite (`npm test`, 297/297) and production build
(`npm run build`) both pass. No rules changes — this is UI-placement only,
`shared/utils/subchannels.js` from session 6 is untouched.

## 2026-09-20 — Claude (Sonnet), session 8

### Nyro — a named AI companion, always in the player's faction and crew; crew cap 40 → 100
New always-present AI companion, distinct from the ambient per-faction AI
roster. Nyro has no map/tile/HQ presence — a pure social-layer entity.

**New files:**
- `shared/constants/nyro.js` — `NYRO_ID = "ai_nyro"` (deliberately doesn't
  match the `ai_<faction>_<i>` shape, so the ambient multi-AI systems never
  pick Nyro up by accident), `NYRO_NAME`, `NYRO_ACCEPT_DELAY_MS`.
- `shared/utils/nyroChatter.js` + `tests/nyroChatter.test.js` (7 tests) —
  Nyro's own flavor chatter (separate pool for DMs/groups; reuses the
  per-faction pools in Faction/crew chat; never World).

**Faction:** Nyro always speaks with the player's faction's voice — handled
via `shared/utils/aiChatter.js`'s exported `FACTION_LINES`/`GENERIC_LINES`
and a `NYRO_ID` special-case added to `aiDisplayName`.

**Crew:** `src/GameView.jsx`'s `onCreateCrew`/`onJoinRequest`/`onLeaveCrew`
add/remove `NYRO_ID` alongside the player's own membership. `AI_CREW_CAP`
(`shared/utils/aiCrews.js`) raised 40 → 100; `CrewPanel.jsx`'s member lists
now render AI ids (including Nyro) through `aiDisplayName` instead of the
raw id.

**Friend requests / group invites — real accept, not instant-add:** every
other AI id still auto-accepts instantly (unchanged). Nyro is the one
exception:
- `src/hooks/useRelations.js` — `addFriend(NYRO_ID)` only sends the
  request (`pendingOut`); a new effect resolves it to `friend` after
  `NYRO_ACCEPT_DELAY_MS` + jitter.
- `src/hooks/useChat.js`'s `startGroup` — if `NYRO_ID` is among the invited
  participants, he's left out of the group's initial `participants` and
  added the same delay later.

**Chatter tick:** `src/hooks/useChat.js`'s existing AI-chatter interval now
also resolves Nyro-eligible channels each tick (Faction/crew + any DM/group
Nyro is actually in) and posts via `generateNyroChatter`, alongside the
existing ambient roster.

**Discoverability without ambient leakage:** `src/Game.jsx` derives
`chatKnownPlayerIdsWithNyro` (prepends `NYRO_ID`) for `useRelations` and
for the `chatKnownPlayerIds` prop handed to `GameView`/`ChatPanel`, while
`useChat`'s `aiPlayerIds` argument keeps using the original Nyro-free list
— so Nyro is addable/inviteable everywhere the UI lists "known players",
but never eligible for World chat or the ambient per-faction chatter.

**Verified:** full test suite (`npm test`, 304/304) and production build
(`npm run build`) both pass.

## 2026-09-20 — Claude (Sonnet), session 9

### Chat: hidden behind other menus, wider preview, remembers last-open chat
**File:** `src/GameView.jsx` — new `chatBlocked` (World Map/HQ/Commander/Gear
screens, Battle Log, Wizard's Tomes, Crew, Leaderboard, win screen — same set
already checked for `GameBar`'s `hidden` prop). Both `ChatPreview` and
`ChatPanel` are now gated on `!chatBlocked`, so chat never overlaps another
full-screen menu.

**File:** `src/components/game/ChatPreview.jsx` — width `190` → `285` (1.5x).

**Default channel + remembers last chat:** `selectedId`/`selectedSubId`/
`display` used to be local `useState` in `ChatPanel.jsx`, reset (and
defaulting to nothing selected) every time the panel unmounted on close.
Moved that state up into `useChat.js` (`activeChannelId`/`activeSubId`/
`activeDisplay`, defaulting to World/`"chats"`) and threaded it down as
controlled props (`src/Game.jsx` → `GameView.jsx` → `ChatPanel.jsx`), so it
now survives close/reopen and opens on World the first time.

**Verified:** full test suite (`npm test`, 304/304) and production build
(`npm run build`) both pass.

## 2026-09-21 — Claude (Sonnet), session 10

### Chat preview fix (was global-latest, not last-open-channel) + emoji picker
**Bug:** the closed-state preview (`ChatPreview.jsx`) was still calling
`useChat.js`'s old `getRecentMessages(n)`, which returns the newest messages
across *every* channel — so it showed whatever channel happened to get a
message most recently (often crew/Nyro chatter), not the channel the owner
actually had open when they closed chat.

**Fix — `src/hooks/useChat.js`:** new `getActiveChannelMessages(n)`, which
resolves messages the same way `ChatPanel.jsx` does (using the lifted
`activeChannelId`/`activeSubId` from session 9, with the same
#General-fallback for crew/group). `src/Game.jsx`'s `chatRecentMessages` now
calls this instead of the old global one.

### Emoji picker
Native emoji keyboards vary by phone/OS with no way to guarantee a given
glyph renders the same everywhere, so this adds a small in-panel picker
instead of relying on the device's own keyboard.

**File:** `src/components/game/ChatPanel.jsx` — new `EMOJI_SET` (a fixed,
curated ~44-emoji list: everyday reactions + the game's own fantasy-strategy
flavor — swords, shields, crowns, etc). A 🙂 button next to the message
input toggles a small grid popover above the compose bar; tapping an emoji
appends it to the draft (respecting the 280-char cap). Closes automatically
on channel switch or when the input is refocused.

**Verified:** full test suite (`npm test`, 304/304) and production build
(`npm run build`) both pass.

## 2026-09-21 — Claude (Sonnet), session 11

### Bigger/clickable names, bigger message text, restyled Chats/Direct tabs
**File:** `src/components/game/ChatPanel.jsx` / `ChatPreview.jsx`:
- Sender name + `[ABBR]` crew tag: 7px → 10.5px (1.5x), new shared
  `TEXT_NAME` style.
- Message bubble text: 10.5px → 16px (1.5x, `ChatPanel.jsx` only — the
  preview's message text also went 10px → 15px for the same reason: small
  and hard to read).
- "Chats"/"Direct" tab toggle: was 7px Cinzel small-caps in blue-gray
  (`#4a5a6a`) — hard to read per the owner. New `TAB_FONT` (13px
  'Crimson Pro', bold) and a warm amber/parchment scheme (`#f0c878` active /
  `#a89878` inactive) instead of the blue-gray.
- Sender names in the message list are now clickable (own messages/"You"
  excluded) — opens a popup: **View Profile** (a lightweight read-only card:
  name, crew, faction, relation status — there's no dedicated profile screen
  elsewhere in the game yet, so this is a minimal stand-in), **Add/Remove
  Friend**, **Block/Unblock** (wired to the existing `useRelations.js`
  actions already passed into `ChatPanel`).

**Verified:** full test suite (`npm test`, 304/304) and production build
(`npm run build`) both pass.

## 2026-09-21 — Claude (Sonnet), session 12

### Preview widened leftward, left-column font 1.5x, "Aa" translate placeholder
**File:** `src/components/game/ChatPreview.jsx` — width `285` → `428` (1.5x).
Anchoring switched from `left:50% + translateX(-50%)` (centered, grows both
ways) to `right: calc(50% - 142.5px)` (pins the old right edge in place), so
the extra width grows mostly leftward per the owner's spec, instead of
pushing out evenly on both sides.

**File:** `src/components/game/ChatPanel.jsx` — new `TEXT_LEFT` (10.5px,
1.5x of the old 7px) applied to every left-column row: World/Faction/Guild/
Group/DM buttons, "No guild yet"/"No DMs yet", the Relations entry, and
`SubchannelRows`. Column width `128px` → `160px` to give the bigger text a
little more room before truncating.

New "Aa" header button (next to the existing gear/profanity icons) —
**placeholder only** for a future message-translate feature; toggles its own
highlighted on/off state but doesn't call a translation service yet (there
isn't one wired up in this codebase).

**Verified:** full test suite (`npm test`, 304/304) and production build
(`npm run build`) both pass.

## 2026-09-21 — Claude (Sonnet), session 13

### Message translation ("Aa" button) — now actually translates
Per the owner: free/keyless provider, target language auto-detected from
the device — no language picker.

**New files:**
- `src/utils/translate.js` — `translateText(text, targetLang)` calls the
  unofficial, key-free Google Translate "gtx" web endpoint (no server of
  our own exists to do this from — chat is local-only, see earlier
  entries). Module-level cache by `${targetLang}:${text}` since the AI
  flavor-chatter pools repeat lines a lot. English targets are a deliberate
  no-op (the game's own text is authored in English). Best-effort: any
  failure (network, rate-limit, shape change) falls back to the original
  text — translation should never be able to break chat.
- `src/hooks/useTranslatedText.js` — `useTranslatedText(text, enabled)`,
  resolves the device's language once via `navigator.language` and re-runs
  the translation whenever `text`/`enabled` change.

**File:** `src/components/game/ChatPanel.jsx` — pulled the per-message JSX
out into a new `MessageBubble` component (a `.map()` can't call a hook
directly per iteration) and wired `useTranslatedText` in there, gated on
the existing `translateEnabled` state from the "Aa" button.

**Known caveat:** this is an *unofficial* Google endpoint — it can
rate-limit or block traffic from some networks (a same-endpoint spot-check
from this dev environment got HTTP 429, though that's this sandbox's shared
IP, not necessarily how it behaves for players' own browsers). If it turns
out unreliable in practice, swapping to a real provider (DeepL/Google Cloud
Translate) means adding an API key in `src/utils/translate.js` only — the
hook and `MessageBubble` wiring don't change.

**Verified:** full test suite (`npm test`, 304/304) and production build
(`npm run build`) both pass.

## 2026-09-21 — Claude (Sonnet), session 14

### Chat feature pack: unread badges, replies, reactions, mentions, mute,
### typing indicator, scroll-lock, search — local-only, no moderation

Per the owner: build out the previously-proposed "missing chat features"
list, plus a mid-stream request to add message replies. Design answers from
the owner: relative timestamps (server will send UTC epoch ms later — no
storage change needed, already true); @mentions via autocomplete + highlight;
reactions are player-only (AI never auto-reacts); no Report button (no
moderation backend exists) — Copy only, alongside the new Reply.

**New file:** `src/hooks/useRelativeTime.js` — self-refreshing "2m ago"-style
hook (re-renders every 15s), reading straight off the existing `ts` epoch-ms
field.

**File:** `src/hooks/useChat.js` — added, all local-only/in-memory:
- `lastReadAt` map + `markRead(channelId)` + `unreadCount` (counts messages
  newer than last-read per channel the player can see, skipping muted ones).
- `mutedChannelIds` (Set, top-level channels only) + `toggleMute`.
- `reactions` (`{ messageId: { emoji: [playerId] } }`) + `toggleReaction`.
- `typingByChannel` — the AI chatter tick now stages a message behind a
  1–1.9s "typing" delay instead of posting instantly.
- `leaveGroup(channelId)`.
- `sendMessage(channelId, text, { replyTo })` — `replyTo` is a snapshot
  (`{ id, senderName, text }`) stamped onto the outgoing message.

**File:** `src/Game.jsx`, `src/GameView.jsx` — plumbed all of the above
through to `ChatPreview`/`ChatPanel` props. No behavior of their own.

**File:** `src/components/game/ChatPreview.jsx` — red unread-count badge
(caps display at "99+").

**File:** `src/components/game/ChatPanel.jsx` — the bulk of the UI work:
- `MessageBubble`: relative timestamp, reply-quote block, @mention
  highlighting, reaction pills, long-press (touch) / right-click (desktop)
  opens a message menu — React / Reply / Copy.
- Reply: dismissible "Replying to…" strip above the compose bar; sending
  clears it.
- @mention autocomplete: typing `@partial` shows up to 5 matching names,
  pick one to insert `@Name `.
- Channel rows (World/Faction/Guild/Group/DM) got a mute toggle.
- "Leave Group" button in a group's sub-channel header.
- Typing indicator line above the compose bar.
- Scroll-lock: only auto-scrolls to the newest message if already at the
  bottom; otherwise shows a "↓ New messages" pill.
- 🔍 search-within-channel filter in the sub-channel header.
- Viewing a channel calls `markRead`, clearing its unread badge.

**Known limitation:** no Report/moderation — deliberate, per the owner,
since there's no backend to act on reports.

**Verified:** full test suite (`npm test`, 304/304) and production build
(`npm run build`) both pass.

## 2026-09-21 — Claude (Sonnet), session 15

### Fixed: typing-indicator crash, then per-tab unread dots in the panel

**Bug fix — `src/components/game/ChatPanel.jsx`:** the typing-indicator line
rendered `typingByChannel[msgChannelId]` (an object, `{ name, until }`)
directly as a child instead of its `.name` field. React refuses to render a
raw object as a child, which crashed the chat panel the moment any AI
player started "typing". One-line fix: render `.name`.

### Per-tab unread red dots inside the panel

Per the owner: the closed-state preview already shows a total unread badge
(session 14); now each open tab in the panel itself — World, Faction,
Guild, Group (and its sub-channels), DM — gets its own small red dot when
it has unread messages, clearing only once that specific tab is viewed.

**File:** `src/hooks/useChat.js` — two new memoized selectors alongside the
existing `unreadCount`:
- `unreadLeafIds` — Set of every leaf/sub-channel id with an unread
  message (muted channels excluded, same as the total badge).
- `unreadTopIds` — the above folded up to each leaf's top-level container,
  for the 5 main row kinds.
Both returned from the hook.

**File:** `src/Game.jsx`, `src/GameView.jsx` — plumbed both sets through to
`ChatPanel` as `unreadLeafIds`/`unreadTopIds` props.

**File:** `src/components/game/ChatPanel.jsx` — `ChannelRow` grew a
`unread` prop (small red dot next to the label); `SubchannelRows` grew an
`unreadIds` prop (dot per sub-channel row). Wired at all 5 top-level rows
(World/Faction/Guild/Group/DM) and both sub-channel lists (Guild/Group).
Clearing reuses the existing `markRead` effect that already fires whenever
the active channel/sub-channel changes — no new clearing logic needed.

**Verified:** full test suite (`npm test`, 304/304) and production build
(`npm run build`) both pass.

## 2026-09-21 — Claude (Sonnet), session 16

### Crew 2.0 — fortress siege combat, Crew Help/Store wiring, language/announcement/target

**Fortress placement (`src/components/game/TilePopup.jsx`, `src/Game.jsx`,
`src/GameView.jsx`):** clicking an unclaimed p10+ tile now shows a "BUILD
CREW FORTRESS" button (founder/officer only, same UX as the existing "BUILD
FORT"). Hidden entirely — not just disabled — on camps/keeps/gates/ruins/the
win tile, since a fortress can never be built there
(`canBuildFortressOnTile` already rejected them; the button used to still
render in a disabled state on those tiles, which was confusing UI clutter).
`Game.jsx` ticks fortress `buildEndsAt` every second and auto-completes.

**Fortress siege combat (new file `src/hooks/useFortressSiege.js`):** a
full combat system, dispatched via a distinct `march.type: "siegeFortress"`
(never `"attack"`) so it can never collide with the existing generic
attack-arrival handler in `useMarch.js`. Fights every commander stationed
in the fortress one at a time (deterministic order via
`crewFortress.js`'s `nextDefender`), then applies siege damage to the
fortress itself once clear. Destroying it reverts the tile to unclaimed and
hands it to the attacker outright — no further fight needed, per spec. A
new "ATTACK FORTRESS" button in `TilePopup.jsx` dispatches this; a new
`pickSiegeCmd` mode reuses the existing `CommanderPicker`.

**Crew Help (`src/GameView.jsx`):** now really reduces the player's active
building-upgrade timer (`crewHelpAmount`/`crewHallStats` from
`shared/constants/buildings.js`), tracked via a `helpsUsed` field added to
that upgrade's `upgQueue` entry.
**TODO before real multiplayer:** this is currently self-serve (you click
"Request Help" and speed up your own build) because there's no other real
player to click it for you yet. Owner wants: other crewmates help you and
you help them, and a player can't help themselves. Fix once real player
identity/multiplayer exists — likely a per-member "help" action surfaced to
crewmates, not a button the build's own owner can click.

**Crew Store (`src/GameView.jsx`):** consumable-type items (relocation
token, 1h/8h building speedups) now grant a real consumable to the bag
(`createConsumable`), redeemed later via the existing
`useConsumable(typeId)` flow — same path as any other consumable. Resource
packs still add resources directly. Fixed `onDemolishFortress` to use
`canDemolishFortress` (founder OR officer) instead of `canDisband`
(founder-only), matching the actual fortress-management rule.

**Language/announcement/rally target
(`shared/constants/crew.js`, `shared/utils/crewRules.js`,
`src/components/game/crew/CrewCreate.jsx`, `CrewHQ.jsx`, `CrewScreen.jsx`):**
crew creation has a language picker (`CREW_LANGUAGES`); `CrewHQ`'s header
shows crew size, founder name and language; founder can edit the
announcement/description banner in place (`canEditAnnouncement`,
founder-only); founder/officer can pin a short rally-target text label
("No tasks" when clear). **Known simplification:** the target is text
only — not yet tied to an actual map tile, since `CrewHQ` doesn't have
access to the map's tile-selection state. Wire that up if/when it matters.

**Verified:** full test suite (`npm test`, 352/352) and production build
(`npm run build`) both pass.

## 2026-09-21 — Claude (Sonnet), session 17

### Crew UI polish round — landing/HQ art, emblem recoloring, create-page tweaks

**CrewLanding.jsx / CrewHQ.jsx backgrounds:** wired in two owner-supplied
AI-generated images as real backgrounds — `public/crew/war-table-bg.jpg`
(not-in-crew landing screen) and `public/crew/hq-table-bg.jpg` (in-crew HQ
war table). Removed a leftover CSS "table silhouette" placeholder div on
the landing screen. Renamed "Found a Crew"/"Found Crew" buttons to "Create
a Crew"/"Create Crew" throughout.

**CrewHQ.jsx layout, iterated against owner feedback across several
rounds:** replaced the old horizontal tab bar with a right-edge icon rail,
then a left-identity-column + bottom-icon-row layout, then spaced the left
column out and pushed the bottom row right (Help now sits at the
bottom-right corner). Diplomacy/Boosts/rally-Target hotspots now sit in a
row **above** the table image (not scattered across it, per correction).

**Emblem system — independent icon recoloring
(`shared/constants/crew.js`, `src/components/game/crew/Emblem.jsx`):**
emblem icons used to be emoji glyphs, which can't be recolored via CSS
(multi-color emoji ignore `color`). Replaced them with 24 original,
hand-authored, single-color inline SVG icons (up from 12), so the icon
color and the badge background color can now be set independently.
`EMBLEM_ICONS` grew from 12 to 24 — 12 new icons, several tied to a
faction (dragon→dragons, cross→holyknights, snowflake→coldborns,
moon/bat→nightcreatures, orb→wizards, hammer→orcs, reaper→ashen_dead,
trident→pirates), plus general-purpose shield/eagle/lion. Emblem shape is
`{shape, icon, color, iconColor}` now (was `{shape, icon, color}`);
`isValidEmblem` and `DEFAULT_EMBLEM` updated to match. `EmblemPicker` has
separate "BACKGROUND COLOR" and "ICON COLOR" swatch rows. Icons were sanity
-checked visually via a Playwright screenshot before finalizing (a moon
crescent path was initially rendering blank and was fixed).

**TODO / art upgrade idea:** these 24 icons are deliberately simple flat
SVG shapes — cheap, deterministic, no image pipeline, but not going to
win any art awards. If the owner wants nicer emblem art, ChatGPT (which
has image generation) could be used to generate a real icon set instead:
one clean, single-subject icon per `EMBLEM_ICONS` id (skull, sword, axe,
wolf, raven, flame, anchor, star, serpent, tower, crown, arrow, dragon,
cross, snowflake, moon, bat, orb, hammer, reaper, trident,
shield_emblem, eagle, lion), on a transparent background, simple flat
game-icon style, one consistent color (e.g. flat white or black) so it
can still be recolored/tinted in CSS the same way the current SVGs are.
Exported as PNG/SVG per icon into `public/crew/icons/<id>.png`, then
`Emblem.jsx`'s `ICON_PATHS` map would need to swap from inline SVG paths
to `<img>`/CSS-mask references — masking (not just an `<img>`) is what
would be needed to keep the "recolor via CSS" behavior, since a plain PNG
can't be recolored the way a `fill="currentColor"` SVG can. Not started;
flagging as a possible follow-up since it's outside what this session's
tools could generate.

**CrewCreate.jsx:** swapped field order so Abbreviation is asked before
Name (was Name then Abbreviation).

**Default crew privacy (`shared/constants/crew.js`):**
`DEFAULT_CREW_PRIVACY` changed from `CREW_PRIVACY.LOCKED` to
`CREW_PRIVACY.OPEN`. Updated `tests/crewRules.test.js`'s "createCrew
defaults" test to match.

**Verified:** full test suite (`npm test`, 352/352) and production build
(`npm run build`) both pass.

## 2026-09-21 — Claude (Sonnet), session 18

### CrewHQ table image — full-bleed, hotspots floating on it staggered

**`src/components/game/crew/CrewHQ.jsx`:** the table image was leaving
bare black space above and below it. Cause: it sat in a `flex:1` box
inside a parent with `overflowY:"auto"`, and flex-grow doesn't resolve
inside a scrolling context, so the box just shrank to `minHeight`. Fixed
by switching the table view to `position:"absolute", inset:0` on the
pane itself (no longer flex-column), so it always fills the whole
content area edge-to-edge regardless of scroll context.

Diplomacy/Boosts/Target hotspots now float directly on top of the table
image near its top edge, each independently `position:"absolute"` at a
different top/left offset (staggered, not a single straight row) —
closer to the reference screenshot where pieces sit unevenly across the
table rather than in a lined-up row floating separately above it.

Renamed the rally-target hotspot's empty-state label from "No tasks" to
"Tasks".

**Follow-up (same session):** owner marked up a screenshot showing the
three hotspots should sit down on the table surface itself, near where
the map/pieces are, not pinned along the top edge. Repositioned to
`top:42%/left:29%` (Diplomacy), `top:30%/left:50%` (Boosts),
`top:55%/left:70%` (Tasks) — percentages of the table pane, matching the
marked-up positions.

**Follow-up 2 (same session) — hotspot color clash + slow table load:**

*Color clash:* the green boxes + full-color emoji (🕊️🧪🎯) fought with the
warm candlelit photo. Replaced `TableHotspot` with a round gold "wax seal"
badge (dark radial-gradient fill, gold ring, single-color gold outline SVG
icon per hotspot — dove/flask/target shapes) so it reads as one object
sitting on the table, matching the emblem system's "single-color SVG,
recolorable" approach instead of clashing multi-color emoji.

*Slow load (~15s to appear):* `public/crew/war-table-bg.jpg` and
`hq-table-bg.jpg` were 1672px-wide, ~380KB JPEGs — far bigger than the
size they're actually displayed at in this UI. Resized to 1100px wide and
re-compressed (quality 68), landing at ~112KB each (~30% of the original
weight) — should cut load time roughly 3x on the same connection. Also
layered a dark gradient underneath the image in `CrewHQ.jsx` (same trick
`CrewLanding.jsx` already used) so the table pane reads as "loading" in a
themed dark tone rather than blank/broken while the JPG streams in. If it's
still slow after this, the remaining time is almost certainly the network
itself (e.g. testing over a remote/streamed device, per the owner's other
screenshots) rather than anything in this code path.

**Follow-up 3 (same session):** hotspot badges/icons/labels sized up —
badge 46px→58px, icon 20px→26px, label 7px→10px and bolded (`fontWeight:
700`), per owner feedback that they read too small against the table
photo.

**Verified:** full test suite (`npm test`, 352/352) and production build
(`npm run build`) both pass.

## 2026-09-21 — Claude (Sonnet), session 19

### Documentation only — owner scoping decisions on 3 Crew HQ placeholders (no code changed)

Owner reviewed the three "simplified placeholder" items flagged after session
18 (Crew Help self-serve, Rally Target text-only, Emblem icon art) and scoped
each rather than having any built this session:

1. **Emblem icon art** — confirmed as a ChatGPT (image-gen) task, not a code
   task. Already flagged with full generation spec in session 17's "TODO /
   art upgrade idea" note above; no new code work needed until the owner
   supplies the generated icon set, at which point `Emblem.jsx`'s
   `ICON_PATHS` swap (inline SVG → PNG/CSS-mask) described there is the
   follow-up.
2. **Crew Help (self-serve → crewmate-to-crewmate)** — confirmed blocked on
   real multiplayer/player identity existing at all (already flagged under
   section 3/4 above and in session 16). No action until multiplayer lands.
3. **Rally Target** — owner clarified the target design: it should be tied to
   a real **Objectives/map-pin system set by crew leadership** (founder/
   officer), not a raw map-tile click. That objectives/pin system is a new
   feature with no code today and must be designed and built first; Rally
   Target is then just a display/link onto it. Updated section 4's roadmap
   line above to reflect this so a future pass doesn't wire Rally Target
   directly to tile-selection state as a shortcut.

No files changed besides this log and the section 4 roadmap line above.

**Verified:** no code touched; test suite/build unaffected.

## 2026-09-21 — Claude (Sonnet), session 20

### Diplomacy built for real (owner spec, this session) — Ally/Neutral/Enemy standing, cosmetic tile-color only

Owner design (verbatim spec, implemented as described, nothing invented
beyond it): two views by role (founder/officer set standing toward every
other crew; a plain member just sees what THEIR crew has flagged, or a
flavor line if nothing's flagged). One-way — crew A flagging crew B ally
does not make crew B see crew A as an ally. Purely cosmetic: changes tile/
structure outline color only, no gameplay effect (an ally can still be
attacked). Also: same-faction tiles change from orange to purple, freeing
orange for "ally."

**Data model (`shared/constants/crew.js`):** `CREW_DIPLOMACY_STATUS`
(`ally`/`enemy` — no `neutral` constant, since neutral is simply no entry,
never stored). `crew.diplomacy: { [otherCrewId]: "ally"|"enemy" }`, added to
`createCrew()`'s default shape (so AI crews get it too, since
`aiCrews.js` already builds crews through `createCrew()`).

**Rules (`shared/utils/crewRules.js`, pure, same pattern as
`setCrewTarget`/`clearCrewTarget`):** `canSetDiplomacy` (founder/officer,
same tier as rally target) · `setDiplomacyStatus(crew, actorId, targetCrewId,
status)` (no-ops if the actor lacks permission, the target is itself, or
there's no targetCrewId; an invalid/`"neutral"` status deletes the entry
rather than storing it) · `diplomacyStatusOf` · `flaggedDiplomacyCrews(crew,
allCrews)` (resolves `crew.diplomacy` against the real crews list for the
member read-only view — drops entries for a crew that no longer exists) ·
`diplomacyPlayerIdSets(crew, allCrews)` (resolves the SAME crew's diplomacy
map into `{allyIds, enemyIds}` playerId `Set`s, by walking each flagged
crew's `members[]` — this is what map tile-coloring consumes, kept here and
pure so `MapRenderer.jsx` doesn't need any diplomacy-specific logic of its
own, just Set lookups).

**UI (`src/components/game/crew/CrewDiplomacy.jsx`, new):** replaces the old
`CrewComingSoon` stub on the Diplomacy tab. Founder/officer: every other
crew in the game as a row (emblem, name, level/member count) with
Ally/Neutral/Enemy buttons, highlighting the current status; a top note
spells out "cosmetic, one-way, doesn't stop attacks." Plain member:
read-only rows for only the crews `flaggedDiplomacyCrews` returns, each with
a colored ALLY/ENEMY badge; empty state is the owner's exact line —
"Diplomatic talks are still underway." No files/props elsewhere needed
touching beyond threading `crews` and a new `onSetDiplomacy` callback down
`CrewScreen.jsx` → `CrewHQ.jsx` → `CrewDiplomacy.jsx`, and wiring
`onSetDiplomacy` in `GameView.jsx` (`setDiplomacyStatus` on the player's own
crew via `setCrews`, same shape as the existing `onSetTarget`/
`onClearTarget` handlers right above it).

**Map tile-color (`src/MapRenderer.jsx`), the actual owner-requested
behavior:** `ownerTint()` — the one function every tile/HQ-border draw call
already routed through — gained a 6th param, `diplomacyPids`
(`{allyIds, enemyIds}`). Priority order now: player green → crewmate blue →
**ally orange `0xe87830` / enemy darker-red `0x8a1414` (new, checked against
`diplomacyPids`, AI-owned tiles only)** → same-faction **purple `0xaa44ff`**
(was orange `0xe87830` — the exact swap the owner asked for, and note this
purple already matches `commanderIcons.js`'s existing same-faction color, so
it's now consistent with how faction commander icons were already tinted)
→ default red `0xdc3c28`. Threaded `diplomacyPids` through every call site
that already threaded `crewPids` the same way: `drawAllTiles`,
`_buildOneHQ`, `buildHQLayer`, and the main `MapRenderer` component (new
`diplomacyPlayerIds` prop → `diplomacyPidsRef`, same ref-and-effect pattern
as the existing `crewPidsRef`, triggering the same HQ-cache-clear + redraw
on change). `Game.jsx` computes it once via a new `diplomacyPlayerIds`
useMemo (`diplomacyPlayerIdSets(myCrew, crews)`, mirroring the existing
`crewmatePlayerIds` useMemo right above it) and passes it through
`GameView.jsx` to the main map `MapRenderer`. **Not threaded to `Minimap.jsx`
or `WorldMap.jsx`** — those still only distinguish player/crewmate/enemy;
flagging that as a known follow-up rather than silently leaving it half
done. The one placeholder-fill `ownerTint()` call in `_buildOneHQ` (used
only while an HQ sprite is still loading) was left on `crewPids=null` with
no diplomacy arg either, matching its existing simplification.

**Tests:** `tests/crewDiplomacy.test.js` (9, new) — default empty diplomacy
map on `createCrew`, permission gating, ally/enemy/neutral-clears-the-entry,
self-target and missing-target no-ops, one-way independence between two
crews' own diplomacy objects, `flaggedDiplomacyCrews` dropping entries for a
crew no longer in the list, and `diplomacyPlayerIdSets` building correct
ally/enemy playerId Sets from real crew member lists (plus an empty-input
no-throw case). `ownerTint`/`MapRenderer.jsx` itself has no direct unit test
(Pixi-dependent, same as the rest of the renderer) — verified by full build
only. Full suite: 361/361 (352 prior + 9 new). `npm run build` clean, 609
modules transformed (import graph resolves, `CrewDiplomacy.jsx` included).

## 2026-09-21 — Claude (Sonnet), session 21

### Merged an external "Phase 1 HQ dark-v2" MapRenderer patch (owner-supplied) onto the live MapRenderer.jsx

Owner supplied a standalone drop-in `src/MapRenderer.jsx` from another AI
tool/session, packaged as a full-file replacement with a README saying
"replace your existing file." Did NOT do a blind overwrite — that file was
built from an older snapshot and would have silently reverted this
session's Diplomacy tile-coloring work (session 20, `ownerTint`'s new
`diplomacyPids` param threaded through `drawAllTiles`/`_buildOneHQ`/
`buildHQLayer`/the main component). Instead: diffed the supplied file
against the exact pre-Diplomacy baseline to isolate only the intended
patch, confirmed it touched a single, unrelated 24-line block (`_buildOneHQ`'s
`HQ_OFFSETS` table + `targetH` calc, faction HQ sizing only — nowhere near
`ownerTint`/tile-coloring), and applied that isolated delta onto the current
file so both features coexist.

**`src/MapRenderer.jsx`, `_buildOneHQ`'s `HQ_OFFSETS` table:** dark-v2 HQ
scale bumped per faction (orcs/ai 1.12, wizards/nightcreatures/ashen_dead
1.10, dragons/coldborns 1.08, holyknights 1.05 — pirates/player unchanged
at 1.0) with matching yOff reductions so the taller dark-v2 silhouettes stay
grounded on the same terrain. `targetH` (the HQ sprite's target height) is
now `useDarkHQArt ? targetW : targetW * 0.80` instead of always
`targetW * 0.80` — the old flat 0.80 clamp squashed the dark-v2 art's
native square/vertical presentation; original (non-dark) HQ art keeps the
old clamp unchanged. The asset-swap table (`hq_*.webp` → `hq_*_dark_v2.webp`)
and `useDarkHQArt`/`useApprovedPirateArt` logic this reads were already
in the codebase from an earlier session (Pirate HQ dark-v2 art) — this
patch only extended the sizing to the other 7 factions once their dark-v2
art existed. All 8 `public/hq/hq_*_dark_v2.webp` assets the README asked
for were already present in `public/hq/` — nothing to add there.

**Not touched:** HQ footprint/selection diamond, terrain, commander
systems, or anything else the supplied README explicitly said it wouldn't
change — confirmed by the diff being exactly this one block, nothing more.

**Verified:** full test suite (`npm test`, 361/361) and production build
(`npm run build`, 609 modules) both pass.

## 2026-09-21 — Claude (Sonnet), session 22

### Build fix: `shared/utils/crewRules.js` was missing session 20's Diplomacy exports

Owner's Cloudflare deploy failed: `"canSetDiplomacy" is not exported by
"shared/utils/crewRules.js", imported by
"src/components/game/crew/CrewDiplomacy.jsx"`. Checked the owner's deployed
repo zip against everything delivered for Diplomacy (session 20) — every
other file had the changes (`crew.js`, `CrewDiplomacy.jsx`, `CrewHQ.jsx`,
`CrewScreen.jsx`, `GameView.jsx`, `Game.jsx`, `MapRenderer.jsx`, the test
file); only `shared/utils/crewRules.js` was still the pre-Diplomacy version
— it never got applied from that delivery. Re-applied the same edits from
session 20 (`canSetDiplomacy`, `setDiplomacyStatus`, `diplomacyStatusOf`,
`flaggedDiplomacyCrews`, `diplomacyPlayerIdSets`, `diplomacy: {}` default in
`createCrew()`) verbatim, nothing new invented.

**Verified:** ran `npm install && npm test && npm run build` against the
owner's exact repo zip with just this one file swapped in — 361/361 tests,
build succeeds (no more Rollup export error).

## 2026-09-21 — Claude (Sonnet), session 23

### Diplomacy: touch-scroll bug on Crew screens (Diplomacy list + crew creation) + flavor text moved behind an info icon

Owner reported the Diplomacy crew list wasn't scrollable and the crew-
creation screen's scroll was "extremely unresponsive." Same root cause
flagged as a follow-up back in the 2026-09-20 chat touch-scroll fix entry
above: `src/main.tsx` has a document-level `touchstart` listener that calls
`preventDefault()` on any touch outside an interactive element or a small
class allowlist (`.gear-picker-list`, `.roster-scroll`, `.battle-popup`,
`.find-tiles-popup`, `.chat-scroll`). `CrewHQ.jsx`'s two scrollable regions
(left identity column, main tab/table content area — this is where the
Diplomacy list renders) and `CrewScreen.jsx`'s Browse/Create views all used
a bare `.scr` class, not on that allowlist, so touch-drag scrolling was
blocked at the document level before it ever reached them — worked fine
with a mouse wheel (why it wasn't caught before), broken on touch.

**Fix:** added `"crew-scroll"` to `src/main.tsx`'s allowlist
(`e.target.closest(".crew-scroll")`, same pattern as `"chat-scroll"`) and
tagged all 4 of those scrollable containers with `className="scr crew-scroll"`
(`CrewHQ.jsx` left column + main tab area; `CrewScreen.jsx` Browse + Create
views). Also gave `CrewScreen.jsx`'s Browse/Create containers the
`minHeight: 0` flex-clipping fix (same flexbox gotcha as the very first
2026-09-20 chat entry — a flex item's default `min-height: auto` lets it
overflow its column instead of clipping/scrolling) since they didn't have
it; `CrewHQ.jsx`'s equivalent container already did. Left a note for future
crew screens to use `crew-scroll` too — any other panel still on bare `.scr`
(the old, now-unused `CrewPanel.jsx` included) likely has this same latent
bug but is out of scope here.

**Diplomacy flavor text → info icon** (`src/components/game/crew/CrewDiplomacy.jsx`):
added a small header row ("Diplomacy" + a round "i" button) above both the
founder/officer and member views; the existing "cosmetic only, one-way..."
note now only shows when that button is toggled on (starts collapsed),
instead of always taking up space at the top of the list.

**Verified:** full test suite (`npm test`, 361/361) and production build
(`npm run build`, 609 modules) both pass. Touch-scroll behavior itself
can't be asserted by the `node:test` pure-function suite (same caveat as
the original chat fix) — needs an on-device/touch check.

## 2026-09-21 — Claude (Sonnet), session 24

### Crew HQ: "Boosts" tab → "Level" tab (real perks + placeholders)

Renamed the Boosts table hotspot to Level and gave it a real build instead
of the `CrewComingSoon` stub. New `crewLevelPerks(level)` in
`shared/constants/crew.js` returns the perk(s) that unlock at exactly a
given level, built from data already in the file: `+5 Member Cap` every 2
levels up to 20 (matches `crewMemberCapForLevel`'s own ceiling) and `+1
Fortress Slot` at levels 15/30/45 (`CREW_FORTRESS_SLOT_LEVELS`). New
`src/components/game/crew/CrewLevel.jsx` renders the crew's current
level/XP progress bar plus a scrollable row for every level 1–50 — a real
perk badge where one exists, a "Placeholder — perk TBD" row otherwise, with
reached levels checked off and the current level highlighted. `CrewHQ.jsx`:
swapped the "Boosts" hotspot/icon for "Level {crew.level}", wired the new
`level` tab to `CrewLevel`, updated stale "Boosts" comments.
`CrewComingSoon.jsx`'s header comment updated to drop Boosts/Diplomacy
(neither uses it anymore). New `tests/crewLevelPerks.test.js` covers the
member-cap schedule, the fortress-slot levels, the 20-level cap ceiling,
and that every level 1–50 resolves without throwing.

**Verified:** full test suite (`npm test`, 367/367) and production build
(`npm run build`, 610 modules — up from 609, confirming `CrewLevel.jsx` is
bundled) both pass.

## 2026-09-21 — Claude (Sonnet), session 25

### Documentation only — Records tab scoped, held pending real multiplayer (no code changed)

Owner described the Records tab: a log of world-map Keep captures (`isKeep`
tiles, `powerLevel` ≥10 — not Crew Fortresses, a separate already-crew-owned
structure) recording capture time + keep name, plus rankings of active
participants by total damage dealt to keep defenders and total siege damage
dealt.

Scoped, not built, this session:

1. **Target confirmed as world-map Keeps**, not Crew Fortresses. Keeps have
   no crew-ownership concept today (`resolveSiegeOutcome` in
   `shared/utils/captureRules.js` just sets `owner`/`faction`/
   `ownerPlayerId` on capture — nothing ties a capture to a crew or logs who
   fought). Owner confirmed bigger keeps should ideally take a **group
   effort** — several armies (possibly several players) sieging the same
   keep over time.
2. **Blocked on real multiplayer, same as Crew Help** (session 16/19 above).
   Today there is exactly one real player (`"player"`); every other
   commander on the map is a simulated AI. "Active participants" ranked
   against each other only means something once other real crewmates can
   send armies at the same keep — so this is held, not stubbed out with
   fake data, until that exists.
3. **Damage accounting confirmed for the eventual build:** both numbers are
   **sums across every attack**, not a single battle's number — e.g. 5
   armies dealing 150k/100k/75k/50k/40k defender damage to the same keep
   totals 415k for that capture. Siege damage sums the same way but runs
   much higher, since sieging (`calcSiegePower`, applied via
   `resolveSiegeOutcome`) doesn't cost troops the way `simBattle` combat
   does — a siege-focused army can hit the same keep repeatedly, limited
   only by stamina, not losses. Whoever builds this should sum
   `runBattle`/`simBattle` defender damage separately from siege-power
   hits, per keep-capture, per contributing player — neither collapses into
   the other.

No files changed besides this log and the section 4 roadmap line above.

**Verified:** no code touched; test suite/build unaffected.

## 2026-09-21 — Claude (Sonnet), session 26

### Documentation only — Cooperation tab named "Rally", design scoped, held pending real multiplayer (no code changed)

Owner named the Cooperation tab **Rally** and asked for research into how
"Rally" works in games like *Game of War* / *Lord of the Rings: Rise to
War* before scoping it. Researched (sources: [Game of War Wiki –
Rallying](https://gow-fireage.fandom.com/wiki/Rallying), [HBO Games Support
– Rally Overview](https://hbogamessupport.wbgames.com/hc/en-us/articles/360001088408-Rally-Overview))
and scoped the design against this codebase:

1. **The genre pattern:** a crewmate becomes rally leader, picks a valid
   target, sets a join window (minutes to hours). Other crewmates join by
   marching their own army toward the rally during that window — each
   reserves a slot the moment they commit troops, and can still recall
   before the window closes; once it closes only the leader can cancel.
   Capacity is capped (by the leader's building level in most of these
   games). When the window expires, every joined army combines into **one
   attack** on the target, not separate fights. Personal buffs stay
   personal — they only apply to that player's own troops within the
   combined force.
2. **Mapped onto this codebase:** the target should be the crew's pinned
   Rally Target (`crew.rallyTarget` label, founder/officer-set — session
   19 already scoped this as needing a real Objectives/map-pin system, not
   raw tile-selection) pointed at a world-map Keep. This is the exact
   "group effort" siege Records (session 25 above) was scoped around — a
   Rally's joined armies are what would generate the multiple
   defender-damage/siege-damage entries Records sums per capture. So Rally
   is the mechanism, Records is the log of what it produced; build them
   together, not independently.
3. **Held, not built, same reason as Records and Crew Help:** there is
   exactly one real player today (`"player"`); joining a crewmate's rally
   with a second real army is meaningless until real multiplayer exists.
   Building a fake single-player version (e.g. auto-combining your own
   armies) would invent behavior the real feature doesn't have and would
   need throwing away later, so this stays documentation-only per the
   owner's call.

No files changed besides this log and the section 4 roadmap line above.

**Verified:** no code touched; test suite/build unaffected.

## 2026-09-21 — Claude (Sonnet), session 27

### Documentation only — Rally mechanic fully specified (no code changed)

Owner locked down the actual Rally rules, refining session 26's genre
research into this game's exact design:

- **Target confirmed:** Keeps.
- **Who can initiate:** founder or an officer — same permission tier as
  Diplomacy and the existing Rally Target label (`isFounderOrOfficer()` in
  `shared/utils/crewRules.js`), not any member.
- **Capacity:** leader + 4 more armies, 5 total.
- **Control on timer expiry:** the whole combined force comes under the
  founder's control, as if it were his own single army — contributing
  crewmates don't keep independent control of their troops once the rally
  fires.
- **Early end:** the leader can end the rally before the timer expires and
  immediately assume control of whatever armies are already stationed in
  it at that moment (doesn't need to wait for a full 5).
- **Stamina:** the rally moves/acts at the stamina of its *weakest*
  contributing army — the lowest stamina among all joined armies caps what
  the combined force can still do, not an average or the leader's own.
- **Leader control while active:** the leader can rearrange (reorder) or
  dismiss individual armies from the rally both while the join timer is
  still running and after taking control post-timer/post-early-end.

This is now a complete spec, not just genre research — still not built,
same multiplayer blocker as session 26: joining with a second real army
needs other real players first. Whoever builds this should treat the bullet
list above as the acceptance criteria.

No files changed besides this log.

**Verified:** no code touched; test suite/build unaffected.

- Add a new dated entry above (don't overwrite prior entries).
- Note: file changed, function/line, what was broken, what the fix does,
  and any follow-up/known issues.
- Keep entries short — this is a change log, not a full diff.
