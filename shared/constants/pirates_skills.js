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
// Attacker: combat tree. Crafty, defensive-improvised — a shipwright's brawler.
// Stats: ATK 130, FOC 0, SPD 88 — high SPD; sweeping mobile strikes, lifesteal,
//        fast-firing actives, physical damage. Speed shapes unique flavor.

// ★ 2 Unique Skills

export const FYNN_UNIQUE_SKILLS = {
  fynn_cannonball_run: {
    name: "Cannonball Run", icon: "💥", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Fynn charges through enemy lines at full sprint — hitting all targets for heavy AoE damage and following up on anyone still standing.",
    cmdAoe: true, cmdMult: 1.8, followUpChance: 0.55, followUpPct: 1.2, base: 1.8, perLevel: 0.15,
    nextDesc: (lvl) => `All enemies ${Math.round((1.8 + lvl * 0.15) * 100)}% AoE + 55% chance single follow-up 120% — rounds 2,6,10`,
  },
  fynn_rigging_instinct: {
    name: "Rigging Instinct", icon: "⚓", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "passive",
    desc: "A shipwright's eye never misses a weak point. Fynn permanently strikes harder and crits more often.",
    passiveCmdAtk: 0.10, passiveCritChance: 0.07, base: 0.10, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.10 + lvl * 0.04) * 100)}% cmd ATK & +7% crit (permanent)`,
  },
};

// 10 Reskins — attacker pool, Shipwright/naval brawler theme

export const FYNN_RESKIN_SKILLS = {
  fynn_killing_instinct: {
    name: "Shipwright's Edge", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "passive",
    desc: "Fynn knows exactly where the ship — or a man — is weakest. Permanently increased commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  fynn_quick_strike: {
    name: "Boarding Rush", icon: "⚡", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Fynn vaults the rail and strikes before the enemy even draws — lightning-fast every other round.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  fynn_savage_blow: {
    name: "Wrench Smash", icon: "🔧", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "A shipwright's wrench swung with full force — leaves the target staggered and exposed.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  fynn_execute: {
    name: "Keel Strike", icon: "💀", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "An opening blow aimed below the waterline — devastating and impossible to recover from.",
    cmdMult: 3.0, base: 3.0, perLevel: 0.25,
    nextDesc: (lvl) => `${Math.round((3.0 + lvl * 0.25) * 100)}% damage — rounds 1,6`,
  },
  fynn_double_strike: {
    name: "Dual Hammers", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Fynn swings both tools at once — two heavy hits delivered in a single brutal motion.",
    cmdHits: 2, cmdMult: 1.2, base: 1.2, perLevel: 0.10,
    nextDesc: (lvl) => `2 hits ×${(1.2 + lvl * 0.10).toFixed(2)} — rounds 2,6,10`,
  },
  fynn_predator_eyes: {
    name: "Sharp Eye", icon: "🦅", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "passive",
    desc: "A lifetime scanning horizons for threats — permanently sharpened crit chance.",
    passiveCritChance: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% crit chance (permanent)`,
  },
  fynn_battle_frenzy: {
    name: "Deck Fury", icon: "🔥", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Fynn goes berserk on deck — every other round his strikes hit harder with a surge of wild crit.",
    cmdMult: 1.15, critBonus: 0.30, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `${Math.round((1.15 + lvl * 0.05) * 100)}% damage + 30% crit — rounds 2,4,6,8,10`,
  },
  fynn_killing_edge: {
    name: "Hull Breach", icon: "🔪", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Fynn finds the crack in the hull — direct damage equal to a portion of the enemy's full strength.",
    cmdPctDmg: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.06 + lvl * 0.02) * 100)}% enemy max HP direct dmg — rounds 5,10`,
  },
  fynn_battle_hunger: {
    name: "Salvage Strike", icon: "🩸", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Fynn hits hard and takes what he needs — restoring troops from the damage dealt.",
    cmdMult: 1.3, lifesteal: 0.25, base: 0.25, perLevel: 0.05,
    nextDesc: (lvl) => `130% damage, restore troops = ${Math.round((0.25 + lvl * 0.05) * 100)}% of damage dealt — rounds 1,4,7,10`,
  },
  fynn_flurry: {
    name: "Tool Barrage", icon: "🌪", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h1",
    type: "active", cooldown: 4, offset: 4, duration: 1,
    desc: "Fynn unleashes every tool on his belt in a furious three-hit barrage.",
    cmdHits: 3, cmdMult: 0.9, base: 0.9, perLevel: 0.08,
    nextDesc: (lvl) => `3 hits ×${(0.9 + lvl * 0.08).toFixed(2)} — rounds 4,8`,
  },
};

// ── PIRATE COOK SAMUEL (balanced, Shipwright) ─────────────────────────────────
// Balanced: combat + defense + tactics mix. Improvised weapons, crew morale,
//           improvised protection. A cook who fights dirty and keeps crew alive.
// Stats: ATK 105, FOC 0, SPD 78 — solid ATK; physical strikes + crew support.

// ★ 2 Unique Skills

export const SAMUEL_UNIQUE_SKILLS = {
  samuel_mess_hall_morale: {
    name: "Mess Hall Morale", icon: "🍖", tree: "tactics", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "Samuel feeds the crew between bouts — troops surge in attack and slowly recover their losses over 3 rounds.",
    troopAtkMult: 1.18, healPct: 0.08, base: 1.18, perLevel: 0.05,
    nextDesc: (lvl) => `Troops ×${(1.18 + lvl * 0.05).toFixed(2)} ATK & heal ${Math.round(0.08 * 100)}% lost troops (3 rnd) — rounds 1,5,9`,
  },
  samuel_cast_iron: {
    name: "Cast Iron Constitution", icon: "🪖", tree: "defense", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "The cook has taken every kind of hit. Permanently reduces incoming damage and hardens troop defenses.",
    passiveDmgReduce: 0.04, passiveTroopDef: 0.05, base: 0.04, perLevel: 0.02,
    nextDesc: (lvl) => `-${Math.round((0.04 + lvl * 0.02) * 100)}% incoming dmg & +${Math.round(0.05 * 100)}% troop DEF (permanent)`,
  },
};

// 10 Reskins — balanced: 4 combat, 3 defense, 3 tactics

export const SAMUEL_RESKIN_SKILLS = {
  samuel_quick_strike: {
    name: "Ladle Bash", icon: "⚡", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Samuel's cooking ladle is faster than it looks — a rapid crack every other round.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  samuel_savage_blow: {
    name: "Cleaver Swing", icon: "🔪", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "A full-arm swing of the galley cleaver — heavy damage and a nasty wound left behind.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  samuel_killing_instinct: {
    name: "Cook's Instinct", icon: "⚔", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "Samuel knows where things are tender. Permanently increased commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  samuel_battle_hunger: {
    name: "Scrap and Recover", icon: "🩸", tree: "combat", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Samuel fights dirty and patches up his crew on the way — restoring troops from the damage dealt.",
    cmdMult: 1.3, lifesteal: 0.25, base: 0.25, perLevel: 0.05,
    nextDesc: (lvl) => `130% damage, restore troops = ${Math.round((0.25 + lvl * 0.05) * 100)}% of damage dealt — rounds 1,4,7,10`,
  },
  samuel_shield_wall: {
    name: "Pot Lids Up", icon: "🏰", tree: "defense", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "active", cooldown: 2, offset: 1, duration: 2,
    desc: "Samuel hands out cookware as shields — reduces all incoming damage every other round.",
    dmgReduce: 0.12, base: 0.12, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.04) * 100)}% all dmg (2 rnd) — rounds 1,3,5,7,9`,
  },
  samuel_hold_the_line: {
    name: "Hold the Galley", icon: "🚩", tree: "defense", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Samuel orders his crew to brace every other round — nobody retreats from the kitchen.",
    troopDmgReduce: 0.14, base: 0.14, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.14 + lvl * 0.04) * 100)}% troop dmg — rounds 2,4,6,8,10`,
  },
  samuel_fortified_ranks: {
    name: "Hearty Crew", icon: "🪖", tree: "defense", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "A well-fed crew is a tough crew — permanently boosted troop defense.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% troop DEF (permanent)`,
  },
  samuel_mending_wave: {
    name: "Patch Up Round", icon: "✨", tree: "tactics", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Samuel moves through the ranks with bandages and broth — restoring troops every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06 + lvl * 0.02) * 100)}% lost troops — rounds 2,4,6,8,10`,
  },
  samuel_inspiring_presence: {
    name: "Good Grub", icon: "⭐", tree: "tactics", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "passive",
    desc: "A full belly fights harder. Samuel's cooking permanently boosts crew morale and troop attack.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
  },
  samuel_blind_strike: {
    name: "Pepper Cloud", icon: "👁", tree: "tactics", cls: "balanced",
    faction: "pirates", commander: "h2",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Samuel hurls a pouch of ground pepper into enemy faces — reducing their attack for 2 rounds.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
};

// ── ADMIRAL BRINE (leader, First Mate) ────────────────────────────────────────
// Leader: command tree. Loyal, organized, naval coordination.
// Stats: ATK 95, FOC 0, SPD 65 — steady leader; siege-breaking, fleet buffs,
//        healing denial, coordinated strikes.

// ★ 2 Unique Skills

export const BRINE_UNIQUE_SKILLS = {
  brine_iron_flagship: {
    name: "Iron Flagship", icon: "🚢", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "Brine calls the fleet to battle formation — all troops surge in attack and lock shields for 3 rounds.",
    troopAtkMult: 1.22, troopDefMult: 1.12, base: 1.22, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.22 + lvl * 0.05) * 100)}% troop ATK & +12% DEF (3 rnd) — rounds 1,5,9`,
  },
  brine_broadside: {
    name: "Broadside", icon: "💥", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "A coordinated broadside from the fleet — ignores garrison defenses and cuts enemy healing.",
    garrisonIgnore: 0.20, blockHeal: 2, base: 0.20, perLevel: 0.03,
    nextDesc: (lvl) => `Ignore ${Math.round((0.20 + lvl * 0.03) * 100)}% garrison + block enemy heal 2 rnd — rounds 3,8`,
  },
};

