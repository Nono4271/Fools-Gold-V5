import { useState, memo } from "react";
import { FACTION_TROOPS } from "../../../shared/constants/troops.js";

// Resolve a troopBranch descriptor to { branchDef, tierData }
function resolveTroopBranch(tb) {
  if (!tb) return null;
  const f = FACTION_TROOPS[tb.faction];
  if (!f) return null;
  const b = f.branches.find(b => b.key === tb.branch);
  if (!b) return null;
  return { branchDef: b, tierData: b.tiers[tb.tier ?? 0] ?? null, faction: f };
}

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
function TroopPopup({ troopBranch, onClose }) {
  const resolved = resolveTroopBranch(troopBranch);
  if (!resolved) return null;
  const { branchDef: br, tierData: td, faction: f } = resolved;
  const stats = [
    { label:"HP",    val:td.hp,    color:"#cc4444" },
    { label:"DMG",   val:`${td.dmgLo}–${td.dmgHi}`, color:"#e08050" },
    { label:"DEF",   val:td.def,   color:"#5080e0" },
    { label:"SPD",   val:td.spd,   color:"#d0a030" },
    { label:"SIEGE", val:td.siege, color:"#888888" },
  ];
  const dmgTypeColor = br.dmgType === "magical" ? "#a855f7" : "#e08050";
  return (
    <div onClick={e => e.stopPropagation()} style={{
      position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
      zIndex:5002, width:220,
      background:"#100c06", border:"1px solid #3a2e18", borderRadius:6,
      padding:"12px 14px", boxShadow:"0 8px 40px rgba(0,0,0,.95)",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, color:"#c8a060" }}>
            {br.label} — {td.label}
          </div>
          <div style={{ fontSize:7, color:"#5a4a38", fontStyle:"italic", marginTop:1 }}>
            {f.quarters} · {br.size} · <span style={{ color:dmgTypeColor }}>{br.dmgType}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#6a5a4a", fontSize:12, cursor:"pointer" }}>✕</button>
      </div>
      <div style={{ fontSize:7, color:"#3a3028", fontFamily:"'Cinzel',serif", letterSpacing:".08em",
        marginBottom:6, paddingBottom:4, borderBottom:"1px solid #1e1808" }}>
        TROOP STATS
      </div>
      {stats.map(({ label, val, color }) => (
        <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
          <span style={{ fontSize:7, color:"#5a4a38", fontFamily:"'Cinzel',serif", letterSpacing:".06em" }}>{label}</span>
          <span style={{ fontSize:9, fontWeight:700, color }}>{val}</span>
        </div>
      ))}
      {/* Size triangle */}
      <div style={{ marginTop:8, padding:"5px 8px", background:"rgba(255,255,255,.02)",
        border:"1px solid #1e1808", borderRadius:3 }}>
        <div style={{ fontSize:6, color:"#3a3028", fontFamily:"'Cinzel',serif", letterSpacing:".06em", marginBottom:3 }}>SIZE TRIANGLE</div>
        <div style={{ fontSize:7, color:"#60a040" }}>
          {br.size === "small" ? "✓ Strong vs Large" : br.size === "large" ? "✓ Strong vs Medium" : "✓ Strong vs Small"}
        </div>
        <div style={{ fontSize:7, color:"#aa4040" }}>
          {br.size === "small" ? "✗ Weak vs Medium" : br.size === "large" ? "✗ Weak vs Small" : "✗ Weak vs Large"}
        </div>
        {br.dmgType === "magical" && (
          <div style={{ fontSize:7, color:"#a855f7", marginTop:2 }}>✦ Magical — bypasses physical DEF</div>
        )}
      </div>
      {/* Dragon passives */}
      {f.factionPassives?.length > 0 && (
        <div style={{ marginTop:6, padding:"5px 8px", background:"rgba(200,50,50,.06)",
          border:"1px solid rgba(200,50,50,.2)", borderRadius:3 }}>
          <div style={{ fontSize:6, color:"#8a3030", fontFamily:"'Cinzel',serif", letterSpacing:".06em", marginBottom:3 }}>FACTION PASSIVES</div>
          {f.factionPassives.map(p => (
            <div key={p.key} style={{ fontSize:7, color:"#aa5050", marginBottom:2 }}>
              {p.icon} {p.name}: {p.desc}
            </div>
          ))}
        </div>
      )}
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
      zIndex:5002, width:210,
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
  const isAtk      = side === "atk";
  const name        = isAtk ? b.atkName       : b.defCmdName;
  const icon        = isAtk ? b.atkIcon       : b.defCmdIcon;
  const lvl         = isAtk ? b.atkLvl        : b.defLvl;
  const troopBranch = isAtk ? b.atkTroopBranch : b.defTroopBranch;
  const troops      = isAtk ? b.atkTroopsStart : b.defTroopsStart;
  const stats       = isAtk ? b.atkCmdStats : b.defCmdStats ?? null;
  const resolved    = resolveTroopBranch(troopBranch);
  const br          = resolved?.branchDef ?? null;
  const td          = resolved?.tierData  ?? null;
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
        zIndex:5002, width:220,
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
        <div onClick={() => br && setShowTroop(true)} style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"6px 8px", borderRadius:4,
          background:"rgba(255,255,255,.03)", border:"1px solid #1e1808",
          cursor: br ? "pointer" : "default",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div>
              <div style={{ fontSize:8, color:"#c8a060", fontFamily:"'Cinzel',serif" }}>
                {br ? `${br.label} — ${td?.label ?? ""}` : "Unknown"}
              </div>
              <div style={{ fontSize:7, color:"#5a4a38" }}>{(troops ?? 0).toLocaleString()} troops{br ? ` · ${br.size} · ${br.dmgType}` : ""}</div>
            </div>
          </div>
          {br && <span style={{ fontSize:7, color:"#3a3028" }}>tap for stats &#x2192;</span>}
        </div>
      </div>

      {/* Gear piece popup */}
      {showGear !== null && gearSlots?.[showGear] && (
        <GearPiecePopup piece={gearSlots[showGear]} onClose={() => setShowGear(null)} />
      )}

      {/* Secondary troop popup */}
      {showTroop && (
        <TroopPopup troopBranch={troopBranch} onClose={() => setShowTroop(false)} />
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

// ── Compute aggregate battle stats from round log ─────────────────────────────
function computeBattleStats(b) {
  let atkCmdDmg = 0, atkTroopDmg = 0, atkDmgReceived = 0, atkHealing = 0;
  let defCmdDmg = 0, defTroopDmg = 0, defDmgReceived = 0;
  for (const rd of b.rounds ?? []) {
    for (const a of rd.actions ?? []) {
      if (!a.dmg) continue;
      if (a.isHeal) {
        // healing restores attacker troops; dmg is negative (troops back)
        atkHealing += Math.abs(a.dmg);
        continue;
      }
      if (a.dmg <= 0) continue;
      if (a.isPlayer) {
        // player-side actors dealing damage to defenders
        if (a.actor === "Troops") atkTroopDmg += a.dmg;
        else atkCmdDmg += a.dmg; // commander + skills
      } else if (!a.isConfused) {
        // enemy-side actors dealing damage to attacker
        if (a.actor === "Defenders") defTroopDmg += a.dmg;
        else if (a.actor === "Enemy Cmd") defCmdDmg += a.dmg;
        atkDmgReceived += a.dmg;
      }
    }
  }
  // Estimate enemy totals (defender side doesn't track separately, derive from atk losses)
  defDmgReceived = (atkTroopsStart => atkTroopsStart)(b.atkTroopsStart); // placeholder — use computed
  return { atkCmdDmg, atkTroopDmg, atkDmgReceived, atkHealing, defCmdDmg, defTroopDmg };
}

// ── Battle Stats Popup — side-by-side view like LOTR RTW ─────────────────────
function BattleStatsPopup({ b, onClose }) {
  const [subPopup, setSubPopup] = useState(null); // "atkCmd"|"defCmd"|"atkTroop"|"defTroop"
  const oc = outcomeOf(b);

  // Compute aggregate stats from round log
  const stats = computeBattleStats(b);

  const atkResolved = resolveTroopBranch(b.atkTroopBranch);
  const defResolved = resolveTroopBranch(b.defTroopBranch);

  const statRows = [
    { label:"Heavily Wounded", atkVal: b.atkTroopsWounded?.toLocaleString() ?? "0", defVal:"—" },
    { label:"Dead",            atkVal: (Math.max(0, b.atkTroopsStart - b.atkTroopsEnd)).toLocaleString(), defVal: (Math.max(0, (b.defTroopsStart??0) - (b.defTroopsEnd??0))).toLocaleString() },
    { label:"Commander Damage",atkVal: stats.atkCmdDmg.toLocaleString(), defVal: stats.defCmdDmg.toLocaleString() },
    { label:"Soldier Damage",  atkVal: stats.atkTroopDmg.toLocaleString(), defVal: stats.defTroopDmg.toLocaleString() },
    { label:"Damage Received", atkVal: stats.atkDmgReceived.toLocaleString(), defVal:"—" },
    { label:"Total Healing",   atkVal: stats.atkHealing > 0 ? stats.atkHealing.toLocaleString() : "0", defVal:"0" },
  ];

  return (
    <>
      {/* Backdrop — catches outside clicks and closes popup without bubbling to card */}
      <div onClick={e => { e.stopPropagation(); onClose(); }} style={{
        position:"fixed", inset:0, zIndex:5000,
        background:"rgba(0,0,0,.55)",
      }} />
      <div onClick={e => e.stopPropagation()} style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        zIndex:5001, width:"min(420px, 94vw)",
        background:"#0c0904", border:"1px solid #3a2e18", borderRadius:7,
        boxShadow:"0 12px 60px rgba(0,0,0,.97)",
        overflow:"hidden",
      }}>

        {/* Header bar */}
        <div style={{
          background:"linear-gradient(180deg,#151008,#0c0904)",
          borderBottom:"1px solid #2a1e08",
          padding:"8px 14px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          position:"relative",
        }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1,
            background:"linear-gradient(90deg,transparent,#8a6020 30%,#f0c04055 50%,#8a6020 70%,transparent)" }} />
          <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:"#8a6030", letterSpacing:".12em" }}>
            BATTLE REPORT
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, fontWeight:700,
              color:oc.color, border:`1px solid ${oc.color}55`, borderRadius:3,
              padding:"2px 7px", background:`${oc.color}11` }}>
              {oc.text}
            </span>
            <button onClick={onClose} style={{ background:"transparent", border:"none",
              color:"#6a5a4a", fontSize:13, cursor:"pointer", lineHeight:1 }}>✕</button>
          </div>
        </div>

        {/* Commander row */}
        <div style={{
          display:"grid", gridTemplateColumns:"1fr auto 1fr",
          gap:6, padding:"10px 12px 6px",
          borderBottom:"1px solid #1a1508",
        }}>
          {/* Attacker commander */}
          <div onClick={() => setSubPopup(p => p==="atkCmd" ? null : "atkCmd")}
            style={{ cursor:"pointer", padding:"6px 8px", borderRadius:4,
              background:"rgba(200,160,96,.06)", border:"1px solid #2a1e08",
              transition:"background .15s",
            }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:18 }}>{b.atkIcon || "⚔"}</span>
              <div>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:9, fontWeight:700, color:"#c8a060",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:100 }}>
                  {b.atkName}
                </div>
                <div style={{ fontSize:6, color:"#5a4a30" }}>Lv{b.atkLvl} · tap for stats</div>
              </div>
            </div>
          </div>

          {/* VS */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:7, color:"#3a2e18", fontFamily:"'Cinzel',serif", letterSpacing:".1em" }}>
            VS
          </div>

          {/* Defender commander */}
          <div onClick={() => setSubPopup(p => p==="defCmd" ? null : "defCmd")}
            style={{ cursor:"pointer", padding:"6px 8px", borderRadius:4,
              background:"rgba(150,80,80,.06)", border:"1px solid #2a1e08",
              transition:"background .15s", textAlign:"right",
            }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6 }}>
              <div>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:9, fontWeight:700, color:"#aa7070",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:100 }}>
                  {b.defCmdName}
                </div>
                <div style={{ fontSize:6, color:"#5a4a30" }}>Lv{b.defLvl} · tap for stats</div>
              </div>
              <span style={{ fontSize:18 }}>{b.defCmdIcon || "🛡"}</span>
            </div>
          </div>
        </div>

        {/* Troop bars */}
        <div style={{
          display:"grid", gridTemplateColumns:"1fr 36px 1fr",
          gap:6, padding:"8px 12px",
          borderBottom:"1px solid #1a1508",
        }}>
          {/* Attacker troops */}
          <div onClick={() => atkResolved && setSubPopup(p => p==="atkTroop" ? null : "atkTroop")}
            style={{ cursor: atkResolved ? "pointer" : "default" }}>
            <div style={{ fontSize:6, color:"#3a3028", fontFamily:"'Cinzel',serif",
              letterSpacing:".06em", marginBottom:2 }}>YOUR TROOPS</div>
            <div style={{ fontSize:8, color:"#4488ff", fontFamily:"'Cinzel',serif", fontWeight:700,
              marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {atkResolved ? `${atkResolved.branchDef.label} · ${atkResolved.tierData?.label ?? ""}` : "Unknown"}
            </div>
            <div style={{ fontSize:7, color:"#6a8060", marginBottom:3 }}>
              {b.atkTroopsStart.toLocaleString()} → {b.atkTroopsEnd.toLocaleString()}
            </div>
            <TroopBar start={b.atkTroopsStart} end={b.atkTroopsEnd} wounded={b.atkTroopsWounded ?? 0} isEnemy={false} />
            {atkResolved && (
              <div style={{ fontSize:6, color:"#2a2820", marginTop:2 }}>tap for troop stats →</div>
            )}
          </div>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:1, height:"100%", background:"#1e1808" }} />
          </div>

          {/* Defender troops */}
          <div onClick={() => defResolved && setSubPopup(p => p==="defTroop" ? null : "defTroop")}
            style={{ cursor: defResolved ? "pointer" : "default", textAlign:"right" }}>
            <div style={{ fontSize:6, color:"#3a3028", fontFamily:"'Cinzel',serif",
              letterSpacing:".06em", marginBottom:2 }}>ENEMY TROOPS</div>
            <div style={{ fontSize:8, color:"#cc4444", fontFamily:"'Cinzel',serif", fontWeight:700,
              marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {defResolved ? `${defResolved.branchDef.label} · ${defResolved.tierData?.label ?? ""}` : "Unknown"}
            </div>
            <div style={{ fontSize:7, color:"#7a4040", marginBottom:3 }}>
              {(b.defTroopsStart ?? 0).toLocaleString()} → {(b.defTroopsEnd ?? 0).toLocaleString()}
            </div>
            <TroopBar start={b.defTroopsStart ?? 0} end={b.defTroopsEnd ?? 0} wounded={0} isEnemy={true} />
            {defResolved && (
              <div style={{ fontSize:6, color:"#2a2820", marginTop:2 }}>← tap for troop stats</div>
            )}
          </div>
        </div>

        {/* Stats table */}
        <div style={{ padding:"8px 12px 12px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto",
            fontSize:6, color:"#3a3028", fontFamily:"'Cinzel',serif",
            letterSpacing:".07em", marginBottom:5, paddingBottom:4,
            borderBottom:"1px solid #1e1808",
          }}>
            <span style={{ color:"#4488ff55" }}>YOU</span>
            <span style={{ textAlign:"center" }}>STAT</span>
            <span style={{ textAlign:"right", color:"#cc444455" }}>ENEMY</span>
          </div>

          {statRows.map(({ label, atkVal, defVal }) => (
            <div key={label} style={{
              display:"grid", gridTemplateColumns:"auto 1fr auto",
              alignItems:"center", marginBottom:5,
              padding:"4px 6px", borderRadius:3,
              background:"rgba(255,255,255,.015)",
            }}>
              <span style={{ fontSize:9, fontWeight:700, color:"#c8a060",
                fontFamily:"'Cinzel',serif", minWidth:60 }}>
                {atkVal}
              </span>
              <span style={{ fontSize:6, color:"#5a4a38", textAlign:"center",
                fontFamily:"'Cinzel',serif", letterSpacing:".05em" }}>
                {label}
              </span>
              <span style={{ fontSize:9, fontWeight:700, color:"#aa6060",
                fontFamily:"'Cinzel',serif", textAlign:"right", minWidth:60 }}>
                {defVal}
              </span>
            </div>
          ))}

          {/* Footer hint */}
          <div style={{ marginTop:8, fontSize:6, color:"#2a2010", textAlign:"center",
            fontFamily:"'Cinzel',serif", letterSpacing:".06em" }}>
            {b.terrain} · {b.modLabel} · {b.rounds?.length ?? 0} rounds
          </div>
        </div>
      </div>

      {/* Sub-popups */}
      {subPopup === "atkCmd" && <CommanderPopup b={b} side="atk" onClose={() => setSubPopup(null)} />}
      {subPopup === "defCmd" && <CommanderPopup b={b} side="def" onClose={() => setSubPopup(null)} />}
      {subPopup === "atkTroop" && <TroopPopup troopBranch={b.atkTroopBranch} onClose={() => setSubPopup(null)} />}
      {subPopup === "defTroop" && <TroopPopup troopBranch={b.defTroopBranch} onClose={() => setSubPopup(null)} />}
    </>
  );
}

