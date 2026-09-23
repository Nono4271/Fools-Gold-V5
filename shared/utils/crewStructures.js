// Crew Wells + Contract Outposts — pure rules (owner spec 2026-09-22).
// Same split as crewFortress.js: no React, no storage; src/ wires these in.
//
// WELL (crew level 31 → 1 well, 40 → 2 wells)
//   - Founder-only build on an unclaimed p10+ tile (same tile rules as a
//     Crew Fortress). Stored on crew.wells: [{ id, crewId, tileKey, buildEndsAt? }].
//   - Once built, any crew member can station a commander there — from
//     anywhere, the Well has no range — then gather on it like any tile.
//   - Gathering at a Well yields ALL FOUR resources, each at a p11 tile's
//     gather rate (shared/utils/tactics.js gatherTick's `isWell` path).
//
// CONTRACT OUTPOST (crew level 35; 2nd unit pick at 50; -10% hire time at 42)
//   - Founder-only build on an unclaimed p10+ tile. One per crew. Stored as
//     crew.outpost: { id, crewId, tileKey, units: [neutralKey], buildEndsAt? }.
//   - The founder picks 1 (2 at level 50) NEUTRAL units — Ancients excluded —
//     and every crew member can then train them.
//   - Outpost-sourced training is capped at OUTPOST_DAILY_COMMAND_LIMIT
//     commands per player per day (enforced in armyEconomy.js 'train').
//   - Owning a camp for a neutral OR Ancient unit lets that player train it
//     with no daily cap (still limited by resources/barracks/batch size).
import {
  WELL_MIN_POWER_LEVEL, WELL_BUILD_MS, WELL_COST,
  OUTPOST_MIN_POWER_LEVEL, OUTPOST_BUILD_MS, OUTPOST_COST, OUTPOST_DAILY_COMMAND_LIMIT,
  crewWellSlotsForLevel, crewOutpostUnlocked, crewOutpostUnitSlots,
} from "../constants/crew.js";
import { resolveNeutralUnit, NEUTRAL_FACTION_KEY } from "../constants/neutralTroops.js";
import { resolveAncientUnit, ANCIENT_FACTION_KEY } from "../constants/ancientTroops.js";

const isFounder = (crew, actorId) => !!crew && crew.founder === actorId;

function canAfford(cost, resources) {
  const r = resources || {};
  return Object.entries(cost).every(([k, n]) => (r[k] || 0) >= n);
}

// Tile rules shared by both structures (mirrors canBuildFortressOnTile), plus
// "no other crew structure already here". `occupiedKeys`: Set of tile keys
// holding any crew fortress/well/outpost across ALL crews.
export function canBuildCrewStructureOnTile(tile, tileKey, occupiedKeys, minPower) {
  if (!tile) return { ok: false, reason: "No tile selected" };
  if ((tile.powerLevel || 0) < minPower) return { ok: false, reason: `Must be a power level ${minPower}+ tile` };
  if (tile.isCamp || tile.campType || tile.isCampPart) return { ok: false, reason: "Cannot build on a camp" };
  if (tile.isKeep || tile.isGate || tile.isRuin || tile.isWin || tile.isHQ || tile.isHQPart || tile.isKeepPart) {
    return { ok: false, reason: "Cannot build on a special tile" };
  }
  if (tile.owner) return { ok: false, reason: "Tile is already claimed" };
  if (tile.fort || tile.crewFortress || occupiedKeys?.has(tileKey)) return { ok: false, reason: "Tile already has a structure" };
  return { ok: true, reason: null };
}

export function crewStructureTileKeys(crews) {
  const keys = new Set();
  for (const c of crews || []) {
    for (const f of c.fortresses || []) keys.add(f.tileKey);
    for (const w of c.wells || []) keys.add(w.tileKey);
    if (c.outpost) keys.add(c.outpost.tileKey);
  }
  return keys;
}

export const isStructureBuilt = (s, now) => !!s && (!s.buildEndsAt || now >= s.buildEndsAt);
// Completing a build fills siege to full, same as completeFortressBuild.
export function completeStructureBuild(s) {
  if (!s || !s.buildEndsAt) return s;
  const { buildEndsAt, ...rest } = s; // eslint-disable-line no-unused-vars
  return { ...rest, siegeMax: rest.siegeMax ?? STRUCTURE_SIEGE_MAX, siege: rest.siegeMax ?? STRUCTURE_SIEGE_MAX };
}

