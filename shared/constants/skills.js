/* ─────────────────────────────────────────────────────────────────────────────
   skills.js — V5 Skill System

   Skill shape:
   {
     name, icon, tree, cls, desc,
     type: "active" | "passive",

     // Active only — fires on rounds: offset, offset+cd, offset+2cd ...
     cooldown: number    e.g. 2 → fires rounds 1,3,5,7,9 (if offset:1)
     offset:   number    first fire round (default = cooldown)

     duration: number    how many rounds the effect persists (1 = instant)

     // Effect fields:
     cmdMult:          number   commander damage multiplier
     cmdPctDmg:        number   deal X% of enemy MAX troop HP directly
     cmdHits:          number   commander strikes N times
     critBonus:        number   added crit chance this round
     lifesteal:        number   heal X% of cmd damage as troops

     troopAtkMult:     number   multiply troop attack (duration rounds)
     troopDefMult:     number   multiply troop defense (duration rounds)

     healPct:          number   restore X% of lost troops
     dmgReduce:        number   reduce ALL incoming damage %
     troopDmgReduce:   number   reduce incoming troop damage %
     enemyAtkReduce:   number   reduce enemy ATK %
     enemyDmgReduce:   number   reduce ALL enemy damage %
     enemyMissChance:  number   enemy attacks miss X% of the time
     blockHeal:        number   block enemy healing for N rounds
     nullifySkill:     boolean  cancel enemy skill this round
     garrisonIgnore:   number   ignore X% of garrison/terrain bonus

     // Passive fields:
     passiveCmdAtk:          number
     passiveCritChance:      number
     passiveDmgReduce:       number
     passiveEnemyAtk:        number
     passiveTroopAtk:        number
     passiveTroopDef:        number
     passiveHealPerRound:    number
     passiveGarrisonIgnore:  number

     base:     number   value at level 1
     perLevel: number   added per extra level
     nextDesc: fn(lvl)  text for next-level tooltip
   }
───────────────────────────────────────────────────────────────────────────── */

// ── ATTACKER — commander-only damage, no troop buffs ─────────────────────────

