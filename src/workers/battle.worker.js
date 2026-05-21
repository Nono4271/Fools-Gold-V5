// ── Battle Worker ──────────────────────────────────────────────────────────────
// Runs simBattle off the main thread so battle resolution never blocks touch
// input or map panning.
//
// Message protocol:
//   main → worker: { type: 'simBattle', requestId: string, cmd, attackerTroops, defTile, wallLvl }
//   worker → main: { type: 'battleResult', requestId: string, result }
//
// The worker is a pure function — no state between calls. It imports battle.js
// directly (shared/constants/* have no DOM dependencies).

import { simBattle } from "../../shared/utils/battle.js";

self.onmessage = function(e) {
  const { type, requestId, cmd, attackerTroops, defTile, wallLvl } = e.data;
  if (type !== "simBattle") return;

  let result;
  try {
    result = simBattle(cmd, attackerTroops, defTile, wallLvl);
  } catch (err) {
    // Surface errors back to main thread so Promises reject cleanly
    self.postMessage({ type: "battleResult", requestId, error: String(err) });
    return;
  }

  self.postMessage({ type: "battleResult", requestId, result });
};
