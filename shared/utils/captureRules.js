// ─────────────────────────────────────────────────────────────────────────────
//  captureRules.js — the single deterministic "does this siege capture the
//  tile" rule, moved out of src/hooks/useMarch.js (roadmap item: move
//  multiplayer-sensitive rules into shared/ so the server can call the exact
//  same function the client does, instead of trusting a client-computed
//  patch). Pure, no React/DOM/state — safe to import from server/index.js.
// ─────────────────────────────────────────────────────────────────────────────
import { SIEGE_BASE, KEEP_GARRISON_RESET_MS, GATE_GARRISON_RESET_MS, SIEGE_RESET_MS } from "../constants/map.js";
import { FORTRESS_MIN_POWER_LEVEL } from "../constants/crew.js";
import { TILE_PROTECTION_MS } from "./tileTimers.js";

// A P10-P13 "structure" tile (mapGen's stampP10) is a garrisoned obstacle,
// not a real territory Keep: it has its own 2-wave garrison but, unlike a
// named region Keep (fixed powerLevel 4, permanent F_KEEP) or a border Gate,
// it's meant to fall away once cleared and leave a bare, unclaimed P10+ tile
// behind for a crew to build a Fortress/Well/Outpost on (see crewFortress.js
// and crewStructures.js — both gate their build checks on `!tile.isKeep`
// *and* `powerLevel >= FORTRESS_MIN_POWER_LEVEL`, a combination no tile can
// ever satisfy unless something clears isKeep here first). Gates are
// excluded even though they also carry F_KEEP, since they never carry a
// powerLevel in this range and must remain permanent chokepoints regardless.
function isP10Structure(tile) {
  return !!tile?.isKeep && !tile?.isGate && (tile?.powerLevel || 0) >= FORTRESS_MIN_POWER_LEVEL;
}

// The 3 isKeepPart neighbor cells mapGen's stampP10 stamps alongside a P10+
// structure's primary (c,r) tile — see src/workers/mapGen.worker.js's
// stampP10, which covers [c+1,r], [c,r+1], [c+1,r+1]. Call sites must clear
// isKeepPart on these when the structure falls, or they keep rendering as a
// skipped/merged block forever (MapRenderer.jsx never draws them again).
export function p10StructureNeighborKeys(tile) {
  if (!tile || tile.c == null || tile.r == null) return [];
  const { c, r } = tile;
  return [`${c + 1},${r}`, `${c},${r + 1}`, `${c + 1},${r + 1}`];
}

// A real, region-controlling territory Keep — the only kind of tile that
// should ever hand a whole region's war-control to the capturing faction
// (see warRules.js's recordRegionCapture). This is `isKeep` minus the two
// kinds of tile that also carry the F_KEEP flag but aren't one: P10-P13
// structures (see isP10Structure above) and border Gates.
export function isRegionKeepTile(tile) {
  return !!tile?.isKeep && !tile?.isGate && !isP10Structure(tile);
}

// Garrison reset delay for a tile: keeps/gates take an hour, everything else
// resets in 15 min (moved verbatim from useMarch.js's garrisonResetMs).
export function garrisonResetMs(tile) {
  if (tile?.isHQ)   return KEEP_GARRISON_RESET_MS;
  if (tile?.isGate) return GATE_GARRISON_RESET_MS;
  if (tile?.isKeep) return KEEP_GARRISON_RESET_MS;
  return SIEGE_RESET_MS;
}

// Given a tile and the attacking siege power, decide whether the tile is
// captured this hit or just takes siege damage, and build the exact patch
// either outcome applies. `now` is injected (not Date.now()) so this stays
// deterministic/testable and so the server can pass its own clock.
//
// `capture` fields (owner/faction/ownerPlayerId/defCmd/hasAiCommander) are
// caller-supplied because who captures a tile (player vs AI vs a specific
// faction) is context the rule itself has no opinion on.
// `capture.protect` (default true) controls whether a successful capture
// grants the protection window — the AI-attacker call site in useMarch.js
// never granted it, so that exact (possibly-inconsistent) behavior is kept
// opt-out rather than silently "fixed" here.
// `capture.siegeMax` lets a call site override the post-capture siegeMax
// instead of inheriting the tile's own (the AI-vs-player-battle site resets
// to a flat 300/300 regardless of the tile's prior siegeMax) — again kept
// as pre-existing behavior, not changed by this refactor.
export function resolveSiegeOutcome({ tile, siegePower, now = Date.now(), capture = {}, defeatedWaves }) {
  const currentSiege = tile.siege ?? SIEGE_BASE;
  const siegeMax = capture.siegeMax ?? tile.siegeMax ?? SIEGE_BASE;

  if (siegePower >= currentSiege) {
    // Clearing a P10+ structure's native garrison drops the Keep flag and
    // hands the bare tile to the attacker, same as any other capture (a
    // founder/officer can then start a Fortress/Well/Outpost build on it —
    // see crewFortress.js/crewStructures.js, which now allow building on any
    // crewmate's owned p10+ tile, not just an unclaimed one). The 3
    // isKeepPart neighbor cells are returned as neighborKeys so the caller
    // clears them too (they're never captured territory themselves).
    if (isP10Structure(tile)) {
      return {
        captured: true,
        neighborKeys: p10StructureNeighborKeys(tile),
        patch: {
          isKeep: false,
          keepName: null,
          owner: capture.owner ?? "player",
          faction: capture.faction ?? undefined,
          ownerPlayerId: capture.ownerPlayerId ?? undefined,
          garrison: 0,
          siege: siegeMax,
          siegeMax,
          defeatedWaves: [],
          resetAt: null,
          defCmd: capture.defCmd ?? null,
          hasAiCommander: capture.hasAiCommander ?? false,
          ...(capture.protect !== false ? { protectedUntil: now + TILE_PROTECTION_MS } : {}),
        },
      };
    }
    return {
      captured: true,
      patch: {
        owner: capture.owner ?? "player",
        faction: capture.faction ?? undefined,
        ownerPlayerId: capture.ownerPlayerId ?? undefined,
        garrison: 0,
        siege: siegeMax,
        siegeMax,
        defeatedWaves: [],
        resetAt: null,
        defCmd: capture.defCmd ?? null,
        hasAiCommander: capture.hasAiCommander ?? false,
        ...(capture.protect !== false ? { protectedUntil: now + TILE_PROTECTION_MS } : {}),
      },
    };
  }

  return {
    captured: false,
    patch: {
      siege: currentSiege - siegePower,
      siegeMax,
      defeatedWaves: defeatedWaves ?? tile.defeatedWaves ?? [],
      garrison: tile.garrison,
      resetAt: now + garrisonResetMs(tile),
    },
  };
}
