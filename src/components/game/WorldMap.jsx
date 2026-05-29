import { useState, useMemo, useEffect, memo } from "react";
import { REGIONS, REGION_POLYGONS } from "../../../shared/constants/regions.js";
import { PLAYABLE_FACTIONS } from "../../../shared/constants/factions.js";
import { ISO_W, ISO_H, TW, TH, TOP_PAD, ROWS } from "../../../shared/constants/geometry.js";
import { ICON_SCALE, HIT_PAD } from "../../constants/device.js";

// Convert REGIONS object to REGION_LIST array for compatibility
const REGION_LIST = Object.values(REGIONS);
const POLYS = REGION_POLYGONS;

const FAC_COLOR = { player: "#44aaff" };
PLAYABLE_FACTIONS.forEach(f => { FAC_COLOR[f.key] = f.c; });

// Hardcoded for world map top-down view - DO NOT import from mapGen
const CROSSINGS = [
  // Row 1 vertical gates (y=1213)
  { axis:"V", bCoord:  205, gCoord: 1213, type:"tunnel" },
  { axis:"V", bCoord:  410, gCoord: 1213, type:"crossing" },
  { axis:"V", bCoord:  615, gCoord: 1213, type:"crossing" },
  { axis:"V", bCoord:  820, gCoord: 1213, type:"tunnel" },
  { axis:"V", bCoord: 1025, gCoord: 1213, type:"crossing" },
  { axis:"V", bCoord: 1230, gCoord: 1213, type:"crossing" },
  { axis:"V", bCoord: 1435, gCoord: 1213, type:"tunnel" },
  { axis:"V", bCoord: 1640, gCoord: 1213, type:"crossing" },
  // Row 2 vertical gates (y=1078)
  { axis:"V", bCoord:  205, gCoord: 1078, type:"crossing" },
  { axis:"V", bCoord:  615, gCoord: 1078, type:"tunnel" },
  { axis:"V", bCoord:  820, gCoord: 1078, type:"crossing" },
  { axis:"V", bCoord: 1025, gCoord: 1078, type:"crossing" },
  { axis:"V", bCoord: 1230, gCoord: 1078, type:"tunnel" },
  { axis:"V", bCoord: 1640, gCoord: 1078, type:"crossing" },
  // Row 3 vertical gates (y=942)
  { axis:"V", bCoord:  205, gCoord:  942, type:"crossing" },
  { axis:"V", bCoord:  410, gCoord:  942, type:"tunnel" },
  { axis:"V", bCoord:  615, gCoord:  942, type:"crossing" },
  { axis:"V", bCoord:  820, gCoord:  942, type:"crossing" },
  { axis:"V", bCoord: 1025, gCoord:  942, type:"tunnel" },
  { axis:"V", bCoord: 1230, gCoord:  942, type:"crossing" },
  { axis:"V", bCoord: 1435, gCoord:  942, type:"crossing" },
  { axis:"V", bCoord: 1640, gCoord:  942, type:"tunnel" },
  // Row 4 vertical gates (y=797)
  { axis:"V", bCoord:  205, gCoord:  797, type:"crossing" },
  { axis:"V", bCoord:  410, gCoord:  797, type:"crossing" },
  { axis:"V", bCoord: 1435, gCoord:  797, type:"tunnel" },
  { axis:"V", bCoord: 1640, gCoord:  797, type:"crossing" },
  // Row 5 vertical gates (y=652)
  { axis:"V", bCoord:  205, gCoord:  652, type:"crossing" },
  { axis:"V", bCoord:  410, gCoord:  652, type:"tunnel" },
  { axis:"V", bCoord: 1435, gCoord:  652, type:"crossing" },
  { axis:"V", bCoord: 1640, gCoord:  652, type:"crossing" },
  // Row 6 vertical gates (y=507)
  { axis:"V", bCoord:  205, gCoord:  507, type:"tunnel" },
  { axis:"V", bCoord:  410, gCoord:  507, type:"crossing" },
  { axis:"V", bCoord: 1435, gCoord:  507, type:"crossing" },
  { axis:"V", bCoord: 1640, gCoord:  507, type:"tunnel" },
  // Row 7 vertical gates (y=362)
  { axis:"V", bCoord:  205, gCoord:  362, type:"crossing" },
  { axis:"V", bCoord:  410, gCoord:  362, type:"crossing" },
  { axis:"V", bCoord:  615, gCoord:  362, type:"tunnel" },
  { axis:"V", bCoord:  820, gCoord:  362, type:"crossing" },
  { axis:"V", bCoord: 1025, gCoord:  362, type:"crossing" },
  { axis:"V", bCoord: 1230, gCoord:  362, type:"tunnel" },
  { axis:"V", bCoord: 1435, gCoord:  362, type:"crossing" },
  { axis:"V", bCoord: 1640, gCoord:  362, type:"crossing" },
  // Row 8 vertical gates (y=217)
  { axis:"V", bCoord:  205, gCoord:  217, type:"tunnel" },
  { axis:"V", bCoord:  615, gCoord:  217, type:"crossing" },
  { axis:"V", bCoord:  820, gCoord:  217, type:"crossing" },
  { axis:"V", bCoord: 1025, gCoord:  217, type:"tunnel" },
  { axis:"V", bCoord: 1230, gCoord:  217, type:"crossing" },
  { axis:"V", bCoord: 1640, gCoord:  217, type:"crossing" },
  // Row 9 vertical gates (y=72)
  { axis:"V", bCoord:  205, gCoord:   72, type:"tunnel" },
  { axis:"V", bCoord:  410, gCoord:   72, type:"crossing" },
  { axis:"V", bCoord:  615, gCoord:   72, type:"crossing" },
  { axis:"V", bCoord:  820, gCoord:   72, type:"tunnel" },
  { axis:"V", bCoord: 1025, gCoord:   72, type:"crossing" },
  { axis:"V", bCoord: 1230, gCoord:   72, type:"crossing" },
  { axis:"V", bCoord: 1435, gCoord:   72, type:"tunnel" },
  { axis:"V", bCoord: 1640, gCoord:   72, type:"crossing" },
  // Horizontal gates
  { axis:"H", bCoord: 1162, gCoord:  102, type:"crossing" },
  { axis:"H", bCoord: 1162, gCoord:  307, type:"tunnel" },
  { axis:"H", bCoord: 1162, gCoord:  512, type:"tunnel" },
  { axis:"H", bCoord: 1162, gCoord:  717, type:"crossing" },
  { axis:"H", bCoord: 1162, gCoord:  922, type:"tunnel" },
  { axis:"H", bCoord: 1162, gCoord: 1127, type:"tunnel" },
  { axis:"H", bCoord: 1162, gCoord: 1332, type:"crossing" },
  { axis:"H", bCoord: 1162, gCoord: 1537, type:"tunnel" },
  { axis:"H", bCoord: 1162, gCoord: 1742, type:"tunnel" },
  { axis:"H", bCoord: 1017, gCoord:  102, type:"crossing" },
  { axis:"H", bCoord: 1017, gCoord:  307, type:"tunnel" },
  { axis:"H", bCoord: 1017, gCoord:  512, type:"tunnel" },
  { axis:"H", bCoord: 1017, gCoord:  717, type:"crossing" },
  { axis:"H", bCoord: 1017, gCoord:  922, type:"tunnel" },
  { axis:"H", bCoord: 1017, gCoord: 1127, type:"tunnel" },
  { axis:"H", bCoord: 1017, gCoord: 1332, type:"crossing" },
  { axis:"H", bCoord: 1017, gCoord: 1537, type:"tunnel" },
  { axis:"H", bCoord: 1017, gCoord: 1742, type:"tunnel" },
  { axis:"H", bCoord:  872, gCoord:  307, type:"crossing" },
  { axis:"H", bCoord:  872, gCoord:  512, type:"tunnel" },
  { axis:"H", bCoord:  872, gCoord:  675, type:"tunnel" },
  { axis:"H", bCoord:  872, gCoord: 1170, type:"crossing" },
  { axis:"H", bCoord:  872, gCoord: 1332, type:"tunnel" },
  { axis:"H", bCoord:  872, gCoord: 1537, type:"tunnel" },
  { axis:"H", bCoord:  727, gCoord:  102, type:"crossing" },
  { axis:"H", bCoord:  727, gCoord:  307, type:"tunnel" },
  { axis:"H", bCoord:  727, gCoord:  512, type:"tunnel" },
  { axis:"H", bCoord:  727, gCoord:  870, type:"tunnel" },
  { axis:"H", bCoord:  727, gCoord:  975, type:"crossing" },
  { axis:"H", bCoord:  727, gCoord: 1332, type:"crossing" },
  { axis:"H", bCoord:  727, gCoord: 1537, type:"tunnel" },
  { axis:"H", bCoord:  727, gCoord: 1742, type:"tunnel" },
  { axis:"H", bCoord:  582, gCoord:  102, type:"crossing" },
  { axis:"H", bCoord:  582, gCoord:  307, type:"tunnel" },
  { axis:"H", bCoord:  582, gCoord:  512, type:"tunnel" },
  { axis:"H", bCoord:  582, gCoord:  870, type:"tunnel" },
  { axis:"H", bCoord:  582, gCoord:  975, type:"tunnel" },
  { axis:"H", bCoord:  582, gCoord: 1332, type:"crossing" },
  { axis:"H", bCoord:  582, gCoord: 1537, type:"tunnel" },
  { axis:"H", bCoord:  582, gCoord: 1742, type:"tunnel" },
  { axis:"H", bCoord:  437, gCoord:  307, type:"crossing" },
  { axis:"H", bCoord:  437, gCoord:  512, type:"tunnel" },
  { axis:"H", bCoord:  437, gCoord:  675, type:"tunnel" },
  { axis:"H", bCoord:  437, gCoord: 1170, type:"crossing" },
  { axis:"H", bCoord:  437, gCoord: 1332, type:"tunnel" },
  { axis:"H", bCoord:  437, gCoord: 1537, type:"crossing" },
  { axis:"H", bCoord:  292, gCoord:  102, type:"tunnel" },
  { axis:"H", bCoord:  292, gCoord:  307, type:"tunnel" },
  { axis:"H", bCoord:  292, gCoord:  512, type:"crossing" },
  { axis:"H", bCoord:  292, gCoord:  717, type:"tunnel" },
  { axis:"H", bCoord:  292, gCoord:  922, type:"tunnel" },
  { axis:"H", bCoord:  292, gCoord: 1127, type:"crossing" },
  { axis:"H", bCoord:  292, gCoord: 1332, type:"tunnel" },
  { axis:"H", bCoord:  292, gCoord: 1537, type:"tunnel" },
  { axis:"H", bCoord:  292, gCoord: 1742, type:"crossing" },
  { axis:"H", bCoord:  147, gCoord:  102, type:"tunnel" },
  { axis:"H", bCoord:  147, gCoord:  307, type:"tunnel" },
  { axis:"H", bCoord:  147, gCoord:  512, type:"crossing" },
  { axis:"H", bCoord:  147, gCoord:  717, type:"tunnel" },
  { axis:"H", bCoord:  147, gCoord:  922, type:"tunnel" },
  { axis:"H", bCoord:  147, gCoord: 1127, type:"crossing" },
  { axis:"H", bCoord:  147, gCoord: 1332, type:"tunnel" },
  { axis:"H", bCoord:  147, gCoord: 1537, type:"tunnel" },
  { axis:"H", bCoord:  147, gCoord: 1742, type:"crossing" },
  // L-shape gates
  { axis:"V", bCoord:  615, gCoord:  810, type:"tunnel" },
  { axis:"V", bCoord: 1230, gCoord:  810, type:"crossing" },
  { axis:"V", bCoord: 1230, gCoord:  810, type:"crossing" },
  { axis:"V", bCoord:  615, gCoord:  543, type:"tunnel" },
  { axis:"V", bCoord:  923, gCoord:  798, type:"crossing" },
  { axis:"V", bCoord:  923, gCoord:  798, type:"crossing" },
  { axis:"H", bCoord:  872, gCoord:  675, type:"tunnel" },
  { axis:"H", bCoord:  872, gCoord: 1170, type:"tunnel" },
  { axis:"H", bCoord:  437, gCoord: 1170, type:"crossing" },
  { axis:"H", bCoord:  437, gCoord:  675, type:"tunnel" },
  { axis:"H", bCoord:  654, gCoord:  718, type:"crossing" },
  { axis:"H", bCoord:  654, gCoord: 1127, type:"tunnel" },
];

