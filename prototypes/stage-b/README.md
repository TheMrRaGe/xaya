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

`npm test` runs the checks (297 of them across 5 suites, ~2s, no browser). `npm run build`
and `npm run serve` are available separately, and `npm run watch` recompiles
on save.

**The Grey King speaks for himself** if you set `OVERLORD=1`. He talks to
whatever model you point him at, and the default is one on your own machine:

```
ollama pull llama3.2:3b     # ~2GB, and plenty for one line of menace
OVERLORD=1 npm start
```

Any OpenAI-compatible `/chat/completions` endpoint works — Ollama, LM
Studio, llama.cpp's server, or a hosted free tier — via `OVERLORD_URL`,
`OVERLORD_MODEL` and an optional `OVERLORD_KEY`. There is no SDK and no
account: it is one `fetch` against a shape every local runner already
speaks, so the voice costs nothing to run and is tied to no vendor.

He is a **Storyteller**, not a commentator (DESIGN §3.5). Every half minute
he is handed a menu of things he may legally do — send the Lieutenant
walking, gather crows over an empty field, bring a cold snap, blight the
ground, loose an angry boar, loose a pair of wolves, mark a soul as wanted,
or do nothing — and he picks one and says why. The reason is the line you
see, so narration is the visible half of a decision rather than decoration.

What he may choose from depends on **pressure**: what the Verge has built.
Goods carried, tools held, skills learned, fires lit, souls alive. The
expensive incidents stay locked until the camp has earned them, and a death
buys the survivors quiet for a while. That is §1's thesis at a longer
timescale — noise is what your last minute cost you, pressure is what your
whole camp costs you.

Doing nothing is always on the menu and is the commonest single choice. A
storyteller that acts every cycle is a slot machine.

Without it the **Understudy** speaks: canned lines chosen to match what
happened, no network and no cost. It also covers whenever the model is
missing, slow, or answers with something unusable. That split is DESIGN
§3.2's liveness guarantee in miniature — the world never goes quiet because
inference was unavailable.

`node serve.mjs` serves the files with no game attached, if that is ever
useful.

The static server is hand-rolled rather than `python -m http.server` for one
reason: Python takes its MIME types from the Windows registry, where `.js`
is often registered as `text/plain`, and Chrome refuses a
`<script type="module">` served as `text/plain`. The symptom is a blank
300×150 canvas on a black page with the game's own code never running.

## Controls

| key | verb |
|---|---|
| **WASD / arrows** | move |
| **E** | gather — chop a tree, chip a rock, pick a bush, drink from water, or butcher a carcass you're standing over |
| **SPACE** | strike — hit the nearest living thing in reach |
| **F** | feed the fire you're standing at (1 wood), or build one where there isn't one (5 wood, on grass) |
| **1** | sharpen a spear (3 wood) — 3 damage a hit instead of 1, for 12 hits |
| **2** | cook one raw meat (must be at a fire) |
| **3** | stitch a hide cloak (2 hide, at a fire) — cold takes half as much, until it wears through |
| **4** | eat — cooked if you have it, raw if you're desperate |
| **5** | knap a knife (1 stone, 1 wood) — more off every carcass, for 20 of them, and the only way to cut cord |
| **6** | bind an axe (2 stone, 1 wood) — two more logs a tree *and a third less noise*, for 25 chops |
| **7** | cut cord (1 hide → 2 cord) — needs a knife in hand |
| **8** | make a snare (2 cord, 1 wood); press again to set the one you're carrying |
| **9** | smother wood into charcoal (3 wood → 1 charcoal at nothing, 2 at mastery, at a fire) |
| **0** | smelt a bar (2 ore, 1 charcoal, +1 bar at mastery, at a fire) |
| **B** | forge a sword (2 bar, 1 wood, 1 cord) — double the spear's base damage, for 30 hits, plus a smith's own skill |
| **L** | knot a fishing line (2 cord, 1 wood) — no fire needed, for 25 casts |
| **C** | cast at the water's edge with a line in hand — one attempt per press, like every other verb here |
| **T** | cycle what you're offering (wood / stone / cord / raw meat / cooked meat / hide / ore / charcoal / bar / fish) |
| **G** | give one of it to the nearest other soul |

