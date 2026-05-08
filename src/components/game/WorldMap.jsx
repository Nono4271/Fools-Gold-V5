import { useState, useMemo, useEffect, memo } from "react";
import { REGION_LIST } from "../../../shared/constants/regions.js";
import { PLAYABLE_FACTIONS } from "../../../shared/constants/factions.js";
import { ISO_W, ISO_H, TW, TH, TOP_PAD, ROWS } from "../../../shared/constants/geometry.js";
import { ICON_SCALE, HIT_PAD } from "../../constants/device.js";

const FAC_COLOR = { player: "#44aaff" };
PLAYABLE_FACTIONS.forEach(f => { FAC_COLOR[f.key] = f.c; });

function keepColor(owner) {
  if (!owner) return "#b8a88a";
  if (owner === "player") return "#44aaff";
  return FAC_COLOR[owner] || "#cc8844";
}

// ── Design space: 700×700 ────────────────────────────────────────────────────
const DW = 700, DH = 700;

// v11 polygon layout — zero-gap, all borders verified
// Shallows rendered as 3 sub-polygons (same fill) to avoid self-intersection around HG notch
const POLYS = {
  saltmere:          [[0,0],[206,0],[171,113],[192,192],[0,192]],
  brinefields:       [[206,0],[350,0],[350,120],[170,120]],
  coralfen:          [[350,0],[494,0],[530,120],[350,120]],
  tidesreach:        [[494,0],[700,0],[700,192],[508,192],[529,113]],
  emberpeak:         [[0,192],[205,192],[205,280],[188,381],[0,381]],
  // shallows as one polygon — U-shape tracing around the HolyGrail notch
  // Fixed: left leg [197,280]→[205,280]; right leg uses [508,192],[508,280] to match Ironhaven
  shatteredShallows: [[173,120],[530,120],[508,192],[508,259],[390,259],[390,280],[310,280],[310,252],[205,252],[205,192],[192,192],[173,120]],
  // Fixed: left top [495,192]→[508,192]; added [508,280] to close cleanly against Shallows/Bloodmarch
  ironhaven:         [[508,192],[700,192],[700,381],[512,381],[508,280]],
  cinderplain:       [[0,381],[175,381],[175,496],[0,496]],
  stormwatch:        [[525,381],[700,381],[700,496],[525,496]],
  // Fixed: starts at [175,381]; top-left uses [205,280] to align with Shallows' corrected left leg
  ashenRift:         [[175,381],[188,381],[205,252],[310,252],[310,479],[350,479],[350,580],[175,580],[175,381]],
  holyGrail:         [[310,280],[390,280],[390,479],[310,479]],
  // Fixed: top-right uses [508,192],[508,280] to follow Ironhaven's left boundary
  bloodmarch:        [[390,259],[508,259],[512,381],[525,381],[525,580],[350,580],[350,479],[390,479],[390,259]],
  runemarks:         [[175,580],[350,580],[350,700],[200,700],[175,630]],
  boneridge:         [[350,580],[525,580],[525,630],[500,700],[350,700]],
  ashenveil:         [[0,496],[175,496],[175,580],[175,630],[200,700],[0,700]],
  grimhold:          [[525,496],[700,496],[700,700],[500,700],[525,630]],
};

const REGION_TERRAIN = {
  saltmere:          { base: "#1e1e14", dark: "#141410" },
  tidesreach:        { base: "#101e28", dark: "#081418" },
  brinefields:       { base: "#241e0e", dark: "#181208" },
  coralfen:          { base: "#102028", dark: "#081418" },
  emberpeak:         { base: "#1e1010", dark: "#140808" },
  ironhaven:         { base: "#081428", dark: "#040c18" },
  shatteredShallows: { base: "#1e2e18", dark: "#141e10" },
  cinderplain:       { base: "#1e1408", dark: "#140e04" },
  stormwatch:        { base: "#081828", dark: "#040e18" },
  holyGrail:         { base: "#1e3018", dark: "#142010" },
  ashenRift:         { base: "#281808", dark: "#1c1004" },
  bloodmarch:        { base: "#220808", dark: "#180404" },
  runemarks:         { base: "#141820", dark: "#0c1018" },
  boneridge:         { base: "#18140c", dark: "#100e08" },
  ashenveil:         { base: "#120e1e", dark: "#0c0814" },
  grimhold:          { base: "#0e1808", dark: "#080e04" },
};

function scalePts(pts, sx, sy) {
  return pts.map(([x, y]) => `${(x * sx).toFixed(1)},${(y * sy).toFixed(1)}`).join(" ");
}

