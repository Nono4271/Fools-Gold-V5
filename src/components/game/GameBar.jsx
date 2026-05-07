import { useState } from "react";
import { RARITY, CLASS } from "../../../shared/constants/heroes.js";
import { CSS } from "../../constants/css.js";
import { HQP } from "../../../shared/constants/map.js";

/* ─────────────────────────────────────────────────────────────────────────────
   GameBar — persistent bottom action bar + left commander portraits + right reports
   Reference layout:
     LEFT  — vertical stack of commander portrait icons (fixed left side)
     BOTTOM — HQ | Summon | Commander tabs
     RIGHT  — battle report / notification icons (fixed right side)
───────────────────────────────────────────────────────────────────────────── */

const RARITY_GLOW = {
  soldier:  { ring: "#4488cc", glow: "rgba(68,136,204,0.6)"  },
  veteran:  { ring: "#a855f7", glow: "rgba(168,85,247,0.6)"  },
  champion: { ring: "#f0c040", glow: "rgba(240,192,64,0.7)"  },
};

function PortraitButton({ cmd, onClick, active, badge }) {
  const rg = RARITY_GLOW[cmd?.rarity] ?? RARITY_GLOW.soldier;
  const [pressed, setPressed] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}>

      {/* Outer decorative ring */}
      <div style={{
        width: 52, height: 52,
        borderRadius: "50%",
        background: `conic-gradient(${rg.ring} 0deg, #2a1e0e 90deg, ${rg.ring} 180deg, #2a1e0e 270deg, ${rg.ring} 360deg)`,
        padding: 2,
        boxShadow: active
          ? `0 0 0 2px ${rg.ring}, 0 0 12px ${rg.glow}, inset 0 1px 0 rgba(255,255,255,.1)`
          : `0 0 6px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.05)`,
        transform: pressed ? "scale(0.92)" : active ? "scale(1.06)" : "scale(1)",
        transition: "transform .12s ease, box-shadow .15s ease",
        position: "relative",
        flexShrink: 0,
      }}>
        <div style={{
          width: "100%", height: "100%",
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #2a2215, #0e0c09)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26,
          border: `1px solid ${rg.ring}55`,
          overflow: "hidden",
          position: "relative",
        }}>
          <span style={{ lineHeight: 1, userSelect: "none" }}>{cmd?.icon ?? "?"}</span>
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
            background: "linear-gradient(to top, rgba(0,0,0,.7), transparent)",
            borderRadius: "0 0 50% 50%",
          }} />
          {active && (
            <div style={{
              position: "absolute", bottom: 0, left: "10%", right: "10%", height: 3,
              background: rg.ring,
              borderRadius: "0 0 4px 4px",
              boxShadow: `0 0 8px ${rg.glow}`,
            }} />
          )}
        </div>

        {badge > 0 && (
          <div style={{
            position: "absolute", top: -2, right: -2,
            width: 16, height: 16, borderRadius: "50%",
            background: "linear-gradient(135deg,#dd3030,#991010)",
            border: "1px solid #0e0c09",
            fontSize: 7, color: "#fff", fontFamily: "'Cinzel',serif", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{Math.min(99, badge)}</div>
        )}
      </div>

      {/* Name label */}
      <div style={{
        fontFamily: "'Cinzel',serif", fontSize: 6.5, color: active ? "#f0c040" : "#6a5a3a",
        letterSpacing: ".04em", textAlign: "center", maxWidth: 52,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        transition: "color .15s",
        textShadow: active ? "0 0 8px rgba(240,192,64,.5)" : "none",
      }}>
        {cmd?.n?.split(" ")[0] ?? ""}
      </div>
    </div>
  );
}

