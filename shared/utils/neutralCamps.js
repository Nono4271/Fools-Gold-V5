// ─────────────────────────────────────────────────────────────────────────────
//  neutralCamps.js — Neutral/Ancient camp templates + placement plan
//
//  Owner spec (this session, following the neutral-unit + Ancients roster):
//    - A camp is a keep-like structure players attack, sized by its unit's
//      size: small = 1x1, medium = 1x2, large = 2x2.
//    - Each camp has 2 defenders, strength comparable to a specific power
//      tile: T1~P7, T2~P9, T3~P11, T4/Ancient~P13.
//    - Siege HP 100k-500k, SCALED BY TIER (owner's explicit choice over a
//      flat random range): T1≈100k, T2≈~235k, T3≈~365k, T4/Ancient=500k.
//    - Placement: the 15 neutrals' 3 region bands (see `region` field in
//      neutralTroops.js, now corrected to real map geography — see that
//      file's header) each get ~30 camps PER named sub-region in that band
//      (~30 * ~21 regions/band, matching how the existing spawn system
//      already does "N per region" — see ReadMeAI scope note for why this
//      is a placement PLAN, not a live map-generation wire-in yet).
//    - The 4 Ancients go one each to Dawngate / Twilightspire / Lastwatch /
//      Finalhope (the 4 keeps ringing the Holy Grail), 20 camps per zone,
//      all of that zone's 20 camps using that one assigned Ancient.
//    - Naming: "{unit label} Camp".
//
//  Scope note: this file is a PURE, deterministic, testable planning layer —
//  it does not touch the live tile grid (`src/workers/mapGen.worker.js`'s
//  arrays), the renderer, or combat/capture flow. It answers "how many
//  camps, what stats, which named region, what unit" — the next follow-up
//  chunk is wiring these plans into actual (c,r) tile coordinates inside
//  map generation (finding empty tiles of the right footprint size near
//  each named region, the way keeps/spawns already do), plus the render
//  and attack/capture flow. See the ReadMeAI entry for this change.
// ─────────────────────────────────────────────────────────────────────────────

import { NEUTRAL_TROOPS } from "../constants/neutralTroops.js";
import { ANCIENT_TROOPS } from "../constants/ancientTroops.js";
import { POWER_DEFS } from "../constants/map.js";
import { REGIONS_BY_BAND, ANCIENT_ZONE_NAMES, findRegionByName } from "../constants/mapRegions.js";

// ── Footprint by unit size ────────────────────────────────────────────────
export const CAMP_FOOTPRINTS = {
  small:  { w: 1, h: 1 },
  medium: { w: 1, h: 2 },
  large:  { w: 2, h: 2 },
};

export function campFootprint(size) {
  return CAMP_FOOTPRINTS[size] ?? CAMP_FOOTPRINTS.small;
}

// ── Comparable power level by tier ────────────────────────────────────────
// Neutral tier 0/1/2 (T1/T2/T3) → P7/P9/P11. Ancients (T4) → P13.
export const TIER_POWER_LEVEL = { 0: 7, 1: 9, 2: 11 };
export const ANCIENT_POWER_LEVEL = 13;

export function campPowerLevel(unit, { isAncient = false } = {}) {
  return isAncient ? ANCIENT_POWER_LEVEL : (TIER_POWER_LEVEL[unit.tier] ?? 7);
}

// ── Siege HP, scaled by tier across the owner's 100k-500k range ──────────
// 4 brackets (T1/T2/T3/T4-Ancient), evenly spaced: 100000, 235000, 365000,
// 500000 (owner explicitly chose "scale by tier" over a flat random roll).
const SIEGE_BY_BRACKET = [100000, 235000, 365000, 500000];

export function campSiegeMax(unit, { isAncient = false } = {}) {
  if (isAncient) return SIEGE_BY_BRACKET[3];
  return SIEGE_BY_BRACKET[unit.tier] ?? SIEGE_BY_BRACKET[0];
}

// ── Camp name ──────────────────────────────────────────────────────────────
export function campName(unit) {
  return `${unit.label} Camp`;
}

