/**
 * The core sim tick — pure of rendering, pure of the DOM, runs at a fixed
 * 10 Hz per §21 ("world/survival sim at 10 Hz"). Everything in here is
 * integers; nothing in here reads a clock, iterates a Map/object in
 * insertion-order-dependent ways for anything that matters, or calls
 * Math.random. See src/sim/fixed.ts and src/sim/rng.ts for why.
 */
import { TILE, clamp, distSq } from "./fixed.js";
import { Rng } from "./rng.js";
import { World, Tile, isSolid } from "./world.js";
import { Player, Lieutenant, Needs, NEED_MAX, HEALTH_MAX, DeathCause, newLieutenant } from "./entities.js";

export const TICK_HZ = 10;

const PLAYER_SPEED = 300; // fixed-point units/tick — 3 tiles/sec
const LIEUTENANT_SPEED = 260; // slightly slower than the player: fleeing must work (§21)

const HYDRATION_DRAIN_EVERY = 1; // ticks per -1 hydration
const SATIETY_DRAIN_EVERY = 2;
const WARMTH_DRAIN_EVERY = 3;
const WARMTH_REGEN_NEAR_FIRE = 2; // per tick, while within FIRE_RADIUS

const STARVE_DAMAGE_PER_TICK = 1; // per depleted need, per tick
const LIEUTENANT_DAMAGE_PER_TICK = 4;

const CONTACT_RADIUS = TILE * 0.6;
const FIRE_RADIUS = TILE * 2;
const BASE_DETECTION_RADIUS = TILE * 4;
const NIGHT_DETECTION_BONUS = TILE * 2;
const NOISE_DETECTION_SCALE = TILE * 3; // at max noise, this much extra radius
const LOSE_INTEREST_RADIUS = TILE * 9; // hysteresis so fleeing actually works

const NOISE_MAX = 1000;
const NOISE_PER_GATHER = 120;
const NOISE_PER_CRAFT = 250;
const NOISE_DECAY_EVERY = 4; // ticks per -1 noise

const REGROW_TICKS = 900; // ~90s

const DAY_TICKS = 3000;
const NIGHT_TICKS = 3000;

export interface Input {
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
  gather: boolean; // pressed this tick
  craft: boolean;
}

export interface DeathEvent {
  cause: DeathCause;
  tick: number;
  wood: number;
}

export interface SimState {
  tick: number;
  world: World;
  player: Player;
  lieutenant: Lieutenant;
  noise: number;
  rng: Rng;
  lastDamageSource: DeathCause;
  log: string[];
  flags: {
    firstGather: boolean;
    firstSighting: boolean;
    firstDeath: boolean;
  };
}

export function newSim(seed: number, lineage: number, player: Player): SimState {
  const rng = new Rng(seed);
  const world = new World(seed);
  const lieutenant = newLieutenant(18 * TILE, 12 * TILE);
  return {
    tick: 0,
    world,
    player,
    lieutenant,
    noise: 0,
    rng,
    lastDamageSource: "starved",
    log: [],
    flags: { firstGather: false, firstSighting: false, firstDeath: false },
  };
}

export function isNight(tick: number): boolean {
  return tick % (DAY_TICKS + NIGHT_TICKS) >= DAY_TICKS;
}

function tileOfUnits(u: number): number {
  return Math.floor(u / TILE);
}

function say(state: SimState, line: string): void {
  state.log.push(line);
  if (state.log.length > 40) state.log.shift();
}

