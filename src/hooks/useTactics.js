import { useCallback } from "react";
import { applyXp } from "./useMarch.js";
import { garrisonDefCmd } from "../../shared/utils/garrisonUtils.js";
import { generateSpawnCommander, rollSpawnRssRewards, rollRareDrop, spawnDisplayName } from "../utils/spawnUtils.js";
import { EGG_COST, SWEEP_STAMINA, quickGatherReward, gatherOrder, reconReport, spawnSeed, spawnDefTile, sweepTroopLosses } from "../../shared/utils/tactics.js";
import { applyGearToCmd } from "../../shared/utils/gearStats.js";
import { normaliseTroopSlots } from "../../shared/utils/pathfinding.js";

// Remove `lost` troops proportionally across a commander's slots (same rule
// useMarch.js's applySlotLosses uses), or from its legacy single troop count.
function sweepApplyLosses(cmd, lost) {
  if (!(lost > 0)) return cmd;
  if (cmd.troopSlots?.length) {
    const total = cmd.troopSlots.reduce((n, sl) => n + (sl.troops || 0), 0);
    const frac = total > 0 ? Math.min(1, lost / total) : 0;
    return { ...cmd, troopSlots: cmd.troopSlots.map(sl => ({ ...sl, troops: Math.max(0, Math.round((sl.troops || 0) * (1 - frac))) })) };
  }
  return { ...cmd, troops: Math.max(0, (cmd.troops || 0) - lost) };
}

