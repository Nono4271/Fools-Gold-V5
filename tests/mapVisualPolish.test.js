import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TERRAIN_GROUND_ASSETS,
  terrainGroundAsset,
  terrainMaterialTone,
  resourceShadowSpec,
} from '../src/utils/mapVisualPolish.js';

test('phase 2 uses dedicated ground material assets for natural terrain', () => {
  assert.equal(terrainGroundAsset('grass'), 'grass-ground-v2.webp');
  assert.equal(terrainGroundAsset('forest'), 'forest-ground-v2.webp');
  assert.equal(terrainGroundAsset('mountain'), 'mountain-ground-v2.webp');
  assert.equal(terrainGroundAsset('desert'), 'desert-ground-v2.webp');
  assert.equal(terrainGroundAsset('ruin'), 'ruin-ground-v2.webp');
  assert.equal(terrainGroundAsset('hellfire'), 'grass-ground-v2.webp');
  assert.deepEqual(Object.keys(TERRAIN_GROUND_ASSETS).sort(),
    ['desert','forest','grass','mountain','ruin']);
});

test('terrain material tone is deterministic and intentionally subtle', () => {
  const a = terrainMaterialTone(14, 27, 'forest');
  const b = terrainMaterialTone(14, 27, 'forest');
  assert.equal(a, b);
  assert.ok(a > 0.97 && a < 1.03);
});

test('large developed resources receive a wider, softer contact shadow', () => {
  const small = resourceShadowSpec({isKeep:false}, 5);
  const large = resourceShadowSpec({isKeep:true, isGate:false}, 10);
  assert.ok(large.scaleX > small.scaleX);
  assert.ok(large.alpha > small.alpha);
  assert.ok(large.scaleY > 0 && small.scaleY > 0);
});
