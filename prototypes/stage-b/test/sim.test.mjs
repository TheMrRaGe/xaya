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
import { level, mastery, trapChance, charcoalYield, smeltBonus, swordBonus } from "../dist/sim/skills.js";
import { woundCreature, WOLF_ANGER_TICKS, STATS } from "../dist/sim/creatures.js";


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
  // A 72x48 Verge is nine times the original 24x16 footprint, and the
  // roster scales with it (creatures.ts's DENSITY_BASELINE) so the animals
  // don't just thin out into empty ground: 27 deer, 27 hare, 18 each of
  // river-goat, hedge-boar and wolf — 108 in total.
  check("the roster scales with the Verge's area", s.creatures.length === 108, `got ${s.creatures.length}`);
  const counts = { deer: 0, hare: 0, "hedge-boar": 0, "river-goat": 0, wolf: 0 };
  for (const c of s.creatures) counts[c.kind]++;
  check(
    "the roster is prey, boar and wolves, nine times over",
    counts.deer === 27 && counts.hare === 27 && counts["hedge-boar"] === 18 && counts["river-goat"] === 18 && counts.wolf === 18,
    JSON.stringify(counts),
  );
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
  const boar = s.creatures.find((c) => c.kind === "hedge-boar");
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

// --- 15. wolves hunt by scent after dark, not by daylight, and remember being struck ---
{
  // by day: proximity alone does not provoke a hunt
  const day = fresh();
  const wDay = day.creatures.find((c) => c.kind === "wolf");
  day.players[0].x = wDay.x + 2 * TILE;
  day.players[0].y = wDay.y;
  stepTick(day, IDLE);
  check("a wolf ignores you by daylight", wDay.state !== "hunt", wDay.state);

  // after dark, the same distance is enough
  const night = fresh();
  const wNight = night.creatures.find((c) => c.kind === "wolf");
  night.players[0].x = wNight.x + 2 * TILE;
  night.players[0].y = wNight.y;
  night.tick = 2999; // the next tick crosses into night
  stepTick(night, IDLE);
  check("the same distance hunts you after dark", wNight.state === "hunt", wNight.state);
  check("and it knows who", wNight.angryAt === night.players[0].id);

  // struck and not killed, it holds the grudge far longer than a boar does
  const s = fresh();
  const wolf = s.creatures.find((c) => c.kind === "wolf");
  woundCreature(wolf, 1, s.tick, s.players[0].id);
  check("striking one buys a long memory", wolf.angerTicks === WOLF_ANGER_TICKS, `${wolf.angerTicks}`);

  // and a bite that lands says what it was
  const s2 = fresh();
  const w2 = s2.creatures.find((c) => c.kind === "wolf");
  s2.players[0].health = 5;
  s2.players[0].x = w2.x;
  s2.players[0].y = w2.y;
  s2.tick = 2999;
  const deaths = stepTick(s2, IDLE);
  check("a bite that lands can kill", deaths.length === 1 && deaths[0].cause === "savaged by wolves", JSON.stringify(deaths));
}

// --- 16. stone, and the tools that come off a rock ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);

  // A rock does not run out — that is the whole deal with it.
  s.world.set(px + 1, py, Tile.Rock);
  const quiet = s.noise;
  stepTick(s, [I({ gather: true })]);
  check("chipping a rock yields stone", p.pack.stone === 1, `stone=${p.pack.stone}`);
  check("and the rock is still there", s.world.get(px + 1, py) === Tile.Rock);
  check("and it is the loudest work there is", s.noise - quiet >= 200, `+${s.noise - quiet}`);

  p.pack.stone = 4;
  p.pack.wood = 4;
  stepTick(s, [I({ makeKnife: true })]);
  check("a knife costs stone and wood", p.pack.knife > 0 && p.pack.stone === 3 && p.pack.wood === 3, JSON.stringify(p.pack));
  stepTick(s, [I({ makeAxe: true })]);
  check("an axe costs more stone", p.pack.axe > 0 && p.pack.stone === 1, `stone=${p.pack.stone}`);
}

