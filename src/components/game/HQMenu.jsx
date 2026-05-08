import { useState, memo } from "react";
import { FACTION_TROOPS, COMMAND_COST } from "../../../shared/constants/troops.js";
import { RSS, RKEYS, HQP } from "../../../shared/constants/map.js";
import { BLDG, barracksCapacity, maxAvailLevel, upgCost, upgDuration, cmdCommand, trainRate, maxTrainBatch } from "../../../shared/constants/buildings.js";
import { RC, RARITY, CLASS, respectCost, RESPECT_MAX, SS } from "../../../shared/constants/heroes.js";
const SC = RC;

// ── Palette ───────────────────────────────────────────────────────────────────
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

// ── Tile nav buttons (the 6 sections on the hub screen) ───────────────────────
const HUB_TILES = [
  { id:"buildings",     icon:"🏛",  label:"Architecture",   color:"#c8903a" },
  { id:"commandcenter", icon:"📊",  label:"Command Center", color:"#4488cc" },
  { id:"troops",        icon:"⚔️",  label:"Training",       color:"#cc4444" },
  { id:"army",          icon:"🪖",  label:"Army",           color:"#6aaa40" },
  { id:"repairbay",     icon:"⛺",  label:"Healing Tent",   color:"#5588dd" },
  { id:"marketplace",   icon:"🏪",  label:"Marketplace",    color:"#aa55cc" },
];

// ── Small section header ──────────────────────────────────────────────────────
function SectionHeader({ children }) {
  return (
    <div style={{ fontSize:8, color:P.dim, letterSpacing:".12em", fontFamily:P.ff,
      fontWeight:700, marginBottom:8, paddingBottom:4, borderBottom:`1px solid ${P.border}` }}>
      {children}
    </div>
  );
}

