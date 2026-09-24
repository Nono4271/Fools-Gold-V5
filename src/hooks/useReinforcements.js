import { useCallback, useEffect } from "react";
import { HQP } from "../../shared/constants/map.js";
import { barracksCommandCapacity, cmdCommand } from "../../shared/constants/buildings.js";
import { normaliseTroopSlots } from "../../shared/utils/pathfinding.js";
import { returnToBarracksCmds as returnToBarracks, reinforcementSourceKey, reinforcementAborted, stepReinforcement, mergeReinforcement, reinforcementStepMs, withdrawFromArmy } from "../../shared/utils/reinforcements.js";

// Reinforcement marches: send barracks troops to a field commander.
// Rules live in shared/utils/reinforcements.js.
export function useReinforcements({
  screen, playerHqRef, cmdsRef, tilesRef, setReinMarches, setTroopCounts, setPlayerCmds,
  bldgs, findPath, floaty, applyAllBonuses, gearInventory, reinSpeedMult, troopCounts,
  setMode, setReinCmd, setSliderVals,
}) {
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      const now = Date.now();
      // Read every tick so a relocated HQ is used (was fixed at effect start).
      const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
      const barracksCap = barracksCommandCapacity(bldgs.barracks || 0);
      setReinMarches(prev => {
        if (!prev.length) return prev;
        const next = [];
        prev.forEach(rm => {
          if (!rm.path || rm.path.length === 0) return;
          const destKey = rm.path[rm.path.length - 1];
          const targetCmd = cmdsRef.current.find(c => c.uid === rm.cmdUid && c.owner === "player");
          if (reinforcementAborted(rm, targetCmd, tilesRef.current[destKey], hqKey)) {
            // Path home is found off-thread; the march is re-added when it resolves.
            const currentPos = rm.path[Math.min(rm.step, rm.path.length - 1)] ?? hqKey;
            const capturedRm = { ...rm };
            findPath(currentPos, hqKey).then(returnPath => {
              if (returnPath && returnPath.length >= 2) {
                setReinMarches(cur => cur.map(r => r.uid === capturedRm.uid
                  ? { ...r, returning: true, path: returnPath, step: 0, lastStepTime: Date.now() } : r));
              } else {
                setReinMarches(cur => cur.filter(r => r.uid !== capturedRm.uid));
                setTroopCounts(counts => returnToBarracks(counts, capturedRm.branchKey, capturedRm.amount, barracksCap));
              }
            });
            floaty(`⚠ Reinforcements redirected to base`, "#cc8030", currentPos);
            return;
          }
          const s = stepReinforcement(rm, now);
          if (s.state !== "arrived") { next.push(s.rm); return; }
          if (rm.returning) {
            setTroopCounts(counts => returnToBarracks(counts, rm.branchKey, rm.amount, barracksCap));
            floaty(`🏰 ${rm.amount} reinforcements returned to barracks`, "#88aaff", hqKey);
            return;
          }
          setPlayerCmds(cmds => cmds.map(c => {
            if (c.uid !== rm.cmdUid) return c;
            const merged = mergeReinforcement(c, rm.branchKey, rm.amount, cmdCommand(c.lvl || 5, bldgs.commandcenter || 0, c.commandBonus ?? 0));
            if (merged.overflow > 0) {
              setTroopCounts(counts => returnToBarracks(counts, rm.branchKey, merged.overflow, barracksCap));
              floaty(`↩ ${merged.overflow} troops returned (cmd full)`, "#88aaff", destKey);
            }
            return merged.cmd;
          }));
          floaty(`+${rm.amount} reinforcements arrived!`, "#88aaff", destKey);
        });
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [screen, floaty, bldgs.barracks, bldgs.commandcenter, findPath]); // eslint-disable-line react-hooks/exhaustive-deps

  const startReinforcement = useCallback((cmd, amount) => {
    if (!cmd || amount <= 0) return;
    const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    // Use the shared formula so the actual timer matches what BottomPanel displays.
    const stepMs = reinforcementStepMs(cmd, applyAllBonuses(cmd, gearInventory).spd, reinSpeedMult);
    setMode("view"); setReinCmd(null);
    setSliderVals(v => ({ ...v, [`rein_${cmd.uid}`]: undefined }));
    findPath(hqKey, cmd.tk).then(path => {
      if (!path || path.length < 2) return;
      setReinMarches(prev => {
        if (prev.some(r => r.cmdUid === cmd.uid && !r.returning)) return prev;
        const srcKey = reinforcementSourceKey(cmd);
        const sent = srcKey ? Math.min(amount, troopCounts[srcKey] || 0) : 0;
        if (sent <= 0) return prev;
        setTroopCounts(counts => ({ ...counts, [srcKey]: Math.max(0, (counts[srcKey] || 0) - sent) }));
        return [...prev, { uid:`rein_${Date.now()}`, cmdUid:cmd.uid, amount:sent, branchKey:srcKey, path, step:0, stepMs, startedAt:Date.now(), lastStepTime:Date.now() }];
      });
    });
  }, [gearInventory, reinSpeedMult, findPath, troopCounts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pull troops out of a specific slot and march them home as a returning convoy.
  const startWithdrawal = useCallback((cmd, slotIndex, amount) => {
    if (!cmd || amount <= 0) return;
    const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    setPlayerCmds(cmds => cmds.map(c => {
      if (c.uid !== cmd.uid) return c;
      const { cmd: updated, withdrawn, branchKey } = withdrawFromArmy(c, slotIndex, amount);
      if (withdrawn <= 0) return c;
      const stepMs = reinforcementStepMs(c, applyAllBonuses(c, gearInventory).spd, reinSpeedMult);
      findPath(c.tk, hqKey).then(path => {
        if (!path || path.length < 2) {
          // Can't path home — just return to barracks immediately.
          const barracksCap = barracksCommandCapacity(bldgs.barracks || 0);
          setTroopCounts(counts => returnToBarracks(counts, branchKey, withdrawn, barracksCap));
          return;
        }
        setReinMarches(prev => [
          ...prev,
          { uid:`rein_${Date.now()}`, cmdUid:cmd.uid, amount:withdrawn, branchKey, path, step:0, stepMs, returning:true, startedAt:Date.now(), lastStepTime:Date.now() }
        ]);
      });
      return updated;
    }));
    setMode("view"); setReinCmd(null);
  }, [gearInventory, reinSpeedMult, bldgs.barracks, findPath]); // eslint-disable-line react-hooks/exhaustive-deps

  return { startReinforcement, startWithdrawal };
}
