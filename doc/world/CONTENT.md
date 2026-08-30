# ARCHON — The Content Catalogue

**Every content noun in the world, in one place.** Creatures, materials, items,
crafting chains, professions, the Grey King's commands, Realms, Sigils, magic,
death customs, economy, texture.

---

## 1. Using this document

`doc/world/PLAN.md` is organised by *argument* — it reasons its way to
conclusions, which is the right shape for a design plan and the wrong shape for
the question "what creatures are there?" Every content category in it is spread
across sections that are nowhere near each other. To list the creatures you must
read §7, §7A, §9, §13 and §44. To list the King's verbs you must read §3, §29,
§29A, §31 and §32.

This document is the flat index over that. It **adds no design**: where an entry
is interesting, the citation points at the section that already reasons about it.
Where this document and PLAN.md disagree, **PLAN.md wins**, and the discrepancy
belongs in §14 below.

**It is an index, not a specification.** PLAN §50 already names the documents
that will own each area in detail — `WORLD.md`, `SURVIVAL.md`, `PROFESSIONS.md`,
`ITEMS.md`, `MAGIC.md`, `SIGILS.md`, `ONBOARDING.md`, `COMBAT.md`,
`CAPTAINS.md`, `FETTERS.md`, `ARCHITECTURE.md` — of which only `GREYKING.md`
exists so far. Each section below names the document that will eventually take
it over. Until those exist, this is the list.

### Status legend

| Tag | Means |
|---|---|
| `[built]` | Exists and runs in `prototypes/stage-b` today |
| `[plan §N]` | Specced in `doc/world/PLAN.md`, section cited |
| `[named]` | A name exists in the corpus with no design behind it |
| `[new]` | Proposed here for the first time |

`[new]` is deliberately rare. The corpus is deep and this is consolidation work;
inventing over the top of it would defeat the purpose.

### One standing rule

PLAN §2A governs the language of everything here: **describe every system the
way a villager would say it.** It is *the Mark*, *the Grey*, *working*,
*plunder*, *your line* — never writ, assessment, magic-debt or estate. That rule
exists because the first draft got it wrong, and a catalogue is exactly the kind
of document that quietly re-introduces dead words.

---

## 2. Creatures & beings

> Will be owned by `WORLD.md` (factions) and the ecology spec PLAN's open
> threads still call for.

PLAN §7 sets the taxonomy: three factions, and they are not interchangeable.

### 2.1 The Unbowed — allied `[plan §9]`

Not beasts. **Promises the Old Kingdoms never got to keep** — a word given and
not made good, left behind when the people who gave it died, and grown solid
from waiting.

| Being | The promise |
|---|---|
| **The Waiting Hound** | A dog whose master said *"back before dark."* It is still before dark. |
| **The Ferryman's Ox** | Owed a season's rest it never got. Let it rest first and it will carry anything. |
| **The Lamplighter** | Someone promised to keep a light on the fen road. Something still does — its lamp marks ground that has not gone bad. |
| **Grandmother Stoat** | Promised the children a story and has not finished it. Follows anyone who listens, and knows things a stoat should not. |

**The three-way choice is the content** `[plan §9]` — *keep* it (useful, and the
promise stays unpaid), *kill* it (immediate profit, permanent loss to the world,
and his coin in your hand), or *free* it by completing the promise (costly,
unrewarded, and the only one that was ever right). They do not breed and they do
not come back `[plan §13]`.

### 2.2 The Wild — neutral `[plan §7, §7A]`

Real ecology: herds, predators, migration, carrying capacity `[plan §13]`.

**Docile and huntable** — each one closes a link in the crafting graph that a
Hunter or Herder is the only source for:

- **River-goat** (the Verge) — tameable with patience; the first livestock most
  souls keep, and why Herder is a Verge-tier profession. Named in the Stage B
  cut `[plan §44]`. **`[built]`** — slow, hard to frighten, and worth more than
  anything else in the Verge; taming is not in yet.
- **Hare** (the Verge) `[new]` — small, and faster than anything else here, so
  it cannot be run down at all. It exists to make the snare worth building,
  which is how trapping became a way of eating that does not require you to be
  present. **`[built]`**
- **Fen-deer** (the Moorfen) — easy meat, better hide once tanned.
- **Coast-seal** (the Sunken Reach) — oil and pelt both worth the cold water.

**Docile and dangerous to overhunt:**

- **Rime-elk** — herds migrate down out of Rimeholt each winter. A settlement's
  whole meat security can ride on one herd's route staying healthy, which makes
  the herd worth *protecting* rather than only eating, and gives Rangers a
  reason to exist that has nothing to do with fighting `[plan §7A, §13]`.

**Aggressive:**

- **Bog-lynx** (the Moorfen) — ambush predator that follows a wounded traveller
  for miles before committing. Named in the Stage B cut `[plan §44]`, though the
  animal itself belongs to Realm 1. Not built; the stalking behaviour it is
  described by does not exist yet.
- **Hedge-boar** (the Verge) `[new]` — the Verge's own aggressive Wild, filling
  the gap §15 flagged. Ignores you until struck, then charges faster than you
  can run and holds the grudge about 26 seconds. Named for the Verge's own
  biome line, "river valley, hedgerow, woodland" `[plan §4]`. **`[built]`**
- **Cliff-wyvern** (Rimeholt) — not evil, just territorial over ground a caravan
  needs to cross. Killing one is a legitimate Mercenary contract; leaving the
  nest alone is a legitimate choice too.

**In code today:** hare `[built]`, deer `[built]`, **river-goat** `[built]`,
**hedge-boar** `[built]`, wolf `[built]`, and the crows `[built]` — see §14 for
which of those are canon and which are still placeholders.

### 2.3 The Grey-touched — hostile `[plan §7, §7A]`

What the drained land does to a living thing left in it too long, beast or man.
Not conjured and not commanded — *starved*.

- **Ash-hound** (the Kiln) — stopped needing to breathe air the ordinary way and
  started needing something else. Named in the Stage B cut `[plan §44]`.
- **Fen-wraith** (the Moorfen) — drowned things that were once people. Exactly as
  upsetting as it should be, and never played for anything else.

**The rule that makes them a system rather than a spawn table** `[plan §13]`:
when a territory's Grey crosses a threshold, a share of its living Wild
population *converts* rather than a fresh horror appearing from nothing — a
healthy fen-deer herd that has stopped being able to leave. So a thriving
population is itself part of the holdback, and an overhunted region has nothing
left to convert slowly and rots faster and emptier instead.

All of them are drawn to a working the moment one is cast nearby `[plan §20]`,
which is the mechanical reason "drawing on the Grey attracts trouble" is true
rather than flavour text.

### 2.4 The Host — his people, not his monsters `[plan §27]`

The distinction matters: these are people who took service, paid and equipped
like anyone else in this economy `[plan §30A]`.

| Rank | Count | What it does | Intelligence |
|---|---|---|---|
| **The Grey King** | 1 | Realm 7. Marks, plunder, seizes, bargains, taunts | Full consensus tier |
| **Wardens** | 1 per Realm | Regional authority; a fortified seat and a static raid target | LLM |
| **Captains** | ~6–10 per Realm | Hold strongholds and dungeons, command a district | LLM |
| **Lieutenants** | dozens | **Roam.** Lead warbands, execute marks, ambush | Light template + Codex |
| **Reavers** | many | Rank and file. Patrol, harass, spread the Grey | Pure code |

Intelligence is deliberately scarce — a world where a dozen entities are
genuinely intelligent and the rest are furniture is more unsettling than one
where every bandit monologues, and it bounds the inference bill.

**In code today:** one Lieutenant `[built]`, per the Stage B cut `[plan §44]`
— and, crossed narrowly, the Reaver tier's first actual member: the
**Scout** `[built, §8.7]`, sent by a new Overlord action rather than part
of the fixed roster, fragile and unarmed, who investigates and either gets
silenced or reports. Not a second Lieutenant and not a violation of §44's
"no Captain, no Warden, no Muster" — he doesn't fight, doesn't hold ground,
and killing him costs no standing, since he's the King's own agent rather
than the "expelled from normal towns" case a villager or a player kill
answers to.

> **Name collision, flagged:** `doc/archon/DESIGN.md` §5 uses **Warden** for an
> emergency governance council, and PLAN §36 uses **Warden Quorums** for the
> simulation tier. Three different things share the word. PLAN §29A's usage
> (a rank) is the one that appears in-world; the other two are infrastructure.

### 2.5 People who are content

- **The Keepers** `[plan §8]` — the Old Kingdoms' order of scholars and
  archivists. Emeric Vale was raised among them, and hunted them first, because
  **they were the only people alive who would recognise him.** A surviving Keeper
  is old, frightened, hidden, and can teach a player the old script, name a ruin
  correctly, and recognise a working done right — which is most of what it takes
  to make sense of a Shard. She never says his name and never confirms what a
  player has pieced together; she only stops being able to hide that she
  recognises it.
- **The Given** `[plan §20A]` — those who walked north and took his offer. Not a
  spawn table: a society, with ash-grey towns, a market, and people who will tell
  you honestly that it is not so bad. See §9.3.
- **The washed-up** `[plan §1A]` — how every player enters. The northern current
  carries things down from his keep, and not only driftwood, so the valley has a
  custom: they take you in, feed you, and **watch you for a season.**