## What's actually happening under the hood

Section numbers below (§N) refer to `doc/world/PLAN.md`, the full design
plan committed at the repo root's `doc/world/`.

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
- **Five animals, and each one is a different question.** Prey flee from a
  radius that grows with your noise — a camp that gathers hard all day is a
  camp whose meat has walked to the far side of the map — but they do not
  all have the same nerve, and that is most of what separates them:

  | | | |
  |---|---|---|
  | **hare** | 1 meat, no hide | Faster than anything in the Verge and gone before you are in range. **You cannot catch one on foot.** It is why the snare exists. |
  | **deer** | 2 meat, 1 hide | The ordinary hunt. Slightly slower than you, so a chase is winnable but not free. |
  | **river-goat** | 4 meat, 2 hide | Slow, calm, hard to frighten, worth more than anything else you can take. The good hunt, and §44's "first livestock most souls ever keep". |
  | **hedge-boar** | 3 meat, 2 hide | Ignores you until you swing at it, and it is *faster than you are*. |
  | **wolf** | 2 meat, 2 hide | Comes looking for you. |

  A boar is the one place in Stage B where greed, not bad luck, kills you:
  you cannot outrun what you started, you can only outlast its temper
  (~26s) or put a spear in it.

  Wolves are the odd one out, and the newest thing in the Verge: they are
  the only beast that comes looking for you rather than waiting to be
  found. By day they graze like deer, harmless. After dark, the same noise
  radius that grows the Lieutenant's reach also opens their nose — get
  close enough while the sun is down and a pair starts hunting, unprompted,
  no strike required. Wound one and fail to finish it and the grudge outlasts
  a boar's by nearly a factor of two; leave one alone and it forgets you by
  sunrise. That is the noise thesis applied a second time, aimed at your
  hide instead of your dinner, and it is the first hazard in Stage B that
  the clock itself turns on.
- **A short refining chain**, which is §44's "a few professions worth of
  actions" at its smallest: kill → butcher → cook at a fire → eat. Raw meat
  is worth little and makes you sick one bite in four; cooked meat is worth
  four times as much and warms you. Hides become a cloak. The fire is now
  load-bearing three ways — warmth, cooking, and being seen.
- **Stone is free, and loud.** A rock outcrop does not run out the way a
  tree does — you chip at it and it is still a rock — so stone is the one
  material that is never scarce. What it costs is *attention*: hammering
  stone is the loudest single thing you can do in the Verge, louder than
  building a fire. That puts tools on the same thesis as everything else
  here rather than on a respawn timer, and it means the decision is never
  "can I afford this" but "can I afford to be heard making it."

  Off that: a **knife** (more off every carcass, and the only way to cut
  cord) and an **axe** — two more logs a tree *and a third less noise*,
  which makes it the one tool that leaves you safer than owning no tool at
  all. Same argument skill makes, bought with stone instead of hours.
- **The sword chain is PLAN §15's worked example, compressed to one soul.**
  The full version is eight professions and a Realm gate; the Verge is one
  Realm and one pair of hands, so it collapses to ore + (wood smothered to
  charcoal, at a fire) → bar (smelted at a fire) → bar + wood + cord →
  sword. A vein of ore is rarer than a rock outcrop and louder to work than
  anything else in the game — mining is meant to be the biggest single
  noise a soul can make on purpose. What comes out the other end is the
  first weapon in Stage B that is not a stopgap: double a spear's damage,
  more than double its durability, and nothing else touches it — before a
  smith's own skill adds more on top (below). It is also the first chain
  that fails §15's "at least one Realm-gated input" half — there is no
  second Realm yet to gate anything against, which is a scope limit worth
  being honest about rather than a design claim.
