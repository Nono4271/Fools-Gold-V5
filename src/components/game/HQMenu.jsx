import { useState, useEffect, memo, useMemo } from "react";
import { FACTION_TROOPS, COMMAND_COST, getTierSkills } from "../../../shared/constants/troops.js";
import { RSS, RKEYS, HQP } from "../../../shared/constants/map.js";
import { BLDG, barracksCapacity, maxAvailLevel, upgCost, upgDuration, cmdCommand, trainRate, maxTrainBatch, quarterMaxLevel, branchMaxLevel, BRANCH_UNLOCK_Q, tierFromBranchLevel, storageMax, rssRate } from "../../../shared/constants/buildings.js";
import { RC, RARITY, CLASS, respectCost, RESPECT_MAX, SS } from "../../../shared/constants/heroes.js";
const SC = RC;

// -- Palette -------------------------------------------------------------------
const P = {
bg:     "#0a0c10",
border: "#2a2418",
gold:   "#f0c040",
dim:    "#7a6a50",
text:   "#f0e8d8",
sub:    "#a89878",
ff:     "'Cinzel',serif",
ffb:    "'Crimson Pro',serif",
};

// -- Tile nav buttons (the 6 sections on the hub screen) -----------------------
const HUB_TILES = [
{ id:"buildings",     icon:"🏛",  label:"Architecture",   color:"#c8903a" },
{ id:"commandcenter", icon:"📊",  label:"Command Center", color:"#4488cc" },
{ id:"troops",        icon:"⚔️",  label:"Training",       color:"#cc4444" },
{ id:"army",          icon:"🪖",  label:"Army",           color:"#6aaa40" },
{ id:"repairbay",     icon:"⛺",  label:"Healing Tent",   color:"#5588dd" },
{ id:"marketplace",   icon:"🏪",  label:"Marketplace",    color:"#aa55cc" },
];

// -- Small section header ------------------------------------------------------
function SectionHeader({ children }) {
return (
<div style={{ fontSize:8, color:P.dim, letterSpacing:".12em", fontFamily:P.ff,
fontWeight:700, marginBottom:8, paddingBottom:4, borderBottom:`1px solid ${P.border}` }}>
{children}
</div>
);
}

// -- Resource pill -------------------------------------------------------------
function RssPill({ rssKey, amount, rss, small }) {
const r = RSS[rssKey];
const ok = (rss[rssKey]||0) >= amount;
return (
<span style={{ marginRight:4, color: ok ? r?.col||"#888" : "#cc3030",
fontFamily:P.ff, fontSize: small ? 7 : 8 }}>
{r?.icon||rssKey}{amount.toLocaleString()}
</span>
);
}

// -----------------------------------------------------------------------------
//  HUB SCREEN
// -----------------------------------------------------------------------------

// --- Parchment visual helpers -------------------------------------------------
const PAPER_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`;

const HUB_TILES_PARCHMENT = [
{ id: "buildings",     icon: "🏛",      label: "Architecture",  color: "#7a4020", accent: "#c8903a" },
{ id: "commandcenter", icon: "helmet",   label: "Player",        color: "#3a5a3a", accent: "#6a9a4a" },
{ id: "troops",        icon: "🎯",      label: "Training",      color: "#6a2020", accent: "#cc5030" },
{ id: "army",          icon: "⚔️",      label: "Army",          color: "#4a3a1a", accent: "#c8903a" },
{ id: "repairbay",     icon: "⛺",      label: "Healing Tent",  color: "#2a4a5a", accent: "#4a88aa" },
{ id: "marketplace",   icon: "carriage", label: "Marketplace",   color: "#5a3a1a", accent: "#aa7030" },
];

const SEAL_COLORS_P = ["#8a3010","#3a5a30","#7a2010","#6a5020","#204050","#6a3a10"];

function GladiatorHelmet({ size = 38, shine = "#8a7a60" }) {
return (
<svg width={size} height={size} viewBox="4 8 32 34" fill="none">
<defs>
<linearGradient id="hmet" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stopColor="#6a5a40"/><stop offset="30%" stopColor="#3a2e20"/>
<stop offset="60%" stopColor="#2a2218"/><stop offset="100%" stopColor="#1a1410"/>
</linearGradient>
<linearGradient id="hchk" x1="0%" y1="0%" x2="80%" y2="100%">
<stop offset="0%" stopColor="#5a4a34"/><stop offset="100%" stopColor="#1e1810"/>
</linearGradient>
<filter id="hmetal"><feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#00000088"/></filter>
</defs>
<path d="M9 26 C9 14 12 10 20 10 C28 10 31 14 31 26 L31 28 L9 28 Z" fill="url(#hmet)" filter="url(#hmetal)"/>
<path d="M9 26 Q20 24 31 26" stroke={shine} strokeWidth="1.6" fill="none" opacity="0.55"/>
<path d="M11 14 Q13 11 16 10.5" stroke="#a09070" strokeWidth="0.9" fill="none" opacity="0.6" strokeLinecap="round"/>
<path d="M9 28 L7 36 Q8 38 11 38 L29 38 Q32 38 33 36 L31 28 Z" fill="url(#hchk)" filter="url(#hmetal)"/>
<path d="M9 26 L9 28 L11 36 L14 34 L13 26 Z" fill="url(#hchk)"/>
<path d="M31 26 L31 28 L29 36 L26 34 L27 26 Z" fill="url(#hchk)"/>
<path d="M13 26 Q14 22 17 21 Q20 20.5 23 21 Q26 22 27 26 L26 34 Q23 35 20 35 Q17 35 14 34 Z" fill="#0e0c08"/>
<path d="M13 26 Q14 22 17 21 Q20 20.5 23 21 Q26 22 27 26" stroke={shine} strokeWidth="0.9" fill="none" opacity="0.6"/>
<rect x="19" y="21" width="2" height="8" rx="0.8" fill={shine} opacity="0.5"/>
<ellipse cx="16.5" cy="24" rx="2.5" ry="1.8" fill="#00000044"/>
<ellipse cx="23.5" cy="24" rx="2.5" ry="1.8" fill="#00000044"/>
</svg>
);
}

function MerchantCarriage({ size = 42, hov = false }) {
const wood = "#5a3a10"; const accent = hov ? "#aa7030" : "#7a5020"; const metal = "#3a2e1a";
return (
<svg width={size} height={size} viewBox="10 10 40 34" fill="none">
<defs>
<linearGradient id="cwagon" x1="0%" y1="0%" x2="0%" y2="100%">
<stop offset="0%" stopColor="#7a5028"/><stop offset="40%" stopColor="#5a3a14"/><stop offset="100%" stopColor="#3a2208"/>
</linearGradient>
<linearGradient id="croof" x1="0%" y1="0%" x2="0%" y2="100%">
<stop offset="0%" stopColor="#8a6030"/><stop offset="100%" stopColor="#4a2a0a"/>
</linearGradient>
<filter id="cdrop"><feDropShadow dx="0.5" dy="1.5" stdDeviation="1" floodColor="#00000066"/></filter>
</defs>
<rect x="16" y="22" width="28" height="14" rx="1.5" fill="url(#cwagon)" filter="url(#cdrop)"/>
<line x1="16" y1="26" x2="44" y2="26" stroke="#2a1808" strokeWidth="0.6" opacity="0.6"/>
<line x1="16" y1="30" x2="44" y2="30" stroke="#2a1808" strokeWidth="0.6" opacity="0.6"/>
<path d="M15 22 Q20 17 30 16 Q40 17 45 22 Z" fill="url(#croof)" filter="url(#cdrop)"/>
<ellipse cx="45" cy="29" rx="3.5" ry="4.5" fill="#4a2e0c" stroke="#6a4018" strokeWidth="0.8"/>
<rect x="14" y="20" width="7" height="3" rx="1" fill="#4a2e0c" stroke={metal} strokeWidth="0.6"/>
<circle cx="22" cy="37" r="7" fill="none" stroke={wood} strokeWidth="2.2"/>
{[0,30,60,90,120,150].map((a,i) => {
const r = Math.PI*a/180;
return <line key={i} x1={22+1.5*Math.cos(r)} y1={37+1.5*Math.sin(r)} x2={22+6.5*Math.cos(r)} y2={37+6.5*Math.sin(r)} stroke={wood} strokeWidth="1" strokeLinecap="round"/>;
})}
<circle cx="22" cy="37" r="2" fill={metal}/><circle cx="22" cy="37" r="1" fill={wood}/>
<circle cx="37" cy="37" r="7.5" fill="none" stroke={wood} strokeWidth="2.2"/>
{[0,30,60,90,120,150].map((a,i) => {
const r = Math.PI*a/180;
return <line key={i} x1={37+1.5*Math.cos(r)} y1={37+1.5*Math.sin(r)} x2={37+7*Math.cos(r)} y2={37+7*Math.sin(r)} stroke={wood} strokeWidth="1" strokeLinecap="round"/>;
})}
<circle cx="37" cy="37" r="2" fill={metal}/><circle cx="37" cy="37" r="1" fill={wood}/>
</svg>
);
}

function ParchmentTileIcon({ icon, hov, accent }) {
const inkFilter = hov ? "sepia(10%) brightness(1.15) drop-shadow(0 2px 4px rgba(60,20,0,.4))" : "sepia(30%) brightness(.95)";
if (icon === "helmet") return (
<div style={{ filter: hov ? `drop-shadow(0 2px 8px ${accent}99)` : "sepia(15%)", transition: "filter .3s" }}>
<GladiatorHelmet size={38} shine={hov ? accent : "#7a6a50"}/>
</div>
);
if (icon === "carriage") return (
<div style={{ filter: hov ? `drop-shadow(0 2px 8px ${accent}88)` : "sepia(20%)", transition: "filter .3s" }}>
<MerchantCarriage size={44} hov={hov}/>
</div>
);
return <div style={{ fontSize: 28, filter: inkFilter, transition: "filter .3s" }}>{icon}</div>;
}

function WaxSeal({ color, accent, size = 20 }) {
return (
<svg width={size} height={size} viewBox="0 0 22 22">
<circle cx="11" cy="11" r="10" fill={color} stroke={accent} strokeWidth="1.5"/>
<circle cx="11" cy="11" r="6" fill="none" stroke={accent} strokeWidth="0.8" strokeDasharray="2 1.5"/>
<circle cx="11" cy="11" r="2.5" fill={accent} opacity="0.8"/>
{[0,60,120,180,240,300].map((a,i) => {
const rad = (a*Math.PI)/180;
return <circle key={i} cx={11+8*Math.cos(rad)} cy={11+8*Math.sin(rad)} r="1.2" fill={accent} opacity="0.6"/>;
})}
</svg>
);
}

function ParchmentTileBtn({ tile, onClick, idx }) {
const [hov, setHov] = useState(false);
return (
<button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
style={{ background:"none", border:"none", padding:0, cursor:"pointer", position:"relative",
minHeight:120, transition:"transform .2s", transform: hov ? "translateY(-2px) scale(1.015)" : "none" }}>
<div style={{ position:"absolute", inset:0, borderRadius:3,
background: hov ? "radial-gradient(ellipse at 30% 25%, #e8d4a8, #d4b882, #c0a060)" : "radial-gradient(ellipse at 30% 25%, #dcc88a, #c8aa6a, #b49050)",
transition:"background .4s" }}/>
<div style={{ position:"absolute", inset:0, borderRadius:3, backgroundImage:PAPER_BG, opacity:0.6, pointerEvents:"none" }}/>
<div style={{ position:"absolute", inset:0, borderRadius:3, background:"radial-gradient(ellipse at center, transparent 50%, rgba(60,20,0,.35) 100%)", pointerEvents:"none" }}/>
<div style={{ position:"absolute", inset:0, borderRadius:3,
border:`2px solid ${hov ? "#7a4a18cc" : "#8a6030aa"}`,
boxShadow: hov ? "inset 0 0 14px rgba(100,40,5,.45), 2px 3px 12px rgba(0,0,0,.55)" : "inset 0 0 6px rgba(80,30,5,.2), 1px 2px 6px rgba(0,0,0,.4)",
transition:"all .4s", pointerEvents:"none" }}/>
<div style={{ position:"absolute", inset:4, borderRadius:2,
border:`1px solid ${hov ? "#7a4a1888" : "#8a603044"}`, pointerEvents:"none", transition:"border-color .4s" }}/>
<div style={{ position:"absolute", top:6, left:6, zIndex:4 }}>
<WaxSeal color={SEAL_COLORS_P[idx]} accent={hov ? tile.accent : "#c8903a"} size={20}/>
</div>
<div style={{ position:"relative", zIndex:2, display:"flex", flexDirection:"column",
alignItems:"center", justifyContent:"center", height:"100%", minHeight:120, gap:6, padding:"14px 10px 12px" }}>
<ParchmentTileIcon icon={tile.icon} hov={hov} accent={tile.accent}/>
<div style={{ fontFamily:"'IM Fell English', serif", fontSize:11.5,
color: hov ? "#2a1005" : "#4a2a0a", letterSpacing:".04em", textAlign:"center",
lineHeight:1.25, fontStyle:"italic", transition:"color .3s",
textShadow: hov ? "0 1px 0 rgba(255,220,150,.4)" : "none" }}>{tile.label}</div>
<div style={{ width: hov ? "70%" : "45%", height:1,
background: hov ? "linear-gradient(90deg, transparent, #7a4018, transparent)" : "linear-gradient(90deg, transparent, #a07040, transparent)",
transition:"all .4s" }}/>
</div>
</button>
);
}

// --- Parchment Hub Screen -----------------------------------------------------
function HubScreen({ setHqTab }) {
return (
<>
<style>{`@import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&display=swap');`}</style>
<div style={{ position:"relative", flex:1, padding:"10px 18px 18px",
display:"grid", gridTemplateColumns:"1fr 1fr", gridTemplateRows:"1fr 1fr 1fr", gap:10 }}>
{HUB_TILES_PARCHMENT.map((tile, i) => (
<ParchmentTileBtn key={tile.id} tile={tile} idx={i} onClick={() => setHqTab(tile.id)}/>
))}
</div>
</>
);
}

