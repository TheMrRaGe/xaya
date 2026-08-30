/**
 * Deterministic PRNG for the sim tier — integer in, integer out, no floats.
 *
 * xorshift32 is not cryptographic and isn't meant to be; it only needs to be
 * the same sequence on every machine for the same seed, which it is. The
 * full design (doc/world/PLAN.md §36) calls for per-entity ChaCha streams keyed off
 * (epoch_seed, entity_id, tick, tag) so adding an entity never perturbs
 * anyone else's rolls — overkill for a single-player Stage B prototype, but
 * the shape (seed in, integers out, never Math.random) is worth keeping
 * from day one so the habit is already there when it starts to matter.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // xorshift32 requires a non-zero seed.
    this.state = seed === 0 ? 0x9e3779b9 : seed >>> 0;
  }

  /** Next raw uint32. */
  nextU32(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  /** Uniform integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number {
    return this.nextU32() % maxExclusive;
  }

  /** True with probability numerator/denominator (both integers). */
  chance(numerator: number, denominator: number): boolean {
    return this.nextInt(denominator) < numerator;
  }
}
