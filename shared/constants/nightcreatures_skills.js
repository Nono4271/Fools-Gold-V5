/* ─────────────────────────────────────────────────────────────────────────────
   nightcreatures_skills.js — Creatures of the Night Faction Skills
   72 total: 60 reskins + 12 unique skills
   6 commanders × 12 skills each

   Commanders:
     Countess Serava       (veteran,  strategist) [Vampire]  — 10 reskins + 2 unique
     Lord Malachar         (champion, strategist) [Vampire]  — 10 reskins + 2 unique
     Fang Groth            (soldier,  balanced)   [Werewolf] — 10 reskins + 2 unique
     Alpha Korrax          (champion, leader)     [Werewolf] — 10 reskins + 2 unique
     Skitter Vex           (soldier,  support)    [Spider]   — 10 reskins + 2 unique
     Thaelor the Silkbound (veteran,  attacker)   [Spider]   — 10 reskins + 2 unique
───────────────────────────────────────────────────────────────────────────── */

// ── COUNTESS SERAVA (veteran, strategist, Vampire) ────────────────────────────
// High FOC not present in stats (atk:150, foc:0) — but strategist class bonus
// gives +25 FOC at Lv20. She is a physical vampire who debuffs through blood
// magic rather than raw focus damage. Mix of expose/drain/debuff with hit skills.

export const SERAVA_UNIQUE_SKILLS = {
  serava_crimson_embrace: {
    name:"Crimson Embrace", icon:"🦇", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:4, offset:2, duration:1,
    desc:"Serava strikes deep and drinks — her troops restore as the enemy bleeds out.",
    cmdMult:2.4, lifesteal:0.40, base:2.4, perLevel:0.18,
    nextDesc:(lvl)=>`${Math.round((2.4+lvl*0.18)*100)}% damage, restore troops = ${Math.round((0.40)*100)}% of damage dealt — rounds 2,6,10`,
  },
  serava_blood_curse: {
    name:"Blood Curse", icon:"🩸", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"A vampiric hex poisons the enemy's will — they strike slower and take more from every wound.",
    enemyAtkReduce:0.14, enemyDmgTakenUp:0.12, base:0.14, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.14+lvl*0.03)*100)}% enemy ATK & +12% damage taken (2 rnd) — rounds 1,4,7,10`,
  },
};

export const SERAVA_RESKIN_SKILLS = {
  serava_killing_instinct: {
    name:"Predator's Hunger", icon:"⚔", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"passive",
    desc:"Centuries of predation have honed her instincts. She permanently strikes harder.",
    passiveCmdAtk:0.08, base:0.08, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.08+lvl*0.06)*100)}% commander damage (permanent)`,
  },
  serava_quick_strike: {
    name:"Blur of Claws", icon:"⚡", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"She moves between heartbeats — faster than any mortal eye can follow.",
    cmdMult:1.4, base:1.4, perLevel:0.15,
    nextDesc:(lvl)=>`Commander attacks for ${Math.round((1.4+lvl*0.15)*100)}% damage — rounds 1,3,5,7,9`,
  },
  serava_expose_weakness: {
    name:"Exposed Veins", icon:"🎯", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:3, offset:2, duration:2,
    desc:"She reads every weakness in the enemy line — they bleed more from everything that follows.",
    enemyDmgTakenUp:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`Enemy takes ${Math.round((0.12+lvl*0.03)*100)}% more damage (2 rnd) — rounds 2,5,8`,
  },
  serava_savage_blow: {
    name:"Noble Savagery", icon:"🗡", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"Regal form hiding vicious intent — 220% damage that leaves the target reeling.",
    cmdMult:2.2, enemyDmgTakenUp:0.15, base:2.2, perLevel:0.20,
    nextDesc:(lvl)=>`${Math.round((2.2+lvl*0.20)*100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  serava_hex_curse: {
    name:"Mesmer's Hex", icon:"🔮", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"A vampiric gaze clouds enemy minds — their attacks lose all precision.",
    enemyMissChance:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`${Math.round((0.18+lvl*0.04)*100)}% enemy miss chance (2 rnd) — rounds 2,6,10`,
  },
  serava_killing_edge: {
    name:"Jugular Strike", icon:"🔪", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"She strikes for the heart of an army — not its soldiers, but its will to stand.",
    cmdPctDmg:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.06+lvl*0.02)*100)}% of enemy max HP as direct damage — rounds 5,10`,
  },
  serava_blind_strike: {
    name:"Hypnotic Strike", icon:"👁", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"A single look into her eyes robs the enemy of aggression.",
    enemyAtkReduce:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.03)*100)}% enemy attack (2 rnd) — rounds 1,4,7,10`,
  },
  serava_predator_eyes: {
    name:"Crimson Sight", icon:"🦅", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"passive",
    desc:"Those crimson eyes see everything — every weakness, every opening. +6% permanent crit.",
    passiveCritChance:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% critical hit chance (permanent)`,
  },
  serava_supply_cut: {
    name:"Sever the Lifeline", icon:"✂", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:5, offset:3, duration:1,
    desc:"She cuts the enemy's ability to recover — a war of attrition she always wins.",
    blockHeal:3, base:3, perLevel:1,
    nextDesc:(lvl)=>`Block enemy healing for ${3+lvl} rounds — rounds 3,8`,
  },
  serava_field_medic: {
    name:"Blood Mending", icon:"💚", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"passive",
    desc:"Her vampiric aura passively restores fallen troops each round through stolen vitality.",
    passiveHealPerRound:0.02, base:0.02, perLevel:0.01,
    nextDesc:(lvl)=>`Restore ${Math.round((0.02+lvl*0.01)*100)}% of lost troops each round`,
  },
};

