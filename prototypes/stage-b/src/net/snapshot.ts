/**
 * What the server tells a client about the world, each tick.
 *
 * The Verge is 24x16 tiles with six beasts in it, so the honest thing to do
 * at this size is send all of it: about 2.5 KB of JSON at 10 Hz, which is
 * 25 KB/s per player and not worth optimising until it is. Sending whole
 * state rather than a stream of deltas means a client that joins late, lags,
 * or reconnects is correct on the very next tick with no reconciliation
 * code at all.
 *
 * The sim tier does not import this file, and this file does not touch the
 * DOM — it is the seam between the two.
 */
import { SimState } from "../sim/tick.js";
import { World, Tile } from "../sim/world.js";
import { Player, Lieutenant } from "../sim/entities.js";
import { Creature } from "../sim/creatures.js";

export interface Snapshot {
  tick: number;
  tiles: Tile[];
  fires: [number, number][];
  players: Player[];
  lieutenant: Lieutenant;
  creatures: Creature[];
  noise: number;
  noiseX: number;
  noiseY: number;
  crowX: number;
  crowY: number;
  log: string[];
  trades: number; // just the count — the ledger itself lives on the server
}

export function snapshot(state: SimState): Snapshot {
  return {
    tick: state.tick,
    tiles: state.world.tiles.slice(),
    fires: [...state.world.fires],
    players: state.players,
    lieutenant: state.lieutenant,
    creatures: state.creatures,
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
