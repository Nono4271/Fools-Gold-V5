import { useState } from "react";
import { FACTION_TROOPS, COMMAND_COST } from "../../../shared/constants/troops.js";
import { RSS, RKEYS, HQP } from "../../../shared/constants/map.js";
import { BLDG, barracksCapacity, maxAvailLevel, upgCost, upgDuration, cmdCommand, trainRate, maxTrainBatch } from "../../../shared/constants/buildings.js";
import { RC, RARITY, CLASS, respectCost, RESPECT_MAX, SS } from "../../../shared/constants/heroes.js";
const SC = RC;

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  bg:     "rgba(5,7,11,0.97)",
  border: "#1a1610",
  gold:   "#f0c040",
  dim:    "#5a4a3a",
  text:   "#e0d0c0",
  sub:    "#8a7a6a",
  ff:     "'Cinzel',serif",
  ffb:    "'Crimson Pro',serif",
};

// ── Tile nav buttons (the 6 sections on the hub screen) ───────────────────────
const HUB_TILES = [
  { id:"buildings",    icon:"🏗",  label:"Buildings",  badge:null  },
  { id:"commandcenter",icon:"📡",  label:"Command Center",  badge:null  },
  { id:"troops",       icon:"⚔️",  label:"Training",    badge:null  },
  { id:"army",         icon:"🪖",  label:"Army",   badge:null  },
  { id:"repairbay",    icon:"⛺",  label:"Healing Tent",      badge:null  },
  { id:"marketplace",  icon:"🏪",  label:"Marketplace",     badge:null  },
];

