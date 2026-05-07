import { CSS } from "../../constants/css.js";
import GearInventory from "../game/GearInventory.jsx";

/*
  GearScreen — fullscreen gear inventory
  Opened from GameBar gear button. No HQ chrome.
*/
export default function GearScreen({ gearInventory, setGearInventory, cmds, setCmds, playerAlignment, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 700,
      background: "#080704",
      display: "flex", flexDirection: "column",
    }}>
      <style>{CSS}</style>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
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
        }}>←</button>

        <div style={{
          fontFamily: "'Cinzel Decorative',serif", fontSize: 13,
          background: "linear-gradient(135deg,#c8a040,#8a6020aa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: ".04em",
        }}>Gear</div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8a040",
            boxShadow: "0 0 6px #c8a040" }} />
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#4a3a20" }}>
            {gearInventory?.length ?? 0} piece{(gearInventory?.length ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Gear inventory fills remaining space */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <GearInventory
          inventory={gearInventory ?? []}
          setInventory={setGearInventory}
          cmds={cmds}
          setCmds={setCmds}
          playerAlignment={playerAlignment}
        />
      </div>
    </div>
  );
}
