/**
 * Souls, what they carry, and the Lieutenant that wants them dead.
 *
 * The Verge holds more than one soul now (Stage C), so everything here is
 * per-player and nothing assumes there is only ever one of them.
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

/** The things one soul can hand another. Tools are not on the list yet. */
export type Tradeable = "wood" | "rawMeat" | "cookedMeat" | "hide";

export const TRADEABLES: readonly Tradeable[] = ["wood", "rawMeat", "cookedMeat", "hide"];

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
  id: number; // index into SimState.players, stable for the run
  x: number; // fixed-point world units (TILE per tile)
  y: number;
  health: number;
  needs: Needs;
  pack: Pack;
  offer: Tradeable; // what this soul hands over when it gives
  kills: number;
  atFire: boolean; // derived each tick; the HUD and the crafting verbs want it
  /** Ticks until the Grey King's servants will look at a new soul at all. */
  graceUntil: number;
  alive: boolean;
  lineage: number; // which soul this is — the heir count
}

/**
 * Souls wash up a couple of tiles apart, inside the clearing world.ts keeps
 * free. Callers that know where the danger is (see `addSoul` in tick.ts)
 * should pass somewhere better.
 */
export function newPlayer(lineage: number, id = 0, x = (3 + id * 2) * TILE, y = 3 * TILE, graceUntil = 0): Player {
  return {
    id,
    x,
    y,
    health: HEALTH_MAX,
    needs: { satiety: NEED_MAX, hydration: NEED_MAX, warmth: NEED_MAX },
    pack: { wood: 0, rawMeat: 0, cookedMeat: 0, hide: 0, spear: 0, cloak: 0 },
    offer: "wood",
    kills: 0,
    atFire: false,
    graceUntil,
    alive: true,
    lineage,
  };
}

export type LieutenantState = "patrol" | "hunt";

export interface Lieutenant {
  x: number;
  y: number;
  state: LieutenantState;
  target: number; // player id he is hunting, -1 when patrolling
  waypointX: number;
  waypointY: number;
  contactTicks: number; // consecutive ticks in a Mortal Wound with a soul
  /**
   * Ticks until he is interested again. He took what he came for; a
   * Lieutenant that stands over the body waiting for the next soul to
   * arrive is not frightening, it is a wall.
   */
  restUntil: number;
}

export function newLieutenant(x: number, y: number): Lieutenant {
  return { x, y, state: "patrol", target: -1, waypointX: x, waypointY: y, contactTicks: 0, restUntil: 0 };
}
