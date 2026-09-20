// ─────────────────────────────────────────────────────────────────────────────
//  neutralTroops.js — Neutral (unaligned) Troop Roster
//
//  Roadmap item: "Missing systems and content" → neutral units, built through
//  the SAME troop/branch/battle architecture as faction troops (see
//  `shared/constants/troops.js`), not a disconnected combat system. This is a
//  new, parallel data structure (like the T4 "capstone" addition before it)
//  rather than a bolt-on to `FACTION_TROOPS`, because neutral units are not
//  trained by any faction/quarter and don't share a faction's 3-tier branch
//  shape.
//
//  Scope note: this file is DATA + battle-resolution helpers only. There is
//  no map placement, garrison spawning or UI wiring here — see the ReadMeAI
//  entry for this change for exactly what is/isn't done.
//
//  15 total units:
//    - 7 from 3 brand-new races: Beastfolk (3), Stoneborn (2), Sandrunner (2)
//    - 8 "renegade" units, one per existing faction (a rogue/deserter/outcast
//      flavor of that faction's race)
//
//  Unlike a `FACTION_TROOPS` branch (one branch = one troop LINE with 3 tiers
//  of the SAME unit, escalating in power at a FIXED size), each neutral unit
//  here is a single fixed named unit — its `tier` field (0/1/2 ~ T1/T2/T3) is
//  a power/rarity bracket for balance purposes only, not a 3-row stat
//  progression, and different tiers of the same race can be (and are)
//  different sizes (e.g. Beastfolk go small→medium→large as T1→T2→T3).
//  Because of that, the normal "T1=skillA only / T2=skillB only / T3=A+B"
//  convention from troops.js doesn't cleanly apply (there's no 3-row branch
//  to assign skills across) — SIMPLIFIED here: every neutral unit has exactly
//  the one ability the design calls for, stored at `skills.a`. This keeps the
//  same `{ a, b }` shape faction branches use (so shared helpers/UI that
//  expect that shape don't need special-casing) while being honest that only
//  `a` is ever populated today.
//
//  Stat scaling follows the same large→medium→small convention introduced
//  for T4 capstone branches (see troops.js header comment + ReadMeAI
//  2026-09-20 "T4 capstone troops" entry): dmg/hp/siege drop off steeply
//  from large → medium → small, DEF drops off less steeply, and SPD rises as
//  size shrinks. Concretely (see `tests/neutralTroops.test.js` for the
//  checked bounds): medium stats land roughly 5-20% of an equivalent large
//  unit's dmg/hp/siege and ~45-70% of its DEF; small stats land roughly
//  35-90% of the equivalent medium unit's dmg/hp/siege/DEF; SPD increases
//  going small ← medium ← large.
//
//  Command cost follows the existing `COMMAND_COST` by size (small/medium/
//  large) exactly like faction troops — no new command-cost rule needed.
//
//  Tags: a new, small, reusable tag vocabulary. Only neutrals use tags today;
//  existing faction troops could adopt them later without any migration
//  (`branchDef.tags` is simply undefined for them, and every tag check in
//  battle.js safely no-ops on that with optional chaining).
// ─────────────────────────────────────────────────────────────────────────────

export const NEUTRAL_TAGS = [
  "beast",     // Beastfolk and beast-kin units
  "pack",      // fights better in numbers / coordinates with other pack units
  "construct", // Stoneborn and other animate-construct units
  "armored",   // heavily armored constructs
  "raider",    // Sandrunner and raider-flavored units
  "swarm",     // reserved for future swarm-type units (not used by the current 15)
  "renegade",  // rogue/deserter/outcast units broken off from an existing faction
];

// ── Region placement ──────────────────────────────────────────────────────
// "south" | "mid" | "north" — roughly 5 units per band, mixing new-race and
// renegade units in each band (not "all new races in one band"). Reasoning:
//   - south: Sandrunner (desert) + the more coastal/southern-flavored
//     renegades (a pirate deserter, a dragon poacher hunting wyrms, a grave
//     robber looting old battlefields).
//   - mid: Beastfolk (temperate wilds) + orc/wizard/holy-knight renegades,
//     factions whose home territories sit centrally on the map.
//   - north: Stoneborn (mountains) + the colder/darker renegades (coldborn
//     exile, feral night-creature, a wizard's rogue battlemage counted with
//     mid instead to keep the split even — see per-unit `region` below).
//   This is a documented judgment call, not a locked design decision; it can
//   be rebalanced later without any structural change.

