/* ─────────────────────────────────────────────────────────────────────────────
   bountyhunters_skills.js — Bountyhunters Faction Skills
   72 total: 60 reskins + 12 unique skills
   6 commanders × 12 skills each

   Commanders:
     Solarius Vex    (h5,  support,    Sage)       — 10 reskins + 2 unique
     Mira Ashveil    (h6,  attacker,   Sage)       — 10 reskins + 2 unique
     Runekeeper Dov  (h17, leader,     Apprentice) — 10 reskins + 2 unique
     Hexblade Oren   (h18, balanced,   Apprentice) — 10 reskins + 2 unique
     Archmage Theon  (h29, support,    Warlock)    — 10 reskins + 2 unique
     Spellblade Ryn  (h30, strategist, Warlock)    — 10 reskins + 2 unique
───────────────────────────────────────────────────────────────────────────── */

// ── SOLARIUS VEX (support, Sage) ──────────────────────────────────────────────
// Support: tactics tree. Ancient wisdom, precise arcane healing and debuffs.
// Stats: ATK 20, FOC 180 — extreme FOC, near-zero ATK; purest healer/debuffer
//        in the faction. All flavor rooted in ancient light-based Sage magic.

// ★ 2 Unique Skills

export const VEX_UNIQUE_SKILLS = {
  vex_ancient_light: {
    name: "Ancient Light", icon: "🌞", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h5",
    type: "active", cooldown: 3, offset: 3, duration: 2,
    desc: "Vex channels ancient solar wisdom — a flood of light restores fallen allies and blinds the enemy to further retaliation.",
    healPct: 0.14, enemyMissChance: 0.20, base: 0.14, perLevel: 0.03,
    nextDesc: (lvl) => `Heal ${Math.round((0.14 + lvl * 0.03) * 100)}% lost troops & ${Math.round(0.20 * 100)}% enemy miss (2 rnd) — rounds 3,6,9`,
  },
  vex_sage_vigil: {
    name: "Sage's Vigil", icon: "🔆", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h5",
    type: "passive",
    desc: "Vex watches over his allies without rest — continuously mending wounds and permanently hardening their resolve.",
    passiveHealPerRound: 0.02, passiveTroopDef: 0.05, base: 0.02, perLevel: 0.005,
    nextDesc: (lvl) => `Restore ${Math.round((0.02 + lvl * 0.005) * 100)}% lost troops/round & +${Math.round(0.05 * 100)}% troop DEF (permanent)`,
  },
};

// 10 Reskins — support pool, ancient solar Sage theme

export const VEX_RESKIN_SKILLS = {
  vex_field_medic: {
    name: "Sage's Mending", icon: "💚", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h5",
    type: "passive",
    desc: "Vex's ancient knowledge keeps troops alive — continuously restoring the fallen each round.",
    passiveHealPerRound: 0.02, base: 0.02, perLevel: 0.01,
    nextDesc: (lvl) => `Restore ${Math.round((0.02 + lvl * 0.01) * 100)}% lost troops/round`,
  },
  vex_mending_wave: {
    name: "Radiant Wave", icon: "✨", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h5",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "A wave of solar warmth washes over allies — restoring troops every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06 + lvl * 0.02) * 100)}% lost troops — rounds 2,4,6,8,10`,
  },
  vex_rally_cry: {
    name: "Solar Resurgence", icon: "🌅", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h5",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Vex draws on ancient solar reserves — a massive surge of healing at the critical moment.",
    healPct: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `Restore ${Math.round((0.18 + lvl * 0.04) * 100)}% lost troops — rounds 1,6`,
  },
  vex_battle_hymn: {
    name: "Sage's Invocation", icon: "🎵", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h5",
    type: "active", cooldown: 3, offset: 3, duration: 2,
    desc: "Vex recites an ancient war-mantra — all troops fight with greater ferocity.",
    troopAtkMult: 1.18, base: 1.18, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.18 + lvl * 0.06) * 100 - 100)}% troop ATK (2 rnd) — rounds 3,6,9`,
  },
  vex_inspiring_presence: {
    name: "Elder's Presence", icon: "⭐", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h5",
    type: "passive",
    desc: "The weight of ancient wisdom behind every soldier's step. Permanently increases troop attack.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
  },
  vex_hex_curse: {
    name: "Sunblind Curse", icon: "🔮", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h5",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "Vex focuses solar energy into a blinding curse — the enemy's attacks miss repeatedly.",
    enemyMissChance: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.18 + lvl * 0.04) * 100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  vex_blind_strike: {
    name: "Arcane Blind", icon: "👁", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h5",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "A precise arcane disruption dims the enemy's fighting edge for 2 rounds.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  vex_supply_cut: {
    name: "Arcane Severance", icon: "✂", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h5",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Vex severs the enemy's arcane supply lines — no healing reaches them.",
    blockHeal: 3, base: 3, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${3 + lvl} rounds — rounds 3,8`,
  },
  vex_guardian_aura: {
    name: "Solar Ward", icon: "🌿", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h5",
    type: "passive",
    desc: "Vex's solar aura permanently shields all troops from harm.",
    passiveTroopDef: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop DEF (permanent)`,
  },
  vex_second_wind: {
    name: "Second Dawn", icon: "💨", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h5",
    type: "active", cooldown: 5, offset: 5, duration: 2,
    desc: "The sun rises twice for Vex's allies — restoring troops and surging attack at the crucial moment.",
    healPct: 0.12, troopAtkMult: 1.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `Heal ${Math.round((0.12 + lvl * 0.03) * 100)}% + +${Math.round((0.12 + lvl * 0.03) * 100 - 100)}% troop ATK (2 rnd) — rounds 5,10`,
  },
};

