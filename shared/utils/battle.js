import { FACTION_TROOPS, troopSizeModifier, skillProcAtLevel } from "../constants/troops.js";
import { TERR  } from "../constants/terrain.js";
import { POWER_DEFS } from "../constants/map.js";
import { skillFiresOnRound, getActiveSkills, getPassiveBonuses } from "../constants/skills.js";
import { npcForPowerLevel } from "../constants/heroes.js";

// ── Resolve troopBranch { faction, branch, tier } to branch def + tier data ───
function resolveBranch(troopBranch) {
  if (!troopBranch) return null;
  const { faction, branch, tier = 0 } = troopBranch;
  const f = FACTION_TROOPS[faction];
  if (!f) return null;
  const b = f.branches.find(b => b.key === branch);
  if (!b) return null;
  return { branchDef: b, tierData: b.tiers[tier] ?? null };
}

// ── Get troop skills for a given troopBranch (including faction passives) ─────
function getTierSkillsForBattle(troopBranch) {
  if (!troopBranch) return [];
  const { faction, branch, tier = 0 } = troopBranch;
  const f = FACTION_TROOPS[faction];
  if (!f) return [];
  const b = f.branches.find(b => b.key === branch);
  if (!b) return [];
  const skills = [];
  if (tier === 0) skills.push(b.skills.a);
  else if (tier === 1) skills.push(b.skills.b);
  else { skills.push(b.skills.a); skills.push(b.skills.b); }
  if (f.factionPassives) skills.push(...f.factionPassives);
  return skills;
}

// ── Dragon early-round penalty ────────────────────────────────────────────────
function dragonEarlyPenalty(troopBranch, round) {
  if (!troopBranch) return 1.0;
  const f = FACTION_TROOPS[troopBranch.faction];
  if (!f?.factionPassives) return 1.0;
  return (f.factionPassives.some(p => p.key === "slow_to_rise") && round <= 2) ? 0.90 : 1.0;
}

// ── Ranged vulnerability (exposed wings on dragons) ───────────────────────────
function rangedVulnerability(defTroopBranch, atkBranchDef) {
  if (!defTroopBranch || !atkBranchDef) return 1.0;
  const f = FACTION_TROOPS[defTroopBranch.faction];
  if (!f?.factionPassives) return 1.0;
  if (!f.factionPassives.some(p => p.key === "exposed_wings")) return 1.0;
  return (atkBranchDef.role === "ranged" || atkBranchDef.role === "siege_ranged") ? 1.15 : 1.0;
}

// ── Proc troop skills on a given trigger ──────────────────────────────────────
function procTroopSkills(troopSkills, trigger, skillLevels, rs, roundLog, actorLabel) {
  for (const skill of troopSkills) {
    if (!skill || skill.trigger !== trigger) continue;
    if (skill.trigger === "passive") continue;
    const lvl  = skillLevels?.[skill.key] ?? 1;
    const proc = skillProcAtLevel(skill, lvl);
    if (Math.random() >= proc) continue;
    const eff = skill.effect;
    switch (eff.type) {
      case "taunt":          rs.enemyTargetsTaunted = true; break;
      case "stun":           rs.enemyStunned   = Math.max(rs.enemyStunned  || 0, eff.duration || 1); break;
      case "confusion":      rs.enemyConfused  = Math.max(rs.enemyConfused || 0, eff.duration || 1); break;
      case "heal_block":     rs.blockHeal      = Math.max(rs.blockHeal, eff.duration || 1); break;
      case "def_down":       rs.enemyDefDown   = Math.max(rs.enemyDefDown  || 0, eff.value || 0.30); break;
      case "dmg_down":       rs.enemyDmgReduce = Math.min(0.80, (rs.enemyDmgReduce || 0) + (eff.value || 0.30)); break;
      case "dmg_reduce":     rs.dmgReduce      = Math.min(0.85, rs.dmgReduce + (eff.value || 0.15)); break;
      case "double_attack":  rs.troopDoubleAtk = true; break;
      case "bonus_damage":   rs.troopBonusDmgMult = (rs.troopBonusDmgMult || 0) + (eff.value || 1.0); break;
      case "self_dmg_up":
      case "self_atk_up":
      case "ally_atk_up":    rs.troopAtkMult *= (1 + (eff.value || 0.20)); break;
      case "ally_def_up":    rs.troopDefMult *= (1 + (eff.value || 0.20)); break;
      case "atk_stack":      rs.troopAtkMult *= (1 + (eff.valuePerStack || 0.04)); break;
      case "counter_attack": rs.troopCounterAtk = true; break;
      default: break;
    }
    roundLog.actions.push({ actor: actorLabel, action: `${skill.icon} ${skill.name}`, dmg: 0, isTroopSkill: true });
  }
}

export function garrisonDefCmd(tile) {
  const plvl = tile.powerLevel || 1;
  const pd   = POWER_DEFS[plvl] || POWER_DEFS[1];
  const npc  = npcForPowerLevel(plvl);
  return {
    lvl:         pd.cmdLvl,
    troops:      tile.garrisonTroops || pd.troops,
    troopBranch: npc.troopBranch || null,
    atk:         npc.atk * pd.cmdLvl,
    spd:         npc.spd + pd.cmdLvl * 2,
    n:           npc.n,
    icon:        npc.icon,
    cls:         npc.cls,
    faction:     null,
    rarity:      "soldier",
  };
}

