import { useEffect, useRef } from "react";
import { barracksCapacity, trainRate } from "../../shared/constants/buildings.js";

export function useTraining({ screen, bldgs, setTrainingQueue, setBarracks, setWounded, woundedQueue, setWoundedQueue }) {

  // Refs so the interval always reads current values without re-subscribing
  const bldgsRef         = useRef(bldgs);
  const woundedQueueRef  = useRef(woundedQueue);
  useEffect(() => { bldgsRef.current = bldgs; },        [bldgs]);
  useEffect(() => { woundedQueueRef.current = woundedQueue; }, [woundedQueue]);

  // ── Healing tent + queue drain tick ──────────────────────────────────────────
  // Every second:
  //   1. Heal up to (tentLvl * 5) wounded troops → move them out of woundedTroops.
  //      Healed troops that fit in the pool go straight in; the rest enter woundedQueue.
  //   2. Drain woundedQueue into pool whenever capacity is available.
  //      This runs even when there is no healing tent, so queued troops re-enter
  //      the moment the player reassigns or loses troops and space opens up.
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      const b   = bldgsRef.current;
      const cap = barracksCapacity(b.barracks || 0);

      // Step 1 — heal wounded if tent exists
      const tentLvl = b.healingtent || 0;
      if (tentLvl >= 1) {
        const healRate = tentLvl * 5;
        setWounded(w => {
          if (w <= 0) return 0;
          const healed = Math.min(w, healRate);
          // Dump healed troops into pool; overflow → queue
          setBarracks(pool => {
            const space  = Math.max(0, cap - pool);
            const direct = Math.min(healed, space);
            const queued = healed - direct;
            if (queued > 0) {
              setWoundedQueue(q => q + queued);
            }
            return pool + direct;
          });
          return Math.max(0, w - healed);
        });
      }

      // Step 2 — drain queue into pool as space opens up
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
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      const b = bldgsRef.current;
      setTrainingQueue(q => {
        if (!q) return null;
        const rate        = trainRate(b.training || 0);
        const delivered   = Math.min(q.remaining, rate);
        const newRemaining = q.remaining - delivered;
        setBarracks(pool => Math.min(barracksCapacity(b.barracks || 0), pool + delivered));
        if (newRemaining <= 0) return null;
        return { ...q, remaining: newRemaining };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [screen, setTrainingQueue, setBarracks]);
}
