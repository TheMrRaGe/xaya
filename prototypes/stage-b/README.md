# Stage B — The Verge

> "Does dying hurt, and do you start again anyway? If you don't feel that
> yourself, playing your own game, nobody else will." — the plan's Stage B
> gate.

A single-zone browser prototype. One player, one Realm (the Verge), one
Lieutenant. This is deliberately not the game — it's the smallest possible
version of the loop the whole design is built on: survive, build, get seen,
maybe die, and start again as the next soul.

## Run it

```
npm install    # pulls in the TypeScript compiler only — no other deps
npm run build  # compiles src/ to dist/
npm run serve  # serves this directory at http://localhost:8000
```

Then open `http://localhost:8000/` in a browser. (It has to be served, not
opened as a `file://` URL — browsers block ES module imports from disk.)

If you don't want the `npm install`, any global `tsc` works too:
`tsc -p tsconfig.json`, then serve the directory with anything that serves
static files.

## Controls

- **WASD / arrow keys** — move
- **E** — gather: chop a tree, pick a bush, or drink from water, whichever
  you're facing/standing next to
- **F** — build a campfire (costs 5 wood; stand on grass)

## What's actually happening under the hood

- **Fixed-point, seeded, no floats in the sim tick** (`src/sim/fixed.ts`,
  `src/sim/rng.ts`) — per §43A / §49's "adopt the discipline, skip the
  harness." The renderer (`src/render/`) is the only place a float appears.
  This buys nothing today, on a single machine, in a single-player
  prototype. It costs nothing to have done correctly from the first line
  and is the expensive thing to retrofit if this ever needs to run on
  more than one machine at once.
- **The noise mechanic is the actual thesis, made mechanical.** Every
  gather and every craft raises a `noise` scalar that decays slowly. The
  Lieutenant's detection radius scales with current noise, and is larger
  at night. That's §1's "everything you build makes you easier to see,"
  playable rather than just written down — chop wood quietly and rarely,
  and he mostly won't find you; build a fire and gather constantly, and
  he will.
- **Fleeing works.** Contact damage only applies while you're standing in
  the Lieutenant's contact radius; break line of distance and it stops.
  He also loses interest (returns to patrol) if you get far enough away,
  with hysteresis so he doesn't flicker between states at the boundary.
  This is §21's "fleeing must work" and §25's Mortal Wound, simplified for
  a solo prototype with no rescue mechanic yet.
- **Permadeath with a Barrow-list.** Death ends the run, logs an obituary
  (cause, ticks survived, wood carried) to `localStorage`, and increments
  a lineage counter. The death screen shows the last few entries. No
  server, no chain — `localStorage` is genuinely the right amount of
  infrastructure for one person testing whether the loop feels good.

## The Stage B cut, and what's deliberately *not* here

Per the plan's own named cut list (§44), checked off:

| In scope | Built |
|---|---|
| The Verge, nothing else | ✅ one zone, no Realm gating |
| A few professions worth of actions | Partial — gather (Farmer/Hunter/Logger-flavored), drink, build. No refining/crafting chain yet |
| Three creatures | Not yet — no animals, only the Lieutenant |
| Barter economy | N/A — no trade partner exists in a solo prototype |
| One Lieutenant, no Muster | ✅ |
| Permadeath, obituary not full Barrow-list UI | ✅ (a real Barrow-list, just minimal) |

Explicitly **out**, same as the plan says: land, guilds, ecology
population math, the Shards, magic, any second player, any server. If a
change doesn't map onto the cut list above, it's design for later, not a
Stage B task.

## What to actually test

Play until you die at least twice. Then ask, honestly:

- Did the death feel earned, or did it feel like bad luck?
- Did you want to start again immediately, or did you close the tab?
- Did building the fire feel like a real decision (warmth vs. being
  found), or was it free?

That's the whole gate. Tuning numbers (drain rates, detection radius,
Lieutenant speed) are all placeholders in `src/sim/tick.ts` — deliberately
loud constants at the top of the file, meant to be changed based on what
playing it actually feels like, not on a formula.
