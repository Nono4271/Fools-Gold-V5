// Crew 2.0 — pure rules for roles, privacy, creation, XP and Contribution
// Points. Fortress build/siege rules live in their own file, crewFortress.js
// (mirrors the constants/chat.js + utils/chatRules.js + utils/subchannels.js
// split already used elsewhere in this codebase).
import {
  CREW_ROLES, CREW_MAX_OFFICERS, CREW_PRIVACY, DEFAULT_CREW_PRIVACY,
  CREW_DESCRIPTION_MAX_LEN, DEFAULT_EMBLEM, isValidEmblem,
  CREW_LANGUAGES, DEFAULT_CREW_LANGUAGE, CREW_TARGET_LABEL_MAX_LEN,
  crewMemberCapForLevel, crewFortressSlotsForLevel, applyCrewXp,
  CREW_HELP_CONTRIBUTION, CREW_DIPLOMACY_STATUS, CREW_DIPLOMACY_STATUSES,
  WAR_DECLARE_TO_START_MS, WAR_DURATION_MS, WAR_COOLDOWN_MS,
} from "../constants/crew.js";
import { defaultCrewSubchannels } from "../constants/chat.js";

// ── Role lookup ──────────────────────────────────────────────────────────
export function roleOf(crew, playerId) {
  if (!crew || !playerId) return null;
  if (crew.founder === playerId) return CREW_ROLES.FOUNDER;
  if ((crew.officers || []).includes(playerId)) return CREW_ROLES.OFFICER;
  if ((crew.members || []).includes(playerId)) return CREW_ROLES.MEMBER;
  return null;
}

export function isFounder(crew, playerId) { return roleOf(crew, playerId) === CREW_ROLES.FOUNDER; }
export function isOfficer(crew, playerId) { return roleOf(crew, playerId) === CREW_ROLES.OFFICER; }
export function isFounderOrOfficer(crew, playerId) {
  const r = roleOf(crew, playerId);
  return r === CREW_ROLES.FOUNDER || r === CREW_ROLES.OFFICER;
}

// ── Permissions ──────────────────────────────────────────────────────────
// Founder: promote/demote/kick anyone (not itself), disband, build/demolish
// fortress, invite/accept, manage subchannels.
// Officer: kick members only (not other officers/founder), build/demolish
// fortress, invite/accept. Cannot promote/demote, disband, or manage
// subchannels.
export function canPromote(crew, actorId)  { return isFounder(crew, actorId); }
export function canDemote(crew, actorId)   { return isFounder(crew, actorId); }
export function canDisband(crew, actorId)  { return isFounder(crew, actorId); }
export function canManageSubchannels(crew, actorId) { return isFounder(crew, actorId); }

export function canKick(crew, actorId, targetId) {
  if (!crew || actorId === targetId) return false;
  const actorRole = roleOf(crew, actorId);
  const targetRole = roleOf(crew, targetId);
  if (targetRole === CREW_ROLES.FOUNDER) return false; // founder can't be kicked
  if (actorRole === CREW_ROLES.FOUNDER) return true;
  if (actorRole === CREW_ROLES.OFFICER) return targetRole === CREW_ROLES.MEMBER;
  return false;
}

export function canInviteOrAccept(crew, actorId) { return isFounderOrOfficer(crew, actorId); }
export function canManageFortress(crew, actorId) { return isFounderOrOfficer(crew, actorId); } // build or voluntary demolish
// Announcement (the crew's description, shown as a banner in CrewHQ) is
// founder-only to edit — officers cannot. Rally target is a founder/officer
// tool, same tier as fortress management.
export function canEditAnnouncement(crew, actorId) { return isFounder(crew, actorId); }
export function canSetTarget(crew, actorId) { return isFounderOrOfficer(crew, actorId); }
// Diplomacy (Ally/Neutral/Enemy standing toward another crew) is a
// founder/officer tool, same tier as rally target.
export function canSetDiplomacy(crew, actorId) { return isFounderOrOfficer(crew, actorId); }
// War — same tier as everything else here (founder/officer).
export function canDeclareWar(crew, actorId) { return isFounderOrOfficer(crew, actorId); }
export function canCancelWar(crew, actorId) { return isFounderOrOfficer(crew, actorId); }

