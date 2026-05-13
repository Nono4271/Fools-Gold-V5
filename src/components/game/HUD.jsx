import { memo, useMemo } from "react";
import { RKEYS, RSS, POWER_DEFS } from "../../../shared/constants/map.js";

/*
  HUD — landscape top bar
  ──────────────────────────────────────────────────────────────────────────────
  The bar is a parallelogram band spanning the centre of the screen.
  Left and right edges are both slanted, leaving ~120px clear on each side
  (left for minimap, right for action buttons).

  Two-row layout:

  ROW 1:  [stone][wood][ore][gas] | [FG] | [egg][treasure][💎][⚙]
  ROW 2:  [💍 +Xhr — below gas]         [⬛ n/31 — below egg pill]

  Everything is tightly packed around the faction medallion as centre anchor.
  ──────────────────────────────────────────────────────────────────────────────
*/

const BAR_H      = 52;
// Mirror: same clear zone on both sides (~120px on a ~750px landscape screen)
// In the SVG viewBox (0..1000), minimap side ends ~160 units, right clear starts ~840
const L_BOTTOM   = 160;   // bottom-left  corner — further left  (slants right going up)
const L_TOP      = 176;   // top-left     corner — further right
const R_TOP      = 824;   // top-right    corner — further left
const R_BOTTOM   = 840;   // bottom-right corner — further right (slants left going up)
// Result: trapezoid wider at bottom, both edges angling inward toward the top

