import { useState } from "react";
import { CSS } from "../../constants/css.js";
import { PLAYABLE_FACTIONS } from "../../../shared/constants/factions.js";
import { getAccountUsername } from "../../utils/playerIdentity.js";
import LoginModal from "./LoginModal.jsx";

export default function TitleScreen({ setScreen, onTestCampaign }) {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState(getAccountUsername());
  return (
    <div style={{position:"relative",width:"100vw",height:"100vh",background:"radial-gradient(ellipse at 50% 45%, #3a1a08 0%, #1a0a04 55%, #0a0502 100%)",overflow:"hidden"}}>
      <style>{CSS}</style>
      <style>{`
        @keyframes coinDrift {
          0%   { transform: translate3d(0, 105vh, 0) rotate(0deg); opacity: 0; }
          6%   { opacity: 1; }
          94%  { opacity: 1; }
          100% { transform: translate3d(var(--drift), -20vh, 0) rotate(1080deg); opacity: 0; }
        }
        @keyframes coinSpin {
          0%   { transform: scaleX(1); }
          50%  { transform: scaleX(0.2); }
          100% { transform: scaleX(1); }
        }
        @keyframes coinBurst {
          0%   { transform: translate3d(0,0,0) rotate(0deg) scale(0.4); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translate3d(var(--bx), var(--by), 0) rotate(720deg) scale(1); opacity: 0; }
        }
      `}</style>

      {/* ── SVG Scene ── */}
      <svg viewBox="0 0 1000 720" preserveAspectRatio="xMidYMid meet"
           style={{position:"absolute",inset:0,width:"100%",height:"100%",zIndex:0}}>
        <defs>
          <radialGradient id="halo" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#ffe080" stopOpacity=".95"/>
            <stop offset=".35" stopColor="#f0a020" stopOpacity=".55"/>
            <stop offset="1" stopColor="#000" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5a3010"/><stop offset=".5" stopColor="#3a1d08"/><stop offset="1" stopColor="#2a1404"/>
          </linearGradient>
          <linearGradient id="woodLid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6a3a14"/><stop offset="1" stopColor="#3a1d08"/>
          </linearGradient>
          <linearGradient id="iron" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5a4a3a"/><stop offset="1" stopColor="#1a1208"/>
          </linearGradient>
          <linearGradient id="goldFace" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fce27a"/><stop offset=".45" stopColor="#f0c040"/><stop offset="1" stopColor="#8a5a10"/>
          </linearGradient>
          <linearGradient id="goldEdge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a0701a"/><stop offset=".5" stopColor="#fce27a"/><stop offset="1" stopColor="#a0701a"/>
          </linearGradient>
          <radialGradient id="gemShine" cx=".35" cy=".3" r=".7">
            <stop offset="0" stopColor="#ff8a8a"/><stop offset=".55" stopColor="#c01818"/><stop offset="1" stopColor="#5a0606"/>
          </radialGradient>
          <radialGradient id="ruby" cx=".35" cy=".3" r=".75">
            <stop offset="0" stopColor="#ff8a8a"/><stop offset=".55" stopColor="#c01818"/><stop offset="1" stopColor="#5a0606"/>
          </radialGradient>
          <radialGradient id="sapphire" cx=".35" cy=".3" r=".75">
            <stop offset="0" stopColor="#a0c8ff"/><stop offset=".55" stopColor="#2050c8"/><stop offset="1" stopColor="#0a1a4a"/>
          </radialGradient>
          <radialGradient id="emerald" cx=".35" cy=".3" r=".75">
            <stop offset="0" stopColor="#a0f0a8"/><stop offset=".55" stopColor="#1a8a3a"/><stop offset="1" stopColor="#0a3a18"/>
          </radialGradient>
          <radialGradient id="amethyst" cx=".35" cy=".3" r=".75">
            <stop offset="0" stopColor="#e0a8ff"/><stop offset=".55" stopColor="#7028c0"/><stop offset="1" stopColor="#2a0a5a"/>
          </radialGradient>
          <radialGradient id="pearl" cx=".3" cy=".25" r=".8">
            <stop offset="0" stopColor="#fff8e8"/><stop offset=".7" stopColor="#d8c8a0"/><stop offset="1" stopColor="#8a7058"/>
          </radialGradient>
        </defs>

        <circle cx="500" cy="380" r="400" fill="url(#halo)"/>
        <g opacity=".28" style={{mixBlendMode:"screen"}}>
          {Array.from({length:14}).map((_,i) => {
            const a = (i*(360/14)-90)*Math.PI/180;
            return <line key={i} x1="500" y1="380" x2={500+Math.cos(a)*620} y2={380+Math.sin(a)*620} stroke="#ffd060" strokeWidth="2"/>;
          })}
        </g>

        {/* Chest lid */}
        <g transform="translate(500 230) rotate(-7)">
          <path d="M-240 -45 L240 -45 L240 110 L-240 110 Z" fill="url(#woodLid)" stroke="#1a0a04" strokeWidth="3"/>
          <line x1="-240" y1="5" x2="240" y2="5" stroke="#2a1404" strokeWidth="2"/>
          <line x1="-240" y1="55" x2="240" y2="55" stroke="#2a1404" strokeWidth="2"/>
          <rect x="-210" y="-45" width="20" height="155" fill="url(#iron)"/>
          <rect x="190" y="-45" width="20" height="155" fill="url(#iron)"/>
          <rect x="-240" y="-45" width="480" height="14" fill="url(#iron)"/>
          {[-170,-110,-50,10,70,130,180].map(x => <circle key={x} cx={x} cy="-38" r="3" fill="#3a2818"/>)}
          <circle cx="-210" cy="105" r="4" fill="#1a1208"/>
          <circle cx="210"  cy="105" r="4" fill="#1a1208"/>
        </g>

        {/* Chest body */}
        <g transform="translate(500 540)">
          <path d="M-290 -130 L290 -130 L290 145 L-290 145 Z" fill="url(#wood)" stroke="#1a0a04" strokeWidth="4"/>
          <ellipse cx="0" cy="-130" rx="290" ry="34" fill="#1a0a04"/>
          <ellipse cx="0" cy="-130" rx="266" ry="24" fill="#0a0502"/>
          <ellipse cx="0" cy="-122" rx="248" ry="14" fill="#f0a020" opacity=".75"/>
          <line x1="-290" y1="-50" x2="290" y2="-50" stroke="#1a0a04" strokeWidth="2"/>
          <line x1="-290" y1="25"  x2="290" y2="25"  stroke="#1a0a04" strokeWidth="2"/>
          <line x1="-290" y1="90"  x2="290" y2="90"  stroke="#1a0a04" strokeWidth="2"/>
          <rect x="-250" y="-130" width="22" height="275" fill="url(#iron)" stroke="#0a0502" strokeWidth="1"/>
          <rect x="228"  y="-130" width="22" height="275" fill="url(#iron)" stroke="#0a0502" strokeWidth="1"/>
          <rect x="-290" y="120"  width="580" height="25" fill="url(#iron)" stroke="#0a0502" strokeWidth="1"/>
          <rect x="-34" y="-10" width="68" height="78" fill="url(#iron)" stroke="#0a0502" strokeWidth="2" rx="4"/>
          <circle cx="0" cy="22" r="10" fill="#1a1208"/>
          <rect x="-3" y="22" width="6" height="24" fill="#1a1208"/>
          <rect x="-280" y="140" width="40" height="20" fill="url(#iron)" stroke="#0a0502" strokeWidth="1" rx="3"/>
          <rect x="240"  y="140" width="40" height="20" fill="url(#iron)" stroke="#0a0502" strokeWidth="1" rx="3"/>
          {/* Gold piles */}
          <ellipse cx="-180" cy="-118" rx="34" ry="8" fill="#f0c040"/>
          <ellipse cx="-110" cy="-122" rx="38" ry="9" fill="#fce27a"/>
          <ellipse cx="-30"  cy="-118" rx="40" ry="10" fill="#f0c040"/>
          <ellipse cx="60"   cy="-124" rx="44" ry="9" fill="#fce27a"/>
          <ellipse cx="140"  cy="-120" rx="38" ry="8" fill="#f0c040"/>
          <ellipse cx="200"  cy="-122" rx="30" ry="7" fill="#fce27a"/>
          {/* Gold bars */}
          <g transform="translate(-200 -110)">
            <rect x="-30" y="-7" width="60" height="14" rx="2" fill="#f0c040" stroke="#8a5a10" strokeWidth="1"/>
            <rect x="-26" y="-6" width="52" height="3"  rx="1" fill="#fce27a"/>
            <rect x="-22" y="-18" width="46" height="11" rx="2" fill="#fce27a" stroke="#8a5a10" strokeWidth="1"/>
            <rect x="-18" y="-17" width="38" height="2" rx="1" fill="#fff2c8"/>
          </g>
          <g transform="translate(180 -108)">
            <rect x="-28" y="-6" width="56" height="13" rx="2" fill="#f0c040" stroke="#8a5a10" strokeWidth="1"/>
            <rect x="-24" y="-5" width="48" height="3" rx="1" fill="#fce27a"/>
          </g>
          {/* Crown */}
          <g transform="translate(-90 -108)">
            <path d="M-30 6 L-30 -8 L-18 4 L-10 -14 L0 4 L10 -14 L18 4 L30 -8 L30 6 Z" fill="#fce27a" stroke="#5a3a08" strokeWidth="1.2"/>
            <rect x="-30" y="6" width="60" height="6" fill="#f0c040" stroke="#5a3a08" strokeWidth="1"/>
            <circle cx="-18" cy="-10" r="2.5" fill="url(#ruby)"/>
            <circle cx="0"   cy="-12" r="2.8" fill="url(#emerald)"/>
            <circle cx="18"  cy="-10" r="2.5" fill="url(#sapphire)"/>
          </g>
          {/* Pearl necklace */}
          <path d="M -140 -116 Q -90 -98 -40 -110 Q 10 -120 60 -100 Q 110 -86 160 -110" fill="none" stroke="#d8c8a0" strokeWidth="1"/>
          {[[-140,-116],[-122,-110],[-104,-104],[-86,-102],[-66,-104],[-48,-108],[-26,-114],[-6,-118],[14,-116],[36,-110],[58,-100],[78,-94],[100,-92],[122,-96],[144,-104],[160,-110]].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="url(#pearl)"/>
          ))}
          {/* Gems */}
          <polygon points="-220,-104 -208,-118 -196,-104 -208,-90" fill="url(#ruby)"     stroke="#3a0606" strokeWidth="1.2"/>
          <polygon points="-216,-104 -208,-114 -200,-104 -208,-94" fill="#ffb0b0" opacity=".5"/>
          <polygon points="220,-100 232,-114 244,-100 232,-86"     fill="url(#sapphire)" stroke="#0a1a4a" strokeWidth="1.2"/>
          <polygon points="224,-100 232,-110 240,-100 232,-90"     fill="#c8e0ff" opacity=".5"/>
          <polygon points="-50,-100 -38,-114 -26,-100 -38,-86"    fill="url(#emerald)"  stroke="#0a3a18" strokeWidth="1.2"/>
          <polygon points="-46,-100 -38,-110 -30,-100 -38,-90"    fill="#c0f0c8" opacity=".5"/>
          <polygon points="100,-100 112,-114 124,-100 112,-86"    fill="url(#amethyst)" stroke="#2a0a5a" strokeWidth="1.2"/>
          <polygon points="104,-100 112,-110 120,-100 112,-90"    fill="#f0c8ff" opacity=".5"/>
          {/* Spilling coins */}
          <circle cx="-244" cy="-110" r="11" fill="#f0c040" stroke="#8a5a10" strokeWidth="1"/>
          <circle cx="-224" cy="-92"  r="9"  fill="#fce27a" stroke="#8a5a10" strokeWidth="1"/>
          <circle cx="-200" cy="-72"  r="8"  fill="#f0c040" stroke="#8a5a10" strokeWidth="1"/>
          <circle cx="-180" cy="-50"  r="9"  fill="#fce27a" stroke="#8a5a10" strokeWidth="1"/>
          <circle cx="-156" cy="-32"  r="7"  fill="#f0c040" stroke="#8a5a10" strokeWidth="1"/>
          <circle cx="232"  cy="-105" r="11" fill="#f0c040" stroke="#8a5a10" strokeWidth="1"/>
          <circle cx="252"  cy="-86"  r="9"  fill="#fce27a" stroke="#8a5a10" strokeWidth="1"/>
          <circle cx="232"  cy="-66"  r="8"  fill="#f0c040" stroke="#8a5a10" strokeWidth="1"/>
          <circle cx="250"  cy="-46"  r="9"  fill="#fce27a" stroke="#8a5a10" strokeWidth="1"/>
          <circle cx="226"  cy="-28"  r="7"  fill="#f0c040" stroke="#8a5a10" strokeWidth="1"/>
          <ellipse cx="-260" cy="155" rx="14" ry="3.5" fill="#f0c040" stroke="#8a5a10" strokeWidth=".8"/>
          <ellipse cx="-238" cy="158" rx="11" ry="3"   fill="#fce27a" stroke="#8a5a10" strokeWidth=".8"/>
          <ellipse cx="265"  cy="155" rx="14" ry="3.5" fill="#f0c040" stroke="#8a5a10" strokeWidth=".8"/>
          <ellipse cx="244"  cy="158" rx="11" ry="3"   fill="#fce27a" stroke="#8a5a10" strokeWidth=".8"/>
        </g>

        {/* Chalice */}
        <g transform="translate(500 400)">
          <ellipse cx="0" cy="155" rx="120" ry="14" fill="#000" opacity=".55"/>
          <rect x="-95" y="118" width="190" height="34" rx="6" fill="url(#goldEdge)" stroke="#5a3a08" strokeWidth="2"/>
          <rect x="-82" y="106" width="164" height="14" rx="4" fill="url(#goldEdge)"/>
          <rect x="-22" y="0" width="44" height="118" fill="url(#goldEdge)" stroke="#5a3a08" strokeWidth="2"/>
          <ellipse cx="0" cy="60" rx="34" ry="10" fill="url(#goldEdge)" stroke="#5a3a08" strokeWidth="2"/>
          <ellipse cx="0" cy="0" rx="50" ry="11" fill="url(#goldEdge)" stroke="#5a3a08" strokeWidth="2"/>
          <path d="M-86 -110 Q-86 0 0 0 Q86 0 86 -110 Z" fill="url(#goldFace)" stroke="#5a3a08" strokeWidth="3"/>
          <ellipse cx="0" cy="-110" rx="86" ry="20" fill="#f6d268" stroke="#5a3a08" strokeWidth="3"/>
          <ellipse cx="0" cy="-113" rx="76" ry="14" fill="#3a1606" opacity=".75"/>
          <ellipse cx="-28" cy="-118" rx="28" ry="5" fill="#fff2c8" opacity=".6"/>
          <path d="M-70 -90 Q-54 -28 -10 -6" stroke="#fff2c8" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".5"/>
          <circle cx="0" cy="-58" r="22" fill="url(#gemShine)" stroke="#3a0606" strokeWidth="2"/>
          <circle cx="-7" cy="-65" r="7" fill="#ffd0d0" opacity=".85"/>
        </g>
      </svg>

      {/* ── Floating coins ── */}
      <div style={{position:"absolute",inset:0,zIndex:1,pointerEvents:"none",overflow:"hidden"}}>
        {[
          {left:"3%",  size:22,dur:9,   delay:0,   drift:"40px"},
          {left:"8%",  size:16,dur:7,   delay:2.4, drift:"-30px"},
          {left:"13%", size:20,dur:11,  delay:5.1, drift:"50px"},
          {left:"18%", size:14,dur:6,   delay:1.2, drift:"-20px"},
          {left:"23%", size:24,dur:10,  delay:3.6, drift:"60px"},
          {left:"28%", size:18,dur:8,   delay:0.8, drift:"-40px"},
          {left:"33%", size:20,dur:9.5, delay:4.2, drift:"30px"},
          {left:"38%", size:16,dur:7.5, delay:6.0, drift:"-50px"},
          {left:"43%", size:22,dur:11,  delay:2.0, drift:"40px"},
          {left:"48%", size:18,dur:8.5, delay:5.5, drift:"-30px"},
          {left:"53%", size:14,dur:6.5, delay:3.3, drift:"25px"},
          {left:"58%", size:24,dur:10.5,delay:1.6, drift:"-45px"},
          {left:"63%", size:18,dur:9,   delay:7.2, drift:"30px"},
          {left:"68%", size:20,dur:8,   delay:0.4, drift:"-35px"},
          {left:"73%", size:16,dur:7,   delay:4.8, drift:"40px"},
          {left:"78%", size:22,dur:10,  delay:2.8, drift:"-50px"},
          {left:"83%", size:18,dur:9.5, delay:6.5, drift:"25px"},
          {left:"88%", size:24,dur:11,  delay:1.0, drift:"-30px"},
          {left:"93%", size:16,dur:7.5, delay:3.9, drift:"35px"},
          {left:"97%", size:20,dur:9,   delay:5.8, drift:"-25px"},
        ].map((c,i) => (
          <div key={i} style={{position:"absolute",left:c.left,bottom:0,width:c.size,height:c.size,"--drift":c.drift,animation:`coinDrift ${c.dur}s linear ${c.delay}s infinite`,filter:"drop-shadow(0 0 6px rgba(255,210,80,.9))"}}>
            <div style={{width:"100%",height:"100%",borderRadius:"50%",background:"radial-gradient(circle at 35% 30%, #fff8d8, #f0c040 55%, #7a4a08)",border:"1.5px solid #5a3a08",boxShadow:"0 0 14px rgba(255,210,80,.85), inset 0 0 4px rgba(255,255,200,.6)",animation:`coinSpin ${c.dur/3}s ease-in-out infinite`}}/>
          </div>
        ))}
        {/* Coin burst */}
        {[
          {bx:"-260px",by:"-280px",size:18,dur:3.8,delay:0},
          {bx:"-190px",by:"-340px",size:14,dur:4.2,delay:0.6},
          {bx:"-110px",by:"-380px",size:20,dur:3.4,delay:1.2},
          {bx:"-40px", by:"-360px",size:16,dur:4.0,delay:1.8},
          {bx:"60px",  by:"-380px",size:18,dur:3.6,delay:2.4},
          {bx:"140px", by:"-340px",size:14,dur:4.4,delay:0.3},
          {bx:"220px", by:"-300px",size:20,dur:3.8,delay:0.9},
          {bx:"290px", by:"-240px",size:16,dur:4.0,delay:1.5},
          {bx:"-310px",by:"-220px",size:14,dur:4.2,delay:2.1},
          {bx:"-230px",by:"-160px",size:18,dur:3.6,delay:2.7},
          {bx:"260px", by:"-160px",size:18,dur:3.4,delay:1.0},
          {bx:"330px", by:"-100px",size:14,dur:4.0,delay:0.5},
        ].map((c,i) => (
          <div key={`b${i}`} style={{position:"absolute",left:"50%",top:"55%",width:c.size,height:c.size,marginLeft:-c.size/2,marginTop:-c.size/2,"--bx":c.bx,"--by":c.by,animation:`coinBurst ${c.dur}s ease-out ${c.delay}s infinite`,filter:"drop-shadow(0 0 8px rgba(255,210,80,1))"}}>
            <div style={{width:"100%",height:"100%",borderRadius:"50%",background:"radial-gradient(circle at 35% 30%, #fff8d8, #f0c040 55%, #7a4a08)",border:"1.5px solid #5a3a08",boxShadow:"0 0 12px rgba(255,210,80,.9), inset 0 0 4px rgba(255,255,200,.6)",animation:`coinSpin ${c.dur/2}s ease-in-out infinite`}}/>
          </div>
        ))}
      </div>

      {/* ── Title text ── */}
      <div style={{position:"absolute",top:"5%",left:0,right:0,display:"flex",flexDirection:"column",alignItems:"center",zIndex:2,padding:"0 24px",pointerEvents:"none"}}>
        <h1 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"clamp(26px,7vw,56px)",fontWeight:900,background:"linear-gradient(135deg,#f0c040,#c03030,#f0c040)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 3s linear infinite",textAlign:"center",margin:0,filter:"drop-shadow(0 2px 12px rgba(240,160,40,.35))"}}>FOOL'S GOLD</h1>
        <p style={{fontFamily:"'Crimson Pro',serif",fontStyle:"italic",color:"#d8a868",fontSize:13,letterSpacing:".22em",marginTop:4,textShadow:"0 1px 6px rgba(0,0,0,.8)"}}>CONQUER · SUMMON · DOMINATE</p>
      </div>

      {/* ── Buttons ── */}
      <div style={{position:"absolute",bottom:"14%",left:0,right:0,display:"flex",flexDirection:"column",alignItems:"center",gap:10,zIndex:2,padding:"0 24px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:240}}>
          <button className="btn" onClick={() => setScreen("faction")}
            style={{padding:"13px",background:"linear-gradient(135deg,#7a1010,#c03030)",border:"1px solid #e04040",color:"#f0c040",fontSize:14,fontWeight:700,boxShadow:"0 4px 18px rgba(0,0,0,.6)"}}>
            ⚔ BEGIN CAMPAIGN
          </button>
          {onTestCampaign && ( /* TEST MODE — only when the build enables it */
            <button className="btn" onClick={onTestCampaign}
              style={{padding:"11px",background:"rgba(20,14,6,.85)",border:"1px dashed #c8a040",color:"#f0c040",fontSize:12,fontWeight:700}}>
              🛠 TEST CAMPAIGN
            </button>
          )}
          <button type="button" onClick={() => setShowLogin(true)}
            style={{background:"none",border:"none",color:"#d8a868",fontSize:12,cursor:"pointer",padding:4}}>
            {username ? `Logged in as ${username}` : "Log In / Register"}
          </button>
        </div>
      </div>

      {showLogin && (
        <LoginModal onClose={() => { setShowLogin(false); setUsername(getAccountUsername()); }} />
      )}
    </div>
  );
}
