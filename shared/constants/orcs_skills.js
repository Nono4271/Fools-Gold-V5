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
// Attacker: combat tree. Savage, relentless, overwhelming Marauder.
// Stats: ATK 155, FOC 0, SPD 60 — very high ATK, low SPD; slow but devastating.
//        Bone-crushing hits, % HP damage, lifesteal. No finesse — pure obliteration.

// ★ 2 Unique Skills

export const GRIMTUSK_UNIQUE_SKILLS = {
  grimtusk_bone_crusher: {
    name: "Bone Crusher", icon: "💀", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "Grimtusk swings with everything he has — a savage multi-hit that shatters armor and leaves the enemy broken and exposed.",
    cmdHits: 2, cmdMult: 1.7, enemyDmgTakenUp: 0.18, base: 1.7, perLevel: 0.15,
    nextDesc: (lvl) => `2 hits ×${(1.7 + lvl * 0.15).toFixed(2)} + ${Math.round(0.18 * 100)}% enemy vulnerability — rounds 3,6,9`,
  },
  grimtusk_marauder_fury: {
    name: "Marauder's Fury", icon: "🔥", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "passive",
    desc: "Grimtusk was born furious. Permanently amplified commander damage and crit chance.",
    passiveCmdAtk: 0.12, passiveCritChance: 0.06, base: 0.12, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.12 + lvl * 0.05) * 100)}% cmd ATK & +6% crit (permanent)`,
  },
};

// 10 Reskins — attacker pool, savage Marauder theme

export const GRIMTUSK_RESKIN_SKILLS = {
  grimtusk_killing_instinct: {
    name: "Predator's Hunger", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "passive",
    desc: "Grimtusk hunts by instinct. Permanently increased commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  grimtusk_quick_strike: {
    name: "Tusk Lunge", icon: "⚡", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Grimtusk lunges forward with his tusks — a rapid brutal hit every other round.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  grimtusk_savage_blow: {
    name: "Marauder's Smash", icon: "🗡", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "A full-force Marauder smash every 3 rounds — leaves the enemy staggered and exposed.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  grimtusk_execute: {
    name: "Skull Cleave", icon: "💀", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Grimtusk opens with his most devastating blow — and repeats it mid-fight.",
    cmdMult: 3.0, base: 3.0, perLevel: 0.25,
    nextDesc: (lvl) => `${Math.round((3.0 + lvl * 0.25) * 100)}% damage — rounds 1,6`,
  },
  grimtusk_battle_frenzy: {
    name: "Blood Rage", icon: "🩸", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Grimtusk enters a blood rage — every other round his strikes erupt with savage crit.",
    cmdMult: 1.15, critBonus: 0.30, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `${Math.round((1.15 + lvl * 0.05) * 100)}% damage + 30% crit — rounds 2,4,6,8,10`,
  },
  grimtusk_killing_edge: {
    name: "Gut Wound", icon: "🔪", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Grimtusk aims for maximum damage — direct hits equal to a portion of the enemy's full strength.",
    cmdPctDmg: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.06 + lvl * 0.02) * 100)}% enemy max HP direct dmg — rounds 5,10`,
  },
  grimtusk_deathblow: {
    name: "Tusk Deathblow", icon: "💥", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "A targeted tusk strike aimed at the heart of the enemy formation — brutal % HP damage with massive crit.",
    cmdPctDmg: 0.10, critBonus: 0.50, base: 0.10, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.10 + lvl * 0.02) * 100)}% max HP direct + 50% crit — rounds 3,8`,
  },
  grimtusk_battle_hunger: {
    name: "Marauder's Feed", icon: "🦷", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Grimtusk fights and feeds simultaneously — his troops recover from the carnage he deals.",
    cmdMult: 1.3, lifesteal: 0.25, base: 0.25, perLevel: 0.05,
    nextDesc: (lvl) => `130% damage, restore troops = ${Math.round((0.25 + lvl * 0.05) * 100)}% of damage dealt — rounds 1,4,7,10`,
  },
  grimtusk_double_strike: {
    name: "Twin Tusk", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Both tusks swing in sequence — two crushing blows as one savage motion.",
    cmdHits: 2, cmdMult: 1.2, base: 1.2, perLevel: 0.10,
    nextDesc: (lvl) => `2 hits ×${(1.2 + lvl * 0.10).toFixed(2)} — rounds 2,6,10`,
  },
  grimtusk_relentless: {
    name: "Relentless Marauder", icon: "🗡", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h9",
    type: "active", cooldown: 1, offset: 1, duration: 1,
    desc: "Grimtusk never stops. A thundering blow every single round without pause.",
    cmdMult: 1.08, base: 1.08, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((1.08 + lvl * 0.04) * 100)}% damage — every round`,
  },
};