export const ATTACKER_SKILLS = {
  killing_instinct: {
    name:"Killing Instinct", icon:"⚔", tree:"combat", cls:"attacker",
    type:"passive",
    desc:"Permanently increases commander attack power.",
    passiveCmdAtk:0.08, base:0.08, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.08+lvl*0.06)*100)}% cmd ATK (permanent)`,
  },
  quick_strike: {
    name:"Quick Strike", icon:"⚡", tree:"combat", cls:"attacker",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"Commander strikes with extra force every other round.",
    cmdMult:1.4, base:1.4, perLevel:0.15,
    nextDesc:(lvl)=>`Cmd ×${(1.4+lvl*0.15).toFixed(2)} dmg — rounds 1,3,5,7,9`,
  },
  savage_blow: {
    name:"Savage Blow", icon:"🗡", tree:"combat", cls:"attacker",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"A heavy strike every 3 rounds.",
    cmdMult:2.2, base:2.2, perLevel:0.20,
    nextDesc:(lvl)=>`Cmd ×${(2.2+lvl*0.20).toFixed(2)} dmg — rounds 3,6,9`,
  },
  execute: {
    name:"Execute", icon:"💀", tree:"combat", cls:"attacker",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"A devastating opener, then again mid-fight.",
    cmdMult:3.0, base:3.0, perLevel:0.25,
    nextDesc:(lvl)=>`Cmd ×${(3.0+lvl*0.25).toFixed(2)} dmg — rounds 1,6`,
  },
  double_strike: {
    name:"Double Strike", icon:"⚔", tree:"combat", cls:"attacker",
    type:"active", cooldown:4, offset:2, duration:1,
    desc:"Commander strikes twice in one round.",
    cmdHits:2, cmdMult:1.2, base:1.2, perLevel:0.10,
    nextDesc:(lvl)=>`2 hits ×${(1.2+lvl*0.10).toFixed(2)} — rounds 2,6,10`,
  },
  predator_eyes: {
    name:"Predator's Eyes", icon:"🦅", tree:"combat", cls:"attacker",
    type:"passive",
    desc:"Permanently increases critical hit chance.",
    passiveCritChance:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% crit chance (permanent)`,
  },
  blood_frenzy: {
    name:"Blood Frenzy", icon:"🩸", tree:"combat", cls:"attacker",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"Enters a crit frenzy every other round.",
    critBonus:0.30, cmdMult:1.15, base:0.30, perLevel:0.05,
    nextDesc:(lvl)=>`+${Math.round((0.30+lvl*0.05)*100)}% crit — rounds 2,4,6,8,10`,
  },
  killing_edge: {
    name:"Killing Edge", icon:"🔪", tree:"combat", cls:"attacker",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"Deals damage equal to a % of enemy max troop HP.",
    cmdPctDmg:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.06+lvl*0.02)*100)}% enemy max HP dmg — rounds 5,10`,
  },
  vampiric_strike: {
    name:"Vampiric Strike", icon:"🧛", tree:"combat", cls:"attacker",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"Commander steals life from enemy troops.",
    cmdMult:1.3, lifesteal:0.25, base:0.25, perLevel:0.05,
    nextDesc:(lvl)=>`Heal ${Math.round((0.25+lvl*0.05)*100)}% of cmd dmg — rounds 1,4,7,10`,
  },
  flurry: {
    name:"Flurry", icon:"🌪", tree:"combat", cls:"attacker",
    type:"active", cooldown:4, offset:4, duration:1,
    desc:"Three rapid strikes in one burst.",
    cmdHits:3, cmdMult:0.9, base:0.9, perLevel:0.08,
    nextDesc:(lvl)=>`3 hits ×${(0.9+lvl*0.08).toFixed(2)} — rounds 4,8`,
  },
  deathblow: {
    name:"Deathblow", icon:"💥", tree:"combat", cls:"attacker",
    type:"active", cooldown:5, offset:3, duration:1,
    desc:"Massive strike targeting enemy troop HP directly with high crit.",
    cmdPctDmg:0.10, critBonus:0.50, base:0.10, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.10+lvl*0.02)*100)}% max HP + 50% crit — rounds 3,8`,
  },
  relentless: {
    name:"Relentless", icon:"🔥", tree:"combat", cls:"attacker",
    type:"active", cooldown:1, offset:1, duration:1,
    desc:"A small bonus commander strike every single round.",
    cmdMult:1.08, base:1.08, perLevel:0.04,
    nextDesc:(lvl)=>`Cmd ×${(1.08+lvl*0.04).toFixed(2)} dmg — every round`,
  },
};

// ── DEFENDER — mitigation, enemy debuffs, no healing ─────────────────────────

