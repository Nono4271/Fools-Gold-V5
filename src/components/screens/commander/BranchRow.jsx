import FactionNode from "./FactionNode.jsx";
import { Connector, LevelPips } from "./SkillTreePrimitives.jsx";

export default function BranchRow({
  faction, color, accent, locked,
  mainSkill, mainLvl,
  sideSkills, sideLvls, sideCaps,
  onNodeClick, selectedKey,
  label, tag, treeIcon, unlocksAt,
}) {
  const W = 340, H = 110;
  const spineX = W / 2;
  const mainY = H / 2;
  const mainSz = 62;
  const sideSz = 38;
  const sideOffX = 116;
  const leftX = spineX - sideOffX;
  const rightX = spineX + sideOffX;
  const mainFilled = mainLvl > 0;

  return (
    <div style={{ position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "0 14px 4px",
        opacity: locked ? 0.3 : 1,
      }}>
        <span style={{ fontSize: 10 }}>{treeIcon}</span>
        <span style={{
          fontFamily: "'Cinzel',serif", fontSize: 8, fontWeight: 700,
          letterSpacing: ".1em", textTransform: "uppercase",
          color: mainFilled && !locked ? accent : "#4a3a28",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          flex: 1,
        }}>{label}</span>
        <span style={{
          fontSize: 6, fontFamily: "'Cinzel',serif", letterSpacing: ".08em",
          color: locked ? "#cc303070" : mainFilled ? "#3daa60" : "#2a3020",
          border: `1px solid ${locked ? "#cc303040" : mainFilled ? "#3daa6040" : "#1e2a18"}`,
          padding: "1px 5px", borderRadius: 3, flexShrink: 0,
        }}>
          {locked ? `🔒 R${unlocksAt}` : tag}
        </span>
      </div>

      <svg width={W} height={H} style={{ display: "block", overflow: "visible", opacity: locked ? 0.32 : 1 }}>
        {mainFilled && !locked && (
          <ellipse cx={spineX} cy={mainY} rx={95} ry={45}
            fill={color} fillOpacity={0.055} />
        )}

        <Connector
          x1={spineX - mainSz / 2} y1={mainY}
          x2={leftX + sideSz / 2}  y2={mainY}
          color={color} lit={!locked && mainFilled} dashed={true}
        />
        <Connector
          x1={spineX + mainSz / 2} y1={mainY}
          x2={rightX - sideSz / 2} y2={mainY}
          color={color} lit={!locked && mainFilled} dashed={true}
        />

        {[0, 1].map(side => {
          const sk = sideSkills[side], lvl = sideLvls[side], cap = sideCaps[side];
          const nodeLocked = locked || !mainFilled;
          const sel = selectedKey === sk.key;
          const gateLocked = lvl >= cap;
          const x = side === 0 ? leftX : rightX;
          return (
            <g key={side} transform={`translate(${x - sideSz / 2},${mainY - sideSz / 2})`}
              onClick={() => !nodeLocked && onNodeClick(sk, false, gateLocked && lvl < 5)}
              style={{ cursor: nodeLocked ? "default" : "pointer" }}>
              <FactionNode faction={faction} size={sideSz}
                filled={lvl > 0} color={color} accent={accent}
                locked={nodeLocked} isMain={false} selected={sel} />
              <LevelPips cx={sideSz/2} cy={sideSz/2} r={sideSz*0.42}
                level={lvl} maxLevel={5} color={color} accent={accent} />
              {!nodeLocked && (
                <>
                  <text x={sideSz / 2} y={-8} textAnchor="middle"
                    fontSize={6} fill={lvl > 0 ? accent : "#3a2a18"}
                    fontFamily="'Cinzel',serif" letterSpacing=".03em">{sk.name}</text>
                  <text x={sideSz / 2} y={sideSz + 11} textAnchor="middle"
                    fontSize={7} fill={lvl > 0 ? color : "#2a2018"}
                    fontFamily="'Cinzel',serif">{lvl}/5</text>
                  {gateLocked && lvl < 5 && (
                    <text x={sideSz / 2} y={sideSz + 21} textAnchor="middle"
                      fontSize={5.5} fill="#c07830" fontFamily="'Cinzel',serif">🔒 need main lv{cap * 2}</text>
                  )}
                </>
              )}
            </g>
          );
        })}

        <g transform={`translate(${spineX - mainSz / 2},${mainY - mainSz / 2})`}
          onClick={() => !locked && onNodeClick(mainSkill, true, false)}
          style={{ cursor: locked ? "default" : "pointer" }}>
          <FactionNode faction={faction} size={mainSz}
            filled={mainFilled} color={color} accent={accent}
            locked={locked} isMain={true} selected={selectedKey === mainSkill.key} />
          <LevelPips cx={mainSz/2} cy={mainSz/2} r={mainSz*0.42}
            level={mainLvl} maxLevel={10} color={color} accent={accent} />
          {!locked && (
            <>
              <text x={mainSz / 2} y={mainSz / 2 + 7} textAnchor="middle"
                fontSize={20} style={{ pointerEvents: "none" }}>{mainSkill.icon}</text>
              <text x={mainSz / 2} y={mainSz + 14} textAnchor="middle"
                fontSize={7.5} fill={mainFilled ? accent : "#6a5a3a"}
                fontFamily="'Cinzel',serif" fontWeight={mainFilled ? "700" : "400"}>
                {mainSkill.name}
              </text>
              <text x={mainSz / 2} y={mainSz + 25} textAnchor="middle"
                fontSize={7} fill={mainFilled ? color : "#3a2a18"}
                fontFamily="'Cinzel',serif">{mainLvl}/10</text>
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
