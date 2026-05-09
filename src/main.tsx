import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Block iOS Safari pull-to-refresh and swipe-back-navigation for the entire
// document. We skip truly interactive elements (buttons, inputs, links) so
// React onClick handlers continue to work. Everything else — HUD panels,
// the canvas overlay, empty space — will block the native gesture.
document.addEventListener(
  "touchstart",
  (e) => {
    // When a scrollable overlay screen is active, let the browser handle
    // touch naturally so pan gestures reach the scroll containers.
    if (document.documentElement.classList.contains("gacha-open")) return;
    const target = e.target as Element | null;
    if (!target) return;
    const interactive = target.closest(
      'button, input, select, textarea, a, [role="button"], [role="slider"], [role="checkbox"]'
    );
    if (!interactive) e.preventDefault();
  },
  { passive: false }
);

createRoot(document.getElementById("root")!).render(<App />);
