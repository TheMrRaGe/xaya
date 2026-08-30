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
import { Tile, WORLD_W, WORLD_H } from "../dist/sim/world.js";
import { TILE } from "../dist/sim/fixed.js";
import { level, mastery, trapChance, charcoalYield, smeltBonus, swordBonus, fishChance, teachingCeiling } from "../dist/sim/skills.js";
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

// --- 26. fishing: no fire, no butchering, just cordage and a shoreline ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  s.world.set(px + 1, py, Tile.Water);
  s.world.set(px, py, Tile.Grass); // stand somewhere dry, not on the water itself

  p.pack.cordage = 3;
  p.pack.wood = 2;
  stepTick(s, [I({ makeFishingLine: true })]);
  check("a line costs cordage and wood, no fire", p.pack.fishingLine === 25 && p.pack.cordage === 1 && p.pack.wood === 1, JSON.stringify(p.pack));
  check("making a line teaches fishing", p.skills.fishing > 0, `xp=${p.skills.fishing}`);

  const awayFromWater = fresh();
  awayFromWater.players[0].pack.fishingLine = 10;
  const wpx = Math.floor(awayFromWater.players[0].x / TILE);
  const wpy = Math.floor(awayFromWater.players[0].y / TILE);
  for (const [ddx, ddy] of [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]]) awayFromWater.world.set(wpx + ddx, wpy + ddy, Tile.Grass);
  stepTick(awayFromWater, [I({ fish: true })]);
  check("no water in reach, no cast", awayFromWater.players[0].pack.fishingLine === 10 && awayFromWater.players[0].pack.fish === 0);

  let ticks = 0;
  while (p.pack.fish === 0 && ticks < 300) {
    p.x = px * TILE;
    p.y = py * TILE;
    stepTick(s, [I({ fish: true })]);
    ticks++;
  }
  check("a cast at the water's edge eventually lands a fish", p.pack.fish === 1, `after ${ticks} casts`);
  check("and the line wears with use", p.pack.fishingLine === 24, `line=${p.pack.fishingLine}`);
  check("a catch teaches fishing on top of making the line", p.skills.fishing > 0);

  // Eating priority: a hot meal beats fish, fish beats raw meat and its sickness risk.
  p.pack.cookedMeat = 0;
  p.pack.rawMeat = 3;
  p.pack.fish = 2;
  const satietyBefore = (p.needs.satiety = 200);
  stepTick(s, [I({ eat: true })]);
  check("fish is eaten before raw meat", p.pack.fish === 1 && p.pack.rawMeat === 3, JSON.stringify(p.pack));
  check("and it needs no fire to be worth eating", p.needs.satiety > satietyBefore);

  check("a green fisher rarely gets a bite", fishChance({ fishing: 0 })[0] === 4);
  check("a mastered fisher does noticeably better", fishChance({ fishing: 10000 })[0] >= 4 + 2 * 9);
}

// --- 27. a soul can strike another soul, and the cause is honest about it ---
{
  const s = fresh(2);
  const [striker, victim] = s.players;
  striker.pack.spear = 12;
  victim.x = striker.x;
  victim.y = striker.y;
  const before = victim.health;
  stepTick(s, [I({ strike: true }), I()]);
  check("a strike lands on the nearer soul, not just the nearer beast", victim.health < before, `health=${victim.health}`);
  check("the spear was spent on it, same as any other target", striker.pack.spear === 11);

  victim.health = 2; // close enough to see it through without hundreds of hits
  const [death] = stepTick(s, [I({ strike: true }), I()]);
  check("enough of a strike ends a soul, not just a beast", !victim.alive);
  check("the cause names another soul, not a beast or the cold", death && death.cause === "killed by another soul", JSON.stringify(death));
  check("the kill is counted for whoever swung", striker.kills === 1, `kills=${striker.kills}`);
}

// --- 28. a graced soul cannot be struck, and the nearer target always wins ---
{
  const s = fresh(2);
  const [striker, newcomer] = s.players;
  newcomer.x = striker.x;
  newcomer.y = striker.y;
  newcomer.graceUntil = 500;
  striker.pack.spear = 12;
  const before = newcomer.health;
  stepTick(s, [I({ strike: true }), I()]);
  check("a soul still beneath the Grey King's notice cannot be struck either", newcomer.health === before, `health=${newcomer.health}`);

  const s2 = fresh(2);
  const [p1, p2] = s2.players;
  p2.x = p1.x + TILE;
  p2.y = p1.y;
  const deer = s2.creatures.find((c) => c.kind === "deer");
  deer.x = p1.x + Math.trunc(TILE * 0.3);
  deer.y = p1.y;
  p1.pack.spear = 12;
  const deerBefore = deer.health;
  const p2Before = p2.health;
  stepTick(s2, [I({ strike: true }), I()]);
  check(
    "the nearer target is struck — a beast closer than a soul still wins",
    deer.health < deerBefore && p2.health === p2Before,
    `deer=${deer.health} p2=${p2.health}`,
  );
}