// --- 17. an axe is more wood and less noise, which is the point of it ---
{
  const bare = fresh();
  const axed = fresh();
  for (const s of [bare, axed]) {
    const p = s.players[0];
    s.world.set(Math.floor(p.x / TILE) + 1, Math.floor(p.y / TILE), Tile.Tree);
  }
  axed.players[0].pack.axe = 5;

  stepTick(bare, [I({ gather: true })]);
  stepTick(axed, [I({ gather: true })]);
  check("an axe gets more off a tree", axed.players[0].pack.wood > bare.players[0].pack.wood, `${bare.players[0].pack.wood} vs ${axed.players[0].pack.wood}`);
  check("and does it more quietly", axed.noise < bare.noise, `${bare.noise} vs ${axed.noise}`);
  check("and wears with use", axed.players[0].pack.axe === 4, `axe=${axed.players[0].pack.axe}`);
}

// --- 18. a knife earns its keep on a carcass, and cuts the only cordage ---
{
  const s = fresh();
  const p = s.players[0];
  const goat = s.creatures.find((c) => c.kind === "river-goat");
  goat.state = "dead";
  goat.health = 0;
  goat.diedAtTick = s.tick;
  p.x = goat.x;
  p.y = goat.y;
  p.pack.knife = 3;
  stepTick(s, [I({ gather: true })]);
  // river-goat is 4 meat / 2 hide before the blade's +1 each.
  check("a knife takes more off a carcass", p.pack.rawMeat === 5 && p.pack.hide === 3, JSON.stringify(p.pack));
  check("and the edge dulls", p.pack.knife === 2, `knife=${p.pack.knife}`);

  stepTick(s, [I({ makeCordage: true })]);
  check("a knife cuts hide into cord", p.pack.cordage === 2 && p.pack.hide === 2, JSON.stringify(p.pack));

  const noKnife = fresh();
  noKnife.players[0].pack.hide = 4;
  stepTick(noKnife, [I({ makeCordage: true })]);
  check("bare hands cut no cord", noKnife.players[0].pack.cordage === 0);
}

// --- 19. the snare: work you did earlier, paying out while you are elsewhere ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  s.world.set(px, py, Tile.Grass);

  p.pack.cordage = 2;
  p.pack.wood = 1;
  stepTick(s, [I({ setSnare: true })]);
  check("a snare is made from cord and wood", p.pack.snare === 1 && p.pack.cordage === 0, JSON.stringify(p.pack));

  const before = s.noise;
  stepTick(s, [I({ setSnare: true })]);
  check("pressing again sets it", s.world.get(px, py) === Tile.Snare && p.pack.snare === 0, `tile=${s.world.get(px, py)}`);
  check("the world knows where it is", s.world.snares.has(s.world.index(px, py)));
  check("and setting one is quiet", s.noise - before < 30, `+${s.noise - before}`);

  // Walk a hare onto it and it eventually springs.
  const hare = s.creatures.find((c) => c.kind === "hare");
  let ticks = 0;
  while (s.world.snares.size > 0 && ticks < 60) {
    hare.x = px * TILE;
    hare.y = py * TILE;
    p.health = 100;
    stepTick(s, IDLE);
    ticks++;
  }
  check("a hare that runs onto it is caught", hare.state === "dead", `after ${ticks} ticks`);
  check("and the snare is spent", s.world.get(px, py) === Tile.Grass);
}

// --- 20. a hare cannot be run down, which is why the snare exists ---
{
  const s = fresh();
  const p = s.players[0];
  const hare = s.creatures.find((c) => c.kind === "hare");
  const goat = s.creatures.find((c) => c.kind === "river-goat");
  // Stand the same distance from each and see which one tolerates it.
  hare.x = p.x + 4 * TILE;
  hare.y = p.y;
  goat.x = p.x + 4 * TILE;
  goat.y = p.y + TILE;
  stepTick(s, IDLE);
  check("a hare bolts from across the field", hare.state === "flee", hare.state);
  check("a river-goat lets you walk up to it", goat.state !== "flee", goat.state);
}

