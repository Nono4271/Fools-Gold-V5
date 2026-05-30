import { memo } from "react";
import { hqSiegeValue } from "../../../../shared/constants/map.js";

export default memo(function HQPopup({
  selTile, playerHqKey, facName, facKey, facDisplayName,
  cmds, recallStationary,
  onEnterHQ, popupMode, setPopupMode,
}) {
  const siege = selTile?.siege ?? hqSiegeValue(selTile?.wallLvl);
  const siegeMax = hqSiegeValue(selTile?.wallLvl);
  const siegePct = Math.round((siege / siegeMax) * 100);
  const barColor = siegePct > 66 ? "#3daa60" : siegePct > 33 ? "#d0a030" : "#cc3030";

  const stationaryCmds = cmds.filter(c =>
    c.owner === "player" && !c.march && c.tk && c.tk !== playerHqKey
  );

  if (popupMode === "hqSummon") {
    return (
      <div style={{
        background: "rgba(5,7,11,.97)", border: "1px solid #3a6a3a",
        borderRadius: 8, overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,.9)",
        width: 200,
      }}>
        <div style={{
          padding: "8px 10px", borderBottom: "1px solid #1e2a1e",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <button onClick={() => setPopupMode("hqEnter")}
            style={{ background: "none", border: "none", color: "#6a8a6a", fontSize: 14, cursor: "pointer", padding: 0 }}>
            ←
          </button>
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: 10, color: "#90c870", fontWeight: 700 }}>
            ↩ Summon Commander
          </span>
        </div>
        <div style={{ padding: "6px 8px", maxHeight: 220, overflowY: "auto", scrollbarWidth: "none" }}>
          {stationaryCmds.length === 0 ? (
            <div style={{ fontSize: 8, color: "#5a4a3a", fontFamily: "'Crimson Pro',serif", fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>
              No commanders available to recall
            </div>
          ) : stationaryCmds.map(cmd => (
            <div key={cmd.uid} onClick={() => recallStationary(cmd.uid)}
              style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
                padding: "5px 7px", background: "rgba(96,192,240,.06)",
                border: "1px solid rgba(96,192,240,.2)", borderRadius: 4, cursor: "pointer",
              }}>
              <span style={{ fontSize: 16 }}>{cmd.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, color: "#c0e0f8", fontWeight: 700,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cmd.n}</div>
                <div style={{ fontSize: 7, color: "#4a7a8a" }}>
                  Lv{cmd.lvl || 5} · {(cmd.troops || 0).toLocaleString()} troops
                </div>
              </div>
              <span style={{ fontSize: 10, color: "#60c0f0", flexShrink: 0 }}>↩</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Main HQ popup
  return (
    <div style={{
      background: "rgba(5,7,11,.97)", border: "1px solid #3a6a3a",
      borderRadius: 8, overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,.9)",
      width: 200,
    }}>
      {/* Header */}
      <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid #1e2a1e" }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "#c8f0c8", fontWeight: 700 }}>
          🏰 Headquarters
        </div>
        <div style={{ fontSize: 8, color: "#5a6a5a", marginTop: 1 }}>
          {selTile?.c},{selTile?.r}
        </div>
      </div>

      {/* Siege bar */}
      <div style={{ padding: "8px 10px", borderBottom: "1px solid #1e2a1e" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: 7, color: "#6a7a6a", letterSpacing: ".05em" }}>
            🛡 WALL STRENGTH
          </span>
          <span style={{ fontSize: 8, color: barColor, fontWeight: 700, fontFamily: "'Cinzel',serif" }}>
            {siege.toLocaleString()}/{siegeMax.toLocaleString()}
          </span>
        </div>
        <div style={{ height: 5, background: "#0e1018", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${siegePct}%`, background: barColor, borderRadius: 3, transition: "width .3s" }}/>
        </div>
      </div>

      {/* Owner */}
      {facName && (
        <div style={{
          padding: "6px 10px", borderBottom: "1px solid #1e2a1e",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ fontSize: 16 }}>🏴‍☠️</span>
          <div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#90c870", fontWeight: 700 }}>{facName}</div>
            <div style={{ fontSize: 7, color: "#5a7a5a" }}>{facDisplayName ?? facName}</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "8px 10px", display: "flex", gap: 6 }}>
        <button onClick={onEnterHQ}
          style={{
            flex: 1, padding: "8px 0",
            background: "linear-gradient(160deg,#3a2808,#1e1404)",
            border: "1px solid #8a6020", borderRadius: 5,
            color: "#f0c060", fontFamily: "'Cinzel',serif", fontSize: 10,
            letterSpacing: ".05em", cursor: "pointer", fontWeight: 700,
          }}>⚔ Enter</button>
        <button onClick={() => setPopupMode("hqSummon")}
          style={{
            flex: 1, padding: "8px 0",
            background: "linear-gradient(160deg,#082838,#041824)",
            border: "1px solid #206880", borderRadius: 5,
            color: "#60c0f0", fontFamily: "'Cinzel',serif", fontSize: 10,
            letterSpacing: ".05em", cursor: "pointer", fontWeight: 700,
          }}>↩ Summon</button>
      </div>
    </div>
  );
});
