import { useState, memo } from "react";
import { TROOP } from "../../../shared/constants/troops.js";

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function outcomeOf(b) {
  if (b.won && b.defTroopsEnd === 0) return { text:"VICTORY", color:"#3daa60" };
  if (!b.won && b.atkTroopsEnd === 0) return { text:"DEFEAT",  color:"#cc3030" };
  return { text:"DRAW", color:"#d0a030" };
}

const CLS_COLOR = { attacker:"#e08050", defender:"#5080e0", support:"#50d090", leader:"#d0a030" };

// ── Tri-colour troop bar ──────────────────────────────────────────────────────
function TroopBar({ start, end, wounded, isEnemy }) {
  // wounded troops are already saved inside `end` (they survive via healing tent)
  // segments: healthy = end-wounded, healing tent = wounded, killed = start-end
  const safe    = Math.max(1, start);
  const w       = Math.min(wounded ?? 0, end); // can't exceed survivors
  const healthy = Math.max(0, end - w);
  const killed  = Math.max(0, start - end);
  const pctH = Math.round((healthy / safe) * 100);
  const pctW = Math.round((w       / safe) * 100);
  const pctK = Math.max(0, 100 - pctH - pctW);
  return (
    <div style={{ height:5, background:"#0c0905", borderRadius:3, overflow:"hidden", display:"flex" }}>
      <div style={{ width:`${pctH}%`, background:"linear-gradient(90deg,#2255cc,#4488ff)", transition:"width .4s" }} />
      {!isEnemy && pctW > 0 && (
        <div style={{ width:`${pctW}%`, background:"linear-gradient(90deg,#8a6010,#d0a030)", transition:"width .4s" }} />
      )}
      {pctK > 0 && (
        <div style={{ width:`${pctK}%`, background:"linear-gradient(90deg,#882020,#cc3030)", transition:"width .4s" }} />
      )}
    </div>
  );
}

function BarLegend({ start, end, wounded, isEnemy }) {
  const w      = Math.min(wounded ?? 0, end);
  const healthy = Math.max(0, end - w);
  const killed  = Math.max(0, start - end);
  return (
    <div style={{ display:"flex", gap:8, marginTop:2, flexWrap:"wrap" }}>
      <span style={{ fontSize:6, color:"#4488ff" }}>&#x25CF; {healthy.toLocaleString()} remain</span>
      {!isEnemy && w > 0 && (
        <span style={{ fontSize:6, color:"#d0a030" }}>&#x25CF; {w.toLocaleString()} in healing tent</span>
      )}
      {killed > 0 && (
        <span style={{ fontSize:6, color:"#cc4040" }}>&#x25CF; {killed.toLocaleString()} lost</span>
      )}
    </div>
  );
}

// ── Troop stats popup (secondary) ────────────────────────────────────────────
function TroopPopup({ troopType, gearBonuses, onClose }) {
  const tt = TROOP[troopType];
  if (!tt) return null;
  const gb      = gearBonuses || {};
  const atkMult = 1 + (gb.gearArmyAtk || 0) / 100;
  const focMult = 1 + (gb.gearArmyFoc || 0) / 100;
  const spdBonus = gb.gearArmySpd || 0;
  const stats = [
    { label:"HP",    base:tt.hp,    eff:tt.hp,                       color:"#cc4444" },
    { label:"ATK",   base:tt.atk,   eff:Math.round(tt.atk*atkMult),  color:"#e08050" },
    { label:"DEF",   base:tt.def,   eff:tt.def,                      color:"#5080e0" },
    { label:"FOCUS", base:tt.focus, eff:Math.round(tt.focus*focMult),color:"#50d090" },
    { label:"SPD",   base:tt.spd,   eff:tt.spd + spdBonus,           color:"#d0a030" },
    { label:"SIEGE", base:tt.siege, eff:tt.siege, color:"#888888", isFloat:true },
  ];
  return (
    <div onClick={e => e.stopPropagation()} style={{
      position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
      zIndex:620, width:200,
      background:"#100c06", border:"1px solid #3a2e18", borderRadius:6,
      padding:"12px 14px", boxShadow:"0 8px 40px rgba(0,0,0,.95)",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:18 }}>{tt.icon}</span>
          <div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, color:"#c8a060" }}>{tt.label}</div>
            <div style={{ fontSize:7, color:"#5a4a38", fontStyle:"italic" }}>{tt.desc}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#6a5a4a", fontSize:12, cursor:"pointer" }}>&#x2715;</button>
      </div>
      <div style={{ fontSize:7, color:"#3a3028", fontFamily:"'Cinzel',serif", letterSpacing:".08em",
        marginBottom:6, paddingBottom:4, borderBottom:"1px solid #1e1808" }}>
        TROOP STATS AT BATTLE START
      </div>
      {stats.map(({ label, base, eff, color, isFloat }) => {
        const boosted = eff !== base;
        return (
          <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
            <span style={{ fontSize:7, color:"#5a4a38", fontFamily:"'Cinzel',serif", letterSpacing:".06em" }}>{label}</span>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              {boosted && <span style={{ fontSize:6, color:"#3a3028", textDecoration:"line-through" }}>{isFloat ? base.toFixed(1) : base}</span>}
              <span style={{ fontSize:9, fontWeight:700, color: boosted ? "#3daa60" : color }}>{isFloat ? eff.toFixed(1) : eff}</span>
              {boosted && <span style={{ fontSize:6, color:"#3daa60" }}>&#x2191;</span>}
            </div>
          </div>
        );
      })}
      <div style={{ marginTop:8, padding:"5px 8px", background:"rgba(255,255,255,.02)",
        border:"1px solid #1e1808", borderRadius:3 }}>
        <div style={{ fontSize:6, color:"#3a3028", fontFamily:"'Cinzel',serif", letterSpacing:".06em", marginBottom:3 }}>TYPE ADVANTAGE</div>
        <div style={{ fontSize:7, color:"#60a040" }}>Strong vs: {tt.strong.join(", ") || "—"}</div>
        <div style={{ fontSize:7, color:"#aa4040" }}>Weak vs: {tt.weak.join(", ") || "—"}</div>
      </div>
    </div>
  );
}

