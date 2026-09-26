import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fortArtFor,fortFootprint,fitFortArt} from '../src/utils/fortLayout.js';
const source=readFileSync(new URL('../src/MapRenderer.jsx',import.meta.url),'utf8');
const code=source.slice(source.indexOf('const _fortSpriteMap ='),source.indexOf('/* ─── Crew structures:')).replace('export function','function');
class Node {
 constructor(){this.children=[];this.anchor={set:(x,y)=>{this.ax=x;this.ay=y;}};}
 addChild(n){this.children.push(n);n.parent=this;}
 removeChild(n){this.children=this.children.filter(c=>c!==n);n.parent=null;}
 destroy(){this.destroyed=true;}
}
class Sprite extends Node {constructor(texture){super();this.texture=texture;}}
class Graphics extends Node {beginFill(){} endFill(){} drawPolygon(points){this.points=points;}}
function harness(){
 const pending=[];
 const PIXI={Sprite,Graphics,Texture:{fromURL:url=>new Promise((resolve,reject)=>pending.push({url,resolve,reject}))}};
 const api=vm.runInNewContext(code+';({syncForts,clearFortCache})',{fortArtFor,fortFootprint,fitFortArt});
 const layer=new Node(),cache={};
 return {pending,layer,cache,clear:api.clearFortCache,sync:forts=>api.syncForts(forts,PIXI,cache,layer)};
}
const fort=level=>({tileKey:'21,17',level});
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
for(const cached of [true,false])test(`all fort levels use calibrated ${cached?'cached':'async'} placement`,async()=>{
 const h=harness();
 for(let level=1;level<=5;level++){
  const art=fortArtFor(level),layout=fitFortArt(art,fortFootprint(21,17));
  if(cached)h.cache[`/forts/${art.file}`]={};
  h.sync([fort(level)]);
  if(!cached){h.pending.at(-1).resolve({});await flush();}
  assert.equal(h.layer.children.length,1);
  const s=h.layer.children[0];
  assert.equal(s.width,layout.width);assert.equal(s.height,layout.height);
  assert.equal(s.x,layout.x);assert.equal(s.y,layout.y);
  assert.equal(s.ax,layout.anchorX);assert.equal(s.ay,layout.anchorY);assert.equal(s.__fortLevel,level);
 }
});
test('upgrade invalidates stale image loads and repeated sync does not duplicate them',async()=>{
 const h=harness();h.sync([fort(1)]);h.sync([fort(1)]);assert.equal(h.pending.length,1);
 h.sync([fort(5)]);h.pending[1].resolve({});await flush();h.pending[0].resolve({});await flush();
 assert.equal(h.layer.children.length,1);assert.equal(h.layer.children[0].__fortLevel,5);
});
for(const action of ['remove','clear','destroy'])test(`${action} suppresses outstanding fort load`,async()=>{
 const h=harness();h.sync([fort(1)]);
 if(action==='remove')h.sync([]);if(action==='clear')h.clear();if(action==='destroy')h.layer.destroy();
 h.pending[0].resolve({});await flush();assert.equal(h.layer.children.length,0);
});
test('failed texture fallback uses the same ground diamond and upgrades cleanly',async()=>{
 const h=harness();h.sync([fort(1)]);h.pending[0].reject(Error('missing'));await flush();
 assert.deepEqual(h.layer.children[0].points,fortFootprint(21,17).points);
 h.sync([fort(2)]);assert.equal(h.layer.children.length,0);h.pending[1].resolve({});await flush();
 assert.equal(h.layer.children.length,1);assert.equal(h.layer.children[0].__fortLevel,2);
});
