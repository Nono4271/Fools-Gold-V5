import { memo } from "react";
import { FACTION_TROOPS, troopSizeModifier } from "../../../shared/constants/troops.js";
import { TERR } from "../../../shared/constants/terrain.js";
import { RC, RARITY, CLASS, SS } from "../../../shared/constants/heroes.js";
import { effectiveMarchSpd, marchStepMs } from "../../../shared/utils/pathfinding.js";
const SC = RC;

function tbInfo(tb) {
  if (!tb) return null;
  const f = FACTION_TROOPS[tb.faction];
  const b = f?.branches.find(b => b.key === tb.branch);
  const t = b?.tiers[tb.tier ?? 0];
  if (!b || !t) return null;
  return { label: `${b.label} — ${t.label}`, color: "#c8a060", size: b.size };
}

export default memo(function CommanderPicker({
  atkKey, tiles, cmdsAdjToSel, pickCmd, setPick,
  setMode, setAtkKey, setSelKey, setPopupPos, startMarch,
}) {
  if (!atkKey) return null;
  const atkTile = tiles[atkKey];

  return (
    <div style={{position:"fixed",top:"calc(var(--sat, 0px) + 38px)",left:"var(--sal, 0px)",bottom:"var(--sab, 0px)",width:280,zIndex:9500,background:"rgba(5,7,11,.97)",borderRight:"1px solid #3a2010",boxShadow:"4px 0 32px rgba(0,0,0,.9)",display:"flex",flexDirection:"column",animation:"slideInLeft .22s ease"}}>

      {/* Header */}
      <div style={{padding:"10px 12px",borderBottom:"1px solid #221e12",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:"rgba(255,255,255,.025)"}}>
        <div>
          <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:12,color:"#c8a060"}}>⚔ SELECT COMMANDER</div>
          {atkTile && (
            <div style={{fontSize:8,color:"#7a5a4a",fontFamily:"'Crimson Pro',serif",marginTop:2}}>
              Attacking {TERR[atkTile.terrain]?.lbl}{atkTile.isHQ?" (HQ)":""} · {atkTile.garrison} garrison
              {(TERR[atkTile.terrain]?.def||0)!==0 && (
                <span style={{color:TERR[atkTile.terrain]?.def>0?"#e08080":"#80e090"}}>
                  {" · DEF "}{TERR[atkTile.terrain]?.def>0?"+":""}{TERR[atkTile.terrain]?.def}%
                </span>
              )}
            </div>
          )}
        </div>
        <button className="btn"
          onClick={() => { setMode("view"); setAtkKey(null); setPick(null); }}
          onTouchEnd={e => { e.preventDefault(); setMode("view"); setAtkKey(null); setPick(null); }}
          style={{background:"none",border:"1px solid #2a2a2a",color:"#777",fontSize:16,
            minWidth:36,minHeight:36,display:"flex",alignItems:"center",justifyContent:"center",
            cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent",
            borderRadius:4,flexShrink:0}}>✕</button>
      </div>

      {/* Commander list */}
      <div className="scr" style={{flex:1,overflowY:"auto",padding:"10px 12px",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain"}}>
        {cmdsAdjToSel.length===0 ? (
          <div style={{padding:"12px",background:"rgba(255,255,255,.02)",border:"1px solid #2a2020",borderRadius:5,fontSize:9,color:"#6a5a4a",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",textAlign:"center"}}>
            No eligible commanders. A commander with troops must be on a player-owned tile to attack.
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {cmdsAdjToSel.map(cmd => {
              const picked = pickCmd?.uid===cmd.uid;
              const tt = tbInfo(cmd.troopBranch);
              const atkSize = cmd.troopBranch ? (FACTION_TROOPS[cmd.troopBranch.faction]?.branches.find(b=>b.key===cmd.troopBranch.branch)?.size ?? null) : null;
              const defSize = atkTile?.defCmd?.troopBranch ? (FACTION_TROOPS[atkTile.defCmd.troopBranch.faction]?.branches.find(b=>b.key===atkTile.defCmd.troopBranch.branch)?.size ?? null) : null;
              const mod = troopSizeModifier(atkSize, defSize);
              const modColor = mod===1.1?"#3daa60":mod===0.9?"#cc3030":"#8a8a9a";
              const modLabel = mod===1.1?"⚔ STRONG":mod===0.9?"🛡 WEAK":"◆ NEUTRAL";
              const wp = (() => {
                // Use per-troop tier stats (hp × avg_dmg geometric mean) so large
                // troops with high individual stats aren't under-rated vs small counts.
                const atkBranch = cmd.troopBranch
                  ? FACTION_TROOPS[cmd.troopBranch.faction]?.branches.find(b => b.key === cmd.troopBranch.branch)
                  : null;
                const atkTier = atkBranch?.tiers[cmd.troopBranch?.tier ?? 0];
                const atkStatMult = atkTier
                  ? Math.sqrt(((atkTier.dmgLo + atkTier.dmgHi) / 2) * atkTier.hp)
                  : 35;
                // cmd.troops is the raw command budget; use actual unit count from slots.
                const atkUnits = cmd.troopSlots?.length > 0
                  ? cmd.troopSlots.reduce((s, sl) => s + (sl.troops || 0), 0)
                  : (cmd.troops || 0);
                const atkPow = atkUnits * atkStatMult * Math.pow(1.20,(cmd.lvl||5)-5) * mod;

                const dc = atkTile?.defCmd;
                // dc.troops is the raw command budget for garrison commanders; sum slots instead.
                const defTroops = dc
                  ? (dc.troopSlots?.length > 0
                      ? dc.troopSlots.reduce((s, sl) => s + (sl.troops || 0), 0)
                      : (dc.troops || 0))
                  : (atkTile?.garrison || 30);
                const defBranch = dc?.troopBranch
                  ? FACTION_TROOPS[dc.troopBranch.faction]?.branches.find(b => b.key === dc.troopBranch.branch)
                  : null;
                const defTier = defBranch?.tiers[dc?.troopBranch?.tier ?? 0];
                const defStatMult = defTier
                  ? Math.sqrt(((defTier.dmgLo + defTier.dmgHi) / 2) * defTier.hp)
                  : 35;
                const defPow = defTroops * defStatMult * Math.pow(1.20,Math.max(0,(dc?.lvl||2)-2)) * (1+((TERR[atkTile?.terrain]?.def||0)/100));

                if (atkPow<=0) return 1;
                return Math.round(Math.min(99,Math.max(1,100/(1+Math.pow(Math.max(0.00001,defPow/atkPow),3.5)))));
              })();

              const stepMs = marchStepMs(effectiveMarchSpd(cmd.spd || 60, cmd.troopBranch));
              const etaS   = Math.ceil(stepMs / 1000);
              const etaStr = etaS < 60 ? `${etaS}s` : `${Math.floor(etaS/60)}m ${etaS%60}s`;

              return (
                <button key={cmd.uid} onClick={() => setPick(picked?null:cmd)}
                  style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",background:picked?"rgba(60,170,100,.15)":"rgba(255,255,255,.03)",border:`2px solid ${picked?"#3daa60":"rgba(255,255,255,.06)"}`,borderRadius:8,cursor:"pointer",transition:"all .15s",boxShadow:picked?"0 0 12px rgba(60,170,100,.4)":"none",width:"100%",textAlign:"left",fontFamily:"inherit",color:"inherit",touchAction:"pan-y",WebkitTapHighlightColor:"transparent"}}>
                  {cmd.bust
                    ? <img src={cmd.bust} alt={cmd.n} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",flexShrink:0}} />
                    : <div style={{fontSize:28,flexShrink:0}}>{cmd.icon}</div>
                  }
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,color:picked?"#3daa60":"#e0d0c0",marginBottom:1}}>{cmd.n}</div>
                    <div style={{fontSize:8,color:SC(cmd.rarity),marginBottom:2,fontFamily:"'Cinzel',serif"}}>{SS(cmd.rarity)}{cmd.cls ? ` · ${CLASS[cmd.cls]?.icon} ${CLASS[cmd.cls]?.n}` : ''} · Lv{cmd.lvl||5}</div>
                    {tt
                      ? <div style={{fontSize:9,color:tt.color,fontWeight:700,marginBottom:2}}>{tt.label} · {cmd.troops.toLocaleString()}</div>
                      : <div style={{fontSize:8,color:"#664a3a",fontStyle:"italic",marginBottom:2}}>No troops</div>
                    }
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:8,color:modColor,fontWeight:700}}>{modLabel}</span>
                      <div style={{flex:1,height:3,background:"#181820",borderRadius:2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${wp}%`,background:wp>=60?"#3daa60":wp>=40?"#d0a030":"#cc3030",borderRadius:2}}/>
                      </div>
                      <span style={{fontSize:8,color:wp>=60?"#3daa60":wp>=40?"#d0a030":"#cc3030",fontWeight:700,flexShrink:0}}>~{wp}%</span>
                    </div>
                    {/* Stamina */}
                    {(() => {
                      const stam = cmd.stamina ?? 200;
                      const sc   = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";
                      const pct  = Math.max(0, Math.min(100, (stam / 200) * 100));
                      return (
                        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                          <span style={{fontSize:7,color:sc,fontFamily:"'Cinzel',serif",flexShrink:0}}>⚡{Math.floor(stam)}/200</span>
                          <div style={{flex:1,height:3,background:"#181820",borderRadius:2,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${pct}%`,background:sc,borderRadius:2}}/>
                          </div>
                          {stam < 20 && <span style={{fontSize:6,color:"#cc4040",fontFamily:"'Cinzel',serif",flexShrink:0}}>LOW</span>}
                        </div>
                      );
                    })()}
                    <div style={{marginTop:4,fontSize:7,color:"#4488ff",fontFamily:"'Cinzel',serif",letterSpacing:".05em"}}>
                      🚶 {etaStr} march
                    </div>
                  </div>
                  {picked && <div style={{fontSize:10,color:"#3daa60",flexShrink:0}}>✓</div>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* March button */}
      <div style={{padding:"12px",borderTop:"1px solid #221e12",flexShrink:0}}>
        <button className="btn" disabled={!pickCmd}
          onClick={() => {
            if (pickCmd && atkKey) {
              startMarch(pickCmd, atkKey);
              setAtkKey(null); setPick(null); setMode("view");
              setSelKey(null); setPopupPos(null);
            }
          }}
          style={{width:"100%",padding:"13px",background:pickCmd?"linear-gradient(135deg,#881010,#cc2020,#881010)":"rgba(255,255,255,.02)",border:pickCmd?"2px solid #e03030":"2px solid #1a1a1a",color:pickCmd?"#f0c040":"#2a2a2a",fontSize:14,fontWeight:700,letterSpacing:".1em",boxShadow:pickCmd?"0 0 16px rgba(200,30,30,.45)":"none",transition:"all .2s",borderRadius:5}}>
          {pickCmd ? `⚔ MARCH! — ${pickCmd.n}  ·  20⚡` : "Select a commander"}
        </button>
      </div>
    </div>
  );
});
