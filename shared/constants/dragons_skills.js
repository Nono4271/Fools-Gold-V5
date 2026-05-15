/* ─────────────────────────────────────────────────────────────────────────────
   dragons_skills.js — Dragons Faction Skills
   72 total: 60 reskins + 12 unique skills
   6 commanders × 12 skills each

   Commanders:
     Emberclaw       (h11, balanced,   Adult)    — 10 reskins + 2 unique
     Scaleveil Dusk  (h12, support,    Adult)    — 10 reskins + 2 unique
     Ashen Kraul     (h23, leader,     Hatchling) — 10 reskins + 2 unique
     Cinderfang      (h24, balanced,   Hatchling) — 10 reskins + 2 unique
     Pyrewing Skar   (h35, attacker,   Elder)    — 10 reskins + 2 unique
     Voidscale Nyxara(h36, strategist, Elder)    — 10 reskins + 2 unique
───────────────────────────────────────────────────────────────────────────── */

// ── EMBERCLAW (balanced, Adult) ───────────────────────────────────────────────
// Balanced: combat + defense + tactics mix. Powerful, proud Adult dragon —
//           elemental breath, natural armor, sustained battlefield presence.
// Stats: ATK 155, FOC 0, SPD 75 — high ATK; physical fire strikes, troop armor,
//        moderate healing, versatile pressure.

// ★ 2 Unique Skills

export const EMBERCLAW_UNIQUE_SKILLS = {
  emberclaw_magma_charge: {
    name: "Magma Charge", icon: "🌋", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Emberclaw hurls itself forward in a blazing charge — striking all enemies with searing force and leaving them scorched and exposed to further punishment.",
    cmdAoe: true, cmdMult: 2.0, enemyDmgTakenUp: 0.14, base: 2.0, perLevel: 0.16,
    nextDesc: (lvl) => `All enemies ${Math.round((2.0 + lvl * 0.16) * 100)}% AoE + 14% enemy vulnerability — rounds 2,6,10`,
  },
  emberclaw_dragon_hide: {
    name: "Dragon Hide", icon: "🐉", tree: "defense", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "passive",
    desc: "Emberclaw's scales are battle-hardened and searing hot. Permanently reduces all incoming damage and fortifies the entire army's defenses.",
    passiveDmgReduce: 0.05, passiveTroopDef: 0.06, base: 0.05, perLevel: 0.02,
    nextDesc: (lvl) => `-${Math.round((0.05 + lvl * 0.02) * 100)}% incoming dmg & +${Math.round(0.06 * 100)}% troop DEF (permanent)`,
  },
};

// 10 Reskins — balanced: 4 combat, 3 defense, 3 tactics

