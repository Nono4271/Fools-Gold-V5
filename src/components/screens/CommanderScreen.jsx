import { useState, useEffect } from "react";
import { applyGearToCmd } from "../../../shared/utils/gearStats.js";
import { CSS } from "../../constants/css.js";
import {
  RARITY, CLASS, SKILL_TREES,
  getCommanderTrees, getTreeDisplayNames,
  respectCost, RESPECT_MAX, PROMO,
  PLAYABLE_FACTIONS, ALIGNMENT, addRespect,
  SUBSPECIES, getSubspecies, getFactionAlignment,
  HDEFS,
} from "../../../shared/constants/heroes.js";
import {
  MAIN_SKILLS, SIDE_SKILLS,
  getBranchMainSkill, getBranchSideSkills,
} from "../../../shared/constants/skills.js";

const GEAR_RARITY_COLORS = { common: "#8a8a8a", rare: "#4488cc", epic: "#a855f7", legendary: "#f0c040" };
import { GEAR_SLOTS, GEAR_RARITY } from "../../../shared/constants/gear.js";
import { CMD_LVL_MAX, xpToNext } from "../../../shared/constants/troops.js";
import { cmdCommand } from "../../../shared/constants/buildings.js";

/* ─────────────────────────────────────────────────────────────────────────────
   CommanderScreen — fullscreen commander roster + detail
   Opened directly from GameBar portrait taps. No HQ chrome.
   Visual language: reference screenshot palette adapted to Fool's Gold.
───────────────────────────────────────────────────────────────────────────── */

const RARITY_ORDER = { champion: 0, veteran: 1, soldier: 2 };

function getRespectInfo(cmd) {
  const rLvl = cmd.respectLevel ?? 0;
  const rPts = cmd.respectPoints ?? 0;
  let spent = 0;
  for (let i = 0; i < rLvl; i++) spent += respectCost(i);
  const intoLvl = rPts - spent;
  const cost = respectCost(Math.min(rLvl, RESPECT_MAX - 1));
  const pct = rLvl >= RESPECT_MAX ? 100 : Math.min(100, Math.round((intoLvl / cost) * 100));
  return { rLvl, intoLvl, cost, pct };
}

// ── Faction colour + shape map ────────────────────────────────────────────────
const FACTION_THEME = {
  pirates:       { color: "#d4832a", accent: "#ffc060" },
  bountyhunters: { color: "#9955dd", accent: "#cc88ff" },
  orcs:          { color: "#6aa830", accent: "#aaff66" },
  dragons:       { color: "#cc3030", accent: "#ff8855" },
};

// ── Faction-shaped SVG node ───────────────────────────────────────────────────
function FactionNode({ faction, size, filled, color, accent, locked, isMain, selected }) {
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
      case "dragons": // egg — wide belly, narrow top
        return <ellipse cx={cx} cy={cy + r * 0.08} rx={r * 0.74} ry={r * 1.02} {...shapeProps} />;

      case "pirates": { // ship's wheel
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

      case "bountyhunters": { // cauldron
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


      case "orcs": { // jagged starburst
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

// ── SVG connector line ────────────────────────────────────────────────────────
function Connector({ x1, y1, x2, y2, color, lit, dashed }) {
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

// ── Skill info panel (shown when a node is tapped) ────────────────────────────
function SkillInfoPanel({ skillDef, isMain, level, maxLevel, color, accent, canLevelUp, gateLocked, branchLocked, onLevelUp, onClose }) {
  if (!skillDef) return null;
  const atMax = level >= maxLevel;
  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0,
      background: "rgba(6,4,2,.97)",
      border: `1px solid ${color}40`,
      borderRadius: "12px 12px 0 0",
      padding: "14px 16px 20px",
      zIndex: 9300,
      boxShadow: `0 -8px 32px ${color}18`,
      animation: "fadeUp .18s ease",
    }}>
      {/* drag handle + close */}
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

      {/* level pips */}
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

      {/* desc */}
      <div style={{ fontSize: 10, color: "#7a6a50", fontFamily: "'Crimson Pro',serif",
        lineHeight: 1.5, marginBottom: 8 }}>{skillDef.desc}</div>

      {/* current / next */}
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

      {/* action button */}
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
          <span style={{ fontSize: 14 }}>{branchLocked ? "🔒" : gateLocked ? "🔒" : "✦"}</span>
          {canLevelUp
            ? "Upgrade (1 point)"
            : branchLocked
              ? "Skill locked — earn Respect to unlock"
              : gateLocked
                ? "Upgrade main skill first"
                : "No skill points available"}
        </button>
      )}
    </div>
  );
}