// -----------------------------------------------------------------------------
//  ARCHITECTURE -- full-screen left-nav layout
// -----------------------------------------------------------------------------

const QUARTER_UPGRADE_COST = (lvl) => ({
stone: Math.round(200 * Math.pow(2.0, lvl)),
wood:  Math.round(150 * Math.pow(2.0, lvl)),
ore:   Math.round(100 * Math.pow(2.0, lvl)),
gas:   Math.round(50  * Math.pow(2.0, lvl)),
});

const BRANCH_UPGRADE_COST = (lvl) => ({
stone: Math.round(120 * Math.pow(1.8, lvl)),
wood:  Math.round(80  * Math.pow(1.8, lvl)),
ore:   Math.round(60  * Math.pow(1.8, lvl)),
gas:   Math.round(30  * Math.pow(1.8, lvl)),
});

function LevelBar({ lvl, max, color }) {
return (
<div style={{ display:"flex", gap:2, marginTop:4 }}>
{Array.from({ length: max }).map((_, i) => (
<div key={i} style={{ flex:1, height:3, borderRadius:2, minWidth:3,
background: i < lvl ? (color||P.gold) : "#1e1810" }}/>
))}
</div>
);
}

function UpgradeButton({ lvl, maxLvl, cost, canAfford, onUpgrade, inProg }) {
const isMax   = lvl >= maxLvl;
const ok      = !isMax && !inProg && canAfford(cost||{});
const gated   = !isMax && !inProg && !ok;

// Self-contained 1-second ticker so the countdown re-renders while in progress
const [now, setNow] = useState(() => Date.now());
useEffect(() => {
  if (!inProg) return;
  setNow(Date.now());
  const id = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(id);
}, [inProg?.endsAt]);

if (isMax) return <div style={{ fontSize:9, color:P.gold, fontFamily:P.ff, fontWeight:700 }}>MAX</div>;
if (inProg) {
const pct = Math.max(0, Math.min(100, ((now-inProg.startedAt)/inProg.dur)*100));
const secsLeft = Math.max(0, Math.ceil((inProg.endsAt-now)/1000));
const mm = Math.floor(secsLeft/60), ss = secsLeft%60;
return (
<div style={{ textAlign:"right" }}>
<div style={{ fontSize:8, color:P.gold, fontFamily:P.ff, marginBottom:2 }}>
⚙ {mm>0?`${mm}m ${ss}s`:`${ss}s`}
</div>
<div style={{ height:3, background:"#181820", borderRadius:2, overflow:"hidden", width:60 }}>
<div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#c03030,#f0c040)", borderRadius:2 }}/>
</div>
</div>
);
}
return (
<button className="btn" disabled={!ok} onClick={onUpgrade}
style={{ padding:"5px 12px", fontSize:9, fontWeight:700,
background: ok ? "linear-gradient(135deg,rgba(200,160,64,.35),rgba(200,160,64,.12))" : "rgba(255,255,255,.02)",
border: `1px solid ${ok ? "#8a6020" : "#1e1810"}`,
color: ok ? P.gold : "#2a2a2a", borderRadius:4 }}>
{ok ? `↑ Lv${lvl+1}` : "⛔"}
</button>
);
}

function BuildingDetail({ bKey, bldgs, rss, canAfford, upgrade, upgQueue }) {
const def   = BLDG[bKey]; if (!def) return null;
const lvl   = bldgs[bKey]||0;
const avail = maxAvailLevel(bKey, bldgs.hq||1);
const isAbsMax = lvl >= def.max;
const isGated  = !isAbsMax && lvl >= avail;
const cost     = (!isAbsMax && !isGated) ? upgCost(bKey, lvl) : null;
const ok       = cost && canAfford(cost);
const inProg   = upgQueue[bKey];
const nd       = cost ? upgDuration(bKey, lvl+1) : 0;
const mm = Math.floor(nd/60000), ss = Math.floor((nd%60000)/1000);

return (
<div style={{ padding:"16px 20px" }}>
<div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
<div style={{ fontSize:40 }}>{def.icon}</div>
<div>
<div style={{ fontFamily:P.ff, fontSize:16, fontWeight:700, color:P.text }}>{def.n}</div>
<div style={{ fontSize:9, color:P.sub, marginTop:2 }}>Lv{lvl} / {avail} <span style={{ color:"#3a3028" }}>({def.max} max)</span></div>
<LevelBar lvl={lvl} max={Math.min(avail,20)} color={P.gold} />
</div>
</div>
<div style={{ fontSize:11, color:P.sub, fontFamily:P.ffb, marginBottom:16, lineHeight:1.6 }}>{def.desc}</div>
{bKey==="barracks" && <div style={{ fontSize:10, color:"#6a8aaa", marginBottom:12 }}>Capacity: {barracksCapacity(lvl).toLocaleString()}</div>}
{bKey==="storage" && <div style={{ fontSize:10, color:"#6aaa8a", marginBottom:12 }}>Max Resources: {storageMax(lvl).toLocaleString()} → <span style={{color:"#aad4b8"}}>{storageMax(Math.min(lvl+1,20)).toLocaleString()}</span> at Lv{Math.min(lvl+1,20)}</div>}
{isGated && <div style={{ fontSize:9, color:"#8a6020", fontFamily:P.ffb, fontStyle:"italic", marginBottom:12 }}>🔒 Upgrade HQ to Lv{avail+1} to unlock next level</div>}
{cost && (
<div style={{ padding:"12px 14px", background:"rgba(255,255,255,.03)", border:`1px solid ${P.border}`, borderRadius:6, marginBottom:12 }}>
<div style={{ fontSize:9, color:P.dim, fontFamily:P.ff, letterSpacing:".08em", marginBottom:8 }}>UPGRADE TO Lv{lvl+1}</div>
<div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:8 }}>
{Object.entries(cost).filter(([,v])=>v>0).map(([k,v]) => (
<div key={k} style={{ textAlign:"center" }}>
<div style={{ fontSize:9, color:(rss[k]||0)>=v ? RSS[k]?.col||"#888" : "#cc3030", fontFamily:P.ff, fontWeight:700 }}>
{RSS[k]?.icon||k} {v.toLocaleString()}
</div>
<div style={{ fontSize:6, color:P.dim }}>{(rss[k]||0)>=v ? "✓" : `need ${(v-(rss[k]||0)).toLocaleString()} more`}</div>
</div>
))}
</div>
<div style={{ fontSize:8, color:P.dim, fontFamily:P.ffb, marginBottom:10 }}>
⏱ {mm>0?`${mm}m ${ss>0?ss+"s":""}`:`${ss}s`}
</div>
<UpgradeButton lvl={lvl} maxLvl={def.max} cost={cost} canAfford={canAfford} onUpgrade={()=>upgrade(bKey)} inProg={inProg} />
</div>
)}
{inProg && <UpgradeButton lvl={lvl} maxLvl={def.max} cost={null} canAfford={canAfford} onUpgrade={null} inProg={inProg} />}
{isAbsMax && <div style={{ fontSize:11, color:P.gold, fontFamily:P.ff, fontWeight:700 }}>⭐ MAX LEVEL</div>}
</div>
);
}