/** Advance the world by exactly one tick. Returns a DeathEvent if the player died this tick. */
export function stepTick(state: SimState, input: Input): DeathEvent | null {
  const { player, world, lieutenant } = state;
  state.tick++;

  if (!player.alive) return null;

  // --- movement ---
  if (input.dx !== 0 || input.dy !== 0) {
    const nx = player.x + input.dx * PLAYER_SPEED;
    const ny = player.y + input.dy * PLAYER_SPEED;
    const tx = tileOfUnits(nx);
    const ty = tileOfUnits(ny);
    if (world.inBounds(tx, ty) && !isSolid(world.get(tx, ty))) {
      player.x = nx;
      player.y = ny;
    }
  }

  // --- needs drain ---
  if (state.tick % HYDRATION_DRAIN_EVERY === 0) player.needs.hydration = clamp(player.needs.hydration - 1, 0, NEED_MAX);
  if (state.tick % SATIETY_DRAIN_EVERY === 0) player.needs.satiety = clamp(player.needs.satiety - 1, 0, NEED_MAX);

  const px = tileOfUnits(player.x);
  const py = tileOfUnits(player.y);
  const nearFire = world.get(px, py) === Tile.Campfire || distSq(player.x, player.y, px * TILE, py * TILE) < FIRE_RADIUS * FIRE_RADIUS;
  if (nearFire) {
    player.needs.warmth = clamp(player.needs.warmth + WARMTH_REGEN_NEAR_FIRE, 0, NEED_MAX);
  } else if (state.tick % WARMTH_DRAIN_EVERY === 0) {
    player.needs.warmth = clamp(player.needs.warmth - 1, 0, NEED_MAX);
  }

  // --- starvation damage ---
  let starving = false;
  if (player.needs.hydration === 0) {
    player.health -= STARVE_DAMAGE_PER_TICK;
    state.lastDamageSource = "died of thirst";
    starving = true;
  }
  if (player.needs.satiety === 0) {
    player.health -= STARVE_DAMAGE_PER_TICK;
    state.lastDamageSource = "starved";
    starving = true;
  }
  if (player.needs.warmth === 0) {
    player.health -= STARVE_DAMAGE_PER_TICK;
    state.lastDamageSource = "froze";
    starving = true;
  }
  if (starving) player.health = clamp(player.health, 0, HEALTH_MAX);

  // --- gather / craft (world state, not combat) ---
  if (input.gather) {
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0], [0, 0]];
    for (const [ddx, ddy] of dirs) {
      const gx = px + (ddx ?? 0);
      const gy = py + (ddy ?? 0);
      const t = world.get(gx, gy);
      if (t === Tile.Tree) {
        world.harvest(gx, gy, state.tick, REGROW_TICKS);
        player.wood += 3;
        bumpNoise(state, NOISE_PER_GATHER);
        if (!state.flags.firstGather) {
          state.flags.firstGather = true;
          say(state, "The Grey King: \"...Someone is cutting wood in the Verge. How ordinary. How loud.\"");
        }
        break;
      }
      if (t === Tile.Bush) {
        world.harvest(gx, gy, state.tick, REGROW_TICKS);
        player.needs.satiety = clamp(player.needs.satiety + 200, 0, NEED_MAX);
        bumpNoise(state, NOISE_PER_GATHER / 3);
        break;
      }
      if (t === Tile.Water) {
        player.needs.hydration = clamp(player.needs.hydration + 400, 0, NEED_MAX);
        break;
      }
    }
  }

  if (input.craft && player.wood >= 5 && world.get(px, py) === Tile.Grass) {
    world.set(px, py, Tile.Campfire);
    player.wood -= 5;
    bumpNoise(state, NOISE_PER_CRAFT);
    say(state, "You build a fire. It will keep you warm. It will also be seen.");
  }

  world.tickRegrowth(state.tick);
  if (state.tick % NOISE_DECAY_EVERY === 0) state.noise = clamp(state.noise - 1, 0, NOISE_MAX);

  // --- Lieutenant AI ---
  tickLieutenant(state);

  // --- Lieutenant contact damage ---
  const dSq = distSq(player.x, player.y, lieutenant.x, lieutenant.y);
  if (dSq <= CONTACT_RADIUS * CONTACT_RADIUS) {
    lieutenant.contactTicks++;
    player.health = clamp(player.health - LIEUTENANT_DAMAGE_PER_TICK, 0, HEALTH_MAX);
    state.lastDamageSource = "cut down by a Lieutenant";
  } else {
    lieutenant.contactTicks = 0;
  }

  // --- death ---
  if (player.health <= 0) {
    player.alive = false;
    if (!state.flags.firstDeath) {
      state.flags.firstDeath = true;
    }
    return { cause: state.lastDamageSource, tick: state.tick, wood: player.wood };
  }

  return null;
}

function bumpNoise(state: SimState, amount: number): void {
  state.noise = clamp(state.noise + amount, 0, NOISE_MAX);
}

function tickLieutenant(state: SimState): void {
  const { lieutenant, player, world, rng } = state;
  const night = isNight(state.tick);
  const detectionRadius =
    BASE_DETECTION_RADIUS +
    Math.trunc((NOISE_DETECTION_SCALE * state.noise) / NOISE_MAX) +
    (night ? NIGHT_DETECTION_BONUS : 0);

  const dSq = distSq(lieutenant.x, lieutenant.y, player.x, player.y);

  if (lieutenant.state === "patrol" && dSq <= detectionRadius * detectionRadius && player.alive) {
    lieutenant.state = "hunt";
    if (!state.flags.firstSighting) {
      state.flags.firstSighting = true;
      say(state, "The Grey King: \"One of my Lieutenants has your scent. Run, if you think it will help.\"");
    }
  } else if (lieutenant.state === "hunt" && (dSq > LOSE_INTEREST_RADIUS * LOSE_INTEREST_RADIUS || !player.alive)) {
    lieutenant.state = "patrol";
    lieutenant.waypointX = lieutenant.x;
    lieutenant.waypointY = lieutenant.y;
  }

  let targetX: number;
  let targetY: number;
  if (lieutenant.state === "hunt") {
    targetX = player.x;
    targetY = player.y;
  } else {
    const wpSq = distSq(lieutenant.x, lieutenant.y, lieutenant.waypointX, lieutenant.waypointY);
    if (wpSq < (TILE / 2) * (TILE / 2)) {
      lieutenant.waypointX = clamp(rng.nextInt(24), 0, 23) * TILE;
      lieutenant.waypointY = clamp(rng.nextInt(16), 0, 15) * TILE;
    }
    targetX = lieutenant.waypointX;
    targetY = lieutenant.waypointY;
  }

  const dx = targetX - lieutenant.x;
  const dy = targetY - lieutenant.y;
  const step = lieutenant.state === "hunt" ? LIEUTENANT_SPEED : Math.trunc(LIEUTENANT_SPEED * 0.6);
  const nx = lieutenant.x + Math.sign(dx) * Math.min(Math.abs(dx), step);
  const ny = lieutenant.y + Math.sign(dy) * Math.min(Math.abs(dy), step);
  const tx = tileOfUnits(nx);
  const ty = tileOfUnits(ny);
  if (world.inBounds(tx, ty) && !isSolid(world.get(tx, ty))) {
    lieutenant.x = nx;
    lieutenant.y = ny;
  }
}
