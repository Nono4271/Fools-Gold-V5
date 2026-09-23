// Crew 2.0 — resolves a player march that arrives at a crew structure
// (Fortress, Well or Contract Outpost) with march.type === "siegeFortress"
// (dispatched by src/Game.jsx's startFortressSiegeMarch; the type name is
// kept from when only Fortresses existed). Kept separate from the ordinary
// "attack" march so it never collides with useMarch.js's arrival handling.
//
// Fight order (owner spec, shared/utils/structureDefense.js):
//   1. Commanders STANDING on the tile (moved there, not stationed), newest
//      arrival first.
//   2. Commanders STATIONED inside — Fortress and Well only (an Outpost can't
//      hold stationed armies).
//   3. Siege: the remaining troops' siege stat comes off the structure's HP
//      (shared/utils/crewFortress.js applySiegeDamage). At 0 the structure is
//      destroyed, the tile reverts to a plain p10+ tile and the attacker who
//      landed the last hit claims it.
// Losing any fight sends the attacker home; winning keeps the SAME march
// fighting the next defender with what's left, in the same arrival tick.
import { useEffect, useRef } from "react";
import { calcSiegePower } from "../../shared/constants/map.js";
import { FACTION_TROOPS } from "../../shared/constants/troops.js";
import { applyGearToCmd } from "../../shared/utils/gearStats.js";
import { getPassiveBonuses, skillSiegeBonus } from "../../shared/constants/skills.js";
import { normaliseTroopSlots, bfsPath, marchStepMs } from "../../shared/utils/pathfinding.js";
import { applyXp } from "./useMarch.js";
import { unstationCommander, applySiegeDamage } from "../../shared/utils/crewFortress.js";
import { findCrewStructureAt, updateCrewStructure, isStructureBuilt, structureSiege } from "../../shared/utils/crewStructures.js";
import { structureDefenderQueue } from "../../shared/utils/structureDefense.js";
import { woundedPatch } from "../../shared/utils/commanderStatus.js";
import { AI_HQ_KEY } from "../../shared/constants/map.js";
import { siegeTerritoryMultiplier } from "../../shared/utils/warRules.js";
import { isWarActive } from "../../shared/utils/crewRules.js";
import { TROOP_FACTIONS } from "../../shared/constants/allTroops.js";

// Small local duplicates of useMarch.js's unexported per-cmd helpers — same
// "cheap, duplicated rather than exported for one caller" choice already
// made elsewhere in this codebase (see shared/utils/aiChatter.js's own note
// on duplicating the seeded RNG instead of importing it from a worker).
function cmdTroops(cmd) {
  if (cmd?.troopSlots) return cmd.troopSlots.reduce((s, sl) => s + (sl.troops || 0), 0);
  return cmd?.troops || 0;
}
function cmdSiegePower(cmd, boostedCmd) {
  const slots = normaliseTroopSlots(cmd);
  const bonus = (boostedCmd?.gearBonuses?.armySiege || 0) + skillSiegeBonus(cmd, cmdTroops(cmd));
  if (slots.length > 0) return calcSiegePower(slots, null, bonus, TROOP_FACTIONS);
  return calcSiegePower(cmd.troops || 0, cmd.troopBranch, bonus);
}
function applySlotLosses(cmd, lost) {
  if (!cmd.troopSlots || cmd.troopSlots.length === 0) return {};
  const total = cmd.troopSlots.reduce((s, sl) => s + (sl.troops || 0), 0);
  if (total === 0) return { troopSlots: [] };
  const frac = Math.min(1, lost / total);
  return { troopSlots: cmd.troopSlots.map(sl => ({ ...sl, troops: Math.max(0, Math.round((sl.troops || 0) * (1 - frac))) })) };
}

