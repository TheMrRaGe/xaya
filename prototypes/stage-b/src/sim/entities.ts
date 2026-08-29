/**
 * Player and Lieutenant state — the only two entities Stage B needs
 * (§44 cut list: "one Lieutenant. No Captain, no Warden, no Muster").
 */
import { TILE } from "./fixed.js";

export const NEED_MAX = 1000;
export const HEALTH_MAX = 100;

export interface Needs {
  satiety: number; // hunger — Farmer/Hunter/Fisher answer this (§17)
  hydration: number; // thirst — Dowser/Brewer
  warmth: number; // cold — Tailor/Mason/Charcoaler, and a campfire
}

export type DeathCause = "starved" | "died of thirst" | "froze" | "cut down by a Lieutenant";

export interface Player {
  x: number; // fixed-point world units (TILE per tile)
  y: number;
  health: number;
  needs: Needs;
  wood: number;
  alive: boolean;
  lineage: number; // which soul this is — the heir count
}

export function newPlayer(lineage: number): Player {
  return {
    x: 3 * TILE,
    y: 3 * TILE,
    health: HEALTH_MAX,
    needs: { satiety: NEED_MAX, hydration: NEED_MAX, warmth: NEED_MAX },
    wood: 0,
    alive: true,
    lineage,
  };
}

export type LieutenantState = "patrol" | "hunt";

export interface Lieutenant {
  x: number;
  y: number;
  state: LieutenantState;
  waypointX: number;
  waypointY: number;
  contactTicks: number; // consecutive ticks in a Mortal Wound with the player
}

export function newLieutenant(x: number, y: number): Lieutenant {
  return { x, y, state: "patrol", waypointX: x, waypointY: y, contactTicks: 0 };
}
