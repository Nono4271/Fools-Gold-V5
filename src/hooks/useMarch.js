import { useEffect, useRef } from "react";
import { TROOP, TROOP_KEYS } from "../../shared/constants/troops.js";
import { POWER_DEFS, HQP, AI_HQ_KEY, WIN_KEY, SIEGE_BASE, KEEP_GARRISON_RESET_MS } from "../../shared/constants/map.js";
import { CMD_LVL_MAX, xpToNext } from "../../shared/constants/troops.js";
import { barracksCapacity } from "../../shared/constants/buildings.js";
import { adj, bfsPath, effectiveMarchSpd, marchStepMs } from "../../shared/utils/pathfinding.js";
import { simBattle, garrisonDefCmd } from "../../shared/utils/battle.js";
import { calcSiegePower } from "../../shared/constants/map.js";
import { applyGearToCmd } from "../../shared/utils/gearStats.js";
import { gearStatValue } from "../../shared/constants/gear.js";
import { getPassiveBonuses } from "../../shared/constants/skills.js";

// Per-class stat growth per level
const CLASS_GROWTH = {
  attacker: { atk: 1.5, foc: 0.2, spd: 0.6 },
  defender: { atk: 0.7, foc: 1.1, spd: 0.3 },
  support:  { atk: 0.2, foc: 1.3, spd: 0.8 },
  leader:   { atk: 0.8, foc: 0.8, spd: 0.8 },
};

// Returns the garrison reset delay for a tile — keeps use a much longer timer
function garrisonResetMs(tile) {
  return (tile?.isKeep || tile?.isHQ) ? KEEP_GARRISON_RESET_MS : 60000;
}

function applyXp(cmd, xpGain, floaty) {
let newXp  = (cmd.xp  || 0) + xpGain;
let newLvl = (cmd.lvl || 5);
let levelsGained = 0;
while (newLvl < CMD_LVL_MAX) {
  const needed = xpToNext(newLvl);
  if (newXp >= needed) { newXp -= needed; newLvl++; levelsGained++; } else break;
}
if (newLvl >= CMD_LVL_MAX) newXp = 0;
if (levelsGained > 0 && floaty) floaty(`⬆ Lv${newLvl}!`, "#f0c040", cmd.tk);
// +1 skill point per level gained (doc §4.3)
const newSkillPoints = (cmd.unspentSkillPoints ?? 0) + levelsGained;
// Apply per-class stat growth for each level gained
const growth = CLASS_GROWTH[cmd.cls] ?? CLASS_GROWTH.leader;
const prevLvl = cmd.lvl || 5;
const newAtk = Math.round((cmd.atk || 0) + growth.atk * levelsGained);
const newFoc = Math.round((cmd.foc || 0) + growth.foc * levelsGained);
const newSpd = Math.round((cmd.spd || 0) + growth.spd * levelsGained);

// Lv25 class bonuses — apply once when crossing level 25
const crossedLv25 = prevLvl < 25 && newLvl >= 25;
const attackerBonus = (cmd.cls === "attacker" && crossedLv25) ? 15 : 0;
const supportBonus  = (cmd.cls === "support"  && crossedLv25) ? 5  : 0;
// Bug 18 fix: Leader Lv25 unlocks +500 Command (handled in cmdCommand via leaderBonus param).
// Defender Lv25 unlocks Bastion (checked in battle.js via cmd.lvl >= 25).
// Neither needed a stat delta here, but both were silently missing their floaty notification.
if (crossedLv25 && cmd.cls === "leader"   && floaty && cmd.tk) floaty("⭐ Lv25: +500 Command!", "#f0c040", cmd.tk);
if (crossedLv25 && cmd.cls === "defender" && floaty && cmd.tk) floaty("⭐ Lv25: Bastion unlocked!", "#88bbff", cmd.tk);

return {
  xp: newXp, lvl: newLvl,
  unspentSkillPoints: newSkillPoints + supportBonus,
  atk: newAtk + attackerBonus, foc: newFoc, spd: newSpd,
};
}

