import { GOLD, BTN_RESET, TEXT_XS } from "./crewStyles.js";

/* ─────────────────────────────────────────────────────────────────────────
   CrewLanding — the single screen a player not in a crew sees. A dark
   war-room scene (CSS only — no image asset) with a table silhouette,
   flavor text, and Join/Create actions.
───────────────────────────────────────────────────────────────────────── */
// The owner-supplied war-council scene — public/crew/war-table-bg.jpg.
const CREW_BG_URL = "/crew/war-table-bg.jpg";

export default function CrewLanding({ onBrowse, onCreate, crewCount }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      backgroundImage: CREW_BG_URL
        ? `linear-gradient(180deg, rgba(5,7,10,.35) 0%, rgba(5,7,10,.45) 55%, rgba(3,4,5,.85) 100%), url(${CREW_BG_URL})`
        : `
          radial-gradient(ellipse 70% 55% at 50% 55%, rgba(120,90,40,.16), transparent 70%),
          radial-gradient(ellipse 90% 60% at 50% 100%, rgba(40,30,15,.25), transparent 70%),
          linear-gradient(180deg, #0a0d12 0%, #05070a 55%, #030405 100%)
        `,
      backgroundSize: "cover", backgroundPosition: "center",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 20px", overflow: "hidden",
    }}>
      <div style={{
        position: "relative", textAlign: "center", maxWidth: 380,
        padding: CREW_BG_URL ? "22px 24px" : 0,
        borderRadius: CREW_BG_URL ? 10 : 0,
        background: CREW_BG_URL ? "radial-gradient(ellipse 90% 100% at 50% 50%, rgba(4,5,7,.7) 0%, rgba(4,5,7,.35) 70%, transparent 100%)" : "none",
      }}>
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
            ⚓ Create a Crew
          </button>
        </div>
      </div>
    </div>
  );
}