function ActionButton({ icon, label, color = "#c8a060", onClick, badge, accent }) {
  const [pressed, setPressed] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}>

      <div style={{
        width: 46, height: 46,
        borderRadius: 8,
        position: "relative",
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "transform .12s ease",
        flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: 8,
          background: accent
            ? `linear-gradient(160deg, ${accent}22 0%, #0e0c09 60%)`
            : "linear-gradient(160deg, #1e1a12 0%, #0a0805 60%)",
          border: `1px solid ${accent ?? color}44`,
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,.08),
            inset 0 -1px 0 rgba(0,0,0,.6),
            0 4px 12px rgba(0,0,0,.7),
            0 0 0 1px rgba(0,0,0,.8)
          `,
        }} />
        <div style={{
          position: "absolute", top: 1, left: 2, right: 2, height: 1,
          background: "rgba(255,255,255,.12)", borderRadius: "8px 8px 0 0",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, filter: "drop-shadow(0 1px 3px rgba(0,0,0,.8))",
        }}>{icon}</div>

        {badge > 0 && (
          <div style={{
            position: "absolute", top: -3, right: -3,
            width: 16, height: 16, borderRadius: "50%",
            background: "linear-gradient(135deg,#dd3030,#991010)",
            border: "1px solid #0e0c09",
            fontSize: 7, color: "#fff", fontFamily: "'Cinzel',serif", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{Math.min(99, badge)}</div>
        )}
      </div>

      <div style={{
        fontFamily: "'Cinzel',serif", fontSize: 6.5, color,
        letterSpacing: ".04em", textAlign: "center",
        textShadow: `0 0 6px ${color}44`,
      }}>{label}</div>
    </div>
  );
}

export default function GameBar({
  cmds, facName, tiles,
  onCenterHQ,
  onWorldMap,
  unseenBattles,
  setHqOpen, setHqTab,
  setScreen,
  setShowBattleLog, setUnseenBattles,
  setCmdScreenOpen, setCmdScreenUid,
  setGearScreenOpen, gearInventoryCount,
  playerHqKey,
  hidden,
}) {
  if (hidden) return null;
  // All player commanders (for left rail) — only those NOT at HQ
  const hqKey = playerHqKey || `${HQP.player.c},${HQP.player.r}`;
  const playerCmds = cmds
    .filter(c => c.owner === "player" && c.tk !== hqKey)
    .sort((a, b) => {
      const rOrder = { champion: 0, veteran: 1, soldier: 2 };
      return (rOrder[a.rarity] ?? 3) - (rOrder[b.rarity] ?? 3);
    })
    .slice(0, 6);

  const openHQ = (tab = "overview") => {
    setHqOpen(true);
    setHqTab(tab);
  };

  return (
    <>
      {/* ── LEFT RAIL: Commander portrait icons ── */}
      <div style={{
        position: "fixed", left: 8, top: "50%", transform: "translateY(-50%)",
        zIndex: 300,
        display: "flex", flexDirection: "column", gap: 8, alignItems: "center",
      }}>
        {playerCmds.length > 0 ? playerCmds.map(cmd => (
          <PortraitButton
            key={cmd.uid}
            cmd={cmd}
            onClick={() => { setCmdScreenOpen(true); setCmdScreenUid(cmd.uid); }}
            active={false}
            badge={0}
          />
        )) : (
          <div style={{ width: 52, height: 52, borderRadius: "50%",
            background: "radial-gradient(circle, #0e0c08, #080603)",
            border: "1px dashed #1a1408", opacity: 0.2, flexShrink: 0 }} />
        )}
      </div>

      {/* ── RIGHT RAIL: Reports ── */}
      <div style={{
        position: "fixed", right: 8, top: "50%", transform: "translateY(-50%)",
        zIndex: 300,
        display: "flex", flexDirection: "column", gap: 10, alignItems: "center",
      }}>
        <ActionButton
          icon="⚔"
          label="Reports"
          color={unseenBattles > 0 ? "#e8a040" : "#8a8070"}
          accent={unseenBattles > 0 ? "#8a4010" : "#3a3428"}
          badge={unseenBattles}
          onClick={() => { setShowBattleLog(true); setUnseenBattles(0); }}
        />
      </div>

      {/* ── BOTTOM BAR: HQ | Summon | Commander ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 9100,
        background: `
          linear-gradient(180deg,
            rgba(30,22,8,.0) 0%,
            rgba(18,14,6,.97) 20%,
            rgba(12,9,4,1) 100%
          )
        `,
        borderTop: "1px solid #3a2c10",
        boxShadow: "0 -1px 0 rgba(0,0,0,.9), 0 -8px 32px rgba(0,0,0,.8)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {/* Gold top trim line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, #8a6020 15%, #f0c04088 40%, #c89030 60%, #8a602088 85%, transparent)",
        }} />

        {/* Decorative corner accents */}
        <div style={{ position: "absolute", top: 4, left: 8, width: 20, height: 20, opacity: .4,
          borderTop: "1px solid #c8a060", borderLeft: "1px solid #c8a060" }} />
        <div style={{ position: "absolute", top: 4, right: 8, width: 20, height: 20, opacity: .4,
          borderTop: "1px solid #c8a060", borderRight: "1px solid #c8a060" }} />

        <div style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "10px 12px 8px",
          gap: 24,
          maxWidth: 400,
          margin: "0 auto",
        }}>
          <ActionButton
            icon="🏰"
            label="HQ"
            color="#c8a060"
            accent="#8a6020"
            onClick={() => onCenterHQ && onCenterHQ()}
          />
          <ActionButton
            icon="🗺"
            label="Map"
            color="#aaccee"
            accent="#2a4a6c"
            onClick={() => onWorldMap && onWorldMap()}
          />
          <ActionButton
            icon="🌀"
            label="Summon"
            color="#f0c040"
            accent="#a07010"
            onClick={() => setScreen("gacha")}
          />
          <ActionButton
            icon="⚔"
            label="Commander"
            color="#e0b850"
            accent="#7a5010"
            onClick={() => setCmdScreenOpen(true)}
          />
          <ActionButton
            icon="🛡"
            label="Gear"
            color="#e0b850"
            accent="#7a5010"
            badge={0}
            onClick={() => setGearScreenOpen(true)}
          />
        </div>
      </div>
    </>
  );
}