export function useFortressSiege({
  screen, cmds, setCmds, tiles, patchTile, floaty, gearInventory,
  combatXpMult, facKey, troopSkillLevels, runBattle,
  crews, setCrews, setBattles, setBLog, setUnseenBattles, playerHqKey,
  playerCrewId, regionOwners,
  setAiCmds, aiHqKeys, crewmatePlayerIds,
}) {
  const KIND_LABEL = { fortress: "fortress", well: "Well", outpost: "Contract Outpost" };
  const aiHome = c => {
    const v = aiHqKeys?.[c.faction];
    return (Array.isArray(v) ? v[0] : v) || AI_HQ_KEY;
  };
  // Defeated AI defenders lose their army and march home (same as useMarch.js).
  const evictAi = (uids, fromKey) => {
    if (!uids.length) return;
    setAiCmds?.(p => p.map(c => {
      if (!uids.includes(c.uid)) return c;
      const home = aiHome(c), rp = bfsPath(fromKey, home);
      const base = { ...c, troops: 0, ...(c.troopSlots ? { troopSlots: [] } : {}), stationedWellId: null };
      return rp?.length > 1
        ? { ...base, march: { type: "move", path: rp, step: 0, dest: home, origin: fromKey, stepMs: marchStepMs(60), startedAt: Date.now(), lastStepTime: Date.now() } }
        : { ...base, tk: home, march: null };
    }));
  };
  // Each siege march is resolved exactly once — the effect re-runs on every
  // cmds change while the battle is awaited (see useMarch.js claimBattle).
  const claimedRef = useRef(new Set());
  useEffect(() => {
    if (screen !== "game") return;
    const arrived = cmds.filter(c => c.owner === "player" && c.march?.arrived && c.march?.type === "siegeFortress");
    if (!arrived.length) return;

    arrived.forEach(async (cmd) => {
      const claimKey = `${cmd.uid}:${cmd.march.startedAt ?? `${cmd.march.dest}:${cmd.march.lastStepTime}`}`;
      if (claimedRef.current.has(claimKey)) return;
      claimedRef.current.add(claimKey);
      const destKey = cmd.tk;
      const defTile = tiles[destKey];
      const found = findCrewStructureAt(crews, destKey);
      const crew = found?.crew, kind = found?.kind, structure = found?.structure;
      const label = KIND_LABEL[kind] || "structure";

      // Structure gone (already destroyed by someone else, or never existed) —
      // send the army home with nothing to fight.
      if (!found || !isStructureBuilt(structure, Date.now())) {
        const rp = bfsPath(destKey, playerHqKey);
        setCmds(p => p.map(c => c.uid === cmd.uid ? {
          ...c, march: rp?.length > 1
            ? { type: "move", path: rp, step: 0, dest: playerHqKey, origin: destKey, stepMs: marchStepMs(60), startedAt: Date.now(), lastStepTime: Date.now() }
            : null,
          tk: rp?.length > 1 ? c.tk : playerHqKey,
        } : c));
        floaty("⚠ Nothing to siege here anymore", "#cc8030", destKey);
        return;
      }

      const boostedCmd = { ...applyGearToCmd(cmd, gearInventory), troopSkillLevels: troopSkillLevels || {} };
      let remainingTroops = cmdTroops(cmd);
      let totalXp = 0;
      let attackerDefeated = false;
      let working = { ...structure, ...structureSiege(structure) };
      const defeatedAiUids = [];

      // ── Phases 1-2: standing commanders, then stationed ones ────────────
      const queue = structureDefenderQueue({
        kind, tileKey: destKey, cmds, structure,
        isHostile: c => c.uid !== cmd.uid && c.owner !== "player" && !(c.ownerPlayerId && crewmatePlayerIds?.has?.(c.ownerPlayerId)),
      });
      for (const entry of queue) {
        if (remainingTroops <= 0) break;
        const defCmdObj = cmds.find(c => c.uid === entry.uid);
        if (!defCmdObj) continue;
        const fightTile = { ...defTile, defCmd: { ...defCmdObj } };
        const res = await runBattle({ ...boostedCmd, troops: remainingTroops }, remainingTroops, fightTile, 0);
        if (res.report) {
          const enriched = { ...res.report, timestamp: Date.now(), cmdCls: cmd.cls,
            passiveSummary: getPassiveBonuses(boostedCmd), isFortressSiege: true, structureKind: kind,
            stageLabel: entry.phase === "standing" ? "Standing defender" : "Stationed defender" };
          setBattles(p => [enriched, ...p].slice(0, 99));
          setUnseenBattles(n => n + 1);
        }
        if (!res.won) {
          remainingTroops = 0;
          attackerDefeated = true;
          setBLog(p => [`❌ ${cmd.n} was repelled at [${crew.abbr}]'s ${label}`, ...p].slice(0, 99));
          break;
        }
        remainingTroops = Math.max(0, remainingTroops - res.lost);
        totalXp += res.xpGain || 0;
        if (defCmdObj.owner === "ai") defeatedAiUids.push(defCmdObj.uid);
        if (entry.phase === "stationed" && kind === "fortress") working = unstationCommander(working, entry.playerId, entry.uid);
        setBLog(p => [`⚔ ${cmd.n} defeated ${entry.phase === "standing" ? "a commander on" : "a defender in"} [${crew.abbr}]'s ${label}`, ...p].slice(0, 99));
      }
      evictAi(defeatedAiUids, destKey);

      let destroyed = false, claimed = false;
      // ── Phase 3: siege the now-undefended structure ─────────────────────
      if (!attackerDefeated && remainingTroops > 0) {
        const rawSiegePower = cmdSiegePower({ ...cmd, troops: remainingTroops }, boostedCmd);
        // War: -70% debuff on an enemy-territory structure, lifted while the
        // player's own crew is at war — see shared/utils/warRules.js.
        const playerCrew = (crews || []).find(c => c.id === playerCrewId) || null;
        const siegePower = rawSiegePower * siegeTerritoryMultiplier({
          tile: defTile, regionOwners, attackerFaction: facKey, atWar: isWarActive(playerCrew, Date.now()),
        });
        const outcome = applySiegeDamage(working, "player", siegePower);
        working = outcome.fortress;
        destroyed = outcome.destroyed;
        if (destroyed) {
          setBLog(p => [`💥 [${crew.abbr}]'s ${label} destroyed! Tile claimed.`, ...p].slice(0, 99));
        } else {
          setBLog(p => [`🏰 ${cmd.n} sieges [${crew.abbr}]'s ${label} (${working.siege.toLocaleString()}/${working.siegeMax.toLocaleString()})`, ...p].slice(0, 99));
        }
      }

      // ── Commit crew/structure state ─────────────────────────────────────
      setCrews(prev => prev.map(c => c.id !== crew.id ? c
        : updateCrewStructure(c, kind, structure.id, destroyed ? null : working)));

      // ── Commit tile state (only changes on destruction): plain p10+ tile,
      // owned by the player who landed the last hit. ──────────────────────
      if (destroyed) {
        claimed = true;
        patchTile(destKey, {
          owner: "player", faction: facKey, ownerPlayerId: "player",
          garrison: 0, siege: working.siegeMax, siegeMax: working.siegeMax,
          defeatedWaves: [], resetAt: null, defCmd: null, hasAiCommander: false,
        });
      }

      // ── Send the attacker home (captured tile or not, they don't garrison
      // a fortress tile the way a normal capture would station a commander) ─
      const rp = bfsPath(destKey, playerHqKey);
      setCmds(p => p.map(c => {
        if (c.uid !== cmd.uid) return c;
        const updated = {
          ...c, troops: remainingTroops, ...applySlotLosses(c, cmdTroops(c) - remainingTroops),
          march: rp?.length > 1
            ? { type: "move", path: rp, step: 0, dest: playerHqKey, origin: destKey, stepMs: marchStepMs(60), startedAt: Date.now(), lastStepTime: Date.now() }
            : null,
          tk: rp?.length > 1 ? c.tk : playerHqKey,
        };
        return { ...updated, ...applyXp(updated, Math.round(totalXp * (combatXpMult ?? 1)), floaty) };
      }));

      if (claimed) floaty(`🏰 ${label[0].toUpperCase() + label.slice(1)} destroyed — tile claimed! [${crew.abbr}] lost their hold here.`, "#f0c040", destKey);
      else if (attackerDefeated) {
        floaty("💀 Repelled!", "#cc3030", destKey);
        setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, ...woundedPatch() } : c)); // Wounded 10 min
      }
    });
  }, [screen, cmds, tiles, crews]); // eslint-disable-line react-hooks/exhaustive-deps
}
