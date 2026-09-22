// Crew 2.0 — pure data/constants. No framework, no storage — same split as
// shared/constants/chat.js. Rules that consume this data live in
// shared/utils/crewRules.js and shared/utils/crewFortress.js.

// ── Roles ───────────────────────────────────────────────────────────────────
// A crew has exactly one founder (crew.founder, a playerId) plus up to
// CREW_MAX_OFFICERS officers (crew.officers: playerId[]) — everyone else in
// crew.members is a plain member. Permissions live in crewRules.js.
export const CREW_ROLES = { FOUNDER: "founder", OFFICER: "officer", MEMBER: "member" };
export const CREW_MAX_OFFICERS = 4;

// ── Privacy ─────────────────────────────────────────────────────────────────
// open    — anyone can join instantly, no request.
// locked  — shows up in Browse; joining requires a request the founder/an
//           officer must accept.
// private — invite-only; never appears in Browse/search results at all.
export const CREW_PRIVACY = { OPEN: "open", LOCKED: "locked", PRIVATE: "private" };
export const DEFAULT_CREW_PRIVACY = CREW_PRIVACY.OPEN;

// ── Description / emblem / language ────────────────────────────────────────
export const CREW_DESCRIPTION_MAX_LEN = 200;

// A crew's stated language, shown in the HQ header — informational only
// (doesn't gate anything; the game itself is English-only today).
export const CREW_LANGUAGES = [
  "English", "Spanish", "Portuguese", "French", "German", "Italian",
  "Polish", "Russian", "Turkish", "Arabic", "Hindi",
  "Japanese", "Korean", "Chinese",
];
export const DEFAULT_CREW_LANGUAGE = CREW_LANGUAGES[0];

// ── Diplomacy ───────────────────────────────────────────────────────────
// One-way: crew.diplomacy = { [otherCrewId]: "ally" | "enemy" }. No entry =
// neutral (the default for every crew, never stored explicitly). Setting
// crew A's diplomacy toward crew B does NOT change crew B's diplomacy
// toward crew A — each crew keeps its own map. Cosmetic only: an "ally" can
// still be attacked, this only changes tile/structure outline color (see
// ownerTint in MapRenderer.jsx). No real gameplay effect until real
// multiplayer/War Declaration exists.
export const CREW_DIPLOMACY_STATUS = { ALLY: "ally", ENEMY: "enemy" };
export const CREW_DIPLOMACY_STATUSES = Object.values(CREW_DIPLOMACY_STATUS);

// ── War ─────────────────────────────────────────────────────────────────
// A crew-wide state, NOT targeted at a specific enemy crew — declaring puts
// the whole crew "at war" for the duration, lifting the enemy-territory
// siege debuff (see shared/utils/warRules.js) for every member's armies
// against every enemy crew's territory at once, not one chosen opponent.
// crew.war: null (peace) | { declaredAt, startsAt, endsAt, cooldownEndsAt,
// declaredBy } — phase is derived from these timestamps by crewWarPhase()
// in crewRules.js, never stored as its own field, so it's always correct
// against the current clock: "declared" (before startsAt) -> "active"
// (before endsAt) -> "cooldown" (before cooldownEndsAt) -> "peace" once
// cooldownEndsAt passes, same lazy-deadline pattern as crewFortress.js's
// buildEndsAt/isFortressBuilt.
// Later chapters are meant to cut the declare delay to 3h and the cooldown
// to 12h, but there's no "chapter" system in this codebase yet, so these
// are the only values in effect today — revisit once chapters exist.
export const WAR_DECLARE_TO_START_MS = 6 * 60 * 60_000;  // 6h
export const WAR_DURATION_MS         = 24 * 60 * 60_000; // 24h
export const WAR_COOLDOWN_MS         = 24 * 60 * 60_000; // 24h after war ends

// ── Rally target ─────────────────────────────────────────────────────────
// A single pinned target the founder/an officer sets for the whole crew to
// see and rally on (shows in CrewHQ's header area). Not a queue — setting a
// new one replaces the old. { tileKey, label, setBy, setAt } | null.
export const CREW_TARGET_LABEL_MAX_LEN = 40;

