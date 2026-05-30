import { memo } from "react";
import { FORT_LEVELS } from "../../../../shared/constants/map.js";

export default memo(function FortPanel({
  fort, selTile, selKey, cmds,
  upgradeFort, startReposition, setPopupMode,
}) {
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

  const idleCmds = (cmds || []).filter(c =>
    c.owner === "player" && !c.march && c.tk !== selKey && !c.stranded
  );

  return (
    <div style={{
      background: "rgba(180,130,20,.06)",
      border: "1px solid rgba(180,130,20,.25)",
      borderRadius: 6, padding: "8px 10px",
    }}>
      {/* Fort header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: 10, color: "#d4a030", fontWeight: 700 }}>
          🏯 FORT — LV{fort.level}
        </span>
        <span style={{ fontSize: 7, color: "#a07828", fontFamily: "'Cinzel',serif" }}>
          {stationedCount}/{levelDef.capacity} stationed
        </span>
      </div>

      {/* Commander slot grid — always 6, large squares with bust images */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5, marginBottom: 8 }}>
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
      {selTile?.owner === "player" && (
        <div style={{ display: "flex", gap: 5 }}>
          {nextDef && (
            <button onClick={() => upgradeFort?.(fort.id)} style={{
              flex: 1, padding: "8px 0",
              background: "linear-gradient(135deg,rgba(60,80,20,.5),rgba(40,60,10,.3))",
              border: "1px solid #6a8020", color: "#a0c040",
              fontFamily: "'Cinzel',serif", fontSize: 10, fontWeight: 700,
              borderRadius: 5, cursor: "pointer",
            }}>⬆ UPGRADE</button>
          )}
          {idleCmds.length > 0 && stationedCount < levelDef.capacity && (
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
      )}
    </div>
  );
});
