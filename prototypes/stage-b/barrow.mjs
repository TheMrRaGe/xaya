/**
 * The Barrow-list, persisted — every soul this Verge has buried, and the
 * count that lineage numbers are drawn from.
 *
 * It used to live in two places that never agreed with each other: a
 * browser's localStorage (one soul's own deaths, in one browser, gone if
 * the site data is cleared) and an in-memory array on the server (every
 * soul's deaths, gone on restart). Neither is "a board of its dead" for a
 * settlement two people actually share — the whole point is that you can
 * see who died before you arrived.
 *
 * So there is exactly one copy now, and the server owns it. A JSON file
 * because the write rate is "once per death," which is nowhere near enough
 * traffic to justify anything heavier — the same judgement call this
 * prototype has made about localStorage and about a plain WebSocket.
 */
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * @param {string} path
 * @returns {Promise<{ barrow: object[], nextLineage: number }>}
 */
export async function loadBarrow(path) {
  try {
    const raw = await readFile(path, "utf-8");
    const data = JSON.parse(raw);
    const barrow = Array.isArray(data.barrow) ? data.barrow : [];
    const nextLineage = Number.isInteger(data.nextLineage) ? data.nextLineage : barrow.length + 1;
    return { barrow, nextLineage };
  } catch {
    // Missing file (first run) or unreadable one (hand-edited, truncated by
    // a crash mid-write) both mean the same thing here: start clean rather
    // than crash a game server over a save file.
    return { barrow: [], nextLineage: 1 };
  }
}

/**
 * Persist the whole file. Deaths are rare — nothing here runs on the tick —
 * so the cost that matters is not speed but never leaving a half-written
 * file behind if the process dies mid-save: write to a temp file, then
 * rename it over the real one, which is atomic on both POSIX and Windows.
 */
export async function saveBarrow(path, barrow, nextLineage) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify({ barrow, nextLineage }, null, 2), "utf-8");
  await rename(tmp, path);
}