// Emblem = { shape, icon, color, iconColor }, all ids into a fixed catalog
// rather than free-form art — keeps it deterministic (no upload/CDN) and
// easy to render as layered SVG/CSS. `color` is the badge background,
// `iconColor` recolors the icon glyph itself independently (see Emblem.jsx —
// icons are hand-authored single-color SVGs specifically so this works).
// 24 icons: the original 12 plus 12 new ones, several tied to a faction
// (see shared/constants/factions.js) so factions have a recognizable pick.
export const EMBLEM_SHAPES = ["shield", "banner", "crest", "roundel"];
export const EMBLEM_ICONS  = [
  // original set
  "skull", "sword", "axe", "wolf", "raven", "flame", "anchor", "star",
  "serpent", "tower", "crown", "arrow",
  // faction-themed additions
  "dragon",   // dragons
  "cross",    // holyknights
  "snowflake",// coldborns
  "moon",     // nightcreatures
  "bat",      // nightcreatures (alt)
  "orb",      // wizards
  "hammer",   // orcs
  "reaper",   // ashen_dead
  "trident",  // pirates
  // general-purpose additions
  "shield_emblem", "eagle", "lion",
];
export const EMBLEM_COLORS = [
  "#c8a060", // gold
  "#8a2020", // blood red
  "#2a5a8a", // steel blue
  "#3a6a3a", // forest green
  "#5a3a7a", // royal purple
  "#4a4a4a", // iron grey
  "#a05a20", // rust orange
  "#1a1a1a", // black
  "#e8dcc0", // parchment
  "#dcdcdc", // silver
];
export const DEFAULT_EMBLEM = {
  shape: EMBLEM_SHAPES[0], icon: EMBLEM_ICONS[0],
  color: EMBLEM_COLORS[0], iconColor: EMBLEM_COLORS[8],
};

export function isValidEmblem(e) {
  return !!e && EMBLEM_SHAPES.includes(e.shape) && EMBLEM_ICONS.includes(e.icon)
    && EMBLEM_COLORS.includes(e.color) && EMBLEM_COLORS.includes(e.iconColor);
}

// ── Level / XP / member-cap / fortress-slot schedule ───────────────────────
// Levels 1–50. Member cap starts at 50 and gains +5 every 2 levels (2, 4, 6,
// … 20) until it hits the 100 hard cap. Fortress slots start at 1 and gain
// +1 at levels 5, 15, 30 and 45, capping at 5.
export const CREW_MAX_LEVEL = 50;
export const CREW_BASE_MEMBER_CAP = 50;
export const CREW_MAX_MEMBER_CAP = 100;
export const CREW_CAP_STEP_LEVELS = 2;   // a +5 lands every 2 levels...
export const CREW_CAP_STEP_AMOUNT = 5;   // ...until CREW_MAX_MEMBER_CAP is reached
export const CREW_BASE_FORTRESS_SLOTS = 1;
export const CREW_MAX_FORTRESS_SLOTS = 5;
export const CREW_FORTRESS_SLOT_LEVELS = [5, 15, 30, 45];

// crew.level → member cap. Reaches CREW_MAX_MEMBER_CAP at level 20 and stays
// there through 50.
export function crewMemberCapForLevel(level) {
  const lvl = Math.max(1, Math.min(CREW_MAX_LEVEL, level || 1));
  const steps = Math.floor(lvl / CREW_CAP_STEP_LEVELS);
  return Math.min(CREW_MAX_MEMBER_CAP, CREW_BASE_MEMBER_CAP + steps * CREW_CAP_STEP_AMOUNT);
}

// crew.level → fortress slots unlocked so far.
export function crewFortressSlotsForLevel(level) {
  const lvl = Math.max(1, Math.min(CREW_MAX_LEVEL, level || 1));
  const unlocked = CREW_FORTRESS_SLOT_LEVELS.filter(l => lvl >= l).length;
  return Math.min(CREW_MAX_FORTRESS_SLOTS, CREW_BASE_FORTRESS_SLOTS + unlocked);
}