// --- 29. outlawry: a kill costs standing, marks you, and repeat offenders vanish from the hunt ---
{
  const s = fresh(4);
  const [striker, v1, v2, v3] = s.players;
  striker.pack.sword = 30; // one hit ends a soul outright, so each kill is a single clean tick

  const killOne = (victim) => {
    victim.x = striker.x;
    victim.y = striker.y;
    victim.health = 1;
    stepTick(s, [I({ strike: true }), I(), I(), I()]);
  };

  killOne(v1);
  check("a kill costs standing", striker.standing === -40, `standing=${striker.standing}`);
  check("and marks the killer", s.marked === striker.id, `marked=${s.marked}`);

  killOne(v2);
  check("a second kill costs standing again", striker.standing === -80, `standing=${striker.standing}`);
  check("still marked — not yet notorious", s.marked === striker.id);

  killOne(v3);
  check("a third kill crosses into notoriety", striker.standing === -120, `standing=${striker.standing}`);
  check("and he is no longer marked — marking him means nothing now", s.marked !== striker.id, `marked=${s.marked}`);
}

// --- 30. a notorious soul is invisible to the Lieutenant, not merely unmarked ---
{
  const s = fresh(2);
  const [notorious, bystander] = s.players;
  notorious.standing = -150;
  notorious.x = s.lieutenant.x;
  notorious.y = s.lieutenant.y;
  bystander.x = s.lieutenant.x + 30 * TILE;
  bystander.y = s.lieutenant.y;
  s.marked = notorious.id; // even if something else still points a mark at him
  stepTick(s, IDLE);
  check(
    "standing right next to him, a notorious soul is not hunted",
    s.lieutenant.state === "patrol" && s.lieutenant.target !== notorious.id,
    `state=${s.lieutenant.state} target=${s.lieutenant.target}`,
  );
}

// --- 31. Commons standing: feeding a genuinely hungry soul is the one kindness Stage B has ---
{
  const s = fresh(2);
  const [giver, hungry] = s.players;
  giver.x = hungry.x;
  giver.y = hungry.y;
  giver.pack.cookedMeat = 3;
  giver.offer = "cookedMeat";
  hungry.needs.satiety = 100; // genuinely hungry
  stepTick(s, [I({ give: true }), I()]);
  check("feeding a hungry soul raises the giver's standing", giver.standing > 0, `standing=${giver.standing}`);

  const s2 = fresh(2);
  const [giver2, full] = s2.players;
  giver2.x = full.x;
  giver2.y = full.y;
  giver2.pack.cookedMeat = 3;
  giver2.offer = "cookedMeat";
  full.needs.satiety = 950; // already fed — this is a courtesy, not a kindness
  stepTick(s2, [I({ give: true }), I()]);
  check("feeding a soul who isn't hungry earns nothing", giver2.standing === 0, `standing=${giver2.standing}`);

  const s3 = fresh(2);
  const [giver3, hungry3] = s3.players;
  giver3.x = hungry3.x;
  giver3.y = hungry3.y;
  giver3.pack.wood = 5;
  giver3.offer = "wood";
  hungry3.needs.satiety = 50;
  stepTick(s3, [I({ give: true }), I()]);
  check("wood doesn't feed anyone, so it earns no standing either", giver3.standing === 0, `standing=${giver3.standing}`);

  // Kindness climbs the same ledger a kill spends — it does not erase the
  // kill, it moves the same number back the other way.
  const s4 = fresh(2);
  const [samaritan, needy] = s4.players;
  samaritan.standing = -40; // as if freshly marked from a kill
  samaritan.x = needy.x;
  samaritan.y = needy.y;
  samaritan.pack.fish = 2;
  samaritan.offer = "fish";
  needy.needs.satiety = 80;
  stepTick(s4, [I({ give: true }), I()]);
  check("kindness climbs the same ledger a kill spends", samaritan.standing === -40 + 15, `standing=${samaritan.standing}`);
}

// --- 32. terrain variety: marsh clings to water, roads cross the map, ruins hold crowns ---
{
  const s = fresh();
  let marsh = 0;
  let road = 0;
  let ruin = 0;
  let marshAwayFromWater = 0;
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const t = s.world.get(x, y);
      if (t === Tile.Road) road++;
      else if (t === Tile.Ruin) ruin++;
      else if (t === Tile.Marsh) {
        marsh++;
        const near =
          s.world.get(x, y - 1) === Tile.Water ||
          s.world.get(x, y + 1) === Tile.Water ||
          s.world.get(x - 1, y) === Tile.Water ||
          s.world.get(x + 1, y) === Tile.Water;
        if (!near) marshAwayFromWater++;
      }
    }
  }
  check("marsh exists", marsh > 0, `marsh=${marsh}`);
  check("road exists", road > 0, `road=${road}`);
  check("ruin exists", ruin > 0, `ruin=${ruin}`);
  check("every marsh tile sits at a river's edge", marshAwayFromWater === 0, `${marshAwayFromWater} tiles of ${marsh} not near water`);
}

