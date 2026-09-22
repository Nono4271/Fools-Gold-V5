/* ─────────────────────────────────────────────────────────────────────────────
   orcs_skills.js — Orcs Faction Skills
   72 total: 60 reskins + 12 unique skills
   6 commanders × 12 skills each

   Commanders:
     Grimtusk       (h9,  attacker,   Marauder) — 10 reskins + 2 unique
     Ashgrip        (h10, balanced,   Marauder) — 10 reskins + 2 unique
     Warcroak       (h21, leader,     Raider)   — 10 reskins + 2 unique
     Shaman Grix    (h22, strategist, Raider)   — 10 reskins + 2 unique
     Warlord Korgath(h33, attacker,   Warlord)  — 10 reskins + 2 unique
     Ironhide Bruk  (h34, support,    Warlord)  — 10 reskins + 2 unique
───────────────────────────────────────────────────────────────────────────── */

// ── GRIMTUSK (attacker, Marauder) ─────────────────────────────────────────────
// ATK:155, FOC:0, SPD:72 — veteran marauder. Escalating damage, multi-status
// applicator, self-buff on attack, orc DEF stacker. Gets scarier as fight goes on.

export const GRIMTUSK_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  grim_grims_assault: {
    name: "Grim's Assault", icon: "⚔️", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[2 Enemy Units] 12% Physical Damage (ATK mod) | 30% chance: Commander DMG +10% for 2 rounds. (Rounds 4, 8)",
    effect: { type: "physical_damage_self_dmg_up", targets: 2, selfDmgUp: 0.10, selfDmgDuration: 2, procChance: 0.30, modifiedBy: "atk" },
    base: 0.12, perLevel: 0.12,
    maxLevelEffect: { procChance: 0.50 },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.12+lvl*0.12)*100)}% Physical DMG (ATK mod) + 30% chance CMD DMG +10% (2 rnd)${lvl >= 14 ? " | Max: 50% proc chance" : ""} — rounds 4,8`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  grim_easy_targets: {
    name: "Easy Targets", icon: "🎯", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit, prioritises Ranged] 15% Physical Damage (ATK mod) | If Ranged: 50% chance +100% bonus DMG. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_ranged_bonus", modifiedBy: "atk", rangedBonusChance: 0.50, rangedBonusDmg: 1.0 },
    base: 0.15, perLevel: 0.15,
    maxLevelEffect: { burnChanceOnRanged: 0.30 },
    nextDesc: (lvl) => `[Ranged priority] ${Math.round((0.15+lvl*0.15)*100)}% Physical DMG + 50% chance +100% vs Ranged${lvl >= 14 ? " | Max: 30% Burn on Ranged target" : ""} — rounds 3,6,9`,
  },

  grim_retaliation: {
    name: "Grim's Retaliation", icon: "😤", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "passive",
    desc: "[Commander] When inflicted with a debuff: Next skill damage +5%. Resets after use. (Passive)",
    effect: { type: "reactive_skill_dmg_on_debuff", bonus: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `When debuffed: next skill +${Math.round((0.05+lvl*0.05)*100)}% DMG (resets on use) (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  grim_i_charge: {
    name: "I Charge", icon: "💨", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "passive",
    desc: "[Commander] Attacking: DMG +1.5% | Defending: DMG -1.0%. (Passive)",
    effect: { type: "attacking_defending_split", attackDmgUp: 0.015, defendDmgDown: 0.01 },
    base: 0.015, perLevel: 0.015,
    maxLevelEffect: { firstSkillDmgBonus: 0.15 },
    nextDesc: (lvl) => `Attacking: CMD DMG +${((0.015+lvl*0.015)*100).toFixed(1)}% | Defending: CMD DMG -${((0.01+lvl*0.01)*100).toFixed(1)}%${lvl >= 14 ? " | Max: First skill +15% DMG" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  grim_cant_stop_me: {
    name: "Can't Stop Me", icon: "💪", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "passive",
    desc: "[Commander] 5% chance to cleanse a debuff when applied. (Passive)",
    effect: { type: "reactive_cleanse_chance", chance: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `When debuffed: ${Math.round((0.05+lvl*0.05)*100)}% chance to auto-cleanse (permanent)`,
  },

  grim_pirate_filth: {
    name: "Pirate Filth", icon: "☠️", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "passive",
    desc: "[Commander] +2% damage to Pirate units. (Passive)",
    effect: { type: "cmd_dmg_bonus_vs_faction", faction: "pirates", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `CMD DMG +${Math.round((0.02+lvl*0.02)*100)}% vs Pirates (permanent)`,
  },

  // ── R3 — Shared with Korgath (renamed) ───────────────────────────────────
  grim_grims_focus: {
    name: "Grim's Focus", icon: "📖", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "passive",
    desc: "[Commander] Skill Damage +2.0% in combat. (Passive)",
    effect: { type: "skill_dmg_bonus", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `All active skill damage +${Math.round((0.02+lvl*0.02)*100)}%${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  grim_grims_plans: {
    name: "Grim's Plans", icon: "🎯", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "passive",
    desc: "[After Commander attacks] [Target] DMG Received +1.5% (ATK mod) for 2 rounds. 2 independent stacks. (Passive)",
    effect: { type: "post_attack_vulnerability", value: 0.015, duration: 2, maxStacks: 2, modifiedBy: "atk" },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `Post-attack: target DMG Received +${((0.015+lvl*0.015)*100).toFixed(1)}% (ATK mod, 2 rnd, 2 stacks) (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  grim_master_of_none: {
    name: "Master of None", icon: "🌀", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Enemies] 20% Physical Damage (ATK mod) | 30% chance each: Burn, Poison DoT, Bleed. (Rounds 4, 8)",
    effect: { type: "aoe_multi_status", burnChance: 0.30, poisonChance: 0.30, bleedChance: 0.30, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    maxLevelEffect: { stunChance: 0.30 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG + 30% each: Burn/Poison/Bleed${lvl >= 14 ? " | Max: +30% Stun" : ""} — rounds 4,8`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // Round 6 only — single trigger
  grim_final_lunge: {
    name: "Final Lunge", icon: "🗡️", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 99, offset: 6, duration: 1,
    desc: "[Round 6] [Enemy Unit with lowest DEF] 100% Physical Damage (ATK mod). (Round 6 only)",
    effect: { type: "physical_damage_single", target: "lowestDef", modifiedBy: "atk" },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `[Lowest DEF unit] ${Math.round((1.0+lvl*1.0)*100)}% Physical DMG (ATK mod) — Round 6 only`,
  },

  grim_hold_the_line: {
    name: "Hold the Line", icon: "🪖", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "passive",
    desc: "[Allied Orc Units] Each time Grimtusk activates a skill: +0.5 DEF (max 15 stacks). (Passive)",
    effect: { type: "per_skill_army_def_stack", branch: "grunts", defPerStack: 0.5, maxStacks: 15 },
    base: 0.5, perLevel: 0.5,
    nextDesc: (lvl) => `[Orc Units] Per skill activation: +${(0.5+lvl*0.5).toFixed(1)} DEF (max 15 stacks/+${((0.5+lvl*0.5)*15).toFixed(1)} total) (permanent)`,
  },
};

export const GRIMTUSK_RESKIN_SKILLS = {};

// ── ASHGRIP (balanced, Marauder) ──────────────────────────────────────────────
// ATK:95, FOC:0, SPD:88 — warg specialist balanced commander. Pure warg synergy,
// reactive DMG stacking, anti-large, mounted fury. Fastest commander in the faction.

export const ASHGRIP_UNIQUE_SKILLS = {

  // ── R0 TOP — Shared with Fang Groth ───────────────────────────────────────
  // groth_mounted_specialist, groth_frontline_medic, groth_mounted_armor

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  ash_warg_rider: {
    name: "Warg Rider", icon: "🐺", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "[Warg Units] Each time damage is received: DMG +2-3 (max 4 stacks). (Passive)",
    effect: { type: "reactive_branch_dmg_range_stack", branch: "warg_riders", dmgMin: 2, dmgMax: 3, maxStacks: 4 },
    base: 2, perLevel: 0,
    nextDesc: (lvl) => `[Warg Units] On damage received: DMG +2-3 (max 4 stacks/+8-12 total) (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  ash_warg_master: {
    name: "Warg Master", icon: "🐾", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "[Warg Rider Units] Damage Dealt +2%. (Passive)",
    effect: { type: "branch_dmg_bonus", branch: "warg_riders", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `[Warg Units] DMG +${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  ash_me_and_my_dogs: {
    name: "Me and My Dogs", icon: "🐕", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "[If all units are Warg Riders] [Warg Units] All stats +1.0%. (Passive)",
    effect: { type: "all_branch_army_bonus", branch: "warg_riders", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `[All-Warg army] Warg Units: all stats +${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  ash_power_from_friends: {
    name: "Power from Friends", icon: "🤝", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "[If all units are Warg Riders] [Commander] ATK +1 | FOC +1 | SPD +1. (Passive)",
    effect: { type: "all_branch_cmd_stats", branch: "warg_riders", atkPerLevel: 1.0, focPerLevel: 1.0, spdPerLevel: 1.0 },
    base: 1.0, perLevel: 1.0,
    maxLevelEffect: { wargHpBonus: 10 },
    nextDesc: (lvl) => `[All-Warg army] CMD ATK/FOC/SPD +${1.0+lvl*1.0} each${lvl >= 14 ? " | Max: Warg Units HP +10" : ""} (permanent)`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  ash_planned_assault: {
    name: "Ash's Planned Assault", icon: "🎯", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units, prioritises Large] 40% Physical Damage. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_multi_prioritise", targets: 2, prioritise: "large" },
    base: 0.40, perLevel: 0.40,
    nextDesc: (lvl) => `[2 Units, Large first] ${Math.round((0.40+lvl*0.40)*100)}% Physical DMG — rounds 3,6,9`,
  },

  // groth_protect_troops referenced in branch map

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  ash_mounted_fury: {
    name: "Mounted Fury", icon: "💥", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "[Mounted Units] On hit: 6% chance to attack again for 40% additional Physical Damage. (Passive)",
    effect: { type: "mounted_on_hit_followup", chance: 0.06, followupDmg: 0.40 },
    base: 0.06, perLevel: 0.056,
    maxLevelEffect: { followupDefDownChance: 0.30, followupDefDown: 0.10 },
    nextDesc: (lvl) => `[Mounted] ${Math.round((0.06+lvl*0.056)*100)}% chance +40% follow-up on hit${lvl >= 14 ? " | Max: 30% chance DEF -10% on follow-up" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  ash_mounted_strike: {
    name: "Mounted Strike", icon: "🐴", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 20% Physical Damage | All-Mounted army: +30% | All-Warg army: +60% instead. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_mounted_composition", targets: 2, allMountedBonus: 0.30, allWargBonus: 0.60 },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => {
      const base = Math.round((0.20+lvl*0.20)*100);
      return `[2 Units] ${base}% | All-Mounted: ${base+30}% | All-Warg: ${base+60}% — rounds 3,6,9`;
    },
  },

  ash_giant_slayer: {
    name: "Giant Slayer", icon: "🗡️", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "[Army and Commander] +1% damage to Large units. (Passive)",
    effect: { type: "dmg_bonus_vs_size", size: "large", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `CMD and Army DMG +${Math.round((0.01+lvl*0.01)*100)}% vs Large units (permanent)`,
  },
};

export const ASHGRIP_RESKIN_SKILLS = {};

// ── WARCROAK (leader, Raider) ─────────────────────────────────────────────────
// ATK:82, FOC:35, SPD:65 — orc raid leader. March speed, dynamic command
// differential bonus, anti-pirate specialist. Strongest in developed accounts.

export const WARCROAK_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  war_lifeline_of_tribe: {
    name: "Lifeline of the Tribe", icon: "🐾", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "passive",
    desc: "[Army] March Speed +1.0%. (Non-Combat Passive)",
    effect: { type: "march_speed_bonus", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    maxLevelEffect: { werewolfCombatSpd: 10 },
    nextDesc: (lvl) => `March Speed +${Math.round((0.01+lvl*0.01)*100)}%${lvl >= 14 ? " | Max: Orc Units SPD +10 in combat" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  // groth_supply_specialist referenced in branch map

  war_fastest_in_tribe: {
    name: "Fastest in the Tribe", icon: "💨", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "passive",
    desc: "[Commander] SPD +1.0. (Passive)",
    effect: { type: "cmd_stat_bonus", spdPerLevel: 1.0 },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `[Commander] SPD +${1.0+lvl*1.0} (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  war_orcs_rise: {
    name: "Orcs Rise", icon: "⚔️", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "passive",
    desc: "[Orc Units] DMG +1% | Additional +1% if enemy army contains Pirates. (Passive)",
    effect: { type: "faction_dmg_bonus_conditional", value: 0.01, conditionalFaction: "pirates", conditionalBonus: 0.01 },
    base: 0.01, perLevel: 0.01,
    maxLevelEffect: { orcHpBonus: 10 },
    nextDesc: (lvl) => `[Orc Units] DMG +${Math.round((0.01+lvl*0.01)*100)}% | vs Pirates: +${Math.round((0.01+lvl*0.01)*100)}% extra${lvl >= 14 ? " | Max: Orc Units HP +10" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  war_caught_you_lacking: {
    name: "Caught You Lacking", icon: "😤", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 7% chance to Stun for 1 round. (Rounds 3, 6, 9)",
    effect: { type: "stun_chance", targets: 2, chance: 0.07 },
    base: 0.07, perLevel: 0.0643,
    nextDesc: (lvl) => `[2 Enemy Units] ${Math.round((0.07+lvl*0.0643)*100)}% chance to Stun (1 rnd) — rounds 3,6,9`,
  },

  war_leaders_plans: {
    name: "Leader's Plans", icon: "📋", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "passive",
    desc: "[Army] +1.0 DEF and +1.0 HP for every 1 more Command than the enemy (dynamic per round). (Passive)",
    effect: { type: "command_differential_bonus", defPerCommand: 1.0, hpPerCommand: 1.0 },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `Per Command advantage over enemy: Army DEF +${1.0+lvl*1.0} & HP +${1.0+lvl*1.0} (recalculated each round)`,
  },

  // ── R3 — Unique skills ────────────────────────────────────────────────────
  // 1CD → rounds 2, 4, 6, 8, 10
  war_experienced_fighter: {
    name: "Experienced Fighter", icon: "⚔️", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 1, offset: 2, duration: 1,
    desc: "[2 Enemy Units] 12% Physical Damage (modified by ATK). (Rounds 2, 4, 6, 8, 10)",
    effect: { type: "physical_damage_multi", targets: 2, modifiedBy: "atk" },
    base: 0.12, perLevel: 0.12,
    maxLevelEffect: { bonusDmg: 0.15, prioritise: "melee" },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.12+lvl*0.12)*100)}% Physical DMG (ATK mod)${lvl >= 14 ? " | Max: +15% bonus, prioritise Melee" : ""} — rounds 2,4,6,8,10`,
  },

  war_trust_your_leader: {
    name: "Trust Your Leader", icon: "🎖️", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "passive",
    desc: "[Orc Units] Damage Dealt +3%. (Passive)",
    effect: { type: "branch_dmg_bonus", branch: "grunts", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `[Orc Units] DMG +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // vay_see_you referenced in branch map

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  war_warcroaks_plans: {
    name: "Warcroak's Plans", icon: "📜", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "passive",
    desc: "[First 3 Rounds] [Allied Units] Damage Dealt +2.0%. (Passive)",
    effect: { type: "early_round_dmg_up", value: 0.02, maxRound: 3 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { stunImmunityWhileActive: true },
    nextDesc: (lvl) => `[Rounds 1-3] All allies DMG +${Math.round((0.02+lvl*0.02)*100)}%${lvl >= 14 ? " | Max: Stun Immune while active" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  war_friends_with_shaman: {
    name: "Friends with a Shaman", icon: "🧿", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit] Physical Damage | [1 Allied Unit] Recovers HP. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_and_heal", enemyDmg: 0.12, allyHeal: 0.13, modifiedBy: "atk" },
    base: 0.12, perLevel: 0.1214,
    nextDesc: (lvl) => {
      const dmg  = Math.round((0.12+lvl*0.1214)*100);
      const heal = Math.round((0.13+lvl*0.1114)*100);
      return `1 enemy ${dmg}% Physical DMG | 1 ally heals ${heal}% HP — rounds 3,6,9`;
    },
  },

  war_experienced_army_pirates: {
    name: "Experienced Army", icon: "🪖", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "passive",
    desc: "[Allied Units] Damage Received from Pirate Units -1.0%. (Passive)",
    effect: { type: "dmg_resist_vs_faction", faction: "pirates", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `All allies DMG Received from Pirates -${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },
};

export const WARCROAK_RESKIN_SKILLS = {};

// ── SHAMAN GRIX (strategist, Raider) ──────────────────────────────────────────
// ATK:28, FOC:165, SPD:52 — dark magic strategist. Poison, burn, chaos mechanics,
// dual DoT application, random effects. The orc faction's unpredictable witch doctor.

export const GRIX_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  // Round 2 + 4CD → rounds 2, 7
  gri_voodoo: {
    name: "Voodoo", icon: "🧿", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "[Round 2] [2 Enemy Units] Apply 2 Poison DoTs (3% each, 3 rounds) | Target DEF -10%. (Rounds 2, 7)",
    effect: { type: "dual_poison_dot_def_down", targets: 2, poisonDmg: 0.03, poisonDuration: 3, poisonStacks: 2, defDown: 0.10 },
    base: 0.03, perLevel: 0.0336,
    maxLevelEffect: { poisonedTakeMoreDmg: 0.05 },
    nextDesc: (lvl) => `[2 Units] 2× Poison DoT ${((0.03+lvl*0.0336)*100).toFixed(1)}%/rnd (3 rnd) + DEF -10%${lvl >= 14 ? " | Max: Poisoned units +5% DMG taken" : ""} — rounds 2,7`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  // Round 2 + 1CD → rounds 2, 4, 6, 8, 10
  gri_poison_specialist: {
    name: "Poison Specialist", icon: "☠️", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 1, offset: 2, duration: 1,
    desc: "[All Poisoned Enemy Units] 10% Focus Damage. (Rounds 2, 4, 6, 8, 10)",
    effect: { type: "focus_dmg_vs_poisoned", value: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `All poisoned enemies ${Math.round((0.10+lvl*0.10)*100)}% Focus DMG — rounds 2,4,6,8,10`,
  },

  gri_you_hurt_we_win: {
    name: "You Hurt, We Win", icon: "💚", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "passive",
    desc: "[Round 7] When enemies take Poison damage: All allies heal 20% HP. (Passive — Round 7 only)",
    effect: { type: "poison_tick_ally_heal", triggerRound: 7, healPct: 0.20 },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `Round 7: If enemies take poison DMG, all allies heal ${Math.round((0.20+lvl*0.20)*100)}% HP`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  gri_orc_healer: {
    name: "Orc Healer", icon: "🌿", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "passive",
    desc: "[After Commander deals damage] [2 Allied Units] 4% chance to heal 5% HP. (Passive)",
    effect: { type: "post_attack_proc_heal", targets: 2, chance: 0.04, healPct: 0.05 },
    base: 0.04, perLevel: 0.04,
    maxLevelEffect: { focusBonus: 15 },
    nextDesc: (lvl) => `Post-attack: ${Math.round((0.04+lvl*0.04)*100)}% chance to heal 2 allies for ${Math.round((0.05+lvl*0.05)*100)}% HP${lvl >= 14 ? " | Max: FOC +15" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  gri_shamans_defense: {
    name: "Shaman's Defense", icon: "🛡️", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Orc Units] 10% chance to evade the next instance of damage this round. (Rounds 3, 6, 9)",
    effect: { type: "branch_evasion_first_hit", branch: "grunts", chance: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `[Orc Units] ${Math.round((0.10+lvl*0.10)*100)}% chance to evade next hit — rounds 3,6,9`,
  },

  gri_shamans_assault: {
    name: "Shaman's Assault", icon: "⚡", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "passive",
    desc: "[All Allied Units] First 3 rounds: 8% chance to gain a follow-up attack. (Passive)",
    effect: { type: "ally_followup_chance_early", chance: 0.08, maxRound: 3 },
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `[Rounds 1-3] All allies ${Math.round((0.08+lvl*0.08)*100)}% chance for follow-up attack (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  gri_burn_baby_burn: {
    name: "Burn Baby Burn", icon: "🔥", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 17% Burn Damage (FOC mod) | 60% chance to inflict Burn (DMG dealt -20% for 1 round). (Rounds 3, 6, 9)",
    effect: { type: "burn_damage_apply", targets: 2, burnChance: 0.60, burnDmgPenalty: 0.20, modifiedBy: "foc" },
    base: 0.17, perLevel: 0.17,
    maxLevelEffect: { focusBonus: 15 },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.17+lvl*0.17)*100)}% Burn DMG (FOC mod) + 60% Burn (DMG -20% 1 rnd)${lvl >= 14 ? " | Max: FOC +15" : ""} — rounds 3,6,9`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  gri_sacrificial_healing: {
    name: "Sacrificial Healing", icon: "💊", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Allied Unit with highest DEF] Heal 20% HP | That unit's DMG -10% for 1 round. (Rounds 3, 6, 9)",
    effect: { type: "heal_highest_def_self_debuff", healPct: 0.20, dmgPenalty: 0.10, penaltyDuration: 1 },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[Highest DEF unit] Heal ${Math.round((0.20+lvl*0.20)*100)}% HP | DMG -10% (1 rnd) — rounds 3,6,9`,
  },

  gri_shaman_shenanigans: {
    name: "Shaman Shenanigans", icon: "🎲", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "passive",
    desc: "[Each Round] 8% chance to randomly apply: Army +10% DMG, Army +5% DMG Received, Army Confusion Immunity, or Army Confusion. (Passive)",
    effect: { type: "random_army_effect", chance: 0.08, effects: ["dmg_up","dmg_received_up","confusion_immune","confusion"] },
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `Each round: ${Math.round((0.08+lvl*0.08)*100)}% chance for random army effect (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  // Round 3 + 2CD → rounds 3, 6, 9
  gri_shamans_final_surprise: {
    name: "Shaman's Final Surprise", icon: "💀", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Round 3] [1 Enemy Unit] 20% Poison DMG + 20% Burn DMG | 40% chance Poison DoT | 40% chance Burn. (Rounds 3, 6, 9)",
    effect: { type: "dual_type_damage_apply", poisonDmg: 0.20, burnDmg: 0.20, poisonChance: 0.40, burnChance: 0.40 },
    base: 0.20, perLevel: 0.20,
    maxLevelEffect: { allyDefPerDebuff: 15, allyDefTargets: 2 },
    nextDesc: (lvl) => {
      const dmg = Math.round((0.20+lvl*0.20)*100);
      return `${dmg}% Poison DMG + ${dmg}% Burn DMG | 40% Poison DoT | 40% Burn${lvl >= 14 ? " | Max: 2 allies +15 DEF per enemy debuff" : ""} — rounds 3,6,9`;
    },
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  gri_orc_explosives: {
    name: "Orc Explosives", icon: "💣", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "passive",
    desc: "[Army] Siege +2. (Passive)",
    effect: { type: "army_siege_bonus", value: 2 },
    base: 2, perLevel: 2,
    nextDesc: (lvl) => `Army Siege +${2+lvl*2} (permanent)`,
  },

  gri_orc_march: {
    name: "Orc March", icon: "👣", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "passive",
    desc: "[Army] March Speed +2%. (Non-Combat Passive)",
    effect: { type: "march_speed_bonus", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `Army March Speed +${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },
};

export const GRIX_RESKIN_SKILLS = {};

// ── WARLORD KORGATH (attacker, Warlord) ───────────────────────────────────────
// ATK:185, FOC:0, SPD:62 — apex orc attacker. AoE physical damage, DEF shredding,
// stun chain, confusion immunity. The Warlord who ends battles before they start.

export const KORGATH_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  kor_korgaths_surprise: {
    name: "Korgath's Surprise", icon: "💀", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "passive",
    desc: "[Commander] Normal attacks deal 6% Physical Damage to ALL enemy units. (Passive)",
    effect: { type: "cmd_normal_atk_aoe_physical", value: 0.06 },
    base: 0.06, perLevel: 0.06,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `Normal attacks deal ${Math.round((0.06+lvl*0.06)*100)}% Physical DMG to ALL enemies${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  kor_warlords_fury: {
    name: "Warlord's Fury", icon: "🔥", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "passive",
    desc: "[Commander] Normal Attacks deal an additional 10% Physical Damage. (Passive)",
    effect: { type: "cmd_normal_atk_bonus", value: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `Normal Attacks +${Math.round((0.10+lvl*0.10)*100)}% extra Physical DMG (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  kor_never_ending_assault: {
    name: "Never Ending Assault", icon: "⚔️", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 20% Physical Damage (modified by ATK) | Apply Heal Block for 1 round. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_heal_block", targets: 2, healBlockDuration: 1, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG (ATK mod) + Heal Block 1 rnd — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  kor_warlords_intelligence: {
    name: "Warlord's Intelligence", icon: "📖", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "passive",
    desc: "[Commander] Skill Damage +2.0% in combat. (Passive)",
    effect: { type: "skill_dmg_bonus", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `All active skill damage +${Math.round((0.02+lvl*0.02)*100)}%${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  kor_warlords_touch: {
    name: "Warlord's Touch", icon: "🎯", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "passive",
    desc: "[After Commander attacks] [Target] DMG Received +1.5% (modified by ATK) for 2 rounds. Can stack 2 times independently. (Passive)",
    effect: { type: "post_attack_vulnerability", value: 0.015, duration: 2, maxStacks: 2, modifiedBy: "atk" },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `Post-attack: target DMG Received +${((0.015+lvl*0.015)*100).toFixed(1)}% (ATK mod, 2 rnd, 2 stacks) (permanent)`,
  },

  // 3CD → rounds 4, 8
  kor_brutal_strike: {
    name: "Brutal Strike", icon: "💥", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[1 Enemy Unit, prioritises Melee] 27% Physical Damage | 50% chance for additional 27% Physical Damage. (Rounds 4, 8)",
    effect: { type: "physical_damage_followup", target: "prioritiseMelee", initialDmg: 0.27, followupDmg: 0.27, followupChance: 0.50 },
    base: 0.27, perLevel: 0.2471,
    nextDesc: (lvl) => {
      const dmg = Math.round((0.27+lvl*0.2471)*100);
      return `[Melee priority] ${dmg}% + 50% chance ${dmg}% follow-up Physical DMG — rounds 4,8`;
    },
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  // Round 1 + 3CD → rounds 1, 4, 7, 10
  kor_korgath_brutality: {
    name: "Korgath's Brutality", icon: "🗡️", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "[Round 1] 5 hits on random targets — 8% Physical Damage (ATK mod) each | [On hit] Enemy DEF -10% (max 5 stacks). (Rounds 1, 4, 7, 10)",
    effect: { type: "multi_hit_random_def_down", hits: 5, dmgPct: 0.08, defDown: 0.10, maxDefStacks: 5, modifiedBy: "atk" },
    base: 0.08, perLevel: 0.008,
    maxLevelEffect: { confusionImmunityNextRound: true },
    nextDesc: (lvl) => `5 random hits × ${Math.round((0.08+lvl*0.008)*100)}% Physical DMG (ATK mod) + DEF -10%/hit (max 5×)${lvl >= 14 ? " | Max: Confusion Immunity next round" : ""} — rounds 1,4,7,10`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  kor_calculated_strike: {
    name: "Calculated Strike", icon: "🎲", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[1 Enemy Target] 100% Physical Damage | [Self] Next Damage Dealt -40%. (Rounds 4, 8)",
    effect: { type: "physical_damage_self_debuff", target: "single", selfDebuff: 0.40 },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `${Math.round((1.0+lvl*1.0)*100)}% Physical DMG | Self: Next DMG -40% — rounds 4,8`,
  },

  kor_human_scum: {
    name: "Human Scum", icon: "☠️", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "passive",
    desc: "[Human Enemy Units] Take 2% more Skill Damage. (Passive)",
    effect: { type: "skill_dmg_vs_faction", faction: "humans", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `Human units take +${Math.round((0.02+lvl*0.02)*100)}% more skill damage (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  kor_lead_the_charge: {
    name: "Lead the Charge", icon: "⚡", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "passive",
    desc: "[Commander] While Attacking: DMG +2.0% | [Army] While Attacking: DEF +2.0. (Passive)",
    effect: { type: "attacking_stance_bonus", cmdDmgUp: 0.02, armyDefUp: 2.0 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { atkBonus: 20 },
    nextDesc: (lvl) => `CMD DMG +${Math.round((0.02+lvl*0.02)*100)}% | Army DEF +${2.0+lvl*2.0} while attacking${lvl >= 14 ? " | Max: ATK +20" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  kor_killers_aura: {
    name: "Killer's Aura", icon: "👁️", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "passive",
    desc: "[On Skill Activation] 5% chance to Stun 1 enemy unit for 1 round. (Passive)",
    effect: { type: "on_skill_stun_chance", targets: 1, chance: 0.05, stunDuration: 1 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `On skill activation: ${Math.round((0.05+lvl*0.05)*100)}% chance to Stun 1 unit (1 rnd) (permanent)`,
  },

  kor_killers_eye: {
    name: "Killer's Eye", icon: "🎯", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "passive",
    desc: "[Stunned Enemy Units] Korgath's attacks deal +4% more damage. (Passive)",
    effect: { type: "cmd_dmg_bonus_vs_stunned", value: 0.04 },
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `Korgath's attacks deal +${Math.round((0.04+lvl*0.04)*100)}% DMG vs Stunned targets (permanent)`,
  },
};

export const KORGATH_RESKIN_SKILLS = {};

// ── IRONHIDE BRUK (support, Warlord) ──────────────────────────────────────────
// ATK:140, FOC:0, SPD:55 — ironhide fortress support. Multi-branch DEF buffs,
// bleed synergy, troll specialist, focus fire mechanic. Takes hits, converts to strength.

export const BRUK_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  bru_leader_of_tribe: {
    name: "Leader of the Tribe", icon: "🦴", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "passive",
    desc: "[Orc, Troll and Warg Units] DEF +2.0 | If Defending: additional DEF +1.0. (Passive)",
    effect: { type: "multi_branch_def_bonus", branches: ["grunts","trolls","warg_riders"], defBonus: 2.0, defendingBonus: 1.0 },
    base: 2.0, perLevel: 2.0,
    maxLevelEffect: { orcDmgRangeMin: 1, orcDmgRangeMax: 2 },
    nextDesc: (lvl) => `[Orc/Troll/Warg] DEF +${2.0+lvl*2.0} | Defending: +${1.0+lvl*1.0} extra${lvl >= 14 ? " | Max: Orc DMG range +1-2" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  bru_commander_protection: {
    name: "Commander's Protection", icon: "🛡️", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "passive",
    desc: "[Orc and Troll Units] Damage Received -2.0%. (Passive)",
    effect: { type: "multi_branch_dmg_reduce", branches: ["grunts","trolls"], value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `[Orc and Troll Units] DMG Received -${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  // 1CD → rounds 2, 4, 6, 8, 10
  bru_rub_dirt_on_it: {
    name: "Rub Dirt on It", icon: "🪨", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "active", cooldown: 1, offset: 2, duration: 1,
    desc: "[Troll Units] Heal 12% HP. (Rounds 2, 4, 6, 8, 10)",
    effect: { type: "heal_branch", branch: "trolls", healPct: 0.12 },
    base: 0.12, perLevel: 0.12,
    nextDesc: (lvl) => `[Troll Units] Heal ${Math.round((0.12+lvl*0.12)*100)}% HP — rounds 2,4,6,8,10`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  // Round 1 + 3CD → rounds 1, 4, 7, 10
  bru_laceration: {
    name: "Laceration", icon: "🩸", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "[Round 1] [2 Enemy Units, prioritises Ranged] 15% Physical Damage (ATK mod) | 80% chance to inflict Bleed (2 rounds). (Rounds 1, 4, 7, 10)",
    effect: { type: "physical_damage_bleed", targets: 2, prioritise: "ranged", bleedChance: 0.80, bleedDmg: 0.30, bleedDuration: 2, modifiedBy: "atk" },
    base: 0.15, perLevel: 0.15,
    maxLevelEffect: { bleedChance: 1.0 },
    nextDesc: (lvl) => `[2 Units, Ranged first] ${Math.round((0.15+lvl*0.15)*100)}% Physical DMG (ATK mod) + ${lvl >= 14 ? "100%" : "80%"} Bleed (2 rnd) — rounds 1,4,7,10`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  bru_capitalize: {
    name: "Capitalize!", icon: "💢", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "passive",
    desc: "[Orc and Warg Units] Deal +10% damage to enemies with Bleed. (Passive)",
    effect: { type: "dmg_bonus_vs_status", status: "bleed", branches: ["grunts","warg_riders"], value: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `[Orc and Warg Units] +${Math.round((0.10+lvl*0.10)*100)}% DMG vs bleeding targets (permanent)`,
  },

  bru_try_again_boys: {
    name: "Try Again Boys", icon: "🪓", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "passive",
    desc: "[Allied Orc Units] On hit: 7% chance to attack again for 30% additional Physical Damage. (Passive)",
    effect: { type: "branch_followup_chance", branch: "grunts", chance: 0.07, followupDmg: 0.30 },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `[Orc Units] ${Math.round((0.07+lvl*0.07)*100)}% chance for +30% follow-up attack on hit (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  // Round 2 + 2CD → rounds 2, 5, 8
  bru_coordinated_assault: {
    name: "Coordinated Assault", icon: "🎯", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "[Round 2] [1 Enemy Unit, prioritises Bleed targets] 20% Physical Damage | [Allied Units] Focus fire on target for 1 round. (Rounds 2, 5, 8)",
    effect: { type: "physical_damage_focus_fire", target: "prioritiseBleed", focusFireDuration: 1 },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[Bleed priority] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG + allies focus fire on target (1 rnd) — rounds 2,5,8`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  bru_troll_master: {
    name: "Troll Master", icon: "🪵", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "passive",
    desc: "[Troll Units] DEF +3% | SPD -90% permanently. (Passive)",
    effect: { type: "branch_def_spd_tradeoff", branch: "trolls", defBonus: 0.03, spdPenalty: 0.90 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `[Troll Units] DEF +${Math.round((0.03+lvl*0.03)*100)}% | SPD -90% (permanent)`,
  },

  bru_blood_magic: {
    name: "Blood Magic", icon: "🔮", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "passive",
    desc: "[All Allied Units] On hit vs bleeding target: Restore 5% HP. (Passive)",
    effect: { type: "on_hit_bleed_heal", healPct: 0.05, chance: 1.0 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `On hit vs bleeding target: attacker restores ${Math.round((0.05+lvl*0.05)*100)}% HP (guaranteed) (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  bru_mastermind: {
    name: "Mastermind", icon: "🧠", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "passive",
    desc: "[All Orcish Units] DMG Dealt +1.0% | DMG Received -0.5%. (Passive)",
    effect: { type: "faction_dual_stat_bonus", faction: "orcs", dmgUp: 0.01, dmgReceivedDown: 0.005 },
    base: 0.01, perLevel: 0.01,
    maxLevelEffect: { confusionImmuneEarlyRounds: 3 },
    nextDesc: (lvl) => `[All Orc Units] DMG +${Math.round((0.01+lvl*0.01)*100)}% | DMG Received -${((0.005+lvl*0.005)*100).toFixed(1)}%${lvl >= 14 ? " | Max: Confusion Immune rounds 1-3" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  bru_iron_dense: {
    name: "Iron Dense", icon: "⚙️", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "passive",
    desc: "[All Allied Troops] DEF +4. (Passive)",
    effect: { type: "flat_troop_def_bonus", value: 4 },
    base: 4, perLevel: 4,
    nextDesc: (lvl) => `All allied troops DEF +${4+lvl*4} (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  bru_ground_shake: {
    name: "Ground Shake", icon: "💥", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Enemy Commander] 9% chance to Stun for 1 round. (Rounds 3, 6, 9)",
    effect: { type: "cmd_stun_chance", target: "enemyCommander", chance: 0.09, stunDuration: 1 },
    base: 0.09, perLevel: 0.09,
    nextDesc: (lvl) => `[Enemy Commander] ${Math.round((0.09+lvl*0.09)*100)}% chance to Stun (1 rnd) — rounds 3,6,9`,
  },
};

export const BRUK_RESKIN_SKILLS = {};


// ── Shared skills from Groth (COTN) used by Ashgrip ──────────────────────────
// These are duplicated here to avoid cross-faction imports.
// Keep in sync with nightcreatures_skills.js groth_* definitions.
export const SHARED_GROTH_SKILLS = {
  groth_mounted_specialist: {
    name: "Mounted Specialist", icon: "🐺", tree: "command", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "[Mounted Units] Damage +0.6% upon inflicting damage (modified by SPD), up to 3 stacks. (Passive)",
    effect: { type: "mounted_atk_stack_spd", valuePerStack: 0.006, maxStacks: 3, modifiedBy: "spd" },
    base: 0.006, perLevel: 0.006,
    maxLevelEffect: { mountedHpBonus: 15 },
    nextDesc: (lvl) => `[Mounted] DMG +${((0.006+lvl*0.006)*100).toFixed(1)}% per stack (SPD mod, 3 stacks max)${lvl >= 14 ? " | Max: Mounted Units HP +15" : ""} (permanent)`,
  },
  groth_frontline_medic: {
    name: "Frontline Medic", icon: "🩹", tree: "command", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "active", cooldown: 99, offset: 3, duration: 1,
    desc: "[Mounted Units] Heals 50% HP. Triggers Round 3 only.",
    effect: { type: "heal_branch", branch: "mounted", healPct: 0.50 },
    base: 0.50, perLevel: 0.50,
    nextDesc: (lvl) => `[Mounted Units] Heal ${Math.round((0.50+lvl*0.50)*100)}% HP — Round 3 only`,
  },
  groth_mounted_armor: {
    name: "Mounted Armor", icon: "🛡️", tree: "command", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "[Mounted Units] Damage Received -2.5%. (Passive)",
    effect: { type: "branch_dmg_reduce", branch: "mounted", value: 0.025 },
    base: 0.025, perLevel: 0.025,
    nextDesc: (lvl) => `[Mounted Units] DMG Received -${((0.025+lvl*0.025)*100).toFixed(1)}% (permanent)`,
  },
  groth_protect_troops: {
    name: "Protect the Troops", icon: "🐗", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "[Mounted Units] 14% chance to gain Madness Immunity. (Passive)",
    effect: { type: "branch_madness_immunity_chance", branch: "mounted", chance: 0.14 },
    base: 0.14, perLevel: 0.14,
    nextDesc: (lvl) => `[Mounted Units] ${Math.round((0.14+lvl*0.14)*100)}% chance for Madness Immunity (permanent)`,
  },
  groth_supply_specialist: {
    name: "Supply Specialist", icon: "🎒", tree: "command", cls: "balanced",
    faction: "orcs", commander: "h21",
    type: "passive",
    desc: "[Gathering] +5.0% extra resources from gathering. (Non-Combat Passive)",
    effect: { type: "gathering_bonus", value: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Gathering Resources +${Math.round((0.05+lvl*0.05)*100)}% (permanent)`,
  },
  vay_see_you: {
    name: "See You!", icon: "🎯", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit, prioritises Ranged] 60% Physical Damage (modified by ATK). (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_single", target: "prioritiseRanged", modifiedBy: "atk" },
    base: 0.60, perLevel: 0.60,
    nextDesc: (lvl) => `[Ranged priority] ${Math.round((0.60+lvl*0.60)*100)}% Physical DMG (ATK mod) — rounds 3,6,9`,
  },
};

export const ORCS_SKILLS = {
  ...GRIMTUSK_UNIQUE_SKILLS,
  ...GRIMTUSK_RESKIN_SKILLS,
  ...ASHGRIP_UNIQUE_SKILLS,
  ...ASHGRIP_RESKIN_SKILLS,
  ...WARCROAK_UNIQUE_SKILLS,
  ...WARCROAK_RESKIN_SKILLS,
  ...GRIX_UNIQUE_SKILLS,
  ...GRIX_RESKIN_SKILLS,
  ...KORGATH_UNIQUE_SKILLS,
  ...KORGATH_RESKIN_SKILLS,
  ...BRUK_UNIQUE_SKILLS,
  ...BRUK_RESKIN_SKILLS,
  // Shared skills from other factions used by Ashgrip
  ...SHARED_GROTH_SKILLS,
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const ORCS_BRANCH_SKILL_MAP = {
  // Grimtusk (attacker, Marauder)
  // Savage obliterator — multi-hit unique branch 2, passive ATK+crit anchor
  h9: [
    { main: "grim_grims_assault",   sides: ["grim_easy_targets",    "grim_retaliation"]    }, // R0 top
    { main: "grim_i_charge",        sides: ["grim_cant_stop_me",    "grim_pirate_filth"]   }, // R0 bottom
    { main: "grim_grims_focus",     sides: ["grim_grims_plans",     "kor_brutal_strike"]   }, // R3 shared Brutal Strike
    { main: "grim_master_of_none",  sides: ["grim_final_lunge",     "grim_hold_the_line"]  }, // R5
  ],
  // Ashgrip (balanced, Marauder)
  // Survivor — tide unique branch 2 (ATK+dmgReduce), defensive passive anchor
  h10: [
    { main: "groth_mounted_specialist", sides: ["groth_frontline_medic",  "groth_mounted_armor"]   }, // R0 top shared with Groth
    { main: "ash_warg_rider",           sides: ["ash_warg_master",        "ash_me_and_my_dogs"]    }, // R0 bottom
    { main: "ash_power_from_friends",   sides: ["ash_planned_assault",    "groth_protect_troops"]  }, // R3
    { main: "ash_mounted_fury",         sides: ["ash_mounted_strike",     "ash_giant_slayer"]      }, // R5
  ],
  // Warcroak (leader, Raider)
  // Raid commander — surge+dmgReduce unique branch 2, garrison+ATK unique branch 3
  h21: [
    { main: "war_lifeline_of_tribe",     sides: ["groth_supply_specialist",   "war_fastest_in_tribe"]         }, // R0 top
    { main: "war_orcs_rise",             sides: ["war_caught_you_lacking",    "war_leaders_plans"]            }, // R0 bottom
    { main: "war_experienced_fighter",   sides: ["war_trust_your_leader",     "vay_see_you"]                  }, // R3
    { main: "war_warcroaks_plans",       sides: ["war_friends_with_shaman",   "war_experienced_army_pirates"] }, // R5
  ],
  // Shaman Grix (strategist, Raider)
  // Hex-heavy debuffer — dual-debuff unique branch 2, exposure+miss unique branch 3
  h22: [
    { main: "gri_voodoo",                sides: ["gri_poison_specialist",   "gri_you_hurt_we_win"]      }, // R0 top
    { main: "gri_orc_healer",            sides: ["gri_shamans_defense",     "gri_shamans_assault"]      }, // R0 bottom
    { main: "gri_burn_baby_burn",        sides: ["gri_sacrificial_healing", "gri_shaman_shenanigans"]   }, // R3
    { main: "gri_shamans_final_surprise",sides: ["gri_orc_explosives",      "gri_orc_march"]            }, // R5
  ],
  // Warlord Korgath (attacker, Warlord)
  // Maximum destruction — AoE cleave unique branch 2, passive ATK+crit anchor
  h33: [
    { main: "kor_korgaths_surprise",     sides: ["kor_warlords_fury",        "kor_never_ending_assault"]  }, // R0 top
    { main: "kor_warlords_intelligence", sides: ["kor_warlords_touch",       "kor_brutal_strike"]         }, // R0 bottom
    { main: "kor_korgath_brutality",     sides: ["kor_calculated_strike",    "kor_human_scum"]            }, // R3
    { main: "kor_lead_the_charge",       sides: ["kor_killers_aura",         "kor_killers_eye"]           }, // R5
  ],
  // Ironhide Bruk (support, Warlord)
  // Iron protector — wall+heal unique branch 2, passive protection anchor
  h34: [
    { main: "bru_leader_of_tribe",      sides: ["bru_commander_protection", "bru_rub_dirt_on_it"]     }, // R0 top
    { main: "bru_laceration",           sides: ["bru_capitalize",           "bru_try_again_boys"]     }, // R0 bottom
    { main: "bru_coordinated_assault",  sides: ["bru_troll_master",         "bru_blood_magic"]        }, // R3
    { main: "bru_mastermind",           sides: ["bru_iron_dense",           "bru_ground_shake"]       }, // R5
  ],
};
