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
  cmds,
  tiles,
  reinMarches,
  aiFaction,
  playerFacKey,
  defeatedTilesRef,
  aiTileKeysMapRef,
  aiFactionKeys,
  aiPoolMapRef,
  aiRssMapRef,
  aiBldgsMapRef,
  aiHqKeysRef,
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

  const cmdsRef_    = useRef(cmds);
  const tilesRef_   = useRef(tiles);
  const reinRef_    = useRef(reinMarches);
  const factionRef_ = useRef(aiFaction);
  const playerFacKeyRef_ = useRef(playerFacKey);
  const aiFactionKeysRef_     = useRef(null);
  const aiFactionKeysListRef_ = useRef([]);
  const aiPoolRef_  = useRef({});
  const aiRssRef_   = useRef({});
  const aiBldgsRef_ = useRef({});
  const aiHqKeysRef_= useRef({});

  useEffect(() => { cmdsRef_.current    = cmds;        }, [cmds]);
  useEffect(() => { tilesRef_.current   = tiles;       }, [tiles]);
  useEffect(() => { reinRef_.current    = reinMarches; }, [reinMarches]);
  useEffect(() => { factionRef_.current = aiFaction;       }, [aiFaction]);
  useEffect(() => { playerFacKeyRef_.current = playerFacKey; }, [playerFacKey]);
  useEffect(() => {
    aiFactionKeysRef_.current = aiTileKeysMapRef;
    aiFactionKeysListRef_.current = aiFactionKeys || [];
  }, [aiTileKeysMapRef, aiFactionKeys]);
  useEffect(() => {
    if (!aiPoolMapRef?.current) return;
    const obj = {}; for (const [fk,v] of aiPoolMapRef.current) obj[fk]=v;
    aiPoolRef_.current = obj;
  });
  useEffect(() => {
    if (!aiRssMapRef?.current) return;
    const obj = {}; for (const [fk,v] of aiRssMapRef.current) obj[fk]=v;
    aiRssRef_.current = obj;
  });
  useEffect(() => {
    if (!aiBldgsMapRef?.current) return;
    const obj = {}; for (const [fk,v] of aiBldgsMapRef.current) obj[fk]=v;
    aiBldgsRef_.current = obj;
  });
  useEffect(() => {
    if (!aiHqKeysRef?.current) return;
    aiHqKeysRef_.current = aiHqKeysRef.current;
  });

  useEffect(() => {
    callbackRef.current = {
      onMarchStep, onDrawTick, onSiegeReset,
      onReinStep, onAiRssTick, onAiMarchCheck,
      onAiMarchReady: onAiMarchCheck,
      onAiEconReady: onAiEconTick,
      onAiEconTick, onTick,
    };
  });

  // Spawn worker once
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/gameLoop.worker.js', import.meta.url)
    );

    worker.onmessage = (e) => {
      const { type } = e.data;
      const cb = callbackRef.current;
      switch (type) {
        case 'marchStep':    cb.onMarchStep?.(e.data.updates, e.data.now);      break;
        case 'drawTick':     cb.onDrawTick?.(e.data.expiredUids, e.data.now);    break;
        case 'siegeReset':   cb.onSiegeReset?.(e.data.changedKeys, e.data.now);  break;
        case 'reinStep':     cb.onReinStep?.(e.data.updates, e.data.now);        break;
        case 'aiRssTick':    cb.onAiRssTick?.(e.data.now);                       break;
        case 'aiMarchReady': cb.onAiMarchReady?.(e.data.dispatches, e.data.now); break;
        case 'aiMarchNoCandidate': break;
        case 'aiMarchCheck': cb.onAiMarchCheck?.(e.data.now);                    break;
        case 'aiEconReady':  cb.onAiEconReady?.(e.data.updates, e.data.now);     break;
        case 'aiEconTick':   cb.onAiEconTick?.(e.data.now);                      break;
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

      // Only serialize the player's faction tile keys — that's all we need for testing.
      // Serializing all 8 factions × thousands of tiles every 500ms blocks the main thread.
      const playerFk = playerFacKeyRef_.current;
      const aiTileKeysObj = {};
      if (playerFk && aiFactionKeysRef_.current?.current) {
        const keySet = aiFactionKeysRef_.current.current.get(playerFk);
        if (keySet) aiTileKeysObj[playerFk] = [...keySet];
      }

      // AI commander snapshot — march + econ fields
      const aiCmdSnapshot = cmds
        ? cmds.filter(c => c.owner === 'ai').map(c => ({
            uid:               c.uid,
            faction:           c.faction,
            tk:                c.tk,
            hqKey:             c.hqKey,
            troops:            c.troops || 0,
            march:             c.march ? { type: c.march.type } : null,
            ownerPlayerId:     c.ownerPlayerId || null,
            lvl:               c.lvl || 5,
            unspentSkillPoints: c.unspentSkillPoints || 0,
          }))
        : [];

      w.postMessage({
        type: 'snapshot',
        data: {
          screen:        'game',
          cmds:          cmdSnapshot,
          tiles:         tileSnapshot,
          reinMarches:   reinRef_.current    || [],
          aiFaction:     playerFacKeyRef_.current || null,
          aiCmds:        aiCmdSnapshot,
          aiTileKeys:    aiTileKeysObj,
          aiFactionKeys: aiFactionKeysListRef_.current || [],
          aiPool:        aiPoolRef_.current  || {},
          aiRss:         aiRssRef_.current   || {},
          aiBldgs:       aiBldgsRef_.current || {},
          aiHqKeys:      aiHqKeysRef_.current || {},
          CMD_MARCH_COOLDOWN_MS: 15000,
        },
      });
    }

    // Send immediately on game start, then every 500ms
    sendSnapshot();
    const id = setInterval(sendSnapshot, 2000);
    return () => clearInterval(id);
  }, [screen]); // screen only — no reactive state deps
}
