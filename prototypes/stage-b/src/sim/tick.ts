/**
 * The core sim tick — pure of rendering, pure of the DOM, runs at a fixed
 * 10 Hz per doc/world/PLAN.md §21 ("world/survival sim at 10 Hz"). Everything
 * in here is integers; nothing in here reads a clock, iterates a Map/object
 * in insertion-order-dependent ways for anything that matters, or calls
 * Math.random. See src/sim/fixed.ts and src/sim/rng.ts for why.
 *
 * It holds any number of souls (Stage C). One tick takes one Input per
 * soul, in player-id order, and returns every death that happened in it —
 * which is the same shape a server or a chain would hand it, so nothing
 * above this file needs to know which one is driving.
 */
import { TILE, clamp, distSq } from "./fixed.js";
import { Rng } from "./rng.js";
import { World, WORLD_W, WORLD_H, Tile } from "./world.js";
import {
  Player,
  Lieutenant,
  Tradeable,
  TRADEABLES,
  NEED_MAX,
  HEALTH_MAX,
  DeathCause,
  newPlayer,
  newLieutenant,
} from "./entities.js";
import { stepToward, moveWithCollision, walkable } from "./move.js";
import { OverlordAction, GRIEF_PER_DEATH, GRIEF_DECAY_EVERY, isColdSnap, isBlighted } from "./director.js";
import {
  Skill,
  XP,
  gain,
  level,
  mastery,
  woodPerTree,
  noiseScale,
  strikeBonus,
  butcherBonus,
  mealValue,
  cloakDurability,
} from "./skills.js";
import {
  Creature,
  STATS,
  spawnCreatures,
  stepCreature,
  woundCreature,
  isCarcass,
  checkSnares,
  CREATURE_RESPAWN_TICKS,
  BOAR_GORE_DAMAGE,
  BOAR_GORE_COOLDOWN,
  WOLF_BITE_DAMAGE,
  WOLF_BITE_COOLDOWN,
} from "./creatures.js";

export const TICK_HZ = 10;

const PLAYER_SPEED = 300; // fixed-point units/tick — 3 tiles/sec
const PLAYER_SPEED_DIAG = 212; // 300/sqrt(2): a diagonal must not be a sprint
const LIEUTENANT_SPEED = 260; // slightly slower than a soul: fleeing must work (doc/world/PLAN.md §21)

const HYDRATION_DRAIN_EVERY = 1; // ticks per -1 hydration
const SATIETY_DRAIN_EVERY = 2;
const WARMTH_DRAIN_EVERY = 3;
const WARMTH_DRAIN_EVERY_CLOAKED = 6; // a hide cloak halves what the cold takes
const WARMTH_REGEN_NEAR_FIRE = 2; // per tick, while within FIRE_RADIUS

const STARVE_DAMAGE_PER_TICK = 1; // per depleted need, per tick
const LIEUTENANT_DAMAGE_PER_TICK = 4;

const CONTACT_RADIUS = TILE * 0.6;
const STRIKE_RADIUS = TILE * 1.2; // how close to hit, or to butcher
const TRADE_RADIUS = TILE * 1.5; // how close to hand something over
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

const CLOAK_HIDE_COST = 2; // how long it then lasts is up to the tailor — see skills.ts

/**
 * Stone tools. The point of them is not that they are better numbers — it
 * is that stone is *free and loud* while everything else here is scarce and
 * quiet, so a tool is a trade of attention for yield rather than a trade of
 * time for yield. An axe pays that back: it is the one tool that makes you
 * quieter than having no tool at all.
 */
const KNIFE_STONE_COST = 1;
const KNIFE_WOOD_COST = 1;
const KNIFE_DURABILITY = 20; // butcherings
const KNIFE_BONUS = 1; // extra meat and hide off a carcass

const AXE_STONE_COST = 2;
const AXE_WOOD_COST = 1;
const AXE_DURABILITY = 25; // chops
const AXE_WOOD_BONUS = 2; // extra logs per tree
const AXE_QUIET = 65; // percent of the usual noise a chop makes

const CORDAGE_HIDE_COST = 1;
const CORDAGE_PER_HIDE = 2;

const SNARE_CORDAGE_COST = 2;
const SNARE_WOOD_COST = 1;

const NOISE_PER_CHIP = 260; // hammering stone is the loudest work in the Verge
const NOISE_PER_ORE = 320; // and a vein is worse — this is the loudest work there is

/**
 * The sword chain (doc/world/PLAN.md §15's worked example, compressed to what
 * one soul can do alone): ore + charcoal → bar → sword. Charcoal costs three
 * logs for one lump on purpose — a real charcoal burn wastes most of the
 * wood as heat, and that waste is what makes this chain expensive rather
 * than merely long.
 */
const CHARCOAL_WOOD_COST = 3;
const CHARCOAL_YIELD = 1;

