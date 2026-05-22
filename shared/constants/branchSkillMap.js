// shared/constants/branchSkillMap.js
// ─────────────────────────────────────────────────────────────────────────────
// Pure data — no imports. Extracted from skills.js so heroes.js can use branch
// lookups without importing skills.js, which would create a circular dependency
// in the Rollup shared chunk and cause TDZ errors at runtime.
//
// skills.js still imports this file for use in getDefCmdBranches and resolveBranchMap.

export const BRANCH_SKILL_MAP = {
  attacker: [
    { main:"killing_instinct", sides:["predator_eyes",   "battle_hunger"]    },
    { main:"quick_strike",     sides:["battle_frenzy",   "flurry"]           },
    { main:"savage_blow",      sides:["killing_edge",    "deathblow"]        },
    { main:"execute",          sides:["double_strike",   "sweeping_strike"]  },
  ],
  balanced: [
    { main:"iron_will",        sides:["killing_instinct", "inspiring_presence"] },
    { main:"shield_wall",      sides:["quick_strike",     "battle_hymn"]        },
    { main:"grand_strategy",   sides:["iron_bastion",     "expose_weakness"]    },
    { main:"bulwark_stance",   sides:["forced_march",     "last_stand"]         },
  ],
  support: [
    { main:"field_medic",      sides:["hex_curse",           "guardian_aura"]    },
    { main:"mending_wave",     sides:["blind_strike",        "ember_shield"]     },
    { main:"rally_cry",        sides:["supply_cut_support",  "expose_weakness"]  },
    { main:"battle_hymn",      sides:["inspiring_presence",  "foresight"]        },
  ],
  leader: [
    { main:"warchief_aura",    sides:["supply_cut_leader",  "legion_discipline"] },
    { main:"warchief_roar",    sides:["tactical_advance",   "shield_order"]      },
    { main:"grand_strategy",   sides:["war_council",        "siege_protocol"]    },
    { main:"forced_march",     sides:["siege_mastery",      "overwhelm"]         },
  ],
  strategist: [
    { main:"field_medic",      sides:["hex_curse",           "expose_weakness"]  },
    { main:"expose_weakness",  sides:["blind_strike",        "battle_frenzy"]    },
    { main:"killing_edge",     sides:["supply_cut_support",  "foresight"]        },
    { main:"execute",          sides:["deathblow",           "battle_hunger"]    },
  ],
  defender: [
    { main:"iron_will",               sides:["demoralise",            "fortified_ranks"]  },
    { main:"shield_wall",             sides:["blinding_light",        "hold_the_line"]    },
    { main:"iron_bastion",            sides:["terror_aura",           "counter_intel"]    },
    { main:"bulwark_stance",          sides:["intimidating_presence", "last_stand"]       },
  ],
};