// ── Small section header ──────────────────────────────────────────────────────
function SectionHeader({ children }) {
  return (
    <div style={{ fontSize:8, color:P.dim, letterSpacing:".12em", fontFamily:P.ff,
      fontWeight:700, marginBottom:8, paddingBottom:4, borderBottom:`1px solid #1e1810` }}>
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
function HubScreen({ setHqTab, rss, gems, pKeys, bldgs, woundedTroops, cmds, bLog }) {
  const totalTroops = cmds.filter(c=>c.owner==="player").reduce((s,c)=>s+(c.troops||0),0);
  const activeCmds  = cmds.filter(c=>c.owner==="player"&&c.march).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Stats strip */}
      <div style={{ display:"flex", gap:6, padding:"10px 14px",
        background:"rgba(240,192,64,.04)", borderBottom:`1px solid ${P.border}` }}>
        {[
          { icon:"🗺", val:pKeys.size,   lbl:"Tiles"      },
          { icon:"⚔",  val:cmds.filter(c=>c.owner==="player").length, lbl:"Commanders" },
          { icon:"🪖",  val:totalTroops.toLocaleString(), lbl:"Troops"  },
          { icon:"🚶",  val:activeCmds,  lbl:"Marching"   },
        ].map(({ icon, val, lbl }) => (
          <div key={lbl} style={{ flex:1, textAlign:"center" }}>
            <div style={{ fontSize:13 }}>{icon}</div>
            <div style={{ fontFamily:P.ff, fontSize:11, fontWeight:700, color:P.text }}>{val}</div>
            <div style={{ fontSize:7, color:P.dim, fontFamily:P.ff, letterSpacing:".04em" }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* 6-tile hub grid */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr",
        gridTemplateRows:"1fr 1fr 1fr", gap:2, padding:2, overflow:"hidden" }}>
        {HUB_TILES.map(tile => (
          <button key={tile.id} onClick={() => setHqTab(tile.id)}
            style={{
              position:"relative", background:"rgba(255,255,255,.03)",
              border:`1px solid ${P.border}`, borderRadius:4, cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"flex-start",
              justifyContent:"flex-end", padding:"10px 12px",
              transition:"background .15s, border-color .15s",
              overflow:"hidden",
            }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(240,192,64,.07)"; e.currentTarget.style.borderColor="#3a3020"; }}
            onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,.03)"; e.currentTarget.style.borderColor=P.border; }}>
            {/* Badge */}
            {tile.badge != null && tile.badge > 0 && (
              <div style={{ position:"absolute", top:8, right:8,
                background:"#cc3030", borderRadius:"50%", width:16, height:16,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:8, color:"#fff", fontFamily:P.ff, fontWeight:700 }}>
                {tile.badge}
              </div>
            )}
            <div style={{ fontSize:22, marginBottom:4, opacity:.85 }}>{tile.icon}</div>
            <div style={{ fontFamily:P.ff, fontSize:9, fontWeight:700,
              color:P.gold, letterSpacing:".06em", textTransform:"uppercase" }}>
              {tile.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BUILDINGS (Buildings)
// ─────────────────────────────────────────────────────────────────────────────
function InfrastructureScreen({ bldgs, rss, canAfford, upgrade, upgQueue, barracksCapacity: barCap }) {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <SectionHeader>BUILDINGS</SectionHeader>
        <div style={{ fontFamily:P.ff, fontSize:9, color:P.gold, fontWeight:700 }}>🏰 HQ Lv{bldgs.hq||1}</div>
      </div>
      <div style={{ fontSize:8, color:"#4a3a2a", fontFamily:P.ffb, fontStyle:"italic", marginBottom:12 }}>
        HQ gates all upgrades. Resource buildings unlock 2 levels per HQ level.
      </div>
      {[
        { label:"⛏ Resources",      keys:["quarry","lumber","forge","refinery"] },
        { label:"⚔ Military",       keys:["barracks","training","commandcenter","healingtent"] },
        { label:"🏛 Fortifications", keys:["hq","walls"] },
      ].map(group => (
        <div key={group.label} style={{ marginBottom:14 }}>
          <SectionHeader>{group.label}</SectionHeader>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {group.keys.map(key => {
              const def = BLDG[key]; if (!def) return null;
              const lvl  = bldgs[key]||0;
              const avail = maxAvailLevel(key, bldgs.hq||1);
              const isAbsMax  = lvl >= def.max;
              const isGated   = !isAbsMax && lvl >= avail;
              const cost      = (!isAbsMax && !isGated) ? upgCost(key, lvl) : null;
              const ok        = cost && canAfford(cost);
              const inProg    = upgQueue[key];
              return (
                <div key={key} style={{ background:"rgba(255,255,255,.03)",
                  border:`1px solid ${isGated?"#3a2a10":P.border}`,
                  borderRadius:5, padding:"9px 12px",
                  display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                  <div style={{ fontSize:22, flexShrink:0 }}>{def.icon}</div>
                  <div style={{ flex:1, minWidth:140 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:P.ff, fontWeight:600, fontSize:11, color:P.text }}>{def.n}</span>
                      <span style={{ fontSize:9, color:"#4a4030" }}>
                        Lv{lvl} / <span style={{ color:"#6a5a3a" }}>{avail}</span>{" "}
                        <span style={{ color:"#3a3030" }}>({def.max} max)</span>
                      </span>
                    </div>
                    <div style={{ fontSize:9, color:"#6a5a50", fontFamily:P.ffb, marginBottom:3 }}>{def.desc}</div>
                    {key==="barracks" && <div style={{ fontSize:8, color:"#6a8aaa" }}>Capacity: {barracksCapacity(lvl).toLocaleString()}</div>}
                    {isGated && <div style={{ fontSize:7, color:"#8a6020", fontFamily:P.ffb, fontStyle:"italic", marginTop:2 }}>🔒 Upgrade HQ to unlock</div>}
                    <div style={{ display:"flex", gap:1, marginTop:4 }}>
                      {Array.from({ length:Math.min(avail,20) }).map((_,i) => (
                        <div key={i} style={{ flex:1, height:3,
                          background:i<lvl?"#f0c040":i<avail?"#2a2010":"#181820",
                          borderRadius:2, minWidth:2 }}/>
                      ))}
                    </div>
                  </div>
                  {inProg ? (() => {
                    const pct = Math.max(0, Math.min(100, ((Date.now()-inProg.startedAt)/inProg.dur)*100));
                    const secsLeft = Math.max(0, Math.ceil((inProg.endsAt-Date.now())/1000));
                    const mm = Math.floor(secsLeft/60), ss = secsLeft%60;
                    return (
                      <div style={{ flexShrink:0, minWidth:80, textAlign:"right" }}>
                        <div style={{ fontSize:8, color:P.gold, fontFamily:P.ff, marginBottom:3 }}>
                          ⚙ Lv{inProg.newLvl} · {mm>0?`${mm}m ${ss}s`:`${ss}s`}
                        </div>
                        <div style={{ height:4, background:"#181820", borderRadius:2, overflow:"hidden", width:80 }}>
                          <div style={{ height:"100%", width:`${pct}%`,
                            background:"linear-gradient(90deg,#c03030,#f0c040)",
                            borderRadius:2, transition:"width .5s linear" }}/>
                        </div>
                      </div>
                    );
                  })()
                  : isAbsMax ? <div style={{ fontSize:9, color:P.gold, fontFamily:P.ff, flexShrink:0 }}>MAX</div>
                  : isGated  ? <div style={{ fontSize:9, color:"#6a4a10", fontFamily:P.ff, flexShrink:0 }}>🔒</div>
                  : cost ? (() => {
                    const nd = upgDuration(key, lvl+1);
                    const mm = Math.floor(nd/60000), ss = Math.floor((nd%60000)/1000);
                    return (
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontSize:8, marginBottom:2 }}>
                          {Object.entries(cost).filter(([,v])=>v>0).map(([k,v]) => (
                            <RssPill key={k} rssKey={k} amount={v} rss={rss} small />
                          ))}
                        </div>
                        <div style={{ fontSize:7, color:"#5a4a2a", fontFamily:P.ffb, marginBottom:3 }}>
                          ⏱ {mm>0?`${mm}m ${ss>0?ss+"s":""}`:`${ss}s`}
                        </div>
                        <button className="btn" disabled={!ok} onClick={() => upgrade(key)}
                          style={{ padding:"4px 10px", fontSize:9, fontWeight:700,
                            background:ok?"linear-gradient(135deg,rgba(200,160,64,.3),rgba(200,160,64,.1))":"rgba(255,255,255,.02)",
                            border:`1px solid ${ok?"#8a6020":"#1e1810"}`,
                            color:ok?P.gold:"#2a2a2a" }}>
                          {ok ? `↑ Lv${lvl+1}` : "⛔"}
                        </button>
                      </div>
                    );
                  })() : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
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
        const troopPct   = Math.round(((cmd.troops||0)/commandCap)*100);

        // Resolve troop branch info
        const tb = cmd.troopBranch;
        const faction = tb ? FACTION_TROOPS[tb.faction] : null;
        const branch  = faction ? faction.branches.find(b => b.key === tb.branch) : null;
        const tier    = branch ? branch.tiers[tb.tier ?? 0] : null;

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
                  {(cmd.troops||0).toLocaleString()} / {commandCap.toLocaleString()}
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
              const maxSlider = Math.min(commandCap, barracksPool+(cmd.troops||0));
              const delta = sv - (cmd.troops||0);
              return (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:8,
                    color:"#6a5a4a", letterSpacing:".1em", fontFamily:P.ff, marginBottom:4 }}>
                    <span>ASSIGN TROOPS</span>
                    <span style={{ color:delta>0?"#3daa60":delta<0?"#cc5050":"#5a5060" }}>
                      {sv.toLocaleString()} / {commandCap.toLocaleString()}
                      {delta!==0 && <span style={{ marginLeft:4 }}>{delta>0?`(+${delta})`:delta}</span>}
                    </span>
                  </div>
                  <input type="range" min={0} max={maxSlider} value={sv}
                    onChange={e => setSliderVals(v => ({ ...v, [cmd.uid]:+e.target.value }))}
                    style={{ width:"100%", accentColor:"#3daa60", marginBottom:8 }}/>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:7, color:"#4a4a5a", marginBottom:8 }}>
                    <span>0</span>
                    <span style={{ color:"#5a7a5a" }}>Barracks: {barracksPool.toLocaleString()}</span>
                    <span>{commandCap.toLocaleString()}</span>
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
export default function HQMenu({
  hqOpen, setHqOpen, hqTab, setHqTab,
  cmds, setCmds, tiles, rss, setRss, gems, pKeys,
  bldgs, barracksPool, setBarracks, woundedTroops, woundedQueue,
  trainingQueue, trainSlider, setTrainSlider,
  upgQueue, sliderVals, setSliderVals, bLog,
  upgrade, canAfford, assignTroops, returnTroops, queueTraining,
  recallMarch, setScreen, gearInventory, playerHqKey,
}) {
  if (!hqOpen) return null;

  const isHub = hqTab === "hub";

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,.80)",
      display:"flex", alignItems:"flex-end" }}
      onClick={() => setHqOpen(false)}>
      <div className="panel" onClick={e => e.stopPropagation()}
        style={{ width:"100%", maxWidth:700, margin:"0 auto", maxHeight:"92vh",
          display:"flex", flexDirection:"column", borderRadius:"10px 10px 0 0",
          animation:"fadeUp .22s ease", background:P.bg }}>

        {/* Title bar */}
        <div style={{ padding:"10px 14px", borderBottom:`1px solid ${P.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {hqTab !== "hub" && (
              <button className="btn" onClick={() => setHqTab("hub")}
                style={{ background:"none", border:`1px solid ${P.border}`,
                  color:P.sub, fontSize:10, padding:"3px 8px" }}>
                ← Back
              </button>
            )}
            <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:13,
              background:"linear-gradient(135deg,#f0c040,#c03030,#f0c040)",
              backgroundSize:"200% auto", WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent", animation:"shimmer 3s linear infinite" }}>
              🏰 HEADQUARTERS
            </div>
          </div>
          <button className="btn" onClick={() => setHqOpen(false)}
            style={{ background:"none", border:`1px solid #2a2a2a`, color:"#555", fontSize:11, padding:"3px 10px" }}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="scr" style={{ flex:1, overflowY:"auto", minHeight:0,
          padding: isHub ? 0 : 12 }}>

          {hqTab === "hub" && (
            <HubScreen
              setHqTab={setHqTab} rss={rss} gems={gems} pKeys={pKeys}
              bldgs={bldgs} woundedTroops={woundedTroops} cmds={cmds} bLog={bLog} />
          )}
          {hqTab === "buildings" && (
            <InfrastructureScreen
              bldgs={bldgs} rss={rss} canAfford={canAfford}
              upgrade={upgrade} upgQueue={upgQueue}
              barracksCapacity={barracksCapacity} />
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
    </div>
  );
}
