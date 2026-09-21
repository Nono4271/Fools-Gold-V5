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

## 2026-09-20 — Separate 3D demo polish v2

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
  prop/selection presentation, and full-world rollout of the approved dark
  terrain and two-family resource art.

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
- **Map graphics:** the dark grass, joined territory treatment and two
  resource-art families now cover the full world. More terrain/prop variation,
  crossings, gates, keeps and seven faction bases remain.
- **Commander map visuals:** Redwake Fynn and Admiral Brine have purpose-built
  walking/standing map sprites. Other commanders still use circular portraits and
  need their own sprites.
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
- The remaining seven faction bases, keep/mob/commander map sprites, added
  terrain variation, gate/crossing polish and mobile UI polish are incomplete.
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
- **Art still needed from the owner's ChatGPT-art queue (blocked on weekly
  usage reset, per owner):** the 4 Ancients (T4), the 15 neutral units, AND
  now the neutral/Ancient camp structures (map sprite — small/medium/large
  footprint, per-tier or per-unit visual). Camps are new to this list as of
  the live map wiring above; everything else was already known.
- Define Season Chapters before gates, crossings, Holy Grail access, war
  declarations, seasonal objectives and server APIs.
- Define Crew 2.0 roles/data before Crew chat permissions, diplomacy, wars,
  structures, logs and the table UI.
- Finalize deterministic shared battle/economy rules before making the server
  authoritative.
- Full-world terrain/resource rules are complete. Finish keep/gate/base
  placement polish before the final performance pass.
- Complete server identity/persistence before real chat, Crew ownership,
  diplomacy and season progression.

## 8. Recommended Alpha/Beta implementation order

1. Finish the current map-art direction: seven faction bases, keep sprites,
   gate/crossing tuning, mob sprites and remaining commander sprites.
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
- **DONE:** Expanded the approved terrain/resource tile and prop treatment
  across the whole map while keeping drawing limited to the visible area.
- Monitor and tweak gates/crossings to match the owner's desired Rise to War
  style, chapter locks and play flow.
- **DONE:** March routes use dotted lines, repeated directional arrows and a
  clear target endpoint.
- **IN PROGRESS:** Redwake Fynn and Admiral Brine map sprites are complete;
  create purpose-built sprites for the remaining commanders.
- Create sprites for all remaining mobs/neutral encounters.
- Create sprites for keeps and blend them with the new map style.

---

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

- Add a new dated entry above (don't overwrite prior entries).
- Note: file changed, function/line, what was broken, what the fix does,
  and any follow-up/known issues.
- Keep entries short — this is a change log, not a full diff.
