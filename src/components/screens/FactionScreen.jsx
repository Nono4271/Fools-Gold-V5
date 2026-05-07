import { CSS } from "../../constants/css.js";
import { ALIGNMENT, PLAYABLE_FACTIONS, getFactionAlignment } from "../../../shared/constants/factions.js";
import { HDEFS, SC, SS } from "../../../shared/constants/heroes.js";
import { barracksCapacity } from "../../../shared/constants/buildings.js";

export default function FactionScreen({
  setScreen, setFacKey, setFacName, setAiFaction,
  setAiRss, setAiBldgs, setAiBarracksPool, aiLastActionRef,
  setCmds, setColl, setTiles,
}) {
  return (
    <div style={{width:"100vw",height:"100vh",background:"#0a0c10",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,overflow:"auto"}}>
      <style>{CSS}</style>
      <h2 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"clamp(15px,4vw,26px)",background:"linear-gradient(135deg,#f0c040,#c03030,#f0c040)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 3s linear infinite",marginBottom:4,textAlign:"center"}}>CHOOSE YOUR FACTION</h2>
      <p style={{fontFamily:"'Crimson Pro',serif",fontStyle:"italic",color:"#5a4a3a",fontSize:11,marginBottom:18,textAlign:"center"}}>Your alignment determines which heroes you can summon.</p>

      {Object.entries(ALIGNMENT).map(([alnKey, aln]) => (
        <div key={alnKey} style={{maxWidth:1100,width:"100%",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:18}}>{aln.icon}</span>
            <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:13,color:aln.color,letterSpacing:".12em"}}>{aln.n.toUpperCase()}</span>
            <div style={{flex:1,height:1,background:`${aln.color}30`,marginLeft:6}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:10}}>
            {PLAYABLE_FACTIONS.filter(f => aln.factions.includes(f.key)).map(f => {
              const starters = [
                HDEFS.find(h => h.faction === f.key && h.rarity === "soldier"),
                HDEFS.find(h => h.faction === f.key && h.rarity === "veteran"),
              ].filter(Boolean);
              return (
                <button key={f.key} className="btn"
                  onClick={() => {
                    // Player commanders — HQ tile assigned later by Game.jsx once map generates
                    const TEMP_HQK = "1,1"; // placeholder; overwritten by Game.jsx map init
                    const startCmds = starters.map((h,i) => ({
                      ...h, uid:`p${i}`, owner:"player", troops:0, troopBranch:null,
                      tk:TEMP_HQK, lvl:5, xp:0, respectPoints:0, respectLevel:0,
                      skillPoints:{}, unspentSkillPoints:5,
                      gear:{helmet:null,armor:null,bracers:null,accessory:null},
                    }));

                    // All 5 AI factions — each gets 2 starters, HQ assigned by Game.jsx
                    const allFactions = ["pirates","merfolk","marines","orcs","bountyhunters","dragons"];
                    const aiFactions = allFactions.filter(fk => fk !== f.key);
                    const allAiCmds = [];
                    aiFactions.forEach((aiFk, fi) => {
                      const aiStarters = [
                        HDEFS.find(h => h.faction === aiFk && h.rarity === "soldier"),
                        HDEFS.find(h => h.faction === aiFk && h.rarity === "veteran"),
                      ].filter(Boolean);
                      aiStarters.forEach((h, i) => {
                        allAiCmds.push({
                          ...h, uid:`ai_${aiFk}_${i}`, owner:"ai", troops:0, troopBranch:null,
                          tk:TEMP_HQK, lvl:5, xp:0, respectPoints:0, respectLevel:0,
                          skillPoints:{}, unspentSkillPoints:5,
                          gear:{helmet:null,armor:null,bracers:null,accessory:null},
                        });
                      });
                    });

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
                    setScreen("game");
                  }}
                  style={{background:"rgba(255,255,255,.03)",border:`1px solid ${f.c}50`,borderRadius:8,padding:"14px 12px",color:"#e0d0c0",textAlign:"left"}}>
                  <div style={{fontSize:26,marginBottom:4}}>{f.s}</div>
                  <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:13,color:f.c,marginBottom:4}}>{f.n}</div>
                  <div style={{fontSize:9,color:"#5a5060",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",marginBottom:6}}>{f.desc}</div>
                  <div style={{fontSize:8,color:"#6a6070",fontFamily:"'Cinzel',serif",marginBottom:2}}>STARTING COMMANDERS</div>
                  {starters.map(h => (
                    <div key={h.id} style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
                      <span style={{fontSize:9,color:"#c0b090",fontFamily:"'Cinzel',serif"}}>{h.n}</span>
                      <span style={{fontSize:8,color:SC(h.rarity),fontFamily:"'Cinzel',serif",marginLeft:"auto"}}>{SS(h.rarity)}</span>
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button className="btn" onClick={() => setScreen("title")} style={{padding:"7px 18px",background:"none",border:"1px solid #222",color:"#444",fontSize:11}}>← Back</button>
    </div>
  );
}
