// Retain owner/ally/enemy colour meaning with a quieter, earthy saturation.
export function softenTerritoryColor(color) {
  const mix = (channel,earth) => Math.round(channel*0.65+earth*0.35);
  return (mix((color>>16)&255,160)<<16)|(mix((color>>8)&255,168)<<8)|mix(color&255,120);
}
