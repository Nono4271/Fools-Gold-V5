import { canSetDiplomacy, diplomacyStatusOf, flaggedDiplomacyCrews } from "../../../../shared/utils/crewRules.js";
import { Emblem } from "./Emblem.jsx";
import { BTN_RESET, BORDER_COL, GOLD, TEXT_SM, TEXT_XS } from "./crewStyles.js";

/* ─────────────────────────────────────────────────────────────────────────
   CrewDiplomacy — Ally/Neutral/Enemy standing toward other crews.
   Cosmetic only (see the note on crew.diplomacy in shared/constants/crew.js
   and ownerTint in MapRenderer.jsx): it just recolors that crew's tile/
   structure outlines for you and your crewmates. One-way — flagging another
   crew ally/enemy does not change how they see you.

   Founder/officer  → every other crew in the game, with Ally/Neutral/Enemy
                       buttons per row.
   Plain member     → read-only list of crews YOUR crew has flagged; a
                       flavor line when nothing's flagged yet.
───────────────────────────────────────────────────────────────────────── */

const STATUS_STYLE = {
  ally:    { label: "ALLY",    color: "#e87830" }, // orange — matches the tile outline
  enemy:   { label: "ENEMY",   color: "#8a1414" }, // darker red — matches the tile outline
  neutral: { label: "NEUTRAL", color: "#5a6a7a" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.neutral;
  return (
    <span style={{
      ...TEXT_XS, color: s.color, background: `${s.color}18`,
      border: `1px solid ${s.color}60`, borderRadius: 3, padding: "2px 7px", fontWeight: 700,
    }}>{s.label}</span>
  );
}

function CrewRow({ crew, right }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
      borderRadius: 6, background: "rgba(255,255,255,.03)", border: `1px solid ${BORDER_COL}`,
    }}>
      <Emblem emblem={crew.emblem} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TEXT_SM, color: GOLD, fontWeight: 700, fontSize: 10 }}>[{crew.abbr}] {crew.name}</div>
        <div style={{ ...TEXT_XS, color: "#4a5a6a", marginTop: 2 }}>Lv.{crew.level ?? 1} · {(crew.members || []).length} members</div>
      </div>
      {right}
    </div>
  );
}

function SetStatusButtons({ status, onSet }) {
  const options = [
    { id: "ally", label: "Ally" },
    { id: "neutral", label: "Neutral" },
    { id: "enemy", label: "Enemy" },
  ];
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map(o => {
        const active = status === o.id;
        const col = (STATUS_STYLE[o.id] || STATUS_STYLE.neutral).color;
        return (
          <button key={o.id} onClick={() => onSet(o.id)} style={{
            ...BTN_RESET, ...TEXT_XS, padding: "4px 8px", borderRadius: 4,
            color: active ? col : "#5a6a7a",
            background: active ? `${col}20` : "rgba(255,255,255,.03)",
            border: `1px solid ${active ? col : BORDER_COL}`,
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

export default function CrewDiplomacy({ crew, crews, playerId, onSetDiplomacy }) {
  const canManage = canSetDiplomacy(crew, playerId);

  if (canManage) {
    const others = (crews || []).filter(c => c.id !== crew.id);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ ...TEXT_XS, color: "#6a7a8a", lineHeight: 1.5, marginBottom: 2 }}>
          Cosmetic only — allies show orange, enemies show a darker red on the
          map. It doesn't stop you attacking them, and it's one-way: this
          crew's own standing toward you may be different.
        </div>
        {others.length === 0 ? (
          <EmptyState text="No other crews exist yet." />
        ) : (
          others.map(other => (
            <CrewRow key={other.id} crew={other} right={
              <SetStatusButtons
                status={diplomacyStatusOf(crew, other.id)}
                onSet={(status) => onSetDiplomacy?.(other.id, status)}
              />
            } />
          ))
        )}
      </div>
    );
  }

  const flagged = flaggedDiplomacyCrews(crew, crews);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {flagged.length === 0 ? (
        <EmptyState text="Diplomatic talks are still underway. No standings have been set yet." />
      ) : (
        flagged.map(({ crew: other, status }) => (
          <CrewRow key={other.id} crew={other} right={<StatusBadge status={status} />} />
        ))
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "30px 10px" }}>
      <div style={{ fontSize: 22, marginBottom: 8, opacity: .6 }}>🕊️</div>
      <div style={{ ...TEXT_XS, color: "#4a5a6a", maxWidth: 220, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}
