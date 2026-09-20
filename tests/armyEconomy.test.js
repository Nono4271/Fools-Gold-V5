import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTION_TROOPS} from '../shared/constants/troops.js';
import {CMD_SIZE} from '../shared/constants/buildings.js';
import {trainingQuote,trainingSecondsLeft} from '../shared/utils/training.js';
import {armyEconomyReducer as reduce,initialArmyEconomy as initial,splitTroops,healingFoodCost} from '../shared/utils/armyEconomy.js';
const buildings={training:5,barracks:1,healingtent:1},key='pirates:swashbucklers:0',other='pirates:sea_beasts:0';
const train=(s,more={})=>reduce(s,{type:'train',branchKey:key,amount:200,buildings,unlocked:{'pirates:swashbucklers':2},now:0,id:'train',...more});
const tick=(s,now)=>reduce(s,{type:'tick',buildings,now});
const heal=(s,amount,more={})=>reduce(s,{type:'heal',amount,buildings,now:0,id:'heal',...more});
test('all 80 troop quotes respect size, tier, time and cost rules',()=>{
 for(const [f,faction] of Object.entries(FACTION_TROOPS)) for(const b of faction.branches){let previous;
  b.tiers.forEach((_,tier)=>{const q=trainingQuote(`${f}:${b.key}:${tier}`,CMD_SIZE[b.size]);assert.equal(q.commandSize,CMD_SIZE[b.size]);assert.equal(q.cost.stone,0);if(b.capstone){assert.ok(q.baseSeconds>=3600&&q.baseSeconds<=7200);}else{assert.ok(q.baseSeconds>=600&&q.baseSeconds<=3600);if(b.size==='small')assert.ok(q.baseSeconds<=2100);}assert.ok(q.cost.food>Math.max(q.cost.wood,q.cost.gas));if(previous){assert.ok(q.baseSeconds>previous.baseSeconds);assert.ok(q.cost.food>previous.cost.food);}previous=q;});
 }
});
test('capstone branch training cost/time discount scales 0% at level 1 to 50% at level 6',()=>{
 const branch=FACTION_TROOPS.pirates.branches[3];
 assert.equal(branch.capstone,true);
 const key=`pirates:${branch.key}:0`;
 const full=trainingQuote(key,CMD_SIZE[branch.size],1,0);
 const half=trainingQuote(key,CMD_SIZE[branch.size],1,0.30);
 const max=trainingQuote(key,CMD_SIZE[branch.size],1,0.50);
 assert.ok(half.cost.food<full.cost.food&&half.baseSeconds<full.baseSeconds);
 assert.ok(max.cost.food<half.cost.food&&max.baseSeconds<half.baseSeconds);
 assert.equal(Math.round(max.cost.food/full.cost.food*100)/100,0.5);
});
test('larger commands take longer and cost moderately more',()=>{const quotes=FACTION_TROOPS.pirates.branches.map(b=>trainingQuote(`pirates:${b.key}:2`,CMD_SIZE[b.size]));for(let i=1;i<3;i++){assert.ok(quotes[i].baseSeconds>quotes[i-1].baseSeconds);const sum=q=>Object.values(q.cost).reduce((a,b)=>a+b,0);assert.ok(sum(quotes[i])>sum(quotes[i-1]));assert.ok(sum(quotes[i])/sum(quotes[i-1])<1.3);}});
test('payment and ETA match the menu quote',()=>{const s=train(initial()),q=trainingQuote(key,200);for(const k of Object.keys(q.cost))assert.equal(s.rss[k],200000-q.cost[k]);assert.equal(trainingSecondsLeft(s.trainingQueues[0],0),q.totalSeconds);});
test('training adds each complete command exactly once',()=>{let s=train(initial());const ms=s.trainingQueues[0].commandMs;s=tick(s,ms-1);assert.equal(s.troopCounts[key]||0,0);s=tick(s,ms);assert.equal(s.troopCounts[key],100);s=tick(s,2*ms);assert.equal(s.troopCounts[key],200);assert.equal(s.trainingQueues.length,0);s=tick(s,2*ms);assert.equal(s.troopCounts[key],200);});
test('late training waits safely when barracks cannot fit a command',()=>{let s=train(initial());const end=s.trainingQueues[0].commandMs*5;s={...s,troopCounts:{[key]:1950}};s=tick(s,end);assert.equal(s.trainingQueues[0].remaining,200);s={...s,troopCounts:{[key]:1800}};s=tick(s,end);assert.equal(s.troopCounts[key],2000);assert.equal(s.trainingQueues.length,0);});
test('pending training reserves capacity and poor players cannot pay',()=>{let s=train({...initial(),troopCounts:{[key]:1750}});assert.equal(train(s,{id:'second'}),s);const poor={...initial(),rss:{stone:0,wood:0,gas:0,food:0}};assert.equal(train(poor),poor);});
test('invalid quantities, locked troops and duplicate queue IDs are rejected',()=>{const s=initial();for(const amount of [-1,0,1,150,NaN])assert.equal(train(s,{amount}),s);assert.equal(train(s,{unlocked:{}}),s);assert.equal(train(s,{branchKey:'missing'}),s);const paid=train(s);assert.equal(train(paid),paid);});
test('wounded allocation preserves troop types',()=>{assert.deepEqual(splitTroops([{branch:{faction:'pirates',branch:'swashbucklers',tier:0},troops:100},{branch:{faction:'pirates',branch:'sea_beasts',tier:0},troops:4}],31),{[key]:30,[other]:1});});
test('healing reserves wounds, charges once and returns original types',()=>{let s=heal({...initial(),woundedByBranch:{[key]:8,[other]:2}},10);assert.equal(s.rss.food,200000-healingFoodCost(10));assert.equal(heal(s,10,{id:'second'}),s);s=tick(s,10000);assert.deepEqual(s.troopCounts,{[key]:8,[other]:2});assert.equal(s.healQueue.length,0);});
test('manual healing is default; automatic uses same price',()=>{const s={...initial(),woundedByBranch:{[key]:10}};assert.equal(tick(s,0).healQueue.length,0);const auto=tick({...s,autoHeal:true},0);assert.equal(auto.rss.food,heal(s,10).rss.food);assert.equal(auto.healQueue[0].remaining,10);});
test('automatic healing waits for food; a tent is required',()=>{const s={...initial(),woundedByBranch:{[key]:10},rss:{stone:0,wood:0,gas:0,food:0},autoHeal:true};assert.equal(tick(s,0).healQueue.length,0);const rich={...s,rss:initial().rss};assert.equal(heal(rich,10,{buildings:{...buildings,healingtent:0}}),rich);});
test('healing speedups deliver troops without advancing training',()=>{let s=train(initial());s=heal({...s,woundedByBranch:{[key]:100}},100);s=reduce(s,{type:'healSpeedup',id:'heal',duration:100000});s=tick(s,0);assert.equal(s.troopCounts[key],100);assert.equal(s.trainingQueues[0].remaining,200);assert.equal(s.healQueue.length,0);});
test('full barracks retain completed healing until room exists',()=>{let s=heal({...initial(),woundedByBranch:{[key]:10},troopCounts:{[key]:2000}},10);s=tick(s,10000);assert.equal(s.healQueue[0].remaining,10);s={...s,troopCounts:{[key]:1990}};s=tick(s,10000);assert.equal(s.troopCounts[key],2000);assert.equal(s.healQueue.length,0);});
