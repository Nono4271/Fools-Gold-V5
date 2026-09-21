import { useState, useEffect } from "react";
import { translateText, deviceTargetLang } from "../utils/translate.js";

// Resolved once per page load — the "Auto from device" language choice
// (see ChatPanel.jsx's "Aa" header button / ReadMeAI.md), not per-message.
const TARGET_LANG = deviceTargetLang();

// Returns `text` translated into the device's language while `enabled` is
// true (the chat panel's "Aa" toggle), or the original `text` otherwise/
// while the translation is still in flight. Best-effort — see
// src/utils/translate.js for the fallback-on-failure behavior.
export function useTranslatedText(text, enabled) {
  const [translated, setTranslated] = useState(null);

  useEffect(() => {
    if (!enabled) { setTranslated(null); return; }
    let cancelled = false;
    setTranslated(null); // show the original while this message's translation is in flight
    translateText(text, TARGET_LANG).then(result => {
      if (!cancelled) setTranslated(result);
    });
    return () => { cancelled = true; };
  }, [text, enabled]);

  return enabled && translated != null ? translated : text;
}