// Per-level branch bonuses label
const BRANCH_LVL_BONUS = [
"T1 troop unlocked",
"-10% train cost & time",
"T2 troop unlocked",
"-10% train cost & time",
"T3 troop unlocked",
"-10% train cost & time",
];


  // -- Troop stat modal ----------------------------------------------------------
  function TroopStatModal({ troop, fColor, fDef, onClose }) {
  const { branch, tierIdx, tier } = troop;
  const cmdCost = COMMAND_COST[branch.size] ?? 1;
  const dmgColor = branch.dmgType === "magical" ? "#a855f7" : "#e08050";
  const roman = ["I","II","III"];
  const skills = getTierSkills(branch, tierIdx);
  const conscriptCost = { stone:2, wood:2, ore:1, gas:0.5 };
  const conscriptBase = [30, 60, 120][tierIdx];
  const TRIGGER_LABEL = {
  round_start: "Round Start", on_hit: "On Hit",
  on_hit_received: "On Hit Taken", on_kill: "On Kill", passive: "Passive",
  };
  const RSS_COL = { stone:["🪨","#aaaaaa"], wood:["🪵","#c8903a"], ore:["⚙️","#88aaff"], gas:["⛽","#5dcc80"] };
  return (
  <div onClick={onClose}
  style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,.72)",
  display:"flex", alignItems:"center", justifyContent:"center" }}>
  <div onClick={e => e.stopPropagation()}
  style={{ background:"#0f1018", border:`1px solid ${fColor}55`,
  borderRadius:12, padding:20, width:288, position:"relative",
  boxShadow:`0 8px 32px rgba(0,0,0,.7), 0 0 0 1px ${fColor}22`,
  maxHeight:"88vh", overflowY:"auto" }}>
  {/* close */}
  <button onClick={onClose}
  style={{ position:"absolute", top:8, right:10, background:"none", border:"none",
  color:P.dim, fontSize:16, cursor:"pointer", lineHeight:1 }}>x</button>
  {/* header */}
  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
  <div style={{ width:44, height:44, borderRadius:8, background:`${fColor}22`,
  border:`1px solid ${fColor}55`, display:"flex", alignItems:"center",
  justifyContent:"center", flexDirection:"column" }}>
  <div style={{ fontFamily:P.ff, fontSize:11, fontWeight:700, color:fColor }}>{roman[tierIdx]}</div>
  <div style={{ fontSize:16 }}>{fDef.s}</div>
  </div>
  <div>
  <div style={{ fontFamily:P.ff, fontSize:13, fontWeight:700, color:P.text }}>{tier.label}</div>
  <div style={{ fontSize:8, color:dmgColor, marginTop:1 }}>{branch.label} / {branch.size} / {branch.dmgType}</div>
  </div>
  </div>
  {/* stat grid */}
  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:12 }}>
  {[
  { lbl:"HP",    val:tier.hp,                         col:"#5dcc80" },
  { lbl:"DEF",   val:tier.def,                        col:"#88aaff" },
  { lbl:"DMG",   val:`${tier.dmgLo} - ${tier.dmgHi}`, col:"#e08050" },
  { lbl:"CMD",   val:`${cmdCost} / troop`,            col:P.sub    },
  ].map(({ lbl, val, col }) => (
  <div key={lbl} style={{ padding:"8px 10px", background:"rgba(255,255,255,.03)",
  border:`1px solid ${P.border}`, borderRadius:6 }}>
  <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".06em", marginBottom:3 }}>{lbl}</div>
  <div style={{ fontSize:13, fontWeight:700, color:col, fontFamily:P.ff }}>{val}</div>
  </div>
  ))}
  </div>
  {/* skills */}
  <div style={{ marginBottom:12 }}>
  <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".08em", marginBottom:6 }}>SKILLS</div>
  {skills.map(skill => (
  <div key={skill.key} style={{ padding:"8px 10px", background:"rgba(255,255,255,.02)",
  border:`1px solid ${P.border}`, borderRadius:6, marginBottom:5 }}>
  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
  <span style={{ fontSize:15, lineHeight:1 }}>{skill.icon}</span>
  <div style={{ flex:1 }}>
  <div style={{ fontFamily:P.ff, fontSize:10, fontWeight:700, color:fColor }}>{skill.name}</div>
  <div style={{ fontSize:7, color:P.dim, fontFamily:P.ffb, letterSpacing:".03em", marginTop:1 }}>
  {TRIGGER_LABEL[skill.trigger] || skill.trigger}
  {" · "}
  <span style={{ color:"#88aaff" }}>
  {Math.round(skill.procBase*100)}%–{Math.round(skill.procMax*100)}% proc
  </span>
  </div>
  </div>
  </div>
  <div style={{ fontSize:8, color:P.sub, fontFamily:P.ffb, lineHeight:1.65 }}>{skill.desc}</div>
  </div>
  ))}
  </div>
  {/* conscription */}
  <div style={{ padding:"8px 10px", background:"rgba(255,255,255,.02)",
  border:`1px solid ${P.border}`, borderRadius:6 }}>
  <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".08em", marginBottom:7 }}>CONSCRIPTION</div>
  {/* cost per troop */}
  <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".05em", marginBottom:4 }}>COST PER TROOP</div>
  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
  {Object.entries(conscriptCost).map(([k, v]) => {
  const [icon, col] = RSS_COL[k] || ["", P.sub];
  return (
  <span key={k} style={{ fontSize:9, fontFamily:P.ff, color:col }}>
  {icon} {v}
  </span>
  );
  })}
  </div>
  {/* time */}
  <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".05em", marginBottom:4 }}>TRAIN TIME</div>
  <div style={{ fontSize:9, fontFamily:P.ff, color:"#e8a840", marginBottom:7 }}>
  ⏱ {conscriptBase}s per troop <span style={{ fontSize:7, color:P.dim }}>(base)</span>
  </div>
  {/* unlock note */}
  <div style={{ fontSize:7, color:P.dim, fontFamily:P.ffb, lineHeight:1.65 }}>
  Tier <strong style={{color:fColor}}>{roman[tierIdx]}</strong> unlocked at branch Lv{tierIdx*2+1}.
  Train speed scales with Barracks level.
  </div>
  </div>
  </div>
  </div>
  );
  }

  function QuarterDetail({ fKey, fDef, slot, bldgs, setBldgs, rss, setRss, canAfford, quarterLevels, setQuarterLevels, setUnlockedBranches }) {
  const [selTroop, setSelTroop] = useState(null); // { branch, tierIdx, tier }
  const hqLvl   = bldgs.hq || 1;
  const qCeil   = quarterMaxLevel(slot, hqLvl);
  const _stored = (quarterLevels||{})[fKey];
  const qLvl    = _stored != null ? _stored : (qCeil > 0 ? 1 : 0);
  const qCost   = QUARTER_UPGRADE_COST(qLvl);
  const atCeil  = qLvl >= qCeil;
  const atMax   = qLvl >= 10;
  const canUpg  = !atMax && !atCeil && canAfford(qCost);

  useEffect(() => {
  const bldgUpdates = {};
  const ubUpdates   = {};
  fDef.branches.forEach((br, idx) => {
  if (qLvl >= BRANCH_UNLOCK_Q[idx]) {
  const bKey = `b_${fKey}_${br.key}`;
  if (!(bKey in bldgs) || (bldgs[bKey] || 0) < 1) {
  bldgUpdates[bKey] = 1;
  ubUpdates[`${fKey}:${br.key}`] = 0;
  }
  }
  });
  if (Object.keys(bldgUpdates).length > 0) {
  setBldgs(b => ({ ...b, ...bldgUpdates }));
  if (setUnlockedBranches) setUnlockedBranches(p => ({ ...p, ...ubUpdates }));
  }
  }, [qLvl, fKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const upgradeQuarter = () => {
  if (!canUpg) return;
  setQuarterLevels(prev => ({ ...prev, [fKey]: qLvl + 1 }));
  setRss(p => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v - (qCost[k] || 0)])));
  };

  const upgradeBranch = (branchKey, branchIdx) => {
  const bKey  = `b_${fKey}_${branchKey}`;
  const bLvl  = bldgs[bKey] || 0;
  const bCeil = branchMaxLevel(branchIdx, qLvl);
  if (bLvl >= bCeil) return;
  const cost = BRANCH_UPGRADE_COST(bLvl);
  if (!canAfford(cost)) return;
  const newBLvl = bLvl + 1;
  setBldgs(b => ({ ...b, [bKey]: newBLvl }));
  setRss(p => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v - (cost[k] || 0)])));
  if (setUnlockedBranches) {
  const newTier = tierFromBranchLevel(newBLvl);
  setUnlockedBranches(p => ({ ...p, [`${fKey}:${branchKey}`]: newTier }));
  }
  };

  const roman = ["I","II","III"];

  return (
  <div style={{ overflowY:"auto", height:"100%", padding:"14px 16px" }}>

  {/* Quarter header */}
  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16,
  padding:"12px 14px", background:`${fDef.c}11`, border:`1px solid ${fDef.c}44`, borderRadius:8 }}>
  <div style={{ fontSize:36 }}>{fDef.s}</div>
  <div style={{ flex:1 }}>
  <div style={{ fontFamily:P.ff, fontSize:15, fontWeight:700, color:fDef.c }}>{fDef.quarters}</div>
  <div style={{ fontSize:9, color:P.sub, marginTop:2 }}>
  {fDef.n} . Quarter Lv{qLvl}
  {!atMax && <span style={{ color:P.dim }}> / {qCeil} available . 10 max</span>}
  {atMax && <span style={{ color:fDef.c }}> / MAX</span>}
  </div>
  <LevelBar lvl={qLvl} max={10} color={fDef.c} />
  {!atMax && (
  <div style={{ marginTop:4 }}>
  <div style={{ fontSize:7, color:P.dim, marginBottom:2 }}>
  HQ Lv{hqLvl} gate: {qCeil < 10 ? `upgrades available to Lv${qCeil}` : "fully unlocked"}
  </div>
  <div style={{ display:"flex", gap:2 }}>
  {Array.from({ length: 10 }).map((_, i) => (
  <div key={i} style={{ flex:1, height:2, borderRadius:1, minWidth:2,
  background: i < qLvl ? fDef.c : i < qCeil ? `${fDef.c}44` : "#1e1810" }}/>
  ))}
  </div>
  </div>
  )}
  </div>
  <div style={{ textAlign:"right", minWidth:72 }}>
  {atMax ? (
  <div style={{ fontSize:9, color:fDef.c, fontFamily:P.ff, fontWeight:700 }}>MAX</div>
  ) : atCeil ? (
  <div style={{ textAlign:"center" }}>
  <div style={{ fontSize:8, color:"#c8903a", fontFamily:P.ff, marginBottom:3 }}>🔒 HQ GATE</div>
  <div style={{ fontSize:7, color:"#6a5040" }}>Upgrade HQ to<br/>unlock Lv{qCeil+1}</div>
  </div>
  ) : (
  <div>
  <button className="btn" disabled={!canUpg} onClick={upgradeQuarter}
  style={{ padding:"6px 14px", fontSize:10, fontWeight:700, marginBottom:4,
  background: canUpg ? `linear-gradient(135deg,${fDef.c}44,${fDef.c}18)` : "rgba(255,255,255,.02)",
  border: `1px solid ${canUpg ? fDef.c : "#1e1810"}`,
  color: canUpg ? fDef.c : "#2a2a2a", borderRadius:4 }}>
  ^ Lv{qLvl+1}
  </button>
  <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
  {Object.entries(qCost).filter(([,v])=>v>0).map(([k,v]) => (
  <RssPill key={k} rssKey={k} amount={v} rss={rss} small />
  ))}
  </div>
  </div>
  )}
  </div>
  </div>

  {/* Branch rows */}
  <div style={{ fontSize:8, color:P.dim, fontFamily:P.ff, letterSpacing:".1em", marginBottom:10 }}>TROOP BRANCHES</div>
  {fDef.branches.map((br, branchIdx) => {
  const unlockQ    = BRANCH_UNLOCK_Q[branchIdx];
  const branchOpen = qLvl >= unlockQ;
  const bKey       = `b_${fKey}_${br.key}`;
  const bLvl       = branchOpen ? Math.max(1, bldgs[bKey] || 1) : 0;
  const bCeil      = branchMaxLevel(branchIdx, qLvl);
  const atBCeil    = bLvl >= bCeil;
  const atBMax     = bLvl >= 6;
  const bCost      = BRANCH_UPGRADE_COST(bLvl);
  const bOk        = branchOpen && !atBMax && !atBCeil && canAfford(bCost);
  const unlockedTier = tierFromBranchLevel(bLvl);
  const dmgColor   = br.dmgType === "magical" ? "#a855f7" : "#e08050";

  return (
  <div key={br.key} style={{ display:"flex", gap:8, marginBottom:12, alignItems:"stretch" }}>

  {/* LEFT: branch upgrade card */}
  <div style={{ width:110, flexShrink:0, borderRadius:8, overflow:"hidden",
  border:`1px solid ${branchOpen ? fDef.c+"55" : P.border}`,
  background: branchOpen ? `${fDef.c}0d` : "rgba(255,255,255,.01)",
  display:"flex", flexDirection:"column", position:"relative",
  opacity: branchOpen ? 1 : 0.55 }}>
  {/* lock overlay */}
  {!branchOpen && (
  <div style={{ position:"absolute", inset:0, zIndex:3,
  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
  background:"rgba(6,6,8,.6)", borderRadius:8 }}>
  <div style={{ fontSize:20, marginBottom:4 }}>🔒</div>
  <div style={{ fontSize:7, color:"#5a4020", fontFamily:P.ff, textAlign:"center", lineHeight:1.4 }}>
  Quarter<br/>Lv{unlockQ}
  </div>
  </div>
  )}
  <div style={{ flex:1, padding:"10px 8px 8px", display:"flex", flexDirection:"column", gap:5 }}>
  {/* faction symbol + label */}
  <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
  <div style={{ fontSize:18, lineHeight:1 }}>{fDef.s}</div>
  <div style={{ fontFamily:P.ff, fontSize:8, fontWeight:700,
  color: branchOpen ? fDef.c : "#3a3028", lineHeight:1.2 }}>{br.label}</div>
  </div>
  {/* size / dmg type badges */}
  <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
  <span style={{ fontSize:6, color:dmgColor, background:`${dmgColor}18`,
  padding:"1px 4px", borderRadius:3 }}>{br.dmgType}</span>
  <span style={{ fontSize:6, color:P.dim, background:"rgba(255,255,255,.04)",
  padding:"1px 4px", borderRadius:3 }}>{br.size}</span>
  </div>
  {/* level pips */}
  {branchOpen && (
  <div>
  <div style={{ fontSize:7, color:P.dim, marginBottom:3 }}>
  Lv{bLvl}
  {!atBMax && <span style={{color:"#3a3028"}}> / {bCeil} avail</span>}
  {atBMax && <span style={{color:fDef.c}}> MAX</span>}
  </div>
  <div style={{ display:"flex", gap:2 }}>
  {Array.from({length:6}).map((_,i) => (
  <div key={i} style={{ flex:1, height:3, borderRadius:2, minWidth:3,
  background: i < bLvl ? fDef.c : i < bCeil ? `${fDef.c}33` : "#1e1810" }}/>
  ))}
  </div>
  </div>
  )}
  </div>
  {/* upgrade button at bottom of card */}
  {branchOpen && (
  <div style={{ borderTop:`1px solid ${P.border}`, padding:"6px 8px" }}>
  {atBMax ? (
  <div style={{ fontSize:7, color:fDef.c, fontFamily:P.ff, fontWeight:700,
  textAlign:"center" }}>MAX</div>
  ) : atBCeil ? (
  <div style={{ fontSize:6, color:"#7a5030", fontFamily:P.ff,
  textAlign:"center", lineHeight:1.5 }}>Q Lv{bCeil+1}<br/>to unlock</div>
  ) : (
  <>
  <button className="btn" disabled={!bOk}
  onClick={() => upgradeBranch(br.key, branchIdx)}
  style={{ width:"100%", padding:"4px 0", fontSize:8, fontWeight:700,
  background: bOk ? `linear-gradient(135deg,${fDef.c}44,${fDef.c}18)` : "rgba(255,255,255,.02)",
  border:`1px solid ${bOk ? fDef.c : "#1e1810"}`,
  color: bOk ? fDef.c : "#2a2a2a", borderRadius:4, marginBottom:4 }}>
  {bOk ? `^ Lv${bLvl+1}` : "^"}
  </button>
  <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
  {Object.entries(bCost).filter(([,v])=>v>0).map(([k,v]) => (
  <RssPill key={k} rssKey={k} amount={v} rss={rss} small />
  ))}
  </div>
  </>
  )}
  </div>
  )}
  </div>

  {/* RIGHT: 3 troop tier cards */}
  <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", gap:6 }}>
  {/* connector line */}
  <div style={{ position:"relative", display:"flex", alignItems:"center", gap:5 }}>
  {/* background connector */}
  <div style={{ position:"absolute", top:"50%", left:16, right:16, height:2,
  background:`linear-gradient(90deg,${fDef.c}22,${fDef.c}44,${fDef.c}22)`,
  transform:"translateY(-50%)", zIndex:0 }}/>
  {br.tiers.map((tier, idx) => {
  const needsLvl = idx * 2 + 1;
  const tierUnlocked = branchOpen && unlockedTier >= idx;
  const canView = tierUnlocked;
  return (
  <button key={idx}
  onClick={() => canView && setSelTroop({ branch: br, tierIdx: idx, tier, fColor: fDef.c, fDef })}
  style={{ flex:1, minHeight:90, padding:"8px 6px", position:"relative", zIndex:1,
  borderRadius:8, cursor: canView ? "pointer" : "default",
  background: tierUnlocked ? `${fDef.c}15` : "rgba(255,255,255,.02)",
  border:`1px solid ${tierUnlocked ? fDef.c+"55" : P.border}`,
  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3,
  opacity: !branchOpen ? 0.25 : !tierUnlocked ? 0.45 : 1,
  transition:"all .15s",
  boxShadow: canView ? `0 2px 8px ${fDef.c}22` : "none" }}>
  {/* tier roman numeral badge */}
  <div style={{ fontSize:7, fontFamily:P.ff, fontWeight:700,
  color: tierUnlocked ? fDef.c : "#3a3028",
  background: tierUnlocked ? `${fDef.c}22` : "rgba(255,255,255,.03)",
  padding:"1px 5px", borderRadius:3 }}>{roman[idx]}</div>
  {/* faction icon */}
  <div style={{ fontSize:20, filter: tierUnlocked ? "none" : "grayscale(1) brightness(.35)" }}>
  {fDef.s}
  </div>
  {/* label */}
  <div style={{ fontSize:7, fontFamily:P.ff, fontWeight:700,
  color: tierUnlocked ? P.text : "#2a2020",
  textAlign:"center", lineHeight:1.2 }}>
  {tier.label}
  </div>
  {/* mini stats or lock reason */}
  {tierUnlocked ? (
  <div style={{ fontSize:6, color:P.dim, textAlign:"center", lineHeight:1.5 }}>
  {tier.hp}hp / {tier.def}def<br/>{tier.dmgLo}-{tier.dmgHi} dmg
  </div>
  ) : branchOpen ? (
  <div style={{ fontSize:6, color:"#4a3820", fontFamily:P.ff }}>Lv{needsLvl}</div>
  ) : null}
  {/* tap hint */}
  {tierUnlocked && (
  <div style={{ fontSize:5, color:`${fDef.c}88`, fontFamily:P.ff,
  letterSpacing:".06em", marginTop:1 }}>TAP FOR INFO</div>
  )}
  </button>
  );
  })}
  </div>
  </div>

  </div>
  );
  })}

  {/* Troop stat modal */}
  {selTroop && (
  <TroopStatModal
  troop={selTroop}
  fColor={selTroop.fColor}
  fDef={selTroop.fDef}
  onClose={() => setSelTroop(null)}
  />
  )}

  </div>
  );
  }

  
