import { memo } from "react";
import { FACTION_TROOPS } from "../../../shared/constants/troops.js";

// Resolve troopBranch to display label + color
function tbInfo(tb) {
  if (!tb) return null;
  const f = FACTION_TROOPS[tb.faction];
  const b = f?.branches.find(b => b.key === tb.branch);
  const t = b?.tiers[tb.tier ?? 0];
  if (!b || !t) return null;
  return { label: `${b.label} · ${t.label}`, color: "#c8a060", size: b.size, dmgType: b.dmgType };
}
import { TERR } from "../../../shared/constants/terrain.js";
import { RSS, POWER_DEFS, SIEGE_BASE, HQP, TC, FORT_LEVELS } from "../../../shared/constants/map.js";
import { garrisonDefCmd } from "../../../shared/utils/garrisonUtils.js";
import { isTileInRange, buildAnchors } from "../../../hooks/useForts.js";

export default memo(function TilePopup({
  selKey, selTile, popupPos, popupMode, setPopupMode,
  onEnterHQ,
  cmds, cmdsOnSel, marchingToSel, canAtk, crewmatePlayerIds,
  barracksPool, editArmyCmd, setEditArmyCmd,
  sliderVals, setSliderVals,
  deletingTiles, deletingSecsLeft, setDeletingTiles, setDeletingSecsLeft,
  setSelKey, setPopupPos,
  setAtkKey, setMode, setPick, setMvCmd, setReinCmd,
  recallMarch, recallStationary,
  setBarracks, setCmds, setTroopSlot,
  startMarch,
  nowTick, playerHqKey, facKey,
  // Fort props
  forts, buildFort, upgradeFort, getFortAtTile, startReposition,
}) {
  if (!selKey || !selTile || !popupPos) return null;

  // ── HQ popup — Enter or Summon ──
  if (popupMode === "hqEnter" || popupMode === "hqSummon") {
    const closeHqPopup = () => { setSelKey(null); setPopupPos(null); setPopupMode("main"); };

    // All player commanders that are stationary (not marching) and NOT already at HQ
    const { HQP } = (typeof window !== "undefined" && window.__GAME_CONSTS__) || {};
    const playerHqKeyLocal = playerHqKey;
    const stationaryCmds = cmds.filter(c =>
      c.owner === "player" && !c.march && c.tk && c.tk !== playerHqKeyLocal
    );

    return (
      <>
      <div style={{
        position:"fixed", left:popupPos.x, top:popupPos.y,
        width:130, zIndex:500,
        background:"rgba(5,7,11,.97)",
        border:"1px solid #8a6020",
        borderRadius:6,
        boxShadow:"0 4px 20px rgba(0,0,0,.9), 0 0 0 1px rgba(200,160,64,.15)",
        animation:"fadeUp .15s ease",
        pointerEvents:"auto",
        overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{
          padding:"6px 8px 4px",
          borderBottom:"1px solid #2a1e08",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          {popupMode === "hqSummon" && (
            <button className="btn" onClick={() => setPopupMode("hqEnter")}
              style={{background:"none",border:"none",color:"#6a5a4a",fontSize:10,padding:"0 2px",cursor:"pointer",marginRight:4}}>←</button>
          )}
          <span style={{fontFamily:"'Cinzel',serif", fontSize:10, color:"#c8a060", letterSpacing:".05em", flex:1}}>
            {popupMode === "hqSummon" ? "↩ Summon Commander" : "🏰 Headquarters"}
          </span>
          <button className="btn" onClick={closeHqPopup}
            onTouchEnd={e => { e.preventDefault(); closeHqPopup(); }}
            style={{background:"none",border:"none",color:"#6a5a4a",fontSize:16,minWidth:36,minHeight:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent",margin:"-6px -4px"}}>✕</button>
        </div>

        {/* Enter / Summon buttons */}
        {popupMode === "hqEnter" && (
          <div style={{padding:"8px", display:"flex", flexDirection:"column", gap:5}}>
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
            >⚔ Enter</button>
            <button
              onClick={() => setPopupMode("hqSummon")}
              style={{
                width:"100%", padding:"7px 0",
                background:"linear-gradient(160deg,#082838,#041824)",
                border:"1px solid #206880",
                borderRadius:4,
                color:"#60c0f0", fontFamily:"'Cinzel',serif", fontSize:11,
                letterSpacing:".06em", cursor:"pointer",
                boxShadow:"inset 0 1px 0 rgba(255,255,255,.08)",
              }}
            >↩ Summon</button>
          </div>
        )}

        {/* Summon commander picker */}
        {popupMode === "hqSummon" && (
          <div style={{padding:"6px 7px", maxHeight:220, overflowY:"auto"}}>
            {stationaryCmds.length === 0 ? (
              <div style={{fontSize:8, color:"#5a4a3a", fontFamily:"'Crimson Pro',serif", fontStyle:"italic", textAlign:"center", padding:"10px 0"}}>
                No commanders available to recall
              </div>
            ) : stationaryCmds.map(cmd => (
              <div key={cmd.uid}
                onClick={() => { recallStationary(cmd.uid); closeHqPopup(); }}
                style={{
                  display:"flex", alignItems:"center", gap:6, marginBottom:4,
                  padding:"4px 6px",
                  background:"rgba(96,192,240,.06)",
                  border:"1px solid rgba(96,192,240,.2)",
                  borderRadius:4, cursor:"pointer",
                }}>
                <span style={{fontSize:14}}>{cmd.icon}</span>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontFamily:"'Cinzel',serif", fontSize:8, color:"#c0e0f8", fontWeight:700,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{cmd.n}</div>
                  <div style={{fontSize:7, color:"#4a7a8a"}}>
                    Lv{cmd.lvl||5} · {(cmd.troops||0).toLocaleString()} troops
                  </div>
                </div>
                <span style={{fontSize:9, color:"#60c0f0", flexShrink:0}}>↩</span>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
    );
  }

  const titleColor = selTile.owner==="player" ? TC.player.dot
    : selTile.owner==="ai" ? "#dd4422"
    : selTile.owner ? TC[selTile.owner]?.dot||"#c8a060"
    : "#a09080";

  const titleLabel = popupMode==="editArmy" ? "🔧 Edit Army"
    : popupMode==="recallPick" ? "↩ Recall Commander"
    : selTile.isWin   ? "⚜ The Holy Grail"
    : selTile.isGate && selTile.crossingType === "crossing"   ? `🌊 ${selTile.keepName || "River Crossing"}`
    : selTile.isGate && selTile.crossingType === "tunnel"     ? `⛰ ${selTile.keepName || "Tunnel Gate"}`
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
              ⚡ {POWER_DEFS[selTile.powerLevel]?.label}
            </span>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {popupMode==="main" && (
            <span style={{fontSize:7,color:"#6a9a6a",fontFamily:"'Cinzel',serif",letterSpacing:".05em",background:"rgba(106,154,106,.1)",padding:"1px 5px",borderRadius:3,border:"1px solid rgba(106,154,106,.28)",lineHeight:"14px"}}>
              {selTile.c},{selTile.r}
            </span>
          )}
          <button className="btn" onClick={close}
            onTouchEnd={e => { e.preventDefault(); close(); }}
            style={{background:"none",border:"none",color:"#4a4040",fontSize:16,minWidth:36,minHeight:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent",margin:"-6px -4px"}}>✕</button>
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
                +{selTile.powerLevel === 1
                  ? "50/hr (all)"
                  : `${({2:240,3:280,4:360,5:420,6:560,7:640,8:720,9:800,10:1000,11:1200,12:1400,13:1600}[selTile.powerLevel]??240)}/hr`}
              </span>
            </div>
          )}

          {/* Siege bar */}
          {!selTile.isHQ && (() => {
            const sv = selTile.siege ?? SIEGE_BASE;
            const sm = selTile.siegeMax ?? SIEGE_BASE;
            const pct = Math.round((sv/sm)*100);
            const totalWaves   = selTile.garrisonWaves ?? 1;
            const defeatedCount = selTile.defeatedWaves?.length ?? 0;
            const allDefeated  = defeatedCount >= totalWaves && totalWaves > 0;
            const hasProgress  = defeatedCount > 0;
            const resetSecs = selTile.resetAt ? Math.max(0,Math.ceil((selTile.resetAt-Date.now())/1000)) : null;
            const siegeLabel = allDefeated
              ? "🏰 SIEGE — ALL WAVES CLEARED"
              : hasProgress
                ? `🏰 SIEGE — WAVE ${defeatedCount}/${totalWaves} CLEARED`
                : "🏰 SIEGE";
            const borderCol = allDefeated ? "rgba(240,192,64,.3)" : hasProgress ? "rgba(200,120,40,.3)" : "#1e1810";
            const labelCol  = allDefeated ? "#f0c040" : hasProgress ? "#d08030" : "#7a6a5a";
            return (
              <div style={{marginBottom:4,padding:"3px 6px",background:"rgba(255,255,255,.03)",borderRadius:3,border:`1px solid ${borderCol}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:7,color:labelCol,fontWeight:700}}>{siegeLabel}</span>
                  <span style={{fontSize:7,color:pct>66?"#3daa60":pct>33?"#d0a030":"#cc3030",fontFamily:"'Cinzel',serif",fontWeight:700}}>{sv}/{sm}</span>
                </div>
                <div style={{height:3,background:"#181820",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pct>66?"#3daa60":pct>33?"#d0a030":"#cc3030",borderRadius:2,transition:"width .3s"}}/>
                </div>
                {/* Wave progress pip bar for keeps/gates */}
                {totalWaves > 1 && (
                  <div style={{display:"flex",gap:2,marginTop:3,alignItems:"center"}}>
                    <span style={{fontSize:6,color:"#5a4a40",fontFamily:"'Cinzel',serif",marginRight:2}}>WAVES</span>
                    {Array.from({length:totalWaves}).map((_,i) => (
                      <div key={i} style={{
                        flex:1, height:3, borderRadius:1,
                        background: i < defeatedCount ? "#f0c040" : "#2a2020",
                        border: i < defeatedCount ? "none" : "1px solid #3a2a20",
                      }}/>
                    ))}
                    <span style={{fontSize:6,color:labelCol,fontFamily:"'Cinzel',serif",marginLeft:2,whiteSpace:"nowrap"}}>{defeatedCount}/{totalWaves}</span>
                  </div>
                )}
                {resetSecs !== null && hasProgress && (
                  <div style={{fontSize:6,color:"#8a7040",fontFamily:"'Crimson Pro',serif",marginTop:2}}>Resets in {resetSecs}s</div>
                )}
              </div>
            );
          })()}

          {/* Fort info panel */}
          {(() => {
            const fort = getFortAtTile?.(selKey);
            if (!fort) return null;
            const levelDef = FORT_LEVELS[fort.level - 1];
            const nextDef = fort.level < 5 ? FORT_LEVELS[fort.level] : null;
            const siegePct = Math.round((fort.siege / fort.siegeMax) * 100);
            const stationedCount = fort.stationedCmdUids?.length || 0;
            return (
              <div style={{marginBottom:4,padding:"4px 6px",background:"rgba(180,130,20,.08)",borderRadius:3,border:"1px solid rgba(180,130,20,.3)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:8,color:"#d4a030",fontWeight:700}}>🏯 FORT — LVL {fort.level}</span>
                  <span style={{fontSize:7,color:"#a07828",fontFamily:"'Cinzel',serif"}}>{stationedCount}/{levelDef.capacity} stationed</span>
                </div>
                {/* Siege bar */}
                <div style={{marginBottom:3}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:6,color:"#7a6a4a",marginBottom:1}}>
                    <span>FORT SIEGE</span>
                    <span style={{color:siegePct>66?"#3daa60":siegePct>33?"#d0a030":"#cc3030"}}>{fort.siege.toLocaleString()}/{fort.siegeMax.toLocaleString()}</span>
                  </div>
                  <div style={{height:3,background:"#181820",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${siegePct}%`,background:siegePct>66?"#3daa60":siegePct>33?"#d0a030":"#cc3030",borderRadius:2}}/>
                  </div>
                </div>
                {/* Upgrade button */}
                {nextDef && selTile.owner==="player" && (
                  <button className="btn" onClick={() => upgradeFort?.(fort.id)}
                    style={{width:"100%",padding:"3px 0",background:"linear-gradient(135deg,rgba(60,80,20,.5),rgba(40,60,10,.3))",border:"1px solid #6a8020",color:"#a0c040",fontSize:7,fontWeight:700,marginTop:2}}>
                    ⬆ Upgrade to Lv{fort.level+1} ({nextDef.capacity} capacity, {(nextDef.siege/1000).toFixed(0)}K siege)
                  </button>
                )}
                {/* Reposition button — for idle player commanders not at this fort */}
                {selTile.owner==="player" && cmdsOnSel.length === 0 && (() => {
                  const idleCmds = cmds.filter(c => c.owner==="player" && !c.march && c.tk !== selKey && !c.stranded);
                  if (!idleCmds.length) return null;
                  return (
                    <button className="btn" onClick={() => {
                      if (idleCmds.length === 1) startReposition?.(idleCmds[0].uid, selKey, fort.id);
                      else setPopupMode("repositionPick");
                    }}
                      style={{width:"100%",padding:"3px 0",background:"linear-gradient(135deg,rgba(20,60,100,.5),rgba(10,40,80,.3))",border:"1px solid #2060a0",color:"#60a0e0",fontSize:7,fontWeight:700,marginTop:2}}>
                      📍 Reposition Commander Here
                    </button>
                  );
                })()}
              </div>
            );
          })()}

          {/* Enemy garrison */}
          {selTile.owner !== "player" && (() => {
            const isAiOwned = selTile.owner==="ai";
            const isNeutral = !selTile.owner;
            const liveAiCmd = isAiOwned ? cmds.find(c => c.owner==="ai" && c.tk===selKey && !c.march) : null;
            const aiCmdPresent = !!liveAiCmd;
            // Neutral tiles: always generate garrison from garrisonDefCmd; AI tiles: live cmd or garrisonDefCmd; else stored defCmd
            const dc = aiCmdPresent ? liveAiCmd
              : (isAiOwned || isNeutral) ? garrisonDefCmd(selTile, facKey)
              : selTile.defCmd;
            if (!dc) return null;
            const plvl = selTile.powerLevel || 1;
            const totalWaves    = selTile.garrisonWaves ?? (plvl >= 10 ? 2 : (selTile.isGate || selTile.isKeep ? 2 : 1));
            const defeatedCount = selTile.defeatedWaves?.length ?? 0;
            const wavesLeft     = Math.max(0, totalWaves - defeatedCount);
            return (
              <div style={{marginBottom:4,padding:"3px 6px",background:"rgba(200,40,40,.06)",borderRadius:3,border:"1px solid rgba(200,40,40,.2)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:7,color:"#8a5a4a",fontFamily:"'Cinzel',serif",letterSpacing:".06em"}}>
                      {isAiOwned ? (aiCmdPresent?"ENEMY COMMANDER":"GARRISON") : "GARRISON"}
                    </span>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:10,color:"#e07050",fontWeight:700}}>Lv{dc.lvl??"?"}</span>
                  </div>
                  {totalWaves > 1 && (
                    <span style={{fontSize:6,color:wavesLeft>0?"#d08030":"#6a4a30",fontFamily:"'Cinzel',serif",fontWeight:700}}>
                      {wavesLeft}/{totalWaves} waves
                    </span>
                  )}
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
                const stam = cmd.stamina ?? 200;
                const stamPct = Math.max(0, Math.min(100, (stam / 200) * 100));
                const stamColor = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";
                return (
                  <div key={cmd.uid} style={{display:"flex",alignItems:"center",gap:4,marginBottom:2,padding:"2px 4px",background:"rgba(60,170,80,.07)",borderRadius:3,border:"1px solid rgba(60,170,80,.2)"}}>
                    <span style={{fontSize:10}}>{cmd.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{fontFamily:"'Cinzel',serif",fontSize:7,color:"#90c870",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cmd.n}</span>
                        <span style={{fontFamily:"'Cinzel',serif",fontSize:6,color:"#f0c040",flexShrink:0}}>Lv{cmd.lvl||5}</span>
                      </div>
                      {(() => {
                        const slots = cmd.troopSlots || (cmd.troopBranch ? [{branch:cmd.troopBranch}] : []);
                        if (!slots.length) return null;
                        return <div style={{fontSize:7,color:"#c8a060"}}>{slots.map(sl=>tbInfo(sl.branch)?.label).filter(Boolean).join(' + ')} · {(cmd.troops||0).toLocaleString()}</div>;
                      })()}
                      {/* Stamina bar */}
                      <div style={{display:"flex",alignItems:"center",gap:3,marginTop:2}}>
                        <span style={{fontSize:5,color:"#7a9a7a"}}>⚡</span>
                        <div style={{flex:1,height:3,background:"rgba(0,0,0,.4)",borderRadius:2,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${stamPct}%`,background:stamColor,borderRadius:2,transition:"width .3s"}}/>
                        </div>
                        <span style={{fontSize:5,color:stamColor,fontFamily:"'Cinzel',serif",flexShrink:0}}>{Math.floor(stam)}</span>
                      </div>
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
            {selTile.owner!=="player" && canAtk && !crewmatePlayerIds?.has(selTile.ownerPlayerId) && selTile.faction !== facKey && (() => {
              // Check if best available attacker has ≥20 stamina
              const candidates = cmds.filter(c => c.owner==="player" && !c.march && (c.troops||0)>0);
              const hasStam = candidates.some(c => (c.stamina ?? 200) >= 20);
              return (
                <button className="btn"
                  onClick={() => hasStam ? (setAtkKey(selKey), setMode("pickAttackCmd"), setPick(null)) : null}
                  title={hasStam ? "" : "No commanders with enough stamina (need 20⚡)"}
                  style={{flex:1,padding:"5px 3px",
                    background: hasStam
                      ? "linear-gradient(135deg,rgba(140,20,20,.6),rgba(100,10,10,.4))"
                      : "rgba(60,20,20,.3)",
                    border:`1px solid ${hasStam?"#cc2020":"#553030"}`,
                    color:hasStam?"#f0a0a0":"#7a5050",
                    fontSize:9,fontWeight:700,
                    cursor:hasStam?"pointer":"not-allowed",opacity:hasStam?1:.6}}>
                  ⚔ Attack · 20⚡ {!hasStam && <span style={{fontSize:7}}>low</span>}
                </button>
              );
            })()}
            {selTile.owner!=="player" && canAtk && crewmatePlayerIds?.has(selTile.ownerPlayerId) && (() => {
              const candidates = cmds.filter(c => c.owner==="player" && !c.march && (c.troops||0)>0);
              const hasStam = candidates.some(c => (c.stamina ?? 200) >= 10);
              return (
                <button className="btn"
                  onClick={() => hasStam ? (setAtkKey(selKey), setMode("pickMoveCmd"), setPick(null)) : null}
                  title={hasStam ? "" : "Need 10⚡ stamina to move"}
                  style={{flex:1,padding:"5px 3px",
                    background: hasStam ? "linear-gradient(135deg,rgba(20,80,40,.6),rgba(10,60,30,.4))" : "rgba(20,40,20,.3)",
                    border:`1px solid ${hasStam?"#2a8040":"#2a4a2a"}`,
                    color:hasStam?"#80d090":"#507050",
                    fontSize:9,fontWeight:700,
                    cursor:hasStam?"pointer":"not-allowed",opacity:hasStam?1:.6}}>
                  🚶 Move · 10⚡ {!hasStam && <span style={{fontSize:7}}>low</span>}
                </button>
              );
            })()}
            {selTile.owner==="player" && (() => {
              const candidates = cmds.filter(c => c.owner==="player" && !c.march && (c.troops||0)>0);
              if (!candidates.length) return null;
              const hasStam = candidates.some(c => (c.stamina ?? 200) >= 10);
              // Range check — find the best candidate and check their station's range
              const bestCmd = candidates.find(c => (c.stamina ?? 200) >= 10);
              let inRange = true;
              if (bestCmd && forts && playerHqKey) {
                const stationedFort = bestCmd.stationedFortId ? forts.find(f => f.id === bestCmd.stationedFortId) : null;
                const stationKey = stationedFort ? stationedFort.tileKey : playerHqKey;
                const [sc, sr] = stationKey.split(",").map(Number);
                inRange = isTileInRange(selKey, [{ c: sc, r: sr }]);
              }
              const canMove = hasStam && inRange;
              return (
                <button className="btn"
                  onClick={() => canMove ? (setAtkKey(selKey), setMode("pickMoveCmd"), setPick(null)) : null}
                  title={!hasStam ? "Need 10⚡ stamina to move" : !inRange ? "Outside range — reposition to a closer fort first" : ""}
                  style={{flex:1,padding:"5px 3px",
                    background: canMove ? "linear-gradient(135deg,rgba(20,80,40,.6),rgba(10,60,30,.4))" : "rgba(20,40,20,.3)",
                    border:`1px solid ${canMove?"#2a8040":"#2a4a2a"}`,
                    color:canMove?"#80d090":"#507050",
                    fontSize:9,fontWeight:700,
                    cursor:canMove?"pointer":"not-allowed",opacity:canMove?1:.6}}>
                  🚶 Move · 10⚡ {!hasStam && <span style={{fontSize:7}}>low</span>}{hasStam && !inRange && <span style={{fontSize:7}}>out of range</span>}
                </button>
              );
            })()}
            {(selTile.owner==="player" || cmdsOnSel.length>0) && cmdsOnSel.some(c=>(c.troopSlots?.length>0||c.troopBranch)&&!c.march) && barracksPool>0 && (
              <button className="btn" onClick={() => { setReinCmd(cmdsOnSel.find(c=>(c.troopSlots?.length>0||c.troopBranch)&&!c.march)); setMode("reinforce"); }}
                style={{flex:1,padding:"5px 3px",background:"linear-gradient(135deg,rgba(20,40,120,.6),rgba(10,30,100,.4))",border:"1px solid #2a40cc",color:"#80a0ff",fontSize:9,fontWeight:700}}>🔄</button>
            )}
            {(selTile.owner==="player" || cmdsOnSel.length>0) && cmdsOnSel.some(c=>c.march) && (
              <button className="btn" onClick={() => cmdsOnSel.filter(c=>c.march).forEach(c=>recallMarch(c.uid))}
                style={{flex:1,padding:"5px 3px",background:"linear-gradient(135deg,rgba(120,40,40,.5),rgba(100,20,20,.3))",border:"1px solid #cc4444",color:"#ff9090",fontSize:9,fontWeight:700}}>↩</button>
            )}
            {(selTile.owner==="player" || cmdsOnSel.length>0) && cmdsOnSel.some(c=>!c.march) && selKey !== (playerHqKey || `${HQP.player.c},${HQP.player.r}`) && (
              <button className="btn" onClick={() => {
                const idle = cmdsOnSel.filter(c=>!c.march);
                if (idle.length===1) { recallStationary(idle[0].uid); }
                else { setPopupMode("recallPick"); }
              }}
                style={{flex:1,padding:"5px 3px",background:"linear-gradient(135deg,rgba(100,60,20,.5),rgba(80,40,10,.3))",border:"1px solid #c89030",color:"#f0c040",fontSize:9,fontWeight:700}}>🏰</button>
            )}
            {(selTile.owner==="player" || cmdsOnSel.length>0) && cmdsOnSel.some(c=>(c.troopSlots?.length>0||c.troopBranch)&&!c.march) && (
              <button className="btn" onClick={() => { setEditArmyCmd(cmdsOnSel.find(c=>(c.troopSlots?.length>0||c.troopBranch)&&!c.march)); setPopupMode("editArmy"); }}
                style={{flex:"0 0 auto",padding:"5px 7px",background:"linear-gradient(135deg,rgba(60,50,20,.5),rgba(40,30,10,.3))",border:"1px solid #7a6a30",color:"#c0a840",fontSize:11,fontWeight:700}}>🔧</button>
            )}
            {selTile.owner==="player" && !selTile.isHQ && !deletingTiles[selKey] && (
              <button className="btn" onClick={() => {
                setDeletingTiles(p=>({...p,[selKey]:Date.now()}));
                setDeletingSecsLeft(p=>({...p,[selKey]:15}));
              }}
                style={{flex:"0 0 auto",padding:"5px 7px",background:"linear-gradient(135deg,rgba(120,10,10,.6),rgba(80,0,0,.4))",border:"1px solid #cc1010",color:"#ff6060",fontSize:11,fontWeight:700}}>✕</button>
            )}
            {/* Build Fort button — owned non-HQ tiles P9 or below */}
            {selTile.owner==="player" && !selTile.isHQ && (selTile.powerLevel||1) <= 9 && !getFortAtTile?.(selKey) && (
              <button className="btn" onClick={() => buildFort?.(selKey, selTile)}
                style={{flex:1,padding:"5px 3px",background:"linear-gradient(135deg,rgba(80,50,10,.6),rgba(60,30,0,.4))",border:"1px solid #a07020",color:"#f0c060",fontSize:9,fontWeight:700}}>
                🏯 Build Fort
              </button>
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
          {selTile.owner!=="player" && canAtk && crewmatePlayerIds?.has(selTile.ownerPlayerId) && (
            <div style={{fontSize:7,color:"#2299ff",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",marginTop:3,textAlign:"center"}}>🤝 Crew territory — you can move here freely</div>
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
                  <div style={{fontSize:7,color:"#7a7a5a"}}>{(()=>{ const slots=cmd.troopSlots||[]; if(slots.length>0) return slots.map(sl=>tbInfo(sl.branch)?.label).filter(Boolean).join(' + ')+' · '+(cmd.troops||0).toLocaleString(); if(cmd.troopBranch) return tbInfo(cmd.troopBranch)?.label+' · '+(cmd.troops||0).toLocaleString(); return 'No troops'; })()}</div>
                </div>
                <span style={{fontSize:8,color:"#f0c040"}}>🏰</span>
              </div>
            ))}
          </div>
        )}

        {/* ── REPOSITION PICK ── */}
        {popupMode==="repositionPick" && (() => {
          const fort = getFortAtTile?.(selKey);
          if (!fort) return null;
          const idleCmds = cmds.filter(c => c.owner==="player" && !c.march && c.tk !== selKey && !c.stranded);
          return (
            <div>
              <div style={{fontSize:7,color:"#8a7060",fontFamily:"'Cinzel',serif",letterSpacing:".06em",marginBottom:6}}>REPOSITION TO FORT LV{fort.level}</div>
              {idleCmds.length === 0 ? (
                <div style={{fontSize:8,color:"#5a4a3a",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",textAlign:"center",padding:"10px 0"}}>No idle commanders</div>
              ) : idleCmds.map(cmd => (
                <div key={cmd.uid} onClick={() => { startReposition?.(cmd.uid, selKey, fort.id); setPopupMode("main"); }}
                  style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,padding:"4px 6px",background:"rgba(32,96,160,.07)",border:"1px solid rgba(32,96,160,.25)",borderRadius:4,cursor:"pointer"}}>
                  <span style={{fontSize:14}}>{cmd.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:8,color:"#80b0e0",fontWeight:700}}>{cmd.n}</div>
                    <div style={{fontSize:7,color:"#4a7a8a"}}>Lv{cmd.lvl||5} · {(cmd.troops||0).toLocaleString()} troops</div>
                  </div>
                  <span style={{fontSize:9,color:"#60a0e0",flexShrink:0}}>📍</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── EDIT ARMY ── multi-slot editor (1-3 slots) */}
        {popupMode==="editArmy" && editArmyCmd && (() => {
          const cmd = editArmyCmd;
          const slots = cmd.troopSlots && cmd.troopSlots.length > 0
            ? cmd.troopSlots
            : (cmd.troopBranch ? [{ branch: cmd.troopBranch, troops: cmd.troops||0 }] : []);
          // Show current slots + one empty add-slot row (if < 3)
          const displaySlots = slots.length < 3
            ? [...slots, { branch: null, troops: 0 }]
            : slots;
          return (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,padding:"4px 6px",background:"rgba(60,170,80,.07)",borderRadius:3,border:"1px solid rgba(60,170,80,.2)"}}>
                <span style={{fontSize:16}}>{cmd.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:8,color:"#90c870",fontWeight:700}}>{cmd.n} Lv{cmd.lvl||5}</div>
                  <div style={{fontSize:7,color:"#6a8a6a"}}>{(cmd.troops||0).toLocaleString()} total troops</div>
                </div>
              </div>
              {displaySlots.map((sl, si) => {
                const isNew = si >= slots.length;
                const ti = tbInfo(sl.branch);
                const sk = `ea_${cmd.uid}_${si}`;
                const cur = sl.troops || 0;
                const sv = sliderVals[sk] ?? cur;
                const toRemove = cur - sv;
                // Build branch picker from FACTION_TROOPS
                const allBranches = Object.entries(FACTION_TROOPS).flatMap(([fk, fd]) =>
                  fd.branches.flatMap(b => b.tiers.map((t, ti2) => ({
                    label: `${b.label} — ${t.label} (${fd.name})`,
                    value: JSON.stringify({ faction: fk, branch: b.key, tier: ti2 }),
                    color: "#c8a060",
                  })))
                );
                return (
                  <div key={si} style={{marginBottom:8,padding:"5px 6px",background:"rgba(255,255,255,.02)",borderRadius:4,border:`1px solid ${isNew?"rgba(100,120,80,.2)":"rgba(80,120,60,.3)"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontFamily:"'Cinzel',serif",fontSize:7,color:"#8a9a7a",letterSpacing:".06em"}}>
                        {isNew ? "＋ ADD SLOT" : `SLOT ${si+1}`}
                      </span>
                      {!isNew && (
                        <button className="btn" onClick={() => {
                          if (setTroopSlot) setTroopSlot(cmd.uid, si, null, 0);
                          setEditArmyCmd(p => {
                            const ns = (p.troopSlots||[]).filter((_,i)=>i!==si);
                            return { ...p, troopSlots: ns, troops: ns.reduce((s,x)=>s+(x.troops||0),0), troopBranch: ns[0]?.branch??null };
                          });
                          setSliderVals(v=>({...v,[sk]:undefined}));
                        }} style={{padding:"1px 5px",fontSize:6,background:"rgba(180,40,40,.15)",border:"1px solid #aa3333",color:"#ff8888"}}>
                          ✕ Remove
                        </button>
                      )}
                    </div>
                    {/* Branch picker */}
                    <select
                      value={sl.branch ? JSON.stringify(sl.branch) : ""}
                      onChange={e => {
                        const branch = e.target.value ? JSON.parse(e.target.value) : null;
                        if (setTroopSlot) setTroopSlot(cmd.uid, si, branch, branch ? Math.max(1, cur) : 0);
                        setEditArmyCmd(p => {
                          const ns = [...(p.troopSlots||[])];
                          while (ns.length <= si) ns.push({ branch: null, troops: 0 });
                          ns[si] = { branch, troops: branch ? Math.max(1, cur) : 0 };
                          const filtered = ns.filter(x => (x.troops||0) > 0 || x.branch).slice(0,3);
                          return { ...p, troopSlots: filtered, troopBranch: filtered[0]?.branch??null, troops: filtered.reduce((s,x)=>s+(x.troops||0),0) };
                        });
                        setSliderVals(v=>({...v,[sk]:undefined}));
                      }}
                      style={{width:"100%",marginBottom:4,fontSize:7,background:"#0d0f14",color:"#c0a060",border:"1px solid #3a2e18",borderRadius:3,padding:"2px 4px"}}
                    >
                      <option value="">— Select troop type —</option>
                      {allBranches.map(b => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                    {/* Count slider (only when branch selected) */}
                    {sl.branch && !isNew && (
                      <>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:6,color:"#6a5a4a",fontFamily:"'Cinzel',serif",marginBottom:2}}>
                          <span>TROOPS</span>
                          <span style={{color:toRemove>0?"#cc5050":"#3daa60"}}>{sv.toLocaleString()}{toRemove>0&&<span style={{color:"#cc5050",marginLeft:3}}>(-{toRemove})</span>}</span>
                        </div>
                        <input type="range" min={0} max={cur} value={sv}
                          onChange={e => setSliderVals(v=>({...v,[sk]:+e.target.value}))}
                          style={{width:"100%",accentColor:"#cc5050",marginBottom:4}}/>
                        {toRemove > 0 && (
                          <button className="btn" onClick={() => {
                            if (setTroopSlot) setTroopSlot(cmd.uid, si, sl.branch, sv);
                            setEditArmyCmd(p => {
                              const ns = [...(p.troopSlots||[])];
                              ns[si] = { ...ns[si], troops: sv };
                              const filtered = ns.filter(x => (x.troops||0) > 0 || x.branch).slice(0,3);
                              return { ...p, troopSlots: filtered, troops: filtered.reduce((s,x)=>s+(x.troops||0),0) };
                            });
                            setSliderVals(v=>({...v,[sk]:undefined}));
                          }} style={{width:"100%",padding:"4px",background:"linear-gradient(135deg,rgba(150,40,40,.4),rgba(150,40,40,.15))",border:"1px solid #cc4444",color:"#dd6666",fontSize:8,fontWeight:700}}>
                            Remove {toRemove.toLocaleString()} troops
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
});