// ── Shared gear constants ─────────────────────────────────────────────────────
const GEAR_RC = { common:"#8a8a8a", rare:"#4488cc", epic:"#a855f7", legendary:"#f0c040" };
const GEAR_RN = { common:"Common", rare:"Rare", epic:"Epic", legendary:"Legendary" };
const GEAR_SLOT_ICONS = { helmet:"⛑", armor:"🛡", bracers:"🥊", accessory:"💍" };
const GEAR_SLOT_NAMES = { helmet:"Helmet", armor:"Armor", bracers:"Bracers", accessory:"Accessory" };
const STAT_LBL = { ATK:"Attack", FOC:"Focus", SPD:"Speed", ARMY_ATK:"+Army ATK", ARMY_FOC:"+Army FOC", ARMY_SPD:"+Army SPD", ARMY_SIEGE:"+Army Siege" };
const STAT_ICN = { ATK:"⚔", FOC:"✦", SPD:"💨", ARMY_ATK:"⚔🛡", ARMY_FOC:"✦🛡", ARMY_SPD:"💨🛡", ARMY_SIEGE:"🪨🛡" };

// ── Gear piece detail popup — matches GearInventory card style ────────────────
function GearPiecePopup({ piece, onClose }) {
  const rc = GEAR_RC[piece.rarity] ?? "#888";

  return (
    <div onClick={e => e.stopPropagation()} style={{
      position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
      zIndex:650, width:210,
      background:"#0d0b08", border:`2px solid ${rc}40`, borderRadius:7,
      padding:"12px 14px", boxShadow:"0 8px 40px rgba(0,0,0,.98)",
    }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:8 }}>
        <div style={{ fontSize:28, flexShrink:0 }}>{piece.icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, color:"#e0d0c0" }}>{piece.n}</div>
          <div style={{ display:"flex", gap:5, marginTop:3, flexWrap:"wrap" }}>
            <span style={{ padding:"1px 5px", borderRadius:3,
              background:`${rc}18`, border:`1px solid ${rc}40`,
              fontSize:7, color:rc, fontFamily:"'Cinzel',serif" }}>{GEAR_RN[piece.rarity]}</span>
            <span style={{ padding:"1px 5px", borderRadius:3,
              background:"rgba(255,255,255,.03)", border:"1px solid #2a2010",
              fontSize:7, color:"#6a5a3a", fontFamily:"'Cinzel',serif" }}>
              {GEAR_SLOT_ICONS[piece.slot]} {GEAR_SLOT_NAMES[piece.slot]}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#6a5a4a", fontSize:13, cursor:"pointer", flexShrink:0 }}>✕</button>
      </div>

      {/* Stars */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        <div style={{ display:"flex", gap:2 }}>
          {Array.from({length:5}).map((_,i) => (
            <span key={i} style={{ fontSize:9, color:i<(piece.stars??0)?"#aaaaaa":"#2a2a2a" }}>★</span>
          ))}
        </div>
        {(piece.goldStars??0) > 0 && <>
          <span style={{ color:"#3a3020", fontSize:9 }}>·</span>
          <div style={{ display:"flex", gap:2 }}>
            {Array.from({length:piece.goldStars}).map((_,i) => (
              <span key={i} style={{ fontSize:9, color:"#f0c040" }}>★</span>
            ))}
          </div>
        </>}
      </div>

      {/* Primary stat */}
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6,
        padding:"5px 8px", background:"rgba(255,255,255,.025)", borderRadius:4 }}>
        <span style={{ fontSize:8, color:"#6a5a3a", fontFamily:"'Cinzel',serif" }}>
          {STAT_ICN[piece.primaryStat]} {STAT_LBL[piece.primaryStat] ?? piece.primaryStat}
        </span>
        <span style={{ fontSize:10, color:rc, fontFamily:"'Cinzel',serif", fontWeight:700 }}>
          +{piece.primaryStatValue ?? "?"}
        </span>
      </div>

      {/* Secondary stats */}
      {piece.secStats?.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          {piece.secStats.map((s, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between",
              fontSize:8, fontFamily:"'Cinzel',serif",
              color: s.gold ? "#f0c040" : "#4a4a3a" }}>
              <span>{STAT_ICN[s.key] ?? ""} {STAT_LBL[s.key] ?? s.key}</span>
              <span style={{ color: s.gold ? "#f0c040" : "#6a6a5a" }}>
                +{typeof s.value === "number" && !Number.isInteger(s.value) ? s.value.toFixed(1) : s.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommanderPopup({ b, side, onClose }) {
  const [showTroop, setShowTroop] = useState(false);
  const [showGear, setShowGear] = useState(null); // index of gear slot or null
  const isAtk     = side === "atk";
  const name      = isAtk ? b.atkName       : b.defCmdName;
  const icon      = isAtk ? b.atkIcon       : b.defCmdIcon;
  const lvl       = isAtk ? b.atkLvl        : b.defLvl;
  const troopType = isAtk ? b.atkTroopType  : b.defTroopType;
  const troops    = isAtk ? b.atkTroopsStart : b.defTroopsStart;
  const stats     = isAtk ? b.atkCmdStats : b.defCmdStats ?? null;
  const tt        = troopType ? TROOP[troopType] : null;
  // Show all 3 commander stats always (even if 0)
  const cmdStats  = stats ? [
    { label:"ATK",   val:stats.atk ?? 0, color:"#e08050" },
    { label:"FOCUS", val:stats.foc ?? 0, color:"#50d090" },
    { label:"SPD",   val:stats.spd ?? 0, color:"#d0a030" },
  ] : [];
  const gearStats = stats ? [
    stats.gearArmyAtk   > 0 && { label:"Army ATK",    val:`+${stats.gearArmyAtk}%`   },
    stats.gearArmyFoc   > 0 && { label:"Army FOCUS",  val:`+${stats.gearArmyFoc}%`   },
    stats.gearArmySpd   > 0 && { label:"Army SPD",    val:`+${stats.gearArmySpd}`     },
    stats.gearArmySiege > 0 && { label:"Siege Power", val:`+${stats.gearArmySiege}`   },
  ].filter(Boolean) : [];

  // Gear snapshot (attacker only — defender has no gear in current data)
  const gearSlots = (isAtk && b.atkGearSnapshot) ? b.atkGearSnapshot : null;
  const SLOT_KEYS = ["helmet", "armor", "bracers", "accessory"];

  return (
    <>
      <div onClick={e => e.stopPropagation()} style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        zIndex:610, width:220,
        background:"#100c06", border:"1px solid #3a2e18", borderRadius:6,
        padding:"12px 14px", boxShadow:"0 8px 40px rgba(0,0,0,.95)",
      }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:36, height:36, borderRadius:"50%",
              background:"rgba(255,255,255,.05)", border:"1px solid #2a1e08",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, color:"#c8a060" }}>{name}</div>
              <div style={{ fontSize:7, color:"#5a4a38" }}>Level {lvl}</div>
              {(isAtk ? b.cmdCls : b.defCmdCls) && (
                <span style={{ fontSize:7, color: CLS_COLOR[b.cmdCls] ?? "#888",
                  background:"rgba(255,255,255,.04)", padding:"1px 5px",
                  borderRadius:2, display:"inline-block", marginTop:2 }}>
                  {isAtk ? b.cmdCls : b.defCmdCls}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#6a5a4a", fontSize:12, cursor:"pointer" }}>&#x2715;</button>
        </div>

        {/* Commander stats — always shown, even if 0 */}
        {cmdStats.length > 0 && <>
          <div style={{ fontSize:7, color:"#3a3028", fontFamily:"'Cinzel',serif",
            letterSpacing:".08em", marginBottom:5, paddingBottom:3, borderBottom:"1px solid #1e1808" }}>
            COMMANDER STATS
          </div>
          <div style={{ display:"flex", gap:16, marginBottom:10 }}>
            {cmdStats.map(({ label, val, color }) => (
              <div key={label} style={{ textAlign:"center" }}>
                <div style={{ fontSize:6, color:"#3a3028", fontFamily:"'Cinzel',serif", letterSpacing:".06em" }}>{label}</div>
                <div style={{ fontSize:13, fontWeight:700, color }}>{val}</div>
              </div>
            ))}
          </div>
        </>}

        {/* Gear bonuses */}
        {gearStats.length > 0 && <>
          <div style={{ fontSize:7, color:"#3a3028", fontFamily:"'Cinzel',serif",
            letterSpacing:".08em", marginBottom:5, paddingBottom:3, borderBottom:"1px solid #1e1808" }}>
            GEAR BONUSES
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 12px", marginBottom:10 }}>
            {gearStats.map(({ label, val }) => (
              <div key={label}>
                <span style={{ fontSize:6, color:"#5a4a38" }}>{label}: </span>
                <span style={{ fontSize:7, color:"#3daa60", fontWeight:700 }}>{val}</span>
              </div>
            ))}
          </div>
        </>}

        {/* Equipped gear slots — matches CommanderScreen slot card style */}
        {gearSlots && <>
          <div style={{ fontSize:7, color:"#3a3028", fontFamily:"'Cinzel',serif",
            letterSpacing:".08em", marginBottom:6, paddingBottom:3, borderBottom:"1px solid #1e1808" }}>
            EQUIPPED GEAR
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5, marginBottom:10 }}>
            {SLOT_KEYS.map((slot, i) => {
              const piece = gearSlots[i];
              const rc = piece ? (GEAR_RC[piece.rarity] ?? "#888") : null;
              const pBase = { ATK:7, FOC:7, SPD:7 };
              const rarityMult = piece ? ({ common:1, rare:1.4, epic:2.0, legendary:3.0 }[piece.rarity] ?? 1) : 1;
              const pVal = piece ? Math.round((pBase[piece.primaryStat] ?? 7) * rarityMult * (1 + (piece.stars ?? 0) * 0.12)) : null;
              return (
                <div key={slot}
                  onClick={e => { e.stopPropagation(); setShowGear(piece ? i : null); }}
                  style={{
                    padding:"20px 4px 14px", textAlign:"center",
                    background: piece ? `${rc}12` : "rgba(255,255,255,.015)",
                    border:`1px solid ${piece ? rc+"40" : "#1e1810"}`,
                    borderRadius:5, cursor: piece ? "pointer" : "default",
                    boxShadow: piece ? `0 0 8px ${rc}20` : "none",
                    transition:"all .15s",
                  }}>
                  <div style={{ fontSize: piece ? 28 : 20, marginBottom:5, opacity: piece ? 1 : 0.2 }}>
                    {piece ? piece.icon : GEAR_SLOT_ICONS[slot]}
                  </div>
                  <div style={{ fontSize:6, fontFamily:"'Cinzel',serif",
                    color: piece ? rc : "#2a2010",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                    marginBottom: piece ? 2 : 0 }}>
                    {piece ? piece.n.split(" ")[0] : GEAR_SLOT_NAMES[slot]}
                  </div>
                  {piece && <>
                    <div style={{ fontSize:6, color:"#6a5a40", fontFamily:"'Cinzel',serif", marginBottom:2 }}>
                      {STAT_ICN[piece.primaryStat]} +{pVal}
                    </div>
                    <div style={{ display:"flex", justifyContent:"center", gap:1 }}>
                      {Array.from({length:5}).map((_,si) => (
                        <span key={si} style={{ fontSize:4, color:si<(piece.stars??0)?"#aaa":"#222" }}>★</span>
                      ))}
                    </div>
                  </>}
                  {!piece && (
                    <div style={{ fontSize:5, color:"#2a2010", fontFamily:"'Cinzel',serif", marginTop:2 }}>empty</div>
                  )}
                </div>
              );
            })}
          </div>
        </>}

        {/* Troop row */}
        <div style={{ fontSize:7, color:"#3a3028", fontFamily:"'Cinzel',serif",
          letterSpacing:".08em", marginBottom:5, paddingBottom:3, borderBottom:"1px solid #1e1808" }}>
          TROOPS
        </div>
        <div onClick={() => tt && setShowTroop(true)} style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"6px 8px", borderRadius:4,
          background:"rgba(255,255,255,.03)", border:"1px solid #1e1808",
          cursor: tt ? "pointer" : "default",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:14 }}>{tt?.icon ?? "?"}</span>
            <div>
              <div style={{ fontSize:8, color:"#c8a060", fontFamily:"'Cinzel',serif" }}>{tt?.label ?? "Unknown"}</div>
              <div style={{ fontSize:7, color:"#5a4a38" }}>{(troops ?? 0).toLocaleString()} troops</div>
            </div>
          </div>
          {tt && <span style={{ fontSize:7, color:"#3a3028" }}>tap for stats &#x2192;</span>}
        </div>
      </div>

      {/* Gear piece popup */}
      {showGear !== null && gearSlots?.[showGear] && (
        <GearPiecePopup piece={gearSlots[showGear]} onClose={() => setShowGear(null)} />
      )}

      {/* Secondary troop popup */}
      {showTroop && (
        <TroopPopup troopType={troopType} gearBonuses={stats} onClose={() => setShowTroop(false)} />
      )}
    </>
  );
}
// ── Pre-battle passive phase ──────────────────────────────────────────────────
function PreBattle({ passiveSummary, cmdName }) {
  if (!passiveSummary) return null;
  const ps = passiveSummary;
  const lines = [
    ps.cmdAtkMult     > 1 && { text:`+${Math.round((ps.cmdAtkMult-1)*100)}% Commander ATK`,         color:"#f0c040" },
    ps.critChance     > 0 && { text:`+${Math.round(ps.critChance*100)}% Critical Hit Chance`,       color:"#f0c040" },
    ps.dmgReduce      > 0 && { text:`-${Math.round(ps.dmgReduce*100)}% Incoming Damage`,            color:"#60aaff" },
    ps.enemyAtkReduce > 0 && { text:`-${Math.round(ps.enemyAtkReduce*100)}% Enemy ATK`,             color:"#60aaff" },
    ps.troopAtkMult   > 1 && { text:`+${Math.round((ps.troopAtkMult-1)*100)}% Troop ATK`,           color:"#f0c040" },
    ps.troopDefMult   > 1 && { text:`+${Math.round((ps.troopDefMult-1)*100)}% Troop DEF`,           color:"#60aaff" },
    ps.healPerRound   > 0 && { text:`+${Math.round(ps.healPerRound*100)}% Troops Restored per Round`, color:"#50d090" },
    ps.garrisonIgnore > 0 && { text:`Ignore ${Math.round(ps.garrisonIgnore*100)}% Garrison Bonus`,  color:"#d0a030" },
  ].filter(Boolean);
  if (!lines.length) return null;

  return (
    <div style={{ marginBottom:14 }}>
      <div style={{
        fontSize:7, fontFamily:"'Cinzel',serif", color:"#6a5040",
        letterSpacing:".1em", marginBottom:6, paddingBottom:3,
        borderBottom:"1px solid #2a1a08",
        display:"flex", alignItems:"center", gap:6,
      }}>
        <div style={{ flex:1, height:1, background:"#2a1a08" }} />
        PRE-BATTLE — {cmdName} Passives Activated
        <div style={{ flex:1, height:1, background:"#2a1a08" }} />
      </div>
      {lines.map((l,i) => (
        <div key={i} style={{
          fontSize:8, color:l.color, lineHeight:1.7, paddingLeft:10,
          fontFamily:"'Crimson Pro',serif",
        }}>
          ✦ {l.text}
        </div>
      ))}
    </div>
  );
}