// ── Level pip ring around a node ──────────────────────────────────────────────
function LevelPips({ cx, cy, r, level, maxLevel, color, accent }) {
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

// ── Spine connector between branch rows ───────────────────────────────────────
function SpineSep({ color, lit }) {
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

// ── Single branch row: spine node + 2 flanking side nodes ─────────────────────
function BranchRow({
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
    <div style={{ position: "relative", overflow: "visible" }}>
      {/* Branch label row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "0 8px 2px",
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

      {/* SVG canvas */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible", opacity: locked ? 0.32 : 1, touchAction: "manipulation" }}>
        {/* ambient glow */}
        {mainFilled && !locked && (
          <ellipse cx={spineX} cy={mainY} rx={95} ry={45}
            fill={color} fillOpacity={0.055} />
        )}

        {/* connector: main → left */}
        <Connector
          x1={spineX - mainSz / 2} y1={mainY}
          x2={leftX + sideSz / 2}  y2={mainY}
          color={color} lit={!locked && mainFilled} dashed={true}
        />
        {/* connector: main → right */}
        <Connector
          x1={spineX + mainSz / 2} y1={mainY}
          x2={rightX - sideSz / 2} y2={mainY}
          color={color} lit={!locked && mainFilled} dashed={true}
        />

        {/* LEFT side node */}
        {(() => {
          const sk = sideSkills[0], lvl = sideLvls[0], cap = sideCaps[0];
          const nodeLocked = locked || !mainFilled;
          const sel = selectedKey === sk.key;
          const gateLocked = lvl >= cap;
          return (
            <g transform={`translate(${leftX - sideSz / 2},${mainY - sideSz / 2})`}
              onClick={() => onNodeClick(sk, false, gateLocked && lvl < 5, nodeLocked)}
              onTouchEnd={(e) => { e.preventDefault(); onNodeClick(sk, false, gateLocked && lvl < 5, nodeLocked); }}
              style={{ cursor: "pointer", touchAction: "manipulation" }}>
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
        })()}

        {/* RIGHT side node */}
        {(() => {
          const sk = sideSkills[1], lvl = sideLvls[1], cap = sideCaps[1];
          const nodeLocked = locked || !mainFilled;
          const sel = selectedKey === sk.key;
          const gateLocked = lvl >= cap;
          return (
            <g transform={`translate(${rightX - sideSz / 2},${mainY - sideSz / 2})`}
              onClick={() => onNodeClick(sk, false, gateLocked && lvl < 5, nodeLocked)}
              onTouchEnd={(e) => { e.preventDefault(); onNodeClick(sk, false, gateLocked && lvl < 5, nodeLocked); }}
              style={{ cursor: "pointer", touchAction: "manipulation" }}>
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
        })()}

        {/* MAIN spine node */}
        <g transform={`translate(${spineX - mainSz / 2},${mainY - mainSz / 2})`}
          onClick={() => onNodeClick(mainSkill, true, false, locked, null)}
          onTouchEnd={(e) => { e.preventDefault(); onNodeClick(mainSkill, true, false, locked, null); }}
          style={{ cursor: "pointer", touchAction: "manipulation" }}>
          <FactionNode faction={faction} size={mainSz}
            filled={mainFilled} color={color} accent={accent}
            locked={locked} isMain={true} selected={selectedKey === mainSkill.key} />
          <LevelPips cx={mainSz/2} cy={mainSz/2} r={mainSz*0.42}
            level={mainLvl} maxLevel={10} color={color} accent={accent} />
          <>
            <text x={mainSz / 2} y={mainSz / 2 + 7} textAnchor="middle"
              fontSize={locked ? 16 : 20} style={{ pointerEvents: "none" }}>
              {locked ? "🔒" : mainSkill.icon}
            </text>
            <text x={mainSz / 2} y={mainSz + 14} textAnchor="middle"
              fontSize={7.5} fill={locked ? "#5a4a30" : mainFilled ? accent : "#6a5a3a"}
              fontFamily="'Cinzel',serif" fontWeight={mainFilled && !locked ? "700" : "400"}>
              {mainSkill.name}
            </text>
            {!locked && (
              <text x={mainSz / 2} y={mainSz + 25} textAnchor="middle"
                fontSize={7} fill={mainFilled ? color : "#3a2a18"}
                fontFamily="'Cinzel',serif">{mainLvl}/10</text>
            )}
          </>
        </g>
      </svg>
    </div>
  );
}

// ── UTC date string helper (for daily respec tracking) ───────────────────────
function utcDateKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
}

// ── Skill tree overlay ────────────────────────────────────────────────────────
function SkillTreeOverlay({ cmd, setCmds, gems, setGems, onClose }) {
  const rLvl = cmd.respectLevel ?? 0;
  const rarityDef = RARITY[cmd.rarity] ?? RARITY.soldier;
  const skillPoints = cmd.skillPoints ?? {};
  const unspent = cmd.unspentSkillPoints ?? 0;
  const [respecError, setRespecError] = useState(null);

  // ── Respec logic ──────────────────────────────────────────────────────────
  const today = utcDateKey();
  const respecRecord = cmd.respecRecord ?? {}; // { dateKey, usedCount }
  const respecToday = respecRecord.dateKey === today ? (respecRecord.usedCount ?? 0) : 0;
  const FREE_RESPEC_LIMIT = 1;
  const PAID_RESPEC_LIMIT = 2;
  const RESPEC_GEM_COST   = 50;

  const canFreeRespec = respecToday < FREE_RESPEC_LIMIT;
  const canPaidRespec = !canFreeRespec && respecToday < PAID_RESPEC_LIMIT;
  const canRespec     = canFreeRespec || canPaidRespec;

  // Count total spent skill points to refund
  function totalSpentPoints(sp) {
    return Object.values(sp ?? {}).reduce((a, b) => a + b, 0);
  }

  function handleRespec() {
    if (!canRespec) return;
    if (canPaidRespec && gems < RESPEC_GEM_COST) {
      setRespecError(`Need ${RESPEC_GEM_COST} 💎 gems (you have ${gems})`);
      setTimeout(() => setRespecError(null), 3000);
      return;
    }

    const cost = canFreeRespec ? 0 : RESPEC_GEM_COST;
    if (cost > 0) setGems(g => g - cost);

    setCmds(prev => prev.map(c => {
      if (c.uid !== cmd.uid) return c;
      const refund = totalSpentPoints(c.skillPoints);
      return {
        ...c,
        skillPoints: {},
        unspentSkillPoints: (c.unspentSkillPoints ?? 0) + refund,
        respecRecord: { dateKey: today, usedCount: respecToday + 1 },
      };
    }));
    setRespecError(null);
  }

  // ── Side skill gatekeeping ────────────────────────────────────────────────
  // allowedSideLevel for a branch = floor(mainSkillLevel / 2)
  // e.g. main=0→side cap 0, main=2→side cap 1, main=4→side cap 2 …
  function getSideCap(mainSkillKey) {
    const liveSkillPts = cmd.skillPoints ?? {};
    const mainLvl = liveSkillPts[mainSkillKey] ?? 0;
    return Math.floor(mainLvl / 2);
  }

  function handleLevelUp(skillKey, mainSkillKeyForBranch) {
    if (unspent <= 0) return;
    setCmds(prev => prev.map(c => {
      if (c.uid !== cmd.uid) return c;
      const prev_pts = c.skillPoints ?? {};
      const curLvl = prev_pts[skillKey] ?? 0;
      const isMain = !!MAIN_SKILLS[skillKey];
      const maxLvl = isMain ? 10 : 5;
      if (curLvl >= maxLvl) return c;

      // Gatekeep side skills
      if (!isMain && mainSkillKeyForBranch) {
        const mainLvl = prev_pts[mainSkillKeyForBranch] ?? 0;
        const sideCap = Math.floor(mainLvl / 2);
        if (curLvl >= sideCap) return c; // blocked
      }

      return {
        ...c,
        skillPoints: { ...prev_pts, [skillKey]: curLvl + 1 },
        unspentSkillPoints: (c.unspentSkillPoints ?? 0) - 1,
      };
    }));
  }

  // ── Selected node state for info panel ───────────────────────────────────
  const [selectedNode, setSelectedNode] = useState(null);
  // selectedNode: { skillDef, isMain, skillKey, mainKeyForBranch, gateLocked }

  const factionTheme = FACTION_THEME[cmd.faction] ?? FACTION_THEME.pirates;
  const fColor = factionTheme.color;
  const fAccent = factionTheme.accent;

  function handleNodeClick(skillDef, isMain, gateLocked, branchLocked, mainKeyForBranch) {
    const key = skillDef.key;
    if (selectedNode?.skillKey === key) { setSelectedNode(null); return; }
    setSelectedNode({ skillDef, isMain, skillKey: key, mainKeyForBranch, gateLocked, branchLocked });
  }

  // Live read from cmds for reactivity
  const liveUnspent = cmd.unspentSkillPoints ?? 0;
  const liveSkillPts = cmd.skillPoints ?? {};
  const liveTotalSpent = totalSpentPoints(liveSkillPts);

  const { primary, secondary } = getCommanderTrees(cmd);
  const displayNames = getTreeDisplayNames(cmd.faction, cmd.cls);
  const treeEntries = [
    { treeKey: primary[0], label: displayNames[0], unlocksAt: 0, tag: "CLASS I",   branchIdx: 0 },
    { treeKey: primary[1] ?? primary[0], label: displayNames[1], unlocksAt: 0, tag: "CLASS II",  branchIdx: 1 },
    { treeKey: primary[2] ?? primary[0], label: displayNames[2], unlocksAt: 3, tag: "CLASS III", branchIdx: 2 },
    { treeKey: secondary, label: displayNames[3], unlocksAt: 5, tag: "LEGACY", branchIdx: 3 },
  ];

  // selected node's live data
  const selLevel   = selectedNode ? (liveSkillPts[selectedNode.skillKey] ?? 0) : 0;
  const selMaxLvl  = selectedNode?.isMain ? 10 : 5;
  const selCanUp   = liveUnspent > 0 && selLevel < selMaxLvl && !selectedNode?.gateLocked && !selectedNode?.branchLocked;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9200,
      background: `radial-gradient(ellipse at 50% 0%, #03100f 0%, #020608 55%, #010204 100%)`,
      display: "flex", flexDirection: "column",
      animation: "fadeUp .2s ease",
      touchAction: "auto",
    }}>
      {/* Atmospheric faction glow at top */}
      <div style={{
        position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)",
        width: 280, height: 160,
        background: `radial-gradient(ellipse, ${fColor}22 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap');${CSS}.skill-tree-scroll{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column}.skill-tree-grid{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:0}.skill-branch-sep{display:none!important}.skill-branch-inner{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;width:100%;overflow:visible}.skill-branch-inner svg{width:min(340px,100%)}.skill-branch-cell{display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:visible}.roster-scroll{touch-action:pan-y!important;-webkit-overflow-scrolling:touch}`}</style>

      {/* Header */}
      <div style={{
        padding: "12px 16px 10px",
        borderBottom: "1px solid #2a2010",
        background: `linear-gradient(180deg, ${fColor}0c, transparent)`,
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "rgba(255,255,255,.04)", border: "1px solid #2a2010",
          color: "#8a7a50", fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>←</button>
        <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{cmd.bust ? <img src={cmd.bust} alt={cmd.n} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : cmd.icon}</div>
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 14, color: "#e8dcc8" }}>
            {cmd.n}
          </div>
          <div style={{ fontSize: 8, color: fColor, fontFamily: "'Cinzel',serif", marginTop: 1 }}>
            SKILL TREES · R{rLvl} · Lv{cmd.lvl ?? 5}
          </div>
        </div>

        {/* Points badge */}
        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px",
          background: liveUnspent > 0 ? "rgba(240,192,64,.12)" : "rgba(255,255,255,.03)",
          border: `1px solid ${liveUnspent > 0 ? "rgba(240,192,64,.4)" : "#1e1810"}`,
          borderRadius: 4,
          boxShadow: liveUnspent > 0 ? "0 0 10px rgba(240,192,64,.2)" : "none",
          transition: "all .3s",
        }}>
          <span style={{ fontSize: 13 }}>✦</span>
          <div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, fontWeight: 700,
              color: liveUnspent > 0 ? "#f0c040" : "#3a3020" }}>{liveUnspent}</div>
            <div style={{ fontSize: 7, color: "#3a3020", fontFamily: "'Cinzel',serif" }}>pts</div>
          </div>
        </div>

        {/* Respec button */}
        {liveTotalSpent > 0 && (
          <button
            onClick={handleRespec}
            disabled={!canRespec}
            title={
              !canRespec
                ? "Both daily respecs used — resets at 00:00 UTC"
                : canFreeRespec
                  ? "Free daily respec"
                  : `Paid respec — ${RESPEC_GEM_COST} 💎`
            }
            style={{
              padding: "5px 8px", borderRadius: 4, cursor: canRespec ? "pointer" : "not-allowed",
              background: !canRespec ? "rgba(255,255,255,.02)"
                : canFreeRespec ? "rgba(61,170,96,.12)" : "rgba(100,120,220,.12)",
              border: `1px solid ${!canRespec ? "#1e1810" : canFreeRespec ? "#3daa6060" : "#6478dc60"}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
              opacity: canRespec ? 1 : 0.4, transition: "all .2s",
            }}
          >
            <span style={{ fontSize: 13 }}>↺</span>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 6, fontWeight: 700,
              color: !canRespec ? "#2a2010" : canFreeRespec ? "#3daa60" : "#8090e0",
              whiteSpace: "nowrap" }}>
              {!canRespec ? "USED" : canFreeRespec ? "FREE" : `${RESPEC_GEM_COST}💎`}
            </div>
          </button>
        )}
      </div>

      {/* Respec error toast */}
      {respecError && (
        <div style={{
          padding: "7px 16px", background: "rgba(200,50,50,.15)",
          border: "1px solid rgba(200,50,50,.4)", fontSize: 9, color: "#e07070",
          fontFamily: "'Cinzel',serif",
        }}>{respecError}</div>
      )}

      {/* Respec usage indicator */}
      <div style={{
        padding: "5px 16px", background: "rgba(0,0,0,.3)",
        borderBottom: "1px solid #1a1408",
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <span style={{ fontSize: 7, color: "#3a2e18", fontFamily: "'Cinzel',serif", letterSpacing: ".06em" }}>
          DAILY RESPEC
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {[0, 1].map(i => {
            const used = i < respecToday, isPaid = i === 1;
            return (
              <div key={i} style={{
                padding: "2px 7px", borderRadius: 3, fontSize: 7, fontFamily: "'Cinzel',serif",
                background: used ? "rgba(255,255,255,.03)" : isPaid ? "rgba(100,120,220,.1)" : "rgba(61,170,96,.1)",
                border: `1px solid ${used ? "#1e1810" : isPaid ? "#6478dc50" : "#3daa6050"}`,
                color: used ? "#2a2010" : isPaid ? "#8090e0" : "#3daa60",
                textDecoration: used ? "line-through" : "none",
              }}>{isPaid ? `${RESPEC_GEM_COST}💎` : "FREE"}</div>
            );
          })}
        </div>
        <span style={{ fontSize: 7, color: "#2a2010", fontFamily: "'Cinzel',serif", marginLeft: "auto" }}>
          resets 00:00 UTC
        </span>
      </div>

      <div className="skill-tree-scroll">

        <div className="skill-tree-grid" style={{ overflow: "visible" }}>
          {treeEntries.map(({ treeKey, label, unlocksAt, tag, branchIdx }, idx) => {
            const tree = SKILL_TREES[treeKey];
            if (!tree) return null;
            const locked     = rLvl < unlocksAt;
            const mainSkill  = getBranchMainSkill(treeKey, branchIdx, cmd);
            const sideSkills = getBranchSideSkills(treeKey, branchIdx, cmd);
            const mainLvl    = liveSkillPts[mainSkill.key] ?? 0;
            const sideLvls   = sideSkills.map(s => liveSkillPts[s.key] ?? 0);
            const sideCaps   = sideSkills.map(() => getSideCap(mainSkill.key));
            const prevActive = idx > 0 && (liveSkillPts[getBranchMainSkill(
              treeEntries[idx - 1].treeKey, treeEntries[idx - 1].branchIdx, cmd).key] ?? 0) > 0;

            return (
              <div key={`tree_${idx}`} className="skill-branch-cell">
                {/* Inter-branch spine separator */}
                {idx > 0 && <div className="skill-branch-sep"><SpineSep color={fColor} lit={prevActive} /></div>}

                <div className="skill-branch-inner">
                <BranchRow
                  faction={cmd.faction}
                  color={fColor}
                  accent={fAccent}
                  locked={locked}
                  mainSkill={mainSkill}
                  mainLvl={mainLvl}
                  sideSkills={sideSkills}
                  sideLvls={sideLvls}
                  sideCaps={sideCaps}
                  selectedKey={selectedNode?.skillKey}
                  label={label}
                  tag={tag}
                  treeIcon={tree.icon}
                  unlocksAt={unlocksAt}
                  onNodeClick={(sk, isMain, gL, nodeLk) =>
                    handleNodeClick(
                      isMain ? { ...mainSkill, ...MAIN_SKILLS[mainSkill.key] } : { ...sk, ...SIDE_SKILLS[sk.key] },
                      isMain,
                      gL,
                      nodeLk,
                      isMain ? null : mainSkill.key,
                    )
                  }
                />
                </div>
              </div>
            );
          })}
        </div>

        {/* Skill info panel — bottom sheet on tap */}
        {selectedNode && (() => {
          const liveLevel = liveSkillPts[selectedNode.skillKey] ?? 0;
          const maxLvl    = selectedNode.isMain ? 10 : 5;
          const liveGate  = selectedNode.isMain ? false :
            (selectedNode.mainKeyForBranch
              ? liveLevel >= getSideCap(selectedNode.mainKeyForBranch)
              : false);
          const canUp = liveUnspent > 0 && liveLevel < maxLvl && !liveGate && !selectedNode.branchLocked;
          return (
            <SkillInfoPanel
              skillDef={selectedNode.skillDef}
              isMain={selectedNode.isMain}
              level={liveLevel}
              maxLevel={maxLvl}
              color={fColor}
              accent={fAccent}
              canLevelUp={canUp}
              gateLocked={liveGate}
              branchLocked={selectedNode.branchLocked}
              onLevelUp={() => handleLevelUp(selectedNode.skillKey, selectedNode.mainKeyForBranch)}
              onClose={() => setSelectedNode(null)}
            />
          );
        })()}
      </div>
    </div>
  );
}

// ── Portrait circle (left roster column) ──────────────────────────────────────
function RosterPortrait({ cmd, selected, onClick, isLocked, isOppositeAlignment }) {
  const r = RARITY[cmd.rarity] ?? RARITY.soldier;
  const rLvl = cmd.respectLevel ?? 0;

  return (
    <div onClick={onClick} onTouchEnd={(e) => { e.preventDefault(); onClick(); }} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      padding: "8px 6px",
      borderRight: `2px solid ${selected ? r.color : "transparent"}`,
      background: selected ? `${r.color}10` : "transparent",
      cursor: "pointer", transition: "background .15s",
      position: "relative",
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
    }}>
      {/* Rarity ring */}
      <div style={{
        width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
        background: `conic-gradient(${r.color} 0deg, #140f06 80deg, ${r.color} 180deg, #140f06 260deg, ${r.color} 360deg)`,
        padding: selected ? 3 : 2,
        boxShadow: selected
          ? `0 0 0 1px ${r.color}, 0 0 18px ${r.color}50`
          : "0 2px 8px rgba(0,0,0,.8)",
        transition: "box-shadow .15s, padding .1s",
        position: "relative",
      }}>
        {/* Portrait face */}
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: `radial-gradient(circle at 38% 32%, ${r.color}25, #0c0a07)`,
          border: `1px solid ${r.color}45`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, overflow: "hidden", position: "relative",
          filter: (isLocked || isOppositeAlignment) ? "grayscale(1) brightness(0.45) sepia(0.1)" : "none",
        }}>
          {cmd.bust ? <img src={cmd.bust} alt={cmd.n} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} /> : cmd.icon}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "38%",
            background: "linear-gradient(to top, rgba(0,0,0,.75), transparent)",
          }} />
        </div>

        {/* Level chip — top left */}
        <div style={{
          position: "absolute", top: -3, left: -3,
          padding: "1px 4px", borderRadius: 3,
          background: "linear-gradient(135deg,#1c1408,#0a0805)",
          border: `1px solid ${r.color}55`,
          fontFamily: "'Cinzel',serif", fontSize: 7, fontWeight: 700, color: r.color,
        }}>{cmd.lvl ?? 5}</div>

        {/* March dot — top right */}
        {cmd.march && (
          <div style={{
            position: "absolute", top: -2, right: -2,
            width: 14, height: 14, borderRadius: "50%",
            background: cmd.march.type === "attack" ? "#cc3030" : "#3daa60",
            border: "1px solid #0c0a07",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7,
          }}>{cmd.march.type === "attack" ? "⚔" : "→"}</div>
        )}

        {/* Respect pip — bottom */}
        <div style={{
          position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
          padding: "1px 5px", borderRadius: 8,
          background: "#0c0a07", border: `1px solid ${r.color}45`,
          fontFamily: "'Cinzel',serif", fontSize: 6, color: r.color, whiteSpace: "nowrap",
        }}>R{rLvl}</div>
      </div>

      {/* First name label */}
      <div style={{
        fontFamily: "'Cinzel',serif", fontSize: 7, marginTop: 2,
        color: selected ? ((isLocked || isOppositeAlignment) ? "#777" : r.color) : "#4a3a28",
        textAlign: "center", maxWidth: 64,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        transition: "color .15s",
      }}>{cmd.n.split(" ")[0]}</div>
      {/* Opposite alignment warning */}
      {isOppositeAlignment && (
        <div style={{
          fontSize: 5, color: "#cc4040", fontFamily: "'Cinzel',serif",
          textAlign: "center", lineHeight: 1.2, maxWidth: 64, marginTop: -3,
        }}>OPP. ALIGN.</div>
      )}
    </div>
  );
}