const FACTION_META = {
pirates:       { n:"Pirates",               s:"🏴", c:"#d4832a" },
bountyhunters: { n:"Wizards",               s:"🔮", c:"#9955dd" },
orcs:          { n:"Orcs",                  s:"⚔️",  c:"#6aa830" },
dragons:       { n:"Dragons",               s:"🐉",  c:"#cc3030" },
holyknights:   { n:"Holy Knights",          s:"✝️",  c:"#d4af37" },
nightcreatures:{ n:"Creatures of the Night",s:"🌑",  c:"#a030c0" },
};
const ALIGN_FACTIONS = {
humans:   ["pirates","bountyhunters","holyknights"],
creatures:["orcs","dragons","nightcreatures"],
};
function getAlignment(fk) {
return ALIGN_FACTIONS.humans.includes(fk) ? "humans" : "creatures";
}

function InfrastructureScreen({ bldgs, setBldgs, rss, setRss, canAfford, upgrade, upgQueue, cmds, facKey, quarterLevels, setQuarterLevels, setUnlockedBranches }) {
const [leftSel, setLeftSel]     = useState("buildings");
const [selBuilding, setSelBuilding] = useState(null);

const BLDG_KEYS = ["hq","walls","quarry","lumber","forge","refinery","storage","barracks","training","commandcenter","healingtent"];

const primaryFaction = facKey || "pirates";
const myAlign        = getAlignment(primaryFaction);
const alignFactions  = ALIGN_FACTIONS[myAlign] || ALIGN_FACTIONS.humans;
// Sidebar shows only: player's faction first, then the other 3 in same alignment
const factionOrder   = [
  primaryFaction,
  ...alignFactions.filter(f => f !== primaryFaction),
];
const hqLvl          = bldgs.hq || 1;

const LEFT_NAV = [
{ id:"buildings", icon:"🏛", label:"Buildings", color:"#c8903a", locked:false, isYou:false, slot:-1 },
...factionOrder.map((fKey,i) => {
const maxLvl = quarterMaxLevel(i, hqLvl);
const curLvl = (quarterLevels||{})[fKey] != null ? (quarterLevels||{})[fKey] : (maxLvl > 0 ? 1 : 0);
return {
id: `q_${fKey}`,
icon:   FACTION_META[fKey]?.s || "⚑",
label:  FACTION_META[fKey]?.n || fKey,
color:  FACTION_META[fKey]?.c || "#888",
locked: maxLvl === 0,
isYou:  i === 0,
curLvl,
maxLvl,
slot:   i,
};
}),
{ id:"unknown", icon:"❓", label:"Unknown", color:"#666", locked:true, isYou:false, slot:-1 },
];

const isBuildings = leftSel === "buildings";
const isUnknown   = leftSel === "unknown";
const quarterFKey = (!isBuildings && !isUnknown) ? leftSel.slice(2) : null;
const fDef        = quarterFKey ? { ...FACTION_TROOPS[quarterFKey], ...FACTION_META[quarterFKey] } : null;

return (
<div style={{ display:"flex", height:"100%", gap:0 }}>

  {/* -- 5-icon left sidebar -- */}
  <div style={{ width:68, flexShrink:0, borderRight:`1px solid ${P.border}`,
    background:"rgba(0,0,0,.4)", display:"flex", flexDirection:"column",
    alignItems:"center", gap:4, padding:"8px 4px", overflowY:"auto" }}>
    {LEFT_NAV.map(item => {
      const isActive = leftSel === item.id;
      const atCeiling = item.slot >= 0 && !item.locked && item.curLvl > 0
        && item.curLvl >= item.maxLvl && item.maxLvl < 10;
      return (
        <button key={item.id}
          onClick={() => { if (!item.locked) { setLeftSel(item.id); setSelBuilding(null); } }}
          disabled={item.locked}
          style={{ width:60, display:"flex", flexDirection:"column", alignItems:"center",
            gap:3, padding:"10px 4px", borderRadius:8, cursor:item.locked?"default":"pointer",
            background: isActive ? `${item.color}22` : "transparent",
            border: `1px solid ${isActive ? item.color+"66" : "transparent"}`,
            transition:"all .15s", position:"relative" }}>
          {item.locked && (
            <div style={{ position:"absolute", top:3, right:6, fontSize:8, opacity:.5 }}>🔒</div>
          )}
          {!item.locked && item.slot >= 0 && item.curLvl > 0 && (
            <div style={{ position:"absolute", top:3, left:6, fontSize:7,
              color: atCeiling ? "#c8903a" : item.color, fontFamily:P.ff, fontWeight:700 }}>
              {item.curLvl}/{item.maxLvl}
            </div>
          )}
          {isActive && (
            <div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)",
              width:3, height:22, background:item.color, borderRadius:"2px 0 0 2px" }}/>
          )}
          <div style={{ fontSize:24, filter:item.locked?"grayscale(1) brightness(.45)":"none" }}>
            {item.icon}
          </div>
          <div style={{ fontSize:7, color:isActive?item.color:item.locked?"#3a3028":P.dim,
            fontFamily:P.ff, textAlign:"center", lineHeight:1.2, letterSpacing:".04em" }}>
            {item.label}
          </div>
          {item.isYou && (
            <div style={{ fontSize:6, color:item.color, fontFamily:P.ff, fontWeight:700 }}>YOU</div>
          )}
        </button>
      );
    })}
  </div>

  {/* -- Right panel -- */}
  <div style={{ flex:1, overflowY:"auto" }}>

    {/* Buildings: card grid */}
    {isBuildings && !selBuilding && (
      <div style={{ padding:"12px 14px" }}>
        <div style={{ fontSize:8, color:P.dim, fontFamily:P.ff, letterSpacing:".12em", marginBottom:10 }}>
          BUILDINGS
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {BLDG_KEYS.map(key => {
            const def    = BLDG[key];
            const lvl    = bldgs[key]||0;
            const avail  = maxAvailLevel(key, bldgs.hq||1);
            const cost   = (lvl < (def?.max||10)) ? upgCost(key, lvl) : null;
            const ok     = cost && canAfford(cost);
            const inProg = upgQueue[key];
            return (
              <button key={key} onClick={() => setSelBuilding(key)}
                style={{ padding:0, borderRadius:8, overflow:"hidden", cursor:"pointer",
                  textAlign:"left",
                  border:`1px solid ${inProg?"#c8903a55":ok?"rgba(240,192,64,.25)":P.border}`,
                  background:"rgba(255,255,255,.03)", transition:"border-color .15s" }}>
                <div style={{ padding:"10px 12px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                    <div style={{ fontSize:22 }}>{def?.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:P.ff, fontSize:9, fontWeight:700,
                        color:P.text, lineHeight:1.3 }}>{def?.n}</div>
                      <div style={{ fontSize:7, color:P.sub }}>Lv{lvl} / {Math.min(avail,def?.max||10)}</div>
                    </div>
                    {inProg && <div style={{ fontSize:10, color:P.gold }}>⚙</div>}
                    {!inProg && ok && <div style={{ fontSize:10, color:"#3daa60" }}>↑</div>}
                  </div>
                  <LevelBar lvl={lvl} max={Math.min(avail,10,def?.max||10)} color={P.gold} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    )}

    {/* Buildings: drill-in detail */}
    {isBuildings && selBuilding && (
      <div>
        <button className="btn" onClick={() => setSelBuilding(null)}
          style={{ margin:"10px 14px 0", padding:"4px 12px",
            background:"rgba(255,255,255,.06)", border:`1px solid ${P.border}`,
            color:P.sub, fontSize:9, borderRadius:4 }}>
          ← All Buildings
        </button>
        <BuildingDetail bKey={selBuilding} bldgs={bldgs} rss={rss}
          canAfford={canAfford} upgrade={upgrade} upgQueue={upgQueue} />
      </div>
    )}

    {/* Faction quarter */}
    {!isBuildings && !isUnknown && quarterFKey && fDef && (() => {
      const navItem = LEFT_NAV.find(n => n.id === leftSel);
      return (
        <QuarterDetail
          fKey={quarterFKey} fDef={fDef}
          slot={navItem?.slot ?? 0}
          bldgs={bldgs} setBldgs={setBldgs}
          rss={rss} setRss={setRss} canAfford={canAfford}
          quarterLevels={quarterLevels} setQuarterLevels={setQuarterLevels}
          setUnlockedBranches={setUnlockedBranches} />
      );
    })()}

    {/* Unknown quarter */}
    {isUnknown && (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", height:"80%", padding:30, textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:16, filter:"grayscale(1) brightness(.35)" }}>❓</div>
        <div style={{ fontFamily:P.ff, fontSize:13, color:"#3a3028",
          letterSpacing:".1em", marginBottom:12 }}>UNKNOWN QUARTER</div>
        <div style={{ fontSize:9, color:"#2a2020", fontFamily:P.ffb, fontStyle:"italic",
          maxWidth:200, lineHeight:1.8 }}>
          The origins of this quarter remain shrouded in mystery.<br/>
          Perhaps in time, its secrets will be revealed...
        </div>
      </div>
    )}
  </div>
</div>

);
}

// -----------------------------------------------------------------------------
//  COMMAND CENTER (Overview)
// -----------------------------------------------------------------------------
function CommandCenterScreen({ cmds, pKeys, rss, gems, bldgs, bLog, tiles }) {
const rssToBuilding = { stone:"quarry", wood:"lumber", ore:"forge", gas:"refinery" };
const totalTroops   = cmds.filter(c=>c.owner==="player").reduce((s,c)=>s+(c.troops||0),0);
return (
<div>
<SectionHeader>COMMAND CENTER</SectionHeader>
<div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:7, marginBottom:12 }}>
{[
{ icon:"🗺", val:pKeys.size,   lbl:"Tiles Controlled" },
{ icon:"⚔",  val:cmds.filter(c=>c.owner==="player").length, lbl:"Commanders" },
{ icon:"🪖",  val:totalTroops.toLocaleString(), lbl:"Total Troops" },
{ icon:"🚶",  val:cmds.filter(c=>c.owner==="player"&&c.march).length, lbl:"On March" },
].map(({ icon, val, lbl }) => (
<div key={lbl} style={{ background:"rgba(240,192,64,.04)", border:"1px solid rgba(240,192,64,.12)",
borderRadius:5, padding:"10px 12px" }}>
<div style={{ fontSize:9, color:P.gold, fontFamily:P.ff, fontWeight:700, marginBottom:2 }}>{icon} {lbl}</div>
<div style={{ fontSize:20, fontWeight:700, color:P.text, fontFamily:P.ff }}>{val}</div>
</div>
))}
</div>
<SectionHeader>RESOURCES</SectionHeader>
<div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:7, marginBottom:12 }}>
{RKEYS.map(k => {
const bldgKey = rssToBuilding[k];
const bldgRate = rssRate(bldgs[bldgKey]||0);
const tileProd = Object.values(tiles).filter(t=>t.owner==="player"&&t.rss===k).length * 60;
const totalPerHr = 200 + bldgRate + tileProd;
const cap = storageMax(bldgs.storage||0);
return (
<div key={k} style={{ background:RSS[k].bg, border:`1px solid ${RSS[k].col}30`, borderRadius:5, padding:"8px 10px" }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
<div style={{ fontSize:9, color:RSS[k].col, fontFamily:P.ff, fontWeight:700 }}>{RSS[k].icon} {RSS[k].lbl}</div>
<div style={{ fontSize:7, color:RSS[k].col, opacity:.7, fontFamily:P.ff }}>+{totalPerHr.toLocaleString()}/hr</div>
</div>
<div style={{ fontSize:18, fontWeight:700, color:P.text, fontFamily:P.ff, marginTop:2 }}>
{Math.floor(rss[k]).toLocaleString()}
</div>
<div style={{ fontSize:6, color:P.dim, marginTop:1 }}>cap: {cap.toLocaleString()}</div>
</div>
);
})}
<div style={{ background:"rgba(240,192,64,.07)", border:"1px solid rgba(240,192,64,.2)", borderRadius:5, padding:"8px 10px" }}>
<div style={{ fontSize:9, color:P.gold, fontFamily:P.ff, fontWeight:700 }}>💎 Gems</div>
<div style={{ fontSize:18, fontWeight:700, color:P.text, fontFamily:P.ff, marginTop:2 }}>{gems}</div>
</div>
</div>
{bLog.length > 0 && (<>
<SectionHeader>RECENT BATTLES</SectionHeader>
{bLog.slice(0,6).map((l,i) => (
<div key={i} style={{ fontSize:9, color:i===0?"#c0a880":"#3a3040",
fontFamily:P.ffb, marginBottom:3,
borderBottom:"1px solid rgba(255,255,255,.02)", paddingBottom:2 }}>{l}</div>
))}
</>)}
</div>
);
}