// --- 33. terrain changes how fast everything crosses it: a road speeds up, a marsh slows down ---
{
  const grassMove = (() => {
    const s = fresh();
    const p = s.players[0];
    const px = Math.floor(p.x / TILE);
    const py = Math.floor(p.y / TILE);
    s.world.set(px, py, Tile.Grass);
    s.world.set(px + 1, py, Tile.Grass);
    const before = p.x;
    stepTick(s, [I({ dx: 1 })]);
    return p.x - before;
  })();

  const roadMove = (() => {
    const s = fresh();
    const p = s.players[0];
    const px = Math.floor(p.x / TILE);
    const py = Math.floor(p.y / TILE);
    s.world.set(px, py, Tile.Road);
    s.world.set(px + 1, py, Tile.Grass);
    const before = p.x;
    stepTick(s, [I({ dx: 1 })]);
    return p.x - before;
  })();
  check("a road is faster to cross than grass", roadMove > grassMove, `grass=${grassMove} road=${roadMove}`);

  const marshMove = (() => {
    const s = fresh();
    const p = s.players[0];
    const px = Math.floor(p.x / TILE);
    const py = Math.floor(p.y / TILE);
    s.world.set(px, py, Tile.Marsh);
    s.world.set(px + 1, py, Tile.Grass);
    const before = p.x;
    stepTick(s, [I({ dx: 1 })]);
    return p.x - before;
  })();
  check("a marsh is slower to cross than grass", marshMove < grassMove, `grass=${grassMove} marsh=${marshMove}`);

  // The same rule applies to a fleeing deer as to the soul chasing it.
  const s = fresh();
  const deer = s.creatures.find((c) => c.kind === "deer");
  const dpx = Math.floor(deer.x / TILE);
  const dpy = Math.floor(deer.y / TILE);
  s.world.set(dpx, dpy, Tile.Marsh);
  s.world.set(dpx + 1, dpy, Tile.Grass);
  deer.wanderX = deer.x + 5 * TILE;
  deer.wanderY = deer.y;
  const beforeDeer = deer.x;
  stepTick(s, IDLE);
  const deerMarshMove = deer.x - beforeDeer;
  check("a beast bogs down in a marsh too, not only a soul", deerMarshMove > 0 && deerMarshMove < STATS.deer.grazeSpeed, `moved ${deerMarshMove}`);
}

// --- 34. squelching through a marsh carries; standing in one does not ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  s.world.set(px, py, Tile.Marsh);
  s.world.set(px + 1, py, Tile.Grass);

  const quiet = s.noise;
  stepTick(s, IDLE);
  check("standing still in a marsh is quiet", s.noise === quiet, `${quiet} -> ${s.noise}`);

  const before = s.noise;
  stepTick(s, [I({ dx: 1 })]);
  check("moving through a marsh carries", s.noise > before, `${before} -> ${s.noise}`);
}

// --- 35. a ruin never runs out, and usually pays out nothing at all ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  s.world.set(px + 1, py, Tile.Ruin);

  let ticks = 0;
  while (p.pack.crowns === 0 && ticks < 300) {
    stepTick(s, [I({ gather: true })]);
    ticks++;
  }
  check("digging through a ruin eventually turns up a crown", p.pack.crowns === 1, `after ${ticks} digs`);
  check("and the ruin is still there — it never runs out", s.world.get(px + 1, py) === Tile.Ruin);
}

// --- 36. an old crown melts down to a bar at a fire, when there is nothing better to smelt ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  s.world.set(px, py, Tile.Grass);
  p.pack.wood = 5;
  stepTick(s, [I({ build: true })]);
  stepTick(s, IDLE);
  check("standing at the fire", p.atFire === true);

  p.pack.crowns = 2;
  const beforeSmithing = p.skills.smithing;
  stepTick(s, [I({ smelt: true })]);
  check("a crown melts into a bar without any ore", p.pack.bar === 1 && p.pack.crowns === 1, JSON.stringify(p.pack));
  check("but teaches no smithing — it isn't a real smelt", p.skills.smithing === beforeSmithing);

  // Ore and charcoal still win when both are on hand — melting a crown is
  // the fallback, not the default.
  p.pack.ore = 2;
  p.pack.charcoal = 1;
  stepTick(s, [I({ smelt: true })]);
  check(
    "ore and charcoal are used first when both are available",
    p.pack.bar === 2 && p.pack.crowns === 1 && p.pack.ore === 0,
    JSON.stringify(p.pack),
  );

  const noFire = fresh();
  noFire.players[0].pack.crowns = 3;
  stepTick(noFire, [I({ smelt: true })]);
  check("no fire, no melting either", noFire.players[0].pack.crowns === 3);
}

// --- 37. new terrain: clay clings to the river like marsh does, copper is rarer than ore ---
{
  const s = fresh();
  let clay = 0;
  let clayAwayFromWater = 0;
  let copper = 0;
  let ore = 0;
  let meadow = 0;
  let thicket = 0;
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const t = s.world.get(x, y);
      if (t === Tile.Clay) {
        clay++;
        const near =
          s.world.get(x, y - 1) === Tile.Water ||
          s.world.get(x, y + 1) === Tile.Water ||
          s.world.get(x - 1, y) === Tile.Water ||
          s.world.get(x + 1, y) === Tile.Water;
        if (!near) clayAwayFromWater++;
      } else if (t === Tile.Copper) copper++;
      else if (t === Tile.Ore) ore++;
      else if (t === Tile.Meadow) meadow++;
      else if (t === Tile.Thicket) thicket++;
    }
  }
  check("clay exists", clay > 0, `clay=${clay}`);
  check(
    "every clay tile sits at a river's edge, same rule as marsh",
    clayAwayFromWater === 0,
    `${clayAwayFromWater} of ${clay} not near water`,
  );
  check("copper exists, and is rarer than ore", copper > 0 && copper < ore, `copper=${copper} ore=${ore}`);
  check("meadow exists", meadow > 0, `meadow=${meadow}`);
  check("thicket exists", thicket > 0, `thicket=${thicket}`);
}

