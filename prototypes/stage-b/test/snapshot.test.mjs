// The wire, and what it is no longer honest to send: net/snapshot.ts is
// what makes the camera in render.ts more than a cropped view of
// information the client had the whole time. These checks exist because a
// fog a client could see through by reading the network tab instead of the
// screen is not fog, it is set dressing.
//
//     node test/snapshot.test.mjs   (or `npm test`)
import { newSim, stepTick } from "../dist/sim/tick.js";
import { newPlayer } from "../dist/sim/entities.js";
import { TILE } from "../dist/sim/fixed.js";
import { snapshot, VISIBILITY_RADIUS } from "../dist/net/snapshot.js";

let failures = 0;
const check = (name, cond, detail = "") => {
  console.log(cond ? `  ok   ${name}` : `  FAIL ${name} ${detail}`);
  if (!cond) failures++;
};

const fresh = (n = 2) => newSim(0xc0ffee, Array.from({ length: n }, (_, i) => newPlayer(i + 1, i)));

// --- a viewer always sees themselves ---
{
  const s = fresh(1);
  const snap = snapshot(s, 0);
  check("a viewer's own slot is never fogged", snap.players[0] !== null && snap.players[0].id === 0);
}

// --- distance decides everyone else ---
{
  const s = fresh(2);
  const [near, far] = s.players;
  near.x = 0;
  near.y = 0;
  far.x = 0;
  far.y = 0;

  const beside = snapshot(s, 0);
  check("a nearby soul is visible", beside.players[1] !== null, JSON.stringify(beside.players[1]));

  far.x = VISIBILITY_RADIUS * 3;
  far.y = 0;
  const apart = snapshot(s, 0);
  check("a soul well past the radius is fogged", apart.players[1] === null);
  check("but the viewer still sees themselves", apart.players[0] !== null && apart.players[0].id === 0);

  // And it is symmetric in the sense that matters: each soul's own view is
  // computed from their own position, not from soul 0's.
  const fromFar = snapshot(s, 1);
  check("the far soul's own view still shows themselves", fromFar.players[1] !== null);
  check("and does not show the one now far from *them*", fromFar.players[0] === null);
}

// --- a dead soul is never shown to anyone but stays out of nobody's data by surprise ---
{
  const s = fresh(2);
  const [me, other] = s.players;
  other.x = me.x;
  other.y = me.y;
  other.alive = false;
  const snap = snapshot(s, 0);
  check("a dead soul standing right next to you is still fogged", snap.players[1] === null);
}

// --- the Lieutenant is a body too ---
{
  const s = fresh(1);
  const p = s.players[0];
  s.lieutenant.x = p.x;
  s.lieutenant.y = p.y;
  const close = snapshot(s, 0);
  check("a Lieutenant standing next to you is visible", close.lieutenant !== null);

  s.lieutenant.x = p.x + VISIBILITY_RADIUS * 4;
  s.lieutenant.y = p.y;
  const gone = snapshot(s, 0);
  check("a Lieutenant across the map is not", gone.lieutenant === null);
}

// --- creatures are filtered the same way ---
{
  const s = fresh(1);
  const p = s.players[0];
  for (const c of s.creatures) {
    c.x = p.x;
    c.y = p.y;
  }
  const allNear = snapshot(s, 0);
  check("every creature near you is sent", allNear.creatures.length === s.creatures.length, `${allNear.creatures.length}/${s.creatures.length}`);

  for (const c of s.creatures) {
    c.x = p.x + VISIBILITY_RADIUS * 4;
    c.y = p.y;
  }
  const allFar = snapshot(s, 0);
  check("and none of them are once they are all far away", allFar.creatures.length === 0, `${allFar.creatures.length} left`);
}

// --- terrain and sound are not fog's business ---
{
  const s = fresh(2);
  const [near, far] = s.players;
  near.x = 0;
  near.y = 0;
  far.x = VISIBILITY_RADIUS * 5;
  far.y = VISIBILITY_RADIUS * 5;
  s.noise = 400;
  s.noiseX = 3 * TILE;
  s.noiseY = 3 * TILE;
  s.crowX = 5 * TILE;
  s.crowY = 5 * TILE;

  const a = snapshot(s, 0);
  const b = snapshot(s, 1);
  check("tiles are identical for two souls on opposite sides of the map", JSON.stringify(a.tiles) === JSON.stringify(b.tiles));
  check("so is fire state", JSON.stringify(a.fires) === JSON.stringify(b.fires));
  check("noise is a shared signal, not a fogged one", a.noise === b.noise && a.noise === s.noise);
  check("and so is where the crows are", a.crowX === b.crowX && a.crowY === b.crowY);
}

// --- NPCs are filtered the same way creatures are ---
{
  const s = fresh(1);
  const p = s.players[0];
  for (const n of s.npcs) {
    n.x = p.x;
    n.y = p.y;
  }
  const allNear = snapshot(s, 0);
  check("every villager near you is sent", allNear.npcs.length === s.npcs.length, `${allNear.npcs.length}/${s.npcs.length}`);

  for (const n of s.npcs) {
    n.x = p.x + VISIBILITY_RADIUS * 4;
    n.y = p.y;
  }
  const allFar = snapshot(s, 0);
  check("and none of them are once they are all far away", allFar.npcs.length === 0, `${allFar.npcs.length} left`);
}

// --- a live tick doesn't choke on any of this ---
{
  const s = fresh(3);
  for (let i = 0; i < 50; i++) stepTick(s, []); // every id falls back to NO_INPUT
  for (const p of s.players) {
    const snap = snapshot(s, p.id);
    check(`soul #${p.lineage} gets a snapshot that includes themselves`, snap.players[p.id] !== null && snap.players[p.id].id === p.id);
  }
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
