/**
 * The client, for Stage B — "the smallest loop that can kill you"
 * (doc/world/PLAN.md §44). It owns the keyboard and the canvas and nothing
 * else.
 *
 * It runs no sim. The server decides what is true and says so ten times a
 * second; this file draws whatever it was told and reports which keys are
 * down. That split is DESIGN §6.8's whole point — swap the authority for a
 * chain and neither the renderer nor `src/sim/` notices — and it is also
 * the only honest way to have two people in one Verge.
 *
 * This is deliberately not the full game — see the Stage B cut list in
 * doc/world/PLAN.md §44. It exists to answer one question: does dying
 * hurt, and do you start again anyway?
 */
import { WORLD_W, WORLD_H, World } from "./sim/world.js";
import { TILE_PX, ViewState, drawWorld, drawEntities, drawNight, drawHud, drawDeathScreen } from "./render/render.js";
import { Snapshot } from "./net/snapshot.js";
import { DeathEvent } from "./sim/tick.js";

const HUD_H = 165;
const canvas = document.getElementById("game") as HTMLCanvasElement;
canvas.width = WORLD_W * TILE_PX;
canvas.height = WORLD_H * TILE_PX + HUD_H;
const ctx = canvas.getContext("2d")!;

let myId = -1;
let seed = 0;
let snap: Snapshot | null = null;
let world: World | null = null;
let lastDeath: DeathEvent | null = null;
/**
 * "A board of its dead" only means something if it is one board everyone
 * shares. This used to be a browser's own localStorage — one soul's own
 * deaths, in one browser, gone if the site data was cleared, and silent
 * about everyone else's. The server now owns the real list on disk; this is
 * just the client's copy, seeded from history at connect and grown by every
 * death broadcast from then on, not only this soul's own.
 */
let barrowList: DeathEvent[] = [];
let connection = "connecting to the Verge...";

const socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`);

socket.addEventListener("open", () => {
  connection = "";
});

socket.addEventListener("close", () => {
  connection = "the Verge is unreachable — is the server still running?";
});

socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data as string);
  if (msg.t === "welcome") {
    myId = msg.id;
    seed = msg.seed;
    barrowList = (msg.barrow as DeathEvent[]) ?? [];
    return;
  }
  if (msg.t !== "state") return;

  snap = msg.snap as Snapshot;
  world = World.restore(seed, snap.tiles, snap.fires);
  publishDebug(snap);

  for (const death of msg.deaths as DeathEvent[]) {
    // Every soul's death joins the shared board, not only this one's own —
    // that is the whole difference between a board and a private diary.
    barrowList.push(death);
    if (death.id === myId) lastDeath = death;
  }
});

/**
 * Movement is whatever is held. Verbs latch until they are sent, so a press
 * between two sends is never swallowed by a frame boundary.
 */
const held = new Set<string>();
let verbs = new Set<string>();

const VERBS: Record<string, string> = {
  e: "gather",
  " ": "strike",
  f: "build",
  "1": "makeSpear",
  "2": "cook",
  "3": "makeCloak",
  "4": "eat",
  t: "cycleOffer",
  g: "give",
};

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  held.add(key);
  const verb = VERBS[key];
  if (verb) {
    verbs.add(verb);
    if (key === " ") e.preventDefault(); // space scrolls the page otherwise
  }
  if (lastDeath) {
    socket.send(JSON.stringify({ t: "respawn" }));
    lastDeath = null;
    verbs = new Set();
  }
});
window.addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));

// Twice the tick rate, so the server always has something current to use
// and a dropped packet costs at most half a tick of movement.
setInterval(() => {
  if (socket.readyState !== WebSocket.OPEN) return;
  let dx = 0;
  let dy = 0;
  if (held.has("arrowleft") || held.has("a")) dx = -1;
  else if (held.has("arrowright") || held.has("d")) dx = 1;
  if (held.has("arrowup") || held.has("w")) dy = -1;
  else if (held.has("arrowdown") || held.has("s")) dy = 1;

  socket.send(JSON.stringify({ t: "in", dx, dy, verbs: [...verbs] }));
  verbs = new Set();
}, 50);

/**
 * A readout for whoever is testing this, stamped on the canvas element
 * rather than hung off `window` — a headless browser driving the page from
 * an isolated world can see the DOM but not our globals.
 */
function publishDebug(current: Snapshot): void {
  canvas.dataset.verge = JSON.stringify({
    id: myId,
    tick: current.tick,
    souls: current.players.length,
    me: myId >= 0 ? current.players[myId] : null,
    others: current.players.filter((p) => p.id !== myId).map((p) => ({ id: p.id, x: p.x, y: p.y, alive: p.alive })),
    lieutenant: { x: current.lieutenant.x, y: current.lieutenant.y, state: current.lieutenant.state },
    trades: current.trades,
  });
}

function drawWaiting(text: string): void {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#8a8a8a";
  ctx.font = "14px monospace";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  ctx.textAlign = "left";
}

function frame(): void {
  requestAnimationFrame(frame);

  if (!snap || !world || myId < 0) {
    drawWaiting(connection || "waiting for the first tick...");
    return;
  }

  const view: ViewState = snap;
  const me = snap.players[myId];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWorld(ctx, world, snap.tick);
  drawEntities(ctx, view, myId);
  drawNight(ctx, WORLD_W * TILE_PX, WORLD_H * TILE_PX, snap.tick);
  if (me) drawHud(ctx, view, me, WORLD_H * TILE_PX, canvas.width, HUD_H);
  if (lastDeath) drawDeathScreen(ctx, canvas.width, canvas.height, lastDeath, barrowList);
  if (connection) drawWaiting(connection);
}

requestAnimationFrame(frame);
