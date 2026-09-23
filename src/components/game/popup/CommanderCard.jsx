import { memo, useState, useEffect } from "react";
import { useGameContext } from "../../../GameContext.js";
import { FACTION_TROOPS } from "../../../../shared/constants/troops.js";
import { TROOP_FACTIONS } from "../../../../shared/constants/allTroops.js";
import { woundedMsLeft, guardCooldownLeft, fmtMsShort, GUARD_STAMINA_COST } from "../../../../shared/utils/commanderStatus.js";

// Re-render every second while a countdown (Wounded / Guard cooldown) is showing.
function useNowWhile(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return active ? now : Date.now();
}

function tbInfo(tb) {
  if (!tb) return null;
  const f = TROOP_FACTIONS[tb.faction];
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
  playerHqKey, startGuard, cancelGuard,
}) {
  const [guardPrompt, setGuardPrompt] = useState(null); // "activate" | "cancel"
  const { staminaMax = 150 } = useGameContext();
  const stam = cmd.stamina ?? staminaMax;
  const stamPct = Math.max(0, Math.min(100, (stam / staminaMax) * 100));
  const stamColor = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";
  const slots = cmd.troopSlots && cmd.troopSlots.length > 0
    ? cmd.troopSlots
    : cmd.troopBranch ? [{ branch: cmd.troopBranch }] : [];
  const troopLabel = slots.map(sl => tbInfo(sl.branch)?.label).filter(Boolean).join(" + ");
  const isMarching = !!cmd.march;
  const isAtHQ = cmd.tk === playerHqKey;
  const hasTimer = (cmd.woundedUntil || cmd.guardCooldownUntil) > Date.now();
  const now = useNowWhile(isPlayer && hasTimer);
  const woundLeft = woundedMsLeft(cmd, now);
  const guardCd = guardCooldownLeft(cmd, now);

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
          {woundLeft > 0 && (
            <div style={{ marginTop: 4, fontSize: 7.5, color: "#e07070", fontFamily: "'Cinzel',serif", letterSpacing: ".04em" }}>
              🩸 WOUNDED · {fmtMsShort(woundLeft)} — can't march, gather, train or guard
            </div>
          )}
          {woundLeft <= 0 && guardCd > 0 && !cmd.isGuarding && (
            <div style={{ marginTop: 4, fontSize: 7, color: "#8090c0", fontFamily: "'Cinzel',serif" }}>
              🛡 Guard ready in {fmtMsShort(guardCd)}
            </div>
          )}
        </div>

        {/* Side action buttons — vertical stack */}
        {isPlayer && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
            {woundLeft > 0 ? (
              <div title="Wounded" style={{ width: 36, height: 36, borderRadius: 7, background: "rgba(160,40,40,.2)", border: "1px solid #803030", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🩸</div>
            ) : isMarching ? (
              <button onClick={() => recallMarch?.(cmd.uid)}
                title="Cancel March"
                style={{ width: 36, height: 36, borderRadius: 7, background: "rgba(180,60,60,.25)", border: "1px solid #cc4444", color: "#ff9090", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↩</button>
            ) : cmd.isGuarding ? (
              // Guarding — only show the guard button to cancel
              <button
                onClick={() => setGuardPrompt("cancel")}
                title="Cancel Guard"
                style={{ width: 36, height: 36, borderRadius: 7, background: "rgba(240,200,40,.25)", border: "1px solid #c8a020", color: "#f0c040", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🛡</button>
            ) : (
              <>
                {!isAtHQ && (
                  <button onClick={() => recallStationary?.(cmd.uid)}
                    title="Recall"
                    style={{ width: 36, height: 36, borderRadius: 7, background: "rgba(180,120,20,.2)", border: "1px solid #c89030", color: "#f0c060", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↩</button>
                )}
                {barracksPool > 0 && (cmd.troopSlots?.length > 0 || cmd.troopBranch) && (
                  <button onClick={() => { setReinCmd?.(cmd); setMode?.("reinforce"); }}
                    title="Reinforce"
                    style={{ width: 36, height: 36, borderRadius: 7, background: "rgba(20,60,160,.25)", border: "1px solid #2060cc", color: "#80a0ff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                )}
                {/* Guard — activate */}
                <button
                  onClick={() => guardCd <= 0 && setGuardPrompt("activate")}
                  disabled={guardCd > 0}
                  title={guardCd > 0 ? `Guard ready in ${fmtMsShort(guardCd)}` : `Guard (${GUARD_STAMINA_COST}⚡)`}
                  style={{ width: 36, height: 36, borderRadius: 7, background: "rgba(40,80,160,.25)", border: "1px solid #4060cc", color: "#8090e0", fontSize: 13, cursor: guardCd > 0 ? "not-allowed" : "pointer", opacity: guardCd > 0 ? 0.45 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>🛡</button>
              </>
            )}
          </div>
        )}
      </div>
      {/* Guard confirm modal */}
      {guardPrompt && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.7)" }}
          onClick={() => setGuardPrompt(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(8,12,20,.98)", border: "1px solid #3a4a6a", borderRadius: 10, padding: "18px 20px", width: 240, boxShadow: "0 8px 32px rgba(0,0,0,.9)" }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: "#c8d8f0", fontWeight: 700, marginBottom: 8 }}>
              {guardPrompt === "activate" ? "🛡 Activate Guard?" : "🛡 Cancel Guard?"}
            </div>
            <div style={{ fontSize: 8, color: "#7a9a8a", marginBottom: 14, lineHeight: 1.5 }}>
              {guardPrompt === "activate"
                ? `This commander will defend its tile and the 8 around it (your tiles, crew tiles and your crew's Fortress/Well/Outpost — not HQs or keeps). Attacks there fight the newest guard first. Costs ${GUARD_STAMINA_COST}⚡. Moving ends the guard.`
                : "Your commander will stop guarding. No stamina cost, but it can't guard again for 3 minutes."}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setGuardPrompt(null)}
                style={{ flex: 1, padding: "7px 0", background: "rgba(40,40,40,.6)", border: "1px solid #444", borderRadius: 5, color: "#aaa", fontFamily: "'Cinzel',serif", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                NO
              </button>
              <button onClick={() => { guardPrompt === "activate" ? startGuard?.(cmd.uid) : cancelGuard?.(cmd.uid); setGuardPrompt(null); }}
                style={{ flex: 1, padding: "7px 0", background: guardPrompt === "activate" ? "rgba(40,80,180,.4)" : "rgba(180,60,40,.4)", border: `1px solid ${guardPrompt === "activate" ? "#4060cc" : "#cc4030"}`, borderRadius: 5, color: guardPrompt === "activate" ? "#90b0ff" : "#ff8070", fontFamily: "'Cinzel',serif", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                YES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default memo(function CommanderCard({
  cmd, ownership, isGarrison, totalWaves, defeatedWaves,
  onCmdScreenOpen, recallMarch, recallStationary,
  setReinCmd, setMode, barracksPool, playerHqKey,
  startGuard, cancelGuard,
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
      startGuard={startGuard}
      cancelGuard={cancelGuard}
    />
  );
});
