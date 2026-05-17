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
// Balanced: mix of combat, defense, tactics. Disciplined shield-bearing stalwart.
// Stats: ATK 78, FOC 20, SPD 48 — low-speed tank; passive durability + steady strikes.

// ★ 2 Unique Skills

export const ALDRIC_UNIQUE_SKILLS = {
  aldric_sacred_bulwark: {
    name: "Sacred Bulwark", icon: "🛡", tree: "defense", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 4, offset: 2, duration: 3,
    desc: "Aldric plants himself like a wall of faith — all damage is reduced and his troops hold the line for 3 full rounds.",
    dmgReduce: 0.16, troopDefMult: 1.14, base: 0.16, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.16+lvl*0.04)*100)}% damage + +${Math.round((1.14+lvl*0.04-1)*100)}% troop def (3 rnd) — rounds 2, 6, 10`,
  },
  aldric_templar_oath: {
    name: "Templar's Oath", icon: "✝️", tree: "defense", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "A sworn defender's vow — permanently reduces incoming damage and steadies troop defense.",
    passiveDmgReduce: 0.04, passiveTroopDef: 0.05, base: 0.04, perLevel: 0.02,
    nextDesc: (lvl) => `-${Math.round((0.04+lvl*0.02)*100)}% damage received & +${Math.round((0.05+lvl*0.02)*100)}% troop defence (permanent)`,
  },
};

// 10 Reskins — balanced draw: 4 defense, 3 combat, 3 tactics

export const ALDRIC_RESKIN_SKILLS = {
  aldric_iron_will: {
    name: "Aldric's Iron Will", icon: "🛡", tree: "defense", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "Aldric's unbreakable conviction permanently reduces all damage he and his troops receive.",
    passiveDmgReduce: 0.04, base: 0.04, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.04+lvl*0.02)*100)}% all incoming damage (permanent)`,
  },
  templar_shield_wall: {
    name: "Templar's Shield Wall", icon: "🏰", tree: "defense", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 2, offset: 1, duration: 2,
    desc: "Aldric raises a wall of holy shields every other round.",
    dmgReduce: 0.12, base: 0.12, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.12+lvl*0.04)*100)}% all damage (2 rnd) — rounds 1, 3, 5, 7, 9`,
  },
  hold_the_sacred_line: {
    name: "Hold the Sacred Line", icon: "🚩", tree: "defense", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Aldric orders his troops to brace every other round — no ground given.",
    troopDmgReduce: 0.14, base: 0.14, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.14+lvl*0.04)*100)}% troop damage — rounds 2, 4, 6, 8, 10`,
  },
  aldric_fortified_ranks: {
    name: "Aldric's Fortified Ranks", icon: "🪖", tree: "defense", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "The Templar's discipline permanently hardens every soldier in his ranks.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06+lvl*0.04)*100)}% troop defence (permanent)`,
  },
  templar_strike: {
    name: "Templar's Strike", icon: "⚔", tree: "combat", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "A reliable sword blow landed with disciplined timing every other round.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `Deals ${Math.round((1.4+lvl*0.15)*100)}% Physical Damage — rounds 1, 3, 5, 7, 9`,
  },
  aldric_measured_blow: {
    name: "Aldric's Measured Blow", icon: "🗡", tree: "combat", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "Aldric waits for the right moment — a heavy blow every 3 rounds that also exposes the enemy.",
    cmdMult: 2.0, enemyDmgTakenUp: 0.12, base: 2.0, perLevel: 0.18,
    nextDesc: (lvl) => `Deals ${Math.round((2.0+lvl*0.18)*100)}% Physical Damage + target takes 12% more damage for 1 round — rounds 3, 6, 9`,
  },
  aldric_steadfast_instinct: {
    name: "Aldric's Steadfast Instinct", icon: "🦅", tree: "combat", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "Years of templar training have sharpened Aldric's commander instincts permanently.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.08+lvl*0.06)*100)}% commander damage (permanent)`,
  },
  templar_blessing: {
    name: "Templar's Blessing", icon: "✨", tree: "tactics", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Aldric calls on his faith to restore fallen troops every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06+lvl*0.02)*100)}% of lost troops — rounds 2, 4, 6, 8, 10`,
  },
  templar_rebuke: {
    name: "Templar's Rebuke", icon: "📣", tree: "tactics", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Aldric's commanding voice weakens enemy attacks for 2 rounds.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12+lvl*0.03)*100)}% enemy attack (2 rnd) — rounds 1, 4, 7, 10`,
  },
  aldric_inspiring_presence: {
    name: "Aldric's Inspiring Presence", icon: "⭐", tree: "tactics", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "The sight of Aldric standing firm permanently emboldens every soldier around him.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05+lvl*0.03)*100)}% troop attack (permanent)`,
  },
};

