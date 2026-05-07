export const COLS = 700;
export const ROWS = 700;
export const TW = 80;   // tile width  — 2:1 classic isometric
export const TH = 40;   // tile height — TW/2 gives the correct ~26° iso angle
export const SW = 0;  // No side walls — RTW flat style
export const TOP_PAD = 60;
// Standard isometric: world is a diamond; grid lines run at 2:1 angle on screen
export const ISO_W = (COLS + ROWS) * (TW / 2) + TW;
export const ISO_H = (COLS + ROWS) * (TH / 2) + TH + SW + TOP_PAD + 40;

export function isoXY(c, r) {
  return {
    cx: (c - r) * (TW / 2) + (ROWS * TW / 2),
    cy: (c + r) * (TH / 2) + TOP_PAD,
  };
}

export function topFacePts(cx, cy, elev) {
  const ey = cy - elev;
  return [
    [cx,        ey],
    [cx + TW/2, ey + TH/2],
    [cx,        ey + TH],
    [cx - TW/2, ey + TH/2],
  ];
}

export function leftWallPts(cx, cy, elev) {
  const ey = cy - elev;
  return [
    [cx - TW/2, ey + TH/2],
    [cx,        ey + TH],
    [cx,        ey + TH + SW],
    [cx - TW/2, ey + TH/2 + SW],
  ];
}

export function rightWallPts(cx, cy, elev) {
  const ey = cy - elev;
  return [
    [cx,        ey + TH],
    [cx + TW/2, ey + TH/2],
    [cx + TW/2, ey + TH/2 + SW],
    [cx,        ey + TH + SW],
  ];
}

export function ptsStr(pts) {
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}
