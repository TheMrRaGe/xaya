/**
 * Stage B — "the smallest loop that can kill you" (plan §44).
 *
 * One zone (the Verge). Gather wood, drink, eat, hunt, build a fire, cook
 * what you killed, stitch what you skinned. Hunger, thirst and cold all
 * tick. Deer run from you, boar run at you, and one Lieutenant hunts you —
 * guided by the crows that gather over everything loud you do. Permadeath,
 * with a Barrow-list that remembers every soul that came before this one.
 *
 * This is deliberately not the full game — see the Stage B cut list in the
 * plan. It exists to answer one question: does dying hurt, and do you
 * start again anyway?
 */
import { WORLD_W, WORLD_H } from "./sim/world.js";
import { TILE_PX, drawWorld, drawEntities, drawNight, drawHud, drawDeathScreen } from "./render/render.js";
import { newSim, stepTick, TICK_HZ, Input, SimState } from "./sim/tick.js";
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

let lineage = nextLineage();
let state: SimState = newSim(WORLD_SEED, lineage, newPlayer(lineage));
let lastDeath: Obituary | null = null;
let barrowList = loadBarrowList();

/**
 * Presses are latched here and consumed by exactly one tick, so a verb
 * fires once per keypress no matter what the frame rate is doing.
 */
const held = new Set<string>();
const pressed = new Set<string>();

const VERB_KEYS = ["e", " ", "f", "1", "2", "3", "4"];

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
  lineage = nextLineage();
  state = newSim(WORLD_SEED, lineage, newPlayer(lineage));
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
    dx,
    dy,
    gather: pressed.has("e"),
    strike: pressed.has(" "),
    build: pressed.has("f"),
    makeSpear: pressed.has("1"),
    cook: pressed.has("2"),
    makeCloak: pressed.has("3"),
    eat: pressed.has("4"),
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
      const death = stepTick(state, readInput());
      if (death) {
        lastDeath = {
          lineage: state.player.lineage,
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

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWorld(ctx, state.world, state.tick);
  drawEntities(ctx, state);
  drawNight(ctx, WORLD_W * TILE_PX, WORLD_H * TILE_PX, state.tick);
  drawHud(ctx, state, WORLD_H * TILE_PX, canvas.width, HUD_H);
  if (lastDeath) drawDeathScreen(ctx, canvas.width, canvas.height, lastDeath, barrowList);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
