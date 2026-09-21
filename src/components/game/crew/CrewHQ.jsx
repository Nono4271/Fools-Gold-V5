import { useState } from "react";
import { crewXpToNextLevel } from "../../../../shared/constants/crew.js";
import { canEditAnnouncement, canSetTarget } from "../../../../shared/utils/crewRules.js";
import { Emblem } from "./Emblem.jsx";
import CrewMembers from "./CrewMembers.jsx";
import CrewStructures from "./CrewStructures.jsx";
import CrewStore from "./CrewStore.jsx";
import CrewHelp from "./CrewHelp.jsx";
import CrewDiplomacy from "./CrewDiplomacy.jsx";
import CrewComingSoon from "./CrewComingSoon.jsx";
import { BTN_RESET, BORDER_COL, GOLD, TEXT_SM, TEXT_XS, dangerBtn } from "./crewStyles.js";

// Bottom icon row — matches the LOTR: Rise to War reference screenshot's
// row of icons along the bottom edge. Diplomacy and Boosts are NOT in this
// row — in the reference they're hotspots ON the table itself (see
// TableHotspot below), not duplicated at the bottom.
// The owner-supplied war-table scene for the in-crew HQ (distinct from
// CrewLanding's not-in-crew backdrop) — public/crew/hq-table-bg.jpg.
const TABLE_BG_URL = "/crew/hq-table-bg.jpg";

const BOTTOM_TABS = [
  { id: "records",     label: "Records",     icon: "📜" },
  { id: "structures",  label: "Structures",  icon: "🏰" },
  { id: "cooperation", label: "Cooperation", icon: "🛡️" },
  { id: "store",       label: "Store",       icon: "🏪" },
  { id: "members",     label: "Members",     icon: "👥" },
  { id: "help",        label: "Help",        icon: "🤝" },
];

