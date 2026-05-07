import { TROOP, TROOP_KEYS, CMD_LVL_MAX, xpToNext } from "../../../shared/constants/troops.js";
import { TERR } from "../../../shared/constants/terrain.js";
import { RSS, RKEYS, HQP } from "../../../shared/constants/map.js";
import { BLDG, barracksCapacity, maxAvailLevel, upgCost, upgDuration, cmdCommand, trainRate, maxTrainBatch } from "../../../shared/constants/buildings.js";
import { PLAYABLE_FACTIONS } from "../../../shared/constants/factions.js";
import { RC, RARITY, CLASS, respectCost, RESPECT_MAX, SS } from "../../../shared/constants/heroes.js";
const SC = RC;

export default function HQMenu({
  hqOpen, setHqOpen, hqTab, setHqTab,
  cmds, setCmds, tiles, rss, gems, pKeys,
  bldgs, barracksPool, setBarracks, woundedTroops, woundedQueue,
  trainingQueue, trainSlider, setTrainSlider,
  upgQueue, sliderVals, setSliderVals, bLog,
  upgrade, canAfford, assignTroops, returnTroops, queueTraining,
  recallMarch, setScreen, gearInventory, playerHqKey,
}) {
  if (!hqOpen) return null;
  const hqKey = playerHqKey || `${HQP.player.c},${HQP.player.r}`;

  return (
    <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"flex-end"}}
      onClick={() => setHqOpen(false)}>
      <div className="panel" onClick={e => e.stopPropagation()}
        style={{width:"100%",maxWidth:700,margin:"0 auto",maxHeight:"88vh",display:"flex",flexDirection:"column",borderRadius:"10px 10px 0 0",animation:"fadeUp .22s ease"}}>

        {/* Title */}
        <div style={{padding:"10px 14px",borderBottom:"1px solid #221e12",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:13,background:"linear-gradient(135deg,#f0c040,#c03030,#f0c040)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 3s linear infinite"}}>🏰 HEADQUARTERS</div>
          <button className="btn" onClick={() => setHqOpen(false)} style={{background:"none",border:"1px solid #2a2a2a",color:"#555",fontSize:11,padding:"3px 10px"}}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:"1px solid #221e12",flexShrink:0,overflowX:"auto"}}>
          {[["overview","📊","Overview"],["army","🪖","Army"],["buildings","🏗","Buildings"],["troops","🔨","Troops"]].map(([id,icon,label]) => {
            const isActive = hqTab===id;
            return (
              <button key={id} className="btn" onClick={() => setHqTab(id)}
                style={{flex:isActive?"1 1 auto":"0 0 auto",padding:"10px 12px",background:isActive?"rgba(240,192,64,.1)":"none",borderBottom:isActive?"2px solid #f0c040":"2px solid transparent",color:isActive?"#f0c040":"#5a5050",fontSize:"clamp(9px,2vw,11px)",letterSpacing:".04em",whiteSpace:"nowrap",transition:"color .15s, background .15s"}}>
                {icon}{isActive && <span style={{marginLeft:5,fontFamily:"'Cinzel',serif",fontWeight:700}}>{label}</span>}
              </button>
            );
          })}
        </div>

        <div className="scr" style={{
          flex:1,
          overflowY: "auto",
          padding: 12,
          display: "block",
          flexDirection: "column",
          minHeight: 0,
        }}>

          {/* ── OVERVIEW ── */}
          {hqTab==="overview" && (() => {
            const rssToBuilding = {stone:"quarry",wood:"lumber",ore:"forge",gas:"refinery"};
            const totalTroops = cmds.filter(c=>c.owner==="player").reduce((s,c)=>s+(c.troops||0),0);
            const activeCmds  = cmds.filter(c=>c.owner==="player"&&c.march).length;
            return (
              <div>
                <div style={{display:"flex",gap:6,marginBottom:10,padding:"8px 10px",background:"rgba(240,192,64,.05)",border:"1px solid rgba(240,192,64,.15)",borderRadius:6}}>
                  {[{icon:"🗺",val:pKeys.size,lbl:"Tiles"},{icon:"⚔",val:cmds.filter(c=>c.owner==="player").length,lbl:"Commanders"},{icon:"🪖",val:totalTroops.toLocaleString(),lbl:"Troops"},{icon:"🚶",val:activeCmds,lbl:"Marching"}].map(({icon,val,lbl}) => (
                    <div key={lbl} style={{flex:1,textAlign:"center"}}>
                      <div style={{fontSize:14}}>{icon}</div>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:12,fontWeight:700,color:"#e0d0c0",lineHeight:1.2}}>{val}</div>
                      <div style={{fontSize:7,color:"#6a5a4a",fontFamily:"'Cinzel',serif",letterSpacing:".04em"}}>{lbl}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:7,marginBottom:12}}>
                  {RKEYS.map(k => {
                    const bldgKey = rssToBuilding[k];
                    const rate = (bldgs[bldgKey]||0)*(BLDG[bldgKey]?.rate||0);
                    const tileProd = Object.values(tiles).filter(t=>t.owner==="player"&&t.rss===k).length*50;
                    return (
                      <div key={k} style={{background:RSS[k].bg,border:`1px solid ${RSS[k].col}30`,borderRadius:5,padding:"8px 10px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{fontSize:9,color:RSS[k].col,fontFamily:"'Cinzel',serif",fontWeight:700}}>{RSS[k].icon} {RSS[k].lbl}</div>
                          {(rate+tileProd)>0 && <div style={{fontSize:7,color:RSS[k].col,opacity:.7,fontFamily:"'Cinzel',serif"}}>+{rate+tileProd}/s</div>}
                        </div>
                        <div style={{fontSize:18,fontWeight:700,color:"#e0d0c0",fontFamily:"'Cinzel',serif",marginTop:2}}>{Math.floor(rss[k]).toLocaleString()}</div>
                      </div>
                    );
                  })}
                  <div style={{background:"rgba(240,192,64,.07)",border:"1px solid rgba(240,192,64,.2)",borderRadius:5,padding:"8px 10px"}}>
                    <div style={{fontSize:9,color:"#f0c040",fontFamily:"'Cinzel',serif",fontWeight:700}}>💎 Gems</div>
                    <div style={{fontSize:18,fontWeight:700,color:"#e0d0c0",fontFamily:"'Cinzel',serif",marginTop:2}}>{gems}</div>
                  </div>
                  <div style={{background:"rgba(40,100,60,.1)",border:"1px solid rgba(40,100,60,.3)",borderRadius:5,padding:"8px 10px"}}>
                    <div style={{fontSize:9,color:"#3daa60",fontFamily:"'Cinzel',serif",fontWeight:700}}>🗺 Tiles Owned</div>
                    <div style={{fontSize:18,fontWeight:700,color:"#e0d0c0",fontFamily:"'Cinzel',serif",marginTop:2}}>{pKeys.size}</div>
                  </div>
                </div>
                <div style={{marginBottom:12,padding:"10px 12px",background:"rgba(50,100,180,.08)",border:"1px solid rgba(80,140,220,.25)",borderRadius:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:11,color:"#88aaff",fontWeight:700}}>⛺ HEALING TENT — Lv{bldgs.healingtent||0}</div>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:12,color:woundedTroops>0?"#88aaff":"#4a4a6a",fontWeight:700}}>{woundedTroops.toLocaleString()} wounded</div>
                  </div>
                  {woundedTroops>0 ? (<>
                    <div style={{height:5,background:"#181820",borderRadius:3,overflow:"hidden",marginBottom:5}}>
                      <div style={{height:"100%",width:"100%",background:"linear-gradient(90deg,#3366cc,#88aaff)",borderRadius:3}}/>
                    </div>
                    <div style={{fontSize:8,color:"#6a7a9a",fontFamily:"'Crimson Pro',serif"}}>Healing at <strong style={{color:"#88aaff"}}>{(bldgs.healingtent||0)*5}/sec</strong> → returning to barracks</div>
                  </>) : (
                    <div style={{fontSize:8,color:"#4a4a6a",fontFamily:"'Crimson Pro',serif",fontStyle:"italic"}}>No wounded troops. 30% of battle casualties recover here.</div>
                  )}
                  {woundedQueue>0 && <div style={{fontSize:8,color:"#c08030",fontFamily:"'Cinzel',serif",marginTop:4}}>⏳ {woundedQueue.toLocaleString()} healed troops queued — waiting for barracks capacity</div>}
                  {(bldgs.healingtent||0)<1 && <div style={{fontSize:8,color:"#cc6030",fontFamily:"'Cinzel',serif",marginTop:4}}>⚠ Build a Healing Tent in Buildings to recover wounded troops.</div>}
                </div>
                {bLog.length>0 && (<>
                  <div style={{fontSize:8,color:"#5a4030",letterSpacing:".1em",fontFamily:"'Cinzel',serif",marginBottom:5}}>BATTLE LOG</div>
                  {bLog.slice(0,6).map((l,i) => (
                    <div key={i} style={{fontSize:9,color:i===0?"#c0a880":"#3a3040",fontFamily:"'Crimson Pro',serif",marginBottom:3,borderBottom:"1px solid rgba(255,255,255,.02)",paddingBottom:2}}>{l}</div>
                  ))}
                </>)}
              </div>
            );
          })()}

          {/* ── BUILDINGS ── */}
          {hqTab==="buildings" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{fontSize:9,color:"#5a4030",letterSpacing:".1em",fontFamily:"'Cinzel',serif"}}>BUILDINGS</div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:9,color:"#f0c040",fontWeight:700}}>🏰 HQ Lv{bldgs.hq||1}</div>
              </div>
              <div style={{fontSize:8,color:"#4a3a2a",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",marginBottom:10}}>HQ gates all upgrades. Resource buildings unlock 2 levels per HQ level.</div>
              {[
                {label:"⛏ Resource",   keys:["quarry","lumber","forge","refinery"]},
                {label:"⚔ Military",   keys:["barracks","training","commandcenter","healingtent"]},
                {label:"🏛 Fortification", keys:["hq","walls"]},
              ].map(group => (
                <div key={group.label} style={{marginBottom:14}}>
                  <div style={{fontSize:8,color:"#5a4a30",letterSpacing:".12em",fontFamily:"'Cinzel',serif",fontWeight:700,marginBottom:6,paddingBottom:4,borderBottom:"1px solid #1e1810"}}>{group.label}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                    {group.keys.map(key => {
                      const def = BLDG[key]; if (!def) return null;
                      const lvl = bldgs[key]||0;
                      const avail = maxAvailLevel(key, bldgs.hq||1);
                      const isAbsMax = lvl>=def.max;
                      const isGated  = !isAbsMax && lvl>=avail;
                      const cost = (!isAbsMax&&!isGated) ? upgCost(key,lvl) : null;
                      const ok   = cost && canAfford(cost);
                      const inProgress = upgQueue[key];
                      return (
                        <div key={key} style={{background:"rgba(255,255,255,.03)",border:`1px solid ${isGated?"#3a2a10":"#221e12"}`,borderRadius:5,padding:"9px 12px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                          <div style={{fontSize:22,flexShrink:0}}>{def.icon}</div>
                          <div style={{flex:1,minWidth:140}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap"}}>
                              <span style={{fontFamily:"'Cinzel',serif",fontWeight:600,fontSize:11,color:"#e0d0c0"}}>{def.n}</span>
                              <span style={{fontSize:9,color:"#4a4030"}}>Lv{lvl} / <span style={{color:"#6a5a3a"}}>{avail}</span> <span style={{color:"#3a3030"}}>({def.max} max)</span></span>
                            </div>
                            <div style={{fontSize:9,color:"#6a5a50",fontFamily:"'Crimson Pro',serif",marginBottom:3}}>{def.desc}</div>
                            {def.rss && lvl>0 && <div style={{fontSize:9,color:RSS[def.rss]?.col}}>{RSS[def.rss]?.icon} +{(def.rate||0)*lvl}/s</div>}
                            {key==="barracks" && <div style={{fontSize:8,color:"#6a8aaa"}}>Capacity: {barracksCapacity(lvl).toLocaleString()}</div>}
                            {isGated && <div style={{fontSize:7,color:"#8a6020",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",marginTop:2}}>🔒 Upgrade HQ to unlock next level</div>}
                            <div style={{display:"flex",gap:1,marginTop:4}}>
                              {Array.from({length:Math.min(avail,20)}).map((_,i) => (
                                <div key={i} style={{flex:1,height:3,background:i<lvl?"#f0c040":i<avail?"#2a2010":"#181820",borderRadius:2,minWidth:2}}/>
                              ))}
                            </div>
                          </div>
                          {inProgress ? (() => {
                            const pct = Math.max(0,Math.min(100,((Date.now()-inProgress.startedAt)/inProgress.dur)*100));
                            const secsLeft = Math.max(0,Math.ceil((inProgress.endsAt-Date.now())/1000));
                            const mm=Math.floor(secsLeft/60), ss=secsLeft%60;
                            return (
                              <div style={{flexShrink:0,minWidth:80,textAlign:"right"}}>
                                <div style={{fontSize:8,color:"#f0c040",fontFamily:"'Cinzel',serif",marginBottom:3}}>⚙ Lv{inProgress.newLvl} · {mm>0?`${mm}m ${ss}s`:`${ss}s`}</div>
                                <div style={{height:4,background:"#181820",borderRadius:2,overflow:"hidden",width:80}}>
                                  <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#c03030,#f0c040)",borderRadius:2,transition:"width .5s linear"}}/>
                                </div>
                              </div>
                            );
                          })()
                          : isAbsMax ? <div style={{fontSize:9,color:"#f0c040",fontFamily:"'Cinzel',serif",flexShrink:0}}>MAX</div>
                          : isGated  ? <div style={{fontSize:9,color:"#6a4a10",fontFamily:"'Cinzel',serif",flexShrink:0}}>🔒</div>
                          : cost ? (() => {
                            const nextDur = upgDuration(key,lvl+1);
                            const mm=Math.floor(nextDur/60000), ss=Math.floor((nextDur%60000)/1000);
                            return (
                              <div style={{textAlign:"right",flexShrink:0}}>
                                <div style={{fontSize:8,marginBottom:2}}>
                                  {Object.entries(cost).filter(([,v])=>v>0).map(([k,v]) => (
                                    <span key={k} style={{marginRight:4,color:(rss[k]||0)>=v?RSS[k]?.col||"#888":"#cc3030",fontFamily:"'Cinzel',serif"}}>{RSS[k]?.icon||k}{v.toLocaleString()}</span>
                                  ))}
                                </div>
                                <div style={{fontSize:7,color:"#5a4a2a",fontFamily:"'Crimson Pro',serif",marginBottom:3}}>⏱ {mm>0?`${mm}m ${ss>0?ss+"s":""}`:`${ss}s`}</div>
                                <button className="btn" disabled={!ok} onClick={()=>upgrade(key)}
                                  style={{padding:"4px 10px",background:ok?"linear-gradient(135deg,rgba(180,40,40,.4),rgba(180,40,40,.15))":"rgba(255,255,255,.02)",border:`1px solid ${ok?"#c03030":"#1a1a1a"}`,color:ok?"#f0c040":"#222",fontSize:10}}>
                                  ▲ Upgrade
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
          )}

          {/* ── ARMY ── */}
          {hqTab==="army" && (() => {
            const cap = barracksCapacity(bldgs.barracks||0);
            const pct = Math.min(100,Math.round((barracksPool/cap)*100));
            return (
              <div>
                <div style={{marginBottom:12,padding:"10px 12px",background:"rgba(255,255,255,.03)",border:"1px solid #2a2010",borderRadius:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:11,color:"#c8a060",fontWeight:700}}>🏕 BARRACKS POOL — Lv{bldgs.barracks||0}</div>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:13,color:pct>50?"#3daa60":pct>10?"#d0a030":"#cc3030",fontWeight:700}}>{barracksPool.toLocaleString()} / {cap.toLocaleString()}</div>
                  </div>
                  <div style={{height:6,background:"#181820",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:pct>50?"#3daa60":pct>10?"#d0a030":"#cc3030",borderRadius:3,transition:"width .3s"}}/>
                  </div>
                  <div style={{fontSize:8,color:"#5a5060",marginTop:4,fontFamily:"'Crimson Pro',serif",fontStyle:"italic"}}>Troops available to assign. Train more in the Troops tab.</div>
                </div>
                <div style={{marginBottom:12,padding:"8px 10px",background:"rgba(255,255,255,.02)",border:"1px solid #1e1e2a",borderRadius:5}}>
                  <div style={{fontSize:8,color:"#6a5a4a",letterSpacing:".1em",fontFamily:"'Cinzel',serif",marginBottom:5}}>COMBAT TRIANGLE · +10% strong / -10% weak</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
                    {TROOP_KEYS.map(k => {
                      const t = TROOP[k];
                      return (
                        <div key={k} style={{fontSize:8,color:"#7a7a8a",fontFamily:"'Crimson Pro',serif",lineHeight:1.5}}>
                          <span style={{color:t.color,fontWeight:700}}>{t.icon} {t.label}: </span>
                          <span style={{color:"#3daa60"}}>▲{t.strong.map(s=>TROOP[s].label).join(",")}</span>
                          {" "}<span style={{color:"#cc3030"}}>▼{t.weak.map(w=>TROOP[w].label).join(",")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {cmds.filter(c=>c.owner==="player").map(cmd => {
                  const isAtHQ = cmd.tk===hqKey;
                  const commandCap = cmdCommand(cmd.lvl||5,bldgs.commandcenter||0, (cmd.cls==="leader"&&(cmd.lvl||5)>=25)?500:0);
                  const troopPct = commandCap>0?Math.min(100,Math.floor(((cmd.troops||0)/commandCap)*100)):0;
                  return (
                    <div key={cmd.uid} style={{background:"rgba(255,255,255,.03)",border:`1px solid ${cmd.troopType?TROOP[cmd.troopType].color+"60":"#221e12"}`,borderRadius:6,padding:"10px 12px",marginBottom:10}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                        <span style={{fontSize:24}}>{cmd.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,color:"#e0d0c0"}}>{cmd.n} <span style={{color:"#f0c040",fontSize:9}}>Lv{cmd.lvl||5}</span></div>
                          <div style={{fontSize:9,color:cmd.troops>0?TROOP[cmd.troopType]?.color||"#3daa60":"#6a5a5a"}}>
                            {cmd.troops>0?<>{TROOP[cmd.troopType]?.icon} {TROOP[cmd.troopType]?.label} · <strong style={{color:"#e0d0c0"}}>{cmd.troops.toLocaleString()}</strong> / {commandCap.toLocaleString()}</>:"No troops assigned"}
                          </div>
                          <div style={{fontSize:7,color:isAtHQ?"#3daa60":"#7a5a3a",marginTop:1,fontFamily:"'Cinzel',serif"}}>{isAtHQ?"🏰 At HQ":`📍 ${cmd.tk} — recall to HQ to change type`}</div>
                        </div>
                        {cmd.troops>0 && <button className="btn" onClick={()=>returnTroops(cmd.uid)} style={{padding:"3px 8px",background:"rgba(200,50,50,.15)",border:"1px solid rgba(200,50,50,.4)",color:"#cc5050",fontSize:8,flexShrink:0}}>Return</button>}
                      </div>
                      <div style={{marginBottom:8}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#5a5060",marginBottom:2,fontFamily:"'Cinzel',serif"}}>
                          <span>📡 COMMAND</span>
                          <span style={{color:troopPct>=100?"#cc3030":troopPct>=75?"#d0a030":"#3daa60"}}>{(cmd.troops||0).toLocaleString()} / {commandCap.toLocaleString()}</span>
                        </div>
                        <div style={{height:4,background:"#181820",borderRadius:2,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${troopPct}%`,background:troopPct>=100?"#cc3030":troopPct>=75?"#d0a030":"#3daa60",borderRadius:2,transition:"width .3s"}}/>
                        </div>
                      </div>
                      {isAtHQ ? (<>
                        <div style={{fontSize:8,color:"#6a5a4a",letterSpacing:".1em",fontFamily:"'Cinzel',serif",marginBottom:6}}>SELECT TROOP TYPE</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:10}}>
                          {TROOP_KEYS.map(tk => {
                            const t = TROOP[tk];
                            const isActive = cmd.troopType===tk;
                            const [r,g,b] = [parseInt(t.color.slice(1,3),16),parseInt(t.color.slice(3,5),16),parseInt(t.color.slice(5,7),16)];
                            return (
                              <button key={tk} className="btn" onClick={()=>setCmds(p=>p.map(c=>c.uid===cmd.uid?{...c,troopType:tk}:c))}
                                style={{padding:"6px 8px",textAlign:"left",background:isActive?`rgba(${r},${g},${b},0.2)`:"rgba(255,255,255,.03)",border:`1px solid ${isActive?t.color:t.color+"40"}`,color:isActive?t.color:"#8a8a9a",fontSize:10,boxShadow:isActive?`0 0 8px ${t.color}40`:"none"}}>
                                <div style={{fontSize:14,marginBottom:2}}>{t.icon}</div>
                                <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:9}}>{t.label}</div>
                                <div style={{fontSize:7,color:"#6a6a7a",marginTop:1}}>{t.desc}</div>
                                {isActive && <div style={{fontSize:7,color:t.color,marginTop:2}}>✓ SELECTED</div>}
                              </button>
                            );
                          })}
                        </div>
                      </>) : (
                        <div style={{marginBottom:10,padding:"8px 10px",background:"rgba(150,80,20,.08)",border:"1px solid rgba(150,80,20,.25)",borderRadius:4,display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:16}}>🔒</span>
                          <div>
                            <div style={{fontFamily:"'Cinzel',serif",fontSize:9,color:"#c8903a",fontWeight:700}}>TROOP TYPE LOCKED</div>
                            <div style={{fontSize:8,color:"#7a6a4a",fontFamily:"'Crimson Pro',serif",marginTop:1}}>Return this commander to HQ to change their troop type.</div>
                          </div>
                          {cmd.troopType && <div style={{marginLeft:"auto",textAlign:"center",flexShrink:0}}><div style={{fontSize:18}}>{TROOP[cmd.troopType].icon}</div><div style={{fontSize:7,color:TROOP[cmd.troopType].color,fontFamily:"'Cinzel',serif"}}>{TROOP[cmd.troopType].label}</div></div>}
                        </div>
                      )}
                      {cmd.troopType && isAtHQ && (() => {
                        const sv = sliderVals[cmd.uid]??(cmd.troops||0);
                        const maxSlider = Math.min(commandCap, barracksPool+(cmd.troops||0));
                        const delta = sv-(cmd.troops||0);
                        return (
                          <div>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#6a5a4a",letterSpacing:".1em",fontFamily:"'Cinzel',serif",marginBottom:4}}>
                              <span>ASSIGN TROOPS</span>
                              <span style={{color:delta>0?"#3daa60":delta<0?"#cc5050":"#5a5060"}}>{sv.toLocaleString()} / {commandCap.toLocaleString()}{delta!==0&&<span style={{marginLeft:4}}>{delta>0?`(+${delta})`:delta}</span>}</span>
                            </div>
                            <input type="range" min={0} max={commandCap} value={sv}
                              onChange={e=>setSliderVals(v=>({...v,[cmd.uid]:+e.target.value}))}
                              style={{width:"100%",accentColor:"#3daa60",marginBottom:8}}/>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#4a4a5a",marginBottom:8}}>
                              <span>0</span><span style={{color:"#5a7a5a"}}>Barracks: {barracksPool.toLocaleString()}</span><span>{commandCap.toLocaleString()}</span>
                            </div>
                            {delta!==0
                              ? <button className="btn" onClick={()=>assignTroops(cmd.uid,cmd.troopType,sv)}
                                  style={{width:"100%",padding:"8px",background:delta>0?"linear-gradient(135deg,rgba(40,100,60,.5),rgba(40,100,60,.2))":"linear-gradient(135deg,rgba(150,40,40,.4),rgba(150,40,40,.15))",border:`1px solid ${delta>0?"#3daa60":"#cc4444"}`,color:delta>0?"#3dcc70":"#dd6666",fontSize:11,fontWeight:700}}>
                                  {delta>0?`✓ Add ${delta} troops`:`✓ Remove ${Math.abs(delta)} troops`}
                                </button>
                              : <div style={{fontSize:8,color:"#4a4a5a",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",textAlign:"center"}}>Move slider to assign</div>
                            }
                          </div>
                        );
                      })()}
                      {cmd.troopType && !isAtHQ && (() => {
                        const sv = sliderVals[cmd.uid]??(cmd.troops||0);
                        const toRemove = (cmd.troops||0)-sv;
                        return (
                          <div>
                            <div style={{fontSize:8,color:"#6a7a9a",letterSpacing:".1em",fontFamily:"'Cinzel',serif",marginBottom:4}}>✏️ EDIT ARMY — removal only · use Reinforce to add troops</div>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#5a6a7a",marginBottom:4,fontFamily:"'Cinzel',serif"}}>
                              <span>Troops</span>
                              <span style={{color:toRemove>0?"#cc5050":"#3daa60"}}>{sv.toLocaleString()} / {commandCap.toLocaleString()}{toRemove>0&&<span style={{color:"#cc5050",marginLeft:4}}>(-{toRemove})</span>}</span>
                            </div>
                            <input type="range" min={1} max={cmd.troops||1} value={sv}
                              onChange={e=>setSliderVals(v=>({...v,[cmd.uid]:+e.target.value}))}
                              style={{width:"100%",accentColor:"#cc5050",marginBottom:8}}/>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#4a4a5a",marginBottom:8}}>
                              <span>1</span><span>{(cmd.troops||0).toLocaleString()} (current)</span>
                            </div>
                            {toRemove>0
                              ? <button className="btn" onClick={()=>{setBarracks(p=>p+toRemove);setCmds(p=>p.map(c=>c.uid===cmd.uid?{...c,troops:sv}:c));}}
                                  style={{width:"100%",padding:"8px",background:"linear-gradient(135deg,rgba(150,40,40,.4),rgba(150,40,40,.15))",border:"1px solid #cc4444",color:"#dd6666",fontSize:11,fontWeight:700}}>
                                  ✓ Remove {toRemove} troops → Barracks
                                </button>
                              : <div style={{fontSize:8,color:"#4a4a5a",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",textAlign:"center"}}>Slide left to remove troops</div>
                            }
                          </div>
                        );
                      })()}
                      {!cmd.troopType && isAtHQ && <div style={{fontSize:8,color:"#5a5060",fontFamily:"'Crimson Pro',serif",fontStyle:"italic"}}>Select a troop type above first.</div>}
                      {!cmd.troopType && !isAtHQ && <div style={{padding:"7px 10px",background:"rgba(50,100,180,.07)",border:"1px solid rgba(80,140,220,.2)",borderRadius:4,fontSize:8,color:"#6a7a9a",fontFamily:"'Crimson Pro',serif",fontStyle:"italic"}}>🔄 No troops assigned. Recall to HQ to assign a troop type.</div>}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── TROOPS ── */}
          {hqTab==="troops" && (() => {
            const cap = barracksCapacity(bldgs.barracks||0);
            const pct = Math.min(100,Math.round((barracksPool/cap)*100));
            const room = cap-barracksPool;
            const maxBatch = maxTrainBatch(bldgs.training||0);
            const sliderMax = Math.max(1,Math.min(maxBatch,room));
            const sv = Math.min(trainSlider,sliderMax);
            const cost = {stone:sv*2,wood:sv*2,ore:sv,gas:Math.floor(sv*0.5)};
            const affordable = canAfford(cost);
            const rate = trainRate(bldgs.training||0);
            const estSecs = sv>0?Math.ceil(sv/rate):0;
            const canQueue = !trainingQueue && sv>0 && affordable && room>0;
            return (
              <div>
                <div style={{marginBottom:12,padding:"10px 12px",background:"rgba(255,255,255,.03)",border:"1px solid #2a2010",borderRadius:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:11,color:"#c8a060",fontWeight:700}}>🏕 BARRACKS — Lv{bldgs.barracks||0}</div>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:13,color:pct>50?"#3daa60":pct>10?"#d0a030":"#cc3030",fontWeight:700}}>{barracksPool.toLocaleString()} / {cap.toLocaleString()}</div>
                  </div>
                  <div style={{height:6,background:"#181820",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:pct>50?"#3daa60":pct>10?"#d0a030":"#cc3030",borderRadius:3,transition:"width .3s"}}/>
                  </div>
                  <div style={{fontSize:7,color:"#5a4a3a",marginTop:3,fontFamily:"'Crimson Pro',serif"}}>Upgrade Barracks to increase capacity. Max Lv10 = 90,000</div>
                </div>
                {trainingQueue && (() => {
                  const qPct = Math.round(((trainingQueue.total-trainingQueue.remaining)/trainingQueue.total)*100);
                  const secsLeft = Math.ceil(trainingQueue.remaining/rate);
                  return (
                    <div style={{marginBottom:12,padding:"10px 12px",background:"rgba(40,80,160,.1)",border:"1px solid rgba(60,120,220,.35)",borderRadius:6}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <div style={{fontFamily:"'Cinzel',serif",fontSize:10,color:"#88aaff",fontWeight:700}}>⚔️ TRAINING IN PROGRESS</div>
                        <div style={{fontSize:9,color:"#6a8aaa",fontFamily:"'Cinzel',serif"}}>{trainingQueue.remaining.toLocaleString()} left · ~{secsLeft}s</div>
                      </div>
                      <div style={{height:6,background:"#181820",borderRadius:3,overflow:"hidden",marginBottom:4}}>
                        <div style={{height:"100%",width:`${qPct}%`,background:"linear-gradient(90deg,#3366cc,#88aaff)",borderRadius:3,transition:"width 1s linear"}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#4a5a7a",fontFamily:"'Crimson Pro',serif"}}>
                        <span>Training {trainingQueue.total.toLocaleString()} troops</span>
                        <span>{rate}/s · Lv{bldgs.training||0} Training Grounds</span>
                      </div>
                    </div>
                  );
                })()}
                <div style={{padding:"10px 12px",background:"rgba(255,255,255,.02)",border:"1px solid #1e1e2a",borderRadius:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:10,color:"#c8a060",fontWeight:700}}>⚔️ TRAINING GROUNDS — Lv{bldgs.training||0}</div>
                    <div style={{fontSize:8,color:"#6a7a9a",fontFamily:"'Cinzel',serif"}}>{rate.toLocaleString()} troops/s</div>
                  </div>
                  {room<=0 ? (
                    <div style={{fontSize:9,color:"#8a6020",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",padding:"4px 0"}}>Barracks full. Assign troops to commanders first.</div>
                  ) : trainingQueue ? (
                    <div style={{fontSize:9,color:"#6a7a9a",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",padding:"4px 0"}}>Training in progress. Queue another batch when complete.</div>
                  ) : (<>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#6a5a4a",fontFamily:"'Cinzel',serif",marginBottom:4}}>
                      <span>QUEUE SIZE</span>
                      <span style={{color:"#88aaff",fontWeight:700}}>{sv.toLocaleString()} troops</span>
                    </div>
                    <input type="range" min={1} max={sliderMax} value={sv}
                      onChange={e=>setTrainSlider(+e.target.value)}
                      style={{width:"100%",accentColor:"#3366cc",marginBottom:6}}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#4a4a5a",marginBottom:8}}>
                      <span>1</span><span style={{color:"#5a6a7a"}}>Max: {sliderMax.toLocaleString()}</span><span>{sliderMax.toLocaleString()}</span>
                    </div>
                    <div style={{fontSize:8,marginBottom:8,lineHeight:1.8,flexWrap:"wrap",display:"flex",gap:6}}>
                      <span style={{color:affordable?RSS.stone.col:"#cc3030"}}>🪨{(sv*2).toLocaleString()}</span>
                      <span style={{color:affordable?RSS.wood.col:"#cc3030"}}>🪵{(sv*2).toLocaleString()}</span>
                      <span style={{color:affordable?RSS.ore.col:"#cc3030"}}>⛏{sv.toLocaleString()}</span>
                      <span style={{color:affordable?RSS.gas.col:"#cc3030"}}>⚗{Math.floor(sv*0.5).toLocaleString()}</span>
                      <span style={{color:"#5a6a7a"}}>· ~{estSecs}s</span>
                    </div>
                    <button className="btn" disabled={!canQueue} onClick={()=>queueTraining(sv)}
                      style={{width:"100%",padding:"10px",background:canQueue?"linear-gradient(135deg,rgba(40,80,160,.5),rgba(40,80,160,.2))":"rgba(255,255,255,.02)",border:`1px solid ${canQueue?"rgba(60,120,220,.6)":"#181818"}`,color:canQueue?"#88aaff":"#2a2a2a",fontSize:12,fontWeight:700,letterSpacing:".08em"}}>
                      {canQueue?`⚔ Queue ${sv.toLocaleString()} Troops`:!affordable?"Insufficient resources":"Training in progress"}
                    </button>
                  </>)}
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