// ── Simple battle summary card ────────────────────────────────────────────────
function BattleCard({ b, onClick }) {
  const oc   = outcomeOf(b);
  const [popup, setPopup] = useState(null); // "atk"|"def"|null

  return (
    <div onClick={() => { if (!popup) onClick(); }} style={{
      position:"relative",
      padding:"10px 14px", marginBottom:8, cursor:"pointer",
      background:"rgba(255,255,255,.02)",
      border:`1px solid #221e12`,
      borderLeft:`3px solid ${oc.color}`,
      borderRadius:5, transition:"background .15s",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
        <div onClick={e => { e.stopPropagation(); setPopup(p => p==="atk" ? null : "atk"); }}
          style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer" }}>
          <span style={{ fontSize:16 }}>{b.atkIcon || "⚔"}</span>
          <div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, color:"#c8a060" }}>
              {b.atkName}
              {b.cmdCls && (
                <span style={{ marginLeft:6, fontSize:7, color: CLS_COLOR[b.cmdCls] ?? "#888",
                  background:"rgba(255,255,255,.04)", padding:"1px 5px", borderRadius:2 }}>
                  {b.cmdCls}
                </span>
              )}
            </div>
            <div style={{ fontSize:7, color:"#4a3a28" }}>Lv{b.atkLvl} · {b.terrain} · {b.modLabel} · tap for stats</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div onClick={e => { e.stopPropagation(); setPopup(p => p==="def" ? null : "def"); }}
            style={{ fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700,
              color:"#9a5050", cursor:"pointer", marginBottom:2 }}>
            {b.defCmdIcon} {b.defCmdName}
          </div>
          <div style={{ fontSize:7, color:"#3a3028" }}>{timeAgo(b.timestamp)}</div>
        </div>
      </div>

      {/* VS row: attacker | outcome | defender */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>

        {/* Left: attacker */}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:6, color:"#3a3028", fontFamily:"'Cinzel',serif", letterSpacing:".06em", marginBottom:3 }}>ATTACKER</div>
          <div style={{ fontSize:7, color:"#6a8060", marginBottom:3 }}>{b.atkTroopsStart.toLocaleString()} troops</div>
          <TroopBar start={b.atkTroopsStart} end={b.atkTroopsEnd} wounded={b.atkTroopsWounded ?? 0} isEnemy={false} />
          <BarLegend start={b.atkTroopsStart} end={b.atkTroopsEnd} wounded={b.atkTroopsWounded ?? 0} isEnemy={false} />
        </div>

        {/* Center: outcome */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flexShrink:0 }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:9, fontWeight:700, color:oc.color,
            border:`1px solid ${oc.color}55`, borderRadius:3, padding:"3px 8px", background:`${oc.color}11` }}>
            {oc.text}
          </div>
          <div style={{ fontSize:6, color:"#2a2010", fontFamily:"'Cinzel',serif" }}>VS</div>
        </div>

        {/* Right: defender */}
        <div style={{ flex:1, textAlign:"right" }}>
          <div style={{ fontSize:6, color:"#3a3028", fontFamily:"'Cinzel',serif", letterSpacing:".06em", marginBottom:3 }}>DEFENDER</div>
          <div style={{ fontSize:7, color:"#7a4040", marginBottom:3 }}>{b.defTroopsStart?.toLocaleString()} troops</div>
          <TroopBar start={b.defTroopsStart ?? 0} end={b.defTroopsEnd ?? 0} wounded={0} isEnemy={true} />
          <BarLegend start={b.defTroopsStart ?? 0} end={b.defTroopsEnd ?? 0} wounded={0} isEnemy={true} />
        </div>

      </div>

      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <div style={{ display:"flex", gap:8 }}>
          {b.won && b.xpGain > 0 && (
            <span style={{ fontSize:7, color:"#8a6030" }}>+{b.xpGain} XP</span>
          )}
          {b.bastionActive && (
            <span style={{ fontSize:7, color:"#5080e0" }}>🛡 Bastion</span>
          )}
          {b.isStage2 && (
            <span style={{ fontSize:7, color:"#5a4a38" }}>Stage 2</span>
          )}
        </div>
        <span style={{ fontSize:7, color:"#2a2018", fontFamily:"'Cinzel',serif" }}>
          {b.rounds?.length ?? 0} rounds · tap for details →
        </span>
      </div>

      {/* Commander popups */}
      {popup === "atk" && <CommanderPopup b={b} side="atk" onClose={() => setPopup(null)} />}
      {popup === "def" && <CommanderPopup b={b} side="def" onClose={() => setPopup(null)} />}
    </div>
  );
}

