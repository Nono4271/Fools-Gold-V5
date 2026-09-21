export const COLS = 1845;
export const ROWS = 1305;
export const TW = 80;
export const TH = 53;
export const SW = 0;
export const TOP_PAD = 60;
export const ISO_W = (COLS + ROWS) * (TW / 2) + TW;
export const ISO_H = (COLS + ROWS) * (TH / 2) + TH + SW + TOP_PAD + 40;

export function isoXY(c, r) {
  return {
    cx: (c - r) * (TW / 2) + (ROWS * TW / 2),
    cy: (c + r) * (TH / 2) + TOP_PAD,
  };
}

// Inverse of isoXY: world pixel coords → fractional tile (c, r).
export function worldToTile(wx, wy) {
  const a = (wx - ROWS * TW / 2) / (TW / 2);
  const b = (wy - TOP_PAD) / (TH / 2);
  return { c: (a + b) / 2, r: (b - a) / 2 };
}

// The visible tile-coordinate box for a given pan/zoom, clamped to the map's
// bounds. Same math as MapRenderer's internal getViewBounds (kept separate
// there, not refactored to call this, to avoid touching its render-critical
// code path) — added here so useServerSync can compute the same box to
// drive VIEWPORT_SUB as the player pans, without duplicating the transform.
export function viewBoundsCR(pan, zoom, vw, vh, buf = 4) {
  const wxL = (-pan.x) / zoom, wxR = (-pan.x + vw) / zoom;
  const wyT = (-pan.y) / zoom, wyB = (-pan.y + vh) / zoom;
  const corners = [worldToTile(wxL, wyT), worldToTile(wxR, wyT), worldToTile(wxL, wyB), worldToTile(wxR, wyB)];
  const cs = corners.map(p => p.c), rs = corners.map(p => p.r);
  return {
    minC: Math.max(0,        Math.floor(Math.min(...cs)) - buf),
    maxC: Math.min(COLS - 1, Math.ceil( Math.max(...cs)) + buf),
    minR: Math.max(0,        Math.floor(Math.min(...rs)) - buf),
    maxR: Math.min(ROWS - 1, Math.ceil( Math.max(...rs)) + buf),
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
