// useAI.js — Multi-faction AI simulation
// Manages 5 AI factions simultaneously (whichever factions the player didn't pick).
// Each faction has 50 AI players, each with their own commander.
// Economy (rss/bldgs/pool) is shared per-faction. March is per-commander.

import { useCallback } from "react";
import { FACTION_TROOPS } from "../../shared/constants/troops.js";
import { barracksCapacity, maxAvailLevel, upgCost, cmdCommand, rssRate } from "../../shared/constants/buildings.js";
import { WIN_C, WIN_R } from "../../shared/constants/map.js";
import { adj, bfsPath, effectiveMarchSpd, marchStepMs } from "../../shared/utils/pathfinding.js";
import { getBranchMainSkill, getBranchSideSkills } from "../../shared/constants/skills.js";

// Per-commander cooldown between marches (ms) — stagger so not all 50 move at once
const CMD_MARCH_COOLDOWN_MS = 5000;

export function useAI({
  screen,
  aiFactionKeys,      // string[] — factions the AI controls (all factions except player's)
  cmdsRef,            // ref: all cmds (player + ai)
  tilesRef,
  // Per-faction Maps (Map<factionKey, value>) stored in refs
  aiRssMapRef,        // Map<fk, {stone,wood,ore,gas}>
  aiBldgsMapRef,      // Map<fk, bldgsObj>
  aiPoolMapRef,       // Map<fk, number>
  aiTileKeysMapRef,   // Map<fk, Set<tileKey>>
  aiLastMarchMapRef,  // Map<fk, Map<cmdUid, timestamp>>
  aiHqKeysRef,        // ref: { [fk]: hqTileKey }
  setCmds,            // setAiCmds
  setAiRssMap,        // (fk, updater) => void
  setAiBldgsMap,      // (fk, updater) => void
  setAiPoolMap,       // (fk, updater) => void
}) {

// ── Resource tick — called every 1s ──────────────────────────────────────
const tickAiRss = useCallback(() => {
  if (!aiFactionKeys?.length) return;
  const tiles = tilesRef.current;
  for (const fk of aiFactionKeys) {
    const bldgs   = aiBldgsMapRef.current.get(fk) || {};
    const tileKeys = aiTileKeysMapRef.current.get(fk) || new Set();
    setAiRssMap(fk, p => {
      const n = { stone: p.stone + 5, wood: p.wood + 5, ore: p.ore + 5, gas: p.gas + 5 };
      for (const k of tileKeys) {
        const t = tiles[k];
        if (t?.rss) {
          const b = t.rss === "stone" ? "quarry" : t.rss === "wood" ? "lumber" : t.rss === "ore" ? "forge" : "refinery";
          n[t.rss] += rssRate(bldgs[b] || 0);
        }
      }
      return {
        stone: Math.min(9990000, n.stone),
        wood:  Math.min(9990000, n.wood),
        ore:   Math.min(9990000, n.ore),
        gas:   Math.min(9990000, n.gas),
      };
    });
  }
}, [aiFactionKeys, tilesRef, aiBldgsMapRef, aiTileKeysMapRef, setAiRssMap]);

// ── March tick — called every 3s ─────────────────────────────────────────
// Each idle AI commander with troops picks an adjacent non-owned tile and marches.
// They spread outward from their current position, biased toward the win tile.
const tickAiMarch = useCallback(() => {
  if (!aiFactionKeys?.length) return;
  const now      = Date.now();
  const curCmds  = cmdsRef.current;
  const curTiles = tilesRef.current;

  const updates = [];

  // Loop over ALL AI commanders, not just one per faction
  const aiCmds = curCmds.filter(c => c.owner === "ai" && c.faction && aiFactionKeys.includes(c.faction));
  const idleArmed = aiCmds.filter(c => !c.march && (c.troops || 0) > 0);

  for (const cmd of idleArmed) {
    const fk = cmd.faction;
    const tileKeys  = aiTileKeysMapRef.current.get(fk) || new Set();
    const lastMarch = aiLastMarchMapRef.current.get(fk) || new Map();

    const lastMs = lastMarch.get(cmd.uid) || 0;
    if (now - lastMs < CMD_MARCH_COOLDOWN_MS) continue;

    const [cc, cr] = cmd.tk.split(",").map(Number);
    const candidates = adj(cc, cr).filter(k => !tileKeys.has(k) && curTiles[k]);
    if (!candidates.length) continue;

    // Scoring: strongly prioritize the 3 HQ-adjacent resource tiles
    // (pl=1 = 1/hr, pl>=10 = 10/hr+) so low-level commanders level up fast.
    // After those are taken, bias toward win tile with jitter.
    const hqKey = cmd.hqKey;
    const [hc, hr] = hqKey ? hqKey.split(",").map(Number) : [cc, cr];

    const scored = candidates.map(k => {
      const t = curTiles[k];
      const pl = t?.powerLevel ?? 0;
      const [tc, tr] = k.split(",").map(Number);

      // Strong bonus for adjacent resource tiles (pl 1 or 10+) near HQ
      const distToHq = Math.abs(tc - hc) + Math.abs(tr - hr);
      const isResourceTile = pl === 1 || pl >= 10;
      const resourceBonus = (isResourceTile && distToHq <= 4) ? -200 : 0;

      const distToWin = Math.abs(tc - WIN_C) + Math.abs(tr - WIN_R);
      return { k, score: distToWin + resourceBonus + Math.random() * 30 };
    });
    scored.sort((a, b) => a.score - b.score);
    const target = scored[0].k;

    const path = bfsPath(cmd.tk, target);
    if (!path || path.length < 2) continue;

    const stepMs = marchStepMs(effectiveMarchSpd(cmd.spd || 60, cmd.troopBranch));
    updates.push({
      uid: cmd.uid,
      march: { type: "attack", path, step: 0, dest: target, origin: cmd.tk, stepMs, lastStepTime: now },
    });

    const updatedLastMarch = new Map(lastMarch);
    updatedLastMarch.set(cmd.uid, now);
    aiLastMarchMapRef.current.set(fk, updatedLastMarch);
  }

  if (!updates.length) return;

  setCmds(p => {
    let changed = false;
    const next = p.map(c => {
      const upd = updates.find(u => u.uid === c.uid);
      if (!upd) return c;
      changed = true;
      return { ...c, march: upd.march };
    });
    return changed ? next : p;
  });
}, [aiFactionKeys, cmdsRef, tilesRef, aiTileKeysMapRef, aiLastMarchMapRef, setCmds]);

// ── Economy tick — called every 5s ───────────────────────────────────────
// Per-faction: assign troops to idle commanders at HQ, train, upgrade buildings.
const tickAiEcon = useCallback(() => {
  if (!aiFactionKeys?.length) return;
  const curCmds = cmdsRef.current;
  const hqKeys  = aiHqKeysRef.current || {};

  for (const fk of aiFactionKeys) {
    const curRss   = aiRssMapRef.current.get(fk)   || { stone:0, wood:0, ore:0, gas:0 };
    const curBldgs = aiBldgsMapRef.current.get(fk)  || { hq:1, barracks:0, commandcenter:0 };
    const curPool  = aiPoolMapRef.current.get(fk)   ?? barracksCapacity(0);
    const fkCmds   = curCmds.filter(c => c.owner === "ai" && c.faction === fk);
    const hqKeyVal = hqKeys[fk];
    const hqKey    = Array.isArray(hqKeyVal) ? hqKeyVal[0] : hqKeyVal;

    // Spend skill points for ALL commanders with unspent points this tick
    const cmdsWithPoints = fkCmds.filter(c => (c.unspentSkillPoints ?? 0) > 0);
    if (cmdsWithPoints.length) {
      const updates = [];
      for (const cmd of cmdsWithPoints) {
        const sp  = cmd.skillPoints || {};
        const MAX_SKILL_LVL = 5;
        let skillToSpend = null;
        outer: for (const pass of ["main", "side"]) {
          for (let b = 0; b < 4; b++) {
            const rawKeys = pass === "main"
              ? [getBranchMainSkill(cmd.cls, b, cmd)]
              : getBranchSideSkills(cmd.cls, b, cmd);
            const keys = rawKeys.map(k => (typeof k === "object" && k !== null) ? k.key : k);
            for (const key of keys) {
              if (!key) continue;
              if ((sp[key] ?? 0) < MAX_SKILL_LVL) { skillToSpend = key; break outer; }
            }
          }
        }
        if (skillToSpend) updates.push({ uid: cmd.uid, skill: skillToSpend });
      }
      if (updates.length) {
        setCmds(p => p.map(c => {
          const upd = updates.find(u => u.uid === c.uid);
          if (!upd) return c;
          return {
            ...c,
            unspentSkillPoints: (c.unspentSkillPoints ?? 1) - 1,
            skillPoints: { ...(c.skillPoints || {}), [upd.skill]: ((c.skillPoints?.[upd.skill] ?? 0) + 1) },
          };
        }));
      }
      // Fall through to troop assignment — don't skip it
    }

    // Assign troops to idle commanders at their own HQ with no troops
    const idleNoTroops = fkCmds.filter(c => !c.march && !(c.troops || 0) && c.tk === (c.hqKey || hqKey));
    console.log(`[AI:${fk}] fkCmds=${fkCmds.length} idleNoTroops=${idleNoTroops.length} pool=${curPool}`);
    if (idleNoTroops.length && curPool > 0) {
      const cmd     = idleNoTroops[0];
      const cmdCap  = cmdCommand(cmd.lvl || 5, curBldgs.commandcenter || 0, cmd.commandBonus ?? 0);
      const assign  = Math.min(cmdCap, curPool);
      const branches = FACTION_TROOPS[fk]?.branches || [];
      const branch   = branches[Math.floor(Math.random() * branches.length)];
      const tBranch  = { faction: fk, branch: branch?.key || "swashbucklers", tier: 0 };
      setAiPoolMap(fk, p => Math.max(0, p - assign));
      setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, troops: assign, troopBranch: tBranch } : c));
      continue;
    }

    // Train troops
    const aiBarrCap = barracksCapacity(curBldgs.barracks || 0);
    if (curPool < aiBarrCap) {
      const trainAmt = Math.min(500, aiBarrCap - curPool);
      const cost = { stone: trainAmt*2, wood: trainAmt*2, ore: trainAmt, gas: Math.floor(trainAmt*0.5) };
      if (Object.entries(cost).every(([k, v]) => (curRss[k] || 0) >= v)) {
        setAiRssMap(fk, p => ({ stone:p.stone-cost.stone, wood:p.wood-cost.wood, ore:p.ore-cost.ore, gas:p.gas-cost.gas }));
        setAiPoolMap(fk, p => Math.min(aiBarrCap, p + trainAmt));
        continue;
      }
    }

    // Upgrade buildings
    const upgPriority = ["quarry","lumber","forge","barracks","hq","training","refinery","commandcenter","walls"];
    for (const bType of upgPriority) {
      const curLvl = curBldgs[bType] || 0;
      const avail  = bType === "hq" ? 10 : maxAvailLevel(bType, curBldgs.hq || 1);
      if (curLvl >= avail) continue;
      const cost = upgCost(bType, curLvl);
      if (!Object.entries(cost).every(([k, v]) => (curRss[k] || 0) >= v)) continue;
      setAiRssMap(fk, p => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v - (cost[k] || 0)])));
      setAiBldgsMap(fk, p => {
        const next = { ...p, [bType]: (p[bType] || 0) + 1 };
        if (bType === "barracks") setAiPoolMap(fk, pool => Math.min(barracksCapacity(next.barracks), pool));
        return next;
      });
      break;
    }
  }
}, [aiFactionKeys, cmdsRef, aiRssMapRef, aiBldgsMapRef, aiPoolMapRef, aiHqKeysRef, setCmds, setAiRssMap, setAiBldgsMap, setAiPoolMap]);

return { tickAiRss, tickAiMarch, tickAiEcon };
}
