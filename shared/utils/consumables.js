// Pure rules for bag consumables and timer speedups (moved from Game.jsx).

export const EXPEDIENCE_WINDOW_MS = 5 * 60 * 1000; // Expedience finishes builds with <= 5 min left
export const RSS_BOOST_BONUS = 0.30;              // active resource boost adds +30% income

// Remove one of typeId; the entry disappears at zero.
export function consumeOne(list, typeId) {
  const entry = list.find(c => c.typeId === typeId);
  if (!entry || entry.quantity <= 0) return list;
  if (entry.quantity === 1) return list.filter(c => c.typeId !== typeId);
  return list.map(c => c.typeId === typeId ? { ...c, quantity: c.quantity - 1 } : c);
}

// Give one back (used when an item could not actually be used).
export function restoreOne(list, typeId, now) {
  const entry = list.find(c => c.typeId === typeId);
  if (entry) return list.map(c => c.typeId === typeId ? { ...c, quantity: c.quantity + 1 } : c);
  return [...list, { instanceId: `cons_restore_${now}`, typeId, quantity: 1 }];
}

// Building speedup: shortens every running building upgrade.
export function speedUpBuildings(upgQueue, durationMs, now) {
  const next = { ...upgQueue };
  for (const key of Object.keys(next)) {
    const entry = next[key];
    if (entry && entry.endsAt > now) next[key] = { ...entry, endsAt: Math.max(now, entry.endsAt - durationMs) };
  }
  return next;
}

// Recall speedup: shortens the remaining travel time of every player
// commander currently marching home ({type:"recall"} — a fort being
// destroyed/decommissioned, or a forced/manual recall). Training and forts
// are excluded per the locked no-speedup rule; this only ever touches
// recall marches. Shifting lastStepTime back lets the normal march-step
// catch-up (advanceMarch) cover the skipped distance on its next tick,
// same mechanism used for background/offline catch-up.
export function speedUpRecall(cmds, durationMs) {
  return cmds.map(c => {
    if (c.owner !== "player" || c.march?.type !== "recall") return c;
    return { ...c, march: { ...c.march, lastStepTime: c.march.lastStepTime - durationMs } };
  });
}

// Expedience tactic: finish one building upgrade if it is inside the window.
export function expediteBuilding(upgQueue, buildingType, now) {
  const entry = upgQueue[buildingType];
  if (!entry) return upgQueue;
  if (entry.endsAt - now > EXPEDIENCE_WINDOW_MS) return upgQueue;
  return { ...upgQueue, [buildingType]: { ...entry, endsAt: now } };
}

// Resource boost: start or extend the boost for one resource.
export function extendRssBoost(rssSpeedUps, rssType, durationMs, now) {
  return { ...rssSpeedUps, [rssType]: Math.max(now, rssSpeedUps[rssType] ?? 0) + durationMs };
}

// Add active resource boosts to the base income bonus.
export function withRssBoosts(rssBonus, rssSpeedUps, now) {
  const next = { ...rssBonus };
  for (const [rssType, endsAt] of Object.entries(rssSpeedUps)) {
    if (endsAt > now) next[rssType] = (next[rssType] ?? 0) + RSS_BOOST_BONUS;
  }
  return next;
}