// ── Commander detail (right panel) ────────────────────────────────────────────
function CommanderDetail({ cmd, bldgs, gearInventory, setGearInventory, respectSchematics, setCmds, onSchematicUsed, gems, setGems }) {
  const [showSkills, setShowSkills] = useState(false);
  const [showSchematics, setShowSchematics] = useState(false);
  const [showClassPopup, setShowClassPopup] = useState(null);
  const [previewGear, setPreviewGear] = useState(null); // { piece, slotKey } — gear stat preview before equip

  // Enable pan-y scrolling on the gear picker (same pattern as GachaScreen)
  const gearSlots = ["helmet","armor","bracers","accessory"];
  const isGearPickerOpen = gearSlots.includes(showClassPopup);
  useEffect(() => {
    if (isGearPickerOpen) {
      document.documentElement.classList.add("gacha-open");
    } else {
      document.documentElement.classList.remove("gacha-open");
    }
    return () => document.documentElement.classList.remove("gacha-open");
  }, [isGearPickerOpen]);
  const r = RARITY[cmd.rarity] ?? RARITY.soldier;
  const cls = CLASS[cmd.cls];
  const faction = PLAYABLE_FACTIONS.find(f => f.key === cmd.faction);
  const { rLvl, intoLvl, cost, pct } = getRespectInfo(cmd);
  const promoInfo = PROMO[cmd.rarity];
  const lvl = cmd.lvl ?? 5;
  const xpNeeded = lvl < CMD_LVL_MAX ? xpToNext(lvl) : null;
  const xpPct = xpNeeded ? Math.min(100, Math.round(((cmd.xp ?? 0) / xpNeeded) * 100)) : 100;
  const cmdCap = cmdCommand(lvl, bldgs?.commandcenter ?? 0, (cmd.cls==="leader"&&lvl>=25)?500:0);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {showSkills && <SkillTreeOverlay cmd={cmd} setCmds={setCmds} gems={gems} setGems={setGems} onClose={() => setShowSkills(false)} />}

      {/* ── Identity chips + bars ── */}
      <div style={{
        padding: "8px 14px 6px",
        background: `linear-gradient(160deg, ${r.color}0c 0%, transparent 55%)`,
        borderBottom: "1px solid #1c1610",
        flexShrink: 0,
      }}>
        {/* Chips — single nowrap scrollable line */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", flexWrap: "nowrap",
          scrollbarWidth: "none", WebkitOverflowScrolling: "touch", position: "relative",
          msOverflowStyle: "none", marginBottom: 6 }}>
          {cls && (
            <div
              onClick={() => setShowClassPopup(showClassPopup === "class" ? null : "class")}
              style={{
                display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
                padding: "2px 7px",
                background: showClassPopup === "class" ? `${r.color}18` : "rgba(255,255,255,.04)",
                border: `1px solid ${r.color}${showClassPopup === "class" ? "70" : "45"}`,
                borderRadius: 3, cursor: "pointer",
              }}>
              <span style={{ fontSize: 11 }}>{cls.icon}</span>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: 8, fontWeight: 700,
                color: r.color }}>{cls.n}</span>
              <span style={{ fontSize: 6, color: r.color, opacity: 0.6 }}>ⓘ</span>
              {/* Class popup */}
              {showClassPopup === "class" && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
                  width: 220, padding: "10px 12px",
                  background: "#0e0c09", border: `1px solid ${r.color}40`,
                  borderRadius: 6, boxShadow: `0 4px 20px rgba(0,0,0,.7)`,
                  animation: "fadeUp .12s ease",
                }}>
                  <div style={{ fontSize: 7, color: r.color, fontFamily: "'Cinzel',serif",
                    letterSpacing: ".08em", marginBottom: 4 }}>
                    {cls.icon} {cls.n.toUpperCase()} CLASS
                  </div>
                  <div style={{ fontSize: 9, fontFamily: "'Crimson Pro',serif",
                    color: "#7a6a50", lineHeight: 1.5, marginBottom: 8 }}>{cls.desc}</div>
                  <div style={{ fontSize: 7, color: lvl >= 25 ? "#f0c040" : "#5a4a2a",
                    fontFamily: "'Cinzel',serif", letterSpacing: ".08em", marginBottom: 4 }}>
                    ⭐ LV25 BONUS{lvl >= 25 ? " — ACTIVE" : ` — unlocks at Lv25`}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: "'Crimson Pro',serif",
                    color: lvl >= 25 ? "#c0a070" : "#3a3020", lineHeight: 1.5 }}>{cls.bonus}</div>
                </div>
              )}
            </div>
          )}
          {faction && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
              padding: "2px 7px", borderRadius: 3,
              background: `${faction.c}12`, border: `1px solid ${faction.c}35` }}>
              <span style={{ fontSize: 9 }}>{faction.s}</span>
              <span style={{ fontSize: 7, color: faction.c, fontFamily: "'Cinzel',serif" }}>{faction.n}</span>
            </div>
          )}
          <div style={{
            padding: "2px 7px", borderRadius: 3, flexShrink: 0,
            background: `${r.color}12`, border: `1px solid ${r.color}45`,
            fontSize: 7, color: r.color, fontFamily: "'Cinzel',serif", fontWeight: 700,
          }}>{r.n}</div>
          {(() => {
            const sub = getSubspecies(cmd.faction, cmd.rarity);
            if (!sub) return null;
            return (
              <div style={{
                padding: "2px 7px", borderRadius: 3, flexShrink: 0,
                background: "rgba(255,255,255,.04)", border: "1px solid #2a2010",
                fontSize: 7, color: "#8a7a50", fontFamily: "'Cinzel',serif",
              }}>◈ {sub}</div>
            );
          })()}
          {(() => {
            const alnKey = getFactionAlignment(cmd.faction);
            const aln = ALIGNMENT[alnKey];
            if (!aln) return null;
            return (
              <div style={{
                padding: "2px 7px", borderRadius: 3, flexShrink: 0,
                background: "rgba(255,255,255,.03)", border: "1px solid #241c10",
                fontSize: 7, color: "#5a4a30", fontFamily: "'Cinzel',serif",
              }}>{aln.icon} {aln.n}</div>
            );
          })()}
        </div>

        {/* Respect bar */}
        {(() => {
          // Pulsing glow when within 1 level of promotion threshold
          const nextPromo = promoInfo?.respectRequired;
          const atPromoThreshold = nextPromo && rLvl >= nextPromo - 1 && rLvl < nextPromo;
          const atMaxPromo = rLvl >= (promoInfo?.respectRequired ?? RESPECT_MAX) || !promoInfo?.to;
          const barGlows = atPromoThreshold || pct >= 90;
          return (
            <div style={{ marginTop: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 11 }}>⚜</span>
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700,
                    color: r.color }}>R{rLvl}</span>
                  {promoInfo?.to && rLvl < promoInfo.respectRequired && (
                    <span style={{ fontSize: 7, color: "#3a3228", fontFamily: "'Cinzel',serif" }}>
                      → {RARITY[promoInfo.to]?.n} at R{promoInfo.respectRequired}
                    </span>
                  )}
                  {/* + button to apply schematics */}
                  {rLvl < RESPECT_MAX && (
                    <button onClick={() => setShowSchematics(s => !s)} style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: showSchematics ? `${r.color}30` : "rgba(255,255,255,.05)",
                      border: `1px solid ${r.color}50`,
                      color: r.color, fontSize: 13, lineHeight: 1,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, flexShrink: 0,
                      boxShadow: (respectSchematics?.length > 0) ? `0 0 6px ${r.color}50` : "none",
                    }}>+</button>
                  )}
                </div>
                <span style={{ fontSize: 8, color: "#4a3a28", fontFamily: "'Cinzel',serif" }}>
                  {rLvl < RESPECT_MAX ? `${intoLvl} / ${cost} pts` : "Max Respect"}
                </span>
              </div>

              {/* Schematic picker */}
              {showSchematics && (
                <div style={{
                  marginBottom: 8, padding: "8px 10px",
                  background: "rgba(0,0,0,.4)", border: `1px solid ${r.color}28`,
                  borderRadius: 6, animation: "fadeUp .15s ease",
                }}>
                  {!respectSchematics?.length ? (
                    <div style={{ fontSize: 8, color: "#3a2e18", fontFamily: "'Crimson Pro',serif",
                      fontStyle: "italic" }}>No schematics in inventory</div>
                  ) : (() => {
                    // Fix: only show schematics usable by this commander (generic ones or matching commanderId)
                    const applicable = respectSchematics.filter(sc =>
                      sc.isGeneric || !sc.commanderId || sc.commanderId === cmd.id
                    );
                    if (!applicable.length) return (
                      <div style={{ fontSize: 8, color: "#3a2e18", fontFamily: "'Crimson Pro',serif",
                        fontStyle: "italic" }}>No schematics for this commander</div>
                    );
                    return (
                      <>
                        <div style={{ fontSize: 7, color: "#5a4a2a", fontFamily: "'Cinzel',serif",
                          letterSpacing: ".06em", marginBottom: 6 }}>
                          APPLY SCHEMATIC — {applicable.length} available
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {applicable.map(sc => {
                            const scColor = sc.rarity === "champion" ? "#f0c040" : sc.rarity === "veteran" ? "#a855f7" : "#4488cc";
                            return (
                              <button key={sc.instanceId} onClick={() => {
                                setCmds(prev => prev.map(c => {
                                  if (c.uid !== cmd.uid) return c;
                                  const updated = addRespect(c, sc.points);
                                  return { ...updated, _justPromoted: null };
                                }));
                                // Remove schematic from inventory — passed up via setter
                                if (onSchematicUsed) onSchematicUsed(sc.instanceId);
                                setShowSchematics(false);
                              }} style={{
                                padding: "6px 10px", textAlign: "left",
                                background: `${scColor}10`, border: `1px solid ${scColor}35`,
                                borderRadius: 4, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 8,
                              }}>
                                <span style={{ fontSize: 16 }}>{sc.icon}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9,
                                    color: scColor, fontWeight: 700 }}>+{sc.points} Respect pts</div>
                                  <div style={{ fontSize: 7, color: "#4a3a28",
                                    fontFamily: "'Cinzel',serif" }}>
                                    {sc.rarity.charAt(0).toUpperCase() + sc.rarity.slice(1)} Schematic
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Bar — pulses when near promotion */}
              <div style={{
                height: 6, background: "#0c0905", borderRadius: 3,
                border: `1px solid ${barGlows ? r.color + "50" : "#241c0e"}`,
                overflow: "hidden", position: "relative",
                boxShadow: barGlows ? `0 0 10px ${r.color}40` : "none",
                transition: "box-shadow .3s",
              }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: `linear-gradient(90deg, ${r.color}88, ${r.color})`,
                  borderRadius: 3, transition: "width .4s ease",
                  boxShadow: `0 0 8px ${r.color}55`,
                  animation: barGlows ? "pulse 1.8s ease-in-out infinite" : "none",
                }} />
                {[25, 50, 75].map(p => (
                  <div key={p} style={{ position: "absolute", top: 0, bottom: 0, left: `${p}%`,
                    width: 1, background: "rgba(0,0,0,.5)" }} />
                ))}
              </div>
            </div>
          );
        })()}

        {/* XP bar */}
        <div style={{ marginTop: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#6a6040" }}>
              Lv.{lvl} / Lv.{CMD_LVL_MAX}
            </span>
            {xpNeeded && (
              <span style={{ fontSize: 8, color: "#3a3020", fontFamily: "'Cinzel',serif" }}>
                {cmd.xp ?? 0} / {xpNeeded} XP
              </span>
            )}
          </div>
          <div style={{ height: 3, background: "#0c0905", borderRadius: 2,
            border: "1px solid #1c1408", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${xpPct}%`,
              background: "linear-gradient(90deg,#8a6020,#f0c040)",
              borderRadius: 2, transition: "width .4s" }} />
          </div>
        </div>
      </div>

      {/* ── 4-stat row ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        borderBottom: "1px solid #1a1510", background: "#090805", flexShrink: 0,
        position: "relative",
      }}>
        {(() => {
          const bc = applyGearToCmd(cmd, gearInventory);
          const GROWTH = {
            attacker: { ATK: 1.5, FOC: 0.2, SPD: 0.6 },
            defender: { ATK: 0.7, FOC: 1.1, SPD: 0.3 },
            support:  { ATK: 0.2, FOC: 1.3, SPD: 0.8 },
            leader:   { ATK: 0.8, FOC: 0.8, SPD: 0.8 },
          };
          const growth = GROWTH[cmd.cls] ?? GROWTH.leader;
          return [
          { icon: "⚔",  label: "ATK", val: Math.round(bc.atk ?? 0), color: "#e08050", growth: growth.ATK },
          { icon: "✦",  label: "FOC", val: Math.round(bc.foc ?? 0), color: "#aa66ff", growth: growth.FOC },
          { icon: "💨", label: "SPD", val: Math.round(bc.spd ?? 0), color: "#40a8e0", growth: growth.SPD },
          { icon: "📡", label: "CMD", val: cmdCap,                   color: "#60c0a0", growth: null },
        ]})().map(({ icon, label, val, color, growth }) => (
          <div key={label}
            onClick={() => growth != null && setShowClassPopup(showClassPopup === `stat_${label}` ? null : `stat_${label}`)}
            style={{
              padding: "6px 0", textAlign: "center",
              borderRight: "1px solid #161210",
              cursor: growth != null ? "pointer" : "default",
              position: "relative",
              background: showClassPopup === `stat_${label}` ? "rgba(255,255,255,.04)" : "transparent",
            }}>
            <div style={{ fontSize: 12, marginBottom: 2 }}>{icon}</div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 6, color: "#3a3020", fontFamily: "'Cinzel',serif",
              letterSpacing: ".07em", marginTop: 3 }}>{label}{growth != null && <span style={{ color: "#3a3020" }}> ▴</span>}</div>

            {/* Per-level growth popup */}
            {showClassPopup === `stat_${label}` && growth != null && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                background: "#12100a", border: "1px solid #f0c04044", borderRadius: 5,
                padding: "8px 12px", zIndex: 50, whiteSpace: "nowrap",
                boxShadow: "0 4px 20px rgba(0,0,0,.8)",
              }}>
                <div style={{ fontSize: 7, color: "#6a5a38", fontFamily: "'Cinzel',serif", letterSpacing: ".08em", marginBottom: 4 }}>
                  {label} GROWTH
                </div>
                <div style={{ fontSize: 11, color: color, fontFamily: "'Cinzel',serif", fontWeight: 700 }}>
                  +{growth} per level
                </div>
                <div style={{ fontSize: 7, color: "#4a3a28", marginTop: 3, fontFamily: "'Crimson Pro',serif" }}>
                  ({cmd.cls} class)
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Stamina ── */}
      {(() => {
        const stam = cmd.stamina ?? 200;
        const sc = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";
        return (
          <div style={{ padding: "4px 14px", borderBottom: "1px solid #161210" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 7, color: "#8a7a60", letterSpacing: ".08em" }}>⚡ STAMINA</div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, color: sc, fontWeight: 700 }}>{Math.floor(stam)} / 200</div>
            </div>
            <div style={{ height: 4, background: "rgba(0,0,0,.5)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(stam / 200) * 100}%`, background: sc, borderRadius: 3, transition: "width .3s" }}/>
            </div>
          </div>
        );
      })()}

      {/* ── March status ── */}
      {cmd.march && (() => {
        const eta = Math.ceil((cmd.march.path.length - cmd.march.step - 1) * cmd.march.stepMs / 1000);
        const atk = cmd.march.type === "attack";
        return (
          <div style={{
            margin: "10px 18px 0", padding: "8px 12px", flexShrink: 0,
            background: atk ? "rgba(200,30,30,.08)" : "rgba(40,140,80,.08)",
            border: `1px solid ${atk ? "#cc303038" : "#3daa6038"}`, borderRadius: 5,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>{atk ? "⚔" : "🚶"}</span>
            <div>
              <div style={{ fontSize: 9, fontFamily: "'Cinzel',serif", fontWeight: 700,
                color: atk ? "#e06060" : "#60c880" }}>
                {atk ? "Attacking" : "Marching"} · ~{eta}s
              </div>
              <div style={{ fontSize: 7, color: "#3a3028", fontFamily: "'Cinzel',serif", marginTop: 1 }}>
                → {cmd.march.dest}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Gear slots ── */}
      {(() => {
        const SLOT_DEFS = { helmet:{n:"Helmet",icon:"⛑"}, armor:{n:"Armor",icon:"🛡"}, bracers:{n:"Bracers",icon:"🥊"}, accessory:{n:"Accessory",icon:"💍"} };
        const STAT_ICONS = { ATK:"⚔", FOC:"✦", SPD:"💨", ARMY_ATK:"⚔🛡", ARMY_FOC:"✦🛡", ARMY_SPD:"💨🛡", ARMY_SIEGE:"🪨🛡" };

        const handleEquip = (piece) => {
          const currentInSlot = cmd.gear?.[piece.slot];
          if (setGearInventory) setGearInventory(prev => prev.map(g => {
            if (g.instanceId === piece.instanceId) return { ...g, equippedBy: cmd.uid };
            if (currentInSlot && g.instanceId === currentInSlot) return { ...g, equippedBy: null };
            return g;
          }));
          if (setCmds) setCmds(prev => prev.map(c =>
            c.uid === cmd.uid ? { ...c, gear: { ...(c.gear ?? {}), [piece.slot]: piece.instanceId } } : c
          ));
        };

        const handleUnequip = (slotKey) => {
          const equippedId = cmd.gear?.[slotKey];
          if (!equippedId) return;
          if (setGearInventory) setGearInventory(prev => prev.map(g =>
            g.instanceId === equippedId ? { ...g, equippedBy: null } : g
          ));
          if (setCmds) setCmds(prev => prev.map(c =>
            c.uid === cmd.uid ? { ...c, gear: { ...(c.gear ?? {}), [slotKey]: null } } : c
          ));
        };

        const hasAnyGear = ["helmet","armor","bracers","accessory"].some(s => cmd.gear?.[s]);

        return (
          <div style={{ margin: "0 14px 2px", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 7, color: "#3a3020", fontFamily: "'Cinzel',serif", letterSpacing: ".08em" }}>GEAR</div>
              {hasAnyGear && (
                <button onClick={() => {
                  if (setGearInventory) setGearInventory(prev => prev.map(g => g.equippedBy === cmd.uid ? { ...g, equippedBy: null } : g));
                  if (setCmds) setCmds(prev => prev.map(c => c.uid === cmd.uid ? { ...c, gear: { helmet:null, armor:null, bracers:null, accessory:null } } : c));
                }} style={{
                  padding: "2px 8px", borderRadius: 3,
                  background: "rgba(180,60,60,.1)", border: "1px solid rgba(180,60,60,.3)",
                  color: "#aa5050", fontFamily: "'Cinzel',serif", fontSize: 7, cursor: "pointer",
                }}>Unequip All</button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
              {["helmet","armor","bracers","accessory"].map(slotKey => {
                const equippedId = cmd.gear?.[slotKey];
                const piece = equippedId ? (gearInventory ?? []).find(g => g.instanceId === equippedId) : null;
                const slotDef = SLOT_DEFS[slotKey];
                const rc = piece ? (GEAR_RARITY_COLORS[piece.rarity] ?? "#888") : null;
                const isOpen = showClassPopup === slotKey;

                // Primary stat value for display
                const pBase = { ATK:7, FOC:7, SPD:7 };
                const rarityMult = piece ? ({ common:1, rare:1.4, epic:2.0, legendary:3.0 }[piece.rarity] ?? 1) : 1;
                const pVal = piece ? Math.round((pBase[piece.primaryStat] ?? 7) * rarityMult * (1 + (piece.stars ?? 0) * 0.12)) : null;

                // Available pieces for this slot (unequipped OR equipped by this cmd)
                const available = (gearInventory ?? []).filter(g =>
                  g.slot === slotKey && (!g.equippedBy || g.equippedBy === cmd.uid)
                ).sort((a,b) => {
                  const ro = { legendary:0, epic:1, rare:2, common:3 };
                  return (ro[a.rarity]??4) - (ro[b.rarity]??4);
                });

                return (
                  <div key={slotKey} style={{ position: "relative" }}>
                    {/* Slot card — clickable */}
                    <div
                      onClick={() => {
                        if (piece) { setPreviewGear({ piece, slotKey }); setShowClassPopup(null); }
                        else setShowClassPopup(isOpen ? null : slotKey);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        if (piece) { setPreviewGear({ piece, slotKey }); setShowClassPopup(null); }
                        else setShowClassPopup(isOpen ? null : slotKey);
                      }}
                      style={{
                        padding: "6px 4px 5px", textAlign: "center",
                        minHeight: 44,
                        background: piece ? `${rc}12` : isOpen ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.015)",
                        border: `1px solid ${isOpen ? (rc ?? r.color)+"60" : piece ? rc+"40" : "#1e1810"}`,
                        borderRadius: 5, cursor: "pointer",
                        transition: "all .15s",
                        boxShadow: piece ? `0 0 8px ${rc}20` : "none",
                        touchAction: "manipulation",
                        WebkitTapHighlightColor: "transparent",
                      }}>
                      <div style={{ fontSize: piece ? 20 : 16, marginBottom: 2, opacity: piece ? 1 : 0.25 }}>
                        {piece ? piece.icon : slotDef.icon}
                      </div>
                      <div style={{ fontSize: 6, fontFamily: "'Cinzel',serif",
                        color: piece ? rc : "#2a2010",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginBottom: piece ? 2 : 0 }}>
                        {piece ? piece.n.split(" ")[0] : slotDef.n}
                      </div>
                      {piece && (
                        <>
                          <div style={{ fontSize: 6, color: "#6a5a40", fontFamily: "'Cinzel',serif", marginBottom: 1 }}>
                            {STAT_ICONS[piece.primaryStat]} +{pVal}
                          </div>
                          <div style={{ display: "flex", justifyContent: "center", gap: 1 }}>
                            {Array.from({length:5}).map((_,i)=>(
                              <span key={i} style={{fontSize:4, color:i<(piece.stars??0)?"#aaa":"#222"}}>★</span>
                            ))}
                          </div>
                        </>
                      )}
                      {!piece && (
                        <div style={{ fontSize: 5, color: "#2a2010", fontFamily: "'Cinzel',serif", marginTop: 1 }}>empty</div>
                      )}
                    </div>

                    {/* Slot open indicator */}
                    {isOpen && (
                      <div style={{
                        position: "absolute", bottom: -3, left: "50%", transform: "translateX(-50%)",
                        width: 6, height: 6, borderRadius: "50%",
                        background: r.color, boxShadow: `0 0 6px ${r.color}`,
                        zIndex: 2,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Gear slot slide-in picker (from left) ── */}
            {(() => {
              const openSlot = ["helmet","armor","bracers","accessory"].find(s => showClassPopup === s);
              if (!openSlot) return null;
              const SLOT_DEFS2 = { helmet:{n:"Helmet",icon:"⛑"}, armor:{n:"Armor",icon:"🛡"}, bracers:{n:"Bracers",icon:"🥊"}, accessory:{n:"Accessory",icon:"💍"} };
              const STAT_ICONS2 = { ATK:"⚔", FOC:"✦", SPD:"💨", ARMY_ATK:"⚔🛡", ARMY_FOC:"✦🛡", ARMY_SPD:"💨🛡", ARMY_SIEGE:"🪨🛡" };
              const pBase2 = { ATK:7, FOC:7, SPD:7 };
              const slotDef2 = SLOT_DEFS2[openSlot];
              const equippedId2 = cmd.gear?.[openSlot];
              const piece2 = equippedId2 ? (gearInventory ?? []).find(g => g.instanceId === equippedId2) : null;
              const rc2 = piece2 ? (GEAR_RARITY_COLORS[piece2.rarity] ?? "#888") : r.color;
              const available2 = (gearInventory ?? []).filter(g =>
                g.slot === openSlot && (!g.equippedBy || g.equippedBy === cmd.uid)
              ).sort((a,b) => {
                const ro = { legendary:0, epic:1, rare:2, common:3 };
                return (ro[a.rarity]??4) - (ro[b.rarity]??4);
              });
              return (
                <>
                  {/* Backdrop — fixed so it covers visible right panel regardless of scroll */}
                  <div
                    onClick={() => setShowClassPopup(null)}
                    style={{
                      position: "fixed", top: 0, left: 76, right: 0, bottom: 0, zIndex: 755,
                      background: "rgba(0,0,0,.45)",
                    }}
                  />
                  {/* Slide-in panel — fixed, anchored to left edge of right panel */}
                  <div style={{
                    position: "fixed", top: 0, left: 76, bottom: 0, height: "100%",
                    width: 200, zIndex: 756,
                    background: "#0d0b08",
                    borderRight: `1px solid ${r.color}35`,
                    boxShadow: "4px 0 24px rgba(0,0,0,.85)",
                    display: "flex", flexDirection: "column", overflow: "hidden",
                    animation: "slideInLeft .15s ease",
                  }}>
                    {/* Header */}
                    <div style={{
                      padding: "10px 12px 8px",
                      borderBottom: "1px solid #1a1510",
                      flexShrink: 0,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 9, color: rc2, fontFamily: "'Cinzel',serif", letterSpacing: ".07em", fontWeight: 700 }}>
                        {slotDef2.icon} {slotDef2.n.toUpperCase()}
                      </span>
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        {piece2 && (
                          <button onClick={(e) => { e.stopPropagation(); handleUnequip(openSlot); setShowClassPopup(null); }} style={{
                            padding: "2px 7px", borderRadius: 3, fontSize: 6,
                            background: "rgba(180,60,60,.12)", border: "1px solid rgba(180,60,60,.3)",
                            color: "#aa5050", fontFamily: "'Cinzel',serif", cursor: "pointer",
                          }}>Unequip</button>
                        )}
                        <button onClick={() => setShowClassPopup(null)} style={{
                          background: "none", border: "none", color: "#4a4030",
                          fontSize: 14, cursor: "pointer", lineHeight: 1, padding: "0 2px",
                        }}>✕</button>
                      </div>
                    </div>

                    {/* Scrollable gear list */}
                    <div className="scr gear-picker-list" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", touchAction: "pan-y", minHeight: 0 }}>
                      {available2.length === 0 ? (
                        <div style={{
                          padding: "20px 12px", fontSize: 8, color: "#3a3020",
                          fontFamily: "'Crimson Pro',serif", fontStyle: "italic", textAlign: "center",
                        }}>
                          No {slotDef2.n.toLowerCase()}s available
                        </div>
                      ) : available2.map(g => {
                        const gc = GEAR_RARITY_COLORS[g.rarity] ?? "#888";
                        const isEquipped = g.instanceId === equippedId2;
                        const gRarityMult = { common:1, rare:1.4, epic:2.0, legendary:3.0 }[g.rarity] ?? 1;
                        const gPval = Math.round((pBase2[g.primaryStat] ?? 7) * gRarityMult * (1 + (g.stars ?? 0) * 0.12));
                        return (
                          <div
                            key={g.instanceId}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewGear({ piece: g, slotKey: openSlot });
                              setShowClassPopup(null);
                            }}

                            style={{
                              padding: "9px 12px", display: "flex", alignItems: "center", gap: 9,
                              background: isEquipped ? `${gc}14` : "transparent",
                              borderBottom: "1px solid #111",
                              borderLeft: isEquipped ? `3px solid ${gc}` : "3px solid transparent",
                              cursor: "pointer", transition: "background .1s",
                              WebkitTapHighlightColor: "transparent",
                            }}>
                            <span style={{ fontSize: 22, flexShrink: 0 }}>{g.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 8, fontFamily: "'Cinzel',serif", color: gc,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {g.n}
                              </div>
                              <div style={{ fontSize: 7, color: "#5a4a30", fontFamily: "'Cinzel',serif", marginTop: 2 }}>
                                {STAT_ICONS2[g.primaryStat]} +{gPval}
                                {g.secStats?.length > 0 && (
                                  <span style={{ color: "#3a3020", marginLeft: 4 }}>+{g.secStats.length} sec</span>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 1, marginTop: 3 }}>
                                {Array.from({length:5}).map((_,i)=>(
                                  <span key={i} style={{fontSize:5, color:i<(g.stars??0)?"#aaa":"#1a1a1a"}}>★</span>
                                ))}
                              </div>
                            </div>
                            {isEquipped && (
                              <span style={{ fontSize: 8, color: gc, fontFamily: "'Cinzel',serif", flexShrink: 0 }}>✓</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* ── Gear preview popup — inside IIFE so handleEquip/handleUnequip are in scope ── */}
            {previewGear && (() => {
              const { piece: pg, slotKey: pgSlot } = previewGear;
              const pgRc = GEAR_RARITY_COLORS[pg.rarity] ?? "#888";
              const pgR  = GEAR_RARITY[pg.rarity] ?? {};
              const pgSlotDef = { helmet:{n:"Helmet",icon:"⛑"}, armor:{n:"Armor",icon:"🛡"}, bracers:{n:"Bracers",icon:"🥊"}, accessory:{n:"Accessory",icon:"💍"} }[pgSlot];
              const pgStatIcons = { ATK:"⚔", FOC:"✦", SPD:"💨", ARMY_ATK:"⚔🛡", ARMY_FOC:"✦🛡", ARMY_SPD:"💨🛡", ARMY_SIEGE:"🪨🛡" };
              const STAT_LABELS = { ATK:"Attack", FOC:"Focus", SPD:"Speed", ARMY_ATK:"+Army ATK", ARMY_FOC:"+Army FOC", ARMY_SPD:"+Army SPD", ARMY_SIEGE:"+Army Siege" };
              const pgPBase = { ATK:7, FOC:7, SPD:7 };
              const pgPVal = Math.round((pgPBase[pg.primaryStat] ?? 7) * (pgR.statMult ?? 1) * (1 + (pg.stars ?? 0) * 0.12));
              const isEquipped = cmd.gear?.[pgSlot] === pg.instanceId;

              return (
                <div
                  onClick={() => setPreviewGear(null)}
                  style={{
                    position: "fixed", inset: 0, zIndex: 200,
                    background: "rgba(0,0,0,.65)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  <div onClick={e => e.stopPropagation()} style={{
                    width: "min(320px, 90vw)",
                    background: "#0d0b08", border: `2px solid ${pgRc}40`, borderRadius: 8,
                    padding: "16px 18px", boxShadow: `0 8px 40px rgba(0,0,0,.95), 0 0 20px ${pgRc}15`,
                  }}>

                    {/* Header */}
                    <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
                      <div style={{ fontSize:36, flexShrink:0 }}>{pg.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:"'Cinzel',serif", fontSize:12, fontWeight:700, color:"#e0d0c0" }}>{pg.n}</div>
                        <div style={{ display:"flex", gap:5, marginTop:4, flexWrap:"wrap" }}>
                          <span style={{ padding:"1px 6px", borderRadius:3,
                            background:`${pgRc}18`, border:`1px solid ${pgRc}40`,
                            fontSize:7, color:pgRc, fontFamily:"'Cinzel',serif" }}>{pgR.n}</span>
                          <span style={{ padding:"1px 6px", borderRadius:3,
                            background:"rgba(255,255,255,.03)", border:"1px solid #2a2010",
                            fontSize:7, color:"#6a5a3a", fontFamily:"'Cinzel',serif" }}>
                            {pgSlotDef.icon} {pgSlotDef.n}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => setPreviewGear(null)} style={{
                        background:"transparent", border:"none", color:"#6a5a4a",
                        fontSize:16, cursor:"pointer", flexShrink:0, lineHeight:1,
                      }}>✕</button>
                    </div>

                    {/* Stars */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                      <div style={{ display:"flex", gap:3 }}>
                        {Array.from({length:5}).map((_,i) => (
                          <span key={i} style={{ fontSize:11, color:i<(pg.stars??0)?"#aaaaaa":"#2a2a2a" }}>★</span>
                        ))}
                      </div>
                      {(pg.goldStars??0) > 0 && <>
                        <span style={{ color:"#3a3020" }}>·</span>
                        <div style={{ display:"flex", gap:3 }}>
                          {Array.from({length:pg.goldStars}).map((_,i) => (
                            <span key={i} style={{ fontSize:11, color:"#f0c040" }}>★</span>
                          ))}
                        </div>
                      </>}
                    </div>

                    {/* Primary stat */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                      marginBottom:6, padding:"7px 10px",
                      background:"rgba(255,255,255,.025)", borderRadius:5 }}>
                      <span style={{ fontSize:9, color:"#6a5a3a", fontFamily:"'Cinzel',serif" }}>
                        {pgStatIcons[pg.primaryStat]} {STAT_LABELS[pg.primaryStat] ?? pg.primaryStat}
                      </span>
                      <span style={{ fontSize:13, color:pgRc, fontFamily:"'Cinzel',serif", fontWeight:700 }}>
                        +{pgPVal}
                      </span>
                    </div>

                    {/* Secondary stats */}
                    {pg.secStats?.length > 0 && (
                      <div style={{ display:"flex", flexDirection:"column", gap:3, marginBottom:10 }}>
                        {pg.secStats.map((s, i) => (
                          <div key={i} style={{ display:"flex", justifyContent:"space-between",
                            fontSize:9, fontFamily:"'Cinzel',serif",
                            color: s.gold ? "#f0c040" : "#4a4a3a",
                            padding:"4px 10px", background:"rgba(255,255,255,.015)", borderRadius:4 }}>
                            <span>{pgStatIcons[s.key] ?? ""} {STAT_LABELS[s.key] ?? s.key}</span>
                            <span style={{ color: s.gold ? "#f0c040" : "#6a6a5a" }}>
                              +{typeof s.value === "number" && !Number.isInteger(s.value) ? s.value.toFixed(1) : s.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Equip / Unequip + Cancel */}
                    <div style={{ display:"flex", gap:8, marginTop:4 }}>
                      {isEquipped ? (
                        <button
                          onClick={() => { handleUnequip(pgSlot); setPreviewGear(null); }}
                          style={{
                            flex:1, padding:"10px 0", borderRadius:5, cursor:"pointer",
                            background:"rgba(180,60,60,.12)", border:"1px solid rgba(180,60,60,.4)",
                            color:"#cc5050", fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700,
                            letterSpacing:".06em",
                          }}>
                          Unequip
                        </button>
                      ) : (
                        <button
                          onClick={() => { handleEquip(pg); setPreviewGear(null); }}
                          style={{
                            flex:1, padding:"10px 0", borderRadius:5, cursor:"pointer",
                            background:`linear-gradient(135deg,${pgRc}22,rgba(0,0,0,.3))`,
                            border:`1px solid ${pgRc}55`,
                            color:pgRc, fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700,
                            letterSpacing:".06em", boxShadow:`0 0 12px ${pgRc}20`,
                          }}>
                          Equip
                        </button>
                      )}
                      <button
                        onClick={() => setPreviewGear(null)}
                        style={{
                          padding:"10px 16px", borderRadius:5, cursor:"pointer",
                          background:"rgba(255,255,255,.03)", border:"1px solid #2a2010",
                          color:"#4a3a28", fontFamily:"'Cinzel',serif", fontSize:10,
                        }}>
                        Cancel
                      </button>
                    </div>

                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ── Skill Trees button ── */}
      <div style={{ height: 8, flexShrink: 0 }} />
      <div style={{ padding: "0 14px 10px", flexShrink: 0 }}>
        <button onClick={() => setShowSkills(true)} style={{
          width: "100%", padding: "9px 0",
          background: `linear-gradient(135deg, ${r.color}18, rgba(0,0,0,.4))`,
          border: `1px solid ${r.color}48`,
          borderRadius: 6, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          boxShadow: `0 0 16px ${r.color}12, inset 0 1px 0 rgba(255,255,255,.04)`,
          transition: "all .15s", position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg,transparent,${r.color}55,transparent)`,
          }} />
          <span style={{ fontSize: 16 }}>✦</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, fontWeight: 700,
              color: r.color, letterSpacing: ".06em" }}>SKILL TREES</div>
            <div style={{ fontSize: 7, color: "#4a3a28", fontFamily: "'Cinzel',serif", marginTop: 1 }}>
              {(cmd.unspentSkillPoints ?? 0) > 0
                ? `${cmd.unspentSkillPoints} point${cmd.unspentSkillPoints !== 1 ? "s" : ""} to spend`
                : "View & assign skill points"}
            </div>
          </div>
          {(cmd.unspentSkillPoints ?? 0) > 0 && (
            <div style={{
              marginLeft: "auto",
              width: 20, height: 20, borderRadius: "50%",
              background: "linear-gradient(135deg,#dd3030,#991010)",
              fontSize: 9, color: "#fff", fontFamily: "'Cinzel',serif", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{cmd.unspentSkillPoints}</div>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main screen export ────────────────────────────────────────────────────────
// ── Filter popup ─────────────────────────────────────────────────────────────
function FilterPopup({ filterClass, setFilterClass, filterAlignment, setFilterAlignment, filterSubspecies, setFilterSubspecies, sortBy, setSortBy, onClose }) {
  // local draft state so changes only apply on "Apply"
  const [draftClass,      setDraftClass]      = useState(filterClass);
  const [draftAlignment,  setDraftAlignment]  = useState(filterAlignment);
  const [draftSubspecies, setDraftSubspecies] = useState(filterSubspecies);
  const [draftSort,       setDraftSort]       = useState(sortBy);

  function apply() {
    setFilterClass(draftClass);
    setFilterAlignment(draftAlignment);
    setFilterSubspecies(draftSubspecies);
    setSortBy(draftSort);
    onClose();
  }

  function clearAll() {
    setDraftClass(null);
    setDraftAlignment(null);
    setDraftSubspecies(null);
    setDraftSort("rarity");
  }

  const activeCount = [draftClass, draftAlignment, draftSubspecies].filter(Boolean).length;

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 7, color: "#5a4a2a", fontFamily: "'Cinzel',serif",
        letterSpacing: ".1em", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );

  const CheckBox = ({ label, active, onClick }) => (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "7px 11px", borderRadius: 5,
      background: active ? "rgba(240,192,64,.12)" : "rgba(255,255,255,.03)",
      border: `1px solid ${active ? "rgba(240,192,64,.45)" : "#2a2010"}`,
      color: active ? "#f0c040" : "#5a4a30",
      fontFamily: "'Cinzel',serif", fontSize: 9, cursor: "pointer",
      transition: "all .12s", whiteSpace: "nowrap",
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: 2, flexShrink: 0,
        border: `1px solid ${active ? "#f0c040" : "#3a2a18"}`,
        background: active ? "#f0c04030" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, color: "#f0c040",
      }}>{active ? "✓" : ""}</div>
      {label}
    </button>
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9200,
      background: "rgba(0,0,0,.7)", display: "flex", alignItems: "flex-end",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 700, margin: "0 auto",
        background: "#0d0b08", borderRadius: "12px 12px 0 0",
        border: "1px solid #2a2010", borderBottom: "none",
        padding: "16px 16px 0", animation: "fadeUp .18s ease",
        maxHeight: "80vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: 700, color: "#e0d0b0" }}>
            Filter & Sort
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {activeCount > 0 && (
              <button onClick={clearAll} style={{
                padding: "4px 10px", borderRadius: 4,
                background: "rgba(200,80,50,.1)", border: "1px solid rgba(200,80,50,.3)",
                color: "#c85030", fontFamily: "'Cinzel',serif", fontSize: 8, cursor: "pointer",
              }}>Clear All</button>
            )}
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,.04)", border: "1px solid #2a2010",
              color: "#6a5a30", fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1, paddingBottom: 8 }}>
          <Section title="ALIGNMENT">
            {Object.entries(ALIGNMENT).map(([key, aln]) => (
              <CheckBox key={key} label={`${aln.icon} ${aln.n}`}
                active={draftAlignment === key}
                onClick={() => setDraftAlignment(draftAlignment === key ? null : key)} />
            ))}
          </Section>

          <Section title="CLASS">
            {Object.entries(CLASS).map(([key, cls]) => (
              <CheckBox key={key} label={`${cls.icon} ${cls.n}`}
                active={draftClass === key}
                onClick={() => setDraftClass(draftClass === key ? null : key)} />
            ))}
          </Section>

          <Section title="RARITY">
            {[["soldier","Soldier","#4488cc"],["veteran","Veteran","#a855f7"],["champion","Champion","#f0c040"]].map(([key,label]) => (
              <CheckBox key={key} label={label}
                active={draftSubspecies === key}
                onClick={() => setDraftSubspecies(draftSubspecies === key ? null : key)} />
            ))}
          </Section>

          <Section title="SUBSPECIES">
            {Object.entries(SUBSPECIES).flatMap(([faction, tiers]) =>
              Object.values(tiers).map(label => label)
            ).filter((label, idx, arr) => arr.indexOf(label) === idx).map(label => (
              <CheckBox key={label} label={label}
                active={draftSubspecies === label}
                onClick={() => setDraftSubspecies(draftSubspecies === label ? null : label)} />
            ))}
          </Section>

          <Section title="SORT BY">
            {[["rarity","⭐ Rarity"],["level","🔺 Level"],["respect","⚜ Respect"]].map(([key,label]) => (
              <CheckBox key={key} label={label}
                active={draftSort === key}
                onClick={() => setDraftSort(key)} />
            ))}
          </Section>
        </div>

        {/* Apply button */}
        <div style={{ padding: "12px 0 20px", flexShrink: 0 }}>
          <button onClick={apply} style={{
            width: "100%", padding: "13px 0", borderRadius: 6, cursor: "pointer",
            background: "linear-gradient(135deg,rgba(240,192,64,.2),rgba(240,192,64,.08))",
            border: "1px solid rgba(240,192,64,.5)",
            fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700,
            color: "#f0c040", letterSpacing: ".06em",
          }}>
            Apply{activeCount > 0 ? ` (${activeCount} active)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommanderScreen({ cmds, bldgs, gearInventory, setGearInventory, respectSchematics, setCmds, onSchematicUsed, onClose, initialUid, gems, setGems }) {
  // ── Filter / sort state ──
  const [filterClass,      setFilterClass]      = useState(null);
  const [filterAlignment,  setFilterAlignment]  = useState(null);
  const [filterSubspecies, setFilterSubspecies] = useState(null);
  const [sortBy,           setSortBy]           = useState("rarity");
  const [showFilter,       setShowFilter]       = useState(false);

  // Allow touch scroll events through the main.tsx touchstart guard
  useEffect(() => {
    document.documentElement.classList.add("gacha-open");
    return () => document.documentElement.classList.remove("gacha-open");
  }, []);

  const allPlayer = cmds.filter(c => c.owner === "player");
  const activeFilterCount = [filterClass, filterAlignment, filterSubspecies].filter(Boolean).length;

  // Determine player alignment to flag opposite-alignment commanders
  const playerFactionKey = allPlayer[0]?.faction ?? null;
  const playerAlnKey = playerFactionKey ? getFactionAlignment(playerFactionKey) : null;

  // Build a full roster: owned commanders first (real data), then unowned HDEFS as preview stubs
  const ownedIds = new Set(allPlayer.map(c => c.id ?? c.uid));
  const unownedStubs = HDEFS
    .filter(h => !ownedIds.has(h.id))
    .map(h => ({
      ...h,
      uid: `stub_${h.id}`,
      owner: "unowned",
      lvl: 1, xp: 0, respectLevel: 0, respectPoints: 0,
      skillPoints: {}, march: null,
      _isStub: true,
    }));

  const allRosterCmds = [...allPlayer, ...unownedStubs];

  const filtered = allRosterCmds.filter(c => {
    if (filterClass && c.cls !== filterClass) return false;
    if (filterAlignment) {
      const aln = ALIGNMENT[filterAlignment];
      if (!aln?.factions.includes(c.faction)) return false;
    }
    if (filterSubspecies) {
      const rarityKeys = ["soldier","veteran","champion"];
      if (rarityKeys.includes(filterSubspecies)) {
        if (c.rarity !== filterSubspecies) return false;
      } else {
        if (c.subspecies !== filterSubspecies) return false;
      }
    }
    return true;
  }).sort((a, b) => {
    // Owned always before unowned
    const aOwned = !a._isStub ? 0 : 1;
    const bOwned = !b._isStub ? 0 : 1;
    if (aOwned !== bOwned) return aOwned - bOwned;
    if (sortBy === "rarity")  return (RARITY_ORDER[a.rarity] ?? 3) - (RARITY_ORDER[b.rarity] ?? 3);
    if (sortBy === "level")   return (b.lvl ?? 5) - (a.lvl ?? 5);
    if (sortBy === "respect") return (b.respectLevel ?? 0) - (a.respectLevel ?? 0);
    return 0;
  });

  const [selectedUid, setSelectedUid] = useState(initialUid ?? allPlayer[0]?.uid ?? null);
  const selectedCmd = filtered.find(c => c.uid === selectedUid) ?? allPlayer[0] ?? filtered[0] ?? null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9200,
      background: "#080704",
      display: "flex", flexDirection: "column",
      height: "100dvh", overflow: "hidden",
      touchAction: "auto",
    }}>
      <style>{CSS}</style>

      {/* Filter popup */}
      {showFilter && (
        <FilterPopup
          filterClass={filterClass} setFilterClass={setFilterClass}
          filterAlignment={filterAlignment} setFilterAlignment={setFilterAlignment}
          filterSubspecies={filterSubspecies} setFilterSubspecies={setFilterSubspecies}
          sortBy={sortBy} setSortBy={setSortBy}
          onClose={() => setShowFilter(false)}
        />
      )}

      {/* ── Body: 3 columns ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0, touchAction: "auto" }}>

        {/* ── Col 1: back arrow + filter + scrollable roster (2-wide grid) ── */}
        <div style={{
          width: 152, flexShrink: 0,
          overflow: "hidden",
          borderRight: "1px solid #1e1508",
          background: "rgba(0,0,0,.3)",
          display: "flex", flexDirection: "column",
          touchAction: "pan-y",
        }}>
          {/* Back + filter buttons */}
          <div style={{
            display: "flex", justifyContent: "space-around", alignItems: "center",
            padding: "10px 8px 8px", flexShrink: 0,
            borderBottom: "1px solid #1a1508",
          }}>
            <button onClick={onClose} style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(255,255,255,.04)", border: "1px solid #2e2010",
              color: "#8a7050", fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              WebkitTapHighlightColor: "transparent",
            }}>←</button>
            <button onClick={() => setShowFilter(true)} style={{
              width: 44, height: 44, borderRadius: "50%",
              background: activeFilterCount > 0 ? "rgba(240,192,64,.12)" : "rgba(255,255,255,.03)",
              border: `1px solid ${activeFilterCount > 0 ? "rgba(240,192,64,.5)" : "#2a2010"}`,
              color: activeFilterCount > 0 ? "#f0c040" : "#5a4a30",
              fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
              WebkitTapHighlightColor: "transparent",
            }}>
              ⚙
              {activeFilterCount > 0 && (
                <span style={{
                  position: "absolute", top: 2, right: 2,
                  width: 14, height: 14, borderRadius: "50%",
                  background: "linear-gradient(135deg,#f0c040,#c07020)",
                  color: "#0a0804", fontSize: 7, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{activeFilterCount}</span>
              )}
            </button>
          </div>
          {/* 2-column portrait grid — this inner div scrolls, buttons stay pinned */}
          <div className="roster-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden",
            scrollbarWidth: "none", touchAction: "pan-y",
            WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {filtered.map(cmd => {
              const cmdAlnKey = getFactionAlignment(cmd.faction);
              const isOppositeAlignment = playerAlnKey && cmdAlnKey !== playerAlnKey;
              const isLocked = cmd._isStub;
              return (
                <RosterPortrait
                  key={cmd.uid}
                  cmd={cmd}
                  selected={cmd.uid === selectedUid}
                  onClick={() => setSelectedUid(cmd.uid)}
                  isLocked={isLocked}
                  isOppositeAlignment={!isLocked && isOppositeAlignment}
                />
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: "20px 8px", textAlign: "center", color: "#2a2010",
                fontFamily: "'Cinzel',serif", fontSize: 8, fontStyle: "italic", gridColumn: "1/-1" }}>
                No matches
              </div>
            )}
          </div>
          </div>
        </div>

        {/* ── Col 2: commander portrait / art area ── */}
        {selectedCmd && (() => {
          const r2 = RARITY[selectedCmd.rarity] ?? RARITY.soldier;
          const faction2 = PLAYABLE_FACTIONS.find(f => f.key === selectedCmd.faction);
          const fCol = faction2?.c ?? r2.color;
          return (
            <div style={{
              width: "28%", flexShrink: 0,
              borderRight: "1px solid #1e1508",
              background: selectedCmd.portrait ? "transparent" : `radial-gradient(ellipse at 50% 30%, ${fCol}18 0%, #04030a 65%)`,
              borderRight: selectedCmd.portrait ? "none" : "1px solid #1e1508",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              position: "relative", overflow: "hidden",
            }}>
              {/* Atmospheric glow — only shown when no portrait */}
              {!selectedCmd.portrait && <div style={{
                position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
                width: 120, height: 120, borderRadius: "50%",
                background: `radial-gradient(circle, ${fCol}28 0%, transparent 70%)`,
                pointerEvents: "none",
              }}/>}
              {/* Commander portrait / icon — large */}
              {selectedCmd.portrait
                ? <img src={selectedCmd.portrait} alt={selectedCmd.n} style={{
                    width: "100%", height: "100%", objectFit: "contain", objectPosition: "center",
                    display: "block",
                    filter: selectedCmd._isStub ? "grayscale(1) brightness(0.45)" : "none",
                    maskImage: "linear-gradient(to bottom, black 60%, transparent 100%), linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%), linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
                    maskComposite: "intersect",
                    WebkitMaskComposite: "source-in",
                  }} />
                : <div style={{
                    fontSize: 72, lineHeight: 1,
                    filter: selectedCmd._isStub ? "grayscale(1) brightness(0.4)" : `drop-shadow(0 0 24px ${fCol}88)`,
                    marginBottom: 12,
                  }}>{selectedCmd.icon}</div>
              }
              {/* Name */}
              <div style={{
                fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 10,
                color: selectedCmd._isStub ? "#666" : "#c8b890", letterSpacing: ".04em", textAlign: "center",
                padding: "0 8px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: "100%",
              }}>{selectedCmd.n}</div>
              {/* Opposite alignment warning in col2 */}
              {selectedCmd._isStub && (() => {
                const _alnKey = getFactionAlignment(selectedCmd.faction);
                const _isOpp = playerAlnKey && _alnKey !== playerAlnKey;
                return _isOpp ? (
                  <div style={{ fontSize: 7, color: "#cc4040", fontFamily: "'Cinzel',serif",
                    fontWeight: 700, marginTop: 4, textAlign: "center", padding: "0 8px" }}>
                    ✖ OPPOSITE ALIGNMENT
                  </div>
                ) : (
                  <div style={{ fontSize: 7, color: "#8a6830", fontFamily: "'Cinzel',serif",
                    marginTop: 4, textAlign: "center" }}>🔒 Not Summoned</div>
                );
              })()}
              {/* Faction */}
              {faction2 && (
                <div style={{
                  marginTop: 5, fontSize: 9,
                  color: selectedCmd._isStub ? "#555" : fCol, fontFamily: "'Cinzel',serif",
                  opacity: 0.8,
                }}>{faction2.s} {faction2.n}</div>
              )}
            </div>
          );
        })()}

        {/* ── Col 3: all commander info (CommanderDetail) ── */}
        <div style={{
          flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", position: "relative",
          display: "flex", flexDirection: "column",
          paddingRight: "max(12px, env(safe-area-inset-right, 12px))",
        }}>
          {selectedCmd && selectedCmd._isStub ? (() => {
            const r3 = RARITY[selectedCmd.rarity] ?? RARITY.soldier;
            const cmdAlnKey3 = getFactionAlignment(selectedCmd.faction);
            const isOpp3 = playerAlnKey && cmdAlnKey3 !== playerAlnKey;
            const f3 = PLAYABLE_FACTIONS.find(f => f.key === selectedCmd.faction);
            return (
              <div style={{ height: "100%", overflowY: "auto", padding: "14px 12px 40px" }}>
                {/* Locked banner */}
                <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid #2a2010",
                  borderRadius: 8, padding: "10px 14px", marginBottom: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>🔒</div>
                  {isOpp3 ? (
                    <>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#cc4040",
                        fontWeight: 700, letterSpacing: ".06em" }}>OPPOSITE ALIGNMENT</div>
                      <div style={{ fontSize: 8, color: "#6a4a4a", fontFamily: "'Cinzel',serif",
                        marginTop: 4, lineHeight: 1.5 }}>
                        This commander cannot be played this season.<br/>They belong to the opposing alignment.
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#aa8840",
                        fontWeight: 700, letterSpacing: ".06em" }}>NOT YET SUMMONED</div>
                      <div style={{ fontSize: 8, color: "#6a5a3a", fontFamily: "'Cinzel',serif",
                        marginTop: 4, lineHeight: 1.5 }}>
                        Summon this commander from the portal to recruit them.
                      </div>
                    </>
                  )}
                </div>
                {/* Basic stats preview */}
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, color: "#5a4a30",
                  letterSpacing: ".08em", marginBottom: 6 }}>COMMANDER PREVIEW</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                  {[
                    ["⚔ ATK", selectedCmd.atk ?? "—"],
                    ["👁 FOC", selectedCmd.foc ?? "—"],
                    ["💨 SPD", selectedCmd.spd ?? "—"],
                    ["✦ CLASS", CLASS[selectedCmd.cls]?.n ?? selectedCmd.cls],
                    ["⭐ RARITY", r3.n],
                    ["🏷 SUBSPECIES", selectedCmd.subspecies ?? "—"],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{ background: "rgba(255,255,255,.02)", border: "1px solid #1a1408",
                      borderRadius: 5, padding: "6px 8px" }}>
                      <div style={{ fontSize: 6, color: "#5a4a30", fontFamily: "'Cinzel',serif",
                        letterSpacing: ".05em", marginBottom: 2 }}>{lbl}</div>
                      <div style={{ fontSize: 10, color: "#c0a870", fontFamily: "'Cinzel',serif",
                        fontWeight: 700 }}>{val}</div>
                    </div>
                  ))}
                </div>
                {/* Faction */}
                {f3 && (
                  <div style={{ background: `${f3.c}10`, border: `1px solid ${f3.c}30`,
                    borderRadius: 5, padding: "7px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{f3.s}</span>
                    <div>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, color: f3.c,
                        fontWeight: 700 }}>{f3.n}</div>
                      <div style={{ fontSize: 7, color: "#5a4a30", fontFamily: "'Cinzel',serif",
                        marginTop: 1 }}>{f3.desc}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })() : selectedCmd
            ? <CommanderDetail cmd={selectedCmd} bldgs={bldgs} gearInventory={gearInventory} setGearInventory={setGearInventory} respectSchematics={respectSchematics} setCmds={setCmds} onSchematicUsed={onSchematicUsed} gems={gems} setGems={setGems} />
            : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#2a2020", fontFamily: "'Cinzel',serif", fontSize: 11, fontStyle: "italic" }}>
                Select a commander
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
