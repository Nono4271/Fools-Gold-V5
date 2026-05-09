import { useState } from "react";

const HUB_TILES = [
  { id: "buildings",     icon: "🏛",      label: "Architecture",  color: "#7a4020", accent: "#c8903a" },
  { id: "commandcenter", icon: "helmet",   label: "Player",        color: "#3a5a3a", accent: "#6a9a4a" },
  { id: "troops",        icon: "🎯",      label: "Training",      color: "#6a2020", accent: "#cc5030" },
  { id: "army",          icon: "⚔️",      label: "Army",          color: "#4a3a1a", accent: "#c8903a" },
  { id: "repairbay",     icon: "⛺",      label: "Healing Tent",  color: "#2a4a5a", accent: "#4a88aa" },
  { id: "marketplace",   icon: "carriage", label: "Marketplace",   color: "#5a3a1a", accent: "#aa7030" },
];

const SEAL_COLORS = ["#8a3010","#3a5a30","#7a2010","#6a5020","#204050","#6a3a10"];

function GladiatorHelmet({ size = 38, metal = "#4a3a28", shine = "#8a7a60" }) {
  return (
    <svg width={size} height={size} viewBox="4 8 32 34" fill="none">
      <defs>
        <linearGradient id="hmet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#6a5a40"/>
          <stop offset="30%"  stopColor="#3a2e20"/>
          <stop offset="60%"  stopColor="#2a2218"/>
          <stop offset="100%" stopColor="#1a1410"/>
        </linearGradient>
        <linearGradient id="hchk" x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stopColor="#5a4a34"/>
          <stop offset="100%" stopColor="#1e1810"/>
        </linearGradient>
        <filter id="hmetal" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#00000088"/>
        </filter>
      </defs>
      <path d="M9 26 C9 14 12 10 20 10 C28 10 31 14 31 26 L31 28 L9 28 Z" fill="url(#hmet)" filter="url(#hmetal)"/>
      <path d="M9 26 Q20 24 31 26" stroke={shine} strokeWidth="1.6" fill="none" opacity="0.55"/>
      <path d="M11 14 Q13 11 16 10.5" stroke="#a09070" strokeWidth="0.9" fill="none" opacity="0.6" strokeLinecap="round"/>
      <path d="M12 20 Q13 16 15 14" stroke="#7a6a50" strokeWidth="0.6" fill="none" opacity="0.4" strokeLinecap="round"/>
      <path d="M9 28 L7 36 Q8 38 11 38 L29 38 Q32 38 33 36 L31 28 Z" fill="url(#hchk)" filter="url(#hmetal)"/>
      <path d="M7 36 Q10 39 20 39 Q30 39 33 36" stroke={shine} strokeWidth="1" fill="none" opacity="0.45"/>
      <line x1="9"  y1="30" x2="31" y2="30" stroke={shine} strokeWidth="0.5" opacity="0.25"/>
      <line x1="8"  y1="33" x2="32" y2="33" stroke={shine} strokeWidth="0.5" opacity="0.2"/>
      <line x1="7.5" y1="35.5" x2="32.5" y2="35.5" stroke={shine} strokeWidth="0.4" opacity="0.15"/>
      <path d="M9 26 L9 28 L11 36 L14 34 L13 26 Z" fill="url(#hchk)"/>
      <path d="M31 26 L31 28 L29 36 L26 34 L27 26 Z" fill="url(#hchk)"/>
      <path d="M13 26 Q14 22 17 21 Q20 20.5 23 21 Q26 22 27 26 L26 34 Q23 35 20 35 Q17 35 14 34 Z" fill="#0e0c08"/>
      <path d="M13 26 Q14 22 17 21 Q20 20.5 23 21 Q26 22 27 26" stroke={shine} strokeWidth="0.9" fill="none" opacity="0.6"/>
      <rect x="19" y="21" width="2" height="8" rx="0.8" fill={shine} opacity="0.5"/>
      <ellipse cx="16.5" cy="24" rx="2.5" ry="1.8" fill="#00000044"/>
      <ellipse cx="23.5" cy="24" rx="2.5" ry="1.8" fill="#00000044"/>
      <path d="M13.5 25 Q16 22.5 19 22" stroke={shine} strokeWidth="0.7" fill="none" opacity="0.4" strokeLinecap="round"/>
      <path d="M26.5 25 Q24 22.5 21 22" stroke={shine} strokeWidth="0.7" fill="none" opacity="0.4" strokeLinecap="round"/>
      <path d="M7.5 36.5 Q20 40 32.5 36.5" stroke={shine} strokeWidth="1.2" fill="none" opacity="0.35"/>
    </svg>
  );
}

