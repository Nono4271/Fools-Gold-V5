// src/hooks/useBattle.js
// ─────────────────────────────────────────────────────────────────────────────
// Wraps battle.worker.js in a Promise API so simBattle never blocks the main
// thread. Uses Vite's ?worker import so the worker is bundled as a fully
// isolated module — no shared chunks with the main bundle, no TDZ risk.

import { useEffect, useRef, useCallback } from "react";
import BattleWorker from "../workers/battle.worker.js?worker";

let _nextId = 1;
function nextRequestId() { return String(_nextId++); }

export function useBattle() {
  const workerRef  = useRef(null);
  const pendingRef = useRef({}); // requestId → { resolve, reject }

  useEffect(() => {
    const worker = new BattleWorker();

    worker.onmessage = (e) => {
      const { type, requestId, result, error } = e.data;
      if (type !== "battleResult") return;
      const p = pendingRef.current[requestId];
      if (!p) return;
      delete pendingRef.current[requestId];
      if (error) { p.reject(new Error(error)); }
      else        { p.resolve(result); }
    };

    worker.onerror = (err) => {
      console.error("[battle worker]", err);
      Object.values(pendingRef.current).forEach(p => p.reject(err));
      pendingRef.current = {};
    };

    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
      Object.values(pendingRef.current).forEach(p =>
        p.reject(new Error("battle worker terminated"))
      );
      pendingRef.current = {};
    };
  }, []);

  const runBattle = useCallback((cmd, attackerTroops, defTile, wallLvl) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error("battle worker not ready"));
        return;
      }
      const requestId = nextRequestId();
      pendingRef.current[requestId] = { resolve, reject };
      workerRef.current.postMessage({
        type: "simBattle",
        requestId,
        cmd,
        attackerTroops,
        defTile,
        wallLvl,
      });
    });
  }, []);

  return { runBattle };
}
