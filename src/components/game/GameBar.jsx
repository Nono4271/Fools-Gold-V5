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

const SPAWN_LEVELS = [6, 10, 12, 15, 20, 25, 30, 35, 40];
const SEARCH_RADIUS = 100;

function TileSearch({ tiles, panRef, zoomRef, mapRendererRef, playerHqKey, onClose, spawns, spawnWorkerRef, eligibleSpawnKeysRef }) {
  const [tab, setTab] = useState("tiles"); // "tiles" | "mobs"
  const [selected, setSelected] = useState(new Set());
  const [selectedLevels, setSelectedLevels] = useState(new Set());
  const [results, setResults] = useState(null);
  const [mobResults, setMobResults] = useState(null);
  const [searched, setSearched] = useState(false);

  // Centre of current view — correct isoXY inverse
  const getViewCentre = useCallback(() => {
    const pan  = panRef.current  ?? { x: 0, y: 0 };
    const zoom = zoomRef.current ?? 1;
    // Screen centre → world coords
    const wx = (window.innerWidth  / 2 - pan.x) / zoom;
    const wy = (window.innerHeight / 2 - pan.y) / zoom;
    // Exact inverse of isoXY:
    //   cx = (c - r) * TW/2 + ROWS * TW/2
    //   cy = (c + r) * TH/2 + TOP_PAD
    const _TW = 80, _TH = 53, _TOP_PAD = 60;
    const cmr = (wx - ROWS * _TW / 2) / (_TW / 2); // c - r
    const cpr = (wy - _TOP_PAD)       / (_TH / 2); // c + r
    const cc = Math.round((cmr + cpr) / 2);
    const cr = Math.round((cpr - cmr) / 2);
    return { cc: Math.max(0, Math.min(COLS - 1, cc)), cr: Math.max(0, Math.min(ROWS - 1, cr)) };
  }, [panRef]);

  const togglePl = (pl) => setSelected(prev => {
    const next = new Set(prev);
    next.has(pl) ? next.delete(pl) : next.add(pl);
    return next;
  });

  const toggleLevel = (lvl) => setSelectedLevels(prev => {
    const next = new Set(prev);
    next.has(lvl) ? next.delete(lvl) : next.add(lvl);
    return next;
  });

  const doSearch = useCallback(() => {
    if (!selected.size || !tiles) return;
    const { cc, cr } = getViewCentre();
    const matches = [];
    for (let dr = -SEARCH_RADIUS; dr <= SEARCH_RADIUS; dr++) {
      for (let dc = -SEARCH_RADIUS; dc <= SEARCH_RADIUS; dc++) {
        const dist = Math.sqrt(dc*dc + dr*dr);
        if (dist > SEARCH_RADIUS) continue;
        const c = cc + dc, r = cr + dr;
        const key = `${c},${r}`;
        const tile = tiles[key];
        if (!tile) continue;
        if (!selected.has(tile.powerLevel)) continue;
        if (tile.isHQ || tile.isGate || tile.isBorder || tile.isKeepPart) continue;
        if (tile.isKeep && tile.powerLevel < 10) continue;
        matches.push({ key, c, r, pl: tile.powerLevel, dist });
      }
    }
    matches.sort((a, b) => a.dist - b.dist);
    setResults(matches.slice(0, 20));
    setSearched(true);
  }, [selected, tiles, getViewCentre]);

  const doMobSearch = useCallback(() => {
    if (!selectedLevels.size || !spawns) return;
    const { cc, cr } = getViewCentre();
    const worker = spawnWorkerRef?.current;

    // Check auto-reset first
    if (worker) worker.postMessage({ type: "checkRadius", cc, cr });

    const results = [];
    for (const [key, sp] of Object.entries(spawns)) {
      if (!selectedLevels.has(sp.level)) continue;
      const comma = key.indexOf(",");
      const c = +key.slice(0, comma), r = +key.slice(comma + 1);
      const dist = Math.sqrt((c - cc) ** 2 + (r - cr) ** 2);
      if (dist > SEARCH_RADIUS) continue;
      results.push({ key, c, r, level: sp.level, defeated: sp.defeated, dist, respawnAt: sp.respawnAt });
    }
    results.sort((a, b) => (a.defeated ? 1 : 0) - (b.defeated ? 1 : 0) || a.dist - b.dist);

    // Guarantee: for each selected level with no active result, force-spawn one
    if (worker) {
      for (const lvl of selectedLevels) {
        const hasActive = results.some(r2 => r2.level === lvl && !r2.defeated);
        if (!hasActive) {
          worker.postMessage({ type: "forceSpawn", level: lvl, eligibleKeys: eligibleSpawnKeysRef?.current ?? [], cc, cr });
        }
      }
    }

    setMobResults(results.slice(0, 20));
    setSearched(true);
  }, [selectedLevels, spawns, spawnWorkerRef, eligibleSpawnKeysRef, getViewCentre]);

  const jumpTo = useCallback((c, r) => {
    const { cx, cy } = isoXY(c, r);
    const z = zoomRef.current;
    const px = -cx * z + window.innerWidth / 2;
    const py = -cy * z + window.innerHeight / 2;
    panRef.current = { x: px, y: py };
    mapRendererRef.current?.teleport(px, py);
    onClose();
  }, [panRef, zoomRef, mapRendererRef, onClose]);

  const mobLevelColor = (lvl) => lvl <= 12 ? "#70aa60" : lvl <= 25 ? "#d07030" : "#cc4040";

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
        <div style={{ fontFamily:"'Cinzel',serif", fontWeight:700, fontSize:12, color:"#c8a060" }}>🔍 SEARCH</div>
        <button onClick={onClose} style={{ background:"none", border:"1px solid #2a2a2a", color:"#777", fontSize:16, minWidth:36, minHeight:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", touchAction:"manipulation", borderRadius:4, flexShrink:0 }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", flexShrink:0, borderBottom:"1px solid #1a1e28" }}>
        {[["tiles","⚡ TILES"],["mobs","💀 MOBS"]].map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setSearched(false); }}
            style={{ flex:1, padding:"8px 0", background:tab===t?"rgba(255,255,255,.04)":"none",
              border:"none", borderBottom:tab===t?"2px solid #c8a060":"2px solid transparent",
              color:tab===t?"#c8a060":"#4a5a6a", fontFamily:"'Cinzel',serif", fontSize:9,
              letterSpacing:".05em", cursor:"pointer", touchAction:"manipulation" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tile search picker */}
      {tab === "tiles" && <>
        <div style={{ padding:"8px 12px 6px", flexShrink:0, borderBottom:"1px solid #1a1e28" }}>
          <div style={{ fontSize:7, color:"#4a5a6a", fontFamily:"'Cinzel',serif", marginBottom:6, letterSpacing:".05em" }}>POWER LEVELS — 100 TILE RADIUS</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:3 }}>
            {PL_LIST.map(({ pl, label, color }) => {
              const on = selected.has(pl);
              return (
                <button key={pl} onClick={() => togglePl(pl)} style={{
                  display:"flex", alignItems:"center", gap:6, padding:"6px 8px",
                  borderRadius:5, cursor:"pointer", touchAction:"manipulation",
                  WebkitTapHighlightColor:"transparent",
                  background: on ? `${color}18` : "rgba(255,255,255,.02)",
                  border:`1px solid ${on ? color+"60" : "#1e2028"}`,
                  userSelect:"none", textAlign:"left",
                }}>
                  <div style={{ width:14, height:14, borderRadius:3, flexShrink:0, border:`1px solid ${color}88`,
                    background: on ? color : "rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {on && <span style={{ fontSize:10, color:"#fff", lineHeight:1 }}>✓</span>}
                  </div>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color: on ? color : "#5a6a6a", letterSpacing:".02em" }}>⚡ {label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ padding:"8px 12px", flexShrink:0, borderBottom:"1px solid #1a1e28" }}>
          <button onClick={doSearch} disabled={!selected.size} style={{
            width:"100%", padding:"10px 0",
            background: selected.size ? "linear-gradient(160deg,#1a2a3a,#0e1820)" : "rgba(10,14,20,.6)",
            border:`1px solid ${selected.size ? "#3a6080" : "#1a2028"}`,
            borderRadius:5, color: selected.size ? "#80c0e0" : "#2a3a48",
            fontFamily:"'Cinzel',serif", fontSize:11, letterSpacing:".06em",
            cursor: selected.size ? "pointer" : "default", touchAction:"manipulation",
          }}>🔍 Search Tiles</button>
        </div>
        {searched && results !== null && (
          <div className="scr" style={{ flex:1, overflowY:"auto", padding:"8px 12px" }}>
            <div style={{ fontSize:7, color:"#4a5a6a", fontFamily:"'Cinzel',serif", marginBottom:6, letterSpacing:".05em" }}>
              {results.length > 0 ? `${results.length} RESULTS` : "NO RESULTS IN RANGE"}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {results.map(({ key, c, r, pl, dist }) => {
                const def = POWER_DEFS[pl];
                return (
                  <button key={key} onClick={() => jumpTo(c, r)} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    width:"100%", padding:"10px 10px",
                    background:"rgba(255,255,255,.03)", border:"1px solid #1e2028",
                    borderRadius:5, cursor:"pointer", touchAction:"manipulation", textAlign:"left",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:7, fontFamily:"'Cinzel',serif", fontWeight:700,
                        color:def?.color, background:`${def?.color}18`, padding:"1px 5px",
                        borderRadius:3, border:`1px solid ${def?.color}40` }}>⚡ {def?.label}</span>
                      <span style={{ fontSize:7, color:"#4a5a6a", fontFamily:"'Crimson Pro',serif" }}>{c},{r}</span>
                    </div>
                    <span style={{ fontSize:7, color:"#3a4a5a", fontFamily:"'Cinzel',serif" }}>{Math.round(dist)} ›</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </>}

      {/* Mob search picker */}
      {tab === "mobs" && <>
        <div style={{ padding:"8px 12px 6px", flexShrink:0, borderBottom:"1px solid #1a1e28" }}>
          <div style={{ fontSize:7, color:"#4a5a6a", fontFamily:"'Cinzel',serif", marginBottom:6, letterSpacing:".05em" }}>SPAWN LEVELS — 100 TILE RADIUS</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:3 }}>
            {SPAWN_LEVELS.map(lvl => {
              const on = selectedLevels.has(lvl);
              const col = mobLevelColor(lvl);
              return (
                <button key={lvl} onClick={() => toggleLevel(lvl)} style={{
                  padding:"7px 4px", borderRadius:5, cursor:"pointer", touchAction:"manipulation",
                  background: on ? `${col}18` : "rgba(255,255,255,.02)",
                  border:`1px solid ${on ? col+"60" : "#1e2028"}`,
                  display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                }}>
                  <span style={{ fontSize:10 }}>💀</span>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:8, color: on ? col : "#4a5a6a" }}>Lv{lvl}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ padding:"8px 12px", flexShrink:0, borderBottom:"1px solid #1a1e28" }}>
          <button onClick={doMobSearch} disabled={!selectedLevels.size} style={{
            width:"100%", padding:"10px 0",
            background: selectedLevels.size ? "linear-gradient(160deg,#2a1a0a,#1a0e04)" : "rgba(10,14,20,.6)",
            border:`1px solid ${selectedLevels.size ? "#804020" : "#1a2028"}`,
            borderRadius:5, color: selectedLevels.size ? "#e08040" : "#2a3a48",
            fontFamily:"'Cinzel',serif", fontSize:11, letterSpacing:".06em",
            cursor: selectedLevels.size ? "pointer" : "default", touchAction:"manipulation",
          }}>💀 Find Spawns</button>
        </div>
        {searched && mobResults !== null && (
          <div className="scr" style={{ flex:1, overflowY:"auto", padding:"8px 12px" }}>
            <div style={{ fontSize:7, color:"#4a5a6a", fontFamily:"'Cinzel',serif", marginBottom:6, letterSpacing:".05em" }}>
              {mobResults.length > 0 ? `${mobResults.length} SPAWNS FOUND` : "NONE IN RANGE — SPAWNING..."}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {mobResults.map(({ key, c, r, level, defeated, dist, respawnAt }) => {
                const col = mobLevelColor(level);
                const secsLeft = defeated && respawnAt ? Math.max(0, Math.ceil((respawnAt - Date.now()) / 60000)) : 0;
                return (
                  <button key={key} onClick={() => jumpTo(c, r)} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    width:"100%", padding:"10px 10px", textAlign:"left",
                    background: defeated ? "rgba(255,255,255,.015)" : "rgba(255,255,255,.04)",
                    border:`1px solid ${defeated ? "#1e2028" : col+"40"}`,
                    borderRadius:5, cursor:"pointer", touchAction:"manipulation", opacity: defeated ? 0.6 : 1,
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:7, fontFamily:"'Cinzel',serif", fontWeight:700,
                        color: col, background:`${col}18`, padding:"1px 5px",
                        borderRadius:3, border:`1px solid ${col}40` }}>💀 Lv{level}</span>
                      {defeated && <span style={{ fontSize:7, color:"#4a3a2a" }}>⏳ {secsLeft}m</span>}
                    </div>
                    <span style={{ fontSize:7, color:"#3a4a5a", fontFamily:"'Cinzel',serif" }}>{Math.round(dist)} ›</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </>}
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
  setLeaderboardOpen,
  hidden,
  showPerf, setShowPerf,
  spawns, spawnWorkerRef, eligibleSpawnKeysRef,
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
        position: "fixed", left: "var(--left-inset, 8px)", bottom: "calc(var(--sab, 0px) + 89px)",
        zIndex: 300,
        display: "flex", flexDirection: "column-reverse", gap: 5, alignItems: "center",
        maxHeight: `${3 * 42 + 2 * 5}px`, overflowY: "auto", scrollbarWidth: "none",
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
          <div style={{ width: 42, height: 42, borderRadius: "50%",
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
          <ActionButton icon="🏆" label="Ranks" color="#c8a060" accent="#4a3010" onClick={() => setLeaderboardOpen(true)} />
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
          spawns={spawns}
          spawnWorkerRef={spawnWorkerRef}
          eligibleSpawnKeysRef={eligibleSpawnKeysRef}
        />
      )}
    </>
  );
});
