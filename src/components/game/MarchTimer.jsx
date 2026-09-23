import { useEffect, useState } from "react";
import { marchMsLeft } from "../../../shared/utils/marchMotion.js";
import { fmtMsShort } from "../../../shared/utils/commanderStatus.js";

// Live "🥾 1m 23s" countdown for a commander's march. Ticks once a second
// on its own, so the parent doesn't need to re-render.
export function useMarchMsLeft(march) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!march) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [march]);
  return march ? marchMsLeft(march, Date.now()) : 0;
}

export default function MarchTimer({ march, label = false, style }) {
  const ms = useMarchMsLeft(march);
  if (!march) return null;
  return (
    <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, whiteSpace: "nowrap", ...style }}>
      🥾 {label ? "MARCHING · " : ""}{fmtMsShort(ms)}
    </span>
  );
}