// ── COMMANDER VAYNE (leader, Templar) ─────────────────────────────────────────
// Leader: command tree. Disciplined, shield-bearing, stalwart Templar commander.
// Stats: ATK 130, FOC 30, SPD 55 — physical-leaning leader; strong army buffs.

// ★ 2 Unique Skills

export const VAYNE_UNIQUE_SKILLS = {
  vayne_edict: {
    name: "Vayne's Edict", icon: "⚔️", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "A commanding decree that surges troop attack and blunts enemy retaliation simultaneously.",
    troopAtkMult: 1.18, enemyAtkReduce: 0.12, base: 1.18, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((1.18+lvl*0.05-1)*100)}% attack, -${Math.round((0.12+lvl*0.03)*100)}% enemy attack (2 rnd) — rounds 1, 4, 7, 10`,
  },
  crusader_advance: {
    name: "Crusader's Advance", icon: "📜", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "The holy order marches as one — an unstoppable surge that ignores fortifications and overwhelms all resistance.",
    troopAtkMult: 1.55, garrisonIgnore: 0.18, base: 1.55, perLevel: 0.10,
    nextDesc: (lvl) => `+${Math.round((1.55+lvl*0.08-1)*100)}% attack + ignore ${Math.round((0.18+lvl*0.03)*100)}% garrison — rounds 5, 10`,
  },
};

// 10 Reskins — leader pool

export const VAYNE_RESKIN_SKILLS = {
  vayne_command_aura: {
    name: "Vayne's Command Aura", icon: "📡", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "Troops permanently fight with greater ferocity under Vayne's banner.",
    passiveTroopAtk: 0.07, base: 0.07, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.07+lvl*0.04)*100)}% troop attack (permanent)`,
  },
  templar_roar: {
    name: "Templar's Roar", icon: "📣", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 2, offset: 2, duration: 2,
    desc: "A battle cry that boosts troop attack every other round.",
    troopAtkMult: 1.15, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((1.15+lvl*0.05-1)*100)}% troop attack (2 rnd) — rounds 2, 4, 6, 8, 10`,
  },
  grand_holy_strategy: {
    name: "Grand Holy Strategy", icon: "🗺", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "A holy tactical plan that buffs both attack and defense for 3 rounds.",
    troopAtkMult: 1.20, troopDefMult: 1.10, base: 1.20, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((1.2+lvl*0.06-1)*100)}% attack & +${Math.round((1.1+lvl*0.04-1)*100)}% defence (3 rnd) — rounds 1, 5, 9`,
  },
  vayne_forced_march: {
    name: "Vayne's Forced March", icon: "💨", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Troops surge with overwhelming holy force at the critical moment.",
    troopAtkMult: 1.50, base: 1.50, perLevel: 0.10,
    nextDesc: (lvl) => `+${Math.round((1.5+lvl*0.1-1)*100)}% troop attack (1 rnd) — rounds 5, 10`,
  },
  holy_siege_mastery: {
    name: "Holy Siege Mastery", icon: "🪨", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "Divine conviction permanently ignores a portion of garrison fortifications.",
    passiveGarrisonIgnore: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `Ignore ${Math.round((0.06+lvl*0.04)*100)}% of garrison bonus (permanent)`,
  },
  vayne_supply_cut: {
    name: "Vayne's Supply Cut", icon: "✂", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Vayne's forces repeatedly disrupt enemy supply lines, blocking their healing.",
    blockHeal: 2, base: 2, perLevel: 1,
    nextDesc: (lvl) => `Block enemy healing for ${Math.round(2+lvl*1.0)} rounds — rounds 1, 4, 7, 10`,
  },
  templar_advance: {
    name: "Templar's Advance", icon: "♟", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 4, offset: 3, duration: 2,
    desc: "A tactical advance that boosts troop attack and weakens incoming enemy damage.",
    troopAtkMult: 1.12, enemyDmgReduce: 0.10, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((1.12+lvl*0.04-1)*100)}% attack, -10% enemy damage (2 rnd) — rounds 3, 7`,
  },
  vayne_war_council: {
    name: "Vayne's War Council", icon: "📜", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 5, offset: 2, duration: 1,
    desc: "Vayne nullifies an enemy skill and surges his troops' attack in the same moment.",
    nullifySkill: true, troopAtkMult: 1.18, base: 1.18, perLevel: 0.05,
    nextDesc: (lvl) => `Nullify enemy skill + +${Math.round((1.18+lvl*0.05-1)*100)}% troop attack — rounds 2, 7`,
  },
  holy_legion_discipline: {
    name: "Holy Legion Discipline", icon: "🪖", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "Vayne's iron discipline permanently hardens every soldier's defense.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06+lvl*0.04)*100)}% troop defence (permanent)`,
  },
  vayne_shield_order: {
    name: "Vayne's Shield Order", icon: "🛡", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Vayne orders his troops to raise shields every other round.",
    troopDefMult: 1.12, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((1.12+lvl*0.04-1)*100)}% troop defence — rounds 1, 3, 5, 7, 9`,
  },
};

// ── FRIAR BRENNAN (support, BattlePriest) ─────────────────────────────────────
// Support: tactics tree. Holy flame, righteous healing, divine protection.
// Stats: ATK 40, FOC 120, SPD 52 — high FOC; lean into healing + debuffs.

// ★ 2 Unique Skills

export const BRENNAN_UNIQUE_SKILLS = {
  brennan_blessing: {
    name: "Brennan's Blessing", icon: "✝️", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 3, offset: 3, duration: 2,
    desc: "A holy blessing that heals fallen troops and bolsters their defenses against punishment.",
    healPct: 0.10, troopDefMult: 1.10, base: 0.10, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.1+lvl*0.03)*100)}% lost + +${Math.round((1.1+lvl*0.04-1)*100)}% troop def (2 rnd) — rounds 3, 6, 9`,
  },
  friar_resolve: {
    name: "Friar's Resolve", icon: "🌟", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "Quiet, unwavering faith — Brennan continuously restores troops and permanently steadies their defense.",
    passiveHealPerRound: 0.015, passiveTroopDef: 0.03, base: 0.015, perLevel: 0.005,
    nextDesc: (lvl) => `+${Math.round((0.03+lvl*0.015)*100)}% troop def & +${Math.round((0.015+lvl*0.01)*100)}% heal/rnd (permanent)`,
  },
};

