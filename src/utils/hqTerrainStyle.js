import {Filter} from 'pixi.js';

// Rendering treatment only: source faction sprites remain unchanged. The pale
// sand skirt at the bottom blends toward the meadow; stone, flags and lights
// keep their detail. Coldborn snow retains its blue-white faction identity.
const fragment = `
precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec4 inputSize;
uniform vec4 outputFrame;
uniform float icy;
void main(void) {
  vec4 src = texture2D(uSampler, vTextureCoord);
  vec3 rgb = src.rgb / max(src.a, 0.0001);
  vec2 local = vTextureCoord * inputSize.xy / outputFrame.zw;
  float low = min(rgb.r, min(rgb.g, rgb.b));
  float high = max(rgb.r, max(rgb.g, rgb.b));
  float paleGround = smoothstep(0.50, 0.76, low)
    * (1.0 - smoothstep(0.16, 0.30, high-low))
    * smoothstep(0.72, 0.90, local.y) * (1.0-icy);
  rgb *= mix(vec3(0.97, 0.96, 0.90), vec3(0.96, 0.99, 1.0), icy);
  rgb = mix(rgb, vec3(0.43, 0.46, 0.30), paleGround * 0.64);
  float alpha = src.a * (1.0 - paleGround * smoothstep(0.89, 0.99, local.y) * 0.48);
  gl_FragColor = vec4(rgb * alpha, alpha);
}`;

const filters = new Map();
export function hqTerrainFilter(faction) {
  const icy = faction === 'coldborns' ? 1 : 0;
  if (!filters.has(icy)) {
    const filter = new Filter(undefined,fragment,{icy});
    // Keep the skirt mask attached to the whole sprite while panning offscreen.
    filter.autoFit = false;
    filters.set(icy,filter);
  }
  return filters.get(icy);
}

// Retain owner/ally/enemy colour meaning with a quieter, earthy saturation.
export function softenTerritoryColor(color) {
  const mix = (channel,earth) => Math.round(channel*0.65+earth*0.35);
  return (mix((color>>16)&255,160)<<16)|(mix((color>>8)&255,168)<<8)|mix(color&255,120);
}
