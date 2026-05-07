import { useEffect, useRef } from "react";
import { rssRate } from "../../shared/constants/buildings.js";

export function useResources({ screen, tilesRef, bldgs, setRss }) {
  // tilesRef is the live mutable ref — always current, no sync needed
  const bldgsRef = useRef(bldgs);
  useEffect(() => { bldgsRef.current = bldgs; }, [bldgs]);

  // Cache of player-owned RSS tiles — rebuilt only when tile ownership changes,
  // not on every tick. Avoids iterating all ~490k tiles every second.
  const rssCache = useRef(null);
  const lastTilesRef = useRef(null);

  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      const t = tilesRef.current;
      // Rebuild cache if tiles object reference changed (ownership event)
      if (t !== lastTilesRef.current) {
        lastTilesRef.current = t;
        const cache = [];
        for (const tile of Object.values(t)) {
          if (tile.owner === "player" && tile.rss) cache.push(tile);
        }
        rssCache.current = cache;
      }
      setRss(p => {
        const b = bldgsRef.current;
        const n = { stone: p.stone + 5, wood: p.wood + 5, ore: p.ore + 5, gas: p.gas + 5 };
        const cache = rssCache.current || [];
        for (const tile of cache) {
          const bldgKey = tile.rss === "stone" ? "quarry" : tile.rss === "wood" ? "lumber" : tile.rss === "ore" ? "forge" : "refinery";
          n[tile.rss] += rssRate(b[bldgKey] || 0);
        }
        return {
          stone: Math.min(9990000, n.stone),
          wood:  Math.min(9990000, n.wood),
          ore:   Math.min(9990000, n.ore),
          gas:   Math.min(9990000, n.gas),
        };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [screen, setRss]);
}