// ── Resource pill ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
//  HUB SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function HubScreen({ setHqTab }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", padding:8 }}>
      {/* 6-tile hub grid — fills full space */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr",
        gridTemplateRows:"1fr 1fr 1fr", gap:8 }}>
        {HUB_TILES.map(tile => (
          <button key={tile.id} onClick={() => setHqTab(tile.id)}
            style={{
              position:"relative",
              background:`linear-gradient(145deg, rgba(255,255,255,.04), rgba(255,255,255,.01))`,
              border:`1px solid ${tile.color}44`,
              borderRadius:8, cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", gap:10,
              transition:"background .15s, border-color .15s, box-shadow .15s",
              boxShadow:`inset 0 1px 0 ${tile.color}22`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background=`linear-gradient(145deg, ${tile.color}18, ${tile.color}08)`;
              e.currentTarget.style.borderColor=`${tile.color}88`;
              e.currentTarget.style.boxShadow=`0 0 20px ${tile.color}22, inset 0 1px 0 ${tile.color}44`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background=`linear-gradient(145deg, rgba(255,255,255,.04), rgba(255,255,255,.01))`;
              e.currentTarget.style.borderColor=`${tile.color}44`;
              e.currentTarget.style.boxShadow=`inset 0 1px 0 ${tile.color}22`;
            }}>
            <div style={{ fontSize:32 }}>{tile.icon}</div>
            <div style={{ fontFamily:P.ff, fontSize:10, fontWeight:700,
              color:tile.color, letterSpacing:".08em", textTransform:"uppercase" }}>
              {tile.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ARCHITECTURE — full-screen left-nav layout
// ─────────────────────────────────────────────────────────────────────────────

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

  if (isMax) return <div style={{ fontSize:9, color:P.gold, fontFamily:P.ff, fontWeight:700 }}>MAX</div>;
  if (inProg) {
    const pct = Math.max(0, Math.min(100, ((Date.now()-inProg.startedAt)/inProg.dur)*100));
    const secsLeft = Math.max(0, Math.ceil((inProg.endsAt-Date.now())/1000));
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

function QuarterDetail({ fKey, fDef, bldgs, setBldgs, rss, canAfford }) {
  const [selBranch, setSelBranch] = useState(null);
  const qLvl = bldgs[`q_${fKey}`] || 0;
  const qMax = 10;
  const qCost = QUARTER_UPGRADE_COST(qLvl);
  const qOk = qLvl < qMax && canAfford(qCost);

  const upgradeQuarter = () => {
    if (!qOk) return;
    setBldgs(b => ({ ...b, [`q_${fKey}`]: (b[`q_${fKey}`]||0) + 1 }));
  };

  const upgradeBranch = (branchKey) => {
    const bLvl = bldgs[`b_${fKey}_${branchKey}`] || 0;
    if (bLvl >= 10) return;
    const cost = BRANCH_UPGRADE_COST(bLvl);
    if (!canAfford(cost)) return;
    setBldgs(b => ({ ...b, [`b_${fKey}_${branchKey}`]: (b[`b_${fKey}_${branchKey}`]||0) + 1 }));
  };

  return (
    <div style={{ padding:"16px 20px" }}>
      {/* Quarter header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16,
        padding:"12px 14px", background:`${fDef.c}11`, border:`1px solid ${fDef.c}44`, borderRadius:8 }}>
        <div style={{ fontSize:36 }}>{fDef.s}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:P.ff, fontSize:15, fontWeight:700, color:fDef.c }}>{fDef.quarters}</div>
          <div style={{ fontSize:9, color:P.sub, marginTop:2 }}>{fDef.n} · Quarter Lv{qLvl}/{qMax}</div>
          <LevelBar lvl={qLvl} max={qMax} color={fDef.c} />
        </div>
        <div style={{ textAlign:"right" }}>
          {qLvl < qMax ? (
            <button className="btn" disabled={!qOk} onClick={upgradeQuarter}
              style={{ padding:"6px 14px", fontSize:10, fontWeight:700,
                background: qOk ? `linear-gradient(135deg,${fDef.c}44,${fDef.c}18)` : "rgba(255,255,255,.02)",
                border: `1px solid ${qOk ? fDef.c : "#1e1810"}`,
                color: qOk ? fDef.c : "#2a2a2a", borderRadius:4 }}>
              ↑ Lv{qLvl+1}
            </button>
          ) : (
            <div style={{ fontSize:9, color:fDef.c, fontFamily:P.ff, fontWeight:700 }}>MAX</div>
          )}
        </div>
      </div>

      {/* Branches */}
      <div style={{ fontSize:8, color:P.dim, fontFamily:P.ff, letterSpacing:".1em", marginBottom:10 }}>TROOP BRANCHES</div>
      {fDef.branches.map(br => {
        const bKey = `b_${fKey}_${br.key}`;
        const bLvl = bldgs[bKey] || 0;
        const bMax = 10;
        const bCost = BRANCH_UPGRADE_COST(bLvl);
        const bOk   = bLvl < bMax && canAfford(bCost);
        const isSelected = selBranch === br.key;
        const dmgColor = br.dmgType === "magical" ? "#a855f7" : "#e08050";

        return (
          <div key={br.key} style={{ marginBottom:8,
            border:`1px solid ${isSelected ? fDef.c+"88" : P.border}`,
            borderRadius:8, overflow:"hidden",
            background: isSelected ? `${fDef.c}0a` : "rgba(255,255,255,.02)" }}>
            {/* Branch header — clickable to expand */}
            <div onClick={() => setSelBranch(isSelected ? null : br.key)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                  <span style={{ fontFamily:P.ff, fontSize:11, fontWeight:700, color:P.text }}>{br.label}</span>
                  <span style={{ fontSize:7, color:dmgColor, background:`${dmgColor}18`, padding:"1px 5px", borderRadius:3 }}>
                    {br.size} · {br.dmgType}
                  </span>
                </div>
                <div style={{ fontSize:8, color:P.sub }}>Lv{bLvl}/{bMax}</div>
                <LevelBar lvl={bLvl} max={bMax} color={fDef.c} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {bLvl < bMax ? (
                  <button className="btn" disabled={!bOk}
                    onClick={e => { e.stopPropagation(); upgradeBranch(br.key); }}
                    style={{ padding:"4px 10px", fontSize:9, fontWeight:700,
                      background: bOk ? `linear-gradient(135deg,${fDef.c}44,${fDef.c}18)` : "rgba(255,255,255,.02)",
                      border: `1px solid ${bOk ? fDef.c : "#1e1810"}`,
                      color: bOk ? fDef.c : "#2a2a2a", borderRadius:4 }}>
                    ↑ Lv{bLvl+1}
                  </button>
                ) : (
                  <div style={{ fontSize:9, color:fDef.c, fontFamily:P.ff, fontWeight:700 }}>MAX</div>
                )}
                <span style={{ fontSize:10, color:P.dim }}>{isSelected ? "▲" : "▼"}</span>
              </div>
            </div>
            {/* Expanded: show tiers */}
            {isSelected && (
              <div style={{ padding:"0 14px 12px", borderTop:`1px solid ${P.border}` }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginTop:10 }}>
                  {br.tiers.map((t, idx) => {
                    const unlocked = bLvl > idx * 3;
                    return (
                      <div key={idx} style={{ padding:"8px 10px", borderRadius:6, textAlign:"center",
                        background: unlocked ? `${fDef.c}15` : "rgba(255,255,255,.02)",
                        border: `1px solid ${unlocked ? fDef.c+"44" : P.border}`,
                        opacity: unlocked ? 1 : 0.4 }}>
                        <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, marginBottom:4 }}>
                          {unlocked ? `Lv${idx+1}` : `🔒 Need Lv${idx*3+1}`}
                        </div>
                        <div style={{ fontFamily:P.ff, fontSize:9, fontWeight:700, color: unlocked ? fDef.c : P.dim }}>
                          {t.label}
                        </div>
                        <div style={{ fontSize:7, color:P.sub, marginTop:3, lineHeight:1.5 }}>
                          HP {t.hp} · DEF {t.def}<br/>
                          DMG {t.dmgLo}–{t.dmgHi}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfrastructureScreen({ bldgs, setBldgs, rss, canAfford, upgrade, upgQueue }) {
  const [sel, setSel] = useState("hq");

  // Left nav items: all buildings + each quarter
  const BLDG_KEYS = ["hq","walls","quarry","lumber","forge","refinery","barracks","training","commandcenter","healingtent"];

  // Get quarter data from FACTION_TROOPS
  const quarters = Object.entries(FACTION_TROOPS).map(([fKey, fDef]) => ({
    fKey, ...fDef,
    n: { marines:"Marines", pirates:"Pirates", bountyhunters:"Wizards", merfolk:"MerFolk", orcs:"Orcs", dragons:"Dragons" }[fKey] || fKey,
    s: { marines:"⚓", pirates:"🏴", bountyhunters:"🔮", merfolk:"🌊", orcs:"⚔️", dragons:"🐉" }[fKey] || "⚑",
    c: { marines:"#4488cc", pirates:"#d4832a", bountyhunters:"#9955dd", merfolk:"#30b8c8", orcs:"#6aa830", dragons:"#cc3030" }[fKey] || "#888",
  }));

  const isQuarter = sel.startsWith("q_");
  const quarterFKey = isQuarter ? sel.slice(2) : null;
  const quarterData = quarterFKey ? quarters.find(q => q.fKey === quarterFKey) : null;

  return (
    <div style={{ display:"flex", height:"100%", gap:0 }}>

      {/* ── Left sidebar ── */}
      <div style={{ width:72, flexShrink:0, overflowY:"auto", borderRight:`1px solid ${P.border}`,
        background:"rgba(0,0,0,.3)", display:"flex", flexDirection:"column", gap:2, padding:"6px 4px" }}>

        {/* Buildings section label */}
        <div style={{ fontSize:6, color:P.dim, fontFamily:P.ff, letterSpacing:".1em",
          textAlign:"center", paddingBottom:4, marginBottom:2, borderBottom:`1px solid ${P.border}` }}>
          BLDGS
        </div>

        {BLDG_KEYS.map(key => {
          const def = BLDG[key];
          const lvl = bldgs[key]||0;
          const isActive = sel === key;
          return (
            <button key={key} onClick={() => setSel(key)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                padding:"6px 4px", borderRadius:6, cursor:"pointer",
                background: isActive ? "rgba(240,192,64,.12)" : "transparent",
                border: `1px solid ${isActive ? P.gold+"44" : "transparent"}`,
                transition:"all .15s" }}>
              <div style={{ fontSize:18 }}>{def?.icon}</div>
              <div style={{ fontSize:6, color: isActive ? P.gold : P.dim, fontFamily:P.ff,
                textAlign:"center", lineHeight:1.2 }}>{def?.n?.split(" ")[0]}</div>
              <div style={{ fontSize:6, color: isActive ? P.gold : "#3a3028" }}>Lv{lvl}</div>
            </button>
          );
        })}

        {/* Quarters section label */}
        <div style={{ fontSize:6, color:P.dim, fontFamily:P.ff, letterSpacing:".1em",
          textAlign:"center", paddingBottom:4, marginTop:6, marginBottom:2,
          borderTop:`1px solid ${P.border}`, paddingTop:6 }}>
          QUARTERS
        </div>

        {quarters.map(q => {
          const qKey = `q_${q.fKey}`;
          const isActive = sel === qKey;
          const qLvl = bldgs[qKey] || 0;
          return (
            <button key={qKey} onClick={() => setSel(qKey)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                padding:"6px 4px", borderRadius:6, cursor:"pointer",
                background: isActive ? `${q.c}18` : "transparent",
                border: `1px solid ${isActive ? q.c+"66" : "transparent"}`,
                transition:"all .15s" }}>
              <div style={{ fontSize:18 }}>{q.s}</div>
              <div style={{ fontSize:6, color: isActive ? q.c : P.dim, fontFamily:P.ff,
                textAlign:"center", lineHeight:1.2 }}>{q.n}</div>
              <div style={{ fontSize:6, color: isActive ? q.c : "#3a3028" }}>Lv{qLvl}</div>
            </button>
          );
        })}
      </div>

      {/* ── Right detail panel ── */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {isQuarter && quarterData ? (
          <QuarterDetail
            fKey={quarterFKey} fDef={quarterData}
            bldgs={bldgs} setBldgs={setBldgs}
            rss={rss} canAfford={canAfford} />
        ) : (
          <BuildingDetail
            bKey={sel} bldgs={bldgs} rss={rss}
            canAfford={canAfford} upgrade={upgrade} upgQueue={upgQueue} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMMAND CENTER (Overview)
// ─────────────────────────────────────────────────────────────────────────────
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
          const rate = (bldgs[bldgKey]||0) * (BLDG[bldgKey]?.rate||0);
          const tileProd = Object.values(tiles).filter(t=>t.owner==="player"&&t.rss===k).length * 50;
          return (
            <div key={k} style={{ background:RSS[k].bg, border:`1px solid ${RSS[k].col}30`, borderRadius:5, padding:"8px 10px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:9, color:RSS[k].col, fontFamily:P.ff, fontWeight:700 }}>{RSS[k].icon} {RSS[k].lbl}</div>
                {(rate+tileProd)>0 && <div style={{ fontSize:7, color:RSS[k].col, opacity:.7, fontFamily:P.ff }}>+{rate+tileProd}/s</div>}
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:P.text, fontFamily:P.ff, marginTop:2 }}>
                {Math.floor(rss[k]).toLocaleString()}
              </div>
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

// ─────────────────────────────────────────────────────────────────────────────
//  STRIKE CRAFT (Troops / Training)
// ─────────────────────────────────────────────────────────────────────────────
function StrikeCraftScreen({ bldgs, barracksPool, trainingQueue, trainSlider, setTrainSlider, canAfford, queueTraining, rss }) {
  const cap      = barracksCapacity(bldgs.barracks||0);
  const pct      = Math.min(100, Math.round((barracksPool/cap)*100));
  const room     = cap - barracksPool;
  const maxBatch = maxTrainBatch(bldgs.training||0);
  const sliderMax = Math.max(1, Math.min(maxBatch, room));
  const sv       = Math.min(trainSlider, sliderMax);
  const cost     = { stone:sv*2, wood:sv*2, ore:sv, gas:Math.floor(sv*0.5) };
  const affordable = canAfford(cost);
  const rate     = trainRate(bldgs.training||0);
  const estSecs  = sv > 0 ? Math.ceil(sv/rate) : 0;
  const canQueue = !trainingQueue && sv > 0 && affordable && room > 0;
  return (
    <div>
      <SectionHeader>TRAINING</SectionHeader>
      {/* Barracks capacity */}
      <div style={{ marginBottom:12, padding:"10px 12px", background:"rgba(255,255,255,.03)",
        border:`1px solid ${P.border}`, borderRadius:6 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div style={{ fontFamily:P.ff, fontSize:11, color:"#c8a060", fontWeight:700 }}>🏕 BARRACKS — Lv{bldgs.barracks||0}</div>
          <div style={{ fontFamily:P.ff, fontSize:13,
            color:pct>50?"#3daa60":pct>10?"#d0a030":"#cc3030", fontWeight:700 }}>
            {barracksPool.toLocaleString()} / {cap.toLocaleString()}
          </div>
        </div>
        <div style={{ height:6, background:"#181820", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`,
            background:pct>50?"#3daa60":pct>10?"#d0a030":"#cc3030",
            borderRadius:3, transition:"width .3s" }}/>
        </div>
      </div>
      {/* Active queue */}
      {trainingQueue && (() => {
        const qPct    = Math.round(((trainingQueue.total-trainingQueue.remaining)/trainingQueue.total)*100);
        const secsLeft = Math.ceil(trainingQueue.remaining/rate);
        return (
          <div style={{ marginBottom:12, padding:"10px 12px", background:"rgba(40,80,160,.1)",
            border:"1px solid rgba(60,120,220,.35)", borderRadius:6 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <div style={{ fontFamily:P.ff, fontSize:10, color:"#88aaff", fontWeight:700 }}>⚔️ TRAINING IN PROGRESS</div>
              <div style={{ fontSize:9, color:"#6a8aaa", fontFamily:P.ff }}>{trainingQueue.remaining.toLocaleString()} left · ~{secsLeft}s</div>
            </div>
            <div style={{ height:6, background:"#181820", borderRadius:3, overflow:"hidden", marginBottom:4 }}>
              <div style={{ height:"100%", width:`${qPct}%`,
                background:"linear-gradient(90deg,#3366cc,#88aaff)",
                borderRadius:3, transition:"width 1s linear" }}/>
            </div>
          </div>
        );
      })()}
      {/* Queue new */}
      <div style={{ padding:"10px 12px", background:"rgba(255,255,255,.02)",
        border:`1px solid #1e1e2a`, borderRadius:6 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontFamily:P.ff, fontSize:10, color:"#c8a060", fontWeight:700 }}>⚔️ TRAINING GROUNDS — Lv{bldgs.training||0}</div>
          <div style={{ fontSize:8, color:"#6a7a9a", fontFamily:P.ff }}>{rate.toLocaleString()} troops/s</div>
        </div>
        {room <= 0 ? (
          <div style={{ fontSize:9, color:"#8a6020", fontFamily:P.ffb, fontStyle:"italic", padding:"4px 0" }}>
            Barracks full. Assign troops to commanders first.
          </div>
        ) : trainingQueue ? (
          <div style={{ fontSize:9, color:"#6a7a9a", fontFamily:P.ffb, fontStyle:"italic", padding:"4px 0" }}>
            Training in progress. Queue another batch when complete.
          </div>
        ) : (<>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, color:"#6a5a4a", fontFamily:P.ff, marginBottom:4 }}>
            <span>QUEUE SIZE</span>
            <span style={{ color:"#88aaff", fontWeight:700 }}>{sv.toLocaleString()} troops</span>
          </div>
          <input type="range" min={1} max={sliderMax} value={sv}
            onChange={e => setTrainSlider(+e.target.value)}
            style={{ width:"100%", accentColor:"#3366cc", marginBottom:6 }}/>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:7, color:"#4a4a5a", marginBottom:8 }}>
            <span>1</span><span style={{ color:"#5a6a7a" }}>Max: {sliderMax.toLocaleString()}</span><span>{sliderMax.toLocaleString()}</span>
          </div>
          <div style={{ fontSize:8, marginBottom:8, flexWrap:"wrap", display:"flex", gap:6 }}>
            {Object.entries(cost).map(([k,v]) => <RssPill key={k} rssKey={k} amount={v} rss={rss} />)}
            <span style={{ color:"#5a6a7a" }}>· ~{estSecs}s</span>
          </div>
          <button className="btn" disabled={!canQueue} onClick={() => queueTraining(sv)}
            style={{ width:"100%", padding:"10px",
              background:canQueue?"linear-gradient(135deg,rgba(40,80,160,.5),rgba(40,80,160,.2))":"rgba(255,255,255,.02)",
              border:`1px solid ${canQueue?"rgba(60,120,220,.6)":"#181818"}`,
              color:canQueue?"#88aaff":"#2a2a2a", fontSize:12, fontWeight:700, letterSpacing:".08em" }}>
            {canQueue ? `⚔ Queue ${sv.toLocaleString()} Troops` : !affordable ? "Insufficient resources" : "Training in progress"}
          </button>
        </>)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ARMY (Army)
// ─────────────────────────────────────────────────────────────────────────────
function BattleGroupsScreen({ cmds, setCmds, bldgs, barracksPool, setBarracks, sliderVals, setSliderVals, assignTroops, returnTroops, playerHqKey }) {
  const hqKey = playerHqKey || `${HQP.player.c},${HQP.player.r}`;
  const playerCmds = cmds.filter(c => c.owner==="player");

  return (
    <div>
      <SectionHeader>ARMY</SectionHeader>
      {playerCmds.length === 0 && (
        <div style={{ fontSize:9, color:P.sub, fontFamily:P.ffb, fontStyle:"italic", textAlign:"center", padding:20 }}>
          No commanders available. Pull from the Gacha to recruit.
        </div>
      )}
      {playerCmds.map(cmd => {
        const isAtHQ     = cmd.tk === hqKey;
        const commandCap = cmdCommand(cmd.lvl||5, bldgs.commandcenter||0, (cmd.cls==="leader"&&(cmd.lvl||5)>=25)?500:0);

        // Resolve troop branch info
        const tb = cmd.troopBranch;
        const faction = tb ? FACTION_TROOPS[tb.faction] : null;
        const branch  = faction ? faction.branches.find(b => b.key === tb.branch) : null;
        const tier    = branch ? branch.tiers[tb.tier ?? 0] : null;

        // Command cost per troop depends on unit size (small=1, medium=2, large=4)
        const branchSize  = branch?.size ?? "small";
        const cmdCost     = COMMAND_COST[branchSize] ?? 1;
        const commandUsed = (cmd.troops||0) * cmdCost;
        const maxTroops   = Math.floor(commandCap / cmdCost);
        const troopPct    = Math.round((commandUsed / commandCap) * 100);

        return (
          <div key={cmd.uid} style={{ marginBottom:12, padding:"10px 12px",
            background:"rgba(255,255,255,.03)", border:`1px solid ${P.border}`, borderRadius:6 }}>
            {/* Commander header */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <div style={{ fontSize:22 }}>{cmd.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:P.ff, fontSize:11, color:P.text, fontWeight:700 }}>{cmd.n}</div>
                <div style={{ fontSize:8, color:P.sub, marginTop:1 }}>
                  Lv{cmd.lvl} · {cmd.cls} ·{" "}
                  {tier ? <>{branch.label} {tier.label}</> : "No troops assigned"}
                </div>
                <div style={{ fontSize:7, color:isAtHQ?"#3daa60":"#7a5a3a", marginTop:1, fontFamily:P.ff }}>
                  {isAtHQ ? "🏰 At HQ" : `📍 ${cmd.tk} — recall to HQ to change`}
                </div>
              </div>
              {(cmd.troops||0) > 0 && (
                <button className="btn" onClick={() => returnTroops(cmd.uid)}
                  style={{ padding:"3px 8px", background:"rgba(200,50,50,.15)",
                    border:"1px solid rgba(200,50,50,.4)", color:"#cc5050", fontSize:8, flexShrink:0 }}>
                  Return
                </button>
              )}
            </div>

            {/* Command bar */}
            <div style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:7,
                color:"#5a5060", marginBottom:2, fontFamily:P.ff }}>
                <span>📡 COMMAND</span>
                <span style={{ color:troopPct>=100?"#cc3030":troopPct>=75?"#d0a030":"#3daa60" }}>
                  {commandUsed.toLocaleString()} / {commandCap.toLocaleString()}
                  {cmdCost > 1 && <span style={{fontSize:6,opacity:.6,marginLeft:3}}>({(cmd.troops||0)} units ×{cmdCost})</span>}
                </span>
              </div>
              <div style={{ height:4, background:"#181820", borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${troopPct}%`,
                  background:troopPct>=100?"#cc3030":troopPct>=75?"#d0a030":"#3daa60",
                  borderRadius:2, transition:"width .3s" }}/>
              </div>
            </div>

            {/* Troop branch selection (only at HQ) */}
            {isAtHQ && (
              <TroopBranchSelector
                cmd={cmd} setCmds={setCmds}
                faction={faction} branch={branch} tier={tier} tb={tb} />
            )}
            {!isAtHQ && tb && tier && (
              <div style={{ marginBottom:10, padding:"8px 10px",
                background:"rgba(150,80,20,.08)", border:"1px solid rgba(150,80,20,.25)",
                borderRadius:4, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16 }}>🔒</span>
                <div>
                  <div style={{ fontFamily:P.ff, fontSize:9, color:"#c8903a", fontWeight:700 }}>TROOP TYPE LOCKED</div>
                  <div style={{ fontSize:8, color:"#7a6a4a", fontFamily:P.ffb, marginTop:1 }}>
                    Recall to HQ to change troop assignment.
                  </div>
                </div>
                <div style={{ marginLeft:"auto", textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:18 }}>{branch?.label}</div>
                  <div style={{ fontSize:7, color:P.gold, fontFamily:P.ff }}>{tier.label}</div>
                </div>
              </div>
            )}

            {/* Assign slider */}
            {tb && isAtHQ && (() => {
              const sv = sliderVals[cmd.uid] ?? (cmd.troops||0);
              const maxSlider = Math.min(maxTroops, barracksPool+(cmd.troops||0));
              const delta = sv - (cmd.troops||0);
              const svCmd = sv * cmdCost;
              return (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:8,
                    color:"#6a5a4a", letterSpacing:".1em", fontFamily:P.ff, marginBottom:4 }}>
                    <span>ASSIGN TROOPS</span>
                    <span style={{ color:delta>0?"#3daa60":delta<0?"#cc5050":"#5a5060" }}>
                      {sv.toLocaleString()} troops ({svCmd.toLocaleString()} cmd)
                      {delta!==0 && <span style={{ marginLeft:4 }}>{delta>0?`(+${delta})`:delta}</span>}
                    </span>
                  </div>
                  <input type="range" min={0} max={maxSlider} value={sv}
                    onChange={e => setSliderVals(v => ({ ...v, [cmd.uid]:+e.target.value }))}
                    style={{ width:"100%", accentColor:"#3daa60", marginBottom:8 }}/>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:7, color:"#4a4a5a", marginBottom:8 }}>
                    <span>0</span>
                    <span style={{ color:"#5a7a5a" }}>Barracks: {barracksPool.toLocaleString()}</span>
                    <span>{maxTroops.toLocaleString()} troops / {commandCap.toLocaleString()} cmd</span>
                  </div>
                  {delta !== 0 ? (
                    <button className="btn" onClick={() => assignTroops(cmd.uid, cmd.troopBranch, sv)}
                      style={{ width:"100%", padding:"8px",
                        background:delta>0?"linear-gradient(135deg,rgba(40,100,60,.5),rgba(40,100,60,.2))":"linear-gradient(135deg,rgba(150,40,40,.4),rgba(150,40,40,.15))",
                        border:`1px solid ${delta>0?"#3daa60":"#cc4444"}`,
                        color:delta>0?"#3dcc70":"#dd6666", fontSize:11, fontWeight:700 }}>
                      {delta>0 ? `✓ Add ${delta} troops` : `✓ Remove ${Math.abs(delta)} troops`}
                    </button>
                  ) : (
                    <div style={{ fontSize:8, color:"#4a4a5a", fontFamily:P.ffb, fontStyle:"italic", textAlign:"center" }}>
                      Move slider to assign
                    </div>
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
              <div style={{ padding:"7px 10px", background:"rgba(50,100,180,.07)",
                border:"1px solid rgba(80,140,220,.2)", borderRadius:4,
                fontSize:8, color:"#6a7a9a", fontFamily:P.ffb, fontStyle:"italic" }}>
                🔄 No troops assigned. Recall to HQ to assign a troop branch.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Troop branch selector sub-component ──────────────────────────────────────
function TroopBranchSelector({ cmd, setCmds, faction, branch, tier, tb }) {
  const [expandedFaction, setExpandedFaction] = useState(tb?.faction ?? null);
  const [expandedBranch,  setExpandedBranch]  = useState(tb?.branch  ?? null);

  const factions = Object.entries(FACTION_TROOPS);

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
              <span style={{ fontSize:7 }}>{isExpF ? "▲" : "▼"}</span>
            </button>
            {isExpF && (
              <div style={{ paddingLeft:8, paddingTop:4, display:"flex", flexDirection:"column", gap:3 }}>
                {fDef.branches.map(br => {
                  const isExpB = expandedBranch === br.key;
                  return (
                    <div key={br.key}>
                      <button className="btn" onClick={() => setExpandedBranch(isExpB ? null : br.key)}
                        style={{ width:"100%", textAlign:"left", padding:"5px 8px",
                          background:isExpB?"rgba(240,192,64,.05)":"rgba(255,255,255,.02)",
                          border:`1px solid ${isExpB?"#3a2a10":P.border}`,
                          color:isExpB?P.gold:P.sub, fontSize:8, fontFamily:"'Cinzel',serif",
                          display:"flex", justifyContent:"space-between" }}>
                        <span>{br.label} <span style={{ color:"#5a5a7a", fontSize:7 }}>({br.size} · {br.dmgType})</span></span>
                        <span style={{ fontSize:7 }}>{isExpB ? "▲" : "▼"}</span>
                      </button>
                      {isExpB && (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:3, padding:"4px 0 4px 8px" }}>
                          {br.tiers.map((t, idx) => {
                            const isActive = tb?.faction===fKey && tb?.branch===br.key && (tb?.tier??0)===idx;
                            return (
                              <button key={idx} className="btn"
                                onClick={() => setCmds(p => p.map(c => c.uid===cmd.uid
                                  ? { ...c, troopBranch:{ faction:fKey, branch:br.key, tier:idx } }
                                  : c))}
                                style={{ padding:"6px 4px", textAlign:"center",
                                  background:isActive?"rgba(240,192,64,.15)":"rgba(255,255,255,.02)",
                                  border:`1px solid ${isActive?P.gold:P.border}`,
                                  color:isActive?P.gold:P.sub, fontSize:8,
                                  boxShadow:isActive?`0 0 8px rgba(240,192,64,.2)`:"none" }}>
                                <div style={{ fontFamily:"'Cinzel',serif", fontWeight:700, fontSize:8, marginBottom:2 }}>
                                  {t.label}
                                </div>
                                <div style={{ fontSize:6, color:"#5a5a7a" }}>
                                  Lv{idx+1} · {br.size}
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

// ─────────────────────────────────────────────────────────────────────────────
//  HEALING TENT (Healing Tent)
// ─────────────────────────────────────────────────────────────────────────────
function RepairBayScreen({ bldgs, woundedTroops, woundedQueue, bLog }) {
  const rate = (bldgs.healingtent||0) * 5;
  return (
    <div>
      <SectionHeader>HEALING TENT</SectionHeader>
      <div style={{ padding:"12px 14px", background:"rgba(50,100,180,.08)",
        border:"1px solid rgba(80,140,220,.25)", borderRadius:6, marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:"#88aaff", fontWeight:700 }}>
            ⛺ HEALING TENT — Lv{bldgs.healingtent||0}
          </div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:13,
            color:woundedTroops>0?"#88aaff":"#4a4a6a", fontWeight:700 }}>
            {woundedTroops.toLocaleString()} wounded
          </div>
        </div>
        {woundedTroops > 0 ? (<>
          <div style={{ height:6, background:"#181820", borderRadius:3, overflow:"hidden", marginBottom:6 }}>
            <div style={{ height:"100%", width:"100%",
              background:"linear-gradient(90deg,#3366cc,#88aaff)", borderRadius:3 }}/>
          </div>
          <div style={{ fontSize:8, color:"#6a7a9a", fontFamily:"'Crimson Pro',serif" }}>
            Healing at <strong style={{ color:"#88aaff" }}>{rate}/sec</strong> → returning to barracks
          </div>
        </>) : (
          <div style={{ fontSize:8, color:"#4a4a6a", fontFamily:"'Crimson Pro',serif", fontStyle:"italic" }}>
            No wounded troops. 30% of battle casualties recover here.
          </div>
        )}
        {woundedQueue > 0 && (
          <div style={{ fontSize:8, color:"#c08030", fontFamily:"'Cinzel',serif", marginTop:6 }}>
            ⏳ {woundedQueue.toLocaleString()} healed troops queued — waiting for barracks capacity
          </div>
        )}
        {(bldgs.healingtent||0) < 1 && (
          <div style={{ fontSize:8, color:"#cc6030", fontFamily:"'Cinzel',serif", marginTop:6 }}>
            ⚠ Build a Healing Tent in Buildings to recover wounded troops.
          </div>
        )}
      </div>
      <div style={{ padding:"10px 12px", background:"rgba(255,255,255,.02)",
        border:`1px solid ${P.border}`, borderRadius:6 }}>
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:P.dim, marginBottom:6 }}>HOW IT WORKS</div>
        <div style={{ fontSize:8, color:P.sub, fontFamily:"'Crimson Pro',serif", lineHeight:1.8 }}>
          • 30% of troops lost in battle are wounded, not killed<br/>
          • Wounded troops heal automatically at {rate}/sec<br/>
          • Healed troops return to your barracks pool<br/>
          • Upgrade the Healing Tent in Buildings to increase healing rate
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MARKETPLACE
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
//  ROOT HQMenu
// ─────────────────────────────────────────────────────────────────────────────
export default memo(function HQMenu({
  hqOpen, setHqOpen, hqTab, setHqTab,
  cmds, setCmds, tiles, rss, setRss, gems, pKeys,
  bldgs, setBldgs, barracksPool, setBarracks, woundedTroops, woundedQueue,
  trainingQueue, trainSlider, setTrainSlider,
  upgQueue, sliderVals, setSliderVals, bLog,
  upgrade, canAfford, assignTroops, returnTroops, queueTraining,
  recallMarch, setScreen, gearInventory, playerHqKey,
}) {
  if (!hqOpen) return null;

  const isHub = hqTab === "hub";

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400,
      background:P.bg, display:"flex", flexDirection:"column" }}>

      {/* Title bar */}
      <div style={{ padding:"12px 16px", borderBottom:`1px solid ${P.border}`,
        display:"flex", justifyContent:"space-between", alignItems:"center",
        flexShrink:0, background:"rgba(0,0,0,.4)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {hqTab !== "hub" && (
            <button className="btn" onClick={() => setHqTab("hub")}
              style={{ background:"rgba(255,255,255,.06)", border:`1px solid ${P.border}`,
                color:P.sub, fontSize:11, padding:"4px 12px", borderRadius:4 }}>
              ← Back
            </button>
          )}
          <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:14,
            background:"linear-gradient(135deg,#f0c040,#c8803a,#f0c040)",
            backgroundSize:"200% auto", WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent", animation:"shimmer 3s linear infinite" }}>
            🏰 HEADQUARTERS
          </div>
          {hqTab !== "hub" && (
            <div style={{ fontFamily:P.ff, fontSize:11, color:P.sub }}>
              — {HUB_TILES.find(t => t.id === hqTab)?.label ?? ""}
            </div>
          )}
        </div>
        <button className="btn" onClick={() => setHqOpen(false)}
          style={{ background:"rgba(200,50,50,.15)", border:"1px solid rgba(200,50,50,.4)",
            color:"#dd6060", fontSize:12, padding:"4px 14px", borderRadius:4 }}>
          ✕ Close
        </button>
      </div>

      {/* Content — fills remaining screen */}
      <div className="scr" style={{ flex:1, overflowY: hqTab === "buildings" ? "hidden" : "auto",
        minHeight:0, padding: (isHub || hqTab === "buildings") ? 0 : 14,
        display: hqTab === "buildings" ? "flex" : "block", flexDirection:"column" }}>

        {hqTab === "hub" && (
          <HubScreen setHqTab={setHqTab} />
        )}
        {hqTab === "buildings" && (
          <InfrastructureScreen
            bldgs={bldgs} setBldgs={setBldgs} rss={rss} canAfford={canAfford}
            upgrade={upgrade} upgQueue={upgQueue} />
        )}
        {hqTab === "commandcenter" && (
          <CommandCenterScreen
            cmds={cmds} pKeys={pKeys} rss={rss} gems={gems}
            bldgs={bldgs} bLog={bLog} tiles={tiles} />
        )}
        {hqTab === "troops" && (
          <StrikeCraftScreen
            bldgs={bldgs} barracksPool={barracksPool}
            trainingQueue={trainingQueue} trainSlider={trainSlider}
            setTrainSlider={setTrainSlider} canAfford={canAfford}
            queueTraining={queueTraining} rss={rss} />
        )}
        {hqTab === "army" && (
          <BattleGroupsScreen
            cmds={cmds} setCmds={setCmds} bldgs={bldgs}
            barracksPool={barracksPool} setBarracks={setBarracks}
            sliderVals={sliderVals} setSliderVals={setSliderVals}
            assignTroops={assignTroops} returnTroops={returnTroops}
            playerHqKey={playerHqKey} />
        )}
        {hqTab === "repairbay" && (
          <RepairBayScreen
            bldgs={bldgs} woundedTroops={woundedTroops}
            woundedQueue={woundedQueue} bLog={bLog} />
        )}
        {hqTab === "marketplace" && (
          <MarketplaceScreen rss={rss} setRss={setRss} />
        )}
      </div>
    </div>
  );
});