// -----------------------------------------------------------------------------
//  TROOPS (Training)
// -----------------------------------------------------------------------------
function StrikeCraftScreen({ bldgs, barracksPool, trainingQueue, canAfford, queueTraining, rss, cmds, discardTroops, unlockedBranches }) {
const [activePanel, setActivePanel] = useState(null); // { key, mode:"train"|"discard" }
const [panelSlider, setPanelSlider] = useState(0);

const cap      = barracksCapacity(bldgs.barracks||0);
const pct      = Math.min(100, Math.round((barracksPool/cap)*100));
const room     = cap - barracksPool;
const maxBatch = maxTrainBatch(bldgs.training||0);
const rate     = trainRate(bldgs.training||0);

const ub = unlockedBranches || {};

const troopCards = useMemo(() => {
const cards = [];
Object.entries(FACTION_TROOPS).forEach(([fKey, fDef]) => {
fDef.branches.forEach(branch => {
const ubKey = `${fKey}:${branch.key}`;
if (!(ubKey in ub)) return;
const maxTier = ub[ubKey];
const tier = branch.tiers[maxTier];
if (!tier) return;
const key = `${fKey}_${branch.key}_${maxTier}`;
const fColor = FACTION_META[fKey]?.c || "#888";
const assigned = (cmds||[])
.filter(x=>x.owner==="player"&&x.troopBranch?.faction===fKey
&&x.troopBranch?.branch===branch.key)
.reduce((s,x)=>s+(x.troops||0),0);
cards.push({ key, tier, branch, fColor, assigned, fKey });
});
});
return cards;
}, [ub, cmds]);

return (
<div>
{/* Barracks capacity bar */}
<div style={{ marginBottom:10, padding:"10px 12px", background:"rgba(255,255,255,.03)",
border:`1px solid ${P.border}`, borderRadius:6 }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
<div style={{ fontFamily:P.ff, fontSize:10, color:"#c8a060", fontWeight:700 }}>
🏕 Barracks Lv{bldgs.barracks||0}
</div>
<div style={{ fontFamily:P.ff, fontSize:12,
color:pct>50?"#3daa60":pct>10?"#d0a030":"#cc3030", fontWeight:700 }}>
{barracksPool.toLocaleString()} / {cap.toLocaleString()}
</div>
</div>
<div style={{ height:5, background:"#181820", borderRadius:3, overflow:"hidden" }}>
<div style={{ height:"100%", width:`${pct}%`,
background:pct>50?"#3daa60":pct>10?"#d0a030":"#cc3030",
borderRadius:3, transition:"width .3s" }}/>
</div>
<div style={{ fontSize:7, color:P.dim, marginTop:4, fontFamily:P.ff }}>
{room.toLocaleString()} space available . training {rate.toLocaleString()}/s
</div>
</div>

  {/* Active training progress */}
  {trainingQueue && (() => {
    const qPct     = Math.round(((trainingQueue.total-trainingQueue.remaining)/trainingQueue.total)*100);
    const secsLeft = Math.ceil(trainingQueue.remaining/rate);
    return (
      <div style={{ marginBottom:10, padding:"8px 12px",
        background:"rgba(40,80,160,.1)", border:"1px solid rgba(60,120,220,.3)", borderRadius:6 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
          <div style={{ fontFamily:P.ff, fontSize:9, color:"#88aaff", fontWeight:700 }}>⚔️ TRAINING IN PROGRESS</div>
          <div style={{ fontSize:8, color:"#6a8aaa", fontFamily:P.ff }}>{trainingQueue.remaining.toLocaleString()} . ~{secsLeft}s</div>
        </div>
        <div style={{ height:4, background:"#181820", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${qPct}%`,
            background:"linear-gradient(90deg,#3366cc,#88aaff)", borderRadius:2, transition:"width 1s" }}/>
        </div>
      </div>
    );
  })()}

  {/* Troop type cards */}
  {troopCards.length === 0 && (
    <div style={{ textAlign:"center", padding:"30px 20px", fontSize:9, color:P.dim,
      fontFamily:P.ffb, fontStyle:"italic" }}>
      No troop types unlocked yet. Assign troop branches to commanders in the Army tab.
    </div>
  )}

  {troopCards.map(card => {
    const isActive = activePanel?.key === card.key;
    return (
      <div key={card.key} style={{ marginBottom:8, borderRadius:8, overflow:"hidden",
        border:`1px solid ${isActive?card.fColor+"55":P.border}`,
        background:isActive?`${card.fColor}08`:"rgba(255,255,255,.025)" }}>

        {/* Card row */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px" }}>
          <div style={{ padding:"8px 10px", borderRadius:6, textAlign:"center", minWidth:52,
            background:`${card.fColor}18`, border:`1px solid ${card.fColor}30` }}>
            <div style={{ fontFamily:P.ff, fontSize:9, fontWeight:700, color:card.fColor }}>
              {card.branch?.label}
            </div>
            <div style={{ fontSize:7, color:P.sub, marginTop:1 }}>{card.tier.label}</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:P.ff, fontSize:10, fontWeight:700, color:P.text }}>
              {card.tier.label}
            </div>
            <div style={{ fontSize:7, color:card.fColor }}>{card.branch?.size} . {card.branch?.dmgType}</div>
            <div style={{ fontSize:7, color:P.dim, marginTop:1 }}>
              Assigned: <span style={{ color:P.text }}>{card.assigned.toLocaleString()}</span>
              &nbsp;. Pool: <span style={{ color:P.text }}>{barracksPool.toLocaleString()}</span>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <button className="btn"
              onClick={() => { setActivePanel(isActive&&activePanel.mode==="train"?null:{key:card.key,mode:"train"}); setPanelSlider(0); }}
              style={{ padding:"5px 12px", fontSize:9, fontWeight:700,
                background:"linear-gradient(135deg,rgba(40,120,60,.5),rgba(40,120,60,.2))",
                border:"1px solid rgba(50,160,80,.5)", color:"#5dcc80", borderRadius:4 }}>
              Train
            </button>
            <button className="btn"
              onClick={() => { setActivePanel(isActive&&activePanel.mode==="discard"?null:{key:card.key,mode:"discard"}); setPanelSlider(0); }}
              style={{ padding:"5px 12px", fontSize:9, fontWeight:700,
                background:"linear-gradient(135deg,rgba(160,50,50,.35),rgba(160,50,50,.15))",
                border:"1px solid rgba(200,60,60,.4)", color:"#dd6666", borderRadius:4 }}>
              Discard
            </button>
          </div>
        </div>

        {/* Expanded slider panel */}
        {isActive && (() => {
          const isTrain   = activePanel.mode === "train";
          const sliderMax = isTrain
            ? Math.max(1, Math.min(maxBatch, room))
            : Math.max(1, barracksPool);
          const sv        = Math.min(panelSlider, sliderMax);
          const trainCost = isTrain ? { stone:sv*2, wood:sv*2, ore:sv, gas:Math.floor(sv*0.5) } : null;
          const canAct    = isTrain
            ? (!trainingQueue && sv>0 && canAfford(trainCost) && room>0)
            : (sv>0 && barracksPool>0);
          return (
            <div style={{ padding:"8px 12px 12px", borderTop:`1px solid ${P.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:8,
                color:isTrain?"#5dcc80":"#dd6666", fontFamily:P.ff, marginBottom:4 }}>
                <span>{isTrain?"TRAIN AMOUNT":"DISCARD AMOUNT"}</span>
                <span style={{ fontWeight:700 }}>{sv.toLocaleString()}</span>
              </div>
              <input type="range" min={0} max={Math.max(1,sliderMax)} value={sv}
                onChange={e => setPanelSlider(+e.target.value)}
                style={{ width:"100%", accentColor:isTrain?"#3daa60":"#cc3030", marginBottom:6 }}/>
              {isTrain && trainCost && (
                <div style={{ fontSize:7, marginBottom:6, display:"flex", gap:5, flexWrap:"wrap" }}>
                  {Object.entries(trainCost).map(([k,v]) => <RssPill key={k} rssKey={k} amount={v} rss={rss} small/>)}
                </div>
              )}
              {!isTrain && (
                <div style={{ fontSize:7, color:P.dim, fontFamily:P.ffb, marginBottom:6 }}>
                  Permanently remove {sv.toLocaleString()} troops from your barracks pool.
                </div>
              )}
              <button className="btn" disabled={!canAct}
                onClick={() => {
                  if (isTrain) queueTraining(sv);
                  else if (discardTroops) discardTroops(sv);
                  setActivePanel(null); setPanelSlider(0);
                }}
                style={{ width:"100%", padding:"8px",
                  background:canAct
                    ?(isTrain?"linear-gradient(135deg,rgba(40,100,60,.5),rgba(40,100,60,.2))"
                             :"linear-gradient(135deg,rgba(150,40,40,.4),rgba(150,40,40,.15))")
                    :"rgba(255,255,255,.02)",
                  border:`1px solid ${canAct?(isTrain?"#3daa60":"#cc4444"):"#181818"}`,
                  color:canAct?(isTrain?"#5dcc80":"#dd6666"):"#2a2a2a",
                  fontSize:10, fontWeight:700 }}>
                {canAct
                  ? (isTrain ? `Train ${sv.toLocaleString()} troops` : `Discard ${sv.toLocaleString()} troops`)
                  : (isTrain && trainingQueue ? "Training in progress" : "Select amount")}
              </button>
            </div>
          );
        })()}
      </div>
    );
  })}
</div>

);
}

