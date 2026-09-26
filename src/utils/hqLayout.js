import { isoXY, TW, TH } from '../../shared/constants/geometry.js';

// Native-pixel foundation contours for the shipped HQ art. These describe
// ground contact, NOT the alpha centroid of roofs/flags or transparent canvas.
// Front/side points were measured at alpha >= 128; the hidden rear corner is
// reflected across the side-corner midpoint. Convex hulls retain the outer
// skirt. See docs/hq-alignment.md for measurement and fitting details.
export const HQ_ART = {
  pirates: {"file":"hq_pirates_dark_v2.webp","size":[768,768],"visibleTop":19,"ground":[[18,558],[385.0,380.0],[750,570],[752,574],[738,607],[702,663],[630,706],[606,712],[414,750],[385,752],[354,747],[318,737],[198,700],[174,688],[102,648],[66,617],[54,606]]},
  orcs: {"file":"hq_orcs_dark_v2.webp","size":[1024,1024],"visibleTop":186,"ground":[[64,662],[424.0,466.0],[963,638],[736,794],[676,826],[664,828],[603,835],[448,830],[268,782],[244,772],[76,672],[64,663]]},
  dragons: {"file":"hq_dragons_dark_v2.webp","size":[1024,1024],"visibleTop":194,"ground":[[147,671],[514.0,516.0],[879,664],[881,666],[855,689],[699,796],[687,803],[675,808],[651,812],[627,815],[514,821],[447,807],[387,790],[279,744],[171,692]]},
  wizards: {"file":"hq_arcane_dark_v2.webp","size":[1024,1024],"visibleTop":191,"ground":[[166,629],[448.0,538.0],[870,710],[862,717],[850,725],[730,790],[694,806],[658,813],[646,815],[588,819],[574,819],[478,809],[454,801],[334,759],[286,741],[226,699],[190,670],[166,647]]},
  holyknights: {"file":"hq_holyknights_dark_v2.webp","size":[1024,1024],"visibleTop":66,"ground":[[87,688],[482.0,468.0],[945,722],[759,854],[735,871],[627,940],[615,947],[550,947],[459,939],[447,936],[351,873],[111,715],[99,706],[87,693]]},
  nightcreatures: {"file":"hq_nightcreatures_dark_v2.webp","size":[1024,1024],"visibleTop":191,"ground":[[146,671],[475.0,543.0],[878,687],[879,689],[842,725],[818,740],[746,780],[626,819],[590,826],[566,828],[494,828],[470,824],[446,818],[314,783],[290,776],[206,722],[146,682]]},
  coldborns: {"file":"hq_coldborns_dark_v2.webp","size":[1024,1024],"visibleTop":188,"ground":[[76,621],[473.0,475.0],[947,683],[916,704],[724,793],[688,809],[664,818],[616,829],[550,830],[412,826],[124,698],[88,674],[76,622]]},
  ashen_dead: {"file":"hq_ashen_dead_dark_v2.webp","size":[1024,1024],"visibleTop":194,"ground":[[107,621],[482.0,437.0],[923,640],[925,641],[743,764],[719,779],[683,799],[635,811],[575,823],[550,826],[491,825],[479,824],[467,821],[407,794],[395,788],[239,709],[131,639],[107,622]]},
};

export function hqArtFor(faction, owner) {
  return HQ_ART[faction] || (owner === 'ai' ? HQ_ART.orcs : HQ_ART.pirates);
}

// The centre tile coordinate is its TOP vertex. The ground centre is TH/2
// below that, with a 3*TW by 3*TH outer diamond for the nine occupied tiles.
export function hqFootprint(c, r) {
  const { cx, cy } = isoXY(c, r);
  const y = cy + TH / 2, halfWidth = TW * 1.5, halfHeight = TH * 1.5;
  return { x: cx, y, halfWidth, halfHeight,
    points: [cx, y-halfHeight, cx+halfWidth, y, cx, y+halfHeight, cx-halfWidth, y] };
}

export { fitStructureArt as fitHqArt } from './structureLayout.js';
