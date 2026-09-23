import { memo, useState, useEffect } from "react";
import { FORT_LEVELS } from "../../../../shared/constants/map.js";
import { secsUntil } from "../../../../shared/utils/tileTimers.js";
import { cmdTroopCount } from "../../../../shared/utils/structureDefense.js";

export default memo(function FortPanel({
  fort, selTile, selKey, cmds,
  upgradeFort, startReposition, setPopupMode, startFortRemoval, cancelFortRemoval,
}) {
  // The demolish/abandon deadline lives on the fort (fort.removal), so it keeps
  // running when this panel closes; useFortRemovals fires it. This local tick
  // only refreshes the on-screen countdown.
  const deleteMode = fort?.removal?.mode ?? null; // null | "demolish" | "abandon"
  const endsAt = fort?.removal?.endsAt ?? 0;
  const busyUntil = fort?.completesAt && (fort.isBuilding || fort.isUpgrading) ? fort.completesAt : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt && !busyUntil) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    const onVisible = () => { if (document.visibilityState === "visible") setNow(Date.now()); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [endsAt, busyUntil]);
  const countdown = endsAt ? secsUntil(endsAt, now) : 0;
  const busySecs = busyUntil ? secsUntil(busyUntil, now) : 0;
  const fmtHMS = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s % 60).padStart(2, "0")}`; };
  const startDelete = (mode) => startFortRemoval?.(fort.id, mode);
  const cancelDelete = () => cancelFortRemoval?.(fort.id);

  const fmtCountdown = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  if (!fort) return null;

  const levelDef = FORT_LEVELS[fort.level - 1];
  const nextDef  = fort.level < 5 ? FORT_LEVELS[fort.level] : null;
  const siegePct = Math.round((fort.siege / fort.siegeMax) * 100);
  const barColor = siegePct > 66 ? "#3daa60" : siegePct > 33 ? "#d0a030" : "#cc3030";
  const stationedCount = fort.stationedCmdUids?.length || 0;

  const MAX_SLOTS = 6;

  // Always show all 6 slots; slots beyond levelDef.capacity are locked
  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => {
    const unlocked = i < levelDef.capacity;
    const uid = unlocked ? (fort.stationedCmdUids?.[i] ?? null) : null;
    const cmd = uid ? (cmds || []).find(c => c.uid === uid) : null;
    return { unlocked, uid, cmd };
  });

  // Moving to a fort needs an army (≥1 troop); recalling to a fort doesn't.
  const idleCmds = (cmds || []).filter(c =>
    c.owner === "player" && !c.march && c.tk !== selKey && !c.stranded && cmdTroopCount(c) > 0
  );

  return (
    <div style={{
      background: "rgba(180,130,20,.06)",
      border: "1px solid rgba(180,130,20,.25)",
      borderRadius: 6, padding: "10px 12px",
    }}>
      {/* Commander slot grid — always 6, large squares with bust images */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6, marginBottom: 10 }}>
        {slots.map((slot, i) => (
          <div key={i} style={{
            aspectRatio: "1", borderRadius: 6,
            background: !slot.unlocked ? "rgba(20,16,10,.8)" : slot.cmd ? "rgba(240,192,64,.15)" : "rgba(30,24,16,.5)",
            border: `1px solid ${!slot.unlocked ? "rgba(50,40,20,.4)" : slot.cmd ? "rgba(240,192,64,.5)" : "rgba(100,80,30,.3)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            {!slot.unlocked ? (
              <span style={{ fontSize: 13, opacity: 0.35 }}>🔒</span>
            ) : slot.cmd ? (
              slot.cmd.bust
                ? <img src={slot.cmd.bust} alt={slot.cmd.n} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 22 }}>{slot.cmd.icon ?? "👤"}</span>
            ) : (
              <span style={{ fontSize: 16, opacity: 0.2, color: "#c8a040" }}>+</span>
            )}
          </div>
        ))}
      </div>

      {/* Build / upgrade in progress (timer lives on the fort: completesAt) */}
      {busyUntil > 0 && (
        <div style={{ marginBottom: 8, padding: "6px 8px", borderRadius: 5, background: "rgba(240,192,64,.08)", border: "1px solid rgba(240,192,64,.3)",
          fontFamily: "'Cinzel',serif", fontSize: 9, color: "#f0c040", textAlign: "center" }}>
          {fort.isBuilding ? "🏗 UNDER CONSTRUCTION" : `⬆ UPGRADING TO LV${fort.pendingLevel}`} · {fmtHMS(busySecs)} left
        </div>
      )}

      {/* Fort siege bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: 7, color: "#6a5a3a", letterSpacing: ".05em" }}>🛡 FORT SIEGE</span>
          <span style={{ fontSize: 7, color: barColor, fontWeight: 700, fontFamily: "'Cinzel',serif" }}>
            {fort.siege.toLocaleString()}/{fort.siegeMax.toLocaleString()}
          </span>
        </div>
        <div style={{ height: 6, background: "#0e1018", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${siegePct}%`, background: barColor, borderRadius: 3, transition: "width .3s" }}/>
        </div>
      </div>

      {/* Upgrade + Move — primary action row at bottom */}
      {selTile?.owner === "player" && (<>
        <div style={{ display: "flex", gap: 5 }}>
          {nextDef && !busyUntil && (
            <button onClick={() => upgradeFort?.(fort.id)} style={{
              flex: 1, padding: "8px 0",
              background: "linear-gradient(135deg,rgba(60,80,20,.5),rgba(40,60,10,.3))",
              border: "1px solid #6a8020", color: "#a0c040",
              fontFamily: "'Cinzel',serif", fontSize: 10, fontWeight: 700,
              borderRadius: 5, cursor: "pointer",
            }}>⬆ UPGRADE</button>
          )}
          {!fort.isBuilding && idleCmds.length > 0 && stationedCount < levelDef.capacity && (
            <button onClick={() => {
              if (idleCmds.length === 1) startReposition?.(idleCmds[0].uid, selKey, fort.id);
              else setPopupMode?.("repositionPick");
            }} style={{
              flex: 1, padding: "8px 0",
              background: "linear-gradient(160deg,#083a18,#041e0a)",
              border: "1px solid #2a8040", color: "#80d090",
              fontFamily: "'Cinzel',serif", fontSize: 10, fontWeight: 700,
              borderRadius: 5, cursor: "pointer",
            }}>📍 MOVE</button>
          )}
        </div>

        {/* Delete section */}
        {deleteMode ? (
          <div style={{ marginTop: 8, padding: "10px", background: "rgba(160,20,20,.1)", border: "1px solid #cc202050", borderRadius: 5 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#ff8080", marginBottom: 4, textAlign: "center" }}>
              {deleteMode === "demolish" ? "🔨 DEMOLISHING..." : "🚪 ABANDONING..."} {fmtCountdown(countdown)}
            </div>
            <div style={{ fontSize: 7, color: "#8a6a6a", fontFamily: "'Crimson Pro',serif", fontStyle: "italic", marginBottom: 6, textAlign: "center" }}>
              {deleteMode === "demolish"
                ? "Fort removed. Tile stays player-owned."
                : "Fort removed. Tile released back to neutral."}
            </div>
            <button onClick={cancelDelete} style={{ width: "100%", padding: "6px 0", background: "rgba(255,255,255,.05)", border: "1px solid #3a2a2a", color: "#8a6a6a", fontFamily: "'Cinzel',serif", fontSize: 9, borderRadius: 4, cursor: "pointer" }}>
              ✕ CANCEL
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 8, display: "flex", gap: 5 }}>
            <button onClick={() => startDelete("demolish")} style={{ flex: 1, padding: "6px 0", background: "rgba(100,40,10,.3)", border: "1px solid #804020", color: "#cc8040", fontFamily: "'Cinzel',serif", fontSize: 9, fontWeight: 700, borderRadius: 4, cursor: "pointer", lineHeight: 1.4 }}>
              🔨 DEMOLISH<br/><span style={{ fontSize: 7, fontWeight: 400, opacity: .7 }}>30 min — keeps tile</span>
            </button>
            <button onClick={() => startDelete("abandon")} style={{ flex: 1, padding: "6px 0", background: "rgba(120,20,20,.3)", border: "1px solid #cc2020", color: "#ff8080", fontFamily: "'Cinzel',serif", fontSize: 9, fontWeight: 700, borderRadius: 4, cursor: "pointer", lineHeight: 1.4 }}>
              🚪 ABANDON<br/><span style={{ fontSize: 7, fontWeight: 400, opacity: .7 }}>45 min — loses tile</span>
            </button>
          </div>
        )}
      </>)}
    </div>
  );
});
