// src/hooks/useVoidTap.js
// ─────────────────────────────────────────────────────────────────────────────
// Void Tap state and action.
// Owns: mysticOrbs, lastVoidTap.
// Derives: mysticOrbsCap, voidTapCooldown, voidTapReady.
// Exposes: doVoidTap().

import { useState, useCallback } from "react";
import { voidTapCapacity, voidTapCooldownMs, voidTapYield } from "../../shared/constants/buildings.js";

export function useVoidTap({ bldgs, quarterLevels, facMasteryOrbMult = 1 }) {
  const [mysticOrbs,  setMysticOrbs]  = useState(0);
  const [lastVoidTap, setLastVoidTap] = useState(null);

  const voidTapLvl      = bldgs.voidtap || 0;
  const mysticOrbsCap   = voidTapLvl > 0 ? voidTapCapacity(voidTapLvl) : 10000;
  const voidTapCooldown = voidTapLvl > 0 ? voidTapCooldownMs(voidTapLvl) : voidTapCooldownMs(1);
  const voidTapReady    = voidTapLvl > 0
    && mysticOrbs < mysticOrbsCap
    && (lastVoidTap === null || Date.now() - lastVoidTap >= voidTapCooldown);

  const doVoidTap = useCallback(() => {
    if (!voidTapReady) return;
    const gain = Math.round(voidTapYield(quarterLevels) * facMasteryOrbMult);
    setMysticOrbs(prev => Math.min(mysticOrbsCap, prev + gain));
    setLastVoidTap(Date.now());
  }, [voidTapReady, quarterLevels, mysticOrbsCap]);

  return {
    mysticOrbs,    setMysticOrbs,
    lastVoidTap,   setLastVoidTap,
    mysticOrbsCap,
    voidTapLvl,
    voidTapCooldown,
    voidTapReady,
    doVoidTap,
  };
}
