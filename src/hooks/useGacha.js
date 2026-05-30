// src/hooks/useGacha.js
// ─────────────────────────────────────────────────────────────────────────────
// All pull / gacha state and logic extracted from Game.jsx.
// Returns state values and the pull() action for passing to GachaScreen.

import { useState, useCallback, useEffect } from "react";
import { ALIGNMENT } from "../../shared/constants/factions.js";
import { HDEFS, rollGacha, addRespect, RESPECT_DUPE_POINTS, RESPECT_OVERFLOW_POINTS, RESPECT_MAX } from "../../shared/constants/heroes.js";
import { rollFullPull, rollFullPullCmdRarity, createGearInstance, GEAR_PIECES } from "../../shared/constants/gear.js";
import { HQP } from "../../shared/constants/map.js";

const todayUTC = () => new Date().toISOString().slice(0, 10);

export function useGacha({ staminaMax = 150, playerAlignment, gems, setGems, playerHqRef, setCmds, setColl, floatyRef }) {
  const [pityCounters,      setPityCounters]      = useState({ soldier:0, veteran:0, champion:0 });
  const [gearInventory,     setGearInventory]     = useState(() => {
    // Starter gear — one of each slot/rarity combination
    const slots    = ["helmet","armor","bracers","accessory"];
    const rarities = ["common","rare","epic","legendary"];
    const pieces   = [];
    let t = Date.now();
    slots.forEach(slot => {
      rarities.forEach(rarity => {
        const pool  = GEAR_PIECES.filter(p => p.slot === slot && p.rarity === rarity);
        const count = rarity === "legendary" ? 3 : rarity === "epic" ? 4 : rarity === "rare" ? 4 : 5;
        for (let i = 0; i < count; i++) {
          const def  = pool[i % pool.length];
          if (!def) continue;
          const inst = createGearInstance(def.id);
          inst.instanceId = `starter_${slot}_${rarity}_${i}_${t++}`;
          inst.stars = Math.min(i, 5);
          pieces.push(inst);
        }
      });
    });
    return pieces;
  });
  const [respectSchematics, setRespectSchematics] = useState([]);
  const [pullResults,       setPullResults]       = useState([]);
  const [pullKey,           setPullKey]           = useState(0);
  const [lastFreePull,      setLastFreePull]      = useState(null);
  const [dailyHalfUsed,     setDailyHalfUsed]    = useState(false);

  // Reset dailyHalfUsed at 00:00 UTC
  useEffect(() => {
    const scheduleReset = () => {
      const now = new Date();
      const msUntilMidnightUTC = (
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
        - Date.now()
      );
      const t = setTimeout(() => { setDailyHalfUsed(false); scheduleReset(); }, msUntilMidnightUTC);
      return t;
    };
    const t = scheduleReset();
    return () => clearTimeout(t);
  }, []);

  const isFreeAvailable = lastFreePull !== todayUTC();
  const isHalfAvailable = !isFreeAvailable && !dailyHalfUsed;

  const pullCost = (n) => {
    if (n === 10) return 4000;
    if (isFreeAvailable) return 0;
    if (isHalfAvailable) return 200;
    return 400;
  };

  const pull = useCallback((n) => {
    const cost = pullCost(n);
    if (cost > 0 && gems < cost) return;

    if (cost > 0) setGems(g => g - cost);
    if (isFreeAvailable && n === 1)      setLastFreePull(todayUTC());
    else if (isHalfAvailable && n === 1) setDailyHalfUsed(true);

    const alignFactions  = ALIGNMENT[playerAlignment]?.factions;
    const playerAlignKey = playerAlignment;
    const hqk            = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const newPity        = { ...pityCounters };
    const newGear        = [];
    const newSchematics  = [];
    const allPullResults = [];
    const commanderPool  = HDEFS.filter(h => alignFactions && alignFactions.includes(h.faction));

    for (let p = 0; p < n; p++) {
      const { slot1, slot2, slot3 } = rollFullPull(alignFactions, playerAlignKey, newPity, commanderPool);
      const slots  = [slot1, slot2, slot3];
      const pullRow = { id: `pr_${Date.now()}_${p}`, slots: [] };

      slots.forEach(slot => {
        if (slot.type === "commander") {
          const forcedRarity   = rollFullPullCmdRarity();
          const biasedCounters = { ...newPity };
          if (forcedRarity === "champion")    biasedCounters.champion = 300;
          else if (forcedRarity === "veteran") biasedCounters.veteran  = 100;
          else                                 biasedCounters.soldier   = 20;
          const [cmdResult] = rollGacha(1, alignFactions, biasedCounters);
          newPity[forcedRarity] = 0;
          pullRow.slots.push({ type: "commander", data: cmdResult });
        } else if (slot.type === "respectSchematic") {
          newSchematics.push(slot);
          pullRow.slots.push({ type: "respectSchematic", data: slot });
        } else {
          newGear.push(slot);
          pullRow.slots.push({ type: "gear", data: slot });
        }
      });
      allPullResults.push(pullRow);
    }

    setPityCounters(newPity);
    setPullResults(allPullResults);
    setPullKey(k => k + 1);
    if (newGear.length) setGearInventory(prev => [...prev, ...newGear]);

    const cmdResults         = allPullResults.flatMap(pr => pr.slots).filter(s => s.type === "commander").map(s => s.data);
    const processedSchematics = newSchematics.map(s => s);
    if (processedSchematics.length) setRespectSchematics(prev => [...prev, ...processedSchematics]);

    if (cmdResults.length) {
      setCmds(prev => {
        const nx = [...prev];
        cmdResults.forEach(h => {
          const existing = nx.find(x => x.id === h.id && x.owner === "player");
          if (!existing) {
            nx.push({ ...h, uid:h.uid, troops:0, troopSlots:[], troopBranch:null, tk:hqk, owner:"player",
              lvl:5, xp:0, respectPoints:0, respectLevel:0, skillPoints:{}, unspentSkillPoints:5,
              stamina:staminaMax ?? 150, gear:{ helmet:null, armor:null, bracers:null, accessory:null } });
          } else {
            const points = existing.respectLevel >= RESPECT_MAX
              ? RESPECT_OVERFLOW_POINTS
              : RESPECT_DUPE_POINTS[h.rarity] ?? 120;
            const idx     = nx.indexOf(existing);
            const updated = addRespect(existing, points);
            if (updated._justPromoted) floatyRef.current?.(`⬆ ${existing.n} → ${updated.rarity}!`, "#f0c040", hqk);
            nx[idx] = { ...updated, _justPromoted: null };
          }
        });
        if (processedSchematics.length) {
          const converted = processedSchematics.map(s => {
            if (s.isGeneric || !s.commanderId) return null;
            const ownerCmd = nx.find(x => x.id === s.commanderId && x.owner === "player");
            if (ownerCmd && ownerCmd.respectLevel >= RESPECT_MAX) {
              return { ...s, isGeneric: true, commanderId: null, commanderName: null,
                points: 30, n: `Generic ${s.rarity.charAt(0).toUpperCase() + s.rarity.slice(1)} Schematic` };
            }
            return null;
          }).filter(Boolean);
          if (converted.length) {
            setRespectSchematics(prev => {
              const ids = new Set(converted.map(c => c.instanceId));
              return [...prev.filter(x => !ids.has(x.instanceId)), ...converted];
            });
          }
        }
        return nx;
      });
      setColl(prev => {
        const nx = [...prev];
        cmdResults.forEach(h => { if (!nx.find(x => x.id === h.id)) nx.push(h); });
        return nx;
      });
    }
  }, [gems, playerAlignment, pityCounters, isFreeAvailable, isHalfAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    pityCounters, setPityCounters,
    gearInventory, setGearInventory,
    respectSchematics, setRespectSchematics,
    pullResults, setPullResults,
    pullKey, setPullKey,
    lastFreePull, setLastFreePull,
    dailyHalfUsed, setDailyHalfUsed,
    isFreeAvailable, isHalfAvailable,
    pullCost, pull,
  };
}
