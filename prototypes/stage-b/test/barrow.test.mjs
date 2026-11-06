// The Barrow-list's persistence, in isolation — no server, no sim, just
// the two functions that read and write the save file.
//
//     node test/barrow.test.mjs   (or `npm test`)
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBarrow, saveBarrow } from "../barrow.mjs";

let failures = 0;
const check = (name, cond, detail = "") => {
  console.log(cond ? `  ok   ${name}` : `  FAIL ${name} ${detail}`);
  if (!cond) failures++;
};

const dir = await mkdtemp(join(tmpdir(), "barrow-test-"));
const path = join(dir, "nested", "barrow.json");

try {
  // --- a Verge that has never buried anyone ---
  {
    const { barrow, nextLineage } = await loadBarrow(path);
    check("a missing file starts empty", barrow.length === 0);
    check("and the first soul is #1", nextLineage === 1);
  }

  // --- a death, saved, and read back by a fresh process ---
  {
    const death = { id: 0, lineage: 1, cause: "starved", tick: 228, wood: 3, kills: 0, mastery: "green" };
    await saveBarrow(path, [death], 2);
    const { barrow, nextLineage } = await loadBarrow(path);
    check("a saved death survives a reload", barrow.length === 1 && barrow[0].cause === "starved", JSON.stringify(barrow));
    check("the lineage counter is not recomputed from the list", nextLineage === 2);
  }

  // --- it creates directories that do not exist yet ---
  {
    const { barrow } = await loadBarrow(path);
    check("the nested directory now exists", barrow.length === 1);
  }

  // --- a save is never left half-written ---
  {
    await writeFile(path, "{not json", "utf-8");
    const { barrow, nextLineage } = await loadBarrow(path);
    check("a corrupt file is treated as empty, not a crash", barrow.length === 0 && nextLineage === 1);
  }

  // --- many souls, saved in order, read back in order ---
  {
    const souls = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      lineage: i + 1,
      cause: "starved",
      tick: i * 10,
      wood: i,
      kills: 0,
      mastery: "green",
    }));
    await saveBarrow(path, souls, 6);
    const { barrow, nextLineage } = await loadBarrow(path);
    check("order is preserved", barrow.map((d) => d.lineage).join(",") === "1,2,3,4,5", JSON.stringify(barrow));
    check("the lineage counter keeps counting past the list length", nextLineage === 6);
  }

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
} finally {
  await rm(dir, { recursive: true, force: true });
}

process.exit(failures === 0 ? 0 : 1);