/* ─────────────────────────────────────────────────────────────────────────
   CrewHQ — the full-screen "war table" for a player already in a crew.
   Layout matches the LOTR: Rise to War reference: identity/level/founder/
   language/announcement live in a fixed LEFT column; Members/Structures/
   Store/Help/Cooperation/Records sit in a row along the BOTTOM edge; the
   table itself (Diplomacy/Boosts/Target hotspots) fills the remaining
   middle-right area. Selecting a bottom-row or table hotspot swaps the
   table view for that tab's content, with a "Back to table" affordance.
───────────────────────────────────────────────────────────────────────── */
export default function CrewHQ({
  crew, crews, playerId, playerName, now,
  onLeave, onDisband,
  onPromote, onDemote, onKick,
  onRequestBuildFortress, onDemolishFortress,
  onBuyStoreItem,
  crewHallLvl, helpsUsed, onHelpMember, canHelp,
  onUpdateAnnouncement, onSetTarget, onClearTarget, onSetDiplomacy,
}) {
  const [tab, setTab] = useState(null); // null = show the table; otherwise a tab id
  const [editingAnnouncement, setEditingAnnouncement] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState(crew.description || "");
  const [settingTarget, setSettingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState("");
  const xpNeeded = crewXpToNextLevel(crew.level);
  const xpPct = xpNeeded === Infinity ? 100 : Math.min(100, Math.round((crew.xp / xpNeeded) * 100));
  const isFounder = crew.founder === playerId;
  const canEditAnn = canEditAnnouncement(crew, playerId);
  const canPinTarget = canSetTarget(crew, playerId);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Left column — identity, level, size/founder/language, announcement */}
      <div style={{
        width: 190, flexShrink: 0, borderRight: `1px solid ${BORDER_COL}`,
        padding: "16px 10px 16px", display: "flex", flexDirection: "column", gap: 22,
        overflowY: "auto",
      }} className="scr crew-scroll">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
          <Emblem emblem={crew.emblem} size={48} />
          <div style={{ ...TEXT_SM, color: GOLD, fontWeight: 700, fontSize: 12 }}>[{crew.abbr}] {crew.name}</div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ ...TEXT_XS, color: "#8a95a5" }}>Lv.{crew.level}</span>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
              <div style={{ width: `${xpPct}%`, height: "100%", background: "linear-gradient(90deg,#c8a060,#e0c080)" }} />
            </div>
          </div>
          <div style={{ ...TEXT_XS, color: "#4a5a6a", fontSize: 7, textAlign: "right", marginTop: 2 }}>
            {xpNeeded === Infinity ? "MAX" : `${crew.xp}/${xpNeeded}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ ...TEXT_XS, color: "#6a7a8a", fontSize: 8 }}>👥 {(crew.members||[]).length}/{crew.cap}</span>
          <span style={{ ...TEXT_XS, color: "#6a7a8a", fontSize: 8 }}>👑 {crew.founder === playerId ? playerName : crew.founder}</span>
          <span style={{ ...TEXT_XS, color: "#6a7a8a", fontSize: 8 }}>🗣 {crew.language}</span>
        </div>

        {/* Announcement — founder-editable crew description */}
        <div style={{ padding: "8px 9px", borderRadius: 6, background: "rgba(200,160,60,.06)", border: `1px solid ${BORDER_COL}` }}>
          {editingAnnouncement ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <textarea value={announcementDraft} onChange={e => setAnnouncementDraft(e.target.value.slice(0, 200))} rows={4}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,.05)", border: "1px solid #2a3040", borderRadius: 4, padding: "6px 8px", color: "#c8c0b0", fontFamily: "'Crimson Pro',serif", fontSize: 10, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { onUpdateAnnouncement?.(announcementDraft); setEditingAnnouncement(false); }}
                  style={{ ...BTN_RESET, ...TEXT_XS, color: GOLD, border: `1px solid ${GOLD}`, borderRadius: 4, padding: "4px 10px" }}>Save</button>
                <button onClick={() => { setAnnouncementDraft(crew.description || ""); setEditingAnnouncement(false); }}
                  style={{ ...BTN_RESET, ...TEXT_XS, color: "#5a6a7a", padding: "4px 10px" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ ...TEXT_XS, color: "#a0a8b0", fontStyle: "italic", fontFamily: "'Crimson Pro',serif", fontSize: 10 }}>
                {crew.description || "No announcement set."}
              </div>
              {canEditAnn && (
                <button onClick={() => setEditingAnnouncement(true)} style={{ ...BTN_RESET, ...TEXT_XS, color: "#5a6a7a", fontSize: 8, alignSelf: "flex-start" }}>✏️ Edit</button>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {isFounder ? (
          <button onClick={onDisband} style={dangerBtn()}>💥 Disband Crew</button>
        ) : (
          <button onClick={onLeave} style={dangerBtn()}>🚪 Leave Crew</button>
        )}
      </div>

      {/* Right side — table (with hotspots) or the active tab's content, plus the bottom icon row */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div className="scr crew-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12, position: "relative" }}>
          {tab === null ? (
            <div style={{ position: "absolute", inset: 0 }}>
              {/* The war table itself — owner-supplied scene. Fills the whole
                  pane (not just a shrunk-to-content box), so it reaches every
                  edge instead of leaving bare space above/below it. A dark
                  gradient sits underneath the image (same layered-background
                  trick as CrewLanding) so the pane reads as "loading", not
                  broken/blank, on a slow connection before the JPG arrives —
                  the JPG itself was also cut from ~380KB to ~110KB. */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${TABLE_BG_URL}), linear-gradient(160deg, #241a10, #120c07)`,
                backgroundSize: "cover, cover", backgroundPosition: "center, center",
                border: "1px solid #3a2a18", overflow: "hidden",
              }} />

              {/* Diplomacy/Boosts/Target hotspots float ON TOP of the table
                  surface itself — down among the map/pieces, staggered at
                  different heights, not pinned along the top edge. */}
              <div style={{ position: "absolute", top: "42%", left: "29%" }}>
                <TableHotspot icon="diplomacy" label="Diplomacy" onClick={() => setTab("diplomacy")} />
              </div>
              <div style={{ position: "absolute", top: "30%", left: "50%" }}>
                <TableHotspot icon="boosts" label="Boosts" onClick={() => setTab("boosts")} />
              </div>
              <div style={{ position: "absolute", top: "55%", left: "70%" }}>
                <TableHotspot icon="tasks" label={crew.target ? crew.target.label || "Target set" : "Tasks"}
                  onClick={() => canPinTarget && setSettingTarget(v => !v)} />

                {settingTarget && canPinTarget && (
                  <div style={{
                    position: "absolute", top: "100%", right: 0, marginTop: 8, width: 220, zIndex: 2,
                    padding: "8px 10px", borderRadius: 6, background: "rgba(20,10,10,.94)", border: "1px solid #6a2a2a",
                    display: "flex", flexDirection: "column", gap: 6,
                  }}>
                    <div style={{ ...TEXT_XS, color: "#c88080", letterSpacing: ".05em" }}>RALLY TARGET</div>
                    <input value={targetDraft} onChange={e => setTargetDraft(e.target.value.slice(0, 40))} placeholder="e.g. Push the western fortress"
                      style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,.05)", border: "1px solid #2a3040", borderRadius: 4, padding: "6px 8px", color: "#c8c0b0", fontFamily: "'Cinzel',serif", fontSize: 10 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { onSetTarget?.(targetDraft); setSettingTarget(false); setTargetDraft(""); }}
                        disabled={!targetDraft.trim()}
                        style={{ ...BTN_RESET, ...TEXT_XS, color: "#ff9090", border: "1px solid #cc4040", borderRadius: 4, padding: "4px 10px", opacity: targetDraft.trim() ? 1 : .5 }}>Pin</button>
                      {crew.target && (
                        <button onClick={() => { onClearTarget?.(); setSettingTarget(false); }}
                          style={{ ...BTN_RESET, ...TEXT_XS, color: "#5a6a7a", padding: "4px 10px" }}>Clear</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <button onClick={() => setTab(null)} style={{
                ...BTN_RESET, ...TEXT_XS, color: "#8a95a5", padding: "4px 0", marginBottom: 10,
              }}>← Back to table</button>

              {tab === "members" && (
                <CrewMembers crew={crew} playerId={playerId} playerName={playerName}
                  onPromote={onPromote} onDemote={onDemote} onKick={onKick} />
              )}
              {tab === "structures" && (
                <CrewStructures crew={crew} playerId={playerId} now={now}
                  onRequestBuildFortress={onRequestBuildFortress} onDemolishFortress={onDemolishFortress} />
              )}
              {tab === "store" && <CrewStore crew={crew} playerId={playerId} onBuy={onBuyStoreItem} />}
              {tab === "help" && (
                <CrewHelp crewHallLvl={crewHallLvl} helpsUsed={helpsUsed} onHelpMember={onHelpMember} canHelp={canHelp} />
              )}
              {tab === "diplomacy" && (
                <CrewDiplomacy crew={crew} crews={crews} playerId={playerId} onSetDiplomacy={onSetDiplomacy} />
              )}
              {tab === "boosts" && (
                <CrewComingSoon icon="🧪" title="Boosts"
                  note="Crew-wide temporary buffs, funded by the Store — coming in a follow-up pass." />
              )}
              {tab === "cooperation" && (
                <CrewComingSoon icon="🛡️" title="Cooperation"
                  note="Coordinated crew actions — coming in a follow-up pass." />
              )}
              {tab === "records" && (
                <CrewComingSoon icon="📜" title="Records"
                  note="A log of crew events — fortresses built/lost, members joined, promotions — coming in a follow-up pass." />
              )}
            </div>
          )}
        </div>

        {/* Bottom icon row — right-aligned so Help lands in the bottom-right corner */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "8px 14px", borderTop: `1px solid ${BORDER_COL}`, flexShrink: 0 }}>
          {BOTTOM_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              ...BTN_RESET, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2, padding: "6px 10px", borderRadius: 6,
              color: tab === t.id ? GOLD : "#8a95a5",
              background: tab === t.id ? "rgba(200,160,96,.14)" : "rgba(255,255,255,.03)",
              border: `1px solid ${tab === t.id ? GOLD : BORDER_COL}`,
            }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ ...TEXT_XS, fontSize: 7 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Single-color gold seals — the old green boxes + full-color emoji clashed
