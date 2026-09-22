import { useEffect, useRef } from "react";
import { FACTION_TROOPS, FACTION_KEYS, CMD_LVL_MAX, xpToNext } from "../../shared/constants/troops.js";
import { POWER_DEFS, HQP, AI_HQ_KEY, WIN_KEY, SIEGE_BASE, KEEP_GARRISON_RESET_MS, GATE_GARRISON_RESET_MS, FORT_LEVELS, calcSiegePower } from "../../shared/constants/map.js";
import { barracksCapacity } from "../../shared/constants/buildings.js";
import { adj, adj8, bfsPath, effectiveMarchSpd, marchStepMs, normaliseTroopSlots } from "../../shared/utils/pathfinding.js";
import { isTileInRange } from "./useForts.js";
import { garrisonDefCmd, garrisonWaveDefCmd, garrisonWaveCount } from "../../shared/utils/garrisonUtils.js";
import { resolveSiegeOutcome, garrisonResetMs } from "../../shared/utils/captureRules.js";
import { applyGearToCmd } from "../../shared/utils/gearStats.js";
import { gearStatValue } from "../../shared/constants/gear.js";
import { getPassiveBonuses, getActiveSkills, MAIN_SKILLS } from "../../shared/constants/skills.js";
import { factionBonusValue } from "../../shared/constants/factionBonuses.js";
import { siegeTerritoryMultiplier, recordRegionCapture } from "../../shared/utils/warRules.js";
import { isWarActive } from "../../shared/utils/crewRules.js";

// Per-class stat growth per level
export const CLASS_GROWTH = {
  attacker:   { atk: 1.5, foc: 0.2, spd: 0.6 },
  leader:     { atk: 0.8, foc: 0.8, spd: 0.8 },
  support:    { atk: 0.2, foc: 1.3, spd: 0.8 },
  balanced:   { atk: 0.8, foc: 0.8, spd: 1.0 },  // higher spd growth, even spread
  strategist: { atk: 0.2, foc: 1.5, spd: 0.7 },  // focus-heavy like support but more foc
};

// ── Slot-aware army helpers ────────────────────────────────────────────────────
function cmdTroops(cmd) {
  if (cmd?.troopSlots) return cmd.troopSlots.reduce((s, sl) => s + (sl.troops || 0), 0);
  return cmd?.troops || 0;
}
function cmdSlots(cmd) {
  return normaliseTroopSlots(cmd);
}
function cmdSiegePower(cmd, boostedCmd) {
  const slots = cmdSlots(cmd);
  const bonus = boostedCmd?.gearBonuses?.armySiege || 0;
  if (slots.length > 0) return calcSiegePower(slots, null, bonus, FACTION_TROOPS);
  // AI commanders use cmd.troops directly (no slot system)
  const troops = cmd.troops || 0;
  return calcSiegePower(troops, cmd.troopBranch, bonus);
}
function cmdMarchSpd(cmd, boostedCmd) {
  const slots = cmdSlots(cmd);
  const bonus = boostedCmd?.gearBonuses?.armySpd || 0;
  const base = slots.length > 0
    ? effectiveMarchSpd(boostedCmd?.spd || cmd.spd || 60, slots.map(sl => sl.branch), bonus)
    : effectiveMarchSpd(boostedCmd?.spd || cmd.spd || 60, cmd.troopBranch, bonus);
  // Real "March Speed +N%" skill passives (e.g. Orc March) — non-combat,
  // so not folded into getPassiveBonuses' other cmdAtkMult-style fields —
  // plus the commander's faction bonus (e.g. Ashen Dead), if it has one.
  const skillPct = getPassiveBonuses(boostedCmd || cmd).marchSpeedBonus || 0;
  const facPct = factionBonusValue((boostedCmd || cmd)?.faction, "marchSpeed");
  const pct = skillPct + facPct;
  return pct > 0 ? Math.round(base * (1 + pct)) : base;
}
// Apply proportional losses to slots after battle
function applySlotLosses(cmd, lost) {
  if (!cmd.troopSlots || cmd.troopSlots.length === 0) return {};
  const total = cmd.troopSlots.reduce((s, sl) => s + (sl.troops || 0), 0);
  if (total === 0) return { troopSlots: [] };
  const frac = Math.min(1, lost / total);
  const newSlots = cmd.troopSlots.map(sl => ({
    ...sl,
    troops: Math.max(0, Math.round((sl.troops || 0) * (1 - frac))),
  }));
  return { troopSlots: newSlots };
}
function clearSlots(cmd) {
  if (cmd.troopSlots) return { troopSlots: [] };
  return { troops: 0, troopBranch: null };
}

// garrisonResetMs and resolveSiegeOutcome moved to shared/utils/captureRules.js
// (roadmap: move multiplayer-sensitive rules into shared/ so the server can
// call the exact same function instead of trusting a client-computed patch).

export function applyXp(cmd, xpGain, floaty) {
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

// Lv20 class bonuses — apply once when crossing level 20
const crossedLv20 = prevLvl < 20 && newLvl >= 20;
let bonusAtk = 0, bonusFoc = 0, bonusSpd = 0, bonusSkillPts = 0, bonusCmd = 0;
if (crossedLv20) {
  if (cmd.cls === "attacker")   { bonusAtk = 25; bonusSkillPts = 2; }
  if (cmd.cls === "leader")     { bonusCmd = 5; }
  if (cmd.cls === "support")    { bonusFoc = 25; bonusSkillPts = 5; }
  if (cmd.cls === "balanced")   { bonusAtk = 25; bonusFoc = 25; bonusSpd = 25; bonusSkillPts = 2; }
  if (cmd.cls === "strategist") { bonusFoc = 25; bonusSkillPts = 2; }
}
// Floaty notifications
if (crossedLv20 && cmd.cls === "attacker"   && floaty && cmd.tk) floaty("⭐ Lv20: +25 ATK, +2 skill pts!", "#e08050", cmd.tk);
if (crossedLv20 && cmd.cls === "leader"     && floaty && cmd.tk) floaty("⭐ Lv20: +5 Command!", "#f0c040", cmd.tk);
if (crossedLv20 && cmd.cls === "support"    && floaty && cmd.tk) floaty("⭐ Lv20: +25 FOC, +5 skill pts!", "#50d090", cmd.tk);
if (crossedLv20 && cmd.cls === "balanced"   && floaty && cmd.tk) floaty("⭐ Lv20: +25 ATK/FOC/SPD, +2 skill pts!", "#a080ff", cmd.tk);
if (crossedLv20 && cmd.cls === "strategist" && floaty && cmd.tk) floaty("⭐ Lv20: +25 FOC, +2 skill pts!", "#cc66ff", cmd.tk);

return {
  xp: newXp, lvl: newLvl,
  unspentSkillPoints: newSkillPoints + bonusSkillPts,
  atk: newAtk + bonusAtk,
  foc: newFoc + bonusFoc,
  spd: newSpd + bonusSpd,
  commandBonus: (cmd.commandBonus || 0) + bonusCmd,
};
}

