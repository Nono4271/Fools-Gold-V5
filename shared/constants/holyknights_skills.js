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
    nextDesc: (lvl) => `-${Math.round((0.16 + lvl * 0.03) * 100)}% all dmg & troops ×${(1.14 + lvl * 0.03).toFixed(2)} DEF (3 rnd) — rounds 2,6,10`,
  },
  aldric_templar_oath: {
    name: "Templar's Oath", icon: "✝️", tree: "defense", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "A sworn defender's vow — permanently reduces incoming damage and steadies troop defense.",
    passiveDmgReduce: 0.04, passiveTroopDef: 0.05, base: 0.04, perLevel: 0.02,
    nextDesc: (lvl) => `-${Math.round((0.04 + lvl * 0.02) * 100)}% incoming dmg & +${Math.round((0.05 + lvl * 0.02) * 100)}% troop DEF (permanent)`,
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
    nextDesc: (lvl) => `-${Math.round((0.04 + lvl * 0.03) * 100)}% incoming dmg (permanent)`,
  },
  templar_shield_wall: {
    name: "Templar's Shield Wall", icon: "🏰", tree: "defense", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 2, offset: 1, duration: 2,
    desc: "Aldric raises a wall of holy shields every other round.",
    dmgReduce: 0.12, base: 0.12, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.04) * 100)}% all dmg (2 rnd) — rounds 1,3,5,7,9`,
  },
  hold_the_sacred_line: {
    name: "Hold the Sacred Line", icon: "🚩", tree: "defense", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Aldric orders his troops to brace every other round — no ground given.",
    troopDmgReduce: 0.14, base: 0.14, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.14 + lvl * 0.04) * 100)}% troop dmg — rounds 2,4,6,8,10`,
  },
  aldric_fortified_ranks: {
    name: "Aldric's Fortified Ranks", icon: "🪖", tree: "defense", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "The Templar's discipline permanently hardens every soldier in his ranks.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% troop DEF (permanent)`,
  },
  templar_strike: {
    name: "Templar's Strike", icon: "⚔", tree: "combat", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "A reliable sword blow landed with disciplined timing every other round.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `Commander attacks for ${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  aldric_measured_blow: {
    name: "Aldric's Measured Blow", icon: "🗡", tree: "combat", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "Aldric waits for the right moment — a heavy blow every 3 rounds that also exposes the enemy.",
    cmdMult: 2.0, enemyDmgTakenUp: 0.12, base: 2.0, perLevel: 0.18,
    nextDesc: (lvl) => `${Math.round((2.0 + lvl * 0.18) * 100)}% damage + ${Math.round(0.12 * 100)}% enemy vulnerability — rounds 3,6,9`,
  },
  aldric_steadfast_instinct: {
    name: "Aldric's Steadfast Instinct", icon: "🦅", tree: "combat", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "Years of templar training have sharpened Aldric's commander instincts permanently.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.05) * 100)}% cmd ATK (permanent)`,
  },
  templar_blessing: {
    name: "Templar's Blessing", icon: "✨", tree: "tactics", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Aldric calls on his faith to restore fallen troops every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06 + lvl * 0.02) * 100)}% lost troops — rounds 2,4,6,8,10`,
  },
  templar_rebuke: {
    name: "Templar's Rebuke", icon: "📣", tree: "tactics", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Aldric's commanding voice weakens enemy attacks for 2 rounds.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  aldric_inspiring_presence: {
    name: "Aldric's Inspiring Presence", icon: "⭐", tree: "tactics", cls: "balanced",
    faction: "holyknights", commander: "h37",
    type: "passive",
    desc: "The sight of Aldric standing firm permanently emboldens every soldier around him.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
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
    nextDesc: (lvl) => `Troops ×${(1.18 + lvl * 0.05).toFixed(2)} ATK & -${Math.round(0.12 * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  crusader_advance: {
    name: "Crusader's Advance", icon: "📜", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "The holy order marches as one — an unstoppable surge that ignores fortifications and overwhelms all resistance.",
    troopAtkMult: 1.55, garrisonIgnore: 0.18, base: 1.55, perLevel: 0.10,
    nextDesc: (lvl) => `Troops ×${(1.55 + lvl * 0.10).toFixed(2)} ATK & ignore ${Math.round(0.18 * 100)}% garrison — rounds 5,10`,
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
    nextDesc: (lvl) => `+${Math.round((0.07 + lvl * 0.04) * 100)}% troop ATK (permanent)`,
  },
  templar_roar: {
    name: "Templar's Roar", icon: "📣", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 2, offset: 2, duration: 2,
    desc: "A battle cry that boosts troop attack every other round.",
    troopAtkMult: 1.15, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `Troops ×${(1.15 + lvl * 0.05).toFixed(2)} ATK (2 rnd) — rounds 2,4,6,8,10`,
  },
  grand_holy_strategy: {
    name: "Grand Holy Strategy", icon: "🗺", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "A holy tactical plan that buffs both attack and defense for 3 rounds.",
    troopAtkMult: 1.20, troopDefMult: 1.10, base: 1.20, perLevel: 0.06,
    nextDesc: (lvl) => `Troops ×${(1.20 + lvl * 0.06).toFixed(2)} ATK & ×1.10 DEF (3 rnd) — rounds 1,5,9`,
  },
  vayne_forced_march: {
    name: "Vayne's Forced March", icon: "💨", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Troops surge with overwhelming holy force at the critical moment.",
    troopAtkMult: 1.50, base: 1.50, perLevel: 0.10,
    nextDesc: (lvl) => `Troops ×${(1.50 + lvl * 0.10).toFixed(2)} ATK — rounds 5,10`,
  },
  holy_siege_mastery: {
    name: "Holy Siege Mastery", icon: "🪨", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "Divine conviction permanently ignores a portion of garrison fortifications.",
    passiveGarrisonIgnore: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `Ignore ${Math.round((0.06 + lvl * 0.04) * 100)}% garrison bonus (permanent)`,
  },
  vayne_supply_cut: {
    name: "Vayne's Supply Cut", icon: "✂", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Vayne's forces repeatedly disrupt enemy supply lines, blocking their healing.",
    blockHeal: 2, base: 2, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${2 + lvl} rounds — rounds 1,4,7,10`,
  },
  templar_advance: {
    name: "Templar's Advance", icon: "♟", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 4, offset: 3, duration: 2,
    desc: "A tactical advance that boosts troop attack and weakens incoming enemy damage.",
    troopAtkMult: 1.12, enemyDmgReduce: 0.10, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `Troops ×${(1.12 + lvl * 0.04).toFixed(2)} ATK + -10% enemy dmg (2 rnd) — rounds 3,7`,
  },
  vayne_war_council: {
    name: "Vayne's War Council", icon: "📜", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 5, offset: 2, duration: 1,
    desc: "Vayne nullifies an enemy skill and surges his troops' attack in the same moment.",
    nullifySkill: true, troopAtkMult: 1.18, base: 1.18, perLevel: 0.05,
    nextDesc: (lvl) => `Nullify enemy skill + Troops ×${(1.18 + lvl * 0.05).toFixed(2)} ATK — rounds 2,7`,
  },
  holy_legion_discipline: {
    name: "Holy Legion Discipline", icon: "🪖", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "passive",
    desc: "Vayne's iron discipline permanently hardens every soldier's defense.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% troop DEF (permanent)`,
  },
  vayne_shield_order: {
    name: "Vayne's Shield Order", icon: "🛡", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h38",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Vayne orders his troops to raise shields every other round.",
    troopDefMult: 1.12, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `Troops ×${(1.12 + lvl * 0.04).toFixed(2)} DEF — rounds 1,3,5,7,9`,
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
    nextDesc: (lvl) => `Heal ${Math.round((0.10 + lvl * 0.02) * 100)}% + troops ×${(1.10).toFixed(2)} DEF (2 rnd) — rounds 3,6,9`,
  },
  friar_resolve: {
    name: "Friar's Resolve", icon: "🌟", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "Quiet, unwavering faith — Brennan continuously restores troops and permanently steadies their defense.",
    passiveHealPerRound: 0.015, passiveTroopDef: 0.03, base: 0.015, perLevel: 0.005,
    nextDesc: (lvl) => `Restore ${Math.round((0.015 + lvl * 0.005) * 100)}% lost troops/round & +${Math.round(0.03 * 100)}% troop DEF (permanent)`,
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
    nextDesc: (lvl) => `Restore ${Math.round((0.02 + lvl * 0.01) * 100)}% lost troops/round`,
  },
  holy_mending_wave: {
    name: "Holy Mending Wave", icon: "✨", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "A surge of holy healing washes over Brennan's forces every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06 + lvl * 0.02) * 100)}% lost troops — rounds 2,4,6,8,10`,
  },
  brennan_rally_cry: {
    name: "Brennan's Rally Cry", icon: "🚩", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Brennan's thunderous call pulls fallen soldiers back to their feet with divine force.",
    healPct: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `Restore ${Math.round((0.18 + lvl * 0.04) * 100)}% lost troops — rounds 1,6`,
  },
  battle_priest_hymn: {
    name: "Battle Priest's Hymn", icon: "🎵", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 3, offset: 3, duration: 2,
    desc: "An inspiring battle hymn ignites holy fury in every soldier.",
    troopAtkMult: 1.18, base: 1.18, perLevel: 0.06,
    nextDesc: (lvl) => `Troops ×${(1.18 + lvl * 0.06).toFixed(2)} ATK (2 rnd) — rounds 3,6,9`,
  },
  friar_inspiration: {
    name: "Friar's Inspiration", icon: "⭐", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "Brennan's devotion permanently inspires his troops to fight harder.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
  },
  holy_hex: {
    name: "Holy Hex", icon: "🔮", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "A divine curse causes enemy attacks to falter and miss their mark.",
    enemyMissChance: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.18 + lvl * 0.04) * 100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  brennan_blind_strike: {
    name: "Brennan's Blind Strike", icon: "👁", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "A flash of holy light disorients the enemy, reducing their attack.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  friar_supply_cut: {
    name: "Friar's Supply Cut", icon: "✂", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Brennan cuts the enemy's supply of faith — blocking their healing entirely.",
    blockHeal: 3, base: 3, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${3 + lvl} rounds — rounds 3,8`,
  },
  brennan_guardian_aura: {
    name: "Brennan's Guardian Aura", icon: "🌿", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "passive",
    desc: "A permanent aura of holy protection bolsters every soldier's resilience.",
    passiveTroopDef: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop DEF (permanent)`,
  },
  sacred_ember_shield: {
    name: "Sacred Ember Shield", icon: "🔆", tree: "tactics", cls: "support",
    faction: "holyknights", commander: "h39",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "A sacred defensive ward lights up every other round, hardening troop defenses.",
    troopDefMult: 1.15, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `Troops ×${(1.15 + lvl * 0.05).toFixed(2)} DEF — rounds 1,3,5,7,9`,
  },
};

// ── HIGH WARDEN SERAPH (attacker, BattlePriest) ───────────────────────────────
// Attacker: combat tree. Holy flame, righteous fury — powerful physical striker.
// Stats: ATK 178, FOC 40, SPD 60 — very high ATK; pure physical damage focus.

// ★ 2 Unique Skills

export const SERAPH_UNIQUE_SKILLS = {
  seraph_judgment: {
    name: "Seraph's Judgment", icon: "☀️", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "A devastating strike of divine judgment — amplified by holy fury and a punishing crit.",
    cmdMult: 2.8, critBonus: 0.40, base: 2.8, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.8 + lvl * 0.20) * 100)}% damage + 40% crit — rounds 2,6,10`,
  },
  warden_ascendant: {
    name: "Warden Ascendant", icon: "🌅", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "passive",
    desc: "Seraph transcends — permanently amplifying her command attack and critical chance through righteous conviction.",
    passiveCmdAtk: 0.10, passiveCritChance: 0.08, base: 0.10, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.10 + lvl * 0.05) * 100)}% cmd ATK & +${Math.round(0.08 * 100)}% crit (permanent)`,
  },
};

