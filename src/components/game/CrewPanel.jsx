import { useState, memo } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   CrewPanel — Guild ("Crew") system
   • Player can create a crew (4-20 char name, 4-char abbreviation)
   • Or request to join an existing crew
   • Starting cap: 40 members per crew
   • Creating a crew costs 500 gems — only the 3 AI players per faction seeded
     with 2000 gems can ever afford to found one, naturally capping AI crews at 3
   • AI players auto-create/join crews on a 30s ticker (managed in Game.jsx)
───────────────────────────────────────────────────────────────────────────── */

const BTN_RESET = {
  background: "none", border: "none", padding: 0, margin: 0,
  cursor: "pointer", WebkitAppearance: "none", appearance: "none",
  touchAction: "manipulation",
};

const PANEL_BG   = "rgba(5,7,11,.97)";
const BORDER_COL = "#1a2030";
const GOLD       = "#c8a060";
const TEXT_SM    = { fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: ".04em" };
const TEXT_XS    = { fontFamily: "'Cinzel',serif", fontSize: 7, letterSpacing: ".04em" };

function validate(name, abbr) {
  const errs = [];
  if (!name || name.trim().length < 4)  errs.push("Name must be 4–20 characters");
  if (name && name.trim().length > 20)  errs.push("Name must be 4–20 characters");
  if (!abbr || abbr.trim().length !== 4) errs.push("Abbreviation must be exactly 4 characters");
  return errs;
}

function CrewCard({ crew, onJoinRequest, playerCrewId, pendingCrewId, playerName }) {
  const isMine     = crew.id === playerCrewId;
  const isPending  = crew.id === pendingCrewId;
  const isFull     = crew.members.length >= crew.cap;
  const memberCount = crew.members.length;

  const memberColor = memberCount >= crew.cap ? "#cc4040" :
                      memberCount >= crew.cap * 0.8 ? "#e0a030" : "#40cc80";

  return (
    <div style={{
      background: isMine ? "rgba(40,80,40,.18)" : "rgba(255,255,255,.03)",
      border: `1px solid ${isMine ? "#40aa60" : BORDER_COL}`,
      borderRadius: 6, padding: "10px 12px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ ...TEXT_SM, color: isMine ? "#40cc80" : GOLD, fontWeight: 700 }}>
              [{crew.abbr}] {crew.name}
            </span>
            {isMine && (
              <span style={{ ...TEXT_XS, color: "#40aa60", background: "rgba(40,160,80,.15)",
                border: "1px solid #40aa6044", borderRadius: 3, padding: "1px 5px" }}>
                YOUR CREW
              </span>
            )}
          </div>
          <div style={{ ...TEXT_XS, color: "#4a5a6a", marginTop: 3 }}>
            Lv.{crew.level} Crew
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...TEXT_SM, color: memberColor, fontWeight: 700 }}>
            {memberCount}/{crew.cap}
          </div>
          <div style={{ ...TEXT_XS, color: "#3a4a5a" }}>members</div>
        </div>
      </div>

      {/* Member preview */}
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {crew.members.slice(0, 8).map((m, i) => (
          <div key={i} style={{
            ...TEXT_XS, color: m === playerName ? "#40cc80" : "#4a5a6a",
            background: "rgba(255,255,255,.04)", border: "1px solid #1e2028",
            borderRadius: 3, padding: "1px 5px",
            fontWeight: m === playerName ? 700 : 400,
          }}>{m}</div>
        ))}
        {crew.members.length > 8 && (
          <div style={{ ...TEXT_XS, color: "#3a4050", padding: "1px 5px" }}>
            +{crew.members.length - 8} more
          </div>
        )}
      </div>

      {/* Action */}
      {!isMine && !playerCrewId && (
        isPending ? (
          <div style={{ ...TEXT_XS, color: "#c8a060", textAlign: "center",
            padding: "6px 0", borderTop: "1px solid #1e2028" }}>
            ⏳ Request Pending…
          </div>
        ) : (
          <button
            onClick={() => !isFull && onJoinRequest(crew.id)}
            disabled={isFull}
            style={{
              ...BTN_RESET,
              width: "100%", padding: "7px 0", marginTop: 2,
              borderRadius: 4,
              background: isFull ? "rgba(10,14,20,.5)" : "linear-gradient(160deg,#1a3a2a,#0e2018)",
              border: `1px solid ${isFull ? "#1a2028" : "#306050"}`,
              color: isFull ? "#2a3a38" : "#50c090",
              ...TEXT_XS,
              cursor: isFull ? "not-allowed" : "pointer",
            }}
          >
            {isFull ? "🔒 Full" : "📨 Request to Join"}
          </button>
        )
      )}
    </div>
  );
}