export function useMarch({
screen, tiles, tileVersion, bldgs, cmds,
setCmds, setAiCmds, setTiles, patchTile, addWounded, setBarracks,
setBattles, setBLog, setWinner, setUnseenBattles,
tilesRef, floaty, gearInventory,
combatXpMult,
playerHqKey, aiHqKeys,
emitTileCapture, emitTileSiege,
gatePartners,
facKey,
troopSkillLevels,
crewmatePlayerIds,
aiPlayerIdMap,
runBattle,
forts,
getAnchors,
getFortAtTile,
stationAtFort,
unstationCmd,
damageFort,
emitFortUpdate,
guardedTiles,
facMasterySiegeMult = 1,
registerProtection,
onForcedRelocate,
crews, playerCrewId, regionOwners, setRegionOwners,
}) {

// Server-sync helpers — no-op if server not connected yet
const _emitCapture = (key, patch, attacker) => emitTileCapture?.(key, patch, attacker);
const _emitSiege   = (key, patch, attacker) => emitTileSiege?.(key, patch, attacker);

// War: -70% siege-power debuff on enemy-territory tiles, lifted while the
// attacker's own crew is at war — see shared/utils/warRules.js. Resolved
// fresh at each siege attempt (war phase advances purely from elapsed time,
// not a state change that would otherwise retrigger these effects).
// Player-siege call sites only (forts/fortress/keeps/tile-flips the human
// player's armies do) — never applied to AI-vs-AI or AI-vs-player fights.
function playerSiegePower(rawSiegePower, defTile) {
  const playerCrew = (crews || []).find(c => c.id === playerCrewId) || null;
  const mult = siegeTerritoryMultiplier({
    tile: defTile, regionOwners, attackerFaction: facKey, atWar: isWarActive(playerCrew, Date.now()),
  });
  return rawSiegePower * mult;
}

// Records the capturing faction's control of the whole region when a Keep
// tile is captured — see shared/utils/warRules.js's recordRegionCapture.
// Called for every capture (player or AI) so regionOwners stays accurate
// regardless of who's fighting whom.
function trackRegionCapture(tile, faction) {
  if (!tile?.isKeep || !faction || !setRegionOwners) return;
  setRegionOwners(prev => recordRegionCapture(prev, tile.regionKey, faction));
}

// The troop composition behind a siegePower number, in a shape the server
// can independently recompute from (shared calcSiegePower + FACTION_TROOPS)
// instead of trusting the client's claimed outcome. Roadmap item 1: give the
// server enough army data to verify a capture itself.
function attackerComposition(cmd, boostedCmd) {
  const slots = cmdSlots(cmd);
  const armySiegeBonus = boostedCmd?.gearBonuses?.armySiege || 0;
  if (slots.length > 0) {
    return { troopSlots: slots.map(sl => ({ troops: sl.troops, branch: sl.branch })), armySiegeBonus };
  }
  return { troops: cmd.troops || 0, troopBranch: cmd.troopBranch || null, armySiegeBonus };
}
const hqKey = playerHqKey || `${HQP.player.c},${HQP.player.r}`;

// Gate A ↔ Gate B foothold: a commander on gateA is treated as adjacent to
// gateB (and vice versa), so you can attack straight across without owning
// any other tiles near the border.
const hasPlayerFoothold = (destKey, originKey, tileMap) => {
  const [dc, dr] = destKey.split(",").map(Number);
  // adj8: attacks are allowed from a diagonally-owned tile, not just orthogonal.
  if (adj8(dc, dr).some(k => {
    const t = tileMap[k];
    if (!t) return false;
    if (t.owner === "player") return true;
    if (t.faction === facKey) return true; // same faction regardless of owner format
    const pid = t.ownerPlayerId || aiPlayerIdMap?.get(k);
    if (pid && crewmatePlayerIds?.has(pid)) return true;
    return false;
  })) return true;
  if (gatePartners?.[originKey] === destKey) return true;
  return false;
};
const hasAiFoothold = (destKey, originKey, tileMap) => {
  const [dc, dr] = destKey.split(",").map(Number);
  // adj8: kept symmetric with hasPlayerFoothold above.
  if (adj8(dc, dr).some(k => {
    const t = tileMap[k];
    return t?.owner === "ai" || (t?.owner && t.owner !== "player" && t.owner !== null);
  })) return true;
  if (gatePartners?.[originKey] === destKey) return true;
  return false;
};

// Keep a ref to cmds so the draw-timer interval can read current cmds
// without depending on them in its effect deps (avoids interval restart
// every 100ms when the worker fires a marchStep setCmds call).
const cmdsRef = useRef(cmds);
useEffect(() => { cmdsRef.current = cmds; }, [cmds]);
// Resolve AI HQ key: for retreating AI commanders, find their faction's HQ
const getAiHqKey = (cmd) => {
  if (aiHqKeys && cmd?.faction && aiHqKeys[cmd.faction]) {
    const val = aiHqKeys[cmd.faction];
    // aiHqKeys values are arrays of spawn keys — return the first one
    return Array.isArray(val) ? val[0] : val;
  }
  return AI_HQ_KEY;
};

// March step ticking is handled by gameLoop.worker.js (useGameLoop → onMarchStep).
// Arrival logic (battles, captures, retreats) remains here as state-change effects.

// Player attack arrival
useEffect(() => {
if (screen !== "game") return;
const arrivedAttackers = cmds.filter(c => c.owner === "player" && c.march?.arrived && c.march?.type === "attack");
if (!arrivedAttackers.length) return;

arrivedAttackers.forEach(async staleCmd => {
  // staleCmd comes from cmds.filter() — cmds is the current state in this effect closure.
  // If reinforcement happened before this render, staleCmd already has updated troops.
  // Use it directly; also check cmdsRef for any same-tick updates not yet in cmds.
  const liveCmd = cmdsRef.current.find(c => c.uid === staleCmd.uid);
  const cmd = (liveCmd && cmdTroops(liveCmd) > cmdTroops(staleCmd)) ? liveCmd : staleCmd;
  const destKey = cmd.tk;
  const defTile = tiles[destKey];
  if (!defTile || defTile.owner === "player" || defTile.faction === facKey) {
    setCmds(p => p.map(c => c.uid === staleCmd.uid ? { ...c, march:null } : c));
    return;
  }

  const originKey = cmd.march?.origin || hqKey;

  if (!hasPlayerFoothold(destKey, originKey, tiles)) {
    const boostedCmd0 = applyGearToCmd(cmd, gearInventory);
    const stepMs = marchStepMs(cmdMarchSpd(cmd, boostedCmd0));
    const retreatPath = bfsPath(destKey, hqKey);
    setCmds(p => p.map(c => {
      if (c.uid !== cmd.uid) return c;
      if (retreatPath && retreatPath.length >= 2) {
        return { ...c, march:{ type:"move", path:retreatPath, step:0, dest:hqKey, origin:destKey, stepMs, startedAt:Date.now(), lastStepTime:Date.now() } };
      }
      return { ...c, tk:hqKey, march:null };
    }));
    floaty("⚠ No foothold — retreating", "#cc8030", destKey);
    return;
  }

  const wallLvl = bldgs.walls || 0;
  const boostedCmd = { ...applyGearToCmd(cmd, gearInventory), troopSkillLevels: troopSkillLevels || {} };
  const SLOT_KEYS = ["helmet", "armor", "bracers", "accessory"];
  const atkGearSnapshot = SLOT_KEYS.map(slot => {
    const instanceId = cmd.gear?.[slot];
    if (!instanceId) return null;
    const piece = gearInventory.find(g => g.instanceId === instanceId);
    if (!piece) return null;
    return { ...piece, primaryStatValue: gearStatValue(piece.primaryStat, piece.rarity, piece.stars ?? 0) };
  });
  const atkSkillsSnapshot = getActiveSkills(boostedCmd).map(({ key, def, level }) => ({ key, level, maxLevel: MAIN_SKILLS[key] ? 15 : 7, name: def.name, icon: def.icon, type: def.type, desc: def.desc, cooldown: def.cooldown, tree: def.tree }));
  // Base stats breakdown for CommanderPopup (base+level component, gear component separately)
  const _gb = boostedCmd.gearBonuses ?? {};
  const atkBaseStats = {
    atk:        (boostedCmd.atk ?? 0) - (_gb.atk ?? 0),  // base + from-level, no gear
    foc:        (boostedCmd.foc ?? 0) - (_gb.foc ?? 0),
    spd:        (boostedCmd.spd ?? 0) - (_gb.spd ?? 0),
    gearAtk:    _gb.atk ?? 0,
    gearFoc:    _gb.foc ?? 0,
    gearSpd:    _gb.spd ?? 0,
  };

  // ── All-garrison-defeated: siege only ────────────────────────────────────
  const allWavesDefeated = (defTile.defeatedWaves?.length ?? 0) >= garrisonWaveCount(defTile);
  if (allWavesDefeated) {
    const siegePower = playerSiegePower(cmdSiegePower(cmd, boostedCmd), defTile);
    const attacker = attackerComposition(cmd, boostedCmd);
    const { captured: siegeCaptured, patch: outcomePatch } = resolveSiegeOutcome({ tile: defTile, siegePower });
    if (siegeCaptured) {
      patchTile(destKey, outcomePatch);
      _emitCapture(destKey, outcomePatch, attacker);
      registerProtection?.(destKey);
      trackRegionCapture(defTile, facKey);
      floaty("⚔ CAPTURED!", "#3daa60", destKey);
      if (destKey === WIN_KEY) setWinner("player");
    } else {
      patchTile(destKey, outcomePatch);
      _emitSiege(destKey, outcomePatch, attacker);
      floaty(`🔨 SIEGE ${outcomePatch.siege}/${outcomePatch.siegeMax}`, "#d0a030", destKey);
    }
    setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null, tk:siegeCaptured?destKey:originKey } : c));
    return;
  }

  // ── Fort combat: fight stationed commanders if attacking a fort tile ─────
  if (forts && getFortAtTile) {
    const fort = getFortAtTile(destKey);
    if (fort) {
      // Commanders physically AT the fort tile fight first
      const fortDefenders = cmds.filter(c =>
        c.owner === "player" ? false : // skip player cmds
        fort.stationedCmdUids?.includes(c.uid) && c.tk === destKey && !c.march
      );
      // Also check player forts attacked by AI — handled in AI branch
      // For player attacking enemy fort: fight stationed AI commanders
      const aiDefenders = cmds.filter(c =>
        c.owner === "ai" && fort.stationedCmdUids?.includes(c.uid) && c.tk === destKey && !c.march
      );
      if (aiDefenders.length > 0) {
        // Fight each stationed commander sequentially
        for (const defender of aiDefenders) {
          const res = await runBattle(boostedCmd, cmdTroops(cmd), defTile, wallLvl);
          if (res.report) {
            const enriched = { ...res.report, timestamp: Date.now(), cmdCls: cmd.cls,
              passiveSummary: getPassiveBonuses(boostedCmd), atkGearSnapshot, atkSkillsSnapshot, atkBaseStats };
            setBattles(p => [enriched, ...p].slice(0, 99)); setUnseenBattles(n => n + 1);
          }
          if (!res.won && !res.isDraw) {
            // Attacker lost — retreat
            const stepMs2 = marchStepMs(cmdMarchSpd(cmd, boostedCmd));
            const rp = bfsPath(destKey, hqKey);
            setCmds(p => p.map(c => {
              if (c.uid === cmd.uid) {
                const survived = Math.max(0, Math.floor(cmdTroops(cmd) * (res.survivalRate ?? 0.5)));
                return { ...c, troops: survived, march: rp?.length >= 2
                  ? { type:"move", path:rp, step:0, dest:hqKey, origin:destKey, stepMs:stepMs2, startedAt:Date.now(), lastStepTime:Date.now() }
                  : null, tk: rp?.length >= 2 ? c.tk : hqKey };
              }
              return c;
            }));
            floaty("💀 Defeated by fort defenders!", "#cc3030", destKey);
            return;
          }
          // Won — reduce attacker troops, continue to next defender
          const survived = Math.max(1, Math.floor(cmdTroops(cmd) * (res.survivalRate ?? 0.8)));
          setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, troops: survived } : c));
        }
        // All defenders beaten — now siege the fort structure itself
        const fortSiege = fort.siege ?? FORT_LEVELS[fort.level - 1].siege;
        const siegePower = playerSiegePower(cmdSiegePower(cmd, boostedCmd), defTile);
        if (siegePower >= fortSiege) {
          // Fort destroyed
          floaty("🏯 Fort Destroyed!", "#f0c040", destKey);
          // destroyFort is called via emitFortUpdate on server; locally signal it
          emitFortUpdate?.({ action: "destroy", fortId: fort.id });
        } else {
          damageFort?.(fort.id, siegePower);
          floaty(`🔨 Fort Siege ${fortSiege - siegePower}/${fort.siegeMax}`, "#d0a030", destKey);
          setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null, tk:originKey } : c));
          return;
        }
      }
    }
  }

  // ── Live AI commander check (fight them first, then waves) ────────────────
  const hasAiCmd = cmds.some(c => c.owner === "ai" && c.tk === destKey && !c.march);
  if (hasAiCmd) {
    // Stage 1: fight AI commander
    const res = await runBattle(boostedCmd, cmdTroops(cmd), defTile, wallLvl);
    if (res.report) {
      const enriched = { ...res.report, timestamp: Date.now(), cmdCls: cmd.cls,
        passiveSummary: getPassiveBonuses(boostedCmd), atkGearSnapshot, atkSkillsSnapshot, atkBaseStats, atkBaseStats };
      setBattles(p => [enriched, ...p].slice(0, 99)); setUnseenBattles(n => n + 1);
    }
    if (!res.won && !res.isDraw) {
      floaty("💀 DEFEATED — retreating", "#cc3030", destKey);
      const wl = Math.floor(res.lost * 0.30);
      if (wl > 0) { addWounded(cmd, wl); floaty(`🏥 +${wl} wounded`, "#88aaff", destKey); }
      setCmds(p => p.map(c => {
        if (c.uid !== cmd.uid) return c;
        const rp = bfsPath(originKey, hqKey);
        const sm = marchStepMs(effectiveMarchSpd(boostedCmd.spd||60, null, boostedCmd.gearBonuses?.armySpd||0));
        let u = { ...c, ...clearSlots(c), tk:originKey, march:null, drawTimer:null, drawTile:null, drawOrigin:null };
        if (rp?.length >= 2) u = { ...u, march:{ type:"move", path:rp, step:0, dest:hqKey, origin:originKey, stepMs:sm, startedAt:Date.now(), lastStepTime:Date.now() } };
        else u = { ...u, tk:hqKey };
        return { ...u, ...applyXp(u, Math.round(res.xpGain * (combatXpMult ?? 1)), floaty) };
      }));
      setBLog(p => [`❌ ${cmd.n} Lv${cmd.lvl||5} defeated — retreating · ${res.modLabel}`, ...p].slice(0, 99));
      return;
    }
    if (res.isDraw) {
      addWounded(cmd, Math.floor(res.lost * 0.30));
      floaty("⚔ DRAW — rematch in 5 min", "#c0a020", destKey);
      setCmds(p => p.map(c => {
        if (c.uid !== cmd.uid) return c;
        return { ...c, troops: Math.max(1, cmdTroops(cmd) - res.lost), ...applySlotLosses(c, res.lost),
          tk:destKey, march:null, drawTimer:Date.now()+5*60*1000, drawOrigin:originKey, drawTile:destKey };
      }));
      setBLog(p => [`⚔ DRAW — ${cmd.n} holds position, rematch in 5min · ${res.modLabel}`, ...p].slice(0, 99));
      return;
    }
    // Won vs AI commander — continue to garrison waves below with remaining troops
    const troopsAfterAi = Math.max(0, cmdTroops(cmd) - res.lost);
    const wcAi = Math.floor(res.lost * 0.30);
    if (wcAi > 0) { addWounded(cmd, wcAi); floaty(`🏥 +${wcAi} wounded`, "#88aaff", destKey); }
    floaty("⚔ Commander routed — garrison defends!", "#d0a030", destKey);
    setCmds(p => p.map(c => c.uid === cmd.uid
      ? { ...c, troops:troopsAfterAi, ...applySlotLosses(c, res.lost), ...applyXp(c, Math.round(res.xpGain * (combatXpMult ?? 1)), floaty) }
      : c));
    // Fall through to wave loop with updated troops
  }

  // ── Guardian combat — fight guarding commanders before garrison ─────────
  if (guardedTiles && guardedTiles.has(destKey)) {
    const guardians = guardedTiles.get(destKey); // sorted most recent first
    for (const guardian of guardians) {
      if (!guardian.isGuarding) continue;
      const gres = await runBattle(boostedCmd, cmdTroops(cmd), defTile, wallLvl);
      if (gres.report) {
        const enriched = { ...gres.report, timestamp: Date.now(), cmdCls: cmd.cls,
          passiveSummary: getPassiveBonuses(boostedCmd), atkGearSnapshot, atkSkillsSnapshot, atkBaseStats };
        setBattles(p => [enriched, ...p].slice(0, 99)); setUnseenBattles(n => n + 1);
      }
      if (!gres.won && !gres.isDraw) {
        // Attacker defeated by guardian — retreat using bfsPath
        const stepMs2 = marchStepMs(cmdMarchSpd(cmd, boostedCmd));
        const rp = bfsPath(destKey, hqKey);
        setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c,
          march: rp && rp.length > 1
            ? { type:"retreat", path:rp, step:0, dest:hqKey, origin:destKey, stepMs:stepMs2, startedAt:Date.now(), lastStepTime:Date.now() }
            : null,
          tk: rp && rp.length > 1 ? c.tk : hqKey,
        } : c));
        floaty("💀 Repelled by guardian!", "#cc3030", destKey);
        return;
      }
      // Won — guardian is defeated, remove their guard status
      setCmds(p => p.map(c => c.uid === guardian.uid ? { ...c, isGuarding: false, guardedAt: null } : c));
      floaty(`⚔ Guardian defeated!`, "#d0a030", destKey);
      // remainingTroops is declared below; track losses via a local var for now
    }
  }

  // ── Multi-wave garrison loop ──────────────────────────────────────────────
  // Re-read cmd after potential setCmds above (use snapshot value for troop count).
  const totalWaves   = garrisonWaveCount(defTile);
  const alreadyDone  = [...(defTile.defeatedWaves ?? [])];
  let nextWave       = alreadyDone.length;
  let currentTroops  = cmdTroops(cmd) - (hasAiCmd ? (() => {
    // Recalculate what was lost vs AI cmd; we patched cmds above but cmd is stale.
    // Safe to re-read from the current cmd object passed into forEach.
    return 0; // troops already adjusted via setCmds; we'll read updated value from ref
  })() : 0);
  // Simpler: just use cmdTroops(cmd) and subtract AI losses inline
  // Re-derive: if hasAiCmd, we already applied slot losses to cmd state; use defTile snapshot troops
  // Actually safest: track remaining separately from cmd state
  let remainingTroops = cmdTroops(cmd); // will track across waves
  const newlyDefeated = [...alreadyDone];
  let totalXp = 0;
  let totalWounded = 0;
  let playerDefeated = false;
  let drewOnWave = false;

  for (let wi = nextWave; wi < totalWaves; wi++) {
    if (remainingTroops <= 0) { playerDefeated = true; break; }

    const waveCmd = garrisonWaveDefCmd(defTile, wi, facKey);
    const waveTile = { ...defTile, defCmd: waveCmd };
    const wres = await runBattle({ ...boostedCmd, troops: remainingTroops, troopSlots: cmd.troopSlots
      ? applySlotLosses(cmd, cmdTroops(cmd) - remainingTroops).troopSlots
      : undefined }, remainingTroops, waveTile, wallLvl);

    if (wres.report) {
      const enriched = { ...wres.report, timestamp: Date.now(), cmdCls: cmd.cls,
        passiveSummary: getPassiveBonuses(boostedCmd), atkGearSnapshot, atkSkillsSnapshot, atkBaseStats,
        waveIndex: wi, totalWaves, isWaveBattle: true };
      setBattles(p => [enriched, ...p].slice(0, 99)); setUnseenBattles(n => n + 1);
    }

    if (wres.isDraw) {
      drewOnWave = true;
      remainingTroops = Math.max(1, remainingTroops - wres.lost);
      totalXp += wres.xpGain;
      totalWounded += Math.floor(wres.lost * 0.30);
      // Patch partial progress so it persists through the draw timer
      patchTile(destKey, { defeatedWaves: newlyDefeated, resetAt: Date.now()+garrisonResetMs(defTile) });
      _emitSiege(destKey, { defeatedWaves: newlyDefeated, resetAt: Date.now()+garrisonResetMs(defTile), garrison:defTile.garrison, siegeMax:defTile.siegeMax??SIEGE_BASE, siege:defTile.siege??SIEGE_BASE });
      floaty(`⚔ DRAW on wave ${wi+1}/${totalWaves} — rematch in 5min`, "#c0a020", destKey);
      setBLog(p => [`⚔ DRAW — ${cmd.n} on wave ${wi+1}/${totalWaves}, rematch in 5min · ${wres.modLabel}`, ...p].slice(0, 99));
      break;
    }

    totalXp += wres.xpGain;
    totalWounded += Math.floor(wres.lost * 0.30);

    if (!wres.won) {
      playerDefeated = true;
      remainingTroops = 0;
      // Partial wave progress persists until reset fires
      patchTile(destKey, { defeatedWaves: newlyDefeated, resetAt: Date.now()+garrisonResetMs(defTile) });
      _emitSiege(destKey, { defeatedWaves: newlyDefeated, resetAt: Date.now()+garrisonResetMs(defTile), garrison:defTile.garrison, siegeMax:defTile.siegeMax??SIEGE_BASE, siege:defTile.siege??SIEGE_BASE });
      setBLog(p => [`❌ ${cmd.n} defeated on wave ${wi+1}/${totalWaves} · ${wres.modLabel}`, ...p].slice(0, 99));
      break;
    }

    // Wave won
    remainingTroops = Math.max(0, remainingTroops - wres.lost);
    newlyDefeated.push(wi);
    // Patch each wave win immediately so other players see progress
    patchTile(destKey, { defeatedWaves: [...newlyDefeated], resetAt: Date.now()+garrisonResetMs(defTile) });
    _emitSiege(destKey, { defeatedWaves: [...newlyDefeated], resetAt: Date.now()+garrisonResetMs(defTile), garrison:defTile.garrison, siegeMax:defTile.siegeMax??SIEGE_BASE, siege:defTile.siege??SIEGE_BASE });
    floaty(`⚔ Wave ${wi+1}/${totalWaves} cleared!`, "#3daa60", destKey);
  }

  if (totalWounded > 0) { addWounded(cmd, totalWounded); floaty(`🏥 +${totalWounded} wounded`, "#88aaff", destKey); }

  if (playerDefeated) {
    floaty("💀 DEFEATED — retreating", "#cc3030", destKey);
    setCmds(p => p.map(c => {
      if (c.uid !== cmd.uid) return c;
      const rp = bfsPath(originKey, hqKey);
      const sm = marchStepMs(effectiveMarchSpd(boostedCmd.spd||60, null, boostedCmd.gearBonuses?.armySpd||0));
      let u = { ...c, ...clearSlots(c), tk:originKey, march:null, drawTimer:null, drawTile:null, drawOrigin:null };
      if (rp?.length >= 2) u = { ...u, march:{ type:"move", path:rp, step:0, dest:hqKey, origin:originKey, stepMs:sm, startedAt:Date.now(), lastStepTime:Date.now() } };
      else u = { ...u, tk:hqKey };
      return { ...u, ...applyXp(u, Math.round(totalXp * (combatXpMult ?? 1)), floaty) };
    }));
    return;
  }

  if (drewOnWave) {
    setCmds(p => p.map(c => {
      if (c.uid !== cmd.uid) return c;
      return { ...c, troops:remainingTroops, ...applySlotLosses(c, cmdTroops(cmd) - remainingTroops),
        tk:destKey, march:null,
        drawTimer:Date.now()+5*60*1000, drawOrigin:originKey, drawTile:destKey,
        ...applyXp(c, Math.round(totalXp * (combatXpMult ?? 1)), floaty) };
    }));
    return;
  }

  // All waves cleared — siege phase
  const postLossCmd = { ...cmd, troops:remainingTroops,
    troopSlots: cmd.troopSlots ? applySlotLosses(cmd, cmdTroops(cmd)-remainingTroops).troopSlots : undefined };
  const siegePower = playerSiegePower(cmdSiegePower(postLossCmd, boostedCmd), defTile);
  const attacker   = attackerComposition(postLossCmd, boostedCmd);
  const { captured: tileCaptured, patch: outcomePatch } = resolveSiegeOutcome({
    tile: defTile, siegePower, defeatedWaves: newlyDefeated,
    capture: { defCmd: null, hasAiCommander: false },
  });

  if (tileCaptured) {
    patchTile(destKey, outcomePatch);
    _emitCapture(destKey, outcomePatch, attacker);
    registerProtection?.(destKey);
    trackRegionCapture(defTile, facKey);
    floaty("⚔ CAPTURED!", "#3daa60", destKey);
    if (destKey === WIN_KEY) setWinner("player");
  } else {
    patchTile(destKey, outcomePatch);
    _emitSiege(destKey, outcomePatch, attacker);
    floaty(`🔨 SIEGE ${outcomePatch.siege}/${outcomePatch.siegeMax}`, "#d0a030", destKey);
  }

  const finalTk = tileCaptured ? destKey : originKey;
  setCmds(p => p.map(c => {
    if (c.uid !== cmd.uid) return c;
    const lostTotal = cmdTroops(c) - remainingTroops;
    const updated = { ...c, troops:remainingTroops, ...applySlotLosses(c, lostTotal), tk:finalTk, march:null };
    return { ...updated, ...applyXp(updated, Math.round(totalXp * (combatXpMult ?? 1)), floaty) };
  }));
  setBLog(p => [`✅ ${cmd.n} Lv${cmd.lvl||5} cleared all ${totalWaves} wave(s) ${tileCaptured?"captured":"siege dealt"}`, ...p].slice(0, 99));
});

}, [cmds, screen, tileVersion]);

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

    drawCmds.forEach(async cmd => {
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
      // originKey for a draw is the tile they fought from (drawOrigin)
      if (!hasPlayerFoothold(destKey, cmd.drawOrigin || hqKey, tilesRef.current)) {
        setCmds(p => p.map(c => c.uid === cmd.uid
          ? { ...c, drawTimer:null, drawTile:null, drawOrigin:null } : c));
        floaty("⚠ Foothold lost — draw cancelled", "#cc8030", destKey);
        return;
      }

      // Timer not yet expired
      if (now < cmd.drawTimer) return;

      // ── Timer expired: run rematch inline ────────────────────────────────
      // Guard: if player returned troops between draw and rematch, cancel silently
      if (!cmdTroops(cmd) || cmdTroops(cmd) <= 0) {
        setCmds(p => p.map(c => c.uid === cmd.uid
          ? { ...c, drawTimer:null, drawTile:null, drawOrigin:null } : c));
        return;
      }

      floaty("⚔ REMATCH!", "#c0a020", destKey);

      const wallLvl    = bldgs.walls || 0;
      const boostedCmd = { ...applyGearToCmd(cmd, gearInventory), troopSkillLevels: troopSkillLevels || {} };

      // Build ordered enemy list: AI commanders newest-first, then NPC garrison
      const aiCmdsOnTile = cmdsRef.current
        .filter(c => c.owner === "ai" && c.tk === destKey && !c.march && (c.troops || 0) > 0)
        .sort((a, b) => (b.arrivedAt ?? 0) - (a.arrivedAt ?? 0));

      let remainingTroops = cmdTroops(cmd);
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
        const res = await runBattle({ ...boostedCmd, troops: remainingTroops }, remainingTroops, fightTile, wallLvl);
        if (res.report) {
          const enriched = { ...res.report, timestamp: Date.now(), cmdCls: cmd.cls,
            passiveSummary: getPassiveBonuses(boostedCmd), isRematch: true };
          setBattles(p => [enriched, ...p].slice(0, 99));
          setUnseenBattles(n => n + 1);
        }
        if (res.isDraw) {
          totalWounded += Math.floor(res.lost * 0.30);
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

      // If player is still standing and no new draw, run garrison wave loop from current progress
      if (!playerDefeated && !newDrawTimer && remainingTroops > 0) {
        const totalWaves  = garrisonWaveCount(defTile);
        const doneSoFar   = [...(defTile.defeatedWaves ?? [])];
        const newlyDefeated = [...doneSoFar];

        for (let wi = doneSoFar.length; wi < totalWaves; wi++) {
          if (remainingTroops <= 0) { playerDefeated = true; break; }
          const waveCmd  = garrisonWaveDefCmd(defTile, wi, facKey);
          const waveTile = { ...defTile, defCmd: waveCmd };
          const resG = await runBattle({ ...boostedCmd, troops: remainingTroops }, remainingTroops, waveTile, wallLvl);
          if (resG.report) {
            const enriched = { ...resG.report, timestamp: Date.now(), cmdCls: cmd.cls,
              passiveSummary: getPassiveBonuses(boostedCmd), isRematch: true, isGarrison: true,
              waveIndex: wi, totalWaves, isWaveBattle: true };
            setBattles(p => [enriched, ...p].slice(0, 99));
            setUnseenBattles(n => n + 1);
          }
          if (resG.isDraw) {
            remainingTroops = Math.max(1, remainingTroops - resG.lost);
            totalWounded += Math.floor(resG.lost * 0.30);
            totalXp += resG.xpGain;
            newDrawTimer = Date.now() + 5 * 60 * 1000;
            patchTile(destKey, { defeatedWaves: newlyDefeated, resetAt: Date.now()+garrisonResetMs(defTile) });
            _emitSiege(destKey, { defeatedWaves: newlyDefeated, resetAt: Date.now()+garrisonResetMs(defTile), garrison:defTile.garrison, siegeMax:defTile.siegeMax??SIEGE_BASE, siege:defTile.siege??SIEGE_BASE });
            setBLog(p => [`⚔ DRAW on wave ${wi+1}/${totalWaves} — ${cmd.n} holds, rematch in 5min`, ...p].slice(0, 99));
            break;
          }
          totalWounded += Math.floor(resG.lost * 0.30);
          totalXp      += resG.xpGain;
          if (!resG.won) {
            remainingTroops = 0;
            playerDefeated = true;
            patchTile(destKey, { defeatedWaves: newlyDefeated, resetAt: Date.now()+garrisonResetMs(defTile) });
            _emitSiege(destKey, { defeatedWaves: newlyDefeated, resetAt: Date.now()+garrisonResetMs(defTile), garrison:defTile.garrison, siegeMax:defTile.siegeMax??SIEGE_BASE, siege:defTile.siege??SIEGE_BASE });
            setBLog(p => [`❌ ${cmd.n} defeated on wave ${wi+1}/${totalWaves} in rematch`, ...p].slice(0, 99));
            break;
          }
          remainingTroops = Math.max(0, remainingTroops - resG.lost);
          newlyDefeated.push(wi);
          patchTile(destKey, { defeatedWaves: [...newlyDefeated], resetAt: Date.now()+garrisonResetMs(defTile) });
          _emitSiege(destKey, { defeatedWaves: [...newlyDefeated], resetAt: Date.now()+garrisonResetMs(defTile), garrison:defTile.garrison, siegeMax:defTile.siegeMax??SIEGE_BASE, siege:defTile.siege??SIEGE_BASE });
          floaty(`⚔ Wave ${wi+1}/${totalWaves} cleared!`, "#3daa60", destKey);
        }
      }

      // Apply wounded
      if (totalWounded > 0) {
        addWounded(cmd, totalWounded);
        floaty(`🏥 +${totalWounded} wounded`, "#88aaff", destKey);
      }

      // Evict defeated AI commanders
      if (defeatedAiUids.length) {
        setAiCmds(p => p.map(c => {
          if (!defeatedAiUids.includes(c.uid)) return c;
          const retreatPath = bfsPath(destKey, getAiHqKey(cmd));
          const stepMs = marchStepMs(effectiveMarchSpd(c.spd||60, null));
          if (retreatPath && retreatPath.length >= 2) {
            return { ...c, troops:0, march:{ type:"move", path:retreatPath, step:0, dest:getAiHqKey(cmd), origin:destKey, stepMs, startedAt:Date.now(), lastStepTime:Date.now() } };
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
            updated = { ...updated, march:{ type:"move", path:retreatPath, step:0, dest:hqKey, origin:originKey, stepMs, startedAt:Date.now(), lastStepTime:Date.now() } };
          } else { updated = { ...updated, tk:hqKey }; }
          return { ...updated, ...applyXp(updated, Math.round(totalXp * (combatXpMult ?? 1)), floaty) };
        }));
        return;
      }

      if (newDrawTimer) {
        // Another draw — stay on tile, reset timer
        setCmds(p => p.map(c => c.uid === cmd.uid
          ? { ...c, troops: remainingTroops, drawTimer: newDrawTimer,
              ...applyXp(c, Math.round(totalXp * (combatXpMult ?? 1)), floaty) }
          : c));
        return;
      }

      // Player won all fights — attempt siege/capture
      const rematchCmd = { ...cmd, troops: remainingTroops };
      const siegePower = playerSiegePower(cmdSiegePower(rematchCmd, boostedCmd), defTile);
      const attacker   = attackerComposition(rematchCmd, boostedCmd);
      const outcome = resolveSiegeOutcome({
        tile: defTile, siegePower, defeatedWaves: defTile.defeatedWaves ?? [],
        capture: { defCmd: null, hasAiCommander: false },
      });
      tileCaptured = outcome.captured;
      if (tileCaptured) {
        patchTile(destKey, outcome.patch);
        _emitCapture(destKey, outcome.patch, attacker);
        registerProtection?.(destKey);
        trackRegionCapture(defTile, facKey);
        floaty("⚔ CAPTURED!", "#3daa60", destKey);
        if (destKey === WIN_KEY) setWinner("player");
      } else {
        patchTile(destKey, outcome.patch);
        _emitSiege(destKey, outcome.patch, attacker);
        floaty(`⚔ SIEGE ${outcome.patch.siege}/${outcome.patch.siegeMax}`, "#d0a030", destKey);
      }

      const finalTk = tileCaptured ? destKey : originKey;
      setCmds(p => p.map(c => {
        if (c.uid !== cmd.uid) return c;
        const updated = { ...c, troops:remainingTroops, tk:finalTk, march:null,
          drawTimer:null, drawTile:null, drawOrigin:null };
        return { ...updated, ...applyXp(updated, Math.round(totalXp * (combatXpMult ?? 1)), floaty) };
      }));
      setBLog(p => [`✅ ${cmd.n} ${tileCaptured?"captured":"siege dealt"} after rematch`, ...p].slice(0, 99));
    });
  }, 1000);
  return () => clearInterval(id);
