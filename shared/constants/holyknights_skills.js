/* ─────────────────────────────────────────────────────────────────────────────
   holyknights_skills.js — Holy Knights Faction Skills
   72 total: 60 reskins + 12 unique skills
   6 commanders × 12 skills each

   Commanders:
     Brother Aldric          (h37, balanced,   Templar)      — 10 reskins + 2 unique
     Commander Vayne         (h38, leader,     Templar)      — 10 reskins + 2 unique
     Friar Brennan           (h39, support,    BattlePriest) — 10 reskins + 2 unique
     High Warden Seraph      (h40, attacker,   BattlePriest) — 10 reskins + 2 unique
     Maniacal Priest Dante   (h41, leader,     Inquisitor)   — 10 reskins + 2 unique
     Grand Inquisitor Mourne (h42, strategist, Inquisitor)   — 10 reskins + 2 unique
───────────────────────────────────────────────────────────────────────────── */

// ── BROTHER ALDRIC (balanced, Templar) ───────────────────────────────────────
// ATK:78, FOC:20, SPD:48 — veteran soldier. Day/night cycle specialist,
// self-sacrifice mechanics, gets stronger as he takes hits. Shares R3 with Vayne.

export const ALDRIC_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  ald_veterans_presence: {
    name: "Veteran's Presence", icon: "🎖️", tree: "tactics", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "[Holy Knight Units] DMG +0.6% | DEF +6 | SPD +6. (Passive)",
    effect: { type: "hk_triple_stat_bonus", dmgUp: 0.006, defBonus: 6, spdBonus: 6 },
    base: 0.006, perLevel: 0.006,
    maxLevelEffect: { dmgRangeMin: 1, dmgRangeMax: 1 },
    nextDesc: (lvl) => `[HK Units] DMG +${((0.006+lvl*0.006)*100).toFixed(1)}% | DEF +${6+lvl*6} | SPD +${6+lvl*6}${lvl >= 14 ? " | Max: Damage range +1-1" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  ald_stoic_hero: {
    name: "Stoic Hero", icon: "🧱", tree: "tactics", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "[Aldric] At the start of each round: 5% chance to gain Stun Immunity for that round. (Passive)",
    effect: { type: "per_round_stun_immune_chance", chance: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Each round: ${Math.round((0.05+lvl*0.05)*100)}% chance for Stun Immunity (permanent)`,
  },

  ald_strong_in_faith: {
    name: "Strong in My Faith", icon: "✝️", tree: "tactics", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "[Holy Knight Units] Recover 5% HP each round. (Passive)",
    effect: { type: "branch_heal_per_round", branch: "holyknights", healPct: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `[HK Units] Recover ${Math.round((0.05+lvl*0.05)*100)}% HP each round (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  ald_power_of_sun: {
    name: "Power of Sun", icon: "☀️", tree: "tactics", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "[Holy Knight Units] At Day: 4% chance to deal maximum damage. (Passive)",
    effect: { type: "day_max_dmg_chance", branch: "holyknights", chance: 0.04 },
    base: 0.04, perLevel: 0.04,
    maxLevelEffect: { hkHpBonus: 10 },
    nextDesc: (lvl) => `[HK Units] Day: ${Math.round((0.04+lvl*0.04)*100)}% chance for max damage${lvl >= 14 ? " | Max: HK Units HP +10" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // Round 4 only — single trigger
  ald_warriors_burden: {
    name: "Warrior's Burden", icon: "⚖️", tree: "tactics", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 99, offset: 4, duration: 1,
    desc: "[Round 4] [Aldric] FOC and SPD halved permanently | [HK Units] HP and DEF +3 permanently. (Round 4 only)",
    effect: { type: "self_sacrifice_for_army", cmdFocHalf: true, cmdSpdHalf: true, armyHpBonus: 3, armyDefBonus: 3, branch: "holyknights" },
    base: 3, perLevel: 3,
    nextDesc: (lvl) => `[Round 4] Aldric FOC & SPD halved | HK Units HP +${3+lvl*3} & DEF +${3+lvl*3} (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  ald_old_reliable: {
    name: "Old Reliable", icon: "⚔️", tree: "combat", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 20% Physical Damage (modified by ATK). (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_multi", targets: 2, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG (ATK mod) — rounds 3,6,9`,
  },

  // ── R3 — Shared with Vayne ────────────────────────────────────────────────
  // vay_commander_guidance, vay_protected_by_faith, vay_experienced_army

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  ald_here_we_go_again: {
    name: "Here We Go Again", icon: "🌙", tree: "tactics", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "[HK Units] At Night: DMG Received from COTN -1.5% | At Day (max level): DMG Dealt to COTN +10%. (Passive)",
    effect: { type: "day_night_faction_split", branch: "holyknights", nightResist: 0.015, dayBonus: 0.10, dayBonusVsFaction: "nightcreatures" },
    base: 0.015, perLevel: 0.015,
    maxLevelEffect: { dayDmgBonus: 0.10 },
    nextDesc: (lvl) => `Night: HK DMG Received from COTN -${((0.015+lvl*0.015)*100).toFixed(1)}%${lvl >= 14 ? " | Max: Day: HK DMG vs COTN +10%" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // Round 1 + 2CD → rounds 1, 4, 7, 10
  ald_last_ride: {
    name: "Last Ride", icon: "🐴", tree: "combat", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "[All Enemy Units] 30% Physical Damage (modified by ATK, prioritises Ranged). (Rounds 1, 4, 7, 10)",
    effect: { type: "aoe_physical_atk_mod", prioritise: "ranged", modifiedBy: "atk" },
    base: 0.30, perLevel: 0.30,
    nextDesc: (lvl) => `All enemies ${Math.round((0.30+lvl*0.30)*100)}% Physical DMG (ATK mod, Ranged first) — rounds 1,4,7,10`,
  },

  ald_promise_land: {
    name: "Promise Land", icon: "⬆️", tree: "combat", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "[Aldric] On damage received: +1.0 ATK permanently (max 6 stacks). (Passive)",
    effect: { type: "reactive_cmd_atk_stack", atkPerStack: 1.0, maxStacks: 6 },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `On hit received: +${1.0+lvl*1.0} ATK permanently (max 6 stacks/+${(1.0+lvl*1.0)*6} ATK total)`,
  },
};

export const ALDRIC_RESKIN_SKILLS = {};

// ── COMMANDER VAYNE (leader, Templar) ─────────────────────────────────────────
// ATK:130, FOC:30, SPD:55 — disciplined military leader. Front-loads damage
// rounds 1-2, anti-COTN specialist, stacking DEF. The calculated general.

export const VAYNE_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  // 1CD → rounds 2, 4, 6, 8, 10
  vay_commander_faith: {
    name: "Commander Faith", icon: "⚔️", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 1, offset: 2, duration: 1,
    desc: "[2 Enemy Units] 12% Physical Damage (modified by ATK). (Rounds 2, 4, 6, 8, 10)",
    effect: { type: "physical_damage_multi", targets: 2, modifiedBy: "atk" },
    base: 0.12, perLevel: 0.12,
    maxLevelEffect: { bonusDmg: 0.15, prioritise: "melee" },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.12+lvl*0.12)*100)}% Physical DMG (ATK mod)${lvl >= 14 ? " | Max: +15% bonus, prioritise Melee" : ""} — rounds 2,4,6,8,10`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  vay_silent_authority: {
    name: "Silent Authority", icon: "🎖️", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "[Holy Knight Units] Damage Dealt +3%. (Passive)",
    effect: { type: "branch_dmg_bonus", branch: "holyknights", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `[HK Units] DMG +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  vay_see_you: {
    name: "See You!", icon: "🎯", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit, prioritises Ranged] 60% Physical Damage (modified by ATK). (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_single", target: "prioritiseRanged", modifiedBy: "atk" },
    base: 0.60, perLevel: 0.60,
    nextDesc: (lvl) => `[Ranged priority] ${Math.round((0.60+lvl*0.60)*100)}% Physical DMG (ATK mod) — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  vay_commander_guidance: {
    name: "Commander Guidance", icon: "📜", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "[First 2 Rounds] [Allied Units] Damage Dealt +3.0%. (Passive)",
    effect: { type: "early_round_dmg_up", value: 0.03, maxRound: 2 },
    base: 0.03, perLevel: 0.03,
    maxLevelEffect: { stunImmunityWhileActive: true },
    nextDesc: (lvl) => `[Rounds 1-2] All allies DMG +${Math.round((0.03+lvl*0.03)*100)}%${lvl >= 14 ? " | Max: Stun Immune while active" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  vay_protected_by_faith: {
    name: "Protected by Faith", icon: "🙏", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit] 12% Physical Damage | [1 Allied Unit] Recovers 13% HP. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_and_heal", enemyDmg: 0.12, allyHeal: 0.13, modifiedBy: "atk" },
    base: 0.12, perLevel: 0.1214,
    nextDesc: (lvl) => {
      const dmg = Math.round((0.12+lvl*0.1214)*100);
      const heal = Math.round((0.13+lvl*0.1114)*100);
      return `1 enemy ${dmg}% Physical DMG | 1 ally heals ${heal}% HP — rounds 3,6,9`;
    },
  },

  vay_experienced_army: {
    name: "Experienced Army", icon: "🪖", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "[Allied Units] Damage Received from COTN Units -1.0%. (Passive)",
    effect: { type: "dmg_resist_vs_faction", faction: "nightcreatures", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `All allies DMG Received from COTN -${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  vay_will_of_templar: {
    name: "Will of the Templar", icon: "⚜️", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "[First 4 Rounds] [All Enemies] Damage Dealt -0.7% (modified by ATK). (Passive)",
    effect: { type: "enemy_dmg_down_early_atk", value: 0.007, maxRound: 4, modifiedBy: "atk" },
    base: 0.007, perLevel: 0.007,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `[Rounds 1-4] All enemies DMG -${((0.007+lvl*0.007)*100).toFixed(1)}% (ATK mod)${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // mou_anything_goes referenced in branch map

  vay_templars_guidance: {
    name: "Templar's Guidance", icon: "🛡️", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "[Allied Units] Focus Damage Received -6%. (Passive)",
    effect: { type: "dmg_type_resist_all", value: 0.06 },
    base: 0.06, perLevel: 0.06,
    nextDesc: (lvl) => `All allies Focus DMG Received -${Math.round((0.06+lvl*0.06)*100)}% (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  vay_horn_of_heavens: {
    name: "Horn of the Heavens", icon: "📯", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "[Commander and Allied Troops] [First 2 Rounds] Damage Dealt +1.4%. (Passive)",
    effect: { type: "early_round_dmg_up_all", value: 0.014, maxRound: 2 },
    base: 0.014, perLevel: 0.014,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `[Rounds 1-2] CMD and all troops DMG +${((0.014+lvl*0.014)*100).toFixed(1)}%${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  vay_find_the_opening: {
    name: "Find the Opening", icon: "💥", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "[Commander and Army] On hit: 7% chance to deal an additional 50% Physical Damage. (Passive)",
    effect: { type: "on_hit_bonus_dmg", chance: 0.07, bonusDmg: 0.50 },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `On hit: ${Math.round((0.07+lvl*0.07)*100)}% chance +50% Physical DMG (permanent)`,
  },

  vay_defense_in_numbers: {
    name: "Defense in Numbers", icon: "🏰", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "[Human Units] Once per round: 9% chance to gain DEF +5 (max 10 stacks). (Passive)",
    effect: { type: "per_round_def_stack", faction: "humans", chance: 0.09, defPerStack: 5, maxStacks: 10 },
    base: 0.09, perLevel: 0.09,
    nextDesc: (lvl) => `[Human Units] ${Math.round((0.09+lvl*0.09)*100)}% chance for DEF +5 each round (max 10 stacks/+50 DEF) (permanent)`,
  },
};

export const VAYNE_RESKIN_SKILLS = {};

// ── FRIAR BRENNAN (support, BattlePriest) ─────────────────────────────────────
// ATK:40, FOC:120, SPD:52 — PvE workhorse support. Heals, sustains, protects
// ranged units, anti-COTN passive. The human faction's go-to early/mid game pick.

export const BRENNAN_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  bre_heal_the_sick: {
    name: "Heal the Sick", icon: "✝️", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "[After Commander deals damage] [2 Allied Units] 4% chance to heal 5% HP. (Passive)",
    effect: { type: "post_attack_proc_heal", targets: 2, chance: 0.04, healPct: 0.05 },
    base: 0.04, perLevel: 0.04,
    maxLevelEffect: { focusBonus: 15 },
    nextDesc: (lvl) => `Post-attack: ${Math.round((0.04+lvl*0.04)*100)}% chance to heal 2 allies for ${Math.round((0.05+lvl*0.05)*100)}% HP${lvl >= 14 ? " | Max: FOC +15" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  bre_divine_protection: {
    name: "Divine Protection", icon: "🛡️", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Human Units] 10% chance to evade the next instance of damage this round. (Rounds 3, 6, 9)",
    effect: { type: "branch_evasion_first_hit", branch: "humans", chance: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `[Human Units] ${Math.round((0.10+lvl*0.10)*100)}% chance to evade next hit — rounds 3,6,9`,
  },

  bre_friars_advance: {
    name: "Friar's Advance", icon: "⚡", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "[All Allied Units] First 3 rounds: 8% chance to gain a follow-up attack. (Passive)",
    effect: { type: "ally_followup_chance_early", chance: 0.08, maxRound: 3 },
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `[Rounds 1–3] All allies ${Math.round((0.08+lvl*0.08)*100)}% chance for follow-up attack (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  bre_friars_blessing: {
    name: "Friar's Blessing", icon: "🌟", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Allied Units] Heals 12% HP | Targets gain +15% Defence for 2 rounds. (Rounds 3, 6, 9)",
    effect: { type: "heal_def_buff", targets: 2, healPct: 0.12, defBonus: 0.15, defDuration: 2 },
    base: 0.12, perLevel: 0.12,
    maxLevelEffect: { holyKnightHpBonus: 0.10 },
    nextDesc: (lvl) => `[2 Allies] ${Math.round((0.12+lvl*0.12)*100)}% HP + DEF +15% (2 rnd)${lvl >= 14 ? " | Max: HK Units HP +10%" : ""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // mou_protect_the_weak referenced in branch map

  bre_ranged_combat: {
    name: "Ranged Combat", icon: "🏹", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "[Allied Ranged Units] Damage Dealt +3%. (Passive)",
    effect: { type: "role_dmg_bonus", role: "ranged", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `[Allied Ranged Units] DMG +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  bre_patch_you_up: {
    name: "Patch You Up", icon: "🩹", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "[2 Allied Units] 40% chance to recover 4% HP when Physical Damage is sustained. (Passive)",
    effect: { type: "on_hit_heal_chance", targets: 2, chance: 0.40, healPct: 0.04 },
    base: 0.40, perLevel: 0.0143,
    maxLevelEffect: { guaranteedHeal: true },
    nextDesc: (lvl) => {
      const chance = Math.min(100, Math.round((0.40+lvl*0.0143)*100));
      const heal = Math.round((0.04+lvl*0.04)*100);
      return `[2 Allies] ${chance}% chance to heal ${heal}% HP when hit${lvl >= 14 ? " | Max: Guaranteed (100%)" : ""} (permanent)`;
    },
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  bre_cleanse: {
    name: "Cleanse", icon: "💧", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Allied Units] Recover 10% HP | 8% chance to remove 1 random debuff per unit. (Rounds 4, 8)",
    effect: { type: "heal_cleanse_all", healPct: 0.10, cleanseChance: 0.08 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `All allies ${Math.round((0.10+lvl*0.10)*100)}% HP + ${Math.round((0.08+lvl*0.08)*100)}% cleanse debuff — rounds 4,8`,
  },

  // Round 3 + 1CD → rounds 3, 5, 7, 9
  bre_hk_protector: {
    name: "Holy Knight's Protector", icon: "⛪", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 1, offset: 3, duration: 1,
    desc: "[Holy Knight Units] Recover 8% HP | 50% chance to activate a second time. (Rounds 3, 5, 7, 9)",
    effect: { type: "heal_double_chance", branch: "holyknights", healPct: 0.08, doubleChance: 0.50 },
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `[HK Units] ${Math.round((0.08+lvl*0.08)*100)}% HP + 50% chance to activate again — rounds 3,5,7,9`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  bre_peoples_hero: {
    name: "The People's Hero", icon: "👐", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "[All Allied Units] Damage Received -6% | Decays by 1/4 per hit sustained (gone after 4 hits). (Passive)",
    effect: { type: "decaying_dmg_reduce", value: 0.06, decayFraction: 0.25, maxHits: 4 },
    base: 0.06, perLevel: 0.06,
    maxLevelEffect: { decayFraction: 0.20, maxHits: 5 },
    nextDesc: (lvl) => `All allies DMG Received -${Math.round((0.06+lvl*0.06)*100)}%, decays 1/4 per hit (gone at hit 4)${lvl >= 14 ? " | Max: 1/5 decay, gone at hit 5" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // Round 8 only — single trigger
  bre_last_resort: {
    name: "Last Resort", icon: "🌅", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 99, offset: 8, duration: 1,
    desc: "[Round 8] [All Allied Units] Heal 50% HP. (Round 8 only)",
    effect: { type: "heal_all", healPct: 0.50 },
    base: 0.50, perLevel: 0.50,
    nextDesc: (lvl) => `All allies heal ${Math.round((0.50+lvl*0.50)*100)}% HP — Round 8 only`,
  },

  bre_target_practice: {
    name: "Target Practice", icon: "🎯", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "[Allied Ranged Units] Damage Dealt to Creature of the Night units +2%. (Passive)",
    effect: { type: "role_dmg_bonus_vs_faction", role: "ranged", bonusFaction: "nightcreatures", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `[Allied Ranged] DMG vs COTN +${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },
};

export const BRENNAN_RESKIN_SKILLS = {};

// ── HIGH WARDEN SERAPH (attacker, BattlePriest) ───────────────────────────────
// ATK:178, FOC:40, SPD:60 — righteous physical striker. Hits hard, heals allies,
// anti-COTN specialist. Shares mechanical DNA with Thaelor but holy-flavoured.

export const SERAPH_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  ser_heavens_hope: {
    name: "Heaven's Hope", icon: "☀️", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "passive",
    desc: "[Commander] Normal Attack Damage +2%. (Passive)",
    effect: { type: "cmd_normal_atk_bonus", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `Normal Attack DMG +${Math.round((0.02+lvl*0.02)*100)}%${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  ser_heavenly_practice: {
    name: "Heavenly Practice", icon: "⚔️", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "passive",
    desc: "[Commander] Normal Attacks deal an additional 10% Physical Damage. (Passive)",
    effect: { type: "cmd_normal_atk_bonus", value: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `Normal Attacks +${Math.round((0.10+lvl*0.10)*100)}% extra Physical Damage (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  ser_heavens_judgment: {
    name: "Heaven's Judgment", icon: "⚖️", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 20% Physical Damage (modified by ATK) | Apply Heal Block for 1 round. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_heal_block", targets: 2, healBlockDuration: 1, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG (ATK mod) + Heal Block 1 rnd — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  ser_heavens_hunter: {
    name: "Heaven's Hunter", icon: "🎯", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit] 30% Physical Damage | [1 Random COTN Enemy Unit] Additional 20% Physical Damage. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_faction_bonus", primaryDmg: 0.30, bonusDmg: 0.20, bonusFaction: "nightcreatures" },
    base: 0.30, perLevel: 0.30,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => {
      const p = Math.round((0.30+lvl*0.30)*100);
      const b = Math.round((0.20+lvl*0.20)*100);
      return `${p}% Physical DMG + ${b}% bonus vs COTN unit${lvl >= 14 ? " | Max: ATK +15" : ""} — rounds 3,6,9`;
    },
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  ser_heavens_blunt: {
    name: "Heaven's Blunt Instrument", icon: "🔨", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[1 Enemy Unit, prioritises Melee] 27% Physical Damage | 50% chance for additional 27% Physical Damage. (Rounds 4, 8)",
    effect: { type: "physical_damage_followup", target: "prioritiseMelee", initialDmg: 0.27, followupDmg: 0.27, followupChance: 0.50 },
    base: 0.27, perLevel: 0.2471,
    nextDesc: (lvl) => {
      const dmg = Math.round((0.27+lvl*0.2471)*100);
      return `[Melee priority] ${dmg}% + 50% chance ${dmg}% follow-up Physical DMG — rounds 4,8`;
    },
  },

  ser_heavens_protection: {
    name: "Heaven's Protection", icon: "🛡️", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "passive",
    desc: "[Commander and Allied Units] 10% chance to gain Stun Immunity for first 4 rounds. (Passive)",
    effect: { type: "stun_immunity_chance_early", chance: 0.10, maxRound: 4 },
    base: 0.10, perLevel: 0.0667,
    nextDesc: (lvl) => `${Math.round((0.10+lvl*0.0667)*100)}% chance for Stun Immunity (first 4 rounds) (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  ser_knowledge_of_heaven: {
    name: "Knowledge of Heaven", icon: "📖", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "passive",
    desc: "[Commander] Skill Damage +2.0% in combat. (Passive)",
    effect: { type: "skill_dmg_bonus", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `All active skill damage +${Math.round((0.02+lvl*0.02)*100)}%${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  ser_warriors_training: {
    name: "Warrior's Training", icon: "🎖️", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "passive",
    desc: "[Commander] First 4 skills activated each battle deal +5% extra damage. (Passive)",
    effect: { type: "first_skills_dmg_bonus", instances: 4, bonus: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `First 4 skills: +${Math.round((0.05+lvl*0.05)*100)}% extra damage (permanent)`,
  },

  // Round 1 + 2CD → rounds 1, 4, 7, 10
  ser_heavens_hammer: {
    name: "Heaven's Hammer", icon: "⚡", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "[Round 1] [1 Enemy Unit] 15% Physical Damage (modified by ATK) | Inflicts Stun for 1 round. (Rounds 1, 4, 7, 10)",
    effect: { type: "physical_damage_stun_guaranteed", target: "single", stunDuration: 1, modifiedBy: "atk" },
    base: 0.15, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((0.15+lvl*0.15)*100)}% Physical DMG (ATK mod) + guaranteed Stun — rounds 1,4,7,10`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  ser_blessed_judgement: {
    name: "Blessed Judgement", icon: "🌟", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[2 Enemy Units] 30% Physical Damage | [Holy Knight Allies] Heal 10% HP | Max: Melee Units +75% additional heal. (Rounds 4, 8)",
    effect: { type: "physical_damage_faction_heal", targets: 2, healFaction: "holyknights", healPct: 0.10, meleeBonusHeal: 0.75 },
    base: 0.30, perLevel: 0.30,
    maxLevelEffect: { meleeBonusHeal: 0.75 },
    nextDesc: (lvl) => {
      const dmg = Math.round((0.30+lvl*0.30)*100);
      const heal = Math.round((0.10+lvl*0.10)*100);
      return `[2 Units] ${dmg}% Physical DMG | HK Allies heal ${heal}% HP${lvl >= 14 ? " | Melee +75% extra heal" : ""} — rounds 4,8`;
    },
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // 1CD → rounds 2, 4, 6, 8, 10
  ser_smite: {
    name: "Smite", icon: "💥", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 1, offset: 2, duration: 1,
    desc: "[All Enemy Units] 20% Physical Damage (modified by ATK). (Rounds 2, 4, 6, 8, 10)",
    effect: { type: "aoe_physical_atk_mod", modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `All enemies ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG (ATK mod) — rounds 2,4,6,8,10`,
  },

  ser_divine_prayer: {
    name: "Divine Prayer", icon: "🙏", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "passive",
    desc: "[Commander] When debuffed: 3% chance to cleanse | On failed cleanse: [All Allied Units] DEF +15 (max 3 stacks). (Passive)",
    effect: { type: "reactive_cleanse_or_def_stack", cleanseChance: 0.03, defBonus: 15, maxStacks: 3 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `When debuffed: ${Math.round((0.03+lvl*0.03)*100)}% cleanse | On fail: All allies DEF +15 (max 3 stacks) (permanent)`,
  },
};

export const SERAPH_RESKIN_SKILLS = {};


// ── MANIACAL PRIEST DANTE (leader, Inquisitor) ────────────────────────────────
// ATK:45, FOC:145, SPD:62 — high FOC zealot leader. Double-edged buffs, chaos
// mechanics, COTN specialist, shared R3 with Mourne (The Wise / Got Ya / Protect the Weak).

export const DANTE_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  dan_mad_ruler: {
    name: "Mad Ruler", icon: "🕯️", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "passive",
    desc: "[All Units] Damage Dealt +2% | Damage Received +1%. (Passive)",
    effect: { type: "double_edge_dmg", dmgUp: 0.02, dmgReceivedUp: 0.01 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { holyKnightHpBonus: 10 },
    nextDesc: (lvl) => `All Units DMG +${Math.round((0.02+lvl*0.02)*100)}% | DMG Received +${Math.round((0.01+lvl*0.01)*100)}%${lvl >= 14 ? " | Max: HK Units HP +10" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  dan_whatever_it_takes: {
    name: "Whatever It Takes", icon: "🔥", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Allied Units] 7% chance to gain Confusion | [Enemy Units] 10% chance to gain Confusion. (Rounds 3, 6, 9)",
    effect: { type: "chaos_confusion", allyChance: 0.07, enemyChance: 0.10 },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `Allies ${Math.round((0.07+lvl*0.07)*100)}% Confusion | Enemies ${Math.round((0.10+lvl*0.10)*100)}% Confusion — rounds 3,6,9`,
  },

  dan_priests_prayer: {
    name: "Priest's Prayer", icon: "🙏", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "passive",
    desc: "[Holy Knight Units] 8% chance to deal maximum damage each round. (Passive)",
    effect: { type: "branch_max_dmg_chance", branch: "holyknights", chance: 0.08 },
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `[HK Units] ${Math.round((0.08+lvl*0.08)*100)}% chance for max damage each round (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  dan_erratic_eradication: {
    name: "Erratic Eradication", icon: "⚔️", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "passive",
    desc: "[HK Units] DMG +2% vs COTN | DMG Received +1% from Dragons, Orcs, Pirates & Bounty Hunters. (Passive)",
    effect: { type: "double_edge_faction", dmgUpVs: "nightcreatures", dmgUp: 0.02, dmgReceivedUpFrom: ["dragons","orcs","pirates","bountyhunters"], dmgReceivedUp: 0.01 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { hkDmgStatMin: 1, hkDmgStatMax: 3 },
    nextDesc: (lvl) => `HK DMG +${Math.round((0.02+lvl*0.02)*100)}% vs COTN | Received +${Math.round((0.01+lvl*0.01)*100)}% from Dragons/Orcs/Pirates/BH${lvl >= 14 ? " | Max: HK DMG stat +1-3" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  dan_do_you_believe: {
    name: "Do You Believe?", icon: "✝️", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "passive",
    desc: "[Holy Knight Units] Focus Damage Received -1%. (Passive)",
    effect: { type: "branch_focus_resist", branch: "holyknights", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `[HK Units] Focus DMG Received -${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  dan_healing_touch: {
    name: "Healing Touch", icon: "💚", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Human Allied Units] Heal 17% HP. (Rounds 3, 6, 9)",
    effect: { type: "heal_faction", faction: "humans", targets: 2, healPct: 0.17 },
    base: 0.17, perLevel: 0.17,
    nextDesc: (lvl) => `[2 Human Allies] Heal ${Math.round((0.17+lvl*0.17)*100)}% HP — rounds 3,6,9`,
  },

  // ── R3 — Shared with Mourne ───────────────────────────────────────────────
  // mou_the_wise, mou_got_ya, mou_protect_the_weak referenced in branch map

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  dan_commander_in_arms: {
    name: "Commander In Arms", icon: "🛡️", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "passive",
    desc: "[All Allied Units] 4% chance to evade Physical Damage from first 4 hits sustained. (Passive)",
    effect: { type: "unit_evasion_first_hits", chance: 0.04, maxHits: 4 },
    base: 0.04, perLevel: 0.04,
    maxLevelEffect: { focusBonus: 15 },
    nextDesc: (lvl) => `All allies ${Math.round((0.04+lvl*0.04)*100)}% evade Physical DMG (first 4 hits per unit)${lvl >= 14 ? " | Max: FOC +15" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  dan_power_drain: {
    name: "Power Drain", icon: "⬇️", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "passive",
    desc: "[Enemy Commander] ATK -7 at battle start, decreasing by 10 each round. (Passive)",
    effect: { type: "enemy_cmd_atk_drain", initialDrain: 7, decayPerRound: 10 },
    base: 7, perLevel: 7,
    nextDesc: (lvl) => `Enemy CMD ATK -${7+lvl*7} at start, -10 per round until gone (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  dan_maniacs_poison: {
    name: "Maniac's Poison", icon: "☠️", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 30% Poison Damage | Targets cannot recover HP for 2 rounds. (Rounds 3, 6, 9)",
    effect: { type: "poison_damage_heal_block", targets: 2, poisonDmg: 0.30, healBlockDuration: 2 },
    base: 0.30, perLevel: 0.30,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.30+lvl*0.30)*100)}% Poison DMG + Heal Block 2 rnd — rounds 3,6,9`,
  },
};

export const DANTE_RESKIN_SKILLS = {};

// ── GRAND INQUISITOR MOURNE (strategist, Inquisitor) ─────────────────────────
// ATK:182, FOC:20, SPD:58 — the Gandalf the White of human factions.
// Anti-COTN specialist, FOC stacker, AoE focus damage, reactive cleanse.
// Everyone playing humans wants this commander.

export const MOURNE_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  mou_will_of_inquisitor: {
    name: "Will of an Inquisitor", icon: "⚖️", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "passive",
    desc: "[First 4 Rounds] [All Enemies] Damage Dealt -1% (modified by FOC). (Passive)",
    effect: { type: "enemy_dmg_down_early_foc", value: 0.01, maxRound: 4, modifiedBy: "foc" },
    base: 0.01, perLevel: 0.01,
    maxLevelEffect: { focusBonus: 15 },
    nextDesc: (lvl) => `[Rounds 1–4] All enemies DMG -${Math.round((0.01+lvl*0.01)*100)}% (FOC mod)${lvl >= 14 ? " | Max: FOC +15" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  mou_anything_goes: {
    name: "Anything Goes", icon: "🌑", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "passive",
    desc: "[COTN Enemy Units] Damage Received +2.5%. (Passive)",
    effect: { type: "dmg_bonus_vs_faction", faction: "nightcreatures", value: 0.025 },
    base: 0.025, perLevel: 0.025,
    nextDesc: (lvl) => `COTN enemies take +${((0.025+lvl*0.025)*100).toFixed(1)}% more damage (permanent)`,
  },

  mou_inquisitors_protection: {
    name: "Inquisitor's Protection", icon: "🛡️", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "passive",
    desc: "[Allied Units] Focus and Poison Damage Received -3%. (Passive)",
    effect: { type: "dmg_type_resist_all", focusResist: 0.03, poisonResist: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `[All Allied Units] Focus & Poison DMG Received -${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  mou_the_wise: {
    name: "The Wise", icon: "🔮", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "passive",
    desc: "[After Commander attacks] 50% chance to deal 10% Focus Damage to 1 Enemy Unit. (Passive)",
    effect: { type: "post_attack_focus_dmg", chance: 0.50, value: 0.10 },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { focusBonus: 20 },
    nextDesc: (lvl) => `Post-attack: 50% chance ${Math.round((0.10+lvl*0.10)*100)}% Focus DMG${lvl >= 14 ? " | Max: FOC +20" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // Round 1 + 2CD → rounds 1, 4, 7, 10
  mou_got_ya: {
    name: "Got Ya", icon: "⚡", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "[Round 1] [1 Enemy Unit] 15% Focus Damage (modified by FOC) | Inflicts Stun for 1 round. (Rounds 1, 4, 7, 10)",
    effect: { type: "focus_damage_stun_guaranteed", target: "single", stunDuration: 1, modifiedBy: "foc" },
    base: 0.15, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((0.15+lvl*0.15)*100)}% Focus DMG (FOC mod) + guaranteed Stun — rounds 1,4,7,10`,
  },

  mou_protect_the_weak: {
    name: "Protect the Weak", icon: "🤲", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "passive",
    desc: "[All Human Units] Defence +2.0. (Passive)",
    effect: { type: "faction_def_bonus", factions: ["holyknights", "pirates", "bountyhunters"], value: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `[All Human Units] DEF +${2.0 + lvl * 2.0} (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  mou_inquisitors_domain: {
    name: "Inquisitor's Domain", icon: "👑", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "passive",
    desc: "[All Allied Units] First 3 instances: Damage Received -0.8% and Damage Dealt +0.8% (both modified by FOC). (Passive)",
    effect: { type: "dual_instance_buff_foc", instances: 3, dmgReduce: 0.008, dmgUp: 0.008, modifiedBy: "foc" },
    base: 0.008, perLevel: 0.008,
    maxLevelEffect: { extendToInstances: 4 },
    nextDesc: (lvl) => {
      const v = ((0.008+lvl*0.008)*100).toFixed(1);
      return `First 3 hits: DMG Received -${v}% & DMG Dealt +${v}% (FOC mod)${lvl >= 14 ? " | Max: extends to 4 instances" : ""} (permanent)`;
    },
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  mou_rally_inquisitors: {
    name: "Rally the Inquisitors", icon: "⚔️", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "passive",
    desc: "[Inquisitor Units] First 5 rounds: 5% chance for follow-up attack | 7% chance to gain permanent Stun Immunity. (Passive)",
    effect: { type: "inquisitor_rally", followupChance: 0.05, stunImmuneChance: 0.07, maxRound: 5 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => {
      const fu = Math.round((0.05+lvl*0.05)*100);
      const si = Math.round((0.07+lvl*0.07)*100);
      return `[Inquisitor Units] Rounds 1–5: ${fu}% follow-up | ${si}% permanent Stun Immunity (permanent)`;
    },
  },

  // Round 4 only — single trigger
  mou_last_hope: {
    name: "Last Hope", icon: "✝️", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "active", cooldown: 99, offset: 4, duration: 1,
    desc: "[Round 4] [All Inquisitor Units] Recover 50% HP | Cannot recover HP for the remainder of the fight. (Round 4 only)",
    effect: { type: "branch_heal_then_block", branch: "inquisitors", healPct: 0.50, permanentHealBlock: true },
    base: 0.50, perLevel: 0.50,
    nextDesc: (lvl) => `[Inquisitor Units] Recover ${Math.round((0.50+lvl*0.50)*100)}% HP then permanent heal block — Round 4 only`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  mou_mournes_special: {
    name: "Mourne's Special", icon: "🌟", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "passive",
    desc: "[Commander] Normal attacks deal 6% Focus Damage to ALL enemy units. (Passive)",
    effect: { type: "cmd_normal_atk_aoe_focus", value: 0.06 },
    base: 0.06, perLevel: 0.06,
    maxLevelEffect: { focusBonus: 15 },
    nextDesc: (lvl) => `Normal attacks: all enemies ${Math.round((0.06+lvl*0.06)*100)}% Focus DMG${lvl >= 14 ? " | Max: FOC +15" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  mou_battle_tactics: {
    name: "Battle Tactics", icon: "📜", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "passive",
    desc: "[All Enemies] Damage Received +3%. (Passive)",
    effect: { type: "vs_all_dmg_up", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `All enemies DMG Received +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  mou_cleansing_faith: {
    name: "Cleansing Faith", icon: "☀️", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "passive",
    desc: "[All Allied Units] Once per round: 6% chance to cleanse 1 debuff. (Passive)",
    effect: { type: "per_round_cleanse_chance", chance: 0.06 },
    base: 0.06, perLevel: 0.06,
    nextDesc: (lvl) => `Once per round: ${Math.round((0.06+lvl*0.06)*100)}% chance to cleanse 1 debuff from allies (permanent)`,
  },
};

export const MOURNE_RESKIN_SKILLS = {};


// ── Merged export ─────────────────────────────────────────────────────────────

export const HOLYKNIGHTS_SKILLS = {
  ...ALDRIC_UNIQUE_SKILLS,
  ...ALDRIC_RESKIN_SKILLS,
  ...VAYNE_UNIQUE_SKILLS,
  ...VAYNE_RESKIN_SKILLS,
  ...BRENNAN_UNIQUE_SKILLS,
  ...BRENNAN_RESKIN_SKILLS,
  ...SERAPH_UNIQUE_SKILLS,
  ...SERAPH_RESKIN_SKILLS,
  ...DANTE_UNIQUE_SKILLS,
  ...DANTE_RESKIN_SKILLS,
  ...MOURNE_UNIQUE_SKILLS,
  ...MOURNE_RESKIN_SKILLS,
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const HOLYKNIGHTS_BRANCH_SKILL_MAP = {
  // Brother Aldric (balanced, Templar)
  // Branch 0: passive unique (durable anchor), Branch 1: defense actives,
  // Branch 2: strongest unique (Sacred Bulwark), Branch 3: combat main + tactics sides
  h37: [
    { main: "ald_veterans_presence", sides: ["ald_stoic_hero",           "ald_strong_in_faith"]    }, // R0 top
    { main: "ald_power_of_sun",      sides: ["ald_warriors_burden",      "ald_old_reliable"]       }, // R0 bottom
    { main: "vay_commander_guidance",sides: ["vay_protected_by_faith",   "vay_experienced_army"]   }, // R3 shared
    { main: "ald_here_we_go_again",  sides: ["ald_last_ride",            "ald_promise_land"]       }, // R5
  ],
  // Commander Vayne (leader, Templar)
  h38: [
    { main: "vay_commander_faith",    sides: ["vay_silent_authority",    "vay_see_you"]            }, // R0 top
    { main: "vay_commander_guidance", sides: ["vay_protected_by_faith",  "vay_experienced_army"]   }, // R0 bottom
    { main: "vay_will_of_templar",    sides: ["mou_anything_goes",       "vay_templars_guidance"]  }, // R3
    { main: "vay_horn_of_heavens",    sides: ["vay_find_the_opening",    "vay_defense_in_numbers"] }, // R5
  ],
  // Friar Brennan (support, BattlePriest)
  h39: [
    { main: "bre_heal_the_sick",    sides: ["bre_divine_protection", "bre_friars_advance"]   }, // R0 top
    { main: "bre_friars_blessing",  sides: ["mou_protect_the_weak",  "bre_ranged_combat"]    }, // R0 bottom
    { main: "bre_patch_you_up",     sides: ["bre_cleanse",           "bre_hk_protector"]     }, // R3
    { main: "bre_peoples_hero",     sides: ["bre_last_resort",       "bre_target_practice"]  }, // R5
  ],
  // High Warden Seraph (attacker, BattlePriest)
  h40: [
    { main: "ser_heavens_hope",         sides: ["ser_heavenly_practice",  "ser_heavens_judgment"]   }, // R0 top
    { main: "ser_heavens_hunter",       sides: ["ser_heavens_blunt",      "ser_heavens_protection"] }, // R0 bottom
    { main: "ser_knowledge_of_heaven",  sides: ["ser_warriors_training",  "ser_heavens_hammer"]     }, // R3
    { main: "ser_blessed_judgement",    sides: ["ser_smite",              "ser_divine_prayer"]      }, // R5
  ],
  // Maniacal Priest Dante (leader, Inquisitor)
  h41: [
    { main: "dan_mad_ruler",           sides: ["dan_whatever_it_takes",  "dan_priests_prayer"]      }, // R0 top
    { main: "dan_erratic_eradication", sides: ["dan_do_you_believe",     "dan_healing_touch"]       }, // R0 bottom
    { main: "mou_the_wise",            sides: ["mou_got_ya",             "mou_protect_the_weak"]    }, // R3 shared
    { main: "dan_commander_in_arms",   sides: ["dan_power_drain",        "dan_maniacs_poison"]      }, // R5
  ],
  // Grand Inquisitor Mourne (strategist, Inquisitor)
  h42: [
    { main: "mou_will_of_inquisitor",  sides: ["mou_anything_goes",      "mou_inquisitors_protection"] }, // R0 top
    { main: "mou_the_wise",            sides: ["mou_got_ya",             "mou_protect_the_weak"]       }, // R0 bottom
    { main: "mou_inquisitors_domain",  sides: ["mou_rally_inquisitors",  "mou_last_hope"]              }, // R3
    { main: "mou_mournes_special",     sides: ["mou_battle_tactics",     "mou_cleansing_faith"]        }, // R5
  ],
};
