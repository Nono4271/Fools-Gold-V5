import { useState } from "react";
import {
  RARITY, SKILL_TREES,
  getCommanderTrees, getTreeDisplayNames,
  respectCost, RESPECT_MAX,
  addRespect,
} from "../../../../shared/constants/heroes.js";
import {
  MAIN_SKILLS, SIDE_SKILLS,
  getBranchMainSkill, getBranchSideSkills,
} from "../../../../shared/constants/skills.js";
import { FACTION_THEME } from "./factionTheme.js";
import BranchRow from "./BranchRow.jsx";
import { SpineSep } from "./SkillTreePrimitives.jsx";
import SkillInfoPanel from "./SkillInfoPanel.jsx";

function utcDateKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
}

export default function SkillTreeOverlay({ cmd, setCmds, gems, setGems, onClose }) {
  const rLvl = cmd.respectLevel ?? 0;
  const skillPoints = cmd.skillPoints ?? {};
  const unspent = cmd.unspentSkillPoints ?? 0;
  const [respecError, setRespecError] = useState(null);

  const today = utcDateKey();
  const respecRecord = cmd.respecRecord ?? {};
  const respecToday = respecRecord.dateKey === today ? (respecRecord.usedCount ?? 0) : 0;
  const FREE_RESPEC_LIMIT = 1;
  const PAID_RESPEC_LIMIT = 2;
  const RESPEC_GEM_COST   = 50;

  const canFreeRespec = respecToday < FREE_RESPEC_LIMIT;
  const canPaidRespec = !canFreeRespec && respecToday < PAID_RESPEC_LIMIT;
  const canRespec     = canFreeRespec || canPaidRespec;

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

      if (!isMain && mainSkillKeyForBranch) {
        const mainLvl = prev_pts[mainSkillKeyForBranch] ?? 0;
        const sideCap = Math.floor(mainLvl / 2);
        if (curLvl >= sideCap) return c;
      }

      return {
        ...c,
        skillPoints: { ...prev_pts, [skillKey]: curLvl + 1 },
        unspentSkillPoints: (c.unspentSkillPoints ?? 0) - 1,
      };
    }));
  }

  const [selectedNode, setSelectedNode] = useState(null);

  const factionTheme = FACTION_THEME[cmd.faction] ?? FACTION_THEME.pirates;
  const fColor = factionTheme.color;
  const fAccent = factionTheme.accent;

  function handleNodeClick(skillDef, isMain, gateLocked, mainKeyForBranch) {
    const key = skillDef.key;
    if (selectedNode?.skillKey === key) { setSelectedNode(null); return; }
    setSelectedNode({ skillDef, isMain, skillKey: key, mainKeyForBranch, gateLocked });
  }

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

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 800,
      background: `radial-gradient(ellipse at 50% 0%, #03100f 0%, #020608 55%, #010204 100%)`,
      display: "flex", flexDirection: "column",
      animation: "fadeUp .2s ease",
      touchAction: "auto",
    }}>
      <div style={{
        position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)",
        width: 280, height: 160,
        background: `radial-gradient(ellipse, ${fColor}22 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

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
        <div style={{ fontSize: 26 }}>{cmd.icon}</div>
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 14, color: "#e8dcc8" }}>
            {cmd.n}
          </div>
          <div style={{ fontSize: 8, color: fColor, fontFamily: "'Cinzel',serif", marginTop: 1 }}>
            SKILL TREES · R{rLvl} · Lv{cmd.lvl ?? 5}
          </div>
        </div>

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

      {respecError && (
        <div style={{
          padding: "7px 16px", background: "rgba(200,50,50,.15)",
          border: "1px solid rgba(200,50,50,.4)", fontSize: 9, color: "#e07070",
          fontFamily: "'Cinzel',serif",
        }}>{respecError}</div>
      )}

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

      <div style={{ flex: 1, overflowY: "auto", position: "relative", WebkitOverflowScrolling: "touch" }}>
        <div style={{
          position: "absolute", left: "50%", top: 0, bottom: 0, width: 2,
          background: `linear-gradient(180deg, transparent 0%, ${fColor}14 15%, ${fColor}14 85%, transparent 100%)`,
          transform: "translateX(-50%)",
          pointerEvents: "none", zIndex: 0,
        }} />

        <div style={{ padding: "14px 6px 180px", position: "relative", zIndex: 1 }}>
          {treeEntries.map(({ treeKey, label, unlocksAt, tag, branchIdx }, idx) => {
            const tree = SKILL_TREES[treeKey];
            if (!tree) return null;
            const locked     = rLvl < unlocksAt;
            const mainSkill  = getBranchMainSkill(treeKey, branchIdx);
            const sideSkills = getBranchSideSkills(treeKey, branchIdx);
            const mainLvl    = liveSkillPts[mainSkill.key] ?? 0;
            const sideLvls   = sideSkills.map(s => liveSkillPts[s.key] ?? 0);
            const sideCaps   = sideSkills.map(() => getSideCap(mainSkill.key));
            const prevActive = idx > 0 && (liveSkillPts[getBranchMainSkill(
              treeEntries[idx - 1].treeKey, treeEntries[idx - 1].branchIdx).key] ?? 0) > 0;

            return (
              <div key={`tree_${idx}`}>
                {idx > 0 && <SpineSep color={fColor} lit={prevActive} />}
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
                  onNodeClick={(sk, isMain, gL) =>
                    handleNodeClick(
                      isMain ? { ...mainSkill, ...MAIN_SKILLS[mainSkill.key] } : { ...sk, ...SIDE_SKILLS[sk.key] },
                      isMain,
                      gL,
                      isMain ? null : mainSkill.key,
                    )
                  }
                />
              </div>
            );
          })}
        </div>

        {selectedNode && (() => {
          const liveLevel = liveSkillPts[selectedNode.skillKey] ?? 0;
          const maxLvl    = selectedNode.isMain ? 10 : 5;
          const liveGate  = selectedNode.isMain ? false :
            (selectedNode.mainKeyForBranch
              ? liveLevel >= getSideCap(selectedNode.mainKeyForBranch)
              : false);
          const canUp = liveUnspent > 0 && liveLevel < maxLvl && !liveGate;
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
              onLevelUp={() => handleLevelUp(selectedNode.skillKey, selectedNode.mainKeyForBranch)}
              onClose={() => setSelectedNode(null)}
            />
          );
        })()}
      </div>
    </div>
  );
}
