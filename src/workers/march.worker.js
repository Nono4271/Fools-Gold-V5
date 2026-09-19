import { positionAlongRoute } from '../../shared/utils/marchMotion.js';

// Computes constant-speed positions across full routes off the main thread.
const routes = new Map();
let intervalId = null;
const FRAME_MS = 16;

function tick() {
  if (!routes.size) return;
  const now = Date.now(), positions=[];
  for (const [uid, route] of routes) {
    const point = positionAlongRoute(route.points, route.startTime, route.stepMs, now);
    if (point) positions.push({uid,px:point.x,py:point.y});
  }
  self.postMessage({type:'frame',positions});
}
self.onmessage=({data})=>{
  switch(data.type){
    case 'route': {
      const current=routes.get(data.uid);
      if(current?.routeId!==data.routeId) routes.set(data.uid,{routeId:data.routeId,points:data.points,startTime:data.startTime,stepMs:data.stepMs});
      break;
    }
    case 'remove': routes.delete(data.uid); break;
    case 'removeAll': routes.clear(); break;
    case 'start': if(!intervalId) intervalId=setInterval(tick,FRAME_MS); break;
    case 'stop': if(intervalId){clearInterval(intervalId);intervalId=null;} routes.clear(); break;
  }
};
