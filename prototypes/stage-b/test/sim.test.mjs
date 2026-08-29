// Headless checks over the compiled sim. The sim tier touches no DOM, so
// node can play the game faster than a person can — which is the whole
// reason src/sim/ imports nothing.
//
//     npm test        (runs `npm run build` first)
//
// Every check here exists because something was once wrong. Add one when
// you fix something; that is cheaper than remembering.
import { newSim, stepTick, replaceSoul, addSoul, CROW_THRESHOLD, NO_INPUT } from "../dist/sim/tick.js";
import { newPlayer, NEED_MAX } from "../dist/sim/entities.js";
import { Tile } from "../dist/sim/world.js";
import { TILE } from "../dist/sim/fixed.js";
import { level, mastery } from "../dist/sim/skills.js";


const I = (o = {}) => ({ ...NO_INPUT, ...o });
const IDLE = [I(), I(), I()];
const fresh = (n = 1) => newSim(0xc0ffee, Array.from({ length: n }, (_, i) => newPlayer(i + 1, i)));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name} ${detail}`);
    failures++;
  }
}

// --- 1. the roster spawns, and nothing spawns on top of anyone ---
{
  const s = fresh();
  const p = s.players[0];
  const kinds = s.creatures.map((c) => c.kind).sort().join(",");
  check("six creatures spawn", s.creatures.length === 6, `got ${s.creatures.length}`);
  check("roster is 4 deer + 2 boar", kinds === "boar,boar,deer,deer,deer,deer", kinds);
  const tooClose = s.creatures.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) < 6 * TILE);
  check("nothing spawns in your lap", tooClose.length === 0, `${tooClose.length} within 6 tiles`);
}

// --- 2. cold now actually bites (the bug: warmth never drained) ---
{
  const s = fresh();
  // Keep him on his feet: the Lieutenant will otherwise kill an idle soul
  // long before 600 ticks, and a corpse does not get cold on a schedule.
  for (let i = 0; i < 600; i++) {
    s.players[0].health = 100;
    stepTick(s, IDLE);
  }
  const drop = NEED_MAX - s.players[0].needs.warmth;
  check("warmth drains away from a fire", drop >= 150, `dropped ${drop} in 600 ticks`);
}

// --- 3. a diagonal is not a sprint ---
{
  const straight = fresh();
  const diag = fresh();
  const x0 = straight.players[0].x;
  const y0 = straight.players[0].y;
  for (let i = 0; i < 5; i++) {
    stepTick(straight, [I({ dx: 1 })]);
    stepTick(diag, [I({ dx: 1, dy: 1 })]);
  }
  const dStraight = straight.players[0].x - x0;
  const dDiag = Math.hypot(diag.players[0].x - x0, diag.players[0].y - y0);
  check("diagonal speed matches straight speed", Math.abs(dStraight - dDiag) < dStraight * 0.05, `${dStraight} vs ${Math.round(dDiag)}`);
}

// --- 4. hunt -> carcass -> butcher -> cook -> eat ---
{
  const s = fresh();
  const p = s.players[0];
  const deer = s.creatures.find((c) => c.kind === "deer");
  p.pack.spear = 12;
  let strikes = 0;
  while (deer.state !== "dead" && strikes < 40) {
    p.x = deer.x;
    p.y = deer.y;
    stepTick(s, [I({ strike: true })]);
    strikes++;
  }
  check("a speared deer dies", deer.state === "dead", `after ${strikes} strikes`);
  check("the kill is counted", p.kills === 1, `kills=${p.kills}`);

  p.x = deer.x;
  p.y = deer.y;
  stepTick(s, [I({ gather: true })]);
  check("butchering yields meat and hide", p.pack.rawMeat === 2 && p.pack.hide === 1, JSON.stringify(p.pack));
  check("noise rose from the struggle", s.noise > 0, `noise=${s.noise}`);

  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  s.world.set(px, py, Tile.Grass);
  p.pack.wood = 5;
  stepTick(s, [I({ build: true })]);
  check("a fire goes up on grass", s.world.get(px, py) === Tile.Campfire);
  p.x = (px + 1) * TILE;
  p.y = py * TILE;
  stepTick(s, IDLE);
  check("standing beside it counts as at the fire", p.atFire === true);
  stepTick(s, [I({ cook: true })]);
  check("raw meat cooks", p.pack.cookedMeat === 1 && p.pack.rawMeat === 1, JSON.stringify(p.pack));

  p.needs.satiety = 100;
  stepTick(s, [I({ eat: true })]);
  check("a hot meal is worth it", p.needs.satiety >= 590, `satiety=${p.needs.satiety}`);

  p.pack.hide = 2;
  stepTick(s, [I({ makeCloak: true })]);
  check("two hides make a cloak", p.pack.cloak > 0);
}

// --- 5. cooking and crafting cannot happen away from a fire ---
{
  const s = fresh();
  s.players[0].pack.rawMeat = 3;
  s.players[0].pack.hide = 5;
  for (let i = 0; i < 3; i++) stepTick(s, [I({ cook: true, makeCloak: true })]);
  check("no cooking without a fire", s.players[0].pack.cookedMeat === 0 && s.players[0].pack.cloak === 0);
}

// --- 6. nothing you make is permanent ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);

  p.pack.spear = 12;
  const boar = s.creatures.find((c) => c.kind === "boar");
  for (let i = 0; i < 12; i++) {
    p.x = boar.x;
    p.y = boar.y;
    if (boar.state === "dead") {
      boar.state = "graze";
      boar.health = 99;
    }
    stepTick(s, [I({ strike: true })]);
  }
  check("a spear wears out", p.pack.spear === 0, `spear=${p.pack.spear}`);

  const s2 = fresh();
  const p2 = s2.players[0];
  s2.world.set(px, py, Tile.Grass);
  p2.pack.wood = 6;
  stepTick(s2, [I({ build: true })]);
  const litFuel = s2.world.fuelAt(px, py);
  check("a new fire holds fuel", litFuel > 1000, `fuel=${litFuel}`);
  p2.x = (px + 1) * TILE;
  p2.y = py * TILE;
  stepTick(s2, [I({ build: true })]);
  check("feeding it costs a log and adds fuel", s2.world.fuelAt(px, py) > litFuel && p2.pack.wood === 0);

  for (let i = 0; i < 2200 && s2.world.get(px, py) === Tile.Campfire; i++) {
    p2.health = 100;
    stepTick(s2, IDLE);
  }
  check("a fire nobody feeds goes out", s2.world.get(px, py) === Tile.Ash, `tile=${s2.world.get(px, py)}`);
  for (let i = 0; i < 700; i++) {
    p2.health = 100;
    stepTick(s2, IDLE);
  }
  check("grass takes the ash back", s2.world.get(px, py) === Tile.Grass);

  const s3 = fresh();
  s3.players[0].pack.rawMeat = 2;
  s3.players[0].pack.cookedMeat = 2;
  for (let i = 0; i < 1000; i++) {
    s3.players[0].health = 100;
    stepTick(s3, IDLE);
  }
  check("raw meat spoils", s3.players[0].pack.rawMeat < 2, `raw=${s3.players[0].pack.rawMeat}`);
  check("cooked meat keeps", s3.players[0].pack.cookedMeat === 2, `cooked=${s3.players[0].pack.cookedMeat}`);
}

// --- 7. two souls in one Verge ---
{
  const s = fresh(2);
  const [a, b] = s.players;
  check("two souls spawn apart", a.x !== b.x || a.y !== b.y);

  // Hand a log over, and see it in the ledger.
  a.pack.wood = 3;
  b.x = a.x + Math.trunc(TILE / 2);
  b.y = a.y;
  stepTick(s, [I({ give: true }), I()]);
  check("a soul can hand another a log", a.pack.wood === 2 && b.pack.wood === 1, `${a.pack.wood}/${b.pack.wood}`);
  check("the trade is on the ledger", s.trades.length === 1 && s.trades[0].from === 0 && s.trades[0].to === 1, JSON.stringify(s.trades));

  // Offer cycles, and you cannot give what you do not have.
  stepTick(s, [I({ cycleOffer: true }), I()]);
  check("the offer cycles off wood", a.offer !== "wood", a.offer);
  stepTick(s, [I({ give: true }), I()]);
  check("you cannot give what you do not have", s.trades.length === 1, JSON.stringify(s.trades));

  // Out of reach is out of reach.
  a.offer = "wood";
  b.x = a.x + 6 * TILE;
  stepTick(s, [I({ give: true }), I()]);
  check("no giving across the map", s.trades.length === 1 && a.pack.wood === 2, `wood=${a.pack.wood}`);

  // Deaths come back per soul, and only for the soul that died.
  a.health = 1;
  a.needs.hydration = 0;
  const deaths = stepTick(s, [I(), I()]);
  check("a death names the soul it took", deaths.length === 1 && deaths[0].id === 0, JSON.stringify(deaths));
  check("the other soul plays on", s.players[1].alive === true);
}

// --- 8. the Lieutenant picks a target and the crows lead him ---
{
  const s = fresh(2);
  const [a, b] = s.players;
  a.x = 2 * TILE;
  a.y = 2 * TILE;
  b.x = s.lieutenant.x;
  b.y = s.lieutenant.y;
  stepTick(s, IDLE);
  check("he hunts whoever is nearest", s.lieutenant.target === 1, `target=${s.lieutenant.target}`);

  const s2 = fresh();
  s2.noise = 900;
  s2.noiseX = 2 * TILE;
  s2.noiseY = 14 * TILE;
  s2.crowX = 2 * TILE;
  s2.crowY = 14 * TILE;
  s2.players[0].x = 22 * TILE;
  s2.players[0].y = 1 * TILE;
  const before = Math.hypot(s2.lieutenant.x - s2.crowX, s2.lieutenant.y - s2.crowY);
  for (let i = 0; i < 120; i++) {
    s2.noise = 900;
    stepTick(s2, IDLE);
  }
  const after = Math.hypot(s2.lieutenant.x - s2.crowX, s2.lieutenant.y - s2.crowY);
  check("the Lieutenant walks to the crows", after < before - TILE, `${Math.round(before)} -> ${Math.round(after)}`);
  check("crow threshold is exported for the renderer", CROW_THRESHOLD === 250);
}

// --- 9. determinism: same seed + same inputs => same world, twice ---
{
  const script = (i) => [
    I({
      dx: [0, 1, 0, -1][i % 4],
      dy: [1, 0, -1, 0][(i >> 2) % 4],
      gather: i % 13 === 0,
      strike: i % 29 === 0,
      build: i % 211 === 0,
      makeSpear: i === 400,
      cook: i % 97 === 0,
      eat: i % 151 === 0,
      give: i % 61 === 0,
    }),
    I({ dx: [1, 0, -1, 0][i % 4], dy: [0, -1, 0, 1][i % 4], gather: i % 17 === 0, give: i % 53 === 0 }),
  ];
  const digest = () => {
    const s = fresh(2);
    for (let i = 0; i < 4000; i++) stepTick(s, script(i));
    return JSON.stringify({
      p: s.players,
      l: s.lieutenant,
      c: s.creatures,
      tr: s.trades,
      n: [s.noise, s.noiseX, s.noiseY, s.crowX, s.crowY],
      t: s.world.tiles,
      f: [...s.world.fires],
    });
  };
  const a = digest();
  const b = digest();
  check("4000 two-soul ticks replay identically", a === b);
  const floats = a.match(/[-\d]+\.\d+/g);
  check("no float leaked into sim state", floats === null, floats ? floats.slice(0, 3).join(" ") : "");
}

// --- 10. a full unattended run still ends in a death, not a crash ---
{
  const s = fresh();
  let death = null;
  for (let i = 0; i < 20000 && !death; i++) death = stepTick(s, IDLE)[0];
  check("neglect kills you", death != null, "no death in 20000 ticks");
  console.log(`       (died: ${death?.cause} at tick ${death?.tick})`);
}

// --- 11. he does not camp the place he made a kill ---
{
  const s = fresh();
  let died = null;
  for (let i = 0; i < 300 && !died; i++) {
    // Stand him on the soul until it is finished.
    s.lieutenant.x = s.players[0].x;
    s.lieutenant.y = s.players[0].y;
    died = stepTick(s, IDLE)[0];
  }
  check("the Lieutenant can still kill you", died != null && died.cause === "cut down by a Lieutenant", JSON.stringify(died));
  check("he rests once he has what he came for", s.lieutenant.restUntil > s.tick, `restUntil=${s.lieutenant.restUntil} tick=${s.tick}`);
  check("he stops hunting a corpse", s.lieutenant.target === -1, `target=${s.lieutenant.target}`);

  const soul = replaceSoul(s, 0, 99);
  const away = Math.hypot(soul.x - s.lieutenant.x, soul.y - s.lieutenant.y) / TILE;
  check("the next soul arrives away from him", away >= 7.9, `${away.toFixed(1)} tiles`);
  check("and is beneath notice for a while", soul.graceUntil > s.tick);

  let acquired = false;
  for (let i = 0; i < 120; i++) {
    stepTick(s, IDLE);
    if (s.lieutenant.target === 0) acquired = true;
  }
  check("he does not lock on during grace", !acquired);
  check("the new soul survived its grace", s.players[0].alive === true);
}

// --- 12. a soul joining mid-run does not land in his lap ---
{
  const s = fresh();
  s.noise = 900;
  const joined = addSoul(s, 42);
  const away = Math.hypot(joined.x - s.lieutenant.x, joined.y - s.lieutenant.y) / TILE;
  const fromBirds = Math.hypot(joined.x - s.crowX, joined.y - s.crowY) / TILE;
  check("a joining soul spawns clear of him", away >= 7.9, `${away.toFixed(1)} tiles`);
  check("and clear of the crows", fromBirds >= 3.9, `${fromBirds.toFixed(1)} tiles`);
  check("ids keep counting up", joined.id === 1);
}

// --- 13. skill is earned by doing, and dies with the character ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  const chop = () => {
    s.world.set(px + 1, py, Tile.Tree);
    p.health = 100;
    const wood = p.pack.wood;
    const noise = s.noise;
    stepTick(s, [I({ gather: true })]);
    return { wood: p.pack.wood - wood, noise: s.noise - noise };
  };

  const green = chop();
  check("every soul starts at nothing", level(p.skills.woodcraft) === 0 || green.wood === 3, `wood=${green.wood}`);
  check("a green soul gets three logs", green.wood === 3, `${green.wood}`);

  for (let i = 0; i < 80; i++) chop();
  const learned = level(p.skills.woodcraft);
  check("chopping teaches woodcraft", learned > 0, `level ${learned}`);

  const practised = chop();
  check("a practised hand gets more wood", practised.wood > green.wood, `${green.wood} -> ${practised.wood}`);
  check("and makes less noise doing it", practised.noise < green.noise, `${green.noise} -> ${practised.noise}`);

  check("the title reads like a person", /woodcutter/.test(mastery(p.skills)), mastery(p.skills));

  // Kill this character; the next soul inherits the story and none of the skill.
  p.needs.hydration = 0;
  p.health = 1;
  const [death] = stepTick(s, [I()]);
  check("the obituary names what they were", death && /woodcutter/.test(death.mastery), JSON.stringify(death && death.mastery));

  const heir = replaceSoul(s, 0, 500);
  check("skills die with the character", heir.skills.woodcraft === 0, JSON.stringify(heir.skills));
  check("so does everything they carried", heir.pack.wood === 0);
}

// --- 14. two souls who spend their hours differently end up different ---
{
  const s = fresh(2);
  const [woodcutter, hunter] = s.players;
  const px = Math.floor(woodcutter.x / TILE);
  const py = Math.floor(woodcutter.y / TILE);
  const deer = s.creatures.find((c) => c.kind === "deer");

  for (let i = 0; i < 60; i++) {
    s.world.set(px + 1, py, Tile.Tree);
    woodcutter.health = 100;
    hunter.health = 100;
    hunter.x = deer.x;
    hunter.y = deer.y;
    if (deer.state === "dead") {
      deer.state = "graze";
      deer.health = 99;
    }
    stepTick(s, [I({ gather: true }), I({ strike: true })]);
  }

  check("the one who chopped can chop", level(woodcutter.skills.woodcraft) > 0, `${level(woodcutter.skills.woodcraft)}`);
  check("the one who hunted cannot", level(woodcutter.skills.hunting) === 0);
  check("and the reverse", level(hunter.skills.hunting) > 0 && level(hunter.skills.woodcraft) === 0);
  check("which is where trade comes from", mastery(woodcutter.skills) !== mastery(hunter.skills), `${mastery(woodcutter.skills)} / ${mastery(hunter.skills)}`);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
