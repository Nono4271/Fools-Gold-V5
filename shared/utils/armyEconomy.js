import {barracksCapacity,maxTrainBatch,trainingQueueCount,trainRate} from '../constants/buildings.js';
import {trainingQuote} from './training.js';
export const troopTotal = counts => Object.values(counts).reduce((sum,n)=>sum+n,0);
// Preserve the current healing price and rate; automatic healing uses these too.
export const healingFoodCost = amount => Math.ceil(amount*.2);
export const healingRate = buildings => Math.max(1,Math.floor(trainRate(buildings.training||0)*.4));
export const initialArmyEconomy = () => ({rss:{stone:200000,wood:200000,gas:200000,food:200000},troopCounts:{},woundedByBranch:{},trainingQueues:[],healQueue:[],autoHeal:false});
export function splitTroops(slots,amount) {
  const valid=slots.filter(sl=>sl.branch&&sl.troops>0);
  const total=valid.reduce((s,sl)=>s+sl.troops,0);
  const count=Math.min(total,Math.max(0,Math.floor(amount)));
  if(!total||!Number.isFinite(count)) return {};
  const shares=valid.map((sl,index)=>{const exact=count*sl.troops/total;return {sl,index,n:Math.floor(exact),fraction:exact%1};});
  let left=count-shares.reduce((s,sl)=>s+sl.n,0);
  for(const share of [...shares].sort((a,b)=>b.fraction-a.fraction||a.index-b.index)){if(left--<=0)break;share.n++;}
  const result={};
  for(const {sl,n} of shares){if(!n)continue;const b=sl.branch,key=`${b.faction}:${b.branch}:${b.tier??0}`;result[key]=(result[key]||0)+n;}
  return result;
}
function startHealing(state,requested,buildings,now,id) {
  if(!(buildings.healingtent>0)) return state;
  const active=state.healQueue.reduce((sum,q)=>sum+q.remaining,0);
  const amount=Math.min(Math.floor(requested),troopTotal(state.woundedByBranch),Math.max(0,buildings.healingtent*200-active));
  if(!Number.isFinite(amount)||amount<=0||state.rss.food<healingFoodCost(amount)||state.healQueue.some(q=>q.id===id)) return state;
  const wounded={...state.woundedByBranch},allocations={};let left=amount;
  for(const [key,n] of Object.entries(wounded)){const take=Math.min(left,n);if(take){allocations[key]=take;wounded[key]-=take;left-=take;}}
  return {...state,rss:{...state.rss,food:state.rss.food-healingFoodCost(amount)},woundedByBranch:wounded,healQueue:[...state.healQueue,{id,allocations,total:amount,remaining:amount,rate:healingRate(buildings),startedAt:now,lastAt:now,creditMs:0}]};
}
function tick(state,buildings,now) {
  const troops={...state.troopCounts};let space=Math.max(0,barracksCapacity(buildings.barracks||0)-troopTotal(troops));
  const trainingQueues=state.trainingQueues.map(q=>{
    const ready=Math.max(0,1+Math.floor((now-q.nextAt)/q.commandMs));
    const delivered=Math.min(ready,q.remaining/q.commandSize,Math.floor(space/q.commandSize))*q.commandSize;
    if(!delivered)return q;
    troops[q.branchKey]=(troops[q.branchKey]||0)+delivered;space-=delivered;
    return q.remaining===delivered?null:{...q,remaining:q.remaining-delivered,nextAt:q.nextAt+delivered/q.commandSize*q.commandMs};
  }).filter(Boolean);
  const healQueue=state.healQueue.map(q=>{
    const rate=Math.max(1,Math.floor(q.rate/state.healQueue.length));
    const credit=q.creditMs+Math.max(0,now-q.lastAt);
    const delivered=Math.min(q.remaining,Math.floor(credit*rate/1000),space);
    const allocations={...q.allocations};let left=delivered;
    for(const [key,n] of Object.entries(allocations)){const take=Math.min(left,n);if(take){troops[key]=(troops[key]||0)+take;allocations[key]-=take;left-=take;}}
    space-=delivered;
    return q.remaining===delivered?null:{...q,allocations,remaining:q.remaining-delivered,lastAt:now,creditMs:credit-delivered*1000/rate};
  }).filter(Boolean);
  let next={...state,troopCounts:troops,trainingQueues,healQueue};
  if(state.autoHeal) next=startHealing(next,Math.min(troopTotal(next.woundedByBranch),Math.floor(Math.max(0,next.rss.food)*5)),buildings,now,`auto-${now}`);
  return next;
}
export function armyEconomyReducer(state,action) {
  switch(action.type){
    case 'set': return {...state,[action.key]:typeof action.value==='function'?action.value(state[action.key]):action.value};
    case 'wounded': {const added=splitTroops(action.slots,action.amount),wounded={...state.woundedByBranch};for(const [key,n] of Object.entries(added))wounded[key]=(wounded[key]||0)+n;return {...state,woundedByBranch:wounded};}
    case 'train': {
      const quote=trainingQuote(action.branchKey,action.amount,action.speedMult),b=action.buildings;
      if(!quote||state.trainingQueues.some(q=>q.id===action.id))return state;
      const [f,key,tier]=action.branchKey.split(':');
      const reserved=state.trainingQueues.reduce((s,q)=>s+q.remaining,0);
      if(Number(tier)>(action.unlocked[`${f}:${key}`]??-1)||action.amount>maxTrainBatch(b.training||0)||state.trainingQueues.length>=trainingQueueCount(b.training||0)||troopTotal(state.troopCounts)+reserved+action.amount>barracksCapacity(b.barracks||0)||Object.entries(quote.cost).some(([key,n])=>!Number.isFinite(state.rss[key])||state.rss[key]<n)) return state;
      const rss={...state.rss};for(const [key,n] of Object.entries(quote.cost))rss[key]-=n;
      return {...state,rss,trainingQueues:[...state.trainingQueues,{id:action.id,branchKey:action.branchKey,remaining:action.amount,total:action.amount,commandSize:quote.commandSize,commandMs:quote.commandMs,nextAt:action.now+quote.commandMs}]};
    }
    case 'heal': return startHealing(state,action.amount,action.buildings,action.now,action.id);
    case 'healSpeedup': return action.duration>0?{...state,healQueue:state.healQueue.map(q=>q.id===action.id?{...q,creditMs:q.creditMs+action.duration}:q)}:state;
    case 'tick': return tick(state,action.buildings,action.now);
    case 'resetHealing': return {...state,woundedByBranch:{},healQueue:[],autoHeal:false};
    default:return state;
  }
}