// ── Defender spec: exactly 2 defenders, strength = comparable power level's
//    command level, garrisoned with the camp's own unit as its troops. ────
export function campDefenders(unit, opts = {}) {
  const pl = campPowerLevel(unit, opts);
  const cmdLvl = POWER_DEFS[pl]?.cmdLvl ?? POWER_DEFS[7].cmdLvl;
  // Ancients resolve through the real `{faction:"ancients", branch}` path
  // (see ancientTroops.js / troops.js's `resolveTroopBranch` fallback).
  // Regular neutrals resolve through `resolveNeutralUnit`/
  // `getNeutralSlotForBattle` in neutralTroops.js/battle.js, which take a
  // bare key, not a faction-shaped ref — so the defender's troop reference
  // matches whichever resolution path this camp's unit actually uses.
  const troopRef = opts.isAncient
    ? { faction: "ancients", branch: unit.key, tier: 0 }
    : { neutralKey: unit.key };
  return [0, 1].map(i => ({
    n: `${unit.label} Guard ${i + 1}`,
    cmdLvl,
    powerLevel: pl,
    troopBranch: troopRef,
  }));
}

// ── Full camp template for one unit (stats only — no map coordinate) ─────
export function buildCampTemplate(unit, opts = {}) {
  const isAncient = !!opts.isAncient;
  const pl = campPowerLevel(unit, { isAncient });
  return {
    name: campName(unit),
    unitKey: unit.key,
    isAncient,
    footprint: campFootprint(unit.size),
    powerLevel: pl,
    siege: campSiegeMax(unit, { isAncient }),
    siegeMax: campSiegeMax(unit, { isAncient }),
    defenders: campDefenders(unit, { isAncient }),
  };
}

// ── Placement plan: ~campsPerRegion camps of a band's units, spread evenly
//    across every named sub-region in that band. Deterministic (seeded by
//    region key + index), no RNG dependency the tests can't reproduce. ───
function seededPick(list, seedStr, index) {
  let h = 0;
  const s = `${seedStr}:${index}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}

export function neutralUnitsForBand(band) {
  return NEUTRAL_TROOPS.filter(u => u.region === band);
}

// Returns [{ regionKey, regionName, band, campIndex, unit, template }]
export function planCampsForBand(band, { campsPerRegion = 30 } = {}) {
  const units = neutralUnitsForBand(band);
  if (!units.length) return [];
  const regions = REGIONS_BY_BAND[band] || [];
  const plan = [];
  for (const region of regions) {
    for (let i = 0; i < campsPerRegion; i++) {
      const unit = seededPick(units, region.key, i);
      plan.push({
        regionKey: region.key,
        regionName: region.name,
        band,
        campIndex: i,
        unit: unit.key,
        template: buildCampTemplate(unit),
      });
    }
  }
  return plan;
}

export function planAllNeutralCamps({ campsPerRegion = 30 } = {}) {
  return [
    ...planCampsForBand("north", { campsPerRegion }),
    ...planCampsForBand("mid", { campsPerRegion }),
    ...planCampsForBand("south", { campsPerRegion }),
  ];
}

// ── Ancient zone assignment ───────────────────────────────────────────────
// One Ancient per gate zone. Thematic pairing (documented judgment call,
// trivially reassignable — it's just this map):
//   Dawngate       → The Nameless Colossus (a colossal gatekeeper)
//   Twilightspire  → Voidmaw, the First Devourer (void/dark fits twilight)
//   Lastwatch      → Aeonspire, the Silent Watcher ("watcher" ~ "watch")
//   Finalhope      → Ruinfather, Who Walked Before (the oldest thing guards
//                    the last hope)
export const ANCIENT_ZONE_ASSIGNMENT = {
  Dawngate: "nameless_colossus",
  Twilightspire: "voidmaw",
  Lastwatch: "aeonspire",
  Finalhope: "ruinfather",
};

const _ANCIENT_BY_KEY = new Map(ANCIENT_TROOPS.map(a => [a.key, a]));

export function planAncientZoneCamps({ campsPerZone = 20 } = {}) {
  const plan = [];
  for (const zoneName of ANCIENT_ZONE_NAMES) {
    const ancientKey = ANCIENT_ZONE_ASSIGNMENT[zoneName];
    const ancient = _ANCIENT_BY_KEY.get(ancientKey);
    const region = findRegionByName(zoneName);
    if (!ancient || !region) continue;
    for (let i = 0; i < campsPerZone; i++) {
      plan.push({
        regionKey: region.key,
        regionName: region.name,
        band: region.band,
        campIndex: i,
        unit: ancient.key,
        template: buildCampTemplate(ancient, { isAncient: true }),
      });
    }
  }
  return plan;
}

export function planAllCamps(opts = {}) {
  return [...planAllNeutralCamps(opts), ...planAncientZoneCamps(opts)];
}
