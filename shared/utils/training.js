import {FACTION_TROOPS} from '../constants/troops.js';
import {CMD_SIZE} from '../constants/buildings.js';
const FACTION_TUNING = {
  pirates:[1.10,.90,1],wizards:[.75,1.20,1.04],orcs:[1.20,.80,.96],dragons:[.80,1.20,1.05],
  holyknights:[1,1.05,1.02],nightcreatures:[.85,1.15,.98],coldborns:[1.15,.85,1.03],ashen_dead:[.80,1.20,1]
};
const BASE_COST = [[900,700,1400],[1800,1500,2800],[3000,2700,4400]];
const SMALL_MINUTES = [12,21,31];
const SIZE_COST = {small:1,medium:1.15,large:1.30};
const SIZE_MINUTES = {small:0,medium:9,large:18};
const round10 = n => Math.round(n/10)*10;
// One shared quote for the menu and the payment/delivery system.
export function trainingQuote(branchKey,amount,speedMult=1) {
  if(typeof branchKey !== 'string') return null;
  const [faction,key,tierText,...extra] = branchKey.split(':');
  const tier = Number(tierText), branches = FACTION_TROOPS[faction]?.branches;
  const index = branches?.findIndex(branch => branch.key === key) ?? -1;
  const branch = branches?.[index];
  if(extra.length || tierText === '' || !Number.isInteger(tier) || tier<0 || tier>2 || !branch?.tiers[tier]) return null;
  const commandSize = CMD_SIZE[branch.size];
  if(!Number.isInteger(amount) || amount<=0 || amount%commandSize) return null;
  const [wood,gas,time] = FACTION_TUNING[faction] || [1,1,1];
  const variation = [.97,1,1.03][index] ?? 1, sizeCost=SIZE_COST[branch.size];
  const base=BASE_COST[tier];
  const perCommandCost={stone:0,wood:round10(base[0]*wood*variation*sizeCost),gas:round10(base[1]*gas/variation*sizeCost),food:round10(base[2]*variation*sizeCost)};
  const baseSeconds=Math.round((SMALL_MINUTES[tier]+SIZE_MINUTES[branch.size])*time*variation*60);
  const commandMs=Math.round(baseSeconds*1000/Math.max(1,Number.isFinite(speedMult)?speedMult:1));
  const commands=amount/commandSize;
  return {commandSize,commands,commandMs,baseSeconds,perCommandCost,cost:Object.fromEntries(Object.entries(perCommandCost).map(([k,v])=>[k,v*commands])),totalSeconds:Math.ceil(commandMs*commands/1000)};
}
export function trainingSecondsLeft(queue,now=Date.now()) {
  return Math.max(0,Math.ceil((queue.nextAt+(queue.remaining/queue.commandSize-1)*queue.commandMs-now)/1000));
}
