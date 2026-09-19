export function marchCanAdvance(lastStepTime, stepMs, now) {
  return Number.isFinite(stepMs) && stepMs > 0 && now - lastStepTime >= stepMs;
}

// Constant-speed position across a whole route. Crossing a tile centre does not
// restart easing, so there is no pause between route segments.
export function positionAlongRoute(points, startTime, stepMs, now) {
  if (!points?.length) return null;
  if (points.length === 1 || !(stepMs > 0)) return { ...points.at(-1), done:true, segment:0 };
  const segments = points.length - 1;
  const progress = Math.max(0, (now - startTime) / stepMs);
  if (progress >= segments) return { ...points.at(-1), done:true, segment:segments - 1 };
  const segment = Math.floor(progress);
  const fraction = progress - segment;
  const from = points[segment], to = points[segment + 1];
  return {
    x: from.x + (to.x - from.x) * fraction,
    y: from.y + (to.y - from.y) * fraction,
    done:false,
    segment,
  };
}
