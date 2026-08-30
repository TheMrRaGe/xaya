/**
 * Fixed-point arithmetic for the sim tier.
 *
 * doc/world/PLAN.md (§43A, §49 "Adopt the discipline, skip the harness") is explicit:
 * no floats anywhere in the tick, from line one, even before a chain exists
 * to make it matter. It costs almost nothing to write correctly now and is
 * expensive to retrofit later. Floats are permitted only in the renderer
 * (src/render/), which reads sim state but never writes it back.
 *
 * Everything here is a plain integer `number`. JS numbers are safe integers
 * up to 2^53, which is enormous headroom for a single zone at 10 Hz — so we
 * get fixed-point discipline without needing BigInt.
 */

/** One tile equals this many fixed-point units. */
export const TILE = 1000;

/** Multiply two fixed-point values (both scaled by TILE), result scaled by TILE. */
export function fxMul(a: number, b: number): number {
  return Math.trunc((a * b) / TILE);
}

/** Divide fixed-point `a` by fixed-point `b`, result scaled by TILE. */
export function fxDiv(a: number, b: number): number {
  return Math.trunc((a * TILE) / b);
}

/** Clamp an integer into [lo, hi]. */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Integer squared distance between two fixed-point points (no sqrt — stays exact). */
export function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * Integer square root (Newton's method). Only needed so movement can be
 * normalised — without it, anything moving diagonally travels 1.41x its
 * stated speed, which quietly made the Lieutenant faster than the player he
 * is supposed to be slower than. Math.sqrt would be exact here too, but the
 * rule in this file is no floats in the tick, and the rule is worth more
 * than the six lines it costs to keep.
 */
export function isqrt(n: number): number {
  if (n <= 0) return 0;
  let x = n;
  let y = Math.trunc((x + 1) / 2);
  while (y < x) {
    x = y;
    y = Math.trunc((x + Math.trunc(n / x)) / 2);
  }
  return x;
}
