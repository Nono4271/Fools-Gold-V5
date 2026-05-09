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
const DW = 1400, DH = 1000;

const POLYS = {
  saltmere:          [[0,0],[550,0],[550,50],[580,150],[300,150],[180,260],[0,260]],
  tidesreach:        [[850,0],[1400,0],[1400,260],[1220,260],[1100,150],[820,150],[850,50]],
  emberpeak:         [[0,200],[300,200],[300,510],[170,510],[0,510]],
  ironhaven:         [[1100,200],[1400,200],[1400,510],[1230,510],[1100,510]],
  ashenveil:         [[0,490],[170,490],[300,490],[300,810],[0,810]],
  grimhold:          [[1100,490],[1230,490],[1400,490],[1400,810],[1100,810]],
  sanctumhold:       [[0,790],[300,790],[300,850],[620,850],[620,1000],[0,1000]],
  shadowmere:        [[780,850],[1100,850],[1100,790],[1400,790],[1400,1000],[780,1000]],
  brinefields:       [[300,150],[580,150],[580,390],[460,390],[300,350]],
  coralfen:          [[820,150],[1100,150],[1100,350],[940,390],[820,390]],
  cinderplain:       [[300,200],[460,200],[460,390],[300,390]],
  stormwatch:        [[940,200],[1100,200],[1100,390],[940,390]],
  runemarks:         [[300,610],[460,610],[460,810],[300,810]],
  boneridge:         [[940,610],[1100,610],[1100,810],[940,810]],
  pilgrimfields:     [[300,810],[620,810],[620,850],[300,850]],
  darkfen:           [[780,810],[1100,810],[1100,850],[780,850]],
  shatteredShallows: [[460,150],[840,150],[1100,350],[940,390],[820,390],[700,350],[580,390],[460,390],[300,350]],
  ashenRift:         [[300,390],[460,390],[580,390],[620,610],[460,610],[300,610]],
  bloodmarch:        [[820,390],[940,390],[1100,390],[1100,610],[940,610],[780,610],[820,390]],
  holyGrail:         [[580,390],[820,390],[780,610],[620,610]],
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

  // Handle tap on SVG — convert client coords to viewBox coords and hit-test polygons
  const handleSvgClick = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    // Use changedTouches for touch events, otherwise clientX/Y
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const svgX = ((clientX - rect.left) / rect.width)  * DW;
    const svgY = ((clientY - rect.top)  / rect.height) * DH;

    // Point-in-polygon test
    function pointInPoly(px, py, poly) {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
      return inside;
    }

    for (const [key, poly] of Object.entries(POLYS)) {
      if (pointInPoly(svgX, svgY, poly)) {
        setSelected(prev => prev === key ? null : key);
        return;
      }
    }
    // Clicked empty space — deselect
    setSelected(null);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#080c10",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'Cinzel',serif",
      // Do NOT set touchAction here — let clicks through
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
        zIndex: 10,
      }}>
        {/* Back arrow — explicit large hit area */}
        <div
          onClick={onClose}
          onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
          style={{
            position: "absolute", left: 0, top: 0,
            width: 60, height: 46,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
        >
          <span style={{ fontSize: 24, color: "#c8a060", lineHeight: 1 }}>‹</span>
        </div>
        <span style={{ color: "#c8a060", fontSize: 15, fontFamily: "'Cinzel',serif", letterSpacing: ".14em" }}>
          WORLD MAP
        </span>
      </div>

      {/* Map area — use position:relative, no overflow:hidden so events aren't clipped */}
      <div style={{ flex: 1, position: "relative" }}>
        <svg
          viewBox={`0 0 ${DW} ${DH}`}
          preserveAspectRatio="none"
          style={{
            display: "block", width: "100%", height: "100%",
            cursor: "pointer",
            // Ensure SVG itself receives pointer events
            pointerEvents: "all",
          }}
          onClick={handleSvgClick}
          onTouchEnd={handleSvgClick}
        >
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
              <g key={key} style={{ pointerEvents: "none" }}>
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
                  style={{ animation: "holyPulse 2.5s ease-in-out infinite", pointerEvents: "none" }}/>
              </>
            );
          })()}

          {/* Vignette */}
          <rect width={DW} height={DH} fill="url(#wm-vig)" style={{ pointerEvents: "none" }}/>

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

          {/* ── Region labels ── */}
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

          {/* ── Keep icons ── */}
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

            if (isHG) return (
              <g key={`icon_${reg.key}`} style={{ pointerEvents: "none" }}>
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
              <g key={`icon_${reg.key}`} style={{ pointerEvents: "none" }}>
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
          zIndex: 10,
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
              <button
                onClick={() => {
                  onClose();
                  requestAnimationFrame(() => onTeleport(selectedKeep.cx, selectedKeep.cy));
                }}
                style={{
                  padding: "7px 18px",
                  background: "linear-gradient(160deg,#2a1e08,#100c02)",
                  border: "1px solid #8a6020", borderRadius: 4,
                  color: "#f0c060", fontFamily: "'Cinzel',serif",
                  fontSize: 11, letterSpacing: ".06em", cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}>Go →</button>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "none", border: "none", color: "#4a4030",
                  fontSize: 16, cursor: "pointer", padding: "8px",
                  WebkitTapHighlightColor: "transparent",
                }}>
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
