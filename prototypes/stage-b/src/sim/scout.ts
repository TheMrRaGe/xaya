/**
 * The Reaver tier's first actual member (doc/world/CONTENT.md §2.4: "many,
 * pure code, patrol, harass, spread the Grey") — everything in Stage B so
 * far has been the Lieutenant alone, per §44's own cut ("one Lieutenant,
 * no Captain, no Warden, no Muster"). A Scout is not a second Lieutenant:
 * he does not fight, he does not hold ground, and killing him is not an
 * outlawry act — he is sent to look, not to take. Crossed narrowly, on
 * explicit direction, the same way every other line in this document was.
 *
 * The whole shape is one sentence: he comes to investigate, and either you
 * silence him or he reports. Pure code, like a villager — §27's
 * Intelligence Tiers reserve a live model for Captains and Wardens and give
 * even a Lieutenant only "light template"; a Scout is well below that.
 */
import { TILE, distSq } from "./fixed.js";
import { World } from "./world.js";
import { stepToward, stepAway, moveWithCollision, terrainSpeedPct } from "./move.js";

export type ScoutState = "approach" | "fleeing";

export const SCOUT_HEALTH = 10; // a couple of good hits, deliberately fragile
export const SCOUT_APPROACH_SPEED = 150; // cautious — slower than the Lieutenant's own patrol
export const SCOUT_FLEE_SPEED = 290; // just under a soul's own 300 — ranged is the reliable answer once he's running
export const SCOUT_SPOT_RADIUS = TILE * 4;
export const SCOUT_REPORT_TICKS = 50; // ~5s of survival after being spotted before he actually gets away

export interface Scout {
  x: number;
  y: number;
  health: number;
  alive: boolean;
  state: ScoutState;
  investigateX: number;
  investigateY: number;
  /** The soul he's fleeing from, once spotted (a player id, stable for the run) — -1 while still approaching. */
  spottedId: number;
  /** Tick his flight actually succeeds and he reports — set the moment he's spotted, checked every tick after. */
  reportAtTick: number;
}

/** No id of its own — a Scout is found by searching state.scouts directly (nearestScout in tick.ts), the same shape every Creature already uses, not the stable-id shape NPCs need for dialogue and identity across a respawn. */
export function newScout(x: number, y: number, investigateX: number, investigateY: number): Scout {
  return {
    x,
    y,
    health: SCOUT_HEALTH,
    alive: true,
    state: "approach",
    investigateX,
    investigateY,
    spottedId: -1,
    reportAtTick: 0,
  };
}

/**
 * One tick of one Scout: walk toward whatever he was sent to look at; the
 * moment a living, not-graced soul is close enough, flee from that soul
 * instead, and the clock on his report starts. Reaching investigateX/Y
 * with nobody found simply means he lingers there — the caller decides
 * when a Scout that never found anyone is cleared, same as any other
 * timed-out incident.
 */
export function stepScout(
  scout: Scout,
  world: World,
  souls: ReadonlyArray<{ id: number; x: number; y: number; alive: boolean; graceUntil: number }>,
  tick: number,
): void {
  if (!scout.alive) return;

  if (scout.state === "approach") {
    let nearest: { id: number; x: number; y: number } | null = null;
    let nearestSq = SCOUT_SPOT_RADIUS * SCOUT_SPOT_RADIUS;
    for (const s of souls) {
      if (!s.alive || s.graceUntil > tick) continue;
      const d = distSq(scout.x, scout.y, s.x, s.y);
      if (d <= nearestSq) {
        nearestSq = d;
        nearest = s;
      }
    }
    if (nearest) {
      scout.state = "fleeing";
      scout.spottedId = nearest.id;
      scout.reportAtTick = tick + SCOUT_REPORT_TICKS;
    }
  }

  const speed = Math.trunc(
    ((scout.state === "fleeing" ? SCOUT_FLEE_SPEED : SCOUT_APPROACH_SPEED) * terrainSpeedPct(world, scout.x, scout.y)) / 100,
  );

  let next: { x: number; y: number };
  if (scout.state === "fleeing") {
    const away = souls.find((s) => s.id === scout.spottedId);
    next = away ? stepAway(scout.x, scout.y, away.x, away.y, speed) : { x: scout.x, y: scout.y };
  } else {
    next = stepToward(scout.x, scout.y, scout.investigateX, scout.investigateY, speed);
  }
  const moved = moveWithCollision(world, scout.x, scout.y, next.x, next.y);
  scout.x = moved.x;
  scout.y = moved.y;
}

/**
 * Returns true if the strike killed him. No corpse to butcher and no rot
 * timer: a dead Scout is simply removed from state.scouts the same tick
 * (tick.ts), since nothing else in the Verge has a reason to interact with
 * one further.
 */
export function woundScout(scout: Scout, damage: number): boolean {
  scout.health -= damage;
  if (scout.health <= 0) {
    scout.health = 0;
    scout.alive = false;
    return true;
  }
  return false;
}
