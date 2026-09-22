import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {commanderAtlas,commanderInsideHQ,facingRow,animationColumn} from '../src/utils/commanderMapSprites.js';
test('All wired commanders resolve to their map atlases, including AI instances',()=>{
  assert.match(commanderAtlas({id:'h1'}),/-v3\.png$/);assert.match(commanderAtlas({id:'h13'}),/-v3\.png$/);
  assert.match(commanderAtlas({id:'ai_cmd1',bust:'/commanders/h13_admiral_brine_bust.webp'}),/-v3\.png$/);
  assert.match(commanderAtlas({id:'h43'}),/h43-walk-v2\.png$/);
  assert.match(commanderAtlas({id:'ai_serava',bust:'/commanders/h43_countess_serava_bust.webp'}),/h43-walk-v2\.png$/);
  assert.match(commanderAtlas({id:'h45'}),/h45-walk-v2\.png$/);
  assert.match(commanderAtlas({id:'ai_fang',bust:'/commanders/h45_fang_groth_bust.webp'}),/h45-walk-v2\.png$/);
  assert.match(commanderAtlas({id:'h57'}),/h57-walk-v1\.png$/);
  assert.match(commanderAtlas({id:'ai_dread',bust:'/commanders/h57_ser_dreadmourne_bust.webp'}),/h57-walk-v1\.png$/);
  assert.match(commanderAtlas({id:'h59'}),/h59-walk-v1\.png$/);
  assert.match(commanderAtlas({id:'ai_mord',bust:'/commanders/h59_fallen_lord_mordwyn_bust.webp'}),/h59-walk-v1\.png$/);
  for (const [id,bust] of [['h37','h37_brother_aldric'],['h38','h38_commander_vayne'],['h50','h50_valdris_the_unmoved'],['h52','h52_eira_coldmantle']]) {
    assert.match(commanderAtlas({id}),new RegExp(`${id}-walk-v1\\.png$`));
    assert.match(commanderAtlas({id:'ai_x',bust:`/commanders/${bust}_bust.webp`}),new RegExp(`${id}-walk-v1\\.png$`));
  }
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


test('Every wired walking atlas uses the established 33x4 sheet structure',()=>{
  const root = path.resolve('public/commanders/map');
  const wired = ['h1','h13','h37','h38','h43','h45','h50','h52','h57','h59'].map(id => path.basename(commanderAtlas({id})));
  for (const file of wired) {
    const buf = fs.readFileSync(path.join(root,file));
    assert.equal(buf.toString('ascii',1,4),'PNG');
    // PNG IHDR: width at byte 16, height at byte 20.
    assert.equal(buf.readUInt32BE(16), 3696, `${file} width`);
    assert.equal(buf.readUInt32BE(20), 448, `${file} height`);
    assert.equal(3696 / (32 + 1), 112);
    assert.equal(448 / 4, 112);
  }
});
