import { GOLD, BTN_RESET, TEXT_XS } from "./crewStyles.js";

/* ─────────────────────────────────────────────────────────────────────────
   CrewLanding — the single screen a player not in a crew sees. A dark
   war-room scene (CSS only — no image asset) with a table silhouette,
   flavor text, and Join/Create actions.
───────────────────────────────────────────────────────────────────────── */
export default function CrewLanding({ onBrowse, onCreate, crewCount }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: `
        radial-gradient(ellipse 70% 50% at 50% 38%, rgba(120,90,40,.14), transparent 70%),
        linear-gradient(180deg, #0a0d12 0%, #05070a 55%, #030405 100%)
      `,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 20px", overflow: "hidden",
    }}>
      {/* Table silhouette */}
      <div style={{
        position: "absolute", bottom: "18%", width: "78%", maxWidth: 420, height: 120,
        background: "linear-gradient(180deg, #241a10, #120c07)",
        border: "1px solid #3a2a18", borderRadius: "8px 8px 40px 40px / 8px 8px 14px 14px",
        boxShadow: "0 30px 60px rgba(0,0,0,.6), inset 0 2px 0 rgba(255,255,255,.04)",
        opacity: .85,
      }}>
        {/* map/parchment hint */}
        <div style={{
          position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
          width: "60%", height: 46, background: "rgba(220,200,160,.08)",
          border: "1px solid rgba(220,200,160,.15)", borderRadius: 3,
        }} />
        {/* silhouette figures */}
        {[-1, 1].map(side => (
          <div key={side} style={{
            position: "absolute", bottom: -8, left: side < 0 ? "8%" : undefined, right: side > 0 ? "8%" : undefined,
            width: 26, height: 60, borderRadius: "40% 40% 10% 10%",
            background: "linear-gradient(180deg, #1c1a18, #0a0908)",
          }} />
        ))}
      </div>

      <div style={{ position: "relative", textAlign: "center", maxWidth: 380 }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>⚔️</div>
        <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 18, color: GOLD, letterSpacing: ".04em" }}>
          RALLY YOUR CREW
        </div>
        <div style={{
          fontFamily: "'Crimson Pro',serif", fontSize: 12, color: "#8a95a5",
          marginTop: 10, lineHeight: 1.6, padding: "0 8px",
        }}>
          The world will not be won alone. Gather at the table, plan the campaign,
          and stand with a crew who can hold ground you cannot hold by yourself.
        </div>
        {typeof crewCount === "number" && (
          <div style={{ ...TEXT_XS, color: "#4a5a6a", marginTop: 8 }}>
            {crewCount} crew{crewCount !== 1 ? "s" : ""} in your faction
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
          <button onClick={onBrowse} style={{
            ...BTN_RESET, padding: "12px 0", borderRadius: 5,
            background: "linear-gradient(160deg,#2a2418,#15120c)",
            border: "1px solid #4a3a24", color: GOLD,
            fontFamily: "'Cinzel',serif", fontSize: 12, letterSpacing: ".06em",
          }}>
            🔎 Find a Crew
          </button>
          <button onClick={onCreate} style={{
            ...BTN_RESET, padding: "12px 0", borderRadius: 5,
            background: "linear-gradient(160deg,#1a3a2a,#0e2018)",
            border: "1px solid #306050", color: "#50c090",
            fontFamily: "'Cinzel',serif", fontSize: 12, letterSpacing: ".06em",
          }}>
            ⚓ Found a Crew
          </button>
        </div>
      </div>
    </div>
  );
}