const RAT = {
  // large → medium → small ratio convention (see file header). Kept as named
  // constants purely so every unit's numbers are derived the same way and a
  // future rebalance only needs to touch this table.
  MED_OF_LARGE: { dmg: 0.065, def: 0.55, hp: 0.07, siege: 0.03, spd: 1.35 },
  SMALL_OF_MED: { dmg: 0.65, def: 0.45, hp: 0.45, siege: 0.65, spd: 1.30 },
};
void RAT; // documentation constant — concrete stat blocks below were hand-tuned
          // to existing faction troops of the same size+tier bracket rather
          // than mechanically derived, but land within RAT's ratio bounds
          // (checked in tests/neutralTroops.test.js).

export const NEUTRAL_TROOPS = [
  // ── BEASTFOLK ────────────────────────────────────────────────────────────
  {
    key: "wolf_rider",
    label: "Wolf Rider",
    race: "Beastfolk",
    size: "small",
    tier: 0, // T1
    dmgType: "physical",
    role: "mounted",
    tags: ["beast"],
    region: "mid",
    desc: "A lone Beastfolk scout mounted on a war-bred wolf, fast and unpredictable.",
    stats: { dmgLo: 15, dmgHi: 19, def: 12, hp: 26, siege: 9, spd: 95 },
    skills: {
      a: {
        key: "pack_charge", name: "Pack Charge", icon: "🐺",
        trigger: "on_hit",
        desc: "On hit, chance to attack twice in one round.",
        procBase: 0.20, procMax: 0.60,
        effect: { type: "double_attack" },
      },
    },
  },
  {
    key: "bear_shaman",
    label: "Bear Shaman",
    race: "Beastfolk",
    size: "medium",
    tier: 1, // T2
    dmgType: "magical",
    role: "melee",
    tags: ["beast"],
    region: "mid",
    desc: "A Beastfolk warden who channels the spirit of the bear to ward the pack.",
    stats: { dmgLo: 26, dmgHi: 32, def: 30, hp: 75, siege: 14, spd: 70 },
    // Tag synergy — active ability, not a passive stat bonus. See battle.js
    // `procTroopSkills` case "tag_shield_ally": requires another allied slot
    // whose branch carries the `beast` tag to be present in the same army;
    // if none is present, this simply does not fire (no rs change at all).
    skills: {
      a: {
        key: "guardian_totem", name: "Guardian Totem", icon: "🐻",
        trigger: "round_start",
        desc: "On round start, chance to shield a random other Beast-tagged ally, reducing incoming damage by 25% for 1 round.",
        procBase: 0.25, procMax: 0.60,
        effect: { type: "tag_shield_ally", tag: "beast", value: 0.25 },
      },
    },
  },
  {
    key: "swarmwing_broodmother",
    label: "Swarmwing Broodmother",
    race: "Beastfolk",
    size: "large",
    tier: 2, // T3
    dmgType: "physical",
    role: "melee",
    tags: ["beast", "pack"],
    region: "north",
    desc: "A monstrous matriarch trailing a cloud of biting swarmwings — Beastfolk rally to her call.",
    stats: { dmgLo: 410, dmgHi: 435, def: 58, hp: 1150, siege: 520, spd: 58 },
    // Tag synergy — requires another Beast-tagged ally present to have any
    // effect (see "tag_buff_allies_tag" in battle.js).
    skills: {
      a: {
        key: "swarm_call", name: "Swarm Call", icon: "🐛",
        trigger: "round_start",
        desc: "On round start, chance to buff the attack of all Beast-tagged allies by 20% for 1 round.",
        procBase: 0.25, procMax: 0.55,
        effect: { type: "tag_buff_allies_tag", tag: "beast", value: 0.20 },
      },
    },
  },

  // ── STONEBORN ────────────────────────────────────────────────────────────
  {
    key: "rubble_warden",
    label: "Rubble Warden",
    race: "Stoneborn",
    size: "medium",
    tier: 1, // T2
    dmgType: "physical",
    role: "melee",
    tags: ["construct", "armored"],
    region: "north",
    desc: "A squat animate rubble-golem built to stand between its kin and harm.",
    stats: { dmgLo: 24, dmgHi: 29, def: 55, hp: 110, siege: 20, spd: 40 },
    // Tag synergy — requires another Construct-tagged ally present; on
    // success it "intercepts" the hit by mitigating this side's damage
    // taken via its own high DEF (see "tag_intercept_for_tag" in battle.js).
    skills: {
      a: {
        key: "stone_intercept", name: "Stone Intercept", icon: "🪨",
        trigger: "on_hit_received",
        desc: "On hit received, chance to intercept a hit aimed at another Construct-tagged ally, mitigating it with its own high DEF.",
        procBase: 0.25, procMax: 0.60,
        effect: { type: "tag_intercept_for_tag", tag: "construct", value: 0.20 },
      },
    },
  },
  {
    key: "ruin_colossus",
    label: "Ruin Colossus",
    race: "Stoneborn",
    size: "large",
    tier: 2, // T3
    dmgType: "physical",
    role: "siege",
    tags: ["construct", "armored"],
    region: "north",
    desc: "A towering construct built from the bones of a fallen keep — nearly impossible to bring down.",
    stats: { dmgLo: 460, dmgHi: 490, def: 100, hp: 1400, siege: 600, spd: 35 },
    // Tag synergy — requires another Construct-tagged ally present; grants a
    // near-full-absorb shield for that ally's next hit. Implemented as a
    // strong one-round damage-reduction (see "tag_full_shield_ally" in
    // battle.js) rather than a literal always-zero-damage flag, since the
    // existing engine's mitigation fields (`rs.dmgReduce`) are already
    // capped at 85% everywhere else in this file — reusing that same cap is
    // the safe, additive choice instead of adding new damage-pipeline
    // plumbing across every hit-resolution call site.
    skills: {
      a: {
        key: "bulwark_shield", name: "Bulwark Shield", icon: "🛡️",
        trigger: "round_start",
        desc: "On round start, chance to grant a Construct-tagged ally a shield absorbing nearly all of its next hit.",
        procBase: 0.20, procMax: 0.50,
        effect: { type: "tag_full_shield_ally", tag: "construct", value: 0.85 },
      },
    },
  },

  // ── SANDRUNNER ───────────────────────────────────────────────────────────
  {
    key: "dune_raider",
    label: "Dune Raider",
    race: "Sandrunner",
    size: "small",
    tier: 1, // T2
    dmgType: "physical",
    role: "melee",
    tags: ["raider"],
    region: "south",
    desc: "A desert raider who strikes from dust-storms and vanishes before the counter lands.",
    stats: { dmgLo: 22, dmgHi: 27, def: 16, hp: 40, siege: 11, spd: 100 },
    skills: {
      a: {
        key: "sandstorm_strike", name: "Sandstorm Strike", icon: "🏜️",
        trigger: "on_hit",
        desc: "On hit, chance to deal an extra 85% instance of damage.",
        procBase: 0.20, procMax: 0.60,
        effect: { type: "bonus_damage", value: 0.85 },
      },
    },
  },
  {
    key: "scavenger_chief",
    label: "Scavenger Chief",
    race: "Sandrunner",
    size: "medium",
    tier: 2, // T3
    dmgType: "physical",
    role: "melee",
    tags: ["raider", "pack"],
    region: "south",
    desc: "A hardened warband leader who keeps their raiders alive by picking the battlefield clean.",
    stats: { dmgLo: 34, dmgHi: 40, def: 26, hp: 85, siege: 16, spd: 85 },
    // Tag synergy — on landing a hit, requires another Raider-tagged ally
    // present; heals for a % of the damage just dealt. Reuses the existing
    // `rs.lifesteal` pipeline (already consumed at commander-attack
    // resolution) gated on an eligible Raider ally being present, instead of
    // adding a new per-unit heal target (see "tag_heal_ally_on_hit").
    skills: {
      a: {
        key: "scavengers_cut", name: "Scavenger's Cut", icon: "🦴",
        trigger: "on_hit",
        desc: "On hit, chance to heal a Raider-tagged ally for 30% of the damage just dealt.",
        procBase: 0.25, procMax: 0.60,
        effect: { type: "tag_heal_ally_on_hit", tag: "raider", value: 0.30 },
      },
    },
  },

  // ── RENEGADES (one per existing faction) ────────────────────────────────
  {
    key: "pirate_deserter",
    label: "Pirate Deserter",
    race: "Renegade",
    faction: "pirates",
    size: "small",
    tier: 1, // T2
    dmgType: "physical",
    role: "melee",
    tags: ["renegade"],
    region: "south",
    desc: "A pirate who jumped ship on their own crew — still handy with a blade, twice as untrustworthy.",
    stats: { dmgLo: 24, dmgHi: 29, def: 18, hp: 44, siege: 11, spd: 75 },
    skills: {
      a: {
        key: "cutthroats_due", name: "Cutthroat's Due", icon: "🗡️",
        trigger: "on_hit",
        desc: "On hit, chance to heal for 50% of damage dealt.",
        procBase: 0.20, procMax: 0.60,
        effect: { type: "lifesteal", value: 0.50 },
      },
    },
  },
  {
    key: "rogue_battlemage",
    label: "Rogue Battlemage",
    race: "Renegade",
    faction: "wizards",
    size: "small",
    tier: 2, // T3
    dmgType: "magical",
    role: "ranged",
    tags: ["renegade"],
    region: "mid",
    desc: "Expelled from the Ethereal Vault for casting what the order forbade — and still casting it.",
    stats: { dmgLo: 24, dmgHi: 30, def: 26, hp: 50, siege: 18, spd: 75 },
    skills: {
      a: {
        key: "forbidden_surge", name: "Forbidden Surge", icon: "🔮",
        trigger: "on_hit",
        desc: "On hit, chance to deal an extra 100% instance of focus damage.",
        procBase: 0.20, procMax: 0.60,
        effect: { type: "bonus_damage", value: 1.00, dmgType: "focus" },
      },
    },
  },
  {
    key: "warband_outcast",
    label: "Warband Outcast",
    race: "Renegade",
    faction: "orcs",
    size: "medium",
    tier: 1, // T2
    dmgType: "physical",
    role: "melee",
    tags: ["renegade"],
    region: "mid",
    desc: "Cast out of their warband for a broken oath, now fighting for whoever pays.",
    stats: { dmgLo: 28, dmgHi: 34, def: 38, hp: 78, siege: 17, spd: 60 },
    skills: {
      a: {
        key: "outcasts_grit", name: "Outcast's Grit", icon: "🛡️",
        trigger: "on_hit_received",
        desc: "On hit received, chance to reduce damage taken by 20% for 1 round.",
        procBase: 0.25, procMax: 0.65,
        effect: { type: "dmg_reduce", value: 0.20, duration: 1 },
      },
    },
  },
  {
    key: "wyrm_poacher",
    label: "Wyrm Poacher",
    race: "Renegade",
    faction: "dragons",
    size: "small",
    tier: 2, // T3
    dmgType: "physical",
    role: "ranged",
    tags: ["renegade"],
    region: "south",
    desc: "Knows exactly where a dragon's scales run thin — and has made a grim trade of it.",
    stats: { dmgLo: 26, dmgHi: 33, def: 24, hp: 46, siege: 25, spd: 78 },
    skills: {
      a: {
        key: "weak_scale", name: "Weak Scale", icon: "🏹",
        trigger: "on_hit",
        desc: "On hit, chance to apply 35% DEF down to target for 1 round.",
        procBase: 0.20, procMax: 0.55,
        effect: { type: "def_down", value: 0.35, duration: 1 },
      },
    },
  },
  {
    key: "fallen_paladin",
    label: "Fallen Paladin",
    race: "Renegade",
    faction: "holyknights",
    size: "medium",
    tier: 2, // T3
    dmgType: "physical",
    role: "melee",
    tags: ["renegade"],
    region: "mid",
    desc: "Stripped of rank by the Sanctum, but the oath-magic in their blade never noticed.",
    stats: { dmgLo: 27, dmgHi: 34, def: 65, hp: 115, siege: 24, spd: 70 },
    skills: {
      a: {
        key: "corrupted_vow", name: "Corrupted Vow", icon: "⚔️",
        trigger: "on_hit",
        desc: "On hit, chance to heal for 40% of damage dealt.",
        procBase: 0.20, procMax: 0.55,
        effect: { type: "lifesteal", value: 0.40 },
      },
    },
  },
  {
    key: "feral_bloodfang",
    label: "Feral Bloodfang",
    race: "Renegade",
    faction: "nightcreatures",
    size: "small",
    tier: 1, // T2
    dmgType: "physical",
    role: "melee",
    tags: ["renegade"],
    region: "north",
    desc: "Cast out of the Shadowfen for losing themselves to the beast too often — now they don't fight it.",
    stats: { dmgLo: 26, dmgHi: 32, def: 20, hp: 48, siege: 13, spd: 78 },
    skills: {
      a: {
        key: "feral_frenzy", name: "Feral Frenzy", icon: "🩸",
        trigger: "on_hit",
        desc: "On hit, chance to attack twice in one round.",
        procBase: 0.25, procMax: 0.65,
        effect: { type: "double_attack" },
      },
    },
  },
  {
    key: "frost_exile",
    label: "Frost Exile",
    race: "Renegade",
    faction: "coldborns",
    size: "medium",
    tier: 1, // T2
    dmgType: "physical",
    role: "melee",
    tags: ["renegade"],
    region: "north",
    desc: "Banished from the Frosthold for a crime the clan won't name — the cold never bothered them anyway.",
    stats: { dmgLo: 27, dmgHi: 33, def: 35, hp: 80, siege: 14, spd: 65 },
    skills: {
      a: {
        key: "exiles_resolve", name: "Exile's Resolve", icon: "🧊",
        trigger: "on_hit_received",
        desc: "On hit received, chance to increase damage dealt by 5% per hit, max 20%.",
        procBase: 0.30, procMax: 0.70,
        effect: { type: "atk_stack", valuePerStack: 0.05, maxStacks: 4 },
      },
    },
  },
  {
    key: "grave_robber",
    label: "Grave Robber",
    race: "Renegade",
    faction: "ashen_dead",
    size: "small",
    tier: 2, // T3
    dmgType: "physical",
    role: "melee",
    tags: ["renegade"],
    region: "south",
    desc: "Picks the Necropolis's own dead clean, and knows every gap in ancient armor because of it.",
    stats: { dmgLo: 24, dmgHi: 30, def: 30, hp: 48, siege: 16, spd: 55 },
    skills: {
      a: {
        key: "grave_looters_blade", name: "Grave Looter's Blade", icon: "💀",
        trigger: "on_hit",
        desc: "Attacks ignore 15% of the target's DEF.",
        procBase: 0.15, procMax: 0.15,
        effect: { type: "ignore_def_pct", value: 0.15 },
      },
    },
  },
];

