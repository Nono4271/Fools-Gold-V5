export const FAC = {
  player:        { n:"Your Faction",           s:"⚑",  key:"player"         },
  pirates:       { n:"Pirates",                s:"🏴", key:"pirates"        },
  bountyhunters: { n:"Wizards",                s:"🔮", key:"bountyhunters"  },
  orcs:          { n:"Orcs",                   s:"⚔️",  key:"orcs"           },
  dragons:       { n:"Dragons",                s:"🐉",  key:"dragons"        },
  holyknights:   { n:"Holy Knights",           s:"✝️",  key:"holyknights"    },
  nightcreatures:{ n:"Creatures of the Night", s:"🌑",  key:"nightcreatures" },
};

export const AI_FACTIONS = [
  "pirates","bountyhunters","orcs","dragons","holyknights","nightcreatures"
];

export const ALIGNMENT = {
  humans:   { n:"Humans",   icon:"🛡", factions:["pirates","bountyhunters","holyknights"],  color:"#c8a060" },
  creatures:{ n:"Creatures",icon:"🦎", factions:["orcs","dragons","nightcreatures"],         color:"#7aaa40" },
};

export function getFactionAlignment(fk) {
  return ALIGNMENT.humans.factions.includes(fk) ? "humans" : "creatures";
}

export const PLAYABLE_FACTIONS = [
  { key:"pirates",        n:"Pirates",               s:"🏴‍☠️", desc:"Masters of the sea and ambush.",            c:"#d4832a" },
  { key:"bountyhunters",  n:"Wizards",               s:"🔮", desc:"Ancient wielders of arcane & healing arts.", c:"#9955dd" },
  { key:"orcs",           n:"Orcs",                  s:"⚔️",  desc:"Relentless warriors of the wilds.",          c:"#6aa830" },
  { key:"dragons",        n:"Dragons",               s:"🐉",  desc:"Feared overlords of fire and sky.",          c:"#cc3030" },
  { key:"holyknights",    n:"Holy Knights",          s:"✝️",  desc:"Sacred paladins sworn to divine order.",     c:"#d4af37" },
  { key:"nightcreatures", n:"Creatures of the Night",s:"🌑",  desc:"Shadow beings of the ancient dark.",         c:"#a030c0" },
];