// --- 38. copper and thicket block movement like ore and trees do; clay and meadow don't ---
{
  // One tick's move (300 units) never reaches a tile's far edge (1000
  // units) on its own — walk toward the tile for long enough that an
  // unobstructed soul would have crossed several of them, then look at
  // where they actually ended up.
  const wallStops = (tile) => {
    const s = fresh();
    const p = s.players[0];
    const px = Math.floor(p.x / TILE);
    const py = Math.floor(p.y / TILE);
    s.world.set(px + 1, py, tile);
    for (let i = 0; i < 8; i++) stepTick(s, [I({ dx: 1 })]);
    return p.x < (px + 1) * TILE;
  };
  check("copper blocks the way, same as ore", wallStops(Tile.Copper));
  check("a thicket blocks the way, same as a tree", wallStops(Tile.Thicket));
  check("clay is open ground, not a vein", !wallStops(Tile.Clay));
  check("a meadow is open ground too", !wallStops(Tile.Meadow));
}

// --- 39. gathering the four new tiles: clay and copper fill the pack, a meadow feeds you, a thicket outpays a tree ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);

  s.world.set(px + 1, py, Tile.Clay);
  stepTick(s, [I({ gather: true })]);
  check("digging clay fills the pack", p.pack.clay === 1);
  check("and the deposit is still there — it never runs out", s.world.get(px + 1, py) === Tile.Clay);

  const noiseBefore = s.noise;
  stepTick(s, [I({ gather: true })]);
  check("clay is quiet to dig, unlike a vein", s.noise - noiseBefore < 300, `noise +${s.noise - noiseBefore}`);

  s.world.set(px + 1, py, Tile.Copper);
  stepTick(s, [I({ gather: true })]);
  check("digging copper fills the pack too", p.pack.copper === 1);
  check("and the vein is still there — it never runs out", s.world.get(px + 1, py) === Tile.Copper);

  s.world.set(px + 1, py, Tile.Meadow);
  p.needs.satiety = 200;
  stepTick(s, [I({ gather: true })]);
  check("foraging a meadow feeds you", p.needs.satiety > 200);
  check("and the meadow is still there — it's grazed, not stripped", s.world.get(px + 1, py) === Tile.Meadow);

  const treeSoul = fresh();
  const t = treeSoul.players[0];
  const tx = Math.floor(t.x / TILE);
  const ty = Math.floor(t.y / TILE);
  treeSoul.world.set(tx + 1, ty, Tile.Tree);
  const woodBefore = t.pack.wood;
  const treeNoise = (() => {
    const before = treeSoul.noise;
    stepTick(treeSoul, [I({ gather: true })]);
    return treeSoul.noise - before;
  })();
  const treeWood = t.pack.wood - woodBefore;

  const thicketSoul = fresh();
  const th = thicketSoul.players[0];
  const thx = Math.floor(th.x / TILE);
  const thy = Math.floor(th.y / TILE);
  thicketSoul.world.set(thx + 1, thy, Tile.Thicket);
  const thWoodBefore = th.pack.wood;
  const thicketNoise = (() => {
    const before = thicketSoul.noise;
    stepTick(thicketSoul, [I({ gather: true })]);
    return thicketSoul.noise - before;
  })();
  const thicketWood = th.pack.wood - thWoodBefore;

  check("a thicket yields more wood than a lone tree", thicketWood > treeWood, `tree=${treeWood} thicket=${thicketWood}`);
  check("and costs more to be heard taking", thicketNoise > treeNoise, `tree=${treeNoise} thicket=${thicketNoise}`);
  check("felling it leaves a stump, same as a tree", thicketSoul.world.get(thx + 1, thy) === Tile.Stump);

  // REGROW_TICKS is 900 (tick.ts) and not exported; 950 idle ticks is
  // comfortably past it without the test needing to know the exact number.
  for (let i = 0; i < 950; i++) stepTick(thicketSoul, IDLE);
  check(
    "and it grows back into a thicket, not a lone tree",
    thicketSoul.world.get(thx + 1, thy) === Tile.Thicket,
    `tile=${thicketSoul.world.get(thx + 1, thy)}`,
  );
}

// --- 40. pottery: clay and a fire make a pot; a hot meal eaten from one goes further, and it wears by the meal, not the cook ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  s.world.set(px, py, Tile.Grass);
  p.pack.wood = 5;
  stepTick(s, [I({ build: true })]);
  stepTick(s, IDLE);
  check("standing at the fire", p.atFire === true);

  stepTick(s, [I({ makePot: true })]);
  check("no clay, no pot", p.pack.pot === 0);

  p.pack.clay = 3;
  stepTick(s, [I({ makePot: true })]);
  check("clay and a fire make a pot", p.pack.pot > 0, `pot=${p.pack.pot}`);
  check("and the clay is spent", p.pack.clay === 0);

  const noPot = fresh();
  const withPot = fresh();
  noPot.players[0].pack.cookedMeat = 1;
  noPot.players[0].needs.satiety = 0;
  withPot.players[0].pack.cookedMeat = 1;
  withPot.players[0].pack.pot = 5;
  withPot.players[0].needs.satiety = 0;
  stepTick(noPot, [I({ eat: true })]);
  stepTick(withPot, [I({ eat: true })]);
  check(
    "a hot meal eaten from a pot satisfies more than one eaten without",
    withPot.players[0].needs.satiety > noPot.players[0].needs.satiety,
    `without=${noPot.players[0].needs.satiety} with=${withPot.players[0].needs.satiety}`,
  );
  check("and the pot wears by the meal eaten, not the meal cooked", withPot.players[0].pack.pot === 4);
}

