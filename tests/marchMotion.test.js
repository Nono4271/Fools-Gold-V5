import test from 'node:test';
import assert from 'node:assert/strict';
import {marchCanAdvance,marchSegmentMs,positionAlongRoute,reachedMarchDestination} from '../shared/utils/marchMotion.js';
import {adj,bfsPath,setImpassableTiles} from '../shared/utils/pathfinding.js';

test('march begins immediately and crosses tile centres at constant speed',()=>{
 const route=[{x:0,y:0},{x:10,y:0},{x:10,y:10}];
 assert.deepEqual(positionAlongRoute(route,1000,[1000,1000],1000),{x:0,y:0,done:false,segment:0});
 assert.deepEqual(positionAlongRoute(route,1000,[1000,1000],1500),{x:5,y:0,done:false,segment:0});
 assert.deepEqual(positionAlongRoute(route,1000,[1000,1000],2000),{x:10,y:0,done:false,segment:1});
 assert.deepEqual(positionAlongRoute(route,1000,[1000,1000],2500),{x:10,y:5,done:false,segment:1});
 assert.deepEqual(positionAlongRoute(route,1000,[1000,1000],3000),{x:10,y:10,done:true,segment:1});
});
test('logical movement waits for every segment including the last',()=>{
 assert.equal(marchCanAdvance(1000,1000,1999),false);assert.equal(marchCanAdvance(1000,1000,2000),true);
});
test('arrival happens as the army reaches the destination, without an extra tile delay',()=>{
 assert.equal(reachedMarchDestination(1,2),true);assert.equal(reachedMarchDestination(0,2),false);
});
test('diagonal path is shortest while attack adjacency stays edge-only',()=>{
 setImpassableTiles([]);const path=bfsPath('10,10','13,12');assert.equal(path.length,4);
 assert.equal(path.slice(1).filter((k,i)=>{const a=path[i].split(',').map(Number),b=k.split(',').map(Number);return a[0]!==b[0]&&a[1]!==b[1];}).length,2);
 assert.equal(adj(10,10).length,4);
});
test('march speed is increased 15 percent and diagonal time follows distance',()=>{
 assert.equal(marchSegmentMs('0,0','1,0',1000),850);
 assert.equal(marchSegmentMs('0,0','1,1',1000),1202);
});

import { marchMsLeft as _marchMsLeft, marchSegmentMs as _seg } from '../shared/utils/marchMotion.js';
test('marchMsLeft: remaining segments minus time into the current one', () => {
  const m = { path: ['0,0', '1,0', '2,0', '3,0'], step: 1, stepMs: 1000, lastStepTime: 5000 };
  const seg = _seg('1,0', '2,0', 1000);
  assert.equal(_marchMsLeft(m, 5000), seg * 2);
  assert.equal(_marchMsLeft(m, 5000 + 100), seg * 2 - 100);
  assert.equal(_marchMsLeft({ ...m, step: 3 }, 9999), 0);
  assert.equal(_marchMsLeft(null), 0);
});
