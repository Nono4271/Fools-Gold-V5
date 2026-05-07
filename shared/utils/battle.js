import { TROOP } from "../constants/troops.js";
import { TERR  } from "../constants/terrain.js";
import { POWER_DEFS } from "../constants/map.js";
import { skillFiresOnRound, getActiveSkills, getPassiveBonuses, skillValue } from "../constants/skills.js";
import { npcForPowerLevel } from "../constants/heroes.js";
import { troopModifier } from "../constants/troops.js";

export function garrisonDefCmd(tile) {
  const plvl = tile.powerLevel || 1;
  const pd   = POWER_DEFS[plvl] || POWER_DEFS[1];
  const npc  = npcForPowerLevel(plvl);
  return {
    lvl:       pd.cmdLvl,
    troops:    tile.garrisonTroops || pd.troops,
    troopType: tile.troopType || npc.troopType,
    atk:       npc.atk * pd.cmdLvl,   // scales with level like player cmds
    spd:       npc.spd + pd.cmdLvl * 2,
    n:         npc.n,
    icon:      npc.icon,
    cls:       npc.cls,
    faction:   null,
    rarity:    "soldier",
  };
}

export function resolvedDefTile(tile) {
  if (tile.owner === "ai" && !tile.hasAiCommander) {
    return { ...tile, defCmd: garrisonDefCmd(tile) };
  }
  return tile;
}

// ── Apply instant (duration:1) active skill effects to round state ────────────
function applyInstantEffects(skills, round, rs) {
  for (const { def, level } of skills) {
    if (!skillFiresOnRound(def, round)) continue;
    if (def.duration && def.duration > 1) continue; // handled by duration tracker
    const lv = level - 1;
    const v  = def.base + (def.perLevel ?? 0) * lv;
    rs.skillFiredNames.push(def.name);
    if (def.nullifySkill)   rs.enemyNullified = true;
    if (def.blockHeal)      rs.blockHeal      = Math.max(rs.blockHeal, Math.round(def.blockHeal + lv * (def.perLevel ?? 0)));
    if (def.cmdMult)        rs.cmdMult        *= v;
    if (def.cmdHits)        rs.cmdHits         = Math.max(rs.cmdHits, def.cmdHits);
    if (def.critBonus)      rs.critChance     += v;
    if (def.cmdPctDmg)      rs.cmdPctDmg      += v;
    if (def.lifesteal)      rs.lifesteal      += v;
    if (def.healPct)        rs.healPct        += v;
    if (def.troopAtkMult)   rs.troopAtkMult   *= v;
    if (def.troopDefMult)   rs.troopDefMult   *= v;
    if (def.dmgReduce)      rs.dmgReduce       = Math.min(0.85, rs.dmgReduce      + v);
    if (def.troopDmgReduce) rs.troopDmgReduce  = Math.min(0.85, rs.troopDmgReduce + v);
    if (def.enemyAtkReduce) rs.enemyAtkReduce  = Math.min(0.80, rs.enemyAtkReduce + v);
    if (def.enemyDmgReduce) rs.enemyDmgReduce  = Math.min(0.80, rs.enemyDmgReduce + v);
    if (def.enemyMissChance)rs.enemyMissChance = Math.min(0.80, rs.enemyMissChance+ v);
    if (def.garrisonIgnore) rs.garrisonIgnore += v;
  }
}