function MerchantCarriage({ size = 42, wood = "#5a3a10", accent = "#8a5828", metal = "#3a2e1a", hov = false }) {
  const rimCol = hov ? accent : "#7a5020";
  return (
    <svg width={size} height={size} viewBox="10 10 40 34" fill="none">
      <defs>
        <linearGradient id="cwagon" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#7a5028"/>
          <stop offset="40%"  stopColor="#5a3a14"/>
          <stop offset="100%" stopColor="#3a2208"/>
        </linearGradient>
        <linearGradient id="croof" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#8a6030"/>
          <stop offset="100%" stopColor="#4a2a0a"/>
        </linearGradient>
        <filter id="cdrop">
          <feDropShadow dx="0.5" dy="1.5" stdDeviation="1" floodColor="#00000066"/>
        </filter>
      </defs>
      <ellipse cx="34" cy="42" rx="22" ry="1.5" fill="#00000022"/>
      <rect x="16" y="22" width="28" height="14" rx="1.5" fill="url(#cwagon)" filter="url(#cdrop)"/>
      <line x1="16" y1="26" x2="44" y2="26" stroke="#2a1808" strokeWidth="0.6" opacity="0.6"/>
      <line x1="16" y1="30" x2="44" y2="30" stroke="#2a1808" strokeWidth="0.6" opacity="0.6"/>
      <line x1="16" y1="34" x2="44" y2="34" stroke="#2a1808" strokeWidth="0.5" opacity="0.4"/>
      <path d="M16 22 L14 24 L14 36 L16 36 Z" fill="#2a1808" opacity="0.5"/>
      <rect x="14" y="35" width="31" height="2" rx="0.5" fill={metal}/>
      <rect x="15.5" y="21.5" width="3" height="1.5" rx="0.3" fill={metal} opacity="0.8"/>
      <rect x="40.5" y="21.5" width="3" height="1.5" rx="0.3" fill={metal} opacity="0.8"/>
      <rect x="15.5" y="34"   width="3" height="1.5" rx="0.3" fill={metal} opacity="0.8"/>
      <rect x="40.5" y="34"   width="3" height="1.5" rx="0.3" fill={metal} opacity="0.8"/>
      <path d="M15 22 Q20 17 30 16 Q40 17 45 22 Z" fill="url(#croof)" filter="url(#cdrop)"/>
      <path d="M18 22 Q21 18 30 17 Q39 18 42 22" stroke="#3a2010" strokeWidth="0.6" fill="none" opacity="0.5"/>
      <path d="M22 19 Q30 16.5 38 19" stroke="#8a6030" strokeWidth="0.7" fill="none" opacity="0.5"/>
      <path d="M15 22 Q14 24 14.5 28" stroke="#4a2a10" strokeWidth="0.8" fill="none" opacity="0.5"/>
      <ellipse cx="45" cy="29" rx="3.5" ry="4.5" fill="#4a2e0c" stroke="#6a4018" strokeWidth="0.8"/>
      <line x1="41.5" y1="27" x2="48.5" y2="27" stroke="#6a4018" strokeWidth="0.7" opacity="0.7"/>
      <line x1="41.5" y1="29" x2="48.5" y2="29" stroke="#6a4018" strokeWidth="0.7" opacity="0.7"/>
      <line x1="41.5" y1="31" x2="48.5" y2="31" stroke="#6a4018" strokeWidth="0.7" opacity="0.7"/>
      <ellipse cx="45" cy="27" rx="3.5" ry="1" fill="none" stroke={metal} strokeWidth="0.8"/>
      <ellipse cx="45" cy="31" rx="3.5" ry="1" fill="none" stroke={metal} strokeWidth="0.8"/>
      <path d="M42 22 Q44 19 46 20 Q48 21 47 24 Q45 25 43 24 Z" fill="#6a4a20" stroke="#8a6030" strokeWidth="0.6"/>
      <line x1="44" y1="21" x2="44.5" y2="19.5" stroke="#5a3a10" strokeWidth="0.5"/>
      <rect x="14" y="20" width="7" height="3" rx="1" fill="#4a2e0c" stroke={metal} strokeWidth="0.6"/>
      <rect x="13" y="23" width="8" height="1.2" rx="0.4" fill={metal} opacity="0.8"/>
      <circle cx="22" cy="37" r="7" fill="none" stroke={wood} strokeWidth="2.2"/>
      <circle cx="22" cy="37" r="7" fill="none" stroke={rimCol} strokeWidth="0.8"/>
      {[0,30,60,90,120,150].map((a,i) => {
        const r = Math.PI * a / 180;
        return <line key={i} x1={22 + 1.5*Math.cos(r)} y1={37 + 1.5*Math.sin(r)} x2={22 + 6.5*Math.cos(r)} y2={37 + 6.5*Math.sin(r)} stroke={wood} strokeWidth="1" strokeLinecap="round"/>;
      })}
      <circle cx="22" cy="37" r="2" fill={metal}/>
      <circle cx="22" cy="37" r="1" fill={wood}/>
      <circle cx="37" cy="37" r="7.5" fill="none" stroke={wood} strokeWidth="2.2"/>
      <circle cx="37" cy="37" r="7.5" fill="none" stroke={rimCol} strokeWidth="0.8"/>
      {[0,30,60,90,120,150].map((a,i) => {
        const r = Math.PI * a / 180;
        return <line key={i} x1={37 + 1.5*Math.cos(r)} y1={37 + 1.5*Math.sin(r)} x2={37 + 7*Math.cos(r)} y2={37 + 7*Math.sin(r)} stroke={wood} strokeWidth="1" strokeLinecap="round"/>;
      })}
      <circle cx="37" cy="37" r="2" fill={metal}/>
      <circle cx="37" cy="37" r="1" fill={wood}/>
      <line x1="22" y1="37" x2="22" y2="35" stroke={metal} strokeWidth="1.2"/>
      <line x1="37" y1="37" x2="37" y2="35" stroke={metal} strokeWidth="1.2"/>
      <line x1="16" y1="20" x2="15" y2="18" stroke={metal} strokeWidth="0.7"/>
      <rect x="13.5" y="15.5" width="3" height="4" rx="0.8" fill="#c8903a" opacity="0.6" stroke={metal} strokeWidth="0.5"/>
      <ellipse cx="15" cy="15.5" rx="1.5" ry="0.5" fill={metal}/>
      <ellipse cx="15" cy="17.5" rx="1" ry="1.5" fill="#f0c04044"/>
    </svg>
  );
}