// 10 Reskins — support pool

export const BRENNAN_RESKIN_SKILLS = {
  brennan_field_medic: {
    name: "Brennan's Field Medic", icon: "💚", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "Brennan moves through the ranks each round, continuously restoring fallen troops.",
    passiveHealPerRound: 0.02, base: 0.02, perLevel: 0.01,
    nextDesc: (lvl) => `Restore ${Math.round((0.02+lvl*0.01)*100)}% of lost troops each round`,
  },
  holy_mending_wave: {
    name: "Holy Mending Wave", icon: "✨", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "A surge of holy healing washes over Brennan's forces every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06+lvl*0.02)*100)}% of lost troops — rounds 2, 4, 6, 8, 10`,
  },
  brennan_rally_cry: {
    name: "Brennan's Rally Cry", icon: "🚩", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Brennan's thunderous call pulls fallen soldiers back to their feet with divine force.",
    healPct: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `Restore ${Math.round((0.18+lvl*0.04)*100)}% of lost troops — rounds 1, 6`,
  },
  battle_priest_hymn: {
    name: "Battle Priest's Hymn", icon: "🎵", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 3, offset: 3, duration: 2,
    desc: "An inspiring battle hymn ignites holy fury in every soldier.",
    troopAtkMult: 1.18, base: 1.18, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((1.18+lvl*0.06-1)*100)}% troop attack (2 rnd) — rounds 3, 6, 9`,
  },
  friar_inspiration: {
    name: "Friar's Inspiration", icon: "⭐", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "Brennan's devotion permanently inspires his troops to fight harder.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05+lvl*0.03)*100)}% troop attack (permanent)`,
  },
  holy_hex: {
    name: "Holy Hex", icon: "🔮", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "A divine curse causes enemy attacks to falter and miss their mark.",
    enemyMissChance: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.18+lvl*0.04)*100)}% enemy miss chance (2 rnd) — rounds 2, 6, 10`,
  },
  brennan_blind_strike: {
    name: "Brennan's Blind Strike", icon: "👁", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "A flash of holy light disorients the enemy, reducing their attack.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12+lvl*0.03)*100)}% enemy attack (2 rnd) — rounds 1, 4, 7, 10`,
  },
  friar_supply_cut: {
    name: "Friar's Supply Cut", icon: "✂", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Brennan cuts the enemy's supply of faith — blocking their healing entirely.",
    blockHeal: 3, base: 3, perLevel: 1,
    nextDesc: (lvl) => `Block enemy healing for ${Math.round(3+lvl*1.0)} rounds — rounds 3, 8`,
  },
  brennan_guardian_aura: {
    name: "Brennan's Guardian Aura", icon: "🌿", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "A permanent aura of holy protection bolsters every soldier's resilience.",
    passiveTroopDef: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05+lvl*0.03)*100)}% troop defence (permanent)`,
  },
  sacred_ember_shield: {
    name: "Sacred Ember Shield", icon: "🔆", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "A sacred defensive ward lights up every other round, hardening troop defenses.",
    troopDefMult: 1.15, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((1.15+lvl*0.05-1)*100)}% troop defence — rounds 1, 3, 5, 7, 9`,
  },
};

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
// Leader: command tree. Fanatical, commanding, dark authority over holy armies.
// Stats: ATK 45, FOC 145, SPD 62 — high FOC leader; debuff-flavored command buffs,
//        garrison-breaking fervor, healing denial through zealous suppression.