// --- 41. copper: a second, shorter metal line — smelts alone with no charcoal, forges weaker and sooner than the real sword ---
{
  const s = fresh();
  const p = s.players[0];
  s.world.set(Math.floor(p.x / TILE), Math.floor(p.y / TILE), Tile.Grass);
  p.pack.wood = 5;
  stepTick(s, [I({ build: true })]);
  stepTick(s, IDLE);

  p.pack.copper = 3;
  stepTick(s, [I({ smelt: true })]);
  check("copper smelts alone, no charcoal needed", p.pack.copperBar === 1 && p.pack.copper === 0, JSON.stringify(p.pack));

  p.pack.copperBar = 2;
  p.pack.wood = 1;
  p.pack.cordage = 1;
  stepTick(s, [I({ makeSword: true })]);
  check("a copper bar, wood and cord forge a copper sword", p.pack.copperSword > 0, `copperSword=${p.pack.copperSword}`);

  // Ore and charcoal still win over copper when both are on hand — copper
  // is the second choice at the fire, not the first.
  const s2 = fresh();
  const p2 = s2.players[0];
  s2.world.set(Math.floor(p2.x / TILE), Math.floor(p2.y / TILE), Tile.Grass);
  p2.pack.wood = 5;
  stepTick(s2, [I({ build: true })]);
  stepTick(s2, IDLE);
  p2.pack.ore = 2;
  p2.pack.charcoal = 1;
  p2.pack.copper = 3;
  stepTick(s2, [I({ smelt: true })]);
  check(
    "ore and charcoal still win over copper when both are on hand",
    p2.pack.bar === 1 && p2.pack.copper === 3 && p2.pack.copperBar === 0,
    JSON.stringify(p2.pack),
  );

  // And the real sword still wins over copper at the forge, the same way.
  const s3 = fresh();
  const p3 = s3.players[0];
  s3.world.set(Math.floor(p3.x / TILE), Math.floor(p3.y / TILE), Tile.Grass);
  p3.pack.wood = 5;
  stepTick(s3, [I({ build: true })]);
  stepTick(s3, IDLE);
  p3.pack.bar = 2;
  p3.pack.copperBar = 2;
  p3.pack.wood = 2;
  p3.pack.cordage = 2;
  stepTick(s3, [I({ makeSword: true })]);
  check(
    "the real sword still wins over copper when both bars are on hand",
    p3.pack.sword > 0 && p3.pack.copperSword === 0 && p3.pack.copperBar === 2,
    JSON.stringify(p3.pack),
  );
}

// --- 42. in a fight, the real sword beats a copper one, which beats a spear — and carrying all three spends the best one first ---
{
  const damageDoneWith = (gear) => {
    const s = fresh(2);
    const [attacker, target] = s.players;
    Object.assign(attacker.pack, gear);
    target.x = attacker.x;
    target.y = attacker.y;
    const before = target.health;
    stepTick(s, [I({ strike: true }), I()]);
    return before - target.health;
  };
  const spearDamage = damageDoneWith({ spear: 10 });
  const copperDamage = damageDoneWith({ copperSword: 10 });
  const swordDamage = damageDoneWith({ sword: 10 });
  check("a copper sword hits harder than a spear", copperDamage > spearDamage, `copper=${copperDamage} spear=${spearDamage}`);
  check("and softer than the real sword", copperDamage < swordDamage, `copper=${copperDamage} sword=${swordDamage}`);

  const both = fresh(2);
  const [bothAttacker, bothTarget] = both.players;
  bothAttacker.pack.sword = 10;
  bothAttacker.pack.copperSword = 10;
  bothTarget.x = bothAttacker.x;
  bothTarget.y = bothAttacker.y;
  stepTick(both, [I({ strike: true }), I()]);
  check(
    "carrying both, the real sword is spent first",
    bothAttacker.pack.sword === 9 && bothAttacker.pack.copperSword === 10,
    JSON.stringify(bothAttacker.pack),
  );
}

// --- 43. boots: softer marsh, not fully fast, and worn by the step through it rather than the clock ---
{
  const bareMarsh = (() => {
    const s = fresh();
    const p = s.players[0];
    const px = Math.floor(p.x / TILE);
    const py = Math.floor(p.y / TILE);
    s.world.set(px, py, Tile.Marsh);
    s.world.set(px + 1, py, Tile.Grass);
    const before = p.x;
    stepTick(s, [I({ dx: 1 })]);
    return p.x - before;
  })();

  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  s.world.set(px, py, Tile.Marsh);
  s.world.set(px + 1, py, Tile.Grass);
  p.pack.hide = 2;
  p.pack.cordage = 1;
  stepTick(s, [I({ makeBoots: true })]);
  check("hide and cordage make boots, no fire needed", p.pack.boots > 0, `boots=${p.pack.boots}`);

  const bootsBefore = p.pack.boots;
  const before = p.x;
  stepTick(s, [I({ dx: 1 })]);
  const bootedMarsh = p.x - before;
  check("boots make a marsh less slow, not fully fast", bootedMarsh > bareMarsh, `bare=${bareMarsh} booted=${bootedMarsh}`);
  check("and wear by the step through it", p.pack.boots === bootsBefore - 1);

  const beforeGrass = p.pack.boots;
  s.world.set(Math.floor(p.x / TILE), Math.floor(p.y / TILE), Tile.Grass); // wherever that step landed
  stepTick(s, [I({ dx: 1 })]);
  check("but not on plain ground", p.pack.boots === beforeGrass);
}

