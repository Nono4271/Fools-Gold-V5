import { RARITY } from "../../../../shared/constants/heroes.js";

export default function RosterPortrait({ cmd, selected, onClick }) {
  const r = RARITY[cmd.rarity] ?? RARITY.soldier;
  const rLvl = cmd.respectLevel ?? 0;

  return (
    <div onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      padding: "8px 6px",
      borderRight: `2px solid ${selected ? r.color : "transparent"}`,
      background: selected ? `${r.color}10` : "transparent",
      cursor: "pointer", transition: "background .15s",
      position: "relative",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
        background: `conic-gradient(${r.color} 0deg, #140f06 80deg, ${r.color} 180deg, #140f06 260deg, ${r.color} 360deg)`,
        padding: selected ? 3 : 2,
        boxShadow: selected
          ? `0 0 0 1px ${r.color}, 0 0 18px ${r.color}50`
          : "0 2px 8px rgba(0,0,0,.8)",
        transition: "box-shadow .15s, padding .1s",
        position: "relative",
      }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: `radial-gradient(circle at 38% 32%, ${r.color}25, #0c0a07)`,
          border: `1px solid ${r.color}45`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, overflow: "hidden", position: "relative",
        }}>
          {cmd.icon}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "38%",
            background: "linear-gradient(to top, rgba(0,0,0,.75), transparent)",
          }} />
        </div>

        <div style={{
          position: "absolute", top: -3, left: -3,
          padding: "1px 4px", borderRadius: 3,
          background: "linear-gradient(135deg,#1c1408,#0a0805)",
          border: `1px solid ${r.color}55`,
          fontFamily: "'Cinzel',serif", fontSize: 7, fontWeight: 700, color: r.color,
        }}>{cmd.lvl ?? 5}</div>

        {cmd.march && (
          <div style={{
            position: "absolute", top: -2, right: -2,
            width: 14, height: 14, borderRadius: "50%",
            background: cmd.march.type === "attack" ? "#cc3030" : "#3daa60",
            border: "1px solid #0c0a07",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7,
          }}>{cmd.march.type === "attack" ? "⚔" : "→"}</div>
        )}

        <div style={{
          position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
          padding: "1px 5px", borderRadius: 8,
          background: "#0c0a07", border: `1px solid ${r.color}45`,
          fontFamily: "'Cinzel',serif", fontSize: 6, color: r.color, whiteSpace: "nowrap",
        }}>R{rLvl}</div>
      </div>

      <div style={{
        fontFamily: "'Cinzel',serif", fontSize: 7, marginTop: 2,
        color: selected ? r.color : "#4a3a28",
        textAlign: "center", maxWidth: 64,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        transition: "color .15s",
      }}>{cmd.n.split(" ")[0]}</div>

      {/* Stamina bar */}
      {(() => {
        const stam = cmd.stamina ?? 200;
        const pct  = Math.max(0, Math.min(100, (stam / 200) * 100));
        const sc   = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";
        return (
          <div style={{ width: 52, marginTop: 1 }}>
            <div style={{ height: 3, background: "rgba(0,0,0,.5)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: sc, borderRadius: 2, transition: "width .3s" }} />
            </div>
            <div style={{ textAlign: "center", fontSize: 5, color: sc, fontFamily: "'Cinzel',serif", marginTop: 1 }}>
              ⚡{Math.floor(stam)}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