// ── ASHGRIP (balanced, Marauder) ──────────────────────────────────────────────
// Balanced: combat + defense + tactics mix. Savage yet calculating — a Marauder
//           who outlasts as much as he overwhelms.
// Stats: ATK 115, FOC 0, SPD 65 — strong ATK; melee-heavy strikes, improvised
//        durability, troop morale. The survivor of the two Marauders.

// ★ 2 Unique Skills

export const ASHGRIP_UNIQUE_SKILLS = {
  ashgrip_iron_tide: {
    name: "Iron Tide", icon: "🌊", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "Ashgrip drives his forces forward in an unstoppable tide — troop attack surges and all damage received is reduced as momentum builds.",
    troopAtkMult: 1.20, dmgReduce: 0.12, base: 1.20, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.20 + lvl * 0.05) * 100)}% troop ATK & -12% all dmg (3 rnd) — rounds 1,5,9`,
  },
  ashgrip_scarred_hide: {
    name: "Scarred Hide", icon: "🛡", tree: "defense", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "Every scar is a lesson. Ashgrip permanently reduces incoming damage and hardens his troops.",
    passiveDmgReduce: 0.04, passiveTroopDef: 0.05, base: 0.04, perLevel: 0.02,
    nextDesc: (lvl) => `-${Math.round((0.04 + lvl * 0.02) * 100)}% incoming dmg & +${Math.round(0.05 * 100)}% troop DEF (permanent)`,
  },
};

// 10 Reskins — balanced: 4 combat, 3 defense, 3 tactics

export const ASHGRIP_RESKIN_SKILLS = {
  ashgrip_quick_strike: {
    name: "Ash Lunge", icon: "⚡", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Ashgrip closes the distance with brutal speed — a fast hit every other round.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  ashgrip_savage_blow: {
    name: "Crushing Grip", icon: "🗡", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "Ashgrip grabs and crushes — a powerful blow every 3 rounds that leaves the enemy exposed.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  ashgrip_killing_instinct: {
    name: "Marauder's Eye", icon: "⚔", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "A Marauder never stops sizing up the enemy. Permanently increased commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  ashgrip_battle_hunger: {
    name: "Savage Recovery", icon: "🩸", tree: "combat", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Ashgrip fights through the pain and drags his crew along — restoring troops from each strike.",
    cmdMult: 1.3, lifesteal: 0.25, base: 0.25, perLevel: 0.05,
    nextDesc: (lvl) => `130% damage, restore troops = ${Math.round((0.25 + lvl * 0.05) * 100)}% of damage dealt — rounds 1,4,7,10`,
  },
  ashgrip_shield_wall: {
    name: "Ash Wall", icon: "🏰", tree: "defense", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "active", cooldown: 2, offset: 1, duration: 2,
    desc: "Ashgrip orders his Marauders to brace — reducing all incoming damage every other round.",
    dmgReduce: 0.12, base: 0.12, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.04) * 100)}% all dmg (2 rnd) — rounds 1,3,5,7,9`,
  },
  ashgrip_hold_the_line: {
    name: "Hold Ground", icon: "🚩", tree: "defense", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "No orc retreats. Ashgrip holds every position — reducing troop damage every other round.",
    troopDmgReduce: 0.14, base: 0.14, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.14 + lvl * 0.04) * 100)}% troop dmg — rounds 2,4,6,8,10`,
  },
  ashgrip_fortified_ranks: {
    name: "Ironback Formation", icon: "🪖", tree: "defense", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "Ashgrip trains his Marauders to take hits and keep moving. Permanently hardened troop defense.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% troop DEF (permanent)`,
  },
  ashgrip_mending_wave: {
    name: "Bind the Wounds", icon: "✨", tree: "tactics", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Ashgrip patches up his crew between bouts — restoring troops every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06 + lvl * 0.02) * 100)}% lost troops — rounds 2,4,6,8,10`,
  },
  ashgrip_inspiring_presence: {
    name: "Marauder's Roar", icon: "⭐", tree: "tactics", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "passive",
    desc: "Ashgrip's battle roar permanently drives his troops to fight harder.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
  },
  ashgrip_blind_strike: {
    name: "Ash Cloud", icon: "👁", tree: "tactics", cls: "balanced",
    faction: "orcs", commander: "h10",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Ashgrip kicks up an ash cloud — the enemy fights half-blind for 2 rounds.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
};

// ── WARCROAK (leader, Raider) ─────────────────────────────────────────────────
// Leader: command tree. Fast, disruptive, hit-and-run Raider commander.
// Stats: ATK 80, FOC 0, SPD 58 — modest stats; leads through coordination,
//        disruption, and relentless supply denial. Raid-themed buffs.

// ★ 2 Unique Skills

export const WARCROAK_UNIQUE_SKILLS = {
  warcroak_raid_signal: {
    name: "Raid Signal", icon: "📯", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "Warcroak sounds the raid signal — all troops surge into ferocious attack for 3 full rounds while the enemy scrambles to respond.",
    troopAtkMult: 1.24, enemyDmgReduce: 0.10, base: 1.24, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.24 + lvl * 0.05) * 100)}% troop ATK & -10% enemy dmg (3 rnd) — rounds 1,5,9`,
  },
  warcroak_hit_and_run: {
    name: "Hit and Run", icon: "💨", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Warcroak drives his Raiders in fast, hits hard, and pulls back before the enemy can respond — garrison means nothing to a raider.",
    troopAtkMult: 1.50, garrisonIgnore: 0.22, base: 1.50, perLevel: 0.10,
    nextDesc: (lvl) => `+${Math.round((0.50 + lvl * 0.10) * 100)}% troop ATK & ignore ${Math.round(0.22 * 100)}% garrison — rounds 5,10`,
  },
};

