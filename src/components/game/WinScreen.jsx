import { memo } from "react";
import { FAC } from "../../../shared/constants/factions.js";
import { barracksCapacity } from "../../../shared/constants/buildings.js";

export default memo(function WinScreen({ winner, aiFaction, setWinner, setTiles, setCmds, setMode, setSelKey, setUpgQueue, setBldgs, setBarracks, setAiRss, setAiBldgs, setAiBarracksPool, aiLastActionRef, setScreen, setWounded, setWoundedQueue, setRss, setReinMarches, setTrainingQueue, setBLog, setBattles, setUnseenBattles, setDeletingTiles, setDeletingSecsLeft, setPlayerHqKey, setAiHqKeys }) {
  const isVictory = winner === "player";
  const aiName = aiFaction ? (FAC[aiFaction]?.n || aiFaction) : "Enemy";

  return (
    <div style={{position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24}}>
      <div style={{fontSize:72}}>{isVictory ? "🏆" : "💀"}</div>
      <h2 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"clamp(20px,6vw,44px)",fontWeight:900,
        background:isVictory?"linear-gradient(135deg,#f0c040,#e67e22,#f0c040)":"linear-gradient(135deg,#cc3030,#881010,#cc3030)",
        backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        animation:"shimmer 2s linear infinite",textAlign:"center"}}>
        {isVictory ? "VICTORY! THE HOLY GRAIL IS YOURS!" : `DEFEAT — ${aiName} claims the Holy Grail`}
      </h2>
      <p style={{fontFamily:"'Crimson Pro',serif",fontStyle:"italic",color:"#7a6a5a",fontSize:13,textAlign:"center",maxWidth:360}}>
        {isVictory
          ? "Your alliance stands victorious. The age of conquest is complete."
          : `The ${aiName} army has seized the Holy Grail. Rally your forces and try again.`}
      </p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
        <button className="btn" onClick={() => {
          setWinner(null);
          // Reset map — Game.jsx will regenerate and re-place HQs when tiles becomes empty
          setTiles({});
          setCmds(p => p.map(c => ({ ...c, tk:"0,0", march:null, troops:0, drawTimer:null, drawTile:null, drawOrigin:null })));
          setMode("view"); setSelKey(null);
          setUpgQueue({});
          setBldgs({hq:1,quarry:0,lumber:0,forge:0,refinery:0,barracks:0,training:0,commandcenter:0,healingtent:0,walls:0});
          setBarracks(barracksCapacity(0));
          setWounded(0);
          setWoundedQueue(0);
          if (setRss)              setRss({ stone:300, wood:300, ore:300, gas:300 });
          if (setReinMarches)      setReinMarches([]);
          if (setTrainingQueue)    setTrainingQueue(null);
          if (setBLog)             setBLog([]);
          if (setBattles)          setBattles([]);
          if (setUnseenBattles)    setUnseenBattles(0);
          if (setDeletingTiles)    setDeletingTiles({});
          if (setDeletingSecsLeft) setDeletingSecsLeft({});
          if (setPlayerHqKey)      setPlayerHqKey(null);
          if (setAiHqKeys)         setAiHqKeys({});
          setAiRss({stone:300,wood:300,ore:300,gas:300});
          setAiBldgs({hq:1,quarry:0,lumber:0,forge:0,refinery:0,barracks:0,training:0,commandcenter:0,healingtent:0,walls:0});
          setAiBarracksPool(barracksCapacity(0));
          aiLastActionRef.current = 0;
        }}
          style={{padding:"12px 28px",background:"linear-gradient(135deg,#7a1010,#c03030)",border:"1px solid #e04040",color:"#f0c040",fontSize:13,fontWeight:700}}>
          ⚔ Play Again
        </button>
        <button className="btn" onClick={() => setScreen("title")}
          style={{padding:"12px 28px",background:"rgba(255,255,255,.04)",border:"1px solid #333",color:"#aaa",fontSize:13}}>
          ← Main Menu
        </button>
      </div>
    </div>
  );
});
