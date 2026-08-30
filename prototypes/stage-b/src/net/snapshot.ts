/**
 * What the server tells a client about the world, each tick — and, now that
 * the Verge is nine times its original size, what it deliberately does not
 * tell them.
 *
 * **Terrain and sound stay global.** The tile grid and fires are still sent
 * whole (about 22 KB of JSON at 10 Hz now, ~225 KB/s per player — up from
 * the original ~25 KB/s, and still not worth optimising at this scale). So
 * are `noise`/`crowX`/`crowY`: those represent the Verge being *heard*, not
 * *seen* (§1's thesis), and a single shared flock has no notion of "visible
 * to whom" to filter against anyway.
 *
 * **Bodies do not.** Every other player, every creature and the Lieutenant
 * are cut to whatever is within `VISIBILITY_RADIUS` of the soul this
 * snapshot is for. That is what makes the camera in render.ts more than a
 * cropped view of information the client had the whole time — a soul across
 * the map cannot be found by reading the wire any more than by looking at
 * the screen. It costs the one thing full broadcast bought for free: this
 * snapshot is now per-viewer, so the server builds one per connected socket
 * instead of one for everyone.
 *
 * The sim tier does not import this file, and this file does not touch the
 * DOM — it is the seam between the two.
 */
import { distSq, TILE } from "../sim/fixed.js";
import { SimState } from "../sim/tick.js";
import { World, Tile } from "../sim/world.js";
import { Player, Lieutenant } from "../sim/entities.js";
import { Creature } from "../sim/creatures.js";
import { Npc } from "../sim/npc.js";

/**
 * Comfortably past the camera's far edge (render.ts's viewport is 24x16
 * tiles, so a 16-tile radius already covers it corner to corner) so nothing
 * a player would otherwise see on screen pops into existence mid-frame.
 */
export const VISIBILITY_RADIUS = TILE * 16;

export interface Snapshot {
  tick: number;
  tiles: Tile[];
  fires: [number, number][];
  /** Sparse, indexed by player id — a slot is `null` for a soul not currently visible to this viewer. The viewer's own slot is always present. */
  players: (Player | null)[];
  /** `null` when he is nowhere near enough to be seen. */
  lieutenant: Lieutenant | null;
  creatures: Creature[];
  /** Fogged the same as creatures — a villager is a body like any other, not a fixture of the terrain. */
  npcs: Npc[];
  noise: number;
  noiseX: number;
  noiseY: number;
  crowX: number;
  crowY: number;
  log: string[];
  trades: number; // just the count — the ledger itself lives on the server
}

/** A snapshot of `state`, fogged to what `viewerId` can actually see. */
export function snapshot(state: SimState, viewerId: number): Snapshot {
  const viewer = state.players[viewerId];
  // A socket between "connected" and "has a body" (mid-join) sees nothing
  // hidden rather than crashing on a viewer that doesn't exist yet.
  const visible = (x: number, y: number): boolean =>
    !viewer || distSq(viewer.x, viewer.y, x, y) <= VISIBILITY_RADIUS * VISIBILITY_RADIUS;

  return {
    tick: state.tick,
    tiles: state.world.tiles.slice(),
    fires: [...state.world.fires],
    players: state.players.map((p) => (p.id === viewerId || (p.alive && visible(p.x, p.y)) ? p : null)),
    lieutenant: visible(state.lieutenant.x, state.lieutenant.y) ? state.lieutenant : null,
    creatures: state.creatures.filter((c) => visible(c.x, c.y)),
    npcs: state.npcs.filter((n) => visible(n.x, n.y)),
    noise: state.noise,
    noiseX: state.noiseX,
    noiseY: state.noiseY,
    crowX: state.crowX,
    crowY: state.crowY,
    log: state.log.slice(-4),
    trades: state.trades.length,
  };
}

/** The world as a client sees it: a real World, so the renderer is none the wiser. */
export function worldFrom(snap: Snapshot, seed: number): World {
  return World.restore(seed, snap.tiles, snap.fires);
}