export const DEFENDER_SKILLS = {
  iron_will: {
    name:"Iron Will", icon:"🛡", tree:"defense", cls:"defender",
    type:"passive",
    desc:"Permanently reduces all incoming damage.",
    passiveDmgReduce:0.04, base:0.04, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.04+lvl*0.03)*100)}% incoming dmg (permanent)`,
  },
  shield_wall: {
    name:"Shield Wall", icon:"🏰", tree:"defense", cls:"defender",
    type:"active", cooldown:2, offset:1, duration:2,
    desc:"Raises a shield wall every other round for 2 rounds.",
    dmgReduce:0.12, base:0.12, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.04)*100)}% all dmg (2 rnd) — rounds 1,3,5,7,9`,
  },
  iron_bastion: {
    name:"Iron Bastion", icon:"⛩", tree:"defense", cls:"defender",
    type:"active", cooldown:4, offset:2, duration:3,
    desc:"Reinforces troop defenses for 3 rounds.",
    troopDmgReduce:0.18, base:0.18, perLevel:0.05,
    nextDesc:(lvl)=>`-${Math.round((0.18+lvl*0.05)*100)}% troop dmg (3 rnd) — rounds 2,6,10`,
  },
  bulwark_stance: {
    name:"Bulwark Stance", icon:"⚜", tree:"defense", cls:"defender",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"Near-impenetrable defence on key rounds.",
    dmgReduce:0.40, base:0.40, perLevel:0.08,
    nextDesc:(lvl)=>`-${Math.round((0.40+lvl*0.08)*100)}% all dmg — rounds 5,10`,
  },
  intimidating_presence: {
    name:"Intimidating Presence", icon:"😤", tree:"defense", cls:"defender",
    type:"passive",
    desc:"Permanently unnerves enemy attackers.",
    passiveEnemyAtk:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.05+lvl*0.03)*100)}% enemy ATK (permanent)`,
  },
  demoralise: {
    name:"Demoralise", icon:"📣", tree:"defense", cls:"defender",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"Weakens enemy attacks for 2 rounds.",
    enemyAtkReduce:0.15, base:0.15, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.15+lvl*0.04)*100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  blinding_light: {
    name:"Blinding Light", icon:"🌟", tree:"defense", cls:"defender",
    type:"active", cooldown:4, offset:3, duration:2,
    desc:"Blinds the enemy, causing missed attacks.",
    enemyMissChance:0.20, base:0.20, perLevel:0.05,
    nextDesc:(lvl)=>`${Math.round((0.20+lvl*0.05)*100)}% miss (2 rnd) — rounds 3,7`,
  },
  terror_aura: {
    name:"Terror Aura", icon:"👻", tree:"defense", cls:"defender",
    type:"active", cooldown:5, offset:2, duration:3,
    desc:"Radiates fear, reducing all enemy damage for 3 rounds.",
    enemyDmgReduce:0.20, base:0.20, perLevel:0.05,
    nextDesc:(lvl)=>`-${Math.round((0.20+lvl*0.05)*100)}% enemy dmg (3 rnd) — rounds 2,7`,
  },
  fortified_ranks: {
    name:"Fortified Ranks", icon:"🪖", tree:"defense", cls:"defender",
    type:"passive",
    desc:"Permanently hardens troop defenses.",
    passiveTroopDef:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% troop DEF (permanent)`,
  },
  hold_the_line: {
    name:"Hold the Line", icon:"🚩", tree:"defense", cls:"defender",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"Orders troops to brace every other round.",
    troopDmgReduce:0.14, base:0.14, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.14+lvl*0.04)*100)}% troop dmg — rounds 2,4,6,8,10`,
  },
  counter_intel: {
    name:"Counter Intel", icon:"🔭", tree:"defense", cls:"defender",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"Anticipates and nullifies the enemy's skill.",
    nullifySkill:true, base:1, perLevel:0,
    nextDesc:()=>`Nullify enemy skill — rounds 1,6`,
  },
  phantom_step: {
    name:"Phantom Step", icon:"👤", tree:"defense", cls:"defender",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"Sidesteps attacks with eerie precision every 3 rounds.",
    enemyMissChance:0.30, base:0.30, perLevel:0.06,
    nextDesc:(lvl)=>`${Math.round((0.30+lvl*0.06)*100)}% enemy miss — rounds 3,6,9`,
  },
};

// ── SUPPORT — healing, buffs, some debuffs ────────────────────────────────────

export const SUPPORT_SKILLS = {
  field_medic: {
    name:"Field Medic", icon:"💚", tree:"tactics", cls:"support",
    type:"passive",
    desc:"Continuously restores fallen troops each round.",
    passiveHealPerRound:0.02, base:0.02, perLevel:0.01,
    nextDesc:(lvl)=>`Restore ${Math.round((0.02+lvl*0.01)*100)}% lost troops/round`,
  },
  mending_wave: {
    name:"Mending Wave", icon:"✨", tree:"tactics", cls:"support",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"A surge of healing every other round.",
    healPct:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`Restore ${Math.round((0.06+lvl*0.02)*100)}% lost troops — rounds 2,4,6,8,10`,
  },
  rally_cry: {
    name:"Rally Cry", icon:"🚩", tree:"tactics", cls:"support",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"Pulls fallen soldiers back to their feet.",
    healPct:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`Restore ${Math.round((0.18+lvl*0.04)*100)}% lost troops — rounds 1,6`,
  },
  battle_hymn: {
    name:"Battle Hymn", icon:"🎵", tree:"tactics", cls:"support",
    type:"active", cooldown:3, offset:3, duration:2,
    desc:"Inspiring hymn boosts troop attack for 2 rounds.",
    troopAtkMult:1.18, base:1.18, perLevel:0.06,
    nextDesc:(lvl)=>`Troops ×${(1.18+lvl*0.06).toFixed(2)} ATK (2 rnd) — rounds 3,6,9`,
  },
  inspiring_presence: {
    name:"Inspiring Presence", icon:"⭐", tree:"tactics", cls:"support",
    type:"passive",
    desc:"Permanently inspires troops to fight harder.",
    passiveTroopAtk:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop ATK (permanent)`,
  },
  hex_curse: {
    name:"Hex Curse", icon:"🔮", tree:"tactics", cls:"support",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"Hexes the enemy, causing erratic attacks for 2 rounds.",
    enemyMissChance:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`${Math.round((0.18+lvl*0.04)*100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  blind_strike: {
    name:"Blind Strike", icon:"👁", tree:"tactics", cls:"support",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"Disorients the enemy, reducing their attack.",
    enemyAtkReduce:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.03)*100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  supply_cut_support: {
    name:"Supply Cut", icon:"✂", tree:"tactics", cls:"support",
    type:"active", cooldown:5, offset:3, duration:1,
    desc:"Cuts enemy supply lines, blocking their healing.",
    blockHeal:3, base:3, perLevel:1,
    nextDesc:(lvl)=>`Block enemy heal ${3+lvl} rounds — rounds 3,8`,
  },
  guardian_aura: {
    name:"Guardian Aura", icon:"🌿", tree:"tactics", cls:"support",
    type:"passive",
    desc:"Permanently bolsters troop resilience.",
    passiveTroopDef:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop DEF (permanent)`,
  },
  ember_shield: {
    name:"Ember Shield", icon:"🔆", tree:"tactics", cls:"support",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"Protective shield every other round.",
    troopDefMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`Troops ×${(1.15+lvl*0.05).toFixed(2)} DEF — rounds 1,3,5,7,9`,
  },
  second_wind: {
    name:"Second Wind", icon:"💨", tree:"tactics", cls:"support",
    type:"active", cooldown:5, offset:5, duration:2,
    desc:"Restores troops and surges their attack for 2 rounds.",
    healPct:0.12, troopAtkMult:1.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`Heal ${Math.round((0.12+lvl*0.03)*100)}% + ×${(1.12+lvl*0.03).toFixed(2)} ATK — rounds 5,10`,
  },
  foresight: {
    name:"Foresight", icon:"🔭", tree:"tactics", cls:"support",
    type:"active", cooldown:4, offset:4, duration:1,
    desc:"Foresees and nullifies enemy tactical skill.",
    nullifySkill:true, base:1, perLevel:0,
    nextDesc:()=>`Nullify enemy skill — rounds 4,8`,
  },
};

