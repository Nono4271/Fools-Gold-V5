// Preview-stage two-bone gait. Coordinates use the existing 256px idle cell.
// The two feet are explicitly half a cycle apart: they cannot share a lead.
export const WALK_CYCLE_MS = 1100;
export const WALK_FRAMES = 32;
export const COMMANDER_MAP_SIZE = 52 * 0.85;
export const RIG_SOURCE_SIZE = 256;
export const RIG_PADDING = 16;

// Boots retain their original facing instead of inheriting shin rotation.
export function bootMatrix(sourceFoot, targetFoot) {
  return [1,0,0,1,targetFoot[0]-sourceFoot[0],targetFoot[1]-sourceFoot[1]];
}

export function armTip(pivot, tip, stride) {
  const angle = stride * 0.30;
  const dx=tip[0]-pivot[0],dy=tip[1]-pivot[1];
  return [pivot[0]+dx*Math.cos(angle)-dy*Math.sin(angle),
    pivot[1]+dx*Math.sin(angle)+dy*Math.cos(angle)];
}

export function footStep(now, side) {
  const phase = ((now / WALK_CYCLE_MS + side * 0.5) % 1 + 1) % 1;
  // Stance: planted foot moves backwards relative to the moving body.
  // Swing: lift it clear of the ground and bring it forward again.
  if (phase < 0.5) return {stride: 1 - phase * 4, lift: 0};
  const swing = (phase - 0.5) * 2;
  return {stride: -Math.cos(swing * Math.PI), lift: Math.sin(swing * Math.PI) * 11};
}

export function kneePosition(hip, foot, upper, lower, bend = 1) {
  const dx = foot[0] - hip[0], dy = foot[1] - hip[1];
  const distance = Math.max(0.001, Math.hypot(dx, dy));
  const reach = Math.min(distance, upper + lower - 0.001);
  const along = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  const across = Math.sqrt(Math.max(0, upper * upper - along * along));
  return [hip[0] + dx / distance * along + dy / distance * across * bend,
    hip[1] + dy / distance * along - dx / distance * across * bend];
}

// Transform a textured limb between its original and animated joint endpoints.
export function limbMatrix(a, b, targetA, targetB) {
  const sx = b[0] - a[0], sy = b[1] - a[1];
  const tx = targetB[0] - targetA[0], ty = targetB[1] - targetA[1];
  const lengthSq = sx * sx + sy * sy;
  const length = Math.sqrt(lengthSq), targetLength = Math.hypot(tx,ty);
  const ux=sx/length, uy=sy/length;
  const vx=tx/targetLength, vy=ty/targetLength, stretch=targetLength/length;
  // Stretch only along the bone: preserve boot/arm width during knee flexion.
  const m0=stretch*vx*ux+vy*uy, m1=stretch*vy*ux-vx*uy;
  const m2=stretch*vx*uy-vy*ux, m3=stretch*vy*uy+vx*ux;
  return [m0,m1,m2,m3,targetA[0]-m0*a[0]-m2*a[1],targetA[1]-m1*a[0]-m3*a[1]];
}
