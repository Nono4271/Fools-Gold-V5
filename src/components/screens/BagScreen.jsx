import { useEffect, useState } from "react";
import { CSS } from "../../constants/css.js";
import { GEAR_RARITY, GEAR_SLOTS } from "../../../shared/constants/gear.js";
import GearInventory from "../game/GearInventory.jsx";

// Rarity sort order: legendary > epic > rare > common
const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 };

// Commander rarity order for schematics: champion > veteran > soldier
const CMD_RARITY_ORDER = { champion: 0, veteran: 1, soldier: 2 };

const RARITY_COLOR = {
  legendary: "#f0c040",
  epic:      "#a855f7",
  rare:      "#4488cc",
  common:    "#8a8a8a",
  champion:  "#f0c040",
  veteran:   "#a855f7",
  soldier:   "#4488cc",
};

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "10px 0",
        background: active ? "rgba(255,255,255,.05)" : "none",
        border: "none",
        borderBottom: active ? "2px solid #c8a060" : "2px solid transparent",
        color: active ? "#c8a060" : "#4a3a20",
        fontFamily: "'Cinzel',serif", fontSize: 10, letterSpacing: ".05em",
        cursor: "pointer", touchAction: "manipulation",
        transition: "color .15s, border-color .15s",
      }}
    >
      {label}
    </button>
  );
}

// ── Schematics tab ────────────────────────────────────────────────────────────
function SchematicsTab({ schematics }) {
  if (!schematics?.length) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
        color: "#4a3a20", fontFamily: "'Cinzel',serif",
      }}>
        <div style={{ fontSize: 36, opacity: 0.3 }}>📜</div>
        <div style={{ fontSize: 10, letterSpacing: ".05em" }}>NO SCHEMATICS</div>
        <div style={{ fontSize: 8, color: "#2a1e10", textAlign: "center", maxWidth: 200 }}>
          Pull from the Summon gate to collect commander schematics
        </div>
      </div>
    );
  }

  // Group by instanceId base (same n + rarity = same schematic type), count duplicates
  // Key: `${rarity}|${commanderId ?? "generic"}|${commanderName ?? "Generic"}`
  const grouped = new Map();
  for (const sc of schematics) {
    const key = `${sc.rarity}|${sc.commanderId ?? "generic"}|${sc.commanderName ?? "Generic Schematic"}`;
    if (!grouped.has(key)) {
      grouped.set(key, { sc, count: 0 });
    }
    grouped.get(key).count++;
  }

  // Sort: by commander rarity desc, then count desc, then name asc
  const sorted = [...grouped.values()].sort((a, b) => {
    const ra = CMD_RARITY_ORDER[a.sc.rarity] ?? 9;
    const rb = CMD_RARITY_ORDER[b.sc.rarity] ?? 9;
    if (ra !== rb) return ra - rb;
    if (b.count !== a.count) return b.count - a.count;
    const na = a.sc.commanderName ?? "Generic Schematic";
    const nb = b.sc.commanderName ?? "Generic Schematic";
    return na.localeCompare(nb);
  });

  return (
    <div className="scr" style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map(({ sc, count }) => {
          const col = RARITY_COLOR[sc.rarity] ?? "#8a8a8a";
          const name = sc.isGeneric
            ? `Generic ${sc.rarity.charAt(0).toUpperCase() + sc.rarity.slice(1)} Schematic`
            : `${sc.commanderName} Schematic`;
          return (
            <div
              key={`${sc.rarity}|${sc.commanderId ?? "g"}|${sc.commanderName ?? ""}`}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px",
                background: `${col}0d`,
                border: `1px solid ${col}30`,
                borderRadius: 6,
              }}
            >
              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: `${col}18`, border: `1px solid ${col}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>
                {sc.icon ?? "📜"}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Cinzel',serif", fontSize: 9,
                  color: col, letterSpacing: ".04em",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {name}
                </div>
                <div style={{
                  fontFamily: "'Crimson Pro',serif", fontSize: 10,
                  color: "#6a5a3a", marginTop: 2,
                }}>
                  +{sc.points} respect pts
                </div>
              </div>

              {/* Count badge */}
              <div style={{
                minWidth: 24, height: 24, borderRadius: 12, flexShrink: 0,
                background: `${col}22`, border: `1px solid ${col}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Cinzel',serif", fontSize: 9, color: col, fontWeight: 700,
              }}>
                ×{count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Consumables tab ───────────────────────────────────────────────────────────
function ConsumablesTab() {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 12,
      color: "#4a3a20", fontFamily: "'Cinzel',serif",
    }}>
      <div style={{ fontSize: 36, opacity: 0.3 }}>🧪</div>
      <div style={{ fontSize: 10, letterSpacing: ".05em" }}>COMING SOON</div>
      <div style={{ fontSize: 8, color: "#2a1e10", textAlign: "center", maxWidth: 200 }}>
        Consumable items will appear here once available
      </div>
    </div>
  );
}