// cmds intentionally omitted — we read cmdsRef.current inside the interval
// so the interval is never torn down/recreated when march steps fire setCmds.
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [screen, cmds, tilesRef, setCmds, floaty, hqKey, bldgs.walls, gearInventory]);

// AI attack arrival
useEffect(() => {
if (screen !== "game") return;
const arrivedAI = cmds.filter(c => c.owner === "ai" && c.march?.arrived && c.march?.type === "attack");
const marchingAI = cmds.filter(c => c.owner === "ai" && c.march && !c.march.arrived);
if (!arrivedAI.length) return;

arrivedAI.forEach(async cmd => {
  const destKey = cmd.tk;
  const defTile = tiles[destKey];
  // Skip if tile is friendly — same owner faction or crewmate player
  const defOwnerPid = defTile?.ownerPlayerId || aiPlayerIdMap?.get(destKey);
  const isProtected = defTile?.protectedUntil && Date.now() < defTile.protectedUntil;
  const isFriendlyTile = !defTile
    || defTile.owner === "player"                              // never attack player tiles
    || defTile.owner === "ai" && defTile.faction === cmd.faction  // same AI faction
    || (defOwnerPid && crewmatePlayerIds?.has(defOwnerPid))   // crewmate
    || isProtected;                                            // tile under protection window
  if (isFriendlyTile) {
    setAiCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null } : c));
    return;
  }
  const aiOriginKey = cmd.march?.origin || getAiHqKey(cmd);
  if (!hasAiFoothold(destKey, aiOriginKey, tiles)) {
    setAiCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null, tk:getAiHqKey(cmd) } : c));
    return;
  }

  const originKey = aiOriginKey;
  const boostedCmd2 = applyGearToCmd(cmd, gearInventory);

  if ((defTile.defeatedWaves?.length ?? 0) >= garrisonWaveCount(defTile)) {
    const siegePower = cmdSiegePower(cmd, boostedCmd2);
    const outcome = resolveSiegeOutcome({
      tile: defTile, siegePower,
      capture: {
        owner: "ai", faction: cmd.faction, ownerPlayerId: cmd.ownerPlayerId || null, protect: false,
        defCmd: { lvl:cmd.lvl||5, troops:Math.floor((cmd.troops||0)*0.6), troopBranch:cmd.troopBranch||{faction:'pirates',branch:'cutthroats',tier:0}, atk:cmd.atk||150, spd:cmd.spd||60 },
      },
    });
    if (outcome.captured) {
      const isPlayerHQ = defTile.isHQ && defTile.owner === "player";
      const isFriendly = cmd.faction === facKey;
      patchTile(destKey, outcome.patch);
      trackRegionCapture(defTile, cmd.faction);
      floaty(isFriendly ? "🤝 Ally captured tile!" : "⚠ ENEMY CAPTURED TILE!", isFriendly ? "#2299ff" : "#dd3322", destKey);
      if (destKey === WIN_KEY) setWinner("ai");
      else if (isPlayerHQ) { if (onForcedRelocate) onForcedRelocate(); else setWinner("ai"); }
      setAiCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null } : c));
    } else {
      patchTile(destKey, outcome.patch);
      setAiCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null, tk:originKey } : c));
    }
    return;
  }

  const wallLvl = defTile.owner === "player" && defTile.isHQ ? (bldgs.walls||0) : 0;
  const aiTroops = cmd.troops || cmdTroops(cmd); // AI uses cmd.troops; player uses slots
  const res = await runBattle(boostedCmd2, aiTroops, defTile, wallLvl);
  const newTroops = res.won ? Math.max(0, aiTroops - res.lost) : 0;
  let tileCaptured = false;

  if (res.won) {
    const siegePower = cmdSiegePower({ ...cmd, troops: newTroops }, boostedCmd2);
    const outcome = resolveSiegeOutcome({
      tile: defTile, siegePower,
      capture: {
        owner: "ai", faction: cmd.faction, ownerPlayerId: cmd.ownerPlayerId || null, protect: false,
        hasAiCommander: true, siegeMax: 300,
        defCmd: { lvl:cmd.lvl||5, troops:Math.floor(newTroops*0.6), troopBranch:cmd.troopBranch||{faction:'pirates',branch:'cutthroats',tier:0}, atk:cmd.atk||150, spd:cmd.spd||60 },
      },
    });
    tileCaptured = outcome.captured;
    patchTile(destKey, outcome.patch);
    if (tileCaptured) {
      const isPlayerHQ = defTile.isHQ && defTile.owner === "player";
      const isFriendly = cmd.faction === facKey;
      trackRegionCapture(defTile, cmd.faction);
      floaty(isFriendly ? "🤝 Ally captured tile!" : "⚠ ENEMY CAPTURED TILE!", isFriendly ? "#2299ff" : "#dd3322", destKey);
      if (destKey === WIN_KEY) setWinner("ai");
      else if (isPlayerHQ) { if (onForcedRelocate) onForcedRelocate(); else setWinner("ai"); }
    }
  }

  const finalTk = tileCaptured ? destKey : originKey;
  setAiCmds(p => p.map(c => {
    if (c.uid !== cmd.uid) return c;
    let updated = { ...c, troops:newTroops, ...applySlotLosses(c, cmdTroops(c) - newTroops), tk:finalTk, march:null, arrivedAt: tileCaptured ? Date.now() : (c.arrivedAt ?? Date.now()) };
    if (!res.won) {
      const retreatPath = bfsPath(finalTk, getAiHqKey(cmd));
      if (retreatPath && retreatPath.length >= 2) {
        const stepMs = marchStepMs(effectiveMarchSpd(c.spd||60, null));
        updated = { ...updated, march:{ type:"move", path:retreatPath, step:0, dest:getAiHqKey(cmd), origin:finalTk, stepMs, startedAt:Date.now(), lastStepTime:Date.now() } };
      } else { updated = { ...updated, tk:getAiHqKey(cmd) }; }
    }
    // Bug 20 fix: use applyXp so AI commanders gain stat growth and Lv25 bonuses, same as player
    return { ...updated, ...applyXp(updated, Math.round(res.xpGain * (combatXpMult ?? 1)), null) };
  }));
  setBLog(p => [`${res.won?"🔴":"✅"} ENEMY ${cmd.n} Lv${cmd.lvl||5} ${res.won?"captured":"repelled"} tile`, ...p].slice(0, 99));
});

}, [cmds, screen, tileVersion, bldgs.walls]);
}
