// src/GameContext.js
// Central context for game-wide derived values that many components need.
// Add values here instead of prop-drilling through multiple layers.

import { createContext, useContext } from "react";

export const GameContext = createContext({
  staminaMax: 150, // base — increases with Easily Winded node
});

export function useGameContext() {
  return useContext(GameContext);
}
