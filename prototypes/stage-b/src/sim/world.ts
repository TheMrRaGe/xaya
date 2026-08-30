/**
 * The Verge — the only Realm that exists yet (Stage B cut list, doc/world/PLAN.md §44).
 *
 * A single small zone, generated deterministically from a seed so that a
 * given seed always produces the same map. No terraforming, no ecology
 * population math, no second biome — a grid of tiles and nothing more.
 */
import { Rng } from "./rng.js";
import { clamp } from "./fixed.js";

/**
 * Nine times the original Verge's footprint — three screens by three
 * screens, where a "screen" is the 24x16-tile window the camera actually
 * shows (`VIEW_W`/`VIEW_H` in render.ts). The ratio is exact on purpose: it
 * is what lets the creature roster and the render/network code below reason
 * about "how much bigger is this than the original Verge" as one clean
 * number instead of two independent ones that happen to drift apart.
 */
export const WORLD_W = 72;
export const WORLD_H = 48;

export enum Tile {
  Grass = 0,
  Tree = 1,
  Stump = 2, // a harvested tree; regrows after RESPAWN_TICKS
  Water = 3,
  Bush = 4,
  BareBush = 5, // a picked-clean bush; regrows after RESPAWN_TICKS
  Campfire = 6, // player-built, and burns down
  Ash = 7, // a fire that went out; grass takes it back
  /**
   * A rock outcrop. Unlike a tree it does not run out — you chip stone off
   * it and it is still a rock — so stone is never scarce. What it costs is
   * attention: hammering stone is the loudest work in the Verge, which puts
   * it on the same thesis as everything else here rather than on a
   * respawn timer.
   */
  Rock = 8,
  /** A set snare, waiting. Catches what walks onto it, then it is spent. */
  Snare = 9,
  /**
   * A vein of ore. Same rule as Rock — it never runs out — but rarer and
   * louder to work, because it sits at the top of the one crafting chain
   * doc/world/PLAN.md §15 actually names for Stage B: ore + charcoal → bar →
   * sword. A rock outcrop gets you a knife in an afternoon; a vein gets you
   * a sword after you have also kept a fire, cut wood down to charcoal, and
   * smelted the result — which is the point of putting it last.
   */
  Ore = 10,
  /**
   * Wet ground at a river's edge. Slower to cross than grass and louder
   * while you're crossing it — the one tile that punishes moving through it
   * rather than gathering from it, which nothing else here does.
   */
  Marsh = 11,
  /**
   * "Nobody bothered to destroy them" (doc/world/PLAN.md §8). Old-Kingdoms
   * infrastructure that outlasted the kingdom — faster to cross than grass,
   * the only tile that rewards moving through it rather than working it,
   * and the thing that makes a much bigger Verge navigable on foot.
   */
  Road = 12,
  /**
   * A collapsed keep or holdfast, per §8's carving and §17A's crowns —
   * "minted under kings who no longer have kingdoms." Never depletes, like
   * Rock and Ore, but pays out rubble far more often than anything worth
   * carrying: a chance at an old crown, not a guaranteed one.
   */
  Ruin = 13,
}

/** How long a burnt-out camp is still visible before the grass closes over it. */
export const ASH_TICKS = 600;

export function isSolid(t: Tile): boolean {
  return t === Tile.Tree || t === Tile.Water || t === Tile.Campfire || t === Tile.Rock || t === Tile.Ore;
}

export interface Resource {
  tile: Tile; // Stump or BareBush — what it reverts from
  regrowTo: Tile; // Tree or Bush — what it reverts to
  readyAtTick: number;
}

