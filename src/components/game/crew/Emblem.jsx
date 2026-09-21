import { EMBLEM_SHAPES, EMBLEM_ICONS, EMBLEM_COLORS } from "../../../../shared/constants/crew.js";

/* ─────────────────────────────────────────────────────────────────────────
   Emblem — renders a crew's {shape, icon, color, iconColor} as CSS + a
   hand-authored single-color inline SVG icon, no image assets. Same
   "cheap and deterministic, not an art pipeline" approach the rest of the
   codebase uses for AI display names/chatter.

   Icons used to be emoji glyphs, but multi-color emoji (COLR/CBDT color
   font tables) ignore CSS `color`, so the icon itself could never be
   recolored independently of the badge background. These are original
   flat-fill SVG shapes instead — `fill={iconColor}` recolors the whole
   icon, with shading done via fixed dark/light overlays (rgba black/white)
   so it reads correctly at any icon color.
───────────────────────────────────────────────────────────────────────── */

const DARK = "rgba(0,0,0,.45)";
const LIGHT = "rgba(255,255,255,.35)";

// icon id -> (color) => array of SVG child elements, viewBox 0 0 24 24.
// Add ids to EMBLEM_ICONS + here together.
const ICON_PATHS = {
  skull: (c) => [
    <circle key="1" cx="12" cy="10" r="7" fill={c} />,
    <rect key="2" x="8" y="15" width="8" height="5" rx="2" fill={c} />,
    <circle key="3" cx="9.3" cy="10" r="1.6" fill={DARK} />,
    <circle key="4" cx="14.7" cy="10" r="1.6" fill={DARK} />,
    <path key="5" d="M12 11.5 L11 13.5 L13 13.5 Z" fill={DARK} />,
  ],
  sword: (c) => [
    <path key="1" d="M10.5 2 L12 0.2 L13.5 2 Z" fill={c} />,
    <rect key="2" x="11" y="2" width="2" height="14" fill={c} />,
    <rect key="3" x="11.5" y="2" width="0.6" height="12" fill={LIGHT} />,
    <rect key="4" x="7" y="15" width="10" height="2" rx="1" fill={c} />,
    <rect key="5" x="10.5" y="17" width="3" height="4" fill={c} />,
    <circle key="6" cx="12" cy="22" r="1.6" fill={c} />,
  ],
  axe: (c) => [
    <rect key="1" x="11" y="9" width="2" height="13" rx="1" fill={c} />,
    <path key="2" d="M12 10 C12 10 8 3 3 4 C3 9 8 12 12 10 Z" fill={c} />,
    <path key="3" d="M6 5.5 C6 5.5 8.5 8.5 11 9.3" stroke={DARK} strokeWidth="1" fill="none" />,
  ],
  wolf: (c) => [
    <path key="1" d="M4 6 L9 9 L12 5 L15 9 L20 6 L18 15 C18 19 15 21 12 21 C9 21 6 19 6 15 Z" fill={c} />,
    <path key="2" d="M9 15 L11 12 L13 12 L15 15 L12 17 Z" fill={DARK} />,
    <circle key="3" cx="9.5" cy="13" r="1" fill={DARK} />,
    <circle key="4" cx="14.5" cy="13" r="1" fill={DARK} />,
  ],
  raven: (c) => [
    <ellipse key="1" cx="11" cy="13" rx="5" ry="4" fill={c} />,
    <circle key="2" cx="17" cy="9" r="2.6" fill={c} />,
    <path key="3" d="M19.3 9 L22 8.3 L19.3 10.3 Z" fill={c} />,
    <path key="4" d="M7 15 L3 19 L8 17.5 Z" fill={c} />,
    <path key="5" d="M8 12 C4 10 3 15 7 17 C9 17.5 10 15 8 12 Z" fill={DARK} />,
    <circle key="6" cx="18" cy="8.4" r="0.6" fill={DARK} />,
  ],
  flame: (c) => [
    <path key="1" d="M12 2 C8 8 6 11 8 15 C6 15 5 19 8 21 C11 23 16 22 17 18 C18 15 16 13 15 11 C15 14 13 14 13 11 C13 8 15 6 12 2 Z" fill={c} />,
    <path key="2" d="M12 8 C10 12 9.5 14 11 16 C10 18 11.5 19.5 13 19 C15 18.3 15 16 14 14.5 C14 15.5 12.5 15 13 13 C13 11 13.5 9.5 12 8 Z" fill={LIGHT} />,
  ],
  anchor: (c) => [
    <circle key="1" cx="12" cy="4" r="2" fill="none" stroke={c} strokeWidth="1.6" />,
    <rect key="2" x="11.2" y="6" width="1.6" height="12" fill={c} />,
    <rect key="3" x="8" y="9" width="8" height="1.6" fill={c} />,
    <path key="4" d="M12 18 C8 22 5 20 5 17 L7 17 C7 19 9 19.5 11 18 Z" fill={c} />,
    <path key="5" d="M12 18 C16 22 19 20 19 17 L17 17 C17 19 15 19.5 13 18 Z" fill={c} />,
  ],
  star: (c) => [
    <polygon key="1" points="12,2 14.7,9 22,9.3 16.2,13.9 18.2,21 12,16.8 5.8,21 7.8,13.9 2,9.3 9.3,9" fill={c} />,
  ],
  serpent: (c) => [
    <path key="1" d="M4 20 C4 14 10 16 10 11 C10 6 4 8 4 4" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />,
    <circle key="2" cx="4" cy="4" r="2" fill={c} />,
    <path key="3" d="M2.3 3.6 L0.5 3.2 L2.1 2.2 Z" fill={c} />,
  ],
  tower: (c) => [
    <rect key="1" x="7" y="10" width="10" height="12" fill={c} />,
    <rect key="2" x="6" y="6.5" width="2.4" height="3.5" fill={c} />,
    <rect key="3" x="10.8" y="6.5" width="2.4" height="3.5" fill={c} />,
    <rect key="4" x="15.6" y="6.5" width="2.4" height="3.5" fill={c} />,
    <rect key="5" x="10.5" y="14" width="3" height="4" fill={DARK} />,
  ],
  crown: (c) => [
    <rect key="1" x="5" y="16" width="14" height="4" rx="1" fill={c} />,
    <path key="2" d="M5 16 L7 8 L10 13 L12 6 L14 13 L17 8 L19 16 Z" fill={c} />,
    <circle key="3" cx="12" cy="6.5" r="1" fill={LIGHT} />,
  ],
  arrow: (c) => [
    <rect key="1" x="11" y="6" width="2" height="14" fill={c} />,
    <path key="2" d="M6 8 L12 2 L18 8 Z" fill={c} />,
    <path key="3" d="M9 18 L11 20 L11 15 Z" fill={c} />,
    <path key="4" d="M15 18 L13 20 L13 15 Z" fill={c} />,
  ],
  dragon: (c) => [
    <path key="1" d="M4 20 C4 12 9 6 16 6 C14 8 13 10 15 11 C18 10 21 12 21 15 C18 14 16 15 16 17 C16 20 12 22 8 21 C10 19 9 17 6 17 C5 18 4 19 4 20 Z" fill={c} />,
    <circle key="2" cx="16.5" cy="8.5" r="0.8" fill={DARK} />,
    <path key="3" d="M15 6 L16.5 4 L16.5 7 Z" fill={c} />,
  ],
  cross: (c) => [
    <rect key="1" x="10.5" y="3" width="3" height="18" rx="1" fill={c} />,
    <rect key="2" x="5" y="9" width="14" height="3" rx="1" fill={c} />,
  ],
  snowflake: (c) => [
    <g key="1" stroke={c} strokeWidth="1.6" strokeLinecap="round">
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="4.5" y1="7.5" x2="19.5" y2="16.5" />
      <line x1="19.5" y1="7.5" x2="4.5" y2="16.5" />
      <line x1="9" y1="5" x2="12" y2="7.5" />
      <line x1="15" y1="5" x2="12" y2="7.5" />
      <line x1="9" y1="19" x2="12" y2="16.5" />
      <line x1="15" y1="19" x2="12" y2="16.5" />
    </g>,
  ],
  moon: (c) => [
    <path key="1" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={c} />,
  ],
  bat: (c) => [
    <ellipse key="1" cx="12" cy="13" rx="2.2" ry="3" fill={c} />,
    <path key="2" d="M10 12 C4 8 2 12 4 16 C6 15 8 14 10 14 Z" fill={c} />,
    <path key="3" d="M14 12 C20 8 22 12 20 16 C18 15 16 14 14 14 Z" fill={c} />,
    <path key="4" d="M10.5 10.5 L10 8 L11.5 10 Z" fill={c} />,
    <path key="5" d="M13.5 10.5 L14 8 L12.5 10 Z" fill={c} />,
  ],
  orb: (c) => [
    <path key="1" d="M7 17 L17 17 L15 21 L9 21 Z" fill={c} />,
    <circle key="2" cx="12" cy="10" r="6" fill={c} />,
    <circle key="3" cx="10" cy="8" r="1.8" fill={LIGHT} />,
  ],
  hammer: (c) => [
    <rect key="1" x="11" y="8" width="2" height="14" rx="1" fill={c} />,
    <rect key="2" x="6" y="3" width="12" height="6" rx="1.5" fill={c} />,
    <rect key="3" x="6" y="3" width="12" height="2.5" fill={LIGHT} />,
  ],
  reaper: (c) => [
    <rect key="1" x="11" y="7" width="2" height="15" rx="1" fill={c} />,
    <path key="2" d="M12 8 C12 8 14 1 21 2 C21 9 15 13 11 10 Z" fill={c} />,
    <path key="3" d="M13.5 4 C13.5 4 16.5 3.5 18.5 5.5" stroke={DARK} strokeWidth="1" fill="none" />,
  ],
  trident: (c) => [
    <rect key="1" x="11" y="6" width="2" height="16" fill={c} />,
    <rect key="2" x="11" y="2" width="2" height="6" fill={c} />,
    <path key="3" d="M8 4 L10 8 L10 3 Z" fill={c} />,
    <path key="4" d="M16 4 L14 8 L14 3 Z" fill={c} />,
    <rect key="5" x="7" y="8" width="10" height="1.6" fill={c} />,
  ],
  shield_emblem: (c) => [
    <path key="1" d="M12 2 L19 5 V11 C19 17 15.5 20.5 12 22 C8.5 20.5 5 17 5 11 V5 Z" fill={c} />,
    <path key="2" d="M12 6 V17" stroke={DARK} strokeWidth="1.4" />,
  ],
  eagle: (c) => [
    <ellipse key="1" cx="12" cy="14" rx="3" ry="5" fill={c} />,
    <circle key="2" cx="12" cy="7" r="2.4" fill={c} />,
    <path key="3" d="M12 7 L15 6.5 L12 8.7 Z" fill={DARK} />,
    <path key="4" d="M9 12 C2 9 1 15 6 18 C8 17 9 15 9 12 Z" fill={c} />,
    <path key="5" d="M15 12 C22 9 23 15 18 18 C16 17 15 15 15 12 Z" fill={c} />,
  ],
  lion: (c) => [
    <path key="1" d="M12 2 L14 7 L19 4 L16 9 L22 10 L16 12 L20 16 L14 14 L15 20 L12 15 L9 20 L10 14 L4 16 L8 12 L2 10 L8 9 L5 4 L10 7 Z" fill={c} opacity="0.85" />,
    <circle key="2" cx="12" cy="12" r="4.5" fill={c} />,
    <circle key="3" cx="10.3" cy="11.3" r="0.7" fill={DARK} />,
    <circle key="4" cx="13.7" cy="11.3" r="0.7" fill={DARK} />,
  ],
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

function IconGlyph({ icon, color, size }) {
  const fn = ICON_PATHS[icon] || ICON_PATHS[EMBLEM_ICONS[0]];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      {fn(color)}
    </svg>
  );
}

