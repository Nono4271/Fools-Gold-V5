export default function FactionNode({ faction, size, filled, color, accent, locked, isMain, selected }) {
  const s   = size;
  const cx  = s / 2, cy = s / 2, r = s * 0.42;
  const gradId = `fng-${faction}-${size}-${filled ? 1 : 0}-${selected ? 1 : 0}`;

  const shapeProps = {
    fill:        locked ? "#111" : filled ? `url(#${gradId})` : "#0d0d0d",
    stroke:      locked ? "#2a2010" : selected ? accent : color,
    strokeWidth: selected ? 2.5 : isMain ? 2 : 1.5,
    style:       { transition: "all 0.2s", filter: (!locked && (filled || selected)) ? `drop-shadow(0 0 4px ${color}99)` : "none" },
  };

  function Shape() {
    switch (faction) {
      case "dragons":
        return <ellipse cx={cx} cy={cy + r * 0.08} rx={r * 0.74} ry={r * 1.02} {...shapeProps} />;

      case "pirates": {
        const spokes = 8, outerR = r * 0.97, innerR = r * 0.42, rimW = r * 0.16;
        return (
          <g>
            <circle cx={cx} cy={cy} r={outerR} fill={shapeProps.fill}
              stroke={shapeProps.stroke} strokeWidth={rimW} style={shapeProps.style} />
            {Array.from({ length: spokes }, (_, i) => {
              const a = (i / spokes) * Math.PI * 2;
              return <line key={i}
                x1={cx + innerR * Math.cos(a)} y1={cy + innerR * Math.sin(a)}
                x2={cx + (outerR - rimW) * Math.cos(a)} y2={cy + (outerR - rimW) * Math.sin(a)}
                stroke={shapeProps.stroke} strokeWidth={shapeProps.strokeWidth * 0.9} strokeLinecap="round" />;
            })}
            <circle cx={cx} cy={cy} r={innerR} fill={shapeProps.fill}
              stroke={shapeProps.stroke} strokeWidth={shapeProps.strokeWidth} />
          </g>
        );
      }

      case "marines": {
        const d = `M ${cx} ${cy-r} L ${cx+r*.92} ${cy-r*.28} Q ${cx+r*.92} ${cy+r*.55} ${cx} ${cy+r} Q ${cx-r*.92} ${cy+r*.55} ${cx-r*.92} ${cy-r*.28} Z`;
        return <path d={d} {...shapeProps} />;
      }

      case "bountyhunters": {
        const bRx = r*.90, bRy = r*.72, bCy = cy + r*.12;
        const rimCy = bCy - bRy + r*.08, baseY = bCy + bRy*.82;
        return (
          <g>
            <ellipse cx={cx} cy={bCy} rx={bRx} ry={bRy} {...shapeProps} />
            <ellipse cx={cx} cy={rimCy} rx={r*.80} ry={r*.16}
              fill={shapeProps.fill} stroke={shapeProps.stroke} strokeWidth={shapeProps.strokeWidth*.8} />
            <rect x={cx-r*.5}  y={baseY} width={r*.22} height={r*.22} rx={r*.05}
              fill={shapeProps.fill} stroke={shapeProps.stroke} strokeWidth={shapeProps.strokeWidth*.7} />
            <rect x={cx+r*.28} y={baseY} width={r*.22} height={r*.22} rx={r*.05}
              fill={shapeProps.fill} stroke={shapeProps.stroke} strokeWidth={shapeProps.strokeWidth*.7} />
          </g>
        );
      }

      case "merfolk": {
        const mRx = r*.72, mRy = r*.58, mCy = cy - r*.18;
        const tipBase = mCy + mRy*.85;
        const tips = [r*.88,r*1.02,r*1.10,r*1.05,r*1.10,r*1.02,r*.88,r*.72];
        return (
          <g>
            {tips.map((tip, i) => {
              const xf = (i / 7) - 0.5;
              const tx = cx + xf * r * 1.55;
              return <path key={i}
                d={`M ${cx+xf*mRx*1.6} ${tipBase} Q ${tx+xf*r*.18} ${tipBase+tip*.55} ${tx} ${tipBase+tip}`}
                fill="none" stroke={shapeProps.stroke} strokeWidth={shapeProps.strokeWidth*(1.1-i*.04)}
                strokeLinecap="round" opacity={0.85} />;
            })}
            <ellipse cx={cx} cy={mCy} rx={mRx} ry={mRy} {...shapeProps} />
            <polygon points={`${cx},${mCy-mRy-r*.22} ${cx-r*.18},${mCy-mRy+r*.08} ${cx+r*.18},${mCy-mRy+r*.08}`}
              fill={shapeProps.fill} stroke={shapeProps.stroke} strokeWidth={shapeProps.strokeWidth*.8} />
          </g>
        );
      }

      case "orcs": {
        const offsets=[1.0,.62,.95,.58,1.0,.65,.88,.55,1.0,.60,.92,.63,.97,.57,1.0,.61];
        const pts = offsets.map((o,i) => {
          const a = (i/16)*Math.PI*2 - Math.PI/2;
          return `${cx+r*o*Math.cos(a)},${cy+r*o*Math.sin(a)}`;
        }).join(" ");
        return <polygon points={pts} {...shapeProps} />;
      }

      default:
        return <circle cx={cx} cy={cy} r={r} {...shapeProps} />;
    }
  }

  return (
    <svg width={s} height={s} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <radialGradient id={gradId} cx="40%" cy="35%" r="65%">
          <stop offset="0%"   stopColor={accent} stopOpacity="0.9" />
          <stop offset="60%"  stopColor={color}  stopOpacity="0.7" />
          <stop offset="100%" stopColor="#000"   stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <Shape />
      {locked && (
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={s * 0.3} fill="#333">🔒</text>
      )}
    </svg>
  );
}
