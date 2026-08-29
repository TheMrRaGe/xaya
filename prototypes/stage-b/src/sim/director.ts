/**
 * The Storyteller — what the Overlord is allowed to do, and when.
 *
 * Lifted in shape from RimWorld's storytellers, which are the best working
 * example of this idea. A storyteller there does not narrate: it *picks
 * incidents*, paced by how rich the colony has become, damped after a death
 * so it does not kick someone who is down, with the expensive incidents
 * locked behind a points threshold. Wealth is the dominant input — roughly
 * one threat point per 160 wealth, so a colony that doubles what it owns
 * faces nearly twice the pressure.
 *
 * That maps onto §1's thesis exactly, at a longer timescale. Noise is the
 * minute-to-minute version of "what you build makes you easier to see";
 * this is the season-long one. Everything a soul gathers, crafts, learns
 * and lights raises the pressure on every soul in the Verge.
 *
 * The split matters more than the numbers. This file decides *what may
 * happen* and computes *how much may happen*; something outside chooses
 * from the menu, and the sim applies the choice deterministically. That is
 * DESIGN §3.2's pipeline in miniature — an action proposed from outside is
 * checked against the legal action space before it touches anything, and
 * an illegal one is refused no matter who proposed it.
 */
import { TILE, clamp } from "./fixed.js";
import { Rng } from "./rng.js";
import { World, WORLD_W, WORLD_H } from "./world.js";
import { Player } from "./entities.js";
import { SKILLS, level } from "./skills.js";
import { newCreature, WOLF_ANGER_TICKS } from "./creatures.js";
import { walkable } from "./move.js";

/** Everything the Overlord may do. Nothing outside this list is possible. */
export type OverlordAction =
  | { kind: "nothing" }
  | { kind: "send_lieutenant"; x: number; y: number }
  | { kind: "false_crows"; x: number; y: number }
  | { kind: "cold_snap"; ticks: number }
  | { kind: "blight"; ticks: number }
  | { kind: "loose_a_boar"; x: number; y: number }
  | { kind: "loose_the_wolves"; x: number; y: number }
  | { kind: "mark"; soul: number };

export type ActionKind = OverlordAction["kind"];

/** A legal action, priced and explained, ready to be chosen from. */
export interface Offer {
  id: number;
  action: OverlordAction;
  /** What it does, in words a chooser can weigh. */
  what: string;
  /** Relative likelihood when nobody is choosing deliberately. */
  weight: number;
}

/**
 * How much the Verge owes. Wealth times souls times how long they have had
 * to settle in, less what recent grief buys them.
 */
export function pressure(state: DirectorState): number {
  let wealth = 0;
  let souls = 0;
  for (const player of state.players) {
    if (!player.alive) continue;
    souls++;
    const pack = player.pack;
    wealth += pack.wood + pack.rawMeat * 2 + pack.cookedMeat * 3 + pack.hide * 3;
    if (pack.spear > 0) wealth += 15;
    if (pack.cloak > 0) wealth += 20;
    for (const skill of SKILLS) wealth += level(player.skills[skill]) * 8;
  }
  // A fire is the loudest thing you own, so it is also the most expensive.
  wealth += state.world.fires.size * 25;

  if (souls === 0) return 0;

  // Newcomers get a grace period that closes over the first few days —
  // RimWorld's days-passed factor, which is 0.7 early and 1 by day 40.
  const days = Math.trunc(state.tick / 6000);
  const settled = Math.min(100, 65 + days * 7);

  const raw = Math.trunc((wealth * (100 + (souls - 1) * 60) * settled) / 10_000);
  return Math.max(0, raw - state.grief);
}

/** Pressure below which nothing at all is worth doing. */
export const IDLE_PRESSURE = 20;

/** What a death buys the survivors, and how fast that runs out. */
export const GRIEF_PER_DEATH = 90;
export const GRIEF_DECAY_EVERY = 30; // ticks per -1

/** The state this file needs. `SimState` satisfies it; nothing else has to. */
export interface DirectorState {
  tick: number;
  world: World;
  players: Player[];
  creatures: { kind: string }[];
  lieutenant: { waypointX: number; waypointY: number; state: string; target: number };
  noise: number;
  noiseX: number;
  noiseY: number;
  grief: number;
  coldUntil: number;
  blightUntil: number;
  marked: number;
  rng: Rng;
}

function livingSouls(state: DirectorState): Player[] {
  return state.players.filter((p) => p.alive);
}

/** A walkable tile near a point, for dropping something unpleasant. */
function openNear(state: DirectorState, x: number, y: number, tiles: number): { x: number; y: number } {
  for (let attempt = 0; attempt < 32; attempt++) {
    const tx = clamp(Math.trunc(x / TILE) + state.rng.nextInt(tiles * 2 + 1) - tiles, 0, WORLD_W - 1);
    const ty = clamp(Math.trunc(y / TILE) + state.rng.nextInt(tiles * 2 + 1) - tiles, 0, WORLD_H - 1);
    if (walkable(state.world, tx * TILE, ty * TILE)) return { x: tx * TILE, y: ty * TILE };
  }
  return { x, y };
}

/**
 * Everything the Overlord could legally do right now, with the expensive
 * options withheld until the Verge has earned them. Always includes doing
 * nothing, which is what a good storyteller does most of the time.
 */