// 10 Reskins — leader pool, naval coordination theme

export const BRINE_RESKIN_SKILLS = {
  brine_fleet_aura: {
    name: "Fleet Admiral's Aura", icon: "📡", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "passive",
    desc: "The Admiral's presence steadies every sailor. His fleet fights harder and holds firmer.",
    passiveTroopAtk: 0.07, base: 0.07, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.07 + lvl * 0.04) * 100)}% troop ATK (permanent)`,
  },
  brine_war_drums: {
    name: "War Drums", icon: "🥁", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 2, offset: 2, duration: 2,
    desc: "Drums pound across the water — every sailor fights with doubled aggression every other round.",
    troopAtkMult: 1.15, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.15 + lvl * 0.05) * 100 - 100)}% troop ATK (2 rnd) — rounds 2,4,6,8,10`,
  },
  brine_grand_strategy: {
    name: "Naval Grand Strategy", icon: "🗺", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 4, offset: 1, duration: 3,
    desc: "Brine deploys fleet formations — troop attack and defense surge for 3 rounds.",
    troopAtkMult: 1.20, troopDefMult: 1.10, base: 1.20, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.20 + lvl * 0.06) * 100 - 100)}% ATK & +10% DEF (3 rnd) — rounds 1,5,9`,
  },
  brine_forced_march: {
    name: "Full Sail", icon: "💨", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Full sail, full force — every sailor surges with overwhelming momentum.",
    troopAtkMult: 1.50, base: 1.50, perLevel: 0.10,
    nextDesc: (lvl) => `+${Math.round((0.50 + lvl * 0.10) * 100)}% troop ATK — rounds 5,10`,
  },
  brine_siege_mastery: {
    name: "Port Siege Mastery", icon: "🪨", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "passive",
    desc: "Brine has stormed every port on the map. Permanently ignores a portion of garrison bonuses.",
    passiveGarrisonIgnore: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `Ignore ${Math.round((0.06 + lvl * 0.04) * 100)}% garrison bonus (permanent)`,
  },
  brine_supply_cut: {
    name: "Cut the Supply Lines", icon: "✂", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Brine blockades the enemy's supply routes — denying all healing repeatedly.",
    blockHeal: 2, base: 2, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${2 + lvl} rounds — rounds 1,4,7,10`,
  },
  brine_tactical_adv: {
    name: "Fleet Tactical Advance", icon: "♟", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 4, offset: 3, duration: 2,
    desc: "Brine coordinates a disciplined advance — troops strike harder and enemy fire softens.",
    troopAtkMult: 1.12, enemyDmgReduce: 0.10, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.12 + lvl * 0.04) * 100 - 100)}% troop ATK + -10% enemy dmg (2 rnd) — rounds 3,7`,
  },
  brine_war_council: {
    name: "Admiral's War Council", icon: "📜", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 5, offset: 2, duration: 1,
    desc: "Brine outmaneuvers the enemy's strategy and rallies his troops in the same motion.",
    nullifySkill: true, troopAtkMult: 1.18, base: 1.18, perLevel: 0.05,
    nextDesc: (lvl) => `Nullify enemy skill + +${Math.round((0.18 + lvl * 0.05) * 100 - 100)}% troop ATK — rounds 2,7`,
  },
  brine_legion_discipline: {
    name: "Fleet Discipline", icon: "🪖", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "passive",
    desc: "Brine's crews are the most disciplined on the seas. Permanently hardened troop defenses.",
    passiveTroopDef: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% troop DEF (permanent)`,
  },
  brine_shield_order: {
    name: "Shield Decks", icon: "🛡", tree: "command", cls: "leader",
    faction: "pirates", commander: "h13",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Brine orders all hands to defensive positions every other round.",
    troopDefMult: 1.12, base: 1.12, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.12 + lvl * 0.04) * 100 - 100)}% troop DEF — rounds 1,3,5,7,9`,
  },
};

// ── SALTWHISPER (support, First Mate) ─────────────────────────────────────────
// Support: tactics tree. Loyal, organized naval coordination — ghostly sea-witch.
// Stats: ATK 55, FOC 110, SPD 72 — high FOC; hex-heavy debuffs, healing, sea curses.

// ★ 2 Unique Skills

export const SALTWHISPER_UNIQUE_SKILLS = {
  saltwhisper_tidal_hex: {
    name: "Tidal Hex", icon: "🌊", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 3, offset: 2, duration: 2,
    desc: "Saltwhisper weaves a sea-curse over the enemy — their attacks miss and their healing is drowned out.",
    enemyMissChance: 0.20, blockHeal: 2, base: 0.20, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.20 + lvl * 0.04) * 100)}% enemy miss & block heal 2 rnd (2 rnd) — rounds 2,5,8`,
  },
  saltwhisper_sea_mending: {
    name: "Sea Mending", icon: "💧", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "passive",
    desc: "The tide moves through Saltwhisper's crew — continuously restoring fallen sailors and hardening their defenses.",
    passiveHealPerRound: 0.02, passiveTroopDef: 0.04, base: 0.02, perLevel: 0.005,
    nextDesc: (lvl) => `Restore ${Math.round((0.02 + lvl * 0.005) * 100)}% lost troops/round & +${Math.round(0.04 * 100)}% troop DEF (permanent)`,
  },
};

