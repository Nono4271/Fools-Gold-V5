export function Connector({ x1, y1, x2, y2, color, lit, dashed }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={lit ? color : "#2a2010"}
      strokeWidth={lit ? 2.5 : 1.5}
      strokeDasharray={dashed ? "5 4" : undefined}
      opacity={lit ? 0.9 : 0.35}
      style={{ transition: "all 0.3s" }}
    />
  );
}

export function LevelPips({ cx, cy, r, level, maxLevel, color, accent }) {
  if (level <= 0) return null;
  return Array.from({ length: maxLevel }, (_, i) => {
    const a = (i / maxLevel) * Math.PI * 2 - Math.PI / 2;
    const pr = r * 1.38;
    const lit = i < level;
    return (
      <circle key={i}
        cx={cx + pr * Math.cos(a)} cy={cy + pr * Math.sin(a)}
        r={2.2}
        fill={lit ? accent : "#1a2a1a"}
        opacity={lit ? 1 : 0.4}
      />
    );
  });
}

export function SpineSep({ color, lit }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", height: 26, position: "relative", pointerEvents: "none" }}>
      <svg width={4} height={26} style={{ overflow: "visible" }}>
        <line x1={2} y1={0} x2={2} y2={26}
          stroke={lit ? color : "#1e2a1a"} strokeWidth={2}
          strokeDasharray="3 5" opacity={lit ? 0.7 : 0.22}
          style={{ transition: "all 0.4s" }} />
        {lit && <circle cx={2} cy={13} r={3} fill={color} opacity={0.55} />}
      </svg>
    </div>
  );
}
