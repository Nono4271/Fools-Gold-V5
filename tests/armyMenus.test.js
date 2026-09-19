import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FACTION_TROOPS} from '../shared/constants/troops.js';
const filename=new URL('../src/components/game/HQMenu.jsx',import.meta.url);
const source=await readFile(filename,'utf8');
const built=await build({stdin:{contents:source+'\nexport {TrainingQueueScreen,RepairBayScreen};',loader:'jsx',resolveDir:fileURLToPath(new URL('.',filename))},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react-dom','react-dom/server','react/jsx-runtime']});
const module={exports:{}};
new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const {TrainingQueueScreen,RepairBayScreen}=module.exports;
const noop=()=>{};
test('T3 medium training menu uses 50-troop commands and renders',()=>{
 const branch=FACTION_TROOPS.pirates.branches.find(b=>b.key==='gunners');
 const key='pirates:gunners:2';
 const html=renderToStaticMarkup(React.createElement(TrainingQueueScreen,{mode:'train',bldgs:{training:5,barracks:1},barracksPool:0,troopCards:[{key,bKey:key,branch,tier:{...branch.tiers[2],tierIdx:2},poolCount:0,fKey:'pirates'}],trainingQueues:[],setTrainingQueues:noop,trainingSpeedMult:1,canAfford:()=>true,queueTraining:noop,rss:{stone:200000,wood:200000,gas:200000,food:200000},onBack:noop}));
 assert.match(html,/step="50"/);assert.doesNotMatch(html,/NaN|undefined/);
});
test('healing menu starts manual and supports fewer than 100 wounded',()=>{
 const html=renderToStaticMarkup(React.createElement(RepairBayScreen,{bldgs:{training:5,healingtent:1},woundedTroops:31,woundedQueue:0,bLog:[],healQueue:[],queueHealing:noop,autoHeal:false,setAutoHeal:noop,rss:{food:100},canAfford:()=>true,unlockedBranches:{},troopCounts:{},barracksPool:0}));
 assert.match(html,/role="switch"/);assert.match(html,/aria-label="Automatic healing"/);assert.match(html,/step="1"/);assert.doesNotMatch(html,/checked=""|NaN|undefined/);
});
