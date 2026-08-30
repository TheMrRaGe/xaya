// The Storyteller: what the Overlord may do, and how much of it.
//
//     node test/director.test.mjs   (or `npm test`)
//
// The rules being pinned here are the ones that stop this becoming either
// a slot machine or a grind: pressure follows what the Verge has built, a
// death buys the survivors quiet, and the expensive incidents stay locked
// until they have been earned.
import { newSim, stepTick, NO_INPUT } from "../dist/sim/tick.js";
import { newPlayer } from "../dist/sim/entities.js";
import { TILE } from "../dist/sim/fixed.js";
import { Tile } from "../dist/sim/world.js";
import { pressure, offers, chooseByWeight, applyAction, isColdSnap, isBlighted } from "../dist/sim/director.js";

const I = (o = {}) => ({ ...NO_INPUT, ...o });
const IDLE = [I(), I(), I()];
const fresh = (n = 1) => newSim(0xc0ffee, Array.from({ length: n }, (_, i) => newPlayer(i + 1, i)));

let failures = 0;
const check = (name, cond, detail = "") => {
  console.log(cond ? `  ok   ${name}` : `  FAIL ${name} ${detail}`);
  if (!cond) failures++;
};

// --- pressure follows what they have built ---
{
  const s = fresh();
  const bare = pressure(s);
  check("a soul with nothing owes nothing much", bare < 20, `${bare}`);

  s.players[0].pack.wood = 40;
  s.players[0].pack.hide = 6;
  s.players[0].pack.spear = 12;
  const carrying = pressure(s);
  check("carrying more raises it", carrying > bare, `${bare} -> ${carrying}`);

  s.world.lightFire(10, 10, 1000);
  const withFire = pressure(s);
  check("a fire is the most expensive thing you own", withFire > carrying, `${carrying} -> ${withFire}`);

  const before = pressure(s);
  s.players[0].skills.woodcraft = 800;
  check("so is knowing how to work", pressure(s) > before);
}

// --- more souls, more owed ---
{
  const one = fresh(1);
  const two = fresh(2);
  for (const s of [one, two]) for (const p of s.players) p.pack.wood = 30;
  check("two souls owe more than one", pressure(two) > pressure(one), `${pressure(one)} vs ${pressure(two)}`);
}

// --- a death buys quiet, and it runs out ---
{
  const s = fresh();
  s.players[0].pack.wood = 60;
  s.world.lightFire(10, 10, 5000);
  const before = pressure(s);
  s.players[0].needs.hydration = 0;
  s.players[0].health = 1;
  stepTick(s, IDLE);
  check("a death drops the pressure", pressure(s) < before, `${before} -> ${pressure(s)}`);
  const mourning = s.grief;
  for (let i = 0; i < 400; i++) stepTick(s, IDLE);
  check("and the quiet runs out", s.grief < mourning, `${mourning} -> ${s.grief}`);
}

// --- the menu is gated by what they have earned ---
{
  const s = fresh();
  const poor = offers(s, 0).map((o) => o.action.kind);
  check("with nothing owed, he can only wait", poor.length === 1 && poor[0] === "nothing", JSON.stringify(poor));

  const rich = offers(s, 500).map((o) => o.action.kind);
  check(
    "everything unlocks eventually",
    rich.includes("mark") && rich.includes("loose_a_boar") && rich.includes("loose_the_wolves"),
    JSON.stringify(rich),
  );
  check("and doing nothing is always on the menu", rich[0] === "nothing");

  const middling = offers(s, 100).map((o) => o.action.kind);
  check(
    "the expensive ones stay locked",
    !middling.includes("mark") && !middling.includes("loose_a_boar") && !middling.includes("loose_the_wolves"),
    JSON.stringify(middling),
  );
  check("while the cheap ones are open", middling.includes("false_crows"), JSON.stringify(middling));
  check("and a Scout is cheaper still — the probe before the Lieutenant himself", middling.includes("send_scout"), JSON.stringify(middling));
}

// --- the Understudy always picks something legal ---
{
  const s = fresh();
  const menu = offers(s, 500);
  const ids = new Set(menu.map((o) => o.id));
  let bad = 0;
  const counts = new Map();
  for (let i = 0; i < 1000; i++) {
    const choice = chooseByWeight(menu, s.rng);
    if (!ids.has(choice.id)) bad++;
    counts.set(choice.action.kind, (counts.get(choice.action.kind) ?? 0) + 1);
  }
  check("it never invents an action", bad === 0, `${bad} illegal`);
  check("and it does use the whole menu", counts.size >= 5, `${counts.size} kinds`);
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  check("doing nothing is the commonest single outcome", ranked[0][0] === "nothing", JSON.stringify(ranked));
  const idle = counts.get("nothing") / 1000;
  check("but he is not idle most of the time", idle > 0.2 && idle < 0.5, `${(idle * 100).toFixed(0)}%`);
}