// Siege HP for Wells/Outposts — PLACEHOLDER, same as the Fortress default
// (createFortress's siegeMax). They fight like a Fortress (owner spec):
// standing commanders → stationed (Well only) → siege to 0 → destroyed, tile
// reverts to a plain p10+ tile owned by whoever landed the last hit. See
// shared/utils/structureDefense.js and src/hooks/useFortressSiege.js.
export const STRUCTURE_SIEGE_MAX = 1_000_000;

// { crew, kind: "fortress"|"well"|"outpost", structure } at a tile, or null.
export function findCrewStructureAt(crews, tileKey) {
  for (const crew of crews || []) {
    const f = (crew.fortresses || []).find(x => x.tileKey === tileKey);
    if (f) return { crew, kind: "fortress", structure: f };
    const w = (crew.wells || []).find(x => x.tileKey === tileKey);
    if (w) return { crew, kind: "well", structure: w };
    if (crew.outpost?.tileKey === tileKey) return { crew, kind: "outpost", structure: crew.outpost };
  }
  return null;
}

// Replace (or, with next = null, remove) one structure on its crew.
export function updateCrewStructure(crew, kind, id, next) {
  if (kind === "fortress") {
    const list = (crew.fortresses || []).map(f => f.id === id ? next : f).filter(Boolean);
    return { ...crew, fortresses: list };
  }
  if (kind === "well") {
    const list = (crew.wells || []).map(w => w.id === id ? next : w).filter(Boolean);
    return { ...crew, wells: list };
  }
  if (kind === "outpost") return { ...crew, outpost: crew.outpost?.id === id ? next : crew.outpost };
  return crew;
}

// Current siege HP, tolerating structures built before siege fields existed.
export function structureSiege(s) {
  const siegeMax = s?.siegeMax ?? STRUCTURE_SIEGE_MAX;
  return { siege: s?.siege ?? siegeMax, siegeMax };
}

// ── Well ──────────────────────────────────────────────────────────────────
export function wellSlotsAvailable(crew) {
  return crewWellSlotsForLevel(crew?.level || 1) - (crew?.wells?.length || 0);
}

export function canStartWellBuild(crew, actorId, tile, tileKey, resources, occupiedKeys) {
  if (!isFounder(crew, actorId)) return { ok: false, reason: "Only the founder can build a Well" };
  if (crewWellSlotsForLevel(crew.level) <= 0) return { ok: false, reason: "Crew level 31 unlocks the Well" };
  if (wellSlotsAvailable(crew) <= 0) return { ok: false, reason: "No Well slots available" };
  const t = canBuildCrewStructureOnTile(tile, tileKey, occupiedKeys, WELL_MIN_POWER_LEVEL);
  if (!t.ok) return t;
  if (!canAfford(WELL_COST, resources)) return { ok: false, reason: "Not enough resources" };
  return { ok: true, reason: null };
}

export function createWell({ id, crewId, tileKey, now }) {
  return { id, crewId, tileKey, siege: 0, siegeMax: STRUCTURE_SIEGE_MAX, buildEndsAt: now + WELL_BUILD_MS };
}

export function removeWell(crew, wellId) {
  return { ...crew, wells: (crew.wells || []).filter(w => w.id !== wellId) };
}

// A commander can be stationed at a built Well by any member of its crew,
// from anywhere (no range), if it's idle.
export function canStationAtWell(crew, well, playerId, cmd, now) {
  if (!crew || !well) return { ok: false, reason: "No Well" };
  if (!isStructureBuilt(well, now)) return { ok: false, reason: "Well is still being built" };
  if (crew.founder !== playerId && !(crew.members || []).includes(playerId)) return { ok: false, reason: "Not a member of this crew" };
  if (!cmd) return { ok: false, reason: "No commander" };
  if (cmd.march) return { ok: false, reason: "Commander is marching" };
  if (cmd.gathering || cmd.training) return { ok: false, reason: "Commander is busy" };
  if (cmd.stranded) return { ok: false, reason: "Commander is stranded — recall to HQ first" };
  return { ok: true, reason: null };
}

