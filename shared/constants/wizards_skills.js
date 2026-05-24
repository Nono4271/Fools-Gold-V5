/* ─────────────────────────────────────────────────────────────────────────────
   wizards_skills.js — Wizards Faction Skills
   72 total: 12 unique skills per commander, no reskins
   6 commanders × 12 skills each

   Commanders:
     Solarius Vex    (h5,  support,    Sage)       — 12 unique
     Mira Ashveil    (h6,  attacker,   Sage)       — 12 unique
     Runekeeper Dov  (h17, leader,     Apprentice) — 12 unique
     Hexblade Oren   (h18, balanced,   Apprentice) — 12 unique
     Archmage Theon  (h29, support,    Warlock)    — 12 unique
     Spellblade Ryn  (h30, strategist, Warlock)    — 12 unique
───────────────────────────────────────────────────────────────────────────── */

// ── ARCHMAGE THEON (support, Warlock) ─────────────────────────────────────────
// ATK:40, FOC:210, SPD:65 — extreme FOC caster. Threshold-based passive power
// scaling with FOC stat, heavy AoE debuffs, confusion/slow specialist.
// 12 unique skills, no reskins.

export const THEON_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  theon_battle_mage: {
    name: "Battle Mage", icon: "🔮", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h29",
    type: "passive",
    desc: "[Commander] FOC +2.0. (Passive) Max Level: CMD SPD +10.",
    effect: { type: "cmd_foc_passive", value: 2.0 },
    base: 2.0, perLevel: 2.0,
    maxLevelEffect: { cmdSpdBonus: 10 },
    nextDesc: (lvl) => `CMD FOC +${2.0+lvl*2.0}${lvl >= 14 ? " | Max: CMD SPD +10" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  theon_riddle_me_this: {
    name: "Riddle Me This", icon: "🌀", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h29",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] Inflict Confusion (1 rnd) + DEF -1.0. (Rounds 3, 6, 9)",
    effect: { type: "multi_confusion_def_down", targets: 2, confusionDuration: 1, defDown: 1.0 },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `[2 Units] Confusion (1 rnd) + DEF -${1.0+lvl*1.0} — rounds 3,6,9`,
  },

  // 3CD → rounds 4, 8
  theon_shock_wave: {
    name: "Shock Wave", icon: "⚡", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h29",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Enemy Units] 15% Focus Damage (FOC mod) + 35% chance to Stun. (Rounds 4, 8)",
    effect: { type: "aoe_focus_stun_chance", stunChance: 0.35, modifiedBy: "foc" },
    base: 0.15, perLevel: 0.15,
    nextDesc: (lvl) => `All enemies ${Math.round((0.15+lvl*0.15)*100)}% Focus DMG (FOC mod) + ${Math.min(100,Math.round((0.35+lvl*0.1)*100))}% Stun — rounds 4,8`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  theon_mages_secret_knowledge: {
    name: "Mage's Secret Knowledge", icon: "📖", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h29",
    type: "passive",
    desc: "[Army] FOC≥210: DMG +1.0% | FOC≥240: DMG Received -1.0% | FOC≥275: Stun Immune. (Passive) Max Level: CMD FOC +15.",
    effect: { type: "foc_threshold_bonuses", tier1Foc: 210, tier1Dmg: 0.01, tier2Foc: 240, tier2DmgReduce: 0.01, tier3Foc: 275, tier3StunImmune: true },
    base: 0.01, perLevel: 0.01,
    maxLevelEffect: { cmdFocBonus: 15 },
    nextDesc: (lvl) => `FOC≥210: DMG +${Math.round((0.01+lvl*0.01)*100)}% | FOC≥240: DMG Rec -${Math.round((0.01+lvl*0.01)*100)}% | FOC≥275: Stun Immune${lvl >= 14 ? " | Max: CMD FOC +15" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides (2CD → rounds 3, 6, 9) ─────────────────────────────
  theon_mages_healing_tome: {
    name: "Mage's Healing Tome", icon: "💚", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h29",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Allied Units] Recover 15% HP. (Rounds 3, 6, 9)",
    effect: { type: "heal_all", healPct: 0.15 },
    base: 0.15, perLevel: 0.15,
    nextDesc: (lvl) => `All allies recover ${Math.round((0.15+lvl*0.15)*100)}% HP — rounds 3,6,9`,
  },

  theon_dragon_killer: {
    name: "Dragon Killer", icon: "🐉", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h29",
    type: "passive",
    desc: "[Commander] DMG +3.5% vs Dragon units. (Passive)",
    effect: { type: "cmd_dmg_bonus_vs_faction", faction: "dragons", value: 0.035 },
    base: 0.035, perLevel: 0.035,
    nextDesc: (lvl) => `CMD DMG +${Math.round((0.035+lvl*0.035)*100)}% vs Dragon units (permanent)`,
  },

  // ── R3 — Main (3CD → rounds 4, 8) ────────────────────────────────────────
  theon_hourglass: {
    name: "Hourglass", icon: "⏳", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h29",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[2 Enemy Units] 10% Focus Damage (FOC mod) + 60% chance to Slow (2 rnd, -25% SPD). (Rounds 4, 8)",
    effect: { type: "focus_damage_slow_chance", targets: 2, slowChance: 0.60, slowDuration: 2, slowValue: 25, modifiedBy: "foc" },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { slowedDmgTakenUp: 0.05 },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.10+lvl*0.10)*100)}% Focus DMG + 60% Slow (2 rnd, -25% SPD)${lvl >= 14 ? " | Max: Slowed enemies +5% DMG Rec" : ""} — rounds 4,8`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // Fixed rounds 3, 5, 7
  theon_mind_games: {
    name: "Mind Games", icon: "🧠", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h29",
    type: "active", cooldown: 99, offset: 3, duration: 1,
    desc: "[Enemy CMD] Apply Confusion. [All Allies] DMG vs Slowed units +1.0%. (Rounds 3, 5, 7)",
    effect: { type: "cmd_confusion_slowed_dmg_bonus", dmgVsSlowed: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `Enemy CMD Confused + DMG vs Slowed +${Math.round((0.01+lvl*0.01)*100)}% — rounds 3,5,7`,
    firesOnRounds: [3, 5, 7],
  },

  theon_tidal_wave: {
    name: "Tidal Wave", icon: "🌊", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h29",
    type: "passive",
    desc: "[Army] Burn Damage Received -7%. (Passive)",
    effect: { type: "burn_dmg_received_reduce", value: 0.07 },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `Army Burn DMG Received -${Math.round((0.07+lvl*0.07)*100)}% (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  theon_wise_wizard: {
    name: "Wise Wizard", icon: "🌟", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h29",
    type: "passive",
    desc: "[Enemy Units] First 5 instances of damage dealt: DMG Received +1.5% each. (Passive) Max Level: CMD FOC +10.",
    effect: { type: "escalating_enemy_dmg_taken", instances: 5, valuePerInstance: 0.015 },
    base: 0.015, perLevel: 0.015,
    maxLevelEffect: { cmdFocBonus: 10 },
    nextDesc: (lvl) => `First 5 hits: enemy DMG Rec +${((0.015+lvl*0.015)*100).toFixed(1)}% each${lvl >= 14 ? " | Max: CMD FOC +10" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  theon_teleport: {
    name: "Teleport", icon: "✨", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h29",
    type: "passive",
    desc: "[Allied Units] Each round: 2% chance to evade the first instance of damage. (Passive)",
    effect: { type: "army_evasion_per_round_chance", chance: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `Each round: ${Math.round((0.02+lvl*0.02)*100)}% chance to evade first hit (permanent)`,
  },

  // Round 5 only
  theon_apothecary: {
    name: "Apothecary", icon: "🧪", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h29",
    type: "active", cooldown: 99, offset: 5, duration: 1,
    desc: "[All Allied Units] Recover 60% HP. (Round 5 only)",
    effect: { type: "heal_all", healPct: 0.60 },
    base: 0.60, perLevel: 0.60,
    nextDesc: (lvl) => `All allies recover ${Math.round((0.60+lvl*0.60)*100)}% HP — Round 5 only`,
  },
};

export const THEON_RESKIN_SKILLS = {};

// ── SPELLBLADE RYN (strategist, Warlock) ──────────────────────────────────────
// ATK:155, FOC:130, SPD:72 — pure focus damage, heavy debuffs. AOE burn,
// poison specialist, debuff-strip nuke, late-round payoff skills.
// 12 unique skills, no reskins.

export const RYN_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (2CD → rounds 3, 6, 9) ─────────────────────────────────
  ryn_blade_of_fire: {
    name: "Blade of Fire", icon: "🔥", tree: "combat", cls: "strategist",
    faction: "wizards", commander: "h30",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemy Units] 10% Burn Damage (FOC mod) + 40% chance Burn (1 rnd). (Rounds 3, 6, 9)",
    effect: { type: "aoe_burn_damage_chance", burnChance: 0.40, burnDuration: 1, modifiedBy: "foc" },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { cmdFocBonus: 15 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.10+lvl*0.10)*100)}% Burn DMG (FOC mod) + 40% Burn (1 rnd)${lvl >= 14 ? " | Max: FOC +15" : ""} — rounds 3,6,9`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  ryn_feel_the_burn: {
    name: "Feel the Burn", icon: "🌡️", tree: "combat", cls: "strategist",
    faction: "wizards", commander: "h30",
    type: "passive",
    desc: "[Allied Wizard Units] DMG +2.0% vs Burned enemies. (Passive)",
    effect: { type: "branch_dmg_bonus_vs_status", branch: "wizards", status: "burn", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `[Wizard Units] DMG +${Math.round((0.02+lvl*0.02)*100)}% vs Burned enemies (permanent)`,
  },

  ryn_clip_their_wings: {
    name: "Clip their Wings", icon: "🦅", tree: "combat", cls: "strategist",
    faction: "wizards", commander: "h30",
    type: "passive",
    desc: "[Enemy Dragon Units] DMG Received +3%. (Passive)",
    effect: { type: "enemy_faction_vulnerability", faction: "dragons", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `[Enemy Dragon Units] DMG Received +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // ── R0 BOTTOM — Main (3CD → rounds 4, 8) ─────────────────────────────────
  ryn_poisoned_blade: {
    name: "Poisoned Blade", icon: "☠️", tree: "combat", cls: "strategist",
    faction: "wizards", commander: "h30",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[Highest DEF Enemy] 20% Poison Damage (FOC mod) + 45% chance Poison DoT (2 rnd). (Rounds 4, 8)",
    effect: { type: "focus_poison_highest_def", poisonChance: 0.45, poisonDuration: 2, modifiedBy: "foc" },
    base: 0.20, perLevel: 0.20,
    maxLevelEffect: { cmdFocBonus: 15 },
    nextDesc: (lvl) => `[Highest DEF] ${Math.round((0.20+lvl*0.20)*100)}% Poison DMG (FOC mod) + 45% Poison DoT (2 rnd)${lvl >= 14 ? " | Max: FOC +15" : ""} — rounds 4,8`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  ryn_a_bad_time: {
    name: "A Bad Time", icon: "💀", tree: "combat", cls: "strategist",
    faction: "wizards", commander: "h30",
    type: "passive",
    desc: "[Poisoned Enemy Units] DEF -2.0. (Passive)",
    effect: { type: "enemy_status_def_down", status: "poison", defDown: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `Poisoned enemies: DEF -${2.0+lvl*2.0} (permanent)`,
  },

  ryn_teleport: {
    name: "Teleport", icon: "✨", tree: "combat", cls: "strategist",
    faction: "wizards", commander: "h30",
    type: "passive",
    desc: "[Allied Units] Each round: 2% chance to evade the first instance of damage. (Passive)",
    effect: { type: "army_evasion_per_round_chance", chance: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `Each round: ${Math.round((0.02+lvl*0.02)*100)}% chance to evade first hit (permanent)`,
  },

  // ── R3 — Main (fixed rounds 1, 5, 9) ──────────────────────────────────────
  ryn_lightning_blade: {
    name: "Lightning Blade", icon: "⚡", tree: "combat", cls: "strategist",
    faction: "wizards", commander: "h30",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "[2 Enemy Units] 20% Focus Damage (FOC mod) + 30% chance to Stun (1 rnd). (Rounds 1, 5, 9)",
    effect: { type: "focus_damage_multi_stun", targets: 2, stunChance: 0.30, stunDuration: 1, modifiedBy: "foc" },
    base: 0.20, perLevel: 0.20,
    maxLevelEffect: { cmdFocBonus: 15 },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% Focus DMG (FOC mod) + 30% Stun (1 rnd)${lvl >= 14 ? " | Max: FOC +15" : ""} — rounds 1,5,9`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // Round 4 only
  ryn_silence: {
    name: "Silence", icon: "🤫", tree: "combat", cls: "strategist",
    faction: "wizards", commander: "h30",
    type: "active", cooldown: 99, offset: 4, duration: 1,
    desc: "[Enemy Commander] 7% chance to inflict Silence (1 rnd). (Round 4 only)",
    effect: { type: "silence", chance: 0.07 },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `Enemy CMD: ${Math.min(100,Math.round((0.07+lvl*0.07)*100))}% Silence (1 rnd) — Round 4 only`,
  },

  ryn_elite_squad: {
    name: "Elite Squad", icon: "🗡️", tree: "combat", cls: "strategist",
    faction: "wizards", commander: "h30",
    type: "passive",
    desc: "[Allied Spellblade Units] DMG +4%. (Passive)",
    effect: { type: "branch_dmg_bonus", branch: "spellblades", value: 0.04 },
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `[Spellblade Units] DMG +${Math.round((0.04+lvl*0.04)*100)}% (permanent)`,
  },

  // ── R5 — Main (Round 6 only) ──────────────────────────────────────────────
  ryn_game_over: {
    name: "Game Over", icon: "💥", tree: "combat", cls: "strategist",
    faction: "wizards", commander: "h30",
    type: "active", cooldown: 99, offset: 6, duration: 1,
    desc: "[All Enemy Units] 10% Focus Damage | Strip all debuffs from each enemy | +100% Focus Damage per debuff stripped. (Round 6 only) Max Level: On kill → next skill DMG +20%.",
    effect: { type: "aoe_focus_strip_debuffs", bonusPerDebuff: 1.00, modifiedBy: "foc" },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { onKillNextSkillBonus: 0.20 },
    nextDesc: (lvl) => `All enemies: ${Math.round((0.10+lvl*0.10)*100)}% Focus DMG + strip all debuffs + 100% Focus DMG per debuff stripped${lvl >= 14 ? " | Max: On kill → next skill +20% DMG" : ""} — Round 6`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // Round 7 only
  ryn_still_standing: {
    name: "Still Standing?", icon: "😤", tree: "combat", cls: "strategist",
    faction: "wizards", commander: "h30",
    type: "active", cooldown: 99, offset: 7, duration: 1,
    desc: "[2 Enemy Units] DEF -5.0. (Round 7 only)",
    effect: { type: "multi_flat_def_down", targets: 2, defDown: 5.0 },
    base: 5.0, perLevel: 5.0,
    nextDesc: (lvl) => `[2 Units] DEF -${5.0+lvl*5.0} — Round 7 only`,
  },

  // Round 8 only
  ryn_overkill: {
    name: "Overkill", icon: "☠️", tree: "combat", cls: "strategist",
    faction: "wizards", commander: "h30",
    type: "active", cooldown: 99, offset: 8, duration: 1,
    desc: "[All Enemy Units] 80% Focus Damage (FOC mod). (Round 8 only)",
    effect: { type: "aoe_focus_damage_foc_mod", modifiedBy: "foc" },
    base: 0.80, perLevel: 0.80,
    nextDesc: (lvl) => `All enemies ${Math.round((0.80+lvl*0.80)*100)}% Focus DMG (FOC mod) — Round 8 only`,
  },
};

export const RYN_RESKIN_SKILLS = {};

// ── SOLARIUS VEX (support, Sage) ──────────────────────────────────────────────
// ATK:20, FOC:180, SPD:62 — extreme FOC healer/debuffer. Golem specialist,
// AOE suppression, poison arrows, creature-killing focus.
// 12 unique skills, no reskins.

export const VEX_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (2CD → rounds 3, 6, 9) ─────────────────────────────────
  vex_a_wizards_power: {
    name: "A Wizard's Power", icon: "🔮", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h5",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 12% Focus Damage (FOC mod). [Targets] Next Focus DMG received +10%. (Rounds 3, 6, 9)",
    effect: { type: "focus_damage_multi_vuln", targets: 2, focVuln: 0.10, modifiedBy: "foc" },
    base: 0.12, perLevel: 0.12,
    maxLevelEffect: { cmdFocBonus: 10 },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.12+lvl*0.12)*100)}% Focus DMG + targets take +10% more Focus DMG next hit${lvl >= 14 ? " | Max: FOC +10" : ""} — rounds 3,6,9`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  vex_wizard_onslaught: {
    name: "Wizard Onslaught", icon: "⚡", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h5",
    type: "passive",
    desc: "[Wizard Units] Rounds 1-3: 9% chance to gain a follow-up attack. (Passive)",
    effect: { type: "branch_followup_early_rounds", branch: "wizards", chance: 0.09, maxRound: 3 },
    base: 0.09, perLevel: 0.09,
    nextDesc: (lvl) => `[Wizard Units] Rounds 1-3: ${Math.min(100,Math.round((0.09+lvl*0.09)*100))}% follow-up chance (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  vex_healing_magic: {
    name: "Healing Magic", icon: "💚", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h5",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Allied Units] Recover 10% HP. (Rounds 3, 6, 9)",
    effect: { type: "heal_all", healPct: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `All allies recover ${Math.round((0.10+lvl*0.10)*100)}% HP — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Main (2CD → rounds 3, 6, 9) ──────────────────────────────
  vex_powerful_suppression: {
    name: "Powerful Suppression", icon: "🌪️", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h5",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemy Units] 6% Focus Damage (FOC mod) + 40% chance target deals minimum damage next round. (Rounds 3, 6, 9)",
    effect: { type: "aoe_focus_min_dmg_chance", minDmgChance: 0.40, modifiedBy: "foc" },
    base: 0.06, perLevel: 0.06,
    maxLevelEffect: { minDmgChance: 1.00 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.06+lvl*0.06)*100)}% Focus DMG + 40% chance min damage next round${lvl >= 14 ? " | Max: 100% chance" : ""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides (2CD → rounds 3, 6, 9) ─────────────────────────────
  vex_flaming_arrow: {
    name: "Flaming Arrow", icon: "🏹", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h5",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit, Dragon priority] 30% Burn Damage (FOC mod) + 35% chance Burn. (Rounds 3, 6, 9)",
    effect: { type: "focus_burn_damage_single", target: "prioritiseDragon", burnChance: 0.35, modifiedBy: "foc" },
    base: 0.30, perLevel: 0.30,
    nextDesc: (lvl) => `[Dragon priority] ${Math.round((0.30+lvl*0.30)*100)}% Burn DMG (FOC mod) + 35% Burn — rounds 3,6,9`,
  },

  vex_meditation: {
    name: "Meditation", icon: "🧘", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h5",
    type: "passive",
    desc: "[Commander] Focus Damage Dealt +2.0%. (Passive)",
    effect: { type: "cmd_focus_dmg_bonus", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `CMD Focus DMG +${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  // ── R3 — Main (fixed rounds 1, 4, 7) ──────────────────────────────────────
  vex_poison_arrow: {
    name: "Poison Arrow", icon: "☠️", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h5",
    type: "active", cooldown: 99, offset: 1, duration: 1,
    desc: "[2 Enemy Units] 10% Focus Damage (FOC mod) + 10% Poison DoT (2 rnd). (Rounds 1, 4, 7)",
    effect: { type: "focus_damage_poison_dot", targets: 2, poisonDotPct: 0.10, poisonDuration: 2, modifiedBy: "foc" },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { poisonDuration: 3 },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.10+lvl*0.10)*100)}% Focus DMG + 10% Poison DoT${lvl >= 14 ? " (3 rnd)" : " (2 rnd)"}${lvl >= 14 ? " | Max: Poison lasts 3 rounds" : ""} — rounds 1,4,7`,
    firesOnRounds: [1, 4, 7],
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  vex_not_so_fast: {
    name: "Not So Fast", icon: "🚫", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h5",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 10% Focus Damage (FOC mod) + block healing for 2 rounds. (Rounds 3, 6, 9)",
    effect: { type: "focus_damage_heal_block", targets: 2, healBlockDuration: 2, modifiedBy: "foc" },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.10+lvl*0.10)*100)}% Focus DMG + Heal Block 2 rnd — rounds 3,6,9`,
  },

  vex_destroy_all_creatures: {
    name: "Destroy All Creatures", icon: "👊", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h5",
    type: "passive",
    desc: "[Enemy Creature Units] DMG Received +4.0%. (Passive)",
    effect: { type: "enemy_alignment_vulnerability", alignment: "creatures", value: 0.04 },
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `[Enemy Creature Units] DMG Received +${Math.round((0.04+lvl*0.04)*100)}% (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  vex_bound_to_me: {
    name: "Bound to Me", icon: "⛓️", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h5",
    type: "passive",
    desc: "[Golem Units] DMG +1.0% | DMG Received -1.0%. (Passive) Max Level: Golems immune to Burn and Poison.",
    effect: { type: "branch_dual_stat_passive", branch: "golems", dmgUp: 0.01, dmgReceiveDown: 0.01 },
    base: 0.01, perLevel: 0.01,
    maxLevelEffect: { golemBurnPoisonImmune: true },
    nextDesc: (lvl) => `[Golems] DMG +${Math.round((0.01+lvl*0.01)*100)}% | DMG Rec -${Math.round((0.01+lvl*0.01)*100)}%${lvl >= 14 ? " | Max: Burn & Poison Immune" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  vex_golem_master: {
    name: "Golem Master", icon: "🗿", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h5",
    type: "passive",
    desc: "[Golem Units] 9% chance to deal maximum damage. (Passive)",
    effect: { type: "branch_max_dmg_chance", branch: "golems", chance: 0.09 },
    base: 0.09, perLevel: 0.09,
    nextDesc: (lvl) => `[Golems] ${Math.min(100,Math.round((0.09+lvl*0.09)*100))}% chance max damage (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  vex_my_golem: {
    name: "My Golem", icon: "💚", tree: "tactics", cls: "support",
    faction: "wizards", commander: "h5",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Golem Units] Recover 40% HP. (Rounds 3, 6, 9)",
    effect: { type: "heal_branch", branch: "golems", healPct: 0.40 },
    base: 0.40, perLevel: 0.40,
    nextDesc: (lvl) => `[Golems] Recover ${Math.round((0.40+lvl*0.40)*100)}% HP — rounds 3,6,9`,
  },
};

export const VEX_RESKIN_SKILLS = {};

// ── MIRA ASHVEIL (attacker, Sage) ─────────────────────────────────────────────
// ATK:120, FOC:100, SPD:70 — physical attacker with arcane edge. Vulnerability
// debuffs, creature/dragon hunter, late-round ATK threshold payoffs.
// 12 unique skills, no reskins.

export const MIRA_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  mira_time_for_some_fun: {
    name: "Time For Some Fun", icon: "😈", tree: "combat", cls: "attacker",
    faction: "wizards", commander: "h6",
    type: "passive",
    desc: "[All Enemies] Physical DMG Received +2.0%. (Passive) Max Level: ATK +15.",
    effect: { type: "vs_all_dmg_up", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `All enemies Physical DMG Rec +${Math.round((0.02+lvl*0.02)*100)}%${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  mira_front_line_combat: {
    name: "Front Line Combat", icon: "⚔️", tree: "combat", cls: "attacker",
    faction: "wizards", commander: "h6",
    type: "passive",
    desc: "[Enemy Melee Units] DMG Received +3.0%. (Passive)",
    effect: { type: "enemy_role_vulnerability", role: "melee", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `[Enemy Melee Units] DMG Rec +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  mira_low_blow: {
    name: "Low Blow", icon: "💥", tree: "combat", cls: "attacker",
    faction: "wizards", commander: "h6",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit] 30% Physical Damage (ATK mod) + 65% chance Stun. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_stun_chance", stunChance: 0.65, stunDuration: 1, modifiedBy: "atk" },
    base: 0.30, perLevel: 0.30,
    nextDesc: (lvl) => `${Math.round((0.30+lvl*0.30)*100)}% Physical DMG (ATK mod) + 65% Stun — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  mira_fist_over_wand: {
    name: "Fist Over Wand", icon: "👊", tree: "combat", cls: "attacker",
    faction: "wizards", commander: "h6",
    type: "passive",
    desc: "[Commander] Normal Attacks deal 3% more damage. (Passive) Max Level: ATK +15.",
    effect: { type: "cmd_normal_atk_bonus", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `CMD Normal Attacks +${Math.round((0.03+lvl*0.03)*100)}% DMG${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  mira_number_one_creature_killer: {
    name: "#1 Creature Killer", icon: "🦎", tree: "combat", cls: "attacker",
    faction: "wizards", commander: "h6",
    type: "passive",
    desc: "[CMD & Army] DMG +1.0% vs Creature units. (Passive)",
    effect: { type: "dmg_bonus_vs_alignment", alignment: "creatures", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `CMD & Army DMG +${Math.round((0.01+lvl*0.01)*100)}% vs Creatures (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  mira_many_trophies: {
    name: "Many Trophies", icon: "🏆", tree: "combat", cls: "attacker",
    faction: "wizards", commander: "h6",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemies, Dragon priority] 20% Physical DMG (ATK mod). [Dragon targets] +60% additional Physical DMG. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_multi_faction_bonus", targets: 2, prioritise: "dragons", bonusFaction: "dragons", bonusDmg: 0.60, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[2 Units, Dragon priority] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG | Dragon targets +60% extra — rounds 3,6,9`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  mira_plenty_of_stamina: {
    name: "Plenty of Stamina", icon: "💪", tree: "combat", cls: "attacker",
    faction: "wizards", commander: "h6",
    type: "passive",
    desc: "[Commander] Rounds 5-10: Skills deal +3% extra DMG. (Passive) Max Level: CMD Confusion Immune rounds 5-10.",
    effect: { type: "late_round_skill_dmg_bonus", value: 0.03, minRound: 5 },
    base: 0.03, perLevel: 0.03,
    maxLevelEffect: { lateRoundConfusionImmune: true, minRound: 5 },
    nextDesc: (lvl) => `Rounds 5-10: Skills +${Math.round((0.03+lvl*0.03)*100)}% DMG${lvl >= 14 ? " | Max: Confusion Immune rounds 5-10" : ""} (permanent)`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  mira_testing_the_water: {
    name: "Testing the Water", icon: "🌊", tree: "combat", cls: "attacker",
    faction: "wizards", commander: "h6",
    type: "passive",
    desc: "[All Allied Troops] Rounds 1-3: DEF +9% | DMG Dealt -9%. (Passive)",
    effect: { type: "early_round_def_up_dmg_down", defUp: 0.09, dmgDown: 0.09, maxRound: 3 },
    base: 0.09, perLevel: 0.09,
    nextDesc: (lvl) => `Rounds 1-3: DEF +${Math.round((0.09+lvl*0.09)*100)}% | DMG -${Math.round((0.09+lvl*0.09)*100)}% (permanent)`,
  },

  // Fixed rounds 6 and 8
  mira_powered_up_punch: {
    name: "Powered Up Punch", icon: "🥊", tree: "combat", cls: "attacker",
    faction: "wizards", commander: "h6",
    type: "active", cooldown: 99, offset: 6, duration: 1,
    desc: "[Lowest DEF Enemy] 50% Physical Damage (ATK mod). (Rounds 6 and 8)",
    effect: { type: "physical_damage_single", target: "lowestDef", modifiedBy: "atk" },
    base: 0.50, perLevel: 0.50,
    nextDesc: (lvl) => `[Lowest DEF] ${Math.round((0.50+lvl*0.50)*100)}% Physical DMG (ATK mod) — rounds 6, 8`,
    firesOnRounds: [6, 8],
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  mira_hit_the_gym: {
    name: "Hit the Gym", icon: "🏋️", tree: "combat", cls: "attacker",
    faction: "wizards", commander: "h6",
    type: "passive",
    desc: "[CMD] ATK≥200: Normal attacks ignore 1% DEF | ATK≥225: 3% chance second normal attack | ATK≥250: 6% chance unblockable normal attack. (Passive) Max Level: ATK +15.",
    effect: { type: "atk_threshold_bonuses", tier1Atk: 200, tier1DefIgnore: 0.01, tier2Atk: 225, tier2SecondAtkChance: 0.03, tier3Atk: 250, tier3UnblockChance: 0.06 },
    base: 0.01, perLevel: 0.01,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `ATK≥200: ignore ${Math.round((0.01+lvl*0.01)*100)}% DEF | ATK≥225: ${Math.round((0.03+lvl*0.03)*100)}% 2nd attack | ATK≥250: ${Math.round((0.06+lvl*0.06)*100)}% unblockable${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // Round 10 only
  mira_curtain_call: {
    name: "Curtain Call", icon: "🎭", tree: "combat", cls: "attacker",
    faction: "wizards", commander: "h6",
    type: "active", cooldown: 99, offset: 10, duration: 1,
    desc: "[All Enemy Units] 100% Physical Damage (ATK mod). (Round 10 only)",
    effect: { type: "aoe_physical_atk_mod", value: 1.00 },
    base: 1.00, perLevel: 1.00,
    nextDesc: (lvl) => `All enemies ${Math.round((1.00+lvl*1.00)*100)}% Physical DMG (ATK mod) — Round 10 only`,
  },

  mira_small_and_quick: {
    name: "Small and Quick", icon: "🏃", tree: "combat", cls: "attacker",
    faction: "wizards", commander: "h6",
    type: "passive",
    desc: "[If army is all small units] CMD ATK +1.0 | SPD +1.0. (Passive)",
    effect: { type: "all_small_army_cmd_bonus", atkValue: 1.0, spdValue: 1.0 },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `[All-small army] CMD ATK +${1.0+lvl*1.0} | SPD +${1.0+lvl*1.0} (permanent)`,
  },
};

export const MIRA_RESKIN_SKILLS = {};

// ── RUNEKEEPER DOV (leader, Apprentice) ───────────────────────────────────────
// ATK:75, FOC:80, SPD:58 — world-map specialist leader. Tile capturing,
// gathering, reinforcement, keep-breaking. Healer in the field.
// 12 unique skills, no reskins.

export const DOV_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (copied from Scaleveil R0 Bot) ──────────────────────────
  dov_hunter: {
    name: "Hunter", icon: "🏹", tree: "command", cls: "leader",
    faction: "wizards", commander: "h17",
    type: "passive",
    desc: "[CMD & Army] When attacking an unowned tile: DMG +1.0%. (Passive) Max Level: DMG Received -10% on unowned tiles.",
    effect: { type: "neutral_tile_dmg_bonus", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    maxLevelEffect: { neutralDmgReceivedDown: 0.10 },
    nextDesc: (lvl) => `Unowned tile: DMG +${Math.round((0.01+lvl*0.01)*100)}%${lvl >= 14 ? " | Max: DMG Received -10%" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  dov_gatherer: {
    name: "Gatherer", icon: "🌾", tree: "command", cls: "leader",
    faction: "wizards", commander: "h17",
    type: "passive",
    desc: "[Army] Resources gained from gathering +5%. (Non-Combat Passive)",
    effect: { type: "gathering_bonus", value: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Gathering yield +${Math.round((0.05+lvl*0.05)*100)}% (permanent)`,
  },

  dov_pather: {
    name: "Pather", icon: "🐾", tree: "command", cls: "leader",
    faction: "wizards", commander: "h17",
    type: "passive",
    desc: "[Army] March Speed +3%. (Non-Combat Passive)",
    effect: { type: "march_speed_bonus", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `March Speed +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  dov_tiler: {
    name: "Tiler", icon: "🗺️", tree: "command", cls: "leader",
    faction: "wizards", commander: "h17",
    type: "passive",
    desc: "[When attacking unowned land] Troop Losses -3%. (Passive) Max Level: Army HP +15.",
    effect: { type: "neutral_tile_troop_loss_reduce", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    maxLevelEffect: { armyHpBonus: 15 },
    nextDesc: (lvl) => `Unowned tile: Troop Losses -${Math.round((0.03+lvl*0.03)*100)}%${lvl >= 14 ? " | Max: Army HP +15" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  dov_reinforcer: {
    name: "Reinforcer", icon: "⏱️", tree: "command", cls: "leader",
    faction: "wizards", commander: "h17",
    type: "passive",
    desc: "[Army] Reinforcement time -7%. (Non-Combat Passive)",
    effect: { type: "reinforcement_time_reduce", value: 0.07 },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `Reinforcement time -${Math.round((0.07+lvl*0.07)*100)}% (permanent)`,
  },

  dov_sieger: {
    name: "Sieger", icon: "🏰", tree: "command", cls: "leader",
    faction: "wizards", commander: "h17",
    type: "passive",
    desc: "[Army] Siege +2.0. (Passive)",
    effect: { type: "army_siege_bonus", value: 2 },
    base: 2, perLevel: 2,
    nextDesc: (lvl) => `Army Siege +${2+lvl*2} (permanent)`,
  },

  // ── R3 — Main (fixed rounds 1, 4, 7, 10) ──────────────────────────────────
  dov_healer: {
    name: "Healer", icon: "💚", tree: "command", cls: "leader",
    faction: "wizards", commander: "h17",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "[All Allied Units] 10% HP. [Wizard Units] +30% extra HP. (Rounds 1, 4, 7, 10)",
    effect: { type: "heal_two_units_dragon_bonus", healPct: 0.10, dragonBonusPct: 0.30, targets: -1, bonusBranch: "wizards" },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { bonusBranchHealPct: 0.50 },
    nextDesc: (lvl) => `All allies ${Math.round((0.10+lvl*0.10)*100)}% HP | Wizard Units +${lvl >= 14 ? "50" : "30"}% extra — rounds 1,4,7,10`,
  },

  // ── R3 — Sides (fixed rounds 1, 5, 9) ────────────────────────────────────
  dov_cleaner: {
    name: "Cleaner", icon: "🧹", tree: "command", cls: "leader",
    faction: "wizards", commander: "h17",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "[Allied Units] 10% chance to cleanse 1 random debuff. (Rounds 1, 5, 9)",
    effect: { type: "per_round_cleanse_chance", chance: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `${Math.min(100,Math.round((0.10+lvl*0.10)*100))}% chance cleanse 1 debuff — rounds 1,5,9`,
  },

  dov_mover: {
    name: "Mover", icon: "🚀", tree: "command", cls: "leader",
    faction: "wizards", commander: "h17",
    type: "passive",
    desc: "[Army] Reposition Speed +7%. (Non-Combat Passive)",
    effect: { type: "reposition_speed_bonus", value: 0.07 },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `Reposition Speed +${Math.round((0.07+lvl*0.07)*100)}% (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  dov_keep_taker: {
    name: "Keep Taker", icon: "🏯", tree: "command", cls: "leader",
    faction: "wizards", commander: "h17",
    type: "passive",
    desc: "[vs Keep armies] Allied Units DMG +1.0%. (Passive) Max Level: CMD Stun Immune when fighting at a Keep.",
    effect: { type: "keep_battle_dmg_bonus", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    maxLevelEffect: { keepStunImmune: true },
    nextDesc: (lvl) => `[vs Keep] All allies DMG +${Math.round((0.01+lvl*0.01)*100)}%${lvl >= 14 ? " | Max: CMD Stun Immune at Keep" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  dov_fighter: {
    name: "Fighter", icon: "⚔️", tree: "command", cls: "leader",
    faction: "wizards", commander: "h17",
    type: "passive",
    desc: "[Commander] XP from combat +1.5%. (Non-Combat Passive)",
    effect: { type: "combat_xp_bonus", value: 0.015 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `Combat XP +${Math.round((0.015+lvl*0.015)*100)}% (permanent)`,
  },

  dov_trainer: {
    name: "Trainer", icon: "📚", tree: "command", cls: "leader",
    faction: "wizards", commander: "h17",
    type: "passive",
    desc: "[Commander] XP from mock battles +3%. (Non-Combat Passive)",
    effect: { type: "mock_battle_xp_bonus", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `Mock Battle XP +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },
};

export const DOV_RESKIN_SKILLS = {};

// ── HEXBLADE OREN (balanced, Apprentice) ──────────────────────────────────────
// ATK:90, FOC:60, SPD:55 — physical balanced. SPD-modified strikes, multi-hit
// random attacks, ATK stacking, Korgath-style AoE normal attacks.
// 12 unique skills, no reskins.

export const OREN_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (Brine copy → Wizard Units) ─────────────────────────────
  oren_veteran_leadership: {
    name: "Veteran Leadership", icon: "🎖️", tree: "combat", cls: "balanced",
    faction: "wizards", commander: "h18",
    type: "passive",
    desc: "[Wizard Units] DMG +0.6% | DEF +6 | SPD +6. (Passive) Max Level: DMG range +1-2.",
    effect: { type: "hk_triple_stat_bonus", dmgUp: 0.006, defBonus: 6, spdBonus: 6, branch: "wizards" },
    base: 0.006, perLevel: 0.006,
    maxLevelEffect: { dmgRangeMin: 1, dmgRangeMax: 2 },
    nextDesc: (lvl) => `[Wizard Units] DMG +${((0.006+lvl*0.006)*100).toFixed(1)}% | DEF +${6+lvl*6} | SPD +${6+lvl*6}${lvl >= 14 ? " | Max: DMG range +1-2" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  oren_wizards_go_to: {
    name: "Wizard's Go To", icon: "🛡️", tree: "combat", cls: "balanced",
    faction: "wizards", commander: "h18",
    type: "passive",
    desc: "[Allied Troops] Each round: 5% chance to gain Confusion Immunity. (Passive)",
    effect: { type: "per_round_confusion_immune_chance", chance: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Each round: ${Math.min(100,Math.round((0.05+lvl*0.05)*100))}% chance Confusion Immunity (permanent)`,
  },

  oren_heals_for_days: {
    name: "Heals for Days", icon: "💚", tree: "combat", cls: "balanced",
    faction: "wizards", commander: "h18",
    type: "passive",
    desc: "[Wizard Units] Recover 5% HP each round. (Passive)",
    effect: { type: "branch_heal_per_round", branch: "wizards", healPct: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `[Wizard Units] Recover ${Math.round((0.05+lvl*0.05)*100)}% HP/round (permanent)`,
  },

  // ── R0 BOTTOM — Main (2CD → rounds 3, 6, 9) ──────────────────────────────
  oren_hexblade: {
    name: "Hexblade", icon: "🔯", tree: "combat", cls: "balanced",
    faction: "wizards", commander: "h18",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Random Enemy Units] 4% Physical DMG (ATK mod) × 6 hits. +10 ATK per unique unit hit. (Rounds 3, 6, 9)",
    effect: { type: "multi_hit_random_atk_stack", hits: 6, dmgPct: 0.04, atkPerUniqueHit: 10, modifiedBy: "atk" },
    base: 0.04, perLevel: 0.04,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `6 random hits x ${Math.round((0.04+lvl*0.04)*100)}% Physical DMG (ATK mod) | +10 ATK per unique unit hit${lvl >= 14 ? " | Max: ATK +15" : ""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides (2CD → rounds 3, 6, 9) ─────────────────────────────
  oren_dagger_from_behind: {
    name: "Dagger From Behind", icon: "🗡️", tree: "combat", cls: "balanced",
    faction: "wizards", commander: "h18",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Highest DMG Enemy] 45% Physical Damage + 60% chance Stun. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_stun_chance", target: "highestDmg", stunChance: 0.60, stunDuration: 1, modifiedBy: "atk" },
    base: 0.45, perLevel: 0.45,
    nextDesc: (lvl) => `[Highest DMG unit] ${Math.round((0.45+lvl*0.45)*100)}% Physical DMG + 60% Stun — rounds 3,6,9`,
  },

  // Fixed rounds 1, 3, 7, 9
  oren_blinding_speed: {
    name: "Blinding Speed", icon: "💨", tree: "combat", cls: "balanced",
    faction: "wizards", commander: "h18",
    type: "active", cooldown: 99, offset: 1, duration: 1,
    desc: "[2 Enemy Units] 20% Physical Damage (SPD mod). (Rounds 1, 3, 7, 9)",
    effect: { type: "physical_damage_spd_mod", targets: 2, modifiedBy: "spd" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG (SPD mod) — rounds 1,3,7,9`,
    firesOnRounds: [1, 3, 7, 9],
  },

  // ── R3 — Main (Korgath Surprise copy, rescaled) ───────────────────────────
  oren_orens_multi_blades: {
    name: "Oren's Multi Blades", icon: "⚔️", tree: "combat", cls: "balanced",
    faction: "wizards", commander: "h18",
    type: "passive",
    desc: "[Commander] Normal attacks deal 5% Physical DMG to ALL enemy units. (Passive) Max Level: ATK +15.",
    effect: { type: "cmd_normal_atk_aoe_physical", value: 0.05 },
    base: 0.05, perLevel: 0.05,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `Normal attacks deal ${Math.round((0.05+lvl*0.05)*100)}% Physical DMG to ALL enemies${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  oren_orens_heavy_strike: {
    name: "Oren's Heavy Strike", icon: "💥", tree: "combat", cls: "balanced",
    faction: "wizards", commander: "h18",
    type: "passive",
    desc: "[Commander] Normal Attacks deal +7% extra Physical DMG. (Passive)",
    effect: { type: "cmd_normal_atk_bonus", value: 0.07 },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `Normal Attacks +${Math.round((0.07+lvl*0.07)*100)}% extra Physical DMG (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  oren_never_ending_assault: {
    name: "Never Ending Assault", icon: "🗡️", tree: "combat", cls: "balanced",
    faction: "wizards", commander: "h18",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 20% Physical Damage (ATK mod) + Heal Block 1 round. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_heal_block", targets: 2, healBlockDuration: 1, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG (ATK mod) + Heal Block 1 rnd — rounds 3,6,9`,
  },

  // ── R5 — Main (Korgath Intelligence copy) ─────────────────────────────────
  oren_battle_tested: {
    name: "Battle Tested", icon: "📖", tree: "combat", cls: "balanced",
    faction: "wizards", commander: "h18",
    type: "passive",
    desc: "[Commander] Skill Damage +2.0% in combat. (Passive) Max Level: ATK +15.",
    effect: { type: "skill_dmg_bonus", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `All active skill damage +${Math.round((0.02+lvl*0.02)*100)}%${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  oren_delayed_strike: {
    name: "Delayed Strike", icon: "⏱️", tree: "combat", cls: "balanced",
    faction: "wizards", commander: "h18",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[1 Enemy Unit, Melee priority] 27% Physical DMG + 50% chance additional 27% Physical DMG. (Rounds 4, 8)",
    effect: { type: "physical_damage_followup", target: "prioritiseMelee", initialDmg: 0.27, followupDmg: 0.27, followupChance: 0.50 },
    base: 0.27, perLevel: 0.2471,
    nextDesc: (lvl) => {
      const dmg = Math.round((0.27+lvl*0.2471)*100);
      return `[Melee priority] ${dmg}% + 50% chance ${dmg}% follow-up Physical DMG — rounds 4,8`;
    },
  },

  // Fixed rounds 3, 6, 8
  oren_lieutenant_of_spellblades: {
    name: "Lieutenant of Spellblades", icon: "⚡", tree: "combat", cls: "balanced",
    faction: "wizards", commander: "h18",
    type: "active", cooldown: 99, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 25% Physical DMG (ATK mod). [Commander] SPD +100% for 2 rounds. (Rounds 3, 6, 8)",
    effect: { type: "physical_damage_cmd_spd_boost", targets: 2, spdBoostPct: 1.00, spdDuration: 2, modifiedBy: "atk" },
    base: 0.25, perLevel: 0.25,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.25+lvl*0.25)*100)}% Physical DMG (ATK mod) + CMD SPD +100% (2 rnd) — rounds 3,6,8`,
    firesOnRounds: [3, 6, 8],
  },
};

export const OREN_RESKIN_SKILLS = {};

// ── Merged export ─────────────────────────────────────────────────────────────

export const BOUNTYHUNTERS_SKILLS = {
  ...THEON_UNIQUE_SKILLS,
  ...THEON_RESKIN_SKILLS,
  ...RYN_UNIQUE_SKILLS,
  ...RYN_RESKIN_SKILLS,
  ...VEX_UNIQUE_SKILLS,
  ...VEX_RESKIN_SKILLS,
  ...MIRA_UNIQUE_SKILLS,
  ...MIRA_RESKIN_SKILLS,
  ...DOV_UNIQUE_SKILLS,
  ...DOV_RESKIN_SKILLS,
  ...OREN_UNIQUE_SKILLS,
  ...OREN_RESKIN_SKILLS,
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const BOUNTYHUNTERS_BRANCH_SKILL_MAP = {
  // Archmage Theon (support, Warlock)
  // FOC threshold specialist — AoE debuffs, slow, confusion, late-round healer
  h29: [
    { main: "theon_battle_mage",            sides: ["theon_riddle_me_this",        "theon_shock_wave"]              }, // R0 top
    { main: "theon_mages_secret_knowledge", sides: ["theon_mages_healing_tome",    "theon_dragon_killer"]           }, // R0 bot
    { main: "theon_hourglass",              sides: ["theon_mind_games",            "theon_tidal_wave"]              }, // R3
    { main: "theon_wise_wizard",            sides: ["theon_teleport",              "theon_apothecary"]              }, // R5
  ],
  // Spellblade Ryn (strategist, Warlock)
  // Pure FOC damage — burn/poison uptime, debuff-strip nuke round 6, late spikes
  h30: [
    { main: "ryn_blade_of_fire",    sides: ["ryn_feel_the_burn",       "ryn_clip_their_wings"]  }, // R0 top
    { main: "ryn_poisoned_blade",   sides: ["ryn_a_bad_time",          "ryn_teleport"]          }, // R0 bot
    { main: "ryn_lightning_blade",  sides: ["ryn_silence",             "ryn_elite_squad"]       }, // R3
    { main: "ryn_game_over",        sides: ["ryn_still_standing",      "ryn_overkill"]          }, // R5
  ],
  // Solarius Vex (support, Sage)
  // Golem specialist — FOC debuffs, poison, healing, creature killer
  h5: [
    { main: "vex_a_wizards_power",       sides: ["vex_wizard_onslaught",     "vex_healing_magic"]          }, // R0 top
    { main: "vex_powerful_suppression",  sides: ["vex_flaming_arrow",        "vex_meditation"]             }, // R0 bot
    { main: "vex_poison_arrow",          sides: ["vex_not_so_fast",          "vex_destroy_all_creatures"]  }, // R3
    { main: "vex_bound_to_me",           sides: ["vex_golem_master",         "vex_my_golem"]               }, // R5
  ],
  // Mira Ashveil (attacker, Sage)
  // Physical vulnerability stacker — creature/dragon hunter, ATK threshold payoffs
  h6: [
    { main: "mira_time_for_some_fun",   sides: ["mira_front_line_combat",    "mira_low_blow"]             }, // R0 top
    { main: "mira_fist_over_wand",      sides: ["mira_number_one_creature_killer", "mira_many_trophies"] }, // R0 bot
    { main: "mira_plenty_of_stamina",   sides: ["mira_testing_the_water",    "mira_powered_up_punch"]     }, // R3
    { main: "mira_hit_the_gym",         sides: ["mira_curtain_call",         "mira_small_and_quick"]      }, // R5
  ],
  // Runekeeper Dov (leader, Apprentice)
  // World-map leader — tile specialist, gathering, siege, keep-breaking, healer
  h17: [
    { main: "dov_hunter",      sides: ["dov_gatherer",   "dov_pather"]      }, // R0 top
    { main: "dov_tiler",       sides: ["dov_reinforcer", "dov_sieger"]      }, // R0 bot
    { main: "dov_healer",      sides: ["dov_cleaner",    "dov_mover"]       }, // R3
    { main: "dov_keep_taker",  sides: ["dov_fighter",    "dov_trainer"]     }, // R5
  ],
  // Hexblade Oren (balanced, Apprentice)
  // Physical multi-hit specialist — SPD mod strikes, AoE normal attacks, ATK stacking
  h18: [
    { main: "oren_veteran_leadership",    sides: ["oren_wizards_go_to",         "oren_heals_for_days"]         }, // R0 top
    { main: "oren_hexblade",              sides: ["oren_dagger_from_behind",     "oren_blinding_speed"]         }, // R0 bot
    { main: "oren_orens_multi_blades",    sides: ["oren_orens_heavy_strike",     "oren_never_ending_assault"]   }, // R3
    { main: "oren_battle_tested",         sides: ["oren_delayed_strike",         "oren_lieutenant_of_spellblades"] }, // R5
  ],
};
