import { useState, memo, useCallback } from "react";
import { RARITY, CLASS } from "../../../shared/constants/heroes.js";
import { CSS } from "../../constants/css.js";
import { HQP, POWER_DEFS } from "../../../shared/constants/map.js";
import { isoXY, COLS, ROWS } from "../../../shared/constants/geometry.js";

/* ─────────────────────────────────────────────────────────────────────────────
   GameBar — persistent bottom action bar + left commander portraits + right reports
   Reference layout:
     LEFT.  — vertical stack of commander portrait icons (fixed left side)
     BOTTOM — HQ | Summon | Commander tabs
     RIGHT  — battle report / notification icons (fixed right side)

   iOS note: All interactive elements use native <button> tags so iOS Safari
   always fires click events, regardless of touch-action or canvas preventDefault.
───────────────────────────────────────────────────────────────────────────── */

const RARITY_GLOW = {
  soldier:  { ring: "#4488cc", glow: "rgba(68,136,204,0.6)"  },
  veteran:  { ring: "#a855f7", glow: "rgba(168,85,247,0.6)"  },
  champion: { ring: "#f0c040", glow: "rgba(240,192,64,0.7)"  },
};

/* Shared reset so <button> looks/behaves like the old styled divs */
const BTN_RESET = {
  background: "none",
  border: "none",
  padding: 0,
  margin: 0,
  cursor: "pointer",
  WebkitAppearance: "none",
  appearance: "none",
  touchAction: "manipulation",
};

