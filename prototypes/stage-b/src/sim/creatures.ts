/**
 * The Verge's living things — the Stage B cut list's "three creatures," plus
 * the wolf, added after that gate passed.
 *
 * The deer runs. The boar does not, once you have made it angry. The crows
 * live in the tick rather than in this file, because a flock has no
 * behaviour of its own beyond gathering over a noise. The wolf is the odd
 * one out: it is the only beast that comes looking for you rather than
 * waiting to be found, which makes it the first predator in the Verge that
 * plays by the Lieutenant's rule rather than its own — noise and the night
 * both widen what it can see, per §1's thesis, aimed at your dinner *and*
 * at you for once.
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
import { stepToward, stepAway, moveWithCollision, walkable, terrainSpeedPct } from "./move.js";
import { Skills, trapChance } from "./skills.js";

export type CreatureKind = "deer" | "hedge-boar" | "wolf" | "hare" | "river-goat";
export type CreatureState = "graze" | "flee" | "charge" | "hunt" | "dead";

/** Everything that runs from you rather than at you. */
export const PREY: ReadonlyArray<CreatureKind> = ["deer", "hare", "river-goat"];

export interface CreatureStats {
  health: number;
  meat: number;
  hide: number;
  runSpeed: number;
  grazeSpeed: number;
}

/**
 * The deer is slightly slower than a soul (300) so a chase is winnable but
 * not free. The hedge-boar is faster, which is the whole point of it: you
 * cannot outrun what you started, you can only outlast it. The wolf sits
 * between them — faster than you, but not by much, because what makes it
 * dangerous is that it comes looking rather than that it is unbeatable.
 *
 * The hare and the river-goat are the two ends of prey. A hare is faster
 * than anything in the Verge and spooks from most of the way across it, so
 * **it cannot be caught on foot at all** — it is there to make the snare
 * worth building, which is the whole reason trapping exists as a separate
 * way of eating. A river-goat is the opposite: slow, calm, hard to frighten,
 * and worth more than anything else you can take. It is the good hunt, and
 * the reason §44 calls it the first livestock most souls ever keep.
 */
export const STATS: Record<CreatureKind, CreatureStats> = {
  deer: { health: 6, meat: 2, hide: 1, runSpeed: 280, grazeSpeed: 90 },
  "hedge-boar": { health: 14, meat: 3, hide: 2, runSpeed: 330, grazeSpeed: 110 },
  wolf: { health: 10, meat: 2, hide: 2, runSpeed: 310, grazeSpeed: 100 },
  hare: { health: 2, meat: 1, hide: 0, runSpeed: 400, grazeSpeed: 70 },
  "river-goat": { health: 9, meat: 4, hide: 2, runSpeed: 200, grazeSpeed: 80 },
};

/** How far a deer spooks from at zero noise. Louder work scares them further off. */
export const DEER_FLEE_BASE = TILE * 3;
export const DEER_FLEE_NOISE_SCALE = TILE * 5;

/**
 * How much of the usual spooking distance each prey animal uses. A hare is
 * gone before you have seen it; a river-goat barely looks up, which is what
 * makes it approachable and therefore worth keeping.
 */
const FLEE_SCALE: Record<string, number> = {
  deer: 100,
  hare: 210,
  "river-goat": 55,
};

export const BOAR_ANGER_TICKS = 260; // ~26s of grudge, then it wanders off
export const BOAR_GIVE_UP_RADIUS = TILE * 9;
export const BOAR_GORE_DAMAGE = 8;
export const BOAR_GORE_COOLDOWN = 15; // ticks between gores — hits, not a grinder

/**
 * A wolf that has been struck holds the grudge far longer than a boar does —
 * a pack does not forget who bled it — but one that has not been struck has
 * no memory at all: it hunts only what it can currently smell (§ wolfPrey
 * below), and loses interest the instant that goes quiet or the sun comes
 * up. Provoking one is the expensive mistake; being noticed by one isn't.
 */
export const WOLF_ANGER_TICKS = 500;
export const WOLF_GIVE_UP_RADIUS = TILE * 10;
export const WOLF_DETECT_BASE = TILE * 4;
export const WOLF_DETECT_NOISE_SCALE = TILE * 6;
export const WOLF_BITE_DAMAGE = 5;
export const WOLF_BITE_COOLDOWN = 20;

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
  souls: ReadonlyArray<{ id: number; x: number; y: number; alive: boolean; skills?: Skills }>;
  noise: number;
  noiseMax: number;
  /** Wolves hunt on sight only after dark — see `wolfPrey`. */
  night: boolean;
}