export default memo(function CrewPanel({ onClose, crews, playerCrewId, pendingCrewId,
  playerName, facKey, playerGems, crewCreationCost, onCreateCrew, onJoinRequest, onLeaveCrew }) {

  const [tab, setTab]           = useState(playerCrewId ? "my" : "browse");
  const [crewName, setCrewName] = useState("");
  const [crewAbbr, setCrewAbbr] = useState("");
  const [createErr, setCreateErr] = useState([]);

  const factionCrews = crews.filter(c => c.faction === facKey);
  const myCrew       = crews.find(c => c.id === playerCrewId);
  // Player can create a crew as long as they're not already in one and can afford it
  const canAfford    = (playerGems ?? 0) >= (crewCreationCost ?? 500);
  const canCreate    = !playerCrewId && canAfford;

  function handleCreate() {
    const errs = validate(crewName, crewAbbr);
    if (errs.length) { setCreateErr(errs); return; }
    onCreateCrew(crewName.trim(), crewAbbr.trim().toUpperCase());
    setCrewName(""); setCrewAbbr(""); setCreateErr([]);
  }

  return (
    <div style={{
      position: "fixed", top: "var(--hud-offset)", left: "var(--sal, 0px)", bottom: 0, width: 300, zIndex: 9500,
      background: PANEL_BG, borderRight: `1px solid ${BORDER_COL}`,
      boxShadow: "4px 0 32px rgba(0,0,0,.9)",
      display: "flex", flexDirection: "column",
      animation: "slideInLeft .22s ease",
      pointerEvents: "auto",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 12px", borderBottom: `1px solid ${BORDER_COL}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0, background: "rgba(255,255,255,.025)",
      }}>
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13, color: GOLD }}>
            ⚓ CREW
          </div>
          <div style={{ fontSize: 8, color: "#5a6a7a", fontFamily: "'Crimson Pro',serif", marginTop: 2 }}>
            {factionCrews.length} crew{factionCrews.length !== 1 ? "s" : ""} in your faction
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "1px solid #2a2a2a", color: "#777",
          fontSize: 16, minWidth: 36, minHeight: 36, display: "flex",
          alignItems: "center", justifyContent: "center", cursor: "pointer",
          touchAction: "manipulation", borderRadius: 4,
        }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${BORDER_COL}`, flexShrink: 0 }}>
        {[
          { id: "browse", label: "Browse" },
          { id: "my",     label: myCrew ? `[${myCrew.abbr}]` : "My Crew" },
          ...(!playerCrewId ? [{ id: "create", label: canAfford ? "+ Create" : "🔒 Create" }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...BTN_RESET,
            flex: 1, padding: "9px 0",
            ...TEXT_XS,
            color: tab === t.id ? GOLD : "#4a5a6a",
            borderBottom: tab === t.id ? `2px solid ${GOLD}` : "2px solid transparent",
            background: tab === t.id ? "rgba(200,160,96,.06)" : "none",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div className="scr" style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>

        {/* ── BROWSE tab ── */}
        {tab === "browse" && (
          factionCrews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#3a4a5a" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚓</div>
              <div style={{ ...TEXT_SM, color: "#4a5a6a" }}>No crews yet</div>
              <div style={{ ...TEXT_XS, color: "#3a4050", marginTop: 4 }}>
                Be the first to found one!
              </div>
            </div>
          ) : (
            factionCrews.map(crew => (
              <CrewCard
                key={crew.id}
                crew={crew}
                playerCrewId={playerCrewId}
                pendingCrewId={pendingCrewId}
                playerName={playerName}
                onJoinRequest={onJoinRequest}
              />
            ))
          )
        )}

        {/* ── MY CREW tab ── */}
        {tab === "my" && (
          myCrew ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Crew info */}
              <div style={{
                background: "rgba(40,80,40,.12)", border: "1px solid #30804060",
                borderRadius: 6, padding: "12px 14px",
              }}>
                <div style={{ ...TEXT_SM, color: "#40cc80", fontWeight: 700, fontSize: 13 }}>
                  [{myCrew.abbr}] {myCrew.name}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  <div>
                    <div style={{ ...TEXT_XS, color: "#3a5a4a" }}>LEVEL</div>
                    <div style={{ ...TEXT_SM, color: GOLD }}>{myCrew.level}</div>
                  </div>
                  <div>
                    <div style={{ ...TEXT_XS, color: "#3a5a4a" }}>MEMBERS</div>
                    <div style={{ ...TEXT_SM, color: "#40cc80" }}>{myCrew.members.length}/{myCrew.cap}</div>
                  </div>
                  <div>
                    <div style={{ ...TEXT_XS, color: "#3a5a4a" }}>FOUNDED</div>
                    <div style={{ ...TEXT_SM, color: "#6a8a7a" }}>{myCrew.founder}</div>
                  </div>
                </div>
              </div>

              {/* Member list */}
              <div style={{ ...TEXT_XS, color: "#4a5a6a", letterSpacing: ".06em" }}>
                MEMBERS ({myCrew.members.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {myCrew.members.map((m, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 8px", borderRadius: 4,
                    background: m === playerName ? "rgba(40,160,80,.1)" : "rgba(255,255,255,.025)",
                    border: `1px solid ${m === playerName ? "#40aa6030" : "#1e2028"}`,
                  }}>
                    <span style={{ ...TEXT_XS, color: m === playerName ? "#40cc80" : "#6a7a8a" }}>
                      {m === myCrew.founder ? "⚓ " : "  "}{m}
                    </span>
                    {m === playerName && (
                      <span style={{ ...TEXT_XS, color: "#40aa60", background: "rgba(40,160,80,.15)",
                        padding: "1px 5px", borderRadius: 3, border: "1px solid #40aa6040" }}>
                        YOU
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Leave button */}
              <button onClick={onLeaveCrew} style={{
                ...BTN_RESET,
                width: "100%", padding: "9px 0", marginTop: 4,
                borderRadius: 4,
                background: "rgba(80,20,20,.3)", border: "1px solid #602020",
                color: "#cc4040", ...TEXT_XS, cursor: "pointer",
              }}>
                🚪 Leave Crew
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚓</div>
              <div style={{ ...TEXT_SM, color: "#4a5a6a" }}>You're not in a crew</div>
              <div style={{ ...TEXT_XS, color: "#3a4050", marginTop: 4 }}>
                Browse crews or create one
              </div>
            </div>
          )
        )}

        {/* ── CREATE tab ── */}
        {tab === "create" && !playerCrewId && (
          canAfford ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Cost banner */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(200,160,60,.1)", border: "1px solid #c8a04030",
              borderRadius: 5, padding: "8px 10px",
            }}>
              <span style={{ ...TEXT_XS, color: "#c8a060" }}>Founding cost</span>
              <span style={{ ...TEXT_SM, color: "#f0c040", fontWeight: 700 }}>
                💎 {(crewCreationCost ?? 500).toLocaleString()} gems
              </span>
            </div>
            <div style={{ ...TEXT_XS, color: "#5a6a7a" }}>
              Found a new crew for your faction. You'll be its first member and founder.
            </div>

            {/* Name */}
            <div>
              <div style={{ ...TEXT_XS, color: "#5a6a7a", marginBottom: 4, letterSpacing: ".06em" }}>
                CREW NAME (4–20 characters)
              </div>
              <input
                value={crewName}
                onChange={e => setCrewName(e.target.value)}
                placeholder="e.g. Iron Tide"
                maxLength={20}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,.05)", border: "1px solid #2a3040",
                  borderRadius: 4, padding: "8px 10px", color: "#c8c0b0",
                  fontFamily: "'Cinzel',serif", fontSize: 11, outline: "none",
                }}
              />
              <div style={{ ...TEXT_XS, color: crewName.length > 17 ? "#cc8030" : "#3a4050",
                textAlign: "right", marginTop: 2 }}>
                {crewName.length}/20
              </div>
            </div>

            {/* Abbr */}
            <div>
              <div style={{ ...TEXT_XS, color: "#5a6a7a", marginBottom: 4, letterSpacing: ".06em" }}>
                ABBREVIATION (exactly 4 characters)
              </div>
              <input
                value={crewAbbr}
                onChange={e => setCrewAbbr(e.target.value.toUpperCase())}
                placeholder="e.g. IRON"
                maxLength={4}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,.05)", border: "1px solid #2a3040",
                  borderRadius: 4, padding: "8px 10px", color: "#c8c0b0",
                  fontFamily: "'Cinzel',serif", fontSize: 13, letterSpacing: ".15em",
                  outline: "none", textTransform: "uppercase",
                }}
              />
            </div>

            {createErr.length > 0 && (
              <div style={{ background: "rgba(160,40,40,.15)", border: "1px solid #602020",
                borderRadius: 4, padding: "8px 10px" }}>
                {createErr.map((e, i) => (
                  <div key={i} style={{ ...TEXT_XS, color: "#cc6060" }}>• {e}</div>
                ))}
              </div>
            )}

            <button onClick={handleCreate} style={{
              ...BTN_RESET,
              width: "100%", padding: "11px 0",
              borderRadius: 4,
              background: "linear-gradient(160deg,#1a3a2a,#0e2018)",
              border: "1px solid #306050",
              color: "#50c090", ...TEXT_SM,
              cursor: "pointer",
            }}>
              ⚓ Found Crew
            </button>

            <div style={{ ...TEXT_XS, color: "#3a4050", textAlign: "center" }}>
              Your balance: 💎 {(playerGems ?? 0).toLocaleString()} gems
            </div>
          </div>
          ) : (
            /* Can't afford */
            <div style={{ textAlign: "center", padding: "30px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 28 }}>🔒</div>
              <div style={{ ...TEXT_SM, color: "#6a5a4a" }}>Not enough gems</div>
              <div style={{
                background: "rgba(200,160,60,.1)", border: "1px solid #c8a04030",
                borderRadius: 5, padding: "10px 16px",
              }}>
                <div style={{ ...TEXT_XS, color: "#6a5a4a", marginBottom: 4 }}>REQUIRED</div>
                <div style={{ ...TEXT_SM, color: "#f0c040", fontWeight: 700 }}>
                  💎 {(crewCreationCost ?? 500).toLocaleString()} gems
                </div>
              </div>
              <div style={{ ...TEXT_XS, color: "#3a4050" }}>
                You have 💎 {(playerGems ?? 0).toLocaleString()} gems
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
});
