import {isoXY, TW, TH} from '../../shared/constants/geometry.js';

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

const isHqFootprint = (tile) => Boolean(tile?.isHQ || tile?.isHQPart);

// Edges are ordered top-right, right-bottom, bottom-left, left-top. Remove
// only an edge shared with the HQ; the other three sides remain full size.
export function selectionEdgesBesideHq(c, r, tiles) {
  return [
    !isHqFootprint(tiles[`${c},${r-1}`]),
    !isHqFootprint(tiles[`${c+1},${r}`]),
    !isHqFootprint(tiles[`${c},${r+1}`]),
    !isHqFootprint(tiles[`${c-1},${r}`]),
  ];
}

// The surface centre is shared by selection, props and the large resource base.
export function resourceFootprint(c, r, tile = {}) {
  const {cx, cy} = isoXY(c, r);
  const large = tile.isKeep && !tile.isGate && (tile.powerLevel || 0) >= 10;
  const hw = large ? TW : TW / 2;
  const hh = large ? TH : TH / 2;
  const y = cy - 4 + hh;
  return {x:cx, y, halfWidth:hw, halfHeight:hh,
    points:[cx,y-hh,cx+hw,y,cx,y+hh,cx-hw,y]};
}

export function resourceLayout(powerLevel) {
  const pl = Math.max(2, Math.min(13, Number(powerLevel) || 2));
  if (pl >= 10) {
    const size = 104 + (pl - 10) * 7;
    const details = [[-37,20],[35,22],[0,34]].slice(0,pl-10);
    return [{family:'large',x:0,y:9,width:size},
      ...details.map(([x,y]) => ({family:'small',x,y,width:22}))];
  }
  // Add objects, not just pixels: P2 has two; P9 has five.
  const count = 2 + Math.floor((pl - 2) / 2);
  const layouts = {
    2:[[-10,-1],[10,1]],
    3:[[0,-7],[-13,5],[13,5]],
    4:[[0,-9],[-15,0],[15,0],[0,10]],
    5:[[-9,-7],[9,-7],[-17,4],[17,4],[0,12]],
  };
  return layouts[count].map(([x,y]) => ({family:'small',x,y,width:22+(pl-2)*0.9}));
}