const SMELT_ORE_COST = 2;
const SMELT_CHARCOAL_COST = 1;
const BAR_YIELD = 1;

const SWORD_BAR_COST = 2;
const SWORD_WOOD_COST = 1; // the haft
const SWORD_CORDAGE_COST = 1; // binding the grip
const SWORD_DAMAGE = 6; // double the spear
const SWORD_DURABILITY = 30; // and outlasts it by more than double

const RAW_SPOIL_EVERY = 900; // ~90s per piece of raw meat lost to rot

const REGROW_TICKS = 900; // ~90s

/**
 * What stops a Lieutenant camping the place he made a kill.
 *
 * Three things were compounding. The crows sit over wherever you were last
 * loud, which after a fight is your corpse; a patrolling Lieutenant walks
 * toward the crows; and every new soul used to arrive at the same fixed
 * tile. So he stood on the spot and killed each soul as it appeared, which
 * is not difficulty, it is a locked door.
 */
const KILL_REST_TICKS = 400; // 40s in which he is satisfied and ignores everything
const RESPAWN_GRACE_TICKS = 120; // 12s in which a new soul is beneath his notice
const SPAWN_CLEAR_TILES = 8; // how far a new soul arrives from him
const SPAWN_CLEAR_CROWS = 4; // and from whatever the birds are still watching

const DAY_TICKS = 3000;
const NIGHT_TICKS = 3000;

export interface Input {
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
  gather: boolean; // E — chop, chip, pick, drink, or butcher whatever is to hand
  strike: boolean; // space
  build: boolean; // F — feed a fire, or build one
  makeSpear: boolean; // 1
  cook: boolean; // 2 — at a fire
  makeCloak: boolean; // 3 — at a fire
  eat: boolean; // 4
  makeKnife: boolean; // 5
  makeAxe: boolean; // 6
  makeCordage: boolean; // 7 — needs a knife
  setSnare: boolean; // 8 — place one you are carrying
  makeCharcoal: boolean; // 9 — at a fire, smother wood down
  smelt: boolean; // 0 — at a fire, ore and charcoal to a bar
  makeSword: boolean; // B — bar, wood and cordage, once each
  cycleOffer: boolean; // T — what you would hand over
  give: boolean; // G — hand one over to whoever is standing next to you
}

export const NO_INPUT: Input = {
  dx: 0,
  dy: 0,
  gather: false,
  strike: false,
  build: false,
  makeSpear: false,
  cook: false,
  makeCloak: false,
  eat: false,
  makeKnife: false,
  makeAxe: false,
  makeCordage: false,
  setSnare: false,
  makeCharcoal: false,
  smelt: false,
  makeSword: false,
  cycleOffer: false,
  give: false,
};

export interface DeathEvent {
  id: number;
  lineage: number;
  cause: DeathCause;
  tick: number;
  wood: number;
  kills: number;
  /** What this character was best at. Goes on the Barrow-list as a name, not as a bonus. */
  mastery: string;
}

/**
 * Every hand-over, in order. Stage C has no currency and no escrow — one
 * soul gives, the other receives — but the ledger is kept from the first
 * trade because DESIGN §6.8 says trades must be authoritative, logged and
 * replayable if cash-out is ever to be possible, and that is free to do now
 * and impossible to retrofit.
 */
export interface TradeRecord {
  tick: number;
  from: number;
  to: number;
  item: Tradeable;
}

/**
 * Everything the Overlord has done, in order. Kept for the same reason the
 * trade ledger is (§6.8): an action a player cannot audit is an action they
 * cannot learn from, and a season nobody can replay proves nothing.
 */
export interface Incident {
  tick: number;
  action: OverlordAction;
  why: string;
}

export interface SimState {
  tick: number;
  world: World;
  players: Player[];
  lieutenant: Lieutenant;
  creatures: Creature[];
  trades: TradeRecord[];
  incidents: Incident[];
  noise: number;
  /** What the Storyteller has done to the Verge, and for how long (§3.5). */
  grief: number; // recent deaths buy the survivors quiet
  coldUntil: number;
  blightUntil: number;
  marked: number; // a soul the Lieutenant wants above all others, or -1
  noiseX: number; // where the last loud thing happened — the crows remember it
  noiseY: number;
  crowX: number; // the flock's drifting centre
  crowY: number;
  rng: Rng;
  lastDamageSource: DeathCause[]; // per player id
  log: string[];
  flags: {
    firstGather: boolean;
    firstSighting: boolean;
    firstKill: boolean;
    firstCrows: boolean;
    firstTrade: boolean;
    firstStone: boolean;
    firstSnare: boolean;
    firstOre: boolean;
    firstSword: boolean;
  };
}