// XP required to go from level N to N+1. Gentle early curve, steeper later —
// placeholder curve, easy to retune once balance passes start (kept in one
// place on purpose). Level 50 has no "next" threshold (Infinity).
export function crewXpToNextLevel(level) {
  const lvl = Math.max(1, Math.min(CREW_MAX_LEVEL, level || 1));
  if (lvl >= CREW_MAX_LEVEL) return Infinity;
  return Math.round(1000 * Math.pow(lvl, 1.55));
}

// ── Per-resource production perks (levels 3-26) ────────────────────────────
// Each grants a flat +N/hr of one resource to every crew member (applied to
// the player's own resource income for now, same as the faction bonuses in
// resourceIncome.js — real crew-wide multiplayer sharing lands once a server
// exists, per the roadmap). Three tiers per resource, staggered so no two
// unlock on the exact same level.
const RES_ICON = { wood: "🪵", stone: "🪨", gas: "⚗", food: "🌾" };
const RES_LABEL = { wood: "Woodworking", stone: "Stone Masonry", gas: "Gas Collector", food: "Food Farmer" };
const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };
export const CREW_LEVEL_RESOURCE_PERKS = [
  { level: 3,  id: "woodworking_1",   res: "wood",  tier: 1, amount: 500 },
  { level: 7,  id: "stone_masonry_1", res: "stone", tier: 1, amount: 500 },
  { level: 9,  id: "gas_collector_1", res: "gas",   tier: 1, amount: 500 },
  { level: 11, id: "food_farmer_1",   res: "food",  tier: 1, amount: 500 },
  { level: 13, id: "woodworking_2",   res: "wood",  tier: 2, amount: 750 },
  { level: 17, id: "stone_masonry_2", res: "stone", tier: 2, amount: 750 },
  { level: 19, id: "gas_collector_2", res: "gas",   tier: 2, amount: 750 },
  { level: 21, id: "food_farmer_2",   res: "food",  tier: 2, amount: 750 },
  { level: 22, id: "woodworking_3",   res: "wood",  tier: 3, amount: 1000 },
  { level: 23, id: "stone_masonry_3", res: "stone", tier: 3, amount: 1000 },
  { level: 24, id: "gas_collector_3", res: "gas",   tier: 3, amount: 1000 },
  { level: 26, id: "food_farmer_3",   res: "food",  tier: 3, amount: 1000 },
  { level: 29, id: "woodworking_4",   res: "wood",  tier: 4, amount: 1250 },
  { level: 32, id: "stone_masonry_4", res: "stone", tier: 4, amount: 1250 },
  { level: 33, id: "gas_collector_4", res: "gas",   tier: 4, amount: 1250 },
  { level: 34, id: "food_farmer_4",   res: "food",  tier: 4, amount: 1250 },
];

// ── March speed perk ────────────────────────────────────────────────────────
export const CREW_LEVEL_MARCH_PERKS = [
  { level: 25, id: "faster_together_1", tier: 1, pct: 0.05 },
  { level: 38, id: "faster_together_2", tier: 2, pct: 0.075 },
];

// ── All-resource perk ───────────────────────────────────────────────────────
// Level 27 ("Resource Trove I") and level 39 ("Treasure Trove II") are the
// same mechanic under the name the owner gave each tier.
export const CREW_LEVEL_ALLRES_PERKS = [
  { level: 27, id: "resource_trove_1", tier: 1, label: "Resource Trove I", amount: 1200 },
  { level: 39, id: "treasure_trove_2", tier: 2, label: "Treasure Trove II", amount: 2000 },
];

// ── Heal-speed perk (Healer) ────────────────────────────────────────────────
export const CREW_LEVEL_HEAL_PERKS = [
  { level: 28, id: "healer_1", tier: 1, pct: 0.05 },
  { level: 41, id: "healer_2", tier: 2, pct: 0.10 },
];

