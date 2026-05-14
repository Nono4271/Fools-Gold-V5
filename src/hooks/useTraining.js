import { useEffect, useRef } from "react";
import { barracksCapacity, trainRate } from "../../shared/constants/buildings.js";

export function useTraining({ screen, bldgs, setTrainingQueue, setTroopCounts, setBarracks, setWounded, woundedQueue, setWoundedQueue }) {

  const bldgsRef        = useRef(bldgs);
  const woundedQueueRef = useRef(woundedQueue);
  useEffect(() => { bldgsRef.current = bldgs; },        [bldgs]);
  useEffect(() => { woundedQueueRef.current = woundedQueue; }, [woundedQueue]);

  // ── Healing tent + queue drain tick ──────────────────────────────────────────
  // Healed troops go back into the shared pool via the legacy setBarracks shim,
  // which proportionally scales all per-type counts. Healed troops don't track
  // their type through the wounded queue, so this is the best we can do.
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      const b   = bldgsRef.current;
      const cap = barracksCapacity(b.barracks || 0);

      const tentLvl = b.healingtent || 0;
      if (tentLvl >= 1) {
        const healRate = tentLvl * 5;
        setWounded(w => {
          if (w <= 0) return 0;
          const healed = Math.min(w, healRate);
          // Use legacy setBarracks shim to add healed troops back proportionally
          setBarracks(pool => {
            const space  = Math.max(0, cap - pool);
            const direct = Math.min(healed, space);
            const queued = healed - direct;
            if (queued > 0) setWoundedQueue(q => q + queued);
            return pool + direct;
          });
          return Math.max(0, w - healed);
        });
      }

      const qNow = woundedQueueRef.current;
      if (qNow > 0) {
        setBarracks(pool => {
          const space = Math.max(0, cap - pool);
          const drain = Math.min(qNow, space);
          if (drain <= 0) return pool;
          setWoundedQueue(q => Math.max(0, q - drain));
          return pool + drain;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [screen, setBarracks, setWounded, setWoundedQueue]);

  // ── Training queue tick ───────────────────────────────────────────────────────
  // trainingQueue now carries { branchKey, remaining, total }
  // Delivered troops go into troopCounts[branchKey].
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      const b = bldgsRef.current;
      setTrainingQueue(q => {
        if (!q) return null;
        const rate       = trainRate(b.training || 0);
        const delivered  = Math.min(q.remaining, rate);
        const newRemaining = q.remaining - delivered;

        if (delivered > 0 && q.branchKey) {
          setTroopCounts(counts => {
            const cap   = barracksCapacity(b.barracks || 0);
            const total = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
            const space = Math.max(0, cap - total);
            const add   = Math.min(delivered, space);
            if (add <= 0) return counts;
            return { ...counts, [q.branchKey]: (counts[q.branchKey] || 0) + add };
          });
        }

        if (newRemaining <= 0) return null;
        return { ...q, remaining: newRemaining };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [screen, setTrainingQueue, setTroopCounts]);
}
