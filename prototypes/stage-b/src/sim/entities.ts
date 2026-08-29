/**
 * Player and Lieutenant state — plus what the player is carrying, now that
 * there is a short chain of things to carry (§44's "a few professions worth
 * of actions": gather it, kill it, cook it, wear it).
 *
 * Still one Lieutenant, per the cut list: no Captain, no Warden, no Muster.
 */
import { TILE } from "./fixed.js";

export const NEED_MAX = 1000;
export const HEALTH_MAX = 100;

export interface Needs {
  satiety: number; // hunger — Farmer/Hunter/Fisher answer this (§17)
  hydration: number; // thirst — Dowser/Brewer
  warmth: number; // cold — Tailor/Mason/Charcoaler, and a campfire
}

/** What a soul has on it. All of it is lost on death — nothing carries forward (§6.1). */
export interface Pack {
  wood: number;
  rawMeat: number;
  cookedMeat: number;
  hide: number;
  /**
   * Tools are counters, not flags: a spear holds so many strikes and a
   * cloak so many cold ticks, then it is gone. Nothing you make is
   * permanent, which is what gives anyone a reason to make one for someone
   * else (§6.3 — permadeath and wear are the whole demand side).
   */
  spear: number; // strikes left. 3 damage instead of 1 while it lasts
  cloak: number; // cold ticks left. Halves what the cold takes
}

export type DeathCause =
  | "starved"
  | "died of thirst"
  | "froze"
  | "gored by a boar"
  | "cut down by a Lieutenant";

export interface Player {
  x: number; // fixed-point world units (TILE per tile)
  y: number;
  health: number;
  needs: Needs;
  pack: Pack;
  kills: number;
  alive: boolean;
  lineage: number; // which soul this is — the heir count
}

export function newPlayer(lineage: number): Player {
  return {
    x: 3 * TILE,
    y: 3 * TILE,
    health: HEALTH_MAX,
    needs: { satiety: NEED_MAX, hydration: NEED_MAX, warmth: NEED_MAX },
    pack: { wood: 0, rawMeat: 0, cookedMeat: 0, hide: 0, spear: 0, cloak: 0 },
    kills: 0,
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
