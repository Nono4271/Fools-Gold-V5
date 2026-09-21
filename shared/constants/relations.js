// Relations ("contacts") constants — friend requests and the blacklist.
// Local sandbox today (see shared/utils/relationsRules.js), same design intent
// as shared/constants/chat.js: pure rules a real server can adopt unchanged.

// Status of an "other player" from the local viewer's point of view.
export const RELATION_STATUS = {
  none: "none",             // no relation on file
  pendingOut: "pendingOut", // viewer sent a request, awaiting the other side
  pendingIn: "pendingIn",   // the other side sent a request, awaiting the viewer
  friend: "friend",
  blocked: "blocked",
};

export const MAX_RELATION_NAME_LEN = 40;
