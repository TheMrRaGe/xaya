/**
 * The core sim tick — pure of rendering, pure of the DOM, runs at a fixed
 * 10 Hz per §21 ("world/survival sim at 10 Hz"). Everything in here is
 * integers; nothing in here reads a clock, iterates a Map/object in
 * insertion-order-dependent ways for anything that matters, or calls
 * Math.random. See src/sim/fixed.ts and src/sim/rng.ts for why.
 */
import { TILE, clamp, distSq } from "./fixed.js";
import { Rng } from "./rng.js";
import { World, WORLD_W, WORLD_H, Tile } from "./world.js";
import { Player, Lieutenant, NEED_MAX, HEALTH_MAX, DeathCause, newLieutenant } from "./entities.js";
import { stepToward, moveWithCollision } from "./move.js";
import {
  Creature,
  STATS,
  spawnCreatures,
  stepCreature,
  woundCreature,
  isCarcass,
  CREATURE_RESPAWN_TICKS,
  BOAR_GORE_DAMAGE,
  BOAR_GORE_COOLDOWN,
} from "./creatures.js";

export const TICK_HZ = 10;

const PLAYER_SPEED = 300; // fixed-point units/tick — 3 tiles/sec
const PLAYER_SPEED_DIAG = 212; // 300/sqrt(2): a diagonal must not be a sprint
const LIEUTENANT_SPEED = 260; // slightly slower than the player: fleeing must work (§21)

const HYDRATION_DRAIN_EVERY = 1; // ticks per -1 hydration
const SATIETY_DRAIN_EVERY = 2;
const WARMTH_DRAIN_EVERY = 3;
const WARMTH_DRAIN_EVERY_CLOAKED = 6; // a hide cloak halves what the cold takes
const WARMTH_REGEN_NEAR_FIRE = 2; // per tick, while within FIRE_RADIUS

const STARVE_DAMAGE_PER_TICK = 1; // per depleted need, per tick
const LIEUTENANT_DAMAGE_PER_TICK = 4;

const CONTACT_RADIUS = TILE * 0.6;
const STRIKE_RADIUS = TILE * 1.2; // how close you must be to hit, or to butcher
const FIRE_RADIUS = TILE * 2;
const BASE_DETECTION_RADIUS = TILE * 4;
const NIGHT_DETECTION_BONUS = TILE * 2;
const NOISE_DETECTION_SCALE = TILE * 3; // at max noise, this much extra radius
const LOSE_INTEREST_RADIUS = TILE * 9; // hysteresis so fleeing actually works

const NOISE_MAX = 1000;
const NOISE_PER_GATHER = 120;
const NOISE_PER_CRAFT = 250;
const NOISE_PER_STRIKE = 90; // a struggle carries
const NOISE_PER_COOK = 60;
const NOISE_DECAY_EVERY = 4; // ticks per -1 noise

/** Above this the crows gather over your work — and the Lieutenant reads crows. */
export const CROW_THRESHOLD = 250;
const CROW_SPEED = 90;

const FIRE_WOOD_COST = 5;
const FIRE_FEED_WOOD = 1;
const FIRE_FUEL_PER_WOOD = 300; // 30s of burning per log
const FIRE_LOW_FUEL = 200; // when to warn that it is dying

const SPEAR_WOOD_COST = 3;
const SPEAR_DAMAGE = 3;
const SPEAR_DURABILITY = 12; // strikes: about four deer, or two boar
const FIST_DAMAGE = 1;

const CLOAK_HIDE_COST = 2;
const CLOAK_DURABILITY = 400; // cold ticks it can take before it is rags

const RAW_SPOIL_EVERY = 900; // ~90s per piece of raw meat lost to rot

const RAW_MEAT_SATIETY = 120;
const RAW_MEAT_SICK_DAMAGE = 6; // one bite in four goes badly
const COOKED_MEAT_SATIETY = 500;
const COOKED_MEAT_WARMTH = 80;

const REGROW_TICKS = 900; // ~90s

const DAY_TICKS = 3000;
const NIGHT_TICKS = 3000;

export interface Input {
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
  gather: boolean; // E — chop, pick, drink, or butcher whatever is to hand
  strike: boolean; // space
  build: boolean; // F — a campfire
  makeSpear: boolean; // 1
  cook: boolean; // 2 — at a fire
  makeCloak: boolean; // 3 — at a fire
  eat: boolean; // 4
}

export interface DeathEvent {
  cause: DeathCause;
  tick: number;
  wood: number;
  kills: number;
}

