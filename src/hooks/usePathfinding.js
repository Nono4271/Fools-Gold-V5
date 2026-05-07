// src/hooks/usePathfinding.js
// ─────────────────────────────────────────────────────────────────────────────
// Wraps pathfinding.worker.js in a Promise API so tile-tap dispatch never
// blocks the main thread on large BFS searches through a 700×700 grid.
//
// Usage:
//   const { findPath, findPathBatch, initPathfinding } = usePathfinding();
//
//   // After map gen, seed the worker with impassable keys:
//   initPathfinding(impassableKeys);
//
//   // Fire-and-forget path request — returns a Promise<string[]|null>
//   const path = await findPath(fromKey, toKey);
//
//   // Batch version for AI multi-commander dispatch:
//   const results = await findPathBatch([{requestId:'a', from, to}, ...]);
//
// The worker persists for the lifetime of the component that calls this hook.

import { useEffect, useRef, useCallback } from 'react';

let _nextId = 1;
function nextRequestId() { return String(_nextId++); }

export function usePathfinding() {
  const workerRef  = useRef(null);
  const pendingRef = useRef({}); // requestId → { resolve, reject }

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/pathfinding.worker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      const { type } = e.data;
      if (type === 'pathResult') {
        const p = pendingRef.current[e.data.requestId];
        if (p) { delete pendingRef.current[e.data.requestId]; p.resolve(e.data.path); }
      } else if (type === 'pathResultBatch') {
        for (const { requestId, path } of e.data.results) {
          const p = pendingRef.current[requestId];
          if (p) { delete pendingRef.current[requestId]; p.resolve(path); }
        }
      }
    };

    worker.onerror = (err) => {
      console.error('[pathfinding worker]', err);
      // Reject all pending requests
      Object.values(pendingRef.current).forEach(p => p.reject(err));
      pendingRef.current = {};
    };

    workerRef.current = worker;
    return () => { worker.terminate(); workerRef.current = null; };
  }, []);

  const initPathfinding = useCallback((impassableKeys) => {
    workerRef.current?.postMessage({ type: 'setImpassable', keys: impassableKeys });
  }, []);

  const findPath = useCallback((from, to) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) { resolve(null); return; }
      const requestId = nextRequestId();
      pendingRef.current[requestId] = { resolve, reject };
      workerRef.current.postMessage({ type: 'findPath', requestId, from, to });
    });
  }, []);

  const findPathBatch = useCallback((requests) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) { resolve([]); return; }
      // Each request gets its own pending entry; collect results when all done
      const ids    = [];
      const results = {};
      let   done   = 0;

      const check = () => {
        if (done === ids.length) resolve(ids.map(id => ({ requestId: id, path: results[id] })));
      };

      const tagged = requests.map(r => {
        const requestId = r.requestId || nextRequestId();
        ids.push(requestId);
        pendingRef.current[requestId] = {
          resolve: (path) => { results[requestId] = path; done++; check(); },
          reject,
        };
        return { ...r, requestId };
      });

      workerRef.current.postMessage({ type: 'findPathBatch', requests: tagged });
    });
  }, []);

  return { initPathfinding, findPath, findPathBatch };
}
