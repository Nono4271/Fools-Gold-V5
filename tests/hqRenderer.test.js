import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {isoXY,TW,TH} from '../shared/constants/geometry.js';
import {hqArtFor,hqFootprint,fitHqArt} from '../src/utils/hqLayout.js';
import {hqJoinedBorderSegments} from '../src/utils/worldVisuals.js';
// Run the actual renderer construction function against a tiny PIXI surface.
// This checks the loaded/cached integration without needing a GPU in node:test.
const source=readFileSync(new URL('../src/MapRenderer.jsx',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('function _buildOneHQ('),source.indexOf('const _hqTexCache'));
const build=vm.runInNewContext(`(${fn})`,{isoXY,TW,TH,hqArtFor,hqFootprint,fitHqArt,hqJoinedBorderSegments,
 usesNewWorldVisuals:()=>true,ownerTint:()=>0x559955,softenTerritoryColor:x=>x,fillVisualGround:()=>{}});
class Node {
 constructor(){this.children=[];this.x=0;this.y=0;this.anchor={set:(x,y)=>{this.ax=x;this.ay=y}};this.position={set:(x,y)=>{this.x=x;this.y=y}};this.skew={set:()=>{}};}
 addChild(n){this.children.push(n);n.parent=this;return n;}
 addChildAt(n,i){this.children.splice(i,0,n);n.parent=this;}
 removeChild(n){this.children=this.children.filter(c=>c!==n);n.parent=null;}
 destroy(){this.destroyed=true;}
}
class Graphics extends Node {beginFill(){} endFill(){} lineStyle(){} moveTo(){} lineTo(){} drawPolygon(p){this.polygon=p;} drawRoundedRect(){} on(){}}
class Sprite extends Node {constructor(texture){super();this.texture=texture;}}
class Text extends Node {constructor(){super();this.width=60;this.height=14;}}
const PIXI={Container:Node,Graphics,Sprite,Text,Polygon:class {constructor(p){this.points=p;}},Texture:{fromURL:async()=>({width:1024,height:1024})}};
for(const cached of [true,false])test(`HQ renderer ${cached?'cached':'async'} sprite matches footprint and clears name badge`,async()=>{
 const key='21,17',tile={isHQ:true,owner:'player',faction:'holyknights'},art=hqArtFor('holyknights'),fp=hqFootprint(21,17),fit=fitHqArt(art,fp);
 const cache=cached?{[`/hq/${art.file}`]:{width:1024,height:1024}}:{};
 const group=build(key,tile,key,()=>{},PIXI,{current:false},cache,'Test','holyknights',new Set(),null,{[key]:tile});
 await Promise.resolve();
 const sprite=group.children.find(n=>n instanceof Sprite),label=group.children.find(n=>n instanceof Text);
 assert.ok(sprite);assert.equal(sprite.width,fit.width);assert.equal(sprite.height,fit.height);
 assert.equal(sprite.x,fp.x);assert.equal(sprite.y,fp.y);assert.equal(sprite.ax,fit.anchorX);assert.equal(sprite.ay,fit.anchorY);
 assert.ok(label.y<fit.visibleTop);assert.ok(group.children.indexOf(sprite)<group.children.indexOf(label));
 const hit=group.children.find(n=>n.hitArea);assert.deepEqual([...hit.hitArea.points],fp.points);
});