// -----------------------------------------------------------------------------
//  ARMY
// -----------------------------------------------------------------------------
function BattleGroupsScreen({ cmds, setCmds, bldgs, barracksPool, setBarracks, sliderVals, setSliderVals, assignTroops, returnTroops, playerHqKey, unlockedBranches }) {
const hqKey      = playerHqKey || `${HQP.player.c},${HQP.player.r}`;
const playerCmds = cmds.filter(c => c.owner==="player");
const [selUid, setSelUid] = useState(null);
const selCmd = playerCmds.find(c=>c.uid===selUid) || playerCmds[0] || null;

return (
<div style={{ display:"flex", height:"100%", overflow:"hidden" }}>

  {/* -- Left: Commander list -- */}
  <div style={{ width:132, flexShrink:0, borderRight:`1px solid ${P.border}`,
    background:"rgba(0,0,0,.3)", overflowY:"auto", padding:"6px 4px" }}>
    <div style={{ fontSize:6, color:P.dim, fontFamily:P.ff, letterSpacing:".1em",
      textAlign:"center", marginBottom:6 }}>COMMANDERS</div>
    {playerCmds.length === 0 && (
      <div style={{ fontSize:8, color:"#3a3028", fontFamily:P.ffb, fontStyle:"italic",
        textAlign:"center", padding:"12px 6px" }}>No commanders</div>
    )}
    {playerCmds.map(cmd => {
      const isActive = selCmd?.uid === cmd.uid;
      const tb = cmd.troopBranch;
      const faction = tb ? FACTION_TROOPS[tb.faction] : null;
      const branch  = faction?.branches.find(b=>b.key===tb?.branch);
      const tier    = branch?.tiers[tb?.tier??0];
      const fColor  = FACTION_META[tb?.faction]?.c || P.gold;
      const isAtHQ  = cmd.tk === hqKey;
      return (
        <button key={cmd.uid} onClick={() => setSelUid(cmd.uid)}
          style={{ width:"100%", textAlign:"left", marginBottom:4, padding:"8px 6px",
            borderRadius:6, cursor:"pointer",
            background:isActive?"rgba(240,192,64,.1)":"rgba(255,255,255,.02)",
            border:`1px solid ${isActive?P.gold+"44":P.border}`, transition:"all .12s" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <div style={{ fontSize:18 }}>{cmd.icon}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:P.ff, fontSize:8, fontWeight:700,
                color:isActive?P.gold:P.text, whiteSpace:"nowrap",
                overflow:"hidden", textOverflow:"ellipsis" }}>{cmd.n}</div>
              <div style={{ fontSize:6, color:P.sub }}>Lv{cmd.lvl} . {cmd.cls}</div>
            </div>
            {/* Stamina badge */}
            {(() => {
              const stam = cmd.stamina ?? 200;
              const sc = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";
              return (
                <div style={{ textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:5, color:sc }}>⚡{Math.floor(stam)}</div>
                  <div style={{ width:24, height:3, background:"rgba(0,0,0,.4)", borderRadius:2, overflow:"hidden", marginTop:1 }}>
                    <div style={{ height:"100%", width:`${(stam/200)*100}%`, background:sc, borderRadius:2 }}/>
                  </div>
                </div>
              );
            })()}
          </div>
          {tier && (
            <div style={{ fontSize:6, color:fColor, fontFamily:P.ff,
              background:`${fColor}15`, padding:"2px 5px", borderRadius:3,
              display:"inline-block", marginBottom:2 }}>{tier.label}</div>
          )}
          <div style={{ fontSize:5, color:isAtHQ?"#3daa60":"#6a5a3a", fontFamily:P.ff }}>
            {isAtHQ?"🏰 At HQ":"📍 Away"}
          </div>
        </button>
      );
    })}
  </div>

  {/* -- Right: Selected commander detail -- */}
  <div style={{ flex:1, overflowY:"auto", padding:"10px 12px" }}>
    {!selCmd ? (
      <div style={{ textAlign:"center", padding:"40px 20px", color:P.dim,
        fontFamily:P.ffb, fontStyle:"italic", fontSize:9 }}>
        No commanders available. Pull from the Gacha to recruit.
      </div>
    ) : (() => {
      const cmd = selCmd;
      const isAtHQ     = cmd.tk === hqKey;
      const tb         = cmd.troopBranch;
      const faction    = tb ? FACTION_TROOPS[tb.faction] : null;
      const branch     = faction?.branches.find(b=>b.key===tb?.branch);
      const tier       = branch?.tiers[tb?.tier??0];
      const commandCap = cmdCommand(cmd.lvl||5, bldgs.commandcenter||0, (cmd.cls==="leader"&&(cmd.lvl||5)>=25)?500:0);
      const cmdCost    = COMMAND_COST[branch?.size] ?? 1;
      const cmdUsed    = (cmd.troops||0) * cmdCost;
      const troopPct   = Math.round((cmdUsed / commandCap) * 100);
      const fColor     = FACTION_META[tb?.faction]?.c || P.gold;

      return (
        <div>
          {/* Commander header */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10,
            padding:"10px 12px", background:"rgba(255,255,255,.04)",
            border:`1px solid ${P.border}`, borderRadius:8 }}>
            <div style={{ fontSize:28 }}>{cmd.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:P.ff, fontSize:12, fontWeight:700, color:P.gold }}>{cmd.n}</div>
              <div style={{ fontSize:8, color:P.sub, marginTop:1 }}>Lv{cmd.lvl} . {cmd.cls}</div>
              <div style={{ fontSize:7, color:isAtHQ?"#3daa60":"#7a5a3a", marginTop:1 }}>
                {isAtHQ ? "🏰 At HQ" : "📍 Away -- recall to HQ to modify"}
              </div>
              {/* Stamina bar */}
              {(() => {
                const stam = cmd.stamina ?? 200;
                const sc = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";
                return (
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:4 }}>
                    <span style={{ fontSize:7, color:sc }}>⚡</span>
                    <div style={{ flex:1, height:4, background:"rgba(0,0,0,.4)", borderRadius:2, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${(stam/200)*100}%`, background:sc, borderRadius:2, transition:"width .3s" }}/>
                    </div>
                    <span style={{ fontSize:7, color:sc, fontFamily:P.ff, minWidth:30 }}>{Math.floor(stam)}/200</span>
                  </div>
                );
              })()}
            </div>
            {(cmd.troops||0) > 0 && (
              <button className="btn" onClick={() => returnTroops(cmd.uid)}
                style={{ padding:"4px 8px", background:"rgba(200,50,50,.15)",
                  border:"1px solid rgba(200,50,50,.4)", color:"#cc5050", fontSize:8 }}>
                Return
              </button>
            )}
          </div>

          {/* Command bar */}
          <div style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:7,
              color:"#5a5060", fontFamily:P.ff, marginBottom:2 }}>
              <span>📡 COMMAND</span>
              <span style={{ color:troopPct>=100?"#cc3030":troopPct>=75?"#d0a030":"#3daa60" }}>
                {cmdUsed.toLocaleString()} / {commandCap.toLocaleString()}
              </span>
            </div>
            <div style={{ height:4, background:"#181820", borderRadius:2, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${troopPct}%`,
                background:troopPct>=100?"#cc3030":troopPct>=75?"#d0a030":"#3daa60",
                borderRadius:2, transition:"width .3s" }}/>
            </div>
          </div>

          {/* 3 Troop composition boxes */}
          <div style={{ fontSize:8, color:P.dim, fontFamily:P.ff, letterSpacing:".1em", marginBottom:6 }}>
            TROOP COMPOSITION
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:12 }}>
            {[0,1,2].map(slotIdx => {
              const isPrimary   = slotIdx === 0;
              const hasAssigned = isPrimary && tier;
              return (
                <div key={slotIdx} style={{ borderRadius:8, minHeight:88,
                  border:`1px solid ${hasAssigned?fColor+"44":P.border}`,
                  background:hasAssigned?`${fColor}0a`:"rgba(255,255,255,.02)",
                  display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", padding:8,
                  opacity: !isPrimary ? 0.4 : 1 }}>
                  {hasAssigned ? (
                    <>
                      <div style={{ fontSize:8, fontFamily:P.ff, color:fColor,
                        fontWeight:700, marginBottom:2, textAlign:"center" }}>{tier.label}</div>
                      <div style={{ fontSize:7, color:P.sub }}>{branch.label}</div>
                      <div style={{ fontSize:14, color:P.text, fontWeight:700, marginTop:4 }}>
                        {(cmd.troops||0).toLocaleString()}
                      </div>
                      <div style={{ fontSize:6, color:P.dim }}>troops</div>
                    </>
                  ) : (
                    <div style={{ fontSize:7, color:"#2a2020", fontFamily:P.ff, textAlign:"center" }}>
                      {isPrimary ? "No troops" : "--"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Troop branch selector + assign slider (at HQ only) */}
          {isAtHQ && (
            <TroopBranchSelector cmd={cmd} setCmds={setCmds}
              faction={faction} branch={branch} tier={tier} tb={tb}
              unlockedBranches={unlockedBranches} />
          )}
          {!isAtHQ && tb && tier && (
            <div style={{ padding:"8px 10px", background:"rgba(150,80,20,.08)",
              border:"1px solid rgba(150,80,20,.25)", borderRadius:4 }}>
              <div style={{ fontFamily:P.ff, fontSize:9, color:"#c8903a" }}>🔒 AWAY FROM HQ</div>
              <div style={{ fontSize:8, color:"#7a6a4a", marginTop:2 }}>
                Recall to HQ to modify troop assignment.
              </div>
            </div>
          )}
          {isAtHQ && tb && (() => {
            const sv        = sliderVals[cmd.uid] ?? (cmd.troops||0);
            const maxSlider = Math.min(Math.floor(commandCap/cmdCost), barracksPool+(cmd.troops||0));
            const delta     = sv - (cmd.troops||0);
            return (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:8,
                  color:"#6a5a4a", fontFamily:P.ff, marginBottom:4 }}>
                  <span>ASSIGN TROOPS</span>
                  <span style={{ color:delta>0?"#3daa60":delta<0?"#cc5050":"#5a5060" }}>
                    {(sv*cmdCost).toLocaleString()} / {commandCap.toLocaleString()}
                    {delta!==0&&<span style={{marginLeft:4}}>{delta>0?`(+${delta})`:delta}</span>}
                  </span>
                </div>
                <input type="range" min={0} max={maxSlider} value={sv}
                  onChange={e => setSliderVals(v=>({...v,[cmd.uid]:+e.target.value}))}
                  style={{ width:"100%", accentColor:"#3daa60", marginBottom:8 }}/>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:7,
                  color:"#4a4a5a", marginBottom:8 }}>
                  <span>0</span>
                  <span style={{color:"#5a7a5a"}}>Pool: {barracksPool.toLocaleString()}</span>
                  <span>{Math.floor(commandCap/cmdCost).toLocaleString()}</span>
                </div>
                {delta !== 0 ? (
                  <button className="btn" onClick={() => assignTroops(cmd.uid, cmd.troopBranch, sv)}
                    style={{ width:"100%", padding:"8px",
                      background:delta>0?"linear-gradient(135deg,rgba(40,100,60,.5),rgba(40,100,60,.2))"
                                      :"linear-gradient(135deg,rgba(150,40,40,.4),rgba(150,40,40,.15))",
                      border:`1px solid ${delta>0?"#3daa60":"#cc4444"}`,
                      color:delta>0?"#3dcc70":"#dd6666", fontSize:11, fontWeight:700 }}>
                    {delta>0?`✓ Add ${delta} troops`:`✓ Remove ${Math.abs(delta)} troops`}
                  </button>
                ) : (
                  <div style={{ fontSize:8, color:"#4a4a5a", fontFamily:P.ffb,
                    fontStyle:"italic", textAlign:"center" }}>Move slider to assign</div>
                )}
              </div>
            );
          })()}
          {!tb && isAtHQ && (
            <div style={{ fontSize:8, color:"#5a5060", fontFamily:P.ffb, fontStyle:"italic" }}>
              Select a troop branch above first.
            </div>
          )}
          {!tb && !isAtHQ && (
            <div style={{ fontSize:8, color:"#6a7a9a", fontFamily:P.ffb, fontStyle:"italic" }}>
              🔄 No troops assigned. Recall to HQ to assign a troop branch.
            </div>
          )}
        </div>
      );
    })()}
  </div>
</div>

);
}