// --- 44. gloves: quieter on rock, ore and copper, and worn by the dig ---
{
  const bareNoise = (() => {
    const s = fresh();
    const p = s.players[0];
    const px = Math.floor(p.x / TILE);
    const py = Math.floor(p.y / TILE);
    s.world.set(px + 1, py, Tile.Rock);
    const before = s.noise;
    stepTick(s, [I({ gather: true })]);
    return s.noise - before;
  })();

  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);
  p.pack.hide = 2;
  p.pack.cordage = 1;
  stepTick(s, [I({ makeGloves: true })]);
  check("hide and cordage make gloves, no fire needed", p.pack.gloves > 0, `gloves=${p.pack.gloves}`);

  const glovesBefore = p.pack.gloves;
  s.world.set(px + 1, py, Tile.Rock);
  const before = s.noise;
  stepTick(s, [I({ gather: true })]);
  const glovedNoiseAmt = s.noise - before;
  check("gloves make chipping stone quieter", glovedNoiseAmt < bareNoise, `bare=${bareNoise} gloved=${glovedNoiseAmt}`);
  check("and wear by the dig", p.pack.gloves === glovesBefore - 1);
}

// --- 45. glue and pitch: byproducts of work already happening, not a new step to ask for them ---
{
  const s = fresh();
  const p = s.players[0];
  const px = Math.floor(p.x / TILE);
  const py = Math.floor(p.y / TILE);

  const deer = s.creatures.find((c) => c.kind === "deer");
  deer.x = p.x;
  deer.y = p.y;
  deer.state = "dead";
  deer.health = 0;
  deer.diedAtTick = s.tick;
  deer.respawnAtTick = 0;
  deer.butchered = false;
  stepTick(s, [I({ gather: true })]);
  check("butchering yields glue alongside meat and hide", p.pack.glue > 0, `glue=${p.pack.glue}`);

  s.world.set(px, py, Tile.Grass);
  p.pack.wood = 5;
  stepTick(s, [I({ build: true })]);
  stepTick(s, IDLE);
  p.pack.wood = 3;
  stepTick(s, [I({ makeCharcoal: true })]);
  check("burning charcoal yields pitch too", p.pack.pitch > 0 && p.pack.charcoal > 0, JSON.stringify(p.pack));
}

// --- 46. the village: houses stand exactly where they're placed, and NPCs live among them ---
{
  const s = fresh();
  check(
    "three houses stand in the village",
    s.world.get(4, 8) === Tile.House && s.world.get(6, 8) === Tile.House && s.world.get(5, 9) === Tile.House,
    `(4,8)=${s.world.get(4, 8)} (6,8)=${s.world.get(6, 8)} (5,9)=${s.world.get(5, 9)}`,
  );
  check("a Teacher and villagers populate it", s.npcs.some((n) => n.role === "teacher") && s.npcs.some((n) => n.role === "villager"));
  check("everyone starts alive", s.npcs.every((n) => n.alive));
}

// --- 47. talking: H opens the nearest conversation at the tree's root, and closes it on a second press ---
{
  const s = fresh();
  const p = s.players[0];
  const teacher = s.npcs.find((n) => n.role === "teacher");
  p.x = teacher.x;
  p.y = teacher.y;
  stepTick(s, [I({ talk: true })]);
  check("H opens a conversation with whoever is nearest", p.talkingTo === teacher.id, `talkingTo=${p.talkingTo}`);
  check("starting at the tree's root", p.dialogueNode === "root");

  stepTick(s, [I({ talk: true })]);
  check("H again closes it", p.talkingTo === null && p.dialogueNode === null);
}

// --- 48. dialogue choices move the conversation, and while it's open the numbered keys stop crafting ---
{
  const s = fresh();
  const p = s.players[0];
  const teacher = s.npcs.find((n) => n.role === "teacher");
  p.x = teacher.x;
  p.y = teacher.y;
  stepTick(s, [I({ talk: true })]);

  p.pack.wood = 5; // enough that makeSpear would otherwise succeed
  stepTick(s, [I({ makeSpear: true })]); // root's option 1: "No. Show me." -> "fire"
  check("picking a reply moves to the node it points at", p.dialogueNode === "fire");
  check("and does not also craft — the key was spent on the conversation", p.pack.spear === 0, `spear=${p.pack.spear}`);

  stepTick(s, [I({ makeSpear: true })]); // "fire" node's only reply -> "food"
  check("a conversation can go more than one node deep", p.dialogueNode === "food");

  stepTick(s, [I({ makeSpear: true })]); // "food" node's option 1 -> null
  check("a reply that leads nowhere ends the conversation", p.talkingTo === null && p.dialogueNode === null);
}