// ── Contract Outpost ──────────────────────────────────────────────────────
export function canStartOutpostBuild(crew, actorId, tile, tileKey, resources, occupiedKeys) {
  if (!isFounder(crew, actorId)) return { ok: false, reason: "Only the founder can build a Contract Outpost" };
  if (!crewOutpostUnlocked(crew.level)) return { ok: false, reason: "Crew level 35 unlocks the Contract Outpost" };
  if (crew.outpost) return { ok: false, reason: "Crew already has a Contract Outpost" };
  const t = canBuildCrewStructureOnTile(tile, tileKey, occupiedKeys, OUTPOST_MIN_POWER_LEVEL);
  if (!t.ok) return t;
  if (!canAfford(OUTPOST_COST, resources)) return { ok: false, reason: "Not enough resources" };
  return { ok: true, reason: null };
}

export function createOutpost({ id, crewId, tileKey, now }) {
  return { id, crewId, tileKey, units: [], siege: 0, siegeMax: STRUCTURE_SIEGE_MAX, buildEndsAt: now + OUTPOST_BUILD_MS };
}

// Founder picks the Outpost's neutral unit(s). Ancients are excluded; max
// picks = crewOutpostUnitSlots(level); no duplicates.
export function canSetOutpostUnits(crew, actorId, units) {
  if (!isFounder(crew, actorId)) return { ok: false, reason: "Only the founder can choose Outpost units" };
  if (!crew.outpost) return { ok: false, reason: "No Contract Outpost" };
  const list = Array.isArray(units) ? units : [];
  const max = crewOutpostUnitSlots(crew.level);
  if (list.length > max) return { ok: false, reason: `Max ${max} unit${max === 1 ? "" : "s"} at this crew level` };
  if (new Set(list).size !== list.length) return { ok: false, reason: "Duplicate unit" };
  if (list.some(k => resolveAncientUnit(k))) return { ok: false, reason: "Ancients can't be contracted" };
  if (list.some(k => !resolveNeutralUnit(k))) return { ok: false, reason: "Unknown neutral unit" };
  return { ok: true, reason: null };
}

export function setOutpostUnits(crew, units) {
  return { ...crew, outpost: { ...crew.outpost, units: [...units] } };
}

// ── Neutral / Ancient training sources ────────────────────────────────────
// Which neutral/Ancient units this player can train right now, and how.
//   camp:    owns a camp of that unit (tile.owner === "player", tile.isCamp,
//            tile.campUnitKey) → unlimited daily.
//   outpost: unit is picked at the player's crew's BUILT Outpost → daily cap.
// Returns { [branchKey "neutrals:<k>:0" | "ancients:<k>:0"]: { camp, outpost, unitKey } }.
export function troopPoolKeyForUnit(unitKey) {
  if (resolveNeutralUnit(unitKey)) return `${NEUTRAL_FACTION_KEY}:${unitKey}:0`;
  if (resolveAncientUnit(unitKey)) return `${ANCIENT_FACTION_KEY}:${unitKey}:0`;
  return null;
}

export function neutralTrainingSources({ tiles, ownedKeys, crew, now }) {
  const out = {};
  const add = (unitKey, via) => {
    const bKey = troopPoolKeyForUnit(unitKey);
    if (!bKey) return;
    out[bKey] = { ...(out[bKey] || { camp: false, outpost: false, unitKey }), [via]: true };
  };
  for (const key of ownedKeys || []) {
    const t = tiles?.[key];
    if (t && t.isCamp && t.owner === "player" && t.campUnitKey) add(t.campUnitKey, "camp");
  }
  const op = crew?.outpost;
  if (op && isStructureBuilt(op, now)) for (const k of op.units || []) if (resolveNeutralUnit(k)) add(k, "outpost");
  return out;
}

// ── Daily Outpost limit ───────────────────────────────────────────────────
// Local calendar day (client-local for now, same caveat as Tomes' daily
// reset — move to a server UTC day once multiplayer is authoritative).
export function dayKey(now) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function outpostCommandsUsed(contractDaily, now) {
  return contractDaily && contractDaily.day === dayKey(now) ? (contractDaily.commands || 0) : 0;
}

export function outpostCommandsLeft(contractDaily, now, limit = OUTPOST_DAILY_COMMAND_LIMIT) {
  return Math.max(0, limit - outpostCommandsUsed(contractDaily, now));
}
