// Crew 2.0 — fortress build + siege rules. Pure functions only; wiring into
// the tile map, resources and battle resolution happens in src/ (mirrors the
// rest of the shared/utils split).
//
// Fortress lifecycle:
//  1. Founder/officer starts a build on a p10+ tile already owned by the
//     player or a crewmate (not a camp, not unclaimed wilds — see
//     tileOwnerInCrew / canBuildFortressOnTile).
//  2. FORTRESS_BUILD_MS later it's live: siege = siegeMax (full health),
//     open for members to station commanders.
//  3. An attacker must first clear every army actually stationed inside —
//     the fortress itself has no defenders of its own. Once empty, siege
//     damage can be applied (same siege-stat mechanic as keeps/gates —
//     shared/utils/battle.js's armySiegeBonus/self_siege_up — that battle
//     integration is the next wiring step, not part of this file).
//  4. siege reaching 0 destroys the fortress: the tile reverts to a bare
//     p10+ tile, and whoever landed the last siege hit claims it outright
//     (no fight/siege needed for that claim).
import {
  FORTRESS_MIN_POWER_LEVEL, FORTRESS_BUILD_MS, FORTRESS_COST,
  FORTRESS_COMMANDER_SLOTS_PER_MEMBER,
} from "../constants/crew.js";
import { fortressSlotsAvailable } from "./crewRules.js";

// True if `tile` is owned by a player in `crew` — "player" owner means the
// human player, who is always a member of their own crew; an AI owner is
// checked against crew.founder/crew.members via ownerPlayerId. An unclaimed
// tile (no owner at all) is NOT "in crew" — it must be claimed first before
// a crew structure can go on it (see canBuildFortressOnTile).
export function tileOwnerInCrew(tile, crew) {
  if (!tile?.owner) return false;
  if (tile.owner === "player") return true;
  const pid = tile.ownerPlayerId;
  return !!pid && !!crew && (crew.founder === pid || (crew.members || []).includes(pid));
}

// tile: whatever shape src/hooks/useMapInit.js / worldTiles.js hand back
// (powerLevel, isCamp/campType, owner, fort, crewFortress, etc.). Only the
// fields this rule actually needs are read, so it stays decoupled from the
// exact tile object shape. `crew` is required to build on a tile someone
// already owns (see tileOwnerInCrew) — omit it to only allow unclaimed tiles.
export function canBuildFortressOnTile(tile, crew) {
  if (!tile) return { ok: false, reason: "No tile selected" };
  if ((tile.powerLevel || 0) < FORTRESS_MIN_POWER_LEVEL) {
    return { ok: false, reason: `Must be a power level ${FORTRESS_MIN_POWER_LEVEL}+ tile` };
  }
  if (tile.isCamp || tile.campType) return { ok: false, reason: "Cannot build on a camp" };
  if (tile.isKeep || tile.isGate || tile.isRuin || tile.isWin || tile.isHQ) {
    return { ok: false, reason: "Cannot build on a special tile" };
  }
  if (!tile.owner) return { ok: false, reason: "Tile must be claimed by you or a crewmate first" };
  if (!tileOwnerInCrew(tile, crew)) return { ok: false, reason: "Tile is claimed by a player outside your crew" };
  if (tile.fort || tile.crewFortress) return { ok: false, reason: "Tile already has a structure" };
  return { ok: true, reason: null };
}

export function canAffordFortress(resources) {
  const r = resources || {};
  return (r.wood || 0) >= FORTRESS_COST.wood
    && (r.stone || 0) >= FORTRESS_COST.stone
    && (r.gas || 0) >= FORTRESS_COST.gas;
}

// crew + actorId + tile + resources all pre-validated by the caller's own
// UI-level checks; this is the single source of truth those checks defer to.
export function canStartFortressBuild(crew, actorId, tile, resources) {
  const roleOk = !!crew && (crew.founder === actorId || (crew.officers || []).includes(actorId));
  if (!roleOk) return { ok: false, reason: "Only the founder or an officer can build a fortress" };
  if (fortressSlotsAvailable(crew) <= 0) return { ok: false, reason: "No fortress slots available" };
  const tileCheck = canBuildFortressOnTile(tile, crew);
  if (!tileCheck.ok) return tileCheck;
  if (!canAffordFortress(resources)) return { ok: false, reason: "Not enough resources" };
  return { ok: true, reason: null };
}

// fortress: { id, crewId, tileKey, level: 1 (not upgradable), siege,
//             siegeMax, stationedByPlayer: { [playerId]: commanderUid[] },
//             buildEndsAt? } — buildEndsAt present only while under
// construction; once it passes, siege/siegeMax become meaningful.
export function createFortress({ id, crewId, tileKey, now, siegeMax = 1_000_000 }) {
  return {
    id, crewId, tileKey,
    level: 1,
    siege: 0, siegeMax,
    stationedByPlayer: {},
    buildEndsAt: now + FORTRESS_BUILD_MS,
  };
}

