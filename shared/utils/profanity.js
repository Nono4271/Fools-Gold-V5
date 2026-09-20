// Pure, local profanity filtering — whole-word, case-insensitive masking
// against a plain word list. No server, no async, no dependencies, so the
// exact same function can run server-side unchanged once the multiplayer
// server exists (this is a local sandbox filter today; see ReadMeAI.md).

export const DEFAULT_PROFANITY_WORDS = [
  "damn", "hell", "ass", "asshole", "crap", "shit", "fuck", "fucking",
  "bitch", "bastard", "piss", "dick", "cock", "pussy", "whore", "slut", "cunt",
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "shit" -> "s***"; single-character words just become "*".
export function censorWord(word) {
  return word.length <= 1 ? "*" : word[0] + "*".repeat(word.length - 1);
}

// Masks every whole-word match of `wordList` in `text`. Returns `text`
// unchanged if it's empty/falsy or the list is empty.
export function censorText(text, wordList = DEFAULT_PROFANITY_WORDS) {
  if (!text || !wordList?.length) return text;
  const pattern = new RegExp(`\\b(${wordList.map(escapeRegExp).join("|")})\\b`, "gi");
  return text.replace(pattern, censorWord);
}
