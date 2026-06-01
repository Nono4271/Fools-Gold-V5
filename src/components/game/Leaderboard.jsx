// src/components/game/Leaderboard.jsx
import { useState, useMemo } from "react";

const P = {
  bg:     "#07090e",
  panel:  "rgba(255,255,255,.025)",
  border: "#1a1e28",
  text:   "#c8c0b0",
  sub:    "#4a5a6a",
  gold:   "#c8a060",
  ff:     "'Cinzel',serif",
};

function RankBadge({ rank }) {
  const color = rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : rank === 3 ? "#cd7f32" : P.sub;
  return (
    <div style={{ minWidth:28, textAlign:"center", fontFamily:P.ff, fontSize:rank<=3?11:9,
      color, fontWeight:rank<=3?"700":"400" }}>
      {rank <= 3 ? ["🥇","🥈","🥉"][rank-1] : rank}
    </div>
  );
}

function PowerBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ flex:1, height:3, background:"rgba(255,255,255,.06)", borderRadius:2, overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, height:"100%", borderRadius:2,
        background:"linear-gradient(90deg,#3a6a40,#60aa60)", transition:"width .4s" }}/>
    </div>
  );
}

// ── Player Leaderboard ────────────────────────────────────────────────────────
// entries: pre-computed array of { id, name, faction, power } passed from Game.jsx
// (avoids iterating the Proxy tile map which can crash)
function PlayerBoard({ entries = [] }) {
  const max = entries[0]?.power || 1;

  return (
    <div className="scr" style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
      {entries.length === 0 && (
        <div style={{ padding:24, textAlign:"center", fontSize:9, color:P.sub }}>No data yet</div>
      )}
      {entries.map((e, i) => {
        const isMe = e.id === "player";
        return (
          <div key={e.id} style={{
            display:"flex", alignItems:"center", gap:10, padding:"8px 16px",
            background: isMe ? "rgba(80,140,80,.08)" : "transparent",
            borderBottom:`1px solid ${P.border}`,
          }}>
            <RankBadge rank={i+1} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                <span style={{ fontFamily:P.ff, fontSize:9, color: isMe ? "#80cc80" : P.text,
                  fontWeight: isMe ? "700" : "400", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {isMe ? "★ " : ""}{e.name}
                </span>
              </div>
              <PowerBar value={e.power} max={max} />
            </div>
            <div style={{ textAlign:"right", minWidth:60 }}>
              <div style={{ fontFamily:P.ff, fontSize:9, color:P.gold }}>{e.power.toLocaleString()}</div>
              <div style={{ fontSize:7, color:P.sub }}>pwr/hr</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Crew Leaderboard ─────────────────────────────────────────────────────────
function CrewBoard({ crews, playerCrewId }) {
  // crews: array of { id, name, memberCount, totalPower } — stubbed for now
  const entries = useMemo(() => {
    if (!crews?.length) return [];
    return [...crews].sort((a,b) => b.totalPower - a.totalPower).slice(0, 30);
  }, [crews]);

  const max = entries[0]?.totalPower || 1;

  return (
    <div className="scr" style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
      {entries.length === 0 ? (
        <div style={{ padding:32, textAlign:"center" }}>
          <div style={{ fontSize:24, marginBottom:8 }}>⚓</div>
          <div style={{ fontFamily:P.ff, fontSize:9, color:P.sub, letterSpacing:".06em" }}>
            CREW RANKINGS
          </div>
          <div style={{ fontSize:8, color:"#2a3a2a", marginTop:6 }}>
            Available when multiplayer is live
          </div>
        </div>
      ) : entries.map((crew, i) => {
        const isMe = crew.id === playerCrewId;
        return (
          <div key={crew.id} style={{
            display:"flex", alignItems:"center", gap:10, padding:"8px 16px",
            background: isMe ? "rgba(80,140,80,.08)" : "transparent",
            borderBottom:`1px solid ${P.border}`,
          }}>
            <RankBadge rank={i+1} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:P.ff, fontSize:9, color: isMe ? "#80cc80" : P.text,
                fontWeight: isMe ? "700" : "400", marginBottom:3 }}>
                {isMe ? "★ " : ""}{crew.name}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <PowerBar value={crew.totalPower} max={max} />
                <span style={{ fontSize:7, color:P.sub, whiteSpace:"nowrap" }}>{crew.memberCount} members</span>
              </div>
            </div>
            <div style={{ textAlign:"right", minWidth:60 }}>
              <div style={{ fontFamily:P.ff, fontSize:9, color:P.gold }}>{crew.totalPower.toLocaleString()}</div>
              <div style={{ fontSize:7, color:P.sub }}>pwr/hr</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── War Ranking (stub) ────────────────────────────────────────────────────────
function WarBoard() {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:32, gap:12 }}>
      <div style={{ fontSize:32 }}>⚔️</div>
      <div style={{ fontFamily:P.ff, fontSize:11, color:P.gold, letterSpacing:".08em" }}>
        WAR RANKING
      </div>
      <div style={{ fontSize:8, color:P.sub, textAlign:"center", maxWidth:200, lineHeight:1.7 }}>
        PvP season rankings coming soon. Earn war points by capturing territory, defeating enemies, and completing season objectives.
      </div>
    </div>
  );
}

// ── Main Leaderboard Screen ───────────────────────────────────────────────────
const TABS = [
  { id:"player", label:"PLAYER" },
  { id:"crew",   label:"CREW"   },
  { id:"war",    label:"WAR"    },
];

export default function Leaderboard({ onClose, playerEntries, crews, playerCrewId }) {
  const [tab, setTab] = useState("player");

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9800,
      background:"rgba(0,0,0,.85)", display:"flex", alignItems:"center", justifyContent:"center",
      pointerEvents:"auto",
    }}>
      <div style={{
        width:"min(480px, 96vw)", height:"min(680px, 92vh)",
        background:P.bg, border:`1px solid ${P.border}`,
        borderRadius:10, display:"flex", flexDirection:"column",
        boxShadow:"0 24px 80px rgba(0,0,0,.9)",
        overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${P.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background:"rgba(255,255,255,.025)", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:P.ff, fontSize:13, color:P.gold, letterSpacing:".08em" }}>
              🏆 LEADERBOARD
            </div>
            <div style={{ fontSize:7, color:P.sub, marginTop:2, fontFamily:P.ff, letterSpacing:".05em" }}>
              POWER PER HOUR RANKINGS
            </div>
          </div>
          <button onClick={onClose} style={{
            background:"none", border:`1px solid #2a2a2a`, color:"#777",
            fontSize:16, width:36, height:36, borderRadius:4, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>✕</button>
        </div>

        {/* Tab bar */}
        <div style={{ display:"flex", borderBottom:`1px solid ${P.border}`, flexShrink:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:"10px 0", background:tab===t.id?"rgba(255,255,255,.04)":"none",
              border:"none", borderBottom:tab===t.id?`2px solid ${P.gold}`:`2px solid transparent`,
              color:tab===t.id?P.gold:P.sub,
              fontFamily:P.ff, fontSize:9, letterSpacing:".06em",
              cursor:"pointer", transition:"color .15s, border-color .15s",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "player" && <PlayerBoard entries={playerEntries} />}
        {tab === "crew"   && <CrewBoard crews={crews} playerCrewId={playerCrewId} />}
        {tab === "war"    && <WarBoard />}
      </div>
    </div>
  );
}
