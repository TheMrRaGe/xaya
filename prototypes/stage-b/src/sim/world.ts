/**
 * The Verge — the only Realm that exists yet (Stage B cut list, doc/world/PLAN.md §44).
 *
 * A single small zone, generated deterministically from a seed so that a
 * given seed always produces the same map. No terraforming, no ecology
 * population math, no second biome — a grid of tiles and nothing more.
 *
 * Generation used to be one independent roll per tile, which reads as
 * salt-and-pepper rather than a place. It is now a sequence of
 * deterministic passes, each keying off what an earlier one decided, the
 * same shape marsh/road/ruin already used before this rewrite generalised
 * it: a river first (§4A "river fords"), then woodland stands and mineral
 * clusters and hedgerows and meadows grown from seeds rather than
 * sprinkled tile by tile, then the riverbank, then roads and ruins exactly
 * as before. The point is not more tiles for their own sake — it is a map
 * that reads as a valley instead of a grid of dice rolls.
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
  Stump = 2, // a harvested tree or thicket; regrows after RESPAWN_TICKS into whichever it was
  Water = 3,
  Bush = 4,
  BareBush = 5, // a picked-clean bush; regrows after RESPAWN_TICKS
  Campfire = 6, // player-built, and burns down
  Ash = 7, // a fire that went out; grass takes it back
  /**
   * A rock outcrop — a handful of hits before it's worked out (`VEIN_HEALTH`),
   * same shape as a Tree: chip it down, it becomes `DepletedRock`, and it
   * comes back on a timer. Used to never deplete at all ("you chip stone off
   * it and it is still a rock"); reversed on explicit direction so a single
   * outcrop can't be stood at and pressed forever — see `DepletedRock` and
   * `chipVein` for the actual mechanic. What it still costs, on top of that
   * now: attention — hammering stone is the loudest work in the Verge.
   */
  Rock = 8,
  /** A set snare, waiting. Catches what walks onto it, then it is spent. */
  Snare = 9,
  /**
   * A vein of ore — the same "a handful of hits, then it's worked out and
   * needs a real wait" as Rock now, just fewer hits and rarer to find in
   * the first place, because it sits at the top of the one crafting chain
   * doc/world/PLAN.md §15 actually names for Stage B: ore + charcoal → bar →
   * sword. A rock outcrop gets you a knife in an afternoon; a vein gets you
   * a sword after you have also kept a fire, cut wood down to charcoal, and
   * smelted the result — which is the point of putting it last. Generated
   * as part of the same mineral clusters as Rock and Copper (below) rather
   * than its own independent roll — an outcrop that is mostly stone,
   * sometimes hiding a real vein.
   */
  Ore = 10,
  /**
   * Wet ground at a river's edge. Slower to cross than grass and louder
   * while you're crossing it — the one tile that punishes moving through it
   * rather than working it, which nothing else here does.
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
   * "minted under kings who no longer have kingdoms." Never depletes —
   * unlike Rock and Ore now, a ruin is rubble already, not a vein with
   * anything left in it to work out — but pays out rubble far more often
   * than anything worth carrying: a chance at an old crown, not a
   * guaranteed one.
   */
  Ruin = 13,
  /**
   * Open clay along a riverbank — soil, not a vein. Per §3.1's Verge
   * material row ("soil, timber, clay, copper") this is as ordinary a
   * material as wood, so unlike Rock/Ore it stays common and quiet rather
   * than rare and loud, and it stays undepletable too — a riverbank does
   * not run out of clay the way a worked outcrop now runs out of stone.
   */
  Clay = 14,
  /**
   * A seam of copper, generated as the rarest outcome of the same mineral
   * clusters that produce Rock and Ore (rarer than Ore, per §3.1 naming
   * copper rather than iron as the Verge's own metal). Its chain is item
   * 2's job; this tile only makes it possible to dig one up. Depletes the
   * fastest of the three worked minerals (`VEIN_HEALTH`) — the rarest find
   * is also the one worth the least standing at.
   */
  Copper = 15,
  /** A wildflower patch. Common, quiet, and Verge foraging in its own right — never depletes. */
  Meadow = 16,
  /**
   * The dense core of a woodland stand rather than a separate biome: more
   * wood per felling than a lone Tree, and louder, the same trade a rock
   * outcrop already makes between yield and being heard. Felled, it grows
   * back as itself (see `harvest`) — a stand's core stays a core.
   */
  Thicket = 17,
  /**
   * A house in the village every soul washes up near (doc/world/PLAN.md
   * §1A: "they take you in, they feed you, and they watch you for a
   * season"). Solid, and purely a landmark — nothing to gather, nothing to
   * build; the village itself is placed once, by `placeVillage`, not grown
   * or rolled for like everything else in this file.
   */
  House = 18,
  /**
   * A worked-out Rock outcrop, Ore vein or Copper seam — the same shape a
   * felled Tree becomes a Stump, but these three stay solid rather than
   * opening up: a mined face is still a wall of rock, just an empty one.
   * Regrows into whatever it was (`chipVein`/`tickRegrowth`), the same
   * generic resource-regrowth Stump and BareBush already use.
   */
  DepletedRock = 19,
  DepletedOre = 20,
  DepletedCopper = 21,
}

