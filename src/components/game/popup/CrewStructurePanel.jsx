import { useState } from "react";
import { NEUTRAL_TROOPS } from "../../../../shared/constants/neutralTroops.js";
import {
  crewWellSlotsForLevel, crewOutpostUnlocked, crewOutpostUnitSlots,
  WELL_COST, OUTPOST_COST, OUTPOST_DAILY_COMMAND_LIMIT,
} from "../../../../shared/constants/crew.js";
import {
  canStartWellBuild, canStartOutpostBuild, isStructureBuilt, canStationAtWell, structureSiege,
} from "../../../../shared/utils/crewStructures.js";

/*
  CrewStructurePanel — the TilePopup action rows for crew Wells and the
  Contract Outpost (rules: shared/utils/crewStructures.js). Kept out of
  TilePopup.jsx so that file only gains one mount point.
    - p10+ tile owned by you or a crewmate (canClaimTile — NOT unclaimed
      wilds), founder or officer: BUILD WELL / BUILD OUTPOST buttons.
    - Well tile: build countdown, STATION (any idle commander, no range),
      GATHER (opens TilePopup's normal gather drawer), DEMOLISH (founder).
    - Outpost tile: build countdown, contracted units, founder unit picker,
      today's remaining Outpost training commands, DEMOLISH (founder).
*/

const BTN = { flex: 1, padding: "6px 0", borderRadius: 5, fontFamily: "'Cinzel',serif", fontSize: 10, fontWeight: 700, letterSpacing: ".05em" };
const NOTE = { flex: 1, fontSize: 9, fontFamily: "'Cinzel',serif", textAlign: "center", padding: "6px 0" };
const costText = c => `${Math.round(c.wood / 1000)}k🪵 ${Math.round(c.stone / 1000)}k🪨 ${Math.round(c.gas / 1000)}k⚗`;

function ActionBtn({ ok, onClick, reason, color, children }) {
  return (
    <button onClick={() => ok && onClick?.()} disabled={!ok} title={reason || ""}
      style={{ ...BTN, background: ok ? `${color}33` : "rgba(40,40,40,.3)", border: `1px solid ${ok ? color : "#444"}`,
        color: ok ? "#f0e0c0" : "#777", cursor: ok ? "pointer" : "not-allowed", opacity: ok ? 1 : 0.6 }}>
      {children}
    </button>
  );
}

// Siege HP line + (for another crew's structure) an ATTACK button. Same
// combat as a Fortress: standing commanders → stationed (Well only) → siege.
function SiegeRow({ structure, mine, canAtk, canAtkNow, onAttack }) {
  const { siege, siegeMax } = structureSiege(structure);
  return (
    <>
      <div style={{ ...NOTE, color: "#e0a0a0" }}>🏰 Siege: {siege.toLocaleString()}/{siegeMax.toLocaleString()}</div>
      {!mine && canAtk && (
        <ActionBtn ok={!!canAtkNow} reason={canAtkNow ? "" : "No commander in range with stamina"} color="#cc2020" onClick={onAttack}>
          ATTACK
        </ActionBtn>
      )}
    </>
  );
}

