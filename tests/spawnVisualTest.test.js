import test from 'node:test';
import assert from 'node:assert/strict';
import {isInSpawnVisualArea,sameTerritory,resourceLayout,resourceFootprint,isInHqClearance} from '../src/utils/spawnVisualTest.js';

test('visual test follows the random player HQ with a 25 tile radius',()=>{
  assert.equal(isInSpawnVisualArea(125,225,'100,200'),true);
  assert.equal(isInSpawnVisualArea(126,225,'100,200'),false);
  assert.equal(isInSpawnVisualArea(900,700,null),false);
});

test('only matching owners join into one territory outline',()=>{
  assert.equal(sameTerritory({owner:'player'},{owner:'player'}),true);
  assert.equal(sameTerritory({owner:'ai',ownerPlayerId:'a'},{owner:'ai',ownerPlayerId:'b'}),false);
  assert.equal(sameTerritory({owner:'ai',ownerPlayerId:'a'},{owner:'ai',ownerPlayerId:'a'}),true);
});

test('ordinary resources grow from two objects to five; P10 switches to developed sites',()=>{
  assert.equal(resourceLayout(2).length,2);
  assert.equal(resourceLayout(9).length,5);
  for(let pl=2;pl<=9;pl++) assert.ok(resourceLayout(pl).every(p=>p.family==='small'));
  assert.equal(resourceLayout(10)[0].family,'large');
  assert.equal(resourceLayout(13)[0].family,'large');
  assert.ok(resourceLayout(13).length>resourceLayout(10).length);
  assert.ok(resourceLayout(13)[0].width>resourceLayout(10)[0].width);
});

test('resource roots and selection use the same centre for single and 2x2 tiles',()=>{
  for(const tile of [{powerLevel:2},{powerLevel:9},{powerLevel:10,isKeep:true},{powerLevel:13,isKeep:true}]){
    const f=resourceFootprint(225,1293,tile);
    assert.equal((f.points[0]+f.points[4])/2,f.x);
    assert.equal((f.points[1]+f.points[5])/2,f.y);
    assert.equal((f.points[2]+f.points[6])/2,f.x);
    assert.equal((f.points[3]+f.points[7])/2,f.y);
  }
  const small=resourceFootprint(225,1293,{powerLevel:9});
  const big=resourceFootprint(225,1293,{powerLevel:10,isKeep:true});
  assert.equal(big.halfWidth,small.halfWidth*2);
  assert.equal(big.halfHeight,small.halfHeight*2);
  assert.equal(big.y-small.y,26.5);
});

test('HQ clearance reserves one ring outside its 3x3 footprint',()=>{
  const tiles={};
  for(let r=9;r<=11;r++) for(let c=9;c<=11;c++) {
    tiles[`${c},${r}`]={isHQ:c===10&&r===10,isHQPart:!(c===10&&r===10)};
  }
  assert.equal(isInHqClearance(8,10,tiles),true);
  assert.equal(isInHqClearance(12,10,tiles),true);
  assert.equal(isInHqClearance(10,8,tiles),true);
  assert.equal(isInHqClearance(10,12,tiles),true);
  assert.equal(isInHqClearance(7,10,tiles),false);
});
