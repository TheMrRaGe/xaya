/**
 * The authority.
 *
 * One Verge, one sim, one process. Clients send what they are pressing and
 * are told what is true; nothing a client says is trusted beyond "these
 * keys are down." That is the arrangement DESIGN §6.8 asks for — the sim
 * tier does not know a server exists, and this file does not know a
 * renderer exists — and it is the same arrangement a chain would want, with
 * a cheaper answer to "who decides."
 *
 * Whole state goes out every tick — terrain and sound to everyone, bodies
 * fogged per viewer (see net/snapshot.ts) — so a client that joins late,
 * lags, or reconnects is correct on the next tick with no reconciliation
 * code, and can never learn where anything is by simply lagging less.
 */
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { staticHandler } from "./serve.mjs";
import { newSim, stepTick, addSoul, replaceSoul, TICK_HZ, NO_INPUT } from "./dist/sim/tick.js";
import { snapshot } from "./dist/net/snapshot.js";
import { createOverlord } from "./overlord.mjs";
import { isNight, CROW_THRESHOLD } from "./dist/sim/tick.js";
import { pressure, offers, chooseByWeight, applyAction, IDLE_PRESSURE } from "./dist/sim/director.js";
import { loadBarrow, saveBarrow } from "./barrow.mjs";

const PORT = Number(process.env.PORT) || 8000;
const WORLD_SEED = 0xc0ffee;
const TICK_MS = 1000 / TICK_HZ;
const BARROW_PATH = fileURLToPath(new URL("./data/barrow.json", import.meta.url));

const state = newSim(WORLD_SEED, []);

/**
 * The Barrow-list: every soul this Verge has ever buried, and the counter
 * lineage numbers are drawn from. One copy, owned by the server, on disk —
 * not a browser's localStorage (one soul's own deaths, gone if site data is
 * cleared) and not an in-memory array (every soul's deaths, gone on
 * restart). "A board of its dead" means nothing if the board resets every
 * time the game does.
 */
const { barrow, nextLineage: loadedLineage } = await loadBarrow(BARROW_PATH);
let nextLineage = loadedLineage;
console.log(`the Barrow-list remembers ${barrow.length} soul${barrow.length === 1 ? "" : "s"}`);

/** id -> socket, for the souls that still have someone driving them. */
const sockets = new Map();
/** id -> the input being accumulated for the next tick. */
const pending = new Map();

/**
 * The Grey King watches. He cannot touch the world — he only reads the same
 * notices the players do and says something about them (DESIGN §3.3).
 */
let logRead = 0;
let menu = [];

function announce(line) {
  state.log.push(`The Grey King: “${line}”`);
  if (state.log.length > 40) state.log.shift();
}

const overlord = await createOverlord(announce, ({ offerId, line }) => {
  // He proposes; the authority disposes. An id that was not on the menu is
  // refused and the weighted choice stands in for it (DESIGN §3.2).
  const chosen = menu.find((offer) => offer.id === offerId) ?? chooseByWeight(menu, state.rng);
  applyAction(state, chosen.action);
  state.incidents.push({ tick: state.tick, action: chosen.action, why: line });
  if (chosen.action.kind !== "nothing") {
    console.log(`incident: ${chosen.action.kind} — ${line}`);
  }
  announce(line || overlord.lineFor(chosen.action.kind));
});

function freshInput() {
  return { ...NO_INPUT };
}

// Where a soul arrives, and who is allowed to notice it, are decisions the
// sim makes — the server only says that a soul is arriving.
function joinSoul() {
  const player = addSoul(state, nextLineage++);
  pending.set(player.id, freshInput());
  return player;
}

function respawnSoul(id) {
  const fresh = replaceSoul(state, id, nextLineage++);
  pending.set(id, freshInput());
  return fresh;
}

