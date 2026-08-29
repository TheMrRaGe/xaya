# Stage B — The Verge

> "Does dying hurt, and do you start again anyway? If you don't feel that
> yourself, playing your own game, nobody else will." — the plan's Stage B
> gate.

A single-zone browser prototype. One Realm (the Verge), one Lieutenant,
enough living things to make the zone worth walking into, and room for more
than one soul to be standing in it.
This is deliberately not the game — it's the smallest possible version of the
loop the whole design is built on: survive, build, get seen, maybe die, and
start again as the next soul.

## Run it

```
npm install    # the TypeScript compiler, and ws for the server
npm start      # compiles src/ to dist/ and opens the Verge on :8000
```

Then open `http://localhost:8000/`. **Open it in a second tab and there are
two souls in the same world** — they can see each other, get hunted by the
same Lieutenant, and hand each other things.

For two people on two machines on the same network:

```
HOST=0.0.0.0 npm start
```

and the other machine opens `http://<your-ip>:8000/`. It binds to localhost
by default, because opening a game server to the network should be a thing
you typed rather than a thing that happened.

`npm run build` and `npm run serve` are available separately, and
`npm run watch` recompiles on save. `node serve.mjs` serves the files with
no game attached, if that is ever useful.

The static server is hand-rolled rather than `python -m http.server` for one
reason: Python takes its MIME types from the Windows registry, where `.js`
is often registered as `text/plain`, and Chrome refuses a
`<script type="module">` served as `text/plain`. The symptom is a blank
300×150 canvas on a black page with the game's own code never running.

## Controls

| key | verb |
|---|---|
| **WASD / arrows** | move |
| **E** | gather — chop a tree, pick a bush, drink from water, or butcher a carcass you're standing over |
| **SPACE** | strike — hit the nearest living thing in reach |
| **F** | feed the fire you're standing at (1 wood), or build one where there isn't one (5 wood, on grass) |
| **1** | sharpen a spear (3 wood) — 3 damage a hit instead of 1, for 12 hits |
| **2** | cook one raw meat (must be at a fire) |
| **3** | stitch a hide cloak (2 hide, at a fire) — cold takes half as much, until it wears through |
| **4** | eat — cooked if you have it, raw if you're desperate |
| **T** | cycle what you're offering (wood / raw meat / cooked meat / hide) |
| **G** | give one of it to the nearest other soul |

## What's actually happening under the hood

- **Fixed-point, seeded, no floats in the sim tick** (`src/sim/fixed.ts`,
  `src/sim/rng.ts`) — per §43A / §49's "adopt the discipline, skip the
  harness." The renderer (`src/render/`) is the only place a float appears.
  This buys nothing today, on a single machine, in a single-player
  prototype. It costs nothing to have done correctly from the first line
  and is the expensive thing to retrofit if this ever needs to run on
  more than one machine at once.
- **The noise mechanic is the actual thesis, made mechanical.** Every
  gather, craft, strike and cooking fire raises a `noise` scalar that decays
  slowly. The Lieutenant's detection radius scales with current noise and is
  larger at night. That's §1's "everything you build makes you easier to
  see," playable rather than just written down.
- **The crows are the tell.** Past a noise threshold, crows gather over
  wherever you were last loud and drift after you — and a patrolling
  Lieutenant walks toward the crows instead of wandering. So your own noise
  is *visible*, to you and to him, and the counter-play falls out of it for
  free: work in short bursts, or go quiet and let the flock thin, or be loud
  somewhere on purpose and leave before he arrives.
- **Deer spook, boar charge.** Deer flee from you, and from a radius that
  grows with your noise — a camp that gathers hard all day is a camp whose
  meat has walked to the far side of the map. Boar ignore you until you
  swing at one, and a boar is *faster than you are*. You cannot outrun what
  you started; you can only outlast its temper (~26s) or put a spear in it.
  That is the one place in Stage B where greed, not bad luck, kills you.
- **A short refining chain**, which is §44's "a few professions worth of
  actions" at its smallest: kill → butcher → cook at a fire → eat. Raw meat
  is worth little and makes you sick one bite in four; cooked meat is worth
  four times as much and warms you. Hides become a cloak. The fire is now
  load-bearing three ways — warmth, cooking, and being seen.
- **Nothing you make is permanent**, which is the substrate the economy
  will stand on (DESIGN §6.3). A spear holds 12 strikes. A cloak wears
  through on the cold it keeps off you. A campfire burns fuel and goes out,
  leaving ash the grass takes back — so wood is a recurring need rather than
  a one-time purchase of five, and a night costs about ten logs to keep lit.
  Raw meat rots on a timer; cooked meat keeps. Solo, this reads as pressure.
  With a second player it reads as *demand* — the reason anyone would make a
  spear for someone else, which is the thing Stage C has to test.
- **The server is the only thing that decides what is true.** `server.mjs`
  owns the sim and runs it at 10 Hz; a client sends which keys are down and
  draws whatever it is told, and runs no sim of its own. Whole state goes
  out every tick — at 24×16 tiles and six beasts that is ~2.5 KB of JSON,
  so a client that joins late, lags or reconnects is correct on the next
  tick with no reconciliation code at all. That split is DESIGN §6.8's
  point: swap this authority for a chain and neither the renderer nor
  `src/sim/` notices.
