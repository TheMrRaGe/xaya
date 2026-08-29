// Ask the Grey King for real lines, without running the game.
//
//     OVERLORD=1 node test/overlord.live.mjs
//     OVERLORD=1 OVERLORD_MODEL=qwen2.5:7b node test/overlord.live.mjs
//
// This is the tuning loop for his voice: it walks a handful of situations
// the Verge actually produces and prints what comes back, so trying a
// different model or a different prompt costs one command instead of a
// playtest. It is not part of `npm test` — it needs a model running, and it
// is a judgement call, not a pass/fail.
// He paces himself in the game; here we want every answer at once.
process.env.OVERLORD_MIN_GAP_MS = "0";
const { createOverlord } = await import("../overlord.mjs");

const SITUATIONS = [
  {
    name: "a first fire",
    world: { night: false, souls: 1, crows: false },
    notes: [
      "You build a fire. It will keep you warm. It will also be seen.",
      "Soul #1's hands know the work better — woodcraft 1.",
    ],
  },
  {
    name: "a death he caused",
    world: { night: true, souls: 2, crows: true },
    notes: ["The boar turns on you."],
    death: { lineage: 4, cause: "cut down by a Lieutenant", mastery: "a fair butcher" },
  },
  {
    name: "two souls helping each other",
    world: { night: false, souls: 2, crows: false },
    notes: [
      "Soul #7 hands Soul #8 one cookedMeat.",
      "Soul #8 hands Soul #7 one hide.",
      "You butcher the deer: 3 meat, 2 hide.",
    ],
  },
  {
    name: "a starving camp at night",
    world: { night: true, souls: 3, crows: true },
    notes: [
      "A fire burns out. The cold comes back in.",
      "A piece of raw meat has turned. Cook it next time.",
      "Raw meat. It stays down, but not happily.",
    ],
  },
];

const lines = [];
const overlord = await createOverlord((line) => lines.push(line));
if (!overlord.stats.enabled) {
  console.log("Set OVERLORD=1 (and have a model running) — this script only exercises the real voice.");
  process.exit(1);
}
console.log(`${overlord.stats.model} at ${overlord.stats.url}\n`);

for (const situation of SITUATIONS) {
  for (const note of situation.notes) overlord.note(note);
  if (situation.death) overlord.noteDeath(situation.death);

  const before = lines.length;
  const started = Date.now();
  overlord.consider(situation.world);
  // He rate-limits himself in the game; here we just wait for the answer.
  while (lines.length === before && Date.now() - started < 60_000) {
    await new Promise((r) => setTimeout(r, 100));
  }
  const took = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`${situation.name} (${took}s)`);
  console.log(`  ${lines[lines.length - 1] ?? "— nothing came back —"}\n`);
}

console.log(`${overlord.stats.calls} calls, ${overlord.stats.failures} failures.`);