// -- Troop branch selector sub-component --------------------------------------
function TroopBranchSelector({ cmd, setCmds, faction, branch, tier, tb, unlockedBranches }) {
const [expandedFaction, setExpandedFaction] = useState(tb?.faction ?? null);
const [expandedBranch,  setExpandedBranch]  = useState(tb?.branch  ?? null);

const ub = unlockedBranches || {};
// Only show factions that have at least one unlocked branch
const factions = Object.entries(FACTION_TROOPS).filter(([fKey, fDef]) =>
fDef.branches.some(br => `${fKey}:${br.key}` in ub)
);

return (
<div style={{ marginBottom:10 }}>
<div style={{ fontSize:8, color:"#6a5a4a", letterSpacing:".1em", fontFamily:"'Cinzel',serif", marginBottom:6 }}>
SELECT TROOP BRANCH
</div>
{factions.map(([fKey, fDef]) => {
const isExpF = expandedFaction === fKey;
return (
<div key={fKey} style={{ marginBottom:4 }}>
<button className="btn" onClick={() => setExpandedFaction(isExpF ? null : fKey)}
style={{ width:"100%", textAlign:"left", padding:"6px 10px",
background:isExpF?"rgba(240,192,64,.08)":"rgba(255,255,255,.02)",
border:`1px solid ${isExpF?"#5a4020":P.border}`,
color:isExpF?P.gold:P.sub, fontSize:9, fontFamily:"'Cinzel',serif",
display:"flex", justifyContent:"space-between", alignItems:"center" }}>
<span>{fDef.quarters}</span>
<span style={{ fontSize:7 }}>{isExpF ? "^" : "v"}</span>
</button>
{isExpF && (
<div style={{ paddingLeft:8, paddingTop:4, display:"flex", flexDirection:"column", gap:3 }}>
{fDef.branches.filter(br => `${fKey}:${br.key}` in ub).map(br => {
const isExpB = expandedBranch === br.key;
const maxTier = ub[`${fKey}:${br.key}`] ?? 0;
return (
<div key={br.key}>
<button className="btn" onClick={() => setExpandedBranch(isExpB ? null : br.key)}
style={{ width:"100%", textAlign:"left", padding:"5px 8px",
background:isExpB?"rgba(240,192,64,.05)":"rgba(255,255,255,.02)",
border:`1px solid ${isExpB?"#3a2a10":P.border}`,
color:isExpB?P.gold:P.sub, fontSize:8, fontFamily:"'Cinzel',serif",
display:"flex", justifyContent:"space-between" }}>
<span>{br.label} <span style={{ color:"#5a5a7a", fontSize:7 }}>({br.size} . {br.dmgType})</span></span>
<span style={{ fontSize:7 }}>{isExpB ? "^" : "v"}</span>
</button>
{isExpB && (
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:3, padding:"4px 0 4px 8px" }}>
{br.tiers.slice(0, maxTier + 1).map((t, idx) => {
const isActive = tb?.faction===fKey && tb?.branch===br.key && (tb?.tier??0)===idx;
return (
<button key={idx} className="btn"
onClick={() => {
  const newBranch = { faction:fKey, branch:br.key, tier:idx };
  setCmds(p => p.map(c => {
    if (c.uid !== cmd.uid) return c;
    const existingTroops = c.troopSlots?.[0]?.troops ?? c.troops ?? 0;
    const newSlots = [{ branch: newBranch, troops: existingTroops },
      ...(c.troopSlots?.slice(1) ?? [])];
    return { ...c, troopBranch: newBranch, troopSlots: newSlots };
  }));
}}
style={{ padding:"6px 4px", textAlign:"center",
background:isActive?"rgba(240,192,64,.15)":"rgba(255,255,255,.02)",
border:`1px solid ${isActive?P.gold:P.border}`,
color:isActive?P.gold:P.sub, fontSize:8,
boxShadow:isActive?`0 0 8px rgba(240,192,64,.2)`:"none" }}>
<div style={{ fontFamily:"'Cinzel',serif", fontWeight:700, fontSize:8, marginBottom:2 }}>
{t.label}
</div>
<div style={{ fontSize:6, color:"#5a5a7a" }}>
Lv{idx+1} . {br.size}
</div>
{isActive && <div style={{ fontSize:6, color:P.gold, marginTop:2 }}>✓</div>}
</button>
);
})}
</div>
)}
</div>
);
})}
</div>
)}
</div>
);
})}
</div>
);
}

// -----------------------------------------------------------------------------
//  HEALING TENT
// -----------------------------------------------------------------------------
function RepairBayScreen({ bldgs, woundedTroops, woundedQueue, bLog }) {
const [tab,        setTab]        = useState("wounded");
const [autoHeal,   setAutoHeal]   = useState(false);
const [healAmt,    setHealAmt]    = useState(0);
const tentLvl = bldgs.healingtent||0;
const tentCap = tentLvl * 200;
const rate    = tentLvl * 5;
const wounded = woundedTroops || 0;
const maxHeal = tentCap ? Math.min(wounded, tentCap) : wounded;
const sv      = Math.min(healAmt, maxHeal);

return (
<div>
{/* Capacity row */}
<div style={{ display:"flex", gap:8, marginBottom:10 }}>
<div style={{ flex:1, padding:"8px 12px", background:"rgba(255,255,255,.03)",
border:`1px solid ${P.border}`, borderRadius:6 }}>
<div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".08em", marginBottom:4 }}>
HEALING TENT Lv{tentLvl}
</div>
<div style={{ fontSize:9, color:"#88aaff", fontFamily:P.ff, fontWeight:700, marginBottom:3 }}>
{wounded.toLocaleString()} / {Math.max(wounded,tentCap).toLocaleString()}
</div>
<div style={{ height:4, background:"#181820", borderRadius:2, overflow:"hidden" }}>
<div style={{ height:"100%",
width:`${tentCap?Math.min(100,Math.round(wounded/tentCap*100)):0}%`,
background:"linear-gradient(90deg,#3366cc,#88aaff)", borderRadius:2 }}/>
</div>
</div>
<div style={{ flex:1, padding:"8px 12px", background:"rgba(255,255,255,.03)",
border:`1px solid ${P.border}`, borderRadius:6 }}>
<div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".08em", marginBottom:4 }}>
HEAL RATE
</div>
<div style={{ fontSize:14, color:"#5dcc80", fontFamily:P.ff, fontWeight:700 }}>
{rate.toLocaleString()}<span style={{ fontSize:8, color:P.dim }}>/sec</span>
</div>
<div style={{ fontSize:6, color:P.dim, marginTop:2 }}>auto-recovering</div>
</div>
</div>

  {/* Tabs */}
  <div style={{ display:"flex", marginBottom:10, borderBottom:`1px solid ${P.border}` }}>
    {[["wounded","Wounded"],["queue","Healing Queue"]].map(([t,lbl]) => (
      <button key={t} className="btn" onClick={() => setTab(t)}
        style={{ flex:1, padding:"8px", fontFamily:P.ff, fontSize:9, fontWeight:700,
          letterSpacing:".06em", textTransform:"uppercase",
          background:tab===t?"rgba(136,170,255,.1)":"transparent",
          border:"none", borderBottom:tab===t?"2px solid #88aaff":"2px solid transparent",
          color:tab===t?"#88aaff":P.dim, marginBottom:-1, borderRadius:0 }}>
        {lbl}
      </button>
    ))}
  </div>

  <div style={{ display:"flex", gap:10 }}>
    {/* Left: content area */}
    <div style={{ flex:1 }}>
      {tab === "wounded" && (wounded === 0 ? (
        <div style={{ fontSize:8, color:"#3a3040", fontFamily:P.ffb, fontStyle:"italic",
          textAlign:"center", padding:"20px 0" }}>
          No wounded troops at the moment.
        </div>
      ) : (
        <div style={{ padding:"10px 12px", background:"rgba(50,100,180,.07)",
          border:"1px solid rgba(80,140,220,.2)", borderRadius:6 }}>
          <div style={{ fontFamily:P.ff, fontSize:11, color:"#88aaff", fontWeight:700, marginBottom:4 }}>
            ⛺ {wounded.toLocaleString()} Wounded
          </div>
          <div style={{ fontSize:8, color:"#6a7a9a", fontFamily:P.ffb, lineHeight:1.7 }}>
            Healing at <strong style={{color:"#88aaff"}}>{rate}/sec</strong> -- returning to barracks.<br/>
            30% of battle casualties recover here automatically.
          </div>
        </div>
      ))}
      {tab === "queue" && (woundedQueue > 0 ? (
        <div style={{ padding:"10px 12px", background:"rgba(200,160,64,.06)",
          border:"1px solid rgba(200,160,64,.2)", borderRadius:6 }}>
          <div style={{ fontFamily:P.ff, fontSize:11, color:P.gold, fontWeight:700, marginBottom:4 }}>
            ⏳ {woundedQueue.toLocaleString()} Queued
          </div>
          <div style={{ fontSize:8, color:P.sub }}>
            Waiting for barracks capacity to accept healed troops.
          </div>
        </div>
      ) : (
        <div style={{ fontSize:8, color:"#3a3040", fontFamily:P.ffb, fontStyle:"italic",
          textAlign:"center", padding:"20px 0" }}>
          Healing queue is empty.
        </div>
      ))}
      {tentLvl < 1 && (
        <div style={{ marginTop:8, fontSize:8, color:"#cc6030", fontFamily:P.ff }}>
          ⚠ Build a Healing Tent in Architecture → Buildings to recover wounded troops.
        </div>
      )}
    </div>

    {/* Right: auto-heal panel */}
    <div style={{ width:128, flexShrink:0, padding:"10px 12px",
      background:"rgba(255,255,255,.02)", border:`1px solid ${P.border}`, borderRadius:8 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".08em" }}>AUTO HEAL</div>
        <button className="btn" onClick={() => setAutoHeal(a=>!a)}
          style={{ padding:"2px 8px", fontSize:8, fontWeight:700,
            background:autoHeal?"rgba(50,150,80,.3)":"rgba(200,50,50,.2)",
            border:`1px solid ${autoHeal?"#3daa60":"#cc4444"}`,
            color:autoHeal?"#5dcc80":"#cc5050", borderRadius:12 }}>
          {autoHeal?"ON":"OFF"}
        </button>
      </div>
      <div style={{ textAlign:"center", marginBottom:10 }}>
        <div style={{ fontSize:26, fontWeight:700,
          color:wounded>0?"#88aaff":"#2a2a3a", fontFamily:P.ff }}>{wounded.toLocaleString()}</div>
        <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".08em" }}>WOUNDED</div>
      </div>
      {wounded > 0 && tentLvl > 0 && (<>
        <input type="range" min={0} max={Math.max(1,maxHeal)} value={sv}
          onChange={e => setHealAmt(+e.target.value)}
          style={{ width:"100%", accentColor:"#88aaff", marginBottom:8 }}/>
        <button className="btn" onClick={() => setHealAmt(maxHeal)}
          style={{ width:"100%", marginBottom:5, padding:"6px",
            background:"rgba(255,255,255,.05)", border:`1px solid ${P.border}`,
            color:P.sub, fontSize:8, fontFamily:P.ff, fontWeight:700, borderRadius:4 }}>
          MAX
        </button>
        <button className="btn" disabled={sv===0}
          style={{ width:"100%", padding:"6px",
            background:sv>0?"linear-gradient(135deg,rgba(60,120,220,.4),rgba(60,120,220,.2))":"rgba(255,255,255,.02)",
            border:`1px solid ${sv>0?"rgba(80,140,255,.5)":"#181818"}`,
            color:sv>0?"#88aaff":"#2a2a3a",
            fontSize:8, fontFamily:P.ff, fontWeight:700, borderRadius:4 }}>
          CONFIRM
        </button>
      </>)}
    </div>
  </div>
</div>

);
}

// -----------------------------------------------------------------------------
//  MARKETPLACE
// -----------------------------------------------------------------------------
const TRADE_RATE = 0.70; // 70% return on trade