// ── MIRA ASHVEIL (attacker, Sage) ─────────────────────────────────────────────
// Attacker: combat tree. Precise, arcane-laced physical strikes. Ancient wisdom
//           meets lethal edge — a Sage who hunts, not heals.
// Stats: ATK 120, FOC 100 — strong hybrid; physical damage with arcane crits,
//        vulnerability debuffs woven into her strikes.

// ★ 2 Unique Skills

export const MIRA_UNIQUE_SKILLS = {
  mira_ashveil_strike: {
    name: "Ashveil Strike", icon: "🌑", tree: "combat", cls: "attacker",
    faction: "bountyhunters", commander: "h6",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Mira cloaks her blade in ashen arcane energy — a heavy strike that tears through armor and leaves the target exposed to greater punishment.",
    cmdMult: 2.6, enemyDmgTakenUp: 0.18, base: 2.6, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.6 + lvl * 0.20) * 100)}% damage + ${Math.round(0.18 * 100)}% enemy vulnerability — rounds 2,6,10`,
  },
  mira_veil_instinct: {
    name: "Veil Instinct", icon: "🌫", tree: "combat", cls: "attacker",
    faction: "bountyhunters", commander: "h6",
    type: "passive",
    desc: "The ash veil sharpens Mira's every instinct — permanently boosting her command damage and crit chance.",
    passiveCmdAtk: 0.10, passiveCritChance: 0.08, base: 0.10, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.10 + lvl * 0.04) * 100)}% cmd ATK & +8% crit (permanent)`,
  },
};

// 10 Reskins — attacker pool, arcane-edged Sage hunter theme