// ── Creation ─────────────────────────────────────────────────────────────
export function validateCrewCreation({ name, abbr, description, emblem, privacy, language }) {
  const errs = [];
  if (!name || name.trim().length < 4 || name.trim().length > 20) {
    errs.push("Name must be 4–20 characters");
  }
  if (!abbr || abbr.trim().length !== 4) {
    errs.push("Abbreviation must be exactly 4 characters");
  }
  if (description && description.length > CREW_DESCRIPTION_MAX_LEN) {
    errs.push(`Description must be ${CREW_DESCRIPTION_MAX_LEN} characters or fewer`);
  }
  if (emblem && !isValidEmblem(emblem)) {
    errs.push("Invalid emblem selection");
  }
  if (privacy && !Object.values(CREW_PRIVACY).includes(privacy)) {
    errs.push("Invalid privacy setting");
  }
  if (language && !CREW_LANGUAGES.includes(language)) {
    errs.push("Invalid language selection");
  }
  return errs;
}

// Builds a fresh crew object. `founderId` is a playerId (real player's id or
// an ai_<faction>_<i> id — see the facKey-vs-playerId note in
// shared/utils/chatRules.js/aiCrews.js; callers normalize that, this just
// stores whatever id it's given).
export function createCrew({
  id, name, abbr, description = "", emblem = DEFAULT_EMBLEM, privacy = DEFAULT_CREW_PRIVACY,
  language = DEFAULT_CREW_LANGUAGE, faction, founderId, cap,
}) {
  return {
    id, name: name.trim(), abbr: abbr.trim().toUpperCase(),
    description: (description || "").slice(0, CREW_DESCRIPTION_MAX_LEN),
    emblem: isValidEmblem(emblem) ? emblem : DEFAULT_EMBLEM,
    privacy: Object.values(CREW_PRIVACY).includes(privacy) ? privacy : DEFAULT_CREW_PRIVACY,
    language: CREW_LANGUAGES.includes(language) ? language : DEFAULT_CREW_LANGUAGE,
    faction,
    founder: founderId,
    officers: [],
    members: [founderId],
    cap: cap ?? crewMemberCapForLevel(1),
    level: 1,
    xp: 0,
    contributions: {},     // { [playerId]: totalContributionPoints }
    subChannels: defaultCrewSubchannels(),
    fortresses: [],
    target: null,          // { tileKey, label, setBy, setAt } | null — see setCrewTarget
    diplomacy: {},         // { [otherCrewId]: "ally"|"enemy" } — see setDiplomacyStatus
    war: null,             // null | { declaredAt, startsAt, endsAt, cooldownEndsAt, declaredBy } — see declareWar/crewWarPhase
  };
}

// ── Announcement / rally target ─────────────────────────────────────────
export function updateAnnouncement(crew, actorId, text) {
  if (!canEditAnnouncement(crew, actorId)) return crew;
  return { ...crew, description: (text || "").slice(0, CREW_DESCRIPTION_MAX_LEN) };
}

export function setCrewTarget(crew, actorId, { tileKey, label }) {
  if (!canSetTarget(crew, actorId)) return crew;
  if (!tileKey) return crew;
  return {
    ...crew,
    target: { tileKey, label: (label || "").slice(0, CREW_TARGET_LABEL_MAX_LEN), setBy: actorId, setAt: Date.now() },
  };
}

export function clearCrewTarget(crew, actorId) {
  if (!canSetTarget(crew, actorId)) return crew;
  return { ...crew, target: null };
}

// ── Diplomacy ─────────────────────────────────────────────────────────────
// One-way and cosmetic — see the constants/crew.js note above `crew.diplomacy`
// for the full rules. `status` is "ally", "enemy", or null/"neutral" (clears
// the entry — neutral is never stored explicitly).
export function setDiplomacyStatus(crew, actorId, targetCrewId, status) {
  if (!canSetDiplomacy(crew, actorId)) return crew;
  if (!targetCrewId || targetCrewId === crew.id) return crew;
  const diplomacy = { ...(crew.diplomacy || {}) };
  if (CREW_DIPLOMACY_STATUSES.includes(status)) {
    diplomacy[targetCrewId] = status;
  } else {
    delete diplomacy[targetCrewId];
  }
  return { ...crew, diplomacy };
}

export function diplomacyStatusOf(crew, targetCrewId) {
  return crew?.diplomacy?.[targetCrewId] || "neutral";
}

// Every crew this crew has flagged ally/enemy, resolved against the full
// crews list, as { crew, status }[] — used by both the member-facing read
// -only Diplomacy view and (indirectly) tile-color resolution below.
export function flaggedDiplomacyCrews(crew, allCrews) {
  const diplomacy = crew?.diplomacy || {};
  return Object.keys(diplomacy)
    .map(id => ({ crew: (allCrews || []).find(c => c.id === id), status: diplomacy[id] }))
    .filter(entry => !!entry.crew);
}