// ★ 2 Unique Skills

export const DANTE_UNIQUE_SKILLS = {
  dante_zealous_edict: {
    name: "Zealous Edict", icon: "🕯", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "Dante's fanatical decree consumes his army with righteous fury — troop attack surges and the enemy's defenses weaken under the pressure of his fervor.",
    troopAtkMult: 1.22, enemyDmgTakenUp: 0.10, base: 1.22, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((1.22+lvl*0.06-1)*100)}% attack + 10% enemy vulnerability (3 rnd) — rounds 1, 5, 9`,
  },
  dante_inquisition_march: {
    name: "Inquisition March", icon: "🔥", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "The Maniacal Priest drives his army into a frenzied charge — no fortification holds, no enemy heals. Dante's word is the only law.",
    troopAtkMult: 1.50, garrisonIgnore: 0.20, blockHeal: 2, base: 1.50, perLevel: 0.10,
    nextDesc: (lvl) => `+${Math.round((1.5+lvl*0.08-1)*100)}% attack + ignore 20% garrison + block heal 2 rnd — rounds 5, 10`,
  },
};

// 10 Reskins — leader pool, themed around fanatical inquisitor authority

export const DANTE_RESKIN_SKILLS = {
  dante_fervor_aura: {
    name: "Dante's Fervor Aura", icon: "🕯", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "passive",
    desc: "Dante's manic devotion permanently drives troops to fight beyond their limits.",
    passiveTroopAtk: 0.07, base: 0.07, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.07+lvl*0.04)*100)}% troop attack (permanent)`,
  },
  inquisitor_war_cry: {
    name: "Inquisitor's War Cry", icon: "📣", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 2, offset: 2, duration: 2,
    desc: "Dante's screaming war cry drives his soldiers into a frenzy every other round.",
    troopAtkMult: 1.15, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((1.15+lvl*0.05-1)*100)}% troop attack (2 rnd) — rounds 2, 4, 6, 8, 10`,
  },
  sermon_of_war: {
    name: "Sermon of War", icon: "📖", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 4, offset: 3, duration: 2,
    desc: "A raving sermon that binds troops in holy purpose and weakens enemy resistance.",
    troopAtkMult: 1.12, enemyDmgReduce: 0.10, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((1.12+lvl*0.04-1)*100)}% attack, -10% enemy damage (2 rnd) — rounds 3, 7`,
  },
  dante_forced_march: {
    name: "Dante's Forced March", icon: "💨", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Dante screams his soldiers forward — no hesitation, no mercy, maximum force.",
    troopAtkMult: 1.50, base: 1.50, perLevel: 0.10,
    nextDesc: (lvl) => `+${Math.round((1.5+lvl*0.1-1)*100)}% troop attack (1 rnd) — rounds 5, 10`,
  },
  zealot_siege_mastery: {
    name: "Zealot's Siege Mastery", icon: "🪨", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "passive",
    desc: "Dante's fanatical conviction means no walls, no gates, no garrison can slow his crusade.",
    passiveGarrisonIgnore: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `Ignore ${Math.round((0.06+lvl*0.04)*100)}% of garrison bonus (permanent)`,
  },
  dante_supply_cut: {
    name: "Dante's Supply Cut", icon: "✂", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Dante brands the enemy as heretics — cutting their supply lines and denying all healing.",
    blockHeal: 2, base: 2, perLevel: 1,
    nextDesc: (lvl) => `Block enemy healing for ${Math.round(2+lvl*1.0)} rounds — rounds 1, 4, 7, 10`,
  },
  inquisitor_war_taxes: {
    name: "Inquisitor's War Taxes", icon: "💀", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "The enemy pays a tithe in blood — direct damage dealt equal to a portion of their max strength.",
    cmdPctDmg: 0.05, base: 0.05, perLevel: 0.01,
    nextDesc: (lvl) => `${Math.round((0.05+lvl*0.02)*100)}% of enemy max HP as direct damage — rounds 3, 8`,
  },
  holy_war_council: {
    name: "Holy War Council", icon: "📜", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 5, offset: 2, duration: 1,
    desc: "Dante convenes a frantic war council — nullifying the enemy's strategy and surging troop attack.",
    nullifySkill: true, troopAtkMult: 1.18, base: 1.18, perLevel: 0.05,
    nextDesc: (lvl) => `Nullify enemy skill + +${Math.round((1.18+lvl*0.05-1)*100)}% troop attack — rounds 2, 7`,
  },
  crusade_discipline: {
    name: "Crusade Discipline", icon: "🪖", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "passive",
    desc: "Dante's iron-fisted discipline permanently hardens every soldier who marches under his banner.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06+lvl*0.04)*100)}% troop defence (permanent)`,
  },
  dante_shield_order: {
    name: "Dante's Shield Order", icon: "🛡", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Even a madman knows when to shield — Dante orders defensive formations every other round.",
    troopDefMult: 1.12, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((1.12+lvl*0.04-1)*100)}% troop defence — rounds 1, 3, 5, 7, 9`,
  },
};

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
    { main: "aldric_templar_oath",    sides: ["aldric_iron_will",          "aldric_fortified_ranks"]   },
    { main: "templar_shield_wall",    sides: ["hold_the_sacred_line",      "templar_rebuke"]            },
    { main: "aldric_sacred_bulwark",  sides: ["aldric_inspiring_presence", "templar_blessing"]          },
    { main: "aldric_measured_blow",   sides: ["templar_strike",            "aldric_steadfast_instinct"] },
  ],
  // Commander Vayne (leader, Templar)
  h38: [
    { main: "vayne_edict",            sides: ["vayne_command_aura",        "holy_legion_discipline"]    },
    { main: "templar_roar",           sides: ["templar_advance",           "vayne_shield_order"]        },
    { main: "grand_holy_strategy",    sides: ["vayne_war_council",         "vayne_supply_cut"]          },
    { main: "crusader_advance",       sides: ["holy_siege_mastery",        "vayne_forced_march"]        },
  ],
  // Friar Brennan (support, BattlePriest)
  h39: [
    { main: "friar_resolve",          sides: ["brennan_field_medic",       "brennan_guardian_aura"]     },
    { main: "holy_mending_wave",      sides: ["brennan_blind_strike",      "sacred_ember_shield"]       },
    { main: "brennan_blessing",       sides: ["brennan_rally_cry",         "friar_supply_cut"]          },
    { main: "battle_priest_hymn",     sides: ["friar_inspiration",         "holy_hex"]                  },
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
    { main: "dante_zealous_edict",    sides: ["dante_fervor_aura",         "crusade_discipline"]        },
    { main: "inquisitor_war_cry",     sides: ["sermon_of_war",             "dante_shield_order"]        },
    { main: "dante_inquisition_march",sides: ["zealot_siege_mastery",      "dante_supply_cut"]          },
    { main: "holy_war_council",       sides: ["inquisitor_war_taxes",      "dante_forced_march"]        },
  ],
  // Grand Inquisitor Mourne (strategist, Inquisitor)
  h42: [
    { main: "mou_will_of_inquisitor",  sides: ["mou_anything_goes",      "mou_inquisitors_protection"] }, // R0 top
    { main: "mou_the_wise",            sides: ["mou_got_ya",             "mou_protect_the_weak"]       }, // R0 bottom
    { main: "mou_inquisitors_domain",  sides: ["mou_rally_inquisitors",  "mou_last_hope"]              }, // R3
    { main: "mou_mournes_special",     sides: ["mou_battle_tactics",     "mou_cleansing_faith"]        }, // R5
  ],
};