export function newSim(seed: number, players: Player[]): SimState {
  const rng = new Rng(seed);
  const world = new World(seed);
  const lieutenant = newLieutenant(18 * TILE, 12 * TILE);
  const first = players[0];
  return {
    tick: 0,
    world,
    players,
    lieutenant,
    creatures: spawnCreatures(world, rng, players),
    trades: [],
    incidents: [],
    noise: 0,
    grief: 0,
    coldUntil: 0,
    blightUntil: 0,
    marked: -1,
    noiseX: first ? first.x : 0,
    noiseY: first ? first.y : 0,
    crowX: first ? first.x : 0,
    crowY: first ? first.y : 0,
    rng,
    lastDamageSource: players.map(() => "starved" as DeathCause),
    log: [],
    flags: {
      firstGather: false,
      firstSighting: false,
      firstKill: false,
      firstCrows: false,
      firstTrade: false,
      firstStone: false,
      firstSnare: false,
      firstOre: false,
      firstSword: false,
    },
  };
}

/**
 * Somewhere for a new soul to wash up: walkable, well away from the
 * Lieutenant, and not under the crows. A fixed arrival tile is what turns
 * one bad death into ten.
 */
function findSpawn(state: SimState): { x: number; y: number } {
  const { world, rng, lieutenant } = state;
  const fromHim = SPAWN_CLEAR_TILES * TILE * (SPAWN_CLEAR_TILES * TILE);
  const fromBirds = SPAWN_CLEAR_CROWS * TILE * (SPAWN_CLEAR_CROWS * TILE);
  for (let attempt = 0; attempt < 64; attempt++) {
    const x = rng.nextInt(WORLD_W) * TILE;
    const y = rng.nextInt(WORLD_H) * TILE;
    if (!walkable(world, x, y)) continue;
    if (distSq(x, y, lieutenant.x, lieutenant.y) < fromHim) continue;
    if (state.noise >= CROW_THRESHOLD && distSq(x, y, state.crowX, state.crowY) < fromBirds) continue;
    return { x, y };
  }
  // The Verge is small; on an unlucky roll, settle for the far corner from
  // him rather than dropping a soul in his lap.
  const x = lieutenant.x > ((WORLD_W - 1) * TILE) / 2 ? 0 : (WORLD_W - 1) * TILE;
  const y = lieutenant.y > ((WORLD_H - 1) * TILE) / 2 ? 0 : (WORLD_H - 1) * TILE;
  return { x, y };
}

/** A soul joins the Verge. The authority above the sim calls this, not `newPlayer`. */
export function addSoul(state: SimState, lineage: number): Player {
  const spot = findSpawn(state);
  const player = newPlayer(lineage, state.players.length, spot.x, spot.y, state.tick + RESPAWN_GRACE_TICKS);
  state.players.push(player);
  state.lastDamageSource.push("starved");
  return player;
}

/** The next soul in a lineage takes over a slot. Ids are stable; souls are not. */
export function replaceSoul(state: SimState, id: number, lineage: number): Player {
  const spot = findSpawn(state);
  const player = newPlayer(lineage, id, spot.x, spot.y, state.tick + RESPAWN_GRACE_TICKS);
  state.players[id] = player;
  state.lastDamageSource[id] = "starved";
  if (state.lieutenant.target === id) {
    state.lieutenant.state = "patrol";
    state.lieutenant.target = -1;
  }
  return player;
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
 * The campfire tile close enough to matter, if there is one.
 *
 * This used to compare a soul against the corner of its own tile, which is
 * always inside the fire radius — so warmth never drained, cold never killed
 * anyone, and the fire (the one object that trades safety for visibility)
 * was decoration.
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

/**
 * Advance the world by exactly one tick. `inputs` is indexed by player id;
 * anything missing is treated as a soul standing still. Returns every death
 * that happened this tick, in player-id order.
 */
export function stepTick(state: SimState, inputs: ReadonlyArray<Input>): DeathEvent[] {
  const { world, lieutenant } = state;
  state.tick++;
  const deaths: DeathEvent[] = [];

  for (const player of state.players) {
    if (!player.alive) continue;
    const input = inputs[player.id] ?? NO_INPUT;
    const death = stepPlayer(state, player, input);
    if (death) deaths.push(death);
  }

  if (!isBlighted(state)) world.tickRegrowth(state.tick);
  if (world.tickFires(state.tick) > 0) say(state, "A fire burns out. The cold comes back in.");
  if (state.grief > 0 && state.tick % GRIEF_DECAY_EVERY === 0) state.grief--;
  if (state.tick % NOISE_DECAY_EVERY === 0) state.noise = clamp(state.noise - 1, 0, NOISE_MAX);

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
    souls: state.players,
    noise: state.noise,
    noiseMax: NOISE_MAX,
    night: isNight(state.tick),
  };
  for (const c of state.creatures) {
    stepCreature(c, ctx);
    // A charging boar and a hunting wolf both bite the same way: contact,
    // a cooldown, and whoever the beast currently holds a grudge against.
    const biting = (c.kind === "hedge-boar" && c.state === "charge") || (c.kind === "wolf" && c.state === "hunt");
    if (!biting || c.goreCooldown > 0) continue;
    const target = state.players[c.angryAt];
    if (!target || !target.alive) continue;
    if (distSq(c.x, c.y, target.x, target.y) > CONTACT_RADIUS * CONTACT_RADIUS) continue;
    const damage = c.kind === "hedge-boar" ? BOAR_GORE_DAMAGE : WOLF_BITE_DAMAGE;
    const cause: DeathCause = c.kind === "hedge-boar" ? "gored by a boar" : "savaged by wolves";
    target.health = clamp(target.health - damage, 0, HEALTH_MAX);
    state.lastDamageSource[target.id] = cause;
    c.goreCooldown = c.kind === "hedge-boar" ? BOAR_GORE_COOLDOWN : WOLF_BITE_COOLDOWN;
  }

  // A trapline pays out whether or not anyone is standing there.
  for (const catch_ of checkSnares(state.creatures, ctx)) {
    world.clearSnare(catch_.idx);
    const owner = state.players[catch_.owner];
    if (owner && owner.alive) {
      learn(state, owner, "trapping", XP.trap);
      say(state, `Soul #${owner.lineage}'s snare has taken something. It is still there, waiting to be cut out.`);
    } else {
      say(state, "A snare has taken something. It is still there, waiting to be cut out.");
    }
  }

  // --- the Lieutenant, and whoever he catches ---
  tickLieutenant(state);
  const quarry = state.players[lieutenant.target];
  if (quarry && quarry.alive && distSq(quarry.x, quarry.y, lieutenant.x, lieutenant.y) <= CONTACT_RADIUS * CONTACT_RADIUS) {
    lieutenant.contactTicks++;
    quarry.health = clamp(quarry.health - LIEUTENANT_DAMAGE_PER_TICK, 0, HEALTH_MAX);
    state.lastDamageSource[quarry.id] = "cut down by a Lieutenant";
  } else {
    lieutenant.contactTicks = 0;
  }

  // Damage lands after everything has moved, so a death is resolved once.
  for (const player of state.players) {
    if (!player.alive || player.health > 0) continue;
    deaths.push(kill(state, player));
  }

  return deaths;
}

