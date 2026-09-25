import {isoXY, TW, TH} from '../../shared/constants/geometry.js';

// The approved terrain and resource art now applies to every world tile.
// Rendering is still viewport-buffered in MapRenderer, so this does not draw
// the full 2048×2048 map at once.
export function usesNewWorldVisuals(c, r) {
  return Number.isFinite(c) && Number.isFinite(r);
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

// Build the 12 possible outer edge segments of a 3x3 HQ. Segments touching
// territory owned by the same player are omitted so the HQ joins the territory.
export function hqJoinedBorderSegments(pc, r0, tiles) {
  const hq = tiles[`${pc},${r0}`];
  if (!hq) return [];
  const segments=[];
  const add=(c,r,side,nc,nr)=>{
    if (sameTerritory(hq,tiles[`${nc},${nr}`])) return;
    const {cx,cy}=isoXY(c,r), top=[cx,cy], right=[cx+TW/2,cy+TH/2];
    const bottom=[cx,cy+TH], left=[cx-TW/2,cy+TH/2];
    const pair=side===0?[top,right]:side===1?[right,bottom]:side===2?[bottom,left]:[left,top];
    segments.push(pair.flat());
  };
  for(let i=-1;i<=1;i++) {
    add(pc+i,r0-1,0,pc+i,r0-2);
    add(pc+1,r0+i,1,pc+2,r0+i);
    add(pc+i,r0+1,2,pc+i,r0+2);
    add(pc-1,r0+i,3,pc-2,r0+i);
  }
  return segments;
}

// The surface centre is shared by selection, props and the large resource base.
export function resourceFootprint(c, r, tile = {}) {
  const {cx, cy} = isoXY(c, r);
  // A P10+ primary tile is "large" (2x2) whether or not it's still garrisoned
  // (tile.isKeep): capture intentionally clears isKeep on it to unlock
  // building, so gating on isKeep alone would silently shrink a captured
  // tile back to 1x1. powerLevel >= 10 alone is enough to identify it —
  // mapGen.worker.js's stampP10 always demotes neighbor/non-structure tiles
  // below 10 — so only !tile.isGate is needed as a guard.
  const large = (tile.powerLevel || 0) >= 10 && !tile.isGate;
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
