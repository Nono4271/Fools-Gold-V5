// src/hooks/useTomes.js
// ─────────────────────────────────────────────────────────────────────────────
// Wizard's Tomes state and power accumulation tick.
// Owns: tomesOpen, tomesLevel, powerPool, tomesUnspentPoints.
// The power tick reads powerPerHrRef (maintained O(1) in patchTile) so it
// never scans tiles.

import { useState, useEffect, useRef } from "react";
import { TOMES_LEVEL_COST, TOMES_MAX_LEVEL } from "../../shared/constants/map.js";
import { tomesPowerTick, TOMES_TICK_MS } from "../../shared/utils/tomes.js";

export function useTomes({ screen, powerPerHrRef }) {
  const [tomesOpen,          setTomesOpen]          = useState(false);
  const [tomesLevel,         setTomesLevel]         = useState(0);
  const [powerPool,          setPowerPool]          = useState(0);
  const [tomesUnspentPoints, setTomesUnspentPoints] = useState(0);

  // ── Power accumulation tick ──────────────────────────────────────────────
  // Fires every 10 s. Reads powerPerHrRef directly — no tile scan, no prop.
  // Gain is scaled by the real time since the last tick (rules in
  // shared/utils/tomes.js), and a catch-up tick runs immediately when the tab
  // returns to the foreground, so backgrounded time is credited, not lost.
  const lastTickRef = useRef(Date.now());
  useEffect(() => {
    if (screen !== "game") return;
    lastTickRef.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;
      if (elapsed <= 0) return;
      const pph = powerPerHrRef.current;
      if (pph <= 0) return;
      setPowerPool(prev => tomesPowerTick(prev, pph, elapsed));
    };
    const id = setInterval(tick, TOMES_TICK_MS);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [screen, powerPerHrRef]);

  return {
    tomesOpen,          setTomesOpen,
    tomesLevel,         setTomesLevel,
    powerPool,          setPowerPool,
    tomesUnspentPoints, setTomesUnspentPoints,
    TOMES_LEVEL_COST,   TOMES_MAX_LEVEL,
  };
}