export const MIRA_RESKIN_SKILLS = {
  mira_killing_instinct: {
    name: "Hunter's Precision", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "bountyhunters", commander: "h6",
    type: "passive",
    desc: "Mira has tracked and killed for years. Permanently increased commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  mira_quick_strike: {
    name: "Veil Dash", icon: "⚡", tree: "combat", cls: "attacker",
    faction: "bountyhunters", commander: "h6",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Mira slips through the ash veil and strikes before the enemy sees her move.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  mira_savage_blow: {
    name: "Sage's Rending", icon: "🗡", tree: "combat", cls: "attacker",
    faction: "bountyhunters", commander: "h6",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "An ancient combat technique that tears through both armor and morale.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  mira_execute: {
    name: "Mark and Finish", icon: "💀", tree: "combat", cls: "attacker",
    faction: "bountyhunters", commander: "h6",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Mira marks the target at the start and ends the contract mid-fight.",
    cmdMult: 3.0, base: 3.0, perLevel: 0.25,
    nextDesc: (lvl) => `${Math.round((3.0 + lvl * 0.25) * 100)}% damage — rounds 1,6`,
  },
  mira_double_strike: {
    name: "Twin Veil Blades", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "bountyhunters", commander: "h6",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Mira draws both blades — two arcane-edged strikes land as one fluid motion.",
    cmdHits: 2, cmdMult: 1.2, base: 1.2, perLevel: 0.10,
    nextDesc: (lvl) => `2 hits ×${(1.2 + lvl * 0.10).toFixed(2)} — rounds 2,6,10`,
  },
  mira_predator_eyes: {
    name: "Ash-Sight", icon: "🦅", tree: "combat", cls: "attacker",
    faction: "bountyhunters", commander: "h6",
    type: "passive",
    desc: "The ash veil grants Mira sight beyond normal limits. Permanently increased crit chance.",
    passiveCritChance: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% crit chance (permanent)`,
  },
  mira_battle_frenzy: {
    name: "Veil Frenzy", icon: "🔥", tree: "combat", cls: "attacker",
    faction: "bountyhunters", commander: "h6",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "The ash veil surges through Mira — every other round she strikes with arcane fury.",
    cmdMult: 1.15, critBonus: 0.30, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `${Math.round((1.15 + lvl * 0.05) * 100)}% damage + 30% crit — rounds 2,4,6,8,10`,
  },
  mira_killing_edge: {
    name: "Arcane Rupture", icon: "🔪", tree: "combat", cls: "attacker",
    faction: "bountyhunters", commander: "h6",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Mira ruptures arcane reserves inside the enemy formation — direct damage at maximum scale.",
    cmdPctDmg: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.06 + lvl * 0.02) * 100)}% enemy max HP direct dmg — rounds 5,10`,
  },
  mira_battle_hunger: {
    name: "Blood Contract", icon: "🩸", tree: "combat", cls: "attacker",
    faction: "bountyhunters", commander: "h6",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Mira's contract is sealed in blood — her strikes restore her allies from the damage dealt.",
    cmdMult: 1.3, lifesteal: 0.25, base: 0.25, perLevel: 0.05,
    nextDesc: (lvl) => `130% damage, restore troops = ${Math.round((0.25 + lvl * 0.05) * 100)}% of damage dealt — rounds 1,4,7,10`,
  },
  mira_sweeping_strike: {
    name: "Veil Sweep", icon: "🌪", tree: "combat", cls: "attacker",
    faction: "bountyhunters", commander: "h6",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "The ash veil expands outward — Mira's strike hits all enemies, then targets a single survivor.",
    cmdAoe: true, cmdMult: 0.8, followUpChance: 0.50, followUpPct: 1.2, base: 0.8, perLevel: 0.06,
    nextDesc: (lvl) => `All enemies ${Math.round((0.8 + lvl * 0.06) * 100)}% AoE + 50% chance single follow-up 120% — rounds 2,6,10`,
  },
};

// ── RUNEKEEPER DOV (leader, Apprentice) ───────────────────────────────────────
// Leader: command tree. Experimental, unstable — an Apprentice who leads through
//         raw runic authority and unpredictable power.
// Stats: ATK 75, FOC 80 — near-balanced; shapes rune-themed army buffs with
//        an experimental, volatile flavor. Siege-breaking rune protocols.

// ★ 2 Unique Skills

export const DOV_UNIQUE_SKILLS = {
  dov_rune_surge: {
    name: "Rune Surge", icon: "🔷", tree: "command", cls: "leader",
    faction: "bountyhunters", commander: "h17",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "Dov unleashes a cascade of runes across his formation — all troops surge in attack and defense as the runes burn bright.",
    troopAtkMult: 1.22, troopDefMult: 1.12, base: 1.22, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.22 + lvl * 0.05) * 100)}% troop ATK & +12% DEF (3 rnd) — rounds 1,5,9`,
  },
  dov_unstable_inscription: {
    name: "Unstable Inscription", icon: "⚠️", tree: "command", cls: "leader",
    faction: "bountyhunters", commander: "h17",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Dov carves an unstable rune into the battlefield — it detonates for direct damage and collapses enemy healing simultaneously.",
    cmdPctDmg: 0.07, blockHeal: 3, base: 0.07, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.07 + lvl * 0.02) * 100)}% enemy max HP direct dmg + block heal 3 rnd — rounds 3,8`,
  },
};

// 10 Reskins — leader pool, runic Apprentice authority theme

