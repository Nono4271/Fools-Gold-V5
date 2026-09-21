import { useState, memo } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   RelationsPanel — Request / List / Blacklist / Add, reached from ChatPanel's
   "Direct" display. Rules live in shared/utils/relationsRules.js; this is
   local-only today (src/hooks/useRelations.js), same as the rest of chat.
   Renders INSIDE ChatPanel's message column, replacing it while open.
───────────────────────────────────────────────────────────────────────────── */

const BTN_RESET = {
  background: "none", border: "none", padding: 0, margin: 0,
  cursor: "pointer", WebkitAppearance: "none", appearance: "none",
  touchAction: "manipulation",
};

const BORDER_COL = "#1a2030";
const GOLD       = "#c8a060";
const TEXT_SM    = { fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: ".04em" };
const TEXT_XS    = { fontFamily: "'Cinzel',serif", fontSize: 7, letterSpacing: ".04em" };

const TABS = [
  { id: "request",   label: "Request" },
  { id: "list",      label: "List" },
  { id: "blacklist", label: "Blacklist" },
  { id: "add",       label: "Add" },
];

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "30px 10px", color: "#3a4050" }}>
      <div style={{ fontSize: 22, marginBottom: 8, opacity: .6 }}>{icon}</div>
      <div style={{ ...TEXT_XS, color: "#4a5a6a" }}>{text}</div>
    </div>
  );
}

function PersonRow({ name, actions }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 10px", borderRadius: 4,
      background: "rgba(255,255,255,.03)", border: `1px solid ${BORDER_COL}`,
    }}>
      <span style={{ ...TEXT_XS, color: "#c8c0b0", fontSize: 9 }}>{name}</span>
      <div style={{ display: "flex", gap: 6 }}>{actions}</div>
    </div>
  );
}

function MiniBtn({ label, onClick, tone = "neutral" }) {
  const palette = {
    neutral: { bg: "rgba(255,255,255,.04)", border: "#2a3040", color: "#8a9aaa" },
    good:    { bg: "rgba(40,160,80,.15)",   border: "#40aa6050", color: "#40cc80" },
    bad:     { bg: "rgba(160,40,40,.15)",   border: "#602020",  color: "#cc6060" },
  }[tone];
  return (
    <button onClick={onClick} style={{
      ...BTN_RESET, padding: "4px 9px", borderRadius: 4, ...TEXT_XS,
      background: palette.bg, border: `1px solid ${palette.border}`, color: palette.color,
    }}>{label}</button>
  );
}

export default memo(function RelationsPanel({
  onBack, nameOf, friends = [], blocked = [], incoming = [], outgoing = [],
  addFriend, declineIncoming, cancelOutgoing, unfriend, blockPlayer, unblockPlayer,
  search, onMessage,
}) {
  const [tab, setTab] = useState("list");
  const [query, setQuery] = useState("");

  const results = tab === "add" ? search(query) : [];

  return (
    <>
      <div style={{
        padding: "8px 12px", borderBottom: `1px solid ${BORDER_COL}`,
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          ...BTN_RESET, color: "#8a9aaa", fontSize: 14, padding: "4px 6px",
        }}>‹</button>
        <div style={{ ...TEXT_SM, color: GOLD, fontSize: 11 }}>Relations Management</div>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${BORDER_COL}`, flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...BTN_RESET, flex: 1, padding: "9px 0", ...TEXT_XS,
            color: tab === t.id ? GOLD : "#4a5a6a",
            borderBottom: tab === t.id ? `2px solid ${GOLD}` : "2px solid transparent",
            background: tab === t.id ? "rgba(200,160,96,.06)" : "none",
          }}>{t.label}</button>
        ))}
      </div>

      <div className="scr chat-scroll" style={{
        flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 12px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {tab === "request" && (
          incoming.length === 0 && outgoing.length === 0 ? (
            <EmptyState icon="✉" text="No pending requests" />
          ) : (
            <>
              {incoming.map(id => (
                <PersonRow key={id} name={nameOf(id)} actions={[
                  <MiniBtn key="a" label="Accept" tone="good" onClick={() => addFriend(id)} />,
                  <MiniBtn key="d" label="Decline" tone="bad" onClick={() => declineIncoming(id)} />,
                ]} />
              ))}
              {outgoing.map(id => (
                <PersonRow key={id} name={nameOf(id)} actions={[
                  <span key="p" style={{ ...TEXT_XS, color: "#5a6a7a", padding: "4px 2px" }}>Pending…</span>,
                  <MiniBtn key="c" label="Cancel" onClick={() => cancelOutgoing(id)} />,
                ]} />
              ))}
            </>
          )
        )}

        {tab === "list" && (
          friends.length === 0 ? (
            <EmptyState icon="👥" text="No contacts" />
          ) : (
            friends.map(id => (
              <PersonRow key={id} name={nameOf(id)} actions={[
                onMessage && <MiniBtn key="m" label="Message" tone="good" onClick={() => onMessage(id)} />,
                <MiniBtn key="b" label="Block" tone="bad" onClick={() => blockPlayer(id)} />,
                <MiniBtn key="r" label="Remove" onClick={() => unfriend(id)} />,
              ].filter(Boolean)} />
            ))
          )
        )}

        {tab === "blacklist" && (
          blocked.length === 0 ? (
            <EmptyState icon="🚫" text="No blocked players" />
          ) : (
            blocked.map(id => (
              <PersonRow key={id} name={nameOf(id)} actions={[
                <MiniBtn key="u" label="Unblock" onClick={() => unblockPlayer(id)} />,
              ]} />
            ))
          )
        )}

        {tab === "add" && (
          <>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by name"
                style={{
                  flex: 1, background: "rgba(255,255,255,.05)", border: "1px solid #2a3040",
                  borderRadius: 4, padding: "8px 10px", color: "#c8c0b0",
                  fontFamily: "'Cinzel',serif", fontSize: 10, outline: "none",
                }}
              />
            </div>
            {query.trim() === "" ? (
              <div style={{ textAlign: "center", padding: "24px 10px", color: "#3a4050" }}>
                <div style={{ fontSize: 16, marginBottom: 6 }}>🔍</div>
                <div style={{ ...TEXT_XS, color: "#4a5a6a" }}>Search by player name</div>
                <div style={{ ...TEXT_XS, color: "#3a4050", marginTop: 4 }}>
                  You can check the player ID under player settings
                </div>
              </div>
            ) : results.length === 0 ? (
              <EmptyState icon="🔍" text="No players found" />
            ) : (
              results.map(c => {
                const status = friends.includes(c.id) ? "friend"
                  : blocked.includes(c.id) ? "blocked"
                  : outgoing.includes(c.id) ? "pending" : "none";
                return (
                  <PersonRow key={c.id} name={c.name} actions={[
                    status === "friend" ? <span key="s" style={{ ...TEXT_XS, color: "#40cc80" }}>Added</span>
                    : status === "blocked" ? <span key="s" style={{ ...TEXT_XS, color: "#cc6060" }}>Blocked</span>
                    : status === "pending" ? <span key="s" style={{ ...TEXT_XS, color: "#5a6a7a" }}>Pending…</span>
                    : <MiniBtn key="a" label="Add" tone="good" onClick={() => addFriend(c.id)} />,
                  ]} />
                );
              })
            )}
          </>
        )}
      </div>
    </>
  );
});
