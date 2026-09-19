import test from 'node:test';
import assert from 'node:assert/strict';
import {simBattle} from '../shared/utils/battle.js';
import {FACTION_TROOPS,COMMAND_COST} from '../shared/constants/troops.js';
const commander=(branch,troops)=>({id:0,n:'Fixture',lvl:5,atk:50,foc:20,spd:50,troops,troopBranch:branch,troopSlots:[{branch,troops}]});
function seeded(fn) {const old=Math.random;let seed=42;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);try{return fn();}finally{Math.random=old;}}
test('ordinary battle completes',()=>{const b={faction:'pirates',branch:'swashbucklers',tier:0};const r=seeded(()=>simBattle(commander(b,100),100,{garrison:30},0));assert.equal(typeof r.won,'boolean');assert.ok(Number.isFinite(r.lost));assert.ok(r.report.rounds.length>0);});
for(const [f,faction] of Object.entries(FACTION_TROOPS)) for(const b of faction.branches) for(let tier=0;tier<b.tiers.length;tier++) test(`${f} ${b.key} T${tier+1} completes battle`,()=>{
 const count=1/COMMAND_COST[b.size],branch={faction:f,branch:b.key,tier};
 const def=commander({faction:'pirates',branch:'swashbucklers',tier:0},100);
 const r=seeded(()=>simBattle(commander(branch,count),count,{defCmd:def,garrison:100},0));
 for(const key of ['lost','atk','def','pct','xpGain']) assert.ok(Number.isFinite(r[key]),key);
 assert.ok(r.lost>=0&&r.lost<=count);
});
test('confusion executes on intended rounds and can hit defenders',()=>{
 const old=Math.random;Math.random=()=>.01;
 try{const b={faction:'pirates',branch:'sea_beasts',tier:2};const d={...commander({...b,tier:0},100000),spd:1};const r=simBattle(commander(b,40000),40000,{defCmd:d,garrison:100000},0);let found=false;
 for(const round of r.report.rounds) for(const a of round.actions){assert.ok(Number.isFinite(a.dmg));if(a.isConfused){found=true;assert.ok([3,6,9].includes(round.round));}}assert.ok(found);
 }finally{Math.random=old;}
});
test('spawn utilities import successfully',async()=>{assert.ok((await import('../src/utils/spawnUtils.js')).SPAWN_LEVELS.length>0);});