export const EMBERCLAW_RESKIN_SKILLS = {
  emberclaw_killing_instinct: {
    name: "Dragon's Fury", icon: "⚔", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "passive",
    desc: "An Adult dragon never dulls its edge. Emberclaw's attacks permanently deal increased damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  emberclaw_savage_blow: {
    name: "Ember Slam", icon: "🔥", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "Emberclaw slams its burning claws into the enemy — heavy fire damage that leaves them scorched and vulnerable.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  emberclaw_battle_hunger: {
    name: "Predator's Feed", icon: "🩸", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Emberclaw feeds on battle — its strikes restore the army as it tears through the enemy.",
    cmdMult: 1.3, lifesteal: 0.25, base: 0.25, perLevel: 0.05,
    nextDesc: (lvl) => `130% damage, restore troops = ${Math.round((0.25 + lvl * 0.05) * 100)}% of damage dealt — rounds 1,4,7,10`,
  },
  emberclaw_double_strike: {
    name: "Claw and Fang", icon: "🐲", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Emberclaw rakes with claw and snaps with fang — two devastating blows in one fluid motion.",
    cmdHits: 2, cmdMult: 1.2, base: 1.2, perLevel: 0.10,
    nextDesc: (lvl) => `2 hits ×${(1.2 + lvl * 0.10).toFixed(2)} — rounds 2,6,10`,
  },
  emberclaw_iron_bastion: {
    name: "Scale Fortress", icon: "⛩", tree: "defense", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 4, offset: 2, duration: 3,
    desc: "Emberclaw spreads its wings as a shield — the army shelters beneath layers of fire-hardened scale.",
    troopDmgReduce: 0.18, base: 0.18, perLevel: 0.05,
    nextDesc: (lvl) => `-${Math.round((0.18 + lvl * 0.05) * 100)}% troop damage (3 rnd) — rounds 2,6,10`,
  },
  emberclaw_shield_wall: {
    name: "Wingshield", icon: "🏰", tree: "defense", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 2, offset: 1, duration: 2,
    desc: "Emberclaw raises its wing across the line — all incoming fire reduced every other round.",
    dmgReduce: 0.12, base: 0.12, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.04) * 100)}% all dmg (2 rnd) — rounds 1,3,5,7,9`,
  },
  emberclaw_fortified_ranks: {
    name: "Dragonscale Ranks", icon: "🪖", tree: "defense", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "passive",
    desc: "The army that marches under a dragon stands tougher. Permanently increased troop defense.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% troop DEF (permanent)`,
  },
  emberclaw_battle_hymn: {
    name: "Draconic War Cry", icon: "🎵", tree: "tactics", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 3, offset: 3, duration: 2,
    desc: "Emberclaw's roar shakes the battlefield — the army charges with terrifying force.",
    troopAtkMult: 1.18, base: 1.18, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.18 + lvl * 0.06) * 100 - 100)}% troop ATK (2 rnd) — rounds 3,6,9`,
  },
  emberclaw_inspiring_presence: {
    name: "Elder's Pride", icon: "⭐", tree: "tactics", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "passive",
    desc: "Fighting beside a proud Adult dragon inspires every soldier to fight beyond their limits.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
  },
  emberclaw_expose_weakness: {
    name: "Singe and Expose", icon: "🎯", tree: "tactics", cls: "balanced",
    faction: "dragons", commander: "h11",
    type: "active", cooldown: 3, offset: 2, duration: 2,
    desc: "Emberclaw scorches the enemy's armor away — they take greater damage from all sources for 2 rounds.",
    enemyDmgTakenUp: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `Enemy takes +${Math.round((0.12 + lvl * 0.03) * 100)}% more dmg (2 rnd) — rounds 2,5,8`,
  },
};

// ── SCALEVEIL DUSK (support, Adult) ──────────────────────────────────────────
// Support: tactics tree. Powerful, proud Adult — elemental scale-magic, healing
//          fog, debilitating breath, protective auras rooted in dusk and shadow.
// Stats: ATK 50, FOC 140, SPD 80 — high FOC; hex, healing mist, debuff breath.

// ★ 2 Unique Skills

export const SCALEVEIL_UNIQUE_SKILLS = {
  scaleveil_dusk_veil: {
    name: "Dusk Veil", icon: "🌑", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 3, offset: 2, duration: 2,
    desc: "Scaleveil breathes a cloud of shadowed scale-dust across the battlefield — enemy attacks lose their edge and all healing is choked out for 2 rounds.",
    enemyAtkReduce: 0.16, blockHeal: 2, base: 0.16, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.16 + lvl * 0.03) * 100)}% enemy ATK & block heal 2 rnd (2 rnd) — rounds 2,5,8`,
  },
  scaleveil_shadow_mend: {
    name: "Shadow Mend", icon: "🌿", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "passive",
    desc: "Scaleveil's shadow-scale aura seeps into every wound — troops are continuously restored each round and grow more resilient.",
    passiveHealPerRound: 0.02, passiveTroopDef: 0.05, base: 0.02, perLevel: 0.005,
    nextDesc: (lvl) => `Restore ${Math.round((0.02 + lvl * 0.005) * 100)}% lost troops/round & +${Math.round(0.05 * 100)}% troop DEF (permanent)`,
  },
};

// 10 Reskins — support pool, dusk-dragon/Adult theme

