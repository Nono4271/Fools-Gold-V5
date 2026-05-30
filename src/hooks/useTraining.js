import { useEffect, useRef } from "react";
import { barracksCapacity, trainRate, trainingQueueCount } from "../../shared/constants/buildings.js";

export function useTraining({ screen, bldgs, setTrainingQueues, setTroopCounts, setBarracks, setWounded, woundedQueue, setWoundedQueue, trainingSpeedMult = 1 }) {

  const bldgsRef        = useRef(bldgs);
  const woundedQueueRef = useRef(woundedQueue);
  useEffect(() => { bldgsRef.current = bldgs; },               [bldgs]);
  useEffect(() => { woundedQueueRef.current = woundedQueue; }, [woundedQueue]);

  // ── Healing tent + wounded queue drain ────────────────────────────────────
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

  // ── Training queues tick ──────────────────────────────────────────────────
  // trainingQueues: array of { id, branchKey, remaining, total }
  // Each tick delivers trainRate troops split evenly across active queues.
  // Same branchKey can appear in multiple slots.
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      const b = bldgsRef.current;

      setTrainingQueues(queues => {
        if (!queues || queues.length === 0) return queues;

        const rate       = trainRate(b.training || 0) * trainingSpeedMult;
        const perQueue   = Math.max(1, Math.floor(rate / queues.length));
        const cap        = barracksCapacity(b.barracks || 0);

        // Accumulate deliveries per branchKey across all queues this tick
        const deliveries = {}; // branchKey -> amount delivered

        const updated = queues.map(q => {
          const delivered    = Math.min(q.remaining, perQueue);
          const newRemaining = q.remaining - delivered;
          if (delivered > 0 && q.branchKey) {
            deliveries[q.branchKey] = (deliveries[q.branchKey] || 0) + delivered;
          }
          return newRemaining <= 0 ? null : { ...q, remaining: newRemaining };
        }).filter(Boolean);

        // Apply all deliveries to troopCounts in one pass
        if (Object.keys(deliveries).length > 0) {
          setTroopCounts(counts => {
            const total = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
            let space   = Math.max(0, cap - total);
            const next  = { ...counts };
            for (const [bKey, amount] of Object.entries(deliveries)) {
              const add = Math.min(amount, space);
              if (add > 0) {
                next[bKey] = (next[bKey] || 0) + add;
                space -= add;
              }
            }
            return next;
          });
        }

        return updated;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [screen, setTrainingQueues, setTroopCounts]);
}