// --- 21. trapping is a skill, and a snare remembers whose it is ---
{
  const s = fresh(2);
  const p = s.players[0];
  const stranger = s.players[1];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  s.world.set(px, py, Tile.Grass);

  p.pack.cordage = 2;
  p.pack.wood = 1;
  stepTick(s, [I({ setSnare: true }), I()]);
  stepTick(s, [I({ setSnare: true }), I()]);
  check("setting a snare teaches trapping", p.skills.trapping > 0, `xp=${p.skills.trapping}`);
  check("the snare knows who set it", s.world.snares.get(s.world.index(px, py)) === p.id);

  const hare = s.creatures.find((c) => c.kind === "hare");
  let ticks = 0;
  while (s.world.snares.size > 0 && ticks < 60) {
    hare.x = px * TILE;
    hare.y = py * TILE;
    p.health = 100;
    stranger.health = 100;
    stepTick(s, IDLE);
    ticks++;
  }
  check(
    "a catch credits the soul who set it, not a soul standing near",
    p.skills.trapping > 0 && stranger.skills.trapping === 0,
    `setter=${p.skills.trapping} stranger=${stranger.skills.trapping}`,
  );

  check("nobody starts better than one in three", trapChance({ trapping: 0 })[0] === 33);
  check("mastery does noticeably better", trapChance({ trapping: 10000 })[0] >= 33 + 4 * 9);
}

// --- 22. the sword chain: ore, charcoal and a bar, before the blade ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  s.world.set(px + 1, py, Tile.Ore);
  const quiet = s.noise;
  p.x = px * TILE;
  p.y = py * TILE;
  stepTick(s, [I({ gather: true })]);
  check("a vein yields ore", p.pack.ore === 1, `ore=${p.pack.ore}`);
  check("and the vein is still there", s.world.get(px + 1, py) === Tile.Ore);
  check("and it is the loudest work of all — louder than chipping stone", s.noise - quiet >= 260, `+${s.noise - quiet}`);

  // Charcoal and smelting both need a fire.
  s.world.set(px, py, Tile.Grass);
  p.pack.wood = 20;
  stepTick(s, [I({ makeCharcoal: true })]);
  check("no fire, no charcoal", p.pack.charcoal === 0 && p.pack.wood === 20);

  stepTick(s, [I({ build: true })]);
  stepTick(s, IDLE);
  check("standing at the fire", p.atFire === true);

  stepTick(s, [I({ makeCharcoal: true })]);
  check("wood becomes charcoal, wastefully", p.pack.charcoal === 1 && p.pack.wood === 20 - 5 - 3, JSON.stringify(p.pack));

  p.pack.ore = 4;
  stepTick(s, [I({ smelt: true })]);
  check("ore and charcoal become a bar", p.pack.bar === 1 && p.pack.ore === 2 && p.pack.charcoal === 0, JSON.stringify(p.pack));

  const noBar = fresh();
  stepTick(noBar, [I({ makeSword: true })]);
  check("no bar, no sword", noBar.players[0].pack.sword === 0);

  p.pack.bar = 2;
  p.pack.wood = 1;
  p.pack.cordage = 1;
  stepTick(s, [I({ makeSword: true })]);
  check("bar, wood and cord make a sword", p.pack.sword > 0 && p.pack.bar === 0 && p.pack.wood === 0 && p.pack.cordage === 0, JSON.stringify(p.pack));
}

// --- 23. a sword outfights a spear, and a soul keeps both ---
{
  const s = fresh();
  const p = s.players[0];
  p.pack.spear = 12;
  p.pack.sword = 30;
  const boar = s.creatures.find((c) => c.kind === "hedge-boar");
  p.x = boar.x;
  p.y = boar.y;
  stepTick(s, [I({ strike: true })]);
  check("the sword strikes first, not the spear", p.pack.sword === 29 && p.pack.spear === 12, `sword=${p.pack.sword} spear=${p.pack.spear}`);
  check("a hedge-boar takes real damage from it", boar.health <= STATS["hedge-boar"].health - 6, `hp=${boar.health}`);
}

