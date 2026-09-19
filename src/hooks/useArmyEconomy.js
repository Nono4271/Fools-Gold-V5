import {useReducer,useMemo,useCallback} from 'react';
import {armyEconomyReducer,initialArmyEconomy,troopTotal} from '../../shared/utils/armyEconomy.js';
export function useArmyEconomy() {
  const [state,dispatch]=useReducer(armyEconomyReducer,undefined,initialArmyEconomy);
  const setters=useMemo(()=>Object.fromEntries(['rss','troopCounts','trainingQueues','healQueue','autoHeal'].map(key=>[`set${key[0].toUpperCase()+key.slice(1)}`,value=>dispatch({type:'set',key,value})])),[]);
  const addWounded=useCallback((cmd,amount)=>dispatch({type:'wounded',slots:cmd.troopSlots?.length?cmd.troopSlots:[{branch:cmd.troopBranch,troops:cmd.troops}],amount}),[]);
  const setWounded=useCallback(value=>{if(value===0)dispatch({type:'resetHealing'});},[]);
  return {...state,...setters,dispatch,addWounded,setWounded,woundedTroops:troopTotal(state.woundedByBranch)};
}
