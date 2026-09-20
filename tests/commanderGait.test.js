import test from 'node:test';
import assert from 'node:assert/strict';
import {footStep, WALK_CYCLE_MS, COMMANDER_MAP_SIZE, limbMatrix, bootMatrix, armTip} from '../src/utils/commanderGait.js';
test('boot facing stays fixed through the full stride',()=>{
  for(let now=0;now<1100;now+=25) for(const side of [0,1]) {
    const step=footStep(now,side);
    assert.deepEqual(bootMatrix([100,200],[100+step.stride*18,200-step.lift]).slice(0,4),[1,0,0,1]);
  }
});
test('stronger arm swing preserves arm length and opposes the leg',()=>{
  const pivot=[100,80],tip=[100,150];
  const forward=armTip(pivot,tip,1),back=armTip(pivot,tip,-1);
  assert.ok(forward[0]<80 && back[0]>120);
  assert.ok(Math.abs(Math.hypot(forward[0]-100,forward[1]-80)-70)<1e-9);
});
test('left and right lead exchange at half a cycle',()=>{
  assert.equal(footStep(0,0).stride,1);
  assert.equal(footStep(0,1).stride,-1);
  assert.equal(footStep(WALK_CYCLE_MS/2,0).stride,-1);
  assert.equal(footStep(WALK_CYCLE_MS/2,1).stride,1);
});
test('only swing foot lifts; both contact the ground at stride endpoints',()=>{
  assert.equal(footStep(WALK_CYCLE_MS/4,0).lift,0);
  assert.ok(footStep(WALK_CYCLE_MS/4,1).lift>10);
  assert.equal(footStep(0,0).lift,0);
});
test('rig scale is fifteen percent smaller and limb transforms preserve joints',()=>{
  assert.ok(Math.abs(COMMANDER_MAP_SIZE-44.2)<1e-9);
  const [a,b,c,d,x,y]=limbMatrix([2,3],[4,8],[9,10],[15,20]);
  assert.ok(Math.abs(a*2+c*3+x-9)<1e-9);
  assert.ok(Math.abs(b*2+d*3+y-10)<1e-9);
  assert.ok(Math.abs(a*4+c*8+x-15)<1e-9);
  assert.ok(Math.abs(b*4+d*8+y-20)<1e-9);
});
