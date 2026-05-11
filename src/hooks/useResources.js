import { useEffect, useRef } from "react";
import { rssRate, storageMax } from "../../shared/constants/buildings.js";

// ── RSS rates per power level (per hour) ─────────────────────────────────────
// P1: 60/hr flat all types. P2+: matching rss type only.
const RATE_P1_PER_HR = 60;
const RATE_BY_PL = {
  2:288, 3:336, 4:432, 5:504, 6:672, 7:768,
  8:864, 9:960,
  10:1200, 11:1440, 12:1680, 13:1920,
};

// Base passive income every player gets regardless of tiles or buildings
const BASE_PASSIVE_PER_HR = 200; // +200/hr of all 4 resources

// Tick every 60s — one re-render per minute instead of every 2s.
// Per-tick gain = hourly_rate / ticks_per_hour = hourly_rate / 60.
const INTERVAL_MS     = 60_000;
const TICKS_PER_HOUR  = 3600_000 / INTERVAL_MS; // 60

// RSS building keys in order matching resources
const RSS_BLDG_KEYS = { stone: "quarry", wood: "lumber", ore: "forge", gas: "refinery" };

export function useResources({ screen, tilesRef, setRss, bldgs }) {
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

        // Base passive income: +200/hr of all 4 resources
        const basePerTick = BASE_PASSIVE_PER_HR / TICKS_PER_HOUR;
        const gain = {
          stone: basePerTick,
          wood:  basePerTick,
          ore:   basePerTick,
          gas:   basePerTick,
        };

        // Building production (quarry, lumber, forge, refinery)
        for (const [rssKey, bldgKey] of Object.entries(RSS_BLDG_KEYS)) {
          const lvl = (bldgs && bldgs[bldgKey]) || 0;
          if (lvl > 0) {
            gain[rssKey] += rssRate(lvl) / TICKS_PER_HOUR;
          }
        }

        // Tile production
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
            // P2+ matching rss type only
            const ratePerHr = RATE_BY_PL[pl] ?? RATE_BY_PL[2];
            gain[tile.rss]  += ratePerHr / TICKS_PER_HOUR;
          }
        }

        // Storage cap from storage building level
        const cap = storageMax((bldgs && bldgs.storage) || 0);

        const next = {
          stone: Math.min(cap, p.stone + gain.stone),
          wood:  Math.min(cap, p.wood  + gain.wood),
          ore:   Math.min(cap, p.ore   + gain.ore),
          gas:   Math.min(cap, p.gas   + gain.gas),
        };

        // Skip re-render if nothing changed (no income / all capped)
        if (next.stone === p.stone && next.wood === p.wood &&
            next.ore   === p.ore   && next.gas  === p.gas) return p;
        return next;
      });
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [screen, setRss, bldgs]);
}