// ── Training XP perk (Scholars — the egg/training-tick feature) ────────────
export const CREW_LEVEL_XP_PERKS = [
  { level: 36, id: "scholars_1", tier: 1, pct: 0.05 },
  { level: 47, id: "scholars_2", tier: 2, pct: 0.10 },
];

// ── Gathering-yield perk (Gatherers) ────────────────────────────────────────
export const CREW_LEVEL_GATHER_PERKS = [
  { level: 37, id: "gatherers_1", tier: 1, pct: 0.05 },
  { level: 46, id: "gatherers_2", tier: 2, pct: 0.10 },
];

// ── PvE-tile damage perk ────────────────────────────────────────────────────
export const CREW_LEVEL_PVE_DMG_PERKS = [
  { level: 44, id: "pve_dmg_1", pct: 0.10 },
];

// ── Spawn-army damage perk (Spawn Sweeper) ──────────────────────────────────
// Applied in shared/utils/battle.js to Sweep fights (defCmd.isSpawn).
export const CREW_LEVEL_SPAWN_DMG_PERKS = [
  { level: 43, id: "spawn_sweeper_1", pct: 0.10 },
];

// ── Training time/cost perks ────────────────────────────────────────────────
export const CREW_LEVEL_TRAIN_TIME_PERKS = [
  { level: 48, id: "efficient_trainer", pct: 0.05 },
];
export const CREW_LEVEL_TRAIN_COST_PERKS = [
  { level: 49, id: "cost_effective", pct: 0.10 },
];

// ── Structures unlocked by crew level: Well + Contract Board/Outpost ─────
// Rules live in shared/utils/crewStructures.js. `kind`/`count` drive the
// slot helpers below so the Level tab and the real limits can't drift apart.
export const CREW_LEVEL_STRUCTURE_PERKS = [
  { level: 31, id: "well_1",           kind: "well",     count: 1, icon: "💧", label: "Well I",             detail: "Founder can build a Well" },
  { level: 35, id: "contract_board_1", kind: "outpost",  count: 1, icon: "📜", label: "Contract Board I",   detail: "Founder can build a Contract Outpost (1 neutral unit)" },
  { level: 40, id: "well_2",           kind: "well",     count: 2, icon: "💧", label: "Well II",            detail: "Founder can build a 2nd Well" },
  { level: 42, id: "contract_board_2", kind: "hireTime", pct: 0.10, icon: "📜", label: "Contract Board II",  detail: "-10% hire time at the Contract Outpost" },
  { level: 50, id: "contract_board_3", kind: "outpostUnits", count: 2, icon: "📜", label: "Contract Board III", detail: "Contract Outpost offers a 2nd neutral unit" },
];

function crewLvl(level) { return Math.max(1, Math.min(CREW_MAX_LEVEL, level || 1)); }
// Wells a crew may have at this level (0 before 31, 1 at 31, 2 at 40).
export function crewWellSlotsForLevel(level) {
  const lvl = crewLvl(level);
  return CREW_LEVEL_STRUCTURE_PERKS.filter(p => p.kind === "well" && lvl >= p.level)
    .reduce((n, p) => Math.max(n, p.count), 0);
}
// Contract Outpost unlocked (level 35+) — one per crew.
export function crewOutpostUnlocked(level) {
  return crewLvl(level) >= (CREW_LEVEL_STRUCTURE_PERKS.find(p => p.kind === "outpost")?.level ?? Infinity);
}
// Neutral units the founder may pick for the Outpost (0 / 1 at 35 / 2 at 50).
export function crewOutpostUnitSlots(level) {
  const lvl = crewLvl(level);
  return CREW_LEVEL_STRUCTURE_PERKS.filter(p => (p.kind === "outpost" || p.kind === "outpostUnits") && lvl >= p.level)
    .reduce((n, p) => Math.max(n, p.count), 0);
}
// Contract Board II: -N% hire (training) time for Outpost-sourced units.
export function crewOutpostHireTimeBonus(level) {
  const lvl = crewLvl(level);
  return CREW_LEVEL_STRUCTURE_PERKS.filter(p => p.kind === "hireTime" && lvl >= p.level)
    .reduce((n, p) => n + p.pct, 0);
}

