/**
 * The Verge's living things — the Stage B cut list's "three creatures."
 *
 * Two of them are here: the deer, which runs, and the boar, which does not.
 * The third is the crows, which live in the tick rather than in this file,
 * because a flock has no behaviour of its own beyond gathering over a noise.
 *
 * There is deliberately no ecology math (§44 puts population dynamics out of
 * scope): a fixed roster spawns with the world, and anything that dies is
 * replaced a while later somewhere no soul is standing. That is enough to
 * make the Verge feel inhabited without pretending to simulate a
 * population — which is the kind of thing that is fun to write and then
 * turns out to be the reason a tick costs 40ms.
 */
import { TILE, clamp, distSq } from "./fixed.js";
import { Rng } from "./rng.js";
import { World, WORLD_W, WORLD_H } from "./world.js";
import { stepToward, stepAway, moveWithCollision, walkable } from "./move.js";

export type CreatureKind = "deer" | "boar";
export type CreatureState = "graze" | "flee" | "charge" | "dead";

export interface CreatureStats {
  health: number;
  meat: number;
  hide: number;
  runSpeed: number;
  grazeSpeed: number;
}

/**
 * The deer is slightly slower than a soul (300) so a chase is winnable but
 * not free. The boar is faster, which is the whole point of the boar: you
 * cannot outrun what you started, you can only outlast it.
 */
export const STATS: Record<CreatureKind, CreatureStats> = {
  deer: { health: 6, meat: 2, hide: 1, runSpeed: 280, grazeSpeed: 90 },
  boar: { health: 14, meat: 3, hide: 2, runSpeed: 330, grazeSpeed: 110 },
};

/** How far a deer spooks from at zero noise. Louder work scares them further off. */
export const DEER_FLEE_BASE = TILE * 3;
export const DEER_FLEE_NOISE_SCALE = TILE * 5;

export const BOAR_ANGER_TICKS = 260; // ~26s of grudge, then it wanders off
export const BOAR_GIVE_UP_RADIUS = TILE * 9;
export const BOAR_GORE_DAMAGE = 8;
export const BOAR_GORE_COOLDOWN = 15; // ticks between gores — hits, not a grinder

export const CARCASS_ROT_TICKS = 900; // ~90s to butcher it before it is wasted
export const CREATURE_RESPAWN_TICKS = 1200; // ~2min before the Verge replaces one

export interface Creature {
  kind: CreatureKind;
  x: number;
  y: number;
  health: number;
  state: CreatureState;
  wanderX: number;
  wanderY: number;
  angerTicks: number;
  angryAt: number; // player id the boar holds responsible, -1 for nobody
  goreCooldown: number;
  butchered: boolean;
  diedAtTick: number;
  respawnAtTick: number; // 0 when alive
}

/** Everything a beast is allowed to know about the world this tick. */
export interface CreatureCtx {
  world: World;
  rng: Rng;
  tick: number;
  souls: ReadonlyArray<{ id: number; x: number; y: number; alive: boolean }>;
  noise: number;
  noiseMax: number;
}

function newCreature(kind: CreatureKind, x: number, y: number): Creature {
  return {
    kind,
    x,
    y,
    health: STATS[kind].health,
    state: "graze",
    wanderX: x,
    wanderY: y,
    angerTicks: 0,
    angryAt: -1,
    goreCooldown: 0,
    butchered: false,
    diedAtTick: 0,
    respawnAtTick: 0,
  };
}

/** A walkable tile at least `minTiles` from every point in `away`. */
function findOpenTile(
  world: World,
  rng: Rng,
  away: ReadonlyArray<{ x: number; y: number }>,
  minTiles: number,
): { x: number; y: number } {
  const minSq = minTiles * TILE * (minTiles * TILE);
  for (let attempt = 0; attempt < 64; attempt++) {
    const x = rng.nextInt(WORLD_W) * TILE;
    const y = rng.nextInt(WORLD_H) * TILE;
    if (!walkable(world, x, y)) continue;
    if (away.some((p) => distSq(x, y, p.x, p.y) < minSq)) continue;
    return { x, y };
  }
  // The Verge is small and mostly grass; falling through 64 rolls means a
  // very unlucky map, not a bug. Put it in the corner and move on.
  return { x: (WORLD_W - 2) * TILE, y: (WORLD_H - 2) * TILE };
}

export function spawnCreatures(
  world: World,
  rng: Rng,
  souls: ReadonlyArray<{ x: number; y: number }>,
): Creature[] {
  const roster: CreatureKind[] = ["deer", "deer", "deer", "deer", "boar", "boar"];
  return roster.map((kind) => {
    const spot = findOpenTile(world, rng, souls, 6);
    return newCreature(kind, spot.x, spot.y);
  });
}