// 10 Reskins — leader pool, hit-and-run Raider theme

export const WARCROAK_RESKIN_SKILLS = {
  warcroak_raider_aura: {
    name: "Raider's Aura", icon: "📡", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "passive",
    desc: "Warcroak's battle presence permanently drives his Raiders to strike harder.",
    passiveTroopAtk: 0.07, base: 0.07, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.07 + lvl * 0.04) * 100)}% troop ATK (permanent)`,
  },
  warcroak_warchief_roar: {
    name: "Warcroak's Roar", icon: "📣", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 2, offset: 2, duration: 2,
    desc: "A thundering battle roar from Warcroak — troops surge in attack every other round.",
    troopAtkMult: 1.15, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.15 + lvl * 0.05) * 100 - 100)}% troop ATK (2 rnd) — rounds 2,4,6,8,10`,
  },
  warcroak_grand_strategy: {
    name: "Raider's Stratagem", icon: "🗺", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "Warcroak coordinates a full raid formation — troops attack and defend in unison for 3 rounds.",
    troopAtkMult: 1.20, troopDefMult: 1.10, base: 1.20, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.20 + lvl * 0.06) * 100 - 100)}% ATK & +10% DEF (3 rnd) — rounds 1,5,9`,
  },
  warcroak_forced_march: {
    name: "Full Raid", icon: "💨", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Every Raider goes all-in at once — maximum force at the decisive moment.",
    troopAtkMult: 1.50, base: 1.50, perLevel: 0.10,
    nextDesc: (lvl) => `+${Math.round((0.50 + lvl * 0.10) * 100)}% troop ATK — rounds 5,10`,
  },
  warcroak_siege_mastery: {
    name: "Raider's Breach", icon: "🪨", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "passive",
    desc: "Raiders don't respect walls. Warcroak permanently ignores a portion of garrison fortifications.",
    passiveGarrisonIgnore: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `Ignore ${Math.round((0.06 + lvl * 0.04) * 100)}% garrison bonus (permanent)`,
  },
  warcroak_supply_cut: {
    name: "Pillage the Supply", icon: "✂", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Warcroak raids the enemy supply lines — repeatedly blocking their healing.",
    blockHeal: 2, base: 2, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${2 + lvl} rounds — rounds 1,4,7,10`,
  },
  warcroak_tactical_advance: {
    name: "Flanking Run", icon: "♟", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 4, offset: 3, duration: 2,
    desc: "Warcroak flanks the enemy with his Raiders — troops attack harder and enemy fire is disrupted.",
    troopAtkMult: 1.12, enemyDmgReduce: 0.10, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.12 + lvl * 0.04) * 100 - 100)}% troop ATK + -10% enemy dmg (2 rnd) — rounds 3,7`,
  },
  warcroak_war_council: {
    name: "Raider's Council", icon: "📜", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 5, offset: 2, duration: 1,
    desc: "Warcroak reads the enemy's next move and rallies the clan — nullifying their skill and surging attack.",
    nullifySkill: true, troopAtkMult: 1.18, base: 1.18, perLevel: 0.05,
    nextDesc: (lvl) => `Nullify enemy skill + +${Math.round((0.18 + lvl * 0.05) * 100 - 100)}% troop ATK — rounds 2,7`,
  },
  warcroak_legion_discipline: {
    name: "Raider Discipline", icon: "🪖", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "passive",
    desc: "Even Raiders need to hold the line sometimes. Permanently hardened troop defense.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% troop DEF (permanent)`,
  },
  warcroak_shield_order: {
    name: "Brace for Impact", icon: "🛡", tree: "command", cls: "leader",
    faction: "orcs", commander: "h21",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Warcroak orders his Raiders to brace every other round before the next assault.",
    troopDefMult: 1.12, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.12 + lvl * 0.04) * 100 - 100)}% troop DEF — rounds 1,3,5,7,9`,
  },
};

// ── SHAMAN GRIX (strategist, Raider) ──────────────────────────────────────────
// Strategist: tactics-heavy + combat secondary. Poison/curse themes, tribal hexes,
//             troop debuffs and disruptive strikes.
// Stats: ATK 30, FOC 100 — high FOC, very low ATK; leans heavily into debuff
//        tactics with only light physical damage. Most FOC-oriented strategist.

// ★ 2 Unique Skills

export const GRIX_UNIQUE_SKILLS = {
  grix_poison_totem: {
    name: "Poison Totem", icon: "🐍", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "Grix plants a poison totem in the battlefield — the enemy's attack crumbles and their healing is strangled for 2 rounds.",
    enemyAtkReduce: 0.18, blockHeal: 2, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.18 + lvl * 0.04) * 100)}% enemy ATK & block heal 2 rnd (2 rnd) — rounds 2,6,10`,
  },
  grix_hex_ward: {
    name: "Hex Ward", icon: "🔮", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 3, offset: 3, duration: 2,
    desc: "Grix weaves a ward of orc-hexes — the enemy strikes blindly and stumbles while his own troops push through exposed gaps.",
    enemyMissChance: 0.22, enemyDmgTakenUp: 0.10, base: 0.22, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.22 + lvl * 0.04) * 100)}% enemy miss & +10% enemy vulnerability (2 rnd) — rounds 3,6,9`,
  },
};

// 10 Reskins — 6 tactics + 4 combat (high FOC Grix leans heavily tactics)

export const GRIX_RESKIN_SKILLS = {
  // Tactics (6)
  grix_expose_weakness: {
    name: "Curse Mark", icon: "🎯", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 3, offset: 2, duration: 2,
    desc: "Grix marks the enemy formation with a tribal curse — they take greater damage from all sources.",
    enemyDmgTakenUp: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `Enemy takes +${Math.round((0.12 + lvl * 0.03) * 100)}% more dmg (2 rnd) — rounds 2,5,8`,
  },
  grix_blind_strike: {
    name: "Shaman's Blind", icon: "👁", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Grix hurls a blinding hex powder — enemy attack is reduced for 2 rounds.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  grix_supply_cut: {
    name: "Wither Curse", icon: "✂", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Grix curses the enemy's life-force — no healing reaches them for the duration.",
    blockHeal: 3, base: 3, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${3 + lvl} rounds — rounds 3,8`,
  },
  grix_foresight: {
    name: "Spirit Sight", icon: "🔭", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 4, offset: 4, duration: 1,
    desc: "Grix communes with orc spirits and foresees the enemy's next skill — nullifying it.",
    nullifySkill: true, base: 1, perLevel: 0,
    nextDesc: () => `Nullify enemy skill — rounds 4,8`,
  },
  grix_hex_curse: {
    name: "Tribal Hex", icon: "🐊", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "An ancient tribal hex clouds the enemy's battlefield vision — attacks miss repeatedly.",
    enemyMissChance: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.18 + lvl * 0.04) * 100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  grix_inspiring_presence: {
    name: "Shaman's Blessing", icon: "⭐", tree: "tactics", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "passive",
    desc: "Grix's spiritual blessing permanently emboldens every orc under his watch.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
  },
  // Combat (4)
  grix_killing_instinct: {
    name: "Shaman's Strike", icon: "⚔", tree: "combat", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "passive",
    desc: "Even a Shaman can bite. Permanently increased commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  grix_quick_strike: {
    name: "Totem Lash", icon: "⚡", tree: "combat", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Grix lashes with his totem staff — a quick strike every other round between hexes.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  grix_killing_edge: {
    name: "Curse Rupture", icon: "🔪", tree: "combat", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Grix ruptures accumulated curse energy directly into the enemy — % HP direct damage.",
    cmdPctDmg: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.06 + lvl * 0.02) * 100)}% enemy max HP direct dmg — rounds 5,10`,
  },
  grix_savage_blow: {
    name: "Totem Smash", icon: "🗡", tree: "combat", cls: "strategist",
    faction: "orcs", commander: "h22",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "A hex-charged totem smash every 3 rounds — heavy damage and lingering vulnerability.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
};

// ── WARLORD KORGATH (attacker, Warlord) ───────────────────────────────────────
// Attacker: combat tree. Dominant, commanding, crushing — the strongest attacker
//           in the orc faction.
// Stats: ATK 185, FOC 0, SPD 62 — highest ATK in faction; pure physical
//        devastation. Sweeping AoE, massive execute, relentless pressure.

// ★ 2 Unique Skills

export const KORGATH_UNIQUE_SKILLS = {
  korgath_warlord_cleave: {
    name: "Warlord's Cleave", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Korgath's cleave sweeps through the entire enemy formation — AoE devastation followed by a guaranteed crushing follow-up on the primary target.",
    cmdAoe: true, cmdMult: 1.9, followUpChance: 0.70, followUpPct: 1.4, base: 1.9, perLevel: 0.15,
    nextDesc: (lvl) => `All enemies ${Math.round((1.9 + lvl * 0.15) * 100)}% AoE + 70% chance follow-up 140% — rounds 2,6,10`,
  },
  korgath_iron_dominance: {
    name: "Iron Dominance", icon: "💢", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "passive",
    desc: "Korgath does not ask to be feared. Permanently amplified commander damage and critical chance.",
    passiveCmdAtk: 0.13, passiveCritChance: 0.07, base: 0.13, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.13 + lvl * 0.05) * 100)}% cmd ATK & +7% crit (permanent)`,
  },
};