function kill(state: SimState, player: Player): DeathEvent {
  player.alive = false;
  const cause = state.lastDamageSource[player.id] ?? "starved";
  say(state, `Soul #${player.lineage} is dead — ${cause}.`);

  state.grief += GRIEF_PER_DEATH;
  if (state.marked === player.id) state.marked = -1;

  const { lieutenant } = state;
  if (lieutenant.target === player.id) {
    lieutenant.state = "patrol";
    lieutenant.target = -1;
  }
  if (cause === "cut down by a Lieutenant") {
    // He has what he came for. He rests, and he rests somewhere else.
    lieutenant.restUntil = state.tick + KILL_REST_TICKS;
    lieutenant.waypointX = (WORLD_W - 1) * TILE - lieutenant.x;
    lieutenant.waypointY = (WORLD_H - 1) * TILE - lieutenant.y;
  }
  return {
    id: player.id,
    lineage: player.lineage,
    cause,
    tick: state.tick,
    wood: player.pack.wood,
    kills: player.kills,
    mastery: mastery(player.skills),
  };
}

function stepPlayer(state: SimState, player: Player, input: Input): DeathEvent | null {
  const { world } = state;
  const pack = player.pack;

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
  player.atFire = lit !== null;
  // Fires warn once, on the way down, so the wood run is a decision and not
  // a surprise.
  if (lit && world.fuelAt(lit.x, lit.y) === FIRE_LOW_FUEL) say(state, "A fire is burning low. It wants more wood.");

  // --- needs drain ---
  if (state.tick % HYDRATION_DRAIN_EVERY === 0) player.needs.hydration = clamp(player.needs.hydration - 1, 0, NEED_MAX);
  if (state.tick % SATIETY_DRAIN_EVERY === 0) player.needs.satiety = clamp(player.needs.satiety - 1, 0, NEED_MAX);

  let coldEvery = pack.cloak > 0 ? WARMTH_DRAIN_EVERY_CLOAKED : WARMTH_DRAIN_EVERY;
  // A cold snap takes twice as much, cloak or no cloak.
  if (isColdSnap(state)) coldEvery = Math.max(1, Math.trunc(coldEvery / 2));
  if (player.atFire) {
    player.needs.warmth = clamp(player.needs.warmth + WARMTH_REGEN_NEAR_FIRE, 0, NEED_MAX);
  } else if (state.tick % coldEvery === 0) {
    player.needs.warmth = clamp(player.needs.warmth - 1, 0, NEED_MAX);
    // A cloak is spent by the cold it keeps off you, not by the clock.
    if (pack.cloak > 0) {
      pack.cloak--;
      if (pack.cloak === 0) say(state, "A cloak gives out — the hide is worn through.");
    }
  }

  // --- starvation damage ---
  if (player.needs.hydration === 0) {
    player.health -= STARVE_DAMAGE_PER_TICK;
    state.lastDamageSource[player.id] = "died of thirst";
  }
  if (player.needs.satiety === 0) {
    player.health -= STARVE_DAMAGE_PER_TICK;
    state.lastDamageSource[player.id] = "starved";
  }
  if (player.needs.warmth === 0) {
    player.health -= STARVE_DAMAGE_PER_TICK;
    state.lastDamageSource[player.id] = "froze";
  }
  player.health = clamp(player.health, 0, HEALTH_MAX);

  // Raw meat rots on a schedule; cooked meat keeps. The pressure that makes
  // a fire worth walking back to.
  if (state.tick % RAW_SPOIL_EVERY === 0 && pack.rawMeat > 0) {
    pack.rawMeat--;
    say(state, "A piece of raw meat has turned. Cook it next time.");
  }

  // --- the verbs ---
  if (input.gather) doGather(state, player, px, py);
  if (input.strike) doStrike(state, player);
  if (input.build) doBuild(state, player, px, py);
  if (input.makeSpear) doMakeSpear(state, player);
  if (input.cook) doCook(state, player);
  if (input.makeCloak) doMakeCloak(state, player);
  if (input.eat) doEat(state, player);
  if (input.makeKnife) doMakeKnife(state, player);
  if (input.makeAxe) doMakeAxe(state, player);
  if (input.makeCordage) doMakeCordage(state, player);
  if (input.setSnare) doSetSnare(state, player, px, py);
  if (input.makeCharcoal) doMakeCharcoal(state, player);
  if (input.smelt) doSmelt(state, player);
  if (input.makeSword) doMakeSword(state, player);
  if (input.cycleOffer) cycleOffer(player);
  if (input.give) doGive(state, player);

  return player.health <= 0 ? kill(state, player) : null;
}

