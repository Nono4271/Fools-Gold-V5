import {WALK_CYCLE_MS, WALK_FRAMES, COMMANDER_MAP_SIZE, RIG_SOURCE_SIZE, RIG_PADDING} from './commanderGait.js';
export const ATLAS_COLUMNS = WALK_FRAMES + 1;
export function commanderAtlas(cmd) {
  if (cmd.id === 'h1' || cmd.bust?.includes('h1_redwake_fynn')) return '/commanders/map/h1-walk-v3.png';
  if (cmd.id === 'h13' || cmd.bust?.includes('h13_admiral_brine')) return '/commanders/map/h13-walk-v3.png';
  if (cmd.id === 'h43' || cmd.bust?.includes('h43_countess_serava')) return '/commanders/map/h43-walk-v1.png';
  if (cmd.id === 'h45' || cmd.bust?.includes('h45_fang_groth')) return '/commanders/map/h45-walk-v1.png';
  return null;
}

// A commander is hidden only while undeployed at home. An active march stays
// visible even while its route visually overlaps the large HQ artwork.
export function commanderInsideHQ(cmd, tiles) {
  const tile = tiles[cmd.tk];
  if (!tile) return true;
  if (cmd.march) return false;
  return Boolean(tile.isHQ || tile.isHQPart);
}

export function facingRow(dx, dy, previous = 0) {
  if (Math.abs(dx)+Math.abs(dy)<0.001) return previous;
  return dy >= 0 ? (dx>=0 ? 0 : 1) : (dx>=0 ? 2 : 3);
}

export function animationColumn(marching, now) {
  return marching ? 1 + Math.floor((now % WALK_CYCLE_MS) * WALK_FRAMES / WALK_CYCLE_MS) : 0;
}

export function makeAtlasEntry(PIXI, url, textCont) {
  const texture = PIXI.Texture.from(url);
  const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
  const paddedSize = RIG_SOURCE_SIZE + RIG_PADDING * 2;
  sprite.anchor.set(0.5, (RIG_SOURCE_SIZE * 0.97 + RIG_PADDING) / paddedSize);
  const entry = {sprite, direction:0, frames:null, atlas:true, base:texture.baseTexture};
  const ready = () => {
    if (sprite.destroyed) return;
    const {width,height} = entry.base;
    entry.frames = Array.from({length:ATLAS_COLUMNS*4},(_,i)=>new PIXI.Texture(entry.base,
      new PIXI.Rectangle((i%ATLAS_COLUMNS)*width/ATLAS_COLUMNS,Math.floor(i/ATLAS_COLUMNS)*height/4,width/ATLAS_COLUMNS,height/4)));
    sprite.texture = entry.frames[0];
    // Padding prevents clipped boots without shrinking the character again.
    sprite.width = COMMANDER_MAP_SIZE * paddedSize / RIG_SOURCE_SIZE;
    sprite.height = sprite.width;
  };
  entry.onLoaded = ready;
  if (entry.base.valid) ready();
  else entry.base.once('loaded',ready);
  textCont.addChild(sprite);
  return entry;
}