// ── Detailed round-by-round log ───────────────────────────────────────────────
function DetailedLog({ b }) {
  if (!b) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%",
      color:"#2a2020", fontFamily:"'Cinzel',serif", fontSize:9, fontStyle:"italic" }}>
      Select a battle on the left
    </div>
  );

  const oc   = outcomeOf(b);
  const lost = b.atkTroopsStart - b.atkTroopsEnd;

  return (
    <div>
      {/* Battle header */}
      <div style={{
        padding:"12px 14px", marginBottom:14,
        background:"rgba(0,0,0,.3)", borderRadius:5,
        border:`1px solid ${oc.color}33`,
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
          <div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:12, fontWeight:700, color:"#c8a060", marginBottom:2 }}>
              {b.atkIcon} {b.atkName}
              <span style={{ fontSize:8, color:"#5a4a38", marginLeft:6 }}>Lv{b.atkLvl}</span>
            </div>
            <div style={{ fontSize:8, color:"#5a4a38" }}>vs {b.defCmdIcon} {b.defCmdName}</div>
          </div>
          <div style={{
            fontFamily:"'Cinzel',serif", fontSize:11, fontWeight:700,
            color:oc.color, padding:"4px 10px",
            border:`1px solid ${oc.color}55`, borderRadius:3,
          }}>
            {oc.text}
          </div>
        </div>

        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 16px" }}>
          {[
            ["Terrain",    b.terrain ?? "—"],
            ["Match-up",   b.modLabel ?? "—"],
            ["Rounds",     String(b.rounds?.length ?? 0)],
            ["Lost",       lost.toLocaleString()],
            b.won && b.xpGain > 0 ? ["XP", `+${b.xpGain}`] : null,
          ].filter(Boolean).map(([k,v]) => (
            <div key={k}>
              <div style={{ fontSize:6, color:"#3a3028", fontFamily:"'Cinzel',serif", letterSpacing:".08em" }}>{k}</div>
              <div style={{ fontSize:8, color:"#8a7050" }}>{v}</div>
            </div>
          ))}
        </div>

        {b.bastionActive && (
          <div style={{ marginTop:6, fontSize:7, color:"#5080e0" }}>
            🛡 Bastion passive — double HP &amp; DEF active rounds 1-2
          </div>
        )}
      </div>

      {/* Rounds — Phase 0 (pre-battle) renders first, then rounds 1-10 */}
      {(b.rounds ?? []).map((rd) => (
        <div key={rd.round} style={{ marginBottom:12 }}>
          {/* Round divider */}
          <div style={{
            display:"flex", alignItems:"center", gap:6,
            marginBottom:5,
          }}>
            <div style={{ flex:1, height:1, background: rd.isPreBattle ? "#2a2010" : "#1e1810" }} />
            <span style={{
              fontSize:7, fontFamily:"'Cinzel',serif",
              color: rd.isPreBattle ? "#8a6030" : "#4a3a28",
              letterSpacing:".1em", flexShrink:0,
            }}>
              {rd.isPreBattle ? "⚔ PRE-BATTLE" : `ROUND ${rd.round}`}
            </span>
            <div style={{ flex:1, height:1, background: rd.isPreBattle ? "#2a2010" : "#1e1810" }} />
          </div>

          {rd.actions.map((a, ai) => {
            // Colour coding
            let color, indent;
            if (a.isHeal) {
              color = "#50d090"; indent = 12;
            } else if (a.isGear) {
              color = "#a070d0"; indent = 10;
            } else if (a.isSkill && a.isPhase0) {
              color = "#c8901a"; indent = 10;
            } else if (a.isSkill) {
              color = "#d0a030"; indent = 0;
            } else if (a.isPhase0) {
              color = "#6a5a40"; indent = 0;
            } else if (a.isPlayer === true) {
              color = "#60a8e0"; indent = 12;
            } else if (a.isPlayer === false) {
              color = "#cc6060"; indent = 12;
            } else {
              color = "#5a5068"; indent = 0;
            }

            return (
              <div key={ai} style={{
                fontSize: a.isSkill ? 7.5 : 7,
                lineHeight:1.7,
                color,
                paddingLeft: indent,
                fontFamily: a.isSkill ? "'Cinzel',serif" : "'Crimson Pro',serif",
                fontStyle: a.actor === "SYSTEM" ? "italic" : "normal",
              }}>
                {a.dmg > 0 && !a.isSkill ? (() => {
                  // Player attacks hit enemy troops; enemy attacks hit player troops
                  const killed    = a.isPlayer ? a.defKilled    : a.atkKilled;
                  const remaining = a.isPlayer ? a.defRemaining : a.atkRemaining;
                  const remainColor = a.isPlayer ? "#cc4040" : "#4080cc";
                  return (
                    <span>
                      {a.action}, deals{" "}
                      <span style={{ color:"#cc6060" }}>{a.dmg.toLocaleString()} damage</span>
                      {killed > 0 ? <>
                        {", "}
                        <span style={{ color:"#e07050" }}>{killed.toLocaleString()} {killed === 1 ? "troop" : "troops"} defeated</span>
                        {remaining !== undefined &&
                          <span style={{ color: remainColor }}> ({remaining.toLocaleString()} remain)</span>
                        }
                      </> : <span style={{ color:"#3a3028" }}> (no casualties)</span>}
                    </span>
                  );
                })() : a.isSkill ? (() => {
                  const se = a.skillEffect;
                  const cmdName = a.actor;
                  const icon = a.skillIcon ?? "✨";
                  const skillName = a.action;

                  // Phase 0 passives — already have full text baked in
                  if (a.isPhase0) return <span>{a.action}</span>;

                  // Heal actions (passive per-round heal or active healPct)
                  if (a.isHeal && a.dmg < 0) {
                    const back = a.troopsBack ?? Math.abs(a.dmg);
                    return (
                      <span>
                        {icon} {cmdName} activates <strong>{skillName}</strong> —{" "}
                        <span style={{ color:"#50d090" }}>{back.toLocaleString()} {back === 1 ? "troop" : "troops"} restored</span>
                        {a.atkRemaining !== undefined &&
                          <span style={{ color:"#4080cc" }}> ({a.atkRemaining.toLocaleString()} remain)</span>
                        }
                      </span>
                    );
                  }

                  if (!se || !se.type) {
                    // Fallback for unrecognised skill
                    return <span>{icon} {cmdName} activates <strong>{skillName}</strong></span>;
                  }

                  if (se.type === "buff") {
                    const durText = se.dur > 1 ? ` for ${se.dur} rounds` : "";
                    return (
                      <span>
                        {icon} {cmdName} activates <strong>{skillName}</strong> —{" "}
                        <span style={{ color:"#60aaff" }}>{se.stat} {se.value}{se.pct ? ` (+${se.pct}%)` : ""}{durText}</span>
                      </span>
                    );
                  }

                  if (se.type === "debuff") {
                    if (se.stat === "enemy healing") {
                      return (
                        <span>
                          {icon} {cmdName} activates <strong>{skillName}</strong> —{" "}
                          <span style={{ color:"#d0a030" }}>enemy healing blocked for {se.rounds} {se.rounds === 1 ? "round" : "rounds"}</span>
                        </span>
                      );
                    }
                    const durText = se.dur > 1 ? ` for ${se.dur} rounds` : "";
                    return (
                      <span>
                        {icon} {cmdName} activates <strong>{skillName}</strong> —{" "}
                        <span style={{ color:"#d0a030" }}>{se.stat} reduced {se.value}{durText}</span>
                      </span>
                    );
                  }

                  if (se.type === "nullify") {
                    return (
                      <span>
                        {icon} {cmdName} activates <strong>{skillName}</strong> —{" "}
                        <span style={{ color:"#d0a030" }}>enemy skill nullified this round</span>
                      </span>
                    );
                  }

                  if (se.type === "heal") {
                    const durText = se.dur > 1 ? ` over ${se.dur} rounds` : "";
                    return (
                      <span>
                        {icon} {cmdName} activates <strong>{skillName}</strong> —{" "}
                        <span style={{ color:"#50d090" }}>restoring {se.pct}% of fallen troops{durText}</span>
                      </span>
                    );
                  }

                  if (se.type === "damageBuff") {
                    const parts = [];
                    if (se.cmdMult)   parts.push(`commander damage ×${se.cmdMult}`);
                    if (se.cmdHits)   parts.push(`strikes ${se.cmdHits}× this round`);
                    if (se.critBonus) parts.push(`+${se.critBonus}% crit chance`);
                    return (
                      <span>
                        {icon} {cmdName} activates <strong>{skillName}</strong> —{" "}
                        <span style={{ color:"#f0c040" }}>{parts.join(", ")}</span>
                      </span>
                    );
                  }

                  return <span>{icon} {cmdName} activates <strong>{skillName}</strong></span>;
                })() : a.action}
                {/* Skill % HP nuke: show damage inline */}
                {a.dmg > 0 && a.isSkill && !a.skillEffect && (
                  <span style={{ color:"#cc6060", marginLeft:4, fontFamily:"'Cinzel',serif" }}>
                    [{a.dmg.toLocaleString()} dmg]
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default memo(function BattleLog({ battles, bLog, onClose }) {
  const [view,     setView]     = useState("simple");
  const [selected, setSelected] = useState(0);

  const hasBattles = battles.length > 0;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:500,
      background:"rgba(0,0,0,.7)",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <div style={{
        width:"min(700px, 96vw)", height:"min(88vh, 800px)",
        background:"#08060a",
        border:"1px solid #2a1e08",
        borderRadius:8,
        display:"flex", flexDirection:"column",
        boxShadow:"0 8px 56px rgba(0,0,0,.95)",
        overflow:"hidden",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:"12px 16px", flexShrink:0,
          borderBottom:"1px solid #1e1808",
          background:"linear-gradient(180deg,rgba(20,15,5,1),rgba(10,8,3,.97))",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          position:"relative",
        }}>
          <div style={{
            position:"absolute", top:0, left:0, right:0, height:1,
            background:"linear-gradient(90deg,transparent,#8a6020 20%,#f0c04066 50%,#8a6020 80%,transparent)",
          }} />

          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:16 }}>⚔</span>
            <span style={{
              fontFamily:"'Cinzel Decorative',serif", fontSize:12,
              background:"linear-gradient(135deg,#f0c040,#c89028)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>
              Battle Reports
            </span>
            {battles.length > 0 && (
              <span style={{
                background:"rgba(240,192,64,.12)", border:"1px solid #f0c04033",
                borderRadius:10, padding:"1px 8px",
                fontSize:7, color:"#b08040", fontFamily:"'Cinzel',serif",
              }}>
                {battles.length}
              </span>
            )}
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {hasBattles && [
              ["simple",   "📋 SUMMARY"],
              ["detailed", "📜 DETAILED"],
            ].map(([v, label]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding:"4px 10px", borderRadius:3, cursor:"pointer",
                background: view===v ? "rgba(240,192,64,.14)" : "transparent",
                border:`1px solid ${view===v ? "#f0c040" : "#2a2010"}`,
                color: view===v ? "#f0c040" : "#5a4a3a",
                fontFamily:"'Cinzel',serif", fontSize:7, letterSpacing:".06em",
              }}>
                {label}
              </button>
            ))}
            <button onClick={onClose} style={{
              width:30, height:30, borderRadius:"50%",
              background:"rgba(255,255,255,.04)", border:"1px solid #2a1e08",
              color:"#6a5a4a", fontSize:14, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        {!hasBattles ? (
          <div style={{
            flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            color:"#2a2020", fontFamily:"'Cinzel',serif", fontSize:10, fontStyle:"italic",
          }}>
            No battles recorded yet.
          </div>

        ) : view === "simple" ? (
          /* ── Summary: card list ── */
          <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
            {battles.map((b, i) => (
              <BattleCard
                key={i} b={b}
                onClick={() => { setSelected(i); setView("detailed"); }}
              />
            ))}
          </div>

        ) : (
          /* ── Detailed: picker + log ── */
          <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

            {/* Left picker */}
            <div style={{
              width:155, flexShrink:0,
              borderRight:"1px solid #1a1510",
              overflowY:"auto", padding:"8px 6px",
              background:"rgba(0,0,0,.25)",
            }}>
              {battles.map((b, i) => {
                const oc = outcomeOf(b);
                return (
                  <div key={i} onClick={() => setSelected(i)} style={{
                    padding:"7px 8px", marginBottom:4, cursor:"pointer", borderRadius:4,
                    background: i===selected ? "rgba(240,192,64,.07)" : "transparent",
                    border:`1px solid ${i===selected ? "#f0c04044" : "transparent"}`,
                    borderLeft:`2px solid ${oc.color}`,
                  }}>
                    <div style={{ fontSize:8, color:"#9a8060", fontFamily:"'Cinzel',serif",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:1 }}>
                      {b.atkIcon} {b.atkName}
                    </div>
                    <div style={{ fontSize:7, color:oc.color, marginBottom:1 }}>{oc.text}</div>
                    <div style={{ fontSize:6, color:"#3a3028" }}>{timeAgo(b.timestamp)}</div>
                  </div>
                );
              })}
            </div>

            {/* Right log */}
            <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
              <DetailedLog b={battles[selected] ?? null} />
            </div>

          </div>
        )}

      </div>
    </div>
  );
});