// 10 Reskins — support pool, sea-witch/First Mate theme

export const SALTWHISPER_RESKIN_SKILLS = {
  saltwhisper_field_medic: {
    name: "Salt and Seaweed", icon: "💚", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "passive",
    desc: "Saltwhisper's folk remedies work — troops are continuously patched up each round.",
    passiveHealPerRound: 0.02, base: 0.02, perLevel: 0.01,
    nextDesc: (lvl) => `Restore ${Math.round((0.02 + lvl * 0.01) * 100)}% lost troops/round`,
  },
  saltwhisper_mending_wave: {
    name: "Tide's Return", icon: "✨", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "Like a tide pulling back wounded soldiers — a surge of sea-healing every other round.",
    healPct: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `Restore ${Math.round((0.06 + lvl * 0.02) * 100)}% lost troops — rounds 2,4,6,8,10`,
  },
  saltwhisper_rally_cry: {
    name: "Dead Men Rise", icon: "🚩", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Saltwhisper speaks and the fallen stir — a massive restoration of lost sailors.",
    healPct: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `Restore ${Math.round((0.18 + lvl * 0.04) * 100)}% lost troops — rounds 1,6`,
  },
  saltwhisper_battle_hymn: {
    name: "Siren's Call", icon: "🎵", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 3, offset: 3, duration: 2,
    desc: "A haunting sea-shanty drives the crew to fight with primal ferocity.",
    troopAtkMult: 1.18, base: 1.18, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.18 + lvl * 0.06) * 100 - 100)}% troop ATK (2 rnd) — rounds 3,6,9`,
  },
  saltwhisper_inspiring_presence: {
    name: "First Mate's Presence", icon: "⭐", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "passive",
    desc: "Every sailor fights with purpose under Saltwhisper's watch. Permanently increased troop attack.",
    passiveTroopAtk: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop ATK (permanent)`,
  },
  saltwhisper_hex_curse: {
    name: "Saltwhisper's Hex", icon: "🔮", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "A whispered hex laced with sea-salt — enemy attacks lose their aim.",
    enemyMissChance: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.18 + lvl * 0.04) * 100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  saltwhisper_blind_strike: {
    name: "Brine in the Eyes", icon: "👁", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "A flick of sea-spray into the enemy's face — their attack falters for 2 rounds.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  saltwhisper_supply_cut: {
    name: "Cursed Waters", icon: "✂", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Saltwhisper poisons the enemy's supply — no healing reaches them for 3 rounds.",
    blockHeal: 3, base: 3, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${3 + lvl} rounds — rounds 3,8`,
  },
  saltwhisper_guardian_aura: {
    name: "Sailor's Ward", icon: "🌿", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "passive",
    desc: "Saltwhisper's protective charms permanently bolster the whole crew's resilience.",
    passiveTroopDef: 0.05, base: 0.05, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.05 + lvl * 0.03) * 100)}% troop DEF (permanent)`,
  },
  saltwhisper_second_wind: {
    name: "Second Tide", icon: "💨", tree: "tactics", cls: "support",
    faction: "pirates", commander: "h14",
    type: "active", cooldown: 5, offset: 5, duration: 2,
    desc: "The second tide always hits hardest — restores troops and surges attack at the crucial moment.",
    healPct: 0.12, troopAtkMult: 1.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `Heal ${Math.round((0.12 + lvl * 0.03) * 100)}% + +${Math.round((0.12 + lvl * 0.03) * 100 - 100)}% troop ATK (2 rnd) — rounds 5,10`,
  },
};