/** E — butcher first if there is a carcass to hand, since that is what you meant. */
function doGather(state: SimState, player: Player, px: number, py: number): void {
  const { world } = state;
  const pack = player.pack;

  const carcass = nearestCreature(state, player, isCarcass);
  if (carcass) {
    const stats = STATS[carcass.kind];
    const extra = butcherBonus(player.skills);
    // A knife is the difference between taking a carcass apart and tearing
    // it apart. It wears, like everything else.
    const blade = pack.knife > 0 ? KNIFE_BONUS : 0;
    if (pack.knife > 0) {
      pack.knife--;
      if (pack.knife === 0) say(state, "The knife's edge is gone. It is a stone again.");
    }
    const meat = stats.meat + extra + blade;
    const hide = Math.max(0, stats.hide === 0 ? 0 : stats.hide + extra + blade);
    pack.rawMeat += meat;
    pack.hide += hide;
    carcass.butchered = true;
    carcass.respawnAtTick = state.tick + CREATURE_RESPAWN_TICKS;
    say(state, `You butcher the ${carcass.kind}: ${meat} meat, ${hide} hide.`);
    learn(state, player, "butchery", XP.butcher);
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
      // An axe is more wood and *less* noise — the one tool that makes you
      // safer by being better, which is the same argument skill makes.
      const axed = pack.axe > 0;
      pack.wood += woodPerTree(player.skills) + (axed ? AXE_WOOD_BONUS : 0);
      let noise = skilledNoise(NOISE_PER_GATHER, player, "woodcraft");
      if (axed) {
        noise = Math.trunc((noise * AXE_QUIET) / 100);
        pack.axe--;
        if (pack.axe === 0) say(state, "The axe head splits. Back to breaking branches by hand.");
      }
      bumpNoise(state, noise, player);
      learn(state, player, "woodcraft", XP.chop);
      if (!state.flags.firstGather) {
        state.flags.firstGather = true;
        say(state, "The Grey King: “...Someone is cutting wood in the Verge. How ordinary. How loud.”");
      }
      return;
    }
    if (t === Tile.Rock) {
      // A rock does not run out. What it costs is being heard.
      pack.stone++;
      bumpNoise(state, NOISE_PER_CHIP, player);
      if (!state.flags.firstStone) {
        state.flags.firstStone = true;
        say(state, "The Grey King: “Stone on stone. I can hear that from the Spire, and so can everything nearer.”");
      }
      return;
    }
    if (t === Tile.Ore) {
      // Same deal as a rock, one tier up: never runs out, and the loudest
      // thing you can do in the Verge.
      pack.ore++;
      bumpNoise(state, NOISE_PER_ORE, player);
      if (!state.flags.firstOre) {
        state.flags.firstOre = true;
        say(state, "The Grey King: “Ore, now. You are digging for something worth taking.”");
      }
      return;
    }
    if (t === Tile.Bush) {
      world.harvest(gx, gy, state.tick, REGROW_TICKS);
      player.needs.satiety = clamp(player.needs.satiety + 200, 0, NEED_MAX);
      bumpNoise(state, Math.trunc(NOISE_PER_GATHER / 3), player);
      return;
    }
    if (t === Tile.Water) {
      player.needs.hydration = clamp(player.needs.hydration + 400, 0, NEED_MAX);
      return;
    }
  }
}

