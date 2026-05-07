// src/hooks/useGameLoop.js
// ─────────────────────────────────────────────────────────────────────────────
// Replaces the scattered setInterval calls in Game.jsx, useMarch.js,
// useAI.js, and useResources.js with a single Web Worker (gameLoop.worker.js).
//
// The worker owns all timing; this hook:
//   1. Spawns the worker once and keeps it alive for the session.
//   2. Sends a state snapshot whenever relevant state changes.
//   3. Dispatches each worker message to the correct handler callback.
//
// Callbacks supplied by Game.jsx (same signatures as before, so existing
// logic doesn't change — only the trigger moves off-main-thread):
//   onMarchStep(updates, now)     — apply commander position deltas
//   onDrawTick(expiredUids, now)  — run draw-timer rematch logic
//   onSiegeReset(changedKeys, now)— reset garrison on those tile keys
//   onReinStep(updates, now)      — apply reinforcement convoy deltas
//   onAiRssTick(now)              — increment AI resources
//   onAiMarchCheck(now)           — run AI march decision pass
//   onAiEconTick(now)             — run AI economy pass
//   onTick(now)                   — update nowTick (HUD countdowns)

import { useEffect, useRef } from 'react';

export function useGameLoop({
  screen,
  // snapshot pieces — only the fields the worker needs for timing
  cmds,
  tiles,           // pass tilesRef.current snapshot (shallow copy OK)
  reinMarches,
  aiFaction,
  defeatedTilesRef, // ref to small index { key → { garrisonDefeated, resetAt } }
  // callbacks
  onMarchStep,
  onDrawTick,
  onSiegeReset,
  onReinStep,
  onAiRssTick,
  onAiMarchCheck,
  onAiEconTick,
  onTick,
}) {
  const workerRef   = useRef(null);
  const callbackRef = useRef({});

  // ── Refs for snapshot data ──────────────────────────────────────────────────
  // Store latest values in refs so the snapshot timer always has current data
  // WITHOUT being a reactive dependency that triggers re-renders.
  // This breaks the feedback loop: marchStep → setCmds → snapshot → marchStep.
  const cmdsRef_    = useRef(cmds);
  const tilesRef_   = useRef(tiles);
  const reinRef_    = useRef(reinMarches);
  const factionRef_ = useRef(aiFaction);

  useEffect(() => { cmdsRef_.current    = cmds;        }, [cmds]);
  useEffect(() => { tilesRef_.current   = tiles;       }, [tiles]);
  useEffect(() => { reinRef_.current    = reinMarches; }, [reinMarches]);
  useEffect(() => { factionRef_.current = aiFaction;   }, [aiFaction]);

  // Keep callbacks current without re-creating the worker
  useEffect(() => {
    callbackRef.current = {
      onMarchStep, onDrawTick, onSiegeReset,
      onReinStep, onAiRssTick, onAiMarchCheck, onAiEconTick, onTick,
    };
  });

  // Spawn worker once
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/gameLoop.worker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      const { type } = e.data;
      const cb = callbackRef.current;
      switch (type) {
        case 'marchStep':   cb.onMarchStep?.(e.data.updates, e.data.now);     break;
        case 'drawTick':    cb.onDrawTick?.(e.data.expiredUids, e.data.now);   break;
        case 'siegeReset':  cb.onSiegeReset?.(e.data.changedKeys, e.data.now); break;
        case 'reinStep':    cb.onReinStep?.(e.data.updates, e.data.now);       break;
        case 'aiRssTick':   cb.onAiRssTick?.(e.data.now);                      break;
        case 'aiMarchCheck':cb.onAiMarchCheck?.(e.data.now);                   break;
        case 'aiEconTick':  cb.onAiEconTick?.(e.data.now);                     break;
        case 'tick':        cb.onTick?.(e.data.now);                           break;
        default: break;
      }
    };

    worker.onerror = (err) => {
      console.error('[gameLoop worker]', err);
    };

    worker.postMessage({ type: 'init' });
    workerRef.current = worker;

    return () => {
      worker.postMessage({ type: 'pause' });
      worker.terminate();
      workerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause / resume when screen changes
  useEffect(() => {
    const w = workerRef.current;
    if (!w) return;
    if (screen === 'game') {
      w.postMessage({ type: 'resume' });
    } else {
      w.postMessage({ type: 'pause' });
    }
  }, [screen]);

  // ── Snapshot timer ──────────────────────────────────────────────────────────
  // Send a fresh snapshot to the worker every 500ms using ref values.
  // Previously this was a useEffect with [screen, cmds, tiles, reinMarches, aiFaction]
  // as deps — meaning every march step (100ms) triggered a new snapshot, which went
  // through React's scheduler (r.unstable_scheduleCallback), causing 10 re-renders/sec
  // during normal gameplay and competing directly with touch/pan input.
  //
  // Now: refs always hold current data, timer fires independently of React renders.
  // The worker gets slightly stale data (up to 500ms old) which is fine — it only
  // uses snapshots for timing decisions, not pixel-accurate state.
  useEffect(() => {
    if (screen !== 'game') return;

    function sendSnapshot() {
      const w = workerRef.current;
      if (!w) return;

      const tiles = tilesRef_.current;
      const cmds  = cmdsRef_.current;

      // Lightweight tile snapshot: read directly from the pre-built index
      // instead of scanning all 490,000 tiles. O(defeated) not O(map).
      const tileSnapshot = defeatedTilesRef?.current
        ? { ...defeatedTilesRef.current }
        : {};

      // Commander snapshot: only marching / draw-timer fields
      const cmdSnapshot = cmds
        ? cmds.map(c => ({
            uid:       c.uid,
            owner:     c.owner,
            tk:        c.tk,
            troops:    c.troops,
            drawTimer: c.drawTimer,
            march:     c.march
              ? {
                  type:         c.march.type,
                  path:         c.march.path,
                  step:         c.march.step,
                  stepMs:       c.march.stepMs,
                  lastStepTime: c.march.lastStepTime,
                  arrived:      c.march.arrived,
                }
              : null,
          }))
        : [];

      w.postMessage({
        type: 'snapshot',
        data: {
          screen:      'game',
          cmds:        cmdSnapshot,
          tiles:       tileSnapshot,
          reinMarches: reinRef_.current    || [],
          aiFaction:   factionRef_.current || null,
        },
      });
    }

    // Send immediately on game start, then every 500ms
    sendSnapshot();
    const id = setInterval(sendSnapshot, 500);
    return () => clearInterval(id);
  }, [screen]); // screen only — no reactive state deps
}