- **Fishing needs no fire, and shares its first ingredient with the tools
  chain instead of starting one of its own.** Hide → cord (same cord the
  snare uses) → cord + wood → a fishing line → cast at the water's edge.
  Nothing about it touches butchering, cooking or a carcass at all — it is
  the shortest food chain in the game, and the one a soul with nothing but
  a knife and a shoreline can still lean on. Deliberately slower per attempt
  than a snare (4 in 100 at nothing, rising to about 1 in 5 at mastery,
  against the snare's 1-in-3-to-2-in-3): a snare is paid for by hours spent
  *away* from it, a line by hours spent sitting right there holding it, and
  the reward should track which currency was actually spent. §44 never
  names a Fisher — see the cut-list note below — but §17 does, right
  alongside Farmer and Hunter under the same hunger row.
- **The snare is the only work that pays while you are somewhere else.**
  Hide → cord (needs a knife) → snare → set it in the grass and walk away.
  It takes hares and nothing bigger, it is nearly silent to set, and it
  springs on its own whether or not anyone is watching. Every other way of
  eating in this game requires you to be present and loud at the moment it
  happens; a trapline is work you did *earlier*, quietly, and it is the
  first thing in Stage B that rewards patience over nerve. The Grey King
  has a line about that, and he does not enjoy it.

  A snare remembers whose hands set it, so a catch teaches *that* soul's
  trapping — one in three at nothing, better than two in three at mastery —
  and nobody else's. It is not locked: whoever gets to a caught hare first
  still butchers it, the same as any other carcass. It just means a soul who
  never sets a line never gets better at reading one.
- **Skill is earned by doing, and dies with you** (DESIGN §6.10). No perks,
  no classes, no starting traits — every soul arrives at zero and can learn
  anything, and the only difference between two players is which hours they
  spent. Chopping teaches woodcraft, skinning teaches butchery, tending a
  trapline teaches trapping, working a fire teaches smithing. A practised
  hand gets more wood off a tree, more meat off a carcass, more out of a
  meal — and, importantly, **makes less noise doing it**, so competence and
  safety are the same stat. Trapping and smithing are the two exceptions:
  a snare is already near-silent, so trapping buys a better catch instead of
  a quieter one; a fire is already lit either way, so smithing buys more
  charcoal per burn, more bar per smelt, and a harder-hitting blade instead.

  **No skill ever gates an action — only its quality.** Every one of the
  seven is attemptable from zero, which is what makes a soul who has put in
  the hours across an entire chain able to supply it alone: nothing in this
  design was ever "no profession can self-supply," only "no single action
  or material shortcuts the chain, and mastering all of it takes more hours
  than one soul usually has to spend." Smithing existing at all closes the
  one place that was quietly false before it: the sword chain used to run
  on bare pack checks, so self-supply there was free rather than earned —
  the only chain in the game where practice bought nothing.

  It all dies with the character. The Barrow-list keeps the title ("they
  were a fair butcher") as reputation and hands the next soul none of the
  skill. Which is where trade comes from: nobody barters firewood in the
  first hour, because an hour of chopping gets anyone the same three logs.
  Later, when a woodcutter's hour yields twice what yours does and your hour
  is better spent skinning, handing each other things stops being a courtesy
  and becomes arithmetic.
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
  out every tick, so a client that joins late, lags or reconnects is correct
  on the next tick with no reconciliation code at all. That split is DESIGN
  §6.8's point: swap this authority for a chain and neither the renderer nor
  `src/sim/` notices.
- **The Verge is nine times its original size, and a camera now follows
  you through it.** 72x48 tiles instead of 24x16 — three screens by three,
  where a "screen" is the 24x16-tile window (`VIEW_W`/`VIEW_H` in
  render.ts) the camera actually shows. The canvas itself never grows: it
  is sized to the camera's window, not the map, so the page's layout is
  done changing regardless of how much bigger the Verge gets from here.

  This is what makes fog of war real rather than cosmetic: **the server
  now sends every soul a personally fogged snapshot** (net/snapshot.ts) —
  another player, the Lieutenant, and every creature are cut out of *your*
  copy of the world once they are more than `VISIBILITY_RADIUS` (16 tiles,
  comfortably past the camera's far edge) from your own soul. A soul across
  the map cannot be found by opening the browser's network tab any more
  than by looking at the screen, because the data was never sent. Terrain
  and fires stay global — nothing here hides *where things are built*, only
  *who is currently standing where* — and so does `noise`/the crows'
  position, on purpose: the noise thesis (§1) is about being *heard*, which
  travels differently than being *seen*, and a single shared flock has no
  notion of "visible to whom" to filter against in the first place.

  Bandwidth grew with the map (tiles are ~9x the JSON, ~225 KB/s per player
  now instead of ~25 KB/s) but the creature/player payload actually shrank
  for a typical viewer, since most of a much bigger Verge is now nobody's
  concern. A small terrain-only minimap sits in the corner of the screen so
  a soul can still tell north from south — it never marks a creature or the
  Lieutenant, because that would put the very thing fog just hid back on
  screen through a different door.

  Whether one Lieutenant is still a credible threat patrolling nine times
  the ground alone got a first answer, not a final one — see the next
  bullet. He still isn't *reinforced*; §44 forbids that.
- **His patrol got smarter, not more numerous.** §44 keeps "one Lieutenant,
  no Captain, no Warden, no Muster" even at nine times the map, so the only
  lever left is how well the one you have covers it. Patrol speed rose from
  60% to 75% of his hunting speed — still well under a soul's own 300, so
  outrunning a *patrol* stays exactly as easy as before; only staying
  unnoticed for longer got harder. More importantly, a fresh patrol waypoint
  is now drawn near wherever the Verge was last loud about 60% of the time,
  jittered by up to ten tiles, instead of landing anywhere on the map with
  equal odds — the same global noise position the crows already answer to
  (§1), not a new way for him to know where you are, just a reason for him
  to stop touring empty corners. Whether that is *enough* compensation for
  9x the area is a playtest question, tracked open in `doc/world/CONTENT.md`.
- **Three more tiles, and terrain finally does something.** Grass, trees,
  water, stone and ore all looked and behaved the same everywhere on the
  map, which stopped being a footnote the moment the map grew to nine
  screens. **Marsh** and **Road** are the two ends of one rule — terrain
  speed, read the same way by a soul, the Lieutenant and every beast, so a
  marsh bogs down a fleeing deer exactly as it would its pursuer, and a
  road speeds up whichever of them thought to use one. Marsh only ever
  forms at a river's edge (a second pass over the map, checking what the
  first pass already decided was water, not another independent roll);
  moving through one is louder, standing still in one is not. A road is
  drawn as a wandering line between two map edges rather than scattered
  tile by tile — the one terrain feature that had to actually read as a
  path to mean anything. **Ruin** is the odd one out: never depletes, like
  Rock and Ore, but usually pays out nothing but rubble and rarely an old
  crown (PLAN §17A) — the first time that item exists anywhere as more than
  a name. It has exactly one use: melt it at a fire (key **0**, the same key
  smelting already used) when there's no ore and charcoal on hand, and it
  becomes a bar — PLAN §17A's own line about "smiths who need the metal more
  than the history," made literal. No smithing is learned doing it; running
  a crown through a fire isn't a real smelt. Still nothing to spend one on
  otherwise, no prestige, no market — that needs an economy this prototype
  doesn't have.
- **The Verge holds more than one soul.** The tick takes one `Input` per
  player and returns every death that happened in it — the same shape a
  server or a chain would hand it, so nothing above `src/sim/` needs to know
  which one is driving (DESIGN §6.8). The Lieutenant hunts whichever soul is
  nearest, which makes standing near someone else a risk and a shield at
  once. A boar holds its grudge against whoever swung first.
- **SPACE can now hit another soul, not only a beast.** Whichever is nearer
  gets struck — same verb, same weapon-priority rules, same durability wear.
  A soul still beneath the Grey King's notice (fresh spawn grace) cannot be
  targeted, and a death this way gets its own honest cause: "killed by
  another soul," not folded into any of the others. This is the one piece
  of work in this whole prototype that jumps its own gate on purpose — see
  the cut-list note below for what did and did not come with it.
- **And now it costs something: standing** (never "reputation score" out
  loud — PLAN §2A). A kill marks the killer the same tick — the same
  mechanism the Overlord already uses to single someone out, now also
  triggered by what a player does, not only by his choice — and drops their
  standing by 40. Three kills or so (past -100) and the arithmetic flips:
  he stops hunting them, by mark *or* by proximity, at all. Not mercy — the
  opposite. PLAN §29 has notorious player-killers taking rank in his Host
  outright; a soul that far gone reads to a Lieutenant as already his, so he
  stops looking. Standing lives on the character, not an account — Stage B
  has no login layer for it to survive a death on — so it resets exactly
  like a skill does: die, and the next soul starts clean, same as everything
  else in the pack. Neither bounty payouts nor plunder off a body came with
  this — see the cut-list note for the rest of what didn't ship.
- **And one way back: Commons standing.** PLAN §3's "kindness needs teeth"
  names six acts that build it — stabilising a stranger, sheltering someone,
  feeding the starving, teaching for free, paying another's mark, purifying
  land you do not own. Five need systems Stage B doesn't have (Mortal Wound,
  shelter, teaching, currency, corruption). The sixth already had a verb:
  **G**, when the recipient is genuinely hungry (satiety under 300), raises
  the giver's standing by 15 — a third of what one kill costs, so climbing
  back out is deliberately the slower road. Giving food to someone who
  isn't hungry, or giving anything that isn't food, earns nothing; this
  isn't a courtesy discount, it has to answer a real need. PLAN §3 warns
  this exact mechanic must not be farmable by alt-pairs, and nothing here
  stops two cooperating players trading scraps back and forth for standing
  — left open on purpose rather than guarded by machinery nobody has asked
  for yet.
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
- **Permadeath with a real, shared Barrow-list.** Death logs an obituary
  (cause, ticks survived, wood carried, beasts taken, what they were best
  at) to `data/barrow.json` on the server and increments a lineage counter —
  both survive a restart. Every soul's death goes to every connected client,
  not just their own, so the death screen is a board the settlement keeps
  rather than one browser's private diary. `data/` is gitignored: it's save
  data, not source.
- **The Verge stopped being a grid of dice rolls.** Every tile used to get
  its own independent `rng.nextInt(100)` — trees, water and stone all fell
  as an even sprinkle, which never read as a valley. Generation is now a
  sequence of deterministic passes that key off each other: a river walked
  edge to edge first (two passes, so it reads as a real river and not
  always a short stream), woodland stands and mineral outcrops and meadows
  grown outward from seeded clusters, hedgerows walked as short boundary
  lines, then the riverbank, road and ruin passes exactly as before. Same
  seed, same map, still only integers and the existing `Rng` — no noise
  library, no new dependency, just one clustering primitive (`growBlob`)
  reused by every "clump of terrain" pass instead of three bespoke ones.
- **Four new tiles, two of them closing a gap PLAN §3.1 left open since day
  one.** The Verge's own material row names "soil, timber, clay, copper" —
  clay and copper never had anywhere to come from until now. **Clay**
  forms at the same riverbank that grows marsh (common and quiet, the way
  §3.1 treats it as an everyday material, not a vein). **Copper** is the
  rarest outcome of the same mineral clusters that produce Rock and Ore —
  §3.1 names copper, not iron, as the Verge's own metal, so this is a
  second metal alongside the existing chain rather than a replacement for
  it; nothing spends either material yet (see the gap list below).
  **Meadow** is a wildflower patch, foraged like a bush for a smaller
  satiety gain, never stripped bare — it's waiting on Beekeeper, still
  just a name in PLAN §17's profession list. **Thicket** is a woodland
  stand's dense core rather than a new biome: more wood per felling than a
  lone tree, louder to take, and it grows back into itself, not into a
  lone tree.
- **Clay and copper stopped being dead ends.** Both existed as diggable
  tiles and pack counters with nowhere to go; this is where they go.
  **Pottery:** clay, fired at a hearth, into a pot (key **P**) — no bonus
  to what a meal is made of, only to how far it goes, so it is spent one
  charge per hot meal actually *eaten* rather than per meal cooked. That
  distinction isn't pedantry: `cookedMeat` is one flat counter with no way
  to remember which portion of it ever went near a pot, so "a working pot
  in your pack right now" is the only honest rule available, and it's the
  one built. **Copper:** a second, shorter metal line, not a second copy
  of the first. Key **0** now smelts copper alone, with no charcoal, if
  there's no ore and charcoal together — a real smelt, earning real
  smithing, just a shorter one, which is most of why PLAN §3.1 naming
  copper (not iron) as the Verge's own metal reads as "reachable earlier"
  rather than merely rarer. Key **B** forges a copper bar into a copper
  sword the same way it forges an iron one, when there's no iron bar to
  hand — 4 damage and 18 strikes against the real sword's 6 and 30, no
  smithing bonus of its own, sitting between the spear and the sword in a
  fight and in everything else. Priority, both at the fire and at the
  forge, is ore-and-charcoal first, copper second, an old crown last — a
  found relic is still the fallback of last resort, not the second choice.
  Carrying both swords, the real one is always the one that swings.
- **The cloak got two siblings, and two fires stopped wasting what they
  cut.** **Boots** (key **O**, 2 hide 1 cord, no fire needed) soften a
  marsh's speed penalty without touching `terrainSpeedPct` itself — the
  bonus is a player-only modifier layered on top of the one rule every
  mover obeys, so a Lieutenant crossing the same marsh still gets the bare
  55%. They wear one charge per step actually taken through a marsh, the
  same shape a cloak already wears by the cold it stops rather than by the
  clock. **Gloves** (key **V**, same recipe) make Rock, Ore and Copper
  quieter to work — the same trade an axe already makes on a chop, aimed
  at the loudest tile in the Verge instead of the quietest — and wear one
  charge per dig. Both are the hide/cordage leatherworking line's first
  products beyond the one cloak. Separately: butchering a carcass now
  always pays a little **glue** alongside the meat and hide, and smothering
  a fire down to charcoal now always pays a little **pitch** alongside the
  char — the same work, not a new step to ask for either, closing PLAN
  §15's "a graph with no waste is a graph where nothing is a bargain" a
  little further. Neither has anywhere to be spent yet; that's the honest
  state of it until a Fletcher or something like one exists to want the
  glue.
- **The Verge has a village now, and someone in it will actually talk to
  you.** PLAN §1A specs the opening this game never built: wash up with
  nothing, get taken in, get watched for a season. Three houses (a
  landmark, not a building system) stand where §1A's custom actually
  happens, and four NPCs live around them — the Teacher and three named
  villagers, wandering a bounded patch of ground on plain code, no model
  call anywhere near them (§27's Intelligence Tiers reserve that for
  Captains and Wardens; even a Lieutenant only gets "light template").
  Press **H** near whoever's closest to start talking; while a
  conversation is open, the same **1-9** keys that craft everything else
  pick a reply instead — one more context-sensitive verb, the same shape
  E/gather already is, rather than a second row of keys to memorize. The
  Teacher's tree is the actual tutorial §1A calls for, and it teaches
  nothing mechanically: no free skill, no free XP, because skills.ts is
  explicit that every soul learns only by doing, and a conversation that
  quietly handed out a shortcut would contradict the one file most
  responsible for saying so — what it hands over is in-fiction
  instructions for keys that already work. A villager's tree instead
  answers the "expelled from normal towns" half of the standing design, in
  the one place this prototype has anything resembling a town: which
  greeting you get is chosen once, when the conversation opens, by how the
  road speaks of you — ordinary, wary, or, past the same notorious
  threshold that already turns the Lieutenant away, refused outright
  before a word is exchanged. Conversation content never crosses the
  network — only the current node's id does (two small fields on `Player`)
  — the client looks the actual text up from the same static tree
  (`src/sim/dialogue.ts`) the sim used to decide what a reply does, so
  there's no separate channel that could ever say something the sim
  didn't mean.
- **And now a villager can be struck and killed.** The same SPACE that
  hits a beast or another soul, whichever of the three is actually
  nearest. It costs the killer 60 standing — half again what killing a
  player costs — and no `hunting` skill XP at all, on purpose: a real hunt
  teaches something, and killing someone who couldn't fight back doesn't,
  so it shouldn't pretend to. This is the "expelled from normal towns"
  half of the standing design finally landing somewhere real, rather than
  only as a colder greeting in a conversation. NPCs rot and respawn the
  same way a carcass does, just slower — a bad decision costs the village
  someone for a while, not forever.

### He used to camp the spawn

Reported from actual play, and worth writing down because no single line of
it was wrong — it was three correct behaviours multiplying:

1. The crows gather over wherever you were last loud. After a fight, that's
   your corpse.
2. A patrolling Lieutenant walks toward the crows. So he stayed.
3. Every new soul arrived at the same fixed tile, right where you'd been
   working, with no grace period.

So he stood on the spot and killed each soul as it appeared. That isn't
difficulty, it's a locked door. Now: a kill he made satisfies him for 40
seconds, in which he ignores both souls and crows and walks away; a new soul
arrives at least 8 tiles from him and clear of the birds; and for 12 seconds
it is beneath his notice, which the HUD says out loud so you don't spend it
running from nothing. He is exactly as lethal once he sees you.

### Three more things that were quietly broken

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
| A few professions worth of actions | ✅ gather, chip, mine, salvage a ruin, hunt, fish, trap, butcher, cook, craft (spear, sword, cloak, fire, knife, axe, cord, snare, charcoal, bar, fishing line) |
| Three creatures | ✅ and then some — hare, deer, river-goat, hedge-boar, wolf, and the crows. §44 asked for three; the extras came after the gate passed, and each one answers a different question rather than padding a bestiary |
| Barter economy | ✅ two people, two keyboards, one Verge, and everything handed over is on a ledger. No currency and no escrow — those are for strangers |
| One Lieutenant, no Muster | ✅ — patched to patrol smarter as the map grew, not to grow a second one |
| Permadeath, obituary not full Barrow-list UI | ✅ (a real Barrow-list, just minimal) |

§44 names ten professions in scope (Farmer, Hunter, Miner, Logger,
Charcoaler, Smelter, Blacksmith, Leatherworker, Tanner, Herbalist) and
Trapper and Fisher are not on that list — built anyway, because both answer
the exact test §44 used to pick the other ten ("what feeds a person day to
day"), and §17 names both explicitly under the same hunger row as Farmer and
Hunter. Nothing on the list is contradicted; two more of §17's food
professions exist than §44 got around to naming.

**One line was crossed outright, not stretched: PvP.** §44 names it, along
with marks and bounties, as Stage C — "does cooperation beat predation with
real people" is a question a solo/duo prototype cannot answer either way, so
it stayed a gap for several rounds of work on purpose. It was raised as a
gate worth confirming rather than crossing on momentum, and the call to
cross it now — ahead of Stage C, on the grounds that §44 is a previous
agent's cut list rather than a standing rule from whoever is actually
directing this project — was made explicitly. It shipped in three passes:
SPACE striking another soul at all, with its own honest death cause; a real
cost for doing it — a kill marks the killer and drops their standing, and
enough kills makes the Lieutenant stop hunting them altogether; and one way
back — feeding a genuinely hungry soul builds Commons standing (see the two
bullets above). No bounty payout, no plunder off a body, and no murder-guild
economy came with any of the three passes — that is still exactly as
unbuilt as it was, and is a much bigger question than whether killing costs
you something and can be climbed back from.

Explicitly **out**, same as the plan says otherwise: land, guilds, ecology
population math, the Shards, magic, the bounty/plunder half of the outlawry
economy PvP was meant to prove or disprove. The creatures are a fixed
roster that respawns on a timer somewhere you aren't — deliberately *not*
a population model, because that is the fun thing to write that later
turns out to be why a tick costs 40ms.

## Cost per tick

The whole sim, worst case — moving, gathering and striking every single
tick with the full creature roster alive — measured on this machine:

```
35.21 µs/tick  ≈  0.035% of one core at 10 Hz
```

That is the budget to protect. Everything in `src/sim/` is integer math
with no allocation in the hot path, which is why it runs on anything. If a
feature can't be done in that shape, it's a feature for a tier that isn't
the tick. (Rendering is a separate budget now that the map has outgrown the
screen — see the camera above — but drawing is O(the 24x16 viewport), not
O(the map), so it did not get more expensive when the Verge did.)

It was 2.55 µs at six animals and nine verbs, 5.05 µs at twelve animals and
thirteen verbs, 30.99 µs once the Verge grew nine times bigger and the
roster scaled with it to 108, and 35.21 µs now that every mover reads the
ground under it once a tick (terrain speed — marsh, road). Not re-measured
for the clustered worldgen and the four new tiles: that work is entirely in
`World`'s constructor, which runs once at startup, not per tick, and the
new tiles add a handful of mutually-exclusive branches to `isSolid` and
`doGather` — the same shape of cost the existing fourteen tiles already
had, not a new order of it. The honest and boring answer is still unchanged:
**the cost is linear in creatures**,
because every one of them is stepped every tick, and each new mechanic
that touches every mover or every creature adds a little more of the same
linear cost rather than a new order of growth. That is fine at 108 and it
would be fine at ten times that. It is *not* fine at the point someone
adds a population model, which is exactly why §44 cut one — the roster is
fixed and respawns on a timer, and a tick that costs milliseconds is what
happens if that ever stops being true.

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
- Did you build a trapline, or did you forget the snare existed? If it never
  occurred to you to set one and walk away, the game has not managed to
  teach that patience is a strategy — and that is the one new idea here.
- Was chipping stone a decision or a chore? It's meant to be the loudest
  thing you can do, so "I want an axe but not *here*, and not now" is the
  thought it should produce. If you just stood at a rock and held E, the
  noise cost is too low.
- Did a wolf ever find you before you found it — and did you notice it was
  night that did it, or did it just feel like bad luck?
- When the fire burned low, did going for wood feel like a chore or like a
  risk? If it's a chore, the wood cost is too high or the danger too low —
  that number is the difference between a treadmill and a livelihood.

With two people, the only question that matters:

- **Did you trade because you wanted to, or because I asked you to?** If
  two souls with different luck don't start handing each other things
  unprompted, no currency, escrow or market UI will fix that — it means the
  professions aren't different enough from each other yet, and that is a
  content problem rather than an economy one.

Fair warning on that one: in a session this short, both souls are near zero
at everything, so an hour of chopping gets either of you the same three
logs and there is no reason to trade *yet*. That is the design working, not
failing — see §6.10. Testing it properly needs either a longer session or
temporarily steeper skill effects.

**Don't tune the attention numbers here.** Every constant governing how fast
the Grey King's forces notice you — detection radius, noise decay,
`KILL_REST_TICKS`, `RESPAWN_GRACE_TICKS`, `SPAWN_CLEAR_TILES`, the wolves'
own `WOLF_DETECT_BASE` and `WOLF_ANGER_TICKS` — is squeezed into a Verge a
soul still crosses corner to corner in well under a minute (24 seconds, at
72 tiles across and 3 tiles/sec — up from eight seconds when the map was a
third the size, still nothing like a real Realm's scale). The real Realms
are much larger still, and drawing real attention is meant to take far
longer: hours of visible activity, not ninety seconds of chopping. These
values exist so a playtest fits in a coffee break, and every one of them is
throwaway. Judge the *shape* of the mechanic — noise accrues, birds show it,
something comes — and ignore the magnitudes.

That's the whole gate. Tuning numbers (drain rates, detection radius,
Lieutenant speed, how hard a boar hits) are all placeholders at the top of
`src/sim/tick.ts` and `src/sim/creatures.ts` — deliberately loud constants,
meant to be changed based on what playing it actually feels like, not on a
formula.