// --- 49. how the road speaks of you decides which villager you get, before a word is said ---
{
  const neutral = fresh();
  const np = neutral.players[0];
  const nv = neutral.npcs.find((n) => n.role === "villager");
  np.x = nv.x;
  np.y = nv.y;
  stepTick(neutral, [I({ talk: true })]);
  check("a neutral soul gets the ordinary greeting", np.dialogueNode === "root");

  const wary = fresh();
  const wp = wary.players[0];
  const wv = wary.npcs.find((n) => n.role === "villager");
  wp.x = wv.x;
  wp.y = wv.y;
  wp.standing = -10;
  stepTick(wary, [I({ talk: true })]);
  check("a soul with a mark on their name gets a warier one", wp.dialogueNode === "wary");

  const notorious = fresh();
  const np2 = notorious.players[0];
  const nv2 = notorious.npcs.find((n) => n.role === "villager");
  np2.x = nv2.x;
  np2.y = nv2.y;
  np2.standing = -150;
  stepTick(notorious, [I({ talk: true })]);
  check("a notorious soul is refused outright", np2.dialogueNode === "refuse");

  const withTeacher = fresh();
  const tp = withTeacher.players[0];
  const teacherNpc = withTeacher.npcs.find((n) => n.role === "teacher");
  tp.x = teacherNpc.x;
  tp.y = teacherNpc.y;
  tp.standing = -150;
  stepTick(withTeacher, [I({ talk: true })]);
  check("the Teacher talks to a notorious soul the same as anyone", tp.dialogueNode === "root");
}

// --- 50. NPCs can be struck and killed, and it costs more standing than killing a player does ---
{
  const s = fresh();
  const p = s.players[0];
  const teacher = s.npcs.find((n) => n.role === "teacher");
  p.x = teacher.x;
  p.y = teacher.y;
  p.pack.sword = 10;

  let ticks = 0;
  while (teacher.alive && ticks < 20) {
    stepTick(s, [I({ strike: true })]);
    ticks++;
  }
  check("an NPC can be struck down", !teacher.alive, `still alive after ${ticks} strikes`);
  check("it costs more standing than killing a player (60, not 40)", p.standing === -60, `standing=${p.standing}`);
  check("and marks the killer, the same as any other kill", s.marked === p.id);
  check("but teaches no hunting — there was nothing to hunt", p.skills.hunting === 0, `hunting xp=${p.skills.hunting}`);
}

// --- 51. an NPC closer than a beast or another soul is the one that gets struck ---
{
  const s = fresh(2);
  const [p, other] = s.players;
  const villager = s.npcs.find((n) => n.role === "villager");
  p.pack.sword = 5;
  villager.x = p.x;
  villager.y = p.y;
  other.x = p.x + 5 * TILE; // far enough not to compete
  other.y = p.y;
  for (const c of s.creatures) {
    c.x = p.x + 5 * TILE;
    c.y = p.y;
  }
  const before = villager.health;
  stepTick(s, [I({ strike: true }), I()]);
  check("the nearer villager is struck over a farther beast or soul", villager.health < before, `health=${villager.health}`);
}

// --- 52. teaching: a live master passes on their best skill to a live student, capped one level short of their own ---
{
  // Below TEACH_MIN_LEVEL there is nothing worth passing on.
  const s = fresh(2);
  const [teacher, student] = s.players;
  teacher.skills.woodcraft = 20; // level 1, "a poor woodcutter"
  student.x = teacher.x;
  student.y = teacher.y;
  stepTick(s, [I({ teach: true }), I()]);
  check("a teacher below the minimum level teaches nothing", student.skills.woodcraft === 0, `xp=${student.skills.woodcraft}`);

  // A real master raises a green student, but a lesson alone never closes the gap all the way.
  const s2 = fresh(2);
  const [master, apprentice] = s2.players;
  master.skills.woodcraft = 300; // level 5, "a skilled woodcutter"
  apprentice.x = master.x;
  apprentice.y = master.y;
  const ceiling = teachingCeiling(level(master.skills.woodcraft));
  for (let i = 0; i < 40; i++) stepTick(s2, [I({ teach: true }), I()]);
  check(
    "teaching raises the student's matching skill, capped one level short of the master's",
    apprentice.skills.woodcraft === ceiling && level(apprentice.skills.woodcraft) === level(master.skills.woodcraft) - 1,
    `student xp=${apprentice.skills.woodcraft} ceiling=${ceiling}`,
  );

  // Teaching always uses the teacher's single best skill — no separate picker.
  const s3 = fresh(2);
  const [multi, blank] = s3.players;
  multi.skills.woodcraft = 100; // level 3
  multi.skills.fishing = 300; // level 5 — the one that actually gets taught
  blank.x = multi.x;
  blank.y = multi.y;
  stepTick(s3, [I({ teach: true }), I()]);
  check(
    "teaching passes on the teacher's single best skill",
    blank.skills.fishing > 0 && blank.skills.woodcraft === 0,
    `fishing=${blank.skills.fishing} woodcraft=${blank.skills.woodcraft}`,
  );

  // Teaching for free is a Commons standing act too, same ledger feeding already climbs.
  const s4 = fresh(2);
  const [kind, learner] = s4.players;
  kind.skills.hunting = 300; // level 5
  learner.x = kind.x;
  learner.y = kind.y;
  stepTick(s4, [I({ teach: true }), I()]);
  check("teaching for free raises the teacher's standing", kind.standing === 15, `standing=${kind.standing}`);
}

