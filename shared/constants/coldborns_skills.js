/* ─────────────────────────────────────────────────────────────────────────────
   coldborns_skills.js — Coldborns Faction Skills
   72 total: 12 unique skills per commander, no reskins
   6 commanders × 12 skills each

   Commanders:
     Bjorn Icevein       (h49, attacker,   champion, Bloodaxe)
     Valdris the Unmoved (h50, attacker,   soldier,  Jarl)
     Leif Frostweave     (h51, support,    soldier,  Skald)
     Eira Coldmantle     (h52, support,    veteran,  Völva)
     Halvard Grimtide    (h53, strategist, champion, High Jarl)
     Knut Ironmarch      (h54, leader,     veteran,  Thane)

   New debuff — Frostbite: DMG dealt -40% for 2 rounds.
───────────────────────────────────────────────────────────────────────────── */

// ── BJORN ICEVEIN (attacker, champion, Bloodaxe) ──────────────────────────────
// ATK:170, FOC:0, SPD:58 — berserker champion. Frostbite stacker, AoE
// physical, rage-stacking, late-game ATK snowball.

export const BJORN_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (2CD → rounds 3,6,9) ───────────────────────────────────
  bjorn_iceveins_strike: {
    name: "Icevein's Strike", icon: "🪓", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h49",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy] 30% Physical DMG (ATK mod) + 50% chance Frostbite. (Rounds 3,6,9)",
    effect: { type: "physical_damage_frostbite_chance", frostbiteChance: 0.50, modifiedBy: "atk" },
    base: 0.30, perLevel: 0.30,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `${Math.round((0.30+lvl*0.30)*100)}% Physical DMG + 50% Frostbite${lvl>=14?" | Max: ATK +15":""} — rounds 3,6,9`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  bjorn_frozen_prey: {
    name: "Frozen Prey", icon: "🎯", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h49",
    type: "passive",
    desc: "[CMD] DMG +3% vs Frostbitten enemies. (Passive)",
    effect: { type: "cmd_dmg_bonus_vs_frostbitten", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `CMD DMG +${Math.round((0.03+lvl*0.03)*100)}% vs Frostbitten enemies (permanent)`,
  },

  bjorn_nordic_charge: {
    name: "Nordic Charge", icon: "⚡", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h49",
    type: "passive",
    desc: "[CMD] Attacking: DMG +1.5% | Defending: DMG -1.0%. (Passive)",
    effect: { type: "attacking_defending_split", attackDmgUp: 0.015, defendDmgDown: 0.01 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `Attacking: DMG +${((0.015+lvl*0.015)*100).toFixed(1)}% | Defending: DMG -${((0.01+lvl*0.01)*100).toFixed(1)}% (permanent)`,
  },

  // ── R0 BOTTOM — Main (firesOnRounds: [2,5,8]) ─────────────────────────────
  bjorn_blood_on_ice: {
    name: "Blood on Ice", icon: "🩸", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h49",
    type: "active", cooldown: 99, offset: 2, duration: 1,
    desc: "[All Enemies] 10% Physical DMG (ATK mod) + 25% chance Frostbite each. (Rounds 2,5,8)",
    effect: { type: "aoe_physical_frostbite_chance", frostbiteChance: 0.25, modifiedBy: "atk" },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { armyHpBonus: 10 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.10+lvl*0.10)*100)}% Physical DMG + 25% Frostbite${lvl>=14?" | Max: Army HP +10":""} — rounds 2,5,8`,
    firesOnRounds: [2, 5, 8],
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  bjorn_cold_fury: {
    name: "Cold Fury", icon: "🔥", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h49",
    type: "passive",
    desc: "[CMD] ATK +2.0 each round any enemy has Frostbite active. (Passive)",
    effect: { type: "cmd_atk_per_round_frostbite_active", value: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `CMD ATK +${2.0+lvl*2.0} per round Frostbite is active (permanent)`,
  },

  // 3CD → rounds 4,8
  bjorn_shatter: {
    name: "Shatter", icon: "💥", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h49",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[1 Frostbitten Enemy] 60% Physical DMG (ATK mod) + remove Frostbite + DEF -5 (2 rnd). (Rounds 4,8)",
    effect: { type: "physical_shatter_frostbite", defDown: 5.0, defDownDuration: 2, modifiedBy: "atk" },
    base: 0.60, perLevel: 0.60,
    nextDesc: (lvl) => `[Frostbitten target] ${Math.round((0.60+lvl*0.60)*100)}% Physical DMG + remove Frostbite + DEF -5 (2 rnd) — rounds 4,8`,
  },

  // ── R3 — Main (3CD → rounds 4,8) ─────────────────────────────────────────
  bjorn_howling_blizzard: {
    name: "Howling Blizzard", icon: "🌨️", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h49",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Enemies] 8% Physical DMG × 4 hits. +5 ATK per unique unit hit. (Rounds 4,8)",
    effect: { type: "multi_hit_random_atk_stack", hits: 4, dmgPct: 0.08, atkPerUniqueHit: 5, modifiedBy: "atk" },
    base: 0.08, perLevel: 0.08,
    maxLevelEffect: { frostbittenSkillDmgTakenUp: 0.10 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.08+lvl*0.08)*100)}% × 4 hits + ATK +5 per unique unit hit${lvl>=14?" | Max: Frostbitten enemies +10% skill DMG":""} — rounds 4,8`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  bjorn_raiders_will: {
    name: "Raider's Will", icon: "🛡️", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h49",
    type: "passive",
    desc: "[CMD] After normal attack: 30% chance Stun Immunity next round. (Passive)",
    effect: { type: "per_round_confusion_immune_chance", chance: 0.30 },
    base: 0.30, perLevel: 0.10,
    nextDesc: (lvl) => `After normal attack: ${Math.min(100,Math.round((0.30+lvl*0.10)*100))}% Stun Immunity next round (permanent)`,
  },

  // 2CD → rounds 3,6,9
  bjorn_frost_cleave: {
    name: "Frost Cleave", icon: "❄️", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h49",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] 10% Physical DMG (ATK mod) + 25% chance Frostbite each. (Rounds 3,6,9)",
    effect: { type: "aoe_physical_frostbite_chance", frostbiteChance: 0.25, modifiedBy: "atk" },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `All enemies ${Math.round((0.10+lvl*0.10)*100)}% Physical DMG + 25% Frostbite — rounds 3,6,9`,
  },

  // ── R5 — Main (every round, permanent stacking) ───────────────────────────
  bjorn_berserkers_rush: {
    name: "Berserker's Rush", icon: "😤", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h49",
    type: "passive",
    desc: "[CMD] Each round: ATK +3.0 permanently | SPD -2.0 permanently. Stacks every round. (Passive) Max Level: Enemy Units DEF -10.",
    effect: { type: "per_round_atk_stack_spd_lose", atkPerRound: 3.0, spdLostPerRound: 2.0 },
    base: 3.0, perLevel: 3.0,
    maxLevelEffect: { enemyDefDown: 10 },
    nextDesc: (lvl) => `Each round: ATK +${3.0+lvl*3.0} (permanent) | SPD -${2.0+lvl*2.0} (permanent)${lvl>=14?" | Max: Enemy Units DEF -10":""} (stacks)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  bjorn_northern_resolve: {
    name: "Northern Resolve", icon: "🏔️", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h49",
    type: "passive",
    desc: "[CMD] Each round: 14% chance to gain Stun Immunity. (Passive)",
    effect: { type: "per_round_confusion_immune_chance", chance: 0.14 },
    base: 0.14, perLevel: 0.14,
    nextDesc: (lvl) => `Each round: ${Math.min(100,Math.round((0.14+lvl*0.14)*100))}% Stun Immunity (permanent)`,
  },

  bjorn_war_scars: {
    name: "War Scars", icon: "⚔️", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h49",
    type: "passive",
    desc: "[CMD] Each time Allied Troops receive damage: CMD ATK +1.0% that round (max 5 stacks). (Passive)",
    effect: { type: "cmd_atk_stack_on_troop_hit", valuePerStack: 0.01, maxStacks: 5 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `On troop damage: CMD ATK +${((0.01+lvl*0.01)*100).toFixed(1)}% that round (max 5 stacks) (permanent)`,
  },
};

export const BJORN_RESKIN_SKILLS = {};

// ── VALDRIS THE UNMOVED (attacker, soldier, Jarl) ─────────────────────────────
// ATK:140, FOC:0, SPD:65 — stoic soldier attacker. Frostbite+Slow combos,
// permanent DEF shredding, immovable army defender.

export const VALDRIS_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (2CD → rounds 3,6,9) ───────────────────────────────────
  valdris_the_wall: {
    name: "The Wall", icon: "🧱", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h50",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemies] 25% Physical DMG (ATK mod). Frostbitten targets: also Slowed (-25% SPD, 2 rnd). (Rounds 3,6,9)",
    effect: { type: "physical_damage_frostbitten_slow", targets: 2, slowValue: 25, slowDuration: 2, modifiedBy: "atk" },
    base: 0.25, perLevel: 0.25,
    maxLevelEffect: { atkBonus: 10 },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.25+lvl*0.25)*100)}% Physical DMG | Frostbitten targets Slowed -25% SPD (2 rnd)${lvl>=14?" | Max: ATK +10":""} — rounds 3,6,9`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  valdris_cold_blood: {
    name: "Cold Blood", icon: "🩸", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h50",
    type: "passive",
    desc: "[CMD & Army] DMG +2.0% vs Human alignment. (Passive)",
    effect: { type: "dmg_bonus_vs_alignment", alignment: "humans", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `CMD & Army DMG +${Math.round((0.02+lvl*0.02)*100)}% vs Human units (permanent)`,
  },

  valdris_frostbitten_foes: {
    name: "Frostbitten Foes", icon: "🎯", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h50",
    type: "passive",
    desc: "[CMD & Army] DMG +1.5% vs Frostbitten enemies. (Passive)",
    effect: { type: "cmd_dmg_bonus_vs_frostbitten", value: 0.015 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `CMD & Army DMG +${((0.015+lvl*0.015)*100).toFixed(1)}% vs Frostbitten enemies (permanent)`,
  },

  // ── R0 BOTTOM — Main (2CD → rounds 3,6,9) ────────────────────────────────
  valdris_shield_splitter: {
    name: "Shield Splitter", icon: "⚔️", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h50",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy] 40% Physical DMG (ATK mod) + target DEF -3.0 permanently. (Rounds 3,6,9)",
    effect: { type: "physical_damage_perm_def_down", defDown: 3.0, modifiedBy: "atk" },
    base: 0.40, perLevel: 0.40,
    maxLevelEffect: { applyFrostbite: true, frostbiteDuration: 1 },
    nextDesc: (lvl) => `${Math.round((0.40+lvl*0.40)*100)}% Physical DMG + DEF -3 permanently${lvl>=14?" | Max: Apply Frostbite (1 rnd)":""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  valdris_siege_of_the_north: {
    name: "Siege of the North", icon: "🏰", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h50",
    type: "passive",
    desc: "[Army] Siege +2. (Passive)",
    effect: { type: "army_siege_bonus", value: 2 },
    base: 2, perLevel: 2,
    nextDesc: (lvl) => `Army Siege +${2+lvl*2} (permanent)`,
  },

  valdris_dead_weight: {
    name: "Dead Weight", icon: "⬇️", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h50",
    type: "passive",
    desc: "[Frostbitten Enemy Units] DEF -2.0. (Passive)",
    effect: { type: "enemy_status_def_down", status: "frostbite", defDown: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `Frostbitten enemies: DEF -${2.0+lvl*2.0} (permanent)`,
  },

  // ── R3 — Main (2CD → rounds 3,6,9) ───────────────────────────────────────
  valdris_glacial_strike: {
    name: "Glacial Strike", icon: "🧊", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h50",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy] 35% Physical DMG (ATK mod) + guaranteed Frostbite. (Rounds 3,6,9)",
    effect: { type: "physical_damage_frostbite_chance", frostbiteChance: 1.00, modifiedBy: "atk" },
    base: 0.35, perLevel: 0.35,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `${Math.round((0.35+lvl*0.35)*100)}% Physical DMG + guaranteed Frostbite${lvl>=14?" | Max: ATK +15":""} — rounds 3,6,9`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  valdris_valdris_stands: {
    name: "Valdris Stands", icon: "🏔️", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h50",
    type: "passive",
    desc: "[CMD] Each round: 10% chance Stun Immunity. (Passive)",
    effect: { type: "per_round_confusion_immune_chance", chance: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `Each round: ${Math.min(100,Math.round((0.10+lvl*0.10)*100))}% Stun Immunity (permanent)`,
  },

  valdris_shieldwall: {
    name: "Shieldwall", icon: "🛡️", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h50",
    type: "passive",
    desc: "[Allied Units] DMG Received from Creature units -1.5%. (Passive)",
    effect: { type: "dmg_resist_vs_alignment", alignment: "creatures", value: 0.015 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `Allied Units DMG Received from Creature units -${((0.015+lvl*0.015)*100).toFixed(1)}% (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  valdris_frozen_throne: {
    name: "Frozen Throne", icon: "👑", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h50",
    type: "passive",
    desc: "[While no allied units have been killed] CMD DMG +3% + Stun Immune. Once a unit dies the buff is lost permanently. (Passive)",
    effect: { type: "no_unit_lost_dmg_stun_immune", dmgBonus: 0.03 },
    base: 0.03, perLevel: 0.03,
    maxLevelEffect: { armyDmgReceiveDown: 0.05 },
    nextDesc: (lvl) => `[No losses] CMD DMG +${Math.round((0.03+lvl*0.03)*100)}% + Stun Immune${lvl>=14?" | Max: Army DMG Received -5%":""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  valdris_permafrost: {
    name: "Permafrost", icon: "🧊", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h50",
    type: "passive",
    desc: "[Frostbitten Enemies] SPD -5 additional penalty. (Passive)",
    effect: { type: "frostbitten_enemy_spd_down", value: 5 },
    base: 5, perLevel: 5,
    nextDesc: (lvl) => `Frostbitten enemies: SPD -${5+lvl*5} additional (permanent)`,
  },

  // 3CD → rounds 4,8
  valdris_winters_edge: {
    name: "Winter's Edge", icon: "❄️", tree: "combat", cls: "attacker",
    faction: "coldborns", commander: "h50",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[2 Enemy Units] 20% Physical DMG (ATK mod) + 30% chance Frostbite. (Rounds 4,8)",
    effect: { type: "physical_damage_frostbite_chance", targets: 2, frostbiteChance: 0.30, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG + 30% Frostbite — rounds 4,8`,
  },
};

export const VALDRIS_RESKIN_SKILLS = {};

// ── LEIF FROSTWEAVE (support, soldier, Skald) ─────────────────────────────────
// ATK:25, FOC:160, SPD:60 — buffer/FOC support. Extra attacks, Frostbite
// spreading, FOC damage sides, army buff uptime.

export const LEIF_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  leif_frost_chant: {
    name: "Frost Chant", icon: "🎵", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h51",
    type: "passive",
    desc: "[Allied Units] Rounds 1-3: DMG +4% + 10% chance extra attack each round. (Passive) Max Level: Coldborn Units DMG +2-3.",
    effect: { type: "early_round_dmg_followup_chance", dmgUp: 0.04, followupChance: 0.10, maxRound: 3 },
    base: 0.04, perLevel: 0.04,
    maxLevelEffect: { coldborncDmgRangeMin: 2, coldborncDmgRangeMax: 3 },
    nextDesc: (lvl) => `Rounds 1-3: DMG +${Math.round((0.04+lvl*0.04)*100)}% + ${Math.min(100,Math.round((0.10+lvl*0.05)*100))}% follow-up${lvl>=14?" | Max: Coldborn DMG +2-3":""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  leif_winters_song: {
    name: "Winter's Song", icon: "🎶", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h51",
    type: "passive",
    desc: "[Allied Units] Recover 5% HP each round. (Passive)",
    effect: { type: "passive_heal_per_round", healPct: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Allied Units recover ${Math.round((0.05+lvl*0.05)*100)}% HP/round (permanent)`,
  },

  leif_frostbite_carol: {
    name: "Frostbite Carol", icon: "🎤", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h51",
    type: "passive",
    desc: "[All Enemies] Each round: 6% chance Frostbite. (Passive)",
    effect: { type: "per_round_frostbite_aoe_chance", chance: 0.06 },
    base: 0.06, perLevel: 0.06,
    nextDesc: (lvl) => `Each round: ${Math.min(100,Math.round((0.06+lvl*0.06)*100))}% chance Frostbite all enemies (permanent)`,
  },

  // ── R0 BOTTOM — Main (2CD → rounds 3,6,9) ────────────────────────────────
  leif_skalds_curse: {
    name: "Skald's Curse", icon: "🔮", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h51",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] DMG Received +2% + 20% chance Frostbite each. (Rounds 3,6,9)",
    effect: { type: "vs_all_dmg_up_frostbite_chance", dmgTakenUp: 0.02, frostbiteChance: 0.20 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { frostbitenSpdDown: 10 },
    nextDesc: (lvl) => `All enemies DMG Rec +${Math.round((0.02+lvl*0.02)*100)}% + 20% Frostbite${lvl>=14?" | Max: Frostbitten enemies SPD -10":""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides (2CD → rounds 3,6,9) ───────────────────────────────
  leif_skalds_arrow: {
    name: "Skald's Arrow", icon: "🏹", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h51",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy, Ranged priority] 25% FOC DMG (FOC mod) + 35% chance Frostbite. (Rounds 3,6,9)",
    effect: { type: "focus_damage_single", target: "prioritiseRanged", frostbiteChance: 0.35, modifiedBy: "foc" },
    base: 0.25, perLevel: 0.25,
    nextDesc: (lvl) => `[Ranged priority] ${Math.round((0.25+lvl*0.25)*100)}% FOC DMG + 35% Frostbite — rounds 3,6,9`,
  },

  leif_song_of_courage: {
    name: "Song of Courage", icon: "🎺", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h51",
    type: "passive",
    desc: "[Allied Units] Rounds 1-2: Extra attack chance 6%. (Passive)",
    effect: { type: "early_round_followup_chance", chance: 0.06, maxRound: 2 },
    base: 0.06, perLevel: 0.06,
    nextDesc: (lvl) => `Rounds 1-2: ${Math.min(100,Math.round((0.06+lvl*0.06)*100))}% extra attack chance (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  leif_frost_fury: {
    name: "Frost Fury", icon: "❄️", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h51",
    type: "passive",
    desc: "[Allied Units] Each round Frostbite is active on any enemy: DMG +1.5% (max 5 stacks). (Passive) Max Level: CMD FOC +10.",
    effect: { type: "frostbite_active_army_dmg_stack", valuePerStack: 0.015, maxStacks: 5 },
    base: 0.015, perLevel: 0.015,
    maxLevelEffect: { cmdFocBonus: 10 },
    nextDesc: (lvl) => `Per Frostbite round: Army DMG +${((0.015+lvl*0.015)*100).toFixed(1)}% (max 5 stacks)${lvl>=14?" | Max: CMD FOC +10":""} (permanent)`,
  },

  // ── R3 — Sides (2CD → rounds 3,6,9) ──────────────────────────────────────
  leif_ice_lance: {
    name: "Ice Lance", icon: "🧊", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h51",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy] 30% FOC DMG (FOC mod). (Rounds 3,6,9)",
    effect: { type: "focus_damage_single", modifiedBy: "foc" },
    base: 0.30, perLevel: 0.30,
    nextDesc: (lvl) => `${Math.round((0.30+lvl*0.30)*100)}% FOC DMG (FOC mod) — rounds 3,6,9`,
  },

  // 2CD → rounds 3,6,9
  leif_skalds_remedy: {
    name: "Skald's Remedy", icon: "💚", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h51",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Allied Units] Recover 8% HP. (Rounds 3,6,9)",
    effect: { type: "heal_all", healPct: 0.08 },
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `All allies recover ${Math.round((0.08+lvl*0.08)*100)}% HP — rounds 3,6,9`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  leif_war_drums: {
    name: "War Drums", icon: "🥁", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h51",
    type: "passive",
    desc: "[Allied Units] Extra attack chance 2% each round. (Passive) Max Level: CMD normal attacks deal additional 40% FOC DMG.",
    effect: { type: "army_followup_per_round", chance: 0.02 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { cmdNormalAtkFocBonus: 0.40 },
    nextDesc: (lvl) => `Each round: ${Math.min(100,Math.round((0.02+lvl*0.02)*100))}% extra attack chance${lvl>=14?" | Max: CMD normal attacks +40% FOC DMG":""} (permanent)`,
  },

  // ── R5 — Sides (3CD → rounds 4,8) ────────────────────────────────────────
  leif_frozen_verse: {
    name: "Frozen Verse", icon: "📜", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h51",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[2 Enemy Units] 15% FOC DMG (FOC mod) + 25% chance Frostbite each. (Rounds 4,8)",
    effect: { type: "focus_damage_frostbite_chance", targets: 2, frostbiteChance: 0.25, modifiedBy: "foc" },
    base: 0.15, perLevel: 0.15,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.15+lvl*0.15)*100)}% FOC DMG + 25% Frostbite — rounds 4,8`,
  },

  leif_bitter_cold: {
    name: "Bitter Cold", icon: "🥶", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h51",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[2 Enemy Units] 20% FOC DMG (FOC mod) + guaranteed Frostbite. (Rounds 4,8)",
    effect: { type: "focus_damage_frostbite_chance", targets: 2, frostbiteChance: 1.00, modifiedBy: "foc" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% FOC DMG + guaranteed Frostbite — rounds 4,8`,
  },
};

export const LEIF_RESKIN_SKILLS = {};

// ── EIRA COLDMANTLE (support, veteran, Völva) ─────────────────────────────────
// ATK:30, FOC:185, SPD:62 — veteran healer/buffer. Army buffs, heals,
// follow-up attacks, Frostbite spreading, FOC damage side.

export const EIRA_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (2CD → rounds 3,6,9) ───────────────────────────────────
  eira_ancient_rite: {
    name: "Ancient Rite", icon: "🌿", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h52",
    type: "active", cooldown: 2, offset: 3, duration: 2,
    desc: "[All Allied Units] Recover 8% HP + Army DMG +1% for 2 rounds. (Rounds 3,6,9)",
    effect: { type: "heal_all_army_dmg_up", healPct: 0.08, dmgUp: 0.01, dmgDuration: 2 },
    base: 0.08, perLevel: 0.08,
    maxLevelEffect: { cmdFocBonus: 10 },
    nextDesc: (lvl) => `All allies ${Math.round((0.08+lvl*0.08)*100)}% HP + DMG +${Math.round((0.01+lvl*0.01)*100)}% (2 rnd)${lvl>=14?" | Max: FOC +10":""} — rounds 3,6,9`,
  },

  // ── R0 TOP — Sides (2CD → rounds 3,6,9) ──────────────────────────────────
  eira_frost_salve: {
    name: "Frost Salve", icon: "💚", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h52",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Allied Units] Recover 6% HP. (Rounds 3,6,9)",
    effect: { type: "heal_all", healPct: 0.06 },
    base: 0.06, perLevel: 0.06,
    nextDesc: (lvl) => `All allies recover ${Math.round((0.06+lvl*0.06)*100)}% HP — rounds 3,6,9`,
  },

  eira_cold_mending: {
    name: "Cold Mending", icon: "❄️", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h52",
    type: "passive",
    desc: "[Allied Units] Recover 3% HP each round. (Passive)",
    effect: { type: "passive_heal_per_round", healPct: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `Allied Units recover ${Math.round((0.03+lvl*0.03)*100)}% HP/round (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  eira_seers_vision: {
    name: "Seer's Vision", icon: "👁️", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h52",
    type: "passive",
    desc: "[Allied Units] Rounds 1-3: DMG +2% + Stun Immune. (Passive) Max Level: Allied Units Burn Immune rounds 1-3.",
    effect: { type: "early_round_dmg_stun_immune", dmgUp: 0.02, maxRound: 3 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { earlyRoundBurnImmune: true, maxRound: 3 },
    nextDesc: (lvl) => `Rounds 1-3: DMG +${Math.round((0.02+lvl*0.02)*100)}% + Stun Immune${lvl>=14?" | Max: Burn Immune rounds 1-3":""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  eira_volvas_sight: {
    name: "Völva's Sight", icon: "🔮", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h52",
    type: "passive",
    desc: "[Allied Units] 6% chance to gain a follow-up attack each round. (Passive)",
    effect: { type: "army_followup_per_round", chance: 0.06 },
    base: 0.06, perLevel: 0.06,
    nextDesc: (lvl) => `Each round: ${Math.min(100,Math.round((0.06+lvl*0.06)*100))}% follow-up attack chance (permanent)`,
  },

  eira_frost_ward: {
    name: "Frost Ward", icon: "🛡️", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h52",
    type: "passive",
    desc: "[Allied Units] Physical DMG Received -1.0%. (Passive)",
    effect: { type: "branch_phys_dmg_reduce", branch: "all", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `Allied Units Physical DMG Received -${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },

  // ── R3 — Main (2CD → rounds 3,6,9) ───────────────────────────────────────
  eira_volvas_wrath: {
    name: "Völva's Wrath", icon: "⚡", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h52",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] 10% FOC DMG (FOC mod) + 35% chance Frostbite. (Rounds 3,6,9)",
    effect: { type: "aoe_focus_frostbite_chance", frostbiteChance: 0.35, modifiedBy: "foc" },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { cmdFocBonus: 10 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.10+lvl*0.10)*100)}% FOC DMG + 35% Frostbite${lvl>=14?" | Max: FOC +10":""} — rounds 3,6,9`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  eira_volvas_shield: {
    name: "Völva's Shield", icon: "🛡️", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h52",
    type: "passive",
    desc: "[Allied Coldborn Units] DMG Received -1.5%. (Passive)",
    effect: { type: "dmg_resist_vs_alignment", alignment: "all_coldborn", value: 0.015 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `[Coldborn Units] DMG Received -${((0.015+lvl*0.015)*100).toFixed(1)}% (permanent)`,
  },

  // firesOnRounds: [2,6,10]
  eira_winters_warmth: {
    name: "Winter's Warmth", icon: "🌡️", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h52",
    type: "active", cooldown: 99, offset: 2, duration: 1,
    desc: "[All Allied Units] Heal 10% HP + cleanse 1 debuff each. (Rounds 2,6,10)",
    effect: { type: "heal_all_cleanse", healPct: 0.10, cleanse: 1 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `All allies ${Math.round((0.10+lvl*0.10)*100)}% HP + cleanse 1 debuff — rounds 2,6,10`,
    firesOnRounds: [2, 6, 10],
  },

  // ── R5 — Main (2CD → rounds 3,6,9) ───────────────────────────────────────
  eira_volvas_blessing: {
    name: "Völva's Blessing", icon: "✨", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h52",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Allied Units] Recover 12% HP + 40% chance cleanse 1 debuff each. (Rounds 3,6,9)",
    effect: { type: "heal_all_cleanse_chance", healPct: 0.12, cleanseChance: 0.40 },
    base: 0.12, perLevel: 0.12,
    maxLevelEffect: { allyHealingReceivedUp: 0.15 },
    nextDesc: (lvl) => `All allies ${Math.round((0.12+lvl*0.12)*100)}% HP + 40% cleanse${lvl>=14?" | Max: Allied Healing Received +15%":""} — rounds 3,6,9`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  eira_seers_mark: {
    name: "Seer's Mark", icon: "🎯", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h52",
    type: "passive",
    desc: "[Enemy Units] DMG Received +2.0%. (Passive)",
    effect: { type: "vs_all_dmg_up", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `Enemy Units DMG Received +${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  // 2CD → rounds 3,6,9
  eira_cold_snap_strike: {
    name: "Cold Snap Strike", icon: "🧊", tree: "tactics", cls: "support",
    faction: "coldborns", commander: "h52",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy] 20% FOC DMG (FOC mod) + 40% chance Frostbite. (Rounds 3,6,9)",
    effect: { type: "focus_damage_frostbite_chance", frostbiteChance: 0.40, modifiedBy: "foc" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((0.20+lvl*0.20)*100)}% FOC DMG + 40% Frostbite — rounds 3,6,9`,
  },
};

export const EIRA_RESKIN_SKILLS = {};

// ── HALVARD GRIMTIDE (strategist, champion, High Jarl) ────────────────────────
// ATK:130, FOC:120, SPD:70 — hybrid strategist. Buff stripping, FOC+Physical
// combo damage, Frostbite through all skills.

export const HALVARD_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (3CD → rounds 4,8) ─────────────────────────────────────
  halvard_blizzard_command: {
    name: "Blizzard Command", icon: "🌨️", tree: "tactics", cls: "strategist",
    faction: "coldborns", commander: "h53",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Enemies] Strip all positive buffs + 20% chance Frostbite each. (Rounds 4,8)",
    effect: { type: "aoe_enemy_buff_strip_frostbite", frostbiteChance: 0.20 },
    base: 0.015, perLevel: 0.015,
    maxLevelEffect: { strippedEnemyDefDown: 10 },
    nextDesc: (lvl) => `All enemies: strip all buffs + ${Math.round((0.015+lvl*0.015)*100*10)/10}% Frostbite${lvl>=14?" | Max: Stripped enemies DEF -10":""} — rounds 4,8`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  halvard_frost_mastery: {
    name: "Frost Mastery", icon: "❄️", tree: "tactics", cls: "strategist",
    faction: "coldborns", commander: "h53",
    type: "passive",
    desc: "[CMD] FOC +2.0. (Passive)",
    effect: { type: "cmd_foc_passive", value: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `CMD FOC +${2.0+lvl*2.0} (permanent)`,
  },

  halvard_cold_logic: {
    name: "Cold Logic", icon: "🧠", tree: "tactics", cls: "strategist",
    faction: "coldborns", commander: "h53",
    type: "passive",
    desc: "[Frostbitten Enemies] FOC DMG Received +5%. (Passive)",
    effect: { type: "frostbitten_enemy_foc_dmg_taken_up", value: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Frostbitten enemies: FOC DMG Received +${Math.round((0.05+lvl*0.05)*100)}% (permanent)`,
  },

  // ── R0 BOTTOM — Main (2CD → rounds 3,6,9) ────────────────────────────────
  halvard_frost_tactics: {
    name: "Frost Tactics", icon: "🗺️", tree: "tactics", cls: "strategist",
    faction: "coldborns", commander: "h53",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 20% FOC DMG (FOC mod) + 40% chance Frostbite. (Rounds 3,6,9)",
    effect: { type: "focus_damage_frostbite_chance", targets: 2, frostbiteChance: 0.40, modifiedBy: "foc" },
    base: 0.20, perLevel: 0.20,
    maxLevelEffect: { cmdFocBonus: 15 },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% FOC DMG + 40% Frostbite${lvl>=14?" | Max: FOC +15":""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  halvard_ice_wall: {
    name: "Ice Wall", icon: "🧱", tree: "tactics", cls: "strategist",
    faction: "coldborns", commander: "h53",
    type: "passive",
    desc: "[Allied Units] DMG Received from Creature units -1.5%. (Passive)",
    effect: { type: "dmg_resist_vs_alignment", alignment: "creatures", value: 0.015 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `Allied Units DMG Received from Creatures -${((0.015+lvl*0.015)*100).toFixed(1)}% (permanent)`,
  },

  halvard_shattered_defenses: {
    name: "Shattered Defenses", icon: "💥", tree: "tactics", cls: "strategist",
    faction: "coldborns", commander: "h53",
    type: "passive",
    desc: "[Enemy Units] Each time Frostbite is applied: DEF -1.0 for 2 rounds. (Passive)",
    effect: { type: "frostbite_applied_def_down", defDown: 1.0, duration: 2 },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `Each Frostbite applied: enemy DEF -${1.0+lvl*1.0} (2 rnd) (permanent)`,
  },

  // ── R3 — Main (3CD → rounds 4,8) ─────────────────────────────────────────
  halvard_winter_storm: {
    name: "Winter Storm", icon: "🌪️", tree: "tactics", cls: "strategist",
    faction: "coldborns", commander: "h53",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Enemies] 8% FOC DMG × 3 hits + 25% chance Frostbite per hit. (Rounds 4,8)",
    effect: { type: "aoe_focus_multi_hit_frostbite", hits: 3, frostbiteChancePerHit: 0.25, modifiedBy: "foc" },
    base: 0.08, perLevel: 0.08,
    maxLevelEffect: { cmdFocBonus: 15 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.08+lvl*0.08)*100)}% FOC DMG × 3 hits + 25% Frostbite/hit${lvl>=14?" | Max: FOC +15":""} — rounds 4,8`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  halvard_calculated_cruelty: {
    name: "Calculated Cruelty", icon: "🎯", tree: "tactics", cls: "strategist",
    faction: "coldborns", commander: "h53",
    type: "passive",
    desc: "[CMD & Army] DMG +1.5% vs Frostbitten enemies. (Passive)",
    effect: { type: "cmd_dmg_bonus_vs_frostbitten", value: 0.015 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `CMD & Army DMG +${((0.015+lvl*0.015)*100).toFixed(1)}% vs Frostbitten enemies (permanent)`,
  },

  halvard_grimtides_mark: {
    name: "Grimtide's Mark", icon: "☠️", tree: "tactics", cls: "strategist",
    faction: "coldborns", commander: "h53",
    type: "passive",
    desc: "[After CMD attacks] Target DMG Received +1.5% (FOC mod) for 2 rounds. 2 stacks. (Passive)",
    effect: { type: "post_attack_vulnerability", value: 0.015, duration: 2, maxStacks: 2, modifiedBy: "foc" },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `After CMD attack: target DMG Rec +${((0.015+lvl*0.015)*100).toFixed(1)}% (2 rnd, 2 stacks) (permanent)`,
  },

  // ── R5 — Main (2CD → rounds 3,6,9) ───────────────────────────────────────
  halvard_frost_and_fire: {
    name: "Frost and Fire", icon: "🔥", tree: "tactics", cls: "strategist",
    faction: "coldborns", commander: "h53",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 15% FOC DMG + 15% Burn DMG + 50% chance Frostbite or Burn each. (Rounds 3,6,9)",
    effect: { type: "focus_burn_dual_frostbite_burn_chance", targets: 2, frostbiteOrBurnChance: 0.50, modifiedBy: "foc" },
    base: 0.15, perLevel: 0.15,
    maxLevelEffect: { earlyRoundConfusionImmune: true, maxRound: 3 },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.15+lvl*0.15)*100)}% FOC DMG + 15% Burn DMG + 50% Frostbite or Burn${lvl>=14?" | Max: CMD Confusion Immune rounds 1-3":""} — rounds 3,6,9`,
  },

  // ── R5 — Sides (2CD → rounds 3,6,9) ──────────────────────────────────────
  halvard_tide_of_ice: {
    name: "Tide of Ice", icon: "🌊", tree: "tactics", cls: "strategist",
    faction: "coldborns", commander: "h53",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] 6% chance Frostbite each. (Rounds 3,6,9)",
    effect: { type: "per_round_frostbite_aoe_chance", chance: 0.06 },
    base: 0.06, perLevel: 0.06,
    nextDesc: (lvl) => `All enemies: ${Math.min(100,Math.round((0.06+lvl*0.06)*100))}% Frostbite — rounds 3,6,9`,
  },

  halvard_cold_calculation: {
    name: "Cold Calculation", icon: "🧮", tree: "tactics", cls: "strategist",
    faction: "coldborns", commander: "h53",
    type: "passive",
    desc: "[CMD] FOC +1.0 | SPD +1.0. (Passive)",
    effect: { type: "cmd_foc_spd_passive", focValue: 1.0, spdValue: 1.0 },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `CMD FOC +${1.0+lvl*1.0} | SPD +${1.0+lvl*1.0} (permanent)`,
  },
};

export const HALVARD_RESKIN_SKILLS = {};

// ── KNUT IRONMARCH (leader, veteran, Thane) ───────────────────────────────────
// ATK:80, FOC:0, SPD:62 — world-map veteran leader. Tile specialist,
// siege, keep-breaker, army buffer, Frostbite spreader.

export const KNUT_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  knut_northern_conquest: {
    name: "Northern Conquest", icon: "🗺️", tree: "command", cls: "leader",
    faction: "coldborns", commander: "h54",
    type: "passive",
    desc: "[CMD & Army] DMG +1.5% when attacking unowned tiles. (Passive) Max Level: Coldborn Units HP +10.",
    effect: { type: "neutral_tile_dmg_bonus", value: 0.015 },
    base: 0.015, perLevel: 0.015,
    maxLevelEffect: { coldborncHpBonus: 10 },
    nextDesc: (lvl) => `Unowned tile: DMG +${((0.015+lvl*0.015)*100).toFixed(1)}%${lvl>=14?" | Max: Coldborn Units HP +10":""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  knut_thanes_honor: {
    name: "Thane's Honor", icon: "🎖️", tree: "command", cls: "leader",
    faction: "coldborns", commander: "h54",
    type: "passive",
    desc: "[Allied Coldborn Units] DMG +1.0%. (Passive)",
    effect: { type: "branch_dmg_bonus", branch: "coldborns", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `[Coldborn Units] DMG +${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },

  knut_iron_discipline: {
    name: "Iron Discipline", icon: "🪖", tree: "command", cls: "leader",
    faction: "coldborns", commander: "h54",
    type: "passive",
    desc: "[Allied Units] DEF +3. (Passive)",
    effect: { type: "branch_flat_def_bonus", branch: "all", value: 3 },
    base: 3, perLevel: 3,
    nextDesc: (lvl) => `Allied Units DEF +${3+lvl*3} (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  knut_thanes_charge: {
    name: "Thane's Charge", icon: "⚡", tree: "command", cls: "leader",
    faction: "coldborns", commander: "h54",
    type: "passive",
    desc: "[Allied Units] Rounds 1-2: Extra attack chance 6%. (Passive) Max Level: All allies 50% chance evade next instance of damage.",
    effect: { type: "early_round_followup_chance", chance: 0.06, maxRound: 2 },
    base: 0.06, perLevel: 0.06,
    maxLevelEffect: { oncePerBattleEvasionChance: 0.50 },
    nextDesc: (lvl) => `Rounds 1-2: ${Math.min(100,Math.round((0.06+lvl*0.06)*100))}% extra attack chance${lvl>=14?" | Max: 50% evade next hit":""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  knut_frost_hardened: {
    name: "Frost Hardened", icon: "🛡️", tree: "command", cls: "leader",
    faction: "coldborns", commander: "h54",
    type: "passive",
    desc: "[Allied Coldborn Units] Physical DMG Received -1.5%. (Passive)",
    effect: { type: "branch_phys_dmg_reduce", branch: "coldborns", value: 0.015 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `[Coldborn Units] Physical DMG Rec -${((0.015+lvl*0.015)*100).toFixed(1)}% (permanent)`,
  },

  knut_bears_endurance: {
    name: "Bear's Endurance", icon: "🐻", tree: "command", cls: "leader",
    faction: "coldborns", commander: "h54",
    type: "passive",
    desc: "[Allied Bear Rider Units] HP +8. (Passive)",
    effect: { type: "branch_flat_hp_bonus", branch: "bear_riders", value: 8 },
    base: 8, perLevel: 8,
    nextDesc: (lvl) => `[Bear Riders] HP +${8+lvl*8} (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  knut_ironmarchs_roar: {
    name: "Ironmarch's Roar", icon: "📣", tree: "command", cls: "leader",
    faction: "coldborns", commander: "h54",
    type: "passive",
    desc: "[Allied Units] Rounds 1-2: DMG +3% | [Enemies] Rounds 1-2: DEF -2. (Passive) Max Level: Army March Speed +10%.",
    effect: { type: "early_round_dmg_up_enemy_def_down", dmgUp: 0.03, enemyDefDown: 2.0, maxRound: 2 },
    base: 0.03, perLevel: 0.03,
    maxLevelEffect: { marchSpeedBonus: 0.10 },
    nextDesc: (lvl) => `Rounds 1-2: Allied DMG +${Math.round((0.03+lvl*0.03)*100)}% | Enemy DEF -${2+lvl*2}${lvl>=14?" | Max: March Speed +10%":""} (permanent)`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  knut_coldborn_brotherhood: {
    name: "Coldborn Brotherhood", icon: "🤝", tree: "command", cls: "leader",
    faction: "coldborns", commander: "h54",
    type: "passive",
    desc: "[Allied Coldborn Units] DMG Received from Creature units -2.0%. (Passive)",
    effect: { type: "faction_dmg_resist_vs_alignment", faction: "coldborns", alignment: "creatures", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `[Coldborn Units] DMG Rec from Creatures -${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  knut_winters_frost: {
    name: "Winter's Frost", icon: "❄️", tree: "command", cls: "leader",
    faction: "coldborns", commander: "h54",
    type: "passive",
    desc: "[2 Enemy Units] Each round: 7% chance Frostbite. (Passive)",
    effect: { type: "per_round_frostbite_multi_chance", targets: 2, chance: 0.07 },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `Each round: ${Math.min(100,Math.round((0.07+lvl*0.07)*100))}% Frostbite on 2 enemies (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  knut_rally_the_clan: {
    name: "Rally the Clan", icon: "🚩", tree: "command", cls: "leader",
    faction: "coldborns", commander: "h54",
    type: "passive",
    desc: "[Allied Units] Rounds 1-2: DMG +4% + DEF +4%. (Passive) Max Level: Army Confusion Immune rounds 1-2.",
    effect: { type: "early_round_dmg_def_up", dmgUp: 0.04, defUp: 0.04, maxRound: 2 },
    base: 0.04, perLevel: 0.04,
    maxLevelEffect: { earlyRoundConfusionImmune: true, maxRound: 2 },
    nextDesc: (lvl) => `Rounds 1-2: DMG +${Math.round((0.04+lvl*0.04)*100)}% + DEF +${Math.round((0.04+lvl*0.04)*100)}%${lvl>=14?" | Max: Confusion Immune rounds 1-2":""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  knut_northern_fury: {
    name: "Northern Fury", icon: "🔥", tree: "command", cls: "leader",
    faction: "coldborns", commander: "h54",
    type: "passive",
    desc: "[CMD & Army] DMG +2% vs Human alignment. (Passive)",
    effect: { type: "dmg_bonus_vs_alignment", alignment: "humans", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `CMD & Army DMG +${Math.round((0.02+lvl*0.02)*100)}% vs Human units (permanent)`,
  },

  knut_the_long_winter: {
    name: "The Long Winter", icon: "🌨️", tree: "command", cls: "leader",
    faction: "coldborns", commander: "h54",
    type: "passive",
    desc: "[Frostbitten Enemies] SPD -8. (Passive)",
    effect: { type: "frostbitten_enemy_spd_down", value: 8 },
    base: 8, perLevel: 8,
    nextDesc: (lvl) => `Frostbitten enemies: SPD -${8+lvl*8} (permanent)`,
  },
};

export const KNUT_RESKIN_SKILLS = {};

// ── Merged export ─────────────────────────────────────────────────────────────

export const COLDBORNS_SKILLS = {
  ...BJORN_UNIQUE_SKILLS,   ...BJORN_RESKIN_SKILLS,
  ...VALDRIS_UNIQUE_SKILLS, ...VALDRIS_RESKIN_SKILLS,
  ...LEIF_UNIQUE_SKILLS,    ...LEIF_RESKIN_SKILLS,
  ...EIRA_UNIQUE_SKILLS,    ...EIRA_RESKIN_SKILLS,
  ...HALVARD_UNIQUE_SKILLS, ...HALVARD_RESKIN_SKILLS,
  ...KNUT_UNIQUE_SKILLS,    ...KNUT_RESKIN_SKILLS,
};

// ── Branch layout ─────────────────────────────────────────────────────────────

export const COLDBORNS_BRANCH_SKILL_MAP = {
  // Bjorn Icevein (attacker, champion, Bloodaxe)
  h49: [
    { main: "bjorn_iceveins_strike",   sides: ["bjorn_frozen_prey",      "bjorn_nordic_charge"]     }, // R0 top
    { main: "bjorn_blood_on_ice",      sides: ["bjorn_cold_fury",        "bjorn_shatter"]           }, // R0 bot
    { main: "bjorn_howling_blizzard",  sides: ["bjorn_raiders_will",     "bjorn_frost_cleave"]      }, // R3
    { main: "bjorn_berserkers_rush",   sides: ["bjorn_northern_resolve", "bjorn_war_scars"]         }, // R5
  ],
  // Valdris the Unmoved (attacker, soldier, Jarl)
  h50: [
    { main: "valdris_the_wall",         sides: ["valdris_cold_blood",        "valdris_frostbitten_foes"]  }, // R0 top
    { main: "valdris_shield_splitter",  sides: ["valdris_siege_of_the_north","valdris_dead_weight"]       }, // R0 bot
    { main: "valdris_glacial_strike",   sides: ["valdris_valdris_stands",    "valdris_shieldwall"]        }, // R3
    { main: "valdris_frozen_throne",    sides: ["valdris_permafrost",        "valdris_winters_edge"]      }, // R5
  ],
  // Leif Frostweave (support, soldier, Skald)
  h51: [
    { main: "leif_frost_chant",   sides: ["leif_winters_song",   "leif_frostbite_carol"]  }, // R0 top
    { main: "leif_skalds_curse",  sides: ["leif_skalds_arrow",   "leif_song_of_courage"]  }, // R0 bot
    { main: "leif_frost_fury",    sides: ["leif_ice_lance",      "leif_skalds_remedy"]    }, // R3
    { main: "leif_war_drums",     sides: ["leif_frozen_verse",   "leif_bitter_cold"]      }, // R5
  ],
  // Eira Coldmantle (support, veteran, Völva)
  h52: [
    { main: "eira_ancient_rite",     sides: ["eira_frost_salve",     "eira_cold_mending"]      }, // R0 top
    { main: "eira_seers_vision",     sides: ["eira_volvas_sight",    "eira_frost_ward"]        }, // R0 bot
    { main: "eira_volvas_wrath",     sides: ["eira_volvas_shield",   "eira_winters_warmth"]    }, // R3
    { main: "eira_volvas_blessing",  sides: ["eira_seers_mark",      "eira_cold_snap_strike"]  }, // R5
  ],
  // Halvard Grimtide (strategist, champion, High Jarl)
  h53: [
    { main: "halvard_blizzard_command", sides: ["halvard_frost_mastery",       "halvard_cold_logic"]          }, // R0 top
    { main: "halvard_frost_tactics",    sides: ["halvard_ice_wall",            "halvard_shattered_defenses"]  }, // R0 bot
    { main: "halvard_winter_storm",     sides: ["halvard_calculated_cruelty",  "halvard_grimtides_mark"]      }, // R3
    { main: "halvard_frost_and_fire",   sides: ["halvard_tide_of_ice",         "halvard_cold_calculation"]    }, // R5
  ],
  // Knut Ironmarch (leader, veteran, Thane)
  h54: [
    { main: "knut_northern_conquest", sides: ["knut_thanes_honor",       "knut_iron_discipline"]      }, // R0 top
    { main: "knut_thanes_charge",     sides: ["knut_frost_hardened",     "knut_bears_endurance"]      }, // R0 bot
    { main: "knut_ironmarchs_roar",   sides: ["knut_coldborn_brotherhood","knut_winters_frost"]       }, // R3
    { main: "knut_rally_the_clan",    sides: ["knut_northern_fury",      "knut_the_long_winter"]      }, // R5
  ],
};