export default memo(function HUD({ facName, pKeys, rss, gems, tiles }) {

  const ringPowerPerHr = useMemo(() => {
    if (!tiles) return 0;
    let total = 0;
    for (const key of pKeys) {
      const t = tiles[key];
      if (t && t.powerLevel) total += POWER_DEFS[t.powerLevel]?.ringPower ?? 0;
    }
    return total;
  }, [tiles, pKeys]);

  const tileCount = pKeys?.size ?? 0;
  const rssRate   = { stone: 200, wood: 200, ore: 200, gas: 2400 }; // TODO: wire

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0,
      zIndex: 200,
      paddingTop: "env(safe-area-inset-top, 0px)",
      height: BAR_H,
      pointerEvents: "none",
    }}>

      {/* ── SVG bar: double-slanted parallelogram ── */}
      <svg
        style={{ position:"absolute", inset:0, width:"100%", height:BAR_H, pointerEvents:"none" }}
        preserveAspectRatio="none"
        viewBox="0 0 1000 52"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hudGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1e180a" stopOpacity="0.98"/>
            <stop offset="100%" stopColor="#0d0b06" stopOpacity="0.97"/>
          </linearGradient>
          <linearGradient id="trimGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="transparent"/>
            <stop offset="10%"  stopColor="#c8a04055"/>
            <stop offset="90%"  stopColor="#c8a04055"/>
            <stop offset="100%" stopColor="transparent"/>
          </linearGradient>
        </defs>
        <polygon
          points={`${L_BOTTOM},52 ${L_TOP},0 ${R_TOP},0 ${R_BOTTOM},52`}
          fill="url(#hudGrad)"
        />
        {/* Bottom gold trim */}
        <line x1={L_BOTTOM} y1="51.5" x2={R_BOTTOM} y2="51.5"
          stroke="url(#trimGrad)" strokeWidth="1"/>
        {/* Left slant highlight */}
        <line x1={L_BOTTOM} y1="52" x2={L_TOP} y2="0"
          stroke="#c8a04044" strokeWidth="1"/>
        {/* Right slant highlight */}
        <line x1={R_BOTTOM} y1="52" x2={R_TOP} y2="0"
          stroke="#c8a04044" strokeWidth="1"/>
      </svg>

      {/* ── Content: two rows, tightly centred ── */}
      {/*
        The polygon in viewBox units spans L_TOP..R_TOP at the top edge.
        L_TOP=176/1000 = 17.6% from left, R_TOP=840/1000 = 84% from left.
        We use percentage-based padding to match, + a small buffer for the slant.
      */}
      <div style={{
        position: "absolute", inset: 0,
        paddingTop: "env(safe-area-inset-top, 0px)",
        // Content starts just inside the slants — use % so it scales with screen width
        paddingLeft:  "18.5%",
        paddingRight: "17%",
        display: "flex", flexDirection: "column", justifyContent: "center",
        gap: 3,
        pointerEvents: "auto",
      }}>

        {/* ══ ROW 1 ══════════════════════════════════════════════════════════ */}
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>

          {/* LEFT — RSS pills, tight together */}
          <div style={{ display:"flex", alignItems:"center", gap:3, flex:"0 0 auto" }}>
            {RKEYS.map(k => (
              <div key={k} style={{
                display:"flex", alignItems:"center", gap:2,
                padding:"2px 5px",
                background: RSS[k].bg,
                border:`1px solid ${RSS[k].col}30`,
                borderRadius:3,
                boxShadow:"inset 0 1px 0 rgba(255,255,255,.04), 0 1px 3px rgba(0,0,0,.6)",
                whiteSpace:"nowrap",
              }}>
                <span style={{ fontSize:10 }}>{RSS[k].icon}</span>
                <div style={{ display:"flex", flexDirection:"column" }}>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:RSS[k].col, lineHeight:1.15 }}>
                    {Math.floor(rss[k]).toLocaleString()}
                  </span>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:7, color:`${RSS[k].col}80`, lineHeight:1.15 }}>
                    +{rssRate[k]}/h
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* CENTRE — faction medallion, no flex-grow gap, just a small margin */}
          <div style={{ margin:"0 6px", flexShrink:0 }}>
            <div style={{
              width:34, height:34, borderRadius:"50%",
              background:"radial-gradient(circle at 35% 30%, #2a2215, #0e0c09)",
              border:"1px solid #c8a04060",
              boxShadow:"0 0 10px rgba(200,160,64,.18), inset 0 1px 0 rgba(255,255,255,.08)",
              display:"flex", alignItems:"center", justifyContent:"center",
              position:"relative",
            }}>
              <div style={{ position:"absolute", inset:-2, borderRadius:"50%", border:"1px solid rgba(200,160,64,.15)" }}/>
              <span style={{
                fontFamily:"'Cinzel Decorative',serif", fontSize:10,
                background:"linear-gradient(135deg,#f0c040,#c89030,#f0c040)",
                backgroundSize:"200% auto",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                animation:"shimmer 3s linear infinite",
                userSelect:"none",
              }}>FG</span>
            </div>
          </div>

          {/* RIGHT — currencies, tight */}
          <div style={{ display:"flex", alignItems:"center", gap:3, flex:"0 0 auto" }}>

            {/* Dragon Eggs — red orb placeholder */}
            <div style={{
              display:"flex", alignItems:"center", gap:3,
              padding:"2px 6px",
              background:"rgba(160,25,25,.20)", border:"1px solid rgba(200,55,55,.28)",
              borderRadius:3,
              boxShadow:"inset 0 1px 0 rgba(255,255,255,.05), 0 1px 3px rgba(0,0,0,.6)",
              whiteSpace:"nowrap",
            }}>
              <div style={{
                width:14, height:14, borderRadius:"50%",
                background:"radial-gradient(circle at 35% 30%, #ff6060, #880808)",
                border:"1px solid #cc303088",
                boxShadow:"0 0 5px rgba(200,40,40,.5)",
                flexShrink:0,
              }}/>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:"#e05050" }}>20</span>
            </div>

            {/* Treasure — gold coin placeholder */}
            <div style={{
              display:"flex", alignItems:"center", gap:3,
              padding:"2px 6px",
              background:"rgba(140,105,15,.20)", border:"1px solid rgba(200,155,35,.28)",
              borderRadius:3,
              boxShadow:"inset 0 1px 0 rgba(255,255,255,.05), 0 1px 3px rgba(0,0,0,.6)",
              whiteSpace:"nowrap",
            }}>
              <div style={{
                width:14, height:14, borderRadius:"50%",
                background:"radial-gradient(circle at 35% 30%, #ffd040, #7a5508)",
                border:"1px solid #c8901040",
                boxShadow:"0 0 5px rgba(200,160,40,.4)",
                flexShrink:0,
              }}/>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:"#d4a020" }}>1.0m</span>
            </div>

            {/* Gems */}
            <div style={{
              display:"flex", alignItems:"center", gap:3,
              padding:"2px 6px",
              background:"rgba(240,192,64,.07)", border:"1px solid rgba(240,192,64,.22)",
              borderRadius:3,
              boxShadow:"inset 0 1px 0 rgba(255,255,255,.05), 0 1px 3px rgba(0,0,0,.6)",
              whiteSpace:"nowrap",
            }}>
              <span style={{ fontSize:11 }}>💎</span>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:"#f0c040" }}>
                {(gems ?? 0).toLocaleString()}
              </span>
            </div>

            {/* Settings */}
            <button style={{
              background:"rgba(20,16,8,.6)",
              border:"1px solid rgba(200,160,64,.18)",
              borderRadius:4,
              width:24, height:24,
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", padding:0, flexShrink:0,
              boxShadow:"inset 0 1px 0 rgba(255,255,255,.05)",
              pointerEvents:"auto", touchAction:"manipulation",
            }}>
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
                <circle cx="8" cy="8" r="2.2" stroke="#c8a040" strokeWidth="1.2"/>
                <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"
                  stroke="#c8a04088" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ══ ROW 2 — sub-labels flanking the faction icon ════════════════════
            Power/hr sits directly below the gap between gas and FG icon (left side).
            Tile count sits directly below the gap between FG icon and egg pill (right side).
            We replicate the same flex structure so they naturally align.
        ══════════════════════════════════════════════════════════════════════ */}
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>

          {/* Spacer matching RSS block width — aligns power/hr to end of RSS */}
          <div style={{ display:"flex", alignItems:"center", gap:3, flex:"0 0 auto" }}>
            {RKEYS.map(k => (
              <div key={k} style={{
                // invisible spacer — same width as RSS pill
                visibility:"hidden",
                display:"flex", alignItems:"center", gap:2,
                padding:"2px 5px",
                whiteSpace:"nowrap",
              }}>
                <span style={{ fontSize:10 }}>{RSS[k].icon}</span>
                <div style={{ display:"flex", flexDirection:"column" }}>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, lineHeight:1.15 }}>
                    {Math.floor(rss[k]).toLocaleString()}
                  </span>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:7, lineHeight:1.15 }}>
                    +{k === "gas" ? rssRate[k] : rssRate[k]}/h
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Power/hr — right-aligned to just left of faction icon */}
          <div style={{ margin:"0 6px", display:"flex", justifyContent:"flex-end", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:8 }}>💍</span>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:7, color:"#d4af37", whiteSpace:"nowrap" }}>
                +{ringPowerPerHr.toLocaleString()}/hr
              </span>
            </div>
          </div>

          {/* Tile count — left-aligned to just right of faction icon */}
          <div style={{ display:"flex", alignItems:"center", gap:3, flex:"0 0 auto" }}>
            <div style={{ display:"flex", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:8 }}>⬛</span>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:7, color:"#6a9060", whiteSpace:"nowrap" }}>
                {tileCount}/31
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
});