function centroid(pts) {
  return [
    pts.reduce((s, [x]) => s + x, 0) / pts.length,
    pts.reduce((s, [, y]) => s + y, 0) / pts.length,
  ];
}

function garrisonLabel(g) {
  if (!g)        return "Empty";
  if (g >= 5000) return "Massive";
  if (g >= 2000) return "Large";
  if (g >= 500)  return "Medium";
  return "Small";
}

export default memo(function WorldMap({ tiles, onClose, onTeleport, panRef, zoom }) {
  const [selected, setSelected] = useState(null);
  const [dotPos, setDotPos] = useState(() => panRef?.current || { x: 4, y: 4 });

  useEffect(() => {
    const id = setInterval(() => {
      if (panRef?.current) setDotPos({ ...panRef.current });
    }, 100);
    return () => clearInterval(id);
  }, [panRef]);

  const screenW = typeof window !== "undefined" ? window.innerWidth  : 390;
  const screenH = typeof window !== "undefined" ? window.innerHeight : 844;

  const keeps = useMemo(() => {
    return REGION_LIST.map(reg => {
      const t = tiles[`${reg.cx},${reg.cy}`];
      return { ...reg, owner: t?.owner || null, garrison: t?.garrison || 0,
               siege: t?.siege || 0, siegeMax: t?.siegeMax || 0 };
    });
  }, [tiles]);

  const selectedKeep = selected ? keeps.find(k => k.key === selected) : null;

  const sx = 1, sy = 1;
  const iconMult = ICON_SCALE;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#080c10",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'Cinzel',serif",
    }}>
      <style>{`
        @keyframes holyPulse { 0%,100%{opacity:.3} 50%{opacity:.6} }
      `}</style>

      {/* Top bar */}
      <div style={{
        flexShrink: 0, height: 46,
        background: "rgba(0,0,0,0.85)",
        borderBottom: "1px solid rgba(200,160,64,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <div style={{ cursor: "pointer", position: "absolute", left: 4,
          padding: "4px 10px", fontSize: 20, color: "#c8a060" }}
          onClick={onClose}>‹</div>
        <span style={{ color: "#c8a060", fontSize: 15, fontFamily: "'Cinzel',serif", letterSpacing: ".14em" }}>
          WORLD MAP
        </span>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <svg viewBox={`0 0 ${DW} ${DH}`} preserveAspectRatio="none"
          style={{ display: "block", width: "100%", height: "100%" }}>
          <defs>
            <filter id="wm-drop">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.9)"/>
            </filter>
            <radialGradient id="wm-vig" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="transparent"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0.45)"/>
            </radialGradient>
          </defs>

          {/* Base */}
          <rect width={DW} height={DH} fill="#0a1418"/>

          {/* ── Region polygons ── */}
          {Object.entries(POLYS).map(([key, poly]) => {
            const reg = keeps.find(k => k.key === key);
            if (!reg) return null;

            const isSel  = selected === key;
            const owned  = reg.owner;
            const facCol = owned ? (owned === "player" ? "#44aaff" : (FAC_COLOR[owned] || "#cc8844")) : null;
            const isHG   = key === "holyGrail";

            return (
              <g key={key} style={{ cursor: "pointer" }}
                onClick={() => setSelected(isSel ? null : key)}>
                <polygon points={scalePts(poly, sx, sy)}
                  fill={isHG ? "rgba(240,192,64,0.08)" : facCol ? facCol : "#1e1e1e"}
                  opacity={isHG ? 1 : facCol ? 0.35 : 0.7}
                  clipPath={isHG ? "url(#hg-clip)" : undefined}/>
                {isSel && <polygon points={scalePts(poly, sx, sy)} fill="white" opacity={0.07}/>}
                {!isHG && (
                  <polygon points={scalePts(poly, sx, sy)} fill="none"
                    stroke={facCol || "#3a3228"}
                    strokeWidth={isSel ? 2 : 0.8}
                    strokeOpacity={facCol ? 0.7 : 0.45}/>
                )}
              </g>
            );
          })}

          {/* Holy Grail glow */}
          {(() => {
            const poly = POLYS["holyGrail"];
            if (!poly) return null;
            const [cx, cy] = centroid(poly);
            return (
              <>
                <defs>
                  <clipPath id="hg-clip">
                    <polygon points={scalePts(poly, sx, sy)}/>
                  </clipPath>
                </defs>
                <circle cx={cx * sx} cy={cy * sy} r={38 * sx}
                  fill="rgba(240,192,64,0.1)"
                  clipPath="url(#hg-clip)"
                  style={{ animation: "holyPulse 2.5s ease-in-out infinite" }}/>
              </>
            );
          })()}

          {/* Vignette */}
          <rect width={DW} height={DH} fill="url(#wm-vig)"/>

          {/* ── Player viewport dot ── */}
          {dotPos && zoom && (() => {
            const worldX = (screenW / 2 - dotPos.x) / zoom;
            const worldY = (screenH / 2 - dotPos.y) / zoom;
            const u = worldX - ROWS * TW / 2;
            const v = worldY - TOP_PAD;
            const tileC = (u / (TW / 2) + v / (TH / 2)) / 2;
            const tileR = (v / (TH / 2) - u / (TW / 2)) / 2;
            const dotX = tileC * sx;
            const dotY = tileR * sy;
            if (dotX < 0 || dotX > DW || dotY < 0 || dotY > DH) return null;
            return (
              <g style={{ pointerEvents: "none" }}>
                <circle cx={dotX} cy={dotY} r={6 * sx} fill="rgba(68,170,255,0.18)" stroke="#44aaff" strokeWidth={1.2}/>
                <circle cx={dotX} cy={dotY} r={2.5 * sx} fill="#44aaff" opacity={0.95}/>
              </g>
            );
          })()}

          {/* ── Region labels (one per logical region) ── */}
          {keeps.map(reg => {
            if (reg.key === "holyGrail") return null;

            const poly = POLYS[reg.key];
            if (!poly) return null;

            const owned = reg.owner;
            const col = owned
              ? (owned === "player" ? "#88ccff" : (FAC_COLOR[owned] || "#ddaa66"))
              : "rgba(160,140,100,0.45)";
            const fs = Math.max(6, Math.min(9, 7.5 * sx));
            if (reg.cy * sy > DH - 20) return null;
            return (
              <text key={`lbl_${reg.key}`}
                x={reg.cx * sx} y={reg.cy * sy + 3}
                textAnchor="middle" fontSize={fs}
                fill={col} fontFamily="'Cinzel',serif"
                letterSpacing=".02em"
                style={{ pointerEvents: "none", userSelect: "none" }}>
                {reg.name.replace("The ", "").replace(" Keep", "").replace("Shattered ", "Sh. ")}
              </text>
            );
          })}

          {/* ── Keep icons (one per logical region) ── */}
          {keeps.map(reg => {
            const poly = POLYS[reg.key];
            if (!poly) return null;

            const cx = reg.cx * sx, cy = reg.cy * sy;
            if (cy > DH - 15) return null;

            const owned  = reg.owner;
            const col    = keepColor(owned);
            const isHG   = reg.key === "holyGrail";
            const sz     = (isHG ? 14 * sx : reg.layer === "conflict" ? 11 * sx : 10 * sx) * iconMult;
            const isSel  = selected === reg.key;
            const by     = cy - sz * 1.2;
            const hitPad = HIT_PAD * sx;

            if (isHG) return (
              <g key={`icon_${reg.key}`} style={{ cursor: "pointer" }}
                onClick={() => setSelected(isSel ? null : reg.key)}>
                {isSel && <circle cx={cx} cy={cy} r={sz * 2.5} fill="none" stroke="#f0c040" strokeWidth={1.5} opacity={0.7}/>}
                <circle cx={cx} cy={cy} r={sz * 1.8} fill="rgba(240,192,64,0.12)" stroke="#f0c040" strokeWidth={0.8} opacity={0.7}/>
                <path d={`M${cx-sz*.5},${cy-sz*.5} L${cx+sz*.5},${cy-sz*.5} L${cx+sz*.35},${cy+sz*.15} L${cx-sz*.35},${cy+sz*.15}Z`}
                  fill="#f0c040" opacity={0.9}/>
                <path d={`M${cx-sz*.2},${cy+sz*.15} L${cx+sz*.2},${cy+sz*.15} L${cx+sz*.1},${cy+sz*.5} L${cx-sz*.1},${cy+sz*.5}Z`}
                  fill="#c8a020" opacity={0.9}/>
                <text x={cx} y={cy + sz * 1.5} textAnchor="middle" fontSize={Math.max(5.5, sz * .85)}
                  fill="rgba(240,192,64,0.85)" fontFamily="'Cinzel',serif" letterSpacing=".06em"
                  style={{ pointerEvents: "none" }}>Holy Grail</text>
              </g>
            );

            return (
              <g key={`icon_${reg.key}`} style={{ cursor: "pointer" }}
                onClick={() => setSelected(isSel ? null : reg.key)}>
                <rect x={cx - sz - hitPad} y={by - sz * 1.4 - hitPad} width={sz * 2 + hitPad * 2} height={sz * 2.8 + hitPad * 2} fill="transparent"/>
                {owned && <circle cx={cx} cy={by} r={sz * 1.6} fill={col} opacity={0.15}/>}
                {isSel && <circle cx={cx} cy={by} r={sz * 2.1} fill="none" stroke={col} strokeWidth={1.4} opacity={0.8}/>}
                <rect x={cx - sz * .58} y={by} width={sz * 1.16} height={sz} rx={1}
                  fill={owned ? col : "#5a4a30"} opacity={0.92}/>
                {[-0.4, -0.13, 0.13, 0.4].map((dx, i) => (
                  <rect key={i} x={cx + dx * sz * 2 - sz * .13} y={by - sz * .48} width={sz * .24} height={sz * .52} rx={1}
                    fill={owned ? col : "#5a4a30"} opacity={0.92}/>
                ))}
                <path d={`M${cx-sz*.2},${by+sz} L${cx-sz*.2},${by+sz*.5} Q${cx},${by+sz*.28} ${cx+sz*.2},${by+sz*.5} L${cx+sz*.2},${by+sz}Z`}
                  fill={owned ? "rgba(0,0,0,0.55)" : "#1e1408"}/>
                {owned && <>
                  <line x1={cx} y1={by - sz * .48} x2={cx} y2={by - sz * 1.4} stroke={col} strokeWidth={1.3}/>
                  <polygon points={`${cx},${by-sz*1.4} ${cx+sz*.5},${by-sz*1.18} ${cx},${by-sz*.95}`}
                    fill={col} opacity={0.95}/>
                </>}
              </g>
            );
          })}

        </svg>
      </div>

      {/* ── Detail panel ── */}
      {selectedKeep && (
        <div style={{
          flexShrink: 0,
          background: "rgba(4,6,10,0.98)",
          borderTop: "1px solid rgba(200,160,64,0.2)",
          padding: "10px 14px 14px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ color: "#c8a060", fontSize: 12, letterSpacing: ".06em" }}>
                {selectedKeep.keepName}
              </div>
              <div style={{
                color: selectedKeep.owner
                  ? (selectedKeep.owner === "player" ? "#88ccff" : (FAC_COLOR[selectedKeep.owner] || "#cc8844"))
                  : "#7a6a50",
                fontSize: 10, marginTop: 2,
              }}>
                {!selectedKeep.owner ? "Unoccupied"
                  : selectedKeep.owner === "player" ? "Your Faction" : "Enemy"}
                {selectedKeep.garrison > 0 && ` · ${garrisonLabel(selectedKeep.garrison)} garrison`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => { onClose(); requestAnimationFrame(() => onTeleport(selectedKeep.cx, selectedKeep.cy)); }}
                style={{
                  padding: "7px 18px",
                  background: "linear-gradient(160deg,#2a1e08,#100c02)",
                  border: "1px solid #8a6020", borderRadius: 4,
                  color: "#f0c060", fontFamily: "'Cinzel',serif",
                  fontSize: 11, letterSpacing: ".06em", cursor: "pointer",
                }}>Go →</button>
              <button onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", color: "#4a4030", fontSize: 16, cursor: "pointer", padding: 0 }}>
                ✕
              </button>
            </div>
          </div>
          <div style={{
            padding: "3px 8px", borderRadius: 3, display: "inline-block",
            background: selectedKeep.layer === "ring"     ? "rgba(240,192,64,0.12)"
                      : selectedKeep.layer === "conflict" ? "rgba(220,60,40,0.12)"
                      : "rgba(60,80,60,0.12)",
            border: `1px solid ${
              selectedKeep.layer === "ring" ? "#7a5010"
              : selectedKeep.layer === "conflict" ? "#6a2010" : "#2a3a2a"
            }`,
            color: selectedKeep.layer === "ring" ? "#c8a040"
                 : selectedKeep.layer === "conflict" ? "#cc5040" : "#4a6a4a",
            fontSize: 8,
          }}>
            {selectedKeep.layer === "ring"     ? "⚜ Holy Ring"
             : selectedKeep.layer === "conflict" ? "⚔ Conflict Zone"
             : selectedKeep.layer === "farm"     ? "🌾 Farm Region" : "🏰 Starting Region"}
          </div>
          {selectedKeep.siegeMax > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ background: "#0a0c10", borderRadius: 2, height: 5, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.round((selectedKeep.siege / selectedKeep.siegeMax) * 100)}%`,
                  background: "linear-gradient(90deg,#882020,#dd3030)", borderRadius: 2,
                }}/>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
