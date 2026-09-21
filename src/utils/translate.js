// Lightweight client-side chat message translation.
//
// There is no game server (see ReadMeAI.md — chat is entirely local/
// in-memory today), so there's nowhere to do this server-side. This calls a
// public, key-free translation endpoint directly from the browser instead:
// the same unofficial Google Translate "gtx" web endpoint many open-source
// translation tools use for free, no-signup translation. It's unofficial —
// it could rate-limit or change shape without notice — so every call here
// is best-effort: on any failure this just returns the original text,
// since chat should never break because a translation call failed. A
// module-level cache avoids re-requesting the same line twice (the AI
// flavor-chatter pools repeat a lot).
const cache = new Map(); // `${targetLang}:${text}` -> translated text

// The device's own language, trimmed to a bare 2-letter code ("en-US" ->
// "en"). Falls back to English if unavailable.
export function deviceTargetLang() {
  const lang = (typeof navigator !== "undefined" && navigator.language) || "en";
  return (lang.split("-")[0] || "en").toLowerCase();
}

// Translates `text` into `targetLang`. The game's own text (flavor chatter,
// UI copy) is authored in English, so English targets are a deliberate
// no-op rather than a wasted round-trip.
export async function translateText(text, targetLang) {
  if (!text || !text.trim()) return text;
  if (!targetLang || targetLang === "en") return text;

  const key = `${targetLang}:${text}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`translate request failed: ${res.status}`);
    const data = await res.json();
    // Response shape: [[[translatedChunk, originalChunk, ...], ...], ..., sourceLangGuess]
    const translated = (data?.[0] || []).map(chunk => chunk[0]).join("");
    const result = translated || text;
    cache.set(key, result);
    return result;
  } catch {
    // Cache the fallback too, so a down/blocked endpoint doesn't get
    // hammered again on every re-render of the same message.
    cache.set(key, text);
    return text;
  }
}