export function offers(state: DirectorState, points: number): Offer[] {
  const list: Offer[] = [{ id: 0, action: { kind: "nothing" }, what: "Do nothing. Let them work.", weight: 100 }];
  const souls = livingSouls(state);
  if (souls.length === 0) return list;

  const richest = souls.reduce((a, b) => (b.pack.wood + b.kills > a.pack.wood + a.kills ? b : a));
  const push = (action: OverlordAction, what: string, weight: number, gate = 0) => {
    if (points >= gate) list.push({ id: list.length, action, what, weight });
  };

  // Cheap, and pure theatre: birds over a place where nothing happened.
  const feint = openNear(state, state.rng.nextInt(WORLD_W) * TILE, state.rng.nextInt(WORLD_H) * TILE, 3);
  push(
    { kind: "false_crows", x: feint.x, y: feint.y },
    `Gather crows over an empty part of the Verge (${Math.trunc(feint.x / TILE)}, ${Math.trunc(feint.y / TILE)}). Nothing happened there. They will go and look.`,
    45,
    30,
  );

  // Send him somewhere. Not at anyone — just somewhere they have to account for.
  const walk = openNear(state, richest.x, richest.y, 5);
  push(
    { kind: "send_lieutenant", x: walk.x, y: walk.y },
    `Walk your Lieutenant toward (${Math.trunc(walk.x / TILE)}, ${Math.trunc(walk.y / TILE)}), near where they have been working.`,
    70,
    60,
  );

  push(
    { kind: "cold_snap", ticks: 900 },
    "Bring a cold snap for a minute and a half. The cold takes twice as much, and fires stop being optional.",
    50,
    120,
  );

  push(
    { kind: "blight", ticks: 1200 },
    "Blight the Verge for two minutes. Nothing regrows — no berries, no new trees.",
    40,
    180,
  );

  const boarSpot = openNear(state, richest.x, richest.y, 4);
  push(
    { kind: "loose_a_boar", x: boarSpot.x, y: boarSpot.y },
    `Loose a boar near Soul #${richest.lineage}, already angry.`,
    55,
    250,
  );

  // Pricier than one boar, and meaner: two beasts that hold the same
  // grudge, rather than one that holds it twice as long.
  const wolfSpot = openNear(state, richest.x, richest.y, 4);
  push(
    { kind: "loose_the_wolves", x: wolfSpot.x, y: wolfSpot.y },
    `Loose a pair of wolves near Soul #${richest.lineage}. They hunt as one animal.`,
    40,
    300,
  );

  push(
    { kind: "mark", soul: richest.id },
    `Mark Soul #${richest.lineage}. Your Lieutenant will want no one else until they are dead.`,
    35,
    400,
  );

  return list;
}

/** The Understudy: weighted choice, no model, no network, always available. */
export function chooseByWeight(list: Offer[], rng: Rng): Offer {
  const total = list.reduce((sum, offer) => sum + offer.weight, 0);
  let roll = rng.nextInt(Math.max(1, total));
  for (const offer of list) {
    roll -= offer.weight;
    if (roll < 0) return offer;
  }
  return list[0]!;
}

/**
 * Apply a chosen action. Integers only, like everything else in the sim —
 * an incident has to replay identically or none of the rest was worth it.
 */
export function applyAction(state: DirectorState, action: OverlordAction): void {
  switch (action.kind) {
    case "nothing":
      return;

    case "send_lieutenant":
      state.lieutenant.waypointX = action.x;
      state.lieutenant.waypointY = action.y;
      return;

    case "false_crows":
      // The crows do not know the difference, and neither will they.
      state.noiseX = action.x;
      state.noiseY = action.y;
      state.noise = Math.max(state.noise, 400);
      return;

    case "cold_snap":
      state.coldUntil = state.tick + action.ticks;
      return;

    case "blight":
      state.blightUntil = state.tick + action.ticks;
      return;

    case "loose_a_boar": {
      const boar = newCreature("boar", action.x, action.y);
      const nearest = livingSouls(state).reduce<Player | null>((best, p) => {
        if (!best) return p;
        const db = (best.x - action.x) ** 2 + (best.y - action.y) ** 2;
        const dp = (p.x - action.x) ** 2 + (p.y - action.y) ** 2;
        return dp < db ? p : best;
      }, null);
      if (nearest) {
        boar.angerTicks = 400;
        boar.angryAt = nearest.id;
      }
      state.creatures.push(boar as never);
      return;
    }

    case "loose_the_wolves": {
      const nearest = livingSouls(state).reduce<Player | null>((best, p) => {
        if (!best) return p;
        const db = (best.x - action.x) ** 2 + (best.y - action.y) ** 2;
        const dp = (p.x - action.x) ** 2 + (p.y - action.y) ** 2;
        return dp < db ? p : best;
      }, null);
      // Two wolves, not one twice — a pack arrives together and holds the
      // same grudge, which is the whole point of it costing more than a boar.
      for (let i = 0; i < 2; i++) {
        const spot = openNear(state, action.x, action.y, 1);
        const wolf = newCreature("wolf", spot.x, spot.y);
        if (nearest) {
          wolf.angerTicks = WOLF_ANGER_TICKS;
          wolf.angryAt = nearest.id;
        }
        state.creatures.push(wolf as never);
      }
      return;
    }

    case "mark":
      state.marked = action.soul;
      return;
  }
}

/** Whether the Verge is under a cold snap right now. */
export function isColdSnap(state: DirectorState): boolean {
  return state.tick < state.coldUntil;
}

/** Whether nothing is regrowing right now. */
export function isBlighted(state: DirectorState): boolean {
  return state.tick < state.blightUntil;
}
