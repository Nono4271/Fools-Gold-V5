export const SPAWN_VISUAL_RADIUS = 25;

export function parseMapKey(key) {
  if (!key) return null;
  const [c, r] = String(key).split(',').map(Number);
  return Number.isFinite(c) && Number.isFinite(r) ? { c, r } : null;
}

export function isInSpawnVisualArea(c, r, centerKey, radius = SPAWN_VISUAL_RADIUS) {
  const center = parseMapKey(centerKey);
  if (!center) return false;
  return Math.max(Math.abs(c - center.c), Math.abs(r - center.r)) <= radius;
}

export function territoryIdentity(tile) {
  if (!tile?.owner) return null;
  if (tile.owner === 'player') return 'player';
  if (tile.ownerPlayerId) return `player:${tile.ownerPlayerId}`;
  return `${tile.owner}:${tile.faction || 'none'}`;
}

export function sameTerritory(a, b) {
  const aid = territoryIdentity(a);
  return Boolean(aid && aid === territoryIdentity(b));
}

export function visualResourceWidth(powerLevel) {
  const pl = Math.max(2, Math.min(13, Number(powerLevel) || 2));
  return Math.round(46 + ((pl - 2) / 11) * 84);
}