function MarketplaceScreen({ rss, setRss }) {
const [fromKey, setFromKey] = useState("stone");
const [toKey,   setToKey]   = useState("wood");
const [amount,  setAmount]  = useState(0);

const maxTrade   = Math.floor(rss[fromKey] || 0);
const safeAmount = Math.min(amount, maxTrade);
const receive    = Math.floor(safeAmount * TRADE_RATE);
const canTrade   = safeAmount > 0 && fromKey !== toKey && (rss[fromKey]||0) >= safeAmount;

const doTrade = () => {
if (!canTrade) return;
setRss(prev => ({
...prev,
[fromKey]: prev[fromKey] - safeAmount,
[toKey]:   prev[toKey]   + receive,
}));
setAmount(0);
};

return (
<div>
<SectionHeader>MARKETPLACE</SectionHeader>
<div style={{ padding:"10px 12px", background:"rgba(255,255,255,.02)",
border:`1px solid ${P.border}`, borderRadius:6, marginBottom:10 }}>
<div style={{ fontSize:8, color:P.sub, fontFamily:"'Crimson Pro',serif", marginBottom:8, fontStyle:"italic" }}>
Trade any resource for another at a 70% return rate. Use the slider to select how much to trade.
</div>

    {/* FROM / TO selectors */}
    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
      {/* FROM */}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:7, color:P.dim, fontFamily:"'Cinzel',serif", letterSpacing:".1em", marginBottom:4 }}>TRADE AWAY</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:3 }}>
          {RKEYS.map(k => {
            const r = RSS[k];
            const active = fromKey === k;
            return (
              <button key={k} className="btn" onClick={() => { setFromKey(k); if (toKey===k) setToKey(RKEYS.find(x=>x!==k)); setAmount(0); }}
                style={{ padding:"5px 4px", textAlign:"center",
                  background:active?`${r.col}22`:"rgba(255,255,255,.02)",
                  border:`1px solid ${active?r.col:P.border}`,
                  color:active?r.col:P.sub, fontSize:8 }}>
                <div>{r.icon}</div>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:7 }}>{r.lbl}</div>
                <div style={{ fontSize:6, color:active?r.col:"#3a3a4a" }}>{Math.floor(rss[k]).toLocaleString()}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Arrow */}
      <div style={{ fontSize:20, color:P.dim, flexShrink:0 }}>→</div>

      {/* TO */}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:7, color:P.dim, fontFamily:"'Cinzel',serif", letterSpacing:".1em", marginBottom:4 }}>RECEIVE</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:3 }}>
          {RKEYS.map(k => {
            const r = RSS[k];
            const active = toKey === k;
            const disabled = k === fromKey;
            return (
              <button key={k} className="btn" onClick={() => !disabled && setToKey(k)}
                style={{ padding:"5px 4px", textAlign:"center",
                  background:active?`${r.col}22`:"rgba(255,255,255,.02)",
                  border:`1px solid ${active?r.col:P.border}`,
                  color:disabled?"#2a2a2a":active?r.col:P.sub,
                  fontSize:8, opacity:disabled?.35:1, cursor:disabled?"not-allowed":"pointer" }}>
                <div>{r.icon}</div>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:7 }}>{r.lbl}</div>
                <div style={{ fontSize:6, color:active?r.col:"#3a3a4a" }}>{Math.floor(rss[k]).toLocaleString()}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>

    {/* Amount slider */}
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:8,
        color:"#6a5a4a", fontFamily:"'Cinzel',serif", marginBottom:4 }}>
        <span>TRADE AMOUNT</span>
        <span style={{ color:P.gold, fontWeight:700 }}>{safeAmount.toLocaleString()} {RSS[fromKey]?.icon}</span>
      </div>
      <input type="range" min={0} max={Math.max(1, maxTrade)} value={safeAmount}
        onChange={e => setAmount(+e.target.value)}
        style={{ width:"100%", accentColor:RSS[fromKey]?.col||P.gold, marginBottom:4 }}/>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:7, color:"#4a4a5a", marginBottom:8 }}>
        <span>0</span>
        <span style={{ color:"#5a6a5a" }}>Available: {maxTrade.toLocaleString()}</span>
        <span>{maxTrade.toLocaleString()}</span>
      </div>
    </div>

    {/* Trade preview */}
    {safeAmount > 0 && fromKey !== toKey && (
      <div style={{ padding:"8px 10px", background:"rgba(240,192,64,.06)",
        border:"1px solid rgba(240,192,64,.2)", borderRadius:4, marginBottom:8,
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:9, color:P.sub, fontFamily:"'Cinzel',serif" }}>
          <span style={{ color:RSS[fromKey]?.col }}>{RSS[fromKey]?.icon} {safeAmount.toLocaleString()}</span>
          {" → "}
          <span style={{ color:RSS[toKey]?.col }}>{RSS[toKey]?.icon} {receive.toLocaleString()}</span>
        </div>
        <div style={{ fontSize:7, color:"#5a5a3a", fontFamily:"'Crimson Pro',serif" }}>
          {TRADE_RATE*100}% rate
        </div>
      </div>
    )}

    <button className="btn" disabled={!canTrade} onClick={doTrade}
      style={{ width:"100%", padding:"10px",
        background:canTrade?"linear-gradient(135deg,rgba(200,160,64,.4),rgba(200,160,64,.15))":"rgba(255,255,255,.02)",
        border:`1px solid ${canTrade?"#8a6020":"#181818"}`,
        color:canTrade?P.gold:"#2a2a2a", fontSize:12, fontWeight:700, letterSpacing:".08em" }}>
      {canTrade
        ? `🏪 Trade ${safeAmount.toLocaleString()} ${RSS[fromKey]?.icon} → ${receive.toLocaleString()} ${RSS[toKey]?.icon}`
        : fromKey===toKey ? "Select different resources" : "Select amount to trade"}
    </button>
  </div>
</div>

);
}

// -----------------------------------------------------------------------------
//  ROOT HQMenu
// -----------------------------------------------------------------------------
export default memo(function HQMenu({
hqOpen, setHqOpen, hqTab, setHqTab,
cmds, setCmds, tiles, rss, setRss, gems, pKeys,
bldgs, setBldgs, barracksPool, setBarracks, woundedTroops, woundedQueue,
trainingQueue, trainSlider, setTrainSlider,
upgQueue, sliderVals, setSliderVals, bLog,
upgrade, canAfford, assignTroops, returnTroops, queueTraining,
recallMarch, setScreen, gearInventory, playerHqKey,
facKey, unlockedBranches, setUnlockedBranches,
quarterLevels, setQuarterLevels,
}) {
if (!hqOpen) return null;

const isHub = hqTab === "hub";

// Parchment shell constants
const PARCHMENT_BG = "#b8986a";
const PAPER_BG_OUTER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`;

return (
<div style={{ position:"fixed", inset:0, zIndex:400,
background: isHub ? PARCHMENT_BG : P.bg,
display:"flex", flexDirection:"column",
boxShadow:"inset 0 0 80px rgba(50,15,0,.6)" }}>

  {/* Parchment texture overlay -- only on hub */}
  {isHub && <>
    <div style={{ position:"absolute", inset:0, backgroundImage:PAPER_BG_OUTER,
      backgroundSize:"200px 200px", opacity:0.5, pointerEvents:"none", zIndex:0 }}/>
    <div style={{ position:"absolute", inset:0,
      background:"radial-gradient(ellipse at center, transparent 40%, rgba(40,10,0,.5) 100%)",
      pointerEvents:"none", zIndex:0 }}/>
    <div style={{ position:"absolute", inset:0,
      backgroundImage:"repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(60,25,5,.06) 22px, rgba(60,25,5,.06) 23px)",
      pointerEvents:"none", zIndex:0 }}/>
    {/* Double border frame */}
    <div style={{ position:"absolute", inset:7, border:"3px double #7a5028", borderRadius:3, pointerEvents:"none", zIndex:10 }}/>
    <div style={{ position:"absolute", inset:13, border:"1px solid #7a502844", borderRadius:2, pointerEvents:"none", zIndex:10 }}/>
    {/* Corner brackets */}
    {[[0,0],[0,1],[1,0],[1,1]].map(([yt,xl],i) => (
      <div key={i} style={{ position:"absolute", zIndex:11, pointerEvents:"none",
        top:yt===0?9:"auto", bottom:yt===1?9:"auto", left:xl===0?9:"auto", right:xl===1?9:"auto",
        width:22, height:22,
        borderTop:yt===0?"2px solid #7a5028":"none", borderBottom:yt===1?"2px solid #7a5028":"none",
        borderLeft:xl===0?"2px solid #7a5028":"none", borderRight:xl===1?"2px solid #7a5028":"none" }}/>
    ))}
  </>}

  {/* Title bar */}
  <div style={{ position:"relative", zIndex:5,
    padding:"18px 24px 14px",
    borderBottom: isHub ? "2px solid #7a5028" : `1px solid ${P.border}`,
    display:"flex", alignItems:"center", justifyContent:"center",
    flexShrink:0,
    background: isHub ? "transparent" : "rgba(0,0,0,.4)" }}>

    {/* Back button */}
    {hqTab !== "hub" && (
      <button onClick={() => setHqTab("hub")}
        style={{ position:"absolute", left:24,
          background:"rgba(255,255,255,.06)", border:`1px solid ${P.border}`,
          color:P.sub, fontSize:11, padding:"4px 12px", borderRadius:4, cursor:"pointer" }}>
        ← Back
      </button>
    )}

    {/* Title */}
    <div style={{ textAlign:"center" }}>
      {isHub ? (
        <>
          <div style={{ fontFamily:"'Cinzel Decorative', serif", fontSize:30,
            color:"#2a1005", letterSpacing:".25em",
            textShadow:"1px 1px 0 rgba(255,210,120,.4), 0 2px 6px rgba(60,20,0,.3)" }}>HQ</div>
          <div style={{ height:1, background:"linear-gradient(90deg, transparent, #7a5028 20%, #7a5028 80%, transparent)", marginTop:5 }}/>
          <div style={{ fontFamily:"'IM Fell English', serif", fontSize:9, color:"#7a5028",
            letterSpacing:".2em", fontStyle:"italic", marginTop:4, textTransform:"uppercase" }}>Headquarters</div>
        </>
      ) : (
        <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:14,
          background:"linear-gradient(135deg,#f0c040,#c8803a,#f0c040)",
          backgroundSize:"200% auto", WebkitBackgroundClip:"text",
          WebkitTextFillColor:"transparent", animation:"shimmer 3s linear infinite" }}>
          🏰 HEADQUARTERS {hqTab !== "hub" && `-- ${HUB_TILES_PARCHMENT.find(t=>t.id===hqTab)?.label??""}`}
        </div>
      )}
    </div>

    {/* Close button */}
    <button onClick={() => setHqOpen(false)}
      style={{ position:"absolute", right:24,
        background: isHub ? "radial-gradient(ellipse at 40% 35%, #d8c080, #b89050)" : "rgba(200,50,50,.15)",
        border: isHub ? "2px solid #7a5028" : "1px solid rgba(200,50,50,.4)",
        color: isHub ? "#3a1a05" : "#dd6060",
        fontSize:12, padding:"4px 14px", borderRadius:4, cursor:"pointer" }}>
      {isHub ? "✕" : "✕ Close"}
    </button>
  </div>

  {/* Content */}
  {(() => {
    const splitLayout = hqTab === "buildings" || hqTab === "army";
    return (
      <div className="scr" style={{ flex:1, overflowY: splitLayout ? "hidden" : "auto",
        minHeight:0, padding: (isHub || splitLayout) ? 0 : 14,
        display: isHub ? "flex" : splitLayout ? "flex" : "block",
        flexDirection:"column", position:"relative", zIndex:2 }}>

        {hqTab === "hub" && <HubScreen setHqTab={setHqTab}/>}

        {hqTab === "buildings" && (
          <InfrastructureScreen
            bldgs={bldgs} setBldgs={setBldgs} rss={rss} setRss={setRss} canAfford={canAfford}
            upgrade={upgrade} upgQueue={upgQueue} cmds={cmds} facKey={facKey}
            quarterLevels={quarterLevels} setQuarterLevels={setQuarterLevels}
            setUnlockedBranches={setUnlockedBranches}/>
        )}
        {hqTab === "commandcenter" && (
          <CommandCenterScreen cmds={cmds} pKeys={pKeys} rss={rss} gems={gems}
            bldgs={bldgs} bLog={bLog} tiles={tiles}/>
        )}
        {hqTab === "troops" && (
          <StrikeCraftScreen bldgs={bldgs} barracksPool={barracksPool}
            trainingQueue={trainingQueue} canAfford={canAfford}
            queueTraining={queueTraining} rss={rss} cmds={cmds}
            unlockedBranches={unlockedBranches}
            discardTroops={n => setBarracks(p => Math.max(0, p - n))}/>
        )}
        {hqTab === "army" && (
          <BattleGroupsScreen cmds={cmds} setCmds={setCmds} bldgs={bldgs}
            barracksPool={barracksPool} setBarracks={setBarracks}
            sliderVals={sliderVals} setSliderVals={setSliderVals}
            assignTroops={assignTroops} returnTroops={returnTroops}
            playerHqKey={playerHqKey} unlockedBranches={unlockedBranches}/>
        )}
        {hqTab === "repairbay" && (
          <RepairBayScreen bldgs={bldgs} woundedTroops={woundedTroops}
            woundedQueue={woundedQueue} bLog={bLog}/>
        )}
        {hqTab === "marketplace" && (
          <MarketplaceScreen rss={rss} setRss={setRss}/>
        )}
      </div>
    );
  })()}

  {/* Parchment bottom stamp -- hub only */}
  {isHub && (
    <div style={{ position:"absolute", bottom:16, left:"50%", transform:"translateX(-50%)",
      zIndex:12, pointerEvents:"none",
      fontFamily:"'IM Fell English', serif", fontSize:7.5, color:"#7a5028",
      opacity:0.5, letterSpacing:".25em", fontStyle:"italic", whiteSpace:"nowrap" }}>
      -- BY ROYAL DECREE --
    </div>
  )}
</div>

);
});