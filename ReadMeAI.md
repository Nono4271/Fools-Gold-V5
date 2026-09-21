# ReadMeAI — Change Log for AI Collaborators

This file is for other AI tools (GPT, Astra, etc.) working on this repo.
It's updated with every change so you can follow what's been done and why,
without needing to re-diff the whole codebase.

Branch: codex/core-fixes-20260919

---

## 2026-09-20 — Claude (Sonnet 5)
### AI income now matches the player; AI troop hand-out cap fixed (both flagged in the previous AI entry)

**1. AI income (was per SECOND, player's is per HOUR).**
- Before: `useAI.js` `tickAiRss` (every 1 s) added +5 of each resource and `rssRate(building level)` **per owned resource tile** each tick. The player's `resourceIncomeTick` gives 200 base + `rssRate` per hour, plus per-tile hourly rates by power level. So AI base income was 90x the player's and its tile income thousands of times.
- Now: `shared/utils/resourceIncome.js` `aiResourceIncomeTick(previous, tiles, tileKeys, buildings, elapsedMs)` uses the **same** rules as the player (the base-income, per-tile and storage-cap math was extracted into shared helpers that `resourceIncomeTick` also uses; its behavior is unchanged, existing tests pass). It credits real elapsed time (`useAI.js` keeps `lastRssTickRef`, the worker's `aiRssTick` carries `now`), so a throttled/backgrounded worker catches up on the next tick instead of losing time. The AI's cap is now `storageMax(storage level)` (200k at level 0) instead of 9,990,000. AI has no forts or tome bonuses, so those parts are skipped.
- **Also fixed while here (income was being lost):** the worker used to send back the ABSOLUTE post-spend resource totals (computed from a snapshot up to a few seconds old), overwriting income credited since. It now sends only what was **spent** (`rssSpent` in the `aiEconReady` message; helpers `rssSpent`/`applyRssSpent` in `shared/utils/aiEconomy.js`) and the main thread subtracts it from the live totals (clamped at 0). `useGameLoop.js` also builds `aiRss`/`aiBldgs` in the snapshot from the live maps at send time instead of the render-synced copies. The old `rssUpdates` field is gone.

**2. AI troop hand-out cap.** Before: worker `_cmdCap(lvl)` did `lvl + CC[lvl]` where `CC` is the **command-centre** bonus table indexed by the **commander's level**, so a lvl-5 commander had 18 command points = 1,800 troops (and the faction's real command centre was ignored). Now `aiTroopCap(cmdLvl, commandCenterLvl)` (`shared/utils/aiEconomy.js`) = `cmdCommand(level, command-centre level, 0) / 0.01`, the player's rule: lvl 5 with no command centre = **500** troops, and it grows as the AI upgrades its command centre. `AI_TROOP_COMMAND_COST` (0.01) is a mirror of `COMMAND_COST.small` (the worker can't import troops.js without bundling all troop data); a test pins them together. Real-worker check: a lvl-20 commander gets 2,000, a lvl-5 gets 500.

**Behavior changes to expect:** AI factions are now genuinely resource-limited (a faction with no tiles earns 200/hour of each resource), so training (900 wood / 700 gas / 1400 food per 100 troops, from the previous entry) and building upgrades will be slow until it owns resource tiles. If AI feels too passive now, tune the AI-specific numbers (`AI_TRAIN_COMMAND`, starting `aiRss` of 5,000 each in the worker fallback, starting pool) rather than income.

**Still not touched:** the AI building-upgrade cost table in the worker (`BLDG_COST`, `_upgCost`) is separate from the player's real costs; and the starting pool is still handed out on the first tick (now 500 per lvl-5 commander instead of 1,800).