export interface SimState {
  tick: number;
  world: World;
  player: Player;
  lieutenant: Lieutenant;
  creatures: Creature[];
  noise: number;
  noiseX: number; // where the last loud thing happened — the crows remember it
  noiseY: number;
  crowX: number; // the flock's drifting centre
  crowY: number;
  atFire: boolean; // recomputed each tick; the HUD and the renderer both want it
  rng: Rng;
  lastDamageSource: DeathCause;
  log: string[];
  flags: {
    firstGather: boolean;
    firstSighting: boolean;
    firstKill: boolean;
    firstCrows: boolean;
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
    creatures: spawnCreatures(world, rng, player.x, player.y),
    noise: 0,
    noiseX: player.x,
    noiseY: player.y,
    crowX: player.x,
    crowY: player.y,
    atFire: false,
    rng,
    lastDamageSource: "starved",
    log: [],
    flags: { firstGather: false, firstSighting: false, firstKill: false, firstCrows: false, firstDeath: false },
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

/**
 * Is there a lit campfire close enough to matter?
 *
 * This used to compare the player against the corner of their own tile,
 * which is always inside the fire radius — so warmth never drained, cold
 * never killed anyone, and the fire (the one thing in the game that trades
 * safety for visibility) was decoration.
 */
function fireTileNear(world: World, x: number, y: number): { x: number; y: number } | null {
  const px = tileOfUnits(x);
  const py = tileOfUnits(y);
  const reach = Math.ceil(FIRE_RADIUS / TILE);
  for (let ty = py - reach; ty <= py + reach; ty++) {
    for (let tx = px - reach; tx <= px + reach; tx++) {
      if (world.get(tx, ty) !== Tile.Campfire) continue;
      if (distSq(x, y, tx * TILE, ty * TILE) <= FIRE_RADIUS * FIRE_RADIUS) return { x: tx, y: ty };
    }
  }
  return null;
}

/** Advance the world by exactly one tick. Returns a DeathEvent if the player died this tick. */
export function stepTick(state: SimState, input: Input): DeathEvent | null {
  const { player, world, lieutenant } = state;
  const pack = player.pack;
  state.tick++;

  if (!player.alive) return null;

  // --- movement ---
  if (input.dx !== 0 || input.dy !== 0) {
    const speed = input.dx !== 0 && input.dy !== 0 ? PLAYER_SPEED_DIAG : PLAYER_SPEED;
    const moved = moveWithCollision(world, player.x, player.y, player.x + input.dx * speed, player.y + input.dy * speed);
    player.x = clamp(moved.x, 0, (WORLD_W - 1) * TILE);
    player.y = clamp(moved.y, 0, (WORLD_H - 1) * TILE);
  }

  const px = tileOfUnits(player.x);
  const py = tileOfUnits(player.y);
  const lit = fireTileNear(world, player.x, player.y);
  state.atFire = lit !== null;
  // Fires warn once, on the way down, so the wood run is a decision and
  // not a surprise.
  if (lit && world.fuelAt(lit.x, lit.y) === FIRE_LOW_FUEL) say(state, "The fire is burning low. It wants more wood.");

  // --- needs drain ---
  if (state.tick % HYDRATION_DRAIN_EVERY === 0) player.needs.hydration = clamp(player.needs.hydration - 1, 0, NEED_MAX);
  if (state.tick % SATIETY_DRAIN_EVERY === 0) player.needs.satiety = clamp(player.needs.satiety - 1, 0, NEED_MAX);

  const coldEvery = pack.cloak > 0 ? WARMTH_DRAIN_EVERY_CLOAKED : WARMTH_DRAIN_EVERY;
  if (state.atFire) {
    player.needs.warmth = clamp(player.needs.warmth + WARMTH_REGEN_NEAR_FIRE, 0, NEED_MAX);
  } else if (state.tick % coldEvery === 0) {
    player.needs.warmth = clamp(player.needs.warmth - 1, 0, NEED_MAX);
    // A cloak is spent by the cold it keeps off you, not by the clock.
    if (pack.cloak > 0) {
      pack.cloak--;
      if (pack.cloak === 0) say(state, "Your cloak gives out — the hide is worn through.");
    }
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

  // --- the verbs ---
  if (input.gather) doGather(state, px, py);
  if (input.strike) doStrike(state);
  if (input.build) doBuild(state, px, py);
  if (input.makeSpear) doMakeSpear(state);
  if (input.cook) doCook(state);
  if (input.makeCloak) doMakeCloak(state);
  if (input.eat) doEat(state);

  world.tickRegrowth(state.tick);
  if (world.tickFires(state.tick) > 0) say(state, "A fire burns out. The cold comes back in.");
  if (state.tick % NOISE_DECAY_EVERY === 0) state.noise = clamp(state.noise - 1, 0, NOISE_MAX);

  // Raw meat rots on a schedule; cooked meat keeps. The pressure that
  // makes a fire worth walking back to.
  if (state.tick % RAW_SPOIL_EVERY === 0 && pack.rawMeat > 0) {
    pack.rawMeat--;
    say(state, "A piece of raw meat has turned. Cook it next time.");
  }

  // --- the crows drift toward whatever was last loud ---
  const crow = stepToward(state.crowX, state.crowY, state.noiseX, state.noiseY, CROW_SPEED);
  state.crowX = crow.x;
  state.crowY = crow.y;
  if (state.noise >= CROW_THRESHOLD && !state.flags.firstCrows) {
    state.flags.firstCrows = true;
    say(state, "The Grey King: “Crows. They keep better watch than my Lieutenants, and they work for nothing.”");
  }

  // --- beasts ---
  const ctx = {
    world,
    rng: state.rng,
    tick: state.tick,
    playerX: player.x,
    playerY: player.y,
    playerAlive: player.alive,
    noise: state.noise,
    noiseMax: NOISE_MAX,
  };
  for (const c of state.creatures) {
    stepCreature(c, ctx);
    if (c.kind !== "boar" || c.state !== "charge" || c.goreCooldown > 0) continue;
    if (distSq(c.x, c.y, player.x, player.y) > CONTACT_RADIUS * CONTACT_RADIUS) continue;
    player.health = clamp(player.health - BOAR_GORE_DAMAGE, 0, HEALTH_MAX);
    state.lastDamageSource = "gored by a boar";
    c.goreCooldown = BOAR_GORE_COOLDOWN;
  }

  // --- Lieutenant ---
  tickLieutenant(state);

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
    return { cause: state.lastDamageSource, tick: state.tick, wood: pack.wood, kills: player.kills };
  }

  return null;
}

/** E — butcher first if there is a carcass to hand, since that is what you meant. */
function doGather(state: SimState, px: number, py: number): void {
  const { player, world } = state;
  const pack = player.pack;

  const carcass = nearestCreature(state, isCarcass);
  if (carcass) {
    const stats = STATS[carcass.kind];
    pack.rawMeat += stats.meat;
    pack.hide += stats.hide;
    carcass.butchered = true;
    carcass.respawnAtTick = state.tick + CREATURE_RESPAWN_TICKS;
    say(state, `You butcher the ${carcass.kind}: ${stats.meat} meat, ${stats.hide} hide.`);
    return;
  }

  const dirs: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (const [ddx, ddy] of dirs) {
    const gx = px + ddx;
    const gy = py + ddy;
    const t = world.get(gx, gy);
    if (t === Tile.Tree) {
      world.harvest(gx, gy, state.tick, REGROW_TICKS);
      pack.wood += 3;
      bumpNoise(state, NOISE_PER_GATHER);
      if (!state.flags.firstGather) {
        state.flags.firstGather = true;
        say(state, "The Grey King: “...Someone is cutting wood in the Verge. How ordinary. How loud.”");
      }
      return;
    }
    if (t === Tile.Bush) {
      world.harvest(gx, gy, state.tick, REGROW_TICKS);
      player.needs.satiety = clamp(player.needs.satiety + 200, 0, NEED_MAX);
      bumpNoise(state, Math.trunc(NOISE_PER_GATHER / 3));
      return;
    }
    if (t === Tile.Water) {
      player.needs.hydration = clamp(player.needs.hydration + 400, 0, NEED_MAX);
      return;
    }
  }
}

/** Space — hit the nearest living thing in reach. Loud, always. */
function doStrike(state: SimState): void {
  const { player } = state;
  const quarry = nearestCreature(state, (c) => c.state !== "dead");
  if (!quarry) return;

  const pack = player.pack;
  const damage = pack.spear > 0 ? SPEAR_DAMAGE : FIST_DAMAGE;
  const killed = woundCreature(quarry, damage, state.tick);
  bumpNoise(state, NOISE_PER_STRIKE);

  if (pack.spear > 0) {
    pack.spear--;
    if (pack.spear === 0) say(state, "Your spear splinters on the last blow.");
  }

  if (killed) {
    player.kills++;
    say(state, `The ${quarry.kind} goes down. Stand over it and press E.`);
    if (!state.flags.firstKill) {
      state.flags.firstKill = true;
      say(state, "The Grey King: “Blood in the Verge. Good. It makes you easier to follow.”");
    }
  } else if (quarry.kind === "boar") {
    say(state, "The boar turns on you.");
  }
}

/**
 * F — feed the fire you're standing at, or build a new one. Feeding first
 * is what you meant nine times in ten, and it keeps the verb to one key.
 */
function doBuild(state: SimState, px: number, py: number): void {
  const { player, world } = state;
  const pack = player.pack;

  const lit = fireTileNear(world, player.x, player.y);
  if (lit) {
    if (pack.wood < FIRE_FEED_WOOD) return;
    world.feedFire(lit.x, lit.y, FIRE_FUEL_PER_WOOD);
    pack.wood -= FIRE_FEED_WOOD;
    bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 5));
    say(state, "You feed the fire. It answers, and so does the dark.");
    return;
  }

