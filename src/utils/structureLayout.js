// In diamond coordinates u=x+(TW/TH)*y, v=x-(TW/TH)*y, containment
// becomes two interval checks. Centre both intervals, then use the larger
// span to choose the largest UNIFORM scale that fits. No skew, stretching,
// magic pixel offsets, canvas-width assumptions, or dependence on map zoom.
export function fitStructureArt(art, footprint, inset = 0.025) {
  const ratio = footprint.halfWidth / footprint.halfHeight;
  const us = art.ground.map(([x,y]) => x + ratio*y);
  const vs = art.ground.map(([x,y]) => x - ratio*y);
  const u0=Math.min(...us), u1=Math.max(...us), v0=Math.min(...vs), v1=Math.max(...vs);
  const um=(u0+u1)/2, vm=(v0+v1)/2;
  const anchorX=(um+vm)/2, anchorY=(um-vm)/(2*ratio);
  const radius=Math.max(u1-u0,v1-v0)/2;
  const scale=footprint.halfWidth*(1-inset)/radius;
  return {
    x:footprint.x, y:footprint.y,
    anchorX:anchorX/art.size[0], anchorY:anchorY/art.size[1],
    width:art.size[0]*scale, height:art.size[1]*scale,
    visibleTop:footprint.y+(art.visibleTop-anchorY)*scale,
    scale,
  };
}
