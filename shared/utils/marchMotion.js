export function marchCanAdvance(lastStepTime, stepMs, now) {
  return Number.isFinite(stepMs) && stepMs > 0 && now - lastStepTime >= stepMs;
}

export const MARCH_TIME_SCALE = 0.85;

export function marchSegmentMs(fromKey, toKey, baseStepMs) {
  const [fc,fr]=String(fromKey).split(',').map(Number);
  const [tc,tr]=String(toKey).split(',').map(Number);
  const diagonal=fc!==tc && fr!==tr;
  return Math.max(50,Math.round(baseStepMs*MARCH_TIME_SCALE*(diagonal?Math.SQRT2:1)));
}

export function reachedMarchDestination(step, pathLength) {
  return pathLength > 0 && step === pathLength - 1;
}

// Constant-speed position across a whole route. Crossing a tile centre does not
// restart easing, so there is no pause between route segments.
export function positionAlongRoute(points, startTime, segmentDurations, now) {
  if (!points?.length) return null;
  if (points.length === 1 || !segmentDurations?.length) return { ...points.at(-1), done:true, segment:0 };
  const segments = points.length - 1;
  let elapsed=Math.max(0,now-startTime), segment=0;
  while(segment<segments && elapsed>=segmentDurations[segment]){
    elapsed-=segmentDurations[segment]; segment++;
  }
  if(segment>=segments) return { ...points.at(-1), done:true, segment:segments-1 };
  const fraction=elapsed/segmentDurations[segment];
  const from = points[segment], to = points[segment + 1];
  return {
    x: from.x + (to.x - from.x) * fraction,
    y: from.y + (to.y - from.y) * fraction,
    done:false,
    segment,
  };
}
