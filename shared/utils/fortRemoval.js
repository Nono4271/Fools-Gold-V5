// Pure rules for fort demolish/abandon timers. The deadline lives on the fort
// itself (`fort.removal = { mode, endsAt }`), so it survives closing the popup
// and is checked against real time (catches up after a backgrounded tab).
export const FORT_REMOVAL_MS = { demolish: 30 * 60_000, abandon: 45 * 60_000 };

// Returns the fort with a removal timer started. Unchanged if the mode is
// unknown or a removal is already running (start can't reset the clock).
export function withFortRemoval(fort, mode, now) {
  const ms = FORT_REMOVAL_MS[mode];
  if (!fort || !ms || fort.removal) return fort;
  return { ...fort, removal: { mode, endsAt: now + ms } };
}

// Returns the fort without a removal timer (same object if none was running).
export function withoutFortRemoval(fort) {
  if (!fort?.removal) return fort;
  const { removal, ...rest } = fort; // eslint-disable-line no-unused-vars
  return rest;
}

// Removals whose deadline has passed: [{ fortId, mode }].
export function dueFortRemovals(forts, now) {
  const due = [];
  for (const f of forts || []) {
    if (f.removal && now >= f.removal.endsAt) due.push({ fortId: f.id, mode: f.removal.mode });
  }
  return due;
}