export function resolvedDefTile(tile) {
  if (tile.owner === "ai" && !tile.hasAiCommander) {
    return { ...tile, defCmd: garrisonDefCmd(tile) };
  }
  return tile;
}

// ── Apply instant active skill effects ────────────────────────────────────────
function applyInstantEffects(skills, round, rs) {
  for (const { def, level } of skills) {
    if (!skillFiresOnRound(def, round)) continue;
    if (def.duration && def.duration > 1) continue;
    const lv = level - 1;
    const v  = def.base + (def.perLevel ?? 0) * lv;
    rs.skillFiredNames.push(def.name);
    if (def.nullifySkill)    rs.enemyNullified  = true;
    if (def.blockHeal)       rs.blockHeal       = Math.max(rs.blockHeal, Math.round(def.blockHeal + lv * (def.perLevel ?? 0)));
    if (def.cmdMult)         rs.cmdMult        *= v;
    if (def.cmdHits)         rs.cmdHits         = Math.max(rs.cmdHits, def.cmdHits);
    if (def.critBonus)       rs.critChance     += v;
    if (def.cmdPctDmg)       rs.cmdPctDmg      += v;
    if (def.lifesteal)       rs.lifesteal      += v;
    if (def.healPct)         rs.healPct        += v;
    if (def.troopAtkMult)    rs.troopAtkMult   *= v;
    if (def.troopDefMult)    rs.troopDefMult   *= v;
    if (def.dmgReduce)       rs.dmgReduce       = Math.min(0.85, rs.dmgReduce      + v);
    if (def.troopDmgReduce)  rs.troopDmgReduce  = Math.min(0.85, rs.troopDmgReduce + v);
    if (def.enemyAtkReduce)  rs.enemyAtkReduce  = Math.min(0.80, rs.enemyAtkReduce + v);
    if (def.enemyDmgReduce)  rs.enemyDmgReduce  = Math.min(0.80, rs.enemyDmgReduce + v);
    if (def.enemyMissChance) rs.enemyMissChance = Math.min(0.80, rs.enemyMissChance + v);
    if (def.garrisonIgnore)  rs.garrisonIgnore += v;
  }
}

// ── Duration buff tracker ──────────────────────────────────────────────────────
function applyDurationEffects(skills, round, durationBuffs, rs) {
  for (const { key, def, level } of skills) {
    if (!skillFiresOnRound(def, round)) continue;
    if (!def.duration || def.duration <= 1) continue;
    const lv    = level - 1;
    const entry = { endsAt: round + def.duration - 1 };
    const v     = def.base + (def.perLevel ?? 0) * lv;
    if (def.troopAtkMult)    entry.troopAtkMult   = v;
    if (def.troopDefMult)    entry.troopDefMult   = v;
    if (def.healPct)         entry.healPct        = v;
    if (def.dmgReduce)       entry.dmgReduce      = v;
    if (def.troopDmgReduce)  entry.troopDmgReduce = v;
    if (def.enemyAtkReduce)  entry.enemyAtkReduce = v;
    if (def.enemyDmgReduce)  entry.enemyDmgReduce = v;
    if (def.enemyMissChance) entry.enemyMissChance= v;
    if (def.garrisonIgnore)  entry.garrisonIgnore = v;
    durationBuffs.set(`${key}@${round}`, entry);
    rs.skillFiredNames.push(def.name);
  }
  let dTroopAtkMult = 1;
  let dTroopDefMult = 1;
  for (const [id, e] of durationBuffs) {
    if (e.endsAt < round) { durationBuffs.delete(id); continue; }
    if (e.troopAtkMult)    dTroopAtkMult   = Math.max(dTroopAtkMult,  e.troopAtkMult);
    if (e.troopDefMult)    dTroopDefMult   = Math.max(dTroopDefMult,  e.troopDefMult);
    if (e.healPct)         rs.healPct     += e.healPct;
    if (e.dmgReduce)       rs.dmgReduce    = Math.min(0.85, rs.dmgReduce      + e.dmgReduce);
    if (e.troopDmgReduce)  rs.troopDmgReduce = Math.min(0.85, rs.troopDmgReduce + e.troopDmgReduce);
    if (e.enemyAtkReduce)  rs.enemyAtkReduce = Math.min(0.80, rs.enemyAtkReduce + e.enemyAtkReduce);
    if (e.enemyDmgReduce)  rs.enemyDmgReduce = Math.min(0.80, rs.enemyDmgReduce + e.enemyDmgReduce);
    if (e.enemyMissChance) rs.enemyMissChance= Math.min(0.80, rs.enemyMissChance+ e.enemyMissChance);
    if (e.garrisonIgnore)  rs.garrisonIgnore+= e.garrisonIgnore;
  }
  if (dTroopAtkMult > 1) rs.troopAtkMult *= dTroopAtkMult;
  if (dTroopDefMult > 1) rs.troopDefMult *= dTroopDefMult;
}

