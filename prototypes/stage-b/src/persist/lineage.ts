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
