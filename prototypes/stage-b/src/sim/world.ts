/**
 * The Verge — the only Realm that exists yet (Stage B cut list, §44).
 *
 * A single small zone, generated deterministically from a seed so that a
 * given seed always produces the same map. No terraforming, no ecology
 * population math, no second biome — a grid of tiles and nothing more.
 */
import { Rng } from "./rng.js";

export const WORLD_W = 24;
export const WORLD_H = 16;

export enum Tile {
  Grass = 0,
  Tree = 1,
  Stump = 2, // a harvested tree; regrows after RESPAWN_TICKS
  Water = 3,
  Bush = 4,
  BareBush = 5, // a picked-clean bush; regrows after RESPAWN_TICKS
  Campfire = 6, // player-built
}

export function isSolid(t: Tile): boolean {
  return t === Tile.Tree || t === Tile.Water || t === Tile.Campfire;
}

export interface Resource {
  tile: Tile; // Stump or BareBush — what it reverts from
  regrowTo: Tile; // Tree or Bush — what it reverts to
  readyAtTick: number;
}

export class World {
  readonly tiles: Tile[];
  readonly resources: Map<number, Resource> = new Map();

  constructor(seed: number) {
    const rng = new Rng(seed);
    this.tiles = new Array(WORLD_W * WORLD_H).fill(Tile.Grass);

    for (let y = 0; y < WORLD_H; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        // Keep a clearing around the arrival point so a new soul doesn't
        // wash up standing inside a tree.
        if (Math.abs(x - 3) <= 1 && Math.abs(y - 3) <= 1) continue;

        const roll = rng.nextInt(100);
        if (roll < 14) this.set(x, y, Tile.Tree);
        else if (roll < 19) this.set(x, y, Tile.Water);
        else if (roll < 26) this.set(x, y, Tile.Bush);
      }
    }
  }

  index(x: number, y: number): number {
    return y * WORLD_W + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H;
  }

  get(x: number, y: number): Tile {
    if (!this.inBounds(x, y)) return Tile.Water; // treat off-map as impassable
    return this.tiles[this.index(x, y)]!;
  }

  set(x: number, y: number, t: Tile): void {
    this.tiles[this.index(x, y)] = t;
  }

  /** Harvest a Tree or Bush at (x, y); schedules regrowth. No-op if not harvestable. */
  harvest(x: number, y: number, currentTick: number, regrowTicks: number): boolean {
    const t = this.get(x, y);
    if (t === Tile.Tree) {
      this.set(x, y, Tile.Stump);
      this.resources.set(this.index(x, y), { tile: Tile.Stump, regrowTo: Tile.Tree, readyAtTick: currentTick + regrowTicks });
      return true;
    }
    if (t === Tile.Bush) {
      this.set(x, y, Tile.BareBush);
      this.resources.set(this.index(x, y), { tile: Tile.BareBush, regrowTo: Tile.Bush, readyAtTick: currentTick + regrowTicks });
      return true;
    }
    return false;
  }

  tickRegrowth(currentTick: number): void {
    for (const [idx, res] of this.resources) {
      if (currentTick >= res.readyAtTick) {
        this.tiles[idx] = res.regrowTo;
        this.resources.delete(idx);
      }
    }
  }
}