// 10 Reskins — attacker pool

export const SERAPH_RESKIN_SKILLS = {
  seraph_killing_instinct: {
    name: "Seraph's Killing Instinct", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "passive",
    desc: "Years of holy combat training permanently sharpen Seraph's killing edge.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  warden_quick_strike: {
    name: "Warden's Quick Strike", icon: "⚡", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Seraph strikes with divine speed every other round — fast and relentless.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  divine_savage_blow: {
    name: "Divine Savage Blow", icon: "🗡", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "A heavy holy strike every 3 rounds that leaves the enemy exposed.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  warden_execute: {
    name: "Warden's Execute", icon: "💀", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "A devastating holy opener that fires again at the mid-fight turning point.",
    cmdMult: 3.0, base: 3.0, perLevel: 0.25,
    nextDesc: (lvl) => `${Math.round((3.0 + lvl * 0.25) * 100)}% damage — rounds 1,6`,
  },
  seraph_double_strike: {
    name: "Seraph's Double Strike", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Seraph strikes twice with divine precision — two blows as one act of judgment.",
    cmdHits: 2, cmdMult: 1.2, base: 1.2, perLevel: 0.10,
    nextDesc: (lvl) => `2 hits ×${(1.2 + lvl * 0.10).toFixed(2)} — rounds 2,6,10`,
  },
  warden_predator_eyes: {
    name: "Warden's Predator Eyes", icon: "🦅", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "passive",
    desc: "Seraph's battle-hardened eyes permanently lock onto every weakness in the enemy.",
    passiveCritChance: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% crit chance (permanent)`,
  },
  holy_frenzy: {
    name: "Holy Frenzy", icon: "🩸", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Righteous battle fury overtakes Seraph every other round — all strikes land harder.",
    cmdMult: 1.15, critBonus: 0.30, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `${Math.round((1.15 + lvl * 0.05) * 100)}% damage + 30% crit — rounds 2,4,6,8,10`,
  },
  warden_killing_edge: {
    name: "Warden's Killing Edge", icon: "🔪", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Seraph strikes at the enemy's very soul — dealing damage equal to a portion of their max strength.",
    cmdPctDmg: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.06 + lvl * 0.02) * 100)}% enemy max HP dmg — rounds 5,10`,
  },
  divine_fortitude: {
    name: "Divine Fortitude", icon: "💫", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Seraph draws righteous energy from her strikes, restoring troops equal to a portion of the damage dealt.",
    cmdMult: 1.3, lifesteal: 0.25, base: 0.25, perLevel: 0.05,
    nextDesc: (lvl) => `130% damage + restore troops = ${Math.round((0.25 + lvl * 0.05) * 100)}% of damage dealt — rounds 1,4,7,10`,
  },
  divine_flurry: {
    name: "Divine Flurry", icon: "🌪", tree: "combat", cls: "attacker",
    faction: "holyknights", commander: "h40",
    type: "active", cooldown: 4, offset: 4, duration: 1,
    desc: "Three rapid divine strikes unleashed in a single explosive burst.",
    cmdHits: 3, cmdMult: 0.9, base: 0.9, perLevel: 0.08,
    nextDesc: (lvl) => `3 hits ×${(0.9 + lvl * 0.08).toFixed(2)} — rounds 4,8`,
  },
};

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
    nextDesc: (lvl) => `Troops ×${(1.22 + lvl * 0.05).toFixed(2)} ATK & +${Math.round(0.10 * 100)}% enemy vulnerability (3 rnd) — rounds 1,5,9`,
  },
  dante_inquisition_march: {
    name: "Inquisition March", icon: "🔥", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "The Maniacal Priest drives his army into a frenzied charge — no fortification holds, no enemy heals. Dante's word is the only law.",
    troopAtkMult: 1.50, garrisonIgnore: 0.20, blockHeal: 2, base: 1.50, perLevel: 0.10,
    nextDesc: (lvl) => `Troops ×${(1.50 + lvl * 0.10).toFixed(2)} ATK + ignore ${Math.round(0.20 * 100)}% garrison + block heal 2 rnd — rounds 5,10`,
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
    nextDesc: (lvl) => `+${Math.round((0.07 + lvl * 0.04) * 100)}% troop ATK (permanent)`,
  },
  inquisitor_war_cry: {
    name: "Inquisitor's War Cry", icon: "📣", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 2, offset: 2, duration: 2,
    desc: "Dante's screaming war cry drives his soldiers into a frenzy every other round.",
    troopAtkMult: 1.15, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `Troops ×${(1.15 + lvl * 0.05).toFixed(2)} ATK (2 rnd) — rounds 2,4,6,8,10`,
  },
  sermon_of_war: {
    name: "Sermon of War", icon: "📖", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 4, offset: 3, duration: 2,
    desc: "A raving sermon that binds troops in holy purpose and weakens enemy resistance.",
    troopAtkMult: 1.12, enemyDmgReduce: 0.10, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `Troops ×${(1.12 + lvl * 0.04).toFixed(2)} ATK + -10% enemy dmg (2 rnd) — rounds 3,7`,
  },
  dante_forced_march: {
    name: "Dante's Forced March", icon: "💨", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Dante screams his soldiers forward — no hesitation, no mercy, maximum force.",
    troopAtkMult: 1.50, base: 1.50, perLevel: 0.10,
    nextDesc: (lvl) => `Troops ×${(1.50 + lvl * 0.10).toFixed(2)} ATK — rounds 5,10`,
  },
  zealot_siege_mastery: {
    name: "Zealot's Siege Mastery", icon: "🪨", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "passive",
    desc: "Dante's fanatical conviction means no walls, no gates, no garrison can slow his crusade.",
    passiveGarrisonIgnore: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `Ignore ${Math.round((0.06 + lvl * 0.04) * 100)}% garrison bonus (permanent)`,
  },
  dante_supply_cut: {
    name: "Dante's Supply Cut", icon: "✂", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Dante brands the enemy as heretics — cutting their supply lines and denying all healing.",
    blockHeal: 2, base: 2, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${2 + lvl} rounds — rounds 1,4,7,10`,
  },
  inquisitor_war_taxes: {
    name: "Inquisitor's War Taxes", icon: "💀", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "The enemy pays a tithe in blood — direct damage dealt equal to a portion of their max strength.",
    cmdPctDmg: 0.05, base: 0.05, perLevel: 0.01,
    nextDesc: (lvl) => `${Math.round((0.05 + lvl * 0.01) * 100)}% enemy max HP direct dmg — rounds 3,8`,
  },
  holy_war_council: {
    name: "Holy War Council", icon: "📜", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 5, offset: 2, duration: 1,
    desc: "Dante convenes a frantic war council — nullifying the enemy's strategy and surging troop attack.",
    nullifySkill: true, troopAtkMult: 1.18, base: 1.18, perLevel: 0.05,
    nextDesc: (lvl) => `Nullify enemy skill + Troops ×${(1.18 + lvl * 0.05).toFixed(2)} ATK — rounds 2,7`,
  },
  crusade_discipline: {
    name: "Crusade Discipline", icon: "🪖", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "passive",
    desc: "Dante's iron-fisted discipline permanently hardens every soldier who marches under his banner.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% troop DEF (permanent)`,
  },
  dante_shield_order: {
    name: "Dante's Shield Order", icon: "🛡", tree: "command", cls: "leader",
    faction: "holyknights", commander: "h41",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Even a madman knows when to shield — Dante orders defensive formations every other round.",
    troopDefMult: 1.12, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `Troops ×${(1.12 + lvl * 0.04).toFixed(2)} DEF — rounds 1,3,5,7,9`,
  },
};

