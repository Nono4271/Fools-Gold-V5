import { useEffect, useRef } from "react";
import { dueFortRemovals } from "../../shared/utils/fortRemoval.js";

// Fires fort demolish/abandon when their absolute deadline (fort.removal.endsAt)
// passes. Lives at game level (not in the popup) so it runs whether or not the
// fort panel is open, and re-checks on foreground after a backgrounded tab.
export function useFortRemovals({ screen, forts, demolishFort, abandonFort }) {
  const latest = useRef({ forts, demolishFort, abandonFort });
  latest.current = { forts, demolishFort, abandonFort };
  const firedRef = useRef(new Set());

  useEffect(() => {
    if (screen !== "game") return;
    const check = () => {
      const { forts, demolishFort, abandonFort } = latest.current;
      // Forget ids that are gone so the set can't grow forever.
      const liveIds = new Set(forts.map(f => f.id));
      for (const id of firedRef.current) if (!liveIds.has(id)) firedRef.current.delete(id);
      for (const { fortId, mode } of dueFortRemovals(forts, Date.now())) {
        if (firedRef.current.has(fortId)) continue;
        firedRef.current.add(fortId);
        if (mode === "demolish") demolishFort?.(fortId);
        else abandonFort?.(fortId);
      }
    };
    const id = setInterval(check, 1000);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [screen]);
}