// ── Gear tab — sorted inventory ───────────────────────────────────────────────
// Sorting: equipped first, then unequipped
// Within each group: rarity desc → total upgrades (stars + goldStars) desc
function GearTab({ gearInventory, setGearInventory, cmds, setCmds, playerAlignment }) {
  // Sort the inventory before passing to GearInventory
  const sorted = [...(gearInventory ?? [])].sort((a, b) => {
    const aEquipped = a.equippedBy != null ? 0 : 1;
    const bEquipped = b.equippedBy != null ? 0 : 1;
    if (aEquipped !== bEquipped) return aEquipped - bEquipped;
    // Rarity
    const ra = RARITY_ORDER[a.rarity] ?? 9;
    const rb = RARITY_ORDER[b.rarity] ?? 9;
    if (ra !== rb) return ra - rb;
    // Slot type
    const slotKeys = Object.keys(GEAR_SLOTS);
    const sa = slotKeys.indexOf(a.slot);
    const sb = slotKeys.indexOf(b.slot);
    if (sa !== sb) return sa - sb;
    // Upgrades desc (stars + goldStars)
    const ua = (a.stars ?? 0) + (a.goldStars ?? 0);
    const ub = (b.stars ?? 0) + (b.goldStars ?? 0);
    return ub - ua;
  });

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <GearInventory
        inventory={sorted}
        setInventory={setGearInventory}
        cmds={cmds}
        setCmds={setCmds}
        playerAlignment={playerAlignment}
      />
    </div>
  );
}

// ── BagScreen ─────────────────────────────────────────────────────────────────
export default function BagScreen({
  gearInventory, setGearInventory,
  cmds, setCmds,
  playerAlignment,
  respectSchematics,
  onClose,
}) {
  const [tab, setTab] = useState("gear");

  useEffect(() => {
    document.documentElement.classList.add("gacha-open");
    return () => document.documentElement.classList.remove("gacha-open");
  }, []);

  const totalGear = gearInventory?.length ?? 0;
  const totalSchematics = respectSchematics?.length ?? 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9200,
      background: "#080704",
      display: "flex", flexDirection: "column",
      paddingLeft: "var(--sal, 0px)",
      height: "100dvh",
      overflow: "hidden",
    }}>
      <style>{CSS}</style>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        paddingTop: "calc(var(--sat) + 12px)",
        background: "linear-gradient(180deg,rgba(20,15,5,1),rgba(10,8,3,.97))",
        borderBottom: "1px solid #2a1e08",
        flexShrink: 0, position: "relative",
      }}>
        {/* Gold trim */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg,transparent,#8a6020 20%,#f0c04066 50%,#8a6020 80%,transparent)",
        }} />

        <button onClick={onClose} style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "rgba(255,255,255,.04)", border: "1px solid #2e2010",
          color: "#8a7050", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          touchAction: "manipulation",
        }}>←</button>

        <div style={{
          fontFamily: "'Cinzel Decorative',serif", fontSize: 13,
          background: "linear-gradient(135deg,#c8a040,#8a6020aa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: ".04em",
        }}>🎒 Bag</div>

        {/* Counts */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {tab === "gear" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8a040", boxShadow: "0 0 6px #c8a040" }} />
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#4a3a20" }}>
                {totalGear} piece{totalGear !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {tab === "schematics" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 6px #a855f7" }} />
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#4a3a20" }}>
                {totalSchematics} schematic{totalSchematics !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", flexShrink: 0,
        borderBottom: "1px solid #2a1e08",
        background: "rgba(0,0,0,.3)",
      }}>
        <Tab label="⚔ GEAR"        active={tab === "gear"}        onClick={() => setTab("gear")} />
        <Tab label="📜 SCHEMATICS" active={tab === "schematics"}  onClick={() => setTab("schematics")} />
        <Tab label="🧪 CONSUMABLES" active={tab === "consumables"} onClick={() => setTab("consumables")} />
      </div>

      {/* Content */}
      {tab === "gear" && (
        <GearTab
          gearInventory={gearInventory}
          setGearInventory={setGearInventory}
          cmds={cmds}
          setCmds={setCmds}
          playerAlignment={playerAlignment}
        />
      )}
      {tab === "schematics" && (
        <SchematicsTab schematics={respectSchematics} />
      )}
      {tab === "consumables" && (
        <ConsumablesTab />
      )}
    </div>
  );
}