// ── GRAND INQUISITOR MOURNE (strategist, Inquisitor) ─────────────────────────
// Strategist: tactics-heavy + combat secondary. Dark interrogation flavor.
// Stats: ATK 182, FOC 20, SPD 58 — extreme ATK for a strategist; high physical
//        damage skills + brutal debuffs and healing denial. Lean 5 tactics / 5 combat.

// ★ 2 Unique Skills

export const MOURNE_UNIQUE_SKILLS = {
  mourne_sentence: {
    name: "Mourne's Sentence", icon: "🌑", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "The trial ended before it began. Mourne delivers an irrevocable sentence — massive % HP damage, enemy healing blocked, and their attack broken.",
    cmdPctDmg: 0.12, blockHeal: 3, enemyAtkReduce: 0.18, base: 0.12, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.12 + lvl * 0.02) * 100)}% enemy max HP + block heal 3 rnd + -18% enemy ATK — rounds 1,6`,
  },
  inquisitor_purge: {
    name: "Inquisitor's Purge", icon: "🌑", tree: "combat", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "Mourne doesn't defeat armies — he dismantles them. A ferocious strike that exposes the enemy to further punishment.",
    cmdMult: 2.5, enemyDmgTakenUp: 0.15, base: 2.5, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.5 + lvl * 0.20) * 100)}% damage + ${Math.round(0.15 * 100)}% enemy vulnerability — rounds 3,6,9`,
  },
};