// 10 Reskins — attacker pool, crushing Warlord theme

export const KORGATH_RESKIN_SKILLS = {
  korgath_killing_instinct: {
    name: "Warlord's Hunger", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "passive",
    desc: "Korgath is always hunting for the next kill. Permanently increased commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  korgath_quick_strike: {
    name: "Iron Rush", icon: "⚡", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Korgath crashes forward every other round — fast for someone his size.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  korgath_savage_blow: {
    name: "Crushing Blow", icon: "🗡", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "A Warlord's crushing blow every 3 rounds — leaves the enemy staggered and exposed.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  korgath_execute: {
    name: "Warlord's Verdict", icon: "💀", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Korgath opens with overwhelming force — and delivers the same verdict mid-fight.",
    cmdMult: 3.0, base: 3.0, perLevel: 0.25,
    nextDesc: (lvl) => `${Math.round((3.0 + lvl * 0.25) * 100)}% damage — rounds 1,6`,
  },
  korgath_double_strike: {
    name: "Twin Axe", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Two axes, two kills — Korgath delivers both in one fluid swing.",
    cmdHits: 2, cmdMult: 1.2, base: 1.2, perLevel: 0.10,
    nextDesc: (lvl) => `2 hits ×${(1.2 + lvl * 0.10).toFixed(2)} — rounds 2,6,10`,
  },
  korgath_predator_eyes: {
    name: "Warlord's Eye", icon: "🦅", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "passive",
    desc: "Korgath never misses a weak spot. Permanently increased crit chance.",
    passiveCritChance: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% crit chance (permanent)`,
  },
  korgath_battle_frenzy: {
    name: "Iron Frenzy", icon: "🔥", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Korgath enters an iron fury every other round — strikes hit harder with savage crit.",
    cmdMult: 1.15, critBonus: 0.30, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `${Math.round((1.15 + lvl * 0.05) * 100)}% damage + 30% crit — rounds 2,4,6,8,10`,
  },
  korgath_killing_edge: {
    name: "Shatter", icon: "🔪", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Korgath shatters the enemy's formation — direct damage equal to a portion of their total strength.",
    cmdPctDmg: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.06 + lvl * 0.02) * 100)}% enemy max HP direct dmg — rounds 5,10`,
  },
  korgath_deathblow: {
    name: "Warlord's Deathblow", icon: "💥", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Korgath targets maximum casualties — % HP direct damage with a devastating crit.",
    cmdPctDmg: 0.10, critBonus: 0.50, base: 0.10, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.10 + lvl * 0.02) * 100)}% max HP direct + 50% crit — rounds 3,8`,
  },
  korgath_relentless: {
    name: "Relentless Warlord", icon: "🗡", tree: "combat", cls: "attacker",
    faction: "orcs", commander: "h33",
    type: "active", cooldown: 1, offset: 1, duration: 1,
    desc: "A Warlord never rests. Korgath strikes every single round without pause.",
    cmdMult: 1.08, base: 1.08, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((1.08 + lvl * 0.04) * 100)}% damage — every round`,
  },
};