// ── IRONJAW RECK (attacker, Captain) ──────────────────────────────────────────
// Attacker: combat tree. Dominant, fearless, ruthless Captain.
// Stats: ATK 175, FOC 0, SPD 90 — highest ATK + highest SPD in faction;
//        ferocious physical damage, HP-shredding, lifesteal, relentless pressure.

// ★ 2 Unique Skills

export const RECK_UNIQUE_SKILLS = {
  reck_ironjaw_crush: {
    name: "Ironjaw Crush", icon: "💢", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "Reck bites down and doesn't let go — a ferocious multi-hit that tears through armor and leaves the enemy bleeding out.",
    cmdHits: 2, cmdMult: 1.6, lifesteal: 0.30, base: 1.6, perLevel: 0.15,
    nextDesc: (lvl) => `2 hits ×${(1.6 + lvl * 0.15).toFixed(2)} + restore troops = 30% of damage dealt — rounds 3,6,9`,
  },
  reck_captains_decree: {
    name: "Captain's Decree", icon: "☠️", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "passive",
    desc: "No one on this ship questions Reck. Permanently amplified commander damage and crushing crit chance.",
    passiveCmdAtk: 0.12, passiveCritChance: 0.06, base: 0.12, perLevel: 0.05,
    nextDesc: (lvl) => `+${Math.round((0.12 + lvl * 0.05) * 100)}% cmd ATK & +6% crit (permanent)`,
  },
};

