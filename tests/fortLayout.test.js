import test from 'node:test';
import assert from 'node:assert/strict';
import {FORT_ART,fortArtFor,fortFootprint,fitFortArt} from '../src/utils/fortLayout.js';
import {isoXY,TW,TH} from '../shared/constants/geometry.js';
for (const [level,art] of Object.entries(FORT_ART)) test(`L${level} foundation is centered, contained and maximally fitted to one tile`,()=>{
  const fp=fortFootprint(17,23), fit=fitFortArt(art,fp), {cx,cy}=isoXY(17,23);
  assert.equal(fp.x,cx);assert.equal(fp.y,cy-4+TH/2);
  assert.equal(fp.halfWidth,TW/2);assert.equal(fp.halfHeight,TH/2);
  assert.ok(Math.abs(fit.width/fit.height-art.size[0]/art.size[1])<1e-12);
  const points=art.ground.map(([x,y])=>[(x-fit.anchorX*art.size[0])*fit.scale/fp.halfWidth,(y-fit.anchorY*art.size[1])*fit.scale/fp.halfHeight]);
  const u=points.map(([x,y])=>x+y),v=points.map(([x,y])=>x-y);
  for(const p of points)assert.ok(Math.abs(p[0])+Math.abs(p[1])<=.975+1e-10);
  for(const axis of [u,v])assert.ok(Math.abs(Math.min(...axis)+Math.max(...axis))<1e-10);
  assert.ok(Math.abs(Math.max(...u,...v)-.975)<1e-10);
  const shifted=fitFortArt(art,fortFootprint(21,31));
  assert.equal(shifted.width,fit.width);assert.equal(shifted.anchorY,fit.anchorY);
});
test('unknown fort level uses level-one art',()=>assert.equal(fortArtFor(999),FORT_ART[1]));