// ── Duration buff tracker: register + accumulate multi-round effects ──────────
function applyDurationEffects(skills, round, durationBuffs, rs) {
  // Register new entries
  for (const { key, def, level } of skills) {
    if (!skillFiresOnRound(def, round)) continue;
    if (!def.duration || def.duration <= 1) continue;
    const lv    = level - 1;
    const entry = { endsAt: round + def.duration - 1 };
    const v     = def.base + (def.perLevel ?? 0) * lv;
    if (def.troopAtkMult)   entry.troopAtkMult   = v;
    if (def.troopDefMult)   entry.troopDefMult   = v;
    if (def.healPct)        entry.healPct        = v;  // Bug fix: second_wind healPct was silently dropped
    if (def.dmgReduce)      entry.dmgReduce      = v;
    if (def.troopDmgReduce) entry.troopDmgReduce = v;
    if (def.enemyAtkReduce) entry.enemyAtkReduce = v;
    if (def.enemyDmgReduce) entry.enemyDmgReduce = v;
    if (def.enemyMissChance)entry.enemyMissChance= v;
    if (def.garrisonIgnore) entry.garrisonIgnore = v;
    durationBuffs.set(`${key}@${round}`, entry);
    rs.skillFiredNames.push(def.name);
  }

  // Accumulate still-active entries
  // Bug 29 fix: collect the highest troopAtkMult/troopDefMult from all active duration buffs
  // and apply once — prevents the same buff from compounding every round it's active.
  let durationTroopAtkMult = 1;
  let durationTroopDefMult = 1;
  for (const [id, e] of durationBuffs) {
    if (e.endsAt < round) { durationBuffs.delete(id); continue; }
    if (e.troopAtkMult)   durationTroopAtkMult  = Math.max(durationTroopAtkMult,  e.troopAtkMult);
    if (e.troopDefMult)   durationTroopDefMult  = Math.max(durationTroopDefMult,  e.troopDefMult);
    if (e.healPct)        rs.healPct           += e.healPct;
    if (e.dmgReduce)      rs.dmgReduce       = Math.min(0.85, rs.dmgReduce      + e.dmgReduce);
    if (e.troopDmgReduce) rs.troopDmgReduce  = Math.min(0.85, rs.troopDmgReduce + e.troopDmgReduce);
    if (e.enemyAtkReduce) rs.enemyAtkReduce  = Math.min(0.80, rs.enemyAtkReduce + e.enemyAtkReduce);
    if (e.enemyDmgReduce) rs.enemyDmgReduce  = Math.min(0.80, rs.enemyDmgReduce + e.enemyDmgReduce);
    if (e.enemyMissChance)rs.enemyMissChance = Math.min(0.80, rs.enemyMissChance+ e.enemyMissChance);
    if (e.garrisonIgnore) rs.garrisonIgnore += e.garrisonIgnore;
  }
  if (durationTroopAtkMult > 1) rs.troopAtkMult *= durationTroopAtkMult;
  if (durationTroopDefMult > 1) rs.troopDefMult *= durationTroopDefMult;
}