// ── LORD MALACHAR (champion, strategist, Vampire) ─────────────────────────────
// High FOC (170) — true focus strategist. Debuffer/vulnerability specialist.
// Blood dominion theme: enemies weaken, allies endure. Commander focus attacks.

export const MALACHAR_UNIQUE_SKILLS = {
  malachar_dark_communion: {
    name:"Dark Communion", icon:"🩸", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"He extends the vampiric bond across the battlefield — enemy strength drains into allied resilience.",
    enemyAtkReduce:0.18, enemyDmgTakenUp:0.10, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.18+lvl*0.04)*100)}% enemy ATK & +10% damage taken (2 rnd) — rounds 2,6,10`,
  },
  blood_dominion: {
    name:"Blood Dominion", icon:"🦇", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"Lord Malachar's presence suppresses enemy will permanently. Enemies wither. Allies endure.",
    passiveTroopDef:0.05, passiveEnemyAtk:0.04, base:0.05, perLevel:0.02,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.02)*100)}% troop DEF & -4% enemy ATK (permanent)`,
  },
};

export const MALACHAR_RESKIN_SKILLS = {
  malachar_expose_weakness: {
    name:"Marked for Ruin", icon:"🎯", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:3, offset:2, duration:2,
    desc:"He marks the enemy force — every strike against them lands with greater ruin.",
    enemyDmgTakenUp:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`Enemy takes ${Math.round((0.12+lvl*0.03)*100)}% more damage (2 rnd) — rounds 2,5,8`,
  },
  malachar_hex_curse: {
    name:"Lord's Hex", icon:"🔮", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"A lord's curse clouds enemy minds — their blows land wide and slow.",
    enemyMissChance:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`${Math.round((0.18+lvl*0.04)*100)}% enemy miss chance (2 rnd) — rounds 2,6,10`,
  },
  malachar_blind_strike: {
    name:"Hypnotic Command", icon:"👁", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"His gaze commands enemy soldiers to lower their weapons without knowing why.",
    enemyAtkReduce:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.03)*100)}% enemy attack (2 rnd) — rounds 1,4,7,10`,
  },
  malachar_supply_cut: {
    name:"Aristocratic Attrition", icon:"✂", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:5, offset:3, duration:1,
    desc:"He severs the enemy's supply lines with cold precision — a war of attrition he has fought for centuries.",
    blockHeal:3, base:3, perLevel:1,
    nextDesc:(lvl)=>`Block enemy healing for ${3+lvl} rounds — rounds 3,8`,
  },
  malachar_killing_edge: {
    name:"Noble's Reckoning", icon:"🔪", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"He doesn't strike soldiers — he strikes armies. 6% of their total strength stripped away.",
    cmdPctDmg:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.06+lvl*0.02)*100)}% of enemy max HP as direct damage — rounds 5,10`,
  },
  malachar_quick_strike: {
    name:"Vampiric Lunge", icon:"⚡", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"Even a lord moves with predatory speed when blood is in the air.",
    cmdMult:1.4, base:1.4, perLevel:0.15,
    nextDesc:(lvl)=>`Commander attacks for ${Math.round((1.4+lvl*0.15)*100)}% damage — rounds 1,3,5,7,9`,
  },
  malachar_field_medic: {
    name:"Thrall Vitality", icon:"💚", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"His bond with his thralls keeps them fighting — passively restoring lost troops each round.",
    passiveHealPerRound:0.02, base:0.02, perLevel:0.01,
    nextDesc:(lvl)=>`Restore ${Math.round((0.02+lvl*0.01)*100)}% of lost troops each round`,
  },
  malachar_inspiring_presence: {
    name:"Dark Inspiration", icon:"⭐", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"His ancient bearing permanently sharpens those who follow him into battle.",
    passiveTroopAtk:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop attack (permanent)`,
  },
  malachar_foresight: {
    name:"Prescient Malice", icon:"🔭", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:4, offset:4, duration:1,
    desc:"He knows what the enemy will do before they do it — and unmakes it entirely.",
    nullifySkill:true, base:1, perLevel:0,
    nextDesc:()=>`Nullify enemy skill — rounds 4,8`,
  },
  malachar_battle_frenzy: {
    name:"Blood Hunger", icon:"🩸", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"The scent of blood ignites something ancient — a frenzied strike with heightened lethality.",
    critBonus:0.30, cmdMult:1.15, base:0.30, perLevel:0.05,
    nextDesc:(lvl)=>`115% damage + ${Math.round((0.30+lvl*0.05)*100)}% crit — rounds 2,4,6,8,10`,
  },
};

// ── FANG GROTH (soldier, balanced, Werewolf) ──────────────────────────────────
// ATK:92, FOC:0, SPD:80 — physical brawler, fast. Balanced = combat + defense
// + troop support. Pack fighter: hits hard, protects his wolves, surges forward.

export const GROTH_UNIQUE_SKILLS = {
  groth_feral_charge: {
    name:"Feral Charge", icon:"🐺", tree:"combat", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"Groth hits like a boulder wrapped in muscle — his charge drives the pack forward with him.",
    cmdMult:2.0, troopAtkMult:1.20, base:2.0, perLevel:0.15,
    nextDesc:(lvl)=>`${Math.round((2.0+lvl*0.15)*100)}% commander damage + 20% troop attack (2 rnd) — rounds 1,4,7,10`,
  },
  pack_fury: {
    name:"Pack Fury", icon:"🌕", tree:"command", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"passive",
    desc:"Groth fights with the pack — his presence permanently sharpens both his own strike and the pack's ferocity.",
    passiveCmdAtk:0.07, passiveTroopAtk:0.04, base:0.07, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.07+lvl*0.03)*100)}% commander damage & +4% troop attack (permanent)`,
  },
};

