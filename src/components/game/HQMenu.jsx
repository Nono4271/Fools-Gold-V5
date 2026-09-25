import {trainingQuote,trainingSecondsLeft,capstoneTrainDiscount} from "../../../shared/utils/training.js";
import {poolCommands,queuedCommands,troopsThatFit} from "../../../shared/utils/barracks.js";
import {healingFoodCost,healingRate} from "../../../shared/utils/armyEconomy.js";
import { useState, useEffect, memo, useMemo } from "react";
import { useGameContext } from "../../GameContext.js";
import { createPortal } from "react-dom";
import { FACTION_TROOPS, COMMAND_COST, getTierSkills, skillOrbCost, skillProcAtLevel, troopPortraitPath } from "../../../shared/constants/troops.js";
// Lookups for a player's troop branch go through TROOP_FACTIONS so trained
// Neutral/Ancient units (camps + Contract Outpost) resolve like any troop.
import { TROOP_FACTIONS } from "../../../shared/constants/allTroops.js";
import { OUTPOST_DAILY_COMMAND_LIMIT } from "../../../shared/constants/crew.js";
import { RSS, RKEYS, HQP } from "../../../shared/constants/map.js";
import { BLDG, barracksCommandCapacity, maxAvailLevel, upgCost, upgDuration, upgCostQuarter, upgDurationQuarter, upgCostBranch, upgDurationBranch, hqUpgradeBlocker, barracksUpgradeBlocker, trainingUpgradeBlocker, cmdCommand, trainRate, CMD_SIZE, maxTrainBatch, trainingQueueCount, quarterMaxLevel, branchMaxLevel, BRANCH_UNLOCK_Q, tierFromBranchLevel, storageMax, rssRate, marketplaceRate, voidTapCapacity, voidTapCooldownMs, voidTapYield, fmtCooldown, crewHallStats, crewHelpAmount, hqSiegeHP, wallsSiegeHP, SHAKY_ALLIANCE_BONUS } from "../../../shared/constants/buildings.js";
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

