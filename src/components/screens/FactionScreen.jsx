import { useState } from "react";
import { CSS } from "../../constants/css.js";
import { ALIGNMENT, PLAYABLE_FACTIONS, getFactionAlignment } from "../../../shared/constants/factions.js";
import { HDEFS, SC, SS } from "../../../shared/constants/heroes.js";
import { barracksCapacity, BRANCH_UNLOCK_Q, tierFromBranchLevel } from "../../../shared/constants/buildings.js";
import { FACTION_TROOPS } from "../../../shared/constants/troops.js";

const LEGENDARY_BY_FACTION = {
  pirates:        { n: "Ironjaw Reck",             portrait: "/commanders/h25_ironjaw_reck_portrait.webp" },
  bountyhunters:  { n: "Archmage Theon",           portrait: "/commanders/h29_archmage_theon_portrait.webp" },
  orcs:           { n: "Warlord Korgath",           portrait: "/commanders/h33_warlord_korgath_portrait.webp" },
  dragons:        { n: "Pyrewing Skar",             portrait: "/commanders/h35_pyrewing_skar_portrait.webp" },
  holyknights:    { n: "Grand Inquisitor Mourne",   portrait: "/commanders/h42_grand_inquistor_mourne_portrait.webp" },
  nightcreatures: { n: "Alpha Korrax",              portrait: "/commanders/h46_alpha_korrax_portrait.webp" },
};

const QUARTER_BY_FACTION = {
  pirates:        "Plunder Yard",
  bountyhunters:  "Ethereal Vault",
  orcs:           "Grinding Grounds",
  dragons:        "The Eyrie",
  holyknights:    "The Sanctum",
  nightcreatures: "The Shadowfen",
};