/** Space — hit the nearest living thing in reach. Loud, always. */
function doStrike(state: SimState, player: Player): void {
  const quarry = nearestCreature(state, player, (c) => c.state !== "dead");
  if (!quarry) return;

  const pack = player.pack;
  // The best weapon in hand wins: a sword over a spear over a fist. Nothing
  // is ever discarded to make room, so carrying both just means the spear
  // is the one you fall back on when the sword finally gives out.
  const damage = (pack.sword > 0 ? SWORD_DAMAGE : pack.spear > 0 ? SPEAR_DAMAGE : FIST_DAMAGE) + strikeBonus(player.skills);
  const killed = woundCreature(quarry, damage, state.tick, player.id);
  bumpNoise(state, skilledNoise(NOISE_PER_STRIKE, player, "hunting"), player);
  learn(state, player, "hunting", killed ? XP.kill : XP.strike);

  if (pack.sword > 0) {
    pack.sword--;
    if (pack.sword === 0) say(state, "The sword's edge finally gives out. It was a blade, once.");
  } else if (pack.spear > 0) {
    pack.spear--;
    if (pack.spear === 0) say(state, "A spear splinters on the last blow.");
  }

  if (killed) {
    player.kills++;
    say(state, `The ${quarry.kind} goes down. Stand over it and press E.`);
    if (!state.flags.firstKill) {
      state.flags.firstKill = true;
      say(state, "The Grey King: “Blood in the Verge. Good. It makes you easier to follow.”");
    }
  } else if (quarry.kind === "hedge-boar") {
    say(state, "The boar turns on you.");
  }
}

/**
 * F — feed the fire you're standing at, or build a new one. Feeding first
 * is what you meant nine times in ten, and it keeps the verb to one key.
 */
function doBuild(state: SimState, player: Player, px: number, py: number): void {
  const { world } = state;
  const pack = player.pack;

  const lit = fireTileNear(world, player.x, player.y);
  if (lit) {
    if (pack.wood < FIRE_FEED_WOOD) return;
    world.feedFire(lit.x, lit.y, FIRE_FUEL_PER_WOOD);
    pack.wood -= FIRE_FEED_WOOD;
    bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 5), player);
    say(state, "You feed the fire. It answers, and so does the dark.");
    return;
  }

  if (pack.wood < FIRE_WOOD_COST) return;
  if (world.get(px, py) !== Tile.Grass) return;
  world.lightFire(px, py, FIRE_WOOD_COST * FIRE_FUEL_PER_WOOD);
  pack.wood -= FIRE_WOOD_COST;
  bumpNoise(state, NOISE_PER_CRAFT, player);
  say(state, "You build a fire. It will keep you warm. It will also be seen.");
}

function doMakeSpear(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.spear > 0 || pack.wood < SPEAR_WOOD_COST) return;
  pack.wood -= SPEAR_WOOD_COST;
  pack.spear = SPEAR_DURABILITY;
  bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 4), player);
  say(state, "You sharpen a stake into a spear. Three times the bite.");
}

function doCook(state: SimState, player: Player): void {
  const pack = player.pack;
  if (!player.atFire || pack.rawMeat < 1) return;
  pack.rawMeat--;
  pack.cookedMeat++;
  bumpNoise(state, skilledNoise(NOISE_PER_COOK, player, "cooking"), player);
  learn(state, player, "cooking", XP.cook);
  say(state, "Meat over the fire. The smell carries further than the light does.");
}

function doMakeCloak(state: SimState, player: Player): void {
  const pack = player.pack;
  if (!player.atFire || pack.cloak > 0 || pack.hide < CLOAK_HIDE_COST) return;
  pack.hide -= CLOAK_HIDE_COST;
  pack.cloak = cloakDurability(player.skills);
  learn(state, player, "tailoring", XP.stitch);
  say(state, "A hide cloak. The cold takes half as much now.");
}

/** 4 — cooked if you have it, raw if you are desperate. Raw sometimes bites back. */
function doEat(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.cookedMeat > 0) {
    pack.cookedMeat--;
    player.needs.satiety = clamp(player.needs.satiety + mealValue(player.skills), 0, NEED_MAX);
    player.needs.warmth = clamp(player.needs.warmth + 80, 0, NEED_MAX);
    return;
  }
  if (pack.rawMeat > 0) {
    pack.rawMeat--;
    player.needs.satiety = clamp(player.needs.satiety + 120, 0, NEED_MAX);
    if (state.rng.chance(1, 4)) {
      player.health = clamp(player.health - 6, 0, HEALTH_MAX);
      say(state, "Raw meat. It stays down, but not happily.");
    }
  }
}

