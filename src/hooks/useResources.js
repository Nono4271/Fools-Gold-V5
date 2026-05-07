import { useEffect, useRef } from "react";
import { rssRate } from "../../shared/constants/buildings.js";

export function useResources({ screen, tilesRef, bldgs, setRss }) {
  const bldgsRef = useRef(bldgs);
  useEffect(() => { bldgsRef.current = bldgs; }, [bldgs]);

  const rssCache     = useRef(null);
  const lastTilesRef = useRef(null);
  // Accumulate fractional ticks so mobile 2s interval gives same total as 1s on desktop
  const accumRef     = useRef({ stone:0, wood:0, ore:0, gas:0 });

  useEffect(() => {
    if (screen !== "game") return;

    const INTERVAL = 2000; // 2s — halves re-render frequency vs 1s, same total production

    const id = setInterval(() => {
      const t = tilesRef.current;
      if (t !== lastTilesRef.current) {
        lastTilesRef.current = t;
        const cache = [];
        for (const tile of Object.values(t)) {
          if (tile.owner === "player" && tile.rss) cache.push(tile);
        }
        rssCache.current = cache;
      }

      setRss(p => {
        const b     = bldgsRef.current;
        const cache = rssCache.current || [];
        // Scale per-tick gain by INTERVAL/1000 so 2s tick = same rate as two 1s ticks
        const mult  = INTERVAL / 1000;
        const gain  = { stone: 5*mult, wood: 5*mult, ore: 5*mult, gas: 5*mult };
        for (const tile of cache) {
          const bldgKey = tile.rss === "stone" ? "quarry" : tile.rss === "wood" ? "lumber" : tile.rss === "ore" ? "forge" : "refinery";
          gain[tile.rss] += rssRate(b[bldgKey] || 0) * mult;
        }
        const next = {
          stone: Math.min(9990000, p.stone + gain.stone),
          wood:  Math.min(9990000, p.wood  + gain.wood),
          ore:   Math.min(9990000, p.ore   + gain.ore),
          gas:   Math.min(9990000, p.gas   + gain.gas),
        };
        // Skip re-render if nothing changed (all capped)
        if (next.stone === p.stone && next.wood === p.wood &&
            next.ore   === p.ore   && next.gas  === p.gas) return p;
        return next;
      });
    }, INTERVAL);

    return () => clearInterval(id);
  }, [screen, setRss]);
}
