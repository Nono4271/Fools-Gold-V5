import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
    if (new URLSearchParams(location.search).get("demo3d") === "1") return;
    if (document.documentElement.classList.contains("gacha-open")) return;
    const target = e.target as Element | null;
    if (!target) return;
    if (target.closest("canvas")) return;
    if (target.closest(".gear-picker-list, .roster-scroll, .battle-popup, .find-tiles-popup, .chat-scroll, .crew-scroll, .training-scroll, .training-parent")) return;
    const interactive = target.closest(
      'button, input, select, textarea, a, [role="button"], [role="slider"], [role="checkbox"]'
    );
    if (interactive) return;
    if (getComputedStyle(target).cursor === "pointer") return;
    if (inScrollableArea(target)) return;
    e.preventDefault();
  },
  { passive: false }
);

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
  if (pct >= 0.995) v = max;
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
  e.preventDefault();
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