function PortraitButton({ cmd, onClick, active, badge }) {
  const rg = RARITY_GLOW[cmd?.rarity] ?? RARITY_GLOW.soldier;
  const [pressed, setPressed] = useState(false);

  return (
    <button
      style={{
        ...BTN_RESET,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      }}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
      {/* Outer decorative ring */}
      <div style={{
        width: 42, height: 42,
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
          {cmd?.bust
            ? <img src={cmd.bust} alt={cmd.n} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} />
            : <span style={{ lineHeight: 1, userSelect: "none" }}>{cmd?.icon ?? "?"}</span>
          }
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
    </button>
  );
}

function ActionButton({ icon, label, color = "#c8a060", onClick, badge, accent }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      style={{
        ...BTN_RESET,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      }}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
      <div style={{
        width: 40, height: 40,
        borderRadius: 8,
        position: "relative",
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "transform .12s ease",
        flexShrink: 0,
        filter: "drop-shadow(0 2px 8px rgba(0,0,0,.9))",
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
          fontSize: 18, filter: "drop-shadow(0 1px 3px rgba(0,0,0,.8))",
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
    </button>
  );
}

// ── Tile Search Panel (slides in from left like CommanderPicker) ───────────────
const PL_LIST = [1,2,3,4,5,6,7,8,9,10,11,12,13]
  .filter(pl => POWER_DEFS[pl])
  .map(pl => ({ pl, label: POWER_DEFS[pl].label, color: POWER_DEFS[pl].color }));

function TileSearch({ tiles, panRef, zoomRef, mapRendererRef, playerHqKey, onClose }) {
  const [selected, setSelected] = useState(new Set());
  const [results, setResults] = useState(null);
  const [searched, setSearched] = useState(false);

  const togglePl = (pl) => setSelected(prev => {
    const next = new Set(prev);
    next.has(pl) ? next.delete(pl) : next.add(pl);
    return next;
  });

  const doSearch = useCallback(() => {
    if (!selected.size || !tiles) return;
    const hqKey = playerHqKey;
    const [hc, hr] = (hqKey || "0,0").split(",").map(Number);
    const matches = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const key = `${c},${r}`;
        const tile = tiles[key];
        if (!tile) continue;
        if (!selected.has(tile.powerLevel)) continue;
        if (tile.isHQ || tile.isGate || tile.isBorder || tile.isKeepPart) continue;
        if (tile.isKeep && tile.powerLevel < 10) continue;
        const dc = c - hc, dr = r - hr;
        matches.push({ key, c, r, pl: tile.powerLevel, dist: Math.sqrt(dc*dc + dr*dr) });
      }
    }
    matches.sort((a, b) => a.dist - b.dist);
    setResults(matches.slice(0, 20));
    setSearched(true);
  }, [selected, tiles, playerHqKey]);

  const jumpTo = useCallback((c, r) => {
    const { cx, cy } = isoXY(c, r);
    const z = zoomRef.current;
    const px = -cx * z + window.innerWidth / 2;
    const py = -cy * z + window.innerHeight / 2;
    panRef.current = { x: px, y: py };
    mapRendererRef.current?.teleport(px, py);
    onClose();
  }, [panRef, zoomRef, mapRendererRef, onClose]);

  return (
    <div style={{
      position:"fixed", top:"var(--hud-offset)", left:0, bottom:0, width:280, zIndex:9500,
      paddingLeft:"var(--sal, 0px)",
      background:"rgba(5,7,11,.97)", borderRight:"1px solid #1a2030",
      boxShadow:"4px 0 32px rgba(0,0,0,.9)",
      display:"flex", flexDirection:"column",
      animation:"slideInLeft .22s ease",
      pointerEvents:"auto",
    }}>
      {/* Header */}
      <div style={{ padding:"10px 12px", borderBottom:"1px solid #1a1e28", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, background:"rgba(255,255,255,.025)" }}>
        <div>
          <div style={{ fontFamily:"'Cinzel',serif", fontWeight:700, fontSize:12, color:"#c8a060" }}>🔍 FIND TILES</div>
          <div style={{ fontSize:8, color:"#5a6a7a", fontFamily:"'Crimson Pro',serif", marginTop:2 }}>Select power levels to search</div>
        </div>
        <button
          onClick={onClose}
          style={{ background:"none", border:"1px solid #2a2a2a", color:"#777", fontSize:16, minWidth:36, minHeight:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", touchAction:"manipulation", WebkitTapHighlightColor:"transparent", borderRadius:4, flexShrink:0 }}
        >✕</button>
      </div>

      {/* Power level picker — fixed, no scroll, 2-column grid */}
      <div style={{ padding:"8px 12px 6px", flexShrink:0, borderBottom:"1px solid #1a1e28" }}>
        <div style={{ fontSize:7, color:"#4a5a6a", fontFamily:"'Cinzel',serif", marginBottom:6, letterSpacing:".05em" }}>POWER LEVELS</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:3 }}>
          {PL_LIST.map(({ pl, label, color }) => {
            const on = selected.has(pl);
            return (
              <button
                key={pl}
                onClick={() => togglePl(pl)}
                style={{
                  display:"flex", alignItems:"center", gap:6, padding:"6px 8px",
                  borderRadius:5, cursor:"pointer", touchAction:"manipulation",
                  WebkitTapHighlightColor:"transparent",
                  background: on ? `${color}18` : "rgba(255,255,255,.02)",
                  border:`1px solid ${on ? color+"60" : "#1e2028"}`,
                  transition:"background .12s, border-color .12s",
                  userSelect:"none", textAlign:"left",
                }}
              >
                <div style={{
                  width:14, height:14, borderRadius:3, flexShrink:0,
                  border:`1px solid ${color}88`,
                  background: on ? color : "rgba(0,0,0,.4)",
                  boxShadow: on ? `0 0 5px ${color}66` : "none",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"background .1s",
                }}>
                  {on && <span style={{ fontSize:10, color:"#fff", lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color: on ? color : "#5a6a6a", letterSpacing:".02em" }}>
                  ⚡ {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search button — fixed */}
      <div style={{ padding:"8px 12px", flexShrink:0, borderBottom:"1px solid #1a1e28" }}>
        <button
          onClick={doSearch}
          disabled={!selected.size}
          style={{
            width:"100%", padding:"10px 0",
            background: selected.size ? "linear-gradient(160deg,#1a2a3a,#0e1820)" : "rgba(10,14,20,.6)",
            border:`1px solid ${selected.size ? "#3a6080" : "#1a2028"}`,
            borderRadius:5, color: selected.size ? "#80c0e0" : "#2a3a48",
            fontFamily:"'Cinzel',serif", fontSize:11, letterSpacing:".06em",
            cursor: selected.size ? "pointer" : "default",
            touchAction:"manipulation",
          }}
        >
          🔍 Search Nearest 20
        </button>
      </div>

      {/* Results — only this section scrolls */}
      {searched && results !== null && (
        <div className="scr" style={{ flex:1, overflowY:"auto", padding:"8px 12px" }}>
          <div style={{ fontSize:7, color:"#4a5a6a", fontFamily:"'Cinzel',serif", marginBottom:6, letterSpacing:".05em" }}>
            {results.length > 0 ? `${results.length} NEAREST RESULTS` : "NO RESULTS FOUND"}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {results.map(({ key, c, r, pl, dist }) => {
              const def = POWER_DEFS[pl];
              return (
                <button
                  key={key}
                  onClick={() => jumpTo(c, r)}
                  style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    width:"100%", padding:"10px 10px",
                    background:"rgba(255,255,255,.03)", border:"1px solid #1e2028",
                    borderRadius:5, cursor:"pointer", touchAction:"manipulation",
                    textAlign:"left",
                  }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{
                      fontSize:7, fontFamily:"'Cinzel',serif", fontWeight:700,
                      color: def?.color, background:`${def?.color}18`,
                      padding:"1px 5px", borderRadius:3, border:`1px solid ${def?.color}40`,
                    }}>⚡ {def?.label}</span>
                    <span style={{ fontSize:7, color:"#4a5a6a", fontFamily:"'Crimson Pro',serif" }}>{c},{r}</span>
                  </div>
                  <span style={{ fontSize:7, color:"#3a4a5a", fontFamily:"'Cinzel',serif" }}>
                    {Math.round(dist)} ›
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(function GameBar({
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
  showPerf, setShowPerf,
  panRef, zoomRef, mapRendererRef,
  voidTapReady,
  // Crew props
  crewOpen, setCrewOpen, playerCrewId,
  searchOpen, setSearchOpen,
  // Fort props
  forts,
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
        position: "fixed", left: "var(--left-inset, 8px)", bottom: "calc(var(--sab, 0px) + 90px)",
        zIndex: 300,
        display: "flex", flexDirection: "column-reverse", gap: 5, alignItems: "center",
      }}>
        {playerCmds.length > 0 ? playerCmds.map(cmd => {
          const stationedFort = (forts || []).find(f => f.stationedCmdUids?.includes(cmd.uid));
          const isAtHQ = !cmd.stationedFortId && !cmd.stranded;
          const badge = cmd.stranded ? "⚠" : stationedFort ? "📍" : isAtHQ ? "🏰" : null;
          return (
          <div key={cmd.uid} style={{ position: "relative" }}>
            <PortraitButton
              cmd={cmd}
              onClick={() => {
                const [c, r] = (cmd.tk || "0,0").split(",").map(Number);
                const { cx, cy } = isoXY(c, r);
                const z = zoomRef.current;
                const px = -cx * z + window.innerWidth / 2;
                const py = -cy * z + window.innerHeight / 2;
                panRef.current = { x: px, y: py };
                mapRendererRef.current?.teleport(px, py);
              }}
              active={false}
              badge={0}
            />
            {badge && (
              <div style={{
                position: "absolute", bottom: 0, right: 0,
                fontSize: 10, lineHeight: 1,
                background: cmd.stranded ? "rgba(180,20,20,.9)" : "rgba(10,20,10,.85)",
                borderRadius: "50%", padding: 2,
                border: `1px solid ${cmd.stranded ? "#cc2020" : "#3a5a3a"}`,
              }}>{badge}</div>
            )}
          </div>
          );
        }) : (
          <div style={{ width: 52, height: 52, borderRadius: "50%",
            background: "radial-gradient(circle, #0e0c08, #080603)",
            border: "1px dashed #1a1408", opacity: 0.2, flexShrink: 0 }} />
        )}
      </div>

      {/* ── RIGHT RAIL: Reports ── */}
      <div style={{
        position: "fixed", right: 8, top: "70%", transform: "translateY(-50%)",
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

      {/* ── BOTTOM BAR: floating right-aligned, no background ── */}
      <div style={{
        position: "fixed", bottom: 0, right: 0,
        zIndex: 9100,
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
        paddingRight: 8,
        pointerEvents: "none",
      }}>
        <div style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          padding: "0 0 10px 0",
          gap: 11,
          pointerEvents: "auto",
        }}>
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
          <ActionButton icon="⚓" label="Crew" color={playerCrewId ? "#40cc80" : "#80aacc"} accent={playerCrewId ? "#1a4a30" : "#1a3a5c"} onClick={() => setCrewOpen(v => !v)} />
        </div>
      </div>

      {searchOpen && (
        <TileSearch
          tiles={tiles}
          panRef={panRef}
          zoomRef={zoomRef}
          mapRendererRef={mapRendererRef}
          playerHqKey={playerHqKey}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
});