export function isFortressBuilt(fortress, now) {
  return !!fortress && (!fortress.buildEndsAt || now >= fortress.buildEndsAt);
}

// Marks a build as complete (fills siege to full). No-op if already built or
// the timer hasn't elapsed — caller checks time itself, same pattern as
// shared/utils/fortRemoval.js's dueFortRemovals.
export function completeFortressBuild(fortress) {
  if (!fortress || !fortress.buildEndsAt) return fortress;
  const { buildEndsAt, ...rest } = fortress; // eslint-disable-line no-unused-vars
  return { ...rest, siege: fortress.siegeMax };
}

// ── Stationing ───────────────────────────────────────────────────────────
export function commanderSlotCapFor(crew) {
  return (crew?.members?.length || 0) * FORTRESS_COMMANDER_SLOTS_PER_MEMBER;
}

export function stationedCount(fortress) {
  return Object.values(fortress?.stationedByPlayer || {}).reduce((n, arr) => n + (arr?.length || 0), 0);
}

export function canStationCommander(crew, fortress, playerId) {
  if (!crew || !fortress) return { ok: false, reason: "No fortress" };
  if (!(crew.members || []).includes(playerId) && crew.founder !== playerId) {
    return { ok: false, reason: "Not a member of this crew" };
  }
  const mine = (fortress.stationedByPlayer?.[playerId] || []).length;
  if (mine >= FORTRESS_COMMANDER_SLOTS_PER_MEMBER) {
    return { ok: false, reason: `Max ${FORTRESS_COMMANDER_SLOTS_PER_MEMBER} commanders per member` };
  }
  if (stationedCount(fortress) >= commanderSlotCapFor(crew)) {
    return { ok: false, reason: "Fortress is full" };
  }
  return { ok: true, reason: null };
}

export function stationCommander(fortress, playerId, commanderUid) {
  const list = fortress.stationedByPlayer?.[playerId] || [];
  return {
    ...fortress,
    stationedByPlayer: { ...fortress.stationedByPlayer, [playerId]: [...list, commanderUid] },
  };
}

export function unstationCommander(fortress, playerId, commanderUid) {
  const list = fortress.stationedByPlayer?.[playerId] || [];
  return {
    ...fortress,
    stationedByPlayer: { ...fortress.stationedByPlayer, [playerId]: list.filter(u => u !== commanderUid) },
  };
}

// ── Combat / siege ───────────────────────────────────────────────────────
// The fortress has no defenders of its own — an attacker must clear every
// stationed army first. This just answers "is it clear to siege"; actually
// resolving those battles reuses the existing battle system (shared/utils/
// battle.js / runBattle), via src/hooks/useFortressSiege.js.
export function isClearToSiege(fortress) {
  return stationedCount(fortress) === 0;
}

// Deterministic fight order: lowest playerId first, then insertion order
// within that player's stationed list. Returns { playerId, commanderUid } or
// null once the fortress is clear. useFortressSiege.js fights one of these
// per battle, same "defeat them one at a time" pattern the existing AI-
// commander-on-tile code in useMarch.js already uses.
export function nextDefender(fortress) {
  const byPlayer = fortress?.stationedByPlayer || {};
  for (const playerId of Object.keys(byPlayer).sort()) {
    const uid = byPlayer[playerId]?.[0];
    if (uid) return { playerId, commanderUid: uid };
  }
  return null;
}

// Applies one siege hit. Returns { fortress, destroyed, lastHitBy } —
// `destroyed: true` means the tile should revert to a bare p10+ tile and
// `lastHitBy` (attackerId) claims it outright, no further fight required.
export function applySiegeDamage(fortress, attackerId, amount) {
  if (!fortress) return { fortress, destroyed: false, lastHitBy: null };
  const siege = Math.max(0, (fortress.siege || 0) - Math.max(0, amount || 0));
  const destroyed = siege <= 0;
  return { fortress: { ...fortress, siege }, destroyed, lastHitBy: destroyed ? attackerId : null };
}

// Removes the destroyed fortress from a crew's list — the caller is
// responsible for reverting the tile itself and granting `lastHitBy`
// ownership of it (that's a worldTiles.js/useMapInit.js-level operation,
// out of scope for this pure-data file).
export function removeFortress(crew, fortressId) {
  return { ...crew, fortresses: (crew.fortresses || []).filter(f => f.id !== fortressId) };
}

export function canDemolishFortress(crew, actorId) {
  return !!crew && (crew.founder === actorId || (crew.officers || []).includes(actorId));
}