export function Emblem({ emblem, size = 40 }) {
  const e = emblem || {};
  const color = EMBLEM_COLORS.includes(e.color) ? e.color : EMBLEM_COLORS[0];
  const iconColor = EMBLEM_COLORS.includes(e.iconColor) ? e.iconColor : "#e8dcc0";
  const shape = EMBLEM_SHAPES.includes(e.shape) ? e.shape : EMBLEM_SHAPES[0];
  const icon = EMBLEM_ICONS.includes(e.icon) ? e.icon : EMBLEM_ICONS[0];
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: `linear-gradient(160deg, ${color}, ${color}cc)`,
      border: "1px solid rgba(255,255,255,.25)",
      boxShadow: "0 2px 6px rgba(0,0,0,.5), inset 0 0 8px rgba(0,0,0,.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      ...shapeStyle(shape),
    }}>
      <IconGlyph icon={icon} color={iconColor} size={size * 0.62} />
    </div>
  );
}

// A grid picker for shape/icon/color/iconColor — used by crew creation and
// (later) an edit-emblem flow. Controlled: `value` is
// {shape,icon,color,iconColor}, onChange gets the merged next value.
export function EmblemPicker({ value, onChange }) {
  const emblem = value || {};
  function set(patch) { onChange({ ...emblem, ...patch }); }

  const rowLabel = { fontSize: 7, letterSpacing: ".06em", color: "#5a6a7a", fontFamily: "'Cinzel',serif", marginBottom: 4 };
  const swatchBase = {
    width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0,
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
            }} />
          ))}
        </div>
      </div>

      <div>
        <div style={rowLabel}>ICON ({EMBLEM_ICONS.length} designs)</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EMBLEM_ICONS.map(icon => (
            <button key={icon} onClick={() => set({ icon })} style={{
              ...swatchBase, borderRadius: 5,
              background: emblem.icon === icon ? "rgba(200,160,96,.18)" : "rgba(255,255,255,.05)",
              border: `1px solid ${emblem.icon === icon ? "#c8a060" : "#2a3040"}`,
            }}>
              <IconGlyph icon={icon} color={EMBLEM_COLORS.includes(emblem.iconColor) ? emblem.iconColor : "#e8dcc0"} size={17} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={rowLabel}>BACKGROUND COLOR</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EMBLEM_COLORS.map(color => (
            <button key={color} onClick={() => set({ color })} style={{
              ...swatchBase, borderRadius: "50%", background: color,
              border: `2px solid ${emblem.color === color ? "#fff" : "rgba(255,255,255,.2)"}`,
            }} />
          ))}
        </div>
      </div>

      <div>
        <div style={rowLabel}>ICON COLOR</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EMBLEM_COLORS.map(color => (
            <button key={color} onClick={() => set({ iconColor: color })} style={{
              ...swatchBase, borderRadius: "50%", background: color,
              border: `2px solid ${emblem.iconColor === color ? "#fff" : "rgba(255,255,255,.2)"}`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