// ── Main battle simulation ────────────────────────────────────────────────────
export function simBattle(cmd, attackerTroops, defTile, wallLvl) {
  const terrDef = TERR[defTile.terrain]?.def || 0;
  const fort    = defTile.isHQ ? (wallLvl || 0) * 10 : 0;
  const dc      = defTile.defCmd;

  const atkBR       = resolveBranch(cmd.troopBranch);
  const atkBranchDef= atkBR?.branchDef  ?? null;
  const atkTierData = atkBR?.tierData   ?? null;
  const defBR       = resolveBranch(dc?.troopBranch ?? null);
  const defBranchDef= defBR?.branchDef  ?? null;
  const defTierData = defBR?.tierData   ?? null;

  const atkSize  = atkBranchDef?.size ?? null;
  const defSize  = defBranchDef?.size ?? null;
  const mod      = troopSizeModifier(atkSize, defSize);
  const defMod   = troopSizeModifier(defSize, atkSize);
  const modLabel = mod === 1.1 ? "⚔ STRONG" : mod === 0.9 ? "🛡 WEAK" : "◆ NEUTRAL";

  const atkTroopSkills = getTierSkillsForBattle(cmd.troopBranch);
  const defTroopSkills = getTierSkillsForBattle(dc?.troopBranch ?? null);
  const atkSkillLevels = cmd.troopSkillLevels || {};
  const defSkillLevels = dc?.troopSkillLevels || {};

  const gb           = cmd.gearBonuses || {};
  const armyAtkMult  = 1 + (gb.armyAtk || 0) / 100;
  const armyFocMult  = 1 + (gb.armyFoc || 0) / 100;
  const passives     = getPassiveBonuses(cmd);
  const atkSkills    = getActiveSkills(cmd);
  const durationBuffs= new Map();

  const atkLvl    = cmd.lvl || 5;
  const defLvl    = dc ? dc.lvl  : 2;
  const defTroops = dc ? dc.troops : (defTile.garrison || defTile.garrisonTroops || 30);
  const defCmdSpd = dc ? (dc.spd || 40) : 40;
  const defTerrBonusBase = 1 + (terrDef + fort) / 100;

  const atkTroopHpPer = atkTierData?.hp  ?? 25;
  const defTroopHpPer = defTierData?.hp  ?? 25;
  const atkTroopSpd   = atkTierData?.spd ?? 50;
  const defTroopSpd   = defTierData?.spd ?? 50;
  const atkTroopDef   = atkTierData?.def ?? 20;
  const defTroopDef   = defTierData?.def ?? 20;

  const CMD_ATK_SCALE = Math.max(8, (defTroops * defTroopHpPer) / 1100);
  const atkCmdAtk     = Math.max(cmd.atk || 150, cmd.foc || 0) * CMD_ATK_SCALE * passives.cmdAtkMult;
  const atkCmdSpd     = cmd.spd || 60;
  const defCmdAtk     = (dc ? dc.atk : 80) * CMD_ATK_SCALE;

  const bastionActive = (cmd.cls === "defender") && ((cmd.lvl ?? 5) >= 25);
  const bastionHpMult = bastionActive ? 2 : 1;

  let atkTroopHp     = attackerTroops * atkTroopHpPer * bastionHpMult;
  let defTroopHp     = defTroops      * defTroopHpPer;
  const atkHpMax     = atkTroopHp;
  let totalAtkLostHp = 0;
  let blockHealRounds= 0;

  const atkLvlMult = Math.pow(1.20, atkLvl - 5);
  const defLvlMult = Math.pow(1.20, Math.max(0, defLvl - 2));

  // Core troop damage using dmgLo/dmgHi range
  // Magical damage bypasses physical DEF entirely
  const calcTroopDmg = (branchDef, tierData, troopDef, defDownMult, count, lvlMult, terrMult, atkMultMod, defMultMod, isAtk, extraMult, roundNum, troopBranch) => {
    if (!tierData) return 0;
    const dmgType = branchDef?.dmgType ?? "physical";
    const roll    = tierData.dmgLo + Math.random() * (tierData.dmgHi - tierData.dmgLo);
    let resist;
    if (dmgType === "magical") {
      resist = 1.0; // bypasses physical def
    } else {
      const effectiveDef = troopDef * defMultMod * defDownMult;
      resist = Math.max(0, 1 - effectiveDef / (effectiveDef + 80));
    }
    const earlyPen = dragonEarlyPenalty(troopBranch, roundNum);
    const armyMult = isAtk ? (dmgType === "magical" ? armyFocMult : armyAtkMult) : 1;
    const raw = Math.max(1, Math.ceil(count)) * roll * lvlMult * terrMult * armyMult * (atkMultMod || 1) * earlyPen * (extraMult || 1);
    return Math.max(1, Math.round(raw * resist));
  };

  const atkCmdStats = {
    atk: cmd.atk || 150, foc: cmd.foc || 0, spd: cmd.spd || 60,
    gearArmyAtk: gb.armyAtk || 0, gearArmyFoc: gb.armyFoc || 0,
    gearArmySpd: gb.armySpd || 0, gearArmySiege: gb.armySiege || 0,
  };
  const defCmdStats = dc ? { atk: dc.atk||0, foc: dc.foc||0, spd: dc.spd||0, gearArmyAtk:0, gearArmyFoc:0, gearArmySpd:0, gearArmySiege:0 } : null;

  const report = {
    atkName: cmd.n, atkIcon: cmd.icon||"⚔", atkLvl,
    atkTroopBranch: cmd.troopBranch || null,
    atkTroopsStart: attackerTroops, defTroopsStart: defTroops, defLvl,
    defCmdName: dc?.n ?? `Garrison Lv${defLvl}`, defCmdIcon: dc?.icon ?? "🛡",
    defCmdStats, defCmdCls: dc?.cls ?? null,
    terrain: defTile.terrain, modLabel,
    defPowerLevel: defTile.powerLevel || 1,
    defTroopBranch: dc?.troopBranch || null,
    rounds: [], atkTroopsEnd: attackerTroops, defTroopsEnd: defTroops,
    won: false, xpGain: 0, bastionActive, atkTroopsWounded: 0,
    atkCmdStats, cmdCls: cmd.cls||null, cmdFaction: cmd.faction||null, cmdSubspecies: cmd.subspecies||null,
  };

  // ── Phase 0 pre-battle log ────────────────────────────────────────────────
  const phase0 = { round:0, isPreBattle:true, actions:[] };
  const terrLabel = `${defTile.terrain}${defTile.isHQ ? " (HQ)" : ""}`;
  phase0.actions.push({ actor:"SYSTEM", action:`⚔ Battle begins — ${terrLabel} · ${modLabel}`, dmg:0, isPhase0:true });
  phase0.actions.push({ actor:"SYSTEM", action:`${cmd.n} (${attackerTroops.toLocaleString()} troops) vs ${report.defCmdName} (${defTroops.toLocaleString()} troops)`, dmg:0, isPhase0:true });

  atkTroopSkills.filter(s => s.trigger === "passive").forEach(s => {
    phase0.actions.push({ actor:"Troops", action:`${s.icon} ${s.name} (passive): ${s.desc}`, dmg:0, isSkill:true, isPhase0:true });
  });

  for (const { def, level } of getActiveSkills(cmd)) {
    if (def.type !== "passive") continue;
    const lv = level - 1;
    const v  = def.base + (def.perLevel ?? 0) * lv;
    let effectText = "";
    if (def.passiveCmdAtk)           effectText = `+${Math.round(v*100)}% Commander ATK`;
    else if (def.passiveCritChance)   effectText = `+${Math.round(v*100)}% Critical Hit Chance`;
    else if (def.passiveDmgReduce)    effectText = `-${Math.round(v*100)}% Incoming Damage`;
    else if (def.passiveEnemyAtk)     effectText = `-${Math.round(v*100)}% Enemy ATK`;
    else if (def.passiveTroopAtk)     effectText = `+${Math.round(v*100)}% Troop ATK`;
    else if (def.passiveTroopDef)     effectText = `+${Math.round(v*100)}% Troop DEF`;
    else if (def.passiveHealPerRound) effectText = `+${Math.round(v*100)}% Troops Restored per Round`;
    else if (def.passiveGarrisonIgnore) effectText = `Ignore ${Math.round(v*100)}% Garrison Bonus`;
    if (effectText)
      phase0.actions.push({ actor:cmd.n, action:`${cmd.n} — ${def.icon ?? "✦"} ${def.name}: ${effectText}`, dmg:0, isSkill:true, isPhase0:true });
  }

  if (bastionActive) phase0.actions.push({ actor:cmd.n, action:`Passive: 🛡 Bastion — double HP & DEF (rounds 1-2)`, dmg:0, isSkill:true, isPhase0:true });
  const gb2 = cmd.gearBonuses || {};
  if (gb2.armyAtk  > 0) phase0.actions.push({ actor:"Gear", action:`Gear: +${gb2.armyAtk}% Army ATK`,      dmg:0, isPhase0:true, isGear:true });
  if (gb2.armyFoc  > 0) phase0.actions.push({ actor:"Gear", action:`Gear: +${gb2.armyFoc}% Army Focus DMG`, dmg:0, isPhase0:true, isGear:true });
  if (gb2.armySpd  > 0) phase0.actions.push({ actor:"Gear", action:`Gear: +${gb2.armySpd} Army SPD`,        dmg:0, isPhase0:true, isGear:true });
  if (gb2.armySiege> 0) phase0.actions.push({ actor:"Gear", action:`Gear: +${gb2.armySiege} Siege Power`,   dmg:0, isPhase0:true, isGear:true });
  report.rounds.push(phase0);

  // ── Round loop ────────────────────────────────────────────────────────────
  for (let round = 1; round <= 10; round++) {
    const roundLog = { round, actions:[] };
    if (atkTroopHp <= 0 && defTroopHp <= 0) break;
    if (atkTroopHp <= 0) { roundLog.actions.push({ actor:"SYSTEM", action:"Attackers routed!",   dmg:0 }); report.rounds.push(roundLog); break; }
    if (defTroopHp <= 0) { roundLog.actions.push({ actor:"SYSTEM", action:"Defenders defeated!", dmg:0 }); report.rounds.push(roundLog); break; }

    if (bastionActive && round === 1) roundLog.actions.push({ actor:cmd.n, action:"🛡 BASTION — double HP & DEF (rounds 1-2)", dmg:0, isSkill:true });
    const bastionDefMult = (bastionActive && round <= 2) ? 2 : 1;

    const rs = {
      cmdMult:1, cmdHits:1, critChance:passives.critChance,
      cmdPctDmg:0, lifesteal:0, healPct:passives.healPerRound,
      blockHeal:0, enemyNullified:false,
      troopAtkMult:passives.troopAtkMult, troopDefMult:passives.troopDefMult,
      dmgReduce:passives.dmgReduce, troopDmgReduce:0,
      enemyAtkReduce:passives.enemyAtkReduce, enemyDmgReduce:0, enemyMissChance:0,
      garrisonIgnore:passives.garrisonIgnore, skillFiredNames:[],
      troopDoubleAtk:false, troopBonusDmgMult:0, troopCounterAtk:false,
      enemyStunned:0, enemyConfused:0, enemyDefDown:0, enemyTargetsTaunted:false,
    };

    applyDurationEffects(atkSkills, round, durationBuffs, rs);
    applyInstantEffects(atkSkills, round, rs);
    procTroopSkills(atkTroopSkills, "round_start", atkSkillLevels, rs, roundLog, "Troops");

    const uniqNames = [...new Set(rs.skillFiredNames)];
    uniqNames.forEach(name => {
      const fs  = atkSkills.find(s => s.def?.name === name);
      const def = fs?.def;
      const lv  = (fs?.level ?? 1) - 1;
      const v   = def ? (def.base + (def.perLevel ?? 0) * lv) : 0;
      const dur = def?.duration ?? 1;
      const skillEffect = {};
      if (def) {
        if      (def.troopAtkMult)    { skillEffect.type="buff";   skillEffect.stat="Troop ATK";          skillEffect.value=`×${v.toFixed(2)}`; skillEffect.pct=Math.round((v-1)*100); skillEffect.dur=dur; }
        else if (def.troopDefMult)    { skillEffect.type="buff";   skillEffect.stat="Troop DEF";          skillEffect.value=`×${v.toFixed(2)}`; skillEffect.pct=Math.round((v-1)*100); skillEffect.dur=dur; }
        else if (def.dmgReduce)       { skillEffect.type="buff";   skillEffect.stat="Incoming Damage";    skillEffect.value=`-${Math.round(v*100)}%`; skillEffect.dur=dur; }
        else if (def.troopDmgReduce)  { skillEffect.type="buff";   skillEffect.stat="Troop Damage Taken"; skillEffect.value=`-${Math.round(v*100)}%`; skillEffect.dur=dur; }
        else if (def.enemyAtkReduce)  { skillEffect.type="debuff"; skillEffect.stat="Enemy ATK";          skillEffect.value=`-${Math.round(v*100)}%`; skillEffect.dur=dur; }
        else if (def.enemyDmgReduce)  { skillEffect.type="debuff"; skillEffect.stat="Enemy Damage";       skillEffect.value=`-${Math.round(v*100)}%`; skillEffect.dur=dur; }
        else if (def.enemyMissChance) { skillEffect.type="debuff"; skillEffect.stat="Enemy Hit Chance";   skillEffect.value=`-${Math.round(v*100)}%`; skillEffect.dur=dur; }
        else if (def.blockHeal)       { skillEffect.type="debuff"; skillEffect.stat="enemy healing";      skillEffect.value="blocked"; skillEffect.rounds=Math.round(v); skillEffect.dur=1; }
        else if (def.nullifySkill)    { skillEffect.type="nullify"; skillEffect.dur=1; }
        else if (def.garrisonIgnore)  { skillEffect.type="buff";   skillEffect.stat="Garrison Bonus";     skillEffect.value=`ignored ${Math.round(v*100)}%`; skillEffect.dur=dur; }
        else if (def.healPct)         { skillEffect.type="heal";   skillEffect.pct=Math.round(v*100); skillEffect.dur=dur; }
        else if (def.cmdMult || def.cmdHits || def.critBonus) {
          skillEffect.type="damageBuff";
          if (def.cmdMult)   skillEffect.cmdMult  = v.toFixed(2);
          if (def.cmdHits)   skillEffect.cmdHits  = def.cmdHits;
          if (def.critBonus) skillEffect.critBonus = Math.round(v*100);
        }
      }
      roundLog.actions.push({ actor:cmd.n, action:name, skillIcon:def?.icon ?? "✨", dmg:0, isSkill:true, skillEffect });
    });

    if (rs.blockHeal > 0) blockHealRounds = Math.max(blockHealRounds, rs.blockHeal);
    const healBlocked = blockHealRounds > 0;
    if (blockHealRounds > 0) blockHealRounds--;

    const gi = Math.min(0.90, rs.garrisonIgnore);
    const roundTerrBonus = 1 + (terrDef*(1-gi) + fort*(1-gi)) / 100;

    // Heal
    if (rs.healPct > 0 && totalAtkLostHp > 0 && !healBlocked) {
      const restored = Math.min(totalAtkLostHp, Math.round(totalAtkLostHp * rs.healPct));
      atkTroopHp     = Math.min(atkHpMax, atkTroopHp + restored);
      totalAtkLostHp = Math.max(0, totalAtkLostHp - restored);
      const troopsBack = Math.round(restored / atkTroopHpPer);
      if (troopsBack > 0) roundLog.actions.push({ actor:cmd.n, action:`💚 ${troopsBack} troops restored`, dmg:-troopsBack, isSkill:true, isHeal:true, troopsBack, atkRemaining: Math.round(atkTroopHp/atkTroopHpPer) });
    }

    // % HP nuke
    if (rs.cmdPctDmg > 0 && defTroopHp > 0) {
      const isCrit = Math.random() < rs.critChance;
      const dmg    = Math.max(1, Math.round(defTroops * defTroopHpPer * rs.cmdPctDmg * (isCrit?1.5:1.0)));
      defTroopHp   = Math.max(0, defTroopHp - dmg);
      roundLog.actions.push({ actor:cmd.n, action:`💀 % HP strike${isCrit?" (CRIT!)":""}`, dmg, isPlayer:true, isSkill:true });
    }

    const order = [
      { id:"atkCmd",   spd:atkCmdSpd,   side:"atk" },
      { id:"atkTroop", spd:atkTroopSpd, side:"atk" },
      { id:"defCmd",   spd:defCmdSpd,   side:"def" },
      { id:"defTroop", spd:defTroopSpd, side:"def" },
    ].sort((a,b) => b.spd - a.spd || (a.side==="atk" ? -1 : 1));

    for (const ent of order) {
      if (atkTroopHp <= 0 && defTroopHp <= 0) break;

      // ── Attacker commander ──────────────────────────────────────────────
      if (ent.id === "atkCmd") {
        if (defTroopHp <= 0) continue;
        for (let h = 0; h < rs.cmdHits; h++) {
          const isCrit  = Math.random() < rs.critChance;
          const cmdFoc  = cmd.foc || 0;
          const cmdAtk  = cmd.atk || 150;
          const usesFoc = cmdFoc > cmdAtk;
          const effectiveDef = defTroopDef * (1 - (rs.enemyDefDown || 0));
          const red     = usesFoc ? 1.0 : Math.max(0, 1 - effectiveDef/(effectiveDef+80));
          const raw     = atkCmdAtk * rs.cmdMult * (isCrit?1.5:1.0) * (0.85+Math.random()*0.30) * roundTerrBonus * (usesFoc ? armyFocMult : 1);
          const dmg     = Math.max(1, Math.round(raw * red));
          const prevDef = defTroopHp;
          if (rs.lifesteal > 0 && !healBlocked) {
            const gain = Math.round(dmg * rs.lifesteal);
            atkTroopHp  = Math.min(atkHpMax, atkTroopHp + gain);
            totalAtkLostHp = Math.max(0, totalAtkLostHp - gain);
            const t = Math.round(gain / atkTroopHpPer);
            if (t > 0) roundLog.actions.push({ actor:cmd.n, action:`🧛 Lifesteal +${t} troops`, dmg:-t, isSkill:true, isHeal:true });
          }
          defTroopHp = Math.max(0, defTroopHp - dmg);
          roundLog.actions.push({ actor:cmd.n, action:`${cmd.n} strikes${isCrit?" (CRIT!)":""}`, dmg, defKilled:Math.max(0,Math.round((prevDef-defTroopHp)/defTroopHpPer)), defRemaining:Math.max(0,Math.round(defTroopHp/defTroopHpPer)), isPlayer:true });
        }

      // ── Attacker troops ─────────────────────────────────────────────────
      } else if (ent.id === "atkTroop") {
        if (!atkTierData || atkTroopHp <= 0 || defTroopHp <= 0) continue;
        procTroopSkills(atkTroopSkills, "on_hit", atkSkillLevels, rs, roundLog, "Troops");
        const count    = Math.ceil(atkTroopHp / atkTroopHpPer);
        const vulnMult = rangedVulnerability(dc?.troopBranch ?? null, atkBranchDef);
        const defDown  = 1 - (rs.enemyDefDown || 0);
        let dmg = calcTroopDmg(atkBranchDef, atkTierData, defTroopDef, defDown, count, atkLvlMult, 1, rs.troopAtkMult, 1, true, vulnMult * mod, round, cmd.troopBranch);
        if (rs.troopDoubleAtk)        dmg = Math.round(dmg * 1.8);
        if (rs.troopBonusDmgMult > 0) {
          const bonus = Math.round(dmg * rs.troopBonusDmgMult);
          dmg += bonus;
          roundLog.actions.push({ actor:"Troops", action:`💥 Bonus strike +${bonus} dmg`, dmg:bonus, isPlayer:true, isTroopSkill:true });
        }
        const prevDef = defTroopHp;
        defTroopHp = Math.max(0, defTroopHp - dmg);
        roundLog.actions.push({ actor:"Troops", action:`${atkBranchDef?.label || "Troops"} attack`, dmg, defKilled:Math.max(0,Math.round((prevDef-defTroopHp)/defTroopHpPer)), defRemaining:Math.max(0,Math.round(defTroopHp/defTroopHpPer)), isPlayer:true });
        // Counter attack
        if (rs.troopCounterAtk && defTroopHp > 0) {
          const cCount   = Math.ceil(defTroopHp / defTroopHpPer);
          const cDmg     = calcTroopDmg(defBranchDef, defTierData, atkTroopDef, 1, cCount, defLvlMult, roundTerrBonus, 1, bastionDefMult * rs.troopDefMult, false, defMod, round, dc?.troopBranch);
          const cFinal   = Math.max(1, Math.round(cDmg * 0.50 * (1 - rs.enemyDmgReduce) * (1 - rs.dmgReduce)));
          const prevAtk  = atkTroopHp;
          atkTroopHp     = Math.max(0, atkTroopHp - cFinal);
          totalAtkLostHp += (prevAtk - atkTroopHp);
          roundLog.actions.push({ actor:"Defenders", action:`⚡ Counter attack!`, dmg:cFinal, isPlayer:false, isTroopSkill:true });
        }

      // ── Defender commander ──────────────────────────────────────────────
      } else if (ent.id === "defCmd") {
        if (rs.enemyNullified || atkTroopHp <= 0) continue;
        if (rs.enemyStunned  > 0) { rs.enemyStunned--;  roundLog.actions.push({ actor:"Enemy Cmd", action:"⚡ Enemy commander is stunned!", dmg:0 }); continue; }
        if (rs.enemyConfused > 0 && Math.random() < 0.5) { rs.enemyConfused--; roundLog.actions.push({ actor:"Enemy Cmd", action:"😵 Enemy confused!", dmg:0 }); continue; }
        if (Math.random() < rs.enemyMissChance) { roundLog.actions.push({ actor:"Enemy Cmd", action:"Enemy commander missed!", dmg:0 }); continue; }
        const atkRes = atkTroopDef * bastionDefMult * rs.troopDefMult;
        const red    = Math.max(0, 1 - atkRes/(atkRes+80));
        const eMod   = (1 - rs.enemyAtkReduce) * (1 - rs.enemyDmgReduce) * (1 - rs.dmgReduce);
        const raw    = defCmdAtk * roundTerrBonus * (0.85+Math.random()*0.30) * 0.8 * eMod * defMod;
        const dmg    = Math.max(1, Math.round(raw * red));
        const prevAtk= atkTroopHp;
        atkTroopHp   = Math.max(0, atkTroopHp - dmg);
        totalAtkLostHp += (prevAtk - atkTroopHp);
        roundLog.actions.push({ actor:"Enemy Cmd", action:`${report.defCmdIcon} Enemy commander strikes`, dmg, atkKilled:Math.max(0,Math.round((prevAtk-atkTroopHp)/atkTroopHpPer)), atkRemaining:Math.max(0,Math.round(atkTroopHp/atkTroopHpPer)), isPlayer:false });

      // ── Defender troops ─────────────────────────────────────────────────
      } else if (ent.id === "defTroop") {
        if (rs.enemyNullified || !defTierData || defTroopHp <= 0 || atkTroopHp <= 0) continue;
        if (rs.enemyStunned  > 0) continue;
        if (rs.enemyConfused > 0 && Math.random() < 0.5) { rs.enemyConfused--; continue; }
        if (Math.random() < rs.enemyMissChance) { roundLog.actions.push({ actor:"Defenders", action:"Enemy troops missed!", dmg:0 }); continue; }
        procTroopSkills(defTroopSkills, "on_hit", defSkillLevels, rs, roundLog, "Defenders");
        const eMod  = (1 - rs.enemyDmgReduce) * (1 - rs.troopDmgReduce) * (1 - rs.dmgReduce);
        const count = Math.ceil(defTroopHp / defTroopHpPer);
        let dmg = calcTroopDmg(defBranchDef, defTierData, atkTroopDef, 1, count, defLvlMult, roundTerrBonus, 1, bastionDefMult * rs.troopDefMult, false, defMod, round, dc?.troopBranch);
        dmg = Math.max(1, Math.round(dmg * eMod));
        const prevAtk = atkTroopHp;
        atkTroopHp    = Math.max(0, atkTroopHp - dmg);
        totalAtkLostHp += (prevAtk - atkTroopHp);
        roundLog.actions.push({ actor:"Defenders", action:`${defBranchDef?.label || "Defenders"} attack`, dmg, atkKilled:Math.max(0,Math.round((prevAtk-atkTroopHp)/atkTroopHpPer)), atkRemaining:Math.max(0,Math.round(atkTroopHp/atkTroopHpPer)), isPlayer:false });

        // Defender round_end troop skills
        procTroopSkills(defTroopSkills, "round_end", defSkillLevels, rs, roundLog, "Defenders");
      }
    }

    // Attacker round_end troop skills
    procTroopSkills(atkTroopSkills, "round_end", atkSkillLevels, rs, roundLog, "Troops");
    report.rounds.push(roundLog);
  }

  const won      = defTroopHp <= 0 && atkTroopHp > 0;
  const isDraw   = atkTroopHp > 0  && defTroopHp > 0;
  const defTroopsLeft   = Math.max(0, Math.round(defTroopHp / defTroopHpPer));
  const atkLostHpActual = atkHpMax - Math.max(0, atkTroopHp);
  const finalAtkLost    = won
    ? Math.min(attackerTroops-1, Math.max(1, Math.round(atkLostHpActual / (atkTroopHpPer * bastionHpMult))))
    : isDraw
      ? Math.max(0, Math.round(atkLostHpActual / (atkTroopHpPer * bastionHpMult)))
      : Math.min(attackerTroops, Math.round(attackerTroops * (0.35 + Math.random() * 0.20)));

  const fullXp = POWER_DEFS[defTile.powerLevel || 1]?.xpReward || 30;
  const defKilledFraction = Math.max(0, Math.min(1, (defTroops - defTroopsLeft) / Math.max(1, defTroops)));
  const xpGain = won ? fullXp : isDraw ? Math.max(1, Math.round(fullXp * defKilledFraction)) : 0;

  const atkPow     = attackerTroops * Math.pow(1.20, atkLvl-5) * mod;
  const defPow     = defTroops      * Math.pow(1.20, Math.max(0, defLvl-2)) * defTerrBonusBase;
  const powerRatio = atkPow / Math.max(1, defPow);
  const pct        = Math.round(Math.min(99, Math.max(1, 100 / (1 + Math.pow(Math.max(0.00001, 1/powerRatio), 3.5)))));

  report.won           = won;
  report.isDraw        = isDraw;
  report.atkTroopsEnd  = Math.max(0, attackerTroops - finalAtkLost);
  report.defTroopsEnd  = defTroopsLeft;
  report.xpGain        = xpGain;
  report.pct           = pct;
  report.atkTroopsWounded = Math.floor(finalAtkLost * 0.30);

  return { won, isDraw, lost:finalAtkLost, atk:Math.round(atkPow), def:Math.round(defPow), pct, mod, modLabel, xpGain, report };
}
 < 0.5) { continue; }
        if (Math.random() < rs.enemyMissChance) { roundLog.actions.push({ actor:"Defenders", action:"Enemy troops missed!", dmg:0 }); continue; }

        // Fire on_hit troop skills (defender)
        procTroopSkills(defTroopSkills, "on_hit", defSkillLevels, rs, roundLog, "Defenders");

        const eMod     = (1 - rs.enemyDmgReduce) * (1 - rs.troopDmgReduce) * (1 - rs.dmgReduce);
        const count    = Math.ceil(defTroopHp / defTroopHpPer);
        const atkDown  = 1 - (rs.enemyDefDown || 0); // def_down applied to attacker's def when defenders hit
        const vulnMult = rangedVulnerability(cmd.troopBranch ?? null, defBranchDef);
        const res      = calcTroopDmg(defBranchDef, defTierData, atkTroopDef, count, defLvlMult, roundTerrBonus, 1, bastionDefMult * rs.troopDefMult, false, vulnMult * defMod, round, dc?.troopBranch);
        const dmg      = Math.max(1, Math.round(res.dmg * eMod));
        const prevAtk  = atkTroopHp;
        atkTroopHp     = Math.max(0, atkTroopHp - dmg);
        totalAtkLostHp += (prevAtk - atkTroopHp);

        // Fire on_hit_received troop skills (attacker, because they just got hit)
        procTroopSkills(atkTroopSkills, "on_hit_received", atkSkillLevels, rs, roundLog, "Troops");

        const atkKilled    = Math.max(0, Math.round((prevAtk - atkTroopHp) / atkTroopHpPer));
        const atkRemaining = Math.max(0, Math.round(atkTroopHp / atkTroopHpPer));
        roundLog.actions.push({
          actor:"Defenders",
          action:`${defBranchDef?.label || "Defenders"} attack`,
          dmg, atkKilled, atkRemaining, isPlayer:false,
        });
      }
    }

    // Fire round_end troop skills (attacker)
    procTroopSkills(atkTroopSkills, "round_end", atkSkillLevels, rs, roundLog, "Troops");

    report.rounds.push(roundLog);
  }

  const won    = defTroopHp <= 0 && atkTroopHp > 0;
  const isDraw = atkTroopHp > 0 && defTroopHp > 0;

  const defTroopsLeft   = Math.max(0, Math.round(defTroopHp / defTroopHpPer));
  const atkLostHpActual = atkHpMax - Math.max(0, atkTroopHp);

  const finalAtkLost = won
    ? Math.min(attackerTroops - 1, Math.max(1, Math.round(atkLostHpActual / (atkTroopHpPer * bastionHpMult))))
    : isDraw
      ? Math.max(0, Math.round(atkLostHpActual / (atkTroopHpPer * bastionHpMult)))
      : Math.min(attackerTroops, Math.round(attackerTroops * (0.35 + Math.random() * 0.20)));

  const fullXp = POWER_DEFS[defTile.powerLevel || 1]?.xpReward || 30;
  const defKilledFraction = Math.max(0, Math.min(1, (defTroops - defTroopsLeft) / Math.max(1, defTroops)));
  const xpGain = won ? fullXp : isDraw ? Math.max(1, Math.round(fullXp * defKilledFraction)) : 0;

  const atkPow     = attackerTroops * Math.pow(1.20, atkLvl - 5) * mod;
  const defPow     = defTroops      * Math.pow(1.20, Math.max(0, defLvl - 2)) * defTerrBonusBase;
  const powerRatio = atkPow / Math.max(1, defPow);
  const pct        = Math.round(Math.min(99, Math.max(1, 100 / (1 + Math.pow(Math.max(0.00001, 1/powerRatio), 3.5)))));

  report.won          = won;
  report.isDraw       = isDraw;
  report.atkTroopsEnd = Math.max(0, attackerTroops - finalAtkLost);
  report.defTroopsEnd = defTroopsLeft;
  report.xpGain       = xpGain;
  report.pct          = pct;
  report.atkTroopsWounded = Math.floor(finalAtkLost * 0.30);

  return { won, isDraw, lost:finalAtkLost, atk:Math.round(atkPow), def:Math.round(defPow), pct, mod, modLabel, xpGain, report };
}
