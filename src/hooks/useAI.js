import { useEffect, useCallback } from "react";
import { FACTION_TROOPS, FACTION_KEYS } from "../../shared/constants/troops.js";
import { barracksCapacity, maxAvailLevel, upgCost, cmdCommand, rssRate } from "../../shared/constants/buildings.js";
import { AI_HQ_KEY, WIN_C, WIN_R } from "../../shared/constants/map.js";
import { adj, bfsPath, effectiveMarchSpd, marchStepMs } from "../../shared/utils/pathfinding.js";
import { getBranchMainSkill, getBranchSideSkills } from "../../shared/constants/skills.js";

export function useAI({
screen, aiFaction,
cmdsRef, tilesRef, aiRssRef, aiBldgsRef, aiPoolRef, aiLastActionRef,
aiTileKeysRef,
setCmds, setAiRss, setAiBldgs, setAiBarracksPool,
}) {

// ── AI resource tick (1s) ─────────────────────────────────────────────────
// Called by useGameLoop's onAiRssTick — no setInterval here.
const tickAiRss = useCallback(() => {
  if (!aiFaction) return;
  setAiRss(p => {
    const n = { stone: p.stone + 5, wood: p.wood + 5, ore: p.ore + 5, gas: p.gas + 5 };
    // Use aiTileKeysRef index — O(AI tiles) not O(490k map).
    const tiles = tilesRef.current;
    const bldgs = aiBldgsRef.current;
    for (const k of (aiTileKeysRef?.current || [])) {
      const t = tiles[k];
      if (t && t.rss) {
        const bldgForRss = t.rss === "stone" ? "quarry" : t.rss === "wood" ? "lumber" : t.rss === "ore" ? "forge" : "refinery";
        n[t.rss] += rssRate(bldgs[bldgForRss] || 0);
      }
    }
    return {
      stone: Math.min(9990000, n.stone),
      wood:  Math.min(9990000, n.wood),
      ore:   Math.min(9990000, n.ore),
      gas:   Math.min(9990000, n.gas),
    };
  });
}, [aiFaction, setAiRss, tilesRef, aiBldgsRef, aiTileKeysRef]);

// ── AI march decision (3s, throttled to 45s gap) ──────────────────────────
// Called by useGameLoop's onAiMarchCheck — no setInterval here.
const tickAiMarch = useCallback(() => {
  if (!aiFaction) return;
  const now = Date.now();
  if (now - aiLastActionRef.current < 45000) return;

  const curCmds  = cmdsRef.current;
  const curTiles = tilesRef.current;
  const aiCmds   = curCmds.filter(c => c.owner === "ai");
  // Use pre-built index — O(1) instead of O(490k tiles)
  const aiTileKeys = aiTileKeysRef?.current || new Set();

  const idleWithTroops = aiCmds.filter(c => !c.march && (c.troops || 0) > 0);
  for (const cmd of idleWithTroops) {
    const [cc, cr] = cmd.tk.split(",").map(Number);
    const adjTiles = adj(cc, cr).filter(k => !aiTileKeys.has(k) && curTiles[k]);
    if (!adjTiles.length) continue;
    const target = adjTiles.reduce((best, k) => {
      const [tc, tr] = k.split(",").map(Number);
      const d = Math.abs(tc - WIN_C) + Math.abs(tr - WIN_R);
      return d < best.d ? { k, d } : best;
    }, { k: null, d: Infinity });
    if (!target.k) continue;
    const path = bfsPath(cmd.tk, target.k);
    if (!path || path.length < 2) continue;
    const stepMs = marchStepMs(effectiveMarchSpd(cmd.spd || 60, cmd.troopBranch));
    setCmds(p => p.map(c => c.uid === cmd.uid
      ? { ...c, march: { type:"attack", path, step:0, dest:target.k, origin:cmd.tk, stepMs, lastStepTime:now } }
      : c));
    aiLastActionRef.current = now;
    return;
  }
}, [aiFaction, cmdsRef, tilesRef, aiLastActionRef, setCmds, aiTileKeysRef]);

// ── AI economy tick (5s — train, assign, upgrade) ─────────────────────────
// Called by useGameLoop's onAiEconTick — no setInterval here.
const tickAiEcon = useCallback(() => {
  if (!aiFaction) return;
  const curCmds    = cmdsRef.current;
  const curAiRss   = aiRssRef.current;
  const curAiBldgs = aiBldgsRef.current;
  const curAiPool  = aiPoolRef.current;
  const aiCmds     = curCmds.filter(c => c.owner === "ai");

  // Spend unspent skill points for AI commanders
  // Bug 17 fix: AI commanders accumulate unspentSkillPoints via applyXp but never spent them.
  const cmdsWithPoints = aiCmds.filter(c => (c.unspentSkillPoints ?? 0) > 0);
  if (cmdsWithPoints.length) {
    const cmd = cmdsWithPoints[0];
    const sp  = cmd.skillPoints || {};
    const MAX_SKILL_LVL = 5;
    const NUM_BRANCHES = 4;
    let skillToSpend = null;
    outer: for (const pass of ["main", "side"]) {
      for (let b = 0; b < NUM_BRANCHES; b++) {
        const keys = pass === "main"
          ? [getBranchMainSkill(cmd.cls, b)]
          : getBranchSideSkills(cmd.cls, b);
        for (const key of keys) {
          if (!key) continue;
          if ((sp[key] ?? 0) < MAX_SKILL_LVL) { skillToSpend = key; break outer; }
        }
      }
    }
    if (skillToSpend) {
      setCmds(p => p.map(c => {
        if (c.uid !== cmd.uid) return c;
        return {
          ...c,
          unspentSkillPoints: (c.unspentSkillPoints ?? 1) - 1,
          skillPoints: { ...(c.skillPoints || {}), [skillToSpend]: ((c.skillPoints?.[skillToSpend] ?? 0) + 1) },
        };
      }));
      return;
    }
  }

  // Assign troops to idle AI commander at HQ with 0 troops
  // Use aiTileKeysRef to find AI HQ tiles — O(AI tiles) not O(490k)
  const aiHQTileKeys = new Set(
    [...(aiTileKeysRef?.current || [])].filter(k => tilesRef.current[k]?.isHQ)
  );
  const idleNoTroops = aiCmds.filter(c => !c.march && !(c.troops || 0) && aiHQTileKeys.has(c.tk));
  if (idleNoTroops.length && curAiPool > 0) {
    const cmd = idleNoTroops[0];
    const leaderBonus = (cmd.cls === "leader" && (cmd.lvl || 5) >= 25) ? 500 : 0;
    const cmdCap = cmdCommand(cmd.lvl || 5, curAiBldgs.commandcenter || 0, leaderBonus);
    const assign = Math.min(cmdCap, curAiPool);
    // Pick a random faction branch for the AI commander
    const aiFaction = FACTION_KEYS[Math.floor(Math.random() * FACTION_KEYS.length)];
    const aiBranches = FACTION_TROOPS[aiFaction].branches;
    const aiBranch = aiBranches[Math.floor(Math.random() * aiBranches.length)];
    const tBranch = { faction: aiFaction, branch: aiBranch.key, tier: 0 };
    setAiBarracksPool(p => Math.max(0, p - assign));
    setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, troops:assign, troopBranch:tBranch } : c));
    return;
  }

  // Train troops if pool has room
  const aiBarrCap = barracksCapacity(curAiBldgs.barracks || 0);
  if (curAiPool < aiBarrCap) {
    const trainAmt = Math.min(500, aiBarrCap - curAiPool);
    const cost = { stone:trainAmt*2, wood:trainAmt*2, ore:trainAmt, gas:Math.floor(trainAmt*0.5) };
    if (Object.entries(cost).every(([k, v]) => (curAiRss[k] || 0) >= v)) {
      setAiRss(p => ({ stone:p.stone-cost.stone, wood:p.wood-cost.wood, ore:p.ore-cost.ore, gas:p.gas-cost.gas }));
      setAiBarracksPool(p => Math.min(aiBarrCap, p + trainAmt));
      return;
    }
  }

  // Upgrade a building (AI upgrades are instant)
  // Fix: include "hq" in priority so AI can unlock higher building levels.
  const upgPriority = ["quarry","lumber","forge","barracks","hq","training","refinery","commandcenter","walls"];
  for (const bType of upgPriority) {
    const curLvl = curAiBldgs[bType] || 0;
    const avail  = bType === "hq" ? 10 : maxAvailLevel(bType, curAiBldgs.hq || 1);
    if (curLvl >= avail) continue;
    const cost = upgCost(bType, curLvl);
    if (!Object.entries(cost).every(([k, v]) => (curAiRss[k] || 0) >= v)) continue;
    setAiRss(p => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v - (cost[k] || 0)])));
    setAiBldgs(p => {
      const next = { ...p, [bType]: (p[bType] || 0) + 1 };
      if (bType === "barracks") setAiBarracksPool(pool => Math.min(barracksCapacity(next.barracks), pool));
      return next;
    });
    return;
  }
}, [aiFaction, cmdsRef, aiRssRef, aiBldgsRef, aiPoolRef, setCmds, setAiRss, setAiBldgs, setAiBarracksPool, tilesRef, aiTileKeysRef]);

// Return tick functions — useGameLoop calls these from its worker callbacks
return { tickAiRss, tickAiMarch, tickAiEcon };
}
