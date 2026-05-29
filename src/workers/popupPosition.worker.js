// popupPosition.worker.js
// Calculates optimal popup position given tile screen coords and popup dimensions.
// Determines which quadrant the tile is in and positions popup in opposite quadrant.

self.onmessage = ({ data }) => {
  const { tileX, tileY, popupW, popupH, screenW, screenH, padding = 8, hudH = 80 } = data;

  // Determine tile quadrant
  const tileLeft   = tileX < screenW / 2;
  const tileTop    = tileY < screenH / 2;

  let x, y;

  // Position popup in opposite horizontal quadrant
  if (tileLeft) {
    // Tile on left → popup on right
    x = Math.min(screenW - popupW - padding, tileX + 60);
  } else {
    // Tile on right → popup on left
    x = Math.max(padding, tileX - popupW - 60);
  }

  // Position popup in opposite vertical area
  if (tileTop) {
    // Tile on top → popup below tile
    y = Math.min(screenH - popupH - padding, tileY + 40);
  } else {
    // Tile on bottom → popup above tile
    y = Math.max(hudH, tileY - popupH - 40);
  }

  // Clamp to screen bounds
  x = Math.max(padding, Math.min(screenW - popupW - padding, x));
  y = Math.max(hudH, Math.min(screenH - popupH - padding, y));

  self.postMessage({ x, y });
};