export function useMarch({
screen, tiles, tileVersion, bldgs, cmds,
setCmds, setAiCmds, setTiles, patchTile, setWounded, setBarracks,
setBattles, setBLog, setWinner, setUnseenBattles,
tilesRef, floaty, gearInventory,
playerHqKey, aiHqKeys,
}) {
const hqKey = playerHqKey || `${HQP.player.c},${HQP.player.r}`;

// Keep a ref to cmds so the draw-timer interval can read current cmds
// without depending on them in its effect deps (avoids interval restart
// every 100ms when the worker fires a marchStep setCmds call).
const cmdsRef = useRef(cmds);
useEffect(() => { cmdsRef.current = cmds; }, [cmds]);
// Resolve AI HQ key: for retreating AI commanders, find their faction's HQ
const getAiHqKey = (cmd) => {
  if (aiHqKeys && cmd?.faction && aiHqKeys[cmd.faction]) return aiHqKeys[cmd.faction];
  return AI_HQ_KEY;
};

// March step ticking is handled by gameLoop.worker.js (useGameLoop → onMarchStep).
// Arrival logic (battles, captures, retreats) remains here as state-change effects.

// Player attack arrival
useEffect(() => {
if (screen !== "game") return;
const arrivedAttackers = cmds.filter(c => c.owner === "player" && c.march?.arrived && c.march?.type === "attack");
if (!arrivedAttackers.length) return;

arrivedAttackers.forEach(cmd => {
  const destKey = cmd.tk;
  const defTile = tiles[destKey];
  if (!defTile || defTile.owner === "player") {
    setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null } : c));
    return;
  }

  const [dc, dr] = destKey.split(",").map(Number);
  const hasFoothold = adj(dc, dr).some(k => tiles[k]?.owner === "player");
  if (!hasFoothold) {
    const boostedCmd0 = applyGearToCmd(cmd, gearInventory);
    const stepMs = marchStepMs(effectiveMarchSpd(boostedCmd0.spd || 60, cmd.troopType, boostedCmd0.gearBonuses?.armySpd || 0));
    const retreatPath = bfsPath(destKey, hqKey);
    setCmds(p => p.map(c => {
      if (c.uid !== cmd.uid) return c;
      if (retreatPath && retreatPath.length >= 2) {
        return { ...c, march:{ type:"move", path:retreatPath, step:0, dest:hqKey, origin:destKey, stepMs, lastStepTime:Date.now() } };
      }
      return { ...c, tk:hqKey, march:null };
    }));
    floaty("⚠ No foothold — retreating", "#cc8030", destKey);
    return;
  }

  const originKey = cmd.march?.origin || hqKey;
  const wallLvl   = bldgs.walls || 0;

  // Garrison-defeated path: apply siege only
  if (defTile.garrisonDefeated) {
    const newTroops  = cmd.troops || 0;
    const boostedCmd0 = applyGearToCmd(cmd, gearInventory);
    const siegePower = calcSiegePower(newTroops, cmd.troopType, boostedCmd0.gearBonuses?.armySiege || 0);
    const currentSiege = defTile.siege ?? SIEGE_BASE;
    let siegeCaptured = false;
    if (siegePower >= currentSiege) {
      siegeCaptured = true;
      patchTile(destKey, { owner:"player", garrison:0, siege:defTile.siegeMax??SIEGE_BASE, garrisonDefeated:false, resetAt:null });
      floaty("⚔ CAPTURED!", "#3daa60", destKey);
      if (destKey === WIN_KEY) setWinner("player");
    } else {
      patchTile(destKey, { siege:currentSiege-siegePower, resetAt:Date.now()+garrisonResetMs(defTile) });
      floaty(`🔨 SIEGE ${currentSiege-siegePower}/${defTile.siegeMax??SIEGE_BASE}`, "#d0a030", destKey);
    }
    setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null, tk:siegeCaptured?destKey:originKey } : c));
    return;
  }

  // Check live AI commander presence
  const hasAiCmd = cmds.some(c => c.owner === "ai" && c.tk === destKey && !c.march);
  const effectiveDefTile = hasAiCmd ? defTile : { ...defTile, defCmd:garrisonDefCmd(defTile) };

  // Stage 1 battle
  const boostedCmd = applyGearToCmd(cmd, gearInventory);
  const res = simBattle(boostedCmd, cmd.troops || 50, effectiveDefTile, wallLvl);
  const troopsAfterS1 = res.won ? Math.max(0, (cmd.troops||0) - res.lost) : 0;

  if (res.report) {
      const passiveSummary = getPassiveBonuses(boostedCmd);
      // Snapshot equipped gear instances for display in battle log
      const SLOT_KEYS = ["helmet", "armor", "bracers", "accessory"];
      const atkGearSnapshot = SLOT_KEYS.map(slot => {
        const instanceId = cmd.gear?.[slot];
        if (!instanceId) return null;
        const piece = gearInventory.find(g => g.instanceId === instanceId);
        if (!piece) return null;
        return { ...piece, primaryStatValue: gearStatValue(piece.primaryStat, piece.rarity, piece.stars ?? 0) };
      });
      const enriched = { ...res.report, timestamp: Date.now(), cmdCls: cmd.cls, passiveSummary, atkGearSnapshot };
      setBattles(p => [enriched, ...p].slice(0, 99)); setUnseenBattles(n => n + 1);
    }

  if (!res.won && !res.isDraw) {
    floaty("💀 DEFEATED — retreating", "#cc3030", destKey);
    // Bug 23 fix: 30% of lost troops go to wounded on defeat (same as win path)
    const woundedOnLoss = Math.floor((cmd.troops || 0) * res.lost / Math.max(1, cmd.troops || 1) * 0.30);
    if (woundedOnLoss > 0) { setWounded(w => w + woundedOnLoss); floaty(`🏥 +${woundedOnLoss} wounded`, "#88aaff", destKey); }
    setCmds(p => p.map(c => {
      if (c.uid !== cmd.uid) return c;
      const retreatPath = bfsPath(originKey, hqKey);
      const stepMs = marchStepMs(effectiveMarchSpd(boostedCmd.spd||60, null, boostedCmd.gearBonuses?.armySpd || 0));
      let updated = { ...c, troops:0, tk:originKey, march:null, drawTimer:null, drawTile:null, drawOrigin:null };
      if (retreatPath && retreatPath.length >= 2) {
        updated = { ...updated, march:{ type:"move", path:retreatPath, step:0, dest:hqKey, origin:originKey, stepMs, lastStepTime:Date.now() } };
      } else { updated = { ...updated, tk:hqKey }; }
      return { ...updated, ...applyXp(updated, res.xpGain, floaty) };
    }));
    setBLog(p => [`❌ ${cmd.n} Lv${cmd.lvl||5} defeated — retreating · ${res.modLabel}`, ...p].slice(0, 99));
    return;
  }

  if (res.isDraw) {
    const troopsAfterDraw = Math.max(1, (cmd.troops||0) - res.lost);
    floaty("⚔ DRAW — rematch in 5 min", "#c0a020", destKey);
    setCmds(p => p.map(c => {
      if (c.uid !== cmd.uid) return c;
      return { ...c, troops:troopsAfterDraw, tk:destKey, march:null,
        drawTimer:  Date.now() + 5 * 60 * 1000,
        drawOrigin: originKey,
        drawTile:   destKey,
      };
    }));
    setBLog(p => [`⚔ DRAW — ${cmd.n} holds position, rematch in 5min · ${res.modLabel}`, ...p].slice(0, 99));
    return;
  }

  // Stage 2: if AI commander was present, fight garrison
  let finalTroops = troopsAfterS1;
  let res2 = null;
  if (hasAiCmd) {
    floaty("⚔ Commander routed — garrison defends!", "#d0a030", destKey);
    const plvl = defTile.powerLevel || 1;
    const pd2  = POWER_DEFS[plvl] || POWER_DEFS[1];
    const garrisonTile = { ...defTile, defCmd:{ lvl:pd2.cmdLvl, troops:defTile.garrisonTroops||pd2.troops, troopType:defTile.troopType, atk:80+pd2.cmdLvl*8, spd:30+pd2.cmdLvl*3 } };
    res2 = simBattle({ ...boostedCmd, troops:troopsAfterS1 }, troopsAfterS1, garrisonTile, wallLvl);
    finalTroops = res2.won ? Math.max(0, troopsAfterS1 - res2.lost) : 0;

    if (res2.report) {
      const passiveSummary2 = getPassiveBonuses(boostedCmd);
      const enriched2 = { ...res2.report, timestamp: Date.now(), cmdCls: cmd.cls, passiveSummary: passiveSummary2, isStage2: true };
      setBattles(p => [enriched2, ...p].slice(0, 99)); setUnseenBattles(n => n + 1);
    }

    if (!res2.won) {
      floaty("💀 DEFEATED by garrison — retreating", "#cc3030", destKey);
      // Bug 23 fix: wounded on stage-2 defeat
      const woundedS2 = Math.floor(troopsAfterS1 * 0.30);
      if (woundedS2 > 0) { setWounded(w => w + woundedS2); floaty(`🏥 +${woundedS2} wounded`, "#88aaff", destKey); }
      patchTile(destKey, { defCmd:null, hasAiCommander:false, garrisonDefeated:true, resetAt:Date.now()+garrisonResetMs(defTile) });
      setCmds(p => p.map(c => {
        if (c.uid !== cmd.uid) return c;
        const retreatPath = bfsPath(originKey, hqKey);
        const stepMs = marchStepMs(effectiveMarchSpd(boostedCmd.spd||60, null, boostedCmd.gearBonuses?.armySpd || 0));
        let updated = { ...c, troops:0, tk:originKey, march:null };
        if (retreatPath && retreatPath.length >= 2) {
          updated = { ...updated, march:{ type:"move", path:retreatPath, step:0, dest:hqKey, origin:originKey, stepMs, lastStepTime:Date.now() } };
        } else { updated = { ...updated, tk:hqKey }; }
        return { ...updated, ...applyXp(updated, res2.xpGain, floaty) };
      }));
      setBLog(p => [`❌ ${cmd.n} defeated by garrison · ${res2.modLabel}`, ...p].slice(0, 99));
      return;
    }
  }

  // Both stages won — check siege
  const siegePower   = calcSiegePower(finalTroops, cmd.troopType, boostedCmd.gearBonuses?.armySiege || 0);
  const currentSiege = defTile.siege ?? SIEGE_BASE;
  let tileCaptured = false;

  if (siegePower >= currentSiege) {
    tileCaptured = true;
    patchTile(destKey, { owner:"player", garrison:0, siege:defTile.siegeMax??SIEGE_BASE, garrisonDefeated:false, resetAt:null, defCmd:null, hasAiCommander:false });
    floaty("⚔ CAPTURED!", "#3daa60", destKey);
    if (destKey === WIN_KEY) setWinner("player");
  } else {
    patchTile(destKey, { siege:currentSiege-siegePower, garrisonDefeated:true, resetAt:Date.now()+garrisonResetMs(defTile), defCmd:null, hasAiCommander:false });
    floaty(`⚔ SIEGE ${currentSiege-siegePower}/${defTile.siegeMax??SIEGE_BASE} — not captured`, "#d0a030", destKey);
  }

  const wc = Math.floor(((cmd.troops||0) - finalTroops) * 0.30);
  if (wc > 0) { setWounded(w => w + wc); floaty(`🏥 +${wc} wounded`, "#88aaff", destKey); }

  const finalTk   = tileCaptured ? destKey : originKey;
  const xpSrc     = res2 || res;
  setCmds(p => p.map(c => {
    if (c.uid !== cmd.uid) return c;
    const updated = { ...c, troops:finalTroops, tk:finalTk, march:null };
    return { ...updated, ...applyXp(updated, xpSrc.xpGain, floaty) };
  }));
  const stageLabel = hasAiCmd ? " (2-stage)" : "";
  setBLog(p => [`✅ ${cmd.n} Lv${cmd.lvl||5}${stageLabel} ${tileCaptured?"captured":"siege dealt"} · ${res.modLabel}`, ...p].slice(0, 99));
});

}, [cmds, screen]);