**Tests:** `tests/aiIncome.test.js` (5: 200/h base, tile rates, equals the player's tick for identical holdings, per-second ticks sum to an hour and late ticks catch up, storage cap and no-ops); `tests/aiEconomy.test.js` +3 (troop cap incl. pin to `COMMAND_COST.small`, no 1,800 swallow, spend-delta helpers). Suite: 291 pass; 3 fail = the `esbuild`/`pixi.js` missing-package tests. `npm run build` not run here.

---

## 2026-09-20 — Claude (Sonnet 5)
### Register/login "Request failed": the client could never reach the game server on a deployed site

**Root cause (deployment, not the server):** `playerIdentity.js` `postAuth` fetched the relative path `/api/register`. That only works in dev (Vite proxies `/api` -> `localhost:3001`). On a static host (the Cloudflare Pages build in the deploy log; Netlify/Vercel behave the same) `/api/register` is answered by the static site itself (404/405, or the SPA fallback's HTML), never by `server/index.js`. The reply isn't JSON, so the old code fell through to the generic "Request failed". The websocket already had the right escape hatch (`VITE_WS_URL`); the HTTP auth calls didn't. The "Offline" badge in the game HUD is the same cause: no game server reachable from the deployed site.
Verified the server itself is fine: ran `server/index.js` locally and exercised `POST /api/register` (creates), duplicate register ("Username already taken"), `/api/login`, bad body (400) and `OPTIONS` (204, CORS `*`) with curl.

**Fix:**
- `src/utils/apiBase.js` (new, pure) `resolveApiBase({ apiUrl, wsUrl })`: `VITE_API_URL` if set, else the origin derived from `VITE_WS_URL` (`wss://host[/path]` -> `https://host`, `ws://` -> `http://`), else same-origin (dev proxy keeps working unchanged). So setting the one variable the websocket already needs also fixes accounts.
- `playerIdentity.js` `postAuth` uses that base and now distinguishes failures: network/CORS/mixed-content -> "Can't reach the game server..."; non-JSON reply (static host 404/405 or SPA HTML) -> "The account server isn't reachable from this site (HTTP nnn)..."; server errors pass through; a success without `accountId`/`username` is rejected instead of silently storing `undefined`.
- `server/index.js`: an exception inside register/login (e.g. unwritable `server/data/accounts` on a read-only host) now returns a JSON 500 ("Account server error") instead of killing the request.

**What you have to do to make accounts work in production (not code):**
1. Host `server/` somewhere that runs Node (Render, Railway, Fly, a VPS...). It needs a **persistent disk** for `server/data/` (accounts, sessions) or accounts vanish on redeploy. `npm run start:server` (reads `PORT`).
2. Serve it over **HTTPS/WSS** (an https page can't call an http server or ws://).
3. In the Cloudflare Pages project add build variable `VITE_WS_URL=wss://<your-server-host>` (or `VITE_API_URL=https://<your-server-host>` for just the API), then **redeploy** - Vite bakes these in at build time. If a reverse proxy puts the server under a path prefix, use `VITE_API_URL` explicitly.

**Tests:** `tests/apiBase.test.js` (3) and `tests/authClient.test.js` (5: static-host 405, SPA HTML 200, network failure, server errors pass through, success adopts the account). Suite: 283 pass; 3 fail = the `esbuild`/`pixi.js` missing-package tests. `npm run build` not run here.

---

## 2026-09-20 — Claude (Sonnet 5)
### AI stamina (matches the player) + AI barracks no longer refills every tick

**1. AI stamina, same rules as the player.** New shared rules in `shared/utils/tactics.js`: `AI_STAMINA_MAX` (= `STAMINA_BASE`, 150, no tome bonus), `MARCH_STAMINA_COST` (`attack` 20, `move` 10), `marchStaminaCost`, `canAffordMarch`, `spendMarchStamina` (missing stamina counts as full, same as `regenStamina`). `Game.jsx` now uses `marchStaminaCost(type)` instead of the inline `type === "attack" ? 20 : 10` (behavior unchanged).
- **Spend:** `useAI.js` `tickAiMarch` drops a dispatch when the commander can't afford an attack, re-checks against the live commander when the path comes back, and deducts 20 on dispatch (like the player). AI marches are attacks; retreats/recalls stay free, as for the player.
- **Regen:** `useTacticTicks.js` takes `setAiCmds` and regens AI commanders in the same +1-per-3-min tick as the player's, using the same real-elapsed-time catch-up and `visibilitychange` behavior (+20/hr, capped at `AI_STAMINA_MAX`).
- **Worker:** `useGameLoop.js` puts `stamina` in the AI commander snapshot, and `gameLoop.worker.js` `tickAiMarch` skips exhausted commanders before the cooldown (they don't burn the 15 s march cooldown). The main-thread check stays authoritative.

**2. AI barracks refill fixed.** Root cause: the "Train troops" step in the worker's `tickAiEcon` (every 5 s) added up to 500 troops to the faction pool for a flat 500 wood / 500 gas / 1000 food whenever the pool was below its cap, i.e. ~6,000 troops/minute, instantly, forever.
Now `shared/utils/aiEconomy.js` `aiTrainingTick` models it like the player's training queues: troops come in commands of 100 (small branch), each command is **paid when training starts** at the player's tier-0 small price (900 wood / 700 gas / 1400 food) and **takes 12 real minutes** (player tier-0 small time), and lands in the pool only when it finishes. Concurrent commands = `trainingQueueCount(training level)` per AI commander in the faction (each AI commander stands in for a player), and it never trains past the barracks cap counting troops still in training (same rule as the player's `train` reducer). Finish times are real timestamps, so a throttled worker still delivers everything that finished. The worker now keeps each faction's queue and pool locally (`aiEconLocal`, reset on `init`) instead of rebuilding the pool from the 2 s snapshot; it still posts `poolUpdates` to the main thread as before.
- **Also changed:** the worker's barracks capacity curve was `2000*45^((lvl-1)/9)` (about 7x the player's at lvl 10); it now uses the player's `barracksCapacity` from `shared/constants/buildings.js`.
- Sanity run of the real worker for two ticks (2 troopless commanders at HQ, pool 2000): tick 1 hands out 1800 + 200 and starts training; tick 2 leaves the pool alone (before: +500 every tick).

**Behavior change to expect:** AI factions rebuild troops slowly now (12 min per batch, resource-limited), so after the starting pool is handed out, AI commanders wait for training. Tune with `AI_TRAIN_COMMAND` / `aiTrainingSlots` in `shared/utils/aiEconomy.js` if they feel too passive.

**Not fixed, flagged (found while in here):**
- **AI resource income is per SECOND, the player's is per HOUR.** `useAI.js` `tickAiRss` runs every 1 s and adds +5 of each resource plus `rssRate(building level)` per owned resource tile per tick; the player's `resourceIncomeTick` uses 200 base + `rssRate` per **hour**. That is 90x the player's base and thousands of times the tile income. It doesn't cause the barracks refill anymore (training is time-gated), but AI resources are effectively unlimited. Fix when wanted: divide by 3600 / use elapsed-time scaling like `resourceIncomeTick`.
- **Troop hand-out cap** (`troopsPerCommand = 0.01` => 100 troops per command slot, ~1,800 for a lvl-5 commander) is unchanged, so the starting pool can still go to one or two commanders in the first tick (the "troop-burst" note below).
- AI `walls`/other building upgrade costs use a separate cost table from the player's; not touched.

**Tests:** `tests/aiEconomy.test.js` (5: cost/time/delivery, no refill every tick over a simulated hour, slot/cap/money limits, more queues with level/commanders, late-tick catch-up) and `tests/aiStamina.test.js` (4: shared costs/max, spend on dispatch, runs dry after 7 attacks, regen +20/hr with cap and catch-up). Suite: 275 pass; 3 fail = the `esbuild`/`pixi.js` missing-package tests (no `node_modules` in the sandbox). `npm run build` not run here.

---

## 2026-09-20 — Claude (Sonnet 5)
### Bug fix: AI commanders attacking tiles way above their level

Reported: a fresh server had an AI commander capture a P9 tile (defended by
a level-28-ish garrison commander) within minutes — a level-5 AI commander
had no business touching that fight.

Root cause: AI target selection (`tickAiMarch`, worker picks nearest
frontier tile in `src/workers/gameLoop.worker.js`; main thread dispatches
in `src/hooks/useAI.js`) had **no concept of tile difficulty at all** — it
only ever picked the geometrically nearest unowned tile next to the AI's
territory, regardless of that tile's power level or garrison strength.
Combined with the AI's economy tick being able to hand a fresh level-5
commander ~1,800 troops in its very first tick (a separate, not-yet-fixed
issue — see the troop-burst note below), a low-level commander could reach
and fight a P9 tile almost immediately.

Fix (`src/hooks/useAI.js`): added `aiCanChallenge(cmdLvl, tile)`, gating a
dispatch by the tile's `powerLevel` against a minimum commander level table
that mirrors the actual defender levels `factionDefCmdForTile`/
`FACTION_CMD_CONFIG` assign per power level (P4=lvl8 ... P13=lvl50; P0-P3
have no elite defender and stay unrestricted). `tickAiMarch` now drops any
worker-proposed dispatch that fails this check — the commander just stays
idle and gets reconsidered next march-check cycle instead of marching in.

Scoped where the fix lives: the check runs on the **main thread**, not in
the worker's `tickAiMarch`, because the worker's tile snapshot is
deliberately a lightweight "defeated tiles only" index (kept small so it
doesn't scan/serialize the full ~490k-tile map every tick) — it doesn't
carry `powerLevel` for untouched tiles. The main thread's `tilesRef` has
the real tile data, so the gate runs there instead, after the worker
proposes a target but before a march is actually dispatched.

**Known trade-off, not fixed here:** if a commander's nearest (or only)
frontier tile is above what it can challenge, it'll just sit idle near that
tile every march-check cycle until either it levels up or a weaker
frontier tile opens up elsewhere — it doesn't yet route *around* a blocked
tile to the next-nearest one it could actually take. Acceptable for now
(an idle AI commander is a much smaller problem than one steamrolling
overleveled tiles), but worth revisiting if AI expansion looks too passive
near power clusters.

**Not fixed in this pass** (flagged, not addressed): the troop-burst issue
mentioned above — a fresh AI commander can get handed close to its full
troop capacity (~1,800 for a level-5 commander) in a single 5-second
economy tick right after server start, instead of building up gradually.
The level gate above stops it from *reaching* tiles it can't handle, but
the troop number itself is still unrealistically fast for a "fresh
account." Left for a follow-up if wanted.

`npm test` (275/275) and `npm run build` both pass.

---

## 2026-09-20 — Claude (Sonnet 5)
### Session continuity: progress now survives a reload, and follows a login

Follow-up to round 4 (login system). Two gaps that would have bitten during
a deep testing pass, closed:

**1. sessionId is no longer regenerated every load.** `Game.jsx` used to do
`useState(() => "fg-" + random())` — a brand-new session every time the page
loaded, even in the same browser, so the server's disk-persisted session
(round 3) never actually got reconnected to in practice. Now
`getOrCreateSessionId()` (`src/utils/playerIdentity.js`) persists it in
`localStorage`, same pattern as the existing `playerId`.

**2. Logging in resumes the account's last session, anywhere.** `server/auth.js`
now keeps a small `server/data/account-sessions/<accountId>.json` mapping
each account to the last `sessionId` it was seen on — written on every
`GAME_INIT` from a connection whose `playerId` is an account id
(`server/index.js`, `if (ws._playerId?.startsWith('acct_'))`). `/api/login`
and `/api/register` now return `lastSessionId` alongside `accountId`, and
the client's `loginAccount`/`registerAccount` (`playerIdentity.js`)
overwrite the local sessionId with it when present — so logging in on a
different browser/device picks up the same in-progress game instead of
starting fresh.

Live-verified: registered an account (`lastSessionId: null`), sent a
`GAME_INIT` for a session under that account's id, then logged in again —
the response correctly returned that same `sessionId`.

`npm test` (275/275) and `npm run build` both pass.

**Still not done:** this only tracks the *last* session an account touched
— no list of multiple in-progress games per account, no way to explicitly
switch sessions from the UI. Fine for one save slot per account, which is
what solo testing needs right now.

---

## 2026-09-20 — Claude (Sonnet 5)
### Pre-multiplayer prep, round 4: username/password accounts + TILE_PATCH viewport filtering

Two of the previously-flagged gaps, closed:

**1. Username/password accounts (server/auth.js, new)**
- `POST /api/register` / `POST /api/login` on the same HTTP server the WS
  upgrade already runs on (server/index.js now creates an `http.Server` and
  passes it to `WebSocketServer({ server })` instead of listening on a bare
  port itself). Vite's dev proxy gained a matching `/api` → `localhost:3001`
  entry (vite.config.ts).
- One JSON file per account under `server/data/accounts/<username>.json`
  (gitignored, like `server/data/sessions/`), password salted+hashed with
  scrypt, compared with `crypto.timingSafeEqual`. No sessions/tokens — a
  successful login/register just returns `{ accountId, username }`.
- **Not a real identity provider**: no email verification, no password
  reset, no rate limiting, no HTTPS enforcement (that's the deploy
  environment's job). Good enough to give a player a stable identity across
  browsers/devices; scoped no further than that.
- Client side (`src/utils/playerIdentity.js`): `loginAccount`/
  `registerAccount` POST to those endpoints and, on success, overwrite the
  same `localStorage` key `getOrCreatePlayerId()` already used — so logging
  in doesn't add a second identity system, it just replaces the per-browser
  guest id with the account's id going forward. `getAccountUsername()` reads
  back the stored username for display.
- UI: `src/components/screens/LoginModal.jsx` (new), opened from a "Log In /
  Register" link on `TitleScreen.jsx`. Fully skippable — declining leaves
  the existing per-browser guest id in place, same behavior as before this.

**2. TILE_PATCH viewport filtering (server/index.js)**
- This was the explicitly-flagged gap from round 3: `VIEWPORT_SUB` already
  narrowed a client's *snapshot* re-syncs, but the live `TILE_PATCH`
  broadcast still went to every client in the session regardless of what
  they could see.
- `applyAndBroadcast` now checks each connection's last-known `ws._viewport`
  (set on `GAME_INIT`/`VIEWPORT_SUB`) and only forwards the patches for
  tiles inside it; a connection with no known viewport yet still gets
  everything (safe fallback — same behavior as before this change).
- If none of a batch's patches fall inside a given client's viewport, that
  client isn't sent a message at all for that broadcast.

Live-verified against a running server (temporary script, not committed):
two clients joined the same session with viewports on opposite sides of the
map; a capture on a tile inside client A's viewport but far outside client
B's was NOT delivered to B as a TILE_PATCH, while A (the sender, already
applied optimistically) and the server's own tile state both updated
correctly. Register/login/duplicate-username/wrong-password all verified
against the real HTTP endpoints with curl.

`npm test` (275/275) and `npm run build` both pass.

**Still not done** (unchanged from before, not addressed this round): no
faction/commander identity verification on a capture (WHAT is attacking is
still trusted from the client, only WHO — via playerId/accountId — and the
siege math are verified); no audit of other possibly-missing mutable tile
fields beyond the `isGate` fix from round 2.

---

## 2026-09-20 — Claude (Sonnet 5) — Pre-multiplayer prep, round 3: player identity binding, live viewport tracking, session persistence/reconnect

Follow-up to the two entries directly below. Owner picked the item flagged as still-open last round
(player identity wasn't verified) plus items 3 and 4 from the original 10-item pre-multiplayer list
(wire VIEWPORT_SUB as the player pans; durable accounts/reconnect), scoped down first via two
questions: identity binds captures to the connection's own id (not just logged), and persistence
covers disk snapshots + clean reconnect (not a full account/login system — there still isn't one).

**1. Player identity binding**
- New `src/utils/playerIdentity.js` — `getOrCreatePlayerId()` returns a stable id stored in
  `localStorage` (falls back to a session-only id if storage is unavailable). Explicitly NOT real
  authentication — no login, no server secret — just enough for the server to tell one connection
  from another, which is what was actually missing.
- `Game.jsx` generates this once and passes it into `useServerSync`.
- `useServerSync.js` sends it as `playerId` on `GAME_INIT`.
- `server/index.js` stores it as `ws._playerId`. `handleTileCapture` now rejects a "player"-owned
  capture from a connection with no registered identity, and stamps `ownerPlayerId` on a successful
  capture from `ws._playerId` — never from anything the client puts in the capture message. This
  closes the "one connection could claim a capture as if it were a different player" gap.
  `owner`/`defCmd` (WHAT is attacking — which faction/commander) are still taken from the client's
  claim as before; this only binds WHO (which player) gets credited.

**2. Live viewport tracking (VIEWPORT_SUB wired from the client)**
Last round only sent a starting viewport once, on `GAME_INIT` (roadmap item 5). The server already
supported re-filtering via `VIEWPORT_SUB`, but nothing sent updates as the player panned afterward.
- `shared/constants/geometry.js` — added `worldToTile` (inverse of `isoXY`) and `viewBoundsCR`
  (pan/zoom → tile-coordinate box), as pure, importable functions. Deliberately NOT wired into
  `MapRenderer.jsx`'s own (render-critical, already-correct) `getViewBounds` — that stays untouched;
  these are additions for `useServerSync` to reuse the same transform, not a refactor of rendering.
- `useServerSync.js` polls `panRef`/`zoomRef` (now passed in from `Game.jsx`, which already owned
  them) every 3s, and sends `VIEWPORT_SUB` when the view has moved more than ~20 tiles since the
  last one sent (throttled — panning fires every pointer-move frame, a tile region doesn't need
  sub-second freshness).
- Scope note, not fixed here: this only re-requests a snapshot for newly-visible tiles. It does NOT
  filter the ongoing `TILE_PATCH` broadcast, which still goes to every client regardless of their
  current viewport — filtering live patches is a bigger change (risk of a client missing an update
  to a tile it cares about for a non-viewport reason — minimap, leaderboard) and is left for a
  follow-up.

**3. Session persistence + reconnect (`server/index.js`)**
- Each session's tile Map is periodically snapshotted to `server/data/sessions/<id>.json` (added to
  `.gitignore`) — every 30s if the session has unsaved changes (`session.dirty`), on `SIGINT`/
  `SIGTERM` before exit, and right before the existing 5-minute empty-session cleanup deletes a
  session from memory.
- `getOrCreateSession` now checks disk before creating a fresh in-memory session, so a session
  outlives both a server restart and the 5-minute idle-cleanup window. Any garrison reset that was
  still pending when a session was saved is rearmed on load (timers don't survive a process
  restart, same reasoning as the original GAME_INIT rearm logic this mirrors).
- A reconnecting client sending the same `sessionId` falls into the existing "subsequent client —
  push current state" branch of `handleGameInit`, so it gets its own persisted state back rather
  than the server accepting whatever (possibly stale) tiles the reconnecting client's browser still
  has locally.
- Still not a real account system: single JSON file per session, no migrations, no multi-server
  scaling, and a session id is still just whatever the client already generates — there's no login
  tying a session to a person across devices/browsers. `playerId` (above) identifies a connection
  within a session, not a durable account.

Live-verified against a running server (temporary scripts, not committed): a capture attempt with no
registered identity was rejected; a real capture correctly stamped `ownerPlayerId` to the attacking
connection's id, confirmed by a 4th, uninvolved client reading the tile back; a session was captured,
the server process was sent `SIGTERM`, restarted, and a fresh client reconnecting to the same
`sessionId` received the exact same tile state (including `ownerPlayerId`) back from disk.

`npm test` 275/275, `npm run build` clean.

---

## 2026-09-20 — Claude (Sonnet 5) — Pre-multiplayer prep, round 2: server independently verifies captures + isGate fix

Follow-up to the entry directly below. Owner picked 2 more items from the pre-multiplayer punch
list: closing the biggest gap flagged as NOT done last round (server still trusted the client's
claimed siege/garrison numbers), and the small `isGate` fix that was also flagged as a known
limitation there.

**1. Server now independently recomputes siegePower and decides the real outcome**
- `src/hooks/useMarch.js` — new `attackerComposition(cmd, boostedCmd)` builds the troop composition
  (`{ troopSlots }` or `{ troops, troopBranch }` + `armySiegeBonus`) behind a `cmdSiegePower` call, in
  the exact wire shape the server can recompute from. Threaded through all 3 player-attacking
  capture/siege-decision sites (the same 3 refactored to use `resolveSiegeOutcome` last round). AI
  captures still don't emit to the server at all — pre-existing behavior, unchanged, out of scope.
- `src/hooks/useServerSync.js` — `emitTileCapture`/`emitTileSiege` take an optional 3rd `attacker` arg
  and include it on the wire. Omitting it (older client) falls back to the old trust-the-client
  behavior, so this is backwards compatible.
- `server/index.js` — new `computeSiegePower(attacker)` calls the same shared `calcSiegePower`
  (`shared/constants/map.js`) + `FACTION_TROOPS` (`shared/constants/troops.js`) the client uses, then
  feeds the result into `resolveSiegeOutcome` to get the actual authoritative outcome. When the
  server disagrees with what the client optimistically applied (claimed a capture the numbers don't
  support, or understated one that should have landed), it applies its own outcome and broadcasts it
  to **every** client, including the one that sent the wrong claim — `applyAndBroadcast`'s "skip the
  sender" optimization is only used when the server agrees.
  Deliberately mirrors a client quirk rather than fixing it: `cmdSiegePower`'s legacy (non-`troopSlots`,
  AI-commander-shaped) branch never actually passes tier data into `calcSiegePower`, so it silently
  falls back to a flat 0.5-per-troop rate regardless of `troopBranch`. The server's `computeSiegePower`
  reproduces that exactly — the goal here is validating against what the client itself would compute,
  not a "more correct" formula, since that would be an unrequested balance change.
  Live-verified against a running server with real multi-client tests (temporary scripts, not
  committed): a legitimate large army correctly captured; a claimed capture from a tiny force was
  rejected and downgraded to real chip damage; a second, honest client connected to the same session
  confirmed it saw the server's correction (owner stayed unclaimed), not the first client's dishonest
  claim.
- Still NOT done: player identity/ownership isn't verified — the server takes `owner`/`defCmd` (who is
  attacking) from the client's claim as-is. That's a separate, bigger auth item.

**2. `isGate` added to the mutable tile state sent to the server**
`src/hooks/useServerSync.js`'s `extractMutableState` was missing `isGate` entirely, so the server's
`garrisonResetMs` (added last round) could never tell a gate's 1-hour garrison reset from a regular
tile's 15-min one — it silently used the 15-min default for every gate. One-line fix: `isGate` is now
part of the mutable tile shape, same as `isHQ`/`isKeep`.

`npm test` 275/275, `npm run build` clean.

---

## 2026-09-20 — Claude (Sonnet 5) — Pre-multiplayer prep: shared capture rule, server validation/idempotency, chunked initial sync

Owner picked 3 of the pre-multiplayer punch-list items from "5. Technical debt to fix before
multiplayer" / "9. Must be complete before real multiplayer conversion" to start now, ahead of a
real authoritative server existing:

**1. Moved the tile-capture decision rule into `shared/` (new `shared/utils/captureRules.js`)**
The "does this siege capture the tile, and what's the resulting patch" logic was duplicated across
~6 call sites in `src/hooks/useMarch.js` (player attacking, player rematch, AI attacking) with small
inconsistencies between them (some hardcoded `Date.now()+180000` instead of the `TILE_PROTECTION_MS`
constant; one AI-capture site never granted the protection window at all; another reset siegeMax to
a flat 300 regardless of the tile's own siegeMax). `resolveSiegeOutcome({ tile, siegePower, now,
capture, defeatedWaves })` is now the single source of truth, pure and clock-injectable so it's
testable and importable from `server/index.js`. Every pre-existing per-site quirk (no-protection AI
capture, the flat-300 siegeMax site) was preserved via explicit `capture.protect`/`capture.siegeMax`
options rather than silently unified — this is a refactor, not a balance change.
`garrisonResetMs` (keep/gate = 1hr, else 15 min) moved into the same file.

**2. Server-side validation/idempotency/timestamps (`server/index.js`)**
- `TILE_CAPTURE`/`TILE_SIEGE` now require a client-generated `msgId`; the server keeps a
  per-session dedupe cache (5-min TTL) and silently ignores a resent/duplicate message instead of
  re-applying and re-broadcasting it.
- Added range validation: `owner` against the existing allow-list (unchanged), plus new checks that
  `garrison >= 0` and `siege <= siegeMax`.
- `resetAt` and `protectedUntil` are now computed server-side (`Date.now()` + the shared
  `garrisonResetMs`/`TILE_PROTECTION_MS`) instead of trusted from whatever the client sent — closes
  a clock-skew/tamper gap (a client could previously claim an arbitrarily long protection window).
- Known limitation carried forward, not introduced by this change: the mutable tile shape sent to
  the server doesn't include `isGate`, so the server can't yet tell a gate's 1-hour reset from a
  regular tile's 15-min reset. Needs a follow-up to `extractMutableState` in `useServerSync.js`.

**3. Chunked the initial map sync (`GAME_INIT`/`SESSION_STATE`)**
The server already did patch-based sync for *updates* (`TILE_PATCH`) and had an unused
`VIEWPORT_SUB` viewport filter; the gap was the *initial* load on join, which sent every mutable
tile in the session regardless of size. `useServerSync.js` now sends an `initialViewport` alongside
`GAME_INIT` (Game.jsx passes a ±50-tile box around the player's HQ); `handleGameInit` in
`server/index.js` uses it to filter `SESSION_STATE` for a joining client instead of dumping the
whole session. An older/viewport-less client still gets the full set (backwards compatible).
Live-verified against a real running server instance (temporary local WS smoke test, not committed):
confirmed a far-away tile (500,500) was excluded from a joining client's `SESSION_STATE` when it
sent a small viewport, and confirmed a duplicate `TILE_CAPTURE` with the same `msgId` was ignored.

`npm test` 275/275, `npm run build` clean. Not done in this pass (explicitly deferred, not
forgotten): the server still doesn't independently recompute `siegePower` from troop data to verify
a claimed capture — it validates ranges/idempotency/timestamps but still trusts the client's
owner/garrison/siege numbers. That's the bigger "server owns world truth" item (#1/#3 on the
10-item pre-multiplayer list) and needs the server to have its own copy of army/troop state, not
just tile state.

---

## 2026-09-20 — Claude (Sonnet 5) — Troop tuning pass #3: the 5 remaining z-score flags

After pass #2, the efficiency z-score gate still flagged 5 different units (a side effect of pass
#2 shrinking each tier's mean/std-dev, not a new problem — see pass #2's note on this). Owner asked
whether those 5 were also in a good win-rate range and gave one new standing rule: Ancients are
meant to be the strongest T4s in the game (stronger than every faction capstone), so their target
band is 55-65%, not ~50%.

**Before → after (single-unit-vs-own-tier-bracket win rate, 40 seeded trials per opponent):**

| Unit | Before | Target | After |
|---|---|---|---|
| dragons/dragonkin T1 (Scaleblade) | 74.6% | ~50% | 53.3% |
| holyknights/templars T1 | 51.1% | ~50% | 49.2% (already fine, untouched) |
| neutral/pirate_deserter | 54.6% | ~50% | 54.8% (already fine, untouched) |
| neutral/feral_bloodfang | 72.3% | ~50% | 53.2% |
| ancient/aeonspire | 40.2% | 55-65% | 57.0% |

**Changes:**
- `shared/constants/troops.js` — `dragons/dragonkin` T1 (Scaleblade): dmgLo 15→13, dmgHi 19→17;
  Predator's Dive (skill a, double_attack, T1-only) procBase 0.20→0.14, procMax 0.70→0.50.
- `shared/constants/neutralTroops.js` — `feral_bloodfang`: dmgLo 20→19, dmgHi 25→23, def 20→19,
  hp 36→34; Feral Frenzy (double_attack) procBase 0.25→0.17, procMax 0.65→0.50. (First pass
  overshot to 36.1%/70.7%-ish territory before landing here — see the iteration note below.)
- `shared/constants/ancientTroops.js` — `aeonspire`: raw stat block (dmgLo/dmgHi/def/hp/siege/spd)
  left untouched — a first attempt buffed those directly but broke
  `tests/ancientTroops.test.js`'s "every Ancient stat block lands 15-20% above the large-capstone
  baseline" check, so the buff was moved entirely into skill values instead, which aren't
  constrained by that test: Timeless Vigil (skill a, vs_all_dmg_up) value 0.15→0.25, procBase
  0.20→0.26, procMax 0.55→0.65; Arcane Barrage (skill c, bonus_damage) value 0.55→1.00, procBase
  0.25→0.35, procMax 0.60→0.75.

Both dragonkin T1 and feral_bloodfang needed a corrective second pass (first cut undershot
dragonkin fine but overshot feral_bloodfang to 36%; the fix above is the corrected/final version)
— same non-linear-tuning behavior documented in pass #2.

`npm test` 275/275, `npm run build` clean. Efficiency z-score gate now flags 4 units (down from 5):
`holyknights/templars T1`, `dragons/drake_riders T2`, `neutral/pirate_deserter`, `ancient/aeonspire`
— all of these have measured win rates inside their target bands per the table above and pass #2's
table, so not chased further without new owner direction; this remains the expected relative-metric
"whack-a-mole" behavior, not a bug.

---

## 2026-09-20 — Claude (Sonnet 5) — Troop tuning pass #2: targeted win-rate goals

Follow-up to the two entries directly below. Owner gave explicit per-unit tuning directions this
round, plus a standing rule: dragons faction units are allowed to land a bit hot (55-60% average
win rate across their whole tier) "since they should cost more to train"; every other flagged unit
should land close to 50%. Iterated with a scratch single-unit-vs-bracket win-rate probe (not
committed — a temporary script, not part of `tools/balanceSim/`) to converge, since the full
round-robin matrix is too slow to run after every micro-edit.

**Before → after (average win rate across every same-tier opponent, 60 seeded trials each):**
| Unit | Before | After | Target | In range? |
|---|---|---|---|---|
| `dragons/drake_riders` T2 | 70.0% | **58.7%** | 55-60% (dragon) | yes |
| `dragons/dragonkin` T3 | 66.3% | **57.4%** | 55-60% (dragon) | yes |
| `dragons/sovereign_wyrm` | 64.5% | **59.9%** | 55-60% (dragon) | yes |
| `wizards/spellblades` T1 | 67.4% | **57.9%** | ~50% | close |
| `neutral/wolf_rider` | 75.3% | **55.6%** | ~50% | close |
| `neutral/dune_raider` | 76.2% | **51.2%** | ~50% | yes |
| `neutral/pirate_deserter` | 70.3% | **53.2%** | ~50% | yes |

**Data changes** (all `shared/constants/troops.js` unless noted; all values are the specific
tier's own tier-row or the branch's shared skill, not sibling tiers):
- `dragons/drake_riders` T2 (`Drake Rider`): dmg 32-40 → 31-37, spd 125 → 110; shared skill
  Dragonfire (bonus_damage) 160% → 105% (also lowers T3 `Flamewing`, which wasn't flagged and had
  headroom)
- `dragons/dragonkin` T3 (`Ashfang`): dmg 25-32 → 21-26; shared skill Ember Trail (bonus_damage)
  140% → 80% (also affects T2 `Emberclaw`, not flagged, had headroom). `dragons/dragonkin` T1
  (`Scaleblade`) also trimmed dmg 16-20 → 15-19 per owner direction ("~15% above tier average")
  — this one is now BACK on the efficiency-outlier list (see note below), likely tier-variance
  noise rather than a real problem, given it only carries a single plain double-attack skill.
- `dragons/sovereign_wyrm` (capstone): dmg 33-36 → 27-30 (three incremental trims this + prior
  round); Dragonfire Breath (bonus_damage) 150% → 62% (three incremental trims)
- `wizards/spellblades` T1: Spellstrike (bonus_damage) 120% → 45% (three incremental trims —
  this was the single highest-value skill left in the T1 bracket by a wide margin)
- `neutral/wolf_rider` (`shared/constants/neutralTroops.js`): dmg 15-19 → 13-16, spd 95 → 70
  (speed was ~50% above its T1-small tier average; that was the main driver)
- `neutral/dune_raider`: dmg 22-27 → 19-23, spd 100 → 85, Sandstorm Strike (bonus_damage) 85% →
  70% (owner initially said leave its damage untouched — that was for the PRIOR round's pass only;
  this round's general "keep tweaking, everything else closer to 50" direction covered it too)
- `neutral/pirate_deserter`: dmg 24-29 → 22-26, Cutthroat's Due (lifesteal) 50% → 30%

**Iteration behavior worth flagging:** getting all 7 into range took 3 corrective passes — the
first trim overshot two of them (`drake_riders` to 44.6%, `dune_raider` to 40.9%, `pirate_deserter`
to 32.5%), so they were partially buffed back up. This is normal for this kind of tuning (the
stat/skill-value → win-rate relationship isn't linear or independently separable per unit once
they're all sharing the same tier-relative matchup pool) and is why the win-rate numbers above were
verified directly via simulation at each step rather than estimated.

**Efficiency-outlier metric (z-score vs. tier mean) still shows 5 flags after this pass** —
`dragons/dragonkin` T1, `holyknights/templars` T1, `neutral/pirate_deserter`, `neutral/feral_bloodfang`,
`ancient/aeonspire`. This is the same whack-a-mole effect noted in the entry below: nerfing the
top of a ~25-31-unit tier shrinks that tier's mean/std-dev, so units that were previously fine (or
even already-fixed, like `feral_bloodfang` and `aeonspire`) can pop back over the 2σ line without
their own numbers changing. Given the owner's actual ask this round was specific win-rate targets
(now met, see table above), this entry does NOT chase the z-score list further — that metric and
"is this unit's win rate close to 50%" are related but not the same thing, and flagged here for
whoever picks this up next rather than acted on blindly.

**Tests:** `npm test` — 275 pass, 0 fail. `npm run build` — clean. `npm run test:balance` — 6 of 7
pass; same single efficiency-outlier-metric failure as above, not a regression.

---

## 2026-09-20 — Claude (Sonnet 5) — Battle engine fixes + troop tuning from the balance sim's findings

Follow-up to the balance-testing system entry directly below. Owner asked to act on the two flagged
"engine defect"/"dead skill" findings plus tune the 4 stat/skill outliers toward their tier
averages. **This entry DOES touch `shared/utils/battle.js` combat logic and troop data** — the
prior entry's "testing/reporting layer only, don't touch battle.js/troop data" constraint was for
building the sim itself; this is the owner explicitly directing fixes based on what it found.

**1. Engine bug fix — `on_hit` bonus-damage was being applied to every hit in a double-attack
round, not just the hit it proc'd on** (`shared/utils/battle.js`, attacker-slot hit loop, ~line
3762). `procTroopSkills(..., "on_hit", ...)` rolls all on-hit skill procs ONCE per round, before the
hit loop runs — so when a troop line has both a double-attack skill and a bonus-damage skill (both
`on_hit`), a single successful bonus-damage roll was getting re-applied to BOTH hits of a
double-attack round instead of just one. Confirmed live in round logs before the fix: two separate
"💥 Bonus strike" lines in the same round, one per hit, both driven by the same proc. **Fix:**
`rs.troopBonusDmgMult` is now zeroed out immediately after being consumed by a hit, so one proc
buffs exactly the hit it fired on. Affects any troop line pairing a `double_attack` skill with a
`bonus_damage` skill on `on_hit` — confirmed to matter for `dragons/dragonkin` T3 and
`dragons/sovereign_wyrm` (both pair Predator's Dive/Wing Strike with Ember Trail/Dragonfire
Breath); worth a broader grep for other branches sharing that pairing.

**2. Dead-code fix — `coldborns/raiders`' "Frostbite Strike" skill did nothing** (`battle.js`,
`on_hit_frostbite_chance` case, ~line 1160). The case only ever set `rs.onHitFrostbiteChance`;
nothing else in the file ever read that variable to roll the chance or apply the debuff — confirmed
empirically (0 frost-related log lines across every Raiders battle before the fix). Fixed by
rolling `Math.random() < rs.onHitFrostbiteChance` and applying Frostbite on success, mirroring the
sibling case directly below it (`per_round_frostbite_aoe_chance`, Frost Giants' skill) which
already did this correctly.

**3. Troop data tuning**, all per-branch/per-tier only (sibling tiers of the same branch were left
alone unless they were independently flagged):
- `coldborns/raiders` T1 (`shared/constants/troops.js`): was dead-last in dmg/def/hp/siege among
  all 12 small-T1 branches (dmg 8-11, def 11, hp 14, siege 6) even before the skill fix. Raised to
  dmg 12-16 / def 14 / hp 24 / siege 10 (T1-small tier average). Combined with fix #2: went from
  0/1440 wins across every T1 opponent to a real, if still below-average, win rate.
- `coldborns/frost_giants` T1: dead-last across every stat among all 6 large-T1 branches (dmg
  175-185, hp 610, siege 205 — 30-45% below the next-weakest peer). Raised to dmg 270-290 / def 37
  / hp 780 / siege 345 (T1-large tier average). Its skill already worked correctly; this was pure
  stat tuning.
- `coldborns/bear_riders` T1 (found DURING this pass, not in the original 4): already the
  weakest T1-medium branch (worst dmg/hp/siege of 7) before any of today's changes, but it had
  been surviving the "no dead units" check only because it could still beat the old, broken
  Raiders. Once Raiders got fixed, bear_riders lost its only win and dropped to 0/960 across the
  whole T1 bracket — a pre-existing weakness the earlier fixes unmasked, not a regression they
  caused. Raised T1 (`Iceclaw Rider`) from dmg 14-17/def 18/hp 36/siege 6 to dmg 18-22/def 20/hp
  50/siege 10 (tier average). `npm run test:balance`'s dead-unit check passes clean after this.
- `dragons/dragonkin` T3 (`Ashfang`) and `dragons/sovereign_wyrm` (capstone): both still ran hot
  after fix #1 alone (raw stats were ALSO above tier average, independent of the stacking bug).
  Trimmed Ember Trail/Dragonfire Breath bonus-damage value 140%/150% → 70%/90%, and dmg 25-32/33-36
  → 22-28/28-31.
- `neutral/feral_bloodfang` (T2) and `neutral/rogue_battlemage` (T3) (`shared/constants/neutralTroops.js`):
  no engine bug involved — Bloodfang was simply the best-statted small T2 unit in every category at
  once (dmg, hp, AND speed, no tradeoff); trimmed dmg 26-32→20-25, hp 48→36, spd 78→70 toward the
  T2-small tier average. Battlemage's stats were closer to average already; its Forbidden Surge
  bonus-damage value (100%, the highest solo — non-stacked — proc value in its tier) was the driver.
  Trimmed 100%→50%, plus a modest hp/spd/dmg trim.

**Iteration note on the outlier metric:** re-running the sim after each round of tuning showed the
expected whack-a-mole behavior of a z-score-based outlier check on a ~25-31-unit population — nerf
the top of a tier and the mean/std-dev shift, so a previously-fine unit can pop up as the new
"outlier" purely from a tighter distribution, not from any real change to it. After this pass:
`feral_bloodfang`, `rogue_battlemage`, `dragonkin T3`, and `sovereign_wyrm` (the original 4) are all
no longer flagged OR substantially reduced in efficiency; the 2 dead units + the newly-found 3rd
(bear_riders) are fixed and pass the dead-unit check clean. A handful of DIFFERENT units now sit
just over the 2-std-dev line (`wizards/spellblades` T1, `neutral/wolf_rider`, `dragons/drake_riders`
T2/T3, `neutral/dune_raider`, `neutral/pirate_deserter`, `ancient/aeonspire`) — all borderline
(z 2.0-2.6, well under the original findings' 2.7-3.7) and not acted on in this pass; see
`tools/balanceSim/reports/report.md` (regenerate with `npm run balance-report`) for current numbers
before deciding whether these warrant their own pass. `dragons/drake_riders` showing up in BOTH T2
and T3 is worth a second look — dragons as a faction have now shown up as an outlier at 3 different
tiers across this and the prior entry.

**Tests:** `npm test` — 275 pass, 0 fail (no test hardcodes the changed stat values).
`npm run build` — clean. `npm run test:balance` — 6 of 7 pass; the remaining failure is the
efficiency-outlier test flagging the borderline units named above, which is the gate correctly
doing its job on a real (if now much smaller and different) set of findings, not a bug.

---

## 2026-09-20 — Claude (Sonnet 5) — Automated battle-balance testing system (new)

New `tools/balanceSim/` dev-tooling package that exercises the real, unmodified `simBattle` at
scale and flags anything statistically overpowered or underpowered. **Testing/reporting layer
only** — nothing in `shared/utils/battle.js` (combat logic) or any troop/commander data file was
touched. `shared/utils/gearStats.js` was also left alone: the sim's commanders never carry gear
(`cmd.gear` stays undefined), so gear bonuses are simply never computed, per the brief ("known
placeholder pending a rework").

**What it builds:**
- `tools/balanceSim/loadoutCatalog.js` — enumerates every troop line the sim can build an army
  from: all 8 factions × 3 branches × T1–T3, all 8 T4 capstones, all 15 neutral units, all 4
  Ancients (99 "loadouts" total), grouped into 4 tier brackets (T1/T2/T3/T4-with-Ancients) for
  apples-to-apples comparison.
- `tools/balanceSim/neutralBridge.js` — the one non-obvious piece. `battle.js`'s internal
  `resolveBranch()` only knows about `FACTION_TROOPS` and `ANCIENT_FACTIONS` (Ancients already
  resolve for free — `ancientTroops.js` deliberately wraps them as a capstone-shaped "faction" for
  this exact reason). Neutral units don't have that wrapper yet (`neutralTroops.js` says outright
  that `getNeutralSlotForBattle` is "purely additive — nothing in `simBattle` calls this yet").
  Rather than add a third lookup branch inside `battle.js` (out of scope), this file mutates the
  **in-memory** `FACTION_TROOPS` object at process start, adding a synthetic `"neutral"` key built
  from `NEUTRAL_TROOPS`. Nothing on disk changes — only this tool's own process gets the extra key
  — and `simBattle` resolves neutral units through its existing, un-touched generic code path.
- `tools/balanceSim/commanderFactory.js` — builds an identical, minimal commander shell (fixed
  atk 150/foc 0/spd 60/lvl 10, no class bonus, no hero skills, no gear) around each loadout's
  troops, so any win-rate difference between two loadouts is attributable to the troop line, not
  commander stats.
- `tools/balanceSim/runner.js` — runs N **seeded** trials of loadout A (attacker) vs loadout B
  (defender) through real `simBattle`, both sides sized to the same command-point budget via
  `COMMAND_COST` (`troopsForBudget`) so a small-unit army and a large-unit army are budget-equal,
  not troop-count-equal. Same Math.random-swap pattern `tests/battle.test.js`'s `seeded()` helper
  already uses, just parameterized per trial so a whole run is a deterministic sequence — **no
  live randomness anywhere**, a failing balance test reproduces exactly every time.
- `tools/balanceSim/matrix.js` — the coverage matrix: every ordered same-tier-bracket pair (full
  round robin), every loadout mirrored against itself, and T1→T2→T3→T4 cross-tier spot-checks
  (informational only). Also computes two outlier signals:
  - **Matchup outlier**: any same-tier, same-budget pairing where the attacker's win rate is
    >70% or <30%.
  - **Efficiency outlier**: per-unit score = (win rate, averaged across every same-tier opponent)
    × (1 − avg troops lost, counted only on trials it actually won) — "how much you get for your
    command-cost budget, pound for pound." Flagged when a unit's score is >2 std devs from its own
    tier bracket's mean. This is a documented design choice, not a given formula — the brief's
    "troops needed to win per unit of command-cost budget" admits a few reasonable readings; this
    is the one implemented and it's spelled out in `matrix.js`'s header comment.
- `tools/balanceSim/report.js` + `cli.js` — `npm run balance-report` runs the full matrix
  (default 60 seeded trials/matchup, ~18s) and writes `tools/balanceSim/reports/report.json` +
  `report.md`.
- `tests/balance/coverage.test.js` — sanity tests on the TOOLING itself (catalog completeness,
  budget normalization, trial reproducibility) — not a balance gate.
- `tests/balance/outliers.test.js` — **the actual "no unit is overpowered" gate**, run via
  `npm run test:balance` (a new script, kept separate from `npm test`/`tests/*.test.js` — see
  "Threshold/gate decisions" below for why). Asserts (a) zero efficiency outliers and (b) no unit
  has a 0% win rate against every single same-tier opponent ("dead unit" check). Uses 40 trials
  (vs. the CLI's 60) to stay fast; still fully seeded/deterministic.

**Threshold/gate decisions (why `npm test` wasn't touched):** a full matrix run at 60 trials shows
same-tier 1-branch-vs-1-branch matchups clear the 70%/30% win-rate bar **~93% of the time**
(2401/2592), and even a much stricter ≥97%/≤3% "total blowout" bar still clears ~77% of them.
That's a real property of this combat system at these troop counts (large populations flatten
per-trial RNG, so small stat differences compound into near-deterministic outcomes) — not a bug in
the harness — but it makes the raw win-rate bar non-discriminating as a pass/fail gate: asserting
zero matchup outliers would (almost) always fail regardless of what changes. So `matchupOutliers`
is reported (JSON + Markdown, top-25 most lopsided) but NOT gated on; the efficiency-outlier metric
(aggregated per unit across its whole tier, not one specific counter-pick) is the actual gate, and
it does discriminate — only 4 of 99 units flag today. `npm run test:balance` is a separate script
from `npm test` for the same reason `npm test` itself was left untouched: the existing 275-test
suite still passes clean and shouldn't start failing because of a real, pre-existing balance issue
in data this change isn't allowed to touch.

**Already flagged (current data, 40-trial seeded run — reproduce with `npm run test:balance` or
`npm run balance-report`):**
- **Efficiency outliers** — `neutral/feral_bloodfang` (T2, 3.7σ above its tier mean),
  `dragons/dragonkin T3` (2.8σ above), `neutral/rogue_battlemage` (T3, 3.3σ above),
  `dragons/sovereign_wyrm` (T4 capstone, 2.8σ above). All four are OVER-performing outliers, not
  under.
- **Dead units** — `coldborns/raiders T1` and `coldborns/frost_giants T1` won 0 of 40 trials
  against every single other T1 opponent tested. Worth a look — both are coldborns branches.
- Full matchup-level detail (all 2401 flagged pairs, not just the above) is in
  `tools/balanceSim/reports/report.md` after running `npm run balance-report`.

**Tests:** `npm test` — 275 pass, 0 fail (fresh `npm install` was needed first; `node_modules` was
absent, unrelated to this change — 3 of the 275 need `esbuild`, present once installed).
`npm run build` — clean, 576 modules, no new warnings. `npm run test:balance` — 5 pass, 2 fail
**by design** (the findings above); this is the gate doing its job on genuinely pre-existing data,
not a bug introduced here.

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


- Add a new dated entry above (don't overwrite prior entries).
- Note: file changed, function/line, what was broken, what the fix does,
  and any follow-up/known issues.
- Keep entries short — this is a change log, not a full diff.
