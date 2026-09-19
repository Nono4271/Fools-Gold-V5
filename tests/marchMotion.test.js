import test from 'node:test';
import assert from 'node:assert/strict';
import {marchCanAdvance,positionAlongRoute} from '../shared/utils/marchMotion.js';
import {bfsPath,setImpassableTiles} from '../shared/utils/pathfinding.js';

test('march begins immediately and crosses tile centres at constant speed',()=>{
 const route=[{x:0,y:0},{x:10,y:0},{x:10,y:10}];
 assert.deepEqual(positionAlongRoute(route,1000,1000,1000),{x:0,y:0,done:false,segment:0});
 assert.deepEqual(positionAlongRoute(route,1000,1000,1500),{x:5,y:0,done:false,segment:0});
 assert.deepEqual(positionAlongRoute(route,1000,1000,2000),{x:10,y:0,done:false,segment:1});
 assert.deepEqual(positionAlongRoute(route,1000,1000,2500),{x:10,y:5,done:false,segment:1});
 assert.deepEqual(positionAlongRoute(route,1000,1000,3000),{x:10,y:10,done:true,segment:1});
});
test('logical movement waits for every segment including the last',()=>{
 assert.equal(marchCanAdvance(1000,1000,1999),false);assert.equal(marchCanAdvance(1000,1000,2000),true);
});
test('pathfinding chooses the shortest adjacent passable route without ownership rules',()=>{
 setImpassableTiles([]);const path=bfsPath('10,10','13,12');assert.equal(path.length,6);
 for(let i=1;i<path.length;i++){const [a,b]=[path[i-1],path[i]].map(k=>k.split(',').map(Number));assert.equal(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]),1);}
});
