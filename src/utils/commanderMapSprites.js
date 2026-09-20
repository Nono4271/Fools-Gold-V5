import {TW, TH, isoXY} from '../../shared/constants/geometry.js';

export function commanderAtlas(cmd) {
  if (cmd.id === 'h1' || cmd.bust?.includes('h1_redwake_fynn')) return '/commanders/map/h1-walk-v1.png';
  if (cmd.id === 'h13' || cmd.bust?.includes('h13_admiral_brine')) return '/commanders/map/h13-walk-v1.png';
  return null;
}

// Worker coordinates are tile origins, interpolated continuously between centres.
export function commanderInsideHQ(cmd, tiles, position) {
  const tile = tiles[cmd.tk];
  if (!tile) return true;
  if (!cmd.march || !position) return Boolean(tile.isHQ || tile.isHQPart);
  const origin = isoXY(tile.c, tile.r);
  const dx = (position.px-origin.cx)/(TW/2);
  const dy = (position.py+(tile.isWin?10:4)-origin.cy)/(TH/2);
  const c = Math.round(tile.c+(dx+dy)/2);
  const r = Math.round(tile.r+(dy-dx)/2);
  const at = tiles[`${c},${r}`];
  return Boolean(at?.isHQ || at?.isHQPart);
}

export function facingRow(dx, dy, previous = 0) {
  if (Math.abs(dx)+Math.abs(dy)<0.001) return previous;
  return dy >= 0 ? (dx>=0 ? 0 : 1) : (dx>=0 ? 2 : 3);
}

export function animationColumn(marching, now) {
  return marching ? 1 + Math.floor(now/130)%5 : 0;
}

export function makeAtlasEntry(PIXI, url, textCont) {
  const texture = PIXI.Texture.from(url);
  const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
  sprite.anchor.set(0.5, 0.97);
  const entry = {sprite, direction:0, frames:null, atlas:true, base:texture.baseTexture};
  const ready = () => {
    if (sprite.destroyed) return;
    const {width,height} = entry.base;
    entry.frames = Array.from({length:24},(_,i)=>new PIXI.Texture(entry.base,
      new PIXI.Rectangle((i%6)*width/6,Math.floor(i/6)*height/4,width/6,height/4)));
    sprite.texture = entry.frames[0];
    sprite.width = 52; sprite.height = 52;
  };
  entry.onLoaded = ready;
  if (entry.base.valid) ready();
  else entry.base.once('loaded',ready);
  textCont.addChild(sprite);
  return entry;
}
