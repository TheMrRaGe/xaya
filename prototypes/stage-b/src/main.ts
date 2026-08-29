/**
 * Stage B/C — "the smallest loop that can kill you" (plan §44), now with
 * room for more than one soul in it.
 *
 * One zone (the Verge). Gather wood, drink, eat, hunt, build a fire, cook
 * what you killed, stitch what you skinned, and hand what you have spare to
 * whoever is standing next to you. Hunger, thirst and cold all tick. Deer
 * run from you, boar run at you, and one Lieutenant hunts whichever soul is
 * nearest — guided by the crows that gather over everything loud you do.
 * Permadeath, with a Barrow-list that remembers every soul before this one.
 *
 * This file is the *client*: it owns the keyboard, the canvas and nothing
 * else. The sim runs locally for now, which is one of the three authorities
 * DESIGN §6.8 describes — a server or a chain slots in here without the sim
 * tier noticing.
 */
import { WORLD_W, WORLD_H } from "./sim/world.js";
import { TILE_PX, drawWorld, drawEntities, drawNight, drawHud, drawDeathScreen } from "./render/render.js";
import { newSim, stepTick, TICK_HZ, Input, NO_INPUT, SimState } from "./sim/tick.js";
import { newPlayer } from "./sim/entities.js";
import { loadBarrowList, recordDeath, nextLineage, Obituary } from "./persist/lineage.js";

const HUD_H = 140;
const canvas = document.getElementById("game") as HTMLCanvasElement;
canvas.width = WORLD_W * TILE_PX;
canvas.height = WORLD_H * TILE_PX + HUD_H;
const ctx = canvas.getContext("2d")!;

// A fixed seed keeps the Verge itself the same every run — only what
// happens to you in it changes. Change this to reroll the map.
const WORLD_SEED = 0xc0ffee;

/** Which soul this client drives. Every other soul in `players` is someone else. */
const LOCAL_ID = 0;

let state: SimState = startRun();
let lastDeath: Obituary | null = null;
let barrowList = loadBarrowList();

function startRun(): SimState {
  const lineage = nextLineage();
  return newSim(WORLD_SEED, [newPlayer(lineage, LOCAL_ID)]);
}

/**
 * Presses are latched here and consumed by exactly one tick, so a verb
 * fires once per keypress no matter what the frame rate is doing.
 */
const held = new Set<string>();
const pressed = new Set<string>();

const VERB_KEYS = ["e", " ", "f", "1", "2", "3", "4", "t", "g"];

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  held.add(key);
  if (VERB_KEYS.includes(key)) {
    pressed.add(key);
    if (key === " ") e.preventDefault(); // space scrolls the page otherwise
  }
  if (lastDeath) respawn();
});
window.addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));

function respawn(): void {
  state = startRun();
  lastDeath = null;
  pressed.clear();
}

function readInput(): Input {
  let dx: -1 | 0 | 1 = 0;
  let dy: -1 | 0 | 1 = 0;
  if (held.has("arrowleft") || held.has("a")) dx = -1;
  else if (held.has("arrowright") || held.has("d")) dx = 1;
  if (held.has("arrowup") || held.has("w")) dy = -1;
  else if (held.has("arrowdown") || held.has("s")) dy = 1;

  const input: Input = {
    ...NO_INPUT,
    dx,
    dy,
    gather: pressed.has("e"),
    strike: pressed.has(" "),
    build: pressed.has("f"),
    makeSpear: pressed.has("1"),
    cook: pressed.has("2"),
    makeCloak: pressed.has("3"),
    eat: pressed.has("4"),
    cycleOffer: pressed.has("t"),
    give: pressed.has("g"),
  };
  pressed.clear();
  return input;
}

const TICK_MS = 1000 / TICK_HZ;
let accumulator = 0;
let lastFrame = performance.now();

function frame(now: number): void {
  const delta = now - lastFrame;
  lastFrame = now;
  // A backgrounded tab hands back a huge delta on return; catching up on
  // thirty seconds of ticks at once is how a soul dies in a loading screen.
  accumulator = Math.min(accumulator + delta, TICK_MS * 10);

  if (!lastDeath) {
    while (accumulator >= TICK_MS) {
      const inputs: Input[] = state.players.map((p) => (p.id === LOCAL_ID ? readInput() : NO_INPUT));
      for (const death of stepTick(state, inputs)) {
        if (death.id !== LOCAL_ID) continue;
        lastDeath = {
          lineage: death.lineage,
          cause: death.cause,
          tick: death.tick,
          wood: death.wood,
          kills: death.kills,
        };
        barrowList = recordDeath(lastDeath);
      }
      accumulator -= TICK_MS;
    }
  }

  const local = state.players[LOCAL_ID]!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWorld(ctx, state.world, state.tick);
  drawEntities(ctx, state, LOCAL_ID);
  drawNight(ctx, WORLD_W * TILE_PX, WORLD_H * TILE_PX, state.tick);
  drawHud(ctx, state, local, WORLD_H * TILE_PX, canvas.width, HUD_H);
  if (lastDeath) drawDeathScreen(ctx, canvas.width, canvas.height, lastDeath, barrowList);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