// hard against the warm candlelit table photo. These read as one object
// (a wax-seal medallion) sitting on the table instead of a UI sticker.
const HOTSPOT_ICON_PATHS = {
  diplomacy: "M12 4c-1 2-3 3-5 3 0 4 2 7 5 9 3-2 5-5 5-9-2 0-4-1-5-3z M9 9c1 1 2 1.5 3 1.5s2-.5 3-1.5",
  boosts: "M10 3h4v3l2.4 6.2c.6 1.6-.6 3.3-2.3 3.3H9.9c-1.7 0-2.9-1.7-2.3-3.3L10 6V3z M9 15h6",
  tasks: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
};

function TableHotspot({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...BTN_RESET, position: "relative", display: "flex", flexDirection: "column",
      alignItems: "center", gap: 3, padding: "10px 12px", borderRadius: "50%",
      background: "radial-gradient(circle at 35% 30%, rgba(60,44,20,.85), rgba(20,14,6,.75))",
      border: "1.5px solid #c8a060", boxShadow: "0 0 8px rgba(0,0,0,.6), inset 0 0 6px rgba(200,160,96,.15)",
      width: 58, height: 58, justifyContent: "center",
    }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e0c080" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={HOTSPOT_ICON_PATHS[icon]} />
      </svg>
      <span style={{
        position: "absolute", top: "100%", marginTop: 4, whiteSpace: "nowrap",
        ...TEXT_XS, color: "#e0c080", fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
        textShadow: "0 1px 2px rgba(0,0,0,.9)",
      }}>{label}</span>
    </button>
  );
}
