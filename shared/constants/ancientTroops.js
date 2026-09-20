// ─────────────────────────────────────────────────────────────────────────────
//  ancientTroops.js — The Ancients (T4, unaligned, above every faction's T4)
//
//  Roadmap follow-up to the neutral-unit roster (see `neutralTroops.js`): 4
//  units belonging to a brand-new "Ancients" race — mysterious beings that
//  predate the 8 factions and every other neutral race. Design constraints
//  (owner-specified):
//    - Large size only, T4 power bracket (same bracket as each faction's
//      single capstone branch — see the "T4 capstone troops" ReadMeAI entry
//      and `troops.js`'s `capstone: true` branches).
//    - Stats run 15-20% above the average LARGE-format faction T4 capstone
//      (Abyssal Leviathan / Doomcaller / Bone Colossus are the 3 capstones
//      that are actually "large" — the other 5 factions' capstones were
//      deliberately scaled to medium/small per an earlier owner decision, so
//      they are not part of this baseline). Baseline average of those three:
//        dmgLo 553, dmgHi 585, def 97, hp 1817, siege 767, spd 47
//      Each Ancient below is individually scaled 15-20% above that baseline
//      (checked in `tests/ancientTroops.test.js`), not identical to each
//      other — same convention as the rest of the roster having per-unit
//      flavor rather than one copy-pasted stat block.
//    - Skills A/B/C: three real, upgradable abilities per Ancient (every one
//      carries `procBase`/`procMax` exactly like every other troop skill in
//      the game, so they level 1-10 through the existing generic
//      `skillProcAtLevel`/`skillOrbCost` system in `troops.js` — no new
//      upgrade plumbing needed, and this was checked against the existing
//      faction T4 capstones too: every capstone `a`/`b`/`c` skill already
//      carries `procBase`/`procMax`, so they were already upgradable before
//      this change; nothing there needed fixing).
//    - Skill D: NOT a combat ability. It is the "only one Ancient may be
//      used in an army" restriction, modelled as an actual (4th) skill entry
//      for visibility in any skill-list UI, but it is `trigger: "passive"`
//      with no `procBase`/`procMax`/`effect` — it cannot be leveled or
//      upgraded, because it isn't a chance-based combat effect, it's a hard
//      army-composition rule. The real enforcement lives in
//      `shared/utils/troopSlots.js` (`isAncientUniqueBranch` /
//      `armyHasOtherAncient`), keyed off this branch's `uniqueSlot: true`
//      flag, not off skill D itself — skill D is documentation/flavor for
//      that same rule, kept in sync by convention, not by code.
//
//  Structural note: each Ancient is defined as a capstone-shaped branch
//  object (`capstone: true`, one `tiers[0]` stat block, `skills.a/b/c`
//  fielded together) so it reuses 100% of the existing capstone resolution
//  path in both `troops.js` (`resolveTroopTier`/`getTierSkills`) and
//  `battle.js` (`getTierSkillsForBattle`) with zero new branching there —
//  only an additive fallback lookup was added to each (see those files' own
//  comments near `ANCIENT_FACTIONS`). Ancients are kept OUT of
//  `FACTION_TROOPS`/`FACTION_KEYS` (a synthetic `ancients` faction key is
//  used only inside `ANCIENT_FACTIONS`) so nothing that assumes "8 real
//  factions" anywhere in the codebase is affected.
//
//  Scope note: like `neutralTroops.js`, this is DATA + battle-resolution +
//  army-composition-rule support only. There is no acquisition system (no
//  gacha entry, no way to actually earn an Ancient into a barracks pool yet)
//  and no map placement/UI wiring — see the ReadMeAI entry for this change.
// ─────────────────────────────────────────────────────────────────────────────

export const ANCIENT_FACTION_KEY = "ancients";

