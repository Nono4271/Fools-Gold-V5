export const FAC = {
  player:       { n:"Your Faction", s:"⚑",  key:"player"       },
  pirates:      { n:"Pirates",      s:"🏴", key:"pirates"      },
  marines:      { n:"Marines",      s:"⚓",  key:"marines"      },
  bountyhunters:{ n:"Wizards",      s:"🔮", key:"bountyhunters" },
  merfolk:      { n:"MerFolk",      s:"🌊",  key:"merfolk"      },
  orcs:         { n:"Orcs",         s:"⚔️",  key:"orcs"         },
  dragons:      { n:"Dragons",      s:"🐉",  key:"dragons"      },
};

export const AI_FACTIONS = [
  "pirates","marines","bountyhunters","merfolk","orcs","dragons"
];

export const ALIGNMENT = {
  humans:   { n:"Humans",   icon:"🛡", factions:["pirates","marines","bountyhunters"], color:"#c8a060" },
  creatures:{ n:"Creatures",icon:"🦎", factions:["merfolk","orcs","dragons"],          color:"#7aaa40" },
};

export function getFactionAlignment(fk) {
  return ALIGNMENT.humans.factions.includes(fk) ? "humans" : "creatures";
}

export const PLAYABLE_FACTIONS = [
  { key:"pirates",       n:"Pirates",  s:"🏴‍☠️", desc:"Masters of the sea and ambush.",            c:"#d4832a" },
  { key:"marines",       n:"Marines",  s:"⚓",  desc:"Disciplined naval enforcers.",               c:"#4488cc" },
  { key:"bountyhunters", n:"Wizards",  s:"🔮", desc:"Ancient wielders of arcane & healing arts.", c:"#9955dd" },
  { key:"merfolk",       n:"MerFolk",  s:"🌊",  desc:"Ancient rulers of the deep.",                c:"#30b8c8" },
  { key:"orcs",          n:"Orcs",     s:"⚔️",  desc:"Relentless warriors of the wilds.",          c:"#6aa830" },
  { key:"dragons",       n:"Dragons",  s:"🐉",  desc:"Feared overlords of fire and sky.",          c:"#cc3030" },
];