// ── LEADER — army-wide buffs, strategic, siege ───────────────────────────────

export const LEADER_SKILLS = {
  warchief_aura: {
    name:"Warchief's Aura", icon:"📡", tree:"command", cls:"leader",
    type:"passive",
    desc:"Troops permanently fight with greater ferocity.",
    passiveTroopAtk:0.07, base:0.07, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.07+lvl*0.04)*100)}% troop ATK (permanent)`,
  },
  warchief_roar: {
    name:"Warchief's Roar", icon:"📣", tree:"command", cls:"leader",
    type:"active", cooldown:2, offset:2, duration:2,
    desc:"Boosts troop attack every other round.",
    troopAtkMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`Troops ×${(1.15+lvl*0.05).toFixed(2)} ATK (2 rnd) — rounds 2,4,6,8,10`,
  },
  grand_strategy: {
    name:"Grand Strategy", icon:"🗺", tree:"command", cls:"leader",
    type:"active", cooldown:4, offset:1, duration:3,
    desc:"Tactical masterplan buffs attack and defense.",
    troopAtkMult:1.20, troopDefMult:1.10, base:1.20, perLevel:0.06,
    nextDesc:(lvl)=>`Troops ×${(1.20+lvl*0.06).toFixed(2)} ATK & ×1.10 DEF (3 rnd) — rounds 1,5,9`,
  },
  forced_march: {
    name:"Forced March", icon:"💨", tree:"command", cls:"leader",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"Troops surge with overwhelming force.",
    troopAtkMult:1.50, base:1.50, perLevel:0.10,
    nextDesc:(lvl)=>`Troops ×${(1.50+lvl*0.10).toFixed(2)} ATK — rounds 5,10`,
  },
  siege_mastery: {
    name:"Siege Mastery", icon:"🪨", tree:"command", cls:"leader",
    type:"passive",
    desc:"Permanently ignores a portion of garrison fortifications.",
    passiveGarrisonIgnore:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`Ignore ${Math.round((0.06+lvl*0.04)*100)}% garrison bonus (permanent)`,
  },
  supply_cut_leader: {
    name:"Supply Cut", icon:"✂", tree:"command", cls:"leader",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"Repeatedly disrupts enemy supply lines.",
    blockHeal:2, base:2, perLevel:1,
    nextDesc:(lvl)=>`Block enemy heal ${2+lvl} rounds — rounds 1,4,7,10`,
  },
  tactical_advance: {
    name:"Tactical Advance", icon:"♟", tree:"command", cls:"leader",
    type:"active", cooldown:4, offset:3, duration:2,
    desc:"Boosts attack and weakens enemy damage.",
    troopAtkMult:1.12, enemyDmgReduce:0.10, base:1.12, perLevel:0.04,
    nextDesc:(lvl)=>`Troops ×${(1.12+lvl*0.04).toFixed(2)} + -10% enemy dmg (2 rnd) — rounds 3,7`,
  },
  war_council: {
    name:"War Council", icon:"📜", tree:"command", cls:"leader",
    type:"active", cooldown:5, offset:2, duration:1,
    desc:"Nullifies the enemy and surges troop attack.",
    nullifySkill:true, troopAtkMult:1.18, base:1.18, perLevel:0.05,
    nextDesc:(lvl)=>`Nullify enemy + Troops ×${(1.18+lvl*0.05).toFixed(2)} ATK — rounds 2,7`,
  },
  legion_discipline: {
    name:"Legion Discipline", icon:"🪖", tree:"command", cls:"leader",
    type:"passive",
    desc:"Permanently hardens troop defenses.",
    passiveTroopDef:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% troop DEF (permanent)`,
  },
  shield_order: {
    name:"Shield Order", icon:"🛡", tree:"command", cls:"leader",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"Orders troops to shield up every other round.",
    troopDefMult:1.12, base:1.12, perLevel:0.04,
    nextDesc:(lvl)=>`Troops ×${(1.12+lvl*0.04).toFixed(2)} DEF — rounds 1,3,5,7,9`,
  },
  siege_protocol: {
    name:"Siege Protocol", icon:"🏗", tree:"command", cls:"leader",
    type:"active", cooldown:3, offset:2, duration:2,
    desc:"Reduces garrison bonuses and enemy attack.",
    garrisonIgnore:0.15, enemyAtkReduce:0.10, base:0.15, perLevel:0.04,
    nextDesc:(lvl)=>`Ignore ${Math.round((0.15+lvl*0.04)*100)}% garrison, -10% enemy ATK — rounds 2,5,8`,
  },
  war_taxes: {
    name:"War Taxes", icon:"💰", tree:"command", cls:"leader",
    type:"active", cooldown:5, offset:3, duration:1,
    desc:"Levies the cost of war — deals damage equal to a % of enemy max troop HP, scaling with your army size.",
    cmdPctDmg:0.05, base:0.05, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.05+lvl*0.02)*100)}% enemy max HP dmg — rounds 3,8`,
  },
};

// ── Merged lookup ─────────────────────────────────────────────────────────────
export const ALL_SKILLS = {
  ...ATTACKER_SKILLS,
  ...DEFENDER_SKILLS,
  ...SUPPORT_SKILLS,
  ...LEADER_SKILLS,
};

// ── Branch layout for skill tree UI ──────────────────────────────────────────
// 4 branches × (1 main + 2 sides) = 12 skills per commander
const BRANCH_SKILL_MAP = {
  attacker: [
    { main:"killing_instinct", sides:["predator_eyes",   "vampiric_strike"] },
    { main:"quick_strike",     sides:["blood_frenzy",    "flurry"]          },
    { main:"savage_blow",      sides:["killing_edge",    "deathblow"]       },
    { main:"execute",          sides:["double_strike",   "relentless"]      },
  ],
  defender: [
    { main:"iron_will",               sides:["demoralise",           "fortified_ranks"]      },
    { main:"shield_wall",             sides:["blinding_light",       "hold_the_line"]        },
    { main:"iron_bastion",            sides:["terror_aura",          "counter_intel"]        },
    { main:"bulwark_stance",          sides:["intimidating_presence","phantom_step"]         },
  ],
  support: [
    { main:"field_medic",      sides:["hex_curse",            "guardian_aura"]   },
    { main:"mending_wave",     sides:["blind_strike",         "ember_shield"]    },
    { main:"rally_cry",        sides:["supply_cut_support",   "second_wind"]     },
    { main:"battle_hymn",      sides:["inspiring_presence",   "foresight"]       },
  ],
  leader: [
    { main:"warchief_aura",    sides:["supply_cut_leader",  "legion_discipline"] },
    { main:"warchief_roar",    sides:["tactical_advance",   "shield_order"]      },
    { main:"grand_strategy",   sides:["war_council",        "siege_protocol"]    },
    { main:"forced_march",     sides:["siege_mastery",      "war_taxes"]         },
  ],
};

// ── Public helpers ────────────────────────────────────────────────────────────

// Map tree key (from heroes.js SKILL_TREES) to cls key (used in BRANCH_SKILL_MAP)
const TREE_TO_CLS = { combat:"attacker", defense:"defender", tactics:"support", command:"leader" };

export function getBranchMainSkill(treeOrCls, branchIndex) {
  const cls      = TREE_TO_CLS[treeOrCls] ?? treeOrCls;
  const branches = BRANCH_SKILL_MAP[cls] ?? BRANCH_SKILL_MAP.attacker;
  const branch   = branches[branchIndex % branches.length];
  const key      = branch.main;
  return { key, ...(ALL_SKILLS[key] ?? {}) };
}

export function getBranchSideSkills(treeOrCls, branchIndex) {
  const cls      = TREE_TO_CLS[treeOrCls] ?? treeOrCls;
  const branches = BRANCH_SKILL_MAP[cls] ?? BRANCH_SKILL_MAP.attacker;
  const branch   = branches[branchIndex % branches.length];
  return branch.sides.map(key => ({ key, ...(ALL_SKILLS[key] ?? {}) }));
}

export function skillValue(skillDef, level) {
  if (!skillDef || level <= 0) return skillDef?.base ?? 0;
  return skillDef.base + skillDef.perLevel * level;
}

/** Does an active skill fire on a given round? */
export function skillFiresOnRound(skillDef, round) {
  if (!skillDef || skillDef.type !== "active") return false;
  const cd  = skillDef.cooldown ?? 1;
  const off = skillDef.offset   ?? cd;
  if (round < off) return false;
  return (round - off) % cd === 0;
}

/** Returns all skills a commander has points in */
export function getActiveSkills(cmd) {
  const sp   = cmd.skillPoints || {};
  const cls  = cmd.cls;
  const branches = BRANCH_SKILL_MAP[cls] ?? [];
  const keys = branches.flatMap(b => [b.main, ...b.sides]);
  return keys
    .map(key => ({ key, def: ALL_SKILLS[key], level: sp[key] ?? 0 }))
    .filter(s => s.def && s.level > 0);
}

/** Collect passive bonuses from all invested skills */
export function getPassiveBonuses(cmd) {
  const skills = getActiveSkills(cmd);
  const out = {
    cmdAtkMult:       1,
    critChance:       0,
    dmgReduce:        0,
    enemyAtkReduce:   0,
    troopAtkMult:     1,
    troopDefMult:     1,
    healPerRound:     0,
    garrisonIgnore:   0,
  };
  for (const { def, level } of skills) {
    if (def.type !== "passive") continue;
    const v = skillValue(def, level - 1);
    if (def.passiveCmdAtk)         out.cmdAtkMult     += v;
    if (def.passiveCritChance)     out.critChance     += v;
    if (def.passiveDmgReduce)      out.dmgReduce      += v;
    if (def.passiveEnemyAtk)       out.enemyAtkReduce += v;
    if (def.passiveTroopAtk)       out.troopAtkMult   += v;
    if (def.passiveTroopDef)       out.troopDefMult   += v;
    if (def.passiveHealPerRound)   out.healPerRound   += v;
    if (def.passiveGarrisonIgnore) out.garrisonIgnore += v;
  }
  return out;
}

// ── Tree / faction display names ──────────────────────────────────────────────
export const TREE_DISPLAY_NAMES = {
  pirates_attacker:       ["Reaver's Edge",     "Corsair's Fury",    "Blood Wake Arts",  "Plunder's End"    ],
  pirates_defender:       ["Boarding Iron",      "Anchor Hold",       "Sea Bulwark",      "Pirate Tactics"   ],
  pirates_leader:         ["Captain's Banner",   "Fleet Discipline",  "Trade Wind",       "Smuggler's Arts"  ],
  pirates_support:        ["Mending Tide",        "Crew Muster",       "Healing Wake",     "Corsair Cunning"  ],
  marines_attacker:       ["Naval Strike",        "Shore Assault",     "Broadside",        "Admiral's Blade"  ],
  marines_defender:       ["Shield Wall Arts",    "Iron Discipline",   "Rampart",          "Fleet Guard"      ],
  marines_leader:         ["Commander's Banner",  "Legion Drill",      "Force March",      "Strategic Arts"   ],
  marines_support:        ["Field Triage",        "Supply Line",       "Morale Master",    "Siege Support"    ],
  bountyhunters_attacker: ["Arcane Strike",       "Void Slash",        "Mana Surge",       "Elder Blade"      ],
  bountyhunters_defender: ["Crystal Ward",        "Stone Skin",        "Mana Barrier",     "Dispel Arts"      ],
  bountyhunters_leader:   ["Elder's Banner",      "Arcane Rally",      "Ley Walk",         "Grand Arcana"     ],
  bountyhunters_support:  ["Mending Light",       "Arcane Supply",     "Restoration",      "Seer's Arts"      ],
  merfolk_attacker:       ["Tidal Strike",        "Depth Surge",       "Whirlpool",        "Siege Flood"      ],
  merfolk_defender:       ["Trident Wall",        "Reef Bastion",      "Shell Armor",      "Undertow Arts"    ],
  merfolk_leader:         ["Sea King's Banner",   "Current Command",   "Tide Council",     "Ocean Arts"       ],
  merfolk_support:        ["Healing Waters",      "Kelp Line",         "Mending Current",  "Deep Arts"        ],
  orcs_attacker:          ["Berserker Arts",      "Blood Frenzy",      "Orc Smash",        "Warchief Blade"   ],
  orcs_defender:          ["Skull Guard",         "Stone Hide",        "Orc Bastion",      "Warcry Arts"      ],
  orcs_leader:            ["Warlord's Banner",    "Horde Command",     "Forced March",     "Siege Terror"     ],
  orcs_support:           ["Shaman Arts",         "Spirit Ward",       "Hex Mastery",      "Blood Tactics"    ],
  dragons_attacker:       ["Inferno Strike",      "Claw Rend",         "Ember Slash",      "Dragonfire"       ],
  dragons_defender:       ["Scale Armor",         "Flame Ward",        "Dragon Hide",      "Fear Aura"        ],
  dragons_leader:         ["Draconic Banner",     "Dragon Council",    "Wing March",       "Elder Command"    ],
  dragons_support:        ["Healing Ember",       "Clutch Line",       "Ancient Restore",  "Hoard Arts"       ],
};

export function getTreeDisplayNames(faction, cls) {
  return TREE_DISPLAY_NAMES[`${faction}_${cls}`] ?? ["Branch I","Branch II","Branch III","Branch IV"];
}

export const SKILL_TREES = {
  combat:  { n:"Combat",  icon:"⚔",  branches:4, cls:"attacker", unlocksAt:0, desc:"Raw damage, attack buffs, offensive power"           },
  defense: { n:"Defense", icon:"🛡", branches:4, cls:"defender", unlocksAt:0, desc:"Garrison strength, troop survival, damage reduction"  },
  command: { n:"Command", icon:"📡", branches:4, cls:"leader",   unlocksAt:3, desc:"Troop capacity, march speed, logistics"               },
  tactics: { n:"Tactics", icon:"✦",  branches:4, cls:"support",  unlocksAt:5, desc:"Special effects, debuffs, healing, siege bonuses"     },
};

// NOTE: The authoritative getCommanderTrees lives in heroes.js.
// This stub exists so skills.js can be imported standalone by battle.js etc.
// CommanderScreen imports getCommanderTrees from heroes.js directly.
export function getCommanderTrees(cmd) {
  const clsMap = { attacker:["combat","combat","combat"], defender:["defense","defense","defense"],
                   leader:["command","command","command"], support:["tactics","tactics","tactics"] };
  const secMap = { attacker:["command","defense","tactics"], defender:["command","combat","tactics"],
                   leader:["combat","defense","tactics"],   support:["combat","defense","command"] };
  const cls     = typeof cmd === "string" ? cmd : cmd?.cls;
  const primary = clsMap[cls] ?? ["combat","combat","combat"];
  const secOpts = secMap[cls] ?? ["command","defense","tactics"];
  const seed    = (typeof cmd === "object" && cmd?.id)
    ? cmd.id.split("").reduce((a,c) => a + c.charCodeAt(0), 0) : 0;
  const secondary = secOpts[seed % secOpts.length];
  return { primary, secondary, all:[...primary, secondary] };
}

// ── Backwards-compat: MAIN_SKILLS = branch main skills, SIDE_SKILLS = side skills ──
// CommanderScreen uses !!MAIN_SKILLS[key] to determine isMain (max level 10 vs 5)
const MAIN_SKILL_KEYS = new Set(
  Object.values(BRANCH_SKILL_MAP).flatMap(branches => branches.map(b => b.main))
);
const SIDE_SKILL_KEYS = new Set(
  Object.values(BRANCH_SKILL_MAP).flatMap(branches => branches.flatMap(b => b.sides))
);

export const MAIN_SKILLS = Object.fromEntries(
  Object.entries(ALL_SKILLS).filter(([k]) => MAIN_SKILL_KEYS.has(k))
);
export const SIDE_SKILLS = Object.fromEntries(
  Object.entries(ALL_SKILLS).filter(([k]) => SIDE_SKILL_KEYS.has(k))
);
export const SKILLS            = ALL_SKILLS;
export const SKILL_MECHANICS   = {};
export const SKILL_NAMES       = {};
export const FACTION_MAIN_NAMES= {};
export const MAIN_BRANCH_NAMES = {
  combat:  ["Grit","Weapon Mastery","Battle Fury","Iron Resolve","Blood Rush","War Cry","Killing Blow","Unstoppable","Wrath","Supreme Might"],
  defense: ["Fortify","Shield Training","Stalwart","Iron Skin","Hold the Line","Bulwark","Impenetrable","Stone Will","Last Stand","Citadel"],
  command: ["Rally","March Discipline","Vanguard","Supply Lines","Force March","Tactical Advance","Strategic Mind","Grand March","Legion's Pride","War Council"],
  tactics: ["Cunning","Feint","Ambush","Debilitating Strike","Hex","Battle Scheme","Masterstroke","Siege Craft","Shadow Gambit","Grand Tactics"],
};
export function getMainBranchNames()     { return []; }
export function getSkillNames()          { return ["Sub I","Sub II"]; }
export function getBranchMechanicKey()   { return "killing_instinct"; }
export function getBranchMechanic()      { return { key:"killing_instinct", ...ALL_SKILLS.killing_instinct }; }