  if (pack.wood < FIRE_WOOD_COST) return;
  if (world.get(px, py) !== Tile.Grass) return;
  world.lightFire(px, py, FIRE_WOOD_COST * FIRE_FUEL_PER_WOOD);
  pack.wood -= FIRE_WOOD_COST;
  bumpNoise(state, NOISE_PER_CRAFT);
  say(state, "You build a fire. It will keep you warm. It will also be seen.");
}

function doMakeSpear(state: SimState): void {
  const pack = state.player.pack;
  if (pack.spear > 0 || pack.wood < SPEAR_WOOD_COST) return;
  pack.wood -= SPEAR_WOOD_COST;
  pack.spear = SPEAR_DURABILITY;
  bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 4));
  say(state, "You sharpen a stake into a spear. Three times the bite.");
}

function doCook(state: SimState): void {
  const pack = state.player.pack;
  if (!state.atFire || pack.rawMeat < 1) return;
  pack.rawMeat--;
  pack.cookedMeat++;
  bumpNoise(state, NOISE_PER_COOK);
  say(state, "Meat over the fire. The smell carries further than the light does.");
}

function doMakeCloak(state: SimState): void {
  const pack = state.player.pack;
  if (!state.atFire || pack.cloak > 0 || pack.hide < CLOAK_HIDE_COST) return;
  pack.hide -= CLOAK_HIDE_COST;
  pack.cloak = CLOAK_DURABILITY;
  say(state, "A hide cloak. The cold takes half as much now.");
}

