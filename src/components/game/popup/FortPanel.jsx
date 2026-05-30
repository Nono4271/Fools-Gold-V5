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
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
      }}>
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: 10, color: "#d4a030", fontWeight: 700 }}>
          🏯 FORT — LV{fort.level}
        </span>
        <span style={{ fontSize: 7, color: "#a07828", fontFamily: "'Cinzel',serif" }}>
          {stationedCount}/{levelDef.capacity} stationed · Lv{fort.level}
        </span>
      </div>

      {/* Commander capacity slot grid — always 6 slots */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {slots.map((slot, i) => (
          <div key={i} style={{
            flex: 1, aspectRatio: "1", borderRadius: 5,
            background: !slot.unlocked
              ? "rgba(20,16,10,.8)"
              : slot.cmd
                ? "rgba(240,192,64,.15)"
                : "rgba(30,24,16,.5)",
            border: `1px solid ${!slot.unlocked ? "rgba(50,40,20,.4)" : slot.cmd ? "rgba(240,192,64,.5)" : "rgba(100,80,30,.3)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", position: "relative",
          }}>
            {!slot.unlocked ? (
              <span style={{ fontSize: 12, opacity: 0.4 }}>🔒</span>
            ) : slot.cmd ? (
              slot.cmd.bust
                ? <img src={slot.cmd.bust} alt={slot.cmd.n}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 18 }}>{slot.cmd.icon ?? "👤"}</span>
            ) : (
              <span style={{ fontSize: 10, opacity: 0.25, color: "#c8a040" }}>+</span>
            )}
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
