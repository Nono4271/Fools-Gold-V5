/* ─────────────────────────────────────────────────────────────────────────────
   dragons_skills.js — Dragons Faction Skills
   72 total: 12 unique skills per commander, no reskins
   6 commanders × 12 skills each

   Commanders:
     Emberclaw       (h11, balanced,   Adult)    — 12 unique
     Scaleveil Dusk  (h12, support,    Adult)    — 12 unique
     Ashen Kraul     (h23, leader,     Hatchling) — 12 unique
     Cinderfang      (h24, balanced,   Hatchling) — 12 unique
     Pyrewing Skar   (h35, attacker,   Elder)    — 12 unique
     Voidscale Nyxara(h36, strategist, Elder)    — 12 unique
───────────────────────────────────────────────────────────────────────────── */

// ── EMBERCLAW (balanced, Adult) ───────────────────────────────────────────────
// ATK:145, FOC:0, SPD:72 — adult dragon balanced. Burn uptime, anti-ranged,
// dragon sustain, siege utility. The seasoned predator who knows when to strike.

export const EMBERCLAW_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  emb_flame_dive: {
    name: "Flame Dive", icon: "🔥", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units, prioritises Ranged] 15% Physical Damage (ATK mod) | 45% chance to apply Burn. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_bleed", targets: 2, prioritise: "ranged", bleedChance: 0, burnChance: 0.45, burnDmgPenalty: 0.20, modifiedBy: "atk" },
    base: 0.15, perLevel: 0.15,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `[2 Units, Ranged first] ${Math.round((0.15+lvl*0.15)*100)}% Physical DMG (ATK mod) + 45% Burn${lvl >= 14 ? " | Max: ATK +15" : ""} — rounds 3,6,9`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  emb_dragon_toughness: {
    name: "Dragon Toughness", icon: "🛡️", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "passive",
    desc: "[Allied Dragon Units] Damage Received -2%. (Passive)",
    effect: { type: "branch_dmg_reduce", branch: "dragons", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `[Dragon Units] DMG Received -${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  emb_throwing_sand: {
    name: "Throwing Sand", icon: "🌶️", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "passive",
    desc: "[Each Round] Enemy units: 9% independent chance to gain Blind (guaranteed miss next attack). (Passive)",
    effect: { type: "per_round_blind_chance", chance: 0.09 },
    base: 0.09, perLevel: 0.09,
    nextDesc: (lvl) => `Each round: ${Math.round((0.09+lvl*0.09)*100)}% chance per enemy unit to gain Blind (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  emb_dragon_slash: {
    name: "Dragon Slash", icon: "⚔️", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit, prioritises Ranged] 30% Physical Damage (ATK mod). (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_single", target: "prioritiseRanged", modifiedBy: "atk" },
    base: 0.30, perLevel: 0.30,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `[Ranged priority] ${Math.round((0.30+lvl*0.30)*100)}% Physical DMG (ATK mod)${lvl >= 14 ? " | Max: ATK +15" : ""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  emb_dragon_spirit: {
    name: "Dragon Spirit", icon: "🐉", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Allied Dragon Units] 8% chance to gain a follow-up attack this round. (Rounds 3, 6, 9)",
    effect: { type: "faction_followup_per_round", faction: "dragons", chance: 0.08 },
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `[Dragon Units] ${Math.round((0.08+lvl*0.08)*100)}% chance for follow-up — rounds 3,6,9`,
  },

  emb_flame_dancer: {
    name: "Flame Dancer", icon: "💃", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "passive",
    desc: "[Commander] While any enemy is burning: ATK +2.0. (Passive)",
    effect: { type: "conditional_cmd_atk_while_burn", value: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `While any enemy burns: CMD ATK +${2.0+lvl*2.0} (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  emb_fire_volley: {
    name: "Fire Volley", icon: "💣", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[5 Random Enemy Units] 8% damage each | 20% chance to apply Burn per hit. (Rounds 4, 8)",
    effect: { type: "multi_hit_random_burn_chance", hits: 5, dmgPct: 0.08, burnChance: 0.20 },
    base: 0.08, perLevel: 0.008,
    maxLevelEffect: { bonusHitVsWizard: true },
    nextDesc: (lvl) => `5 random hits x ${Math.round((0.08+lvl*0.008)*100)}% + 20% Burn per hit${lvl >= 14 ? " | Max: +1 hit vs Wizard unit" : ""} — rounds 4,8`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // 1CD → rounds 2, 4, 6, 8, 10
  emb_cauterize: {
    name: "Cauterize", icon: "🩹", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 1, offset: 2, duration: 1,
    desc: "[Commander] 6% chance to cleanse 1 random debuff at round start. (Rounds 2, 4, 6, 8, 10)",
    effect: { type: "reactive_cleanse_chance", chance: 0.06 },
    base: 0.06, perLevel: 0.065,
    nextDesc: (lvl) => `Round start: ${Math.min(100,Math.round((0.06+lvl*0.065)*100))}% chance to cleanse 1 debuff — rounds 2,4,6,8,10`,
  },

  // 2CD → rounds 3, 6, 9
  emb_dragons_evasion: {
    name: "Dragon's Evasion", icon: "💨", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Dragon Units] 10% chance to evade the next instance of damage this round. (Rounds 3, 6, 9)",
    effect: { type: "branch_evasion_first_hit", branch: "dragons", chance: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `[Dragon Units] ${Math.round((0.10+lvl*0.10)*100)}% chance to evade next hit — rounds 3,6,9`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  emb_embers_entertainment: {
    name: "Ember's Entertainment", icon: "🎭", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "passive",
    desc: "[Commander] Normal Attacks deal 6% Burn Damage (ATK mod) to ALL enemies. (Passive)",
    effect: { type: "cmd_normal_atk_aoe_burn", value: 0.06 },
    base: 0.06, perLevel: 0.06,
    maxLevelEffect: { normalAtkBurnChance: 0.15 },
    nextDesc: (lvl) => `Normal attacks: all enemies ${Math.round((0.06+lvl*0.06)*100)}% Burn DMG (ATK mod)${lvl >= 14 ? " | Max: 15% chance to apply Burn per hit" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // Round 8 only — single trigger
  emb_dragons_hope: {
    name: "Dragon's Hope", icon: "🌅", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 99, offset: 8, duration: 1,
    desc: "[Dragon Units] Heal 50% HP. (Round 8 only)",
    effect: { type: "heal_branch", branch: "dragons", healPct: 0.50 },
    base: 0.50, perLevel: 0.50,
    nextDesc: (lvl) => `[Dragon Units] Heal ${Math.round((0.50+lvl*0.50)*100)}% HP — Round 8 only`,
  },

  emb_bring_down_walls: {
    name: "Bring Down the Walls", icon: "🏰", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "passive",
    desc: "[Army] Siege +3. (Passive)",
    effect: { type: "army_siege_bonus", value: 3 },
    base: 3, perLevel: 3,
    nextDesc: (lvl) => `Army Siege +${3+lvl*3} (permanent)`,
  },
};

export const EMBERCLAW_RESKIN_SKILLS = {};

// ── SCALEVEIL DUSK (support, Adult) ──────────────────────────────────────────
// ATK:50, FOC:140, SPD:80 — shadow-scale healer/debuffer. High FOC; AOE focus
// blasts, selective healing, world-map specialist (siege, gathering, march).
// 12 unique skills, no reskins.

export const SCALEVEIL_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (2CD → rounds 3, 6, 9) ─────────────────────────────────
  scaleveil_back_line_healer: {
    name: "Back Line Healer", icon: "💚", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Allied Units] Recover 5% HP. [Dragon Units] Recover an additional 25% HP. (Rounds 3, 6, 9)",
    effect: { type: "heal_two_units_dragon_bonus", healPct: 0.05, dragonBonusPct: 0.25, targets: 2 },
    base: 0.05, perLevel: 0.05,
    maxLevelEffect: { dragonHpBonus: 10 },
    nextDesc: (lvl) => `[2 Allied Units] Recover ${Math.round((0.05+lvl*0.05)*100)}% HP | Dragon Units +25% extra${lvl >= 14 ? " | Max: Dragon Units HP +10" : ""} — rounds 3,6,9`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  scaleveil_sniper: {
    name: "Sniper", icon: "🎯", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit, prioritises Ranged] 20% Focus Damage (FOC mod). (Rounds 3, 6, 9)",
    effect: { type: "focus_damage_single", target: "prioritiseRanged", modifiedBy: "foc" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[Ranged priority] ${Math.round((0.20+lvl*0.20)*100)}% Focus DMG (FOC mod) — rounds 3,6,9`,
  },

  scaleveil_fire_in_the_hole: {
    name: "Fire in the Hole", icon: "💣", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "passive",
    desc: "[Army] Siege +1. (Passive)",
    effect: { type: "army_siege_bonus", value: 1 },
    base: 1, perLevel: 1,
    nextDesc: (lvl) => `Army Siege +${1+lvl*1} (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  scaleveil_hunter: {
    name: "Hunter", icon: "🏹", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "passive",
    desc: "[CMD & Army] When attacking an unowned tile: DMG +1.0%. (Passive) Max Level: DMG Received -10% on unowned tiles.",
    effect: { type: "neutral_tile_dmg_bonus", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    maxLevelEffect: { neutralDmgReceivedDown: 0.10 },
    nextDesc: (lvl) => `Unowned tile: DMG +${Math.round((0.01+lvl*0.01)*100)}%${lvl >= 14 ? " | Max: DMG Received -10% on unowned tiles" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  scaleveil_gatherer: {
    name: "Gatherer", icon: "🌾", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "passive",
    desc: "[Army] Resources gained from gathering +5%. (Non-Combat Passive)",
    effect: { type: "gathering_bonus", value: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Gathering yield +${Math.round((0.05+lvl*0.05)*100)}% (permanent)`,
  },

  scaleveil_pather: {
    name: "Pather", icon: "🐾", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "passive",
    desc: "[Army] March Speed +3%. (Non-Combat Passive)",
    effect: { type: "march_speed_bonus", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `March Speed +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // ── R3 — Main (2CD → rounds 1, 4, 7, 10) ─────────────────────────────────
  scaleveil_smoke_and_fire: {
    name: "Smoke and Fire", icon: "🌑", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "[All Enemy Units] 3% chance each to inflict Blind or Burn for 1 round. (Rounds 1, 4, 7, 10)",
    effect: { type: "aoe_blind_or_burn_chance", chance: 0.03, duration: 1 },
    base: 0.03, perLevel: 0.0329,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `All enemies: ${Math.round((0.03+lvl*0.0329)*100)}% chance Blind or Burn (1 rnd)${lvl >= 14 ? " | Max: ATK +15" : ""} — rounds 1,4,7,10`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  scaleveil_dragon_garrison: {
    name: "Dragon Garrison", icon: "🛡️", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "passive",
    desc: "[Allied Dragon Units] DEF +3. (Passive)",
    effect: { type: "branch_flat_def_bonus", branch: "dragons", value: 3 },
    base: 3, perLevel: 3,
    nextDesc: (lvl) => `[Dragon Units] DEF +${3+lvl*3} (permanent)`,
  },

  scaleveil_the_superior_race: {
    name: "The Superior Race", icon: "👑", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "passive",
    desc: "[Allied Dragon Units] DMG +1.0% vs Human alignment units. (Passive)",
    effect: { type: "branch_dmg_bonus_vs_alignment", branch: "dragons", alignment: "humans", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `[Dragon Units] DMG +${Math.round((0.01+lvl*0.01)*100)}% vs Human units (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  scaleveil_to_become_an_elder: {
    name: "To Become an Elder", icon: "🌙", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "passive",
    desc: "[Commander] FOC +1.0, ATK -1.0 (Pre-Battle). Max Level: Dragon Units gain Confusion Immunity.",
    effect: { type: "cmd_foc_up_atk_down_passive", focPerLevel: 1.0, atkDownPerLevel: 1.0 },
    base: 1.0, perLevel: 1.0,
    maxLevelEffect: { dragonConfusionImmunity: true },
    nextDesc: (lvl) => `CMD FOC +${1.0+lvl*1.0} | CMD ATK -${1.0+lvl*1.0}${lvl >= 14 ? " | Max: Dragon Units Confusion Immune" : ""} (permanent)`,
  },

  // ── R5 — Sides (3CD → rounds 4, 8) ───────────────────────────────────────
  scaleveil_locked_in: {
    name: "Locked In", icon: "🔒", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 3, offset: 4, duration: 2,
    desc: "[Dragon Units] DMG +3% for 2 rounds. (Rounds 4, 8)",
    effect: { type: "branch_dmg_up_duration", branch: "dragons", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `[Dragon Units] DMG +${Math.round((0.03+lvl*0.03)*100)}% (2 rnd) — rounds 4,8`,
  },

  scaleveil_dusks_blast: {
    name: "Dusk's Blast", icon: "💥", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Enemies] 80% Focus Damage (FOC mod). (Rounds 4, 8)",
    effect: { type: "aoe_focus_damage_foc_mod", modifiedBy: "foc" },
    base: 0.80, perLevel: 0.80,
    nextDesc: (lvl) => `All enemies ${Math.round((0.80+lvl*0.80)*100)}% Focus DMG (FOC mod) — rounds 4,8`,
  },
};

export const SCALEVEIL_RESKIN_SKILLS = {};

// ── ASHEN KRAUL (leader, Hatchling) ──────────────────────────────────────────
// ATK:78, FOC:0, SPD:68 — scrappy Hatchling leader. Mixed-troop specialist,
// early-round damage surge, wizard-hunter, all-Dragon army payoff.
// 12 unique skills, no reskins.

export const KRAUL_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  kraul_ill_work_with_it: {
    name: "I'll Work With It", icon: "🤝", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "passive",
    desc: "[Dragonkin Units] DEF +2.0. [Drake Rider Units] DMG +1.0%. (Passive)",
    effect: { type: "dual_branch_stat_bonus", branch1: "dragonkin", branch1Stat: "def", branch1Value: 2.0, branch2: "drake_riders", branch2Stat: "dmg", branch2Value: 0.01 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `[Dragonkin] DEF +${2.0+lvl*2.0} | [Drake Riders] DMG +${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  kraul_fire_fight: {
    name: "Fire Fight", icon: "🔥", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "passive",
    desc: "[Allied Units] On attack: 5% chance to inflict +40% extra damage. (Passive)",
    effect: { type: "on_attack_bonus_dmg_chance", chance: 0.05, bonusDmg: 0.40 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `On attack: ${Math.round((0.05+lvl*0.05)*100)}% chance +40% extra DMG (permanent)`,
  },

  kraul_tough_scales: {
    name: "Tough Scales", icon: "🛡️", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "passive",
    desc: "[Allied Dragon Units] Physical Damage Received -1.0%. (Passive)",
    effect: { type: "branch_phys_dmg_reduce", branch: "dragons", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `[Dragon Units] Physical DMG Received -${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  kraul_im_in_command: {
    name: "I'm in Command", icon: "📜", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "passive",
    desc: "[First 2 Rounds] [Allied Units] Damage Dealt +3.0%. (Passive)",
    effect: { type: "early_round_dmg_up", value: 0.03, maxRound: 2 },
    base: 0.03, perLevel: 0.03,
    maxLevelEffect: { stunImmunityWhileActive: true },
    nextDesc: (lvl) => `[Rounds 1-2] All allies DMG +${Math.round((0.03+lvl*0.03)*100)}%${lvl >= 14 ? " | Max: Stun Immune while active" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  kraul_hit_and_recover: {
    name: "Hit and Recover", icon: "🙏", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit] 12% Physical Damage (ATK mod) | [1 Allied Unit] Recovers 13% HP. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_and_heal", enemyDmg: 0.12, allyHeal: 0.13, modifiedBy: "atk" },
    base: 0.12, perLevel: 0.1214,
    nextDesc: (lvl) => {
      const dmg = Math.round((0.12+lvl*0.1214)*100);
      const heal = Math.round((0.13+lvl*0.1114)*100);
      return `1 enemy ${dmg}% Physical DMG | 1 ally heals ${heal}% HP — rounds 3,6,9`;
    },
  },

  kraul_men_with_hats: {
    name: "Men with Hats", icon: "🪖", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "passive",
    desc: "[Allied Units] Damage Received from Wizard Units -1.0%. (Passive)",
    effect: { type: "dmg_resist_vs_faction", faction: "bountyhunters", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `All allies DMG Received from Wizards -${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },

  // ── R3 — Main (1CD → rounds 2, 4, 6, 8, 10) ──────────────────────────────
  kraul_energetic_youngking: {
    name: "Energetic Youngking", icon: "⚔️", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 1, offset: 2, duration: 1,
    desc: "[2 Enemy Units] 12% Physical Damage (modified by ATK). (Rounds 2, 4, 6, 8, 10)",
    effect: { type: "physical_damage_multi", targets: 2, modifiedBy: "atk" },
    base: 0.12, perLevel: 0.12,
    maxLevelEffect: { bonusDmg: 0.15, prioritise: "melee" },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.12+lvl*0.12)*100)}% Physical DMG (ATK mod)${lvl >= 14 ? " | Max: +15% bonus, prioritise Melee" : ""} — rounds 2,4,6,8,10`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  kraul_despite_my_age: {
    name: "Despite my Age", icon: "🐉", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "passive",
    desc: "[Allied Dragon Units] Damage Dealt +3%. (Passive)",
    effect: { type: "branch_dmg_bonus", branch: "dragons", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `[Dragon Units] DMG +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  kraul_bad_pointy_hats: {
    name: "Bad Pointy Hats", icon: "🧙", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit, prioritises Wizard units] 60% Physical Damage (modified by ATK). (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_single", target: "prioritiseWizard", modifiedBy: "atk" },
    base: 0.60, perLevel: 0.60,
    nextDesc: (lvl) => `[Wizard priority] ${Math.round((0.60+lvl*0.60)*100)}% Physical DMG (ATK mod) — rounds 3,6,9`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  kraul_future_king: {
    name: "Future King", icon: "👑", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "passive",
    desc: "[If All Allied Units are Dragons] CMD ATK +2.0. (Passive)",
    effect: { type: "all_dragon_army_cmd_atk", value: 2.0 },
    base: 2.0, perLevel: 2.0,
    maxLevelEffect: { dragonDmgRangeMin: 2, dragonDmgRangeMax: 3 },
    nextDesc: (lvl) => `[All-Dragon army] CMD ATK +${2.0+lvl*2.0}${lvl >= 14 ? " | Max: Dragon Units DMG +2-3" : ""} (permanent)`,
  },

  // ── R5 — Sides (2CD → rounds 3, 6, 9) ────────────────────────────────────
  kraul_on_the_prowl: {
    name: "Kraul on the Prowl", icon: "💥", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemy Units] 40% Physical Damage | 40% chance to Stun for 1 round. (Rounds 3, 6, 9)",
    effect: { type: "aoe_physical_stun_chance", stunChance: 0.40, stunDuration: 1 },
    base: 0.40, perLevel: 0.40,
    nextDesc: (lvl) => `All enemies ${Math.round((0.40+lvl*0.40)*100)}% Physical DMG + 40% Stun (1 rnd) — rounds 3,6,9`,
  },

  // Round 2 then 2CD → rounds 3, 6, 9 (offset:3 after first shot on round 2... handled as offset:2, cd:2 → rounds 2,4,6,8,10... actually: round 2 start then cd2 = rounds 2,5,8; clarified as offset:3, cd:2 → rounds 3,6,9 with first fire round 2)
  // Per design: [Round 2] then cooldown 2, offset 3 → fires round 2 then rounds 3,6,9
  kraul_nose_dive: {
    name: "Nose Dive", icon: "🦅", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "[1 Enemy Unit with lowest DEF] 70% Physical Damage (ATK mod). (Rounds 2, 4, 6, 8, 10)",
    effect: { type: "physical_damage_single", target: "lowestDef", modifiedBy: "atk" },
    base: 0.70, perLevel: 0.70,
    nextDesc: (lvl) => `[Lowest DEF unit] ${Math.round((0.70+lvl*0.70)*100)}% Physical DMG (ATK mod) — rounds 2,4,6,8,10`,
  },
};

export const KRAUL_RESKIN_SKILLS = {};

// ── CINDERFANG (balanced, Hatchling) ──────────────────────────────────────────
// ATK:100, FOC:0, SPD:58 — Drake Rider specialist balanced. Mounted synergy,
// reactive dragon stacks, fire status application, buff-stripping.
// 12 unique skills, no reskins.

export const CINDERFANG_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  cinderfang_dragon_rider: {
    name: "Dragon Rider", icon: "🐉", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "passive",
    desc: "[Drake Rider Units] Each time damage is received: DMG +2-3 (max 4 stacks). (Passive)",
    effect: { type: "reactive_branch_dmg_range_stack", branch: "drake_riders", dmgMin: 2, dmgMax: 3, maxStacks: 4 },
    base: 2, perLevel: 0,
    nextDesc: () => `[Drake Riders] On damage received: DMG +2-3 (max 4 stacks/+8-12 total) (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  cinderfang_drake_master: {
    name: "Drake Master", icon: "🐾", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "passive",
    desc: "[Drake Rider Units] Damage Dealt +2%. (Passive)",
    effect: { type: "branch_dmg_bonus", branch: "drake_riders", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `[Drake Riders] DMG +${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  cinderfang_me_and_my_dragons: {
    name: "Me and My Dragons", icon: "🐲", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "passive",
    desc: "[If all units are Drake Riders] [Drake Rider Units] All stats +1.0%. (Passive)",
    effect: { type: "all_branch_army_bonus", branch: "drake_riders", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `[All-Drake Rider army] Drake Riders: all stats +${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  cinderfang_mounted_specialist: {
    name: "Mounted Specialist", icon: "🐺", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "passive",
    desc: "[Mounted Units] Damage +0.6% upon inflicting damage (modified by SPD), up to 3 stacks. (Passive)",
    effect: { type: "mounted_atk_stack_spd", valuePerStack: 0.006, maxStacks: 3, modifiedBy: "spd" },
    base: 0.006, perLevel: 0.006,
    maxLevelEffect: { mountedHpBonus: 15 },
    nextDesc: (lvl) => `[Mounted] DMG +${((0.006+lvl*0.006)*100).toFixed(1)}% per stack (SPD mod, 3 stacks max)${lvl >= 14 ? " | Max: Mounted Units HP +15" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // Round 3 only — single trigger
  cinderfang_frontline_medic: {
    name: "Frontline Medic", icon: "🩹", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "active", cooldown: 99, offset: 3, duration: 1,
    desc: "[Mounted Units] Heals 50% HP. Triggers Round 3 only.",
    effect: { type: "heal_branch", branch: "mounted", healPct: 0.50 },
    base: 0.50, perLevel: 0.50,
    nextDesc: (lvl) => `[Mounted Units] Heal ${Math.round((0.50+lvl*0.50)*100)}% HP — Round 3 only`,
  },

  cinderfang_mounted_armor: {
    name: "Mounted Armor", icon: "🛡️", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "passive",
    desc: "[Mounted Units] Damage Received -2.5%. (Passive)",
    effect: { type: "branch_dmg_reduce", branch: "mounted", value: 0.025 },
    base: 0.025, perLevel: 0.025,
    nextDesc: (lvl) => `[Mounted Units] DMG Received -${((0.025+lvl*0.025)*100).toFixed(1)}% (permanent)`,
  },

  // ── R3 — Main (2CD → rounds 3, 6, 9) ─────────────────────────────────────
  cinderfang_i_can_help: {
    name: "I Can Help", icon: "🔥", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 10% Physical Damage | 35% chance to apply Burn. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_multi_burn_chance", targets: 2, burnChance: 0.35, burnDmgPenalty: 0.20 },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { burnChance: 0.50 },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.10+lvl*0.10)*100)}% Physical DMG + 35% Burn${lvl >= 14 ? " | Max: Burn → 50%" : ""} — rounds 3,6,9`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  cinderfang_me_little_army_big: {
    name: "Me Little, Army Big", icon: "💪", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "passive",
    desc: "[Allied Dragon Units] HP +1 | DEF +1. (Passive)",
    effect: { type: "branch_flat_hp_def_bonus", branch: "dragons", hpValue: 1, defValue: 1 },
    base: 1, perLevel: 1,
    nextDesc: (lvl) => `[Dragon Units] HP +${1+lvl*1} | DEF +${1+lvl*1} (permanent)`,
  },

  // 3CD → rounds 4, 8
  cinderfang_dont_underestimate_me: {
    name: "Don't Underestimate Me", icon: "😤", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[1 Enemy Unit] 40% Physical Damage | 45% chance to inflict Confusion. (Rounds 4, 8)",
    effect: { type: "physical_damage_confusion_chance", confusionChance: 0.45, confusionDuration: 1 },
    base: 0.40, perLevel: 0.40,
    nextDesc: (lvl) => `${Math.round((0.40+lvl*0.40)*100)}% Physical DMG + 45% Confusion (1 rnd) — rounds 4,8`,
  },

  // ── R5 — Main (3CD → rounds 4, 8) ────────────────────────────────────────
  cinderfang_clear_the_air: {
    name: "Clear the Air", icon: "🌬️", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[Round Start] 4% chance to remove all positive stat buffs from the Enemy Army. (Rounds 4, 8)",
    effect: { type: "aoe_enemy_buff_strip_chance", chance: 0.04 },
    base: 0.04, perLevel: 0.04,
    maxLevelEffect: { dragonHpBonus: 15 },
    nextDesc: (lvl) => `Round start: ${Math.round((0.04+lvl*0.04)*100)}% chance to strip all enemy buffs${lvl >= 14 ? " | Max: Dragon Units HP +15" : ""} — rounds 4,8`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  cinderfang_focused: {
    name: "Focused", icon: "🧘", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "passive",
    desc: "[Commander] Round Start: 7% chance to gain Confusion Immunity. (Passive)",
    effect: { type: "per_round_confusion_immune_chance", chance: 0.07 },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `Round start: ${Math.min(100,Math.round((0.07+lvl*0.07)*100))}% chance Confusion Immunity (permanent)`,
  },

  cinderfang_you_get_a_heal: {
    name: "You Get a Heal!", icon: "💚", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "passive",
    desc: "[Allied Dragon Units] Heal 6% HP whenever inflicted with a debuff (max once per round). (Passive)",
    effect: { type: "branch_heal_on_debuff", branch: "dragons", healPct: 0.06, maxPerRound: 1 },
    base: 0.06, perLevel: 0.06,
    nextDesc: (lvl) => `[Dragon Units] Heal ${Math.round((0.06+lvl*0.06)*100)}% HP on debuff received (max 1/round) (permanent)`,
  },
};

export const CINDERFANG_RESKIN_SKILLS = {};

// ── PYREWING SKAR (attacker, Elder) ───────────────────────────────────────────
// ATK:190, FOC:0, SPD:55 — apex dragon destroyer. Burn, bleed, anti-wizard,
// thorns reflect, dragon buff. The apocalypse on wings.

export const SKAR_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  skar_earthquake: {
    name: "Earthquake", icon: "🌋", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] 12% Physical Damage | 50% chance to apply Slow (-20 SPD, 1 rnd). (Rounds 3, 6, 9)",
    effect: { type: "aoe_physical_slow", slowChance: 0.50, slowValue: 20, slowDuration: 1 },
    base: 0.12, perLevel: 0.12,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.12+lvl*0.12)*100)}% Physical DMG + 50% Slow (-20 SPD, 1 rnd)${lvl >= 14 ? " | Max: ATK +15" : ""} — rounds 3,6,9`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  skar_dragon_fire: {
    name: "Dragon Fire", icon: "🔥", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 10% chance to inflict Burn. (Rounds 3, 6, 9)",
    effect: { type: "burn_apply_only", targets: 2, burnChance: 0.10, burnDmgPenalty: 0.20 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.10+lvl*0.10)*100)}% chance to apply Burn — rounds 3,6,9`,
  },

  skar_charred: {
    name: "Charred", icon: "🪵", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "passive",
    desc: "[Commander] +3% damage to enemies suffering from Burn. (Passive)",
    effect: { type: "cmd_dmg_bonus_vs_burn", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `CMD DMG +${Math.round((0.03+lvl*0.03)*100)}% vs burning targets (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  skar_dragon_claw: {
    name: "Dragon Claw", icon: "🐉", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit] 20% Physical Damage (ATK mod) | 40% chance to inflict Bleed. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_bleed", target: "single", bleedChance: 0.40, bleedDmg: 0.30, bleedDuration: 2, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    maxLevelEffect: { armyDmgVsBleedOrBurn: 0.10 },
    nextDesc: (lvl) => `${Math.round((0.20+lvl*0.20)*100)}% Physical DMG (ATK mod) + 40% Bleed${lvl >= 14 ? " | Max: Army +10% DMG vs Bleed/Burn targets" : ""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  skar_wizards_worst_nightmare: {
    name: "Wizard's Worst Nightmare", icon: "🧙", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit] 30% Physical Damage | [1 Random Wizard Enemy Unit] Additional 20% Physical Damage. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_faction_bonus", primaryDmg: 0.30, bonusDmg: 0.20, bonusFaction: "bountyhunters" },
    base: 0.30, perLevel: 0.30,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => {
      const p = Math.round((0.30+lvl*0.30)*100);
      const b = Math.round((0.20+lvl*0.20)*100);
      return `${p}% Physical DMG + ${b}% bonus vs Wizard unit${lvl >= 14 ? " | Max: ATK +15" : ""} — rounds 3,6,9`;
    },
  },

  // 3CD → rounds 4, 8
  skar_dragons_rage: {
    name: "Dragon's Rage", icon: "💥", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
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
  // 2CD → rounds 3, 6, 9
  skar_dragon_snack: {
    name: "Dragon Snack", icon: "🍖", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 20% Physical Damage (ATK mod) | Melee units take +50% additional damage. (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_multi_melee_bonus", targets: 2, meleeBonusDmg: 0.50, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG (ATK mod) | Melee +50% extra${lvl >= 14 ? " | Max: ATK +15" : ""} — rounds 3,6,9`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  skar_dragon_scales: {
    name: "Dragon Scales", icon: "🦎", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "passive",
    desc: "[Dragon Units] At battle start: 7% chance to gain Poison/Venom Immunity. (Passive)",
    effect: { type: "branch_battle_start_immunity", branch: "dragons", immunity: ["poison","venom"], chance: 0.07 },
    base: 0.07, perLevel: 0.1386,
    nextDesc: (lvl) => `[Dragon Units] Battle start: ${Math.min(100,Math.round((0.07+lvl*0.1386)*100))}% chance for Poison/Venom Immunity (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  skar_fire_blast: {
    name: "Fire Blast", icon: "💨", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 30% Burn-type Physical Damage (ATK mod). (Rounds 3, 6, 9)",
    effect: { type: "physical_damage_multi", targets: 2, modifiedBy: "atk", damageType: "burn" },
    base: 0.30, perLevel: 0.30,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.30+lvl*0.30)*100)}% Burn-type Physical DMG (ATK mod) — rounds 3,6,9`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  skar_dragon_inferno: {
    name: "Dragon Inferno", icon: "🌋", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy Unit] 40% Burn Damage (ATK mod) | 50% chance to apply Burn. (Rounds 3, 6, 9)",
    effect: { type: "burn_damage_atk_mod", target: "single", burnChance: 0.50, burnDmgPenalty: 0.20, modifiedBy: "atk" },
    base: 0.40, perLevel: 0.40,
    maxLevelEffect: { enemyBurnDmgReceivedUp: 0.05 },
    nextDesc: (lvl) => `${Math.round((0.40+lvl*0.40)*100)}% Burn DMG (ATK mod) + 50% Burn${lvl >= 14 ? " | Max: Enemies receive +5% Burn DMG" : ""} — rounds 3,6,9`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  skar_dragons_roar: {
    name: "Dragon's Roar", icon: "📣", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[2 Enemy Units] 10% chance to Stun for 1 round. (Rounds 4, 8)",
    effect: { type: "stun_chance", targets: 2, chance: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `[2 Enemy Units] ${Math.round((0.10+lvl*0.10)*100)}% chance to Stun (1 rnd) — rounds 4,8`,
  },

  skar_tough_skin: {
    name: "Tough Skin", icon: "🦏", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "passive",
    desc: "[Enemy Units] When attacking Dragon units with Physical Damage: Take 1% damage. (Passive)",
    effect: { type: "thorns_physical", branch: "dragons", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `Enemies attacking Dragon units: take ${Math.round((0.01+lvl*0.01)*100)}% damage back (permanent)`,
  },
};

export const SKAR_RESKIN_SKILLS = {};

// ── VOIDSCALE NYXARA (strategist, Elder) ──────────────────────────────────────
// ATK:30, FOC:170, SPD:60 — dragon strategist. FOC-based control, dragon sustain,
// commander debuffing, anti-wizard. Shares Elder Dragon + Dragon Supremacy with Skar.

export const NYXARA_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  nyx_dragon_dance: {
    name: "Dragon Dance", icon: "🐉", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "passive",
    desc: "[Allied Dragon Units] On Hit: 4% chance to deal +50% additional damage. (Passive)",
    effect: { type: "branch_on_hit_followup", branch: "dragons", chance: 0.04, bonusDmg: 0.50 },
    base: 0.04, perLevel: 0.04,
    maxLevelEffect: { dragonDmgRangeMin: 1, dragonDmgRangeMax: 2 },
    nextDesc: (lvl) => `[Dragon Units] On hit: ${Math.round((0.04+lvl*0.04)*100)}% chance +50% DMG${lvl >= 14 ? " | Max: Dragon DMG range +1-2" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  nyx_open_fire: {
    name: "Open Fire", icon: "🔥", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 30% Burn Damage (FOC mod) | 20% chance to apply Burn. (Rounds 3, 6, 9)",
    effect: { type: "burn_damage_apply", targets: 2, burnChance: 0.20, burnDmgPenalty: 0.20, modifiedBy: "foc" },
    base: 0.30, perLevel: 0.30,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.30+lvl*0.30)*100)}% Burn DMG (FOC mod) + 20% Burn — rounds 3,6,9`,
  },

  // 3CD → rounds 4, 8
  nyx_meet_your_maker: {
    name: "Meet Your Maker", icon: "💀", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[1 Enemy Unit, prioritises Ranged] 60% Focus Damage (FOC mod). (Rounds 4, 8)",
    effect: { type: "focus_damage_single", target: "prioritiseRanged", modifiedBy: "foc" },
    base: 0.60, perLevel: 0.60,
    nextDesc: (lvl) => `[Ranged priority] ${Math.round((0.60+lvl*0.60)*100)}% Focus DMG (FOC mod) — rounds 4,8`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  nyx_my_will_vs_yours: {
    name: "My Will vs Yours", icon: "🧠", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "passive",
    desc: "[Commander] FOC +1.0 | [Enemy Commander] FOC -1.0. (Passive)",
    effect: { type: "dual_cmd_foc_shift", selfFocUp: 1.0, enemyFocDown: 1.0 },
    base: 1.0, perLevel: 1.0,
    maxLevelEffect: { bonusFocUp: 15 },
    nextDesc: (lvl) => `CMD FOC +${1.0+lvl*1.0} | Enemy CMD FOC -${1.0+lvl*1.0}${lvl >= 14 ? " | Max: FOC +15 bonus" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // Round 3 only — single trigger
  nyx_dragon_resilience: {
    name: "Dragon Resilience", icon: "🩹", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 99, offset: 3, duration: 1,
    desc: "[Dragon Units] Heals 50% HP. Triggers Round 3 only.",
    effect: { type: "heal_branch", branch: "dragons", healPct: 0.50 },
    base: 0.50, perLevel: 0.50,
    nextDesc: (lvl) => `[Dragon Units] Heal ${Math.round((0.50+lvl*0.50)*100)}% HP — Round 3 only`,
  },

  // 3CD → rounds 4, 8
  nyx_dragons_song: {
    name: "Dragon's Song", icon: "🎵", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[2 Creature Alignment Units] Heal 30% HP | [Dragon Units] Heal additional 75% HP. (Rounds 4, 8)",
    effect: { type: "heal_alignment_dragon_bonus", healPct: 0.30, dragonBonus: 0.75, targets: 2 },
    base: 0.30, perLevel: 0.30,
    nextDesc: (lvl) => {
      const base = Math.round((0.30+lvl*0.30)*100);
      return `[2 Creature units] ${base}% HP | [Dragon] +75% additional (${base+75}% total) — rounds 4,8`;
    },
  },

  // ── R3 — Main: skar_elder_dragon shared ───────────────────────────────────

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  nyx_lightning_storm: {
    name: "Lightning Storm", icon: "⚡", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemy Units] 15% Focus Damage (FOC mod) | 50% chance to Stun for 1 round. (Rounds 3, 6, 9)",
    effect: { type: "focus_damage_stun_chance", targets: 2, stunChance: 0.50, modifiedBy: "foc" },
    base: 0.15, perLevel: 0.15,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.15+lvl*0.15)*100)}% Focus DMG (FOC mod) + 50% Stun — rounds 3,6,9`,
  },

  // 3CD → rounds 4, 8
  nyx_mind_over_matter: {
    name: "Mind over Matter", icon: "🌀", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 3, offset: 4, duration: 2,
    desc: "[Enemy Commander] Guaranteed Stun for 1 round | ATK -1.0 for 2 rounds. (Rounds 4, 8)",
    effect: { type: "cmd_stun_atk_drain", stunDuration: 1, atkDrain: 1.0, drainDuration: 2 },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `Enemy CMD Stunned (1 rnd) + ATK -${1.0+lvl*1.0} (2 rnd) — rounds 4,8`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  nyx_dragon_supremacy: {
    name: "Dragon Supremacy", icon: "👑", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "passive",
    desc: "[Commander] FOC +1 | SPD +1 | [Dragon Units] DEF +1 | SPD +1. (Passive)",
    effect: { type: "dragon_supremacy_bonus", cmdFocPerLevel: 1.0, cmdSpdPerLevel: 1.0, dragonDefPerLevel: 1.0, dragonSpdPerLevel: 1.0 },
    base: 1.0, perLevel: 1.0,
    maxLevelEffect: { dragonDmgRangeMin: 2, dragonDmgRangeMax: 2 },
    nextDesc: (lvl) => `CMD FOC/SPD +${1.0+lvl*1.0} | Dragon Units DEF/SPD +${1.0+lvl*1.0}${lvl >= 14 ? " | Max: Dragon DMG range +2-2" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  nyx_wizard_hunter: {
    name: "Wizard Hunter", icon: "🧙", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "passive",
    desc: "[Commander and Army] +1% damage to Wizard units. (Passive)",
    effect: { type: "dmg_bonus_vs_faction_all", faction: "bountyhunters", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `CMD and Army DMG +${Math.round((0.01+lvl*0.01)*100)}% vs Wizards (permanent)`,
  },

  // mal_double_tap referenced in branch map
};

export const NYXARA_RESKIN_SKILLS = {};

// ── Shared skills from other factions used by Dragons ─────────────────────────
export const SHARED_DRAGON_SKILLS = {
  mal_double_tap: {
    name: "Double Tap", icon: "👁", tree: "command", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "passive",
    desc: "[Commander] Normal Attacks deal additional 3% Focus Damage. (Passive)",
    effect: { type: "cmd_normal_atk_bonus_focus", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `Normal Attacks +${Math.round((0.03+lvl*0.03)*100)}% extra Focus DMG (permanent)`,
  },
  skar_elder_dragon: {
    name: "Elder Dragon", icon: "🛡️", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "passive",
    desc: "[Allied Dragon Units] Damage Received -1.5% for first 4 instances of damage. (Passive)",
    effect: { type: "branch_first_hits_dmg_reduce", branch: "dragons", reduction: 0.015, instances: 4 },
    base: 0.015, perLevel: 0.015,
    maxLevelEffect: { instances: 5 },
    nextDesc: (lvl) => `[Dragon Units] First 4 hits: DMG Received -${((0.015+lvl*0.015)*100).toFixed(1)}%${lvl >= 14 ? " | Max: Extends to 5 hits" : ""} (permanent)`,
  },
};

export const DRAGONS_SKILLS = {
  ...EMBERCLAW_UNIQUE_SKILLS,
  ...EMBERCLAW_RESKIN_SKILLS,
  ...SCALEVEIL_UNIQUE_SKILLS,
  ...SCALEVEIL_RESKIN_SKILLS,
  ...KRAUL_UNIQUE_SKILLS,
  ...KRAUL_RESKIN_SKILLS,
  ...CINDERFANG_UNIQUE_SKILLS,
  ...CINDERFANG_RESKIN_SKILLS,
  ...SKAR_UNIQUE_SKILLS,
  ...SKAR_RESKIN_SKILLS,
  ...NYXARA_UNIQUE_SKILLS,
  ...NYXARA_RESKIN_SKILLS,
  ...SHARED_DRAGON_SKILLS,
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const DRAGONS_BRANCH_SKILL_MAP = {
  // Emberclaw (balanced, Adult)
  // Powerful, proud versatile brawler — AoE unique in branch 2, armor passive anchor
  h11: [
    { main: "emb_flame_dive",           sides: ["emb_dragon_toughness",    "emb_throwing_sand"]        }, // R0 top
    { main: "emb_dragon_slash",         sides: ["emb_dragon_spirit",       "emb_flame_dancer"]         }, // R0 bottom
    { main: "emb_fire_volley",          sides: ["emb_cauterize",           "emb_dragons_evasion"]      }, // R3
    { main: "emb_embers_entertainment", sides: ["emb_dragons_hope",        "emb_bring_down_walls"]     }, // R5
  ],
  // Scaleveil Dusk (support, Adult)
  // FOC healer/AOE blaster — heal+dragon bonus R0 top, world-map passives R0 bot, buff-strip AOE R5
  h12: [
    { main: "scaleveil_back_line_healer",    sides: ["scaleveil_sniper",            "scaleveil_fire_in_the_hole"]     }, // R0 top
    { main: "scaleveil_hunter",              sides: ["scaleveil_gatherer",           "scaleveil_pather"]               }, // R0 bot
    { main: "scaleveil_smoke_and_fire",      sides: ["scaleveil_dragon_garrison",    "scaleveil_the_superior_race"]    }, // R3
    { main: "scaleveil_to_become_an_elder",  sides: ["scaleveil_locked_in",          "scaleveil_dusks_blast"]          }, // R5
  ],
  // Ashen Kraul (leader, Hatchling)
  // Mixed-troop leader — dual-branch buff R0 top, wizard-hunter R3, all-dragon payoff R5
  h23: [
    { main: "kraul_ill_work_with_it",    sides: ["kraul_fire_fight",          "kraul_tough_scales"]         }, // R0 top
    { main: "kraul_im_in_command",       sides: ["kraul_hit_and_recover",     "kraul_men_with_hats"]        }, // R0 bot
    { main: "kraul_energetic_youngking", sides: ["kraul_despite_my_age",      "kraul_bad_pointy_hats"]      }, // R3
    { main: "kraul_future_king",         sides: ["kraul_on_the_prowl",        "kraul_nose_dive"]            }, // R5
  ],
  // Cinderfang (balanced, Hatchling)
  // Drake Rider specialist — mounted stacks R0, burn+confusion R3, buff-strip R5
  h24: [
    { main: "cinderfang_dragon_rider",          sides: ["cinderfang_drake_master",        "cinderfang_me_and_my_dragons"]  }, // R0 top
    { main: "cinderfang_mounted_specialist",    sides: ["cinderfang_frontline_medic",     "cinderfang_mounted_armor"]      }, // R0 bot
    { main: "cinderfang_i_can_help",            sides: ["cinderfang_me_little_army_big",  "cinderfang_dont_underestimate_me"] }, // R3
    { main: "cinderfang_clear_the_air",         sides: ["cinderfang_focused",             "cinderfang_you_get_a_heal"]     }, // R5
  ],
  // Pyrewing Skar (attacker, Elder)
  // Apocalyptic destroyer — AoE+pct unique branch 2, passive ATK+crit anchor
  h35: [
    { main: "skar_earthquake",         sides: ["skar_dragon_fire",           "skar_charred"]              }, // R0 top
    { main: "skar_dragon_claw",        sides: ["skar_wizards_worst_nightmare","skar_dragons_rage"]         }, // R0 bottom
    { main: "skar_dragon_snack",       sides: ["skar_dragon_scales",         "skar_fire_blast"]           }, // R3
    { main: "skar_dragon_inferno",     sides: ["skar_dragons_roar",          "skar_tough_skin"]           }, // R5
  ],
  // Voidscale Nyxara (strategist, Elder)
  // Void-entropy debuffer — dual-debuff unique branch 2, precision void-strike branch 3
  h36: [
    { main: "nyx_dragon_dance",        sides: ["nyx_open_fire",           "nyx_meet_your_maker"]      }, // R0 top
    { main: "nyx_my_will_vs_yours",    sides: ["nyx_dragon_resilience",   "nyx_dragons_song"]         }, // R0 bottom
    { main: "skar_elder_dragon",       sides: ["nyx_lightning_storm",     "nyx_mind_over_matter"]     }, // R3 shared
    { main: "nyx_dragon_supremacy",    sides: ["nyx_wizard_hunter",       "mal_double_tap"]           }, // R5
  ],
};
