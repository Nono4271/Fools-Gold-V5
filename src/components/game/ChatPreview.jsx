import { memo } from "react";
import { censorText } from "../../../shared/utils/profanity.js";

/* ─────────────────────────────────────────────────────────────────────────────
   ChatPreview — closed-state mini preview, bottom-center (between the
   Wizard's Tomes trigger at bottom-left and GameBar's bottom-right icon
   cluster), showing the last couple of messages across every channel the
   player sees. Always visible, even with zero messages — this IS how the
   player opens chat now, so there's no separate Chat icon in GameBar.
   Tapping it opens the panel. Local-only, same as ChatPanel.jsx (see
   useChat.js).
───────────────────────────────────────────────────────────────────────────── */

const TEXT_XS = { fontFamily: "'Cinzel',serif", fontSize: 7, letterSpacing: ".04em" };
// Sender name + "[ABBR] Name" tag — 1.5x TEXT_XS, matching ChatPanel.jsx's
// own TEXT_NAME bump.
const TEXT_NAME = { fontFamily: "'Cinzel',serif", fontSize: 10.5, letterSpacing: ".03em", fontWeight: 600 };
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
  unreadCount = 0,
}) {
  return (
    <button
      onClick={onOpen}
      style={{
        // Anchored by its right edge (pinned to where the old, narrower
        // box's right edge sat) rather than centered, so the extra width
        // grows mostly leftward instead of pushing out both sides evenly.
        position: "fixed", right: "calc(50% - 142.5px)",
        bottom: "calc(env(safe-area-inset-bottom, 8px) + 8px)",
        zIndex: 9050, width: 428, minHeight: 30,
        background: "rgba(5,7,11,.9)", border: "1px solid #1a2030", borderRadius: 6,
        padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3,
        justifyContent: "center",
        textAlign: "left", cursor: "pointer", WebkitAppearance: "none", appearance: "none",
        touchAction: "manipulation", pointerEvents: "auto",
        boxShadow: "0 2px 12px rgba(0,0,0,.6)",
      }}
    >
      {unreadCount > 0 && (
        <span style={{
          position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9,
          background: "#cc4040", border: "1px solid #1a2030", color: "#fff",
          fontFamily: "'Crimson Pro',serif", fontSize: 10, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
        }}>{unreadCount > 99 ? "99+" : unreadCount}</span>
      )}
      {messages.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 11 }}>💬</span>
          <span style={{ ...TEXT_XS, color: "#5a6a7a" }}>Chat</span>
        </div>
      ) : (
        messages.map(m => {
          const mine = m.senderId === playerId;
          const name = taggedName(mine ? "You" : m.senderName, crewAbbrFor(m.senderId, crews));
          const text = profanityFilterEnabled ? censorText(m.text) : m.text;
          return (
            <div key={m.id} style={{ display: "flex", gap: 4, alignItems: "baseline", overflow: "hidden" }}>
              <span style={{ ...TEXT_NAME, color: mine ? "#40cc80" : GOLD, flexShrink: 0 }}>{name}:</span>
              <span style={{
                fontFamily: "'Crimson Pro',serif", fontSize: 15, color: "#a8a090",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{text}</span>
            </div>
          );
        })
      )}
    </button>
  );
});