const QUARTER_UPGRADE_COST = (lvl) => upgCostQuarter(lvl) || { stone:0, wood:0, gas:0 };
const BRANCH_UPGRADE_COST  = (lvl) => upgCostBranch(lvl)  || { stone:0, wood:0, gas:0 };
// Quarter level shown/used: the stored level. Your own faction's quarter starts unlocked (Lv1);
// the others start locked (Lv0) and need a timed unlock. Older saves never stored the other
// quarters — treat one as Lv1 if one of its branches was already built.
function effQuarterLvl(fKey, slot, quarterLevels, bldgs) {
  const st = (quarterLevels || {})[fKey];
  if (st != null) return st;
  if (slot === 0) return 1;
  return Object.keys(bldgs || {}).some(k => k.startsWith(`b_${fKey}_`) && bldgs[k] > 0) ? 1 : 0;
}
const fmtDurMs = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ""}`;
  return `${Math.floor(s / 3600)}h${s % 3600 >= 60 ? ` ${Math.floor((s % 3600) / 60)}m` : ""}`;
};

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
return (
<div style={{ textAlign:"right" }}>
<div style={{ fontSize:8, color:P.gold, fontFamily:P.ff, marginBottom:2 }}>
⚙ {fmtDurMs(secsLeft * 1000)}
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

function BuildingDetail({ bKey, bldgs, rss, canAfford, upgrade, upgQueue, quarterLevel }) {
const def   = BLDG[bKey]; if (!def) return null;
const lvl   = bldgs[bKey]||0;
const avail = maxAvailLevel(bKey, bldgs.hq||1);
const isAbsMax = lvl >= def.max;
const isGated  = !isAbsMax && lvl >= avail;

// Reverse gate blocker (only for buildings that have one)
let reverseBlocker = null;
if (!isAbsMax && !isGated) {
  const targetLvl = lvl + 1;
  if (bKey === "hq") {
    reverseBlocker = hqUpgradeBlocker(targetLvl, {
      barracks: bldgs.barracks||0,
      training: bldgs.training||0,
      commandcenter: bldgs.commandcenter||0,
      q1Lvl: quarterLevel ?? 1, // player's own faction quarter (bldgs.quarters never existed)
    });
  } else if (bKey === "barracks") {
    reverseBlocker = barracksUpgradeBlocker(targetLvl, { training: bldgs.training||0 });
  } else if (bKey === "training") {
    reverseBlocker = trainingUpgradeBlocker(targetLvl, { barracks: bldgs.barracks||0, commandcenter: bldgs.commandcenter||0 });
  }
}

const cost     = (!isAbsMax && !isGated && !reverseBlocker) ? upgCost(bKey, lvl) : null;
const ok       = cost && canAfford(cost);
const inProg   = upgQueue[bKey];
const nd       = cost ? upgDuration(bKey, lvl+1) : 0;


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
{bKey==="hq"          && <div style={{ fontSize:10, color:"#aa8040", marginBottom:12 }}>Siege HP: {(hqSiegeHP(lvl) + wallsSiegeHP(bldgs.walls||0)).toLocaleString()}</div>}
{bKey==="barracks"    && <div style={{ fontSize:10, color:"#6a8aaa", marginBottom:12 }}>Barracks space: {barracksCommandCapacity(lvl).toLocaleString()} commands → <span style={{color:"#aac4d8"}}>{barracksCommandCapacity(Math.min(lvl+1,20)).toLocaleString()}</span> <span style={{color:"#5a7a8a"}}>(100 small / 50 medium / 4 large troops per command)</span></div>}
{bKey==="marketplace" && <div style={{ fontSize:10, color:"#aa7a40", marginBottom:12 }}>Trade rate: {Math.round(marketplaceRate(lvl)*100)}% → <span style={{color:"#c8a060"}}>{Math.round(marketplaceRate(Math.min(lvl+1,5))*100)}%</span> at Lv{Math.min(lvl+1,5)}</div>}
{bKey==="training"    && <div style={{ fontSize:10, color:"#8aaa6a", marginBottom:12 }}>Queues: {trainingQueueCount(lvl)} → <span style={{color:"#aad48a"}}>{trainingQueueCount(Math.min(lvl+1,20))}</span> at Lv{Math.min(lvl+1,20)}</div>}
{bKey==="storage"     && <div style={{ fontSize:10, color:"#6aaa8a", marginBottom:12 }}>Max Resources: {storageMax(lvl).toLocaleString()} → <span style={{color:"#aad4b8"}}>{storageMax(Math.min(lvl+1,20)).toLocaleString()}</span> at Lv{Math.min(lvl+1,20)}</div>}
{bKey==="crewhall"    && lvl > 0 && (() => { const s = crewHallStats(lvl); return <div style={{ fontSize:10, color:"#7aaad8", marginBottom:12 }}>Helps/queue: {s.maxHelps} · Per help: max({(s.pct*100).toFixed(1)}%, {Math.round(s.flatMs/60000)}min)</div>; })()}
{bKey==="shakyalliance" && lvl > 0 && <div style={{ fontSize:10, color:"#aa70cc", marginBottom:12 }}>+{SHAKY_ALLIANCE_BONUS.command} Command · +{SHAKY_ALLIANCE_BONUS.hiringQueues} Hiring Queue</div>}
{isGated && <div style={{ fontSize:9, color:"#8a6020", fontFamily:P.ffb, fontStyle:"italic", marginBottom:12 }}>🔒 Upgrade HQ to Lv{avail+1} to unlock next level</div>}
{reverseBlocker && <div style={{ fontSize:9, color:"#cc6020", fontFamily:P.ffb, fontStyle:"italic", marginBottom:12 }}>🔒 {reverseBlocker}</div>}
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
⏱ {fmtDurMs(nd)}
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
  function TroopStatModal({ troop, fColor, fDef, fKey, onClose, troopSkillLevels, setTroopSkillLevels, mysticOrbs, setMysticOrbs }) {
  const { branch, tierIdx, tier, isLocked, branchOpen } = troop;
  const cmdCost = COMMAND_COST[branch.size] ?? 1;
  const dmgColor = branch.dmgType === "magical" ? "#a855f7" : "#e08050";
  const roman = ["I","II","III"];
  const skills = getTierSkills(branch, tierIdx);
  const conscriptCost = { wood:1, gas:1, food:2 };
  const conscriptBase = [30, 60, 120][tierIdx];
  const TRIGGER_LABEL = {
  round_start: "Round Start", on_hit: "On Hit",
  on_hit_received: "On Hit Taken", on_kill: "On Kill", passive: "Passive",
  };
  const RSS_COL = { stone:["🪨","#aaaaaa"], wood:["🪵","#c8903a"], gas:  ["⚗","#4a90c0"],  food: ["🌾","#80b040"] };
  const portraitSrc = troopVisualPath(fKey, branch.key, tierIdx);
  const [portraitErr, setPortraitErr] = useState(false);
  return (
  <div style={{ position:"fixed", inset:0, zIndex:9999,
  background:"linear-gradient(135deg,#08060e 0%,#0c0a12 50%,#06080e 100%)",
  display:"flex", flexDirection:"column", overflow:"hidden" }}>

  {/* Top bar */}
  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
  paddingTop:"calc(var(--sat) + 10px)",
  background:"rgba(0,0,0,.5)", borderBottom:`1px solid ${fColor}33`, flexShrink:0 }}>
  <button onClick={onClose}
  style={{ padding:"8px 16px", borderRadius:4, background:`${fColor}22`,
  border:`1px solid ${fColor}88`, color:fColor, fontSize:13,
  fontFamily:P.ff, letterSpacing:".05em", fontWeight:700,
  cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>← Back to Quarters</button>
  <div style={{ fontFamily:P.ff, fontWeight:700, fontSize:13, color:P.text }}>
  {tier.label}
  </div>
  <div style={{ fontSize:8, color:dmgColor, fontFamily:P.ff, marginTop:1 }}>
  {branch.label} · {branch.size} · {branch.dmgType}
  </div>
  {isLocked && (
  <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5,
  background: branchOpen ? "rgba(200,60,40,.15)" : "rgba(160,100,40,.15)",
  border:`1px solid ${branchOpen ? "#cc404066" : "#a8643366"}`,
  borderRadius:6, padding:"3px 8px" }}>
  <span style={{fontSize:11}}>🔒</span>
  <span style={{ fontSize:7, color: branchOpen ? "#cc6040" : "#c09040", fontFamily:P.ff, fontWeight:700 }}>
  {branchOpen ? "UPGRADE TO UNLOCK" : "ASSIGN BRANCH FIRST"}
  </span>
  </div>
  )}
  </div>

  {/* Body: left portrait panel + right info */}
  <div onClick={e => e.stopPropagation()}
  style={{ flex:1, display:"flex", minHeight:0, overflow:"hidden" }}>

  {/* ── LEFT: troop portrait ── */}
  <div style={{ width:"38%", flexShrink:0, position:"relative", overflow:"hidden",
  background:`radial-gradient(ellipse at 50% 40%, ${fColor}18 0%, transparent 70%)`,
  borderRight:`1px solid ${fColor}22`,
  filter: isLocked ? "grayscale(0.7) brightness(0.5)" : "none" }}>

  {/* Portrait image — full height, top-anchored */}
  {portraitSrc && !portraitErr ? (
    <img
      src={portraitSrc}
      alt={tier.label}
      onError={() => setPortraitErr(true)}
      style={{ position:"absolute", inset:0, width:"100%", height:"100%",
        objectFit:"cover", objectPosition:"top center", opacity:.92 }}
    />
  ) : (
    /* Fallback: faction emoji box */
    <div style={{ position:"absolute", inset:0,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:110, height:110, borderRadius:16,
        background:`radial-gradient(135deg, ${fColor}22, ${fColor}08)`,
        border:`2px solid ${fColor}55`,
        display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column",
        boxShadow:`0 0 40px ${fColor}22` }}>
        <div style={{ fontSize:52, lineHeight:1 }}>{fDef.s}</div>
        <div style={{ fontFamily:P.ff, fontSize:13, fontWeight:700, color:fColor, marginTop:4 }}>{branch.capstone ? "★" : roman[tierIdx]}</div>
      </div>
    </div>
  )}

  {/* Dark gradient overlay at bottom for info badges */}
  <div style={{ position:"absolute", bottom:0, left:0, right:0,
    background:"linear-gradient(to top, rgba(4,2,8,.97) 0%, rgba(4,2,8,.6) 40%, transparent 100%)",
    padding:"32px 8px 10px", display:"flex", flexDirection:"column",
    alignItems:"center", gap:5 }}>

    {/* Tier roman numeral + branch name */}
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <div style={{ fontFamily:P.ff, fontSize:11, fontWeight:700, color:fColor,
        background:`${fColor}22`, border:`1px solid ${fColor}55`,
        borderRadius:4, padding:"1px 7px" }}>{branch.capstone ? "★" : roman[tierIdx]}</div>
      <div style={{ fontFamily:P.ff, fontSize:8, fontWeight:700, color:fColor,
        letterSpacing:".06em" }}>{fDef.quarters ?? fDef.n}</div>
    </div>

    {/* Size / damage type */}
    <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, textAlign:"center", lineHeight:1.5 }}>
      {branch.size} unit · {branch.dmgType} dmg
    </div>

    {/* Unlock note */}
    <div style={{ fontSize:7, color:`${fColor}88`, fontFamily:P.ff, textAlign:"center",
      background:`${fColor}0a`, border:`1px solid ${fColor}22`, borderRadius:5,
      padding:"3px 8px", lineHeight:1.5 }}>
      Unlocked at branch Lv{tierIdx*2+1}
    </div>
  </div>

  {/* Faction icon badge top-left */}
  <div style={{ position:"absolute", top:8, left:8,
    fontSize:14, lineHeight:1,
    background:"rgba(0,0,0,.55)", borderRadius:6,
    padding:"3px 5px", backdropFilter:"blur(2px)" }}>
    {fDef.s}
  </div>
  </div>

  {/* ── RIGHT: stats, skills, conscription ── */}
  <div style={{ flex:1, overflow:"hidden", padding:"8px 10px",
  display:"flex", flexDirection:"column", gap:5 }}>

  {/* Stat grid */}
  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:3, flexShrink:0 }}>
  {[
  { lbl:"DMG", val:`${tier.dmgLo}–${tier.dmgHi}`, col:dmgColor,  icon:"⚔️" },
  { lbl:"DEF", val:tier.def,                        col:"#88aaff", icon:"🛡" },
  { lbl:"HP",  val:tier.hp,                         col:"#5dcc80", icon:"❤️" },
  { lbl:"SPD", val:tier.spd,                        col:"#f0c040", icon:"🚶" },
  ].map(({ lbl, val, col, icon }) => (
  <div key={lbl} style={{ padding:"5px 8px", borderRadius:6,
  background:"rgba(255,255,255,.03)", border:`1px solid ${P.border}` }}>
  <div style={{ fontSize:6, color:P.dim, fontFamily:P.ff, letterSpacing:".06em", marginBottom:1 }}>{icon} {lbl}</div>
  <div style={{ fontSize:13, fontWeight:700, color:col, fontFamily:P.ff }}>{val}</div>
  </div>
  ))}
  </div>

  {/* Skills */}
  {skills.length > 0 && (
  <div style={{ flexShrink:0 }}>
  <div style={{ fontSize:6, color:P.dim, fontFamily:P.ff, letterSpacing:".1em", marginBottom:3, textTransform:"uppercase" }}>Skills</div>
  {skills.map(skill => {
  const skillLvl = troopSkillLevels?.[skill.key] ?? 1;
  const isMax = skillLvl >= 10;
  const orbCost = skillOrbCost(skillLvl);
  const canUpgrade = !isMax && (mysticOrbs ?? 0) >= orbCost;
  const currentProc = Math.round(skillProcAtLevel(skill, skillLvl) * 100);
  const nextProc = !isMax ? Math.round(skillProcAtLevel(skill, skillLvl + 1) * 100) : null;
  return (
  <div key={skill.key} style={{ padding:"5px 8px", background:"rgba(255,255,255,.02)",
  border:`1px solid ${isMax ? fColor+"55" : P.border}`, borderRadius:6, marginBottom:3 }}>
  <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
  <span style={{ fontSize:14, lineHeight:1 }}>{skill.icon}</span>
  <div style={{ flex:1 }}>
  <div style={{ fontFamily:P.ff, fontSize:9, fontWeight:700, color:fColor }}>{skill.name}</div>
  <div style={{ fontSize:6, color:"#88aaff", fontFamily:P.ff }}>
  {TRIGGER_LABEL[skill.trigger] || skill.trigger} · {currentProc}%{nextProc !== null && <span style={{color:`${fColor}99`}}> → {nextProc}%</span>}
  </div>
  </div>
  <div style={{ fontFamily:P.ff, fontSize:8, fontWeight:700,
  color: isMax ? fColor : P.sub,
  background: isMax ? `${fColor}22` : "rgba(255,255,255,.04)",
  border:`1px solid ${isMax ? fColor+"55" : P.border}`,
  borderRadius:4, padding:"2px 5px" }}>
  {isMax ? "MAX" : `Lv${skillLvl}`}
  </div>
  </div>
  <div style={{ display:"flex", gap:2, marginBottom:3 }}>
  {Array.from({length:10}).map((_,i) => (
  <div key={i} style={{ flex:1, height:2, borderRadius:2, minWidth:3,
  background: i < skillLvl ? fColor : `${fColor}22` }}/>
  ))}
  </div>
  <div style={{ fontSize:7, color:P.sub, fontFamily:P.ffb, lineHeight:1.5, marginBottom: isMax ? 0 : 3 }}>{skill.desc}</div>
  {!isMax && (
  <div style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 6px",
  background:"rgba(0,0,0,.2)", border:`1px solid ${P.border}`, borderRadius:5 }}>
  <div style={{ flex:1, display:"flex", alignItems:"center", gap:4 }}>
  <span style={{fontSize:11}}>🔮</span>
  <span style={{ fontFamily:P.ff, fontSize:9, fontWeight:700, color: canUpgrade ? "#cc88ff" : "#5a3a7a" }}>{orbCost.toLocaleString()}</span>
  <span style={{ fontSize:6, color:P.dim }}>orbs · Have: <span style={{color: canUpgrade ? "#cc88ff" : "#5a3a7a"}}>{(mysticOrbs??0).toLocaleString()}</span></span>
  </div>
  <button disabled={!canUpgrade}
  onClick={() => { if (!canUpgrade) return; setTroopSkillLevels(prev => ({ ...prev, [skill.key]: (prev[skill.key] ?? 1) + 1 })); setMysticOrbs(prev => prev - orbCost); }}
  style={{ padding:"3px 8px", borderRadius:4, fontFamily:P.ff, fontSize:8, fontWeight:700,
  background: canUpgrade ? "linear-gradient(135deg,#9933cc44,#6611aa22)" : "rgba(255,255,255,.02)",
  border:`1px solid ${canUpgrade ? "#aa55ee" : "#2a1a3a"}`,
  color: canUpgrade ? "#cc88ff" : "#3a2a4a", cursor: canUpgrade ? "pointer" : "default" }}>
  ↑ Lv{skillLvl + 1}
  </button>
  </div>
  )}
  </div>
  );
  })}
  </div>
  )}

  {/* Conscription */}
  <div style={{ flexShrink:0, background:"rgba(255,255,255,.02)", border:`1px solid ${P.border}`, borderRadius:6, padding:"5px 8px" }}>
  <div style={{ fontSize:6, color:P.dim, fontFamily:P.ff, letterSpacing:".1em", marginBottom:4, textTransform:"uppercase" }}>Conscription</div>
  <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginBottom:4 }}>
  {Object.entries(conscriptCost).map(([k, v]) => {
  const [icon, col] = RSS_COL[k] || ["", P.sub];
  return (
  <div key={k} style={{ display:"flex", alignItems:"center", gap:2,
  background:"rgba(255,255,255,.03)", border:`1px solid ${P.border}`, borderRadius:4, padding:"2px 5px" }}>
  <span style={{fontSize:10}}>{icon}</span>
  <span style={{ fontSize:8, fontFamily:P.ff, color:col, fontWeight:700 }}>{v}</span>
  </div>
  );
  })}
  </div>
  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
  <div style={{ display:"flex", alignItems:"center", gap:3 }}>
  <span style={{fontSize:8}}>⏱</span>
  <span style={{ fontSize:8, fontFamily:P.ff, color:"#e8a840", fontWeight:700 }}>{conscriptBase}s / unit</span>
  <span style={{ fontSize:6, color:P.dim }}>(base)</span>
  </div>
  <div style={{ display:"flex", alignItems:"center", gap:3 }}>
  <span style={{fontSize:8}}>⭐</span>
  <span style={{ fontSize:8, fontFamily:P.ff, color:P.sub, fontWeight:700 }}>{cmdCost} CMD / unit</span>
  </div>
  </div>
  </div>

  </div>{/* end right panel */}
  </div>{/* end body */}
  </div>
  );
  }

  function QuarterDetail({ fKey, fDef, slot, bldgs, rss, canAfford, quarterLevels, upgrade, upgQueue, troopSkillLevels, setTroopSkillLevels, mysticOrbs, setMysticOrbs }) {
  const [selTroop, setSelTroop] = useState(null); // { branch, tierIdx, tier }
  const [, setTick] = useState(0); // countdowns for queued quarter/branch upgrades
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);
  const hqLvl   = bldgs.hq || 1;
  const qCeil   = quarterMaxLevel(slot, hqLvl);
  const qLvl    = effQuarterLvl(fKey, slot, quarterLevels, bldgs);
  const qKey    = `q_${fKey}`;
  const qBusy   = (upgQueue || {})[qKey];
  const qCost   = QUARTER_UPGRADE_COST(qLvl);
  const atCeil  = qLvl >= qCeil;
  const atMax   = qLvl >= 10;
  const canUpg  = !qBusy && !atMax && !atCeil && canAfford(qCost);

  // Quarter and branch upgrades are timed (upgrade queue); unlocking a quarter (Lv0→1)
  // or a branch (Lv0→1) is the first timed step.
  const upgradeQuarter = () => { if (canUpg) upgrade(qKey, { lvl: qLvl, ceil: Math.min(10, qCeil) }); };
  const upgradeBranch = (branchKey, branchIdx) => {
  const bKey  = `b_${fKey}_${branchKey}`;
  const bLvl  = bldgs[bKey] || 0;
  const bCeil = branchMaxLevel(branchIdx, qLvl);
  if (bLvl >= bCeil || (upgQueue || {})[bKey]) return;
  if (!canAfford(BRANCH_UPGRADE_COST(bLvl))) return;
  upgrade(bKey, { lvl: bLvl, ceil: bCeil });
  };

  const roman = ["I","II","III"];

  return (
  <div style={{ position:"relative", overflowY:"auto", height:"100%", padding:"14px 16px" }}>

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
  ) : qBusy ? (
  <div style={{ textAlign:"center" }}>
  <div style={{ fontSize:9, color:P.gold, fontFamily:P.ff, fontWeight:700 }}>⚙ Lv{qBusy.newLvl}</div>
  <div style={{ fontSize:8, color:P.sub }}>{fmtDurMs(qBusy.endsAt - Date.now())}</div>
  </div>
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
  {qLvl === 0 ? "UNLOCK" : `^ Lv${qLvl+1}`}
  </button>
  <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
  {Object.entries(qCost).filter(([,v])=>v>0).map(([k,v]) => (
  <RssPill key={k} rssKey={k} amount={v} rss={rss} small />
  ))}
  <div style={{ fontSize:7, color:"#88aacc", fontFamily:P.ff }}>⏱ {fmtDurMs(upgDurationQuarter(qLvl+1))}</div>
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
  const bLvl       = branchOpen ? (bldgs[bKey] || 0) : 0; // Lv0 = open but not unlocked yet (timed unlock)
  const bCeil      = branchMaxLevel(branchIdx, qLvl);
  const atBCeil    = bLvl >= bCeil;
  const atBMax     = bLvl >= 6;
  const bCost      = BRANCH_UPGRADE_COST(bLvl);
  const bBusy      = (upgQueue || {})[bKey];
  const bOk        = branchOpen && !bBusy && !atBMax && !atBCeil && canAfford(bCost);
  const unlockedTier = tierFromBranchLevel(bLvl);
  const dmgColor   = br.dmgType === "magical" ? "#a855f7" : "#e08050";

  return (
  <div key={br.key} style={{ display:"flex", gap:8, marginBottom:12, alignItems:"flex-start" }}>

  {/* LEFT: branch upgrade card */}
  <div style={{ width:110, flexShrink:0, borderRadius:8, overflow:"hidden",
  border:`1px solid ${branchOpen ? fDef.c+"55" : P.border}`,
  background: branchOpen ? `${fDef.c}0d` : "rgba(255,255,255,.01)",
  display:"flex", flexDirection:"column", position:"relative",
  opacity: branchOpen ? 1 : 0.55 }}>
  {/* lock overlay — pointer-events:none so troop cards behind it remain clickable */}
  {!branchOpen && (
  <div style={{ position:"absolute", inset:0, zIndex:3, pointerEvents:"none",
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
  ) : bBusy ? (
  <div style={{ textAlign:"center" }}>
  <div style={{ fontSize:8, color:P.gold, fontFamily:P.ff, fontWeight:700 }}>⚙ Lv{bBusy.newLvl}</div>
  <div style={{ fontSize:7, color:P.sub }}>{fmtDurMs(bBusy.endsAt - Date.now())}</div>
  </div>
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
  {bLvl === 0 ? "UNLOCK" : bOk ? `^ Lv${bLvl+1}` : "^"}
  </button>
  <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
  {Object.entries(bCost).filter(([,v])=>v>0).map(([k,v]) => (
  <RssPill key={k} rssKey={k} amount={v} rss={rss} small />
  ))}
  <div style={{ fontSize:7, color:"#88aacc", fontFamily:P.ff }}>⏱ {fmtDurMs(upgDurationBranch(bLvl+1))}</div>
  </div>
  </>
  )}
  </div>
  )}
  </div>

  {/* RIGHT: 3 troop tier cards */}
  <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-start", gap:6 }}>
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
  onClick={() => setSelTroop({ branch: br, tierIdx: idx, tier, fColor: fDef.c, fDef, isLocked: !canView, branchOpen })}
  style={{ flex:1, minHeight:160, padding:0, position:"relative", zIndex:1,
  borderRadius:8, cursor: "pointer",
  background: tierUnlocked ? `${fDef.c}15` : "rgba(255,255,255,.02)",
  border:`1px solid ${tierUnlocked ? fDef.c+"55" : P.border}`,
  overflow:"hidden",
  opacity: !branchOpen ? 0.35 : !tierUnlocked ? 0.5 : 1,
  transition:"all .15s",
  boxShadow: canView ? `0 2px 8px ${fDef.c}22` : "none" }}>
  {/* Portrait image background */}
  {(() => {
    const psrc = troopVisualPath(fKey, br.key, idx);
    return psrc ? (
      <img src={psrc} alt={tier.label}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%",
          objectFit:"cover", objectPosition:"top center",
          opacity: tierUnlocked ? 0.85 : 0.3,
          filter: tierUnlocked ? "none" : "grayscale(1) brightness(.4)" }} />
    ) : (
      /* Fallback emoji */
      <div style={{ position:"absolute", inset:0,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:20, filter: tierUnlocked ? "none" : "grayscale(1) brightness(.35)" }}>
          {fDef.s}
        </div>
      </div>
    );
  })()}
  {/* Dark gradient overlay — bottom info */}
  <div style={{ position:"absolute", inset:0,
    background:"linear-gradient(to top, rgba(4,2,8,.97) 0%, rgba(4,2,8,.6) 45%, transparent 100%)",
    display:"flex", flexDirection:"column", alignItems:"center",
    justifyContent:"flex-end", padding:"6px 4px", gap:2 }}>
  {/* tier roman numeral badge — top absolute */}
  <div style={{ position:"absolute", top:5, left:0, right:0,
    display:"flex", justifyContent:"center" }}>
    <div style={{ fontSize:7, fontFamily:P.ff, fontWeight:700,
      color: tierUnlocked ? fDef.c : "#3a3028",
      background: tierUnlocked ? `${fDef.c}44` : "rgba(0,0,0,.5)",
      padding:"1px 5px", borderRadius:3, backdropFilter:"blur(2px)" }}>{br.capstone ? "★" : roman[idx]}</div>
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
  <div style={{ fontSize:5, color: tierUnlocked ? `${fDef.c}88` : "#4a3a28", fontFamily:P.ff,
  letterSpacing:".06em", marginTop:1 }}>TAP FOR INFO</div>
  </div>
  </button>
  );
  })}
  </div>
  </div>

  </div>
  );
  })}

  {/* Troop stat modal */}
  {selTroop && createPortal(
  <TroopStatModal
  troop={selTroop}
  fColor={selTroop.fColor}
  fDef={selTroop.fDef}
  fKey={fKey}
  onClose={() => setSelTroop(null)}
  troopSkillLevels={troopSkillLevels}
  setTroopSkillLevels={setTroopSkillLevels}
  mysticOrbs={mysticOrbs}
  setMysticOrbs={setMysticOrbs}
  />, document.body
  )}

  </div>
  );
  }

  
const FACTION_META = {
pirates:       { n:"Pirates",               s:"🏴", c:"#d4832a" },
wizards:       { n:"Wizards",               s:"🔮", c:"#9955dd" },
orcs:          { n:"Orcs",                  s:"⚔️",  c:"#6aa830" },
dragons:       { n:"Dragons",               s:"🐉",  c:"#cc3030" },
holyknights:   { n:"Holy Knights",          s:"✝️",  c:"#d4af37" },
nightcreatures:{ n:"Creatures of the Night",s:"🌑",  c:"#a030c0" },
coldborns:     { n:"Coldborns",             s:"❄️",  c:"#60b8d4" },
ashen_dead:    { n:"Ashen Dead",            s:"💀",  c:"#6a6a8a" },
};
// Standing troop sprites. The long-term plan is every branch of every
// faction gets one of these (transparent, full-body, feet on a shared
// baseline) in place of the painted portrait card. They're being rolled out
// incrementally, so STANDING_SPRITES only lists what actually has art today;
// troopVisualPath() below falls back to the existing portrait resolver for
// everything else, branch by branch. T1/T2/T3 map to tierIdx 0/1/2; a
// capstone is a single tier and always keyed under 0.
// Files: RGBA WebP in public/troops/<faction>_<branch>_t<N>_standing.webp,
// 512x1024 (768x1024 for wide poses so they fill the same height as the
// tall humanoid ones). Contain-fit at render time, so either width works.
const STANDING_SPRITES = {
  pirates: {
    swashbucklers: {
      0: "/troops/pirates_swashbucklers_t1_standing.webp",
      1: "/troops/pirates_swashbucklers_t2_standing.webp",
      2: "/troops/pirates_swashbucklers_t3_standing.webp",
    },
    gunners: {
      0: "/troops/pirates_gunners_t1_standing.webp",
      1: "/troops/pirates_gunners_t2_standing.webp",
      2: "/troops/pirates_gunners_t3_standing.webp",
    },
    sea_beasts: {
      0: "/troops/pirates_sea_beasts_t1_standing.webp",
      1: "/troops/pirates_sea_beasts_t2_standing.webp",
      2: "/troops/pirates_sea_beasts_t3_standing.webp",
    },
    leviathan: { 0: "/troops/pirates_leviathan_t1_standing.webp" }, // capstone
  },
  // Capstones only for now (T1-T3 still use the painted portraits until
  // those sprites are made) - Orcs, Dragons, Holy Knights,
  // Creatures of the Night, Coldborns, Ashen Dead.
  wizards: {
    acolytes: {
      0: "/troops/wizards_acolytes_t1_standing.webp",
      1: "/troops/wizards_acolytes_t2_standing.webp",
      2: "/troops/wizards_acolytes_t3_standing.webp",
    },
    golems: {
      0: "/troops/wizards_golems_t1_standing.webp",
      1: "/troops/wizards_golems_t2_standing.webp",
      2: "/troops/wizards_golems_t3_standing.webp",
    },
    spellblades: {
      0: "/troops/wizards_spellblades_t1_standing.webp",
      1: "/troops/wizards_spellblades_t2_standing.webp",
      2: "/troops/wizards_spellblades_t3_standing.webp",
    },
    hexblade_sovereign: { 0: "/troops/wizards_hexblade_sovereign_t1_standing.webp" }, // capstone
  },
  orcs:           { doomfang_alpha:      { 0: "/troops/orcs_doomfang_alpha_t1_standing.webp" } },
  dragons:        { sovereign_wyrm:      { 0: "/troops/dragons_sovereign_wyrm_t1_standing.webp" } },
  holyknights:    { seraph_vanguard:     { 0: "/troops/holyknights_seraph_vanguard_t1_standing.webp" } },
  nightcreatures: { crimson_progenitor:  { 0: "/troops/nightcreatures_crimson_progenitor_t1_standing.webp" } },
  coldborns:      { glacial_warlord:     { 0: "/troops/coldborns_glacial_warlord_t1_standing.webp" } },
  ashen_dead:     { deathless_harbinger: { 0: "/troops/ashen_dead_deathless_harbinger_t1_standing.webp" } },
};

function troopVisualPath(fKey, branchKey, tierIdx = 0) {
  const sprite = STANDING_SPRITES[fKey]?.[branchKey]?.[tierIdx];
  if (sprite) return sprite;
  return troopPortraitPath(fKey, branchKey, tierIdx);
}

const ALIGN_FACTIONS = {
humans:   ["pirates","wizards","holyknights","coldborns"],
creatures:["orcs","dragons","nightcreatures","ashen_dead"],
};
function getAlignment(fk) {
return ALIGN_FACTIONS.humans.includes(fk) ? "humans" : "creatures";
}

function InfrastructureScreen({ bldgs, setBldgs, rss, setRss, canAfford, upgrade, upgQueue, cmds, facKey, quarterLevels, setQuarterLevels, setUnlockedBranches, troopSkillLevels, setTroopSkillLevels, mysticOrbs, setMysticOrbs }) {
const [leftSel, setLeftSel]     = useState("buildings");
const [selBuilding, setSelBuilding] = useState(null);

const BLDG_KEYS = ["hq","walls","quarry","lumber","forge","refinery","storage","barracks","training","commandcenter","healingtent","voidtap","marketplace","crewhall","shakyalliance"];

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
const curLvl = effQuarterLvl(fKey, i, quarterLevels, bldgs);
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
const fDef        = quarterFKey ? { ...TROOP_FACTIONS[quarterFKey], ...FACTION_META[quarterFKey] } : null;

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
          onClick={() => { setLeftSel(item.id); setSelBuilding(null); }}
          disabled={false}
          style={{ width:60, display:"flex", flexDirection:"column", alignItems:"center",
            gap:3, padding:"10px 4px", borderRadius:8, cursor:"pointer",
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
          canAfford={canAfford} upgrade={upgrade} upgQueue={upgQueue} quarterLevel={quarterLevels?.[primaryFaction]} />
      </div>
    )}

    {/* Faction quarter */}
    {!isBuildings && !isUnknown && quarterFKey && fDef && (() => {
      const navItem = LEFT_NAV.find(n => n.id === leftSel);
      return (
        <QuarterDetail
          fKey={quarterFKey} fDef={fDef}
          slot={navItem?.slot ?? 0}
          bldgs={bldgs}
          rss={rss} canAfford={canAfford}
          quarterLevels={quarterLevels}
          upgrade={upgrade} upgQueue={upgQueue}
          troopSkillLevels={troopSkillLevels} setTroopSkillLevels={setTroopSkillLevels}
          mysticOrbs={mysticOrbs} setMysticOrbs={setMysticOrbs} />
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
const rssToBuilding = { stone:"quarry", wood:"lumber", gas: "forge", food: "refinery" };
const totalTroops   = cmds.filter(c=>c.owner==="player").reduce((s,c)=>s+(c.troopSlots?.length>0?c.troopSlots.reduce((a,sl)=>a+(sl.troops||0),0):(c.troops||0)),0);
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
const tileProd = [...(pKeys||[])].filter(pk => { const t = tiles[pk]; return t?.rss===k; }).length * 60;
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
//  TROOPS (Training) — two-screen flow
// -----------------------------------------------------------------------------

// ── Size tag badge ─────────────────────────────────────────────────────────────
function TroopSizeTag({ size }) {
  const colors = { small:"#4488cc", medium:"#c8903a", large:"#cc4444" };
  const c = colors[size] || "#888";
  return (
    <span style={{ fontSize:6.5, padding:"1px 5px", borderRadius:3,
      background:`${c}22`, border:`1px solid ${c}55`, color:c,
      fontFamily:P.ff, letterSpacing:".05em", textTransform:"uppercase" }}>
      {size}
    </span>
  );
}

// ── Barracks bar (space is counted in COMMANDS, not troops) ────────────────────
const fmtCmd = n => (+Number(n || 0).toFixed(1)).toLocaleString();
function BarracksBar({ bldgs, troopCounts, trainingQueues }) {
  const cap    = barracksCommandCapacity(bldgs.barracks||0);
  const used   = poolCommands(troopCounts);
  const queued = queuedCommands(trainingQueues);
  const usedPct   = Math.min(100, (used / cap) * 100);
  const queuedPct = Math.min(100 - usedPct, (queued / cap) * 100);
  const full = used + queued >= cap - 1e-9;
  const col  = full ? "#cc4444" : usedPct > 80 ? "#d0a030" : "#3daa60";
  return (
    <div style={{ padding:"6px 10px", background:"rgba(255,255,255,.03)",
      border:`1px solid ${P.border}`, borderRadius:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4, gap:8 }}>
        <div style={{ fontFamily:P.ff, fontSize:9, color:"#c8a060", fontWeight:700 }}>
          🏕 Barracks Lv{bldgs.barracks||0}
        </div>
        <div style={{ fontFamily:P.ff, fontSize:11, color:col, fontWeight:700 }}>
          {fmtCmd(used)} / {cap.toLocaleString()} <span style={{ fontSize:7, color:P.dim, fontWeight:400 }}>commands</span>
        </div>
      </div>
      <div style={{ height:5, background:"#181820", borderRadius:3, overflow:"hidden", display:"flex" }}>
        <div style={{ width:`${usedPct}%`, background:col, transition:"width .3s" }}/>
        <div style={{ width:`${queuedPct}%`, background:"#3366cc", transition:"width .3s" }}/>
      </div>
      <div style={{ fontSize:7, color:P.dim, marginTop:3, fontFamily:P.ff }}>
        {fmtCmd(Math.max(0, cap - used - queued))} free
        {queued > 0 && <span style={{ color:"#6a8aaa" }}> · {fmtCmd(queued)} reserved by training</span>}
      </div>
    </div>
  );
}

// ── Build troop card list (shared by both screens) ─────────────────────────────
function useTroopCards({ unlockedBranches, troopCounts, cmds }) {
  const ub = unlockedBranches || {};
  return useMemo(() => {
    const cards = [];
    Object.entries(TROOP_FACTIONS).forEach(([fKey, fDef]) => {
      fDef.branches.forEach(branch => {
        const ubKey = `${fKey}:${branch.key}`;
        if (!(ubKey in ub)) return;
        const maxTier = ub[ubKey];
        for (let tierIdx = 0; tierIdx <= maxTier; tierIdx++) {
          const tier = branch.tiers[tierIdx];
          if (!tier) continue;
          const bKey = `${fKey}:${branch.key}:${tierIdx}`;
          const fColor = FACTION_META[fKey]?.c || "#888";
          const fIcon  = FACTION_META[fKey]?.s || "⚑";
          const poolCount = (troopCounts || {})[bKey] || 0;
          const assigned = (cmds||[])
            .filter(x=>x.owner==="player")
            .reduce((s,x)=>{
              if (x.troopSlots?.length>0) {
                return s + x.troopSlots
                  .filter(sl=>sl.branch?.faction===fKey && sl.branch?.branch===branch.key && (sl.branch?.tier??0)===tierIdx)
                  .reduce((a,sl)=>a+(sl.troops||0),0);
              }
              if (x.troopBranch?.faction===fKey && x.troopBranch?.branch===branch.key && (x.troopBranch?.tier??0)===tierIdx)
                return s+(x.troops||0);
              return s;
            },0);
          cards.push({ key:bKey, bKey, tier:{ ...tier, tierIdx }, branch, fColor, fIcon, poolCount, assigned, fKey });
        }
      });
    });
    // Owned troops (in barracks or on a commander) first, biggest stack first;
    // untrained tiers sink to the bottom in their original order.
    const owned = c => (c.poolCount > 0 || c.assigned > 0) ? 1 : 0;
    return cards
      .map((c, i) => ({ c, i }))
      .sort((a, b) => owned(b.c) - owned(a.c)
        || (owned(a.c) ? (b.c.poolCount + b.c.assigned) - (a.c.poolCount + a.c.assigned) : 0)
        || a.i - b.i)
      .map(x => x.c);
  }, [ub, cmds, troopCounts]);
}

// ── Compact unit card (shared by the overview and the train/scrap screen) ──────
function UnitCard({ t, selected, onClick, dim, showAssigned = true }) {
  const fc    = t.fColor || FACTION_META[t.fKey]?.c || "#888";
  const fIcon = t.fIcon || FACTION_META[t.fKey]?.s || "⚑";
  const psrc  = troopVisualPath(t.fKey, t.branch.key, t.tier.tierIdx ?? 0);
  const owned = (t.poolCount || 0) > 0;
  return (
    <button className="btn" onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 7px", minWidth:0,
        textAlign:"left", borderRadius:6, cursor:"pointer",
        background:selected ? `${fc}22` : "rgba(255,255,255,.025)",
        border:`1px solid ${selected ? fc+"99" : P.border+"88"}`,
        opacity:dim ? .6 : 1, transition:"all .12s" }}>
      <div style={{ width:44, height:44, borderRadius:5, overflow:"hidden", flexShrink:0,
        background:`${fc}18`, border:`1px solid ${fc}40`, position:"relative" }}>
        {psrc && (
          <img src={psrc} alt="" loading="lazy"
            style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"top center" }}
            onError={e => { e.currentTarget.style.display="none"; }}/>
        )}
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:13, zIndex:0, pointerEvents:"none", opacity:psrc?0:1 }}>{fIcon}</div>
        <div style={{ position:"absolute", top:0, left:0, fontSize:6.5, fontWeight:700, color:"#f0e0b0",
          background:"rgba(0,0,0,.7)", padding:"0 3px", fontFamily:P.ff }}>T{(t.tier.tierIdx ?? 0) + 1}</div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:P.ff, fontSize:9, fontWeight:700, color:selected ? P.text : P.sub,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.tier.label}</div>
        <div style={{ fontSize:7, color:fc, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {t.branch.label}
        </div>
        <div style={{ marginTop:2, display:"flex", gap:4, alignItems:"center" }}>
          <TroopSizeTag size={t.branch.size}/>
          <span style={{ fontSize:6.5, color:P.dim }}>{CMD_SIZE[t.branch.size]}/cmd</span>
        </div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontFamily:P.ff, fontSize:11, fontWeight:700, color:owned ? P.gold : P.dim }}>
          {(t.poolCount || 0).toLocaleString()}
        </div>
        <div style={{ fontSize:6.5, color:P.dim }}>in barracks</div>
        {showAssigned && (t.assigned || 0) > 0 && (
          <div style={{ fontSize:6.5, color:"#6aaa50", fontFamily:P.ff }}>{t.assigned.toLocaleString()} deployed</div>
        )}
      </div>
    </button>
  );
}

const UNIT_GRID = { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:5 };
function UnitSectionLabel({ children, right }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline",
      fontFamily:P.ff, fontSize:7.5, color:"#c8903a", fontWeight:700, letterSpacing:".16em",
      margin:"2px 2px 5px" }}>
      <span>{children}</span>{right && <span style={{ color:P.dim, fontWeight:400, letterSpacing:".04em" }}>{right}</span>}
    </div>
  );
}

// ── Screen 1: Troop overview — tap a unit to train it ──────────────────────────
function TrainingListScreen({ bldgs, troopCounts = {}, troopCards, trainingQueues, rss, onTrain, onScrap, onPick }) {
  const maxQ    = trainingQueueCount(bldgs.training||0);
  const activeQ = trainingQueues?.length || 0;
  const owned   = troopCards.filter(t => (t.poolCount || 0) > 0 || (t.assigned || 0) > 0);
  const rest    = troopCards.filter(t => !((t.poolCount || 0) > 0 || (t.assigned || 0) > 0));

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Header: title + barracks meter side by side to save height */}
      <div style={{ padding:"8px 12px", borderBottom:`1px solid ${P.border}`,
        display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <div style={{ flexShrink:0 }}>
          <div style={{ fontFamily:P.ff, fontSize:13, fontWeight:700, color:P.gold, letterSpacing:".07em" }}>⚔ TRAINING</div>
          <div style={{ fontFamily:P.ff, fontSize:7.5, color:P.dim, marginTop:1 }}>{activeQ}/{maxQ} queues active</div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <BarracksBar bldgs={bldgs} troopCounts={troopCounts} trainingQueues={trainingQueues}/>
        </div>
      </div>

      {/* Active queues as compact chips */}
      {trainingQueues && trainingQueues.length > 0 && (
        <div style={{ padding:"6px 12px 0", display:"flex", flexWrap:"wrap", gap:5, flexShrink:0 }}>
          {trainingQueues.map((q, idx) => {
            const qPct     = Math.round(((q.total - q.remaining) / q.total) * 100);
            const secsLeft = trainingSecondsLeft(q);
            const parts    = q.branchKey?.split(":") || [];
            const brDef    = TROOP_FACTIONS[parts[0]]?.branches?.find(b => b.key === parts[1]);
            const label    = brDef?.tiers?.[parseInt(parts[2]||0)]?.label || parts[1] || q.branchKey;
            return (
              <div key={q.id} style={{ flex:"1 1 150px", maxWidth:240, padding:"4px 8px",
                background:"rgba(40,80,160,.08)", border:"1px solid rgba(60,120,220,.25)", borderRadius:5 }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:6, fontFamily:P.ff, fontSize:7.5 }}>
                  <span style={{ color:"#88aaff", fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {idx+1} · {label}
                  </span>
                  <span style={{ color:"#6a8aaa", flexShrink:0 }}>+{q.remaining.toLocaleString()} · ~{secsLeft}s</span>
                </div>
                <div style={{ height:3, marginTop:3, background:"#181820", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${qPct}%`,
                    background:"linear-gradient(90deg,#3366cc,#88aaff)", transition:"width 1s" }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scrollable unit grid: what you own first, then what you could train */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px 10px", minHeight:0 }}>
        {troopCards.length === 0 && (
          <div style={{ textAlign:"center", padding:"30px 20px", fontSize:9, color:P.dim,
            fontFamily:P.ffb, fontStyle:"italic" }}>
            No troop types unlocked yet. Unlock troop branches in Quarters.
          </div>
        )}
        {owned.length > 0 && (
          <>
            <UnitSectionLabel right="tap to train more">YOUR TROOPS ({owned.length})</UnitSectionLabel>
            <div style={UNIT_GRID}>
              {owned.map(t => <UnitCard key={t.key} t={t} onClick={() => onPick(t.key)}/>)}
            </div>
          </>
        )}
        {rest.length > 0 && (
          <div style={{ marginTop: owned.length ? 12 : 0 }}>
            <UnitSectionLabel right="none trained yet">AVAILABLE TO TRAIN ({rest.length})</UnitSectionLabel>
            <div style={UNIT_GRID}>
              {rest.map(t => <UnitCard key={t.key} t={t} dim onClick={() => onPick(t.key)}/>)}
            </div>
          </div>
        )}
      </div>

      {/* Bottom action buttons */}
      <div style={{ padding:"8px 12px", borderTop:`1px solid ${P.border}`,
        display:"flex", justifyContent:"flex-end", gap:10, flexShrink:0 }}>
        <button className="btn" onClick={onScrap}
          style={{ padding:"8px 20px", fontFamily:P.ff, fontSize:10, fontWeight:700,
            letterSpacing:".06em", cursor:"pointer", borderRadius:5,
            background:"linear-gradient(135deg,#8a2020,#5a1010)",
            border:"1px solid #cc303088", color:"#ff8888" }}>
          SCRAP
        </button>
        <button className="btn" onClick={onTrain}
          style={{ padding:"8px 26px", fontFamily:P.ff, fontSize:10, fontWeight:700,
            letterSpacing:".06em", cursor:"pointer", borderRadius:5,
            background:"linear-gradient(135deg,#c8903a,#8a5a18)",
            border:"1px solid #f0c04077", color:"#fff8e8" }}>
          TRAIN
        </button>
      </div>
    </div>
  );
}

