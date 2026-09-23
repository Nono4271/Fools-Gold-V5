// Phase 2 map-material polish helpers.
// Pure, deterministic functions so the renderer can keep a single draw path.
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export const TERRAIN_GROUND_ASSETS = {
  grass: 'grass-ground-v2.webp',
  forest: 'forest-ground-v2.webp',
  mountain: 'mountain-ground-v2.webp',
  desert: 'desert-ground-v2.webp',
  ruin: 'ruin-ground-v2.webp',
};

export function terrainGroundAsset(terrain = 'grass') {
  return TERRAIN_GROUND_ASSETS[terrain] || TERRAIN_GROUND_ASSETS.grass;
}

// Deterministic, low-contrast material variation. This is deliberately subtle:
// it breaks the "painted tile" look without introducing a visible checker/grid.
export function terrainMaterialTone(c, r, terrain = 'grass') {
  const seed = (((c + 11) * 73856093) ^ ((r + 17) * 19349663)) | 0;
  const wave = Math.sin(seed * 0.000013 + (terrain.length * 0.71)) * 0.5 + 0.5;
  const strength = terrain === 'forest' ? 0.055 :
    terrain === 'mountain' ? 0.045 :
    terrain === 'desert' ? 0.035 :
    terrain === 'ruin' ? 0.05 : 0.028;
  return 1 + (wave - 0.5) * strength;
}

// Resource contact shadow: [scaleX, scaleY, alpha].
export function resourceShadowSpec(tile, powerLevel = 1) {
  const large = Boolean(tile?.isKeep && !tile?.isGate && powerLevel >= 10);
  return large
    ? { scaleX: 1.0, scaleY: 0.42, alpha: 0.22 }
    : { scaleX: 0.72, scaleY: 0.30, alpha: 0.16 };
}

export function shadowColor(ownerTint = 0x000000) {
  // Shadows stay nearly black; a tiny owner tint prevents them from reading as
  // a hard sticker while retaining grounding against the world texture.
  const r = (ownerTint >> 16) & 255;
  const g = (ownerTint >> 8) & 255;
  const b = ownerTint & 255;
  const v = Math.round((r + g + b) / 3);
  return (Math.round(v * 0.12) << 16) | (Math.round(v * 0.12) << 8) | Math.round(v * 0.12);
}