// Shared flavor/documentation-only "skill D" — see file header. Every
// Ancient carries an identical copy (by design: it's the same rule for all
// four, not a per-unit ability).
const SOLE_ANCIENT_SKILL = {
  key: "sole_ancient",
  name: "Sole Ancient",
  icon: "🚫",
  trigger: "passive",
  desc: "Only one Ancient may be placed in an army's troop slots at a time — this cannot be leveled.",
  // Deliberately no procBase/procMax/effect: not a combat proc, not
  // upgradable. Enforced by shared/utils/troopSlots.js via `uniqueSlot`.
};

export const ANCIENT_TROOPS = [
  {
    key: "voidmaw",
    label: "Voidmaw, the First Devourer",
    race: "Ancients",
    size: "large",
    dmgType: "physical",
    role: "melee",
    tags: ["ancient"],
    capstone: true,
    uniqueSlot: true,
    desc: "It was hungry before the world had a name for hunger, and it has not stopped since.",
    tiers: [
      { label: "Voidmaw, the First Devourer", desc: "It was hungry before the world had a name for hunger, and it has not stopped since.", dmgLo: 636, dmgHi: 673, def: 112, hp: 2090, siege: 882, spd: 54 },
    ],
    skills: {
      a: {
        key: "endless_hunger", name: "Endless Hunger", icon: "🩸",
        trigger: "on_hit",
        desc: "On hit, chance to deal an extra 60% instance of damage.",
        procBase: 0.25, procMax: 0.65,
        effect: { type: "bonus_damage", value: 0.60 },
      },
      b: {
        key: "devouring_silence", name: "Devouring Silence", icon: "🌑",
        trigger: "on_hit_received",
        desc: "On hit received, chance to reduce damage taken by 30% for 1 round.",
        procBase: 0.25, procMax: 0.65,
        effect: { type: "dmg_reduce", value: 0.30, duration: 1 },
      },
      c: {
        key: "maw_of_ruin", name: "Maw of Ruin", icon: "🕳️",
        trigger: "on_hit",
        desc: "On hit, chance to stun the target for 1 round.",
        procBase: 0.15, procMax: 0.45,
        effect: { type: "stun", duration: 1 },
      },
      d: SOLE_ANCIENT_SKILL,
    },
  },
  {
    key: "aeonspire",
    label: "Aeonspire, the Silent Watcher",
    race: "Ancients",
    size: "large",
    dmgType: "magical",
    role: "siege",
    tags: ["ancient"],
    capstone: true,
    uniqueSlot: true,
    desc: "It has watched every empire the map remembers rise, and has not once been asked its name.",
    tiers: [
      { label: "Aeonspire, the Silent Watcher", desc: "It has watched every empire the map remembers rise, and has not once been asked its name.", dmgLo: 647, dmgHi: 684, def: 113, hp: 2126, siege: 897, spd: 55 },
    ],
    skills: {
      a: {
        key: "timeless_vigil", name: "Timeless Vigil", icon: "⏳",
        trigger: "round_start",
        desc: "On round start, chance to make the enemy take 25% more damage this round.",
        procBase: 0.26, procMax: 0.65,
        effect: { type: "vs_all_dmg_up", value: 0.25 },
      },
      b: {
        key: "paralyzing_gaze", name: "Paralyzing Gaze", icon: "👁️",
        trigger: "on_hit",
        desc: "On hit, chance to stun the target for 1 round.",
        procBase: 0.20, procMax: 0.50,
        effect: { type: "stun", duration: 1 },
      },
      c: {
        key: "arcane_barrage", name: "Arcane Barrage", icon: "🌌",
        trigger: "on_hit",
        desc: "On hit, chance to deal an extra 100% instance of focus damage.",
        procBase: 0.35, procMax: 0.75,
        effect: { type: "bonus_damage", value: 1.00, dmgType: "focus" },
      },
      d: SOLE_ANCIENT_SKILL,
    },
  },
  {
    key: "ruinfather",
    label: "Ruinfather, Who Walked Before",
    race: "Ancients",
    size: "large",
    dmgType: "physical",
    role: "melee",
    tags: ["ancient"],
    capstone: true,
    uniqueSlot: true,
    desc: "The oldest ruins on the map were already ruins when it first walked past them.",
    tiers: [
      { label: "Ruinfather, Who Walked Before", desc: "The oldest ruins on the map were already ruins when it first walked past them.", dmgLo: 658, dmgHi: 696, def: 115, hp: 2162, siege: 912, spd: 56 },
    ],
    skills: {
      a: {
        key: "reap_three", name: "Reap Three", icon: "🌾",
        trigger: "on_hit",
        desc: "On hit, chance to strike the 3 lowest-DEF enemies for full damage each.",
        procBase: 0.20, procMax: 0.55,
        effect: { type: "multi_hit_lowest_def", targets: 3 },
      },
      b: {
        key: "ancient_hunger", name: "Ancient Hunger", icon: "🩶",
        trigger: "on_hit",
        desc: "On hit, chance to heal for 45% of damage dealt.",
        procBase: 0.25, procMax: 0.60,
        effect: { type: "lifesteal", value: 0.45 },
      },
      c: {
        key: "weathered_hide", name: "Weathered Hide", icon: "🪨",
        trigger: "on_hit_received",
        desc: "On hit received, chance to reduce damage taken by 25% for 1 round.",
        procBase: 0.25, procMax: 0.60,
        effect: { type: "dmg_reduce", value: 0.25, duration: 1 },
      },
      d: SOLE_ANCIENT_SKILL,
    },
  },
  {
    key: "nameless_colossus",
    label: "The Nameless Colossus",
    race: "Ancients",
    size: "large",
    dmgType: "physical",
    role: "siege",
    tags: ["ancient"],
    capstone: true,
    uniqueSlot: true,
    desc: "No language still spoken has a word for what it was called before this age.",
    tiers: [
      { label: "The Nameless Colossus", desc: "No language still spoken has a word for what it was called before this age.", dmgLo: 664, dmgHi: 702, def: 116, hp: 2180, siege: 920, spd: 56 },
    ],
    skills: {
      a: {
        key: "grinding_ruin", name: "Grinding Ruin", icon: "⚙️",
        trigger: "on_hit_received",
        desc: "On hit received, chance to increase damage dealt by 8% per hit, up to 5 stacks.",
        procBase: 0.30, procMax: 0.70,
        effect: { type: "atk_stack", valuePerStack: 0.08, maxStacks: 5 },
      },
      b: {
        key: "immovable_answer", name: "Immovable Answer", icon: "🛡️",
        trigger: "on_hit_received",
        desc: "On hit received, chance to counter-attack immediately.",
        procBase: 0.20, procMax: 0.50,
        effect: { type: "counter_attack" },
      },
      c: {
        key: "siegebreakers_wrath", name: "Siegebreaker's Wrath", icon: "💥",
        trigger: "on_hit",
        desc: "On hit, chance to deal an extra 70% instance of damage.",
        procBase: 0.25, procMax: 0.60,
        effect: { type: "bonus_damage", value: 0.70 },
      },
      d: SOLE_ANCIENT_SKILL,
    },
  },
];

// Capstone-shaped "faction" wrapper so `resolveTroopBranch`/`getTierSkills`
// (troops.js) and `getTierSkillsForBattle` (battle.js) can resolve an
// Ancient with `{ faction: "ancients", branch: "<key>" }` through the exact
// same code path used for every real faction's capstone branch.
export const ANCIENT_FACTIONS = {
  [ANCIENT_FACTION_KEY]: {
    quarters: "The First Age",
    branches: ANCIENT_TROOPS,
  },
};

export const ANCIENT_TROOP_KEYS = ANCIENT_TROOPS.map(u => u.key);

const _BY_KEY = new Map(ANCIENT_TROOPS.map(u => [u.key, u]));

export function resolveAncientUnit(key) {
  return _BY_KEY.get(key) ?? null;
}

export function isAncientBranch(branch) {
  return !!(branch && branch.faction === ANCIENT_FACTION_KEY);
}

// Ancient portrait path helper (mirrors troopPortraitPath). No art exists
// yet for any Ancient — this just fixes the expected path ahead of time.
export function ancientPortraitPath(key) {
  if (!key) return null;
  return `/troops/ancient_${key}_portrait.webp`;
}