export function isCarcass(c: Creature): boolean {
  return c.state === "dead" && !c.butchered && c.respawnAtTick === 0;
}

function nearestSoul(c: Creature, ctx: CreatureCtx): { id: number; x: number; y: number } | null {
  let best: { id: number; x: number; y: number } | null = null;
  let bestSq = Number.MAX_SAFE_INTEGER;
  for (const s of ctx.souls) {
    if (!s.alive) continue;
    const d = distSq(c.x, c.y, s.x, s.y);
    if (d < bestSq) {
      bestSq = d;
      best = s;
    }
  }
  return best;
}

function soulById(id: number, ctx: CreatureCtx): { id: number; x: number; y: number } | null {
  for (const s of ctx.souls) if (s.id === id && s.alive) return s;
  return null;
}

export function stepCreature(c: Creature, ctx: CreatureCtx): void {
  if (c.state === "dead") {
    // A carcass nobody butchers rots, and then the Verge quietly replaces it.
    if (c.respawnAtTick === 0 && ctx.tick - c.diedAtTick >= CARCASS_ROT_TICKS) {
      c.respawnAtTick = ctx.tick + CREATURE_RESPAWN_TICKS;
    }
    if (c.respawnAtTick !== 0 && ctx.tick >= c.respawnAtTick) {
      const spot = findOpenTile(ctx.world, ctx.rng, ctx.souls, 8);
      const kind = c.kind;
      Object.assign(c, newCreature(kind, spot.x, spot.y));
    }
    return;
  }

  const stats = STATS[c.kind];
  if (c.goreCooldown > 0) c.goreCooldown--;

  const quarry = c.angryAt >= 0 ? soulById(c.angryAt, ctx) : null;
  if (c.angerTicks > 0) {
    c.angerTicks--;
    const farSq = BOAR_GIVE_UP_RADIUS * BOAR_GIVE_UP_RADIUS;
    if (!quarry || distSq(c.x, c.y, quarry.x, quarry.y) > farSq) c.angerTicks = 0;
    if (c.angerTicks === 0) c.angryAt = -1;
  }

  let target: { x: number; y: number };
  let speed: number;

  const from = c.kind === "deer" ? spooker(c, ctx) : null;
  if (c.kind === "boar" && c.angerTicks > 0 && quarry) {
    // A boar holds one grudge at a time, against whoever swung first.
    c.state = "charge";
    target = { x: quarry.x, y: quarry.y };
    speed = stats.runSpeed;
  } else if (from) {
    c.state = "flee";
    target = stepAway(c.x, c.y, from.x, from.y, stats.runSpeed);
    speed = stats.runSpeed;
  } else {
    c.state = "graze";
    // Grazing is slow and aimless. Reaching the waypoint picks a new one,
    // which is the entire extent of animal ambition in Stage B.
    if (distSq(c.x, c.y, c.wanderX, c.wanderY) < (TILE / 2) * (TILE / 2)) {
      const spot = findOpenTile(ctx.world, ctx.rng, [{ x: c.x, y: c.y }], 2);
      c.wanderX = spot.x;
      c.wanderY = spot.y;
    }
    target = { x: c.wanderX, y: c.wanderY };
    speed = stats.grazeSpeed;
  }

  const next = stepToward(c.x, c.y, target.x, target.y, speed);
  const moved = moveWithCollision(ctx.world, c.x, c.y, next.x, next.y);
  c.x = clamp(moved.x, 0, (WORLD_W - 1) * TILE);
  c.y = clamp(moved.y, 0, (WORLD_H - 1) * TILE);
}

/**
 * The soul close enough to scare this deer, if any. The radius grows with
 * the world's noise — so a camp that gathers hard all day is a camp whose
 * meat has walked to the far side of the map. Same thesis as the
 * Lieutenant's detection radius (§1), pointed at your dinner instead of at
 * your life.
 */
function spooker(c: Creature, ctx: CreatureCtx): { x: number; y: number } | null {
  const near = nearestSoul(c, ctx);
  if (!near) return null;
  const radius = DEER_FLEE_BASE + Math.trunc((DEER_FLEE_NOISE_SCALE * ctx.noise) / ctx.noiseMax);
  return distSq(c.x, c.y, near.x, near.y) <= radius * radius ? near : null;
}

/** Returns true if the strike killed it. */
export function woundCreature(c: Creature, damage: number, tick: number, byId: number): boolean {
  c.health -= damage;
  if (c.kind === "boar") {
    c.angerTicks = BOAR_ANGER_TICKS;
    c.angryAt = byId;
  }
  if (c.health <= 0) {
    c.state = "dead";
    c.health = 0;
    c.diedAtTick = tick;
    return true;
  }
  return false;
}