function doMakeKnife(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.knife > 0 || pack.stone < KNIFE_STONE_COST || pack.wood < KNIFE_WOOD_COST) return;
  pack.stone -= KNIFE_STONE_COST;
  pack.wood -= KNIFE_WOOD_COST;
  pack.knife = KNIFE_DURABILITY;
  bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 4), player);
  say(state, "A flake of stone lashed to a handle. It will take a carcass apart properly.");
}

function doMakeAxe(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.axe > 0 || pack.stone < AXE_STONE_COST || pack.wood < AXE_WOOD_COST) return;
  pack.stone -= AXE_STONE_COST;
  pack.wood -= AXE_WOOD_COST;
  pack.axe = AXE_DURABILITY;
  bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 3), player);
  learn(state, player, "woodcraft", XP.stitch);
  say(state, "An axe. More wood per tree, and fewer strokes to hear.");
}

/** Cordage is the only thing you cannot make without a tool already in hand. */
function doMakeCordage(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.knife < 1 || pack.hide < CORDAGE_HIDE_COST) return;
  pack.hide -= CORDAGE_HIDE_COST;
  pack.cordage += CORDAGE_PER_HIDE;
  learn(state, player, "tailoring", XP.cook);
  say(state, `Hide cut into ${CORDAGE_PER_HIDE} lengths of cord.`);
}

/**
 * 8 — set a snare on open ground. It is the only work in the Verge that
 * keeps paying after you have walked away from it.
 */
function doSetSnare(state: SimState, player: Player, px: number, py: number): void {
  const pack = player.pack;
  // Carrying one and setting one are separate steps: you make it wherever
  // you are and set it where the hares are, which is the whole trapline.
  if (pack.snare < 1) {
    if (pack.cordage < SNARE_CORDAGE_COST || pack.wood < SNARE_WOOD_COST) return;
    pack.cordage -= SNARE_CORDAGE_COST;
    pack.wood -= SNARE_WOOD_COST;
    pack.snare++;
    say(state, "A snare, coiled and ready. Set it somewhere a hare would run.");
    return;
  }
  if (!state.world.setSnare(px, py, player.id)) return;
  learn(state, player, "trapping", XP.snare);
  pack.snare--;
  // Setting one is nearly silent — that is the point of it.
  bumpNoise(state, 10, player);
  say(state, "You set the snare in the grass and step away from it.");
  if (!state.flags.firstSnare) {
    state.flags.firstSnare = true;
    say(state, "The Grey King: “Patience. That is new. I dislike it.”");
  }
}

/** 9 — at a fire, smother wood down to charcoal. Most of the log is heat, not char. */
function doMakeCharcoal(state: SimState, player: Player): void {
  const pack = player.pack;
  if (!player.atFire || pack.wood < CHARCOAL_WOOD_COST) return;
  pack.wood -= CHARCOAL_WOOD_COST;
  pack.charcoal += CHARCOAL_YIELD;
  bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 6), player); // banking a fire down is quiet work
  say(state, "Wood smothered down under ash. What is left burns far hotter than the log did.");
}

/** 0 — at a fire, ore and charcoal become a bar. The one step no tool skips. */
function doSmelt(state: SimState, player: Player): void {
  const pack = player.pack;
  if (!player.atFire || pack.ore < SMELT_ORE_COST || pack.charcoal < SMELT_CHARCOAL_COST) return;
  pack.ore -= SMELT_ORE_COST;
  pack.charcoal -= SMELT_CHARCOAL_COST;
  pack.bar += BAR_YIELD;
  bumpNoise(state, NOISE_PER_CRAFT, player); // a fire hot enough to run ore is not a quiet fire
  say(state, "Ore goes soft, then runs. A bar, dull and heavy, where stone used to be.");
}

/** B — bar, wood and cordage, once each. The sword chain's whole point. */
function doMakeSword(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.sword > 0 || pack.bar < SWORD_BAR_COST || pack.wood < SWORD_WOOD_COST || pack.cordage < SWORD_CORDAGE_COST) return;
  pack.bar -= SWORD_BAR_COST;
  pack.wood -= SWORD_WOOD_COST;
  pack.cordage -= SWORD_CORDAGE_COST;
  pack.sword = SWORD_DURABILITY;
  bumpNoise(state, NOISE_PER_CRAFT, player);
  say(state, "A blade, hafted and bound. Everything else you have made was a stopgap until this.");
  if (!state.flags.firstSword) {
    state.flags.firstSword = true;
    say(state, "The Grey King: “...A sword, in the Verge. That took you longer than it should have — and I noticed every hour of it.”");
  }
}

function cycleOffer(player: Player): void {
  const i = TRADEABLES.indexOf(player.offer);
  player.offer = TRADEABLES[(i + 1) % TRADEABLES.length] ?? "wood";
}