export const NEUTRAL_TROOP_KEYS = NEUTRAL_TROOPS.map(u => u.key);

const _BY_KEY = new Map(NEUTRAL_TROOPS.map(u => [u.key, u]));

// ── Resolve a neutral unit by key ─────────────────────────────────────────
// Mirrors `resolveTroopBranch` from troops.js: returns the full unit record
// (there is no separate "branch vs tier" split since each neutral unit is
// already a single fixed stat block).
export function resolveNeutralUnit(key) {
  return _BY_KEY.get(key) ?? null;
}

// ── Get skills for a neutral unit ─────────────────────────────────────────
// Mirrors `getTierSkills` from troops.js. Every unit today only populates
// `skills.a` (see file header note on why the T1/T2/T3 skill-count
// convention was simplified for this roster), but this reads whichever of
// `a`/`b` are actually present so a future unit CAN use both without any
// caller needing to change.
export function getNeutralTierSkills(key) {
  const unit = resolveNeutralUnit(key);
  if (!unit) return [];
  return ["a", "b"].map(k => unit.skills?.[k]).filter(Boolean);
}

// ── Neutral unit portrait path helper (mirrors troopPortraitPath) ────────
// Convention: /troops/neutral_{key}_portrait.webp — no art exists yet for
// any neutral unit; this just fixes the expected path ahead of time.
export function neutralPortraitPath(key) {
  if (!key) return null;
  return `/troops/neutral_${key}_portrait.webp`;
}