// --- the incidents actually land ---
{
  const s = fresh();
  applyAction(s, { kind: "cold_snap", ticks: 100 });
  check("a cold snap bites", isColdSnap(s));
  s.players[0].needs.warmth = 500;
  const warmthAt = s.players[0].needs.warmth;
  for (let i = 0; i < 60; i++) {
    s.players[0].health = 100;
    stepTick(s, IDLE);
  }
  check("and takes more than the cold usually does", warmthAt - s.players[0].needs.warmth >= 25, `${warmthAt - s.players[0].needs.warmth}`);

  const b = fresh();
  b.world.harvest(5, 5, b.tick, 10);
  applyAction(b, { kind: "blight", ticks: 600 });
  check("a blight is on", isBlighted(b));
  for (let i = 0; i < 200; i++) {
    b.players[0].health = 100;
    stepTick(b, IDLE);
  }
  check("nothing regrows under it", b.world.get(5, 5) !== Tile.Tree, `tile=${b.world.get(5, 5)}`);

  const c = fresh();
  const boars = c.creatures.filter((x) => x.kind === "hedge-boar").length;
  applyAction(c, { kind: "loose_a_boar", x: c.players[0].x + TILE, y: c.players[0].y });
  check("a loosed boar arrives", c.creatures.filter((x) => x.kind === "hedge-boar").length === boars + 1);
  check("and it arrives angry", c.creatures[c.creatures.length - 1].angerTicks > 0);

  const w = fresh();
  const wolves = w.creatures.filter((x) => x.kind === "wolf").length;
  applyAction(w, { kind: "loose_the_wolves", x: w.players[0].x + TILE, y: w.players[0].y });
  check("loosed wolves arrive in a pair", w.creatures.filter((x) => x.kind === "wolf").length === wolves + 2);
  const newWolves = w.creatures.slice(-2);
  check(
    "and both hold the same grudge",
    newWolves.every((x) => x.angerTicks > 0 && x.angryAt === w.players[0].id),
    JSON.stringify(newWolves.map((x) => [x.angerTicks, x.angryAt])),
  );

  const d = fresh(2);
  applyAction(d, { kind: "mark", soul: 1 });
  d.players[1].x = 22 * TILE;
  d.players[1].y = 15 * TILE;
  d.players[0].x = d.lieutenant.x;
  d.players[0].y = d.lieutenant.y;
  d.players[0].graceUntil = 0;
  d.players[1].graceUntil = 0;
  stepTick(d, IDLE);
  check("a marked soul is wanted over a closer one", d.lieutenant.target === 1, `target=${d.lieutenant.target}`);

  const e = fresh();
  applyAction(e, { kind: "false_crows", x: 2 * TILE, y: 14 * TILE });
  check("a feint puts the crows where nothing happened", e.crowX !== e.players[0].x || e.noiseX === 2 * TILE);
  check("and it is loud enough for them to gather", e.noise >= 250, `${e.noise}`);

  const f = fresh();
  applyAction(f, { kind: "send_scout", x: 20 * TILE, y: 20 * TILE });
  check("a sent Scout actually arrives", f.scouts.length === 1, `scouts=${f.scouts.length}`);
  check("heading for where he was sent to look, not standing on top of it", f.scouts[0].investigateX === 20 * TILE && f.scouts[0].investigateY === 20 * TILE);
}

// --- determinism survives all of it ---
{
  const run = () => {
    const s = fresh(2);
    for (let i = 0; i < 1500; i++) {
      if (i === 300) applyAction(s, { kind: "cold_snap", ticks: 400 });
      if (i === 600) applyAction(s, { kind: "loose_a_boar", x: 8 * TILE, y: 8 * TILE });
      if (i === 900) applyAction(s, { kind: "blight", ticks: 300 });
      if (i === 1100) applyAction(s, { kind: "mark", soul: 0 });
      stepTick(s, [I({ dx: 1, gather: i % 11 === 0 }), I({ dy: 1 })]);
    }
    return JSON.stringify({ p: s.players, c: s.creatures, l: s.lieutenant, t: s.world.tiles, g: s.grief });
  };
  check("a season with incidents replays identically", run() === run());
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