// Build rules. Cost/time are PLACEHOLDERS matching the Fortress (owner said
// "similar to a fortress" but gave no numbers) — tune here.
export const WELL_MIN_POWER_LEVEL = 10;
export const WELL_BUILD_MS = 3 * 60 * 60_000;
export const WELL_COST = { wood: 150_000, stone: 250_000, gas: 175_000 };
export const OUTPOST_MIN_POWER_LEVEL = 10;
export const OUTPOST_BUILD_MS = 3 * 60 * 60_000;
export const OUTPOST_COST = { wood: 150_000, stone: 250_000, gas: 175_000 };
// Per-player, per-day cap on Outpost-sourced training, in training COMMANDS
// (trainingQuote's `commands` = amount / command size). Resets daily.
export const OUTPOST_DAILY_COMMAND_LIMIT = 100;

// Generic "sum every unlocked tier's pct" helper — same shape as
// crewMarchSpeedBonus, reused for heal/xp/gather/pve/spawn/train perks.
function sumCrewPct(level, perks) {
  const lvl = Math.max(1, Math.min(CREW_MAX_LEVEL, level || 1));
  let pct = 0;
  for (const p of perks) if (lvl >= p.level) pct += p.pct;
  return pct;
}
export function crewHealSpeedBonus(level)  { return sumCrewPct(level, CREW_LEVEL_HEAL_PERKS); }
export function crewXpBonus(level)         { return sumCrewPct(level, CREW_LEVEL_XP_PERKS); }
export function crewGatherYieldBonus(level){ return sumCrewPct(level, CREW_LEVEL_GATHER_PERKS); }
export function crewPveDmgBonus(level)     { return sumCrewPct(level, CREW_LEVEL_PVE_DMG_PERKS); }
export function crewSpawnDmgBonus(level)   { return sumCrewPct(level, CREW_LEVEL_SPAWN_DMG_PERKS); }
export function crewTrainTimeBonus(level)  { return sumCrewPct(level, CREW_LEVEL_TRAIN_TIME_PERKS); }
export function crewTrainCostBonus(level)  { return sumCrewPct(level, CREW_LEVEL_TRAIN_COST_PERKS); }

// crew.level → cumulative flat +N/hr per resource from every unlocked
// resource perk (per-resource ones above + the all-resource ones), for
// wiring into resourceIncome.js the same way the faction tile bonus is.
export function crewResourceRateBonus(level) {
  const lvl = Math.max(1, Math.min(CREW_MAX_LEVEL, level || 1));
  const bonus = { stone: 0, wood: 0, gas: 0, food: 0 };
  for (const p of CREW_LEVEL_RESOURCE_PERKS) if (lvl >= p.level) bonus[p.res] += p.amount;
  for (const p of CREW_LEVEL_ALLRES_PERKS) if (lvl >= p.level) {
    bonus.stone += p.amount; bonus.wood += p.amount; bonus.gas += p.amount; bonus.food += p.amount;
  }
  return bonus;
}

// crew.level → cumulative march-speed % bonus from every unlocked march perk.
export function crewMarchSpeedBonus(level) {
  const lvl = Math.max(1, Math.min(CREW_MAX_LEVEL, level || 1));
  let pct = 0;
  for (const p of CREW_LEVEL_MARCH_PERKS) if (lvl >= p.level) pct += p.pct;
  return pct;
}

