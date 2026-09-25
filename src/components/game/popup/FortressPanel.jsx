import { memo, useState } from "react";
import { FORTRESS_COMMANDER_SLOTS_PER_MEMBER } from "../../../../shared/constants/crew.js";
import { commanderSlotCapFor, stationedCount, canStationCommander } from "../../../../shared/utils/crewFortress.js";
import { cmdTroopCount } from "../../../../shared/utils/structureDefense.js";

// FortressPanel — commander-slot grid + station/unstation for a built Crew
// Fortress. A fortress can hold FAR more commanders than a Fort's fixed 6
// slots (up to 2 per crew member, and crews can run to 100 members), so
// unlike FortPanel this only renders the slots that belong to the viewing
// player (max 2 — see FORTRESS_COMMANDER_SLOTS_PER_MEMBER) plus a crew-wide
// stationed/capacity readout, instead of trying to grid every member's slots.
export default memo(function FortressPanel({
  fortress, selKey, myCrew, facKey, cmds,
  onStationAtFortress, onUnstationFromFortress,
}) {
  const [stationOpen, setStationOpen] = useState(false);
  if (!fortress || !myCrew) return null;

  const cap = commanderSlotCapFor(myCrew);
  const totalStationed = stationedCount(fortress);
  const myUids = fortress.stationedByPlayer?.[facKey] || [];
  const myCmds = myUids.map(uid => (cmds || []).find(c => c.uid === uid)).filter(Boolean);

  const canStationMore = canStationCommander(myCrew, fortress, facKey).ok;
  // Same eligibility as Well stationing (idle, not wounded/stranded, has troops).
  const stationable = (cmds || []).filter(c =>
    c.owner === "player" && !c.march && !c.gathering && !c.training && !c.stranded
    && !myUids.includes(c.uid) && cmdTroopCount(c) > 0
  );

  const slots = Array.from({ length: FORTRESS_COMMANDER_SLOTS_PER_MEMBER }, (_, i) => myCmds[i] || null);

  return (
    <div style={{
      background: "rgba(200,96,32,.06)",
      border: "1px solid rgba(200,96,32,.25)",
      borderRadius: 6, padding: "10px 12px",
      flex: "1 1 100%",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: 7, color: "#c8a060", letterSpacing: ".05em" }}>🏰 STATIONED</span>
        <span style={{ fontSize: 8, color: "#e0a060", fontWeight: 700, fontFamily: "'Cinzel',serif" }}>
          {totalStationed}/{cap} crew-wide
        </span>
      </div>

      {/* My own slots — up to 2 */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${FORTRESS_COMMANDER_SLOTS_PER_MEMBER},1fr)`, gap: 6, marginBottom: 8 }}>
        {slots.map((cmd, i) => (
          <div key={i} onClick={() => cmd && onUnstationFromFortress?.(cmd.uid, fortress)}
            title={cmd ? `${cmd.n} — tap to unstation` : "Empty slot"}
            style={{
              aspectRatio: "1", borderRadius: 6,
              background: cmd ? "rgba(240,150,64,.15)" : "rgba(30,24,16,.5)",
              border: `1px solid ${cmd ? "rgba(240,150,64,.5)" : "rgba(100,80,30,.3)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", cursor: cmd ? "pointer" : "default",
            }}>
            {cmd ? (
              cmd.bust
                ? <img src={cmd.bust} alt={cmd.n} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 22 }}>{cmd.icon ?? "👤"}</span>
            ) : (
              <span style={{ fontSize: 16, opacity: 0.2, color: "#e08040" }}>+</span>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => setStationOpen(o => !o)} disabled={!canStationMore || stationable.length === 0}
        style={{
          width: "100%", padding: "6px 0", borderRadius: 5,
          background: (canStationMore && stationable.length) ? "rgba(200,96,32,.2)" : "rgba(40,40,40,.3)",
          border: `1px solid ${(canStationMore && stationable.length) ? "#c86020" : "#444"}`,
          color: (canStationMore && stationable.length) ? "#f0a060" : "#777",
          fontFamily: "'Cinzel',serif", fontSize: 10, fontWeight: 700, letterSpacing: ".05em",
          cursor: (canStationMore && stationable.length) ? "pointer" : "not-allowed",
          opacity: (canStationMore && stationable.length) ? 1 : 0.6,
        }}>
        📍 STATION COMMANDER
      </button>

      {stationOpen && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3, maxHeight: 160, overflowY: "auto" }}>
          {stationable.map(c => (
            <button key={c.uid} onClick={() => { onStationAtFortress?.(c.uid, fortress); setStationOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 7px", borderRadius: 4, cursor: "pointer",
                background: "rgba(200,96,32,.12)", border: "1px solid #7a4a2a", color: "#f0c0a0", fontFamily: "'Cinzel',serif", fontSize: 8 }}>
              <span style={{ fontSize: 13 }}>{c.icon}</span> {c.n} · Lv{c.lvl || 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