// Tactic actions (Wizard's Tomes): quick gather, recon, gather/training, sweep,
// long/quick march. Rules live in shared/utils/tactics.js.
export function useTactics({
  dragonEggs, setDragonEggs, setRss, setCmds, setBattles, facKey,
  spawns, spawnWorkerRef, staminaMax, runBattle, setMysticOrbs, mysticOrbsCap,
  hasLongMarch, hasQuickMarch, setLongMarchReady, setQuickMarchReady, floaty,
  gearInventory, troopSkillLevels, tilesMapRef, addWounded,
  crewPveDmgMult = 0, crewSpawnDmgMult = 0,
}) {
  const onQuickGather = useCallback((tileKey, tile) => {
    const reward = quickGatherReward(tile, dragonEggs);
    if (!reward) return;
    setDragonEggs(e => Math.max(0, e - EGG_COST.quickGather));
    setRss(p => ({ ...p, [reward.rss]: p[reward.rss] + reward.amount }));
  }, [dragonEggs, setRss]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRecon = useCallback((tileKey, tile) => {
    setBattles(prev => [reconReport(tileKey, tile, garrisonDefCmd(tile, facKey), Date.now()), ...prev]);
  }, [facKey, setBattles]);

  const onGather = useCallback((tileKey, tile, cmdUid, ticks, isTraining = false) => {
    if ((dragonEggs ?? 0) < (isTraining ? EGG_COST.training : EGG_COST.gather)) return;
    const order = gatherOrder(tileKey, ticks, isTraining, Date.now());
    setCmds(prev => prev.map(c => c.uid === cmdUid ? { ...c, ...order } : c));
  }, [dragonEggs, setCmds]);

  // Sweep a Spawn army. Previously called runBattle({ atkCmd, defCmd, ... })
  // — an object that doesn't match runBattle(cmd, attackerTroops, defTile,
  // wallLvl) — and never awaited it, so the worker threw on the missing
  // defTile and no fight/reward ever happened (stamina was still spent).
  // Now builds a real defTile (shared/utils/tactics.js spawnDefTile) and
  // awaits the result like every useMarch.js battle does.
  const onSweep = useCallback(async (spawnKey, cmd) => {
    const spawn = spawns[spawnKey];
    if (!spawn || spawn.defeated) return;
    if (!cmd || (cmd.stamina ?? staminaMax) < SWEEP_STAMINA) return;
    const slots = normaliseTroopSlots(cmd);
    const troops = slots.length ? slots.reduce((n, sl) => n + (sl.troops || 0), 0) : (cmd.troops || 0);
    if (troops < 1) { floaty?.("⚠ Assign troops first!", "#cc8030", cmd.tk); return; }

    setCmds(prev => prev.map(c => c.uid === cmd.uid
      ? { ...c, stamina: Math.max(0, (c.stamina ?? staminaMax) - SWEEP_STAMINA) } : c));

    const spawnCmd = generateSpawnCommander(spawn.level, facKey, spawnSeed(spawnKey));
    const defTile = spawnDefTile(spawnCmd, tilesMapRef?.current?.[spawnKey]);
    const boostedCmd = {
      ...applyGearToCmd(cmd, gearInventory || []),
      troopSkillLevels: troopSkillLevels || {},
      crewPveDmgMult, crewSpawnDmgMult,
    };
    let res;
    try { res = await runBattle(boostedCmd, troops, defTile, 0); }
    catch (err) { console.error("[sweep]", err); floaty?.("⚠ Sweep failed", "#cc3030", cmd.tk); return; }

    const { lost, wounded } = sweepTroopLosses(res, troops);
    if (wounded > 0) addWounded?.(cmd, wounded);
    const rssRewards = res.won ? rollSpawnRssRewards(spawn.level) : [];
    setCmds(prev => prev.map(c => {
      if (c.uid !== cmd.uid) return c;
      const next = sweepApplyLosses(c, lost);
      return res.won ? { ...next, ...applyXp(next, spawn.xpReward, floaty) } : next;
    }));
    if (res.won) {
      spawnWorkerRef.current?.postMessage({ type: "defeated", spawnKey });
      setMysticOrbs(prev => Math.min(mysticOrbsCap, prev + spawn.orbReward));
      setRss(prev => {
        const next = { ...prev };
        rssRewards.forEach(({ rss, amount }) => { next[rss] = (next[rss] ?? 0) + amount; });
        return next;
      });
      // Rare drop — TODO: add to inventory when item system built
      const rareDrop = rollRareDrop(spawn.level);
      if (rareDrop) floaty(`✨ ${rareDrop.label}!`, "#e0c040", cmd.tk);
    }
    floaty?.(res.won ? "💀 Spawn swept!" : "❌ Sweep failed", res.won ? "#e0c040" : "#cc3030", cmd.tk);
    const defTroopsStart = spawnCmd.slots.reduce((n, sl) => n + sl.troops, 0);
    setBattles(prev => [{
      ...(res.report || {}),
      type: "sweep", timestamp: Date.now(), spawnKey,
      spawnLevel: spawn.level, spawnName: spawnDisplayName(spawn.level),
      atkName: cmd.n, atkIcon: cmd.icon,
      defCmdName: spawnCmd.n, defCmdIcon: spawnCmd.icon, defLvl: spawnCmd.lvl,
      defTroopBranch: spawnCmd.troopBranch,
      defTroopsStart, defTroopsEnd: res.won ? 0 : defTroopsStart,
      atkTroopsStart: troops, atkTroopsEnd: Math.max(0, troops - lost),
      won: res.won, xpGain: res.won ? spawn.xpReward : 0,
      orbReward: res.won ? spawn.orbReward : 0, rssRewards,
    }, ...prev]);
  }, [spawns, facKey, staminaMax, setCmds, setMysticOrbs, mysticOrbsCap, setRss, setBattles, runBattle, floaty, gearInventory, troopSkillLevels, addWounded, crewPveDmgMult, crewSpawnDmgMult]); // eslint-disable-line react-hooks/exhaustive-deps

  const onLongMarch = useCallback(() => {
    if (!hasLongMarch || (dragonEggs ?? 0) < EGG_COST.longMarch) return;
    setDragonEggs(e => Math.max(0, e - EGG_COST.longMarch));
    setLongMarchReady(true);
  }, [hasLongMarch, dragonEggs]); // eslint-disable-line react-hooks/exhaustive-deps

  const onQuickMarch = useCallback(() => {
    if (!hasQuickMarch || (dragonEggs ?? 0) < EGG_COST.quickMarch) return;
    setDragonEggs(e => Math.max(0, e - EGG_COST.quickMarch));
    setQuickMarchReady(true);
  }, [hasQuickMarch, dragonEggs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { onQuickGather, onRecon, onGather, onSweep, onLongMarch, onQuickMarch };
}
