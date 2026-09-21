import { memo } from "react";
import { censorText } from "../../../shared/utils/profanity.js";

/* ─────────────────────────────────────────────────────────────────────────────
   ChatPreview — closed-state mini preview, bottom-left, showing the last
   couple of messages across every channel the player sees. Chat isn't just
   a button: this stays visible while ChatPanel itself is closed, and tapping
   it opens the panel. Local-only, same as ChatPanel.jsx (see useChat.js).
───────────────────────────────────────────────────────────────────────────── */

const TEXT_XS = { fontFamily: "'Cinzel',serif", fontSize: 7, letterSpacing: ".04em" };
const GOLD    = "#c8a060";

function crewAbbrFor(id, crews) {
  const crew = (crews || []).find(c => (c.members || []).includes(id));
  return crew ? crew.abbr : null;
}

function taggedName(name, abbr) {
  return abbr ? `[${abbr}] ${name}` : name;
}

export default memo(function ChatPreview({
  onOpen, playerId = "player", messages = [], crews = [], profanityFilterEnabled = true,
}) {
  if (messages.length === 0) return null;

  return (
    <button
      onClick={onOpen}
      style={{
        position: "fixed", left: 8, bottom: "calc(env(safe-area-inset-bottom, 8px) + 8px)",
        zIndex: 9050, maxWidth: 190,
        background: "rgba(5,7,11,.9)", border: "1px solid #1a2030", borderRadius: 6,
        padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3,
        textAlign: "left", cursor: "pointer", WebkitAppearance: "none", appearance: "none",
        touchAction: "manipulation", pointerEvents: "auto",
        boxShadow: "0 2px 12px rgba(0,0,0,.6)",
      }}
    >
      {messages.map(m => {
        const mine = m.senderId === playerId;
        const name = taggedName(mine ? "You" : m.senderName, crewAbbrFor(m.senderId, crews));
        const text = profanityFilterEnabled ? censorText(m.text) : m.text;
        return (
          <div key={m.id} style={{ display: "flex", gap: 4, alignItems: "baseline", overflow: "hidden" }}>
            <span style={{ ...TEXT_XS, color: mine ? "#40cc80" : GOLD, flexShrink: 0 }}>{name}:</span>
            <span style={{
              fontFamily: "'Crimson Pro',serif", fontSize: 10, color: "#a8a090",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{text}</span>
          </div>
        );
      })}
    </button>
  );
});
