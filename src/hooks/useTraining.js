import {useEffect,useRef} from 'react';
export function useTraining({screen,bldgs,dispatchArmy,healSpeedMult=1}) {
  const buildings=useRef(bldgs);
  useEffect(()=>{buildings.current=bldgs;},[bldgs]);
  const healSpeedMultRef=useRef(healSpeedMult);
  useEffect(()=>{healSpeedMultRef.current=healSpeedMult;},[healSpeedMult]);
  useEffect(()=>{
    if(screen!=='game'&&screen!=='gacha')return;
    const tick=()=>dispatchArmy({type:'tick',buildings:buildings.current,now:Date.now(),healSpeedMult:healSpeedMultRef.current});
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[screen,dispatchArmy]);
}
