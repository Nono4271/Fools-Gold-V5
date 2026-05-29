import { memo } from "react";
import { FACTION_TROOPS } from "../../../../shared/constants/troops.js";

function tbInfo(tb) {
  if (!tb) return null;
  const f = FACTION_TROOPS[tb.faction];
  const b = f?.branches.find(b => b.key === tb.branch);
  const t = b?.tiers[tb.tier ?? 0];
  if (!b || !t) return null;
  return { label: `${b.label} · ${t.label}`, color: "#c8a060" };
}

// ── Enemy fog of war card ──────────────────────────────────────────────────────
function EnemyCommanderCard({ cmd, isGarrison, totalWaves, defeatedWaves }) {
  if (isGarrison) {
    const wavesLeft = Math.max(0, (totalWaves ?? 1) - (defeatedWaves ?? 0));
    return (
      <div style={{
        background: "rgba(120,10,10,.55)", border: "1px solid rgba(220,40,40,.6)",
        borderRadius: 6, padding: "8px 10px",
        boxShadow: "0 2px 12px rgba(0,0,0,.7)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(200,30,30,.4)", border: "2px solid rgba(220,60,60,.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>⚔</div>
          <div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 10, color: "#ff7070", fontWeight: 700, letterSpacing: ".05em" }}>
              GARRISON
            </div>
            <div style={{ fontSize: 8, color: "#ffaaaa", marginTop: 2 }}>
              Lv{cmd?.lvl ?? "?"} · {wavesLeft}/{totalWaves ?? 1} waves remaining
            </div>
          </div>
        </div>
      </div>
    );
  }

  // True enemy — fog of war
  return (
    <div style={{
      background: "rgba(180,20,20,.08)", border: "1px solid rgba(180,20,20,.3)",
      borderRadius: 6, padding: "8px 10px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Silhouette */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(40,20,20,.6)", border: "1px solid rgba(180,20,20,.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, filter: "grayscale(1) brightness(.3)",
        }}>👤</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#cc4040", fontWeight: 700 }}>
            ????
          </div>
          <div style={{ fontSize: 7, color: "#6a4a4a", marginTop: 1 }}>
            Lv ???? · ??? troops
          </div>
        </div>
        <div style={{
          fontSize: 7, color: "#8a4a4a", fontFamily: "'Cinzel',serif",
          background: "rgba(180,20,20,.15)", padding: "2px 5px", borderRadius: 3,
          border: "1px solid rgba(180,20,20,.3)",
        }}>🌫 FOG</div>
      </div>
    </div>
  );
}

// ── Friendly/own commander card ────────────────────────────────────────────────
function FriendlyCommanderCard({
  cmd, isPlayer, onCmdScreenOpen,
  recallMarch, recallStationary, setReinCmd, setMode, barracksPool,
  playerHqKey,
}) {
  const stam = cmd.stamina ?? 200;
  const stamPct = Math.max(0, Math.min(100, (stam / 200) * 100));
  const stamColor = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";
  const slots = cmd.troopSlots && cmd.troopSlots.length > 0
    ? cmd.troopSlots
    : cmd.troopBranch ? [{ branch: cmd.troopBranch }] : [];
  const troopLabel = slots.map(sl => tbInfo(sl.branch)?.label).filter(Boolean).join(" + ");
  const isMarching = !!cmd.march;
  const isAtHQ = cmd.tk === playerHqKey;

  const borderColor = isPlayer ? "#3a6a3a" : "#204080";
  const nameColor   = isPlayer ? "#90c870" : "#60a0ff";

  return (
    <div style={{
      background: isPlayer ? "rgba(60,170,80,.07)" : "rgba(20,80,200,.07)",
      border: `1px solid ${borderColor}40`,
      borderRadius: 6, padding: "8px 10px",
    }}>
      {/* Top row: bust + info + side action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {/* Bust image */}
        <button
          onClick={() => onCmdScreenOpen?.(cmd.uid)}
          style={{
            width: 52, height: 52, borderRadius: 6, border: `2px solid ${borderColor}`,
            background: "rgba(10,15,20,.8)", cursor: "pointer",
            flexShrink: 0, padding: 0, overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {cmd.bust
            ? <img src={cmd.bust} alt={cmd.n} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 26 }}>{cmd.icon}</span>
          }
        </button>

        {/* Name + troops */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{
              fontFamily: "'Cinzel',serif", fontSize: 9, color: nameColor, fontWeight: 700,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{cmd.n}</span>
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: 7, color: "#f0c040", flexShrink: 0 }}>
              Lv{cmd.lvl || 5}
            </span>
          </div>
          {troopLabel && (
            <div style={{ fontSize: 7, color: "#a08060", marginTop: 1 }}>
              {troopLabel} · {(cmd.troops || 0).toLocaleString()}
            </div>
          )}
          {/* Stamina bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
            <span style={{ fontSize: 8, color: "#7a9a7a" }}>⚡</span>
            <div style={{ flex: 1, height: 4, background: "rgba(0,0,0,.4)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${stamPct}%`, background: stamColor, borderRadius: 2, transition: "width .3s" }}/>
            </div>
            <span style={{ fontSize: 7, color: stamColor, fontFamily: "'Cinzel',serif", flexShrink: 0, minWidth: 20 }}>
              {Math.floor(stam)}
            </span>
          </div>
        </div>

        {/* Side action buttons — vertical stack */}
        {isPlayer && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
            {isMarching ? (
              <button onClick={() => recallMarch?.(cmd.uid)}
                title="Cancel March"
                style={{ width: 30, height: 30, borderRadius: 6, background: "rgba(180,60,60,.25)", border: "1px solid #cc4444", color: "#ff9090", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↩</button>
            ) : (
              <>
                {!isAtHQ && (
                  <button onClick={() => recallStationary?.(cmd.uid)}
                    title="Recall"
                    style={{ width: 30, height: 30, borderRadius: 6, background: "rgba(180,120,20,.2)", border: "1px solid #c89030", color: "#f0c060", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↩</button>
                )}
                {barracksPool > 0 && (cmd.troopSlots?.length > 0 || cmd.troopBranch) && (
                  <button onClick={() => { setReinCmd?.(cmd); setMode?.("reinforce"); }}
                    title="Reinforce"
                    style={{ width: 30, height: 30, borderRadius: 6, background: "rgba(20,60,160,.25)", border: "1px solid #2060cc", color: "#80a0ff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                )}
                {/* Guard — future feature */}
                <button
                  title="Guard (coming soon)"
                  style={{ width: 30, height: 30, borderRadius: 6, background: "rgba(60,60,60,.2)", border: "1px solid #555", color: "#888", fontSize: 13, cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>🛡</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default memo(function CommanderCard({
  cmd, ownership, isGarrison, totalWaves, defeatedWaves,
  onCmdScreenOpen, recallMarch, recallStationary,
  setReinCmd, setMode, barracksPool, playerHqKey,
}) {
  if (!cmd) return null;

  if (ownership === "enemy") {
    return (
      <EnemyCommanderCard
        cmd={cmd}
        isGarrison={isGarrison}
        totalWaves={totalWaves}
        defeatedWaves={defeatedWaves}
      />
    );
  }

  return (
    <FriendlyCommanderCard
      cmd={cmd}
      isPlayer={ownership === "player"}
      onCmdScreenOpen={onCmdScreenOpen}
      recallMarch={recallMarch}
      recallStationary={recallStationary}
      setReinCmd={setReinCmd}
      setMode={setMode}
      barracksPool={barracksPool}
      playerHqKey={playerHqKey}
    />
  );
});