/** How long a burnt-out camp is still visible before the grass closes over it. */
export const ASH_TICKS = 600;

export function isSolid(t: Tile): boolean {
  return (
    t === Tile.Tree ||
    t === Tile.Water ||
    t === Tile.Campfire ||
    t === Tile.Rock ||
    t === Tile.Ore ||
    t === Tile.Copper ||
    t === Tile.Thicket ||
    t === Tile.House ||
    // Worked out, not gone — a mined face is still a wall of rock, unlike a
    // felled Tree's Stump, which is why these stay solid instead of opening up.
    t === Tile.DepletedRock ||
    t === Tile.DepletedOre ||
    t === Tile.DepletedCopper
  );
}

/**
 * The village center, in tiles — where the arrival custom actually happens
 * (doc/world/PLAN.md §1A). Exported so NPC placement (npc.ts) shares the
 * one number rather than duplicating it.
 */
export const VILLAGE_X = 5;
export const VILLAGE_Y = 8;

export interface Resource {
  tile: Tile; // Stump or BareBush — what it reverts from
  regrowTo: Tile; // Tree, Thicket or Bush — what it reverts to
  readyAtTick: number;
}

/**
 * Hits before a vein gives out (`chipVein`) — a real, if modest, health bar
 * rather than the endless single tile it used to be. Copper depletes
 * fastest: the rarest find is also the one least worth camping.
 */
export const VEIN_HEALTH: Partial<Record<Tile, number>> = {
  [Tile.Rock]: 6,
  [Tile.Ore]: 4,
  [Tile.Copper]: 3,
};

