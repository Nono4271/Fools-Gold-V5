import {useEffect,useRef} from 'react';
export function useTraining({screen,bldgs,dispatchArmy}) {
  const buildings=useRef(bldgs);
  useEffect(()=>{buildings.current=bldgs;},[bldgs]);
  useEffect(()=>{
    if(screen!=='game'&&screen!=='gacha')return;
    const tick=()=>dispatchArmy({type:'tick',buildings:buildings.current,now:Date.now()});
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[screen,dispatchArmy]);
}
