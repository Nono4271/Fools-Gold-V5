import { memo } from "react";
import { FACTION_TROOPS } from "../../../shared/constants/troops.js";

// Resolve troopBranch to display label + color
function tbInfo(tb) {
  if (!tb) return null;
  const f = FACTION_TROOPS[tb.faction];
  const b = f?.branches.find(b => b.key === tb.branch);
  const t = b?.tiers[tb.tier ?? 0];
  if (!b || !t) return null;
  return { label: `${b.label} 2014 ${t.label}`, color: "#c8a060", size: b.size, dmgType: b.dmgType };
}
import { TERR } from "../../../shared/constants/terrain.js";
import { RSS, POWER_DEFS, SIEGE_BASE, HQP, TC } from "../../../shared/constants/map.js";
import { BLDG } from "../../../shared/constants/buildings.js";
import { garrisonDefCmd } from "../../../shared/utils/battle.js";

export default memo(function TilePopup({
  selKey, selTile, popupPos, popupMode, setPopupMode,
  onEnterHQ,
  cmds, cmdsOnSel, marchingToSel, canAtk,
  barracksPool, editArmyCmd, setEditArmyCmd,
  sliderVals, setSliderVals,
  deletingTiles, deletingSecsLeft, setDeletingTiles, setDeletingSecsLeft,
  setSelKey, setPopupPos,
  setAtkKey, setMode, setPick, setMvCmd, setReinCmd,
  recallMarch, recallStationary,
  setBarracks, setCmds,
  nowTick, playerHqKey,
}) {
  if (!selKey || !selTile || !popupPos) return null;

  // ── HQ "Enter" popup — just a single button ──
  if (popupMode === "hqEnter") {
    return (
      <div style={{
        position:"fixed", left:popupPos.x, top:popupPos.y,
        width:120, zIndex:500,
        background:"rgba(5,7,11,.97)",
        border:"1px solid #8a6020",
        borderRadius:6,
        boxShadow:"0 4px 20px rgba(0,0,0,.9), 0 0 0 1px rgba(200,160,64,.15)",
        animation:"fadeUp .15s ease",
        pointerEvents:"auto",
        overflow:"hidden",
      }}>
        <div style={{
          padding:"6px 8px 4px",
          borderBottom:"1px solid #2a1e08",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <span style={{fontFamily:"'Cinzel',serif", fontSize:10, color:"#c8a060", letterSpacing:".05em"}}>
            🏰 Headquarters
          </span>
          <button className="btn" onClick={() => { setSelKey(null); setPopupPos(null); setPopupMode("main"); }}
            style={{background:"none",border:"none",color:"#6a5a4a",fontSize:11,padding:"0 2px",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:"8px"}}>
          <button
            onClick={() => { onEnterHQ(); setSelKey(null); setPopupPos(null); setPopupMode("main"); }}
            style={{
              width:"100%", padding:"7px 0",
              background:"linear-gradient(160deg,#3a2808,#1e1404)",
              border:"1px solid #8a6020",
              borderRadius:4,
              color:"#f0c060", fontFamily:"'Cinzel',serif", fontSize:11,
              letterSpacing:".06em", cursor:"pointer",
              boxShadow:"inset 0 1px 0 rgba(255,255,255,.08)",
            }}
          >Enter</button>
        </div>
      </div>
    );
  }

  const titleColor = selTile.owner==="player" ? TC.player.dot
    : selTile.owner==="ai" ? "#dd4422"
    : selTile.owner ? TC[selTile.owner]?.dot||"#c8a060"
    : "#a09080";

  const titleLabel = popupMode==="editArmy" ? "🔧 Edit Army"
    : popupMode==="recallPick" ? "↩ Recall Commander"
    : selTile.isWin   ? "⚜ The Holy Grail"
    : selTile.isKeep  ? `🏰 ${selTile.keepName || selTile.regionName + " Keep"}`
    : selTile.isRuin  ? "🏚 Ruin"
    : selTile.regionName ? `${TERR[selTile.terrain]?.lbl||"Tile"} · ${selTile.regionName}`
    : TERR[selTile.terrain]?.lbl||"Tile";

  const close = () => { setSelKey(null); setPopupPos(null); setPopupMode("main"); setEditArmyCmd(null); };

  return (
    <div style={{position:"fixed",left:popupPos.x,top:popupPos.y,width:180,zIndex:500,background:"rgba(5,7,11,.96)",border:"1px solid #2a2418",borderRadius:6,boxShadow:"0 4px 20px rgba(0,0,0,.85)",animation:"fadeUp .15s ease",pointerEvents:"auto"}}>

      {/* Header */}
      <div style={{padding:"5px 7px 4px",borderBottom:"1px solid #1e1810",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {popupMode!=="main" && (
            <button className="btn" onClick={() => { setPopupMode("main"); setEditArmyCmd(null); }}
              style={{background:"none",border:"none",color:"#6a5a4a",fontSize:10,padding:"0 2px"}}>←</button>
          )}
          <span style={{fontFamily:"'Cinzel',serif",fontSize:9,fontWeight:700,color:titleColor}}>{titleLabel}</span>
          {popupMode==="main" && selTile.owner==="ai" && (
            <span style={{fontSize:7,color:"#dd4422",fontFamily:"'Cinzel',serif",fontWeight:700,background:"rgba(200,50,30,.15)",padding:"1px 4px",borderRadius:3,border:"1px solid rgba(200,50,30,.35)"}}>☠ ENEMY</span>
          )}
          {popupMode==="main" && selTile.powerLevel && !selTile.isHQ && (
            <span style={{fontSize:7,color:POWER_DEFS[selTile.powerLevel]?.color,fontFamily:"'Cinzel',serif",fontWeight:700,background:`${POWER_DEFS[selTile.powerLevel]?.color}18`,padding:"1px 4px",borderRadius:3,border:`1px solid ${POWER_DEFS[selTile.powerLevel]?.color}40`}}>
              P{POWER_DEFS[selTile.powerLevel]?.label}
            </span>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {popupMode==="main" && (
            <span style={{fontSize:7,color:"#6a9a6a",fontFamily:"'Cinzel',serif",letterSpacing:".05em",background:"rgba(106,154,106,.1)",padding:"1px 5px",borderRadius:3,border:"1px solid rgba(106,154,106,.28)",lineHeight:"14px"}}>
              {selTile.c},{selTile.r}
            </span>
          )}
          <button className="btn" onClick={close} style={{background:"none",border:"none",color:"#4a4040",fontSize:11,padding:"0 2px",lineHeight:1}}>✕</button>
        </div>
      </div>

      <div style={{padding:"5px 7px"}}>

        {/* ── MAIN MODE ── */}
        {popupMode==="main" && (<>

          {/* Resource */}
          {selTile.rss && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,padding:"3px 6px",background:"rgba(255,255,255,.03)",borderRadius:3,border:"1px solid #1e1810"}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:10}}>{RSS[selTile.rss].icon}</span>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:7,color:RSS[selTile.rss].col,fontWeight:700}}>{RSS[selTile.rss].lbl}</span>
              </div>
              <span style={{fontSize:7,color:"#6a7a5a",fontFamily:"'Cinzel',serif"}}>
                +{BLDG[selTile.rss==="stone"?"quarry":selTile.rss==="wood"?"lumber":selTile.rss==="ore"?"forge":"refinery"]?.rate||50}/s
              </span>
            </div>
          )}

          {/* Siege bar */}
          {!selTile.isHQ && (() => {
            const sv = selTile.siege ?? SIEGE_BASE;
            const sm = selTile.siegeMax ?? SIEGE_BASE;
            const pct = Math.round((sv/sm)*100);
            const isDefeated = selTile.garrisonDefeated;
            const resetSecs = selTile.resetAt ? Math.max(0,Math.ceil((selTile.resetAt-Date.now())/1000)) : null;
            return (
              <div style={{marginBottom:4,padding:"3px 6px",background:"rgba(255,255,255,.03)",borderRadius:3,border:`1px solid ${isDefeated?"rgba(240,192,64,.3)":"#1e1810"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:7,color:isDefeated?"#f0c040":"#7a6a5a",fontWeight:700}}>🏰 SIEGE{isDefeated?" — GARRISON DEFEATED":""}</span>
                  <span style={{fontSize:7,color:pct>66?"#3daa60":pct>33?"#d0a030":"#cc3030",fontFamily:"'Cinzel',serif",fontWeight:700}}>{sv}/{sm}</span>
                </div>
                <div style={{height:3,background:"#181820",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pct>66?"#3daa60":pct>33?"#d0a030":"#cc3030",borderRadius:2,transition:"width .3s"}}/>
                </div>
                {isDefeated && resetSecs!==null && (
                  <div style={{fontSize:6,color:"#8a7040",fontFamily:"'Crimson Pro',serif",marginTop:2}}>Resets in {resetSecs}s</div>
                )}
              </div>
            );
          })()}

          {/* Enemy garrison */}
          {selTile.owner !== "player" && (selTile.defCmd || selTile.owner==="ai") && (() => {
            const isAiOwned = selTile.owner==="ai";
            const aiCmdPresent = isAiOwned && cmds.some(c => c.owner==="ai" && c.tk===selKey && !c.march);
            const dc = (isAiOwned && !aiCmdPresent) ? garrisonDefCmd(selTile) : selTile.defCmd;
            if (!dc) return null;
            const tt = tbInfo(dc.troopBranch);
            return (
              <div style={{marginBottom:4,padding:"3px 6px",background:"rgba(200,40,40,.06)",borderRadius:3,border:"1px solid rgba(200,40,40,.2)"}}>
                <div style={{fontSize:7,color:"#8a5a4a",fontFamily:"'Cinzel',serif",letterSpacing:".06em",marginBottom:3}}>
                  {isAiOwned ? (aiCmdPresent?"ENEMY COMMANDER":"GARRISON") : "GARRISON"}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{textAlign:"center"}}><div style={{fontFamily:"'Cinzel',serif",fontSize:10,color:"#e07050",fontWeight:700}}>Lv{dc.lvl}</div><div style={{fontSize:6,color:"#5a4a40"}}>Level</div></div>
                  <div style={{textAlign:"center"}}><div style={{fontFamily:"'Cinzel',serif",fontSize:10,color:"#e07050",fontWeight:700}}>{dc.troops.toLocaleString()}</div><div style={{fontSize:6,color:"#5a4a40"}}>Troops</div></div>
                  {/* Fog of war: never show enemy commander name or troop type */}
                  {!isAiOwned && tt && <div style={{display:"flex",alignItems:"center",gap:3,marginLeft:"auto"}}><span style={{fontSize:10}}></span><span style={{fontSize:7,color:tt.color,fontFamily:"'Cinzel',serif"}}>{tt.label}</span></div>}
                  {isAiOwned && <div style={{marginLeft:"auto",fontSize:7,color:"#5a4040",fontFamily:"'Cinzel',serif",fontStyle:"italic"}}>Enemy Commander</div>}
                </div>
              </div>
            );
          })()}

          {/* Player commanders on tile */}
          {selTile.owner==="player" && cmdsOnSel.length>0 && (
            <div style={{marginBottom:4}}>
              <div style={{fontSize:7,color:"#4a6a4a",fontFamily:"'Cinzel',serif",letterSpacing:".06em",marginBottom:3}}>COMMANDERS</div>
              {cmdsOnSel.map(cmd => {
                const tt = tbInfo(cmd.troopBranch);
                return (
                  <div key={cmd.uid} style={{display:"flex",alignItems:"center",gap:4,marginBottom:2,padding:"2px 4px",background:"rgba(60,170,80,.07)",borderRadius:3,border:"1px solid rgba(60,170,80,.2)"}}>
                    <span style={{fontSize:10}}>{cmd.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{fontFamily:"'Cinzel',serif",fontSize:7,color:"#90c870",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cmd.n}</span>
                        <span style={{fontFamily:"'Cinzel',serif",fontSize:6,color:"#f0c040",flexShrink:0}}>Lv{cmd.lvl||5}</span>
                      </div>
                      {tt && <div style={{fontSize:7,color:tt.color}}>{tt.label} {(cmd.troops||0).toLocaleString()}</div>}
                    </div>
                    {cmd.march && <div style={{fontSize:6,color:"#f0c040",fontFamily:"'Cinzel',serif",flexShrink:0}}>→</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Draw rematch timer */}
          {cmdsOnSel.filter(c => c.drawTimer && c.drawTile === selKey).map(cmd => {
            const secsLeft = Math.max(0, Math.ceil((cmd.drawTimer - (nowTick || Date.now())) / 1000));
            const mins = Math.floor(secsLeft / 60);
            const secs = secsLeft % 60;
            return (
              <div key={cmd.uid} style={{marginBottom:4,padding:"4px 6px",background:"rgba(192,160,0,.1)",borderRadius:3,border:"1px solid rgba(192,160,0,.4)"}}>
                <div style={{fontSize:7,color:"#c8a020",fontFamily:"'Cinzel',serif",letterSpacing:".06em",marginBottom:3}}>⚔ DRAW — REMATCH PENDING</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:10}}>{cmd.icon}</span>
                  <span style={{fontSize:7,color:"#d0b840",fontFamily:"'Cinzel',serif",flex:1}}>{cmd.n}</span>
                  <span style={{fontSize:8,color:"#e0c040",fontWeight:700,minWidth:32,textAlign:"right"}}>
                    {mins}:{secs.toString().padStart(2,"0")}
                  </span>
                  <button className="btn" onClick={() => recallStationary(cmd.uid)}
                    style={{padding:"2px 5px",fontSize:6,background:"rgba(180,60,60,.2)",border:"1px solid #cc4444",color:"#ff9090",flexShrink:0}}>
                    ↩ Recall
                  </button>
                </div>
              </div>
            );
          })}

          {/* En route */}
          {marchingToSel.length>0 && (
            <div style={{marginBottom:4,padding:"3px 6px",background:"rgba(240,192,64,.05)",borderRadius:3,border:"1px solid rgba(240,192,64,.2)"}}>
              <div style={{fontSize:7,color:"#c8a040",fontFamily:"'Cinzel',serif",letterSpacing:".06em",marginBottom:2}}>EN ROUTE</div>
              {marchingToSel.map(cmd => {
                const eta = Math.ceil((cmd.march.path.length-cmd.march.step-1)*cmd.march.stepMs/1000);
                return (
                  <div key={cmd.uid} style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                    <span style={{fontSize:10}}>{cmd.icon}</span>
                    <span style={{fontSize:7,color:"#c0a860",fontFamily:"'Cinzel',serif",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cmd.n}</span>
                    <span style={{fontSize:6,color:cmd.march.type==="attack"?"#ff6666":"#44cc88",flexShrink:0}}>~{eta}s</span>
                    <button className="btn" onClick={() => recallMarch(cmd.uid)}
                      style={{padding:"1px 4px",fontSize:6,background:"rgba(200,60,60,.15)",border:"1px solid #cc4444",color:"#ff8888",flexShrink:0}}>↩</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          <div style={{display:"flex",gap:3,marginTop:4,flexWrap:"wrap"}}>
            {selTile.owner!=="player" && canAtk && (
              <button className="btn" onClick={() => { setAtkKey(selKey); setMode("pickAttackCmd"); setPick(null); }}
                style={{flex:1,padding:"5px 3px",background:"linear-gradient(135deg,rgba(140,20,20,.6),rgba(100,10,10,.4))",border:"1px solid #cc2020",color:"#f0a0a0",fontSize:9,fontWeight:700}}>⚔ Attack</button>
            )}
            {selTile.owner==="player" && cmdsOnSel.filter(c=>!c.march&&(c.troops||0)>0).length>0 && (
              <button className="btn" onClick={() => { setMvCmd(cmdsOnSel.filter(c=>!c.march&&(c.troops||0)>0)[0]); setMode("selectMarchDest"); }}
                style={{flex:1,padding:"5px 3px",background:"linear-gradient(135deg,rgba(20,80,40,.6),rgba(10,60,30,.4))",border:"1px solid #2a8040",color:"#80d090",fontSize:9,fontWeight:700}}>🚶 Move</button>
            )}
            {selTile.owner==="player" && cmdsOnSel.some(c=>c.troopBranch&&!c.march) && barracksPool>0 && (
              <button className="btn" onClick={() => { setReinCmd(cmdsOnSel.find(c=>c.troopBranch&&!c.march)); setMode("reinforce"); }}
                style={{flex:1,padding:"5px 3px",background:"linear-gradient(135deg,rgba(20,40,120,.6),rgba(10,30,100,.4))",border:"1px solid #2a40cc",color:"#80a0ff",fontSize:9,fontWeight:700}}>🔄</button>
            )}
            {selTile.owner==="player" && cmdsOnSel.some(c=>c.march) && (
              <button className="btn" onClick={() => cmdsOnSel.filter(c=>c.march).forEach(c=>recallMarch(c.uid))}
                style={{flex:1,padding:"5px 3px",background:"linear-gradient(135deg,rgba(120,40,40,.5),rgba(100,20,20,.3))",border:"1px solid #cc4444",color:"#ff9090",fontSize:9,fontWeight:700}}>↩</button>
            )}
            {selTile.owner==="player" && cmdsOnSel.some(c=>!c.march) && selKey !== (playerHqKey || `${HQP.player.c},${HQP.player.r}`) && (
              <button className="btn" onClick={() => {
                const idle = cmdsOnSel.filter(c=>!c.march);
                if (idle.length===1) { recallStationary(idle[0].uid); }
                else { setPopupMode("recallPick"); }
              }}
                style={{flex:1,padding:"5px 3px",background:"linear-gradient(135deg,rgba(100,60,20,.5),rgba(80,40,10,.3))",border:"1px solid #c89030",color:"#f0c040",fontSize:9,fontWeight:700}}>🏰</button>
            )}
            {selTile.owner==="player" && cmdsOnSel.some(c=>c.troopBranch&&!c.march) && (
              <button className="btn" onClick={() => { setEditArmyCmd(cmdsOnSel.find(c=>c.troopBranch&&!c.march)); setPopupMode("editArmy"); }}
                style={{flex:"0 0 auto",padding:"5px 7px",background:"linear-gradient(135deg,rgba(60,50,20,.5),rgba(40,30,10,.3))",border:"1px solid #7a6a30",color:"#c0a840",fontSize:11,fontWeight:700}}>🔧</button>
            )}
            {selTile.owner==="player" && !selTile.isHQ && !deletingTiles[selKey] && (
              <button className="btn" onClick={() => {
                setDeletingTiles(p=>({...p,[selKey]:Date.now()}));
                setDeletingSecsLeft(p=>({...p,[selKey]:15}));
              }}
                style={{flex:"0 0 auto",padding:"5px 7px",background:"linear-gradient(135deg,rgba(120,10,10,.6),rgba(80,0,0,.4))",border:"1px solid #cc1010",color:"#ff6060",fontSize:11,fontWeight:700}}>✕</button>
            )}
          </div>

          {/* Abandon countdown */}
          {deletingTiles[selKey] && (
            <div style={{marginTop:6,padding:"5px 6px",background:"rgba(120,10,10,.15)",border:"1px solid #cc1010",borderRadius:4}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:7,color:"#ff6060",fontWeight:700,letterSpacing:".06em"}}>🏳 ABANDONING IN {deletingSecsLeft[selKey]??15}s</span>
                <button className="btn" onClick={() => {
                  setDeletingTiles(p=>{const n={...p};delete n[selKey];return n;});
                  setDeletingSecsLeft(p=>{const n={...p};delete n[selKey];return n;});
                }}
                  style={{padding:"2px 6px",background:"rgba(40,40,40,.6)",border:"1px solid #555",color:"#ccc",fontSize:7,fontWeight:700,borderRadius:3}}>CANCEL</button>
              </div>
              <div style={{height:4,background:"rgba(0,0,0,.4)",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${((deletingSecsLeft[selKey]??15)/15)*100}%`,background:"linear-gradient(90deg,#cc1010,#ff4040)",borderRadius:2,transition:"width .25s linear"}}/>
              </div>
            </div>
          )}

          {selTile.owner!=="player" && !canAtk && !selTile.isWin && (
            <div style={{fontSize:7,color:"#5a4a3a",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",marginTop:3,textAlign:"center"}}>Own an adjacent tile to attack</div>
          )}
        </>)}

        {/* ── RECALL PICK ── */}
        {popupMode==="recallPick" && (
          <div>
            <div style={{fontSize:7,color:"#8a7060",fontFamily:"'Cinzel',serif",letterSpacing:".06em",marginBottom:6}}>SELECT COMMANDER TO RECALL</div>
            {cmdsOnSel.filter(c=>!c.march).map(cmd => (
              <div key={cmd.uid} onClick={() => { recallStationary(cmd.uid); setPopupMode("main"); }}
                style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,padding:"4px 6px",background:"rgba(240,192,64,.07)",border:"1px solid rgba(240,192,64,.2)",borderRadius:4,cursor:"pointer"}}>
                <span style={{fontSize:14}}>{cmd.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:8,color:"#e0d0c0",fontWeight:700}}>{cmd.n}</div>
                  <div style={{fontSize:7,color:"#7a7a5a"}}>{cmd.troopBranch ? tbInfo(cmd.troopBranch)?.label + ' ' + (cmd.troops||0).toLocaleString() : "No troops":"No troops"}</div>
                </div>
                <span style={{fontSize:8,color:"#f0c040"}}>🏰</span>
              </div>
            ))}
          </div>
        )}

        {/* ── EDIT ARMY ── */}
        {popupMode==="editArmy" && editArmyCmd && (() => {
          const cmd = editArmyCmd;
          const cur = cmd.troops||0;
          const sk = `ea_${cmd.uid}`;
          const sv = sliderVals[sk]??cur;
          const toRemove = cur-sv;
          return (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,padding:"4px 6px",background:"rgba(60,170,80,.07)",borderRadius:3,border:"1px solid rgba(60,170,80,.2)"}}>
                <span style={{fontSize:16}}>{cmd.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:8,color:"#90c870",fontWeight:700}}>{cmd.n}</div>
                  {(() => { const _ti = tbInfo(cmd.troopBranch); return _ti ? <div style={{fontSize:7,color:_ti.color}}>{_ti.label}</div> : null; })()}
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#6a5a4a",fontFamily:"'Cinzel',serif",marginBottom:3}}>
                <span>TROOPS</span>
                <span style={{color:toRemove>0?"#cc5050":"#3daa60"}}>{sv.toLocaleString()} / {cur.toLocaleString()}{toRemove>0&&<span style={{color:"#cc5050",marginLeft:4}}>(-{toRemove})</span>}</span>
              </div>
              <input type="range" min={0} max={cur} value={sv}
                onChange={e => setSliderVals(v=>({...v,[sk]:+e.target.value}))}
                style={{width:"100%",accentColor:"#cc5050",marginBottom:6}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:6,color:"#4a4a5a",marginBottom:6}}><span>0</span><span>{cur.toLocaleString()}</span></div>
              {toRemove>0
                ? <button className="btn" onClick={() => {
                    setBarracks(p=>p+toRemove);
                    setCmds(p=>p.map(c=>c.uid===cmd.uid?{...c,troops:sv,troopBranch:sv===0?null:c.troopBranch}:c));
                    setEditArmyCmd({...cmd,troops:sv});
                    setSliderVals(v=>({...v,[sk]:undefined}));
                  }}
                  style={{width:"100%",padding:"6px",background:"linear-gradient(135deg,rgba(150,40,40,.4),rgba(150,40,40,.15))",border:"1px solid #cc4444",color:"#dd6666",fontSize:9,fontWeight:700}}>
                  Remove {toRemove.toLocaleString()} troops
                </button>
                : <div style={{fontSize:7,color:"#4a4a5a",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",textAlign:"center"}}>Slide left to remove troops</div>
              }
            </div>
          );
        })()}
      </div>
    </div>
  );
});