// --- 24. smithing: self-supply was always possible, now it is earned ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  s.world.set(px, py, Tile.Grass);
  p.pack.wood = 40;
  stepTick(s, [I({ build: true })]);
  stepTick(s, IDLE);

  stepTick(s, [I({ makeCharcoal: true })]);
  const afterCharcoal = p.skills.smithing;
  check("charcoal-burning teaches smithing", afterCharcoal > 0, `xp=${afterCharcoal}`);
  check("and a green smith gets the base yield", p.pack.charcoal === 1, `charcoal=${p.pack.charcoal}`);

  p.pack.ore = 2;
  stepTick(s, [I({ smelt: true })]);
  check("smelting teaches more smithing on top", p.skills.smithing > afterCharcoal, `${afterCharcoal} -> ${p.skills.smithing}`);
  check("a green smith gets one bar for one smelt", p.pack.bar === 1, `bar=${p.pack.bar}`);

  // Now compare a green hand against a mastered one, formula to formula —
  // the same way trapChance was checked directly rather than ground out.
  check("a green smith wastes the most wood on charcoal", charcoalYield({ smithing: 0 }) === 1);
  check("a mastered smith gets twice the charcoal off the same burn", charcoalYield({ smithing: 10000 }) === 2);
  check("a green smith gets no extra bar", smeltBonus({ smithing: 0 }) === 0);
  check("a mastered smith gets more bar from the same ore", smeltBonus({ smithing: 10000 }) >= 2);
  check("a green smith's blade is the base bite, nothing more", swordBonus({ smithing: 0 }) === 0);
  check("a mastered smith's own blade hits harder than one merely carried", swordBonus({ smithing: 10000 }) >= 3);

  // Forging itself teaches smithing too.
  p.pack.bar = 2;
  p.pack.wood = 1;
  p.pack.cordage = 1;
  const beforeForge = p.skills.smithing;
  stepTick(s, [I({ makeSword: true })]);
  check("forging a sword teaches smithing", p.skills.smithing > beforeForge, `${beforeForge} -> ${p.skills.smithing}`);

  // A mastered smith's own sword hits harder in an actual fight, not just
  // in the formula — the same soul, the same blade, only the skill differs.
  const master = fresh();
  const mp = master.players[0];
  mp.pack.sword = 30;
  mp.skills.smithing = 10000;
  const boar2 = master.creatures.find((c) => c.kind === "hedge-boar");
  mp.x = boar2.x;
  mp.y = boar2.y;
  stepTick(master, [I({ strike: true })]);
  check(
    "a mastered smith's blade does more damage than a green one's",
    STATS["hedge-boar"].health - boar2.health > 6,
    `damage=${STATS["hedge-boar"].health - boar2.health}`,
  );
}

// --- 25. the Lieutenant covers ground: a faster, noise-biased patrol ---
{
  const s = fresh(1);
  s.noise = 0;
  // Let the coincident spawn waypoint (equal to his own position) get
  // replaced by a real one before measuring anything.
  stepTick(s, IDLE);
  check("he starts out patrolling, alone and far from anyone", s.lieutenant.state === "patrol", s.lieutenant.state);

  const before = { x: s.lieutenant.x, y: s.lieutenant.y };
  stepTick(s, IDLE);
  const moved = Math.hypot(s.lieutenant.x - before.x, s.lieutenant.y - before.y);
  check("patrol is faster than the old 60% of hunt speed", moved > 156, `moved ${moved.toFixed(1)}`);
  check("but still well under hunting speed, so fleeing a patrol stays easy", moved < 220, `moved ${moved.toFixed(1)}`);

  // Fix a hotspot far from both the Lieutenant and the lone player, then
  // watch where fresh patrol waypoints land over many reselections. The
  // player is marked not-alive for this part only, so `nearest` never
  // resolves to them (tick.ts skips non-alive players) — teleporting the
  // Lieutenant to 200 different points would otherwise occasionally land
  // within his detection radius of a real target, trigger a genuine hunt,
  // and then trap every later iteration re-teleporting to that same stale
  // waypoint, since only the patrol branch below ever updates it. That is
  // a quirk of this synthetic harness re-testing one tick 200 times over,
  // not something a real playthrough can hit.
  s.noiseX = 40 * TILE;
  s.noiseY = 30 * TILE;
  s.noise = 0; // below the crow threshold — this has to be the patrol bias, not the crow pull
  s.players[0].alive = false;
  let nearHotspot = 0;
  const trials = 200;
  for (let i = 0; i < trials; i++) {
    // Put him on his current waypoint so this tick is forced to pick a
    // fresh one, without caring what path he actually walked to get there.
    s.lieutenant.state = "patrol";
    s.lieutenant.target = -1;
    s.lieutenant.restUntil = 0;
    s.lieutenant.x = s.lieutenant.waypointX;
    s.lieutenant.y = s.lieutenant.waypointY;
    stepTick(s, IDLE);
    const d = Math.hypot(s.lieutenant.waypointX - s.noiseX, s.lieutenant.waypointY - s.noiseY) / TILE;
    if (d <= 10) nearHotspot++;
  }
  check("most fresh patrol waypoints land near recently loud ground", nearHotspot > trials * 0.4, `${nearHotspot}/${trials}`);
  check("but not all of them — he still wanders and can still find you elsewhere", nearHotspot < trials * 0.9, `${nearHotspot}/${trials}`);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