export function newCreature(kind: CreatureKind, x: number, y: number): Creature {
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

/**
 * The original Verge (24x16) is the density baseline. §44's cut list is
 * explicit that there is no ecology or population model here — this is not
 * one either, it is the same fixed roster from before, scaled by area so a
 * bigger Verge doesn't just mean more empty ground. Whether one Lieutenant
 * is still a real threat over nine times the space is a separate, open
 * question (doc/world/CONTENT.md's gap list) — this only keeps the animals
 * themselves from thinning out.
 */
const DENSITY_BASELINE = 24 * 16;
const BASE_ROSTER: ReadonlyArray<readonly [CreatureKind, number]> = [
  ["deer", 3],
  ["hare", 3],
  ["river-goat", 2],
  ["hedge-boar", 2],
  ["wolf", 2],
];

export function spawnCreatures(
  world: World,
  rng: Rng,
  souls: ReadonlyArray<{ x: number; y: number }>,
): Creature[] {
  const scale = (WORLD_W * WORLD_H) / DENSITY_BASELINE;
  const roster: CreatureKind[] = [];
  for (const [kind, base] of BASE_ROSTER) {
    for (let i = 0; i < Math.round(base * scale); i++) roster.push(kind);
  }
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
    const giveUp = c.kind === "wolf" ? WOLF_GIVE_UP_RADIUS : BOAR_GIVE_UP_RADIUS;
    const farSq = giveUp * giveUp;
    if (!quarry || distSq(c.x, c.y, quarry.x, quarry.y) > farSq) c.angerTicks = 0;
    if (c.angerTicks === 0) c.angryAt = -1;
  }

  let target: { x: number; y: number } | null = null;
  let speed = stats.grazeSpeed;
  let state: CreatureState = "graze";

  if (c.kind === "hedge-boar" && c.angerTicks > 0 && quarry) {
    // A boar holds one grudge at a time, against whoever swung first.
    state = "charge";
    target = { x: quarry.x, y: quarry.y };
    speed = stats.runSpeed;
  } else if (c.kind === "wolf") {
    const prey = wolfPrey(c, ctx, quarry);
    if (prey) {
      // Whether this is an old grudge or just tonight's scent, it is what
      // the bite in tick.ts aims at until the next tick says otherwise.
      state = "hunt";
      c.angryAt = prey.id;
      target = { x: prey.x, y: prey.y };
      speed = stats.runSpeed;
    }
  } else if (PREY.includes(c.kind)) {
    const from = spooker(c, ctx);
    if (from) {
      state = "flee";
      target = stepAway(c.x, c.y, from.x, from.y, stats.runSpeed);
      speed = stats.runSpeed;
    }
  }

  if (!target) {
    // Grazing is slow and aimless. Reaching the waypoint picks a new one,
    // which is the entire extent of animal ambition in Stage B.
    state = "graze";
    if (distSq(c.x, c.y, c.wanderX, c.wanderY) < (TILE / 2) * (TILE / 2)) {
      const spot = findOpenTile(ctx.world, ctx.rng, [{ x: c.x, y: c.y }], 2);
      c.wanderX = spot.x;
      c.wanderY = spot.y;
    }
    target = { x: c.wanderX, y: c.wanderY };
    speed = stats.grazeSpeed;
  }
  c.state = state;

  // Same ground rule everything else obeys (§ terrainSpeedPct) — a fleeing
  // deer bogs down in a marsh exactly as its pursuer would.
  speed = Math.trunc((speed * terrainSpeedPct(ctx.world, c.x, c.y)) / 100);
  const next = stepToward(c.x, c.y, target.x, target.y, speed);
  const moved = moveWithCollision(ctx.world, c.x, c.y, next.x, next.y);
  c.x = clamp(moved.x, 0, (WORLD_W - 1) * TILE);
  c.y = clamp(moved.y, 0, (WORLD_H - 1) * TILE);
}