- **The village** `[built]` — the custom above, finally with someone to perform
  it. Three houses (landmarks, not a building system) and four NPCs: **the
  Teacher** and three named villagers, wandering a bounded patch of ground
  rather than standing as fixtures. Pure code throughout — §27's Intelligence
  Tiers reserve a live model for Captains and Wardens and give even a
  Lieutenant only "light template"; a villager is well below that. Talk to
  whoever is nearest (key H) and a **conversation tree** opens — hand-authored,
  static content (`src/sim/dialogue.ts`), not generated. The Teacher's tree is
  the actual tutorial §1A calls for ("somebody has to teach you to lay a fire
  — that first lesson is the tutorial"), and it teaches nothing mechanically:
  no free skill, no free XP, because §17/§22's "every soul arrives at zero and
  learns only by doing" would be contradicted by a conversation that quietly
  handed out a shortcut. What it hands over is words — in-fiction instructions
  for keys that already work. A villager's tree instead answers the standing
  question in the one place Stage B has anything resembling a town: which
  greeting you get is chosen once, when the conversation opens, by how the
  road speaks of you (§2A) — ordinary, wary, or (past `NOTORIOUS_STANDING`)
  refused outright before a word is exchanged. Nothing about a conversation's
  *content* crosses the network; only the current node's id does, and the
  client looks the actual text up from the same static tree the sim used to
  decide what a reply does — so there is no separate "what did they say"
  channel to keep in sync, and no way for the wire to say something the sim
  didn't mean.

  **An NPC can be struck and killed** — the same SPACE that hits a beast or
  another soul, whichever of the three is actually nearest. Doing so costs
  the killer **60 standing, not 40** — half again what killing a player
  costs, and no `hunting` skill XP at all, deliberately: a real hunt
  teaches something, and killing someone who could not fight back does
  not, so it shouldn't pretend to. This is the "expelled from normal
  towns" half of the standing design finally landing somewhere real,
  rather than only as a colder greeting in a conversation.
---

## 3. Realms & terrain

> Will be owned by `WORLD.md`.

### 3.1 The eight Realms `[plan §4, §4A]`

Eight tiers, seven Sigil gates. Ascent is collective — breaking a Sigil opens
that Realm for **everyone** — and each Realm introduces a new survival threat and
new materials, so the crafting economy is gated by the ascent.

| # | Realm | Biome | Threat | Key materials | Unlocks |
|---|---|---|---|---|---|
| 0 | **The Verge** | River valley, hedgerow, woodland | Mild night cold | Soil, timber, clay, copper | Farming, masonry, basic forging |
| 1 | **The Moorfen** | Peat bog, fen, drowned wood | Wet-cold, fever, foul water | Peat, bog iron, reeds, fenroot | Tanning, apothecary, charcoal |
| 2 | **The Kiln** | Volcanic ash waste, obsidian flats | Heat, thirst, ashlung | Obsidian, sulphur, firesalt, true coal | Steel, glass, blasting |
| 3 | **The Sunken Reach** | Drowned coast, tidal ruins | Water everywhere, none potable | Salvage, pearl, salt, kelp | Shipwright, preserving |
| 4 | **Rimeholt** | Glacier, alpine, permafrost | Killing cold, whiteout | Rare metals, sky-iron, ice caches | High armour, cold-forging |
| 5 | **The Weald Undying** | Corrupted overgrowth, fungal canopy | Airborne toxin, food that lies | Reagents, living wood, spores | High alchemy |
| 6 | **The Hollow Vault** | Lightless underground machinery | No food, water or light — *and it is maintained* | Mechanisms, his components | Endgame engineering |
| 7 | **The Spire** | The seat | — | — | The Grey King |

Why anyone lives in each `[plan §4A]`: the Verge is the most-patrolled ground in
the world, not because he cares but because it is cheap ground for a Reaver to
work. The Moorfen is the best hiding country there is, and Smugglers move through
fen paths horses cannot follow. The Kiln is where the Given cluster thickest — he
needs the steel too. The Sunken Reach is the first Realm where trade goes by boat.
Rimeholt's ice caches hold Old-Kingdoms goods frozen intact since the Fall. The
Weald Undying holds the most dangerous gathering job in the game, and it pays
like it. The Hollow Vault is the only Realm that fights back *intelligently*,
because it is the only one he has not abandoned.

**Ship two Realms, not eight** `[plan §4]` — the collective-progression mechanic
is fully testable with two.

**At the Spire there are two prizes and they are not the same thing:** the Hoard
is his mundane treasury; **the working is the actual endgame** (§10.3).

**In code today:** the Verge only `[built]`, no Realm gating — grown to nine
times its original footprint (72x48 tiles, three camera-screens by three) with
a real fog of war behind it: net/snapshot.ts now sends each player a
personally filtered view, so another soul, the Lieutenant and the creatures
are cut from the wire itself once they are far enough away, not merely cropped
off a client's screen. Terrain and the noise/crow signal stay global — a
Realm's shape is knowable, what is currently standing on it is not. One
zone, still, so this is scale rather than a second Realm.

### 3.2 The Grey `[plan §6]`

Not a curse — *absence*, in places that had quietly depended on magic for a
thousand years. It emanates downward from higher Realms as a per-territory value,
and its effects are survival-facing rather than combat-facing: crops fail, water
spoils, gear decays faster, creatures mutate, **and survival needs tick faster**.

- **Holding it back means working magic**, which means what §9 says it means.
  There is no other kind of ward, because there is no other source of the thing
  that was taken out of the land.
- **Population is the real defence, not just labour.** One hedge-witch holding a
  valley's fields is a single bright point his captains will walk straight to. A
  dozen people each doing a little is noise. **Spreading the burden thin is not
  efficiency — it is the only way to be protected without being found.**
- **Realms, once opened, never re-close.** Progress is a ratchet. **Territory
  inside them can be lost.**

### 3.3 Weather, seasons and time `[plan §23]`

Derived deterministically from the block seed and territory Grey, so every node
agrees and nobody can forecast it privately. **Winter in Rimeholt is a scheduled
crisis the whole server prepares for** — the kind of foreseeable, collective,
non-combat emergency that makes farmers, preservers, tailors and charcoalers
matter on a calendar. A neglected territory should be visibly, meteorologically
sicker.

**In code today:** a day/night cycle `[built]`, 3000 ticks each; night widens
the Lieutenant's detection radius and opens the wolves' noses.

### 3.4 Tiles in code `[built]`

Eighteen now, and — as of this pass — placed by geography rather than
independent dice roll. Worldgen used to give every tile its own unrelated
`rng.nextInt(100)`, which reads as salt-and-pepper; it is now a sequence of
deterministic passes, each keying off what an earlier one decided: a river
walked edge to edge first, woodland stands and mineral outcrops and
meadows grown outward from seeded clusters (`growBlob` in world.ts, one
primitive reused by all three), hedgerows walked as short boundary lines,
then the riverbank, road and ruin passes exactly as before. Same seed,
same map, still nothing but integers and the existing `Rng` — no noise
library, no new dependency.

Grass · Tree · Stump (harvested, regrows) · Water · Bush · BareBush (picked,
regrows) · Campfire (player-built, burns down) · Ash (a fire that went out;
grass takes it back) · **Rock** (chip stone off it — a real health bar now,
`DepletedRock` once it gives out and a real wait before it's minable again,
where it used to never deplete at all; see the note below) · **Snare** (set,
waiting, and spent once it catches) · **Ore** (the same shape as Rock now,
fewer hits and rarer to find — `DepletedOre` — and the loudest tile in the
Verge to work) · **Marsh** (wet ground at a river's edge — the only tile
that punishes moving *through* it rather than working it: slower to cross,
and squelches while you do) · **Road** (§8's "nobody bothered to destroy
them" — the mirror of a marsh, faster to cross than grass, and the reason a
nine-times-bigger Verge is still walkable) · **Ruin** (a collapsed room,
never depleting at all — unlike Rock and Ore now, a ruin is rubble already,
not a vein with anything left in it — that usually pays out nothing and
rarely an old crown, §17A) · **Clay** (open ground at the same riverbank
that grows marsh — §3.1 names it beside timber as an everyday Verge
material, so unlike Rock/Ore it stays common, quiet, and undepletable) ·
**Copper** (the rarest outcome of the same mineral clusters that produce
Rock and Ore — §3.1 names copper, not iron, as the Verge's own metal — and
the fastest of the three to deplete, `DepletedCopper`, the rarest find
being the one least worth camping) · **Meadow** (a wildflower patch,
foraged for a satiety gain like a bush and never stripped bare — feeds
Beekeeper, §7.2's named-but-unbuilt profession, whenever that is built) ·
**Thicket** (a woodland stand's dense core rather than a separate biome:
more wood per felling than a lone Tree, louder to take, regrows into
itself) · **House** (a village landmark, solid, nothing to gather — placed
outright at world-gen time, §2.5, not grown or rolled for like everything
else here).

**Rock, Ore and Copper depleting at all is a reversal, not an addition** —
this document said flatly, more than once, that a rock outcrop "does not
run out the way a tree does" and that this was load-bearing for the whole
noise thesis (attention, not scarcity, was the cost). That held for a solo
prototype and stopped holding the moment a single tile could be worked
forever by anything that never gets bored or heard as a threat — a script
holding one key at one outcrop paid the *entire* stone-and-ore economy's
noise cost exactly once. Reversed on explicit direction, narrowly: each of
the three now has a real health bar (`VEIN_HEALTH` in world.ts — 6/4/3
hits for Rock/Ore/Copper, the rarer the find the fewer swings), a depleted
form once it gives out, and a real regrow timer (`VEIN_REGROW_TICKS`, ~3
minutes — longer than a Tree's own 90s) — the same generic regrowth
`Stump`/`BareBush` already use, extended rather than duplicated. The one
deliberate difference from a Stump: a depleted vein stays solid, since a
mined face is still a wall of rock and a felled tree isn't a trunk any
more. Attention wasn't wrong as the *primary* cost — noise and skill still
work exactly as they did — it just couldn't be the *only* one.

Terrain speed is one rule, read the same way by a soul, the Lieutenant and
every beast: a marsh bogs down a fleeing deer exactly as it would bog down
whoever is chasing it, and a road speeds up whichever of them thought to use
one first. Clay and Meadow are open ground under that rule, at plain speed;
Copper and Thicket are solid, the same as Ore and Tree.

### 3.5 Terrain the world implies but code lacks

~~Rock and quarry face, ore seam~~ — closed: an ore vein is built (§3.4).
~~Marsh, road, ruin~~ — closed (§3.4): all three generated deterministically
rather than scattered independently — marsh only ever appears at a water
tile's edge, a road is walked as a line between two map edges rather than
placed tile by tile, and a ruin is a single rare room.
~~Independent per-tile placement~~ — closed: replaced by the clustered,
river-first generation described in §3.4, so forests read as stands and
water reads as a river rather than scattered ponds.
~~Clay and copper, named in §3.1's material table with nothing to gather
them from~~ — closed: both now have a source tile (§3.4). Snow, sand,
tidal flat, cave mouth remain `[named]` at best — each belongs to a Realm
that isn't the Verge (Rimeholt, the Sunken Reach), so building them here
would be borrowing another Realm's terrain rather than filling in this
one's.

**Terraforming** `[plan §22]` — dig, raise, flatten, tunnel, reshape, and it
persists. In a world that never resets, the strongest "we were here" mechanic
available, and permanent employment for masons and engineers.

---

## 4. Resources & materials

> Will be owned by `ITEMS.md`.

Laid out against the profession tier ladder `[plan §17]`, because what matters
about a material is **which Realm gates it**.

| Tier | Realm | Materials | What it unlocks |
|---|---|---|---|
| 0 | Verge | Soil, timber, clay, copper | Every profession exists here, badly |
| 1 | Moorfen | Peat, bog iron, reeds, fenroot | The first real toughness in tools and armour |
| 2 | Kiln | Obsidian, sulphur, firesalt, true coal | True steel, glass, blasting powder |
| 3 | Sunken Reach | Salvage, pearl, salt, kelp | The first goods worth shipping rather than carrying |
| 4 | Rimeholt | Rare metals, sky-iron, ice caches | The ceiling for anything holding an edge or a charge |
| 5 | Weald Undying | Reagents, living wood, spores | The ceiling for anything alchemical |
| 6 | Hollow Vault | Mechanisms | The only tier producing *engineering*, not materials |

**Refined goods** `[plan §15, §15A]`: charcoal, leather, cordage, planks, bars
and ingots, cloth, glass, flour, ash-salt, rendered tallow, glue, pitch.

**Byproducts and waste** `[plan §15]` give the lower tiers somewhere to go: slag,
offcuts, bone, spoiled grain. Some feed other chains (bone → glue → fletching),
some feed decay. **A graph with no waste is a graph where nothing is ever a
bargain.** **In code today** `[built]`: **glue**, off every carcass
butchered, alongside the meat and hide — no separate bone step, since Stage
B has no bone material of its own to make one meaningful yet — and
**pitch**, off every charcoal burn, the same fire sweating out tar as well
as char. Both now have somewhere to go, exactly the "bone → glue →
fletching" chain named two sentences up: glue binds a **Fletcher**'s
arrows, pitch seals a **Bowyer**'s string-wraps (§5.2, §6) — the first
byproducts in the Verge with a real customer rather than a promise of one.

**Food by Realm** `[plan §12]` — river-bread, small beer (safer than the water,
and everyone knows it), hedge-fruit and hard cheese in the Verge; peat-baked
fen-bread, bitter fenroot and eel in the Moorfen; ash-salt, hard biscuit and
carried water in the Kiln; in Rimeholt, anything fat — rendered tallow eaten
plain, without embarrassment, because the cold takes what it wants.

**In code today:** wood, **stone**, **cordage**, raw meat, cooked meat, hide,
**ore, charcoal, bar, fish, clay, copper, copper bar, glue, pitch**
`[built]` — plus water and berries consumed straight off the tile rather
than carried.
Clay and copper close the last two names in §3.1's Verge material row
("soil, timber, clay, copper") that had no source at all until recently;
both now have somewhere to go — a fired pot for clay, a second and shorter
metal line for copper (§5.2, §6) — closing the gap the tile itself opened
one pass earlier.

Stone was worth calling out because it used to invert how every other
material here behaves — a tree runs out and regrows on a timer, a rock
outcrop never ran out at all. **That inversion is gone, on explicit
direction (§3.4's own note above): a Rock, Ore or Copper tile now has a
real health bar and regrows on a timer too**, same shape as a tree,
because a single tile that never ran out could be worked forever by
anything that never gets bored or heard as a threat. What stone still
costs, on top of that now, is being heard — chipping stone is the loudest
single action in the Verge — so a tool is a trade of attention *and* of a
real wait for yield, the noise thesis `[plan §1]` applied to the workshop
joined by the same scarcity every other gathered material already answers
to.

---

## 5. Items & equipment

> Will be owned by `ITEMS.md`.

### 5.1 The schema `[plan §19]`

Every item instance carries **material, quality, durability, weight, and
provenance** — crafter's soul, block height, Realm — recorded on chain.

> When a master smith dies permanently, their body of work becomes **finite**.
> Their surviving blades are the complete works of a dead artist, verifiably
> theirs, and they appreciate. **A famous crafter's death is an economic event.**

Only *marked* items are chain objects; bulk goods live in the simulation tier.
**The mark is the scarcity, not the item.**

**Quality propagates** `[plan §15]` — an input's quality bounds the output's, so
a chain is only as good as its worst link and a master smith cannot rescue bad
ore. This is what makes a reputation for *reliable supply* economically real.

**Material properties should be physical** `[plan §22]`, in the Dwarf Fortress
sense: insulation against Rimeholt's cold, melting point in the Kiln, weight
against encumbrance, brittleness at temperature. **Depth from interaction, not
from content volume** — the only kind of depth a small team can afford.

**Decay** `[plan §22]` — everything rots without maintenance. A second sink
alongside death, and it makes the premise literal: he withdrew maintenance, so
maintenance is the war.

### 5.2 By kind

- **Tools** — spear `[built, 12 strikes]`, knife `[built, 20 butcherings]`, axe
  `[built, 25 chops]`, snare `[built]`, **sword** `[built, 30 strikes, double the
  spear's base bite and sharper still in a smith's own hand]`, **copper sword**
  `[built, 18 strikes, between the spear and the real sword in bite and in
  everything else — a second, shorter metal line rather than a second copy
  of the first, §6]`, **fishing line** `[built, 25 casts]`, **pot** `[built,
  15 meals, Verge pottery's first product]`, **bow** `[built, 20 shots — Stage
  B's first ranged weapon, a Bowyer's stave and string, two-handed (§5.3)]`;
  pick, needle, hammer, saw, loom, quern all `[named]`. The built ones each
  buy a different thing: the knife
  buys *yield* (more off a carcass, and the only way to cut cord), the axe
  buys yield **and quiet**, the snare buys *absence* — the only work that
  pays out while you are somewhere else — the sword buys raw damage, the end
  of a chain rather than a shortcut through one (§6), with the smith's own
  skill adding more on top of whoever merely swings it, the copper sword
  buys the same raw damage *sooner and weaker*, earning no such skill bonus
  of its own, the line buys the one food chain that needs no fire and no
  butchering at all — cordage and a shoreline, nothing else — the pot
  buys a heartier meal, spent one charge per meal actually eaten hot rather
  than per meal cooked, since a flat counter of cooked meat has no way to
  remember which portion ever went near one, and the bow buys *reach* rather
  than more bite (its 2 damage sits under even the spear's 3) — the first
  tool in the Verge that trades raw damage for distance instead of for
  quiet or yield.
- **Ammunition** — **arrow** `[built]`, a Fletcher's product: wood and glue,
  fletched in a batch of two rather than one at a time (the same shape
  cordage's "2 cord per hide" already is). Countable and tradeable, unlike
  every tool above it — a Fletcher can resupply a soul who never fletched
  one, the same way a Smith's sword can't be handed over but a Miner's ore
  can.
- **Wearables** — hide cloak `[built, wears through on the cold it stops]`,
  **boots** `[built, 300 marsh-steps, softens the terrain-speed penalty
  without touching the shared rule every mover obeys]`, **gloves**
  `[built, 25 digs, quieter on Rock/Ore/Copper the same way an axe is
  quieter on a chop]`; hats, mail and plate at the Kiln tier and above
  `[named]`.
- **Placed and built** — campfire `[built, burns fuel and leaves ash]`, set snare
  `[built, springs once and is spent]`, **loot pile** `[built, PLAN §8.5's
  "the plunder is on the floor" — spilled by a soul-on-soul kill, fogged
  like a creature rather than global like a fire, gone after ~3 unclaimed
  minutes]`, **Bounty Board** `[built, narrow, §12 — a fixed landmark near
  the village, unfogged like a fire; the smaller of "a Sheriff job or a
  bounty board" asked for]`; kiln, drying rack, tannery, quern, cache,
  shelter, well, granary, wall `[named]`.
  Shelter is load-bearing: **logging off camped is safe, the open field is not**
  (the plan's own "Decisions locked" table, not a numbered section — corrected
  from this document's earlier `[plan §25]` citation). No `shelter` object
  exists yet, so `[built, narrow]`: the server's socket-close handler answers
  the question with the one thing Stage B has that already means "a camp,"
  a lit fire — `atFire`, the same flag warmth, cooking and being seen already
  read. Disconnect at one and the soul is simply gone, no death recorded, same
  as anyone logging off; disconnect anywhere else and the next tick kills them
  for real (`"never made it home"`, §11.3), Barrow-list entry and all, in
  place of the silent, no-cause erasure every disconnect used to get regardless
  of where it happened.
- **Consumables** — cooked meals `[built]`, preserved food, medicine, poultices,
  antitoxin for the Weald's air, small beer.
- **Relics** `[plan §2 via GREYKING.md]` — **warded seedstock, singing blades,
  deep-cut runes**, and every other made thing that still held a thread of the
  old magic when he closed his fist. These are what he *actually* took; ordinary
  treasure came along because it was in the same rooms. The only magic that ever
  reaches a player's hands as an object.
- **Old crowns** `[plan §17A]` — minted under kings who no longer have kingdoms.
  Behave less like money than like relics that happen to be spendable.
  **In code today** `[built, narrow]`: a rare find in a ruin (§3.4), and one
  thing to do with one — melt it at a fire for a bar, the last resort at the
  smelting fire, tried only when there is neither ore and charcoal nor
  copper on hand, per §17A's own "some are melted down by smiths who need
  the metal more than the history." No smithing skill is earned doing it;
  running a crown through a fire is not the same craft as a real smelt —
  copper, one step up in the same priority order, *does* earn it, because
  a copper seam is a real vein and not a found relic. Still no spending, no
  prestige, no market a crown could be worth something *in* — that needs an
  economy this prototype doesn't have.

### 5.3 Hands `[built]`

Not named anywhere in the corpus under that word — the closest existing
language is PLAN §19's item schema (material, quality, durability, weight,
provenance) and §22's "depth from interaction, not from content volume,"
neither of which speaks to *how a soul actually wields* the things §5.2
lists. Built on direction rather than a citation, the same way the bow's
own two-handed shape was: a soul has a `mainHand` and an `offHand`
(`HandItem` — `"none" | "spear" | "sword" | "copperSword" | "bow"`),
cycled with **I**/**J**, and only what is actually equipped there fights.
Owning a better weapon no longer silently retires a worse one the way the
old flat priority order did — the fix has to be picked, or the fist swings
instead.

A bow is properly two-handed: equipping it always empties the other hand,
and since there is then no separate melee weapon to prefer, a drawn bow
now fires at any range at all, point-blank included — where the old
auto-pick always tried melee first and only reached for a bow once
nothing was already close. Two one-handers, one per hand, is a real
dual-wield: the swing lands the main hand's full damage plus half the off
hand's, and spends both.

Scoped to the four combat weapons on purpose — knife, axe, gloves, boots,
a fishing line and a pot stay exactly what they already were, pack
counters read automatically wherever they mattered (§5.2's own entries
for each). Turning every tool into hand-equipment would have been a much
larger and much less clearly-asked-for change than letting a soul choose
which weapon actually fights. A hand still labelled with a weapon that
has since broken, or was never forged to begin with, simply acts empty
until that weapon exists again — no separate re-equip step once it does.
One piece of the old convenience survives deliberately: crafting a weapon
into an empty main hand equips it there automatically, so a fresh soul
is not fighting barehanded by default purely because equipping became a
real choice; it never overrides a hand already holding something.

---

## 6. Crafting chains

> Will be owned by `PROFESSIONS.md`, as an actual directed graph with a closure
> check `[plan §15]` — not prose.

**The rule that generates all the depth** `[plan §15]`:

> **Every crafted good needs at least two inputs from different professions, and
> at least one input that is Realm-gated.**

That single constraint forces interdependence — no profession can self-supply,
and every tier of goods creates demand for the ascent.

**The sword** `[plan §15]` — ore (Miner) + charcoal (Charcoaler, from timber by
Logger) → bar (Smelter) → blade blank (Blacksmith) → finished sword
(Weaponsmith) + grip (Leatherworker, from hide by Hunter, tanned by Tanner) +
oil (Apothecary, from herbs by Herbalist). **Eight professions, one sword** — and
gating real steel behind the Kiln's coal gives all eight a stake in Sigil #2.

**Food, field to winter table** `[plan §15A]` — grain (Farmer) + soil health from
a Tender's holdback → flour (Miller) → bread (Cook), alongside salted meat
(Hunter → Salter, using Reach or Kiln salt) and preserved fenroot (Forager →
Alchemist). A winter's food security is never one person's harvest, which is why
**a settlement that loses its Salter starves slower but starves.**

**Construction, one wall** `[plan §15A]` — stone (Mason) + timber (Logger →
Carpenter) + a ward against the Grey (Tender) + iron fittings (Miner → Smelter →
Blacksmith). A defensible wall is never a Mason's achievement; it is the visible
record of a whole settlement's professions agreeing to protect the same ground.

**Alchemy, reagent to remedy** `[plan §15A]` — herb (Herbalist) + Weald Undying
reagent (Forager, at real personal risk) + purified water (Alchemist) → a salve,
or a cure for the Kiln's ashlung. Capped at the Weald for a reason: it is the
Realm where the ingredients lie to you, so **every apothecary's reputation is
built on having survived being wrong.**

**In code today** `[built]`: six chains that cross.

- **Food:** kill → butcher → cook at a fire → eat.
- **Tools:** stone + wood → knife → (hide → cord) → cord + wood → snare → hare
  → back into the food chain.
- **The sword**, compressed to what one soul can do alone: ore + (wood → char­coal,
  at a fire) → bar (smelted at a fire) → bar + wood + cord → sword.
- **The line**: hide → cord (needs a knife, same as the snare) → cord + wood →
  fishing line → fish, straight back into satiety with no fire and no
  butchering step at all — the shortest chain in the prototype, and the only
  food source that shares its first ingredient with the tools chain rather
  than needing its own.
- **Copper**, the sword's second and shorter cousin: copper (smelted alone,
  no charcoal, at a fire) → copper bar → copper bar + wood + cord → copper
  sword. One fewer input than the real sword, reachable sooner because of
  it, and weaker for the same reason — §3.1 names copper, not iron, as the
  Verge's own metal, so this sits alongside the ore chain rather than
  replacing it.
- **The bow**, the first chain built from waste rather than a fresh
  material: a carcass's glue (already a butchering byproduct) + wood →
  arrows (a Fletcher's half), and a charcoal burn's pitch (already a
  byproduct of that) + wood + cord → a bow (a Bowyer's half). Neither half
  needs the other to be craftable, but a bow with no arrows and arrows with
  no bow are both inert — the same "no single link substitutes for the
  chain" property every other entry here already has, just assembled from
  two professions' offcuts instead of two professions' primary yields.

All six are the first appearance of §15's generative rule in the prototype:
a snare needs cordage *and* wood, cordage needs hide *and* a knife already in
hand, hide only comes off an animal someone hunted, a sword needs a vein,
a fire kept long enough to burn wood down twice over, *and* the cord the
tools chain already produces, a line needs that same cord plus wood before
it is worth anything at all, copper needs its own vein plus that same
wood and cord a third time over, and the bow needs two separate byproducts
that come from two unrelated actions (a kill and a burn) neither of which
was ever performed to get them. **No single action or material substitutes
for the chain** — that is the property that eventually makes trade
arithmetic rather than courtesy, once two souls' hours stop yielding the
same output (§7.4). It is not the same claim as "no soul can do the whole
chain alone," which was never the rule — see §7.4's note on what a skill
actually gates. Plus wood → spear, hide → cloak, wood → fire, clay (at a
fire) → pot, and hide + cord → boots or gloves — the cloak's two siblings,
each answering a specific need (a marsh, the loudest work there is) the
way the cloak answers cold, rather than being a second cloak. Butchering
and a charcoal burn also now each pay out a small guaranteed byproduct
(glue, pitch) alongside their main yield — the bow chain above is where
both of those actually go (§4).

**Where the built sword chain falls short of §15's rule:** the full version
gates real steel behind Realm-gated coal and spreads the work across eight
professions (above); Stage B has one Realm, so there is nothing yet to gate
an input against. What §15 calls interdependence, at this scale, comes from
skill taking time to earn (§7.4) rather than from a Realm wall — the two
pressures the full design layers together are, for now, running on only one
of them.

---

## 7. Jobs & professions

> Will be owned by `PROFESSIONS.md`.

### 7.1 The rule that generates the list `[plan §17]`

**Every survival pressure must have a profession that answers it.** The job list
is *derived* from the survival model, which is why it holds together.

| Pressure | Answered by |
|---|---|
| Hunger | Farmer, Herder, Hunter, Fisher → Miller, Cook, Preserver |
| Thirst | Dowser, Well-digger → Alchemist (purification), Brewer |
| Temperature | Tailor, Furrier, Leatherworker → Mason, Carpenter, Charcoaler |
| Exhaustion | Innkeeper, Cook, Physician |
| Injury & infection | Surgeon, Physician, Apothecary, Herbalist |
| Encumbrance & distance | Porter, Caravaneer, Shipwright, Cartographer |
| The Grey | Tender, Alchemist, Engineer, Consoler |
| Danger | Mercenary, Scout, Ranger, Delver |
| Uncertainty | Insurer, Broker, Banker, Information broker |

### 7.2 The professions, by sector `[plan §17]`

- **Gathering** — Farmer, Herder, Hunter, Fisher, Forager, Herbalist, Miner,
  Logger, Salvager, Dowser, Trapper, Beekeeper.
- **Refining** — Smelter, Tanner, Miller, Charcoaler, Glassblower, Salter,
  Reagent-grinder, Renderer, Distiller.
- **Crafting** — Blacksmith, Weaponsmith, Armourer, Carpenter, Mason, Tailor,
  Leatherworker, **Fletcher** `[built, §5.2/§6 — arrows, off glue]`,
  Jeweller, Scribe, Cartographer, Cook, Brewer, Apothecary, Engineer,
  Shipwright, Potter, **Bowyer** `[built, §5.2/§6 — the bow, off pitch]`,
  Cooper, Ropewright.
- **Sustaining** — Physician, Surgeon, Consoler, Teacher, Innkeeper, Courier,
  Caravaneer, Midwife, Grave-teller.
- **Economic** — Merchant, Broker, Banker, Landlord, Auctioneer, Insurer,
  Guildmaster, Assayer, Factor.
- **Frontier** — Scout, Ranger, Tender, Delver, Mercenary, Sigil-breaker,
  Trailblazer, Beast-tamer.
- **Grey** — Smuggler, Fence, Bandit, Poisoner, Spy, Given agent.

Roughly **sixty professions before a single one branches** — and every branch is
a Realm doing what §3.1 promises: gating the good version of a trade behind the
ascent.

### 7.3 Five roles that exist *only* because of permadeath `[plan §17]`

- **Insurer** — players will sell death cover. It emerges from the mechanics
  rather than being designed in.
- **Teacher** — knowledge is soulbound but degrades through death `[plan §25]`.
  Masters transfer mastery to apprentices. **This is how society rebuilds after a
  mass-casualty event**, and it keeps veterans valuable after their character is
  gone. Also the first profession a new player ever meets `[plan §1A]` —
  **partly built, in two separate pieces**: an actual Teacher NPC and her
  tutorial conversation exist (§2.5), teaching a new soul words rather than
  XP, exactly as before; and, `[built]` as of this pass, **live master-to-live-
  apprentice skill transfer** — key **K**, `doTeach` in tick.ts — a real
  soul can now raise another real soul's best-practiced skill, capped one
  level short of their own (`skills.teachingCeiling`) so the top rank still
  has to be earned rather than taught. This is §25's "masters transfer
  mastery to apprentices" half; its other half — a soul keeping a degraded
  fraction of its *own* skill through its *own* death — was deliberately
  not built, since `skills.ts` states outright that skill "dies with the
  character," and building the crossed-death-retention half would have
  contradicted that rather than merely extended it (see the gap list, §15,
  for the full reasoning). §18's paid apprentice-yield economy — a Teacher
  earning an ongoing cut of a student's early work — also stayed unbuilt;
  it needs a currency Stage B doesn't have, so what shipped is free
  instruction, not a wage.
- **Landlord** — land survives death, making it the world's only asset class that
  does not die with you `[plan §23B]`.
- **Grave-teller** — someone has to know the Barrow-lists cold: who died where,
  what killed them, whose line is owed what. Half historian, half informant, and
  the only trade whose entire stock is other people's deaths.
- **Given agent** — a licensed go-between for the Given, carrying no visible
  mark. Someone has to be the seam between the two economies.

### 7.4 How skill works

**Skill-based, uncapped, no classes** `[plan §17, §22]`. A soul is not a Farmer
*instead of* a Blacksmith. Skills rise by use, so most souls that survive a
season hold several, and full specialists are a choice rather than a starting
cage. **"You can be anything" is not a slogan here; it is the progression model.**

A master Smith who has never left the Moorfen is not a bad Smith — they are the
best Smith the world currently has access to. Nobody's work is obsolete; it is
*ceilinged*, and the ceiling only moves when the whole world moves it together.

**In code today** `[built]`: eight skills — woodcraft, hunting, butchery,
cooking, tailoring, trapping, smithing, fishing — earned by doing, dying with
the character, and **quiet**: a practised hand makes less noise, so competence
and safety are the same stat. Trapping, smithing and fishing are the three
exceptions, and each earns something noise never could: trapping raises the
catch chance of whatever a soul's snares spring (the only skill that pays out
while its owner is somewhere else); smithing raises how much charcoal a burn
yields, how much bar a smelt yields, and how hard a self-forged sword hits;
fishing raises the odds of a bite, deliberately slower to reward than
trapping's — a snare is paid for by hours spent *away*, a line by hours spent
*right here*, and the reward should track which currency was actually spent.

**Dying with the character has exactly one exception, and it is a person, not
a rule:** a living soul can now teach another living soul (§7.3, key **K**),
so practice can outlive the body that earned it — but only in whoever was
actually taught before that body died, never in the same soul's own next
life, and never past one level short of the teacher's own. A master who
never taught anyone still loses everything at death, same as always.

None of the eight ever *gates* an action — every one of them is attemptable
at zero, the way §17/§22's "no classes, no starting traits" already promises.
What skill buys is always *quality*, never *access*: this is also why a
skilled generalist really can supply an entire chain alone (§6), and why
that was true before smithing existed and stayed true after — smithing only
made doing so worth having practised.

**Stage B's cut list** `[plan §44]` names ten professions in scope: Farmer,
Hunter, Miner, Logger, Charcoaler, Smelter, Blacksmith, Leatherworker, Tanner,
Herbalist — the sword chain plus what feeds a person day to day. Trapper and
Fisher are not on that list and are built anyway — both stated here rather
than left to look like an oversight, because both answer the exact same
"feeds a person day to day" test the named ten were chosen by (§17's Hunger
row names both explicitly), just by a different verb than Farmer or Hunter.
Nothing on the list is contradicted; two more of §17's food professions
simply exist now than §44 got around to naming.

---

## 8. The Grey King's commands

> Will be owned by `CAPTAINS.md` (the verbs) and `FETTERS.md` (the boundary).

The largest gap between what is designed and what is built.
`doc/archon/DESIGN.md` §3.4 asks for **40–60 verbs**; the prototype has eight.

### 8.1 What he does personally `[plan §32]`

Personal and cruel rather than administrative:

- **Mark a player** — a public bounty; officers redirected. `[built as `mark`]`
- **Plunder an assassination.**
- **Seize a specific parcel.**
- **Desecrate a maker's mark** — voiding a dead smith's surviving works. An
  atrocity against the economy and against a person's memory at once.
- **Withdraw maintenance** from an inhabited territory to accelerate its rot.
- **Offer a named player a bargain** — your settlement spared, for your guild.
- **Address someone directly, by name, citing their dead.**

### 8.2 What officers do `[plan §29]`

Issued against marks and territory objectives, validated as bounded actions:

**Ambush** (intercept on routes, chokepoints, a target's own holdings) ·
**Assassination** (against a *named* player — telegraphed by rumours, sightings,
a letter; dread, not randomness) · **Theft and raids** (storehouses, caravans,
farms — this attacks the economy, which is how non-combat players get a stake) ·
**Sabotage** (poison wells, burn fields, spoil stores) · **Seizure** (burn out
holdings on ground the Grey has taken) · **Garrison** (hold a stronghold as a
static, high-value objective) · **Roam** (patrol, contest, spread the Grey).

### 8.3 The Muster — when he comes for a place, not a person `[plan §29A]`

Everything above is one officer, one target. This is the escalation.

**The aggression budget is real and it is spent, not felt.** Every Realm's
Captains and Reavers draw from a shared pool that regenerates. Spend it thin and
the world feels a background hazard; save it and throw it at one place at one
time, and that is a Muster.

**It is telegraphed** — Scouts report a warband forming, refugees come down the
road ahead of it, and the weather over the massing ground reads wrong to anyone
who knows what the Grey does to weather. A settlement paying no attention
deserves what it gets; one that is watching has real time to prepare.

**It targets the wards first**, because the wards are what hold the Grey back and
breaking them is worth more to him than any single kill.

**Frequency answers the thesis, not a dice roll.** A quiet, compliant settlement
rarely sees more than background hazard. A settlement that is visibly *winning*
draws Musters specifically — the fastest way to stop a town becoming the group
that could reach him is to keep it rebuilding its wall instead of marching north.

### 8.4 The social verbs — the whole category the prototype lacks `[plan §3]`

His win condition is **stasis**, not kills, which makes his strategy social
rather than military. None of this exists in code:

- **Reward defection** — bounties for corpses, payment for informants, plunder
  for players who take rank in his Host.
- **Selective mercy** — spare one guild, let another burn, then make certain
  both find out. **Grudges do more damage than officers.**
- **Lie** — he knows things players cannot check and owes them no honesty. He
  keeps his word only where he swore it, and he swore very little.
- **Offer individual escapes** — clear one person's mark for their guild's plans.
  Make loyalty individually expensive.
- **Tax the collective, subsidise the predator** — make cooperating cost more
  than defecting.
- **Suppress ascent specifically** — the Grey weighted to the frontier, officers
  massed at Sigil approaches, economic pressure on exactly the goods needed to
  climb.
- **Be generous to the compliant** — genuinely. Life in the Verge can be
  pleasant. **The world gets crueller the harder you try to leave it.**

### 8.5 Counter-play — every command has an answer `[plan §28, §31]`

A **mark** is public, on-chain, and carries a value and a cause, so being hunted
is always earned and explicable. Five ways to answer one: **discharge** it (pay),
**contest** it (argue your case before him or a Warden — the single best use of
the LLM in the game), **void** it (bribe a Captain), **buy** it (shield someone,
or hunt them licensed), or **inform** on someone else.

Officers are beatable by information and politics as much as by force:
documented weaknesses, **rivals** (killing a competent Captain promotes whoever
is best positioned — sometimes a fool), **bribery**, and **embezzlement** —
report an officer's skimming and watch him handle the problem himself.

**Mortality runs both ways** `[plan §31]`. Officers die permanently too. The rank
opens, a successor is promoted, and **the plunder is on the floor.**

### 8.6 The Fetters — the hard boundary `[plan §38]`

**A command list without its prohibitions is the dangerous half of the document.**
These are absolute: not amendable by governance, not liftable by an adapter, not
relaxed at any tier.

He cannot touch the Hoard · cannot mint, destroy or move any asset outside his
own budgeted purse · cannot change his own rules, weights, tier or these fetters ·
**cannot kill** (death originates only in the deterministic simulation) · cannot
act outside the published action space · cannot exceed his per-tick and per-Era
budget · **cannot see anything a player cannot** · cannot contact anyone outside
the game · **cannot make a binding promise** (he may *say* anything; saying is
not doing) · cannot outlast the Understudy · cannot be a single point of failure
for progression.

Two implementation rules that make the list real: **fetters live in code, not in
the prompt**, and **prefer inexpressible over rejected** — there is no `Transfer`
verb that names the Hoard and no verb that produces a death.

> The parallel to the fiction is exact, not decorative: the working obeys rules
> Emeric did not write and cannot bend. He is powerful. He is not free.

### 8.7 What is built today `[built]`

Nine actions, chosen every half minute from a pressure-gated menu, each with a
stated reason that becomes the line the player sees:

`nothing` (always on the menu, and the commonest choice) · `send_lieutenant` ·
`send_scout` · `false_crows` · `cold_snap` · `blight` · `loose_a_boar` ·
`loose_the_wolves` · `mark`.

**`send_scout` is the cheapest real action on the menu** (pressure gate 10,
against `send_lieutenant`'s 60) — a Reaver sent to look rather than the
Lieutenant himself committed, which is most of why it reads as the probe
that comes before the real threat rather than a second copy of it. See §2.4
for what a Scout actually does.

Pressure is computed from what the Verge has built — goods carried, tools held,
skills learned, fires lit, souls alive — and **a death buys the survivors quiet**.
That is §8.3's Muster logic and §8.4's "be generous to the compliant", already
working, at the scale of one zone.

**`mark` is no longer only his to choose.** A soul who kills another soul
marks themself the same tick, standing alongside the Overlord's own
discretionary use of the action — the first place in the prototype where a
player's own act reaches directly into his menu rather than only being read
by it. Killing also costs **standing** (§2A: never "reputation score" out
loud) — a per-life value, kept only as long as the soul is, since Stage B has
no account layer for it to survive a death on. Three kills or so and a soul
crosses into **notorious**: the Lieutenant stops hunting them by mark *or* by
proximity — §29's "notorious player-killers... can be plundered into actual
rank" read literally, one Lieutenant deep. This is a narrow slice of §25/§28's
outlawry, crossed ahead of §44's own Stage C gate on explicit instruction —
see this document's gap list, below — and it stops well short of that
system: no bounty payout, no Host rank actually offered to a notorious
soul. It answers "does killing cost you something," not the larger question
the full system is for.

**Plunder off a body is built, narrowly** — PLAN §8.5's "the plunder is on
the floor," said there of a dead officer, now true of a dead player. A
soul-on-soul kill (`dropLoot` in tick.ts) spills everything the loser
carried as a lootable pile at their feet, fogged the same as a creature or
a villager rather than a landmark like a fire, and left to rot after about
three unclaimed minutes if nobody takes it. **Crowns are the one exception,
cut rather than dropped**: 20% straight into the killer's own pack, the
rest simply gone — his due, the same "he takes a cut before the remainder
reaches the Hoard" shape §30A already gives his officers, applied to an
unlicensed kill instead of a licensed one. Looting merges a pile's
stackable materials by summing (wood, arrows, cordage, the lot) and takes
whichever of a wear-counter tool is better rather than adding two "one
bow"s into a number that means nothing — a looter ends up with the
sharper sword, not two swords. Still not a mark's full weight: no bounty
payout for a mark, none of §28's other four ways to answer one, and no
Host rank actually offered to a notorious soul.

**Commons standing (§3's "kindness needs teeth") now has two of its six named
acts built, out of the same "does Stage B have anywhere to put this" test.**
Stabilising a stranger needs the Mortal Wound system (cut, §44); sheltering
someone needs shelter; paying another's mark needs a currency; purifying land
needs corruption and land to purify — none of that exists yet. **Feeding a
hungry soul didn't have that problem: G already existed.** Give food to a
soul whose satiety is genuinely low and the giver's own standing rises — the
same ledger a kill spends, climbed the other direction, at roughly a third
the rate (three acts of kindness to undo one kill, not one for one).
**Teaching for free didn't either, once a teaching verb (K, §7.3/§7.4) was
built to answer §25's apprentice-bond gap** — the same standing gain, per
lesson, for as long as the student has room left under the level-behind
ceiling that gain itself is bounded by. §3 explicitly warns this must not be
farmable by alt-pairs; nothing here stops two cooperating players trading
scraps, or lessons, back and forth for standing, and that gap is left open on
purpose rather than guarded by a mechanism nobody has asked for yet.

---

## 9. Magic & the working

> Will be owned by `MAGIC.md`.

### 9.1 The system `[plan §20]`

**Magic is not gone. It is somewhere.** All of it is in one man, and everything a
hedge-witch does is taken back out of his hold without asking. That single fact
explains why magic is rare, why it is forbidden, why using it is dangerous, and
why a new king could change all of it.

- **He feels the direction.** Not who, not exactly where — a rough bearing and a
  sense of size. A hedge-witch closing a wound is nothing. **A ward big enough to
  hold a town is a shout.**
- **His captains hunt it.** Feeling it is his; finding it is their job, and it is
  most of what a Reaver patrol is actually doing.
- **It leaves a trace on you** — not corruption, the opposite. Someone who works
  often goes **bright**: too-clear eyes, hair that keeps its colour past sixty, a
  warmth in a cold room. Ordinary people notice. Some are glad. Some go quiet and
  remember which house it was.

**In code today** `[built, narrow]`: two spells, free to every soul from the
first tick, no reagent and no crafted focus (key **Z** — a bolt, doStrike's own
melee-then-bow targeting reused at range; key **M** — a heal, no target). PLAN
already permits this reading — "there are still threads in the world... in
people born with a knack" says ordinary folk-magic never fully died, only §17/
§22's "no classes, no starting traits" made the Stage B call to make that knack
universal rather than a trait some souls roll and others don't, the same
simplification every other verb in this prototype already makes. **The two
mechanics §20 promises are both here, made numeric**: "a hedge-witch closing a
wound is nothing, a ward big enough to hold a town is a shout" is why a cast
is the single loudest thing in the Verge (past even a vein, §3.4's own
loudest-tile crown); "his captains hunt it" is a real, if narrow, roll —
`applyOutlawry`'s same standing/mark mechanism a kill already uses, at a
third of a kill's cost, a chance per cast rather than a certainty, or no
hedge-witch in the fiction would ever risk it twice. Nothing about the
Given (§9.3), the bright trace, or a real Working exists yet — this is the
smallest slice that makes "magic is illegal, not absent" playable.

### 9.2 The bet every village makes `[plan §20]`

Magic is the only thing that holds the Grey off a field. It is also the thing
that brings his captains down the road. **A village that wards its crops eats. A
village that wards its crops gets visited.** The same wager as everything else in
this world: the things that keep you alive are the things that get you seen.

### 9.3 The Given `[plan §20A]`

**He takes people.** Anyone marked, exiled, hunted or simply desperate can walk
north and be received.

**What you get:** magic freely and without hunting — a Given hedge-witch works in
the open, in daylight, and nothing comes down the road for her. Protection. Work,
paid in things nobody in the valley has seen for a lifetime.

**What it costs:** every honest town is closed to you, enforced by other players
rather than by a rule. **You are lent, not given** — he can take it back
mid-sentence, and everyone in a Given town has seen him do it to somebody. And a
new king inherits you: the Given have the largest possible stake in the endgame
and no vote in it whatsoever.

**Why it is worth building:** it gives the villain a *society* rather than a
spawn table, and predatory players a home and a market instead of a penalty box.
There is a direction on the compass that means *giving up*, and it is warm and
fed and lit.

---

## 10. Sigils & the endgame

> Will be owned by `SIGILS.md`.

### 10.1 The seven `[plan §5]`

Each must be consensus-checkable, hard, and **irreducibly collective** — solvable
only by many people who do not all know each other. **If a single mega-guild can
solo one, the game has agreed with the villain.** And he **repairs** them: it is a
race, not a checklist.

| Sigil | Axis | Requirement | Why it can't be solo'd |
|---|---|---|---|
| **Harvest** | Plenty | A true surplus delivered at once from many settlements, sustained across a season | Cannot be stockpiled beforehand or grown by one valley |
| **Bastion** | Endurance | Hold a place for K consecutive blocks against his full aggression budget | **Requires unbroken coverage across time zones** |
| **Witness** | Truth | N independently corroborated testimonies about a concealed fact, from souls with no shared history | Corroboration from a closed group carries no weight |
| **Mercy** | Kindness | A threshold of Commons standing built from acts toward strangers | **The one Sigil you cannot fight through** — and the one he cannot comprehend |
| **Craft** | Production | An artifact whose material chain spans every open Realm, carrying many distinct maker's marks | Provenance proves each component came from a different hand |
| **Riddle** | Wit | A puzzle he sets himself, whose answer is split between people who must trust each other to speak it | No one person is given enough of it |
| **Name** | Lore | Speaking his true name, assembled from Shards | The fragments are held by different people, in different places |

**Bastion**'s time-zone requirement is the cleanest anti-mega-guild mechanic
available: it does not ask for more players, it asks for *differently distributed*
ones. **Name never appears on any tracker.** It should look, until solved, like a
locked door with no visible mechanism.

### 10.2 The Shards `[plan §13A]`

**A Shard is one true fragment** of what happened between Aurel, Emeric and
Maren, or of how the working functions. Never the whole thing — always something
meaningless alone and damning in combination.

Physically placed, not dropped: reading a collapsed keep's carving correctly
after a Keeper taught you the script; finishing what an Unbowed has been waiting
for; provoking a captain into saying more than he meant; earning enough trust in
a Given settlement that someone tells you what they were never supposed to.
**No Shard drops from combat, and no Shard is bought.** Every one costs a
relationship, a skill, or a risk.

**A Shard may only ever be shown, never explained.** If a piece of content
resolves a question outright, it is exposition wearing a Shard's clothes.

### 10.3 The three doors `[plan §1B]`

He can be killed. Getting to him is the whole game; killing him is the last five
minutes. **And then the throne is empty and you are standing next to it.**

- **Take the throne.** You hold all the magic and decide who may use it. But the
  working does not let go of a living holder, so the land stays grey while you
  sit there — and **the thing that makes a Grey King is not cruelty, it is being
  certain you are the one who should decide.** Emeric was certain too.
- **Pass it on.** Let someone else kill you for it. Generous, humble, and **not a
  solution** — you have handed a loaded thing to a friend.
- **Break it.** Open your hands and let the magic go back into the land, to
  everyone, ordinary people included. The only ending that ends anything, and the
  hardest by an enormous margin, because **it only works if the world can hold
  itself together without a king.**

The cycle underneath it all: **Emeric Vale is not the first Grey King. He is the
most recent one.** Nothing says so outright.

---

## 11. Death, marks & customs

> Will be owned by `SURVIVAL.md` (the model) and `WORLD.md` (the customs).

### 11.1 The model `[plan §25]`

**Dying is never instant and never arbitrary.**

- **Mortal Wound** — you bleed out over minutes, and another player can stabilise
  you. Death becomes *social*, and the rescue meta is among the strongest bonding
  mechanics available.
- **Survival death is slow and telegraphed.** You should always be able to point
  at the decision that killed you.
- **Never to a lag spike.** A hard requirement on the netcode.

**Lost forever:** the character, and everything carried or equipped.
**Kept by the soul:** identity, lineage, reputation, titles, land deeds, banked
goods, guild membership — and **knowledge at reduced fidelity**. You keep your
recipes but take a mastery penalty; a new body relearns the hands.

**Banked vs. carried is the core risk decision**, and storage is *located*: a
vault in the Moorfen is no use in Rimeholt.

**No true sanctuary.** Settlements are safe *in practice* — outlawry, bounties,
walls, other players — never by rule.

### 11.2 Customs `[plan §10]`

- **The Telling** — when someone dies the village says aloud what they made and
  what they were owed in kindness. Towns do it properly. Reavers do it mockingly,
  over the body, for sport.
- **The obscenity** — a marked man's mark **passes to his line.** Children are
  born already hunted for what a grandfather did. No crime in this world is hated
  more, and it is in half the drinking songs.
- **Marks as memorials** — a dead maker's surviving work stops being merchandise.
  Buying one from a grieving household marks you as a certain kind of person,
  which on-chain provenance makes permanently visible.
- **The Barrow-lists** — every settlement keeps a board of its dead, by name and
  by what killed them. **Newcomers read it before they read anything else. It is
  the truest tutorial in the game and it costs nothing to build.** `[built]`
- **Naming an heir** — before anything dangerous you name your successor aloud.
  Superstition, and also the lineage mechanic: a character who dies unnamed is
  mourned as *doubly* lost.

### 11.3 Death causes in code `[built]`

starved · died of thirst · froze · gored by a boar · savaged by wolves · cut
down by a Lieutenant · **killed by another soul** · **never made it home**.

The soul-killed one lands like the others do: press SPACE near another
living, not-graced soul and the same strike that would have hit a deer hits
them instead — whichever is nearer wins, one shared verb, no separate key.
It now carries a real, if narrow, consequence — see §8.7 — and, as of this
pass, a real plunder (§8.7, §5.2): everything but crowns spills as a
lootable pile, crowns themselves cut 20% to the killer and the rest gone.
Still **not** a mark's full weight: no bounty payout, none of §28's five
ways to answer a mark otherwise. §25/§28's whole outlawry and bounty
system — the Grey King paying for corpses, a killer visibly taking his
coin — is still mostly unbuilt; what exists now answers "does killing cost
you anything, and what does it leave behind," not "does the outlawry
economy work."

**"Never made it home" is the offline-safety wager's own cause** (§5.2,
the plan's "Offline: safe when camped, exposed in the field" decision) — a
disconnect anywhere but a lit fire, landed the instant it happens rather
than left to a lingering unpiloted body, since Stage B has no account layer
for anyone to ever reconnect to that same soul regardless.

**Implied but absent:** drowned, bled out (needs Mortal Wound), sickness, the
Kiln's ashlung, the Weald's air, fell.

---

## 12. Economy & institutions

> Will be owned by `PROFESSIONS.md` and `ARCHITECTURE.md` between them.

**Barter is the daily reality** `[plan §17A]`, and it is not a downgrade — it is
honest. **Salt is the nearest thing to universal money**, and it earned the role
rather than being declared into it: it preserves, it is portable, and every
settlement wants it. Prices are spoken of in **salt-weight** in places that have
not seen a scale in years. **Old crowns** circulate as spendable relics.

**Four ways work is paid** `[plan §17B]`: piece work (the default, and the
fairest test of whether a craft is wanted) · commissioned work (a wall, a well,
arms for the watch — paid in harvest shares, standing, or salt-weight over a
season) · apprentice yield (a Teacher's cut) · **the Given's coin** (waged, the
way an army pays a soldier, and the one payment with strings nobody else's has).

**There is no formal employer class**, deliberately. Nobody clocks in. Work here
is always, visibly, between people.

**Distance is not friction, it is the market** `[plan §23A]`. The Kiln's coal is
cheap at the Kiln and expensive three Realms south, and that gap is a Porter's
wages, a Caravaneer's risk, and every mile a Scout had to call safe. **Local
markets clear locally** — no global price feed, because a single server-wide
price for iron would erase every reason a smith's own reputation matters.

**Land is the only wealth that outlives you** `[plan §23B]`. Everything carried
goes to the Hoard on death; **a deed belongs to the soul, not the body.** So land
prices should rise faster than any other good's the longer a server runs, and the
families that matter in year five are not the ones who died richest — they are
**the ones who kept the same plot of ground.** Land is the safe asset, not the
free one: neglected holdings revert, and parcels encumber when territory is lost.

**Settlements** `[plan §23]` are clusters of parcels whose shared works — walls,
wells, wards, granaries, roads — are built and maintained collectively and
generate the holdback against the Grey. **Guilds** are the unit the Sigils are
actually played by: shared treasuries with defined withdrawal rules, ranks,
enforceable contracts, shared answer for a member's mark, and inheritance when
officers die.

**Player institutions and the scams that come with them** `[plan §24]`. In a
permadeath world **the banker can die** — not a bug to patch, the most
interesting property the institution has. The position is explicit: **we build
the tools for verification and record; we do not build protection from bad
judgement.** The one hard line is that **every instrument must be checkable
before it is trusted** — so a scam is always something a careful person could
have avoided, and a loss is a lesson rather than a lottery.

**Where the plunder goes** `[plan §30, §30A]`. Officers take a cut of everything
they collect off the dead before the remainder goes to the Hoard, and spend it on
gear, retinue and fortification — which makes it a **recoverable sink**: kill the
officer and the accumulated take drops. An officer cannot walk into an honest
town's market, so plunder moves through a Fence or a Given agent, and **every
officer killed starves an entire supply chain that had organised around feeding
him.**

**In code today** `[built]`: one-sided giving (T to pick what you offer, G to
hand one over) with every hand-over appended to a trade ledger from the very
first one. No currency, no escrow — those are for strangers. **§30/§30A's
"where the plunder goes" now has a first, narrow answer for a player kill,
too** (§8.7, §11.3): crowns off a killed soul split exactly the way an
officer's take does, a cut to whoever did the killing and the remainder
banked in a `deadStockpile` rather than spent by any player directly —
Stage B has no Hoard for it to actually reach, so a stockpile is the
honest middle step, and it is not inert money: it is the one funding
source the Bounty Board gives a notorious soul, below.

**The Bounty Board** `[built, narrow]` — a first, player-run answer to
"where the plunder goes" from the *other* direction, and to the top-level
decisions table's own PvP line: **"his coin funds the bandits who do it."**
A fixed landmark near the village (key **U**), not a Sheriff NPC and not a
player-held role — the smaller of the two things named when this was
asked for, since everything a Sheriff would do by title, a board already
does by function. It has no target picker: every other verb in Stage B
resolves "who" by nearest; this one resolves it by *worst*, because
standing (§2A) already sorts every soul without needing new input. A
lawful soul (standing above `NOTORIOUS_STANDING`) spends their own crowns
and always funds a price on the worst other soul currently known; a
notorious one spends the dead stockpile instead and always funds a price
on the *best* one — the two poles standing already gives, aimed at each
other rather than chosen by hand. Repeat posts stack onto the same
bounty, so "the price goes up with each infraction" is an emergent
property of more than one soul agreeing someone's earned it, not a
formula. Collected whole by whoever lands the kill, on top of whatever
plunder falls out of the pack itself; forfeited back to the stockpile,
uncollected, if the target dies to anything else first. No escrow beyond
the post itself and no refund to the poster — the same "we build the
tools for verification and record; we do not build protection from bad
judgement" line this section already commits to, just applied to a bounty
instead of a scam. This is **not** §28's mark-answering machinery: no
"contest," "void," "buy" or "inform," and nothing here interacts with
`marked` or the Overlord's own choice of who the Lieutenant hunts — it is
a second, player-run economy sitting next to that one, not an
implementation of it.

---

## 13. Texture

> Will be owned by `WORLD.md`. Cheap to write, enormously effective, and the
> first thing lost if it is not written down. All `[plan §12]` unless noted.

**The calendar.** Years count from the Fall. It is currently the **Ninety-First
Year of the Grey** — and in the Verge people just say *"the ninety-first"* and do
not finish the phrase, the way you would not finish naming an illness in the
house of someone who has it.

**Sayings.**

- *"Gone to ground."* — a blessing at a wedding (may your life stay small and
  unseen and long), a threat in an alley, and what a captain says before he does
  it. Always the same phrase; context is everything.
- *"Keep your fires low."* — goodbye, said to travellers. Practical advice and a
  superstition at once.
- *"Nothing is free. But some things are given."* — the closest the Old Kingdoms
  had to a creed. Said with a curl of the lip about the Given, who took the
  second half of the sentence and forgot the first.
- *"Still making his case."* — of anyone consumed by an old grievance, rehearsing
  an argument nobody living is left to answer.
- *"Bright in the wrong light."* — of someone who looks too well, too healthy,
  too lucky, in a world where that is never free. Also just: of a lie.
- **"I'll remember it."** `[plan §8]` — what you say instead of *thank you*.
  Thanks ends a thing; remembering keeps it open. It is the counter-thesis in
  three words, and **he knows exactly what it means, finds it sentimental, and is
  wrong.**

**What survived the Old Kingdoms** `[plan §8]`: not institutions and not armies.
**Songs** with verses missing where the verses named places that no longer exist.
**Hands** — a woman who knows how her grandmother tanned hides. **Roads**, because
nobody bothered to destroy them. **Grudges**, between valleys, over things that
stopped mattering ninety years ago and still get people killed.

**What survives of Maren** `[plan §11]`: almost nothing, and it should stay that
way. Her name is not spoken anywhere by anyone. What survives is stranger and
better — **workings still taught hand to hand for four generations by people who
have no idea whose they were**, done exactly the same way every time for reasons
nobody living can give. A Keeper might recognise one and go quiet rather than
explain. **The most affecting version of a legacy in a world like this is a
technique, not a monument.**

---

## 14. Prototype reconciliation

What Stage B calls things versus what the world calls them. This matters now
rather than later because renaming is nearly free today and gets expensive once
there are saves, tests and screenshots referring to the old names.

**The standing decision: these are real animals, and they stay real animals.**
The bestiary is recognisable livestock and game — a goat, a hare, a boar — with
a locale in front of the name where one is needed. Nothing gets renamed into a
fantasy thing to match a slot.

| In code | Canon | Status |
|---|---|---|
| `hare` | — | `[new]`, and the Verge's own. Nothing in PLAN.md named it; it exists so the snare has a reason to be built. |
| `deer` | — | Kept. Fen-deer are the Moorfen's; a plain deer is the Verge's own and does not need a prefix. |
| `river-goat` | **River-goat** `[plan §44, §7A]` | **Canon.** Taming is still unbuilt. |
| `hedge-boar` | — | `[new]`. Fills the gap §15 flagged: the Verge's aggressive Wild had no name. §44 said "bog-lynx", but that is a Moorfen animal described by stalking behaviour the boar does not have. |
| `wolf` | — | Kept as a wolf. It is a real animal and reads as one. |
| crows | — | **Not in PLAN.md at all.** A prototype invention. |
| `Lieutenant` | Lieutenant `[plan §27]` | Correct already. |

**What this leaves open.** The wolf currently does the *job* of the Grey-touched
— comes looking, hunts on noise, night-driven — while being an ordinary animal.
That is fine and arguably better: a wolf that hunts you at night needs no
explanation, and §44's one-Grey-touched slot can be filled later by something
that is genuinely wrong rather than by relabelling a wolf. The ash-hound and the
fen-wraith stay unbuilt, waiting for the Realm they belong to.

**The crows should be canonised rather than removed.** They are the prototype's
best original idea — noise made *visible*, readable by the player and by the
Lieutenant alike — and nothing in PLAN.md covers that channel. They belong in
`WORLD.md`.

---

## 15. Gaps — named, and not yet designed

Carried from PLAN.md's own open threads, plus what this pass surfaced.

- **Creature ecology** — carrying capacity, migration, predator/prey coupling,
  and how overhunting opens ground to the Grey. Sketched in §7 and §13, never
  specified. PLAN flags it needs a citation pass on predator-prey modelling
  before implementation.
- **Sigil repair rates** — the difficulty dial for the whole endgame, and it
  interacts with his Intelligence Tier: a smarter Grey King repairs smarter.
  Model these together, not separately.
- **Codex retrieval at MMO scale** — index sharding by Realm, retention and
  pruning, and what he may retrieve at each tier `[plan §14]`.
- **The Shard placement map** — §10.2 gives the rule and four example placements;
  the actual map does not exist.
- **Plunder rate tuning** — simultaneously the loot loop, the anti-deflation
  valve, and a leak from the Hoard. Needs modelling, not a guess.
- **Apprenticeship yield** — large enough that veterans hunt for newcomers, small
  enough that farming apprentices with alts is unprofitable.
- ~~**The Verge's own aggressive Wild** has no name~~ — closed: it is the
  hedge-boar (see §14).
- ~~**Trapping has no skill of its own.**~~ — closed: trapping is now the sixth
  skill, matching §17's Trapper. It earns nothing from noise (a snare is
  already near-silent) and instead raises the catch chance of a soul's own
  snares — the only skill that pays out while its owner is elsewhere.
- ~~**A set snare is nobody's property.**~~ — half-closed: a snare now
  remembers which soul set it, and that is whose trapping skill and XP a catch
  credits. It is still not *locked* — anything can walk up and butcher what it
  caught, the same as any other carcass — which is a deliberate match to how
  a felled deer already works (first to arrive butchers it, not the striker),
  not an oversight. Whether a stranger's theft of a *catch* should ever be
  distinguished from a stranger's theft of a *kill* is still open.
- ~~**Terrain beyond the eleven tiles**~~ — closed: marsh, road, ruin, clay,
  copper, meadow, thicket and House bring it to nineteen (§3.4), each with
  a reason to exist rather than decoration — marsh and road are the two
  ends of one rule (terrain speed, read the same by every mover), a ruin is
  the first place a crown can be found at all, clay/copper close the last
  two Verge materials §3.1 named with nothing to gather them from, and
  House is the one tile placed outright rather than rolled or grown. What
  is still open: snow, sand, a tidal flat and a cave mouth all belong to
  Realms that are not the Verge, so they stay `[named]` on purpose rather
  than being built somewhere they don't fit.
- ~~**Independent per-tile worldgen**~~ — closed: placement is now a
  sequence of deterministic passes keyed off a river placed first, rather
  than every tile rolling independently (§3.4) — the map reads as a valley
  instead of a grid of dice rolls.
- ~~**Clay and copper have no chain.**~~ — closed: clay fires into a pot
  (§5.2) and copper smelts and forges into a shorter, weaker parallel to
  the sword (§6) — both per §3.1's Verge material row.
- ~~**Wearables beyond the one cloak.**~~ — closed: boots and gloves (§5.2)
  are the cloak's two siblings, each from the same hide/cordage line,
  each answering one specific need rather than being a second cloak. Hats,
  and everything Kiln-tier or above (mail, plate), stay `[named]`.
- ~~**The crafting graph has no waste.**~~ — closed: butchering and a
  charcoal burn each pay a small guaranteed byproduct (glue, pitch, §4)
  alongside their main yield, and both byproducts now have somewhere to
  go — a Fletcher's arrows and a Bowyer's bow (§5.2, §6), the exact
  "bone → glue → fletching" chain §4 names as the model for this whole
  category, closed rather than merely gestured at.
- **Meadow has no Beekeeper.** The tile exists and forages like a bush;
  §7.2's Beekeeper profession, and anything resembling honey, is unbuilt.
- ~~**Killed-by-another-soul** is absent from the death causes~~ — closed,
  deliberately and out of sequence: §44's Stage B cut names PvP, marks and
  bounties as Stage C ("does cooperation beat predation with real people"),
  and this was raised as a gate worth confirming before crossing rather than
  crossing on momentum. The call to cross it now, ahead of Stage C, was made
  explicitly, on the grounds that §44 is a previous agent's cut list, not a
  standing rule from the person actually directing this project. What landed
  in three passes: SPACE striking another soul at all, with its own honest
  death cause (§11.3); a real cost for it — a kill marks the killer and
  drops their standing, and enough kills makes the Lieutenant stop hunting
  them altogether (§8.7); and one way back — feeding a genuinely hungry
  soul builds Commons standing, the only one of §3's kindness acts Stage B
  has anywhere to put (§8.7). What still has *not* landed, and remains
  exactly as open as before: any bounty payout, any plunder off a body, any
  of §28's other "five ways to answer a mark," the Grey King's coin actually
  funding any of it, or the murder-guild economy the whole system was
  supposed to prove or disprove. This closes "can killing cost you
  something, and can it be climbed back from" — not "does the outlawry
  economy work," which is still entirely unbuilt and unasked.
- ~~**The sword chain compresses eight professions into zero new skills.**~~
  — closed: **smithing** is the seventh skill, covering charcoal-burning,
  smelting and forging. It settles a point worth stating plainly, because it
  is easy to misread §15's "no profession can self-supply" as a hard rule:
  **the rule was never that a soul can't do a whole chain alone — every
  skill here already lets a generalist attempt anything from zero.** What a
  skill buys is never *access*, only *how well* — more per action, less
  noise, a better catch, and now more charcoal per burn, more bar per
  smelt, a harder-hitting blade. Self-supply was already mechanically
  possible before smithing existed; it was not yet *earned*, which made it
  the one chain in the prototype where mastery bought nothing. Interdependence
  in the full design comes from *time* — nobody masters all sixty-odd
  professions in one lifetime — and from Realm-gating, not from a lock on
  what an unskilled soul is permitted to try. Mining itself stays exempt:
  a vein is loud no matter how good you are at working one, same as stone.
- ~~**Is one Lieutenant still a credible threat over nine times the
  ground?**~~ — a second pass taken, still not closed outright. §44's cut
  list forbids the obvious answer (more officers), so both fixes stay
  inside the one Lieutenant already there.

  First pass: his patrol speed rose from 60% to 75% of hunting speed (still
  well under a soul's own, so outrunning a *patrol* stays easy — only
  staying unnoticed for longer got harder), and a fresh patrol waypoint now
  lands near recently loud ground roughly 60% of the time instead of
  anywhere on the map uniformly — a hunter reading sign of habitation
  rather than touring empty corners, using the same global noise position
  the crows already do (§1), not a new information leak.

  Second pass, on the same open question, from a different angle: he used
  to navigate by `stepToward` alone — a straight line, sliding along
  whatever it walked him into — which meant a lake or a decent-sized wood
  could stall a hunt forever, since a target due south of him gives
  sliding no horizontal component to slide *along* at all. He now plans an
  actual route while hunting (a plain breadth-first search over the tile
  grid, replanned roughly every five seconds rather than every tick, cheap
  enough that a worst-case measurement — forcing a full replan on every
  single tick, which no real chase can produce — landed within noise of
  the patrol baseline). That fix is what let `BASE_DETECTION_RADIUS` and
  `NOISE_DETECTION_SCALE` both grow (11 tiles now at max noise by night,
  up from 9) without also making him unbeatable, and it surfaced a real
  bug on the way: the "lose interest" check judged by the straight line to
  a target, which a detour legitimately grows even while he's still
  closing the real distance, so it now defers to the cached route when one
  exists. The counterweight to the wider reach is a real one: a fresh hunt
  opens at 80% pace for about two seconds, and every sighting is narrated
  now, not only the first one the game ever produces. What neither pass
  settles: whether this is *enough* compensation for 9x the area, still a
  playtest question rather than a code one.
- ~~**The arrival custom (§1A) has no one to perform it.**~~ — closed: the
  village, the Teacher and her tutorial conversation exist (§2.5), and an
  NPC can now be struck and killed, at 60 standing rather than 40 and no
  hunting XP — the "expelled from normal towns" half of the standing
  design landing somewhere real, not only as a colder greeting.
- **Dialogue trees are shallow and hand-authored on purpose**, and stay
  that way — §27's "intelligence is deliberately scarce" applies to a
  villager at least as much as to a Lieutenant. Nothing here should be
  read as a step toward a villager that improvises; that capability, if it
  ever exists, belongs to the Grey King's own voice work, at a much higher
  tier, not to four people in a hamlet.
- ~~**No apprentice or mastery-transfer mechanic.**~~ — half-closed,
  deliberately, and crossed early the same way PvP was (§8.7): a live
  soul can now teach another live soul (key **K**, §7.3/§7.4), raising
  the student's best-matched skill up to one level short of the
  teacher's own (`skills.teachingCeiling`). What's still open, and open
  on purpose rather than by oversight: §18's paid apprentice-*yield*
  economy (a Teacher earning an ongoing cut of a student's early work)
  needs a currency Stage B doesn't have; and §25's other half — a soul
  keeping a degraded fraction of its *own* skill through its *own*
  death — was not built at all, because `skills.ts` states outright
  that skill "dies with the character," and crossing that line would
  have contradicted an existing decision rather than extended an unbuilt
  one, unlike every other line this document records crossing early. The
  Teacher NPC herself still teaches only words, never XP, exactly as
  before (§2.5) — nothing about her tutorial changed.

---

*This document indexes `doc/world/PLAN.md` (§1–§52) and `doc/world/GREYKING.md`.
Where it disagrees with either, they win. Keep it a list — the reasoning lives in
PLAN.md, and the detail belongs in the §50 documents as they get written.*
