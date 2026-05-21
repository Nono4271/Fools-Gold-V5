// src/hooks/useTomes.js
// ─────────────────────────────────────────────────────────────────────────────
// Wizard's Tomes state and power accumulation tick.
// Owns: tomesOpen, tomesLevel, powerPool, tomesUnspentPoints.
// The power tick reads powerPerHrRef (maintained O(1) in patchTile) so it
// never scans tiles.

import { useState, useEffect } from "react";
import { TOMES_LEVEL_COST, TOMES_MAX_LEVEL } from "../../shared/constants/map.js";

export function useTomes({ screen, powerPerHrRef }) {
  const [tomesOpen,          setTomesOpen]          = useState(false);
  const [tomesLevel,         setTomesLevel]         = useState(0);
  const [powerPool,          setPowerPool]          = useState(0);
  const [tomesUnspentPoints, setTomesUnspentPoints] = useState(0);

  // ── Power accumulation tick ──────────────────────────────────────────────
  // Fires every 10 s. Reads powerPerHrRef directly — no tile scan, no prop.
  // 1/360th of the hourly rate per 10-second tick.
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      const pph = powerPerHrRef.current;
      if (pph <= 0) return;
      setPowerPool(prev => prev + pph / 360);
    }, 10_000);
    return () => clearInterval(id);
  }, [screen, powerPerHrRef]);

  return {
    tomesOpen,          setTomesOpen,
    tomesLevel,         setTomesLevel,
    powerPool,          setPowerPool,
    tomesUnspentPoints, setTomesUnspentPoints,
    TOMES_LEVEL_COST,   TOMES_MAX_LEVEL,
  };
}