// 10 Reskins — 5 tactics + 5 combat for strategist balance

export const MOURNE_RESKIN_SKILLS = {
  // Tactics reskins (5)
  mourne_expose_weakness: {
    name: "Mourne's Expose Weakness", icon: "🔍", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "active", cooldown: 3, offset: 2, duration: 2,
    desc: "Mourne dissects the enemy's formation, forcing them to take additional damage from all sources.",
    enemyDmgTakenUp: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `Enemy takes +${Math.round((0.12 + lvl * 0.03) * 100)}% more dmg (2 rnd) — rounds 2,5,8`,
  },
  mourne_blind_strike: {
    name: "Mourne's Blind Strike", icon: "👁", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "A calculated strike to the enemy's command structure — their attack is broken for 2 rounds.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  inquisitor_hex: {
    name: "Inquisitor's Hex", icon: "🔮", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "A dark inquisitor hex clouds the enemy's vision — their strikes miss and their coordination falters.",
    enemyMissChance: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.18 + lvl * 0.04) * 100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  mourne_supply_cut: {
    name: "Mourne's Supply Cut", icon: "✂", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Mourne declares the enemy's healers heretics — cutting all healing from the battlefield.",
    blockHeal: 3, base: 3, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${3 + lvl} rounds — rounds 3,8`,
  },
  mourne_foresight: {
    name: "Mourne's Foresight", icon: "🕵", tree: "tactics", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "active", cooldown: 4, offset: 4, duration: 1,
    desc: "Mourne anticipates every move — he nullifies the enemy's skill with cold precision.",
    nullifySkill: true, base: 1, perLevel: 0,
    nextDesc: () => `Nullify enemy skill — rounds 4,8`,
  },
  // Combat reskins (5)
  mourne_killing_instinct: {
    name: "Mourne's Killing Instinct", icon: "⚔", tree: "combat", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "passive",
    desc: "Permanently sharpened by years of inquisitor work — Mourne's commander damage never dulls.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  mourne_quick_strike: {
    name: "Mourne's Quick Strike", icon: "⚡", tree: "combat", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Mourne strikes with cold efficiency every other round — no hesitation, no flourish.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  inquisitor_savage_blow: {
    name: "Inquisitor's Savage Blow", icon: "🗡", tree: "combat", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "A punishing blow delivered every 3 rounds — methodical, brutal, deliberate.",
    cmdMult: 2.2, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage — rounds 3,6,9`,
  },
  mourne_execute: {
    name: "Mourne's Execute", icon: "💀", tree: "combat", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "The verdict is guilty. A crushing strike at the opening and again at the turning point.",
    cmdMult: 3.0, base: 3.0, perLevel: 0.25,
    nextDesc: (lvl) => `${Math.round((3.0 + lvl * 0.25) * 100)}% damage — rounds 1,6`,
  },
  mourne_predator_eyes: {
    name: "Mourne's Predator Eyes", icon: "🦅", tree: "combat", cls: "strategist",
    faction: "holyknights", commander: "h42",
    type: "passive",
    desc: "Mourne's eyes permanently track every crack in the enemy's armor — crit chance never stops rising.",
    passiveCritChance: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% crit chance (permanent)`,
  },
};

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
    { main: "warden_ascendant",       sides: ["seraph_killing_instinct",   "warden_predator_eyes"]      },
    { main: "warden_quick_strike",    sides: ["holy_frenzy",               "divine_flurry"]             },
    { main: "seraph_judgment",        sides: ["divine_savage_blow",        "warden_killing_edge"]       },
    { main: "warden_execute",         sides: ["seraph_double_strike",      "divine_fortitude"]          },
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
    { main: "mourne_killing_instinct",sides: ["mourne_predator_eyes",      "mourne_foresight"]          },
    { main: "mourne_blind_strike",    sides: ["inquisitor_hex",            "mourne_expose_weakness"]    },
    { main: "mourne_sentence",        sides: ["mourne_supply_cut",         "mourne_quick_strike"]       },
    { main: "inquisitor_purge",       sides: ["inquisitor_savage_blow",    "mourne_execute"]            },
  ],
};