function keepColor(owner) {
  if (!owner) return "#b8a88a";
  if (owner === "player") return "#44aaff";
  return FAC_COLOR[owner] || "#cc8844";
}

// ── Design space: 700×700 ────────────────────────────────────────────────────
const DW = 1845, DH = 1305;


function scalePts(pts, sx, sy) {
  return pts.map(([x, y]) => `${(x * sx).toFixed(1)},${(y * sy).toFixed(1)}`).join(" ");
}

function centroid(pts) {
  return [
    pts.reduce((s, [x]) => s + x, 0) / pts.length,
    pts.reduce((s, [, y]) => s + y, 0) / pts.length,
  ];
}


export default memo(function WorldMap({ tiles, onClose, onTeleport, panRef, zoom, crossings, keepMeta, playerHqKey, crewmatePlayerIds, aiHqKeys, forts }) {
  const [selected, setSelected] = useState(null);
  const [clickPos, setClickPos] = useState(null); // { x, y } in screen px

  // Viewport dot: convert pan → world pixel center → tile col/row → SVG coords
  const [dotPos, setDotPos] = useState(null);
  useEffect(() => {
    function update() {
      const pan = panRef?.current;
      if (!pan) return;
      const z = zoom || 1;
      const worldCX = (-pan.x + window.innerWidth  / 2) / z;
      const worldCY = (-pan.y + window.innerHeight / 2) / z;
      // Inverse of isoXY: cx=(c-r)*TW/2 + ROWS*TW/2, cy=(c+r)*TH/2 + TOP_PAD
      const u = worldCX - ROWS * TW / 2;
      const v = worldCY - TOP_PAD;
      const c = Math.max(0, Math.min(DW - 1, Math.round((u / (TW / 2) + v / (TH / 2)) / 2)));
      const r = Math.max(0, Math.min(DH - 1, Math.round((v / (TH / 2) - u / (TW / 2)) / 2)));
      setDotPos({ c, r });
    }
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [panRef, zoom]);

  const [screenSize, setScreenSize] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth  : 390,
    h: typeof window !== "undefined" ? window.innerHeight : 844,
  }));
  useEffect(() => {
    const onResize = () => setScreenSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const screenW = screenSize.w;
  const screenH = screenSize.h;

  const keeps = useMemo(() => {
    return REGION_LIST.map(reg => {
      const t = tiles[`${reg.cx},${reg.cy}`];
      const defaultOwner = (reg.layer === 'start' || reg.layer === 'peninsula')
        ? (reg.factions?.[0] || null) : null;
      return { ...reg,
        owner:          t?.owner ?? defaultOwner,
        garrison:       t?.garrison || 0,
        garrisonTroops: t?.garrisonTroops || 0,
        garrisonWaves:  t?.garrisonWaves ?? 20,
        defeatedWaves:  t?.defeatedWaves ?? [],
        siege:          t?.siege    || 0,
        siegeMax:       t?.siegeMax || 0,
        defCmd:         t?.defCmd   || null,
      };
    });
  }, [tiles]);

  // Build gate list from keepMeta (worker-placed gates)
  const gates = useMemo(() => {
    if (!keepMeta) return [];
    const result = [];
    
    for (const [key, meta] of Object.entries(keepMeta)) {
      // Only process gate entries (they have 'side' and 'type' properties)
      if (meta.side && meta.type) {
        const [x, y] = key.split(',').map(Number);
        const tile = tiles[key];
        const typeIcon = meta.type === 'crossing' ? '🌊' : '⛰';
        
        result.push({
          key: key,
          id: meta.id || key,
          side: meta.side,
          type: meta.type,
          cx: x,
          cy: y,
          icon: typeIcon,
          owner: tile?.owner || null,
          garrison: tile?.garrison || 0,
          siege: tile?.siege || 0,
          siegeMax: tile?.siegeMax || 0,
          name: meta.keepName || 'Gate',
        });
      }
    }
    
    return result;
  }, [keepMeta, tiles]);

  const allClickable = useMemo(() => [...keeps, ...gates], [keeps, gates]);
  const selectedItem = selected ? allClickable.find(k => k.key === selected) : null;

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

    // ── Gate hit-test FIRST — larger radius, always wins over keep polys ──
    const GATE_HIT_R = 22;
    for (const gate of gates) {
      const dx = svgX - gate.cx, dy = svgY - gate.cy;
      if (dx*dx + dy*dy < GATE_HIT_R*GATE_HIT_R) {
        const isToggleOff = selected === gate.key;
        setSelected(isToggleOff ? null : gate.key);
        setClickPos(isToggleOff ? null : { x: clientX, y: clientY });
        return;
      }
    }

    // ── Region polygon hit-test — skip if near any gate ──
    const GATE_EXCLUSION_R = 28;
    const nearGate = gates.some(gate => {
      const dx = svgX - gate.cx, dy = svgY - gate.cy;
      return dx*dx + dy*dy < GATE_EXCLUSION_R*GATE_EXCLUSION_R;
    });
    if (!nearGate) {
      for (const [key, poly] of Object.entries(POLYS)) {
        if (pointInPoly(svgX, svgY, poly)) {
          const isToggleOff = selected === key;
          setSelected(isToggleOff ? null : key);
          setClickPos(isToggleOff ? null : { x: clientX, y: clientY });
          return;
        }
      }
    }
    setSelected(null);
    setClickPos(null);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#080c10",
      display: "flex", flexDirection: "column",
      paddingLeft: "var(--sal, 0px)",
      height: "100dvh",
      overflow: "hidden",
      fontFamily: "'Cinzel',serif",
    }}>
      <style>{`
        @keyframes holyPulse { 0%,100%{opacity:.3} 50%{opacity:.6} }
      `}</style>

      {/* Top bar */}
      <div style={{
        flexShrink: 0, height: "calc(var(--sat) + 46px)",
        paddingTop: "var(--sat)",
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
            width: 60, height: "calc(var(--sat) + 46px)",
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

      {/* Map area — fills remaining height, SVG letterboxed to fit entirely on screen */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <svg
          viewBox={`0 0 ${DW} ${DH}`}
          preserveAspectRatio="none"
          style={{
            display: "block", width: "100%", height: "100%",
            cursor: "pointer",
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

          {/* ── Region keep icons ── */}
          {keeps.map(k => {
            const cx = k.cx * sx, cy = k.cy * sy;
            const owned = k.owner;
            const isHG = k.key === "holyGrail";
            const isSel = selected === k.key;
            const sz = (isHG ? 17 : 13) * iconMult;
            const facCol = owned ? (owned === "player" ? "#44aaff" : (FAC_COLOR[owned] || "#cc8844")) : null;
            const col = owned ? facCol : (isHG ? "#f0c040" : "#b8a88a");

            return (
              <g key={k.key} style={{ pointerEvents: "none" }}>
                {/* Outer ring (selected) */}
                {isSel && <circle cx={cx} cy={cy} r={sz + 4} fill="white" opacity={0.12}/>}
                {/* Keep icon */}
                <circle cx={cx} cy={cy} r={sz} fill="#0a0c10" stroke={col} strokeWidth={1.4}/>
                <rect x={cx - sz * 0.35} y={cy - sz * 0.3} width={sz * 0.7} height={sz * 0.7}
                  fill="none" stroke={col} strokeWidth={1.2} rx={1}/>
                <rect x={cx - sz * 0.2} y={cy - sz * 0.55} width={sz * 0.4} height={sz * 0.35}
                  fill="none" stroke={col} strokeWidth={1.2}/>
                <path d={`M${cx - sz * 0.2},${cy - sz * 0.2} L${cx},${cy - sz * 0.45} L${cx + sz * 0.2},${cy - sz * 0.2} Z`}
                  fill={col} opacity={0.3}/>
              </g>
            );
          })}

          {/* ── Your current viewport dot ── */}
          {dotPos && (
            <g style={{ pointerEvents: "none" }}>
              <circle cx={dotPos.c} cy={dotPos.r} r={7} fill="none" stroke="#ffffff" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.6}/>
              <circle cx={dotPos.c} cy={dotPos.r} r={3} fill="#ffffff" opacity={0.9}/>
            </g>
          )}

          {/* ── Player HQ castle ── */}
          {playerHqKey && (() => {
            const [hc, hr] = playerHqKey.split(",").map(Number);
            const sz = 14 * iconMult;
            return (
              <g style={{ pointerEvents: "none" }}>
                {/* Castle body */}
                <rect x={hc - sz * 0.45} y={hr - sz * 0.25} width={sz * 0.9} height={sz * 0.75} fill="#22cc55" stroke="#ffffff" strokeWidth={0.8} rx={1}/>
                {/* Battlements */}
                {[-0.3, 0, 0.3].map((o, i) => (
                  <rect key={i} x={hc + o * sz - sz * 0.12} y={hr - sz * 0.6} width={sz * 0.22} height={sz * 0.38} fill="#22cc55" stroke="#ffffff" strokeWidth={0.8}/>
                ))}
                {/* Door */}
                <rect x={hc - sz * 0.12} y={hr + sz * 0.1} width={sz * 0.24} height={sz * 0.4} fill="#082010" rx={1}/>
              </g>
            );
          })()}

          {/* ── Range circles (HQ + forts) ── */}
          {playerHqKey && (() => {
            const [hc, hr] = playerHqKey.split(",").map(Number);
            return (
              <circle key="hq-range" cx={hc} cy={hr} r={100}
                fill="none" stroke="rgba(240,192,64,.6)" strokeWidth={1.2}
                strokeDasharray="4 3" style={{ pointerEvents: "none" }}/>
            );
          })()}
          {(forts || []).map(fort => {
            const [fc, fr] = fort.tileKey.split(",").map(Number);
            return (
              <g key={fort.id} style={{ pointerEvents: "none" }}>
                <circle cx={fc} cy={fr} r={100}
                  fill="none" stroke="rgba(240,192,64,.6)" strokeWidth={1}
                  strokeDasharray="4 3"/>
                {/* Fort icon dot */}
                <rect x={fc - 3} y={fr - 3} width={6} height={6}
                  fill="#60a0e0" stroke="#ffffff" strokeWidth={0.6} rx={1}/>
                <text x={fc} y={fr - 5} textAnchor="middle"
                  fontSize={4} fill="#80c0ff" fontFamily="Cinzel,serif">
                  Lv{fort.level}
                </text>
              </g>
            );
          })}

          {/* ── Crewmate HQ blue dots ── */}
          {crewmatePlayerIds?.size > 0 && aiHqKeys && Object.entries(aiHqKeys).flatMap(([, hqArr]) => {
            const keys = Array.isArray(hqArr) ? hqArr : [hqArr];
            return keys.map(key => {
              const t = tiles[key];
              const pid = t?.ownerPlayerId;
              if (!pid || !crewmatePlayerIds.has(pid)) return null;
              const [cc, cr] = key.split(",").map(Number);
              return (
                <circle key={key} cx={cc} cy={cr} r={1.5} fill="#2299ff" style={{ pointerEvents: "none" }}/>
              );
            }).filter(Boolean);
          })}

          {/* ── Crossing / Gate icons ── */}
          {gates.map(gate => {
            const cx = gate.cx * sx, cy = gate.cy * sy;
            const owned = gate.owner;
            const isSel = selected === gate.key;
            const sz = 12 * iconMult;
            const facCol = owned ? (owned === "player" ? "#44aaff" : (FAC_COLOR[owned] || "#cc8844")) : null;
            const typeCol = gate.type === 'crossing' ? "#4ab8d8" : "#8a8aaa";

            return (
              <g key={gate.key} style={{ pointerEvents: "none" }}>
                {/* Selection ring */}
                {isSel && <circle cx={cx} cy={cy} r={sz + 4} fill="white" opacity={0.12}/>}
                {/* Base circle */}
                <circle cx={cx} cy={cy} r={sz} fill="#0a0c10" stroke={facCol || typeCol}
                  strokeWidth={1.4} opacity={facCol ? 1 : 0.8}/>
                {/* Type icon */}
                {gate.type === 'crossing' && <>
                  <path d={`M${cx-sz*.7},${cy-sz*.1} Q${cx-sz*.35},${cy-sz*.4} ${cx},${cy-sz*.1} Q${cx+sz*.35},${cy+sz*.2} ${cx+sz*.7},${cy-sz*.1}`}
                    fill="none" stroke={typeCol} strokeWidth={1.2} strokeLinecap="round"/>
                  <path d={`M${cx-sz*.7},${cy+sz*.3} Q${cx-sz*.35},${cy} ${cx},${cy+sz*.3} Q${cx+sz*.35},${cy+sz*.6} ${cx+sz*.7},${cy+sz*.3}`}
                    fill="none" stroke={typeCol} strokeWidth={1.2} strokeLinecap="round"/>
                </>}
                {gate.type === 'tunnel' && <>
                  <ellipse cx={cx} cy={cy+sz*.1} rx={sz*.65} ry={sz*.45} fill="#050810" stroke={typeCol} strokeWidth={1.2}/>
                  <ellipse cx={cx} cy={cy+sz*.1} rx={sz*.3} ry={sz*.2} fill="#020204" stroke="#3a3a5a" strokeWidth={0.8}/>
                </>}
                {/* Side label */}
                <text x={cx} y={cy-sz*.75} textAnchor="middle" fontSize={5}
                  fill={typeCol} fontFamily="monospace" opacity={0.8}>{gate.side}</text>
              </g>
            );
          })}

        </svg>

        {/* ── Floating popup — anchored near click, flips left/right based on screen edge ── */}
        {selectedItem && clickPos && (() => {
          const POPUP_W = 220;
          const POPUP_MAX_H = 280;
          const PAD = 32;
          const flipLeft = clickPos.x > screenW * 0.55;
          const popupLeft = flipLeft
            ? Math.max(8, clickPos.x - POPUP_W - PAD)
            : Math.min(screenW - POPUP_W - 8, clickPos.x + PAD);
          const popupTop = Math.min(
            Math.max(8, clickPos.y - 40),
            screenH - POPUP_MAX_H - 8
          );

          const si = selectedItem;
          const ownerCol = si.owner
            ? (si.owner === "player" ? "#44aaff" : (FAC_COLOR[si.owner] || "#cc8844"))
            : "#7a6a50";
          const wavesTotal    = si.garrisonWaves ?? (si.type ? 2 : 20);
          const wavesDefeated = si.defeatedWaves?.length ?? 0;
          const wavesLeft     = Math.max(0, wavesTotal - wavesDefeated);
          const siegePct      = si.siegeMax > 0 ? Math.round((si.siege / si.siegeMax) * 100) : 0;
          const defLvl        = si.defCmd?.lvl ?? 20;
          const isGate        = !!si.type;
          const typeCol       = si.type === "crossing" ? "#4ab8d8"
                              : si.type === "tunnel" ? "#8a8aaa" : null;

          return (
            <div
              style={{
                position: "absolute",
                left: popupLeft, top: popupTop,
                width: POPUP_W,
                background: "rgba(6,8,14,0.97)",
                border: "1px solid rgba(200,160,64,0.25)",
                borderRadius: 8,
                boxShadow: "0 4px 24px rgba(0,0,0,0.8)",
                zIndex: 20,
                fontFamily: "'Cinzel',serif",
                overflow: "hidden",
                pointerEvents: "all",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                padding: "10px 12px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: `linear-gradient(160deg, ${ownerCol}12, transparent)`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#e8dcc8", lineHeight: 1.2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {si.keepName || si.name || si.key}
                    </div>
                    <div style={{ fontSize: 8, color: ownerCol, marginTop: 3, letterSpacing: ".04em" }}>
                      {!si.owner ? "Unoccupied"
                        : si.owner === "player" ? "Your Faction" : "Enemy Controlled"}
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setClickPos(null); }} style={{
                    background: "none", border: "none", color: "#4a4030",
                    fontSize: 14, cursor: "pointer", padding: "0 0 0 8px", flexShrink: 0,
                    WebkitTapHighlightColor: "transparent",
                  }}>✕</button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: "10px 12px" }}>

                {/* Gate type badge */}
                {isGate && (
                  <div style={{
                    marginBottom: 8, padding: "3px 7px", borderRadius: 3, display: "inline-block",
                    background: `${typeCol}18`, border: `1px solid ${typeCol}50`,
                    fontSize: 8, color: typeCol,
                  }}>
                    {si.type === "crossing" ? "🌊 River Crossing" : "⛰ Tunnel Gate"}
                    {" · Gate "}{si.side}
                  </div>
                )}

                {/* Siege bar */}
                {si.siegeMax > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 7, color: "#6a5a3a", letterSpacing: ".06em" }}>SIEGE</span>
                      <span style={{ fontSize: 7, color: "#cc4040", fontWeight: 700 }}>
                        {si.siege.toLocaleString()}/{si.siegeMax.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "#0a0c10", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3, transition: "width .3s",
                        width: `${siegePct}%`,
                        background: siegePct > 60 ? "linear-gradient(90deg,#3a8830,#4db840)"
                                  : siegePct > 25 ? "linear-gradient(90deg,#8a7010,#c8a820)"
                                  : "linear-gradient(90deg,#882020,#dd3030)",
                      }}/>
                    </div>
                  </div>
                )}

                {/* Garrison waves — shown for all (gates have 2, keeps have 20) */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 7, color: "#6a5a3a", letterSpacing: ".06em" }}>GARRISON</span>
                    <span style={{ fontSize: 7, color: "#c8a060" }}>{wavesLeft}/{wavesTotal} waves left</span>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    {Array.from({ length: wavesTotal }).map((_, i) => (
                      <div key={i} style={{
                        width: Math.max(6, Math.min(10, (POPUP_W - 40) / wavesTotal - 2)),
                        height: 6, borderRadius: 2,
                        background: i < wavesDefeated ? "#2a1a1a" : ownerCol,
                        opacity: i < wavesDefeated ? 0.3 : 0.85,
                      }}/>
                    ))}
                  </div>
                </div>

                {/* Defender level */}
                <div style={{
                  padding: "6px 8px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 5, border: "1px solid rgba(255,255,255,0.06)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#c8a060" }}>Lv{defLvl}</div>
                  <div style={{ fontSize: 6, color: "#4a3a28", letterSpacing: ".06em", marginTop: 1 }}>WAVE DEFENDER LEVEL</div>
                </div>
              </div>

              {/* Footer — Go button */}
              <div style={{ padding: "0 12px 10px" }}>
                <button
                  onClick={() => { onClose(); requestAnimationFrame(() => onTeleport(si.cx, si.cy)); }}
                  style={{
                    width: "100%", padding: "8px 0",
                    background: "linear-gradient(160deg,#2a1e08,#100c02)",
                    border: "1px solid #8a6020", borderRadius: 5,
                    color: "#f0c060", fontFamily: "'Cinzel',serif",
                    fontSize: 10, letterSpacing: ".08em", cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}>
                  GO →
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
});