export const SCALEVEIL_RESKIN_SKILLS = {
  scaleveil_field_medic: {
    name: "Scale Mist Salve", icon: "💚", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "passive",
    desc: "A faint shimmer of healing mist drifts from Scaleveil's scales — troops are continuously restored.",
    passiveHealPerRound: 0.02, base: 0.02, perLevel: 0.01,
    nextDesc: (lvl) => `Restore ${Math.round((0.02 + lvl * 0.01) * 100)}% lost troops/round`,
  },
  scaleveil_mending_wave: {
    name: "Dusk Tide", icon: "✨", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "A wave of shadow-healing washes over the ranks — restoring fallen troops every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06 + lvl * 0.02) * 100)}% lost troops — rounds 2,4,6,8,10`,
  },
  scaleveil_rally_cry: {
    name: "Dragon's Resurgence", icon: "🚩", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Scaleveil unleashes a surge of restorative scale-energy — a massive wave that pulls soldiers back from the brink.",
    healPct: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `Restore ${Math.round((0.18 + lvl * 0.04) * 100)}% lost troops — rounds 1,6`,
  },
  scaleveil_hex_curse: {
    name: "Veil Curse", icon: "🔮", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "Scaleveil drapes the enemy in shadow-hexes — their strikes falter and lose accuracy.",
    enemyMissChance: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.18 + lvl * 0.04) * 100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  scaleveil_blind_strike: {
    name: "Shadowbreath", icon: "👁", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Scaleveil breathes shadow-vapor across the enemy's ranks — clouding their vision and dulling their attacks.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  scaleveil_inspiring_presence: {
    name: "Ancient Calm", icon: "⭐", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "passive",
    desc: "Scaleveil's serene dusk-aura steadies every soldier. Permanently increased troop attack.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
  },
  scaleveil_supply_cut: {
    name: "Choking Scales", icon: "✂", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Scaleveil's tail sweeps enemy supply lines — no healing reaches them for 3 rounds.",
    blockHeal: 3, base: 3, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${3 + lvl} rounds — rounds 3,8`,
  },
  scaleveil_guardian_aura: {
    name: "Scaleveil's Ward", icon: "🌿", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "passive",
    desc: "The protective shimmer of Scaleveil's scales permanently hardens the army's resilience.",
    passiveTroopDef: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop DEF (permanent)`,
  },
  scaleveil_second_wind: {
    name: "Second Dusk", icon: "💨", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 5, offset: 5, duration: 2,
    desc: "As the second twilight falls, Scaleveil surges — restoring troops and driving them to renewed fury.",
    healPct: 0.12, troopAtkMult: 1.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `Heal ${Math.round((0.12 + lvl * 0.03) * 100)}% + +${Math.round((0.12 + lvl * 0.03) * 100 - 100)}% troop ATK (2 rnd) — rounds 5,10`,
  },
  scaleveil_foresight: {
    name: "Dusk Foretelling", icon: "🔭", tree: "tactics", cls: "support",
    faction: "dragons", commander: "h12",
    type: "active", cooldown: 4, offset: 4, duration: 1,
    desc: "Scaleveil reads the shift of shadows and anticipates the enemy's next move — nullifying it before it fires.",
    nullifySkill: true, base: 1, perLevel: 0,
    nextDesc: () => `Nullify enemy skill — rounds 4,8`,
  },
};

// ── ASHEN KRAUL (leader, Hatchling) ──────────────────────────────────────────
// Leader: command tree. Scrappy, fierce, unpredictable Hatchling dragon —
//         young but unnervingly aggressive, drives the army with raw draconic ego.
// Stats: ATK 78, FOC 0, SPD 68 — modest stats; compensates with bold command
//        skills, garrison-breaking, army surge tactics.

// ★ 2 Unique Skills

export const KRAUL_UNIQUE_SKILLS = {
  kraul_hatchling_fury: {
    name: "Hatchling's Fury", icon: "🐲", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Kraul's unbridled rage is infectious — the whole army charges with reckless abandon, striking harder while the enemy's resistance crumbles.",
    troopAtkMult: 1.24, enemyDmgTakenUp: 0.10, base: 1.24, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.24 + lvl * 0.05) * 100)}% troop ATK & +10% enemy vulnerability (2 rnd) — rounds 1,4,7,10`,
  },
  kraul_ash_dominance: {
    name: "Ash Dominance", icon: "💨", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "passive",
    desc: "Even young, Kraul commands with absolute authority. Troops permanently strike harder and hold firmer under its ash-smoke presence.",
    passiveTroopAtk: 0.08, passiveTroopDef: 0.05, base: 0.08, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.03) * 100)}% troop ATK & +${Math.round(0.05 * 100)}% troop DEF (permanent)`,
  },
};

// 10 Reskins — leader pool, scrappy Hatchling dragon theme