// 10 Reskins — attacker pool, ruthless Captain theme

export const RECK_RESKIN_SKILLS = {
  reck_killing_instinct: {
    name: "Ironjaw's Instinct", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "passive",
    desc: "Reck doesn't think — he destroys. Permanently increased commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  reck_quick_strike: {
    name: "Captain's Snap", icon: "⚡", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Reck moves faster than anyone his size should — a brutal snap every other round.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  reck_execute: {
    name: "Walk the Plank", icon: "💀", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 5, offset: 1, duration: 1,
    desc: "Reck's opening statement and his closing argument are the same: overwhelming force.",
    cmdMult: 3.0, base: 3.0, perLevel: 0.25,
    nextDesc: (lvl) => `${Math.round((3.0 + lvl * 0.25) * 100)}% damage — rounds 1,6`,
  },
  reck_battle_frenzy: {
    name: "Blood Frenzy", icon: "🔥", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 2, offset: 2, duration: 1,
    desc: "The smell of battle sends Reck into a blood frenzy — strikes harder every other round.",
    cmdMult: 1.15, critBonus: 0.30, base: 1.15, perLevel: 0.05,
    nextDesc: (lvl) => `${Math.round((1.15 + lvl * 0.05) * 100)}% damage + 30% crit — rounds 2,4,6,8,10`,
  },
  reck_killing_edge: {
    name: "Gut the Ship", icon: "🔪", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Reck goes for the maximum damage — direct hits equal to a portion of enemy total strength.",
    cmdPctDmg: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.06 + lvl * 0.02) * 100)}% enemy max HP direct dmg — rounds 5,10`,
  },
  reck_deathblow: {
    name: "Ironjaw Deathblow", icon: "💥", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "A targeted strike aimed at maximum HP loss — with a brutal crit chance.",
    cmdPctDmg: 0.10, critBonus: 0.50, base: 0.10, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.10 + lvl * 0.02) * 100)}% max HP direct + 50% crit — rounds 3,8`,
  },
  reck_double_strike: {
    name: "Iron Fists", icon: "⚔", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Two meaty fists, two hits — Reck delivers both with full force.",
    cmdHits: 2, cmdMult: 1.2, base: 1.2, perLevel: 0.10,
    nextDesc: (lvl) => `2 hits ×${(1.2 + lvl * 0.10).toFixed(2)} — rounds 2,6,10`,
  },
  reck_predator_eyes: {
    name: "Captain's Eye", icon: "🦅", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "passive",
    desc: "Reck never misses what he's aiming for. Permanently increased crit chance.",
    passiveCritChance: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% crit chance (permanent)`,
  },
  reck_sweeping_strike: {
    name: "Plunder Sweep", icon: "🌪", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 4, offset: 2, duration: 1,
    desc: "Reck swings wide — hits everyone, then follows up on whoever's still breathing.",
    cmdAoe: true, cmdMult: 0.8, followUpChance: 0.50, followUpPct: 1.2, base: 0.8, perLevel: 0.06,
    nextDesc: (lvl) => `All enemies ${Math.round((0.8 + lvl * 0.06) * 100)}% AoE + 50% chance single follow-up 120% — rounds 2,6,10`,
  },
  reck_relentless: {
    name: "No Mercy", icon: "🗡", tree: "combat", cls: "attacker",
    faction: "pirates", commander: "h25",
    type: "active", cooldown: 1, offset: 1, duration: 1,
    desc: "Reck gives no quarter — striking every single round without pause.",
    cmdMult: 1.08, base: 1.08, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((1.08 + lvl * 0.04) * 100)}% damage — every round`,
  },
};