export const GROTH_RESKIN_SKILLS = {
  groth_killing_instinct: {
    name:"Born Predator", icon:"⚔", tree:"combat", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"passive",
    desc:"Born a predator, sharpened by every kill — his attack grows without limit.",
    passiveCmdAtk:0.08, base:0.08, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.08+lvl*0.06)*100)}% commander damage (permanent)`,
  },
  groth_quick_strike: {
    name:"Wolf Speed", icon:"⚡", tree:"combat", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"Four legs are faster than two. He's already there before they see him coming.",
    cmdMult:1.4, base:1.4, perLevel:0.15,
    nextDesc:(lvl)=>`Commander attacks for ${Math.round((1.4+lvl*0.15)*100)}% damage — rounds 1,3,5,7,9`,
  },
  groth_iron_will: {
    name:"Thick Hide", icon:"🛡", tree:"defense", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"passive",
    desc:"Werewolf hide absorbs punishment. Groth permanently reduces all damage taken.",
    passiveDmgReduce:0.04, base:0.04, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.04+lvl*0.03)*100)}% all incoming damage (permanent)`,
  },
  groth_shield_wall: {
    name:"Pack Wall", icon:"🏰", tree:"defense", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:2, offset:2, duration:2,
    desc:"The wolves close ranks — a living wall that reduces all incoming damage.",
    dmgReduce:0.12, base:0.12, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.04)*100)}% all damage (2 rnd) — rounds 2,4,6,8,10`,
  },
  groth_warchief_roar: {
    name:"Alpha Howl", icon:"📣", tree:"command", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:2, offset:2, duration:2,
    desc:"A howl that ignites the pack — every wolf fights harder in its wake.",
    troopAtkMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`+${Math.round((0.15+lvl*0.05)*100-100)}% troop attack (2 rnd) — rounds 2,4,6,8,10`,
  },
  groth_demoralise: {
    name:"Terror Howl", icon:"📣", tree:"defense", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"A howl that breaks enemy morale — they flinch before the first blow lands.",
    enemyAtkReduce:0.15, base:0.15, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.15+lvl*0.04)*100)}% enemy attack (2 rnd) — rounds 1,4,7,10`,
  },
  groth_savage_blow: {
    name:"Savage Mauling", icon:"🗡", tree:"combat", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"A blow born of wild fury — raw, devastating force that leaves the target exposed.",
    cmdMult:2.2, enemyDmgTakenUp:0.15, base:2.2, perLevel:0.20,
    nextDesc:(lvl)=>`${Math.round((2.2+lvl*0.20)*100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  groth_hold_the_line: {
    name:"Hold Ground", icon:"🚩", tree:"defense", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"The pack braces every other round — no ground given, no retreat.",
    troopDmgReduce:0.14, base:0.14, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.14+lvl*0.04)*100)}% troop damage — rounds 2,4,6,8,10`,
  },
  groth_battle_hymn: {
    name:"War Song", icon:"🎵", tree:"command", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:3, offset:3, duration:2,
    desc:"A guttural war howl drives the pack into a heightened fighting state.",
    troopAtkMult:1.18, base:1.18, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.18+lvl*0.06)*100-100)}% troop attack (2 rnd) — rounds 3,6,9`,
  },
  groth_execute: {
    name:"Kill Shot", icon:"💀", tree:"combat", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"He goes for the throat — every time, without hesitation.",
    cmdMult:3.0, base:3.0, perLevel:0.25,
    nextDesc:(lvl)=>`Commander attacks for ${Math.round((3.0+lvl*0.25)*100)}% damage — rounds 1,6`,
  },
};

// ── ALPHA KORRAX (champion, leader, Werewolf) ─────────────────────────────────
// ATK:185, FOC:0, SPD:85 — dominant pack alpha. Pure leader: army buffs,
// garrison breaker, mounted/melee troop synergy. The pack obeys absolutely.

export const KORRAX_UNIQUE_SKILLS = {
  korrax_alpha_call: {
    name:"Alpha's Call", icon:"🌕", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"The Alpha howls and the pack answers — surging in attack while the enemy falters.",
    troopAtkMult:1.22, enemyAtkReduce:0.14, base:1.22, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.22+lvl*0.06)*100-100)}% troop ATK & -14% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  moon_tide_charge: {
    name:"Moon-Tide Charge", icon:"🐺", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"Under the full moon the pack becomes a tide — unstoppable, consuming, absolute.",
    troopAtkMult:1.60, garrisonIgnore:0.20, base:1.60, perLevel:0.10,
    nextDesc:(lvl)=>`+${Math.round((0.60+lvl*0.10)*100)}% troop ATK & ignore 20% garrison — rounds 5,10`,
  },
};

export const KORRAX_RESKIN_SKILLS = {
  korrax_warchief_aura: {
    name:"Alpha's Aura", icon:"📡", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"The Alpha doesn't ask for loyalty — he radiates it. Troops permanently fight harder under his command.",
    passiveTroopAtk:0.07, base:0.07, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.07+lvl*0.04)*100)}% troop attack (permanent)`,
  },
  korrax_warchief_roar: {
    name:"Pack Roar", icon:"📣", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:2, offset:2, duration:2,
    desc:"A pack howl that shakes the ground and ignites every wolf's fighting spirit.",
    troopAtkMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`+${Math.round((0.15+lvl*0.05)*100-100)}% troop attack (2 rnd) — rounds 2,4,6,8,10`,
  },
  korrax_grand_strategy: {
    name:"Hunt Formation", icon:"🗺", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:4, offset:1, duration:3,
    desc:"The pack doesn't read maps — Korrax just knows where the weak point is.",
    troopAtkMult:1.20, troopDefMult:1.10, base:1.20, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.20+lvl*0.06)*100-100)}% ATK & +10% DEF (3 rnd) — rounds 1,5,9`,
  },
  korrax_forced_march: {
    name:"The Run", icon:"💨", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"He doesn't march — he runs. And the pack runs with him at devastating speed.",
    troopAtkMult:1.50, base:1.50, perLevel:0.10,
    nextDesc:(lvl)=>`+${Math.round((0.50+lvl*0.10)*100)}% troop attack — rounds 5,10`,
  },
  korrax_siege_mastery: {
    name:"Wall Breaker", icon:"🪨", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"Walls mean nothing to a pack. Korrax finds the gap every time, permanently.",
    passiveGarrisonIgnore:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`Ignore ${Math.round((0.06+lvl*0.04)*100)}% of garrison bonus (permanent)`,
  },
  korrax_supply_cut: {
    name:"Cut the Stragglers", icon:"✂", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"He disrupts the enemy's reinforcements — cut off the stragglers and the rest collapse.",
    blockHeal:2, base:2, perLevel:1,
    nextDesc:(lvl)=>`Block enemy healing for ${2+lvl} rounds — rounds 1,4,7,10`,
  },
  korrax_tactical_advance: {
    name:"Alpha Advance", icon:"♟", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:4, offset:3, duration:2,
    desc:"He surges forward with the pack — every step gaining momentum, every enemy giving ground.",
    troopAtkMult:1.12, enemyDmgReduce:0.10, base:1.12, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.12+lvl*0.04)*100-100)}% troop ATK & -10% enemy damage (2 rnd) — rounds 3,7`,
  },
  korrax_war_council: {
    name:"Pack Council", icon:"📜", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:5, offset:2, duration:1,
    desc:"He silences an enemy commander mid-strike and surges the pack forward.",
    nullifySkill:true, troopAtkMult:1.18, base:1.18, perLevel:0.05,
    nextDesc:(lvl)=>`Nullify enemy skill + +${Math.round((0.18+lvl*0.05)*100-100)}% troop attack — rounds 2,7`,
  },
  korrax_legion_discipline: {
    name:"Pack Discipline", icon:"🪖", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"The pack never breaks. Korrax's authority keeps them fighting through wounds that would end others.",
    passiveTroopDef:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% troop defense (permanent)`,
  },
  korrax_mounted_charge: {
    name:"Wolf Rider Surge", icon:"🐴", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"Korrax signals the mounted wolves forward — they hit harder than anything on two legs.",
    troopAtkMult:1.20, troopRole:"mounted", base:1.20, perLevel:0.05,
    nextDesc:(lvl)=>`Mounted units +${Math.round((0.20+lvl*0.05)*100-100)}% attack (2 rnd) — rounds 1,4,7,10`,
  },
};

// ── SKITTER VEX (soldier, support, Spider) ────────────────────────────────────
// ATK:70, FOC:20, SPD:60 — spider tactician. Support = webs + debuffs + troop
// durability. He doesn't fight alone — he traps the enemy so others can finish.

export const SKITTER_UNIQUE_SKILLS = {
  skitter_web_trap: {
    name:"Web Trap", icon:"🕷", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"He weaves the battlefield with silk — the enemy stumbles in and can't break free.",
    enemyAtkReduce:0.14, enemyMissChance:0.12, base:0.14, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.14+lvl*0.03)*100)}% enemy ATK & 12% miss chance (2 rnd) — rounds 2,6,10`,
  },
  exoskeleton_stance: {
    name:"Exoskeleton Stance", icon:"🛡", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"passive",
    desc:"Skitter's chitinous shell shrugs off blows that would shatter iron. His troops share that resilience.",
    passiveTroopDef:0.05, passiveDmgReduce:0.02, base:0.05, perLevel:0.02,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.02)*100)}% troop DEF & -2% incoming damage (permanent)`,
  },
};

export const SKITTER_RESKIN_SKILLS = {
  skitter_field_medic: {
    name:"Silk Bindings", icon:"💚", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"passive",
    desc:"He wraps wounds with silk — passively restoring fallen soldiers each round.",
    passiveHealPerRound:0.02, base:0.02, perLevel:0.01,
    nextDesc:(lvl)=>`Restore ${Math.round((0.02+lvl*0.01)*100)}% of lost troops each round`,
  },
  skitter_mending_wave: {
    name:"Regenerative Silk", icon:"✨", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"A pulse of restorative webbing threads through the ranks every other round.",
    healPct:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`Restore ${Math.round((0.06+lvl*0.02)*100)}% of lost troops — rounds 2,4,6,8,10`,
  },
  skitter_rally_cry: {
    name:"Signal Web", icon:"🚩", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"Vibrations through the web rally fallen soldiers with sudden urgency.",
    healPct:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`Restore ${Math.round((0.18+lvl*0.04)*100)}% of lost troops — rounds 1,6`,
  },
  skitter_hex_curse: {
    name:"Venom Fog", icon:"🔮", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"A cloud of paralytic mist floods the field — enemies swing blindly through the haze.",
    enemyMissChance:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`${Math.round((0.18+lvl*0.04)*100)}% enemy miss chance (2 rnd) — rounds 2,6,10`,
  },
  skitter_blind_strike: {
    name:"Venom Rebuke", icon:"👁", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"A spray of venom weakens enemy muscle and slows their strikes for 2 rounds.",
    enemyAtkReduce:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.03)*100)}% enemy attack (2 rnd) — rounds 1,4,7,10`,
  },
  skitter_supply_cut: {
    name:"Sever Supply", icon:"✂", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:5, offset:3, duration:1,
    desc:"He cuts the enemy's recovery threads — sealing their wounds against them.",
    blockHeal:3, base:3, perLevel:1,
    nextDesc:(lvl)=>`Block enemy healing for ${3+lvl} rounds — rounds 3,8`,
  },
  skitter_guardian_aura: {
    name:"Web Armor", icon:"🌿", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"passive",
    desc:"Silk threads woven through troop armor permanently harden their defense.",
    passiveTroopDef:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop defense (permanent)`,
  },
  skitter_ember_shield: {
    name:"Silk Barrier", icon:"🔆", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"A flash of woven silk deflects incoming harm every other round.",
    troopDefMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`+${Math.round((0.15+lvl*0.05)*100-100)}% troop defense — rounds 1,3,5,7,9`,
  },
  skitter_expose_weakness: {
    name:"Exposed Joints", icon:"🎯", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:3, offset:2, duration:2,
    desc:"He identifies gaps in enemy armor — all attacks against them land with greater effect.",
    enemyDmgTakenUp:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`Enemy takes ${Math.round((0.12+lvl*0.03)*100)}% more damage (2 rnd) — rounds 2,5,8`,
  },
  skitter_foresight: {
    name:"Web Sense", icon:"🔭", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:4, offset:4, duration:1,
    desc:"Vibrations through the web alert Skitter before the enemy moves — he nullifies their skill entirely.",
    nullifySkill:true, base:1, perLevel:0,
    nextDesc:()=>`Nullify enemy skill — rounds 4,8`,
  },
};

// ── THAELOR THE SILKBOUND (veteran, attacker, Spider) ─────────────────────────
// ATK:40, FOC:145, SPD:65 — spider ambush assassin. Attacker class bonus gives
// +25 ATK at Lv20. High FOC makes her a rare focus-damage attacker — venom
// strikes, ambush bursts, lifedrain through silk.

export const THAELOR_UNIQUE_SKILLS = {
  thaelor_silk_ambush: {
    name:"Silk Ambush", icon:"🕸", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:4, offset:1, duration:1,
    desc:"She drops from above with no warning — 280% damage from a position the enemy never saw coming.",
    cmdMult:2.8, base:2.8, perLevel:0.20,
    nextDesc:(lvl)=>`Commander attacks for ${Math.round((2.8+lvl*0.20)*100)}% damage — rounds 1,5,9`,
  },
  venom_kiss: {
    name:"Venom Kiss", icon:"🕷", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:3, offset:2, duration:2,
    desc:"A touch that poisons and drains — her troops are restored as the venom does its work.",
    cmdMult:1.6, lifesteal:0.30, enemyDmgTakenUp:0.10, base:1.6, perLevel:0.12,
    nextDesc:(lvl)=>`${Math.round((1.6+lvl*0.12)*100)}% damage + 30% lifesteal + 10% vulnerability — rounds 2,5,8`,
  },
};

export const THAELOR_RESKIN_SKILLS = {
  thaelor_killing_instinct: {
    name:"Silkbound Instinct", icon:"⚔", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"passive",
    desc:"Bound in silk from birth, her instincts are woven with lethal patience. Permanently strikes harder.",
    passiveCmdAtk:0.08, base:0.08, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.08+lvl*0.06)*100)}% commander damage (permanent)`,
  },
  thaelor_quick_strike: {
    name:"Silk Strike", icon:"⚡", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"A strike wrapped in thread — fast, precise, impossible to see coming.",
    cmdMult:1.4, base:1.4, perLevel:0.15,
    nextDesc:(lvl)=>`Commander attacks for ${Math.round((1.4+lvl*0.15)*100)}% damage — rounds 1,3,5,7,9`,
  },
  thaelor_predator_eyes: {
    name:"Eight Eyes", icon:"🦅", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"passive",
    desc:"Eight eyes see every angle. No target escapes. +6% permanent critical hit chance.",
    passiveCritChance:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% critical hit chance (permanent)`,
  },
  thaelor_battle_frenzy: {
    name:"Venom Frenzy", icon:"🩸", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"Venom floods her system — every other round she strikes with heightened speed and lethality.",
    critBonus:0.30, cmdMult:1.15, base:0.30, perLevel:0.05,
    nextDesc:(lvl)=>`115% damage + ${Math.round((0.30+lvl*0.05)*100)}% crit — rounds 2,4,6,8,10`,
  },
  thaelor_execute: {
    name:"Death Drop", icon:"💀", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"She falls from the dark and ends it — 300% damage on the opener, again mid-fight.",
    cmdMult:3.0, base:3.0, perLevel:0.25,
    nextDesc:(lvl)=>`Commander attacks for ${Math.round((3.0+lvl*0.25)*100)}% damage — rounds 1,6`,
  },
  thaelor_double_strike: {
    name:"Dual Fang Strike", icon:"⚔", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:4, offset:2, duration:1,
    desc:"Two strikes in one blur — fangs and silk, landing before the enemy can react.",
    cmdHits:2, cmdMult:1.2, base:1.2, perLevel:0.10,
    nextDesc:(lvl)=>`2 hits × ${Math.round((1.2+lvl*0.10)*100)}% damage — rounds 2,6,10`,
  },
  thaelor_killing_edge: {
    name:"Silkbound Reckoning", icon:"🔪", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"She doesn't strike soldiers — she strikes armies. 6% of their total strength stripped away.",
    cmdPctDmg:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.06+lvl*0.02)*100)}% of enemy max HP as direct damage — rounds 5,10`,
  },
  thaelor_battle_hunger: {
    name:"Web Drain", icon:"🕸", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"She drains through silk — 130% damage and restores troops equal to 25% of what she deals.",
    cmdMult:1.3, lifesteal:0.25, base:0.25, perLevel:0.05,
    nextDesc:(lvl)=>`130% damage, restore troops = ${Math.round((0.25+lvl*0.05)*100)}% of damage dealt — rounds 1,4,7,10`,
  },
  thaelor_flurry: {
    name:"Silk Flurry", icon:"🌪", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:4, offset:4, duration:1,
    desc:"Three strikes wrapped in thread — the enemy can't track the blows.",
    cmdHits:3, cmdMult:0.9, base:0.9, perLevel:0.08,
    nextDesc:(lvl)=>`3 hits × ${Math.round((0.9+lvl*0.08)*100)}% damage — rounds 4,8`,
  },
  thaelor_deathblow: {
    name:"Widow's Mark", icon:"💥", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:5, offset:3, duration:1,
    desc:"She marks the enemy's heart and strikes it directly — 10% max HP damage with high crit.",
    cmdPctDmg:0.10, critBonus:0.50, base:0.10, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.10+lvl*0.02)*100)}% max HP direct + 50% crit — rounds 3,8`,
  },
};

// ── Merged export ─────────────────────────────────────────────────────────────

export const NIGHTCREATURES_SKILLS = {
  ...SERAVA_UNIQUE_SKILLS,
  ...SERAVA_RESKIN_SKILLS,
  ...MALACHAR_UNIQUE_SKILLS,
  ...MALACHAR_RESKIN_SKILLS,
  ...GROTH_UNIQUE_SKILLS,
  ...GROTH_RESKIN_SKILLS,
  ...KORRAX_UNIQUE_SKILLS,
  ...KORRAX_RESKIN_SKILLS,
  ...SKITTER_UNIQUE_SKILLS,
  ...SKITTER_RESKIN_SKILLS,
  ...THAELOR_UNIQUE_SKILLS,
  ...THAELOR_RESKIN_SKILLS,
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const NIGHTCREATURES_BRANCH_SKILL_MAP = {
  // Countess Serava (strategist, Vampire) — blood curse debuffer + drain striker
  h43: [
    { main:"serava_killing_instinct", sides:["serava_predator_eyes",   "serava_field_medic"]     },
    { main:"serava_blood_curse",      sides:["serava_hex_curse",        "serava_blind_strike"]    },
    { main:"serava_crimson_embrace",  sides:["serava_expose_weakness",  "serava_killing_edge"]    },
    { main:"serava_savage_blow",      sides:["serava_quick_strike",     "serava_supply_cut"]      },
  ],
  // Lord Malachar (strategist, Vampire) — vulnerability stacker + army debuffer
  h44: [
    { main:"blood_dominion",          sides:["malachar_inspiring_presence", "malachar_field_medic"]   },
    { main:"malachar_dark_communion", sides:["malachar_expose_weakness",    "malachar_blind_strike"]  },
    { main:"malachar_hex_curse",      sides:["malachar_foresight",          "malachar_supply_cut"]    },
    { main:"malachar_killing_edge",   sides:["malachar_quick_strike",       "malachar_battle_frenzy"] },
  ],
  // Fang Groth (balanced, Werewolf) — pack brawler, combat + defense + troop buff
  h45: [
    { main:"pack_fury",               sides:["groth_killing_instinct",  "groth_iron_will"]        },
    { main:"groth_feral_charge",      sides:["groth_quick_strike",      "groth_warchief_roar"]    },
    { main:"groth_savage_blow",       sides:["groth_shield_wall",       "groth_demoralise"]       },
    { main:"groth_execute",           sides:["groth_hold_the_line",     "groth_battle_hymn"]      },
  ],
  // Alpha Korrax (leader, Werewolf) — army commander, pack surge, garrison breaker
  h46: [
    { main:"korrax_warchief_aura",    sides:["korrax_legion_discipline", "korrax_siege_mastery"]  },
    { main:"korrax_alpha_call",       sides:["korrax_warchief_roar",     "korrax_mounted_charge"] },
    { main:"korrax_grand_strategy",   sides:["korrax_war_council",       "korrax_tactical_advance"]},
    { main:"moon_tide_charge",        sides:["korrax_forced_march",      "korrax_supply_cut"]     },
  ],
  // Skitter Vex (support, Spider) — web trapper, team healer, debuffer
  h47: [
    { main:"exoskeleton_stance",      sides:["skitter_field_medic",    "skitter_guardian_aura"]  },
    { main:"skitter_web_trap",        sides:["skitter_mending_wave",   "skitter_ember_shield"]   },
    { main:"skitter_hex_curse",       sides:["skitter_blind_strike",   "skitter_expose_weakness"]},
    { main:"skitter_foresight",       sides:["skitter_rally_cry",      "skitter_supply_cut"]     },
  ],
  // Thaelor the Silkbound (attacker, Spider) — ambush assassin, venom striker
  h48: [
    { main:"thaelor_killing_instinct",sides:["thaelor_predator_eyes",  "thaelor_battle_hunger"]  },
    { main:"thaelor_battle_frenzy",   sides:["thaelor_quick_strike",   "thaelor_double_strike"]  },
    { main:"thaelor_silk_ambush",     sides:["thaelor_execute",        "thaelor_killing_edge"]   },
    { main:"venom_kiss",              sides:["thaelor_flurry",         "thaelor_deathblow"]      },
  ],
};
