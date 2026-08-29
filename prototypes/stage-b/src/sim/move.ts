/**
 * Movement shared by everything that moves — the player, the Lieutenant and
 * the beasts. Integers only, same as the rest of the sim tier.
 */
import { TILE, isqrt } from "./fixed.js";
import { World, isSolid } from "./world.js";

export interface Point {
  x: number;
  y: number;
}

/** Step from (x, y) toward (tx, ty) by at most `speed` units — diagonals included. */
export function stepToward(x: number, y: number, tx: number, ty: number, speed: number): Point {
  const dx = tx - x;
  const dy = ty - y;
  const dist = isqrt(dx * dx + dy * dy);
  if (dist === 0 || dist <= speed) return { x: tx, y: ty };
  return { x: x + Math.trunc((dx * speed) / dist), y: y + Math.trunc((dy * speed) / dist) };
}

/** The mirror of stepToward, for anything running from something. */
export function stepAway(x: number, y: number, fx: number, fy: number, speed: number): Point {
  return stepToward(x, y, x + (x - fx), y + (y - fy), speed);
}

/**
 * Apply a move, sliding along whatever it runs into instead of stopping
 * dead against it. A hunter that snags on the corner of a tree is not
 * frightening, and a player who does is not having fun.
 */
export function moveWithCollision(world: World, x: number, y: number, nx: number, ny: number): Point {
  if (walkable(world, nx, ny)) return { x: nx, y: ny };
  if (walkable(world, nx, y)) return { x: nx, y };
  if (walkable(world, x, ny)) return { x, y: ny };
  return { x, y };
}

export function walkable(world: World, x: number, y: number): boolean {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  return world.inBounds(tx, ty) && !isSolid(world.get(tx, ty));
}