// ── NAVIGATOR SEYNE (strategist, Captain) ─────────────────────────────────────
// Strategist: tactics-heavy + combat secondary. Celestial navigation, exposure,
//             debuffs, precision strikes. Dominant and fearless but calculative.
// Stats: ATK 110, FOC 60, SPD 80 — mixed ATK+FOC; hybrid physical + debuffs.

// ★ 2 Unique Skills

export const SEYNE_UNIQUE_SKILLS = {
  seyne_star_chart: {
    name: "Star Chart Reading", icon: "⭐", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "Seyne reads the stars and plots the enemy's doom — their damage output drops sharply and they become exposed to greater punishment.",
    enemyDmgReduce: 0.18, enemyDmgTakenUp: 0.12, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.18 + lvl * 0.04) * 100)}% enemy dmg & +${Math.round(0.12 * 100)}% enemy vulnerability (2 rnd) — rounds 2,6,10`,
  },
  seyne_dead_reckoning: {
    name: "Dead Reckoning", icon: "🧭", tree: "combat", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 3, offset: 1, duration: 1,
    desc: "Seyne calculates the perfect strike with terrifying precision — every hit goes exactly where it needs to.",
    cmdMult: 2.2, critBonus: 0.35, enemyDmgTakenUp: 0.10, base: 2.2, perLevel: 0.18,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.18) * 100)}% damage + 35% crit + 10% enemy vulnerability — rounds 1,4,7,10`,
  },
};