export default function CrewStructurePanel({
  selKey, selTile, canClaimTile, myCrew, facKey, rss, nowTick, cmds,
  crewFortressAtTile, wellAtTile, wellCrew, outpostAtTile, outpostCrew, crewStructureKeys,
  contractCommandsLeft,
  canAtk, canAtkNow, onAttackStructure,
  onBuildWell, onDemolishWell, onStationAtWell, onOpenWellGather,
  onBuildOutpost, onDemolishOutpost, onChooseOutpostUnits,
}) {
  const [stationOpen, setStationOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const now = nowTick ?? Date.now();
  const isFounder = !!myCrew && myCrew.founder === facKey;
  // Building is founder-or-officer (matches canStartWellBuild/canStartOutpostBuild
  // in shared/utils/crewStructures.js); demolish/unit-picking below stay
  // founder-only by design, per this file's own header comment.
  const isFounderOrOfficer = !!myCrew && (myCrew.founder === facKey || (myCrew.officers || []).includes(facKey));
  const minsLeft = s => Math.max(0, Math.ceil((s.buildEndsAt - now) / 60000));

  // ── Build buttons (tile owned by you or a crewmate, nothing built yet) ──
  if (!wellAtTile && !outpostAtTile) {
    if (crewFortressAtTile || !canClaimTile || !isFounderOrOfficer || (selTile?.powerLevel || 1) < 10) return null;
    if (selTile.isCamp || selTile.campType || selTile.isKeep || selTile.isGate || selTile.isRuin || selTile.isWin) return null;
    const showWell = crewWellSlotsForLevel(myCrew.level) > 0;
    const showOutpost = crewOutpostUnlocked(myCrew.level) && !myCrew.outpost;
    if (!showWell && !showOutpost) return null;
    const wellCheck = canStartWellBuild(myCrew, facKey, selTile, selKey, rss, crewStructureKeys);
    const opCheck = canStartOutpostBuild(myCrew, facKey, selTile, selKey, rss, crewStructureKeys);
    return (
      <>
        {showWell && (
          <ActionBtn ok={wellCheck.ok} reason={wellCheck.reason || costText(WELL_COST)} color="#3a90c0" onClick={() => onBuildWell?.(selKey, selTile)}>
            💧 BUILD WELL
          </ActionBtn>
        )}
        {showOutpost && (
          <ActionBtn ok={opCheck.ok} reason={opCheck.reason || costText(OUTPOST_COST)} color="#c0a040" onClick={() => onBuildOutpost?.(selKey, selTile)}>
            📜 BUILD OUTPOST
          </ActionBtn>
        )}
      </>
    );
  }

  // ── Well ──────────────────────────────────────────────────────────────
  if (wellAtTile) {
    const mine = !!myCrew && wellCrew?.id === myCrew.id;
    const built = isStructureBuilt(wellAtTile, now);
    if (!built) return <div style={{ ...NOTE, color: "#80c0e0" }}>🏗 Well under construction — {minsLeft(wellAtTile)}m left</div>;
    if (!mine) return (
      <>
        <div style={{ ...NOTE, color: "#80c0e0", flexBasis: "100%" }}>💧 {wellCrew?.name || "Crew"} Well</div>
        <SiegeRow structure={wellAtTile} mine={false} canAtk={canAtk} canAtkNow={canAtkNow} onAttack={onAttackStructure} />
      </>
    );
    const stationable = (cmds || []).filter(c => c.owner === "player" && c.stationedWellId !== wellAtTile.id
      && canStationAtWell(myCrew, wellAtTile, facKey, c, now).ok);
    // Only commanders STATIONED at the Well gather — ones that merely moved
    // onto the tile stand guard (they fight first) but don't gather.
    const hereIdle = (cmds || []).filter(c => c.owner === "player" && c.stationedWellId === wellAtTile.id && c.tk === selKey && !c.march && !c.gathering && !c.training);
    return (
      <>
        <div style={{ ...NOTE, color: "#80c0e0", flexBasis: "100%" }}>💧 Well · gathers all 4 resources at the p11 rate</div>
        <SiegeRow structure={wellAtTile} mine />
        <ActionBtn ok={stationable.length > 0} reason={stationable.length ? "" : "No idle commanders"} color="#3a90c0" onClick={() => setStationOpen(o => !o)}>
          📍 STATION
        </ActionBtn>
        <ActionBtn ok={hereIdle.length > 0} reason={hereIdle.length ? "" : "Station an idle commander here first"} color="#a07040" onClick={onOpenWellGather}>
          ⛏ GATHER
        </ActionBtn>
        {isFounder && (
          <ActionBtn ok color="#7a3030" onClick={() => onDemolishWell?.(wellAtTile)}>DEMOLISH</ActionBtn>
        )}
        {stationOpen && (
          <div style={{ flexBasis: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
            {stationable.map(c => (
              <button key={c.uid} onClick={() => { onStationAtWell?.(c.uid, wellAtTile); setStationOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 7px", borderRadius: 4, cursor: "pointer",
                  background: "rgba(58,144,192,.12)", border: "1px solid #2a5a7a", color: "#c0e0f0", fontFamily: "'Cinzel',serif", fontSize: 8 }}>
                <span style={{ fontSize: 13 }}>{c.icon}</span> {c.n} · Lv{c.lvl || 1}
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  // ── Contract Outpost ──────────────────────────────────────────────────
  const mine = !!myCrew && outpostCrew?.id === myCrew.id;
  const built = isStructureBuilt(outpostAtTile, now);
  if (!built) return <div style={{ ...NOTE, color: "#e0c080" }}>🏗 Contract Outpost under construction — {minsLeft(outpostAtTile)}m left</div>;
  const units = outpostAtTile.units || [];
  const unitLabel = k => NEUTRAL_TROOPS.find(u => u.key === k)?.label || k;
  if (!mine) return (
    <>
      <div style={{ ...NOTE, color: "#e0c080", flexBasis: "100%" }}>📜 {outpostCrew?.name || "Crew"} Contract Outpost</div>
      <SiegeRow structure={outpostAtTile} mine={false} canAtk={canAtk} canAtkNow={canAtkNow} onAttack={onAttackStructure} />
    </>
  );
  const maxUnits = crewOutpostUnitSlots(myCrew.level);
  const toggle = k => {
    const next = units.includes(k) ? units.filter(u => u !== k) : [...units, k];
    if (next.length <= maxUnits) onChooseOutpostUnits?.(next);
  };
  return (
    <>
      <div style={{ ...NOTE, color: "#e0c080", flexBasis: "100%" }}>
        📜 Contracted: {units.length ? units.map(unitLabel).join(", ") : "none yet"}
        <div style={{ fontSize: 7, color: "#9a8a60", marginTop: 2 }}>
          Train in the HQ → Training · {contractCommandsLeft ?? OUTPOST_DAILY_COMMAND_LIMIT}/{OUTPOST_DAILY_COMMAND_LIMIT} commands left today
        </div>
      </div>
      <SiegeRow structure={outpostAtTile} mine />
      {isFounder && (
        <ActionBtn ok color="#c0a040" onClick={() => setPickOpen(o => !o)}>CHOOSE UNITS ({units.length}/{maxUnits})</ActionBtn>
      )}
      {isFounder && (
        <ActionBtn ok color="#7a3030" onClick={() => onDemolishOutpost?.()}>DEMOLISH</ActionBtn>
      )}
      {pickOpen && isFounder && (
        <div style={{ flexBasis: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, maxHeight: 160, overflowY: "auto" }}>
          {NEUTRAL_TROOPS.map(u => {
            const on = units.includes(u.key);
            const blocked = !on && units.length >= maxUnits;
            return (
              <button key={u.key} onClick={() => !blocked && toggle(u.key)} disabled={blocked}
                style={{ padding: "4px 5px", borderRadius: 4, fontFamily: "'Cinzel',serif", fontSize: 7.5, textAlign: "left",
                  cursor: blocked ? "not-allowed" : "pointer", opacity: blocked ? 0.45 : 1,
                  background: on ? "rgba(192,160,64,.25)" : "rgba(255,255,255,.03)",
                  border: `1px solid ${on ? "#c0a040" : "#3a3020"}`, color: on ? "#f0d890" : "#b0a080" }}>
                {on ? "✓ " : ""}{u.label}
                <div style={{ fontSize: 6.5, color: "#7a6a4a" }}>{u.race} · {u.size} · T{u.tier + 1}</div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
