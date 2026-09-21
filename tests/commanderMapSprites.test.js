import test from 'node:test';
import assert from 'node:assert/strict';
import {commanderAtlas,commanderInsideHQ,facingRow,animationColumn} from '../src/utils/commanderMapSprites.js';
test('both pirates use atlases, including AI instances with replaced IDs',()=>{
  assert.match(commanderAtlas({id:'h1'}),/-v3\.png$/);assert.match(commanderAtlas({id:'h13'}),/-v3\.png$/);
  assert.match(commanderAtlas({id:'ai_cmd1',bust:'/commanders/h13_admiral_brine_bust.webp'}),/-v3\.png$/);
  assert.match(commanderAtlas({id:'h43'}),/-v1\.png$/);
  assert.match(commanderAtlas({id:'ai_fang',bust:'/commanders/h45_fang_groth_bust.webp'}),/-v1\.png$/);
  assert.equal(commanderAtlas({id:'h14'}),null);
});
test('HQ hides only undeployed commanders; every active march remains visible',()=>{
  const tiles={};for(let c=8;c<=12;c++)for(let r=8;r<=12;r++)tiles[`${c},${r}`]={c,r,isHQ:c===10&&r===10,isHQPart:Math.abs(c-10)<=1&&Math.abs(r-10)<=1};
  const cmd={tk:'10,10'};assert.equal(commanderInsideHQ(cmd,tiles),true);
  cmd.march={};assert.equal(commanderInsideHQ(cmd,tiles),false);
  cmd.tk='11,10';assert.equal(commanderInsideHQ(cmd,tiles),false);
  cmd.tk='12,10';assert.equal(commanderInsideHQ(cmd,tiles),false);
  cmd.march=null;assert.equal(commanderInsideHQ(cmd,tiles),false);
});
test('walking changes frames, arrival returns to standing, facing remains stable while stopped',()=>{
  assert.equal(animationColumn(true,0),1);assert.equal(animationColumn(true,550),17);
  assert.equal(animationColumn(true,1099),32);assert.equal(animationColumn(true,1100),1);
  assert.equal(animationColumn(false,650),0);
  assert.deepEqual([[1,1],[-1,1],[1,-1],[-1,-1]].map(([x,y])=>facingRow(x,y)),[0,1,2,3]);
  assert.equal(facingRow(0,0,3),3);
});