// ── Draw rematch timer tick ───────────────────────────────────────────────────
// Every second: check if any player commander's drawTimer has expired.
// On expiry, run the rematch inline — no march re-queuing.
// Enemy priority: AI commanders on the tile sorted newest-first (arrivedAt desc),
// then the NPC garrison if any/all commanders are beaten.
useEffect(() => {
  if (screen !== "game") return;
  const id = setInterval(() => {
    const now = Date.now();
    // Read from ref — avoids depending on cmds state and restarting
    // the interval every time any march step fires a setCmds call.
    const drawCmds = cmdsRef.current.filter(c =>
      c.owner === "player" && c.drawTimer && !c.march
    );
    if (!drawCmds.length) return;

    drawCmds.forEach(cmd => {
      const destKey   = cmd.drawTile;
      const originKey = cmd.drawOrigin || hqKey;
      const defTile   = tilesRef.current?.[destKey];

      // Clear draw if tile flipped to player or commander moved away
      if (!defTile || defTile.owner === "player" || cmd.tk !== destKey) {
        setCmds(p => p.map(c => c.uid === cmd.uid
          ? { ...c, drawTimer:null, drawTile:null, drawOrigin:null } : c));
        return;
      }

      // Clear draw if adjacency no longer valid
      const [dc, dr] = destKey.split(",").map(Number);
      const hasFoothold = adj(dc, dr).some(k => tilesRef.current?.[k]?.owner === "player");
      if (!hasFoothold) {
        setCmds(p => p.map(c => c.uid === cmd.uid
          ? { ...c, drawTimer:null, drawTile:null, drawOrigin:null } : c));
        floaty("⚠ Foothold lost — draw cancelled", "#cc8030", destKey);
        return;
      }

      // Timer not yet expired
      if (now < cmd.drawTimer) return;

      // ── Timer expired: run rematch inline ────────────────────────────────
      // Guard: if player returned troops between draw and rematch, cancel silently
      if (!cmd.troops || cmd.troops <= 0) {
        setCmds(p => p.map(c => c.uid === cmd.uid
          ? { ...c, drawTimer:null, drawTile:null, drawOrigin:null } : c));
        return;
      }

      floaty("⚔ REMATCH!", "#c0a020", destKey);

      const wallLvl    = bldgs.walls || 0;
      const boostedCmd = applyGearToCmd(cmd, gearInventory);

      // Build ordered enemy list: AI commanders newest-first, then NPC garrison
      const aiCmdsOnTile = cmdsRef.current
        .filter(c => c.owner === "ai" && c.tk === destKey && !c.march && (c.troops || 0) > 0)
        .sort((a, b) => (b.arrivedAt ?? 0) - (a.arrivedAt ?? 0));

      let remainingTroops = cmd.troops || 0;
      let totalXp         = 0;
      let totalWounded    = 0;
      let playerDefeated  = false;
      let tileCaptured    = false;
      let newDrawTimer    = null;
      const defeatedAiUids = [];

      // Fight each AI commander in arrival order (newest first)
      for (const aiCmd of aiCmdsOnTile) {
        if (remainingTroops <= 0) { playerDefeated = true; break; }
        const fightTile = { ...defTile, defCmd: { ...aiCmd } };
        const res = simBattle({ ...boostedCmd, troops: remainingTroops }, remainingTroops, fightTile, wallLvl);
        if (res.report) {
          const enriched = { ...res.report, timestamp: Date.now(), cmdCls: cmd.cls,
            passiveSummary: getPassiveBonuses(boostedCmd), isRematch: true };
          setBattles(p => [enriched, ...p].slice(0, 99));
          setUnseenBattles(n => n + 1);
        }
        if (res.isDraw) {
          // Still a draw — set new 5-min timer and stop the chain
          remainingTroops = Math.max(1, remainingTroops - res.lost);
          newDrawTimer = Date.now() + 5 * 60 * 1000;
          setBLog(p => [`⚔ DRAW again — ${cmd.n} holds, rematch in 5min`, ...p].slice(0, 99));
          break;
        }
        totalWounded += Math.floor(res.lost * 0.30);
        totalXp      += res.xpGain;
        if (!res.won) {
          remainingTroops = 0;
          playerDefeated = true;
          setBLog(p => [`❌ ${cmd.n} defeated in rematch by ${aiCmd.n}`, ...p].slice(0, 99));
          break;
        }
        // Won against this AI commander
        remainingTroops = Math.max(0, remainingTroops - res.lost);
        defeatedAiUids.push(aiCmd.uid);
        setBLog(p => [`⚔ ${cmd.n} defeated ${aiCmd.n} in rematch`, ...p].slice(0, 99));
      }

      // If player is still standing and no new draw, fight NPC garrison
      if (!playerDefeated && !newDrawTimer && remainingTroops > 0) {
        const garrisonTile = { ...defTile, defCmd: garrisonDefCmd(defTile) };
        const resG = simBattle({ ...boostedCmd, troops: remainingTroops }, remainingTroops, garrisonTile, wallLvl);
        if (resG.report) {
          const enriched = { ...resG.report, timestamp: Date.now(), cmdCls: cmd.cls,
            passiveSummary: getPassiveBonuses(boostedCmd), isRematch: true, isGarrison: true };
          setBattles(p => [enriched, ...p].slice(0, 99));
          setUnseenBattles(n => n + 1);
        }
        if (resG.isDraw) {
          remainingTroops = Math.max(1, remainingTroops - resG.lost);
          newDrawTimer = Date.now() + 5 * 60 * 1000;
          setBLog(p => [`⚔ DRAW vs garrison — ${cmd.n} holds, rematch in 5min`, ...p].slice(0, 99));
        } else {
          totalWounded += Math.floor(resG.lost * 0.30);
          totalXp      += resG.xpGain;
          if (!resG.won) {
            remainingTroops = 0;
            playerDefeated = true;
            setBLog(p => [`❌ ${cmd.n} defeated by garrison in rematch`, ...p].slice(0, 99));
          } else {
            remainingTroops = Math.max(0, remainingTroops - resG.lost);
          }
        }
      }

      // Apply wounded
      if (totalWounded > 0) {
        setWounded(w => w + totalWounded);
        floaty(`🏥 +${totalWounded} wounded`, "#88aaff", destKey);
      }

      // Evict defeated AI commanders
      if (defeatedAiUids.length) {
        setAiCmds(p => p.map(c => {
          if (!defeatedAiUids.includes(c.uid)) return c;
          const retreatPath = bfsPath(destKey, getAiHqKey(cmd));
          const stepMs = marchStepMs(effectiveMarchSpd(c.spd||60, null));
          if (retreatPath && retreatPath.length >= 2) {
            return { ...c, troops:0, march:{ type:"move", path:retreatPath, step:0, dest:getAiHqKey(cmd), origin:destKey, stepMs, lastStepTime:Date.now() } };
          }
          return { ...c, troops:0, tk:getAiHqKey(cmd) };
        }));
      }

      if (playerDefeated) {
        // Player retreats
        setCmds(p => p.map(c => {
          if (c.uid !== cmd.uid) return c;
          const retreatPath = bfsPath(originKey, hqKey);
          const stepMs = marchStepMs(effectiveMarchSpd(boostedCmd.spd||60, null, boostedCmd.gearBonuses?.armySpd || 0));
          let updated = { ...c, troops:0, tk:originKey, march:null,
            drawTimer:null, drawTile:null, drawOrigin:null };
          if (retreatPath && retreatPath.length >= 2) {
            updated = { ...updated, march:{ type:"move", path:retreatPath, step:0, dest:hqKey, origin:originKey, stepMs, lastStepTime:Date.now() } };
          } else { updated = { ...updated, tk:hqKey }; }
          return { ...updated, ...applyXp(updated, totalXp, floaty) };
        }));
        return;
      }

      if (newDrawTimer) {
        // Another draw — stay on tile, reset timer
        setCmds(p => p.map(c => c.uid === cmd.uid
          ? { ...c, troops: remainingTroops, drawTimer: newDrawTimer,
              ...applyXp(c, totalXp, floaty) }
          : c));
        return;
      }

      // Player won all fights — attempt siege/capture
      const siegePower   = calcSiegePower(remainingTroops, cmd.troopType, boostedCmd.gearBonuses?.armySiege || 0);
      const currentSiege = defTile.siege ?? SIEGE_BASE;
      if (siegePower >= currentSiege) {
        tileCaptured = true;
        patchTile(destKey, { owner:"player", garrison:0, siege:defTile.siegeMax??SIEGE_BASE, garrisonDefeated:false, resetAt:null, defCmd:null, hasAiCommander:false });
        floaty("⚔ CAPTURED!", "#3daa60", destKey);
        if (destKey === WIN_KEY) setWinner("player");
      } else {
        patchTile(destKey, { siege:currentSiege-siegePower, garrisonDefeated:true, resetAt:Date.now()+garrisonResetMs(defTile), defCmd:null, hasAiCommander:false });
        floaty(`⚔ SIEGE ${currentSiege-siegePower}/${defTile.siegeMax??SIEGE_BASE}`, "#d0a030", destKey);
      }

      const finalTk = tileCaptured ? destKey : originKey;
      setCmds(p => p.map(c => {
        if (c.uid !== cmd.uid) return c;
        const updated = { ...c, troops:remainingTroops, tk:finalTk, march:null,
          drawTimer:null, drawTile:null, drawOrigin:null };
        return { ...updated, ...applyXp(updated, totalXp, floaty) };
      }));
      setBLog(p => [`✅ ${cmd.n} ${tileCaptured?"captured":"siege dealt"} after rematch`, ...p].slice(0, 99));
    });
  }, 1000);
  return () => clearInterval(id);
// cmds intentionally omitted — we read cmdsRef.current inside the interval
// so the interval is never torn down/recreated when march steps fire setCmds.
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [screen, tilesRef, setCmds, floaty, hqKey, bldgs.walls, gearInventory]);

// AI attack arrival
useEffect(() => {
if (screen !== "game") return;
const arrivedAI = cmds.filter(c => c.owner === "ai" && c.march?.arrived && c.march?.type === "attack");
if (!arrivedAI.length) return;

arrivedAI.forEach(cmd => {
  const destKey = cmd.tk;
  const defTile = tiles[destKey];
  if (!defTile || defTile.owner === "ai") {
    setAiCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null } : c));
    return;
  }
  const [dc2, dr2] = destKey.split(",").map(Number);
  const hasFoothold = adj(dc2, dr2).some(k => tiles[k]?.owner === "ai");
  if (!hasFoothold) {
    setAiCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null, tk:getAiHqKey(cmd) } : c));
    return;
  }

  const originKey = cmd.march?.origin || getAiHqKey(cmd);
  const boostedCmd2 = applyGearToCmd(cmd, gearInventory);

  if (defTile.garrisonDefeated) {
    const siegePower = calcSiegePower(cmd.troops||0, cmd.troopType, boostedCmd2.gearBonuses?.armySiege || 0);
    const currentSiege = defTile.siege ?? SIEGE_BASE;
    if (siegePower >= currentSiege) {
      const isPlayerHQ = defTile.isHQ && defTile.owner === "player";
      patchTile(destKey, { owner:"ai", garrison:0, siege:defTile.siegeMax??SIEGE_BASE, garrisonDefeated:false, resetAt:null, defCmd:{ lvl:cmd.lvl||5, troops:Math.floor((cmd.troops||0)*0.6), troopType:cmd.troopType||TROOP_KEYS[0], atk:cmd.atk||150, spd:cmd.spd||60 } });
      floaty("⚠ ENEMY CAPTURED TILE!", "#dd3322", destKey);
      if (destKey === WIN_KEY || isPlayerHQ) setWinner("ai");
      setAiCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null } : c));
    } else {
      patchTile(destKey, { siege:currentSiege-siegePower, resetAt:Date.now()+garrisonResetMs(defTile) });
      setAiCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null, tk:originKey } : c));
    }
    return;
  }

  const wallLvl = defTile.owner === "player" && defTile.isHQ ? (bldgs.walls||0) : 0;
  const res = simBattle(boostedCmd2, cmd.troops||50, defTile, wallLvl);
  const newTroops = res.won ? Math.max(0, (cmd.troops||0) - res.lost) : 0;
  let tileCaptured = false;

  if (res.won) {
    const siegePower = calcSiegePower(newTroops, cmd.troopType, boostedCmd2.gearBonuses?.armySiege || 0);
    const currentSiege = defTile.siege ?? SIEGE_BASE;
    if (siegePower >= currentSiege) {
      tileCaptured = true;
      const isPlayerHQ = defTile.isHQ && defTile.owner === "player";
      patchTile(destKey, { owner:"ai", garrison:0, siege:300, siegeMax:300, garrisonDefeated:false, resetAt:null, hasAiCommander:true, defCmd:{ lvl:cmd.lvl||5, troops:Math.floor(newTroops*0.6), troopType:cmd.troopType||TROOP_KEYS[0], atk:cmd.atk||150, spd:cmd.spd||60 } });
      floaty("⚠ ENEMY CAPTURED TILE!", "#dd3322", destKey);
      if (destKey === WIN_KEY || isPlayerHQ) setWinner("ai");
    } else {
      patchTile(destKey, { siege:currentSiege-siegePower, garrisonDefeated:true, resetAt:Date.now()+garrisonResetMs(defTile) });
    }
  }

  const finalTk = tileCaptured ? destKey : originKey;
  setAiCmds(p => p.map(c => {
    if (c.uid !== cmd.uid) return c;
    let updated = { ...c, troops:newTroops, tk:finalTk, march:null, arrivedAt: tileCaptured ? Date.now() : (c.arrivedAt ?? Date.now()) };
    if (!res.won) {
      const retreatPath = bfsPath(finalTk, getAiHqKey(cmd));
      if (retreatPath && retreatPath.length >= 2) {
        const stepMs = marchStepMs(effectiveMarchSpd(c.spd||60, null));
        updated = { ...updated, march:{ type:"move", path:retreatPath, step:0, dest:getAiHqKey(cmd), origin:finalTk, stepMs, lastStepTime:Date.now() } };
      } else { updated = { ...updated, tk:getAiHqKey(cmd) }; }
    }
    // Bug 20 fix: use applyXp so AI commanders gain stat growth and Lv25 bonuses, same as player
    return { ...updated, ...applyXp(updated, res.xpGain, null) };
  }));
  setBLog(p => [`${res.won?"🔴":"✅"} ENEMY ${cmd.n} Lv${cmd.lvl||5} ${res.won?"captured":"repelled"} tile`, ...p].slice(0, 99));
});

}, [cmds, screen, tileVersion, bldgs.walls]);
}
