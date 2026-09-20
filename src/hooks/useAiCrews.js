import { useEffect } from "react";
import { aiCrewTick } from "../../shared/utils/aiCrews.js";

export const AI_CREW_TICK_MS = 30_000;

// AI players found/join crews every 30s. Rules live in shared/utils/aiCrews.js.
export function useAiCrews({ screen, mapReady, setCrews, aiPlayerIdMapRef, aiFoundersRef, aiGemsRef }) {
  useEffect(() => {
    if (screen !== "game" || !mapReady) return;
    const id = setInterval(() => {
      setCrews(prevCrews => {
        const r = aiCrewTick({
          crews: prevCrews,
          aiPlayerIds: [...aiPlayerIdMapRef.current.values()],
          founders: aiFoundersRef.current,
          gemsOf: pid => aiGemsRef.current.get(pid),
          now: Date.now(),
        });
        for (const [pid, g] of Object.entries(r.gems)) aiGemsRef.current.set(pid, g);
        return r.crews;
      });
    }, AI_CREW_TICK_MS);
    return () => clearInterval(id);
  }, [screen, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps
}
