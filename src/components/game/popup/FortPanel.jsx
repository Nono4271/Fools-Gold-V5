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

  // Build slot grid
  const slots = Array.from({ length: levelDef.capacity }, (_, i) => ({
    filled: i < stationedCount,
    uid: fort.stationedCmdUids?.[i] ?? null,
  }));

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
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
      }}>
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: 10, color: "#d4a030", fontWeight: 700 }}>
          🏯 FORT — LV{fort.level}
        </span>
        <span style={{ fontSize: 7, color: "#a07828", fontFamily: "'Cinzel',serif" }}>
          {stationedCount}/{levelDef.capacity} stationed
        </span>
      </div>

      {/* Commander capacity slot grid */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {slots.map((slot, i) => (
          <div key={i} style={{
            flex: 1, height: 32, borderRadius: 4,
            background: slot.filled ? "rgba(240,192,64,.15)" : "rgba(30,24,16,.6)",
            border: `1px solid ${slot.filled ? "rgba(240,192,64,.4)" : "rgba(80,60,20,.3)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: slot.filled ? 16 : 12,
            color: slot.filled ? "#f0c040" : "#3a2a10",
          }}>
            {slot.filled ? "👤" : "🔒"}
          </div>
        ))}
      </div>

      {/* Fort siege bar */}
      <div style={{ marginBottom: nextDef || idleCmds.length ? 8 : 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: 7, color: "#6a5a3a", letterSpacing: ".05em" }}>
            🛡 FORT SIEGE
          </span>
          <span style={{ fontSize: 7, color: barColor, fontWeight: 700, fontFamily: "'Cinzel',serif" }}>
            {fort.siege.toLocaleString()}/{fort.siegeMax.toLocaleString()}
          </span>
        </div>
        <div style={{ height: 5, background: "#0e1018", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${siegePct}%`, background: barColor, borderRadius: 3, transition: "width .3s" }}/>
        </div>
      </div>

      {/* Upgrade button */}
      {nextDef && selTile?.owner === "player" && (
        <button onClick={() => upgradeFort?.(fort.id)}
          style={{
            width: "100%", padding: "6px 0", marginBottom: idleCmds.length ? 5 : 0,
            background: "linear-gradient(135deg,rgba(60,80,20,.5),rgba(40,60,10,.3))",
            border: "1px solid #6a8020", color: "#a0c040",
            fontFamily: "'Cinzel',serif", fontSize: 8, fontWeight: 700,
            borderRadius: 4, cursor: "pointer", letterSpacing: ".04em",
          }}>
          ⬆ Upgrade to Lv{fort.level + 1} · {nextDef.capacity} capacity · {(nextDef.siege / 1000).toFixed(0)}K siege
        </button>
      )}

      {/* Reposition button */}
      {selTile?.owner === "player" && idleCmds.length > 0 && stationedCount < levelDef.capacity && (
        <button onClick={() => {
          if (idleCmds.length === 1) startReposition?.(idleCmds[0].uid, selKey, fort.id);
          else setPopupMode?.("repositionPick");
        }}
          style={{
            width: "100%", padding: "6px 0",
            background: "linear-gradient(135deg,rgba(20,60,100,.5),rgba(10,40,80,.3))",
            border: "1px solid #2060a0", color: "#60a0e0",
            fontFamily: "'Cinzel',serif", fontSize: 8, fontWeight: 700,
            borderRadius: 4, cursor: "pointer", letterSpacing: ".04em",
          }}>
          📍 Station Commander Here
        </button>
      )}
    </div>
  );
});