export class World {
  readonly tiles: Tile[];
  readonly resources: Map<number, Resource> = new Map();
  /** Lit fires, by tile index, holding the ticks of fuel each has left. */
  readonly fires: Map<number, number> = new Map();
  /**
   * Set snares, by tile index, holding the id of whoever set each one — so a
   * catch can credit the right soul's patience rather than a shared pool.
   * The Verge does not enforce this against a stranger (nothing else here
   * is locked either); it only decides whose trapping gets better at it.
   */
  readonly snares: Map<number, number> = new Map();

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
        else if (roll < 29) this.set(x, y, Tile.Rock);
        // Rarer than a rock outcrop on purpose — a sword is meant to take
        // longer to reach than a knife.
        else if (roll < 31) this.set(x, y, Tile.Ore);
      }
    }

    // Marsh forms at a river's edge, not anywhere flat and grassy — a
    // second pass over what the first one already decided was Water,
    // rather than another independent roll.
    for (let y = 0; y < WORLD_H; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        if (this.get(x, y) !== Tile.Grass || this.inClearing(x, y)) continue;
        const nearWater =
          this.get(x, y - 1) === Tile.Water ||
          this.get(x, y + 1) === Tile.Water ||
          this.get(x - 1, y) === Tile.Water ||
          this.get(x + 1, y) === Tile.Water;
        if (nearWater && rng.chance(1, 3)) this.set(x, y, Tile.Marsh);
      }
    }

    // A road or two, walked as a wandering line rather than scattered like
    // everything above — the one terrain feature that has to read as a
    // path to mean anything. It only ever overwrites open ground, and
    // never the clearing a new soul arrives in.
    for (let i = 0; i < 2; i++) this.drawRoad(rng);

    // A handful of ruins, each its own single collapsed room rather than
    // rubble scattered everywhere — rare enough that finding one means
    // something, per §17A's crowns.
    for (let i = 0; i < 4; i++) this.placeRuin(rng);
  }

  private inClearing(x: number, y: number): boolean {
    return Math.abs(x - 3) <= 1 && Math.abs(y - 3) <= 1;
  }

  /** A wandering line from one edge of the map to another, laid only over open ground. */
  private drawRoad(rng: Rng): void {
    const edgePoint = (): { x: number; y: number } => {
      switch (rng.nextInt(4)) {
        case 0:
          return { x: rng.nextInt(WORLD_W), y: 0 };
        case 1:
          return { x: rng.nextInt(WORLD_W), y: WORLD_H - 1 };
        case 2:
          return { x: 0, y: rng.nextInt(WORLD_H) };
        default:
          return { x: WORLD_W - 1, y: rng.nextInt(WORLD_H) };
      }
    };
    let { x, y } = edgePoint();
    const end = edgePoint();
    const maxSteps = (WORLD_W + WORLD_H) * 3;

    for (let step = 0; step < maxSteps && (x !== end.x || y !== end.y); step++) {
      if (!this.inClearing(x, y)) {
        const t = this.get(x, y);
        if (t === Tile.Grass || t === Tile.Bush) this.set(x, y, Tile.Road);
      }
      // Mostly toward the target, with just enough waver that it reads as
      // a road someone actually walked rather than a ruler line.
      const dx = end.x - x;
      const dy = end.y - y;
      if (Math.abs(dx) > Math.abs(dy)) x += dx > 0 ? 1 : -1;
      else y += dy > 0 ? 1 : -1;
      if (rng.chance(1, 3)) {
        if (rng.chance(1, 2)) x += rng.chance(1, 2) ? 1 : -1;
        else y += rng.chance(1, 2) ? 1 : -1;
      }
      x = clamp(x, 0, WORLD_W - 1);
      y = clamp(y, 0, WORLD_H - 1);
    }
  }

  /** One collapsed room, on open ground, never in the arrival clearing. */
  private placeRuin(rng: Rng): void {
    for (let attempt = 0; attempt < 64; attempt++) {
      const x = rng.nextInt(WORLD_W);
      const y = rng.nextInt(WORLD_H);
      if (this.inClearing(x, y) || this.get(x, y) !== Tile.Grass) continue;
      this.set(x, y, Tile.Ruin);
      return;
    }
    // The Verge is small; 64 unlucky rolls means settle for not placing
    // this one rather than clobbering something that mattered.
  }

  /**
   * Rebuild a world from a snapshot. Clients are *told* the world rather
   * than generating it, so that the server stays the only thing that
   * decides what is true (DESIGN §6.8).
   */
  static restore(seed: number, tiles: ReadonlyArray<Tile>, fires: ReadonlyArray<readonly [number, number]>): World {
    const w = new World(seed);
    for (let i = 0; i < w.tiles.length; i++) w.tiles[i] = tiles[i] ?? Tile.Grass;
    w.fires.clear();
    for (const [idx, fuel] of fires) w.fires.set(idx, fuel);
    // A client-restored snare doesn't know whose it is — ownership is only
    // ever read server-side, to credit a catch — so it rebuilds itself as
    // ownerless and costs the snapshot nothing.
    w.snares.clear();
    for (let i = 0; i < w.tiles.length; i++) if (w.tiles[i] === Tile.Snare) w.snares.set(i, -1);
    return w;
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

  lightFire(x: number, y: number, fuel: number): void {
    this.set(x, y, Tile.Campfire);
    this.fires.set(this.index(x, y), fuel);
  }

  /** Add fuel to a fire that is already lit. False if there isn't one there. */
  feedFire(x: number, y: number, fuel: number): boolean {
    const idx = this.index(x, y);
    const left = this.fires.get(idx);
    if (left === undefined) return false;
    this.fires.set(idx, left + fuel);
    return true;
  }

  fuelAt(x: number, y: number): number {
    return this.fires.get(this.index(x, y)) ?? 0;
  }

  /** Set a snare on open ground. False if something is already there. */
  setSnare(x: number, y: number, owner: number): boolean {
    if (this.get(x, y) !== Tile.Grass) return false;
    this.set(x, y, Tile.Snare);
    this.snares.set(this.index(x, y), owner);
    return true;
  }

  /** A snare that has caught something, or been picked up. The grass returns. */
  clearSnare(idx: number): void {
    this.snares.delete(idx);
    if (this.tiles[idx] === Tile.Snare) this.tiles[idx] = Tile.Grass;
  }

  /**
   * Burn every fire down by one tick. A fire nobody feeds goes out and
   * leaves ash — which is the whole reason wood is a recurring need rather
   * than a one-time purchase of five.
   *
   * Returns how many went out this tick.
   */
  tickFires(currentTick: number): number {
    let wentOut = 0;
    for (const [idx, fuel] of this.fires) {
      if (fuel > 1) {
        this.fires.set(idx, fuel - 1);
        continue;
      }
      this.fires.delete(idx);
      this.tiles[idx] = Tile.Ash;
      this.resources.set(idx, { tile: Tile.Ash, regrowTo: Tile.Grass, readyAtTick: currentTick + ASH_TICKS });
      wentOut++;
    }
    return wentOut;
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