// 10 Reskins — 5 tactics + 5 combat for strategist, celestial navigation theme

export const SEYNE_RESKIN_SKILLS = {
  // Tactics (5)
  seyne_expose_weakness: {
    name: "Chart the Weakness", icon: "🎯", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 3, offset: 2, duration: 2,
    desc: "Seyne marks the enemy's weak points on the chart — they take greater damage from all sources.",
    enemyDmgTakenUp: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `Enemy takes +${Math.round((0.12 + lvl * 0.03) * 100)}% more dmg (2 rnd) — rounds 2,5,8`,
  },
  seyne_hex_curse: {
    name: "Navigator's Fog", icon: "🌫", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 4, offset: 2, duration: 2,
    desc: "Seyne plots a course through fog — the enemy loses their bearing and attacks miss.",
    enemyMissChance: 0.18, base: 0.18, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.18 + lvl * 0.04) * 100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  seyne_blind_strike: {
    name: "Off Course", icon: "👁", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 3, offset: 1, duration: 2,
    desc: "Seyne throws the enemy's navigation off — they attack with reduced coordination.",
    enemyAtkReduce: 0.12, base: 0.12, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.12 + lvl * 0.03) * 100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  seyne_supply_cut: {
    name: "Blockade Route", icon: "✂", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 5, offset: 3, duration: 1,
    desc: "Seyne plots a blockade of enemy supply routes — no reinforcements or healing reach them.",
    blockHeal: 3, base: 3, perLevel: 1,
    nextDesc: (lvl) => `Block enemy heal ${3 + lvl} rounds — rounds 3,8`,
  },
  seyne_foresight: {
    name: "Celestial Foresight", icon: "🔭", tree: "tactics", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 4, offset: 4, duration: 1,
    desc: "The stars foretold this moment. Seyne nullifies the enemy's planned skill with perfect timing.",
    nullifySkill: true, base: 1, perLevel: 0,
    nextDesc: () => `Nullify enemy skill — rounds 4,8`,
  },
  // Combat (5)
  seyne_killing_instinct: {
    name: "Captain's Precision", icon: "⚔", tree: "combat", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "passive",
    desc: "A captain's calculated calm permanently sharpens commander damage.",
    passiveCmdAtk: 0.08, base: 0.08, perLevel: 0.06,
    nextDesc: (lvl) => `+${Math.round((0.08 + lvl * 0.06) * 100)}% cmd ATK (permanent)`,
  },
  seyne_quick_strike: {
    name: "Wind-Favored Strike", icon: "⚡", tree: "combat", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 2, offset: 1, duration: 1,
    desc: "Seyne strikes when the wind is right — a precise, fast hit every other round.",
    cmdMult: 1.4, base: 1.4, perLevel: 0.15,
    nextDesc: (lvl) => `${Math.round((1.4 + lvl * 0.15) * 100)}% damage — rounds 1,3,5,7,9`,
  },
  seyne_savage_blow: {
    name: "Course Correction", icon: "🗡", tree: "combat", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 3, offset: 3, duration: 1,
    desc: "A powerful corrective strike that leaves the enemy disoriented and exposed.",
    cmdMult: 2.2, enemyDmgTakenUp: 0.15, base: 2.2, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((2.2 + lvl * 0.20) * 100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  seyne_predator_eyes: {
    name: "Navigator's Eye", icon: "🦅", tree: "combat", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "passive",
    desc: "Seyne tracks every target on the map — permanently increased crit chance.",
    passiveCritChance: 0.06, base: 0.06, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.06 + lvl * 0.04) * 100)}% crit chance (permanent)`,
  },
  seyne_killing_edge: {
    name: "X Marks the Spot", icon: "🔪", tree: "combat", cls: "strategist",
    faction: "pirates", commander: "h26",
    type: "active", cooldown: 5, offset: 5, duration: 1,
    desc: "Seyne has been planning this strike since the voyage began — direct damage at maximum scale.",
    cmdPctDmg: 0.06, base: 0.06, perLevel: 0.02,
    nextDesc: (lvl) => `${Math.round((0.06 + lvl * 0.02) * 100)}% enemy max HP direct dmg — rounds 5,10`,
  },
};

// ── Merged export ─────────────────────────────────────────────────────────────

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
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const PIRATES_BRANCH_SKILL_MAP = {
  // Redwake Fynn (attacker, Shipwright)
  // Fast, sweeping brawler — AoE unique in branch 2, passive unique anchor in branch 0
  h1: [
    { main: "fynn_rigging_instinct",  sides: ["fynn_killing_instinct",  "fynn_predator_eyes"]   },
    { main: "fynn_quick_strike",      sides: ["fynn_battle_frenzy",     "fynn_battle_hunger"]   },
    { main: "fynn_cannonball_run",    sides: ["fynn_savage_blow",       "fynn_killing_edge"]    },
    { main: "fynn_execute",           sides: ["fynn_double_strike",     "fynn_flurry"]          },
  ],
  // Pirate Cook Samuel (balanced, Shipwright)
  // Crew support + improvised combat — healer unique branch 2, defensive passive anchor
  h2: [
    { main: "samuel_cast_iron",       sides: ["samuel_killing_instinct","samuel_fortified_ranks"] },
    { main: "samuel_quick_strike",    sides: ["samuel_shield_wall",     "samuel_blind_strike"]   },
    { main: "samuel_mess_hall_morale",sides: ["samuel_mending_wave",    "samuel_inspiring_presence"] },
    { main: "samuel_savage_blow",     sides: ["samuel_hold_the_line",   "samuel_battle_hunger"]  },
  ],
  // Admiral Brine (leader, First Mate)
  h13: [
    { main: "brine_iron_flagship",    sides: ["brine_fleet_aura",       "brine_legion_discipline"] },
    { main: "brine_war_drums",        sides: ["brine_tactical_adv",     "brine_shield_order"]     },
    { main: "brine_broadside",        sides: ["brine_war_council",      "brine_supply_cut"]       },
    { main: "brine_forced_march",     sides: ["brine_siege_mastery",    "brine_grand_strategy"]   },
  ],
  // Saltwhisper (support, First Mate)
  // Hex-heavy sea-witch — debuff unique branch 2, healing passive anchor
  h14: [
    { main: "saltwhisper_sea_mending",sides: ["saltwhisper_field_medic","saltwhisper_guardian_aura"] },
    { main: "saltwhisper_mending_wave",sides: ["saltwhisper_blind_strike","saltwhisper_hex_curse"] },
    { main: "saltwhisper_tidal_hex",  sides: ["saltwhisper_supply_cut", "saltwhisper_rally_cry"]  },
    { main: "saltwhisper_battle_hymn",sides: ["saltwhisper_inspiring_presence","saltwhisper_second_wind"] },
  ],
  // Ironjaw Reck (attacker, Captain)
  // Maximum aggression — multi-hit lifesteal unique branch 2, passive ATK anchor
  h25: [
    { main: "reck_captains_decree",   sides: ["reck_killing_instinct",  "reck_predator_eyes"]   },
    { main: "reck_quick_strike",      sides: ["reck_battle_frenzy",     "reck_relentless"]      },
    { main: "reck_ironjaw_crush",     sides: ["reck_deathblow",         "reck_killing_edge"]    },
    { main: "reck_execute",           sides: ["reck_double_strike",     "reck_sweeping_strike"] },
  ],
  // Navigator Seyne (strategist, Captain)
  // Debuff-first, precise strikes second — dual-debuff unique branch 2, combat unique branch 3
  h26: [
    { main: "seyne_killing_instinct", sides: ["seyne_predator_eyes",    "seyne_foresight"]      },
    { main: "seyne_expose_weakness",  sides: ["seyne_hex_curse",        "seyne_blind_strike"]   },
    { main: "seyne_star_chart",       sides: ["seyne_supply_cut",       "seyne_quick_strike"]   },
    { main: "seyne_dead_reckoning",   sides: ["seyne_savage_blow",      "seyne_killing_edge"]   },
  ],
};
