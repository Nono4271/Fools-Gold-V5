export function commanderAtlas(cmd) {
  if (cmd.id === 'h1' || cmd.bust?.includes('h1_redwake_fynn')) return '/commanders/map/h1-walk-v2.png';
  if (cmd.id === 'h13' || cmd.bust?.includes('h13_admiral_brine')) return '/commanders/map/h13-walk-v2.png';
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
  // A slower cycle makes both planted steps readable at map scale.
  return marching ? 1 + Math.floor(now/200)%5 : 0;
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
