import { useCallback } from "react";
import { applyXp } from "./useMarch.js";
import { garrisonDefCmd } from "../../shared/utils/garrisonUtils.js";
import { generateSpawnCommander, rollSpawnRssRewards, rollRareDrop, spawnDisplayName } from "../utils/spawnUtils.js";
import { EGG_COST, SWEEP_STAMINA, quickGatherReward, gatherOrder, reconReport, spawnSeed } from "../../shared/utils/tactics.js";

// Tactic actions (Wizard's Tomes): quick gather, recon, gather/training, sweep,
// long/quick march. Rules live in shared/utils/tactics.js.
export function useTactics({
  dragonEggs, setDragonEggs, setRss, setCmds, setBattles, facKey,
  spawns, spawnWorkerRef, staminaMax, runBattle, setMysticOrbs, mysticOrbsCap,
  hasLongMarch, hasQuickMarch, setLongMarchReady, setQuickMarchReady, floaty,
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

  const onSweep = useCallback((spawnKey, cmd) => {
    const spawn = spawns[spawnKey];
    if (!spawn || spawn.defeated) return;
    if (!cmd || (cmd.stamina ?? staminaMax) < SWEEP_STAMINA) return;

    setCmds(prev => prev.map(c => c.uid === cmd.uid
      ? { ...c, stamina: Math.max(0, (c.stamina ?? staminaMax) - SWEEP_STAMINA) } : c));

    const spawnCmd = generateSpawnCommander(spawn.level, facKey, spawnSeed(spawnKey));
    runBattle({
      atkCmd: cmd, defCmd: spawnCmd, destKey: spawnKey, originKey: cmd.tk, isSpawn: true,
      onResult: (res) => {
        // Rolled once so the log shows what was actually credited.
        const rssRewards = res.won ? rollSpawnRssRewards(spawn.level) : [];
        if (res.won) {
          spawnWorkerRef.current?.postMessage({ type: "defeated", spawnKey });
          setCmds(prev => prev.map(c => c.uid !== cmd.uid ? c : { ...c, ...applyXp(c, spawn.xpReward, floaty) }));
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
        setBattles(prev => [{
          type: "sweep", timestamp: Date.now(), spawnKey,
          spawnLevel: spawn.level, spawnName: spawnDisplayName(spawn.level),
          atkName: cmd.n, atkIcon: cmd.icon,
          defCmdName: spawnCmd.n, defCmdIcon: spawnCmd.icon, defLvl: spawnCmd.lvl,
          defTroopBranch: spawnCmd.troopBranch,
          defTroopsStart: spawnCmd.troops * 3, defTroopsEnd: res.won ? 0 : spawnCmd.troops * 3,
          atkTroopsStart: cmd.troops, atkTroopsEnd: res.atkTroopsEnd ?? cmd.troops,
          won: res.won, xpGain: res.won ? spawn.xpReward : 0,
          orbReward: res.won ? spawn.orbReward : 0, rssRewards,
        }, ...prev]);
      },
    });
  }, [spawns, facKey, staminaMax, setCmds, setMysticOrbs, mysticOrbsCap, setRss, setBattles, runBattle, floaty]); // eslint-disable-line react-hooks/exhaustive-deps

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