// crew.level → the perk(s) that unlock AT exactly that level (not
// cumulative — crewMemberCapForLevel/crewFortressSlotsForLevel/
// crewResourceRateBonus/crewMarchSpeedBonus above give the running total).
// Backs the Level tab (CrewLevel.jsx): every level 1–50 gets a row, real
// perk if one lands there, a placeholder otherwise, so the full climb to
// CREW_MAX_LEVEL always has something to look at even before more perks are
// designed. Add a new real perk here as one gets built rather than
// inventing UI-only copy elsewhere.
export function crewLevelPerks(level) {
  const perks = [];
  if (level >= CREW_CAP_STEP_LEVELS && level <= 20 && level % CREW_CAP_STEP_LEVELS === 0) {
    perks.push({
      id: "member_cap", icon: "👥", label: "Member Cap",
      detail: `+${CREW_CAP_STEP_AMOUNT} (now ${crewMemberCapForLevel(level)})`,
    });
  }
  if (CREW_FORTRESS_SLOT_LEVELS.includes(level)) {
    perks.push({
      id: "fortress_slot", icon: "🏰", label: "Fortress Slot",
      detail: `+1 (now ${crewFortressSlotsForLevel(level)})`,
    });
  }
  const resPerk = CREW_LEVEL_RESOURCE_PERKS.find(p => p.level === level);
  if (resPerk) {
    perks.push({
      id: resPerk.id, icon: RES_ICON[resPerk.res], label: `${RES_LABEL[resPerk.res]} ${ROMAN[resPerk.tier]}`,
      detail: `+${resPerk.amount}/hr ${resPerk.res} (crew)`,
    });
  }
  const marchPerk = CREW_LEVEL_MARCH_PERKS.find(p => p.level === level);
  if (marchPerk) {
    perks.push({
      id: marchPerk.id, icon: "🐎", label: `Faster Together ${ROMAN[marchPerk.tier]}`,
      detail: `+${Math.round(marchPerk.pct * 100)}% march speed (crew)`,
    });
  }
  const allResPerk = CREW_LEVEL_ALLRES_PERKS.find(p => p.level === level);
  if (allResPerk) {
    perks.push({
      id: allResPerk.id, icon: "💰", label: allResPerk.label,
      detail: `+${allResPerk.amount}/hr all resources (crew)`,
    });
  }
  const healPerk = CREW_LEVEL_HEAL_PERKS.find(p => p.level === level);
  if (healPerk) {
    perks.push({
      id: healPerk.id, icon: "✚", label: `Healer ${ROMAN[healPerk.tier]}`,
      detail: `-${Math.round(healPerk.pct * 100)}% recovery time (crew)`,
    });
  }
  const xpPerk = CREW_LEVEL_XP_PERKS.find(p => p.level === level);
  if (xpPerk) {
    perks.push({
      id: xpPerk.id, icon: "📚", label: `Scholars ${ROMAN[xpPerk.tier]}`,
      detail: `+${Math.round(xpPerk.pct * 100)}% training XP (crew)`,
    });
  }
  const gatherPerk = CREW_LEVEL_GATHER_PERKS.find(p => p.level === level);
  if (gatherPerk) {
    perks.push({
      id: gatherPerk.id, icon: "⛏", label: `Gatherers ${ROMAN[gatherPerk.tier]}`,
      detail: `+${Math.round(gatherPerk.pct * 100)}% resources from gathering (crew)`,
    });
  }
  const pvePerk = CREW_LEVEL_PVE_DMG_PERKS.find(p => p.level === level);
  if (pvePerk) {
    perks.push({
      id: pvePerk.id, icon: "💥", label: "PvE",
      detail: `+${Math.round(pvePerk.pct * 100)}% damage to PvE tiles (crew)`,
    });
  }
  const spawnPerk = CREW_LEVEL_SPAWN_DMG_PERKS.find(p => p.level === level);
  if (spawnPerk) {
    perks.push({
      id: spawnPerk.id, icon: "💀", label: "Spawn Sweeper",
      detail: `+${Math.round(spawnPerk.pct * 100)}% damage to Spawn armies (crew)`,
    });
  }
  const trainTimePerk = CREW_LEVEL_TRAIN_TIME_PERKS.find(p => p.level === level);
  if (trainTimePerk) {
    perks.push({
      id: trainTimePerk.id, icon: "⏱", label: "Efficient Trainer",
      detail: `-${Math.round(trainTimePerk.pct * 100)}% training time (crew)`,
    });
  }
  const trainCostPerk = CREW_LEVEL_TRAIN_COST_PERKS.find(p => p.level === level);
  if (trainCostPerk) {
    perks.push({
      id: trainCostPerk.id, icon: "💵", label: "Cost Effective",
      detail: `-${Math.round(trainCostPerk.pct * 100)}% training cost (crew)`,
    });
  }
  const structPerk = CREW_LEVEL_STRUCTURE_PERKS.find(p => p.level === level);
  if (structPerk) {
    perks.push({
      id: structPerk.id, icon: structPerk.icon, label: structPerk.label,
      detail: structPerk.detail,
    });
  }
  return perks;
}

