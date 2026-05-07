export default function SkillInfoPanel({ skillDef, isMain, level, maxLevel, color, accent, canLevelUp, gateLocked, onLevelUp, onClose }) {
  if (!skillDef) return null;
  const atMax = level >= maxLevel;
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0,
      background: "rgba(6,4,2,.97)",
      border: `1px solid ${color}40`,
      borderRadius: "12px 12px 0 0",
      padding: "14px 16px 20px",
      zIndex: 10,
      boxShadow: `0 -8px 32px ${color}18`,
      animation: "fadeUp .18s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>{skillDef.icon}</span>
            <div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700, color: "#e0d0b0" }}>
                {skillDef.name}
              </div>
              <div style={{ fontSize: 8, color, fontFamily: "'Cinzel',serif", marginTop: 1 }}>
                {isMain ? "Main Skill" : "Side Skill"} · {level}/{maxLevel}
              </div>
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(255,255,255,.04)", border: `1px solid #2a2010`,
          color: "#5a4a30", fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      </div>

      <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
        {Array.from({ length: maxLevel }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < level ? `linear-gradient(90deg,${color},${accent})` : "#1a1410",
            border: `1px solid ${i < level ? color + "60" : "#241c0e"}`,
            transition: "background .2s",
          }} />
        ))}
      </div>

      <div style={{ fontSize: 10, color: "#7a6a50", fontFamily: "'Crimson Pro',serif",
        lineHeight: 1.5, marginBottom: 8 }}>{skillDef.desc}</div>

      <div style={{ display: "grid", gridTemplateColumns: level > 0 ? "1fr 1fr" : "1fr", gap: 8, marginBottom: 12 }}>
        {level > 0 && (
          <div style={{ padding: "7px 9px", background: "rgba(255,255,255,.03)",
            border: `1px solid ${color}20`, borderRadius: 5 }}>
            <div style={{ fontSize: 7, color: "#5a4a2a", fontFamily: "'Cinzel',serif",
              letterSpacing: ".06em", marginBottom: 3 }}>CURRENT Lv{level}</div>
            <div style={{ fontSize: 9, color: "#c0a070", fontFamily: "'Crimson Pro',serif" }}>
              {skillDef.nextDesc(level - 1)}
            </div>
          </div>
        )}
        {!atMax && (
          <div style={{ padding: "7px 9px", background: `${color}08`,
            border: `1px solid ${color}25`, borderRadius: 5 }}>
            <div style={{ fontSize: 7, color, fontFamily: "'Cinzel',serif",
              letterSpacing: ".06em", marginBottom: 3 }}>NEXT Lv{level + 1}</div>
            <div style={{ fontSize: 9, color: "#a0c080", fontFamily: "'Crimson Pro',serif" }}>
              {skillDef.nextDesc(level)}
            </div>
          </div>
        )}
      </div>

      {atMax ? (
        <div style={{ textAlign: "center", padding: "10px 0",
          fontFamily: "'Cinzel',serif", fontSize: 9, color: accent,
          letterSpacing: ".08em" }}>✦ MAX LEVEL ✦</div>
      ) : (
        <button onClick={() => { if (canLevelUp) { onLevelUp(); onClose(); } }}
          disabled={!canLevelUp}
          style={{
            width: "100%", padding: "11px 0",
            background: canLevelUp ? `linear-gradient(135deg,${color}30,${color}18)` : "rgba(255,255,255,.02)",
            border: `1px solid ${canLevelUp ? color + "60" : gateLocked ? "rgba(200,120,40,.35)" : "#1e1810"}`,
            borderRadius: 6, cursor: canLevelUp ? "pointer" : "not-allowed",
            fontFamily: "'Cinzel',serif", fontSize: 10, fontWeight: 700,
            color: canLevelUp ? accent : gateLocked ? "#c07830" : "#2e2418",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all .15s", opacity: canLevelUp ? 1 : 0.7,
          }}>
          <span style={{ fontSize: 14 }}>{gateLocked ? "🔒" : "✦"}</span>
          {canLevelUp
            ? "Upgrade (1 point)"
            : gateLocked
              ? "Upgrade main skill first"
              : "No skill points available"}
        </button>
      )}
    </div>
  );
}