const FACTION_ICONS = {
  pirates:        "🏴‍☠️",
  bountyhunters:  "🔮",
  orcs:           "⚔️",
  dragons:        "🐉",
  holyknights:    "✝️",
  nightcreatures: "🌑",
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

const EXTRA_CSS = `
  @keyframes portraitFadeIn {
    from { opacity: 0; transform: translateX(10px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .faction-icon-btn:hover {
    border-color: rgba(255,255,255,0.2) !important;
    background: rgba(255,255,255,0.055) !important;
    transform: translateY(-1px);
  }
  .join-btn:hover {
    background: rgba(61,220,132,0.12) !important;
    box-shadow: 0 0 16px rgba(61,220,132,0.22);
    transform: translateY(-1px);
  }
  .join-btn:active { transform: translateY(0); }
`;

export default function FactionScreen({
  setScreen, setFacKey, setFacName, setAiFaction,
  setAiRss, setAiBldgs, setAiBarracksPool, aiLastActionRef,
  setCmds, setColl, setTiles,
  setUnlockedBranches, setQuarterLevels,
}) {
  const [selected, setSelected] = useState(PLAYABLE_FACTIONS[0]);

  const faction = selected;
  const alignment = getFactionAlignment(faction.key);
  const aln = ALIGNMENT[alignment];
  const legendary = LEGENDARY_BY_FACTION[faction.key];
  const quarter = QUARTER_BY_FACTION[faction.key];

  const starters = [
    HDEFS.find(h => h.faction === faction.key && h.rarity === "soldier"),
    HDEFS.find(h => h.faction === faction.key && h.rarity === "veteran"),
  ].filter(Boolean);

  function handleJoin() {
    const f = faction;
    const TEMP_HQK = "1,1";
    const seed = Date.now();
    const startCmds = starters.map((h, i) => ({
      ...h, uid: `p_${seed}_${i}`, owner: "player", troops: 0, troopBranch: null,
      tk: TEMP_HQK, lvl: 5, xp: 0, respectPoints: 0, respectLevel: 0,
      skillPoints: {}, unspentSkillPoints: 5,
      gear: { helmet: null, armor: null, bracers: null, accessory: null },
    }));

    const allFactions = ["pirates","orcs","bountyhunters","dragons","holyknights","nightcreatures"];
    const aiFactions = allFactions.filter(fk => fk !== f.key);
    const allAiCmds = [];
    aiFactions.forEach((aiFk) => {
      const aiStarters = [
        HDEFS.find(h => h.faction === aiFk && h.rarity === "soldier"),
        HDEFS.find(h => h.faction === aiFk && h.rarity === "veteran"),
      ].filter(Boolean);
      aiStarters.forEach((h, i) => {
        allAiCmds.push({
          ...h, uid: `ai_${seed}_${aiFk}_${i}`, owner: "ai", troops: 0, troopBranch: null,
          tk: TEMP_HQK, lvl: 5, xp: 0, respectPoints: 0, respectLevel: 0,
          skillPoints: {}, unspentSkillPoints: 5,
          gear:{helmet:null,armor:null,bracers:null,accessory:null},
        });
      });
    });

    const startingQuarterLevels = { [f.key]: 1 };
    const fDef = FACTION_TROOPS[f.key];
    const startingBldgPatch = {};
    const startingUB = {};
    if (fDef) {
      fDef.branches.forEach((br, idx) => {
        if (BRANCH_UNLOCK_Q[idx] <= 1) {
          const bKey = `b_${f.key}_${br.key}`;
          startingBldgPatch[bKey] = 1;
          startingUB[`${f.key}:${br.key}`] = tierFromBranchLevel(1);
        }
      });
    }

    setFacKey(f.key);
    setFacName(f.n);
    setAiRss({stone:300,wood:300,ore:300,gas:300});
    setAiBldgs({hq:1,quarry:0,lumber:0,forge:0,refinery:0,barracks:0,training:0,commandcenter:0,healingtent:0,walls:0});
    setAiBarracksPool(barracksCapacity(0));
    aiLastActionRef.current = 0;
    setCmds([...startCmds, ...allAiCmds]);
    setColl([
      HDEFS.find(h => h.faction === f.key && h.rarity === "soldier"),
      HDEFS.find(h => h.faction === f.key && h.rarity === "veteran"),
    ].filter(Boolean));
    setTiles({});
    if (setQuarterLevels) setQuarterLevels(startingQuarterLevels);
    if (setUnlockedBranches) setUnlockedBranches(startingUB);
    setScreen("game");
  }

  const rows = [PLAYABLE_FACTIONS.slice(0,3), PLAYABLE_FACTIONS.slice(3,6)];

  // Header is ~45px, body fills the rest
  return (
    <div style={{
      width:"100vw", height:"100vh",
      background:"#08080f",
      display:"flex", flexDirection:"column",
      fontFamily:"'Cinzel',serif",
      overflow:"hidden",
    }}>
      <style>{CSS}{EXTRA_CSS}</style>

      {/* ── Header ── ~42px */}
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"10px 20px",
        borderBottom:"1px solid #1a1a2a",
        background:"rgba(0,0,0,0.4)",
        flexShrink:0,
      }}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,width:16,height:16}}>
          {[0,1,2,3].map(i=><div key={i} style={{background:"#ccc",borderRadius:1}}/>)}
        </div>
        <span style={{fontSize:12,fontWeight:700,letterSpacing:"0.18em",color:"#e8e0d0",textTransform:"uppercase"}}>
          CHOOSE FACTION
        </span>
      </div>

      {/* ── Body: 3 columns, fills remaining height ── */}
      <div style={{display:"flex", flex:1, overflow:"hidden", minHeight:0}}>

        {/* ── LEFT: faction grid ── fixed 230px */}
        <div style={{
          width:230, flexShrink:0,
          padding:"14px 14px 12px",
          display:"flex", flexDirection:"column",
          borderRight:"1px solid #1a1a2a",
          background:"rgba(0,0,0,0.25)",
          overflow:"hidden",
        }}>
          {/* Alignment labels */}
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,flexShrink:0}}>
            <span style={{fontSize:9,color:"#c8a060",letterSpacing:"0.12em"}}>{ALIGNMENT.humans.n.toUpperCase()}</span>
            <span style={{fontSize:9,color:"#7aaa40",letterSpacing:"0.12em"}}>{ALIGNMENT.creatures.n.toUpperCase()}</span>
          </div>

          {/* 3×2 grid — fills available space proportionally */}
          <div style={{flex:1, display:"flex", flexDirection:"column", gap:8, minHeight:0}}>
            {rows.map((row, ri) => (
              <div key={ri} style={{
                display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                gap:8, flex:1, minHeight:0,
              }}>
                {row.map(f => {
                  const isSelected = selected.key === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setSelected(f)}
                      className="faction-icon-btn"
                      style={{
                        background: isSelected
                          ? `linear-gradient(145deg,${f.c}22,${f.c}08)`
                          : "rgba(255,255,255,0.025)",
                        border: isSelected
                          ? `1px solid ${f.c}88`
                          : "1px solid rgba(255,255,255,0.07)",
                        borderRadius:6,
                        cursor:"pointer",
                        display:"flex", flexDirection:"column",
                        alignItems:"center", justifyContent:"center",
                        gap:4, padding:"6px 4px",
                        transition:"all 0.15s ease",
                        position:"relative", outline:"none",
                        minHeight:0, overflow:"hidden",
                      }}
                    >
                      {/* Vacancy dot */}
                      <div style={{
                        position:"absolute", top:4, right:4,
                        width:5, height:5, borderRadius:"50%",
                        background:"#3ddc84",
                        boxShadow:"0 0 4px #3ddc84aa",
                      }}/>

                      {/* Banner icon — height relative to button */}
                      <div style={{
                        width:"50%", aspectRatio:"3/4",
                        maxWidth:32, maxHeight:42,
                        background: isSelected
                          ? `linear-gradient(180deg,${f.c}cc,${f.c}66)`
                          : `linear-gradient(180deg,${f.c}55,${f.c}22)`,
                        borderRadius:"3px 3px 0 0",
                        clipPath:"polygon(0 0,100% 0,100% 78%,50% 100%,0 78%)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:14,
                        flexShrink:0,
                      }}>
                        {FACTION_ICONS[f.key]}
                      </div>

                      <span style={{
                        fontSize:7, fontWeight:700, letterSpacing:"0.04em",
                        color: isSelected ? f.c : "#7a7080",
                        textTransform:"uppercase", textAlign:"center",
                        lineHeight:1.15,
                      }}>
                        {f.n}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend + Back — pinned to bottom */}
          <div style={{flexShrink:0, marginTop:10}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#3ddc84",boxShadow:"0 0 4px #3ddc84aa"}}/>
              <span style={{fontSize:8,color:"#4a4060",letterSpacing:"0.08em"}}>Vacant</span>
            </div>
            <button className="btn" onClick={() => setScreen("title")} style={{
              width:"100%", padding:"6px 0", background:"none",
              border:"1px solid #222", color:"#444", fontSize:9,
              cursor:"pointer", borderRadius:4, letterSpacing:"0.08em",
            }}>
              ← BACK
            </button>
          </div>
        </div>

        {/* ── CENTER: portrait ── */}
        <div style={{
          flex:1, position:"relative", overflow:"hidden",
          display:"flex", alignItems:"flex-end", justifyContent:"center",
          minWidth:0,
        }}>
          <div style={{
            position:"absolute", inset:0,
            background:`radial-gradient(ellipse 60% 65% at 50% 58%,${faction.c}1a 0%,transparent 68%)`,
            pointerEvents:"none", transition:"background 0.4s ease",
          }}/>

          <img
            key={legendary?.portrait}
            src={legendary?.portrait}
            alt={legendary?.n}
            style={{
              /* Fill height but never overflow — bottom-anchored */
              height:"100%",
              maxHeight:"100%",
              width:"auto",
              objectFit:"contain",
              objectPosition:"bottom center",
              filter:`drop-shadow(0 0 24px ${faction.c}44)`,
              animation:"portraitFadeIn 0.3s ease forwards",
              userSelect:"none", pointerEvents:"none",
            }}
          />

          {/* Bottom fade */}
          <div style={{
            position:"absolute", bottom:0, left:0, right:0, height:80,
            background:"linear-gradient(to top,#08080f 0%,transparent 100%)",
            pointerEvents:"none",
          }}/>
        </div>

        {/* ── RIGHT: info panel ── fixed 260px, NO scroll, flex column */}
        <div style={{
          width:260, flexShrink:0,
          padding:"14px 16px 14px",
          display:"flex", flexDirection:"column",
          borderLeft:"1px solid #1a1a2a",
          background:"rgba(0,0,0,0.2)",
          overflow:"hidden",  /* no scrollbar — content must fit */
        }}>
          {/* Faction header */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexShrink:0}}>
            <div style={{
              width:36, height:44,
              background:`linear-gradient(180deg,${faction.c}cc,${faction.c}55)`,
              borderRadius:"3px 3px 0 0",
              clipPath:"polygon(0 0,100% 0,100% 80%,50% 100%,0 80%)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:18, flexShrink:0,
            }}>
              {FACTION_ICONS[faction.key]}
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:900,letterSpacing:"0.1em",color:"#f0ece4",lineHeight:1}}>
                {faction.n.toUpperCase()}
              </div>
              <div style={{fontSize:9,color:aln.color,letterSpacing:"0.1em",marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                <span>{aln.icon}</span><span>{aln.n}</span>
              </div>
            </div>
          </div>

          <div style={{height:1,background:`${faction.c}28`,marginBottom:8,flexShrink:0}}/>

          {/* Description */}
          <p style={{
            fontFamily:"'Crimson Pro',serif", fontSize:11.5, lineHeight:1.55,
            color:"#8a7a6a", marginBottom:0, flexShrink:0,
          }}>
            {faction.desc}
          </p>

          {/* Spacer — distributes leftover space between sections */}
          <div style={{flex:1}}/>

          {/* Faction Bonus */}
          <div style={{marginBottom:0,flexShrink:0}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3ddc84",marginBottom:5}}>
              Faction Bonus
            </div>
            <div style={{
              display:"flex", alignItems:"center", gap:7,
              padding:"6px 9px",
              background:"rgba(61,220,132,0.05)",
              border:"1px solid rgba(61,220,132,0.14)",
              borderRadius:4,
            }}>
              <span style={{color:"#3ddc84",fontSize:9}}>▲</span>
              <span style={{fontFamily:"'Crimson Pro',serif",fontSize:11,color:"#9a8a7a"}}>Placeholder</span>
            </div>
          </div>

          <div style={{flex:1}}/>

          {/* Starting Quarter */}
          <div style={{flexShrink:0}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3ddc84",marginBottom:5}}>
              Starting Quarter
            </div>
            <div style={{
              display:"flex", alignItems:"center", gap:7,
              padding:"6px 9px",
              background:"rgba(255,255,255,0.03)",
              border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:4,
            }}>
              <span style={{fontSize:12}}>🏰</span>
              <span style={{fontFamily:"'Crimson Pro',serif",fontSize:11,color:"#c0b090"}}>{quarter}</span>
            </div>
          </div>

          <div style={{flex:1}}/>

          {/* Starting Commanders */}
          <div style={{flexShrink:0}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#3ddc84",marginBottom:5}}>
              Starting Commanders
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {starters.map(h => (
                <div key={h.id} style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"5px 9px",
                  background:"rgba(255,255,255,0.025)",
                  border:"1px solid rgba(255,255,255,0.06)",
                  borderRadius:4,
                }}>
                  <span style={{fontSize:12}}>{h.icon}</span>
                  <span style={{fontFamily:"'Crimson Pro',serif",fontSize:11,color:"#c0b090",flex:1}}>{h.n}</span>
                  <span style={{fontSize:8,color:SC(h.rarity),letterSpacing:"0.06em"}}>{SS(h.rarity)}</span>
                </div>
              ))}
              {legendary && (
                <div style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"5px 9px",
                  background:`rgba(${hexToRgb(faction.c)},0.06)`,
                  border:`1px solid ${faction.c}28`,
                  borderRadius:4,
                }}>
                  <span style={{fontSize:12}}>⭐</span>
                  <span style={{fontFamily:"'Crimson Pro',serif",fontSize:11,color:"#c0b090",flex:1}}>{legendary.n}</span>
                  <span style={{fontSize:8,color:"#f0c040",letterSpacing:"0.06em"}}>CHAMPION</span>
                </div>
              )}
            </div>
          </div>

          <div style={{flex:1}}/>

          {/* JOIN — always visible at bottom */}
          <button
            onClick={handleJoin}
            className="join-btn"
            style={{
              width:"100%", padding:"11px 0",
              background:"transparent",
              border:"2px solid #3ddc84",
              borderRadius:4,
              color:"#3ddc84",
              fontSize:12, fontWeight:700, letterSpacing:"0.22em",
              cursor:"pointer",
              fontFamily:"'Cinzel',serif",
              textTransform:"uppercase",
              transition:"all 0.2s ease",
              flexShrink:0,
            }}
          >
            JOIN
          </button>
        </div>

      </div>
    </div>
  );
}
