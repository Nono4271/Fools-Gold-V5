import * as PIXI from 'pixi.js';
import {resourceLayout} from './worldVisuals.js';

// Anchors mark the centre of the pictured ground/root footprint, not the
// bottom of the bitmap. Each family keeps its original image proportions.
export const RESOURCE_ART = {
  wood: {small:{file:'wood-small.webp',anchorY:0.94},large:{file:'wood.webp',anchorY:0.71}},
  stone:{small:{file:'stone-small.webp',anchorY:0.78},large:{file:'stone.webp',anchorY:0.65}},
  food: {small:{file:'food-small.webp',anchorY:0.59},large:{file:'food.webp',anchorY:0.64}},
  gas:  {small:{file:'gas-small.webp',anchorY:0.78},large:{file:'gas.webp',anchorY:0.76}},
};

// Bake each power/resource combination once; every visible tile is still
// only one sprite on phones, even when its cluster contains five objects.
export function createResourceSpriteCache(renderer, onLoad) {
  const textures = {};
  const baked = new Map();
  const pending = [];
  for (const [rss,families] of Object.entries(RESOURCE_ART)) {
    textures[rss] = {};
    for (const [family,art] of Object.entries(families)) {
      const texture = PIXI.Texture.from(`/props/dark-map/${art.file}`);
      textures[rss][family] = texture;
      if (!texture.baseTexture.valid) {
        texture.baseTexture.once('loaded',onLoad);
        pending.push(texture.baseTexture);
      }
    }
  }
  return {
    get(rss,power) {
      if (!textures[rss]) return null;
      const key = `${rss}:${power}`;
      if (baked.has(key)) return baked.get(key);
      const layout = resourceLayout(power);
      if (layout.some(p => !textures[rss][p.family].baseTexture.valid)) return null;
      const group = new PIXI.Container();
      for (const part of [...layout].sort((a,b) => a.y-b.y)) {
        const sprite = new PIXI.Sprite(textures[rss][part.family]);
        sprite.anchor.set(0.5,RESOURCE_ART[rss][part.family].anchorY);
        sprite.scale.set(part.width/sprite.texture.width);
        sprite.position.set(part.x,part.y);
        group.addChild(sprite);
      }
      const bounds = group.getLocalBounds().clone().pad(2).ceil(1);
      const texture = renderer.generateTexture(group,{region:bounds,resolution:2});
      const result = {texture,anchorX:-bounds.x/bounds.width,anchorY:-bounds.y/bounds.height};
      group.destroy({children:true});
      baked.set(key,result);
      return result;
    },
    destroy() {
      pending.forEach(base => base.off('loaded',onLoad));
      baked.forEach(({texture}) => texture.destroy(true));
      baked.clear();
    },
  };
}
