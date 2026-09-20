import test from 'node:test';
import assert from 'node:assert/strict';
import * as PIXI from 'pixi.js';
import {RESOURCE_ART,createResourceSpriteCache} from '../src/utils/resourceSprites.js';

test('resource baking reuses live textures and can cleanly reopen the map',()=>{
  const sources=[];
  for(const families of Object.values(RESOURCE_ART)) for(const art of Object.values(families)){
    const texture=new PIXI.Texture(new PIXI.BaseTexture(null,{width:256,height:256}));
    PIXI.Texture.addToCache(texture,`/props/dark-map/${art.file}`);sources.push(texture);
  }
  const baked=[];
  const renderer={generateTexture(group,{region}){
    // Every frame must contain the complete cluster, including tall trees.
    assert.ok(group.children.length>=1);
    assert.ok(region.width>0 && region.height>0);
    const texture=PIXI.RenderTexture.create({width:region.width,height:region.height});
    baked.push(texture);return texture;
  }};
  const cache=createResourceSpriteCache(renderer,()=>{});
  for(const rss of Object.keys(RESOURCE_ART)) for(const pl of [2,9,10,13]){
    const a=cache.get(rss,pl);
    assert.equal(a,cache.get(rss,pl));
    assert.ok(Number.isFinite(a.anchorX)&&Number.isFinite(a.anchorY));
    assert.equal(a.texture.destroyed,false);
  }
  assert.equal(baked.length,16);
  cache.destroy();
  assert.ok(baked.every(t=>t.destroyed));
  assert.ok(sources.every(t=>!t.destroyed));
  const reopened=createResourceSpriteCache(renderer,()=>{});
  assert.equal(reopened.get('wood',2).texture.destroyed,false);
  reopened.destroy();sources.forEach(t=>t.destroy(true));
});