// ── Main simulation ───────────────────────────────────────────────────────────
export function simBattle(cmd, attackerTroops, defTile, wallLvl) {
  const terrDef = TERR[defTile.terrain]?.def || 0;
  const fort    = defTile.isHQ ? (wallLvl || 0) * 10 : 0;
  const dc      = defTile.defCmd;
  const mod     = troopModifier(cmd.troopType, dc?.troopType || defTile.troopType || null);
  // Bug 21 fix: defender gets the reverse matchup modifier on their outgoing damage
  const defMod  = troopModifier(dc?.troopType || defTile.troopType || null, cmd.troopType);
  const modLabel = mod === 1.1 ? "⚔ STRONG" : mod === 0.9 ? "🛡 WEAK" : "◆ NEUTRAL";

  const gb          = cmd.gearBonuses || {};
  const armyAtkMult = 1 + (gb.armyAtk || 0) / 100;
  const armyFocMult = 1 + (gb.armyFoc || 0) / 100;

  const passives    = getPassiveBonuses(cmd);
  const atkSkills   = getActiveSkills(cmd);
  const durationBuffs = new Map();

  const atkLvl    = cmd.lvl || 5;

  const defLvl    = dc ? dc.lvl  : 2;
  const defTroops = dc ? dc.troops : (defTile.garrison || defTile.garrisonTroops || 30);
  const defCmdSpd = dc ? (dc.spd || 40) : 40;

  const defTerrBonusBase = 1 + (terrDef + fort) / 100;

  const atkTT = cmd.troopType ? TROOP[cmd.troopType] : null;
  const defTT = (dc?.troopType || defTile.troopType) ? TROOP[dc?.troopType || defTile.troopType] : null;

  const atkTroopHpPer = atkTT ? atkTT.hp  : 10;
  const defTroopHpPer = defTT ? defTT.hp  : 10;
  const atkTroopSpd   = atkTT ? atkTT.spd : 50;
  const defTroopSpd   = defTT ? defTT.spd : 50;

  // Dynamic CMD_ATK_SCALE: calibrated so equal PL3 fights last ~8-9 rounds naturally.
  // Lower power fights tend toward draws (cap at round 10); higher mismatches end early.
  // Formula: defTroops * defTroopHpPer / 1100
  const CMD_ATK_SCALE = Math.max(8, (defTroops * defTroopHpPer) / 1100);
  // Bug 25 fix: use max(atk, foc) so focus-heavy commanders deal appropriate base damage
  const atkCmdAtk     = Math.max(cmd.atk || 150, cmd.foc || 0) * CMD_ATK_SCALE * passives.cmdAtkMult;
  const atkCmdSpd     = cmd.spd || 60;
  const defCmdAtk     = (dc ? dc.atk : 80) * CMD_ATK_SCALE;

  const bastionActive = (cmd.cls === "defender") && ((cmd.lvl ?? 5) >= 25);
  const bastionHpMult = bastionActive ? 2 : 1;

  let atkTroopHp      = attackerTroops * atkTroopHpPer * bastionHpMult;
  let defTroopHp      = defTroops      * defTroopHpPer;
  const atkHpMax      = atkTroopHp;
  let totalAtkLostHp  = 0;
  let blockHealRounds = 0;

  const atkLvlMult = Math.pow(1.20, atkLvl - 5);
  const defLvlMult = Math.pow(1.20, Math.max(0, defLvl - 2));

  const calcPhysDef = (tt) => tt ? tt.def   : 30;
  const calcMagRes  = (tt) => tt ? tt.focus : 20;

  const troopDmg = (aTT, dTT, atkCount, defHP, lvlMult, terrMult, isAtk, resistMult, atkMult, dmgMod) => {
    if (!aTT) return { dmg:0, newHp:defHP };
    let raw, resist;
    if (aTT.dmgType === "magical") {
      raw    = Math.max(1, Math.ceil(atkCount)) * aTT.focus * lvlMult * terrMult * (0.85+Math.random()*0.30) * (isAtk?armyFocMult:1) * (atkMult||1) / 15;
      resist = calcMagRes(dTT) * (resistMult||1);
    } else {
      raw    = Math.max(1, Math.ceil(atkCount)) * aTT.atk   * lvlMult * terrMult * (0.85+Math.random()*0.30) * (isAtk?armyAtkMult:1) * (atkMult||1) / 15;
      resist = calcPhysDef(dTT) * (resistMult||1);
    }
    const red = Math.max(0, 1 - resist/(resist+80));
    const dmg = Math.max(1, Math.round(raw * red * (dmgMod ?? mod)));
    return { dmg, newHp: Math.max(0, defHP - dmg) };
  };

  // Snapshot effective commander stats (base + gear) at battle start
  const atkCmdStats = {
    atk: cmd.atk || 150,
    foc: cmd.foc || 0,
    spd: cmd.spd || 60,
    gearArmyAtk: gb.armyAtk || 0,
    gearArmyFoc: gb.armyFoc || 0,
    gearArmySpd: gb.armySpd || 0,
    gearArmySiege: gb.armySiege || 0,
  };

  const defCmdStats = dc ? {
    atk: dc.atk || 0,
    foc: dc.foc || 0,
    spd: dc.spd || 0,
    gearArmyAtk: 0, gearArmyFoc: 0, gearArmySpd: 0, gearArmySiege: 0,
  } : null;

  const report = {
    atkName:cmd.n, atkIcon:cmd.icon||"⚔", atkLvl, atkTroopType:cmd.troopType,
    atkTroopsStart:attackerTroops, defTroopsStart:defTroops, defLvl,
    defCmdName: dc?.n ?? `Garrison Lv${defLvl}`, defCmdIcon: dc?.icon ?? "🛡",
    defCmdStats,
    defCmdCls: dc?.cls ?? null,
    terrain:defTile.terrain, modLabel,
    defPowerLevel:defTile.powerLevel || 1,
    defTroopType: dc?.troopType || defTile.troopType || null,
    rounds:[], atkTroopsEnd:attackerTroops, defTroopsEnd:defTroops, won:false, xpGain:0,
    bastionActive,
    atkTroopsWounded: 0,   // 30% of final losses go to healing tent — set at battle end
    atkCmdStats,           // commander + gear stats snapshot at battle start
    cmdCls: cmd.cls || null,
    cmdFaction: cmd.faction || null,
    cmdSubspecies: cmd.subspecies || null,
  };

  // ── Phase 0: pre-battle — log all passive bonuses before any combat ─────────
  const phase0 = { round:0, isPreBattle:true, actions:[] };

  // Terrain context
  const terrLabel = `${defTile.terrain}${defTile.isHQ ? " (HQ)" : ""}`;
  phase0.actions.push({ actor:"SYSTEM", action:`⚔ Battle begins — ${terrLabel} · ${modLabel}`, dmg:0, isPhase0:true });
  phase0.actions.push({ actor:"SYSTEM", action:`${cmd.n} (${attackerTroops.toLocaleString()} troops) vs ${report.defCmdName} (${defTroops.toLocaleString()} troops)`, dmg:0, isPhase0:true });

  // Passive skill bonuses — log each skill by name
  for (const { def, level } of getActiveSkills(cmd)) {
    if (def.type !== "passive") continue;
    const lv = level - 1;
    const v  = def.base + (def.perLevel ?? 0) * lv;
    let effectText = "";
    if (def.passiveCmdAtk)         effectText = `+${Math.round(v*100)}% Commander ATK`;
    else if (def.passiveCritChance) effectText = `+${Math.round(v*100)}% Critical Hit Chance`;
    else if (def.passiveDmgReduce)  effectText = `-${Math.round(v*100)}% Incoming Damage`;
    else if (def.passiveEnemyAtk)   effectText = `-${Math.round(v*100)}% Enemy ATK`;
    else if (def.passiveTroopAtk)   effectText = `+${Math.round((v)*100)}% Troop ATK`;
    else if (def.passiveTroopDef)   effectText = `+${Math.round((v)*100)}% Troop DEF`;
    else if (def.passiveHealPerRound) effectText = `+${Math.round(v*100)}% Troops Restored per Round`;
    else if (def.passiveGarrisonIgnore) effectText = `Ignore ${Math.round(v*100)}% Garrison Bonus`;
    if (effectText)
      phase0.actions.push({ actor:cmd.n, action:`${cmd.n} — ${def.icon ?? "✦"} ${def.name}: ${effectText}`, dmg:0, isSkill:true, isPhase0:true });
  }

  // Bastion passive (defender class)
  if (bastionActive)
    phase0.actions.push({ actor:cmd.n, action:`Passive: 🛡 Bastion — double HP & DEF (rounds 1-2)`, dmg:0, isSkill:true, isPhase0:true });

  // Gear bonuses
  const gb2 = cmd.gearBonuses || {};
  if (gb2.armyAtk > 0)   phase0.actions.push({ actor:"Gear", action:`Gear: +${gb2.armyAtk}% Army ATK`, dmg:0, isPhase0:true, isGear:true });
  if (gb2.armyFoc > 0)   phase0.actions.push({ actor:"Gear", action:`Gear: +${gb2.armyFoc}% Army Focus DMG`, dmg:0, isPhase0:true, isGear:true });
  if (gb2.armySpd > 0)   phase0.actions.push({ actor:"Gear", action:`Gear: +${gb2.armySpd} Army SPD`, dmg:0, isPhase0:true, isGear:true });
  if (gb2.armySiege > 0) phase0.actions.push({ actor:"Gear", action:`Gear: +${gb2.armySiege} Siege Power`, dmg:0, isPhase0:true, isGear:true });

  report.rounds.push(phase0);

  for (let round = 1; round <= 10; round++) {
    const roundLog = { round, actions:[] };
    if (atkTroopHp <= 0 && defTroopHp <= 0) break;
    if (atkTroopHp <= 0) { roundLog.actions.push({ actor:"SYSTEM", action:"Attackers routed!", dmg:0 }); report.rounds.push(roundLog); break; }
    if (defTroopHp <= 0) { roundLog.actions.push({ actor:"SYSTEM", action:"Defenders defeated!", dmg:0 }); report.rounds.push(roundLog); break; }

    if (bastionActive && round === 1)
      roundLog.actions.push({ actor:cmd.n, action:"🛡 BASTION — double HP & DEF (rounds 1-2)", dmg:0, isSkill:true });

    const bastionDefMult = (bastionActive && round <= 2) ? 2 : 1;

    // Build round state
    const rs = {
      cmdMult:1, cmdHits:1, critChance:passives.critChance,
      cmdPctDmg:0, lifesteal:0, healPct:passives.healPerRound,
      blockHeal:0, enemyNullified:false,
      troopAtkMult:passives.troopAtkMult, troopDefMult:passives.troopDefMult,
      dmgReduce:passives.dmgReduce, troopDmgReduce:0,
      enemyAtkReduce:passives.enemyAtkReduce, enemyDmgReduce:0, enemyMissChance:0,
      garrisonIgnore:passives.garrisonIgnore,
      skillFiredNames:[],
    };

    applyDurationEffects(atkSkills, round, durationBuffs, rs);
    applyInstantEffects(atkSkills, round, rs);

    // Deduplicate skill names logged by both duration+instant; attach effect metadata
    const uniqNames = [...new Set(rs.skillFiredNames)];
    uniqNames.forEach(name => {
      // Find the skill def that fired so we can describe its effect
      const firedSkill = atkSkills.find(s => s.def?.name === name);
      const def = firedSkill?.def;
      const lv  = (firedSkill?.level ?? 1) - 1;
      const v   = def ? (def.base + (def.perLevel ?? 0) * lv) : 0;
      const dur = def?.duration ?? 1;

      // Build effect description object for BattleLog to render
      const skillEffect = {};
      if (def) {
        if (def.troopAtkMult)    { skillEffect.type = "buff";    skillEffect.stat = "Troop ATK";          skillEffect.value = `×${v.toFixed(2)}`; skillEffect.pct = Math.round((v-1)*100); skillEffect.dur = dur; }
        else if (def.troopDefMult)    { skillEffect.type = "buff";    skillEffect.stat = "Troop DEF";          skillEffect.value = `×${v.toFixed(2)}`; skillEffect.pct = Math.round((v-1)*100); skillEffect.dur = dur; }
        else if (def.dmgReduce)       { skillEffect.type = "buff";    skillEffect.stat = "Incoming Damage";    skillEffect.value = `-${Math.round(v*100)}%`;                                       skillEffect.dur = dur; }
        else if (def.troopDmgReduce)  { skillEffect.type = "buff";    skillEffect.stat = "Troop Damage Taken"; skillEffect.value = `-${Math.round(v*100)}%`;                                       skillEffect.dur = dur; }
        else if (def.enemyAtkReduce)  { skillEffect.type = "debuff";  skillEffect.stat = "Enemy ATK";          skillEffect.value = `-${Math.round(v*100)}%`;                                       skillEffect.dur = dur; }
        else if (def.enemyDmgReduce)  { skillEffect.type = "debuff";  skillEffect.stat = "Enemy Damage";       skillEffect.value = `-${Math.round(v*100)}%`;                                       skillEffect.dur = dur; }
        else if (def.enemyMissChance) { skillEffect.type = "debuff";  skillEffect.stat = "Enemy Hit Chance";   skillEffect.value = `-${Math.round(v*100)}%`;                                       skillEffect.dur = dur; }
        else if (def.blockHeal)       { skillEffect.type = "debuff";  skillEffect.stat = "enemy healing";      skillEffect.value = `blocked`;           skillEffect.rounds = Math.round(v);       skillEffect.dur = 1;  }
        else if (def.nullifySkill)    { skillEffect.type = "nullify";                                                                                                                               skillEffect.dur = 1;  }
        else if (def.garrisonIgnore)  { skillEffect.type = "buff";    skillEffect.stat = "Garrison Bonus";     skillEffect.value = `ignored ${Math.round(v*100)}%`;                                skillEffect.dur = dur; }
        else if (def.healPct)         { skillEffect.type = "heal";    skillEffect.pct  = Math.round(v*100);                                                                                        skillEffect.dur = dur; }
        else if (def.cmdMult || def.cmdHits || def.critBonus) {
          skillEffect.type = "damageBuff";
          if (def.cmdMult)   skillEffect.cmdMult  = v.toFixed(2);
          if (def.cmdHits)   skillEffect.cmdHits  = def.cmdHits;
          if (def.critBonus) skillEffect.critBonus = Math.round(v*100);
        }
      }

      roundLog.actions.push({ actor:cmd.n, action:name, skillIcon: def?.icon ?? "✨", dmg:0, isSkill:true, skillEffect });
    });

    if (rs.blockHeal > 0) blockHealRounds = Math.max(blockHealRounds, rs.blockHeal);
    const healBlocked = blockHealRounds > 0;
    if (blockHealRounds > 0) blockHealRounds--;

    // Terrain with garrison ignore
    const gi = Math.min(0.90, rs.garrisonIgnore);
    const roundTerrBonus = 1 + (terrDef*(1-gi) + fort*(1-gi)) / 100;

    // Passive/active heal
    if (rs.healPct > 0 && totalAtkLostHp > 0 && !healBlocked) {
      const restored = Math.min(totalAtkLostHp, Math.round(totalAtkLostHp * rs.healPct));
      atkTroopHp     = Math.min(atkHpMax, atkTroopHp + restored);
      totalAtkLostHp = Math.max(0, totalAtkLostHp - restored);
      const troopsBack = Math.round(restored / atkTroopHpPer);
      const atkRemainingAfterHeal = Math.round(Math.min(atkHpMax, atkTroopHp) / atkTroopHpPer);
      if (troopsBack > 0) {
        roundLog.actions.push({ actor:cmd.n, action:`💚 ${troopsBack} troops restored`, dmg:-troopsBack, isSkill:true, isHeal:true, troopsBack, atkRemaining: atkRemainingAfterHeal });
      }
    }

    // % Max HP nuke
    if (rs.cmdPctDmg > 0 && defTroopHp > 0) {
      const isCrit = Math.random() < rs.critChance;
      const dmg    = Math.max(1, Math.round(defTroops * defTroopHpPer * rs.cmdPctDmg * (isCrit?1.5:1.0)));
      defTroopHp   = Math.max(0, defTroopHp - dmg);
      roundLog.actions.push({ actor:cmd.n, action:`💀 % HP strike${isCrit?" (CRIT!)":""}`, dmg, isPlayer:true, isSkill:true });
    }

    // Speed-ordered turn order
    const order = [
      { id:"atkCmd",   spd:atkCmdSpd,   side:"atk" },
      { id:"atkTroop", spd:atkTroopSpd, side:"atk" },
      { id:"defCmd",   spd:defCmdSpd,   side:"def" },
      { id:"defTroop", spd:defTroopSpd, side:"def" },
    ].sort((a,b) => b.spd-a.spd || (a.side==="atk"?-1:1));

    for (const ent of order) {
      if (atkTroopHp <= 0 && defTroopHp <= 0) break;

      if (ent.id === "atkCmd") {
        if (defTroopHp <= 0) continue;
        for (let h = 0; h < rs.cmdHits; h++) {
          const isCrit   = Math.random() < rs.critChance;
          // Bug 25 fix: commanders with foc > atk use focus (magical) damage, bypassing physical defense
          const cmdFoc   = cmd.foc || 0;
          const cmdAtk   = cmd.atk || 150;
          const usesFoc  = cmdFoc > cmdAtk;
          const defRes   = usesFoc ? (defTT ? calcMagRes(defTT) : 20) : (defTT ? calcPhysDef(defTT) : 30);
          const red      = Math.max(0, 1 - defRes/(defRes+80));
          const raw      = atkCmdAtk * rs.cmdMult * (isCrit?1.5:1.0) * (0.85+Math.random()*0.30) * roundTerrBonus * (usesFoc ? armyFocMult : 1);
          const dmg      = Math.max(1, Math.round(raw * red));
          const prevDef  = defTroopHp;

          // Lifesteal
          if (rs.lifesteal > 0 && !healBlocked) {
            const gain = Math.round(dmg * rs.lifesteal);
            atkTroopHp  = Math.min(atkHpMax, atkTroopHp + gain);
            totalAtkLostHp = Math.max(0, totalAtkLostHp - gain);
            const t = Math.round(gain / atkTroopHpPer);
            if (t > 0) { roundLog.actions.push({ actor:cmd.n, action:`🧛 Lifesteal +${t} troops`, dmg:-t, isSkill:true, isHeal:true }); }
          }

          defTroopHp = Math.max(0, defTroopHp - dmg);
          const defKilled   = Math.max(0, Math.round((prevDef - defTroopHp) / defTroopHpPer));
          const defRemaining= Math.max(0, Math.round(defTroopHp / defTroopHpPer));
          roundLog.actions.push({
            actor:cmd.n,
            action:`${cmd.n} strikes${isCrit?" (CRIT!)":""}`,
            dmg, defKilled, defRemaining, isPlayer:true,
          });
        }

      } else if (ent.id === "atkTroop") {
        if (!atkTT || atkTroopHp <= 0 || defTroopHp <= 0) continue;
        const count    = Math.ceil(atkTroopHp / atkTroopHpPer);
        const prevDef  = defTroopHp;
        const res      = troopDmg(aTT2(cmd.troopType), defTT, count, defTroopHp, atkLvlMult, 1, true, 1, rs.troopAtkMult);
        defTroopHp     = res.newHp;
        const defKilled    = Math.max(0, Math.round((prevDef - defTroopHp) / defTroopHpPer));
        const defRemaining = Math.max(0, Math.round(defTroopHp / defTroopHpPer));
        roundLog.actions.push({
          actor:"Troops",
          action:`${atkTT.icon||"⚔"} ${atkTT.label||"Troops"} attack`,
          dmg:res.dmg, defKilled, defRemaining, isPlayer:true,
        });

      } else if (ent.id === "defCmd") {
        if (rs.enemyNullified || atkTroopHp <= 0) continue;
        if (Math.random() < rs.enemyMissChance) {
          roundLog.actions.push({ actor:"Enemy Cmd", action:"Enemy commander missed!", dmg:0 }); continue;
        }
        const atkRes   = (atkTT ? calcPhysDef(atkTT) : 30) * bastionDefMult * rs.troopDefMult;
        const red      = Math.max(0, 1 - atkRes/(atkRes+80));
        const eMod     = (1 - rs.enemyAtkReduce) * (1 - rs.enemyDmgReduce) * (1 - rs.dmgReduce);
        const raw      = defCmdAtk * roundTerrBonus * (0.85+Math.random()*0.30) * 0.8 * eMod * defMod;
        const dmg      = Math.max(1, Math.round(raw * red));
        const prevAtk  = atkTroopHp;
        atkTroopHp     = Math.max(0, atkTroopHp - dmg);
        totalAtkLostHp += (prevAtk - atkTroopHp);
        const atkKilled    = Math.max(0, Math.round((prevAtk - atkTroopHp) / atkTroopHpPer));
        const atkRemaining = Math.max(0, Math.round(atkTroopHp / atkTroopHpPer));
        roundLog.actions.push({
          actor:"Enemy Cmd",
          action:`${report.defCmdIcon} Enemy commander strikes`,
          dmg, atkKilled, atkRemaining, isPlayer:false,
        });

      } else if (ent.id === "defTroop") {
        if (rs.enemyNullified || !defTT || defTroopHp <= 0 || atkTroopHp <= 0) continue;
        if (Math.random() < rs.enemyMissChance) {
          roundLog.actions.push({ actor:"Defenders", action:"Enemy troops missed!", dmg:0 }); continue;
        }
        const eMod     = (1 - rs.enemyDmgReduce) * (1 - rs.troopDmgReduce) * (1 - rs.dmgReduce);
        const count    = Math.ceil(defTroopHp / defTroopHpPer);
        const prevAtk  = atkTroopHp;
        const res      = troopDmg(defTT, aTT2(cmd.troopType), count, atkTroopHp, defLvlMult, roundTerrBonus, false, bastionDefMult * rs.troopDefMult, 1, defMod);
        const dmg      = Math.max(1, Math.round(res.dmg * eMod));
        atkTroopHp     = Math.max(0, atkTroopHp - dmg);
        totalAtkLostHp += (prevAtk - atkTroopHp);
        const atkKilled    = Math.max(0, Math.round((prevAtk - atkTroopHp) / atkTroopHpPer));
        const atkRemaining = Math.max(0, Math.round(atkTroopHp / atkTroopHpPer));
        roundLog.actions.push({
          actor:"Defenders",
          action:`${defTT.icon} ${defTT.label} attack`,
          dmg, atkKilled, atkRemaining, isPlayer:false,
        });
      }
    }
    report.rounds.push(roundLog);
  }

  // win  = attacker wiped defender (defTroopHp <= 0)
  // loss = attacker wiped (atkTroopHp <= 0)
  // draw = round 10 ends with both sides still standing → 5-min rematch timer
  const won    = defTroopHp <= 0 && atkTroopHp > 0;
  const isDraw = atkTroopHp > 0 && defTroopHp > 0;   // hit round 10 cap

  const defTroopsLeft    = Math.max(0, Math.round(defTroopHp / defTroopHpPer));
  const atkLostHpActual  = atkHpMax - Math.max(0, atkTroopHp);

  const finalAtkLost = won
    ? Math.min(attackerTroops - 1, Math.max(1, Math.round(atkLostHpActual / (atkTroopHpPer * bastionHpMult))))
    : isDraw
      ? Math.max(0, Math.round(atkLostHpActual / (atkTroopHpPer * bastionHpMult)))   // draw: real losses, both keep troops
      : Math.min(attackerTroops, Math.round(attackerTroops * (0.35 + Math.random() * 0.20))); // loss: rout

  // Bug 27 fix: XP on draw is proportional to enemy troops killed (fraction of full reward)
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
  // 30% of lost troops go to healing tent — matches useMarch.js wounded calc
  report.atkTroopsWounded = Math.floor(finalAtkLost * 0.30);

  return { won, isDraw, lost:finalAtkLost, atk:Math.round(atkPow), def:Math.round(defPow), pct, mod, modLabel, xpGain, report };
}

// Helper — safe troop type lookup (avoids undefined when troopType is null)
function aTT2(troopType) { return troopType ? TROOP[troopType] : null; }
