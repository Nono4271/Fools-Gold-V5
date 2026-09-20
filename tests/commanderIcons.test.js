import test from 'node:test';
import assert from 'node:assert/strict';
import {Container, Sprite, Texture} from 'pixi.js';
import {drawCommanderIcons, clearCommanderIcons} from '../src/utils/commanderIcons.js';

// Real Pixi sprites/container lifecycle; drawing commands need no GPU in these tests.
class Graphics extends Container {
  clear() {} beginFill() {} lineStyle() {} drawEllipse() {} drawCircle() {} endFill() {}
}
function fixture() {
  const cmd={uid:'one',tk:'1,1',owner:'player',bust:'portrait',march:null};
  const context={PIXI:{Sprite,Graphics,Texture:{from:()=>Texture.EMPTY}},gfx:new Graphics(),textCont:new Container(),cmds:[cmd],tiles:{'1,1':{c:1,r:1}},byTile:{'1,1':[cmd]},spriteMap:new Map(),posMap:new Map(),crewPids:new Set(),facKey:'pirates',aiPlayerIdMap:new Map(),isoXY:()=>({cx:100,cy:100}),TH:40};
  return {cmd,context,draw:()=>drawCommanderIcons(context)};
}
test('overlay refresh and marching frames retain the same live commander sprite',()=>{
  const {cmd,context,draw}=fixture();draw();const sprite=context.spriteMap.get(cmd.uid).sprite;
  for(let i=0;i<100;i++){
    cmd.march=i%2?{}:null;context.posMap.set(cmd.uid,{px:150+i,py:120});draw();
    assert.equal(context.spriteMap.get(cmd.uid).sprite,sprite);assert.equal(sprite.destroyed,false);
    assert.equal(sprite.x,cmd.march?150+i:100);
    assert.equal(context.textCont.children.length,2);
  }
  clearCommanderIcons(context.spriteMap);assert.equal(context.textCont.children.length,0);
});
test('opening Gacha after redraws can dispose icons without double destruction',()=>{
  const {context,draw}=fixture();draw();draw();
  const old=context.spriteMap.values().next().value.sprite;
  clearCommanderIcons(context.spriteMap);context.textCont.destroy({children:true});
  assert.equal(old.destroyed,true);assert.doesNotThrow(()=>clearCommanderIcons(context.spriteMap));
});
test('commander removal and return to map create fresh live objects without destroying shared textures',()=>{
  const {cmd,context,draw}=fixture();draw();const old=context.spriteMap.get(cmd.uid).sprite;
  context.cmds=[];context.byTile={};draw();assert.equal(old.destroyed,true);assert.equal(context.spriteMap.size,0);
  context.cmds=[cmd];context.byTile={'1,1':[cmd]};draw();
  assert.notEqual(context.spriteMap.get(cmd.uid).sprite,old);assert.equal(context.spriteMap.get(cmd.uid).sprite.texture,Texture.EMPTY);
  clearCommanderIcons(context.spriteMap);
});
test('a commander leaving the displayed group does not leave a stale portrait',()=>{
  const {cmd,context,draw}=fixture();draw();context.byTile={};draw();
  assert.equal(context.spriteMap.get(cmd.uid).sprite.visible,false);
  context.byTile={'1,1':[cmd]};draw();assert.equal(context.spriteMap.get(cmd.uid).sprite.visible,true);
  clearCommanderIcons(context.spriteMap);
});

test('HQ hides existing icons and removes their base markers',()=>{
  const {cmd,context,draw}=fixture();draw();
  let markers=0;context.gfx.drawCircle=()=>markers++;context.gfx.drawEllipse=()=>markers++;
  context.tiles['1,1'].isHQ=true;draw();
  assert.equal(context.spriteMap.get(cmd.uid).sprite.visible,false);assert.equal(markers,0);
  delete context.tiles['1,1'].isHQ;draw();assert.equal(context.spriteMap.get(cmd.uid).sprite.visible,true);
  clearCommanderIcons(context.spriteMap);
});

test('late atlas loading, alternating strides, direction changes and arrival use the live sprite',t=>{
  let now=10000;
  t.mock.method(Date,'now',()=>now);
  const base={valid:false,once(_event,callback){this.finish=callback;},off(){}};
  class FakeTexture { constructor(baseTexture,frame){this.baseTexture=baseTexture;this.frame=frame;} destroy(){} }
  FakeTexture.EMPTY={};FakeTexture.from=()=>({baseTexture:base});
  class FakeSprite { constructor(texture){this.texture=texture;this.anchor={set(){}};this.visible=true;this.destroyed=false;} destroy(){this.destroyed=true;} }
  class FakeRectangle { constructor(x,y,width,height){Object.assign(this,{x,y,width,height});} }
  const cmd={uid:'atlas',id:'h1',tk:'1,1',owner:'player',march:{}};
  const gfx=new Graphics(),textCont={addChild(){}};
  const spriteMap=new Map();
  const context={PIXI:{Texture:FakeTexture,Sprite:FakeSprite,Rectangle:FakeRectangle},gfx,textCont,cmds:[cmd],tiles:{'1,1':{c:1,r:1}},byTile:{'1,1':[cmd]},spriteMap,posMap:new Map([['atlas',{px:100,py:100}]]),crewPids:new Set(),facKey:'pirates',aiPlayerIdMap:new Map(),isoXY:()=>({cx:100,cy:100}),TH:40};
  drawCommanderIcons(context);
  const displayed=spriteMap.get('atlas');
  assert.equal(displayed.frames,null);
  Object.assign(base,{width:3696,height:448});base.finish();
  assert.equal(displayed.frames.length,132);
  assert.equal(displayed.frames[131].frame.x,3584);
  assert.equal(displayed.frames[131].frame.y,336);
  assert.ok(Math.abs(displayed.sprite.width*256/288-44.2)<1e-9);
  drawCommanderIcons(context);
  assert.equal(displayed.sprite.texture,displayed.frames[1]);
  now+=550;drawCommanderIcons(context);
  assert.equal(displayed.sprite.texture,displayed.frames[17]);
  context.posMap.set('atlas',{px:120,py:80});drawCommanderIcons(context);
  assert.equal(displayed.sprite.texture,displayed.frames[2*33+17]);
  cmd.march=null;drawCommanderIcons(context);
  assert.equal(displayed.sprite.texture,displayed.frames[2*33]);
  context.tiles['1,1'].isHQ=true;drawCommanderIcons(context);
  assert.equal(displayed.sprite.visible,false);
  cmd.march={};drawCommanderIcons(context);
  assert.equal(displayed.sprite.visible,true);
  assert.equal(displayed.sprite.texture,displayed.frames[2*33+1]);
  clearCommanderIcons(spriteMap);
});