// ── Screen 2: Train / Scrap — unit list | selected unit + slider | queues ──────
function TrainingQueueScreen({ mode, bldgs, barracksPool, troopCounts = {}, troopCards, trainingQueues, setTrainingQueues, trainingSpeedMult, trainingCostMult = 1,
  neutralSources = {}, contractCommandsLeft, initialKey,
  canAfford, queueTraining, rss, discardTroops, onBack, onSwitchMode, healQueue = [] }) {

  const isScrap = mode === "scrap";
  const maxQueues = trainingQueueCount(bldgs.training||0);
  const maxBatch = maxTrainBatch(bldgs.training||0);
  const capCmds = barracksCommandCapacity(bldgs.barracks||0);
  const freeCmds = Math.max(0, capCmds - poolCommands(troopCounts) - queuedCommands(trainingQueues));
  const listCards = isScrap ? troopCards.filter(t => (t.poolCount||0) > 0) : troopCards;

  // Each troop owns its own slider. This is deliberately a two-row, horizontal
  // formation: CSS grid creates exactly two rows and auto-flow fills columns.
  const [values, setValues] = useState(() => Object.fromEntries(listCards.map(t => [t.key, 0])));
  useEffect(() => {
    setValues(prev => {
      const next = {};
      listCards.forEach(t => { next[t.key] = prev[t.key] || 0; });
      return next;
    });
  }, [listCards]);

  const setValue = (t, raw) => {
    const size = t.branch?.size || "small";
    const step = isScrap ? 1 : (CMD_SIZE[size] || 100);
    const room = troopsThatFit(t.bKey, freeCmds);
    const max = isScrap ? (t.poolCount||0) : Math.max(0, Math.floor(Math.min(maxBatch, room) / step) * step);
    const v = Math.min(max, Math.max(0, Math.floor(Number(raw || 0) / step) * step));
    setValues(prev => ({ ...prev, [t.key]: v }));
  };

  const selected = listCards.filter(t => (values[t.key] || 0) > 0);
  const selectedCommands = selected.reduce((sum,t) => sum + (values[t.key] || 0) / (CMD_SIZE[t.branch?.size] || 1), 0);
  const selectedTroops = selected.reduce((sum,t) => sum + (values[t.key] || 0), 0);
  const fmtTime = s => s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s/60)}m ${s%60}s` : `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;

  function trainSelected() {
    if (isScrap) {
      selected.forEach(t => discardTroops?.(t.bKey, values[t.key]));
      setValues({});
      return;
    }
    const availableQueues = Math.max(0, maxQueues - (trainingQueues?.length || 0));
    if (availableQueues <= 0) return;
    let used = 0;
    selected.forEach(t => {
      if (used >= availableQueues) return;
      const amount = values[t.key] || 0;
      if (!amount) return;
      const size = t.branch?.size || "small";
      const cmds = amount / (CMD_SIZE[size] || 1);
      const discount = t.branch?.capstone ? capstoneTrainDiscount(bldgs[`b_${t.fKey}_${t.branch.key}`]) : 0;
      const quote = trainingQuote(t.bKey, amount, trainingSpeedMult, discount, trainingCostMult);
      if (!quote?.cost || !canAfford(quote.cost)) return;
      const room = troopsThatFit(t.bKey, freeCmds);
      if (room < amount) return;
      queueTraining(t.bKey, amount);
      used += 1;
    });
    setValues({});
  }

  const owned = listCards.filter(t => (t.poolCount||0) > 0 || (t.assigned||0) > 0);
  const rest = listCards.filter(t => !((t.poolCount||0) > 0 || (t.assigned||0) > 0));
  const ordered = [...owned, ...rest];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:0, background:"#08090b" }}>
      {/* Compact top bar: SCRAP/TRAIN + barracks inline (no separate barracks box) */}
      {(() => {
        const cap = barracksCommandCapacity(bldgs.barracks||0) || 1;
        const owned = poolCommands(troopCounts);
        const training = queuedCommands(trainingQueues);
        // Healing commands: sum remaining from heal queues if passed, else 0
        const healing = (healQueue||[]).reduce((s, q) => s + (Number(q.remaining)||0) * (COMMAND_COST[q.size] || 1), 0);
        const free = Math.max(0, cap - owned - training - healing);
        const pct = (n) => Math.min(100, Math.max(0, (n / cap) * 100));
        return (
          <div style={{ padding:"5px 8px", borderBottom:`1px solid ${P.border}`, display:"flex", alignItems:"center", gap:6, flexShrink:0, flexWrap:"wrap" }}>
            {isScrap ? (
              <button className="btn" onClick={() => onSwitchMode?.("train")} style={{ background:"rgba(255,255,255,.03)", border:`1px solid ${P.border}`, borderRadius:5, color:P.dim, cursor:"pointer", padding:"4px 10px", fontFamily:P.ff, fontSize:9 }}>‹ TRAIN</button>
            ) : (
              <button className="btn" onClick={() => onSwitchMode?.("scrap")} style={{ background:"rgba(200,40,40,.12)", border:"1px solid #cc404066", borderRadius:5, color:"#ff8888", cursor:"pointer", padding:"4px 10px", fontFamily:P.ff, fontSize:9 }}>SCRAP</button>
            )}
            <div style={{ fontFamily:P.ff, fontSize:11, fontWeight:700, color:isScrap?"#ff7755":P.gold, letterSpacing:".06em" }}>{isScrap ? "⚠ SCRAP" : "⚔ TRAINING"}</div>

            {/* Compact capacity bar: gold=owned, blue=training, green=healing, grey=available */}
            <div style={{ flex:1, minWidth:80, maxWidth:200, height:8, borderRadius:4, background:"#1a1a22", overflow:"hidden", display:"flex", border:"1px solid #2a2418" }}>
              {owned > 0 && <div style={{ width:`${pct(owned)}%`, background:"#c8903a", transition:"width .3s" }} title="In barracks"/>}
              {training > 0 && <div style={{ width:`${pct(training)}%`, background:"#4488cc", transition:"width .3s" }} title="Training"/>}
              {healing > 0 && <div style={{ width:`${pct(healing)}%`, background:"#3daa60", transition:"width .3s" }} title="Healing"/>}
            </div>

            <div style={{ fontFamily:P.ff, fontSize:7.5, color:P.dim, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              <span>🏕{bldgs.barracks||0}</span>
              <span style={{ color:"#c8903a" }}>{fmtCmd(owned)}</span>
              <span>/</span>
              <span>{cap.toLocaleString()}</span>
              <span style={{ color:"#7a7a8a" }}>{fmtCmd(free)} free</span>
              {training > 0 && <span style={{ color:"#4488cc" }}>{fmtCmd(training)} train</span>}
              {healing > 0 && <span style={{ color:"#3daa60" }}>{fmtCmd(healing)} heal</span>}
              {!isScrap && <span>{trainingQueues?.length||0}/{maxQueues}q</span>}
            </div>
          </div>
        );
      })()}


      {/* Field: zoomed-out, two staggered rows (diagonal feel like LOTR reference).
          Scroll LEFT/RIGHT. Most of the screen is the troop field. */}
      <div
        className="training-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: "scroll",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x",
          padding: "4px 6px 2px",
          position: "relative",
          zIndex: 1,
          // Shared dark-fantasy battlefield: faction-neutral so every troop type
          // trains in the same grounded environment.
          backgroundImage:
            "linear-gradient(to bottom, rgba(4,7,10,.20) 0%, rgba(4,7,10,.06) 48%, rgba(4,6,5,.42) 100%), url(\"/hq/training_muddy_battlefield.webp\")",
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          boxShadow: "inset 0 18px 30px rgba(0,0,0,.18), inset 0 -24px 42px rgba(0,0,0,.35)",
          // Small overall punch so the field, the overlays below, and every
          // sprite's own per-image filter all read as one graded shot instead
          // of separately-lit cutouts pasted over a photo.
          filter: "contrast(1.03) saturate(1.05)",
        }}
      >
        {(() => {
          // Split into two rows for staggered / diagonal placement
          const top = [];
          const bot = [];
          ordered.forEach((t, i) => {
            if (i % 2 === 0) top.push(t);
            else bot.push(t);
          });

          // Deterministic per-unit "depth" (0 = distant/back row, 1 = near/
          // front row) with a small stable jitter so units don't line up
          // like a flat wall of trading cards. Same key always gets the same
          // depth, so nothing shifts between re-renders.
          const hash01 = (str) => {
            let h = 0;
            for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
            return (h % 1000) / 1000;
          };
          const depthFor = (key, isTop) => {
            const base = isTop ? 0.14 : 0.86;
            const jitter = (hash01(key) - 0.5) * 0.22;
            return Math.min(1, Math.max(0, base + jitter));
          };

          const renderUnit = (t, isTop) => {
            const depth = depthFor(t.key, isTop); // 0 = far, 1 = near
            const scale = 0.85 + depth * 0.22; // far units read smaller
            const yJitter = (hash01(t.key + "y") - 0.5) * 9; // organic scatter, px
            const satAmt = 0.72 + depth * 0.32; // far units slightly desaturated
            const briAmt = 0.9 + depth * 0.16; // far units slightly dimmer/hazier
            const shadowScale = 0.7 + depth * 0.4; // near units cast bigger shadows
            const shadowOpacity = 0.16 + depth * 0.3;
            const amount = values[t.key] || 0;
            const size = t.branch?.size || "small";
            const step = isScrap ? 1 : (CMD_SIZE[size] || 100);
            const room = troopsThatFit(t.bKey, freeCmds);
            const maxAmount = isScrap
              ? (t.poolCount || 0)
              : Math.max(0, Math.floor(Math.min(maxBatch, room) / step) * step);
            const tierLabel = ["I", "II", "III", "IV"][t.tier?.tierIdx ?? 0] || "I";
            const psrc = troopVisualPath(t.fKey, t.branch.key, t.tier?.tierIdx ?? 0);
            const fc = t.fColor || FACTION_META[t.fKey]?.c || "#888";
            const ownedNow = (t.poolCount || 0) > 0 || (t.assigned || 0) > 0;
            const quote =
              !isScrap && amount > 0
                ? trainingQuote(
                    t.bKey,
                    amount,
                    trainingSpeedMult,
                    t.branch?.capstone
                      ? capstoneTrainDiscount(bldgs[`b_${t.fKey}_${t.branch.key}`])
                      : 0,
                    trainingCostMult
                  )
                : null;
            const affordable = isScrap || !quote?.cost || canAfford(quote.cost);
            const canSelect = isScrap ? maxAmount > 0 : maxAmount >= step && affordable;

            return (
              <div
                key={t.key}
                style={{
                  width: 84,
                  flexShrink: 0,
                  opacity: !ownedNow && !amount ? 0.7 : 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  // Fake camera depth: near units (bottom row / high depth)
                  // render bigger and slightly forward; far units shrink back.
                  // The stable per-unit yJitter breaks up the two dead-straight
                  // rows into something closer to a scattered formation.
                  transform: `translateY(${yJitter}px) scale(${scale})`,
                  transformOrigin: "bottom center",
                  zIndex: Math.round(depth * 100),
                }}
              >
                {/* Floating label above head */}
                <div
                  style={{
                    width: "100%",
                    textAlign: "center",
                    pointerEvents: "none",
                    lineHeight: 1.05,
                    marginBottom: 1,
                  }}
                >
                  <div
                    style={{
                      fontFamily: P.ff,
                      fontSize: 7.5,
                      fontWeight: 700,
                      color: P.text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      textShadow: "0 1px 2px #000, 0 0 3px #000",
                    }}
                  >
                    {t.tier.label}
                    <span style={{ color: ownedNow ? P.gold : "#8a7a60", marginLeft: 3, fontWeight: 600 }}>
                      {(t.poolCount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontFamily: P.ff, fontSize: 5.5, color: fc }}>{tierLabel}</div>
                </div>

                {/* Compact slider above head */}
                <div
                  style={{
                    width: "100%",
                    padding: "1px 2px 2px",
                    marginBottom: 2,
                    borderRadius: 3,
                    background: amount > 0 ? "rgba(5,7,9,.8)" : "rgba(5,7,9,.35)",
                    border: amount > 0 ? `1px solid ${fc}77` : "1px solid transparent",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: P.ff,
                      fontSize: 5.5,
                    }}
                  >
                    <span style={{ color: "#c8b898", fontWeight: 700 }}>{isScrap ? "S" : "T"}</span>
                    <span style={{ color: amount > 0 ? P.gold : "#6a5a48", fontWeight: 700 }}>
                      {amount.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(step, maxAmount)}
                    step={step}
                    value={Math.min(amount, maxAmount)}
                    disabled={!canSelect && amount === 0}
                    onChange={(e) => setValue(t, e.target.value)}
                    style={{
                      width: "100%",
                      margin: 0,
                      accentColor: fc,
                      cursor: canSelect ? "pointer" : "not-allowed",
                      height: 10,
                    }}
                  />
                </div>

                {/* Sprite — no card frame */}
                <div
                  style={{
                    width: 78,
                    height: 88,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {psrc ? (
                    <img
                      src={psrc}
                      alt=""
                      draggable="false"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        objectPosition: "center bottom",
                        // Atmospheric perspective: far-back units read a touch
                        // hazier/cooler and less saturated than near ones, so
                        // depth reads even before the color-grade overlay.
                        filter: `saturate(${satAmt}) brightness(${briAmt})`,
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        opacity: 0.4,
                      }}
                    >
                      {t.fIcon || "⚔"}
                    </div>
                  )}
                  {/* soft ground shadow — blurred radial ellipse, matches a single
                      overhead light source so every unit reads as standing on
                      the same field instead of a flat pasted-on cutout */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${6 + (1 - shadowScale) * 20}%`,
                      right: `${6 + (1 - shadowScale) * 20}%`,
                      bottom: -2,
                      height: 11 * shadowScale,
                      borderRadius: "50%",
                      background: `radial-gradient(ellipse at center, rgba(0,0,0,${shadowOpacity + .3}) 0%, rgba(0,0,0,${shadowOpacity}) 45%, rgba(0,0,0,0) 75%)`,
                      filter: "blur(1.5px)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>
            );
          };

          return (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
                width: "max-content",
                minWidth: "100%",
                paddingRight: 20,
                paddingBottom: 7,
                position: "relative",
                zIndex: 2,
              }}
            >
              {/* Top row — pushed back: offset up and left for a diagonal /
                  staggered feel, like it's sitting further out on the field */}
              <div style={{ display: "flex", flexDirection: "row", gap: 5, paddingLeft: 42, paddingTop: 4, transform: "translateY(-7px)" }}>
                {top.map((t) => renderUnit(t, true))}
              </div>
              {/* Bottom row — pushed forward, closer to camera */}
              <div style={{ display: "flex", flexDirection: "row", gap: 5, paddingBottom: 4, transform: "translateY(5px)" }}>
                {bot.map((t) => renderUnit(t, false))}
              </div>
            </div>
          );
        })()}

        {/* ── Unified color grade ───────────────────────────────────────────
            Everything below the training-scroll div (background art AND every
            troop sprite) sits behind these two overlays. Unlike the dark
            gradient baked into the backgroundImage above — which only ever
            touched the battlefield photo — these use mix-blend-mode so they
            tint the sprites too, pulling each character's individually-lit
            art toward one shared cool/moody grade. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            pointerEvents: "none",
            mixBlendMode: "color",
            background:
              "linear-gradient(165deg, rgba(72,98,122,.44) 0%, rgba(46,60,74,.3) 55%, rgba(22,26,32,.4) 100%)",
          }}
        />
        {/* Distance haze — a light, cool band weighted toward the top of the
            field (where the far/back-row units sit) so the far units visibly
            recede into the air instead of just sitting smaller. Fades out
            completely by mid-field. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            pointerEvents: "none",
            mixBlendMode: "screen",
            background:
              "linear-gradient(to bottom, rgba(150,168,190,.16) 0%, rgba(150,168,190,.07) 35%, rgba(150,168,190,0) 60%)",
          }}
        />
        {/* Vignette + grounding darkness — reinforces the top/bottom fade and
            darkens the outer edges so focus stays center, on the sprites. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 6,
            pointerEvents: "none",
            mixBlendMode: "multiply",
            background:
              "radial-gradient(ellipse 72% 65% at 50% 42%, rgba(0,0,0,0) 0%, rgba(0,0,0,.14) 60%, rgba(0,0,0,.5) 100%), " +
              "linear-gradient(to bottom, rgba(0,0,0,.28) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 68%, rgba(0,0,0,.42) 100%)",
          }}
        />
      </div>

      {/* Fixed action bar */}
      <div
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${P.border}`,
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(5,6,8,.98)",
        }}
      >
        <div style={{ flex: 1, fontFamily: P.ff, fontSize: 8.5, color: P.dim }}>
          <span style={{ color: P.gold, fontWeight: 700 }}>{selected.length}</span> TROOP TYPES ·{" "}
          <span style={{ color: selectedTroops ? P.gold : P.dim, fontWeight: 700 }}>
            {selectedTroops.toLocaleString()}
          </span>{" "}
          TROOPS ·{" "}
          <span style={{ color: selectedCommands ? "#6aaa50" : P.dim, fontWeight: 700 }}>
            {fmtCmd(selectedCommands)}
          </span>{" "}
          COMMANDS
        </div>
        <button
          className="btn"
          onClick={() => setValues({})}
          style={{
            padding: "8px 18px",
            fontFamily: P.ff,
            fontSize: 9,
            borderRadius: 5,
            cursor: "pointer",
            background: "rgba(255,255,255,.03)",
            border: `1px solid ${P.border}`,
            color: P.dim,
          }}
        >
          CANCEL
        </button>
        <button
          className="btn"
          disabled={!selected.length}
          onClick={trainSelected}
          style={{
            padding: "8px 24px",
            fontFamily: P.ff,
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 5,
            cursor: selected.length ? "pointer" : "not-allowed",
            background: selected.length
              ? "linear-gradient(135deg,#c8903a,#8a5a18)"
              : "rgba(255,255,255,.03)",
            border: `1px solid ${selected.length ? "#f0c04077" : "#222"}`,
            color: selected.length ? "#fff8e8" : "#333",
          }}
        >
          {isScrap ? "SCRAP SELECTED" : "TRAIN SELECTED"}
        </button>
      </div>
    </div>
  );
}

// ── Root two-screen wrapper ────────────────────────────────────────────────────
function StrikeCraftScreen({ bldgs, barracksPool, troopCounts, trainingQueues, setTrainingQueues,
  canAfford, queueTraining, rss, cmds, discardTroops, unlockedBranches, trainingSpeedMult, trainingCostMult = 1,
  neutralSources = {}, contractCommandsLeft, healQueue = [] }) {

  // Always show the horizontal two-row training view (never the old list view).
  // "train" | "scrap" — scrap filters to owned troops only.
  const [subScreen, setSubScreen] = useState("train");
  const troopCards = useTroopCards({ unlockedBranches, troopCounts, cmds });

  return (
    <TrainingQueueScreen
      key={subScreen}
      mode={subScreen}
      bldgs={bldgs} barracksPool={barracksPool} troopCounts={troopCounts}
      troopCards={troopCards} trainingQueues={trainingQueues}
      setTrainingQueues={setTrainingQueues}
      canAfford={canAfford} queueTraining={queueTraining}
      rss={rss} discardTroops={discardTroops}
      trainingSpeedMult={trainingSpeedMult} trainingCostMult={trainingCostMult}
      neutralSources={neutralSources} contractCommandsLeft={contractCommandsLeft}
      onBack={() => setSubScreen("train")}
      onSwitchMode={(m) => setSubScreen(m)}
      healQueue={healQueue}
    />
  );
}
// -----------------------------------------------------------------------------
//  ARMY
// -----------------------------------------------------------------------------


// ─────────────────────────────────────────────────────────────────────────────
//  MANAGE SHIP  —  full-screen SlotEditor replacement
//
//  Layout (top → bottom):
//    ┌──────────────────────────────────┐
//    │  [bust]   [name / cmd / spd]     │  ← TOP BAR
//    ├──────────────────────────────────┤
//    │  [ slot 1 ][ slot 2 ][ slot 3 ]  │  ← SLOT ROW (middle)
//    │  ──── active-slot slider ─────── │
//    ├──────────────────────────────────┤
//    │  scrollable troop list           │  ← BOTTOM TRAY
//    │  [Dagger T1 · 102]  [Corsair T3] │
//    ├──────────────────────────────────┤
//    │  [REFILL]           [CONFIRM]    │  ← ACTION BAR
//    └──────────────────────────────────┘
//
//  Props identical to original SlotEditor so the call-site in BattleGroupsScreen
//  can call this once per screen rather than once per slot index.
// ─────────────────────────────────────────────────────────────────────────────

// Called as: <ManageShipScreen cmd={cmd} ... onBack={() => setEditOpen(false)} />
// (replaces the per-slot <SlotEditor> calls in the edit branch of BattleGroupsScreen)

const TIER_COLORS_MS = ["#8a8aaa", "#4488cc", "#a855f7"];
const TIER_ROMAN_MS  = ["I", "II", "III"];

function ManageShipScreen({
  cmd, setArmySlots, returnTroops, troopCounts, bldgs,
  unlockedBranches, staminaMax, onBack,
}) {
  const ub = unlockedBranches || {};

  // ── Working copy of slots (3 slots, each null | { branch, troops }) ────────
  const [slots, setSlots] = useState(() =>
    [0, 1, 2].map(i => {
      const sl = cmd.troopSlots?.[i] ?? null;
      return sl ? { branch: sl.branch, troops: sl.troops ?? 0 } : null;
    })
  );

  // Which slot index is "active" (slider targets this one)
  const [activeSlot, setActiveSlot] = useState(null);

  // Slider value for the active slot
  const [sv, setSv] = useState(0);

  // ── Derived helpers ────────────────────────────────────────────────────────
  const commandCap = cmdCommand(cmd.lvl || 5, bldgs.commandcenter || 0, cmd.commandBonus ?? 0);

  function resolveSlotData(sl) {
    if (!sl?.branch) return null;
    const fDef  = TROOP_FACTIONS[sl.branch.faction];
    const brDef = fDef?.branches?.find(b => b.key === sl.branch.branch);
    const tierData = brDef?.tiers[sl.branch.tier ?? 0] ?? null;
    return brDef ? { brDef, tierData, tierIdx: sl.branch.tier ?? 0 } : null;
  }

  const cmdUsed = slots.reduce((s, sl) => {
    if (!sl) return s;
    const brDef = TROOP_FACTIONS[sl.branch?.faction]?.branches?.find(b => b.key === sl.branch?.branch);
    return s + (sl.troops || 0) * (COMMAND_COST[brDef?.size] ?? 1);
  }, 0);

  const fillPct   = commandCap > 0 ? Math.min(100, Math.round((cmdUsed / commandCap) * 100)) : 0;
  const fillColor = fillPct >= 100 ? "#cc3030" : fillPct >= 75 ? "#d0a030" : "#3daa60";

  // Army speed = slowest troop spd among assigned slots
  const armySpd = (() => {
    const speeds = slots
      .filter(sl => sl && sl.troops > 0)
      .map(sl => resolveSlotData(sl)?.tierData?.spd ?? 999);
    return speeds.length > 0 ? Math.min(...speeds) : null;
  })();

  // ── All available troop types (flat list for the bottom tray) ────────────
  const availTroopList = useMemo(() => {
    const list = [];
    for (const [fKey, fDef] of Object.entries(TROOP_FACTIONS)) {
      for (const br of fDef.branches) {
        const ubKey = `${fKey}:${br.key}`;
        if (!(ubKey in ub)) continue;
        const maxTier = ub[ubKey] ?? 0;
        for (let idx = 0; idx <= maxTier; idx++) {
          const bKey  = `${fKey}:${br.key}:${idx}`;
          const pool  = (troopCounts || {})[bKey] || 0;
          list.push({
            fKey, br, tierIdx: idx,
            tierData: br.tiers[idx] ?? null,
            bKey, pool,
            fColor: FACTION_META[fKey]?.c || P.gold,
          });
        }
      }
    }
    return list;
  }, [ub, troopCounts]);

  // ── Active-slot derived ────────────────────────────────────────────────────
  const activeSlotData = activeSlot !== null ? slots[activeSlot] : null;
  const activeBrDef = activeSlotData
    ? TROOP_FACTIONS[activeSlotData.branch?.faction]?.branches?.find(
        b => b.key === activeSlotData.branch?.branch,
      )
    : null;
  const activeBKey = activeSlotData?.branch
    ? `${activeSlotData.branch.faction}:${activeSlotData.branch.branch}:${activeSlotData.branch.tier ?? 0}`
    : null;

  // How many of the active bKey are in OTHER slots
  const inOtherSlots = (bk) =>
    slots.reduce((s, sl, i) => {
      if (i === activeSlot || !sl) return s;
      const k = sl.branch
        ? `${sl.branch.faction}:${sl.branch.branch}:${sl.branch.tier ?? 0}`
        : null;
      return k === bk ? s + (sl.troops || 0) : s;
    }, 0);

  // Command headroom for active slot
  const otherCmdUsed = slots.reduce((s, sl, i) => {
    if (i === activeSlot || !sl) return s;
    const br = TROOP_FACTIONS[sl.branch?.faction]?.branches?.find(b => b.key === sl.branch?.branch);
    return s + (sl.troops || 0) * (COMMAND_COST[br?.size] ?? 1);
  }, 0);
  const slCmdCost   = COMMAND_COST[activeBrDef?.size] ?? 1;
  const maxByCmd    = Math.floor(Math.max(0, commandCap - otherCmdUsed) / slCmdCost);
  const activePool  = activeBKey ? ((troopCounts || {})[activeBKey] || 0) : 0;
  // Troops of this type the commander ALREADY holds (they left the barracks
  // pool when assigned) — they're available to the draft too.
  const committedTroops = (bk) => (cmd.troopSlots || []).reduce((s, sl) => {
    const k = sl?.branch ? `${sl.branch.faction}:${sl.branch.branch}:${sl.branch.tier ?? 0}` : null;
    return k === bk ? s + (sl.troops || 0) : s;
  }, 0);
  // Max for the active slot = barracks pool + already-held − what the other
  // draft slots use. (Used to add the active slot's own DRAFT value, so every
  // drag raised the cap — the slider could go past the troops you had.)
  const activeMax   = activeBKey ? Math.max(0, activePool + committedTroops(activeBKey) - inOtherSlots(activeBKey)) : 0;
  const maxSlider   = Math.min(maxByCmd, activeMax);
  const activeAvail = Math.max(0, activeMax - (activeSlotData?.troops ?? 0)); // shown as "Pool" (still unassigned)

  // Sync slider when active slot changes
  useEffect(() => {
    if (activeSlot !== null && slots[activeSlot]) {
      setSv(slots[activeSlot].troops ?? 0);
    } else {
      setSv(0);
    }
  }, [activeSlot]);

  // ── Assign troop type to a slot (tap from tray) ──────────────────────────
  function assignTroopToSlot(slotIdx, fKey, br, tierIdx) {
    const newBranch = { faction: fKey, branch: br.key, tier: tierIdx };
    setSlots(prev => {
      const next = [...prev];
      // If same branch already in this slot, keep troops; else reset to 0
      const existing = prev[slotIdx];
      const isSame   = existing?.branch?.faction === fKey
        && existing?.branch?.branch  === br.key
        && (existing?.branch?.tier ?? 0) === tierIdx;
      next[slotIdx] = { branch: newBranch, troops: isSame ? (existing?.troops ?? 0) : 0 };
      return next;
    });
    setActiveSlot(slotIdx);
  }

  // ── Clear a slot ──────────────────────────────────────────────────────────
  function clearSlot(slotIdx) {
    setSlots(prev => { const n = [...prev]; n[slotIdx] = null; return n; });
    if (activeSlot === slotIdx) setActiveSlot(null);
  }

  // ── Update troops count from slider ───────────────────────────────────────
  function handleSliderChange(val) {
    setSv(val);
    if (activeSlot === null) return;
    setSlots(prev => {
      const n = [...prev];
      if (n[activeSlot]) n[activeSlot] = { ...n[activeSlot], troops: val };
      return n;
    });
  }

  // ── Confirm — flush all slots to game state ──────────────────────────────
  function handleConfirm() {
    // One atomic update for all 3 slots (per-slot calls could shift slots / double-draw).
    setArmySlots(cmd.uid, slots);
    onBack();
  }

  // ── Refill — return all troops ────────────────────────────────────────────
  function handleRefill() {
    returnTroops(cmd.uid);
    setSlots([null, null, null]);
    setActiveSlot(null);
    setSv(0);
  }

  // ── Tray ordering (Rise-to-War style): what you actually own comes first ──
  const [showLocked, setShowLocked] = useState(false);
  const slotKeyOf = (sl) => sl?.branch
    ? `${sl.branch.faction}:${sl.branch.branch}:${sl.branch.tier ?? 0}` : null;
  const heldKeys  = new Set(slots.map(slotKeyOf).filter(Boolean));
  const isOwned   = (t) => t.pool > 0 || heldKeys.has(t.bKey);
  const ownedList = availTroopList
    .filter(isOwned)
    .sort((a, b) =>
      (heldKeys.has(b.bKey) ? 1 : 0) - (heldKeys.has(a.bKey) ? 1 : 0) ||
      b.pool - a.pool || b.tierIdx - a.tierIdx);
  const lockedList = availTroopList.filter(t => !isOwned(t));

  const fmtCount = (n) => n > 9999 ? `${(n / 1000).toFixed(1)}k` : (n || 0).toLocaleString();
  const troopIcon = (br) => br.dmgType === "magical" ? "✦"
    : br.size === "small" ? "🗡" : br.size === "large" ? "🪃" : "⚔";

  function onTrayTap(t) {
    const assignedIdx = slots.findIndex(sl => slotKeyOf(sl) === t.bKey);
    if (assignedIdx >= 0) { setActiveSlot(assignedIdx); return; }
    const empty = slots.findIndex(sl => !sl);
    const target = empty >= 0 ? empty : activeSlot;   // all full → replace the selected slot
    if (target !== null && target !== undefined) assignTroopToSlot(target, t.fKey, t.br, t.tierIdx);
  }

  function TrayCard({ t, locked }) {
    const tierColor = TIER_COLORS_MS[Math.min(t.tierIdx, 2)];
    const assignedIdx = slots.findIndex(sl => slotKeyOf(sl) === t.bKey);
    const isAssigned = assignedIdx >= 0;
    const psrc = troopVisualPath(t.fKey, t.br.key, t.tierIdx);
    return (
      <button className="btn" disabled={locked} onClick={() => onTrayTap(t)}
        style={{
          display: "flex", alignItems: "center", gap: 7, padding: "5px 6px",
          textAlign: "left", borderRadius: 5, minWidth: 0,
          background: isAssigned ? `${tierColor}18` : "rgba(255,255,255,.03)",
          border: `1px solid ${isAssigned ? tierColor : locked ? "#1a1818" : P.border}`,
          opacity: locked ? 0.4 : 1, cursor: locked ? "default" : "pointer",
        }}>
        <div style={{ width: 40, height: 40, borderRadius: 4, overflow: "hidden", flexShrink: 0,
          border: `1px solid ${tierColor}55`, position: "relative", background: "#0a0806" }}>
          {psrc && <img src={psrc} alt="" loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
            onError={e => { e.currentTarget.style.display = "none"; }} />}
          <div style={{ position: "absolute", top: 0, left: 0, fontSize: 6, fontWeight: 700,
            color: tierColor, background: "rgba(0,0,0,.7)", padding: "0 3px", fontFamily: P.ff }}>
            {TIER_ROMAN_MS[Math.min(t.tierIdx, 2)]}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, fontFamily: P.ff, lineHeight: 1.15,
            color: isAssigned ? t.fColor : P.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.tierData?.label ?? t.br.label}
          </div>
          <div style={{ fontSize: 7, color: locked ? P.dim : "#7aaa7a", fontFamily: P.ff, marginTop: 1 }}>
            {locked ? "none trained" : `${fmtCount(t.pool)} in barracks`}
          </div>
          {isAssigned && (
            <div style={{ fontSize: 6.5, color: "#3daa60", fontWeight: 700, fontFamily: P.ff }}>
              ✓ Slot {assignedIdx + 1} · {fmtCount(slots[assignedIdx]?.troops ?? 0)}
            </div>
          )}
        </div>
      </button>
    );
  }

  const rarColor  = RC(cmd.rarity);
  const stam      = cmd.stamina ?? staminaMax;
  const stamColor = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";

  // ── Render: two panes so the troop list gets the full height ──────────────
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#0a0c10" }}>

      {/* ═══ LEFT PANE: commander, slots, slider, actions ═══ */}
      <div style={{ width: "44%", minWidth: 250, maxWidth: 360, flexShrink: 0, display: "flex",
        flexDirection: "column", borderRight: `1px solid ${P.border}`, minHeight: 0 }}>

        {/* Compact header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
          background: "rgba(0,0,0,.5)", borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
          <button className="btn" onClick={onBack} style={{ fontSize: 10, padding: "5px 9px", minHeight: 30,
            background: "rgba(255,255,255,.04)", border: `1px solid ${P.border}`, color: P.dim,
            borderRadius: 3, flexShrink: 0 }}>←</button>
          <div style={{ width: 32, height: 38, flexShrink: 0, borderRadius: 4, overflow: "hidden",
            border: `1px solid ${rarColor}66`, background: "#060408" }}>
            {cmd.bust
              ? <img src={cmd.bust} alt={cmd.n} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
              : <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{cmd.icon}</div>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: P.ff, fontSize: 7, fontWeight: 700, color: rarColor,
                background: `${rarColor}22`, border: `1px solid ${rarColor}55`, borderRadius: 3, padding: "0 5px" }}>{cmd.lvl ?? 1}</span>
              <span style={{ fontFamily: P.ff, fontSize: 10, fontWeight: 700, color: P.gold,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cmd.n}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
              <span style={{ fontSize: 7, color: fillColor, fontFamily: P.ff, flexShrink: 0 }}>
                📡 {+cmdUsed.toFixed(1)}/{commandCap}
              </span>
              <div style={{ flex: 1, height: 4, background: "#1a1820", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${fillPct}%`, background: fillColor, transition: "width .25s" }} />
              </div>
            </div>
            <div style={{ fontSize: 6.5, color: "#6a8aaa", fontFamily: P.ff, marginTop: 2 }}>
              {armySpd !== null ? `🏃 Speed ${armySpd}` : "No troops assigned"} · ⚡{Math.floor(stam)}
            </div>
          </div>
        </div>

        {/* Slots + slider (scrolls if the screen is very short) */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 8px 6px" }}>
          <div style={{ fontSize: 6.5, color: "#c8903a", fontFamily: P.ff, fontWeight: 700,
            letterSpacing: ".16em", marginBottom: 5 }}>ARMY SLOTS</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
            {[0, 1, 2].map(i => {
              const sl  = slots[i];
              const res = sl ? resolveSlotData(sl) : null;
              const isActive = activeSlot === i;
              const tierColor = res ? TIER_COLORS_MS[Math.min(res.tierIdx, 2)] : P.border;
              const fColor = sl ? (FACTION_META[sl.branch?.faction]?.c || P.gold) : P.dim;
              const psrc = sl ? troopVisualPath(sl.branch?.faction, sl.branch?.branch, sl.branch?.tier ?? 0) : null;
              const cost = res ? (COMMAND_COST[res.brDef.size] ?? 1) : 1;
              return (
                <div key={i} onClick={() => sl && setActiveSlot(isActive ? null : i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, height: 50, padding: "4px 6px",
                    borderRadius: 5, position: "relative",
                    border: sl ? `2px solid ${isActive ? tierColor : tierColor + "88"}` : `1px dashed ${P.border}`,
                    background: isActive ? `${tierColor}14` : sl ? "rgba(6,4,2,.9)" : "rgba(0,0,0,.3)",
                    boxShadow: isActive ? `0 0 10px ${tierColor}44` : "none",
                    cursor: sl ? "pointer" : "default",
                  }}>
                  <div style={{ fontFamily: P.ff, fontSize: 9, fontWeight: 700, color: P.dim, width: 10, textAlign: "center" }}>{i + 1}</div>
                  {sl && res ? (
                    <>
                      <div style={{ width: 38, height: 38, borderRadius: 4, overflow: "hidden", flexShrink: 0,
                        border: `1px solid ${tierColor}66`, background: "#0a0806" }}>
                        {psrc && <img src={psrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
                          onError={e => { e.currentTarget.style.display = "none"; }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 8.5, fontWeight: 700, color: fColor, fontFamily: P.ff,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {res.tierData?.label ?? "?"}
                        </div>
                        <div style={{ fontSize: 7, color: "#c8a060", fontFamily: P.ff, marginTop: 1 }}>
                          {fmtCount(sl.troops)} troops · {(sl.troops * cost).toFixed(1)} cmd
                        </div>
                      </div>
                      <button className="btn" onClick={e => { e.stopPropagation(); clearSlot(i); }}
                        style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(200,50,50,.7)",
                          border: "none", color: "#fff", fontSize: 9, padding: 0, flexShrink: 0 }}>✕</button>
                    </>
                  ) : (
                    <div style={{ fontSize: 7.5, color: "#4a4030", fontFamily: P.ffb, fontStyle: "italic" }}>
                      Empty — tap a troop on the right
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Slider for the active slot */}
          {activeSlot !== null && slots[activeSlot] ? (() => {
            const sl  = slots[activeSlot];
            const res = resolveSlotData(sl);
            const tierColor = res ? TIER_COLORS_MS[Math.min(res.tierIdx, 2)] : P.gold;
            const svClamped = Math.min(sv, Math.max(0, maxSlider));
            // One command per notch: 100 small / 50 medium / 4 large troops.
            const step = CMD_SIZE[res?.brDef?.size] ?? CMD_SIZE.small;
            const sliderMax = Math.floor(maxSlider / step) * step;
            const snap = (v) => Math.min(sliderMax, Math.max(0, Math.floor(v / step) * step));
            const quick = (label, val) => (
              <button key={label} className="btn" onClick={() => handleSliderChange(snap(Math.max(0, Math.min(maxSlider, val))))}
                style={{ flex: 1, padding: "5px 0", fontSize: 7.5, fontWeight: 700, fontFamily: P.ff,
                  background: `${tierColor}14`, border: `1px solid ${tierColor}55`, color: tierColor, borderRadius: 3 }}>
                {label}
              </button>
            );
            return (
              <div style={{ padding: "7px 9px", borderRadius: 5, background: `${tierColor}0a`, border: `1px solid ${tierColor}33` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7, fontFamily: P.ff, marginBottom: 4 }}>
                  <span style={{ color: tierColor }}>SLOT {activeSlot + 1} · {res?.tierData?.label ?? "?"}</span>
                  <span style={{ color: "#c8a060" }}>{svClamped.toLocaleString()} · {(svClamped * slCmdCost).toFixed(1)} cmd</span>
                </div>
                <input type="range" min={0} max={Math.max(step, sliderMax)} value={Math.min(svClamped, Math.max(step, sliderMax))} step={step}
                  onChange={e => handleSliderChange(snap(+e.target.value))}
                  onInput={e => handleSliderChange(snap(+e.target.value))}
                  style={{ width: "100%", accentColor: tierColor, touchAction: "none" }} />
                <div style={{ display: "flex", gap: 4, margin: "3px 0" }}>
                  {quick("0", 0)}{quick("¼", sliderMax / 4)}{quick("½", sliderMax / 2)}{quick("MAX", sliderMax)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 6.5, color: "#5a7a5a", fontFamily: P.ff }}>
                  <span>Unassigned: {activeAvail.toLocaleString()}</span>
                  <span>Max: {sliderMax.toLocaleString()} ({step}/cmd)</span>
                </div>
              </div>
            );
          })() : (
            <div style={{ fontSize: 7.5, color: "#4a4030", fontFamily: P.ffb, fontStyle: "italic", textAlign: "center" }}>
              Tap a filled slot to set its troop count
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ flexShrink: 0, display: "flex", gap: 8, padding: "7px 8px",
          background: "rgba(0,0,0,.5)", borderTop: `1px solid ${P.border}` }}>
          <button className="btn" onClick={handleRefill} style={{ flex: 1, padding: "9px 0",
            background: "rgba(200,180,140,.06)", border: "1px solid rgba(200,180,140,.25)", color: "#d0c090",
            fontFamily: P.ff, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", borderRadius: 4 }}>REFILL</button>
          <button className="btn" onClick={handleConfirm} style={{ flex: 1, padding: "9px 0",
            background: "linear-gradient(135deg,#c8903a,#a06828)", border: "1px solid #7a5018", color: "#0a0806",
            fontFamily: P.ff, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", borderRadius: 4 }}>CONFIRM</button>
        </div>
      </div>

      {/* ═══ RIGHT PANE: troop tray — owned first, full height ═══ */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 2, padding: "6px 10px 5px",
          background: "rgba(6,4,2,.96)", borderBottom: `1px solid ${P.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 7, color: "#c8903a", fontFamily: P.ff, fontWeight: 700, letterSpacing: ".16em" }}>
          <span>YOUR TROOPS ({ownedList.length})</span>
          <span style={{ color: P.dim, fontWeight: 400, letterSpacing: ".05em" }}>tap to assign</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
          gap: 5, padding: "7px 8px" }}>
          {ownedList.length === 0 && (
            <div style={{ gridColumn: "1/-1", fontSize: 8.5, color: "#5a5040", fontFamily: P.ffb,
              fontStyle: "italic", textAlign: "center", padding: "18px 8px" }}>
              No trained troops in the barracks. Train some in the Training tab.
            </div>
          )}
          {ownedList.map(t => <div key={t.bKey} style={{ display: "contents" }}>{TrayCard({ t, locked: false })}</div>)}
        </div>

        {lockedList.length > 0 && (
          <>
            <button className="btn" onClick={() => setShowLocked(v => !v)}
              style={{ width: "100%", textAlign: "left", padding: "6px 10px", background: "rgba(255,255,255,.02)",
                border: "none", borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`,
                color: P.dim, fontSize: 7, fontFamily: P.ff, letterSpacing: ".14em" }}>
              {showLocked ? "▾" : "▸"} NOT TRAINED YET ({lockedList.length})
            </button>
            {showLocked && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
                gap: 5, padding: "7px 8px 14px" }}>
                {lockedList.map(t => <div key={t.bKey} style={{ display: "contents" }}>{TrayCard({ t, locked: true })}</div>)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BattleGroupsScreen({
  cmds, setCmds, bldgs, barracksPool, troopCounts,
  sliderVals, setSliderVals, setTroopSlot, setArmySlots, returnTroops,
  playerHqKey, unlockedBranches, staminaMax,
}) {
  const hqKey = playerHqKey || `${HQP.player.c},${HQP.player.r}`;

  const ARMY_RARITY_ORDER = { champion: 0, veteran: 1, soldier: 2 };
  const playerCmds = cmds
    .filter(c => c.owner === "player")
    .sort((a, b) => {
      const lvlDiff = (b.lvl ?? 5) - (a.lvl ?? 5);
      if (lvlDiff !== 0) return lvlDiff;
      const rarDiff =
        (ARMY_RARITY_ORDER[a.rarity] ?? 3) -
        (ARMY_RARITY_ORDER[b.rarity] ?? 3);
      if (rarDiff !== 0) return rarDiff;
      return (a.n ?? "").localeCompare(b.n ?? "");
    });

  const [selUid,    setSelUid]    = useState(null);
  const [editOpen,  setEditOpen]  = useState(false);   // toggle right-side edit mode
  const selCmd = playerCmds.find(c => c.uid === selUid) || playerCmds[0] || null;

  // ── helpers ────────────────────────────────────────────────────────────────
  const TIER_COLORS  = ["#8a8aaa", "#4488cc", "#a855f7"];
  const TIER_ROMAN   = ["I", "II", "III"];

  function cmdUsedFor(cmd) {
    return (cmd.troopSlots ?? []).reduce((s, sl) => {
      const slBr = TROOP_FACTIONS[sl.branch?.faction]?.branches?.find(
        b => b.key === sl.branch?.branch,
      );
      return s + (sl.troops || 0) * (COMMAND_COST[slBr?.size] ?? 1);
    }, 0);
  }

  function commandCapFor(cmd) {
    return cmdCommand(cmd.lvl || 5, bldgs.commandcenter || 0, cmd.commandBonus ?? 0);
  }

  function resolveSlot(sl) {
    if (!sl?.branch) return null;
    const fDef = TROOP_FACTIONS[sl.branch.faction];
    if (!fDef) return null;
    const brDef = fDef.branches.find(b => b.key === sl.branch.branch);
    if (!brDef) return null;
    const tierData = brDef.tiers[sl.branch.tier ?? 0] ?? null;
    return { brDef, tierData, tierIdx: sl.branch.tier ?? 0 };
  }

  // ── Mini troop box used in the left list ──────────────────────────────────
  function MiniSlotBox({ sl }) {
    const res = resolveSlot(sl);
    if (!sl || !res) {
      // empty placeholder
      return (
        <div style={{
          width: 34, height: 38, borderRadius: 3,
          border: "1px solid #2a2418",
          background: "rgba(0,0,0,.35)",
          flexShrink: 0,
        }} />
      );
    }
    const tierColor = TIER_COLORS[Math.min(res.tierIdx, 2)];
    const count = sl.troops > 999
      ? `${(sl.troops / 1000).toFixed(1)}k`
      : (sl.troops || 0).toLocaleString();
    const psrc = troopVisualPath(sl.branch?.faction, sl.branch?.branch, res.tierIdx);
    return (
      <div style={{
        width: 34, height: 38, borderRadius: 3, flexShrink: 0,
        border: `1px solid ${tierColor}99`,
        background: "rgba(6,4,2,.9)",
        position: "relative", overflow: "hidden",
      }}>
        {psrc && (
          <img src={psrc} alt={res.tierData?.label ?? ""}
            style={{ position:"absolute", inset:0, width:"100%", height:"100%",
              objectFit:"cover", objectPosition:"top center", opacity:.85 }}
            onError={e => { e.currentTarget.style.display="none"; }}
          />
        )}
        <div style={{ position:"absolute", inset:0,
          background:"linear-gradient(to top, rgba(4,2,1,.95) 0%, rgba(4,2,1,.2) 55%, transparent 100%)",
          pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:1, left:0, right:0,
          display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
          <div style={{ fontSize: 5.5, fontWeight: 700, color: "#c8a060", fontFamily: P.ff, lineHeight: 1 }}>
            {count}
          </div>
        </div>
      </div>
    );
  }

  // ── Large troop box used in the right detail panel ────────────────────────
  function DetailTroopBox({ sl, onClick }) {
    const res = resolveSlot(sl);
    const isEmpty = !sl || !res || !sl.troops;

    if (isEmpty) {
      return (
        <div style={{
          flex: 1, minHeight: 88,
          borderRadius: 5,
          border: "1px solid #2a2418",
          background: "rgba(0,0,0,.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#3a3028", fontSize: 7.5, fontFamily: P.ffb, fontStyle: "italic",
          cursor: onClick ? "pointer" : "default",
        }}
          onClick={onClick}
        >
          empty
        </div>
      );
    }

    const tierColor = TIER_COLORS[Math.min(res.tierIdx, 2)];
    const tierLabel = TIER_ROMAN[Math.min(res.tierIdx, 2)];
    const fColor = FACTION_META[sl.branch.faction]?.c || P.gold;
    const count = sl.troops > 9999
      ? `${(sl.troops / 1000).toFixed(1)}k`
      : (sl.troops || 0).toLocaleString();
    const psrc = troopVisualPath(sl.branch?.faction, sl.branch?.branch, res.tierIdx);

    return (
      <div
        onClick={onClick}
        style={{
          flex: 1, minHeight: 120, borderRadius: 5,
          border: `1px solid ${tierColor}cc`,
          background: "rgba(6,4,2,.92)",
          boxShadow: `0 2px 12px rgba(0,0,0,.8), 0 0 8px ${tierColor}22`,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "flex-end",
          cursor: onClick ? "pointer" : "default",
          padding: 0,
          transition: "border-color .15s, box-shadow .15s",
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Portrait */}
        {psrc && (
          <img src={psrc} alt={res.tierData?.label ?? ""}
            style={{ position:"absolute", inset:0, width:"100%", height:"100%",
              objectFit:"cover", objectPosition:"top center", opacity:.85, borderRadius:4 }}
            onError={e => { e.currentTarget.style.display="none"; }}
          />
        )}
        {/* Vignette */}
        <div style={{ position:"absolute", inset:0, borderRadius:4,
          background:"linear-gradient(to top, rgba(4,2,1,.95) 0%, rgba(4,2,1,.4) 55%, transparent 100%)",
          pointerEvents:"none" }} />
        {/* Content */}
        <div style={{ position:"relative", zIndex:1, width:"100%",
          display:"flex", flexDirection:"column", alignItems:"center",
          padding:"4px 4px 8px", gap:2 }}>
          <div style={{
            fontSize: 6, fontWeight: 700, color: tierColor,
            fontFamily: P.ff, letterSpacing: ".12em",
            border: `1px solid ${tierColor}66`, borderRadius: 2,
            padding: "1px 5px", lineHeight: 1.4, background:"rgba(0,0,0,.5)",
          }}>
            {tierLabel}
          </div>
          <div style={{
            fontSize: 7.5, fontWeight: 700, color: fColor,
            fontFamily: P.ff, textAlign: "center", lineHeight: 1.2,
          }}>
            {res.tierData?.label ?? res.brDef.label}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#f0e8d8",
            fontFamily: P.ff, lineHeight: 1,
          }}>
            {count}
          </div>
        </div>
      </div>
    );
  }

  // ── Left-panel card ────────────────────────────────────────────────────────
  function CommanderListCard({ cmd }) {
    const isActive  = selCmd?.uid === cmd.uid;
    const isAtHQ    = cmd.tk === hqKey;
    const cap       = commandCapFor(cmd);
    const used      = cmdUsedFor(cmd);
    const fillPct   = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
    const fillColor = fillPct >= 100 ? "#cc3030" : fillPct >= 75 ? "#d0a030" : "#3daa60";
    const rarColor  = RC(cmd.rarity);

    const stam      = cmd.stamina ?? staminaMax;
    const stamColor = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";

    // padded 3 slots
    const slots = [0, 1, 2].map(i => cmd.troopSlots?.[i] ?? null);

    return (
      <button
        onClick={() => { setSelUid(cmd.uid); setEditOpen(false); }}
        style={{
          width: "100%", textAlign: "left", marginBottom: 5,
          padding: "7px 6px 6px", borderRadius: 6,
          cursor: "pointer",
          background: isActive ? "rgba(240,192,64,.08)" : "rgba(255,255,255,.02)",
          border: `1px solid ${isActive ? P.gold + "55" : P.border}`,
          transition: "all .12s",
        }}
      >
        {/* Top row: bust + info */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 5 }}>
          {/* Bust image */}
          <div style={{
            width: 38, height: 46, flexShrink: 0, borderRadius: 4,
            overflow: "hidden", position: "relative",
            border: `1px solid ${rarColor}55`,
            background: "#0a0c10",
          }}>
            {cmd.bust ? (
              <img
                src={cmd.bust}
                alt={cmd.n}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
              />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>
                {cmd.icon}
              </div>
            )}
          </div>

          {/* Name / level / stamina */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Level badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
              <div style={{
                fontSize: 7, fontWeight: 700, color: rarColor,
                fontFamily: P.ff,
                background: `${rarColor}22`,
                border: `1px solid ${rarColor}55`,
                borderRadius: 3, padding: "0px 5px", lineHeight: 1.6,
                flexShrink: 0,
              }}>
                {cmd.lvl ?? 1}
              </div>
              <div style={{
                fontFamily: P.ff, fontSize: 7.5, fontWeight: 700,
                color: isActive ? P.gold : P.text,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {cmd.n}
              </div>
            </div>
            {/* Stamina */}
            <div style={{ fontSize: 6, color: stamColor, fontFamily: P.ff }}>
              ⚡ {Math.floor(stam)} · {cmd.cls}
            </div>
            {/* At HQ indicator */}
            <div style={{ fontSize: 5.5, color: isAtHQ ? "#3daa60" : "#5a4a2a", marginTop: 2, fontFamily: P.ff }}>
              {isAtHQ ? "🏰 AT HQ" : "📍 AWAY"}
            </div>
          </div>
        </div>

        {/* Troop slot boxes */}
        <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
          {slots.map((sl, i) => <MiniSlotBox key={i} sl={sl} />)}
        </div>

        {/* Command fill bar */}
        <div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 5.5, color: "#5a5060", fontFamily: P.ff, marginBottom: 2,
          }}>
            <span>COMMAND</span>
            <span style={{ color: fillColor }}>{fillPct}%</span>
          </div>
          <div style={{ height: 3, background: "#181820", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${fillPct}%`,
              background: fillColor, borderRadius: 2,
              transition: "width .3s",
            }} />
          </div>
        </div>
      </button>
    );
  }

  // ── Right-side render ──────────────────────────────────────────────────────
  const rightPanel = (() => {
    if (!selCmd) {
      return (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          color: P.dim, fontFamily: P.ffb, fontStyle: "italic", fontSize: 9,
        }}>
          No commanders available.
        </div>
      );
    }

    const cmd      = selCmd;
    const isAtHQ   = cmd.tk === hqKey;
    const cap      = commandCapFor(cmd);
    const used     = cmdUsedFor(cmd);
    const fillPct  = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
    const fillColor = fillPct >= 100 ? "#cc3030" : fillPct >= 75 ? "#d0a030" : "#3daa60";
    const rarColor  = RC(cmd.rarity);

    // padded 3 slots
    const slots = [0, 1, 2].map(i => cmd.troopSlots?.[i] ?? null);
    const stam   = cmd.stamina ?? staminaMax;
    const stamColor = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";

    if (editOpen && isAtHQ) {
      return (
        <ManageShipScreen
          cmd={cmd}
          setArmySlots={setArmySlots}
          returnTroops={returnTroops}
          troopCounts={troopCounts}
          bldgs={bldgs}
          unlockedBranches={unlockedBranches}
          staminaMax={staminaMax}
          onBack={() => setEditOpen(false)}
        />
      );
    }

    // ── VIEW mode (reference-image layout) ──────────────────────────────────
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Portrait area */}
        <div style={{
          flex: 1, position: "relative", overflow: "hidden",
          background: "linear-gradient(160deg,#0d0b08,#080608)",
          minHeight: 0,
        }}>
          {/* Ambient glow */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `radial-gradient(ellipse 80% 80% at 50% 100%, ${rarColor}18 0%, transparent 70%)`,
          }} />

          {/* Commander image */}
          {(cmd.portrait || cmd.bust) ? (
            <img
              src={cmd.portrait ?? cmd.bust}
              alt={cmd.n}
              style={{
                position: "absolute",
                bottom: 0, left: "50%", transform: "translateX(-50%)",
                height: "95%", width: "auto",
                objectFit: "contain", objectPosition: "bottom center",
                opacity: .93,
              }}
            />
          ) : (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 64, opacity: .5,
            }}>
              {cmd.icon}
            </div>
          )}

          {/* Name overlay (top) */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            padding: "10px 14px",
            background: "linear-gradient(180deg,rgba(6,4,2,.85) 0%,transparent 100%)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Rarity / level badge */}
              <div style={{
                fontFamily: P.ff, fontSize: 7.5, fontWeight: 700,
                color: rarColor,
                background: `${rarColor}22`,
                border: `1px solid ${rarColor}55`,
                borderRadius: 4, padding: "2px 8px", flexShrink: 0,
              }}>
                {cmd.lvl ?? 1}
              </div>
              <div style={{ fontFamily: P.ff, fontSize: 13, fontWeight: 700, color: P.gold }}>
                {cmd.n}
              </div>
              {/* Stamina */}
              <div style={{ marginLeft: "auto", fontSize: 7, color: stamColor, fontFamily: P.ff, flexShrink: 0 }}>
                ⚡ {Math.floor(stam)}/{staminaMax}
              </div>
            </div>
            <div style={{ fontSize: 7, color: P.sub, fontFamily: P.ff, marginTop: 2 }}>
              {cmd.cls} · {isAtHQ ? "🏰 At HQ" : "📍 Away"}
            </div>
          </div>

          {/* Command bar overlay (bottom) */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "6px 14px 8px",
            background: "linear-gradient(0deg,rgba(6,4,2,.9) 0%,transparent 100%)",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 6.5, color: "#5a5060", fontFamily: P.ff, marginBottom: 3,
            }}>
              <span>📡 COMMAND</span>
              <span style={{ color: fillColor }}>{+used.toFixed(1)} / {cap}</span>
            </div>
            <div style={{ height: 4, background: "#181820", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${fillPct}%`,
                background: fillColor, borderRadius: 2,
                transition: "width .3s",
              }} />
            </div>
          </div>
        </div>

        {/* Troop boxes row  ─  always visible, matches reference image */}
        <div style={{
          flexShrink: 0,
          padding: "10px 12px 6px",
          background: "#0a0c10",
          borderTop: `1px solid ${P.border}`,
        }}>
          {/* Section label */}
          <div style={{
            fontSize: 7, color: "#c8903a", fontFamily: P.ff,
            fontWeight: 700, letterSpacing: ".18em",
            marginBottom: 8,
          }}>
            STRIKE CRAFT
          </div>

          {/* Three boxes */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {slots.map((sl, i) => (
              <DetailTroopBox
                key={i}
                sl={sl}
                onClick={isAtHQ ? () => setEditOpen(true) : undefined}
              />
            ))}
          </div>

          {/* REFILL | EDIT buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            {/* REFILL – returns all troops to barracks */}
            <button
              className="btn"
              disabled={!isAtHQ || !slots.some(sl => sl?.troops > 0)}
              onClick={() => returnTroops(cmd.uid)}
              style={{
                flex: 1, padding: "8px 0",
                background: "rgba(200,180,140,.08)",
                border: "1px solid rgba(200,180,140,.3)",
                color: slots.some(sl => sl?.troops > 0) && isAtHQ ? "#d0c090" : "#3a3028",
                fontFamily: P.ff, fontSize: 9, fontWeight: 700,
                letterSpacing: ".1em", borderRadius: 4,
                cursor: isAtHQ && slots.some(sl => sl?.troops > 0) ? "pointer" : "not-allowed",
                transition: "all .12s",
              }}
            >
              REFILL
            </button>

            {/* EDIT */}
            <button
              className="btn"
              disabled={!isAtHQ}
              onClick={() => setEditOpen(true)}
              style={{
                flex: 1, padding: "8px 0",
                background: isAtHQ
                  ? "linear-gradient(135deg,#c8903a,#a06828)"
                  : "rgba(255,255,255,.03)",
                border: isAtHQ ? "1px solid #7a5018" : `1px solid ${P.border}`,
                color: isAtHQ ? "#0a0806" : "#3a3028",
                fontFamily: P.ff, fontSize: 9, fontWeight: 700,
                letterSpacing: ".1em", borderRadius: 4,
                cursor: isAtHQ ? "pointer" : "not-allowed",
                transition: "all .12s",
              }}
            >
              EDIT
            </button>
          </div>

          {!isAtHQ && (
            <div style={{
              marginTop: 6, fontSize: 7, color: "#7a5a2a",
              fontFamily: P.ffb, fontStyle: "italic", textAlign: "center",
            }}>
              Recall to HQ to modify troops
            </div>
          )}
        </div>
      </div>
    );
  })();

  // ── Outer shell ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Left: Commander list ── */}
      <div style={{
        width: 148, flexShrink: 0,
        borderRight: `1px solid ${P.border}`,
        background: "rgba(0,0,0,.3)",
        overflowY: "auto",
        padding: "6px 5px",
      }}>
        {/* Header */}
        <div style={{
          fontSize: 6, color: P.dim, fontFamily: P.ff,
          letterSpacing: ".1em", textAlign: "center", marginBottom: 6,
          paddingBottom: 5, borderBottom: `1px solid ${P.border}`,
        }}>
          {playerCmds.length} COMMANDERS
        </div>

        {playerCmds.length === 0 ? (
          <div style={{
            fontSize: 7.5, color: "#3a3028", fontFamily: P.ffb,
            fontStyle: "italic", textAlign: "center", padding: "12px 6px",
          }}>
            No commanders
          </div>
        ) : (
          playerCmds.map(cmd => <CommanderListCard key={cmd.uid} cmd={cmd} />)
        )}
      </div>

      {/* ── Right: Detail ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {rightPanel}
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
//  HEALING TENT
// -----------------------------------------------------------------------------
function RepairBayScreen({ bldgs, woundedTroops, woundedQueue, bLog, healQueue, queueHealing, autoHeal, setAutoHeal, rss, canAfford, unlockedBranches, troopCounts, barracksPool, healSpeedMult = 1 }) {
const [tab,     setTab]     = useState("wounded");
const [healAmt, setHealAmt] = useState(0);
const tentLvl  = bldgs.healingtent || 0;
const tentCap  = tentLvl * 200;
const healRate = healingRate(bldgs, healSpeedMult);
const wounded  = woundedTroops || 0;
const maxHeal = Math.min(wounded,Math.max(0,tentCap-(healQueue||[]).reduce((sum,q)=>sum+q.remaining,0)));
const sv       = Math.min(healAmt, maxHeal);

// Manual and automatic healing share the existing food price.
const healFoodCost = healingFoodCost(sv);
const canHeal = sv > 0 && (rss?.food ?? 0) >= healFoodCost && tentLvl > 0;

// ETA: how long to heal sv troops at current heal rate
const healEtaSecs = healRate > 0 ? Math.ceil(sv / Math.max(1,Math.floor(healRate/((healQueue?.length||0)+1)))) : null;
const fmtTime = (s) => s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s/60)}m ${s%60}s` : `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;

const confirmHeal = () => {
  if (!canHeal) return;
  queueHealing(sv);
  setHealAmt(0);
};

return (
<div>
<label style={{display:"flex",alignItems:"center",gap:10,minHeight:44,marginBottom:10}}>
  <input type="checkbox" role="switch" aria-label="Automatic healing" checked={!!autoHeal} onChange={e=>setAutoHeal(e.target.checked)} style={{width:30,height:30}} />
  <span>Automatic healing — uses food at the manual healing price</span>
</label>
{/* Capacity row */}
<div style={{ display:"flex", gap:8, marginBottom:10 }}>
  <div style={{ flex:1, padding:"8px 12px", background:"rgba(255,255,255,.03)", border:`1px solid ${P.border}`, borderRadius:6 }}>
    <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".08em", marginBottom:4 }}>HEALING TENT Lv{tentLvl}</div>
    <div style={{ fontSize:9, color:"#88aaff", fontFamily:P.ff, fontWeight:700, marginBottom:3 }}>
      {wounded.toLocaleString()} / {Math.max(wounded, tentCap).toLocaleString()}
    </div>
    <div style={{ height:4, background:"#181820", borderRadius:2, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${tentCap ? Math.min(100, Math.round(wounded/tentCap*100)) : 0}%`, background:"linear-gradient(90deg,#3366cc,#88aaff)", borderRadius:2 }}/>
    </div>
  </div>
  <div style={{ flex:1, padding:"8px 12px", background:"rgba(255,255,255,.03)", border:`1px solid ${P.border}`, borderRadius:6 }}>
    <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".08em", marginBottom:4 }}>HEAL RATE</div>
    <div style={{ fontSize:14, color:"#5dcc80", fontFamily:P.ff, fontWeight:700 }}>
      {healRate.toLocaleString()}<span style={{ fontSize:8, color:P.dim }}>/sec</span>
    </div>
    <div style={{ fontSize:6, color:P.dim, marginTop:2 }}>Troops per second; shared by active batches</div>
  </div>
</div>

{/* Tabs */}
<div style={{ display:"flex", marginBottom:10, borderBottom:`1px solid ${P.border}` }}>
  {[["wounded","Wounded"],["queue","Heal Queue"]].map(([t,lbl]) => (
    <button key={t} className="btn" onClick={() => setTab(t)}
      style={{ flex:1, padding:"8px", fontFamily:P.ff, fontSize:9, fontWeight:700,
        letterSpacing:".06em", textTransform:"uppercase",
        background:tab===t?"rgba(136,170,255,.1)":"transparent",
        border:"none", borderBottom:tab===t?"2px solid #88aaff":"2px solid transparent",
        color:tab===t?"#88aaff":P.dim, marginBottom:-1, borderRadius:0 }}>
      {lbl}{tab !== t && t === "queue" && (healQueue?.length > 0) ? ` (${healQueue.length})` : ""}
    </button>
  ))}
</div>

<div style={{ display:"flex", gap:10 }}>
  {/* Left: content */}
  <div style={{ flex:1 }}>
    {tab === "wounded" && (wounded === 0 ? (
      <div style={{ fontSize:8, color:"#3a3040", fontFamily:P.ffb, fontStyle:"italic", textAlign:"center", padding:"20px 0" }}>
        No wounded troops at the moment.
      </div>
    ) : (
      <div style={{ padding:"10px 12px", background:"rgba(50,100,180,.07)", border:"1px solid rgba(80,140,220,.2)", borderRadius:6 }}>
        <div style={{ fontFamily:P.ff, fontSize:11, color:"#88aaff", fontWeight:700, marginBottom:4 }}>
          ⛺ {wounded.toLocaleString()} Wounded
        </div>
        <div style={{ fontSize:8, color:"#6a7a9a", fontFamily:P.ffb, lineHeight:1.7 }}>
          30% of battle casualties recover here. Queue them for healing below.
        </div>
      </div>
    ))}
    {tab === "queue" && (
      !healQueue?.length ? (
        <div style={{ fontSize:8, color:"#3a3040", fontFamily:P.ffb, fontStyle:"italic", textAlign:"center", padding:"20px 0" }}>
          Heal queue is empty.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {healQueue.map(q => {
            const pct = Math.round((1 - q.remaining / q.total) * 100);
            const etaS = Math.ceil(q.remaining / Math.max(1,Math.floor(q.rate/healQueue.length)));
            return (
              <div key={q.id} style={{ padding:"8px 10px", background:"rgba(50,100,180,.07)", border:"1px solid rgba(80,140,220,.2)", borderRadius:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:9, color:"#88aaff", fontFamily:P.ff, fontWeight:700 }}>
                    💉 {q.remaining.toLocaleString()} / {q.total.toLocaleString()}
                  </span>
                  <span style={{ fontSize:7, color:P.dim, fontFamily:P.ff }}>~{typeof etaS === "number" ? fmtTime(etaS) : etaS}</span>
                </div>
                <div style={{ height:3, background:"#181820", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#3366cc,#5dcc80)", borderRadius:2 }}/>
                </div>
              </div>
            );
          })}
        </div>
      )
    )}
    {tentLvl < 1 && (
      <div style={{ marginTop:8, fontSize:8, color:"#cc6030", fontFamily:P.ff }}>
        ⚠ Build a Healing Tent to recover wounded troops.
      </div>
    )}
  </div>

  {/* Right: heal panel */}
  <div style={{ width:128, flexShrink:0, padding:"10px 12px", background:"rgba(255,255,255,.02)", border:`1px solid ${P.border}`, borderRadius:8 }}>
    <div style={{ textAlign:"center", marginBottom:8 }}>
      <div style={{ fontSize:26, fontWeight:700, color:wounded>0?"#88aaff":"#2a2a3a", fontFamily:P.ff }}>{wounded.toLocaleString()}</div>
      <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".08em" }}>WOUNDED</div>
    </div>
    {wounded > 0 && tentLvl > 0 && (<>
      <input type="range" min={0} max={Math.max(1,maxHeal)} value={sv}
        step={1}
        onChange={e => { const v=+e.target.value; setHealAmt(v); }}
        onInput={e => { const v=+e.target.value; setHealAmt(v); }}
        style={{ width:"100%", accentColor:"#88aaff", marginBottom:6 }}/>
      <button className="btn" onClick={() => setHealAmt(maxHeal)}
        style={{ width:"100%", marginBottom:4, padding:"5px",
          background:"rgba(255,255,255,.05)", border:`1px solid ${P.border}`,
          color:P.sub, fontSize:8, fontFamily:P.ff, fontWeight:700, borderRadius:4 }}>
        MAX
      </button>
      {sv > 0 && (
        <div style={{ marginBottom:6, padding:"5px 6px", background:"rgba(255,255,255,.03)", border:`1px solid ${P.border}`, borderRadius:4 }}>
          <div style={{ fontSize:7, color:"#80b040", fontFamily:P.ff }}>🌾 {healFoodCost.toLocaleString()} food</div>
          {healEtaSecs && <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, marginTop:2 }}>⏱ ~{fmtTime(healEtaSecs)}</div>}
          {(rss?.food ?? 0) < healFoodCost && <div style={{ fontSize:6, color:"#cc3030", fontFamily:P.ff, marginTop:2 }}>Not enough food</div>}
        </div>
      )}
      <button className="btn" disabled={!canHeal} onClick={confirmHeal}
        style={{ width:"100%", padding:"6px",
          background:canHeal?"linear-gradient(135deg,rgba(60,120,220,.4),rgba(60,120,220,.2))":"rgba(255,255,255,.02)",
          border:`1px solid ${canHeal?"rgba(80,140,255,.5)":"#181818"}`,
          color:canHeal?"#88aaff":"#2a2a3a",
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
function MarketplaceScreen({ rss, setRss, mysticOrbs, mysticOrbsCap, voidTapLvl, voidTapReady, lastVoidTap, voidTapCooldown, doVoidTap, quarterLevels, marketplaceLvl }) {
const TRADE_RATE = marketplaceRate(marketplaceLvl || 0);
const [fromKey, setFromKey] = useState("stone");
const [toKey,   setToKey]   = useState("wood");
const [amount,  setAmount]  = useState(0);
const [now,     setNow]     = useState(Date.now());

// Tick every second to update the cooldown countdown
useEffect(() => {
  if (!lastVoidTap) return;
  const id = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(id);
}, [lastVoidTap]);

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
  <div style={{ display:"flex", flexDirection:"column", height:"100%", padding:"10px 14px", gap:10, boxSizing:"border-box" }}>

    <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".12em", fontWeight:700,
      paddingBottom:4, borderBottom:`1px solid ${P.border}`, flexShrink:0 }}>
      MARKETPLACE
    </div>

    <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, minHeight:0 }}>

      {/* LEFT: Trade */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ display:"flex", gap:6, alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:6, color:P.dim, fontFamily:P.ff, letterSpacing:".1em", marginBottom:3 }}>TRADE AWAY</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:3 }}>
              {RKEYS.map(k => {
                const r = RSS[k];
                const active = fromKey === k;
                return (
                  <button key={k} className="btn"
                    onClick={() => { setFromKey(k); if (toKey===k) setToKey(RKEYS.find(x=>x!==k)); setAmount(0); }}
                    style={{ padding:"5px 3px", textAlign:"center",
                      background:active ? r.col+"22" : "rgba(255,255,255,.02)",
                      border:"1px solid "+(active ? r.col : P.border),
                      color:active ? r.col : P.sub, fontSize:7 }}>
                    <div style={{ fontSize:12 }}>{r.icon}</div>
                    <div style={{ fontFamily:P.ff, fontSize:6 }}>{r.lbl}</div>
                    <div style={{ fontSize:5.5, color:active ? r.col : "#3a3a4a", marginTop:1 }}>{Math.floor(rss[k]).toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, color:P.dim, flexShrink:0, paddingTop:14 }}>{">"}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:6, color:P.dim, fontFamily:P.ff, letterSpacing:".1em", marginBottom:3 }}>RECEIVE</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:3 }}>
              {RKEYS.map(k => {
                const r = RSS[k];
                const active = toKey === k;
                const disabled = k === fromKey;
                return (
                  <button key={k} className="btn" onClick={() => { if (!disabled) setToKey(k); }}
                    style={{ padding:"5px 3px", textAlign:"center",
                      background:active ? r.col+"22" : "rgba(255,255,255,.02)",
                      border:"1px solid "+(active ? r.col : P.border),
                      color:disabled ? "#2a2a2a" : active ? r.col : P.sub,
                      fontSize:7, opacity:disabled ? 0.35 : 1, cursor:disabled ? "not-allowed" : "pointer" }}>
                    <div style={{ fontSize:12 }}>{r.icon}</div>
                    <div style={{ fontFamily:P.ff, fontSize:6 }}>{r.lbl}</div>
                    <div style={{ fontSize:5.5, color:active ? r.col : "#3a3a4a", marginTop:1 }}>{Math.floor(rss[k]).toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:7,
            color:"#6a5a4a", fontFamily:P.ff, marginBottom:3 }}>
            <span>AMOUNT</span>
            <span style={{ color:P.gold, fontWeight:700 }}>{safeAmount.toLocaleString()} {RSS[fromKey] ? RSS[fromKey].icon : ""}</span>
          </div>
          <input type="range" min={0} max={Math.max(1, maxTrade)} value={safeAmount}
            onChange={e => setAmount(+e.target.value)} onInput={e => setAmount(+e.target.value)}
            style={{ width:"100%", accentColor:RSS[fromKey] ? RSS[fromKey].col : P.gold, marginBottom:3 }}/>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:6, color:"#4a4a5a" }}>
            <span>0</span>
            <span style={{ color:"#5a6a5a" }}>{maxTrade.toLocaleString()} avail</span>
            <span>{maxTrade.toLocaleString()}</span>
          </div>
        </div>

        {safeAmount > 0 && fromKey !== toKey && (
          <div style={{ padding:"6px 8px", background:"rgba(240,192,64,.06)",
            border:"1px solid rgba(240,192,64,.2)", borderRadius:4,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:8, color:P.sub, fontFamily:P.ff }}>
              <span style={{ color:RSS[fromKey] ? RSS[fromKey].col : "" }}>{RSS[fromKey] ? RSS[fromKey].icon : ""} {safeAmount.toLocaleString()}</span>
              {" -> "}
              <span style={{ color:RSS[toKey] ? RSS[toKey].col : "" }}>{RSS[toKey] ? RSS[toKey].icon : ""} {receive.toLocaleString()}</span>
            </div>
            <div style={{ fontSize:6, color:"#5a5a3a" }}>{Math.round(TRADE_RATE*100)}% rate</div>
          </div>
        )}

        <button className="btn" disabled={!canTrade} onClick={doTrade}
          style={{ width:"100%", padding:"10px", marginTop:"auto",
            background:canTrade ? "linear-gradient(135deg,rgba(200,160,64,.4),rgba(200,160,64,.15))" : "rgba(255,255,255,.02)",
            border:"1px solid "+(canTrade ? "#8a6020" : "#181818"),
            color:canTrade ? P.gold : "#2a2a2a", fontSize:11, fontWeight:700 }}>
          {canTrade
            ? ("Trade " + safeAmount.toLocaleString() + " " + (RSS[fromKey] ? RSS[fromKey].icon : "") + " -> " + receive.toLocaleString() + " " + (RSS[toKey] ? RSS[toKey].icon : ""))
            : (fromKey===toKey ? "Select different resources" : "Select amount")}
        </button>
      </div>

      {/* RIGHT: Void Tap */}
      {(function() {
        var tapYield    = voidTapYield(quarterLevels);
        var msRemaining = lastVoidTap ? Math.max(0, voidTapCooldown - (now - lastVoidTap)) : 0;
        var cooldownStr = fmtCooldown(msRemaining);
        var fillPct     = mysticOrbsCap > 0 ? Math.min(1, (mysticOrbs || 0) / mysticOrbsCap) : 0;
        var isFull      = (mysticOrbs || 0) >= mysticOrbsCap;
        var notBuilt    = !voidTapLvl || voidTapLvl < 1;
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:8,
            padding:"10px 12px", background:"rgba(80,10,120,.12)",
            border:"1px solid rgba(120,40,180,.28)", borderRadius:6 }}>
            <div style={{ fontSize:6, color:"#9955cc", fontFamily:P.ff, letterSpacing:".12em",
              fontWeight:700, paddingBottom:4, borderBottom:"1px solid rgba(120,40,180,.2)" }}>
              VOID TAP
            </div>
            {notBuilt ? (
              <div style={{ flex:1, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", textAlign:"center", gap:6 }}>
                <div style={{ fontFamily:P.ff, fontSize:8, color:"#7a4a9a" }}>NOT BUILT</div>
                <div style={{ fontFamily:"'Crimson Pro',serif", fontSize:9, color:P.sub, fontStyle:"italic" }}>
                  Build the Void Tap in Architecture
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8, flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div>
                      <div style={{ fontFamily:P.ff, fontSize:8, color:"#bb66ff", letterSpacing:".06em" }}>MYSTIC ORBS</div>
                      <div style={{ fontFamily:P.ff, fontSize:7, color:P.sub }}>{"Lv"+voidTapLvl+" Cap "+(mysticOrbsCap||0).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:P.ff, fontSize:13, color:"#cc88ff", fontWeight:700 }}>{(mysticOrbs||0).toLocaleString()}</div>
                    <div style={{ fontFamily:P.ff, fontSize:6, color:P.dim }}>{"/ "+(mysticOrbsCap||0).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ height:5, background:"rgba(255,255,255,.05)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:3, width:(fillPct*100)+"%",
                    background: isFull ? "linear-gradient(90deg,#aa44ff,#cc88ff)" : "linear-gradient(90deg,#6622aa,#aa44ff)",
                    transition:"width .4s ease", boxShadow: isFull ? "0 0 6px #aa44ff" : "none" }}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"5px 8px", background:"rgba(255,255,255,.03)",
                  border:"1px solid rgba(120,40,180,.2)", borderRadius:4 }}>
                  <div style={{ fontFamily:P.ff, fontSize:7, color:P.sub }}>TAP YIELD</div>
                  <div style={{ fontFamily:P.ff, fontSize:8, color: tapYield > 0 ? "#cc88ff" : P.dim }}>
                    {tapYield > 0 ? "+"+tapYield.toLocaleString()+" orbs" : "Upgrade quarters"}
                  </div>
                </div>
                {(!voidTapReady && !isFull) ? (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"5px 8px", background:"rgba(255,255,255,.02)",
                    border:"1px solid rgba(80,40,120,.2)", borderRadius:4 }}>
                    <div style={{ fontFamily:P.ff, fontSize:7, color:P.dim }}>NEXT TAP IN</div>
                    <div style={{ fontFamily:P.ff, fontSize:8, color:"#8855bb" }}>{cooldownStr}</div>
                  </div>
                ) : null}
                {isFull ? (
                  <div style={{ textAlign:"center", fontFamily:P.ff, fontSize:7, color:"#aa55ff", letterSpacing:".06em" }}>
                    POOL FULL
                  </div>
                ) : null}
                <button className="btn" disabled={!voidTapReady} onClick={doVoidTap}
                  style={{ width:"100%", padding:"12px", marginTop:"auto",
                    background: voidTapReady
                      ? "linear-gradient(135deg,rgba(140,40,220,.5),rgba(80,10,140,.4))"
                      : "rgba(255,255,255,.02)",
                    border:"1px solid "+(voidTapReady ? "#8833cc" : "#1a1020"),
                    color: voidTapReady ? "#cc88ff" : "#3a2a4a",
                    fontSize:12, fontWeight:700, letterSpacing:".1em",
                    boxShadow: voidTapReady ? "0 0 12px rgba(140,40,220,.3)" : "none",
                    transition:"all .2s" }}>
                  {isFull ? "POOL FULL"
                    : voidTapReady ? ("VOID TAP +" + tapYield.toLocaleString() + " ORBS")
                    : ("VOID TAP (" + cooldownStr + ")")}
                </button>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  </div>
);
}

//  ROOT HQMenu
// -----------------------------------------------------------------------------
export default memo(function HQMenu({
hqOpen, setHqOpen, hqTab, setHqTab,
cmds, setCmds, tiles, rss, setRss, gems, pKeys,
bldgs, setBldgs, barracksPool, setBarracks, woundedTroops, woundedQueue,
trainingQueues, setTrainingQueues, trainSlider, setTrainSlider,
healQueue, setHealQueue, setWounded, setWoundedQueue, queueHealing, autoHeal, setAutoHeal, trainingSpeedMult,
trainingCostMult = 1, healSpeedMult = 1,
neutralSources = {}, contractCommandsLeft,
upgQueue, sliderVals, setSliderVals, bLog,
upgrade, canAfford, assignTroops, returnTroops, queueTraining, troopCounts, setTroopCounts, setTroopSlot, setArmySlots,
recallMarch, setScreen, gearInventory, playerHqKey,
facKey, unlockedBranches, setUnlockedBranches,
quarterLevels, setQuarterLevels,
mysticOrbs, mysticOrbsCap, voidTapLvl, voidTapReady,
lastVoidTap, voidTapCooldown, doVoidTap,
troopSkillLevels, setTroopSkillLevels, setMysticOrbs,
}) {
  const { staminaMax = 150 } = useGameContext();
if (!hqOpen) return null;

const isHub = hqTab === "hub";

// Parchment shell constants
const PARCHMENT_BG = "#b8986a";
const PAPER_BG_OUTER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`;

return (
<div style={{ position:"fixed", inset:0, zIndex:400,
background: isHub ? PARCHMENT_BG : P.bg,
display:"flex", flexDirection:"column",
paddingLeft:"var(--sal, 0px)",
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
    paddingTop:"calc(var(--sat) + 18px)",
    borderBottom: isHub ? "2px solid #7a5028" : `1px solid ${P.border}`,
    display:"flex", alignItems:"center", justifyContent:"center",
    flexShrink:0,
    background: isHub ? "transparent" : "rgba(0,0,0,.4)" }}>

    {/* Back button */}
    {hqTab !== "hub" && (
      <button onClick={() => setHqTab("hub")}
        style={{ position:"absolute", left:24, minHeight:36, minWidth:72,
          background:"rgba(255,255,255,.06)", border:`1px solid ${P.border}`,
          color:P.sub, fontSize:12, padding:"6px 14px", borderRadius:5, cursor:"pointer", touchAction:"manipulation" }}>
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
        fontSize:13, padding:"6px 14px", minHeight:36, minWidth:44, borderRadius:5, cursor:"pointer", touchAction:"manipulation" }}>
      {isHub ? "✕" : "✕ Close"}
    </button>
  </div>

  {/* Content */}
  {(() => {
    const splitLayout = hqTab === "buildings" || hqTab === "army" || hqTab === "troops";
    const isTroops = hqTab === "troops";
    return (
      <div
        className={isTroops ? "training-parent" : "scr"}
        style={{
          flex: 1,
          overflowY: splitLayout ? "hidden" : "auto",
          minHeight: 0,
          padding: (isHub || splitLayout) ? 0 : 14,
          display: isHub ? "flex" : splitLayout ? "flex" : "block",
          flexDirection: "column",
          position: "relative",
          zIndex: 2,
          // Critical for iOS: .scr forces touch-action:pan-y which blocks horizontal scroll
          touchAction: isTroops ? "pan-x" : undefined,
        }}
      >

        {hqTab === "hub" && <HubScreen setHqTab={setHqTab}/>}

        {hqTab === "buildings" && (
          <InfrastructureScreen
            bldgs={bldgs} setBldgs={setBldgs} rss={rss} setRss={setRss} canAfford={canAfford}
            upgrade={upgrade} upgQueue={upgQueue} cmds={cmds} facKey={facKey}
            quarterLevels={quarterLevels} setQuarterLevels={setQuarterLevels}
            setUnlockedBranches={setUnlockedBranches}
            troopSkillLevels={troopSkillLevels} setTroopSkillLevels={setTroopSkillLevels}
            mysticOrbs={mysticOrbs} setMysticOrbs={setMysticOrbs}/>
        )}
        {hqTab === "commandcenter" && (
          <CommandCenterScreen cmds={cmds} pKeys={pKeys} rss={rss} gems={gems}
            bldgs={bldgs} bLog={bLog} tiles={tiles}/>
        )}
        {hqTab === "troops" && (
          <StrikeCraftScreen bldgs={bldgs} barracksPool={barracksPool}
            troopCounts={troopCounts}
            trainingQueues={trainingQueues} setTrainingQueues={setTrainingQueues} canAfford={canAfford}
            queueTraining={queueTraining} rss={rss} cmds={cmds}
            unlockedBranches={unlockedBranches}
            trainingSpeedMult={trainingSpeedMult} trainingCostMult={trainingCostMult}
            neutralSources={neutralSources} contractCommandsLeft={contractCommandsLeft}
            healQueue={healQueue}
            discardTroops={(bKey, n) => {
              if (bKey) setTroopCounts(prev => ({ ...prev, [bKey]: Math.max(0, (prev[bKey]||0) - n) }));
            }}/>
        )}
        {hqTab === "army" && (
          <BattleGroupsScreen cmds={cmds} setCmds={setCmds} bldgs={bldgs}
            barracksPool={barracksPool} setBarracks={setBarracks}
            troopCounts={troopCounts} setTroopSlot={setTroopSlot} setArmySlots={setArmySlots}
            sliderVals={sliderVals} setSliderVals={setSliderVals}
            assignTroops={assignTroops} returnTroops={returnTroops}
            playerHqKey={playerHqKey} unlockedBranches={unlockedBranches}
            staminaMax={staminaMax}/>
        )}
        {hqTab === "repairbay" && (
          <RepairBayScreen bldgs={bldgs} woundedTroops={woundedTroops}
            woundedQueue={woundedQueue} bLog={bLog}
            healQueue={healQueue} queueHealing={queueHealing} autoHeal={autoHeal} setAutoHeal={setAutoHeal}
            rss={rss} setRss={setRss} canAfford={canAfford}
            unlockedBranches={unlockedBranches} troopCounts={troopCounts}
            barracksPool={barracksPool} healSpeedMult={healSpeedMult}
          />
        )}
        {hqTab === "marketplace" && (
          <MarketplaceScreen rss={rss} setRss={setRss}
            mysticOrbs={mysticOrbs} mysticOrbsCap={mysticOrbsCap}
            voidTapLvl={voidTapLvl} voidTapReady={voidTapReady}
            lastVoidTap={lastVoidTap} voidTapCooldown={voidTapCooldown}
            doVoidTap={doVoidTap} quarterLevels={quarterLevels}
            marketplaceLvl={bldgs.marketplace||0}
          />
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