/** 4 — cooked if you have it, raw if you are desperate. Raw sometimes bites back. */
function doEat(state: SimState): void {
  const { player } = state;
  const pack = player.pack;
  if (pack.cookedMeat > 0) {
    pack.cookedMeat--;
    player.needs.satiety = clamp(player.needs.satiety + COOKED_MEAT_SATIETY, 0, NEED_MAX);
    player.needs.warmth = clamp(player.needs.warmth + COOKED_MEAT_WARMTH, 0, NEED_MAX);
    return;
  }
  if (pack.rawMeat > 0) {
    pack.rawMeat--;
    player.needs.satiety = clamp(player.needs.satiety + RAW_MEAT_SATIETY, 0, NEED_MAX);
    if (state.rng.chance(1, 4)) {
      player.health = clamp(player.health - RAW_MEAT_SICK_DAMAGE, 0, HEALTH_MAX);
      say(state, "Raw meat. It stays down, but not happily.");
    }
  }
}

function nearestCreature(state: SimState, pick: (c: Creature) => boolean): Creature | null {
  const { player } = state;
  let best: Creature | null = null;
  let bestSq = STRIKE_RADIUS * STRIKE_RADIUS;
  for (const c of state.creatures) {
    if (!pick(c)) continue;
    const d = distSq(c.x, c.y, player.x, player.y);
    if (d <= bestSq) {
      bestSq = d;
      best = c;
    }
  }
  return best;
}

function bumpNoise(state: SimState, amount: number): void {
  state.noise = clamp(state.noise + amount, 0, NOISE_MAX);
  state.noiseX = state.player.x;
  state.noiseY = state.player.y;
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
      say(state, "The Grey King: “One of my Lieutenants has your scent. Run, if you think it will help.”");
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
  } else if (state.noise >= CROW_THRESHOLD) {
    // He does not need to see you. He needs to see the birds — which is the
    // whole design in one line: what you build is what gives you away.
    targetX = state.crowX;
    targetY = state.crowY;
  } else {
    const wpSq = distSq(lieutenant.x, lieutenant.y, lieutenant.waypointX, lieutenant.waypointY);
    if (wpSq < (TILE / 2) * (TILE / 2)) {
      lieutenant.waypointX = rng.nextInt(WORLD_W) * TILE;
      lieutenant.waypointY = rng.nextInt(WORLD_H) * TILE;
    }
    targetX = lieutenant.waypointX;
    targetY = lieutenant.waypointY;
  }

  const speed = lieutenant.state === "hunt" ? LIEUTENANT_SPEED : Math.trunc(LIEUTENANT_SPEED * 0.6);
  const next = stepToward(lieutenant.x, lieutenant.y, targetX, targetY, speed);
  const moved = moveWithCollision(world, lieutenant.x, lieutenant.y, next.x, next.y);
  lieutenant.x = clamp(moved.x, 0, (WORLD_W - 1) * TILE);
  lieutenant.y = clamp(moved.y, 0, (WORLD_H - 1) * TILE);
}