/**
 * Who this wolf is after right now, if anyone. A standing grudge (set by
 * `woundCreature`) always wins and does not care what time it is — a pack
 * does not forget who bled it. Failing that, a wolf hunts by scent: only
 * after dark, and only within a radius that widens with noise exactly the
 * way the Lieutenant's does (§1) — so the same camp that draws him draws
 * them, and going quiet loses both at once.
 */
function wolfPrey(
  c: Creature,
  ctx: CreatureCtx,
  quarry: { id: number; x: number; y: number } | null,
): { id: number; x: number; y: number } | null {
  if (c.angerTicks > 0 && quarry) return quarry;
  if (!ctx.night) return null;
  const near = nearestSoul(c, ctx);
  if (!near) return null;
  const radius = WOLF_DETECT_BASE + Math.trunc((WOLF_DETECT_NOISE_SCALE * ctx.noise) / ctx.noiseMax);
  return distSq(c.x, c.y, near.x, near.y) <= radius * radius ? near : null;
}

/**
 * The soul close enough to scare this animal, if any. The radius grows with
 * the world's noise — so a camp that gathers hard all day is a camp whose
 * meat has walked to the far side of the map. Same thesis as the
 * Lieutenant's detection radius (§1), pointed at your dinner instead of at
 * your life.
 *
 * Each animal scales that radius by its own nerve, which is most of what
 * separates them to hunt: a hare is over the hill before you are in range,
 * a river-goat lets you walk up to it.
 */
function spooker(c: Creature, ctx: CreatureCtx): { x: number; y: number } | null {
  const near = nearestSoul(c, ctx);
  if (!near) return null;
  const base = DEER_FLEE_BASE + Math.trunc((DEER_FLEE_NOISE_SCALE * ctx.noise) / ctx.noiseMax);
  const radius = Math.trunc((base * (FLEE_SCALE[c.kind] ?? 100)) / 100);
  return distSq(c.x, c.y, near.x, near.y) <= radius * radius ? near : null;
}

/** A snare that sprang this tick: where, and whose patience it was. */
export interface SnareCatch {
  idx: number;
  owner: number; // player id, or -1 if the world doesn't know (a client's copy)
}

/**
 * A set snare catches what walks onto it.
 *
 * This is the only way to eat that does not require you to be present, and
 * that is the point of it: a trapline is work you did *earlier*, quietly,
 * which is the exact opposite of every other way of getting food here. It
 * only takes the small prey — a snare does not hold a river-goat and it
 * certainly does not hold a boar — so it is the hare's counterpart rather
 * than a replacement for hunting.
 *
 * Whose trapping skill applies is read off the snare's owner, not whoever
 * happens to be standing nearest when it springs — the same soul who
 * quietly walked the line earlier is the one whose hours this rewards.
 *
 * Returns every snare that sprang this tick, so the caller can clear them,
 * credit whoever set them, and say so.
 */
export function checkSnares(creatures: Creature[], ctx: CreatureCtx): SnareCatch[] {
  const sprung: SnareCatch[] = [];
  if (!ctx.world.snares.size) return sprung;

  for (const c of creatures) {
    if (c.state === "dead" || c.kind !== "hare") continue;
    const tx = Math.floor(c.x / TILE);
    const ty = Math.floor(c.y / TILE);
    const idx = ctx.world.index(tx, ty);
    const owner = ctx.world.snares.get(idx);
    if (owner === undefined) continue;
    const soul = ctx.souls.find((s) => s.id === owner);
    const [num, den] = soul?.skills ? trapChance(soul.skills) : [33, 100];
    // Even standing on one it is a coin-flip most souls lose more often than
    // they win, so a trapline is a thing you come back to, not watch.
    if (!ctx.rng.chance(num, den)) continue;
    c.state = "dead";
    c.health = 0;
    c.diedAtTick = ctx.tick;
    sprung.push({ idx, owner });
  }
  return sprung;
}

/** Returns true if the strike killed it. */
export function woundCreature(c: Creature, damage: number, tick: number, byId: number): boolean {
  c.health -= damage;
  if (c.kind === "hedge-boar") {
    c.angerTicks = BOAR_ANGER_TICKS;
    c.angryAt = byId;
  } else if (c.kind === "wolf") {
    // Striking one and missing the kill buys a much longer memory than a
    // boar's — the whole reason a lone wolf is a warning and a hurt one is
    // a mistake.
    c.angerTicks = WOLF_ANGER_TICKS;
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