// Resolves this crew's diplomacy map into player-id Sets for map/tile-color
// use (a crew's `members` array holds the playerIds — mostly AI ids for any
// crew that isn't the local player's own — that own that crew's tiles).
// Pure and framework-free on purpose so MapRenderer.jsx's ownerTint (also
// pure) can stay a plain function call, no React/Pixi dependency here.
export function diplomacyPlayerIdSets(crew, allCrews) {
  const allyIds = new Set();
  const enemyIds = new Set();
  for (const { crew: other, status } of flaggedDiplomacyCrews(crew, allCrews)) {
    const target = status === CREW_DIPLOMACY_STATUS.ALLY ? allyIds
      : status === CREW_DIPLOMACY_STATUS.ENEMY ? enemyIds : null;
    if (!target) continue;
    for (const pid of other.members || []) target.add(pid);
  }
  return { allyIds, enemyIds };
}

// ── War ─────────────────────────────────────────────────────────────────
// See the crew.war shape comment in constants/crew.js. Phase is always
// derived from the stored timestamps against `now`, never cached, so it's
// correct on every check without a ticker updating crew.war itself.
export function crewWarPhase(crew, now = Date.now()) {
  const war = crew?.war;
  if (!war) return "peace";
  if (now < war.startsAt) return "declared";
  if (now < war.endsAt) return "active";
  if (now < war.cooldownEndsAt) return "cooldown";
  return "peace";
}

export function isWarActive(crew, now = Date.now()) {
  return crewWarPhase(crew, now) === "active";
}

// Declares war for the whole crew (not targeted at a specific enemy — see
// constants/crew.js). No-op (returns crew unchanged) if the actor lacks
// permission or the crew isn't currently at peace (already declared/
// active/cooling down).
export function declareWar(crew, actorId, now = Date.now()) {
  if (!canDeclareWar(crew, actorId)) return crew;
  if (crewWarPhase(crew, now) !== "peace") return crew;
  const startsAt = now + WAR_DECLARE_TO_START_MS;
  const endsAt = startsAt + WAR_DURATION_MS;
  const cooldownEndsAt = endsAt + WAR_COOLDOWN_MS;
  return { ...crew, war: { declaredAt: now, startsAt, endsAt, cooldownEndsAt, declaredBy: actorId } };
}

// Only cancelable during the "declared" window (before war actually
// starts) — once active, it has to run its course. No-op otherwise.
export function cancelWar(crew, actorId, now = Date.now()) {
  if (!canCancelWar(crew, actorId)) return crew;
  if (crewWarPhase(crew, now) !== "declared") return crew;
  return { ...crew, war: null };
}

// ── Search visibility ────────────────────────────────────────────────────
// private crews never appear in Browse/search — only reachable by direct
// invite (a separate, UI-level flow; nothing here models the invite itself
// yet, same "no real other players" caveat as the rest of crew/chat/
// relations today).
export function isSearchable(crew) {
  return !!crew && crew.privacy !== CREW_PRIVACY.PRIVATE;
}

// Whether a join click should go straight through (open) or create a
// pending request (locked). Private crews reject a direct join attempt —
// they should never have been reachable to try in the first place.
export function joinModeFor(crew) {
  if (!crew) return null;
  if (crew.privacy === CREW_PRIVACY.OPEN) return "instant";
  if (crew.privacy === CREW_PRIVACY.LOCKED) return "request";
  return "invite_only";
}

// ── Level / cap sync ─────────────────────────────────────────────────────
// Awards XP and keeps crew.cap in lockstep with the resulting level (a
// level-up should never silently shrink `cap` below the current member
// count — it only ever grows).
export function addCrewXp(crew, gained) {
  const { level, xp } = applyCrewXp(crew.level, crew.xp, gained);
  const cap = Math.max(crew.cap || 0, crewMemberCapForLevel(level));
  return { ...crew, level, xp, cap };
}

export function fortressSlotsAvailable(crew) {
  return crewFortressSlotsForLevel(crew?.level || 1) - (crew?.fortresses?.length || 0);
}

// ── Contribution Points ──────────────────────────────────────────────────
// Awarded to an individual member (their crew-store balance), separate from
// crew.xp (the crew's own level progress). A Crew Help grants both — see
// CREW_HELP_CONTRIBUTION.
export function addContribution(crew, playerId, amount) {
  const contributions = { ...(crew.contributions || {}) };
  contributions[playerId] = (contributions[playerId] || 0) + amount;
  return { ...crew, contributions };
}

export function contributionOf(crew, playerId) {
  return crew?.contributions?.[playerId] || 0;
}

export function spendContribution(crew, playerId, amount) {
  const have = contributionOf(crew, playerId);
  if (have < amount) return null; // caller checks for null = can't afford
  return addContribution(crew, playerId, -amount);
}

export { CREW_HELP_CONTRIBUTION };
