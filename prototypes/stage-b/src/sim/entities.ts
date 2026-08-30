/**
 * Souls, what they carry, and the Lieutenant that wants them dead.
 *
 * The Verge holds more than one soul now (Stage C), so everything here is
 * per-player and nothing assumes there is only ever one of them.
 * Still one Lieutenant, per doc/world/PLAN.md §44's cut list: "one
 * Lieutenant. No Captain, no Warden, no Muster."
 */
import { TILE } from "./fixed.js";
import { Skills, newSkills } from "./skills.js";

export const NEED_MAX = 1000;
export const HEALTH_MAX = 100;

export interface Needs {
  satiety: number; // hunger — Farmer/Hunter/Fisher answer this (doc/world/PLAN.md §17)
  hydration: number; // thirst — Dowser/Brewer
  warmth: number; // cold — Tailor/Mason/Charcoaler, and a campfire
}

/**
 * The things one soul can hand another. Materials only, still — a tool is a
 * wear counter rather than a countable object, so handing one over is a
 * different problem and it is not this one yet.
 */
export type Tradeable =
  | "wood"
  | "stone"
  | "cordage"
  | "rawMeat"
  | "cookedMeat"
  | "hide"
  | "ore"
  | "charcoal"
  | "bar"
  | "fish"
  | "crowns";

export const TRADEABLES: readonly Tradeable[] = [
  "wood",
  "stone",
  "cordage",
  "rawMeat",
  "cookedMeat",
  "hide",
  "ore",
  "charcoal",
  "bar",
  "fish",
  "crowns",
];

/** What a soul has on it. All of it is lost on death — nothing carries forward (§6.1). */
export interface Pack {
  wood: number;
  /** Chipped off a rock outcrop. Never scarce; just loud to get (see Tile.Rock). */
  stone: number;
  /** Cut from hide with a knife. What a snare is actually made of. */
  cordage: number;
  rawMeat: number;
  cookedMeat: number;
  hide: number;
  /**
   * Dug from a vein, never scarce, loud — same deal as stone, one tier up.
   * Its only use is at a fire: paired with charcoal, it becomes a bar.
   */
  ore: number;
  /** Wood, smothered down at a fire. Burns hotter than the log ever did — the only thing hot enough to run ore. */
  charcoal: number;
  /** What ore becomes once smelted. The last material before the sword itself. */
  bar: number;
  /**
   * Caught on a line, eaten fresh — no fire, no rot, no sickness roll. The
   * one food that trades a fire's higher yield for needing nothing else at
   * all: a hungry soul with a line and a shoreline never fully starves.
   */
  fish: number;
  /**
   * Old crowns, minted under kings who no longer have kingdoms
   * (doc/world/PLAN.md §17A). Picked out of a ruin's rubble, not earned by
   * any trade — behaves less like money and more like a relic that happens
   * to be spendable, in a world with no mint left to make more.
   */
  crowns: number;
  /**
   * Tools are counters, not flags: a spear holds so many strikes and a
   * cloak so many cold ticks, then it is gone. Nothing you make is
   * permanent, which is what gives anyone a reason to make one for someone
   * else (§6.3 — permadeath and wear are the whole demand side).
   */
  spear: number; // strikes left. 3 damage instead of 1 while it lasts
  cloak: number; // cold ticks left. Halves what the cold takes
  knife: number; // uses left. More off a carcass, and the only way to cut cordage
  axe: number; // chops left. More wood off a tree, and quieter doing it
  snare: number; // how many you are carrying, unset
  /** Strikes left. Double the spear's bite, and outlasts it — the whole chain's payoff. */
  sword: number;
  /** Casts left. The one tool that asks for nothing but cordage and patience. */
  fishingLine: number;
}

export type DeathCause =
  | "starved"
  | "died of thirst"
  | "froze"
  | "gored by a boar"
  | "savaged by wolves"
  | "cut down by a Lieutenant"
  | "killed by another soul";

export interface Player {
  id: number; // index into SimState.players, stable for the run
  x: number; // fixed-point world units (TILE per tile)
  y: number;
  health: number;
  needs: Needs;
  pack: Pack;
  /** Earned by doing, never given, and lost with this character (§6.1). */
  skills: Skills;
  offer: Tradeable; // what this soul hands over when it gives
  kills: number;
  atFire: boolean; // derived each tick; the HUD and the crafting verbs want it
  /** Ticks until the Grey King's servants will look at a new soul at all. */
  graceUntil: number;
  alive: boolean;
  lineage: number; // which soul this is — the heir count
  /**
   * How the road speaks of you (doc/world/PLAN.md §2A — never "reputation
   * score" out loud). Starts at zero and only killing another soul moves it,
   * for now: each kill costs standing and marks you, the same "outlawry"
   * §25/§28 describe. Fall far enough and the Lieutenant stops hunting you
   * at all — not mercy, the opposite: past a point you read to him as
   * already his, per §29's "notorious player-killers... can be plundered
   * into actual rank." Nothing yet builds it back up (Commons standing,
   * §3's kindness-side, is unbuilt) and nothing carries it between lives —
   * this prototype has no account layer for a soul's road to follow it
   * across a death, so it resets with everything else in the pack (§6.1).
   */
  standing: number;
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
    pack: {
      wood: 0,
      stone: 0,
      cordage: 0,
      rawMeat: 0,
      cookedMeat: 0,
      hide: 0,
      ore: 0,
      charcoal: 0,
      bar: 0,
      fish: 0,
      crowns: 0,
      spear: 0,
      cloak: 0,
      knife: 0,
      axe: 0,
      snare: 0,
      sword: 0,
      fishingLine: 0,
    },
    skills: newSkills(),
    offer: "wood",
    kills: 0,
    atFire: false,
    graceUntil,
    alive: true,
    lineage,
    standing: 0,
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