// ── Simple battle summary card ────────────────────────────────────────────────
function BattleCard({ b, onClick }) {
  const oc   = outcomeOf(b);
  const [popup, setPopup] = useState(null); // "stats"|null

  return (
    <div
      onClick={e => { e.stopPropagation(); setPopup("stats"); }}
      onTouchEnd={e => { e.stopPropagation(); e.preventDefault(); setPopup("stats"); }}
      style={{
        position:"relative",
        padding:"10px 14px", marginBottom:8, cursor:"pointer",
        background:"rgba(255,255,255,.02)",
        border:`1px solid #221e12`,
        borderLeft:`3px solid ${oc.color}`,
        borderRadius:5, transition:"background .15s",
        touchAction:"manipulation",
        WebkitTapHighlightColor:"transparent",
      }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
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
            <div style={{ fontSize:7, color:"#4a3a28" }}>Lv{b.atkLvl} · {b.terrain} · {b.modLabel}</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, color:"#9a5050", marginBottom:2 }}>
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
            border:`1px solid ${oc.color}55`, borderRadius:3, padding:"3px 8px",
            background:`${oc.color}11` }}>
            {oc.text}
          </div>
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
          {b.rounds?.length ?? 0} rounds
        </span>
      </div>

      {/* Battle stats popup */}
      {popup === "stats" && <BattleStatsPopup b={b} onClose={() => setPopup(null)} />}
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
            } else if (a.isConfused) {
              color = "#c855f7"; indent = 12;
            } else if (a.isGear) {
              color = "#a070d0"; indent = 10;
            } else if (a.isTroopSkill && a.isPlayer === false) {
              color = "#d08060"; indent = 12;
            } else if (a.isTroopSkill) {
              color = "#60c8a0"; indent = 12;
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
                  // Confused troops/commanders hit their own side
                  if (a.isConfused) {
                    return (
                      <span>
                        {a.action}{" — "}
                        <span style={{ color:"#c855f7" }}>{a.dmg.toLocaleString()} friendly fire damage</span>
                      </span>
                    );
                  }
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
                    // Troop skills — no skillEffect block, render from action text directly
                    if (a.isTroopSkill) {
                      return <span style={{ fontFamily:"'Cinzel',serif" }}>{a.action}</span>;
                    }
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
          <div className="scr" style={{ flex:1, overflowY:"auto", padding:"12px 14px", touchAction:"pan-y" }}>
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
