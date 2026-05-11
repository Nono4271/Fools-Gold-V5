import { useEffect, useRef } from "react";

// ── RSS rates per power level (per hour) ─────────────────────────────────────
// P1: 60/hr of ALL four rss types regardless of tile rss type
// P2: 288/hr of matching rss type only
// P3: 336/hr of matching rss type only
// P4: 432/hr of matching rss type only
// P5: 504/hr of matching rss type only
// P6: 672/hr of matching rss type only
// P7: 768/hr of matching rss type only
const RATE_P1_PER_HR = 60;   // flat, all types
const RATE_BY_PL = { 2: 288, 3: 336, 4: 432, 5: 504, 6: 672, 7: 768 }; // matching type only

// Tick every 60s — one re-render per minute instead of every 2s.
// Per-tick gain = hourly_rate / ticks_per_hour = hourly_rate / 60.
const INTERVAL_MS     = 60_000;
const TICKS_PER_HOUR  = 3600_000 / INTERVAL_MS; // 60

export function useResources({ screen, tilesRef, setRss }) {
  const rssCache     = useRef(null);
  const lastTilesRef = useRef(null);

  useEffect(() => {
    if (screen !== "game") return;

    const id = setInterval(() => {
      // Rebuild cache only when tiles reference changes (ownership flips, etc.)
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
        const cache = rssCache.current || [];
        // Start with zero gain — base income (previously 5/s) is removed;
        // all income now comes from owned rss tiles.
        const gain = { stone: 0, wood: 0, ore: 0, gas: 0 };

        for (const tile of cache) {
          const pl = tile.powerLevel || 1;
          if (pl === 1) {
            // P1: flat 60/hr across all four types
            const perTick = RATE_P1_PER_HR / TICKS_PER_HOUR;
            gain.stone += perTick;
            gain.wood  += perTick;
            gain.ore   += perTick;
            gain.gas   += perTick;
          } else {
            // P2/P3/P4: matching rss type only
            const ratePerHr = RATE_BY_PL[pl] ?? RATE_BY_PL[2];
            gain[tile.rss]  += ratePerHr / TICKS_PER_HOUR;
          }
        }

        const next = {
          stone: Math.min(9_990_000, p.stone + gain.stone),
          wood:  Math.min(9_990_000, p.wood  + gain.wood),
          ore:   Math.min(9_990_000, p.ore   + gain.ore),
          gas:   Math.min(9_990_000, p.gas   + gain.gas),
        };

        // Skip re-render if nothing changed (no tiles owned / all capped)
        if (next.stone === p.stone && next.wood === p.wood &&
            next.ore   === p.ore   && next.gas  === p.gas) return p;
        return next;
      });
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [screen, setRss]);
}
