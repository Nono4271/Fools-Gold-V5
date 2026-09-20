import test from 'node:test';
import assert from 'node:assert/strict';
import {isInSpawnVisualArea,sameTerritory,visualResourceWidth} from '../src/utils/spawnVisualTest.js';

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

test('higher power resource tiles render larger clusters',()=>{
  assert.ok(visualResourceWidth(13)>visualResourceWidth(8));
  assert.ok(visualResourceWidth(8)>visualResourceWidth(2));
});
