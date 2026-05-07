// Auto device detection — phone / tablet / desktop
// Used to drive layout, icon sizes, and touch target sizes across the app.

function detect() {
  if (typeof window === "undefined") return "phone";
  const w = window.innerWidth;
  const h = window.innerHeight;
  const hasTouch = navigator.maxTouchPoints > 0;
  const larger = Math.max(w, h);

  if (!hasTouch) return "desktop";           // mouse device
  if (larger >= 1024) return "tablet";       // large touch screen
  return "phone";
}

export const DEVICE = detect();
export const IS_PHONE   = DEVICE === "phone";
export const IS_TABLET  = DEVICE === "tablet";
export const IS_DESKTOP = DEVICE === "desktop";

// World map scale strategy per device
export function worldMapScale(screenW, screenH, DW, DH) {
  if (IS_DESKTOP) return Math.min(screenW / DW, screenH / DH); // letterbox, no clip
  if (IS_TABLET)  return Math.min(screenW / DW, screenH / DH); // same — tablets have room
  return screenH / DH;                                          // phone: fill height, clip width
}

// Keep icon base size multiplier
export const ICON_SCALE = IS_PHONE ? 1.0 : IS_TABLET ? 0.85 : 0.7;

// Touch/click target padding
export const HIT_PAD = IS_DESKTOP ? 0 : IS_TABLET ? 4 : 6;