const server = createServer(staticHandler());
const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  const player = joinSoul();
  const id = player.id;
  sockets.set(id, socket);
  console.log(`soul #${player.lineage} joined as player ${id} (${sockets.size} playing)`);

  // The last hundred deaths are plenty for a death screen to feel like a
  // real board rather than a live feed — the file on disk keeps all of them.
  socket.send(
    JSON.stringify({ t: "welcome", id, seed: WORLD_SEED, tickHz: TICK_HZ, barrow: barrow.slice(-100) }),
  );

  socket.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // a client that sends nonsense is simply not heard
    }

    if (msg.t === "in") {
      const input = pending.get(id) ?? freshInput();
      // Movement is whatever is held right now; verbs latch until the tick
      // consumes them, so a press between ticks is never swallowed.
      input.dx = msg.dx === -1 || msg.dx === 1 ? msg.dx : 0;
      input.dy = msg.dy === -1 || msg.dy === 1 ? msg.dy : 0;
      for (const verb of Array.isArray(msg.verbs) ? msg.verbs : []) {
        if (verb in NO_INPUT && verb !== "dx" && verb !== "dy") input[verb] = true;
      }
      pending.set(id, input);
      return;
    }

    if (msg.t === "respawn") {
      const current = state.players[id];
      if (current && !current.alive) {
        const soul = respawnSoul(id);
        console.log(`soul #${soul.lineage} takes player ${id}'s place`);
      }
    }
  });

  socket.on("close", () => {
    sockets.delete(id);
    pending.delete(id);
    // A soul with nobody driving it is lost rather than left standing in a
    // field — otherwise every page reload leaves a body in the Verge. The
    // slot itself is never reused, so ids stay stable for everyone still
    // playing, and a reconnect is simply a new soul.
    const abandoned = state.players[id];
    if (abandoned && abandoned.alive) {
      abandoned.alive = false;
      state.log.push(`Soul #${abandoned.lineage} is gone from the Verge.`);
    }
    console.log(`player ${id} disconnected (${sockets.size} playing)`);
  });
});

setInterval(() => {
  const inputs = state.players.map((p) => pending.get(p.id) ?? NO_INPUT);
  const deaths = stepTick(state, inputs);
  for (const [id, input] of pending) pending.set(id, { ...input, ...verbsCleared() });

  for (const death of deaths) {
    barrow.push(death);
    overlord.noteDeath(death);
    console.log(`soul #${death.lineage} — ${death.cause} at tick ${death.tick}`);
  }
  if (deaths.length > 0) {
    // Fire-and-forget: a save failing must not stop the world, and nothing
    // downstream reads the file back before the next death appends to it in
    // memory regardless of whether the write has landed yet.
    void saveBarrow(BARROW_PATH, barrow, nextLineage).catch((err) => {
      console.log(`could not save the Barrow-list (${err.message})`);
    });
  }

  // Everything the world told the players, he also hears. The log is a
  // ring buffer, so an index into it can go stale when it trims.
  if (logRead > state.log.length) logRead = Math.max(0, state.log.length - 8);
  for (; logRead < state.log.length; logRead++) overlord.note(state.log[logRead]);
  // Pressure is cheap and touches no randomness, so it is read every tick.
  // The menu is not, so it is built only when he is actually due to act.
  const points = pressure(state);
  const due = overlord.ready() && points >= IDLE_PRESSURE;
  menu = due ? offers(state, points) : [];
  overlord.consider(
    {
      night: isNight(state.tick),
      souls: state.players.filter((p) => p.alive).length,
      crows: state.noise >= CROW_THRESHOLD,
      pressure: points,
    },
    menu,
  );

  // One snapshot per socket, not one for everyone — a fogged view is a
  // personal one, so the JSON now differs by who is asking (net/snapshot.ts).
  for (const [id, socket] of sockets) {
    if (socket.readyState !== socket.OPEN) continue;
    const snap = snapshot(state, id);
    socket.send(JSON.stringify({ t: "state", snap, deaths, souls: sockets.size }));
  }
}, TICK_MS);

function verbsCleared() {
  const cleared = {};
  for (const key of Object.keys(NO_INPUT)) {
    if (key !== "dx" && key !== "dy") cleared[key] = false;
  }
  return cleared;
}

// Local-only by default. `HOST=0.0.0.0 npm start` opens it to the network,
// which is what you want for two machines and not what you want by accident.
const HOST = process.env.HOST || "127.0.0.1";

server.listen(PORT, HOST, () => {
  console.log(`The Verge is open at http://localhost:${PORT}/`);
  console.log("Open it in two tabs and you have two souls in one world.");
  if (HOST === "127.0.0.1") console.log("For two machines: HOST=0.0.0.0 npm start");
});