// Applies earned XP, rolling over multiple level-ups in one call (e.g. a big
// batch of AI-tick contributions). Returns { level, xp } — xp is progress
// into the current level, never the cumulative total.
export function applyCrewXp(level, xp, gained) {
  let lvl = Math.max(1, Math.min(CREW_MAX_LEVEL, level || 1));
  let cur = Math.max(0, (xp || 0) + Math.max(0, gained || 0));
  while (lvl < CREW_MAX_LEVEL) {
    const need = crewXpToNextLevel(lvl);
    if (cur < need) break;
    cur -= need;
    lvl += 1;
  }
  if (lvl >= CREW_MAX_LEVEL) cur = 0;
  return { level: lvl, xp: cur };
}

// ── Fortress ────────────────────────────────────────────────────────────────
export const FORTRESS_MIN_POWER_LEVEL = 10; // must be a p10+ tile
export const FORTRESS_BUILD_MS = 3 * 60 * 60_000; // 3 hours
export const FORTRESS_COST = { wood: 150_000, stone: 250_000, gas: 175_000 };
export const FORTRESS_COMMANDER_SLOTS_PER_MEMBER = 2;

// ── Contribution Points / Store (currency for this pass) ──────────────────
// Earned via Crew Help and crew-activity contribution (see crewRules.js).
// Catalog kept intentionally small — a first, real (not stub) pass per the
// owner's call; easy to extend once more sinks are designed.
// effect.type "consumable" reuses the game's existing Bag/consumables system
// (shared/constants/consumables.js typeIds) rather than inventing a parallel
// one — buying one of these just adds/uses that real consumable. "resource"
// items grant a flat amount immediately. See src/GameView.jsx's
// onBuyStoreItem for how each type is applied.
export const CREW_STORE_ITEMS = [
  { id: "relocate",   name: "Relocation Token",  cost: 500, effect: { type: "consumable", typeId: "relocation", grantsToBag: true } },
  { id: "speedup_1h", name: "1h Building Speedup", cost: 150, effect: { type: "consumable", typeId: "su_bldg_60" } },
  { id: "speedup_8h", name: "8h Building Speedup", cost: 900, effect: { type: "consumable", typeId: "su_bldg_480" } },
  { id: "wood_pack",  name: "Wood Pack (50k)",   cost: 200, effect: { type: "resource", res: "wood",  amount: 50_000 } },
  { id: "stone_pack", name: "Stone Pack (50k)",  cost: 200, effect: { type: "resource", res: "stone", amount: 50_000 } },
  { id: "gas_pack",   name: "Gas Pack (50k)",    cost: 200, effect: { type: "resource", res: "gas",   amount: 50_000 } },
];

// Contribution Points earned per Crew Help given (flat, independent of the
// Crew Hall level that determines the *time* a help removes — see
// shared/constants/buildings.js crewHelpAmount).
export const CREW_HELP_CONTRIBUTION = 10;

// crew: { id, name, abbr, description, emblem, privacy, faction, members[],
//         officers[], founder, cap, level, xp, subChannels, fortresses[],
//         diplomacy: { [otherCrewId]: "ally"|"enemy" } }
// This mirrors/extends the pre-2.0 shape (id/name/abbr/faction/members/cap/
// founder/subChannels) — see shared/utils/aiCrews.js and CrewPanel.jsx for
// the fields already in use. crewRules.js's createCrew() is the one place
// that should construct this object going forward.
export function isCrewShape(c) {
  return !!c && typeof c.id === "string" && typeof c.name === "string" && Array.isArray(c.members);
}