// --- 53. offline safety: "never made it home" goes through the same honest pipeline as any other death ---
{
  // The actual camped-vs-exposed decision lives in server.mjs's socket
  // "close" handler, which this suite doesn't reach (no WebSocket layer
  // here) — what's checked is the sim-side contract that handler relies on:
  // a soul zeroed out from outside a normal tick still dies for real, with
  // a real cause and a real Barrow-list entry, rather than being silently
  // erased the way an abandoned soul used to be regardless of where it was.
  const s = fresh(1);
  const p = s.players[0];
  s.lastDamageSource[p.id] = "never made it home";
  p.health = 0;
  const deaths = stepTick(s, [I()]);
  check(
    "a soul with nobody driving it, exposed, dies through the ordinary pipeline",
    deaths.length === 1 && deaths[0].cause === "never made it home",
    JSON.stringify(deaths),
  );
  check("and it actually lands — the soul is gone, not left standing", !p.alive, `alive=${p.alive}`);
}

// --- 54. the bow: a Bowyer's stave and a Fletcher's arrows, reached for only when nothing is already in arm's reach ---
{
  // Crafting both halves of the pair.
  const s = fresh(1);
  const p = s.players[0];
  p.pack.wood = 3;
  p.pack.cordage = 2;
  p.pack.pitch = 1;
  stepTick(s, [I({ makeBow: true })]);
  check("a bow costs wood, cordage and pitch", p.pack.bow === 20 && p.pack.wood === 0 && p.pack.cordage === 0 && p.pack.pitch === 0, JSON.stringify(p.pack));

  const s2 = fresh(1);
  const p2 = s2.players[0];
  p2.pack.wood = 1;
  p2.pack.glue = 1;
  stepTick(s2, [I({ makeArrow: true })]);
  check("fletching needs a knife already in hand, same as cordage does", p2.pack.arrow === 0, `arrow=${p2.pack.arrow}`);
  p2.pack.knife = 1;
  p2.pack.wood = 1;
  p2.pack.glue = 1;
  stepTick(s2, [I({ makeArrow: true })]);
  check("with a knife, wood and glue fletch a batch of two", p2.pack.arrow === 2 && p2.pack.wood === 0 && p2.pack.glue === 0, JSON.stringify(p2.pack));

  // Melee wins over a bow whenever something is already close enough to hit by hand.
  const near = fresh(2);
  const [meleeAttacker, closeTarget] = near.players;
  meleeAttacker.pack.spear = 10;
  meleeAttacker.pack.bow = 10;
  meleeAttacker.pack.arrow = 10;
  closeTarget.x = meleeAttacker.x;
  closeTarget.y = meleeAttacker.y;
  const beforeClose = closeTarget.health;
  stepTick(near, [I({ strike: true }), I()]);
  check(
    "a spear is used on a target already in melee range, not the bow",
    beforeClose - closeTarget.health === 3 && meleeAttacker.pack.spear === 9 && meleeAttacker.pack.arrow === 10,
    `damage=${beforeClose - closeTarget.health} spear=${meleeAttacker.pack.spear} arrow=${meleeAttacker.pack.arrow}`,
  );

  // Nothing in melee range, but the bow reaches a target several tiles off.
  // Creatures and NPCs are pushed well clear first — BOW_RADIUS is wide
  // enough to otherwise catch the village or the roster by accident, the
  // way STRIKE_RADIUS's much tighter 1.2 tiles never could.
  const far = fresh(2);
  const [archer, farTarget] = far.players;
  for (const c of far.creatures) { c.x = archer.x + 20 * TILE; c.y = archer.y; }
  for (const npc of far.npcs) { npc.x = archer.x + 20 * TILE; npc.y = archer.y; }
  archer.pack.bow = 10;
  archer.pack.arrow = 10;
  farTarget.x = archer.x + 4 * TILE;
  farTarget.y = archer.y;
  const beforeFar = farTarget.health;
  stepTick(far, [I({ strike: true }), I()]);
  check(
    "a bow hits a target well outside melee range, and spends an arrow and its own durability",
    beforeFar - farTarget.health === 2 && archer.pack.arrow === 9 && archer.pack.bow === 9,
    `damage=${beforeFar - farTarget.health} arrow=${archer.pack.arrow} bow=${archer.pack.bow}`,
  );

  // The same reach, with no bow at all, does nothing — a bare hand doesn't suddenly have range.
  const bareHanded = fresh(2);
  const [nobody, safeTarget] = bareHanded.players;
  for (const c of bareHanded.creatures) { c.x = nobody.x + 20 * TILE; c.y = nobody.y; }
  for (const npc of bareHanded.npcs) { npc.x = nobody.x + 20 * TILE; npc.y = nobody.y; }
  safeTarget.x = nobody.x + 4 * TILE;
  safeTarget.y = nobody.y;
  const beforeSafe = safeTarget.health;
  stepTick(bareHanded, [I({ strike: true }), I()]);
  check("without a bow, a target out of melee range takes nothing", safeTarget.health === beforeSafe, `health=${safeTarget.health}`);

  // Arrows are ammunition, not a wear counter — a Fletcher can resupply someone else's quiver.
  const s3 = fresh(2);
  const [giver, receiver] = s3.players;
  giver.x = receiver.x;
  giver.y = receiver.y;
  giver.pack.arrow = 5;
  giver.offer = "arrow";
  stepTick(s3, [I({ give: true }), I()]);
  check("arrows can be handed to another soul", giver.pack.arrow === 4 && receiver.pack.arrow === 1, JSON.stringify({ giver: giver.pack.arrow, receiver: receiver.pack.arrow }));
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
