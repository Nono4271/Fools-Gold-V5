import { EMBLEM_SHAPES, EMBLEM_ICONS, EMBLEM_COLORS } from "../../../../shared/constants/crew.js";

/* ─────────────────────────────────────────────────────────────────────────
   Emblem — renders a crew's {shape, icon, color} as CSS/emoji, no image
   assets. Same "cheap and deterministic, not an art pipeline" approach the
   rest of this codebase uses for AI display names/chatter.
───────────────────────────────────────────────────────────────────────── */

// icon id -> glyph. Small starter set; add ids to EMBLEM_ICONS + here together.
const ICON_GLYPH = {
  skull: "💀", sword: "⚔️", axe: "🪓", wolf: "🐺", raven: "🐦‍⬛", flame: "🔥",
  anchor: "⚓", star: "⭐", serpent: "🐍", tower: "🗼", crown: "👑", arrow: "🏹",
};

function shapeStyle(shape) {
  switch (shape) {
    case "banner":  return { borderRadius: "4px 4px 2px 2px", clipPath: "polygon(0 0,100% 0,100% 78%,50% 100%,0 78%)" };
    case "crest":   return { borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%" };
    case "roundel": return { borderRadius: "50%" };
    case "shield":
    default:        return { borderRadius: "6px 6px 40% 40% / 6px 6px 55% 55%" };
  }
}

export function Emblem({ emblem, size = 40 }) {
  const e = emblem || {};
  const color = EMBLEM_COLORS.includes(e.color) ? e.color : EMBLEM_COLORS[0];
  const shape = EMBLEM_SHAPES.includes(e.shape) ? e.shape : EMBLEM_SHAPES[0];
  const glyph = ICON_GLYPH[e.icon] || ICON_GLYPH[EMBLEM_ICONS[0]];
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: `linear-gradient(160deg, ${color}, ${color}cc)`,
      border: "1px solid rgba(255,255,255,.25)",
      boxShadow: "0 2px 6px rgba(0,0,0,.5), inset 0 0 8px rgba(0,0,0,.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.55, lineHeight: 1,
      ...shapeStyle(shape),
    }}>
      {glyph}
    </div>
  );
}

// A grid picker for shape/icon/color — used by crew creation and (later) an
// edit-emblem flow. Controlled: `value` is {shape,icon,color}, onChange gets
// the merged next value.
export function EmblemPicker({ value, onChange }) {
  const emblem = value || {};
  function set(patch) { onChange({ ...emblem, ...patch }); }

  const rowLabel = { fontSize: 7, letterSpacing: ".06em", color: "#5a6a7a", fontFamily: "'Cinzel',serif", marginBottom: 4 };
  const swatchBase = {
    width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontSize: 15, flexShrink: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
        <Emblem emblem={emblem} size={64} />
      </div>

      <div>
        <div style={rowLabel}>SHAPE</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EMBLEM_SHAPES.map(shape => (
            <button key={shape} onClick={() => set({ shape })} style={{
              ...swatchBase, ...shapeStyle(shape),
              background: "rgba(255,255,255,.06)",
              border: `1px solid ${emblem.shape === shape ? "#c8a060" : "#2a3040"}`,
            }}>{shapeStyle(shape) && ""}</button>
          ))}
        </div>
      </div>

      <div>
        <div style={rowLabel}>ICON</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EMBLEM_ICONS.map(icon => (
            <button key={icon} onClick={() => set({ icon })} style={{
              ...swatchBase, borderRadius: 5,
              background: emblem.icon === icon ? "rgba(200,160,96,.18)" : "rgba(255,255,255,.05)",
              border: `1px solid ${emblem.icon === icon ? "#c8a060" : "#2a3040"}`,
            }}>{ICON_GLYPH[icon]}</button>
          ))}
        </div>
      </div>

      <div>
        <div style={rowLabel}>COLOR</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EMBLEM_COLORS.map(color => (
            <button key={color} onClick={() => set({ color })} style={{
              ...swatchBase, borderRadius: "50%", background: color,
              border: `2px solid ${emblem.color === color ? "#fff" : "rgba(255,255,255,.2)"}`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
