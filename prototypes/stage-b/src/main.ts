/**
 * Stage B — "the smallest loop that can kill you" (doc/world/PLAN.md §44).
 *
 * One zone (the Verge). Gather wood, drink, eat berries, build a fire.
 * Hunger, thirst and cold all tick. One Lieutenant hunts you, and hunting
 * you is louder the more you've built. Permadeath, with a Barrow-list that
 * remembers every soul that came before this one.
 *
 * This is deliberately not the full game — see the Stage B cut list in
 * doc/world/PLAN.md §44. It exists to answer one question: does dying
 * hurt, and do you start again anyway?
 *
 * Section numbers cited throughout this file (§N) refer to doc/world/PLAN.md.
 */
import { WORLD_W, WORLD_H } from "./sim/world.js";
import { TILE_PX, drawWorld, drawEntities, drawNight, drawHud, drawDeathScreen } from "./render/render.js";
import { newSim, stepTick, TICK_HZ, Input, SimState } from "./sim/tick.js";
import { newPlayer } from "./sim/entities.js";
import { loadBarrowList, recordDeath, nextLineage, Obituary } from "./persist/lineage.js";

const HUD_H = 110;
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

const held = new Set<string>();
let gatherRequested = false;
let craftRequested = false;

window.addEventListener("keydown", (e) => {
  held.add(e.key.toLowerCase());
  if (e.key.toLowerCase() === "e") gatherRequested = true;
  if (e.key.toLowerCase() === "f") craftRequested = true;
  if (lastDeath) respawn();
});
window.addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));

function respawn(): void {
  lineage = nextLineage();
  state = newSim(WORLD_SEED, lineage, newPlayer(lineage));
  lastDeath = null;
}

function readInput(): Input {
  let dx: -1 | 0 | 1 = 0;
  let dy: -1 | 0 | 1 = 0;
  if (held.has("arrowleft") || held.has("a")) dx = -1;
  else if (held.has("arrowright") || held.has("d")) dx = 1;
  if (held.has("arrowup") || held.has("w")) dy = -1;
  else if (held.has("arrowdown") || held.has("s")) dy = 1;

  const gather = gatherRequested;
  const craft = craftRequested;
  gatherRequested = false;
  craftRequested = false;
  return { dx, dy, gather, craft };
}

const TICK_MS = 1000 / TICK_HZ;
let accumulator = 0;
let lastFrame = performance.now();

function frame(now: number): void {
  const delta = now - lastFrame;
  lastFrame = now;
  accumulator += delta;

  if (!lastDeath) {
    while (accumulator >= TICK_MS) {
      const death = stepTick(state, readInput());
      if (death) {
        lastDeath = { lineage: state.player.lineage, cause: death.cause, tick: death.tick, wood: death.wood };
        barrowList = recordDeath(lastDeath);
      }
      accumulator -= TICK_MS;
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWorld(ctx, state.world);
  drawEntities(ctx, state);
  drawNight(ctx, WORLD_W * TILE_PX, WORLD_H * TILE_PX, state.tick);
  drawHud(ctx, state, WORLD_H * TILE_PX, canvas.width, HUD_H);
  if (lastDeath) drawDeathScreen(ctx, canvas.width, canvas.height, lastDeath, barrowList);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