const DEPLETED_FORM: Partial<Record<Tile, Tile>> = {
  [Tile.Rock]: Tile.DepletedRock,
  [Tile.Ore]: Tile.DepletedOre,
  [Tile.Copper]: Tile.DepletedCopper,
};

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
  /**
   * Hits already taken by a Rock, Ore or Copper tile that hasn't given out
   * yet, by tile index. Absent means full health (nobody's touched it, or
   * it already regrew) — server-side bookkeeping only, the same way
   * `resources`'s regrowth timers never travel to a client either; the
   * tile's own appearance in the next snapshot is the only signal a viewer
   * needs.
   */
  readonly veinHealth: Map<number, number> = new Map();

  constructor(seed: number) {
    const rng = new Rng(seed);
    this.tiles = new Array(WORLD_W * WORLD_H).fill(Tile.Grass);

    // Water first — everything else in this file reads off where the river
    // actually ran, the way a real valley's geography would, rather than
    // each feature deciding independently and occasionally disagreeing.
    // Two walks, same as the roads below get: one alone is sometimes a
    // short stream if its start and end happen to land close together, and
    // "river valley" (§4A) wants water a soul actually has to route around.
    for (let i = 0; i < 2; i++) this.drawRiver(rng);
    this.growForest(rng);
    this.growMineralClusters(rng);
    this.growHedgerows(rng);
    this.growMeadows(rng);

    // The riverbank: a second, deterministic pass over the water this
    // constructor already placed, exactly like the road and ruin passes
    // below — never an independent roll.
    this.growRiverbank(rng);

    // The village is placed, not grown or rolled for — a handful of houses
    // belong exactly where the arrival custom says they do (§1A), not
    // wherever a cluster happened to seed.
    this.placeVillage();

    // A road or two, walked as a wandering line rather than scattered like
    // everything above — the one terrain feature that has to read as a
    // path to mean anything. It only ever overwrites open ground, and
    // never the clearing a new soul arrives in. Where it crosses the river
    // it simply does not paint over the water — the ford is the gap.
    for (let i = 0; i < 2; i++) this.drawRoad(rng);

    // A handful of ruins, each its own single collapsed room rather than
    // rubble scattered everywhere — rare enough that finding one means
    // something, per §17A's crowns.
    for (let i = 0; i < 4; i++) this.placeRuin(rng);
  }

  /**
   * The one rectangle every generation pass in this file leaves alone: the
   * arrival tile at (3, 3) — and everything up to four static spawns might
   * land on, per entities.ts's `(3 + id*2, 3)` formula — plus the village
   * itself, south of it, so a house is never rolled over by a pass that
   * runs first. Wider than a new soul strictly needs so the village has
   * room to exist as more than a single tile.
   */
  private inClearing(x: number, y: number): boolean {
    return x >= 0 && x <= 10 && y >= 1 && y <= 10;
  }

  /**
   * A hamlet, not a town (§8: "a hamlet of eight people is invisible") —
   * three houses, hand-placed rather than grown, around VILLAGE_X/Y. This
   * is the one feature in this file that is placed outright instead of
   * rolled or clustered, because a village is a specific fact about the
   * world, not a probability.
   */
  private placeVillage(): void {
    const houses: ReadonlyArray<readonly [number, number]> = [
      [VILLAGE_X - 1, VILLAGE_Y],
      [VILLAGE_X + 1, VILLAGE_Y],
      [VILLAGE_X, VILLAGE_Y + 1],
    ];
    for (const [x, y] of houses) this.set(x, y, Tile.House);
  }

  /** One wandering river, walked edge to edge like a road but laid first, in Water. */
  private drawRiver(rng: Rng): void {
    const { x: startX, y: startY } = this.edgePoint(rng);
    let x = startX;
    let y = startY;
    const end = this.edgePoint(rng);
    const maxSteps = (WORLD_W + WORLD_H) * 3;

    for (let step = 0; step < maxSteps && (x !== end.x || y !== end.y); step++) {
      if (!this.inClearing(x, y)) this.set(x, y, Tile.Water);
      // A river runs about two tiles wide in stretches, not a uniform
      // ruler-line — a soul should be able to find a narrow crossing
      // rather than the whole length being equally impassable.
      if (rng.chance(1, 2)) {
        const wx = rng.chance(1, 2) ? x + 1 : x;
        const wy = wx === x ? y + 1 : y;
        if (this.inBounds(wx, wy) && !this.inClearing(wx, wy)) this.set(wx, wy, Tile.Water);
      }
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

  private edgePoint(rng: Rng): { x: number; y: number } {
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
  }

  /**
   * Grows a cluster outward from (cx, cy): a frontier-based random walk
   * that visits up to `size` grass tiles, calling `place` on each one
   * actually painted. The one clustering primitive every "clumps of
   * terrain" pass below uses, so a stand of trees, a rock outcrop and a
   * meadow are the same algorithm with different inputs, not three bespoke
   * ones. Only ever grows into ground still Grass — which is what makes
   * every pass below respect what an earlier one already placed, for free,
   * without any pass needing to know about any other.
   */
  private growBlob(rng: Rng, cx: number, cy: number, size: number, place: (x: number, y: number) => void): void {
    const frontier: Array<{ x: number; y: number }> = [{ x: cx, y: cy }];
    const seen = new Set<number>();
    let placed = 0;
    while (frontier.length > 0 && placed < size) {
      // Pop a random member rather than always the newest, so the blob's
      // outline comes out irregular instead of a diagonal streak.
      const pick = rng.nextInt(frontier.length);
      const { x, y } = frontier.splice(pick, 1)[0]!;
      if (!this.inBounds(x, y)) continue;
      const idx = this.index(x, y);
      if (seen.has(idx)) continue;
      seen.add(idx);
      if (this.inClearing(x, y) || this.get(x, y) !== Tile.Grass) continue;
      place(x, y);
      placed++;
      const neighbors: Array<{ x: number; y: number }> = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ];
      for (const n of neighbors) {
        // Growth loses steam with distance from the seed, so a cluster
        // tapers into open ground instead of stopping on a hard edge.
        if (rng.chance(7, 10)) frontier.push(n);
      }
    }
  }

  /**
   * Woodland stands, not a sprinkle: pick a handful of cluster seeds and
   * grow each outward, so the Verge reads as clearings and stands the way
   * §4A's "woodland" actually implies. A stand's own interior comes in
   * denser than its edge — a Thicket core inside a Tree fringe, which is
   * what a real wood looks like from above, not a new biome bolted on.
   */
  private growForest(rng: Rng): void {
    const clusters = 14;
    for (let i = 0; i < clusters; i++) {
      const cx = rng.nextInt(WORLD_W);
      const cy = rng.nextInt(WORLD_H);
      this.growBlob(rng, cx, cy, 30, (x, y) => {
        const core = Math.abs(x - cx) + Math.abs(y - cy) <= 2;
        this.set(x, y, core ? Tile.Thicket : Tile.Tree);
      });
    }
  }

  /**
   * Rock, Ore and Copper are one geological feature, not three: an outcrop
   * that is mostly stone, sometimes hides a vein worth smelting, and
   * rarely a seam of copper — which is why a soul checks every stone they
   * find rather than only the ones that already look different.
   */
  private growMineralClusters(rng: Rng): void {
    const clusters = 30;
    for (let i = 0; i < clusters; i++) {
      const cx = rng.nextInt(WORLD_W);
      const cy = rng.nextInt(WORLD_H);
      this.growBlob(rng, cx, cy, 5, (x, y) => {
        const roll = rng.nextInt(100);
        if (roll < 10) this.set(x, y, Tile.Copper);
        else if (roll < 40) this.set(x, y, Tile.Ore);
        else this.set(x, y, Tile.Rock);
      });
    }
  }

  /**
   * A hedgerow is a boundary, not a thicket of bushes — a short line walked
   * once, the same shape as a road at a fraction of the length, which is
   * what actually reads as a field edge instead of undergrowth.
   */
  private growHedgerows(rng: Rng): void {
    const hedges = 26;
    for (let i = 0; i < hedges; i++) {
      let x = rng.nextInt(WORLD_W);
      let y = rng.nextInt(WORLD_H);
      const length = 4 + rng.nextInt(7);
      const horizontal = rng.chance(1, 2);
      for (let step = 0; step < length; step++) {
        if (!this.inClearing(x, y) && this.get(x, y) === Tile.Grass) this.set(x, y, Tile.Bush);
        if (horizontal) x += rng.chance(1, 2) ? 1 : -1;
        else y += rng.chance(1, 2) ? 1 : -1;
        // A little waver — nobody plants a hedge with a ruler.
        if (rng.chance(1, 4)) {
          if (horizontal) y += rng.chance(1, 2) ? 1 : -1;
          else x += rng.chance(1, 2) ? 1 : -1;
        }
        x = clamp(x, 0, WORLD_W - 1);
        y = clamp(y, 0, WORLD_H - 1);
      }
    }
  }

  /** Wildflower patches, clustered the same way a stand of trees is. */
  private growMeadows(rng: Rng): void {
    const clusters = 10;
    for (let i = 0; i < clusters; i++) {
      const cx = rng.nextInt(WORLD_W);
      const cy = rng.nextInt(WORLD_H);
      this.growBlob(rng, cx, cy, 10, (x, y) => this.set(x, y, Tile.Meadow));
    }
  }

  /**
   * A riverbank is marsh in some stretches and open clay in others — one
   * roll per water-adjacent tile decides which, rather than marsh getting
   * first refusal and clay only ever existing in the enum.
   */
  private growRiverbank(rng: Rng): void {
    for (let y = 0; y < WORLD_H; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        if (this.get(x, y) !== Tile.Grass || this.inClearing(x, y)) continue;
        const nearWater =
          this.get(x, y - 1) === Tile.Water ||
          this.get(x, y + 1) === Tile.Water ||
          this.get(x - 1, y) === Tile.Water ||
          this.get(x + 1, y) === Tile.Water;
        if (!nearWater) continue;
        const roll = rng.nextInt(3);
        if (roll === 0) this.set(x, y, Tile.Marsh);
        else if (roll === 1) this.set(x, y, Tile.Clay);
        // roll === 2: stays grass — an ordinary bank, not every riverside tile is special.
      }
    }
  }

  /** A wandering line from one edge of the map to another, laid only over open ground. */
  private drawRoad(rng: Rng): void {
    let { x, y } = this.edgePoint(rng);
    const end = this.edgePoint(rng);
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

  /** Harvest a Tree, Thicket or Bush at (x, y); schedules regrowth. No-op if not harvestable. */
  harvest(x: number, y: number, currentTick: number, regrowTicks: number): boolean {
    const t = this.get(x, y);
    if (t === Tile.Tree || t === Tile.Thicket) {
      // A felled thicket grows back into a thicket, not a lone tree — a
      // stand's dense core stays its core.
      this.set(x, y, Tile.Stump);
      this.resources.set(this.index(x, y), { tile: Tile.Stump, regrowTo: t, readyAtTick: currentTick + regrowTicks });
      return true;
    }
    if (t === Tile.Bush) {
      this.set(x, y, Tile.BareBush);
      this.resources.set(this.index(x, y), { tile: Tile.BareBush, regrowTo: Tile.Bush, readyAtTick: currentTick + regrowTicks });
      return true;
    }
    return false;
  }

  /**
   * One hit against a Rock, Ore or Copper tile at (x, y). Every hit still
   * pays out to the caller regardless — this only tracks whether the vein
   * itself has anything left. Returns `"worked"` for an ordinary hit,
   * `"exhausted"` for the hit that empties it (the caller's cue for a
   * different line — "the vein gives out" rather than the usual noise),
   * or `null` if there's nothing chippable at (x, y) at all.
   */
  chipVein(x: number, y: number, currentTick: number, regrowTicks: number): "worked" | "exhausted" | null {
    const t = this.get(x, y);
    const max = VEIN_HEALTH[t];
    if (max === undefined) return null;
    const idx = this.index(x, y);
    const remaining = (this.veinHealth.get(idx) ?? max) - 1;
    if (remaining <= 0) {
      this.veinHealth.delete(idx);
      const depleted = DEPLETED_FORM[t]!;
      this.set(x, y, depleted);
      this.resources.set(idx, { tile: depleted, regrowTo: t, readyAtTick: currentTick + regrowTicks });
      return "exhausted";
    }
    this.veinHealth.set(idx, remaining);
    return "worked";
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