export const KRAUL_RESKIN_SKILLS = {
  kraul_warchief_aura: {
    name: "Hatchling War-Aura", icon: "📡", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "passive",
    desc: "Even as a Hatchling, Kraul radiates dragon authority. Troops permanently fight with greater ferocity.",
    passiveTroopAtk: 0.07, base: 0.07, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.07 + lvl * 0.04) * 100)}% troop ATK (permanent)`,
  },
  kraul_warchief_roar: {
    name: "Ashen Roar", icon: "📣", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 2, offset: 2, duration: 2,
    desc: "Kraul unleashes a thunderous roar through the ranks — the army surges in attack every other round.",
    troopAtkMult: 1.15, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.15 + lvl * 0.05) * 100 - 100)}% troop ATK (2 rnd) — rounds 2,4,6,8,10`,
  },
  kraul_grand_strategy: {
    name: "Feral Grand Charge", icon: "🗺", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "Kraul coordinates a savage charge — the whole army pushes forward with attack and defense surging.",
    troopAtkMult: 1.20, troopDefMult: 1.10, base: 1.20, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.20 + lvl * 0.06) * 100 - 100)}% ATK & +10% DEF (3 rnd) — rounds 1,5,9`,
  },
  kraul_forced_march: {
    name: "Ash Sprint", icon: "💨", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Kraul ignites the army with its own frantic energy — everyone charges at full throttle.",
    troopAtkMult: 1.50, base: 1.50, perLevel: 0.10,
    nextDesc: (lvl) => `+${Math.round((0.50 + lvl * 0.10) * 100)}% troop ATK — rounds 5,10`,
  },
  kraul_supply_cut: {
    name: "Claw the Supply Line", icon: "✂", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Kraul tears through enemy supply lines with wild abandon — blocking all healing.",
    blockHeal: 2, base: 2, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${2 + lvl} rounds — rounds 1,4,7,10`,
  },
  kraul_tactical_advance: {
    name: "Dragon Surge", icon: "♟", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 4, offset: 3, duration: 2,
    desc: "Kraul pushes the army into a coordinated surge — attack climbs and enemy fire weakens.",
    troopAtkMult: 1.12, enemyDmgReduce: 0.10, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.12 + lvl * 0.04) * 100 - 100)}% troop ATK + -10% enemy dmg (2 rnd) — rounds 3,7`,
  },
  kraul_war_council: {
    name: "Hatchling War Council", icon: "📜", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 5, offset: 2, duration: 1,
    desc: "Kraul sniffs out the enemy's plan and disrupts it — then rallies the army in the same breath.",
    nullifySkill: true, troopAtkMult: 1.18, base: 1.18, perLevel: 0.05,
    nextDesc: (lvl) => `Nullify enemy skill + +${Math.round((0.18 + lvl * 0.05) * 100 - 100)}% troop ATK — rounds 2,7`,
  },
  kraul_legion_discipline: {
    name: "Ash-Steel Ranks", icon: "🪖", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "passive",
    desc: "Kraul's troops may be small but they fight like dragons. Permanently hardened troop defenses.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% troop DEF (permanent)`,
  },
  kraul_siege_mastery: {
    name: "Young Siege Instinct", icon: "🪨", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "passive",
    desc: "Even young dragons know how to tear down walls. Permanently ignores a portion of garrison bonuses.",
    passiveGarrisonIgnore: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `Ignore ${Math.round((0.06 + lvl * 0.04) * 100)}% garrison bonus (permanent)`,
  },
  kraul_shield_order: {
    name: "Scale-Shield Order", icon: "🛡", tree: "command", cls: "leader",
    faction: "dragons", commander: "h23",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Kraul snaps orders — troops raise shields and hunker down every other round.",
    troopDefMult: 1.12, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.12 + lvl * 0.04) * 100 - 100)}% troop DEF — rounds 1,3,5,7,9`,
  },
};

// ── CINDERFANG (balanced, Hatchling) ──────────────────────────────────────────
// Balanced: combat + defense + tactics mix. Scrappy, fierce, unpredictable
//           Hatchling — raw fire-breath, hit-and-run, instinct-driven combat.
// Stats: ATK 100, FOC 0, SPD 58 — solid physical attacker; brawler-type balanced
//        with fire-theme throughout.

// ★ 2 Unique Skills

export const CINDERFANG_UNIQUE_SKILLS = {
  cinderfang_fire_frenzy: {
    name: "Fire Frenzy", icon: "🔥", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Cinderfang enters a wild fire-frenzy — a rapid three-hit barrage that sets whatever it touches ablaze and makes the enemy more vulnerable.",
    cmdHits: 3, cmdMult: 0.95, enemyDmgTakenUp: 0.12, base: 0.95, perLevel: 0.08,
    nextDesc: (lvl) => `3 hits ×${(0.95 + lvl * 0.08).toFixed(2)} + 12% enemy vulnerability — rounds 1,4,7,10`,
  },
  cinderfang_cinder_hide: {
    name: "Cinder Hide", icon: "🐲", tree: "defense", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "passive",
    desc: "Cinderfang's ember-scales glow with smoldering heat — permanently reducing incoming damage and toughening the army's resolve.",
    passiveDmgReduce: 0.04, passiveTroopDef: 0.05, base: 0.04, perLevel: 0.02,
    nextDesc: (lvl) => `-${Math.round((0.04 + lvl * 0.02) * 100)}% incoming dmg & +${Math.round(0.05 * 100)}% troop DEF (permanent)`,
  },
};

// 10 Reskins — balanced: 4 combat, 3 defense, 3 tactics

export const CINDERFANG_RESKIN_SKILLS = {
  cinderfang_killing_instinct: {
    name: "Cinder Instinct", icon: "⚔", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "passive",
    desc: "Born to burn and bite. Cinderfang permanently strikes with greater force.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  cinderfang_quick_strike: {
    name: "Snap Bite", icon: "⚡", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Cinderfang snaps with reckless speed — a quick, hot bite every other round.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  cinderfang_battle_hunger: {
    name: "Ember Feed", icon: "🩸", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Cinderfang feeds on the fire of battle — striking hard and restoring troops from the carnage.",
    cmdMult: 1.3, lifesteal: 0.25, base: 0.25, perLevel: 0.05,
    nextDesc: (lvl) => `130% damage, restore troops = ${Math.round((0.25 + lvl * 0.05) * 100)}% of damage dealt — rounds 1,4,7,10`,
  },
  cinderfang_savage_blow: {
    name: "Char Strike", icon: "🔥", tree: "combat", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "A searing strike that chars through armor and leaves the enemy wide open.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  cinderfang_hold_the_line: {
    name: "Scales Locked", icon: "🚩", tree: "defense", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Cinderfang signals the line to dig in — troop damage reduced every other round.",
    troopDmgReduce: 0.14, base: 0.14, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.14 + lvl * 0.04) * 100)}% troop dmg — rounds 2,4,6,8,10`,
  },
  cinderfang_iron_bastion: {
    name: "Ember Bastion", icon: "⛩", tree: "defense", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "active", cooldown: 4, offset: 2, duration: 3,
    desc: "Cinderfang crouches low and tucks its wings — a dragon fortress that shelters the whole army.",
    troopDmgReduce: 0.18, base: 0.18, perLevel: 0.05,
    nextDesc: (lvl) => `-${Math.round((0.18 + lvl * 0.05) * 100)}% troop dmg (3 rnd) — rounds 2,6,10`,
  },
  cinderfang_fortified_ranks: {
    name: "Fire-Tempered Scales", icon: "🪖", tree: "defense", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "passive",
    desc: "Cinderfang's fire hardens its allies just as it does its own scales. Permanently increased troop defense.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% troop DEF (permanent)`,
  },
  cinderfang_mending_wave: {
    name: "Ash Triage", icon: "✨", tree: "tactics", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Cinderfang's breath carries a surprising warmth between bouts — restoring fallen troops every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06 + lvl * 0.02) * 100)}% lost troops — rounds 2,4,6,8,10`,
  },
  cinderfang_inspiring_presence: {
    name: "Scrapper's Fire", icon: "⭐", tree: "tactics", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "passive",
    desc: "There's something about a young dragon's ferocity that makes everyone fight harder. Permanently increased troop attack.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
  },
  cinderfang_blind_strike: {
    name: "Cinder Spray", icon: "👁", tree: "tactics", cls: "balanced",
    faction: "dragons", commander: "h24",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Cinderfang sprays a burst of hot cinders at enemy eyes — their attack falters for 2 rounds.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
};

