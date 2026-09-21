// Crew 2.0 — resolves a player march that arrives at a crew fortress with
// march.type === "siegeFortress" (dispatched by src/Game.jsx's
// startFortressSiegeMarch, kept deliberately separate from the ordinary
// "attack" march type so this never collides with useMarch.js's own
// arrival handling — see the design note in ReadMeAI.md's Crew 2.0 entry).
//
// Fight order, mirrors the existing "fight each AI commander on a contested
// tile" loop in useMarch.js almost exactly (same runBattle call, same
// defCmd-from-a-real-commander-object pattern):
//   1. If the fortress still has stationed commanders, fight the next one
//      (shared/utils/crewFortress.js's nextDefender — deterministic order).
//      Losing sends the attacker home empty-handed; winning removes that
//      defender and, if troops remain, the SAME march keeps fighting the
//      next defender in the same arrival tick.
//   2. Once clear, the remaining troops' siege stat is applied to the
//      fortress's HP (shared/utils/crewFortress.js's applySiegeDamage).
//      Hitting 0 destroys it: the tile reverts to a bare tile and the
//      attacker claims it outright, no further fight needed (per the
//      owner's spec).
import { useEffect } from "react";
import { calcSiegePower } from "../../shared/constants/map.js";
import { FACTION_TROOPS } from "../../shared/constants/troops.js";
import { applyGearToCmd } from "../../shared/utils/gearStats.js";
import { getPassiveBonuses } from "../../shared/constants/skills.js";
import { normaliseTroopSlots, bfsPath, marchStepMs } from "../../shared/utils/pathfinding.js";
import { applyXp } from "./useMarch.js";
import { nextDefender, unstationCommander, applySiegeDamage, removeFortress, isFortressBuilt } from "../../shared/utils/crewFortress.js";

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
  const bonus = boostedCmd?.gearBonuses?.armySiege || 0;
  if (slots.length > 0) return calcSiegePower(slots, null, bonus, FACTION_TROOPS);
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
}) {
  useEffect(() => {
    if (screen !== "game") return;
    const arrived = cmds.filter(c => c.owner === "player" && c.march?.arrived && c.march?.type === "siegeFortress");
    if (!arrived.length) return;

    arrived.forEach(async (cmd) => {
      const destKey = cmd.tk;
      const defTile = tiles[destKey];
      const crew = crews.find(c => (c.fortresses || []).some(f => f.tileKey === destKey));
      const fortress = crew?.fortresses?.find(f => f.tileKey === destKey);

      // Fortress gone (already destroyed by someone else, or never existed) —
      // send the army home with nothing to fight.
      if (!crew || !fortress || !isFortressBuilt(fortress, Date.now())) {
        const rp = bfsPath(destKey, playerHqKey);
        setCmds(p => p.map(c => c.uid === cmd.uid ? {
          ...c, march: rp?.length > 1
            ? { type: "move", path: rp, step: 0, dest: playerHqKey, origin: destKey, stepMs: marchStepMs(60), startedAt: Date.now(), lastStepTime: Date.now() }
            : null,
          tk: rp?.length > 1 ? c.tk : playerHqKey,
        } : c));
        floaty("⚠ No fortress here anymore", "#cc8030", destKey);
        return;
      }

      const boostedCmd = { ...applyGearToCmd(cmd, gearInventory), troopSkillLevels: troopSkillLevels || {} };
      let remainingTroops = cmdTroops(cmd);
      let totalXp = 0;
      let attackerDefeated = false;
      let workingFortress = fortress;

      // ── Phase 1: clear stationed defenders, one at a time ──────────────
      let defender = nextDefender(workingFortress);
      while (defender && remainingTroops > 0) {
        const defCmdObj = cmds.find(c => c.uid === defender.commanderUid);
        if (!defCmdObj) {
          // Stale reference (defender no longer exists) — just drop it and move on.
          workingFortress = unstationCommander(workingFortress, defender.playerId, defender.commanderUid);
          defender = nextDefender(workingFortress);
          continue;
        }
        const fightTile = { ...defTile, defCmd: { ...defCmdObj } };
        const res = await runBattle({ ...boostedCmd, troops: remainingTroops }, remainingTroops, fightTile, 0);
        if (res.report) {
          const enriched = { ...res.report, timestamp: Date.now(), cmdCls: cmd.cls,
            passiveSummary: getPassiveBonuses(boostedCmd), isFortressSiege: true };
          setBattles(p => [enriched, ...p].slice(0, 99));
          setUnseenBattles(n => n + 1);
        }
        if (!res.won) {
          remainingTroops = 0;
          attackerDefeated = true;
          setBLog(p => [`❌ ${cmd.n} was repelled at [${crew.abbr}]'s fortress`, ...p].slice(0, 99));
          break;
        }
        remainingTroops = Math.max(0, remainingTroops - res.lost);
        totalXp += res.xpGain || 0;
        workingFortress = unstationCommander(workingFortress, defender.playerId, defender.commanderUid);
        setBLog(p => [`⚔ ${cmd.n} defeated a defender at [${crew.abbr}]'s fortress`, ...p].slice(0, 99));
        defender = nextDefender(workingFortress);
      }

      let destroyed = false, claimed = false;
      // ── Phase 2: siege the now-undefended fortress ─────────────────────
      if (!attackerDefeated && remainingTroops > 0) {
        const siegePower = cmdSiegePower({ ...cmd, troops: remainingTroops }, boostedCmd);
        const outcome = applySiegeDamage(workingFortress, "player", siegePower);
        workingFortress = outcome.fortress;
        destroyed = outcome.destroyed;
        if (destroyed) {
          setBLog(p => [`💥 [${crew.abbr}]'s fortress destroyed! Tile claimed.`, ...p].slice(0, 99));
        } else {
          setBLog(p => [`🏰 ${cmd.n} sieges [${crew.abbr}]'s fortress (${workingFortress.siege.toLocaleString()}/${workingFortress.siegeMax.toLocaleString()})`, ...p].slice(0, 99));
        }
      }

      // ── Commit crew/fortress state ──────────────────────────────────────
      setCrews(prev => prev.map(c => {
        if (c.id !== crew.id) return c;
        const updated = { ...c, fortresses: c.fortresses.map(f => f.id === fortress.id ? workingFortress : f) };
        return destroyed ? removeFortress(updated, fortress.id) : updated;
      }));

      // ── Commit tile state (only changes on destruction) ─────────────────
      if (destroyed) {
        claimed = true;
        patchTile(destKey, {
          owner: "player", faction: facKey, ownerPlayerId: "player",
          garrison: 0, siege: workingFortress.siegeMax, siegeMax: workingFortress.siegeMax,
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

      if (claimed) floaty(`🏰 Fortress claimed! [${crew.abbr}] lost their hold here.`, "#f0c040", destKey);
      else if (attackerDefeated) floaty("💀 Repelled!", "#cc3030", destKey);
    });
  }, [screen, cmds, tiles, crews]); // eslint-disable-line react-hooks/exhaustive-deps
}
