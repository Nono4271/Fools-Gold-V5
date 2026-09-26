# HQ footprint calibration — 2026-09-26

The HQ key is the **centre cell**, whose isometric coordinate is its top
vertex. Its actual ground centre is `(isoX, isoY + TH/2)`. The nine cells
form one diamond of width `3*TW` and height `3*TH` (240×159 world pixels
with the current geometry). Border, hit area and art now share that geometry.

`src/utils/hqLayout.js` contains the eight shipped dark-v2 art calibrations.
Foundation side/front landmarks were inspected at native resolution. The lower
opaque silhouette (alpha >=128) was sampled every 12 source pixels between
the side landmarks, with the hidden rear corner reflected across their midpoint.
The convex hull retains the foundation skirt while ignoring roofs, banners,
transparent padding and faint alpha noise. Recalibrate if source artwork changes.
The rear corner is an estimate because it is occluded by the building.

## Fit

Transform source foundation points into diamond axes:

- `u = x + (TW/TH)*y`
- `v = x - (TW/TH)*y`

Centre the bounding intervals of u and v. Convert that centre back to source
x/y for the sprite anchor. Divide the target diamond half-width by the larger
source interval half-span to obtain a **uniform** scale, leaving a 2.5% inset
for ground edges. This is the largest proportional fit for the measured hull;
its two diamond-axis intervals are centred and every calibrated ground point
is contained. A sprite's width is no longer confused with its transparent canvas.

Irregular foundations do not touch every corner of an isometric diamond.
We preserve the actual artwork proportions instead of stretching towers to
force that contact. Towers and flags rise above the rear ground boundary,
as normal for an isometric building. The calibration controls ground contact,
not containment of the entire tall silhouette.

Names use the measured visible top of each asset, so they clear taller towers.
Cached and asynchronously loaded textures use the same placement function.
Joined territory borders, map cells, HQ ownership and relocation rules are unchanged.

## Verification

`node --test tests/hqLayout.test.js tests/worldVisuals.test.js`
checks the nine-cell geometry, all eight proportional fits, maximal size,
ground containment, centring, relocation invariance and existing joined borders.
`npm run build` verifies renderer integration.

`hq-alignment-preview.png` is a calibration diagram at actual world scale,
showing the original art over the nine-cell grid. The full boundary is drawn
on top of the art for inspection; gameplay still draws the border behind the HQ
and omits segments joined to matching owned territory.
