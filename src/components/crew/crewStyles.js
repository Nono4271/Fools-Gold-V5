// Shared style tokens for the Crew 2.0 screens — same palette/type scale
// CrewPanel.jsx used, split out so every crew/ component draws from one place.
export const BTN_RESET = {
  background: "none", border: "none", padding: 0, margin: 0,
  cursor: "pointer", WebkitAppearance: "none", appearance: "none",
  touchAction: "manipulation",
};

export const PANEL_BG   = "rgba(5,7,11,.97)";
export const BORDER_COL = "#1a2030";
export const GOLD       = "#c8a060";
export const TEXT_SM    = { fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: ".04em" };
export const TEXT_XS    = { fontFamily: "'Cinzel',serif", fontSize: 7, letterSpacing: ".04em" };
export const TEXT_BODY  = { fontFamily: "'Crimson Pro',serif", fontSize: 10 };

export function primaryBtn(disabled) {
  return {
    ...BTN_RESET, width: "100%", padding: "10px 0", borderRadius: 4,
    background: disabled ? "rgba(10,14,20,.5)" : "linear-gradient(160deg,#1a3a2a,#0e2018)",
    border: `1px solid ${disabled ? "#1a2028" : "#306050"}`,
    color: disabled ? "#2a3a38" : "#50c090",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export function dangerBtn() {
  return {
    ...BTN_RESET, width: "100%", padding: "9px 0", borderRadius: 4,
    background: "rgba(80,20,20,.3)", border: "1px solid #602020",
    color: "#cc4040", cursor: "pointer",
  };
}
