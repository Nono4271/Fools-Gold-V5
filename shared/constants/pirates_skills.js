/* ─────────────────────────────────────────────────────────────────────────────
   pirates_skills.js — Pirates Faction Skills
   72 total: 60 reskins + 12 unique skills
   6 commanders × 12 skills each

   Commanders:
     Redwake Fynn       (h1,  attacker,   Shipwright) — 10 reskins + 2 unique
     Pirate Cook Samuel (h2,  balanced,   Shipwright) — 10 reskins + 2 unique
     Admiral Brine      (h13, leader,     First Mate) — 10 reskins + 2 unique
     Saltwhisper        (h14, support,    First Mate) — 10 reskins + 2 unique
     Ironjaw Reck       (h25, attacker,   Captain)    — 10 reskins + 2 unique
     Navigator Seyne    (h26, strategist, Captain)    — 10 reskins + 2 unique
───────────────────────────────────────────────────────────────────────────── */

// ── REDWAKE FYNN (attacker, Shipwright) ───────────────────────────────────────
// ATK:130, FOC:0, SPD:88 — fast veteran attacker. Early burst then penalty,
// anti-Orc, bleed, physical pressure. High risk glass cannon opener.

export const FYNN_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (2CD → rounds 3,6,9) ───────────────────────────────────
  fyn_boarding_action: {
    name:"Boarding Action", icon:"⚔️", tree:"combat", cls:"attacker",
    faction:"pirates", commander:"h1",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[2 Enemy Units] 15% Physical Damage (ATK mod) | [All Allied Units] Heal 50% HP. (Rounds 3,6,9)",
    effect:{ type:"physical_damage_multi_heal_all", targets:2, healPct:0.50, modifiedBy:"atk" },
    base:0.15, perLevel:0.15,
    maxLevelEffect:{ atkBonus:15 },
    nextDesc:(lvl)=>`[2 Units] ${Math.round((0.15+lvl*0.15)*100)}% Physical DMG | All allies heal 50% HP${lvl>=14?" | Max: ATK +15":""} — rounds 3,6,9`,
  },
  // R0 TOP — Sides
  fyn_pirate_vet: {
    name:"Pirate Vet", icon:"🏴‍☠️", tree:"combat", cls:"attacker",
    faction:"pirates", commander:"h1",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[Commander] 10% chance for an additional normal attack. (Rounds 3,6,9)",
    effect:{ type:"cmd_bonus_attack_chance", chance:0.10 },
    base:0.10, perLevel:0.10,
    nextDesc:(lvl)=>`${Math.round((0.10+lvl*0.10)*100)}% chance extra CMD normal attack — rounds 3,6,9`,
  },
  fyn_speak_with_fists: {
    name:"Speak With Fists", icon:"👊", tree:"combat", cls:"attacker",
    faction:"pirates", commander:"h1",
    type:"passive",
    desc:"[Commander] Normal Attack Damage +3%. (Passive)",
    effect:{ type:"cmd_normal_atk_bonus", value:0.03 },
    base:0.03, perLevel:0.03,
    nextDesc:(lvl)=>`Normal Attack DMG +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  fyn_onboarding: {
    name:"Onboarding", icon:"💨", tree:"combat", cls:"attacker",
    faction:"pirates", commander:"h1",
    type:"passive",
    desc:"[Commander] While Attacking: DMG +1.0%. (Passive)",
    effect:{ type:"attacking_stance_cmd_bonus", value:0.01 },
    base:0.01, perLevel:0.01,
    maxLevelEffect:{ pirateDmgRangeBonus:2 },
    nextDesc:(lvl)=>`Attacking: CMD DMG +${Math.round((0.01+lvl*0.01)*100)}%${lvl>=14?" | Max: Pirate Units DMG +2-2 while attacking":""} (permanent)`,
  },
  // R0 BOTTOM — Sides
  fyn_around_the_block: {
    name:"Around the Block", icon:"🛡️", tree:"combat", cls:"attacker",
    faction:"pirates", commander:"h1",
    type:"passive",
    desc:"[Commander] Incoming debuff chance -7%. (Passive)",
    effect:{ type:"debuff_chance_reduction", value:0.07 },
    base:0.07, perLevel:0.07,
    nextDesc:(lvl)=>`All incoming debuff chances on CMD -${Math.round((0.07+lvl*0.07)*100)}% (permanent)`,
  },
  fyn_opening_strike: {
    name:"Opening Strike", icon:"⚡", tree:"combat", cls:"attacker",
    faction:"pirates", commander:"h1",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[1 Enemy Unit] 20% Physical Damage | 45% chance to Stun 1 round. (Rounds 3,6,9)",
    effect:{ type:"physical_damage_stun_chance", target:"single", stunChance:0.45, stunDuration:1 },
    base:0.20, perLevel:0.20,
    nextDesc:(lvl)=>`${Math.round((0.20+lvl*0.20)*100)}% Physical DMG + 45% Stun (1 rnd) — rounds 3,6,9`,
  },

  // ── R3 — Main (2CD → rounds 3,6,9) ───────────────────────────────────────
  fyn_orc_hunter: {
    name:"Orc Hunter", icon:"🎯", tree:"combat", cls:"attacker",
    faction:"pirates", commander:"h1",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[1 Enemy Unit] 30% Physical DMG | [1 Random Orc Unit] +20% Physical DMG. (Rounds 3,6,9)",
    effect:{ type:"physical_damage_faction_bonus", primaryDmg:0.30, bonusDmg:0.20, bonusFaction:"orcs" },
    base:0.30, perLevel:0.30,
    maxLevelEffect:{ atkBonus:15 },
    nextDesc:(lvl)=>`${Math.round((0.30+lvl*0.30)*100)}% Physical DMG + ${Math.round((0.20+lvl*0.20)*100)}% vs Orc${lvl>=14?" | Max: ATK +15":""} — rounds 3,6,9`,
  },
  // R3 — Sides
  fyn_overpower: {
    name:"Overpower", icon:"💥", tree:"combat", cls:"attacker",
    faction:"pirates", commander:"h1",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[Lowest DEF Unit] 20% Physical DMG | Follow-up 30% next round. (Rounds 3,6,9)",
    effect:{ type:"physical_damage_delayed_followup", target:"lowestDef", initialDmg:0.20, followupDmg:0.30 },
    base:0.20, perLevel:0.20,
    nextDesc:(lvl)=>`[Lowest DEF] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG + ${Math.round((0.30+lvl*0.30)*100)}% follow-up next round — rounds 3,6,9`,
  },
  fyn_fynns_opener: {
    name:"Fynn's Opener", icon:"🩸", tree:"combat", cls:"attacker",
    faction:"pirates", commander:"h1",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"[Round 1] 40% Physical DMG (ATK mod) | 70% chance Bleed (2 rnd). (Rounds 1,4,7,10)",
    effect:{ type:"physical_damage_bleed", target:"single", bleedChance:0.70, bleedDmg:0.30, bleedDuration:2, modifiedBy:"atk" },
    base:0.40, perLevel:0.3714,
    maxLevelEffect:{ bleedSpreadChance:0.35 },
    nextDesc:(lvl)=>`${Math.round((0.40+lvl*0.3714)*100)}% Physical DMG (ATK mod) + 70% Bleed${lvl>=14?" | Max: 35% spread Bleed":""} — rounds 1,4,7,10`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  fyn_pirates_roar: {
    name:"Pirate's Roar", icon:"📣", tree:"combat", cls:"attacker",
    faction:"pirates", commander:"h1",
    type:"passive",
    desc:"[Rounds 1-2] CMD and Army DMG +14% | [Rounds 3-5] CMD and Army DMG -50% (flat). Expires round 6+.",
    effect:{ type:"burst_then_penalty", earlyBonus:0.14, earlyRounds:2, penaltyValue:0.50, penaltyRounds:[3,4,5] },
    base:0.14, perLevel:0.14,
    nextDesc:(lvl)=>`Rounds 1-2: +${Math.round((0.14+lvl*0.14)*100)}% DMG | Rounds 3-5: -50% DMG (permanent)`,
  },
  // R5 — Sides
  fyn_map_of_the_sea: {
    name:"Map of the Sea", icon:"🗺️", tree:"combat", cls:"attacker",
    faction:"pirates", commander:"h1",
    type:"passive",
    desc:"[Commander] Skill Damage +2.0%. (Passive)",
    effect:{ type:"skill_dmg_bonus", value:0.02 },
    base:0.02, perLevel:0.02,
    maxLevelEffect:{ atkBonus:15 },
    nextDesc:(lvl)=>`All active skill damage +${Math.round((0.02+lvl*0.02)*100)}%${lvl>=14?" | Max: ATK +15":""} (permanent)`,
  },
  // pir_many_trades referenced in branch map (SHARED_PIRATE_SKILLS)
};
export const FYNN_RESKIN_SKILLS = {};

// ── PIRATE COOK SAMUEL (balanced, Shipwright) ─────────────────────────────────
// ATK:105, FOC:45, SPD:78 — burn specialist balanced. Anti-creature, Burn uptime,
// stacking DEF on burn damage, conditional heal. The crew's most dangerous cook.

export const SAMUEL_UNIQUE_SKILLS = {

  sam_creature_sorbet: {
    name: "Creature Sorbet", icon: "🍨", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "[Commander and Army] +1% Damage to Creature units. (Passive)",
    effect: { type: "dmg_bonus_vs_alignment", alignment: ["orcs","nightcreatures","dragons"], value: 0.01 },
    base: 0.01, perLevel: 0.01,
    maxLevelEffect: { creatureEnemyDefDown: 5.0 },
    nextDesc: (lvl) => `CMD and Army DMG +${Math.round((0.01+lvl*0.01)*100)}% vs Creature units${lvl >= 14 ? " | Max: Enemy Creature DEF -5" : ""} (permanent)`,
  },
  sam_spice_attack: {
    name: "Spice Attack", icon: "🌶️", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "[Each Round] Enemy units: 9% independent chance to gain Blind (guaranteed miss next attack). (Passive)",
    effect: { type: "per_round_blind_chance", chance: 0.09 },
    base: 0.09, perLevel: 0.09,
    nextDesc: (lvl) => `Each round: ${Math.round((0.09+lvl*0.09)*100)}% chance per enemy unit to gain Blind (permanent)`,
  },
  sam_soups_hot: {
    name: "Soup's Hot", icon: "🍲", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "[Enemy Units] When attacking: 1.5% chance to receive Burn (1 round). (Passive)",
    effect: { type: "on_enemy_attack_burn_chance", chance: 0.015, burnDuration: 1 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `Enemy units attacking: ${((0.015+lvl*0.015)*100).toFixed(1)}% chance to self-inflict Burn (1 rnd) (permanent)`,
  },
  sam_flaming_skillet: {
    name: "Flaming Skillet", icon: "🍳", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[3 Different Enemy Units] 10% Burn Damage (FOC mod) each. (Rounds 3, 6, 9)",
    effect: { type: "multi_hit_different_targets_burn", hits: 3, dmgPct: 0.10, modifiedBy: "foc" },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { burnChancePerHit: 0.30, burnDuration: 1 },
    nextDesc: (lvl) => `3 different targets x ${Math.round((0.10+lvl*0.10)*100)}% Burn DMG (FOC mod)${lvl >= 14 ? " | Max: 30% Burn per hit (1 rnd)" : ""} — rounds 3,6,9`,
  },
  sam_used_to_heat: {
    name: "Used to the Heat", icon: "🔥", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "[Commander] Burn Damage Dealt +3%. (Passive)",
    effect: { type: "cmd_burn_dmg_bonus", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `[Commander] Burn DMG +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },
  sam_cooks_barrage: {
    name: "Cook's Barrage", icon: "💥", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "[Army] +3% Damage to enemies with Burn. (Passive)",
    effect: { type: "dmg_bonus_vs_burn", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `[Army] DMG +${Math.round((0.03+lvl*0.03)*100)}% vs burning targets (permanent)`,
  },
  sam_hot_sauce: {
    name: "Hot Sauce", icon: "🌡️", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Enemies] 20% Burn Damage | 100% chance to apply Burn (1 rnd). (Rounds 4, 8)",
    effect: { type: "aoe_burn_guaranteed", burnChance: 1.0, burnDuration: 1, burnDmgPenalty: 0.20 },
    base: 0.20, perLevel: 0.20,
    maxLevelEffect: { burnedEnemyDefDown: 10 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.20+lvl*0.20)*100)}% Burn DMG + guaranteed Burn (1 rnd)${lvl >= 14 ? " | Max: Burned enemies DEF -10" : ""} — rounds 4,8`,
  },
  sam_orc_sushi: {
    name: "Orc Sushi", icon: "🍣", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "[Commander] +4% bonus damage to Orc units. (Passive)",
    effect: { type: "cmd_dmg_bonus_vs_faction", faction: "orcs", value: 0.04 },
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `CMD DMG +${Math.round((0.04+lvl*0.04)*100)}% vs Orcs (permanent)`,
  },
  sam_keeping_heat_up: {
    name: "Keeping the Heat Up", icon: "♨️", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "[Army] When attacking a burning enemy: 6% chance for follow-up attack. (Passive)",
    effect: { type: "followup_vs_burn", chance: 0.06 },
    base: 0.06, perLevel: 0.06,
    nextDesc: (lvl) => `[Army] Attacking burned targets: ${Math.round((0.06+lvl*0.06)*100)}% chance follow-up (permanent)`,
  },
  sam_keeping_it_spicy: {
    name: "Keeping it Spicy", icon: "🫙", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "[Commander] Normal Attacks deal additional 3% Burn Damage. (Passive)",
    effect: { type: "cmd_normal_atk_burn", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    maxLevelEffect: { burnDmgReceivedUp: 0.05, targets: 2 },
    nextDesc: (lvl) => `Normal attacks +${Math.round((0.03+lvl*0.03)*100)}% Burn DMG${lvl >= 14 ? " | Max: 2 enemy units Burn DMG Received +5%" : ""} (permanent)`,
  },
  sam_pirate_cook: {
    name: "Pirate Cook", icon: "👨‍🍳", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "[Allied Pirate Units] When Samuel deals Burn Damage: DEF +1.0 (max 6 stacks per instance). (Passive)",
    effect: { type: "on_burn_dmg_ally_def_stack", branch: "pirates", defPerStack: 1.0, maxStacks: 6 },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `[Pirate Units] Per burn damage instance: DEF +${1.0+lvl*1.0} (max 6 stacks) (permanent)`,
  },
  sam_chefs_kiss: {
    name: "Chef's Kiss", icon: "💋", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "[All Allied Units] Round start: Heal 8% HP if at least 1 enemy is burning. (Passive)",
    effect: { type: "conditional_round_start_heal", condition: "enemyBurning", healPct: 0.08 },
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `Round start: ${Math.round((0.08+lvl*0.08)*100)}% HP heal to all allies if any enemy is burning (permanent)`,
  },
};

export const SAMUEL_RESKIN_SKILLS = {};

// ── ADMIRAL BRINE (leader, First Mate) ────────────────────────────────────────
// ATK:95, FOC:20, SPD:65 — pirate fleet leader. Anti-evasion Pursuit mechanic,
// army buffs, anti-COTN, self-sacrifice inspiration. Turns crew into a fighting force.

export const BRINE_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  bri_admirals_presence: {
    name: "Admiral's Presence", icon: "🎖️", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "passive",
    desc: "[Pirate Units] DMG +0.6% | DEF +6 | SPD +6. (Passive)",
    effect: { type: "hk_triple_stat_bonus", dmgUp: 0.006, defBonus: 6, spdBonus: 6 },
    base: 0.006, perLevel: 0.006,
    maxLevelEffect: { dmgRangeMin: 1, dmgRangeMax: 2 },
    nextDesc: (lvl) => `[Pirate Units] DMG +${((0.006+lvl*0.006)*100).toFixed(1)}% | DEF +${6+lvl*6} | SPD +${6+lvl*6}${lvl >= 14 ? " | Max: DMG range +1-2" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  bri_hero_of_ship: {
    name: "Hero of the Ship", icon: "⚓", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "passive",
    desc: "[Brine] At the start of each round: 5% chance to gain Confusion Immunity for that round. (Passive)",
    effect: { type: "per_round_confusion_immune_chance", chance: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Each round: ${Math.round((0.05+lvl*0.05)*100)}% chance for Confusion Immunity (permanent)`,
  },

  bri_trusted_captain: {
    name: "Trusted Captain", icon: "🏴‍☠️", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "passive",
    desc: "[Pirate Units] Recover 5% HP each round. (Passive)",
    effect: { type: "branch_heal_per_round", branch: "pirates", healPct: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `[Pirate Units] Recover ${Math.round((0.05+lvl*0.05)*100)}% HP each round (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  bri_power_of_leadership: {
    name: "Power of Leadership", icon: "⚔️", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Pirate Units] 5% chance to gain a follow-up attack this round. (Rounds 3, 6, 9)",
    effect: { type: "faction_followup_per_round", faction: "pirates", chance: 0.05 },
    base: 0.05, perLevel: 0.05,
    maxLevelEffect: { pirateTroopHpBonus: 10 },
    nextDesc: (lvl) => `[Pirate Units] ${Math.round((0.05+lvl*0.05)*100)}% chance for follow-up${lvl >= 14 ? " | Max: Pirate Units HP +10" : ""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  bri_captains_honor: {
    name: "Captain's Honor", icon: "🕯️", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[Brine] Gains Confusion for 1 round | [Allied Troops] DMG +4% for 1 round. (Rounds 4, 8)",
    effect: { type: "self_confuse_army_dmg_up", selfConfusion: 1, armyDmgUp: 0.04, armyDmgDuration: 1 },
    base: 0.04, perLevel: 0.16 / 6, // 4% at Lv1 → 20% at Lv7 (max)
    nextDesc: (lvl) => `Brine confused (1 rnd) | All troops +${Math.round((0.04 + lvl * 0.16 / 6) * 100)}% DMG (1 rnd) — rounds 4,8`,
  },

  // 2CD → rounds 3, 6, 9
  bri_admirals_go_to: {
    name: "Admiral's Go To", icon: "⚔️", tree: "combat", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 20% Physical Damage (modified by ATK). (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_multi", targets: 2, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG (ATK mod) — rounds 3,6,9`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  bri_seeing_through_fog: {
    name: "Seeing Through the Fog", icon: "🌫️", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "passive",
    desc: "[Allied Troops] [Rounds 1-4] 15% chance to gain Pursuit (attacks cannot be avoided). (Passive)",
    effect: { type: "early_round_pursuit_chance", chance: 0.15, maxRound: 4 },
    base: 0.15, perLevel: 0.15,
    maxLevelEffect: { cmdGainsPursuit: true },
    nextDesc: (lvl) => `[Rounds 1-4] Troops ${Math.round((0.15+lvl*0.15)*100)}% chance for Pursuit${lvl >= 14 ? " | Max: Brine also gains Pursuit" : ""} (permanent)`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // pir_protect_the_weak referenced in branch map

  bri_orc_rivalry: {
    name: "Orc Rivalry", icon: "⚔️", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "passive",
    desc: "[Orc Enemy Units] Damage Received +2.5%. (Passive)",
    effect: { type: "enemy_faction_vulnerability", faction: "orcs", value: 0.025 },
    base: 0.025, perLevel: 0.025,
    nextDesc: (lvl) => `[Orc Enemy Units] DMG Received +${((0.025+lvl*0.025)*100).toFixed(1)}% (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  bri_cannon_volley: {
    name: "Cannon Volley", icon: "💣", tree: "combat", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[5 Random Enemy Units] 8% damage each | [Allied Pirates] +5% DMG (1 rnd). (Rounds 4, 8)",
    effect: { type: "multi_hit_random_faction_buff", hits: 5, dmgPct: 0.08, allyFaction: "pirates", allyDmgUp: 0.05, allyDmgDuration: 1 },
    base: 0.08, perLevel: 0.008,
    maxLevelEffect: { bonusHitVsOrc: true },
    nextDesc: (lvl) => `5 random hits x ${Math.round((0.08+lvl*0.008)*100)}% | Pirate allies +5% DMG (1 rnd)${lvl >= 14 ? " | Max: +1 hit vs Orc unit" : ""} — rounds 4,8`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // 2CD → rounds 2, 5, 8
  bri_admirals_battle_cry: {
    name: "Admiral's Battle Cry", icon: "📣", tree: "combat", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "[2 Enemy Units] 7% chance to Stun for 1 round. (Rounds 2, 5, 8)",
    effect: { type: "stun_chance", targets: 2, chance: 0.07 },
    base: 0.07, perLevel: 0.0643,
    nextDesc: (lvl) => `[2 Enemy Units] ${Math.round((0.07+lvl*0.0643)*100)}% chance to Stun (1 rnd) — rounds 2,5,8`,
  },

  bri_defense_against_dark: {
    name: "Defense Against the Dark", icon: "🛡️", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "passive",
    desc: "[Allied Units] Focus Damage Received -6%. (Passive)",
    effect: { type: "dmg_type_resist_all", value: 0.06 },
    base: 0.06, perLevel: 0.06,
    nextDesc: (lvl) => `All allies Focus DMG Received -${Math.round((0.06+lvl*0.06)*100)}% (permanent)`,
  },
};

export const BRINE_RESKIN_SKILLS = {};

// ── SALTWHISPER (support, First Mate) ─────────────────────────────────────────
// ATK:40, FOC:95, SPD:55 — pirate support with stealth/drunk theme. Heals,
// evasion, 2-round sequential debuff immunity + AoE drunk attack. Clutch sustain.

export const SALTWHISPER_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  sal_crews_anchor: {
    name: "Crew's Anchor", icon: "⚓", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "passive",
    desc: "[Army] March Speed +1.0%. (Non-Combat Passive)",
    effect: { type: "march_speed_bonus", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    maxLevelEffect: { pirateCombatSpd: 10 },
    notImplemented: false,
    nextDesc: (lvl) => `March Speed +${Math.round((0.01+lvl*0.01)*100)}%${lvl >= 14 ? " | Max: Pirate Units SPD +10 in combat" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  sal_treasure_hunter: {
    name: "Treasure Hunter", icon: "💰", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "passive",
    desc: "[Gathering] +5.0% extra resources from gathering. (Non-Combat Passive)",
    effect: { type: "gathering_bonus", value: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Gathering Resources +${Math.round((0.05+lvl*0.05)*100)}% (permanent)`,
  },

  sal_steady_hands: {
    name: "Steady Hands", icon: "🤲", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "passive",
    desc: "[Allied Units] Healing Received +2% (max +15% at 7/7). (Passive)",
    effect: { type: "heal_received_bonus", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `[All Allied Units] Healing Received +${Math.min(15, 2+lvl*2)}% (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  sal_whispers_help: {
    name: "Whisper's Help", icon: "💚", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Allied Units] Heals 12% HP | Targets gain +15% Defence for 2 rounds. (Rounds 3, 6, 9)",
    effect: { type: "heal_def_buff", targets: 2, healPct: 0.12, defBonus: 0.15, defDuration: 2 },
    base: 0.12, perLevel: 0.12,
    maxLevelEffect: { pirateTroopHpBonus: 0.10 },
    nextDesc: (lvl) => `[2 Allies] ${Math.round((0.12+lvl*0.12)*100)}% HP + DEF +15% (2 rnd)${lvl >= 14 ? " | Max: Pirate Units HP +10%" : ""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // pir_protect_the_weak referenced in branch map

  sal_pirate_excellence: {
    name: "Pirate Excellence", icon: "🏴‍☠️", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "passive",
    desc: "[Allied Pirate Units] Damage Dealt +3%. (Passive)",
    effect: { type: "branch_dmg_bonus", branch: "pirates", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `[Pirate Units] DMG +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  sal_pirate_doctor: {
    name: "Pirate Doctor", icon: "⚕️", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "passive",
    desc: "[After Commander deals damage] [2 Allied Units] 4% chance to heal 5% HP. (Passive)",
    effect: { type: "post_attack_proc_heal", targets: 2, chance: 0.04, healPct: 0.05 },
    base: 0.04, perLevel: 0.04,
    maxLevelEffect: { focusBonus: 15 },
    nextDesc: (lvl) => `Post-attack: ${Math.round((0.04+lvl*0.04)*100)}% chance to heal 2 allies for ${Math.round((0.05+lvl*0.05)*100)}% HP${lvl >= 14 ? " | Max: FOC +15" : ""} (permanent)`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  sal_not_just_a_doctor: {
    name: "Not Just a Doctor", icon: "⚡", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "passive",
    desc: "[All Allied Units] First 3 rounds: 8% chance to gain a follow-up attack. (Passive)",
    effect: { type: "ally_followup_chance_early", chance: 0.08, maxRound: 3 },
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `[Rounds 1-3] All allies ${Math.round((0.08+lvl*0.08)*100)}% chance for follow-up attack (permanent)`,
  },

  // pir_cleanse referenced in branch map

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  // Offset 4 + CD 4 → rounds 4-5, 8-9 (2-round sequential)
  sal_shadows_drunken_warrior: {
    name: "Shadow's Drunken Warrior", icon: "🥃", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 4, offset: 4, duration: 2,
    desc: "[Round 4] Saltwhisper cannot be debuffed | [Round 5] All enemies 30% Focus DMG (FOC mod) + 70% Drunk. (Rounds 4-5, 8-9)",
    effect: { type: "sequential_immunity_then_aoe", immunityRound: 0, attackRound: 1, focusDmg: 0.30, drunkChance: 0.70 },
    base: 0.30, perLevel: 0.30,
    maxLevelEffect: { drunkEnemyHpDown: 10, drunkEnemyDefDown: 10 },
    nextDesc: (lvl) => {
      const dmg = Math.round((0.30+lvl*0.30)*100);
      return `Round 4: Debuff immune | Round 5: All enemies ${dmg}% Focus DMG + 70% Drunk${lvl >= 14 ? " | Max: Drunk enemies HP -10 & DEF -10" : ""} — rounds 4-5, 8-9`;
    },
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // Round 7 only
  sal_turn_the_tide: {
    name: "Turn the Tide", icon: "🌊", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 99, offset: 7, duration: 1,
    desc: "[Round 7] [All Allied Units] Heal 60% HP. (Round 7 only)",
    effect: { type: "heal_all", healPct: 0.60 },
    base: 0.60, perLevel: 0.60,
    nextDesc: (lvl) => `All allies heal ${Math.round((0.60+lvl*0.60)*100)}% HP — Round 7 only`,
  },

  // Round 2 + 2CD → rounds 2, 5, 8
  sal_fog_of_war: {
    name: "Fog of War", icon: "🌫️", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "[Allied Units] 8% chance to evade the next 2 instances of damage this round. (Rounds 2, 5, 8)",
    effect: { type: "army_evasion_two_hits", chance: 0.08, hitCount: 2 },
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `All allies ${Math.round((0.08+lvl*0.08)*100)}% chance to evade next 2 hits — rounds 2,5,8`,
  },
};

export const SALTWHISPER_RESKIN_SKILLS = {};

// ── IRONJAW RECK (attacker, Captain) ──────────────────────────────────────────
export const RECK_UNIQUE_SKILLS = {
  reck_sweeping_strike: {
    name: "Sweeping Strike", icon: "⚔️", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "passive",
    desc: "[Commander] Normal Attacks deal 5% Physical Damage to ALL enemies (ATK mod) | 50% chance +50% to 1 random target. (Passive)",
    effect: { type: "cmd_normal_atk_aoe_physical", value: 0.05, followupChance: 0.50, followupBonus: 0.50 },
    base: 0.05, perLevel: 0.05,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `Normal attacks: all enemies ${Math.round((0.05+lvl*0.05)*100)}% Physical DMG + 50% chance +50% on 1 random target${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },
  reck_pirate_captain: {
    name: "Pirate Captain", icon: "🏴‍☠️", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "passive",
    desc: "[Commander] +0.5 ATK for each Pirate unit slot in army (max 3 slots). (Passive)",
    effect: { type: "cmd_atk_per_faction_slot", faction: "pirates", atkPerSlot: 0.5, maxSlots: 3 },
    base: 0.5, perLevel: 0.5,
    nextDesc: (lvl) => `CMD ATK +${(0.5+lvl*0.5).toFixed(1)} per Pirate slot (max 3/+${((0.5+lvl*0.5)*3).toFixed(1)} total) (permanent)`,
  },
  reck_scallywag: {
    name: "Scallywag", icon: "🗡️", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 1, offset: 2, duration: 1,
    desc: "[1 Enemy Unit, prioritises Mounted] 25% Physical Damage (ATK mod). (Rounds 2, 4, 6, 8, 10)",
    effect: { type: "physical_damage_single", target: "prioritiseMounted", modifiedBy: "atk" },
    base: 0.25, perLevel: 0.25,
    nextDesc: (lvl) => `[Mounted priority] ${Math.round((0.25+lvl*0.25)*100)}% Physical DMG (ATK mod) — rounds 2,4,6,8,10`,
  },
  reck_whiskey_barrel: {
    name: "Whiskey Barrel Explosion", icon: "🛢️", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] 6% Physical Damage | 60% chance to apply Drunk (30% miss, cannot evade). (Rounds 3, 6, 9)",
    effect: { type: "aoe_physical_drunk", drunkChance: 0.60, drunkMissChance: 0.30 },
    base: 0.06, perLevel: 0.06,
    maxLevelEffect: { drunkDmgBonus: 0.10 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.06+lvl*0.06)*100)}% Physical DMG + 60% Drunk${lvl >= 14 ? " | Max: +10% DMG vs Drunk" : ""} — rounds 3,6,9`,
  },
  reck_cat_got_your_tongue: {
    name: "Cat Got Your Tongue?", icon: "😹", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Enemy Units] 7% Physical Damage (ATK mod) | +140% bonus DMG if target is Drunk. (Rounds 4, 8)",
    effect: { type: "aoe_physical_bonus_vs_drunk", bonusDmgIfDrunk: 1.40, modifiedBy: "atk" },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `All enemies ${Math.round((0.07+lvl*0.07)*100)}% Physical DMG | Drunk targets +140% — rounds 4,8`,
  },
  reck_enemy_of_orcs: {
    name: "Enemy of the Orcs", icon: "🪓", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "passive",
    desc: "[Commander and Army] +1% damage to Orc units. (Passive)",
    effect: { type: "dmg_bonus_vs_faction_all", faction: "orcs", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `CMD and Army DMG +${Math.round((0.01+lvl*0.01)*100)}% vs Orcs (permanent)`,
  },
  reck_ironjaw_crush: {
    name: "Ironjaw Crush", icon: "💀", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[2 Random Enemy Units] 11% Physical Damage each (ATK mod) | [Pirate Troops] Heal 60% HP. (Rounds 4, 8)",
    effect: { type: "multi_hit_random_faction_heal", hits: 2, dmgPct: 0.11, healFaction: "pirates", healPct: 0.60, modifiedBy: "atk" },
    base: 0.11, perLevel: 0.11,
    maxLevelEffect: { healPct: 0.90 },
    nextDesc: (lvl) => `2 random hits x ${Math.round((0.11+lvl*0.11)*100)}% Physical DMG | Pirate Troops heal ${lvl >= 14 ? "90%" : "60%"} HP — rounds 4,8`,
  },
  reck_no_relief: {
    name: "No Relief", icon: "🚫", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 99, offset: 4, duration: 1,
    desc: "[Round 4] [2 Enemy Units] 14% Physical Damage | 70% chance to apply Heal Block for 2 rounds. (Round 4 only)",
    effect: { type: "physical_damage_heal_block_chance", targets: 2, healBlockChance: 0.70, healBlockDuration: 2 },
    base: 0.14, perLevel: 0.14,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.14+lvl*0.14)*100)}% Physical DMG + 70% Heal Block (2 rnd) — Round 4 only`,
  },
  reck_sea_resilience: {
    name: "Sea Earned Resilience", icon: "🌊", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "passive",
    desc: "[Start of each round] 3% chance to gain Confusion Immunity for that round. (Passive)",
    effect: { type: "per_round_confusion_immune_chance", chance: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `Each round: ${Math.round((0.03+lvl*0.03)*100)}% chance for Confusion Immunity (permanent)`,
  },
  reck_king_of_sea: {
    name: "King of the Sea", icon: "👑", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "passive",
    desc: "[If all troops are Pirates] [Commander] Skill Damage +3%. (Passive)",
    effect: { type: "all_faction_skill_dmg_bonus", faction: "pirates", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    maxLevelEffect: { pirateTroopDefBonus: 10, pirateTroopHpBonus: 10 },
    nextDesc: (lvl) => `[All-Pirate army] Skill DMG +${Math.round((0.03+lvl*0.03)*100)}%${lvl >= 14 ? " | Max: Pirate Troops DEF +10 & HP +10" : ""} (permanent)`,
  },
  reck_smokescreen: {
    name: "Smokescreen", icon: "💨", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 3, offset: 2, duration: 1,
    desc: "[Round 2] [Creature Enemy Units (Dragons, Orcs, COTN)] 10% chance to inflict Confusion. (Rounds 2, 5, 8)",
    effect: { type: "confusion_vs_alignment", alignment: ["orcs","nightcreatures","dragons"], chance: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `[Creature units] ${Math.round((0.10+lvl*0.10)*100)}% chance Confusion — rounds 2,5,8`,
  },
  reck_pirates_trick: {
    name: "Pirate's Trick", icon: "🃏", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[1 Enemy Unit] 15% Physical Damage | 55% chance to Stun for 1 round. (Rounds 4, 8)",
    effect: { type: "physical_damage_stun_chance", target: "single", stunChance: 0.55, stunDuration: 1 },
    base: 0.15, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((0.15+lvl*0.15)*100)}% Physical DMG + 55% Stun (1 rnd) — rounds 4,8`,
  },
};
export const RECK_RESKIN_SKILLS = {};

// ── NAVIGATOR SEYNE (strategist, Captain) ─────────────────────────────────────
export const SEYNE_UNIQUE_SKILLS = {
  sey_chart_the_course: {
    name: "Chart the Course", icon: "🧭", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 2, offset: 3, duration: 2,
    desc: "[All Enemy Units] DEF -1.0 for 2 rounds. (Rounds 3, 6, 9)",
    effect: { type: "aoe_def_down", value: 1.0, duration: 2 },
    base: 1.0, perLevel: 1.0,
    maxLevelEffect: { spdDown: 15, spdDownDuration: 1 },
    nextDesc: (lvl) => `All enemies DEF -${1.0+lvl*1.0} (2 rnd)${lvl >= 14 ? " | Max: SPD -15 (1 rnd)" : ""} — rounds 3,6,9`,
  },
  sey_exploiting_weakness: {
    name: "Exploiting Weakness", icon: "🎯", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "passive",
    desc: "[Enemies with DEF Down] Damage Received +2%. (Passive)",
    effect: { type: "dmg_bonus_vs_debuffed", debuff: "defDown", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `Enemies with DEF Down: DMG Received +${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },
  sey_gather_my_crew: {
    name: "Gather My Crew", icon: "🏴‍☠️", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "passive",
    desc: "[Allied Human Units] Damage Dealt +1.0%. (Passive)",
    effect: { type: "faction_dmg_bonus", faction: "humans", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `[Human Allied Units] DMG +${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },
  sey_sea_shanty: {
    name: "Sea Shanty", icon: "🎵", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "passive",
    desc: "[Allied Pirate Units] 3% chance to gain a follow-up attack each round. (Passive)",
    effect: { type: "faction_followup_per_round", faction: "pirates", chance: 0.03 },
    base: 0.03, perLevel: 0.0314,
    maxLevelEffect: { pirateDmgRangeMin: 2, pirateDmgRangeMax: 4 },
    nextDesc: (lvl) => `[Pirate Units] ${Math.round((0.03+lvl*0.0314)*100)}% chance for follow-up each round${lvl >= 14 ? " | Max: Pirate DMG range +2-4" : ""} (permanent)`,
  },
  sey_beers_on_me: {
    name: "Beers On Me", icon: "🍺", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 10% chance to apply Drunk. (Rounds 3, 6, 9)",
    effect: { type: "drunk_chance_multi", targets: 2, drunkChance: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.10+lvl*0.10)*100)}% chance to apply Drunk — rounds 3,6,9`,
  },
  sey_poison_the_drink: {
    name: "Poison the Drink", icon: "🧪", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "passive",
    desc: "[When an enemy is inflicted with Drunk] 6% chance to also apply Venom. (Passive)",
    effect: { type: "on_drunk_apply_venom", chance: 0.06 },
    base: 0.06, perLevel: 0.06,
    nextDesc: (lvl) => `On Drunk applied: ${Math.round((0.06+lvl*0.06)*100)}% chance to also apply Venom (permanent)`,
  },
  sey_know_your_enemy: {
    name: "Know Your Enemy", icon: "📋", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Human Enemy CMD] 4% chance to Stun | [Creature Enemy CMD] 4% chance to Confuse. (Rounds 3, 6, 9)",
    effect: { type: "cmd_stun_or_confuse_by_faction", humanChance: 0.04, creatureChance: 0.04 },
    base: 0.04, perLevel: 0.04,
    maxLevelEffect: { marchSpeedBonus: 0.15 },
    nextDesc: (lvl) => { const p = Math.round((0.04+lvl*0.04)*100); return `Human CMD ${p}% Stun | Creature CMD ${p}% Confuse${lvl >= 14 ? " | Max: March Speed +15%" : ""} — rounds 3,6,9`; },
  },
  sey_mounted_slayer: {
    name: "Mounted Slayer", icon: "🐴", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "passive",
    desc: "[Commander and Army] +1% damage to Mounted units. (Passive)",
    effect: { type: "dmg_bonus_vs_role", role: "mounted", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `CMD and Army DMG +${Math.round((0.01+lvl*0.01)*100)}% vs Mounted units (permanent)`,
  },
  sey_patch_up_pirates: {
    name: "Patch Up Pirates", icon: "🩹", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 99, offset: 3, duration: 1,
    desc: "[Pirate Units] Heals 50% HP. Triggers Round 3 only.",
    effect: { type: "heal_branch", branch: "pirates", healPct: 0.50 },
    base: 0.50, perLevel: 0.50,
    nextDesc: (lvl) => `[Pirate Units] Heal ${Math.round((0.50+lvl*0.50)*100)}% HP — Round 3 only`,
  },
  sey_right_tool: {
    name: "Right Tool for the Job", icon: "🔧", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "[Round 1] Large: 4% HP -10% | Mounted: 4% SPD -10% | Small: 4% DMG -10% (all 1 rnd). (Rounds 1, 5, 9)",
    effect: { type: "size_type_conditional_debuff", largeHpDown: 0.10, mountedSpdDown: 0.10, smallDmgDown: 0.10, chance: 0.04 },
    base: 0.04, perLevel: 0.04,
    maxLevelEffect: { debuffedTakeMoreDmg: 0.15 },
    nextDesc: (lvl) => { const p = Math.round((0.04+lvl*0.04)*100); return `${p}% each: Large HP-10% | Mounted SPD-10% | Small DMG-10% (1 rnd)${lvl >= 14 ? " | Max: +15% DMG vs debuffed" : ""} — rounds 1,5,9`; },
  },
  sey_creature_hunter: {
    name: "Creature Hunter", icon: "🏹", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "passive",
    desc: "[vs Creature units] Each round: 7% chance for Commander follow-up normal attack. (Passive)",
    effect: { type: "cmd_followup_vs_alignment", alignment: ["orcs","nightcreatures","dragons"], chance: 0.07 },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `vs Creatures: ${Math.round((0.07+lvl*0.07)*100)}% chance CMD follow-up each round (permanent)`,
  },
  sey_fire_breath: {
    name: "Fire Breath", icon: "🔥", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] 8% Burn Damage (FOC mod) | 40% chance to apply Burn (DMG -20% 1 rnd). (Rounds 3, 6, 9)",
    effect: { type: "burn_damage_apply", targets: "all", burnChance: 0.40, burnDmgPenalty: 0.20, modifiedBy: "foc" },
    base: 0.08, perLevel: 0.0457,
    nextDesc: (lvl) => `All enemies ${Math.round((0.08+lvl*0.0457)*100)}% Burn DMG (FOC mod) + 40% Burn (1 rnd) — rounds 3,6,9`,
  },
};
export const SEYNE_RESKIN_SKILLS = {};

export const SHARED_PIRATE_SKILLS = {
  pir_many_trades: {
    name: "Many Trades", icon: "🃏", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "passive",
    desc: "[Commander] First 4 skills activated each battle deal +5% extra damage. (Passive)",
    effect: { type: "first_skills_dmg_bonus", instances: 4, bonus: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `First 4 skills: +${Math.round((0.05+lvl*0.05)*100)}% extra damage (permanent)`,
  },
  pir_protect_the_weak: {
    name: "Protect the Weak", icon: "🛡️", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "passive",
    desc: "[All Human Units] Defence +2.0. (Passive)",
    effect: { type: "faction_def_bonus", faction: "humans", value: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `[All Human Units] DEF +${2.0+lvl*2.0} (permanent)`,
  },
  pir_cleanse: {
    name: "Cleanse", icon: "💧", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Allied Units] Recover 10% HP | 8% chance to remove 1 random debuff per unit. (Rounds 4, 8)",
    effect: { type: "heal_cleanse_all", healPct: 0.10, cleanseChance: 0.08 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `All allies ${Math.round((0.10+lvl*0.10)*100)}% HP + ${Math.round((0.08+lvl*0.08)*100)}% cleanse debuff — rounds 4,8`,
  },
};

export const PIRATES_SKILLS = {
  ...FYNN_UNIQUE_SKILLS,
  ...FYNN_RESKIN_SKILLS,
  ...SAMUEL_UNIQUE_SKILLS,
  ...SAMUEL_RESKIN_SKILLS,
  ...BRINE_UNIQUE_SKILLS,
  ...BRINE_RESKIN_SKILLS,
  ...SALTWHISPER_UNIQUE_SKILLS,
  ...SALTWHISPER_RESKIN_SKILLS,
  ...RECK_UNIQUE_SKILLS,
  ...RECK_RESKIN_SKILLS,
  ...SEYNE_UNIQUE_SKILLS,
  ...SEYNE_RESKIN_SKILLS,
  ...SHARED_PIRATE_SKILLS,
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const PIRATES_BRANCH_SKILL_MAP = {
  // Redwake Fynn (attacker, Shipwright)
  // Fast, sweeping brawler — AoE unique in branch 2, passive unique anchor in branch 0
  h1: [
    { main: "fyn_boarding_action",  sides: ["fyn_pirate_vet",       "fyn_speak_with_fists"]  }, // R0 top
    { main: "fyn_onboarding",       sides: ["fyn_around_the_block", "fyn_opening_strike"]    }, // R0 bottom
    { main: "fyn_orc_hunter",       sides: ["fyn_overpower",        "fyn_fynns_opener"]      }, // R3
    { main: "fyn_pirates_roar",     sides: ["fyn_map_of_the_sea",   "pir_many_trades"]       }, // R5
  ],
  h2: [
    { main: "sam_creature_sorbet",   sides: ["sam_spice_attack",     "sam_soups_hot"]         }, // R0 top
    { main: "sam_flaming_skillet",   sides: ["sam_used_to_heat",     "sam_cooks_barrage"]     }, // R0 bottom
    { main: "sam_hot_sauce",         sides: ["sam_orc_sushi",        "sam_keeping_heat_up"]   }, // R3
    { main: "sam_keeping_it_spicy",  sides: ["sam_pirate_cook",      "sam_chefs_kiss"]        }, // R5
  ],
  // Admiral Brine (leader, First Mate)
  h13: [
    { main: "bri_admirals_presence",   sides: ["bri_hero_of_ship",       "bri_trusted_captain"]      }, // R0 top
    { main: "bri_power_of_leadership", sides: ["bri_captains_honor",     "bri_admirals_go_to"]       }, // R0 bottom
    { main: "bri_seeing_through_fog",  sides: ["pir_protect_the_weak",   "bri_orc_rivalry"]          }, // R3
    { main: "bri_cannon_volley",       sides: ["bri_admirals_battle_cry","bri_defense_against_dark"] }, // R5
  ],
  // Saltwhisper (support, First Mate)
  // Hex-heavy sea-witch — debuff unique branch 2, healing passive anchor
  h14: [
    { main: "sal_crews_anchor",          sides: ["sal_treasure_hunter",    "sal_steady_hands"]         }, // R0 top
    { main: "sal_whispers_help",         sides: ["pir_protect_the_weak",   "sal_pirate_excellence"]    }, // R0 bottom
    { main: "sal_pirate_doctor",         sides: ["sal_not_just_a_doctor",  "pir_cleanse"]              }, // R3
    { main: "sal_shadows_drunken_warrior",sides: ["sal_turn_the_tide",     "sal_fog_of_war"]           }, // R5
  ],
  // Ironjaw Reck (attacker, Captain)
  // Maximum aggression — multi-hit lifesteal unique branch 2, passive ATK anchor
  h25: [
    { main: "reck_sweeping_strike",  sides: ["reck_pirate_captain",      "reck_scallywag"]       }, // R0 top
    { main: "reck_whiskey_barrel",   sides: ["reck_cat_got_your_tongue", "reck_enemy_of_orcs"]   }, // R0 bottom
    { main: "reck_ironjaw_crush",    sides: ["reck_no_relief",           "reck_sea_resilience"]  }, // R3
    { main: "reck_king_of_sea",      sides: ["reck_smokescreen",         "reck_pirates_trick"]   }, // R5
  ],
  h26: [
    { main: "sey_chart_the_course",  sides: ["sey_exploiting_weakness", "sey_gather_my_crew"]    }, // R0 top
    { main: "sey_sea_shanty",        sides: ["sey_beers_on_me",         "sey_poison_the_drink"]  }, // R0 bottom
    { main: "sey_know_your_enemy",   sides: ["sey_mounted_slayer",      "sey_patch_up_pirates"]  }, // R3
    { main: "sey_right_tool",        sides: ["sey_creature_hunter",     "sey_fire_breath"]       }, // R5
  ],
};