export const DOV_RESKIN_SKILLS = {
  dov_rune_aura: {
    name: "Runekeeper's Aura", icon: "📡", tree: "command", cls: "leader",
    faction: "bountyhunters", commander: "h17",
    type: "passive",
    desc: "Dov's runes permanently empower every soldier under his banner.",
    passiveTroopAtk: 0.07, base: 0.07, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.07 + lvl * 0.04) * 100)}% troop ATK (permanent)`,
  },
  dov_rune_roar: {
    name: "Rune Activation", icon: "📣", tree: "command", cls: "leader",
    faction: "bountyhunters", commander: "h17",
    type: "active", cooldown: 2, offset: 2, duration: 2,
    desc: "Dov activates a chain of combat runes — troops surge in attack every other round.",
    troopAtkMult: 1.15, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.15 + lvl * 0.05) * 100 - 100)}% troop ATK (2 rnd) — rounds 2,4,6,8,10`,
  },
  dov_grand_inscription: {
    name: "Grand Inscription", icon: "🗺", tree: "command", cls: "leader",
    faction: "bountyhunters", commander: "h17",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "A grand runic formation inscribed mid-battle — troop attack and defense surge for 3 rounds.",
    troopAtkMult: 1.20, troopDefMult: 1.10, base: 1.20, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.20 + lvl * 0.06) * 100 - 100)}% ATK & +10% DEF (3 rnd) — rounds 1,5,9`,
  },
  dov_forced_march: {
    name: "Rune-Driven March", icon: "💨", tree: "command", cls: "leader",
    faction: "bountyhunters", commander: "h17",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Dov inscribes momentum runes on every soldier — an unstoppable surge at the decisive moment.",
    troopAtkMult: 1.50, base: 1.50, perLevel: 0.10,
    nextDesc: (lvl) => `+${Math.round((0.50 + lvl * 0.10) * 100)}% troop ATK — rounds 5,10`,
  },
  dov_siege_mastery: {
    name: "Breach Rune", icon: "🪨", tree: "command", cls: "leader",
    faction: "bountyhunters", commander: "h17",
    type: "passive",
    desc: "Dov's siege runes permanently dissolve a portion of garrison fortifications.",
    passiveGarrisonIgnore: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `Ignore ${Math.round((0.06 + lvl * 0.04) * 100)}% garrison bonus (permanent)`,
  },
  dov_supply_cut: {
    name: "Rune of Severance", icon: "✂", tree: "command", cls: "leader",
    faction: "bountyhunters", commander: "h17",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "A severance rune cuts the enemy's supply — blocking their healing repeatedly.",
    blockHeal: 2, base: 2, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${2 + lvl} rounds — rounds 1,4,7,10`,
  },
  dov_tactical_advance: {
    name: "Runic Advance", icon: "♟", tree: "command", cls: "leader",
    faction: "bountyhunters", commander: "h17",
    type: "active", cooldown: 4, offset: 3, duration: 2,
    desc: "Dov inscribes advance runes — troop attack rises and enemy damage is blunted.",
    troopAtkMult: 1.12, enemyDmgReduce: 0.10, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.12 + lvl * 0.04) * 100 - 100)}% troop ATK + -10% enemy dmg (2 rnd) — rounds 3,7`,
  },
  dov_war_council: {
    name: "Rune of Counterspell", icon: "📜", tree: "command", cls: "leader",
    faction: "bountyhunters", commander: "h17",
    type: "active", cooldown: 5, offset: 2, duration: 1,
    desc: "Dov's counterspell rune nullifies the enemy's next move and rallies his troops.",
    nullifySkill: true, troopAtkMult: 1.18, base: 1.18, perLevel: 0.05,
    nextDesc: (lvl) => `Nullify enemy skill + +${Math.round((0.18 + lvl * 0.05) * 100 - 100)}% troop ATK — rounds 2,7`,
  },
  dov_legion_discipline: {
    name: "Rune-Hardened Ranks", icon: "🪖", tree: "command", cls: "leader",
    faction: "bountyhunters", commander: "h17",
    type: "passive",
    desc: "Defense runes permanently inscribed on every soldier's armor.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% troop DEF (permanent)`,
  },
  dov_shield_order: {
    name: "Ward Rune", icon: "🛡", tree: "command", cls: "leader",
    faction: "bountyhunters", commander: "h17",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Dov inscribes a ward rune on the formation every other round.",
    troopDefMult: 1.12, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.12 + lvl * 0.04) * 100 - 100)}% troop DEF — rounds 1,3,5,7,9`,
  },
};

// ── HEXBLADE OREN (balanced, Apprentice) ──────────────────────────────────────
// Balanced: combat + defense + tactics mix. Experimental, unstable raw power —
//           a student who hasn't mastered the line between offense and survival.
// Stats: ATK 90, FOC 60 — modest hybrid; versatile but unfocused, raw energy
//        spilling into all areas. Hex-laced strikes, improvised defense, bursts.

// ★ 2 Unique Skills

export const OREN_UNIQUE_SKILLS = {
  oren_hex_discharge: {
    name: "Hex Discharge", icon: "⚡", tree: "combat", cls: "balanced",
    faction: "bountyhunters", commander: "h18",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Oren releases a built-up surge of unstable hex energy — crashing into all enemies and sending raw power rebounding through the formation.",
    cmdAoe: true, cmdMult: 1.9, followUpChance: 0.45, followUpPct: 1.1, base: 1.9, perLevel: 0.15,
    nextDesc: (lvl) => `All enemies ${Math.round((1.9 + lvl * 0.15) * 100)}% AoE + 45% chance single follow-up 110% — rounds 2,6,10`,
  },
  oren_unstable_ward: {
    name: "Unstable Ward", icon: "🔷", tree: "defense", cls: "balanced",
    faction: "bountyhunters", commander: "h18",
    type: "passive",
    desc: "Oren's self-taught ward is volatile but effective — permanently reducing incoming damage and occasionally bolstering troop defense.",
    passiveDmgReduce: 0.04, passiveTroopDef: 0.05, base: 0.04, perLevel: 0.02,
    nextDesc: (lvl) => `-${Math.round((0.04 + lvl * 0.02) * 100)}% incoming dmg & +${Math.round(0.05 * 100)}% troop DEF (permanent)`,
  },
};

// 10 Reskins — balanced: 4 combat, 3 defense, 3 tactics

export const OREN_RESKIN_SKILLS = {
  oren_quick_strike: {
    name: "Hex Snap", icon: "⚡", tree: "combat", cls: "balanced",
    faction: "bountyhunters", commander: "h18",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Oren fires off a quick hex snap before the enemy can react — every other round.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  oren_savage_blow: {
    name: "Raw Power Strike", icon: "🗡", tree: "combat", cls: "balanced",
    faction: "bountyhunters", commander: "h18",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "Oren channels unrefined power into a single crushing blow — leaving the target exposed.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  oren_killing_instinct: {
    name: "Apprentice's Edge", icon: "⚔", tree: "combat", cls: "balanced",
    faction: "bountyhunters", commander: "h18",
    type: "passive",
    desc: "Even half-trained, Oren hits harder than most. Permanently increased commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  oren_battle_frenzy: {
    name: "Volatile Frenzy", icon: "🔥", tree: "combat", cls: "balanced",
    faction: "bountyhunters", commander: "h18",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Oren's unstable power spikes unpredictably every other round — raw crit and damage.",
    cmdMult: 1.15, critBonus: 0.30, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `${Math.round((1.15 + lvl * 0.05) * 100)}% damage + 30% crit — rounds 2,4,6,8,10`,
  },
  oren_shield_wall: {
    name: "Hex Barrier", icon: "🏰", tree: "defense", cls: "balanced",
    faction: "bountyhunters", commander: "h18",
    type: "active", cooldown: 2, offset: 1, duration: 2,
    desc: "Oren throws up a crackling hex barrier every other round — reducing all incoming damage.",
    dmgReduce: 0.12, base: 0.12, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.04) * 100)}% all dmg (2 rnd) — rounds 1,3,5,7,9`,
  },
  oren_hold_the_line: {
    name: "Brace the Hex", icon: "🚩", tree: "defense", cls: "balanced",
    faction: "bountyhunters", commander: "h18",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Oren forces his troops to brace behind hex-shields every other round.",
    troopDmgReduce: 0.14, base: 0.14, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.14 + lvl * 0.04) * 100)}% troop dmg — rounds 2,4,6,8,10`,
  },
  oren_fortified_ranks: {
    name: "Hex-Forged Ranks", icon: "🪖", tree: "defense", cls: "balanced",
    faction: "bountyhunters", commander: "h18",
    type: "passive",
    desc: "Oren's half-formed defensive runes permanently harden his troops.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% troop DEF (permanent)`,
  },
  oren_mending_wave: {
    name: "Hex Mend", icon: "✨", tree: "tactics", cls: "balanced",
    faction: "bountyhunters", commander: "h18",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Oren redirects hex energy into a restorative wave — patching up troops every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06 + lvl * 0.02) * 100)}% lost troops — rounds 2,4,6,8,10`,
  },
  oren_blind_strike: {
    name: "Hex Flash", icon: "👁", tree: "tactics", cls: "balanced",
    faction: "bountyhunters", commander: "h18",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "A flash of unstable hex energy disorients the enemy — reducing their attack for 2 rounds.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  oren_inspiring_presence: {
    name: "Raw Enthusiasm", icon: "⭐", tree: "tactics", cls: "balanced",
    faction: "bountyhunters", commander: "h18",
    type: "passive",
    desc: "Oren's reckless confidence is infectious — permanently boosts troop attack.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
  },
};

// ── ARCHMAGE THEON (support, Warlock) ─────────────────────────────────────────
// Support: tactics tree. Dark pacts, forbidden power, sacrifice — the most
//          powerful pure caster in the faction.
// Stats: ATK 40, FOC 210 — highest FOC of any hero; extreme debuff potency,
//        deep healing, soul-pact flavored curses and restoration.

// ★ 2 Unique Skills

export const THEON_UNIQUE_SKILLS = {
  theon_soul_pact: {
    name: "Soul Pact", icon: "💀", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h29",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Theon seals a pact with darker forces — a massive restoration of his forces and total denial of enemy healing at once.",
    healPct: 0.22, blockHeal: 3, base: 0.22, perLevel: 0.04,
    nextDesc: (lvl) => `Heal ${Math.round((0.22 + lvl * 0.04) * 100)}% lost troops + block enemy heal 3 rnd — rounds 1,6`,
  },
  theon_forbidden_vigil: {
    name: "Forbidden Vigil", icon: "🌑", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h29",
    type: "passive",
    desc: "Theon's dark pact keeps a constant watch — forbidden energy restores troops every round and permanently boosts troop attack.",
    passiveHealPerRound: 0.02, passiveTroopAtk: 0.05, base: 0.02, perLevel: 0.005,
    nextDesc: (lvl) => `Restore ${Math.round((0.02 + lvl * 0.005) * 100)}% lost troops/round & +${Math.round(0.05 * 100)}% troop ATK (permanent)`,
  },
};

// 10 Reskins — support pool, dark-pact Warlock theme

export const THEON_RESKIN_SKILLS = {
  theon_field_medic: {
    name: "Dark Sustenance", icon: "💚", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h29",
    type: "passive",
    desc: "Theon's pact continuously draws life back into his formation every round.",
    passiveHealPerRound: 0.02, base: 0.02, perLevel: 0.01,
    nextDesc: (lvl) => `Restore ${Math.round((0.02 + lvl * 0.01) * 100)}% lost troops/round`,
  },
  theon_mending_wave: {
    name: "Warlock's Mending", icon: "✨", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h29",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Forbidden restoration energy surges through the ranks every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06 + lvl * 0.02) * 100)}% lost troops — rounds 2,4,6,8,10`,
  },
  theon_rally_cry: {
    name: "Pact's Resurgence", icon: "🚩", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h29",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Theon calls in a dark debt — massive restoration of all fallen soldiers.",
    healPct: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `Restore ${Math.round((0.18 + lvl * 0.04) * 100)}% lost troops — rounds 1,6`,
  },
  theon_battle_hymn: {
    name: "Warlock's Chant", icon: "🎵", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h29",
    type: "active", cooldown: 3, offset: 3, duration: 2,
    desc: "A forbidden chant drags power from the beyond — all troops attack with dark ferocity.",
    troopAtkMult: 1.18, base: 1.18, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.18 + lvl * 0.06) * 100 - 100)}% troop ATK (2 rnd) — rounds 3,6,9`,
  },
  theon_inspiring_presence: {
    name: "Dark Authority", icon: "⭐", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h29",
    type: "passive",
    desc: "Theon's sheer mastery of forbidden arts permanently drives troops to fight harder.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
  },
  theon_hex_curse: {
    name: "Warlock's Curse", icon: "🔮", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h29",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "A Warlock's hex corrodes the enemy's aim — their attacks miss with frightening regularity.",
    enemyMissChance: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.18 + lvl * 0.04) * 100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  theon_blind_strike: {
    name: "Forbidden Blind", icon: "👁", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h29",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Theon reaches into the enemy's mind through forbidden arts — dulling their attack.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  theon_supply_cut: {
    name: "Sever the Lifeline", icon: "✂", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h29",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Theon severs the enemy's life-energy channels — no healing reaches them.",
    blockHeal: 3, base: 3, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${3 + lvl} rounds — rounds 3,8`,
  },
  theon_guardian_aura: {
    name: "Warlock's Ward", icon: "🌿", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h29",
    type: "passive",
    desc: "Forbidden ward magic permanently hardens every soldier under Theon's protection.",
    passiveTroopDef: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop DEF (permanent)`,
  },
  theon_second_wind: {
    name: "Second Pact", icon: "💨", tree: "tactics", cls: "support",
    faction: "bountyhunters", commander: "h29",
    type: "active", cooldown: 5, offset: 5, duration: 2,
    desc: "Theon invokes a second dark contract — restoring troops and surging attack at the critical moment.",
    healPct: 0.12, troopAtkMult: 1.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `Heal ${Math.round((0.12 + lvl * 0.03) * 100)}% + +${Math.round((0.12 + lvl * 0.03) * 100 - 100)}% troop ATK (2 rnd) — rounds 5,10`,
  },
};

// ── SPELLBLADE RYN (strategist, Warlock) ──────────────────────────────────────
// Strategist: tactics-heavy + combat secondary. Dark pacts, forbidden power,
//             sacrifice — a warrior who channels Warlock energy through a blade.
// Stats: ATK 155, FOC 130 — strong hybrid; high physical + high focus;
//        brutal strikes wrapped in debuffs and vulnerability exposure.

// ★ 2 Unique Skills

export const RYN_UNIQUE_SKILLS = {
  ryn_forbidden_blade: {
    name: "Forbidden Blade", icon: "🌑", tree: "combat", cls: "strategist",
    faction: "bountyhunters", commander: "h30",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "Ryn channels forbidden Warlock energy through the blade — a massive strike that shatters the enemy's resistance and leaves them bleeding for further punishment.",
    cmdMult: 2.8, enemyDmgTakenUp: 0.18, base: 2.8, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.8 + lvl * 0.20) * 100)}% damage + ${Math.round(0.18 * 100)}% enemy vulnerability — rounds 3,6,9`,
  },
  ryn_dark_pact_strike: {
    name: "Dark Pact Strike", icon: "💀", tree: "tactics", cls: "strategist",
    faction: "bountyhunters", commander: "h30",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "Ryn invokes a dark pact mid-combat — enemy damage is gutted and their healing is severed simultaneously.",
    enemyDmgReduce: 0.20, blockHeal: 2, base: 0.20, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.20 + lvl * 0.04) * 100)}% enemy dmg & block heal 2 rnd (2 rnd) — rounds 2,6,10`,
  },
};

// 10 Reskins — 5 tactics + 5 combat for strategist, Warlock spellblade theme

export const RYN_RESKIN_SKILLS = {
  // Tactics (5)
  ryn_expose_weakness: {
    name: "Spellblade's Mark", icon: "🎯", tree: "tactics", cls: "strategist",
    faction: "bountyhunters", commander: "h30",
    type: "active", cooldown: 3, offset: 2, duration: 2,
    desc: "Ryn marks the enemy formation with a Warlock's seal — all damage dealt to them is amplified.",
    enemyDmgTakenUp: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `Enemy takes +${Math.round((0.12 + lvl * 0.03) * 100)}% more dmg (2 rnd) — rounds 2,5,8`,
  },
  ryn_hex_curse: {
    name: "Warlock's Hex", icon: "🔮", tree: "tactics", cls: "strategist",
    faction: "bountyhunters", commander: "h30",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "Ryn weaves a hex between strikes — enemy attacks lose their accuracy for 2 rounds.",
    enemyMissChance: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.18 + lvl * 0.04) * 100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  ryn_blind_strike: {
    name: "Forbidden Unraveling", icon: "👁", tree: "tactics", cls: "strategist",
    faction: "bountyhunters", commander: "h30",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Ryn unravels the enemy's combat focus through dark arts — attack is reduced for 2 rounds.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  ryn_supply_cut: {
    name: "Sever the Pact", icon: "✂", tree: "tactics", cls: "strategist",
    faction: "bountyhunters", commander: "h30",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Ryn severs the enemy's healing pact — no restoration reaches them.",
    blockHeal: 3, base: 3, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${3 + lvl} rounds — rounds 3,8`,
  },
  ryn_foresight: {
    name: "Warlock's Foresight", icon: "🔭", tree: "tactics", cls: "strategist",
    faction: "bountyhunters", commander: "h30",
    type: "active", cooldown: 4, offset: 4, duration: 1,
    desc: "The dark pact whispers the future — Ryn nullifies the enemy's skill before it fires.",
    nullifySkill: true, base: 1, perLevel: 0,
    nextDesc: () => `Nullify enemy skill — rounds 4,8`,
  },
  // Combat (5)
  ryn_killing_instinct: {
    name: "Spellblade's Instinct", icon: "⚔", tree: "combat", cls: "strategist",
    faction: "bountyhunters", commander: "h30",
    type: "passive",
    desc: "Ryn's blade is an extension of dark pact energy. Permanently increased commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  ryn_quick_strike: {
    name: "Blade Flash", icon: "⚡", tree: "combat", cls: "strategist",
    faction: "bountyhunters", commander: "h30",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Ryn's blade moves faster than the eye can follow — a rapid forbidden strike every other round.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  ryn_execute: {
    name: "Contract Fulfilled", icon: "💀", tree: "combat", cls: "strategist",
    faction: "bountyhunters", commander: "h30",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "The contract was signed in darkness. Ryn collects — a devastating blow at opening and again at the turning point.",
    cmdMult: 3.0, base: 3.0, perLevel: 0.25,
    nextDesc: (lvl) => `${Math.round((3.0 + lvl * 0.25) * 100)}% damage — rounds 1,6`,
  },
  ryn_predator_eyes: {
    name: "Dark Sight", icon: "🦅", tree: "combat", cls: "strategist",
    faction: "bountyhunters", commander: "h30",
    type: "passive",
    desc: "The pact grants Ryn vision beyond normal sight. Permanently increased crit chance.",
    passiveCritChance: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% crit chance (permanent)`,
  },
  ryn_double_strike: {
    name: "Pact-Driven Twin Strike", icon: "⚔", tree: "combat", cls: "strategist",
    faction: "bountyhunters", commander: "h30",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "The dark pact lends Ryn a second strike — two forbidden hits delivered as one fluid motion.",
    cmdHits: 2, cmdMult: 1.2, base: 1.2, perLevel: 0.10,
    nextDesc: (lvl) => `2 hits ×${(1.2 + lvl * 0.10).toFixed(2)} — rounds 2,6,10`,
  },
};

// ── Merged export ─────────────────────────────────────────────────────────────

export const BOUNTYHUNTERS_SKILLS = {
  ...VEX_UNIQUE_SKILLS,
  ...VEX_RESKIN_SKILLS,
  ...MIRA_UNIQUE_SKILLS,
  ...MIRA_RESKIN_SKILLS,
  ...DOV_UNIQUE_SKILLS,
  ...DOV_RESKIN_SKILLS,
  ...OREN_UNIQUE_SKILLS,
  ...OREN_RESKIN_SKILLS,
  ...THEON_UNIQUE_SKILLS,
  ...THEON_RESKIN_SKILLS,
  ...RYN_UNIQUE_SKILLS,
  ...RYN_RESKIN_SKILLS,
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const BOUNTYHUNTERS_BRANCH_SKILL_MAP = {
  // Solarius Vex (support, Sage)
  // Ancient light healer — dual-purpose heal+blind unique in branch 2, passive anchor
  h5: [
    { main: "vex_sage_vigil",         sides: ["vex_field_medic",       "vex_guardian_aura"]      },
    { main: "vex_mending_wave",       sides: ["vex_blind_strike",      "vex_hex_curse"]           },
    { main: "vex_ancient_light",      sides: ["vex_rally_cry",         "vex_supply_cut"]          },
    { main: "vex_battle_hymn",        sides: ["vex_inspiring_presence","vex_second_wind"]         },
  ],
  // Mira Ashveil (attacker, Sage)
  // Arcane hunter — vulnerability strike unique branch 2, passive ATK+crit anchor
  h6: [
    { main: "mira_veil_instinct",     sides: ["mira_killing_instinct", "mira_predator_eyes"]     },
    { main: "mira_quick_strike",      sides: ["mira_battle_frenzy",    "mira_battle_hunger"]     },
    { main: "mira_ashveil_strike",    sides: ["mira_savage_blow",      "mira_killing_edge"]      },
    { main: "mira_execute",           sides: ["mira_double_strike",    "mira_sweeping_strike"]   },
  ],
  // Runekeeper Dov (leader, Apprentice)
  // Rune authority — formation unique branch 2, explosive unique branch 3
  h17: [
    { main: "dov_rune_aura",          sides: ["dov_legion_discipline", "dov_siege_mastery"]      },
    { main: "dov_rune_roar",          sides: ["dov_tactical_advance",  "dov_shield_order"]       },
    { main: "dov_rune_surge",         sides: ["dov_grand_inscription", "dov_war_council"]        },
    { main: "dov_unstable_inscription",sides: ["dov_supply_cut",       "dov_forced_march"]       },
  ],
  // Hexblade Oren (balanced, Apprentice)
  // Volatile generalist — AoE discharge unique branch 2, defensive passive anchor
  h18: [
    { main: "oren_unstable_ward",     sides: ["oren_killing_instinct", "oren_fortified_ranks"]   },
    { main: "oren_quick_strike",      sides: ["oren_shield_wall",      "oren_blind_strike"]      },
    { main: "oren_hex_discharge",     sides: ["oren_savage_blow",      "oren_battle_frenzy"]     },
    { main: "oren_hold_the_line",     sides: ["oren_mending_wave",     "oren_inspiring_presence"] },
  ],
  // Archmage Theon (support, Warlock)
  // Dark pact healer — heal+blockHeal unique branch 2, passive heal+ATK anchor
  h29: [
    { main: "theon_forbidden_vigil",  sides: ["theon_field_medic",     "theon_guardian_aura"]    },
    { main: "theon_mending_wave",     sides: ["theon_blind_strike",    "theon_hex_curse"]        },
    { main: "theon_soul_pact",        sides: ["theon_rally_cry",       "theon_supply_cut"]       },
    { main: "theon_battle_hymn",      sides: ["theon_inspiring_presence","theon_second_wind"]    },
  ],
  // Spellblade Ryn (strategist, Warlock)
  // Debuff-first, heavy strikes second — dark pact debuff unique branch 2, blade unique branch 3
  h30: [
    { main: "ryn_killing_instinct",   sides: ["ryn_predator_eyes",     "ryn_foresight"]          },
    { main: "ryn_expose_weakness",    sides: ["ryn_hex_curse",         "ryn_blind_strike"]       },
    { main: "ryn_dark_pact_strike",   sides: ["ryn_supply_cut",        "ryn_quick_strike"]       },
    { main: "ryn_forbidden_blade",    sides: ["ryn_double_strike",     "ryn_execute"]            },
  ],
};
