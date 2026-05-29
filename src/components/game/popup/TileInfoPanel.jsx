import { memo } from "react";
import { RSS, POWER_DEFS, SIEGE_BASE, FORT_LEVELS } from "../../../../shared/constants/map.js";
import { TERR } from "../../../../shared/constants/terrain.js";

// Ownership badge config
const BADGES = {
  player: null, // no badge for own tiles
  crew:   { label: "CREW",  bg: "rgba(20,80,200,.25)",  border: "#2060cc", color: "#60a0ff" },
  ally:   { label: "ALLY",  bg: "rgba(120,20,200,.25)", border: "#8020cc", color: "#c060ff" },
  enemy:  { label: "ENEMY", bg: "rgba(200,20,20,.25)",  border: "#cc2020", color: "#ff6060" },
};

export function getTileOwnership(selTile, facKey, crewmatePlayerIds) {
  if (!selTile) return "neutral";
  if (selTile.owner === "player") return "player";
  if (!selTile.owner && !selTile.ownerPlayerId) return "neutral";
  const pid = selTile.ownerPlayerId;
  if (pid && crewmatePlayerIds?.has(pid)) return "crew";
  if (selTile.faction === facKey) return "ally";
  return "enemy";
}

export default memo(function TileInfoPanel({
  selKey, selTile, facKey, crewmatePlayerIds, nowTick,
}) {
  if (!selTile) return null;

  const ownership = getTileOwnership(selTile, facKey, crewmatePlayerIds);
  const badge = BADGES[ownership];

  const titleLabel = selTile.isWin   ? "⚜ The Holy Grail"
    : selTile.isGate && selTile.crossingType === "crossing" ? `🌊 ${selTile.keepName || "River Crossing"}`
    : selTile.isGate && selTile.crossingType === "tunnel"   ? `⛰ ${selTile.keepName || "Tunnel Gate"}`
    : selTile.isKeep  ? `🏰 ${selTile.keepName || selTile.regionName + " Keep"}`
    : selTile.isRuin  ? "🏚 Ruin"
    : selTile.isHQ    ? "🏰 Headquarters"
    : selTile.regionName
      ? `${TERR[selTile.terrain]?.lbl || "Tile"} · ${selTile.regionName}`
      : TERR[selTile.terrain]?.lbl || "Tile";

  const borderColor = ownership === "player" ? "#3a6a3a"
    : ownership === "crew" ? "#204080"
    : ownership === "ally" ? "#602080"
    : ownership === "enemy" ? "#802020"
    : "#2a2418";

  return (
    <div style={{
      background: "rgba(5,7,11,.97)",
      border: `1px solid ${borderColor}`,
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.04)",
    }}>
      {/* Header */}
      <div style={{
        padding: "8px 10px 6px",
        borderBottom: `1px solid ${borderColor}40`,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Cinzel',serif", fontSize: 11, fontWeight: 700,
            color: ownership === "player" ? "#c8f0c8"
              : ownership === "crew" ? "#80c0ff"
              : ownership === "ally" ? "#c080ff"
              : ownership === "enemy" ? "#ff8080"
              : "#c8a060",
            letterSpacing: ".04em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{titleLabel}</div>
          <div style={{ fontSize: 8, color: "#5a5a6a", fontFamily: "'Cinzel',serif", marginTop: 1 }}>
            {selTile.c},{selTile.r}
            {selTile.powerLevel && !selTile.isHQ && (
              <span style={{
                marginLeft: 6, color: POWER_DEFS[selTile.powerLevel]?.color,
                background: `${POWER_DEFS[selTile.powerLevel]?.color}18`,
                padding: "0 4px", borderRadius: 3,
                border: `1px solid ${POWER_DEFS[selTile.powerLevel]?.color}40`,
              }}>⚡ {POWER_DEFS[selTile.powerLevel]?.label}</span>
            )}
          </div>
        </div>
        {badge && (
          <div style={{
            fontSize: 7, fontFamily: "'Cinzel',serif", fontWeight: 700,
            background: badge.bg, border: `1px solid ${badge.border}`,
            color: badge.color, padding: "2px 6px", borderRadius: 4,
            letterSpacing: ".06em", flexShrink: 0, marginLeft: 8,
          }}>{badge.label}</div>
        )}
      </div>

      {/* Resource row — P1 shows all 4, others show single */}
      {selTile.rss && (
        <div style={{ padding: "5px 10px", borderBottom: "1px solid #1a1814" }}>
          {selTile.powerLevel === 1 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
              {Object.entries(RSS).map(([key, r]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 13 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 7, color: r.col, fontWeight: 700 }}>{r.lbl}</div>
                    <div style={{ fontSize: 7, color: "#7a8a6a", fontFamily: "'Cinzel',serif" }}>+50/hr</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 14 }}>{RSS[selTile.rss].icon}</span>
                <span style={{ fontFamily: "'Cinzel',serif", fontSize: 8, color: RSS[selTile.rss].col, fontWeight: 700 }}>
                  {RSS[selTile.rss].lbl}
                </span>
              </div>
              <span style={{ fontSize: 8, color: "#7a8a6a", fontFamily: "'Cinzel',serif" }}>
                +{({ 2:240,3:280,4:360,5:420,6:560,7:640,8:720,9:800,10:1000,11:1200,12:1400,13:1600 }[selTile.powerLevel] ?? 240)}/hr
              </span>
            </div>
          )}
        </div>
      )}

      {/* Siege bar */}
      {!selTile.isHQ && (() => {
        const sv = selTile.siege ?? SIEGE_BASE;
        const sm = selTile.siegeMax ?? SIEGE_BASE;
        const pct = Math.round((sv / sm) * 100);
        const totalWaves = selTile.garrisonWaves ?? 1;
        const defeatedCount = selTile.defeatedWaves?.length ?? 0;
        const allDefeated = defeatedCount >= totalWaves && totalWaves > 0;
        const hasProgress = defeatedCount > 0;
        const resetSecs = selTile.resetAt ? Math.max(0, Math.ceil((selTile.resetAt - Date.now()) / 1000)) : null;
        const barColor = pct > 66 ? "#3daa60" : pct > 33 ? "#d0a030" : "#cc3030";

        return (
          <div style={{ padding: "6px 10px", borderBottom: "1px solid #1a1814" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{
                fontFamily: "'Cinzel',serif", fontSize: 7,
                color: allDefeated ? "#f0c040" : hasProgress ? "#d08030" : "#6a6a7a",
                letterSpacing: ".05em",
              }}>
                🛡 SIEGE{allDefeated ? " — CLEARED" : hasProgress ? ` — WAVE ${defeatedCount}/${totalWaves}` : ""}
              </span>
              <span style={{ fontSize: 8, color: barColor, fontWeight: 700, fontFamily: "'Cinzel',serif" }}>
                {sv}/{sm}
              </span>
            </div>
            <div style={{ height: 5, background: "#0e1018", borderRadius: 3, overflow: "hidden", position: "relative" }}>
              <div style={{
                height: "100%", width: `${pct}%`, background: barColor,
                borderRadius: 3, transition: "width .3s",
              }}/>
            </div>
            {totalWaves > 1 && (
              <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                {Array.from({ length: totalWaves }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 1,
                    background: i < defeatedCount ? "#f0c040" : "#2a2020",
                    border: i < defeatedCount ? "none" : "1px solid #3a2a20",
                  }}/>
                ))}
              </div>
            )}
            {resetSecs !== null && hasProgress && (
              <div style={{ fontSize: 6, color: "#8a7040", marginTop: 2 }}>Resets in {resetSecs}s</div>
            )}
          </div>
        );
      })()}
    </div>
  );
});
