import { useState, useEffect } from "react";

// "2m ago" / "just now" style relative label for a message timestamp. Per
// the owner: messages already store `ts` as a plain epoch-ms number (see
// shared/utils/chatRules.js's createMessage, `now: Date.now()`), which is
// already UTC under the hood — a future real server can hand back the exact
// same kind of value and this needs no changes, only the rendering here
// would eventually move server-side too.
function formatRelative(ts) {
  const diffMs = Date.now() - ts;
  const s = Math.floor(diffMs / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Re-renders itself periodically so the label keeps advancing ("2m ago" ->
// "3m ago") without needing a message re-send.
export function useRelativeTime(ts) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 15000);
    return () => clearInterval(id);
  }, []);
  return formatRelative(ts);
}