/**
 * G — hand one of whatever you are offering to the nearest other soul.
 *
 * Giving is one-sided on purpose. Two people who each want something the
 * other has will trade by giving twice, and that is enough to answer Stage
 * C's only question: do they? Escrow and a currency are for when the other
 * soul is a stranger, which is a later problem than this one.
 */
function doGive(state: SimState, player: Player): void {
  const pack = player.pack;
  const item = player.offer;
  if (pack[item] < 1) return;

  let recipient: Player | null = null;
  let bestSq = TRADE_RADIUS * TRADE_RADIUS;
  for (const other of state.players) {
    if (other.id === player.id || !other.alive) continue;
    const d = distSq(other.x, other.y, player.x, player.y);
    if (d <= bestSq) {
      bestSq = d;
      recipient = other;
    }
  }
  if (!recipient) return;

  pack[item]--;
  recipient.pack[item]++;
  state.trades.push({ tick: state.tick, from: player.id, to: recipient.id, item });
  say(state, `Soul #${player.lineage} hands Soul #${recipient.lineage} one ${item}.`);
  if (!state.flags.firstTrade) {
    state.flags.firstTrade = true;
    say(state, "The Grey King: “You are giving things away. To each other. How new.”");
  }
}

function nearestCreature(state: SimState, player: Player, pick: (c: Creature) => boolean): Creature | null {
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

/** Practice, and a word when it shows. */
function learn(state: SimState, player: Player, skill: Skill, xp: number): void {
  if (!gain(player.skills, skill, xp)) return;
  say(state, `Soul #${player.lineage}'s hands know the work better — ${skill} ${level(player.skills[skill])}.`);
}

/** Noise for an action, reduced by how well the soul does it. */
function skilledNoise(base: number, player: Player, skill: Skill): number {
  return Math.trunc((base * noiseScale(player.skills, skill)) / 100);
}

function bumpNoise(state: SimState, amount: number, source: Player): void {
  state.noise = clamp(state.noise + amount, 0, NOISE_MAX);
  state.noiseX = source.x;
  state.noiseY = source.y;
}

function tickLieutenant(state: SimState): void {
  const { lieutenant, world, rng } = state;
  const night = isNight(state.tick);
  const detectionRadius =
    BASE_DETECTION_RADIUS +
    Math.trunc((NOISE_DETECTION_SCALE * state.noise) / NOISE_MAX) +
    (night ? NIGHT_DETECTION_BONUS : 0);

  // He hunts one soul at a time — the nearest living one inside his reach.
  // With several in the Verge that makes proximity to another player a real
  // risk and a real shield at once, which is the first genuinely social
  // thing in this prototype.
  // A marked soul is wanted above all others, wherever they are (§3.5).
  const markedSoul = state.players[state.marked];
  if (markedSoul && markedSoul.alive && markedSoul.graceUntil <= state.tick) {
    lieutenant.state = "hunt";
    lieutenant.target = markedSoul.id;
  }

  let nearest: Player | null = null;
  let nearestSq = Number.MAX_SAFE_INTEGER;
  for (const p of state.players) {
    if (!p.alive || p.graceUntil > state.tick) continue;
    const d = distSq(lieutenant.x, lieutenant.y, p.x, p.y);
    if (d < nearestSq) {
      nearestSq = d;
      nearest = p;
    }
  }

  const resting = state.tick < lieutenant.restUntil;

  if (!resting && lieutenant.state === "patrol" && nearest && nearestSq <= detectionRadius * detectionRadius) {
    lieutenant.state = "hunt";
    lieutenant.target = nearest.id;
    if (!state.flags.firstSighting) {
      state.flags.firstSighting = true;
      say(state, "The Grey King: “One of my Lieutenants has your scent. Run, if you think it will help.”");
    }
  } else if (lieutenant.state === "hunt") {
    const hunted = state.players[lieutenant.target];
    const goneSq = hunted && hunted.alive ? distSq(lieutenant.x, lieutenant.y, hunted.x, hunted.y) : Number.MAX_SAFE_INTEGER;
    if (goneSq > LOSE_INTEREST_RADIUS * LOSE_INTEREST_RADIUS) {
      lieutenant.state = "patrol";
      lieutenant.target = -1;
      lieutenant.waypointX = lieutenant.x;
      lieutenant.waypointY = lieutenant.y;
    }
  }

  let targetX: number;
  let targetY: number;
  const hunted = state.players[lieutenant.target];
  if (lieutenant.state === "hunt" && hunted) {
    targetX = hunted.x;
    targetY = hunted.y;
  } else if (state.noise >= CROW_THRESHOLD && !resting) {
    // He does not need to see you. He needs to see the birds — which is the
    // whole design in one line: what you build is what gives you away.
    // Unless he has just killed someone, in which case the birds over that
    // body are the last thing that should be holding him in place.
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
