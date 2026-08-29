/**
 * The Barrow-list (§10) — "Every settlement keeps a board of its dead, by
 * name and by what killed them." For a solo Stage B prototype that's just
 * localStorage: no server, no chain, per §44's Stage B cut ("local state or
 * the cheapest possible server").
 */
import { DeathCause } from "../sim/entities.js";

const KEY = "greyking-stageb-barrowlist";

export interface Obituary {
  lineage: number;
  cause: DeathCause;
  tick: number;
  wood: number;
  /** Optional: souls buried before there were beasts to kill have no count. */
  kills?: number;
  /**
   * What this character was best at, in words. The next soul inherits the
   * story and none of the skill — reputation is the only thing §6.1 lets
   * cross a death.
   */
  mastery?: string;
}

export function loadBarrowList(): Obituary[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Obituary[]) : [];
  } catch {
    return [];
  }
}

export function recordDeath(o: Obituary): Obituary[] {
  const list = loadBarrowList();
  list.push(o);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable (private mode, etc.) — the run continues,
    // it just won't remember past this session.
  }
  return list;
}

export function nextLineage(): number {
  return loadBarrowList().length + 1;
}
