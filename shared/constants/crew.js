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
export const DEFAULT_CREW_PRIVACY = CREW_PRIVACY.LOCKED;

// ── Description / emblem ────────────────────────────────────────────────────
export const CREW_DESCRIPTION_MAX_LEN = 200;

// Emblem = { shape, icon, color }, all ids into a fixed catalog rather than
// free-form art — keeps it deterministic (no upload/CDN) and easy to render
// as layered SVG/CSS. Catalog is intentionally small for the first pass and
// meant to grow.
export const EMBLEM_SHAPES = ["shield", "banner", "crest", "roundel"];
export const EMBLEM_ICONS  = [
  "skull", "sword", "axe", "wolf", "raven", "flame", "anchor", "star",
  "serpent", "tower", "crown", "arrow",
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
];
export const DEFAULT_EMBLEM = { shape: EMBLEM_SHAPES[0], icon: EMBLEM_ICONS[0], color: EMBLEM_COLORS[0] };

export function isValidEmblem(e) {
  return !!e && EMBLEM_SHAPES.includes(e.shape) && EMBLEM_ICONS.includes(e.icon) && EMBLEM_COLORS.includes(e.color);
}

// ── Level / XP / member-cap / fortress-slot schedule ───────────────────────
// Levels 1–50. Member cap starts at 50 and gains +5 every 2 levels (2, 4, 6,
// … 20) until it hits the 100 hard cap. Fortress slots start at 2 and gain
// +1 at levels 15, 30 and 45, capping at 5.
export const CREW_MAX_LEVEL = 50;
export const CREW_BASE_MEMBER_CAP = 50;
export const CREW_MAX_MEMBER_CAP = 100;
export const CREW_CAP_STEP_LEVELS = 2;   // a +5 lands every 2 levels...
export const CREW_CAP_STEP_AMOUNT = 5;   // ...until CREW_MAX_MEMBER_CAP is reached
export const CREW_BASE_FORTRESS_SLOTS = 2;
export const CREW_MAX_FORTRESS_SLOTS = 5;
export const CREW_FORTRESS_SLOT_LEVELS = [15, 30, 45];

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
export const CREW_STORE_ITEMS = [
  { id: "relocate",      name: "Relocation Token",   cost: 500,  effect: { type: "relocationToken" } },
  { id: "speedup_1h",    name: "1h Speedup",         cost: 150,  effect: { type: "speedup", ms: 3_600_000 } },
  { id: "speedup_8h",    name: "8h Speedup",         cost: 900,  effect: { type: "speedup", ms: 28_800_000 } },
  { id: "wood_pack",     name: "Wood Pack (50k)",    cost: 200,  effect: { type: "resource", res: "wood",  amount: 50_000 } },
  { id: "stone_pack",    name: "Stone Pack (50k)",   cost: 200,  effect: { type: "resource", res: "stone", amount: 50_000 } },
  { id: "gas_pack",      name: "Gas Pack (50k)",     cost: 200,  effect: { type: "resource", res: "gas",   amount: 50_000 } },
];

// Contribution Points earned per Crew Help given (flat, independent of the
// Crew Hall level that determines the *time* a help removes — see
// shared/constants/buildings.js crewHelpAmount).
export const CREW_HELP_CONTRIBUTION = 10;

// crew: { id, name, abbr, description, emblem, privacy, faction, members[],
//         officers[], founder, cap, level, xp, subChannels, fortresses[],
//         diplomacy? }
// This mirrors/extends the pre-2.0 shape (id/name/abbr/faction/members/cap/
// founder/subChannels) — see shared/utils/aiCrews.js and CrewPanel.jsx for
// the fields already in use. crewRules.js's createCrew() is the one place
// that should construct this object going forward.
export function isCrewShape(c) {
  return !!c && typeof c.id === "string" && typeof c.name === "string" && Array.isArray(c.members);
}
