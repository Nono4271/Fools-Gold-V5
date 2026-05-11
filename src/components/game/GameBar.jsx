import { useState, memo, useCallback } from "react";
import { RARITY, CLASS } from "../../../shared/constants/heroes.js";
import { CSS } from "../../constants/css.js";
import { HQP, POWER_DEFS } from "../../../shared/constants/map.js";
import { isoXY } from "../../../shared/constants/geometry.js";

/* ─────────────────────────────────────────────────────────────────────────────
   GameBar — persistent bottom action bar + left commander portraits + right reports
   Reference layout:
     LEFT  — vertical stack of commander portrait icons (fixed left side)
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

// ── Tile Search Popup ─────────────────────────────────────────────────────────
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

    // Collect all matching tiles, compute distance from player HQ
    const matches = [];
    for (const [key, tile] of Object.entries(tiles)) {
      if (!selected.has(tile.powerLevel)) continue;
      // Exclude static keeps, HQs, gates and border tiles — but include P10-13 structures
      if (tile.isHQ || tile.isGate || tile.isBorder || tile.isKeepPart) continue;
      if (tile.isKeep && tile.powerLevel < 10) continue;
      const dc = tile.c - hc, dr = tile.r - hr;
      matches.push({ key, c: tile.c, r: tile.r, pl: tile.powerLevel, dist: Math.sqrt(dc*dc + dr*dr) });
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
    <>
      {/* Backdrop */}
      <div style={{ position:"fixed", inset:0, zIndex:9200, pointerEvents:"auto" }} onClick={onClose} />

      {/* Panel */}
      <div className="find-tiles-popup" style={{
        position:"fixed", bottom:90, right:8, zIndex:9201,
        width:280,
        pointerEvents:"auto",
        background:"rgba(5,7,11,.97)",
        border:"1px solid #2a2010",
        borderRadius:8,
        boxShadow:"0 8px 32px rgba(0,0,0,.9), 0 0 0 1px rgba(200,160,64,.1)",
        overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{ padding:"8px 10px 6px", borderBottom:"1px solid #1e1810", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:"'Cinzel',serif", fontSize:10, color:"#c8a060", letterSpacing:".06em" }}>🔍 Find Tiles</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#4a4040", fontSize:16, cursor:"pointer", lineHeight:1, padding:"0 2px" }}>✕</button>
        </div>

        {/* Power level checkboxes */}
        <div style={{ padding:"8px 10px 4px" }}>
          <div style={{ fontSize:7, color:"#5a4a30", fontFamily:"'Cinzel',serif", marginBottom:6, letterSpacing:".05em" }}>SELECT POWER LEVELS</div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {PL_LIST.map(({ pl, label, color }) => (
              <label key={pl} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"4px 2px" }}>
                <div
                  role="checkbox"
                  aria-checked={selected.has(pl)}
                  onClick={() => togglePl(pl)}
                  style={{
                    width:20, height:20, borderRadius:3, flexShrink:0,
                    border:`1px solid ${color}88`,
                    background: selected.has(pl) ? color : "rgba(0,0,0,.4)",
                    boxShadow: selected.has(pl) ? `0 0 6px ${color}66` : "none",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"background .1s, box-shadow .1s",
                    cursor:"pointer",
                  }}
                >
                  {selected.has(pl) && <span style={{ fontSize:13, color:"#fff", lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:11, color, letterSpacing:".04em" }}>
                  ⚡ {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Search button */}
        <div style={{ padding:"8px 10px" }}>
          <button
            onClick={doSearch}
            disabled={!selected.size}
            style={{
              width:"100%", padding:"12px 0",
              background: selected.size
                ? "linear-gradient(160deg,#3a2808,#1e1404)"
                : "rgba(20,15,8,.6)",
              border:`1px solid ${selected.size ? "#8a6020" : "#2a2010"}`,
              borderRadius:4, color: selected.size ? "#f0c060" : "#4a3820",
              fontFamily:"'Cinzel',serif", fontSize:12, letterSpacing:".06em",
              cursor: selected.size ? "pointer" : "default",
              boxShadow: selected.size ? "inset 0 1px 0 rgba(255,255,255,.08)" : "none",
            }}
          >
            🔍 Search Nearest 20
          </button>
        </div>

        {/* Results */}
        {searched && results !== null && (
          <div style={{ borderTop:"1px solid #1e1810", maxHeight:240, overflowY:"auto" }}>
            {results.length === 0 ? (
              <div style={{ padding:"12px 10px", fontSize:8, color:"#5a4a30", fontFamily:"'Cinzel',serif", textAlign:"center" }}>
                No matching tiles found
              </div>
            ) : (
              <div style={{ padding:"4px 6px 6px" }}>
                <div style={{ fontSize:7, color:"#4a3820", fontFamily:"'Cinzel',serif", padding:"4px 4px 2px", letterSpacing:".05em" }}>
                  {results.length} NEAREST RESULTS
                </div>
                {results.map(({ key, c, r, pl, dist }) => {
                  const def = POWER_DEFS[pl];
                  return (
                    <button
                      key={key}
                      onClick={() => jumpTo(c, r)}
                      style={{
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        width:"100%", padding:"10px 8px", marginBottom:3,
                        background:"rgba(255,255,255,.03)", border:"1px solid #1e1810",
                        borderRadius:4, cursor:"pointer",
                        textAlign:"left",
                      }}
                    >
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <span style={{
                          fontSize:7, fontFamily:"'Cinzel',serif", fontWeight:700,
                          color: def?.color, background:`${def?.color}18`,
                          padding:"1px 4px", borderRadius:3, border:`1px solid ${def?.color}40`,
                        }}>⚡ {def?.label}</span>
                        <span style={{ fontSize:7, color:"#6a6a5a", fontFamily:"'Cinzel',serif" }}>{c},{r}</span>
                      </div>
                      <span style={{ fontSize:7, color:"#4a4a3a", fontFamily:"'Cinzel',serif" }}>
                        {Math.round(dist)} tiles ›
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
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

  const [searchOpen, setSearchOpen] = useState(false);

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
          gap: 10,
          pointerEvents: "auto",
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
          <ActionButton
            icon="🔍"
            label="Search"
            color="#80aacc"
            accent="#1a3a5c"
            onClick={() => setSearchOpen(v => !v)}
          />
          <ActionButton
            icon="⏱"
            label="Perf"
            color={showPerf ? "#66dd66" : "#4a4a4a"}
            accent={showPerf ? "#1a4a1a" : "#2a2a2a"}
            onClick={() => setShowPerf?.(v => !v)}
          />
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
