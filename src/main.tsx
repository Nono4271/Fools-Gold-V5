import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Block iOS Safari pull-to-refresh and swipe-back-navigation for the entire
// document, EXCEPT where a touch needs its native behaviour:
//   - interactive elements (buttons, inputs, links…) so taps/clicks work;
//   - anything inside a real scroll container. This used to be a hand-kept
//     whitelist of class names (.chat-scroll, .crew-scroll, …) — every
//     scrollable list NOT on it (HQ lists, Commander, Tomes, Reports…) was
//     un-scrollable on iOS when the swipe started on plain text/whitespace.
//     Now any ancestor that can actually scroll (overflow auto/scroll AND
//     content taller/wider than its box) lets the gesture through.
function inScrollableArea(el: Element | null): boolean {
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
    const cs = getComputedStyle(n);
    const y = /(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1;
    const x = /(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1;
    if (y || x) return true;
  }
  return false;
}

document.addEventListener(
  "touchstart",
  (e) => {
    // The separate 3D demo owns its touch handling.
    if (new URLSearchParams(location.search).get("demo3d") === "1") return;
    // When a scrollable overlay screen is active, let the browser handle
    // touch naturally so pan gestures reach the scroll containers.
    if (document.documentElement.classList.contains("gacha-open")) return;
    const target = e.target as Element | null;
    if (!target) return;
    if (target.closest("canvas")) return; // MapRenderer handles its own touches
    // Screens that opted out explicitly (kept for long-press/context menus
    // even when their list is too short to scroll).
    if (target.closest(".gear-picker-list, .roster-scroll, .battle-popup, .find-tiles-popup, .chat-scroll, .crew-scroll, .training-scroll")) return;
    const interactive = target.closest(
      'button, input, select, textarea, a, [role="button"], [role="slider"], [role="checkbox"]'
    );
    if (interactive) return;
    // Tappable <div>s (onClick rows like the fort picker) have no tag to spot,
    // but they all use cursor:pointer (inherited by their children). Blocking
    // their touchstart killed the click on phones.
    if (getComputedStyle(target).cursor === "pointer") return;
    if (inScrollableArea(target)) return;
    e.preventDefault();
  },
  { passive: false }
);

// ── Range sliders: jump-to-finger + drag anywhere on the track ─────────────
// iOS Safari only moves an <input type="range"> if you land exactly on its
// small thumb, and a horizontal drag inside a vertical scroll list often gets
// taken as a scroll. For every range input in the game: touching the track
// sets the value under the finger, and dragging tracks the finger; the
// change is pushed through the native value setter + an "input" event so
// React's onChange/onInput fire exactly as for a mouse drag.
const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
let activeRange: HTMLInputElement | null = null;
function setRangeFromTouch(input: HTMLInputElement, clientX: number) {
  const r = input.getBoundingClientRect();
  if (r.width <= 0) return;
  const min = Number(input.min || 0), max = Number(input.max || 100);
  const stepAttr = input.step;
  const step = stepAttr && stepAttr !== "any" ? Number(stepAttr) || 1 : 1;
  const pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  let v = min + pct * (max - min);
  v = Math.round((v - min) / step) * step + min;
  if (pct >= 0.995) v = max; // let the very end always reach max (some sliders' max isn't a step multiple)
  v = Math.min(max, Math.max(min, v));
  if (String(v) === input.value) return;
  nativeValueSetter?.call(input, String(v));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
document.addEventListener("touchstart", (e) => {
  const t = e.target as Element | null;
  const input = t?.closest('input[type="range"]') as HTMLInputElement | null;
  if (!input || input.disabled || e.touches.length !== 1) return;
  activeRange = input;
  setRangeFromTouch(input, e.touches[0].clientX);
}, { passive: true });
document.addEventListener("touchmove", (e) => {
  if (!activeRange || e.touches.length !== 1) return;
  e.preventDefault(); // keep the list from scrolling while dragging a slider
  setRangeFromTouch(activeRange, e.touches[0].clientX);
}, { passive: false });
const endRange = () => { activeRange = null; };
document.addEventListener("touchend", endRange, { passive: true });
document.addEventListener("touchcancel", endRange, { passive: true });

if (new URLSearchParams(window.location.search).get("demo3d") === "1") {
  document.title = "Fool's Gold — 3D Map Test";
  void import("./three-demo.js");
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