- **The Verge holds more than one soul.** The tick takes one `Input` per
  player and returns every death that happened in it — the same shape a
  server or a chain would hand it, so nothing above `src/sim/` needs to know
  which one is driving (DESIGN §6.8). The Lieutenant hunts whichever soul is
  nearest, which makes standing near someone else a risk and a shield at
  once. A boar holds its grudge against whoever swung first.
- **Giving, and a ledger.** **T** picks what you're offering, **G** hands one
  to the soul beside you. Giving is one-sided on purpose: two people who
  each want what the other has will trade by giving twice, and that is
  enough to answer Stage C's only question — *do they?* Escrow and a
  currency are for when the other soul is a stranger, which is a later
  problem. Every hand-over is appended to `state.trades` from the very first
  one, because DESIGN §6.8 says trades have to be authoritative, logged and
  replayable if cash-out is ever to be possible, and that is free now and
  impossible to retrofit.
- **Fleeing works.** Contact damage only applies while you're standing in
  the Lieutenant's contact radius; break away and it stops. He also loses
  interest if you get far enough away, with hysteresis so he doesn't flicker
  at the boundary. This is §21's "fleeing must work" and §25's Mortal Wound,
  simplified for a solo prototype with no rescue mechanic yet.
- **Permadeath with a Barrow-list.** Death ends the run, logs an obituary
  (cause, ticks survived, wood carried, beasts taken) to `localStorage`, and
  increments a lineage counter. The death screen shows the last few entries.
  No server, no chain — `localStorage` is genuinely the right amount of
  infrastructure for one person testing whether the loop feels good.

### Three things that were quietly broken

Worth recording, because two of them had been silently cancelling the
design's own central tension:

1. **Warmth never drained.** The "am I near a fire?" check compared the
   player against the corner of their own tile, which is always inside the
   fire radius — so cold could never kill anyone and the campfire, the one
   object that trades safety for visibility, was decoration. It now scans
   for an actual campfire tile in range.
2. **The Lieutenant was faster than the player on diagonals.** Neither
   diagonal move was normalised, so anything moving on both axes travelled
   1.41× its stated speed. At 260 vs. the player's 300 he was meant to be
   slower — on a diagonal approach he was effectively 368. §21 says fleeing
   must work; it didn't, in the direction people actually run.
3. **Everything stopped dead on trees.** A move blocked on either axis was
   rejected outright rather than sliding, so the hunter snagged on corners
   and so did you. `src/sim/move.ts` now slides.

## The Stage B cut, and what's deliberately *not* here

Per the plan's own named cut list (§44), checked off:

| In scope | Built |
|---|---|
| The Verge, nothing else | ✅ one zone, no Realm gating |
| A few professions worth of actions | ✅ gather, hunt, butcher, cook, craft (spear, cloak, fire) |
| Three creatures | ✅ deer, boar, and the crows |
| Barter economy | ✅ two people, two keyboards, one Verge, and everything handed over is on a ledger. No currency and no escrow — those are for strangers |
| One Lieutenant, no Muster | ✅ |
| Permadeath, obituary not full Barrow-list UI | ✅ (a real Barrow-list, just minimal) |

Explicitly **out**, same as the plan says: land, guilds, ecology population
math, the Shards, magic, any second player, any server. The creatures are a
fixed roster that respawns on a timer somewhere you aren't — deliberately
*not* a population model, because that is the fun thing to write that later
turns out to be why a tick costs 40ms.

## Cost per tick

The whole sim, worst case — moving, gathering and striking every single
tick with the full creature roster alive — measured on this machine:

```
2.55 µs/tick  ≈  0.003% of one core at 10 Hz
```

That is the budget to protect. Everything in `src/sim/` is integer math on
a 24×16 grid with no allocation in the hot path, which is why it runs on
anything. If a feature can't be done in that shape, it's a feature for a
tier that isn't the tick.

## What to actually test

Play until you die at least twice. Then ask, honestly:

- Did the death feel earned, or did it feel like bad luck?
- Did you want to start again immediately, or did you close the tab?
- Did building the fire feel like a real decision (warmth and hot food vs.
  being found), or was it free?
- Did you *see* the crows arrive and change what you were doing? That's the
  one that tells you whether the noise thesis reads as a mechanic or just as
  a number in the HUD.
- Did you ever pick a fight with a boar on purpose? Did you regret it?
- When the fire burned low, did going for wood feel like a chore or like a
  risk? If it's a chore, the wood cost is too high or the danger too low —
  that number is the difference between a treadmill and a livelihood.

With two people, the only question that matters:

- **Did you trade because you wanted to, or because I asked you to?** If
  two souls with different luck don't start handing each other things
  unprompted, no currency, escrow or market UI will fix that — it means the
  professions aren't different enough from each other yet, and that is a
  content problem rather than an economy one.

One thing you'll notice immediately with two people: an idle soul is dead in
about 23 seconds, because the Lieutenant is tuned for a solo run where you
are always moving. Standing still to talk or to hand something over is
currently lethal. That number wants revisiting once two people have actually
tried to have a conversation in the Verge — but feel it first.

That's the whole gate. Tuning numbers (drain rates, detection radius,
Lieutenant speed, how hard a boar hits) are all placeholders at the top of
`src/sim/tick.ts` and `src/sim/creatures.ts` — deliberately loud constants,
meant to be changed based on what playing it actually feels like, not on a
formula.