function TileIcon({ icon, hov, accent }) {
  const inkFilter = hov
    ? "sepia(10%) brightness(1.15) drop-shadow(0 2px 4px rgba(60,20,0,.4))"
    : "sepia(30%) brightness(.95)";

  if (icon === "helmet") return (
    <div style={{ filter: hov ? `drop-shadow(0 2px 8px ${accent}99)` : "sepia(15%)", transition: "filter .3s" }}>
      <GladiatorHelmet size={38} metal="#3a2e1a" shine={hov ? accent : "#7a6a50"}/>
    </div>
  );

  if (icon === "carriage") return (
    <div style={{ filter: hov ? `drop-shadow(0 2px 8px ${accent}88)` : "sepia(20%)", transition: "filter .3s" }}>
      <MerchantCarriage size={44} wood="#5a3a10" accent={hov ? accent : "#7a5020"} metal="#3a2e1a" hov={hov}/>
    </div>
  );

  return <div style={{ fontSize: 28, filter: inkFilter, transition: "filter .3s" }}>{icon}</div>;
}

const PAPER_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`;

function WaxSeal({ color, accent, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="10" fill={color} stroke={accent} strokeWidth="1.5"/>
      <circle cx="11" cy="11" r="6" fill="none" stroke={accent} strokeWidth="0.8" strokeDasharray="2 1.5"/>
      <circle cx="11" cy="11" r="2.5" fill={accent} opacity="0.8"/>
      {[0,60,120,180,240,300].map((a,i) => {
        const rad = (a * Math.PI) / 180;
        return <circle key={i} cx={11 + 8*Math.cos(rad)} cy={11 + 8*Math.sin(rad)} r="1.2" fill={accent} opacity="0.6"/>;
      })}
    </svg>
  );
}

function ParchmentTile({ tile, onClick, idx }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "none", border: "none", padding: 0,
        cursor: "pointer", position: "relative", minHeight: 120,
        transition: "transform .2s",
        transform: hov ? "translateY(-2px) scale(1.015)" : "none",
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: 3, background: hov ? "radial-gradient(ellipse at 30% 25%, #e8d4a8, #d4b882, #c0a060)" : "radial-gradient(ellipse at 30% 25%, #dcc88a, #c8aa6a, #b49050)", transition: "background .4s" }}/>
      <div style={{ position: "absolute", inset: 0, borderRadius: 3, backgroundImage: PAPER_BG, opacity: 0.6, pointerEvents: "none" }}/>
      <div style={{ position: "absolute", inset: 0, borderRadius: 3, background: "radial-gradient(ellipse at center, transparent 50%, rgba(60,20,0,.35) 100%)", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", top: -6, right: -6, width: 28, height: 28, borderRadius: "50%", background: "radial-gradient(circle, rgba(40,10,5,.3), transparent)", filter: "blur(6px)", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", bottom: 4, left: 8, width: 20, height: 12, borderRadius: "50%", background: "radial-gradient(circle, rgba(40,10,5,.18), transparent)", filter: "blur(5px)", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", inset: 0, borderRadius: 3, border: `2px solid ${hov ? "#7a4a18cc" : "#8a6030aa"}`, boxShadow: hov ? "inset 0 0 14px rgba(100,40,5,.45), 2px 3px 12px rgba(0,0,0,.55)" : "inset 0 0 6px rgba(80,30,5,.2), 1px 2px 6px rgba(0,0,0,.4)", transition: "all .4s", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", inset: 4, borderRadius: 2, border: `1px solid ${hov ? "#7a4a1888" : "#8a603044"}`, pointerEvents: "none", transition: "border-color .4s" }}/>
      <div style={{ position: "absolute", top: 6, left: 6, zIndex: 4 }}>
        <WaxSeal color={SEAL_COLORS[idx]} accent={hov ? tile.accent : "#c8903a"} size={20}/>
      </div>
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 120, gap: 6, padding: "14px 10px 12px" }}>
        <TileIcon icon={tile.icon} hov={hov} accent={tile.accent}/>
        <div style={{ fontFamily: "'IM Fell English', serif", fontSize: 11.5, color: hov ? "#2a1005" : "#4a2a0a", letterSpacing: ".04em", textAlign: "center", lineHeight: 1.25, fontStyle: "italic", transition: "color .3s", textShadow: hov ? "0 1px 0 rgba(255,220,150,.4)" : "none" }}>{tile.label}</div>
        <div style={{ width: hov ? "70%" : "45%", height: 1, background: hov ? "linear-gradient(90deg, transparent, #7a4018, transparent)" : "linear-gradient(90deg, transparent, #a07040, transparent)", transition: "all .4s" }}/>
      </div>
    </button>
  );
}

// ─── Back Button ─────────────────────────────────────────────
function BackButton({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)",
        background: hov ? "radial-gradient(ellipse at 40% 35%, #e8d0a0, #c8a060)" : "radial-gradient(ellipse at 40% 35%, #d8c080, #b89050)",
        border: "2px solid #7a5028",
        borderRadius: 3,
        color: hov ? "#1a0800" : "#3a1a05",
        padding: "4px 10px",
        cursor: "pointer",
        fontFamily: "'IM Fell English', serif",
        fontSize: 15,
        fontStyle: "italic",
        boxShadow: hov ? "inset 0 0 8px rgba(100,40,0,.3), 1px 2px 6px rgba(0,0,0,.4)" : "inset 0 0 4px rgba(80,30,5,.2), 1px 2px 4px rgba(0,0,0,.3)",
        transition: "all .2s",
      }}
    >←</button>
  );
}

// ─── Root ────────────────────────────────────────────────────
export default function HQMenuParchment() {
  const [hqTab, setHqTab] = useState("hub");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Cinzel:wght@400;700&family=Cinzel+Decorative:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #1a1208; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
      `}</style>

      <div style={{ position: "relative", background: "#b8986a", borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column", width: 340, height: 520, boxShadow: "inset 0 0 80px rgba(50,15,0,.6), 0 8px 40px rgba(0,0,0,.7)" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: PAPER_BG, backgroundSize: "200px 200px", opacity: 0.5, pointerEvents: "none", zIndex: 0 }}/>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(40,10,0,.5) 100%)", pointerEvents: "none", zIndex: 0 }}/>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(60,25,5,.06) 22px, rgba(60,25,5,.06) 23px)", pointerEvents: "none", zIndex: 0 }}/>
        <div style={{ position: "absolute", inset: 7, border: "3px double #7a5028", borderRadius: 3, pointerEvents: "none", zIndex: 10 }}/>
        <div style={{ position: "absolute", inset: 13, border: "1px solid #7a502844", borderRadius: 2, pointerEvents: "none", zIndex: 10 }}/>
        {[[0,0],[0,1],[1,0],[1,1]].map(([yt,xl],i) => (
          <div key={i} style={{ position: "absolute", zIndex: 11, pointerEvents: "none", top: yt===0?9:"auto", bottom: yt===1?9:"auto", left: xl===0?9:"auto", right: xl===1?9:"auto", width: 22, height: 22, borderTop: yt===0?"2px solid #7a5028":"none", borderBottom: yt===1?"2px solid #7a5028":"none", borderLeft: xl===0?"2px solid #7a5028":"none", borderRight: xl===1?"2px solid #7a5028":"none" }}/>
        ))}
        <div style={{ position: "absolute", top: 18, right: 22, width: 40, height: 30, background: "radial-gradient(ellipse at 60% 40%, rgba(90,15,5,.25), transparent)", filter: "blur(4px)", pointerEvents: "none", zIndex: 1 }}/>

        <div style={{ position: "relative", zIndex: 5, padding: "26px 24px 16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderBottom: "2px solid #7a5028" }}>
          {hqTab !== "hub" && (
            <BackButton onClick={() => setHqTab("hub")} />
          )}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 30, color: "#2a1005", letterSpacing: ".25em", textShadow: "1px 1px 0 rgba(255,210,120,.4), 0 2px 6px rgba(60,20,0,.3)" }}>HQ</div>
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #7a5028 20%, #7a5028 80%, transparent)", marginTop: 5 }}/>
            <div style={{ fontFamily: "'IM Fell English', serif", fontSize: 9, color: "#7a5028", letterSpacing: ".2em", fontStyle: "italic", marginTop: 4, textTransform: "uppercase" }}>Headquarters</div>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 3, flex: 1, padding: "10px 18px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", gap: 10 }}>
          {HUB_TILES.map((tile, i) => (
            <ParchmentTile key={tile.id} tile={tile} idx={i} onClick={() => setHqTab(tile.id)}/>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 12, pointerEvents: "none", fontFamily: "'IM Fell English', serif", fontSize: 7.5, color: "#7a5028", opacity: 0.5, letterSpacing: ".25em", fontStyle: "italic", whiteSpace: "nowrap" }}>— BY ROYAL DECREE —</div>
      </div>
    </>
  );
}