// ── IRONHIDE BRUK (support, Warlord) ──────────────────────────────────────────
// Support: tactics tree. Dominant, commanding — a Warlord who keeps armies alive
//          rather than leading the charge. Iron-thick and surprisingly protective.
// Stats: ATK 140, FOC 0, SPD 55 — unusually high ATK for support; flavor leans
//        into brutal protection rather than gentle healing. Army buffs + supply denial.

// ★ 2 Unique Skills

export const BRUK_UNIQUE_SKILLS = {
  bruk_iron_wall: {
    name: "Iron Wall", icon: "🛡", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "Bruk plants himself between the enemy and his troops — absorbing punishment and surging his army's defense for 3 full rounds.",
    troopDefMult: 1.22, healPct: 0.08, base: 1.22, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.22 + lvl * 0.05) * 100)}% troop DEF & heal ${Math.round(0.08 * 100)}% lost troops (3 rnd) — rounds 1,5,9`,
  },
  bruk_warlord_hide: {
    name: "Warlord's Hide", icon: "🪖", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "passive",
    desc: "Bruk's hide has stopped more weapons than any armor. Permanently reduces incoming damage and bolsters troop defense.",
    passiveDmgReduce: 0.04, passiveTroopDef: 0.05, base: 0.04, perLevel: 0.02,
    nextDesc: (lvl) => `-${Math.round((0.04 + lvl * 0.02) * 100)}% incoming dmg & +${Math.round(0.05 * 100)}% troop DEF (permanent)`,
  },
};

// 10 Reskins — support pool, iron-willed Warlord protector theme

export const BRUK_RESKIN_SKILLS = {
  bruk_field_medic: {
    name: "Bruk's Patch Job", icon: "💚", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "passive",
    desc: "Bruk keeps his orcs standing — continuously patching them up every round.",
    passiveHealPerRound: 0.02, base: 0.02, perLevel: 0.01,
    nextDesc: (lvl) => `Restore ${Math.round((0.02 + lvl * 0.01) * 100)}% lost troops/round`,
  },
  bruk_mending_wave: {
    name: "Iron Resilience", icon: "✨", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Bruk bellows at his troops to stay upright — restoring the fallen every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06 + lvl * 0.02) * 100)}% lost troops — rounds 2,4,6,8,10`,
  },
  bruk_rally_cry: {
    name: "Warlord's Rally", icon: "🚩", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Bruk's rally pulls fallen orcs back to their feet through sheer force of will.",
    healPct: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `Restore ${Math.round((0.18 + lvl * 0.04) * 100)}% lost troops — rounds 1,6`,
  },
  bruk_battle_hymn: {
    name: "War Drums of the Warlord", icon: "🥁", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "active", cooldown: 3, offset: 3, duration: 2,
    desc: "Bruk pounds out the war rhythm — every orc fights harder for 2 rounds.",
    troopAtkMult: 1.18, base: 1.18, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.18 + lvl * 0.06) * 100 - 100)}% troop ATK (2 rnd) — rounds 3,6,9`,
  },
  bruk_inspiring_presence: {
    name: "Ironhide's Presence", icon: "⭐", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "passive",
    desc: "No orc gives up when Bruk is watching. Permanently increased troop attack.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
  },
  bruk_hex_curse: {
    name: "Iron Terror", icon: "💢", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "The sight of Bruk charging forward rattles enemy aim — attacks miss for 2 rounds.",
    enemyMissChance: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.18 + lvl * 0.04) * 100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  bruk_blind_strike: {
    name: "Warlord's Intimidation", icon: "👁", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Bruk's presence alone breaks enemy morale — reducing their attack for 2 rounds.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  bruk_supply_cut: {
    name: "Pillage the Healers", icon: "✂", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Bruk has his orcs target the enemy's healers first — no restoration gets through.",
    blockHeal: 3, base: 3, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${3 + lvl} rounds — rounds 3,8`,
  },
  bruk_guardian_aura: {
    name: "Ironhide's Guard", icon: "🌿", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "passive",
    desc: "Bruk's iron presence permanently bolsters every orc's resilience.",
    passiveTroopDef: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop DEF (permanent)`,
  },
  bruk_second_wind: {
    name: "Iron Second Wind", icon: "💨", tree: "tactics", cls: "support",
    faction: "orcs", commander: "h34",
    type: "active", cooldown: 5, offset: 5, duration: 2,
    desc: "Bruk drives his orcs past their limits at the critical moment — restoring troops and surging attack.",
    healPct: 0.12, troopAtkMult: 1.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `Heal ${Math.round((0.12 + lvl * 0.03) * 100)}% + +${Math.round((0.12 + lvl * 0.03) * 100 - 100)}% troop ATK (2 rnd) — rounds 5,10`,
  },
};

// ── Merged export ─────────────────────────────────────────────────────────────

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
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const ORCS_BRANCH_SKILL_MAP = {
  // Grimtusk (attacker, Marauder)
  // Savage obliterator — multi-hit unique branch 2, passive ATK+crit anchor
  h9: [
    { main: "grimtusk_marauder_fury",   sides: ["grimtusk_killing_instinct", "grimtusk_relentless"]     },
    { main: "grimtusk_quick_strike",    sides: ["grimtusk_battle_frenzy",    "grimtusk_battle_hunger"]  },
    { main: "grimtusk_bone_crusher",    sides: ["grimtusk_savage_blow",      "grimtusk_deathblow"]      },
    { main: "grimtusk_execute",         sides: ["grimtusk_double_strike",    "grimtusk_killing_edge"]   },
  ],
  // Ashgrip (balanced, Marauder)
  // Survivor — tide unique branch 2 (ATK+dmgReduce), defensive passive anchor
  h10: [
    { main: "ashgrip_scarred_hide",     sides: ["ashgrip_killing_instinct",  "ashgrip_fortified_ranks"] },
    { main: "ashgrip_quick_strike",     sides: ["ashgrip_shield_wall",       "ashgrip_blind_strike"]    },
    { main: "ashgrip_iron_tide",        sides: ["ashgrip_savage_blow",       "ashgrip_battle_hunger"]   },
    { main: "ashgrip_hold_the_line",    sides: ["ashgrip_mending_wave",      "ashgrip_inspiring_presence"] },
  ],
  // Warcroak (leader, Raider)
  // Raid commander — surge+dmgReduce unique branch 2, garrison+ATK unique branch 3
  h21: [
    { main: "warcroak_raider_aura",     sides: ["warcroak_legion_discipline","warcroak_siege_mastery"]  },
    { main: "warcroak_warchief_roar",   sides: ["warcroak_tactical_advance", "warcroak_shield_order"]   },
    { main: "warcroak_raid_signal",     sides: ["warcroak_grand_strategy",   "warcroak_war_council"]    },
    { main: "warcroak_hit_and_run",     sides: ["warcroak_supply_cut",       "warcroak_forced_march"]   },
  ],
  // Shaman Grix (strategist, Raider)
  // Hex-heavy debuffer — dual-debuff unique branch 2, exposure+miss unique branch 3
  h22: [
    { main: "grix_killing_instinct",    sides: ["grix_inspiring_presence",   "grix_foresight"]          },
    { main: "grix_expose_weakness",     sides: ["grix_blind_strike",         "grix_hex_curse"]          },
    { main: "grix_poison_totem",        sides: ["grix_supply_cut",           "grix_quick_strike"]       },
    { main: "grix_hex_ward",            sides: ["grix_savage_blow",          "grix_killing_edge"]       },
  ],
  // Warlord Korgath (attacker, Warlord)
  // Maximum destruction — AoE cleave unique branch 2, passive ATK+crit anchor
  h33: [
    { main: "korgath_iron_dominance",   sides: ["korgath_killing_instinct",  "korgath_predator_eyes"]   },
    { main: "korgath_quick_strike",     sides: ["korgath_battle_frenzy",     "korgath_relentless"]      },
    { main: "korgath_warlord_cleave",   sides: ["korgath_savage_blow",       "korgath_deathblow"]       },
    { main: "korgath_execute",          sides: ["korgath_double_strike",     "korgath_killing_edge"]    },
  ],
  // Ironhide Bruk (support, Warlord)
  // Iron protector — wall+heal unique branch 2, passive protection anchor
  h34: [
    { main: "bruk_warlord_hide",        sides: ["bruk_field_medic",          "bruk_guardian_aura"]      },
    { main: "bruk_mending_wave",        sides: ["bruk_blind_strike",         "bruk_hex_curse"]          },
    { main: "bruk_iron_wall",           sides: ["bruk_rally_cry",            "bruk_supply_cut"]         },
    { main: "bruk_battle_hymn",         sides: ["bruk_inspiring_presence",   "bruk_second_wind"]        },
  ],
};