// ── PYREWING SKAR (attacker, Elder) ───────────────────────────────────────────
// Attacker: combat tree. Ancient, devastating, apocalyptic Elder dragon —
//           the sky itself burns where Skar flies. Pure destructive force.
// Stats: ATK 180, FOC 0, SPD 78 — near-max ATK; hp-shredding, AoE firestorm,
//        lifesteal, relentless crushing physical damage.

// ★ 2 Unique Skills

export const SKAR_UNIQUE_SKILLS = {
  skar_apocalypse_breath: {
    name: "Apocalypse Breath", icon: "🌋", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Skar fills its lungs with millennia of fire and releases everything — scorching every enemy on the field for massive AoE damage that cannot be reduced.",
    cmdAoe: true, cmdMult: 2.2, cmdPctDmg: 0.06, base: 2.2, perLevel: 0.18,
    nextDesc: (lvl) => `All enemies ${Math.round((2.2 + lvl * 0.18) * 100)}% AoE + 6% max HP direct — rounds 3,8`,
  },
  skar_ancient_predator: {
    name: "Ancient Predator", icon: "🐉", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "passive",
    desc: "Skar has hunted for centuries. Its commander damage is permanently amplified beyond mortal reckoning — and its critical instinct is legendary.",
    passiveCmdAtk: 0.14, passiveCritChance: 0.08, base: 0.14, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.14 + lvl * 0.05) * 100)}% cmd ATK & +8% crit (permanent)`,
  },
};

// 10 Reskins — attacker pool, apocalyptic Elder dragon theme

export const SKAR_RESKIN_SKILLS = {
  skar_killing_instinct: {
    name: "Elder's Bloodlust", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "passive",
    desc: "Skar has never lost the hunger of its youth — only amplified it over centuries. Permanently increased commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  skar_execute: {
    name: "Dragon's Decree", icon: "💀", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Skar decides the battle ends — one apocalyptic strike on the opening and midpoint of combat.",
    cmdMult: 3.0, base: 3.0, perLevel: 0.25,
    nextDesc: (lvl) => `${Math.round((3.0 + lvl * 0.25) * 100)}% damage — rounds 1,6`,
  },
  skar_battle_frenzy: {
    name: "Elder Frenzy", icon: "🔥", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "The Elder's wrath builds to a frenzy — savage strikes with heightened crit every other round.",
    cmdMult: 1.15, critBonus: 0.30, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `${Math.round((1.15 + lvl * 0.05) * 100)}% damage + 30% crit — rounds 2,4,6,8,10`,
  },
  skar_killing_edge: {
    name: "Scale-Sunder", icon: "🔪", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Skar targets the enemy's core — direct damage equal to a portion of their full troop strength.",
    cmdPctDmg: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.06 + lvl * 0.02) * 100)}% enemy max HP direct dmg — rounds 5,10`,
  },
  skar_deathblow: {
    name: "Cataclysm Strike", icon: "💥", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "A strike delivered with the weight of geological age — direct damage with a devastating crit chance.",
    cmdPctDmg: 0.10, critBonus: 0.50, base: 0.10, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.10 + lvl * 0.02) * 100)}% max HP direct + 50% crit — rounds 3,8`,
  },
  skar_battle_hunger: {
    name: "Fire and Feed", icon: "🩸", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Skar burns and devours — every strike restores the army from the destruction it causes.",
    cmdMult: 1.3, lifesteal: 0.25, base: 0.25, perLevel: 0.05,
    nextDesc: (lvl) => `130% damage, restore troops = ${Math.round((0.25 + lvl * 0.05) * 100)}% of damage dealt — rounds 1,4,7,10`,
  },
  skar_sweeping_strike: {
    name: "Firestorm Sweep", icon: "🌪", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Skar sweeps its wing and unleashes a firestorm — all enemies hit, then a follow-up on the wounded.",
    cmdAoe: true, cmdMult: 0.8, followUpChance: 0.50, followUpPct: 1.2, base: 0.8, perLevel: 0.06,
    nextDesc: (lvl) => `All enemies ${Math.round((0.8 + lvl * 0.06) * 100)}% AoE + 50% chance single follow-up 120% — rounds 2,6,10`,
  },
  skar_predator_eyes: {
    name: "Ancient Gaze", icon: "🦅", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "passive",
    desc: "Skar has hunted from mountain heights for centuries. Permanently sharpened crit chance.",
    passiveCritChance: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% crit chance (permanent)`,
  },
  skar_double_strike: {
    name: "Fang and Talon", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Skar strikes twice without hesitation — fang and talon in a single terrifying motion.",
    cmdHits: 2, cmdMult: 1.2, base: 1.2, perLevel: 0.10,
    nextDesc: (lvl) => `2 hits ×${(1.2 + lvl * 0.10).toFixed(2)} — rounds 2,6,10`,
  },
  skar_relentless: {
    name: "Eternal Wrath", icon: "🗡", tree: "combat", cls: "attacker",
    faction: "dragons", commander: "h35",
    type: "active", cooldown: 1, offset: 1, duration: 1,
    desc: "Skar does not pause. It does not tire. It strikes every single round without mercy.",
    cmdMult: 1.08, base: 1.08, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((1.08 + lvl * 0.04) * 100)}% damage — every round`,
  },
};

// ── VOIDSCALE NYXARA (strategist, Elder) ──────────────────────────────────────
// Strategist: tactics-heavy + combat secondary. Ancient, devastating Elder
//             wrapped in void-dark scales — elemental void magic, entropy debuffs,
//             reality-warping hexes, and precise focus strikes.
// Stats: ATK 60, FOC 175, SPD 82 — very high FOC; focus-elemental damage,
//        reality-tear debuffs, exposure, deep scaling void strikes.

// ★ 2 Unique Skills

export const NYXARA_UNIQUE_SKILLS = {
  nyxara_void_rupture: {
    name: "Void Rupture", icon: "🌑", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "Nyxara tears a rift in the fabric of the battlefield — enemy damage collapses and they become catastrophically vulnerable to every attack.",
    enemyDmgReduce: 0.20, enemyDmgTakenUp: 0.16, base: 0.20, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.20 + lvl * 0.04) * 100)}% enemy dmg & +${Math.round(0.16 * 100)}% enemy vulnerability (2 rnd) — rounds 2,6,10`,
  },
  nyxara_entropy_strike: {
    name: "Entropy Strike", icon: "⚫", tree: "combat", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Nyxara channels void-energy into a single precise strike — the enemy's very existence unravels under the impact, leaving them broken and exposed.",
    cmdMult: 2.4, enemyDmgTakenUp: 0.14, critBonus: 0.30, base: 2.4, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.4 + lvl * 0.20) * 100)}% damage + 14% vulnerability + 30% crit — rounds 1,4,7,10`,
  },
};

// 10 Reskins — 5 tactics + 5 combat for strategist, void-scale Elder theme

export const NYXARA_RESKIN_SKILLS = {
  // Tactics (5)
  nyxara_expose_weakness: {
    name: "Void Fracture", icon: "🎯", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 3, offset: 2, duration: 2,
    desc: "Nyxara senses the fracture lines in reality around the enemy — they take catastrophically more damage.",
    enemyDmgTakenUp: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `Enemy takes +${Math.round((0.12 + lvl * 0.03) * 100)}% more dmg (2 rnd) — rounds 2,5,8`,
  },
  nyxara_hex_curse: {
    name: "Void Sight Hex", icon: "🔮", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "Nyxara bends light and void around the enemy — their attacks pass through empty space and miss.",
    enemyMissChance: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.18 + lvl * 0.04) * 100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  nyxara_blind_strike: {
    name: "Entropy Shroud", icon: "👁", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Nyxara smothers the enemy in void-entropy — their attack crumbles as energy drains from them.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  nyxara_foresight: {
    name: "Void Prescience", icon: "🔭", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 4, offset: 4, duration: 1,
    desc: "Nyxara exists in all moments simultaneously — it knows the enemy's next move before they make it.",
    nullifySkill: true, base: 1, perLevel: 0,
    nextDesc: () => `Nullify enemy skill — rounds 4,8`,
  },
  nyxara_supply_cut: {
    name: "Void Drain", icon: "✂", tree: "tactics", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Nyxara opens a void-drain beneath the enemy — all healing energy vanishes into nothingness.",
    blockHeal: 3, base: 3, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${3 + lvl} rounds — rounds 3,8`,
  },
  // Combat (5)
  nyxara_killing_instinct: {
    name: "Ancient Void Hunger", icon: "⚔", tree: "combat", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "passive",
    desc: "Nyxara's hunger for entropy never dulled. Permanently increased commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  nyxara_predator_eyes: {
    name: "Void Vision", icon: "🦅", tree: "combat", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "passive",
    desc: "Nyxara sees through void-dark eyes that perceive every weakness. Permanently increased crit chance.",
    passiveCritChance: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% crit chance (permanent)`,
  },
  nyxara_killing_edge: {
    name: "Null-Point Strike", icon: "🔪", tree: "combat", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Nyxara strikes at the point where existence becomes nothing — direct damage proportional to the enemy's total strength.",
    cmdPctDmg: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.06 + lvl * 0.02) * 100)}% enemy max HP direct dmg — rounds 5,10`,
  },
  nyxara_savage_blow: {
    name: "Void Claw", icon: "🗡", tree: "combat", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "A claw made of pure void-matter tears through armor — heavy damage leaving the enemy wide open.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  nyxara_deathblow: {
    name: "Annihilation Point", icon: "💥", tree: "combat", cls: "strategist",
    faction: "dragons", commander: "h36",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Nyxara compresses void-energy to a single point and releases it — direct damage with obliterating crit force.",
    cmdPctDmg: 0.10, critBonus: 0.50, base: 0.10, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.10 + lvl * 0.02) * 100)}% max HP direct + 50% crit — rounds 3,8`,
  },
};

// ── Merged export ─────────────────────────────────────────────────────────────

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
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const DRAGONS_BRANCH_SKILL_MAP = {
  // Emberclaw (balanced, Adult)
  // Powerful, proud versatile brawler — AoE unique in branch 2, armor passive anchor
  h11: [
    { main: "emberclaw_dragon_hide",    sides: ["emberclaw_killing_instinct", "emberclaw_fortified_ranks"]   },
    { main: "emberclaw_savage_blow",    sides: ["emberclaw_shield_wall",      "emberclaw_expose_weakness"]   },
    { main: "emberclaw_magma_charge",   sides: ["emberclaw_iron_bastion",     "emberclaw_battle_hunger"]     },
    { main: "emberclaw_double_strike",  sides: ["emberclaw_battle_hymn",      "emberclaw_inspiring_presence"] },
  ],
  // Scaleveil Dusk (support, Adult)
  // Dusk-shadow healer-debuffer — combo debuff unique branch 2, healing passive anchor
  h12: [
    { main: "scaleveil_shadow_mend",    sides: ["scaleveil_field_medic",      "scaleveil_guardian_aura"]    },
    { main: "scaleveil_mending_wave",   sides: ["scaleveil_blind_strike",     "scaleveil_hex_curse"]        },
    { main: "scaleveil_dusk_veil",      sides: ["scaleveil_supply_cut",       "scaleveil_rally_cry"]        },
    { main: "scaleveil_second_wind",    sides: ["scaleveil_inspiring_presence","scaleveil_foresight"]       },
  ],
  // Ashen Kraul (leader, Hatchling)
  // Scrappy commander — dual-buff unique branch 2, passive ATK+DEF anchor
  h23: [
    { main: "kraul_ash_dominance",      sides: ["kraul_warchief_aura",        "kraul_legion_discipline"]    },
    { main: "kraul_warchief_roar",      sides: ["kraul_tactical_advance",     "kraul_shield_order"]         },
    { main: "kraul_hatchling_fury",     sides: ["kraul_supply_cut",           "kraul_war_council"]          },
    { main: "kraul_forced_march",       sides: ["kraul_siege_mastery",        "kraul_grand_strategy"]       },
  ],
  // Cinderfang (balanced, Hatchling)
  // Scrappy fire-brawler — multi-hit unique branch 2, damage reduction passive anchor
  h24: [
    { main: "cinderfang_cinder_hide",   sides: ["cinderfang_killing_instinct","cinderfang_fortified_ranks"] },
    { main: "cinderfang_quick_strike",  sides: ["cinderfang_hold_the_line",   "cinderfang_blind_strike"]    },
    { main: "cinderfang_fire_frenzy",   sides: ["cinderfang_iron_bastion",    "cinderfang_battle_hunger"]   },
    { main: "cinderfang_savage_blow",   sides: ["cinderfang_mending_wave",    "cinderfang_inspiring_presence"] },
  ],
  // Pyrewing Skar (attacker, Elder)
  // Apocalyptic destroyer — AoE+pct unique branch 2, passive ATK+crit anchor
  h35: [
    { main: "skar_ancient_predator",    sides: ["skar_killing_instinct",      "skar_predator_eyes"]         },
    { main: "skar_battle_frenzy",       sides: ["skar_relentless",            "skar_battle_hunger"]         },
    { main: "skar_apocalypse_breath",   sides: ["skar_killing_edge",          "skar_deathblow"]             },
    { main: "skar_execute",             sides: ["skar_double_strike",         "skar_sweeping_strike"]       },
  ],
  // Voidscale Nyxara (strategist, Elder)
  // Void-entropy debuffer — dual-debuff unique branch 2, precision void-strike branch 3
  h36: [
    { main: "nyxara_killing_instinct",  sides: ["nyxara_predator_eyes",       "nyxara_foresight"]           },
    { main: "nyxara_expose_weakness",   sides: ["nyxara_hex_curse",           "nyxara_blind_strike"]        },
    { main: "nyxara_void_rupture",      sides: ["nyxara_supply_cut",          "nyxara_killing_edge"]        },
    { main: "nyxara_entropy_strike",    sides: ["nyxara_savage_blow",         "nyxara_deathblow"]           },
  ],
};
