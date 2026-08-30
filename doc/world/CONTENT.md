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

**In code today:** one Lieutenant `[built]`, per the Stage B cut `[plan §44]`.

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

Grass · Tree · Stump (harvested, regrows) · Water · Bush · BareBush (picked,
regrows) · Campfire (player-built, burns down) · Ash (a fire that went out;
grass takes it back) · **Rock** (chip stone off it forever; it never depletes) ·
**Snare** (set, waiting, and spent once it catches) · **Ore** (same rule as
Rock — never depletes — but rarer, and the loudest tile in the Verge to work).

### 3.5 Terrain the world implies but code lacks

~~Rock and quarry face, ore seam~~ — closed: an ore vein is built (§3.4).
Marsh, road `[plan §8 — "nobody bothered to destroy them"]`, ruin, snow, sand,
tidal flat, cave mouth remain `[named]` at best; each is implied by a Realm in
§3.1 rather than specced anywhere.

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
bargain.**

**Food by Realm** `[plan §12]` — river-bread, small beer (safer than the water,
and everyone knows it), hedge-fruit and hard cheese in the Verge; peat-baked
fen-bread, bitter fenroot and eel in the Moorfen; ash-salt, hard biscuit and
carried water in the Kiln; in Rimeholt, anything fat — rendered tallow eaten
plain, without embarrassment, because the cold takes what it wants.

**In code today:** wood, **stone**, **cordage**, raw meat, cooked meat, hide,
**ore, charcoal, bar, fish** `[built]` — plus water and berries consumed
straight off the tile rather than carried.

Stone is worth calling out because it inverts how every other material here
behaves. A tree runs out and regrows on a timer; a rock outcrop never runs out
at all, so stone is never *scarce*. What it costs is being heard — chipping
stone is the loudest single action in the Verge. That makes a tool a trade of
attention for yield rather than of time for yield, which is the noise thesis
`[plan §1]` applied to the workshop instead of the hunt.

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
  spear's base bite and sharper still in a smith's own hand]`, **fishing line**
  `[built, 25 casts]`; pick, needle, hammer, saw, loom, quern all `[named]`. The
  built ones each buy a different thing: the knife buys *yield* (more off a
  carcass, and the only way to cut cord), the axe buys yield **and quiet**, the
  snare buys *absence* — the only work that pays out while you are somewhere
  else — the sword buys raw damage, the end of a chain rather than a shortcut
  through one (§6), with the smith's own skill adding more on top of whoever
  merely swings it, and the line buys the one food chain that needs no fire
  and no butchering at all — cordage and a shoreline, nothing else.
- **Wearables** — hide cloak `[built, wears through on the cold it stops]`,
  boots, gloves, hats, mail and plate at the Kiln tier and above `[named]`.
- **Placed and built** — campfire `[built, burns fuel and leaves ash]`, set snare
  `[built, springs once and is spent]`; kiln, drying rack, tannery, quern, cache,
  shelter, well, granary, wall `[named]`.
  Shelter is load-bearing: **logging off camped is safe, the open field is not**
  `[plan §25]`.
- **Consumables** — cooked meals `[built]`, preserved food, medicine, poultices,
  antitoxin for the Weald's air, small beer.
- **Relics** `[plan §2 via GREYKING.md]` — **warded seedstock, singing blades,
  deep-cut runes**, and every other made thing that still held a thread of the
  old magic when he closed his fist. These are what he *actually* took; ordinary
  treasure came along because it was in the same rooms. The only magic that ever
  reaches a player's hands as an object.
- **Old crowns** `[plan §17A]` — minted under kings who no longer have kingdoms.
  Behave less like money than like relics that happen to be spendable.

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

**In code today** `[built]`: four chains that cross.

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

All four are the first appearance of §15's generative rule in the prototype:
a snare needs cordage *and* wood, cordage needs hide *and* a knife already in
hand, hide only comes off an animal someone hunted, a sword needs a vein,
a fire kept long enough to burn wood down twice over, *and* the cord the
tools chain already produces, and a line needs that same cord plus wood
before it is worth anything at all. **No single action or material
substitutes for the chain** — that is the property that eventually makes
trade arithmetic rather than courtesy, once two souls' hours stop yielding
the same output (§7.4). It is not the same claim as "no soul can do the
whole chain alone," which was never the rule — see §7.4's note on what a
skill actually gates. Plus wood → spear, hide → cloak, wood → fire.

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
  Leatherworker, Fletcher, Jeweller, Scribe, Cartographer, Cook, Brewer,
  Apothecary, Engineer, Shipwright, Potter, Bowyer, Cooper, Ropewright.
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
  gone. Also the first profession a new player ever meets `[plan §1A]`.
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

Eight actions, chosen every half minute from a pressure-gated menu, each with a
stated reason that becomes the line the player sees:

`nothing` (always on the menu, and the commonest choice) · `send_lieutenant` ·
`false_crows` · `cold_snap` · `blight` · `loose_a_boar` · `loose_the_wolves` ·
`mark`.

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
see this document's gap list, below — and it stops well short of that system:
no bounty payout, no plunder off a body, no Commons-standing counterweight to
climb back with, no Host rank actually offered to a notorious soul. It answers
one question narrowly — does killing cost you something — not the larger one
the full system is for.

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
down by a Lieutenant · **killed by another soul**.

The last one lands like the others do: press SPACE near another living, not-
graced soul and the same strike that would have hit a deer hits them instead
— whichever is nearer wins, one shared verb, no separate key. It now carries
a real, if narrow, consequence — see §8.7 — but still **not** a mark's full
weight: no bounty payout, no plunder off the body, none of §28's five ways
to answer a mark. §25/§28's whole outlawry and bounty system — the Grey King
paying for corpses, a killer visibly taking his coin — is still mostly
unbuilt; what exists now answers "does killing cost you anything," not
"does the outlawry economy work."

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
first one. No currency, no escrow — those are for strangers.

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
- **Terrain beyond the eleven tiles** (§3.5) is implied by every Realm and
  specced nowhere.
- ~~**Killed-by-another-soul** is absent from the death causes~~ — closed,
  deliberately and out of sequence: §44's Stage B cut names PvP, marks and
  bounties as Stage C ("does cooperation beat predation with real people"),
  and this was raised as a gate worth confirming before crossing rather than
  crossing on momentum. The call to cross it now, ahead of Stage C, was made
  explicitly, on the grounds that §44 is a previous agent's cut list, not a
  standing rule from the person actually directing this project. What landed
  in two passes: first, SPACE striking another soul at all, with its own
  honest death cause (§11.3); then a real cost for it — a kill marks the
  killer and drops their standing, and enough kills makes the Lieutenant
  stop hunting them altogether (§8.7). What still has *not* landed, and
  remains exactly as open as before: any bounty payout, any plunder off a
  body, any of §28's other "five ways to answer a mark," the Grey King's
  coin actually funding any of it, Commons standing as the counterweight
  that could climb a soul back out, or the murder-guild economy the whole
  system was supposed to prove or disprove. This closes "can killing cost
  you something," not "does the outlawry economy work" — that second,
  much larger question is still entirely unbuilt and unasked.
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
  ground?**~~ — first pass taken, not closed outright. §44's cut list forbids
  the obvious answer (more officers), so the fix stays inside the one
  Lieutenant already there: his patrol speed rose from 60% to 75% of hunting
  speed (still well under a soul's own, so outrunning a *patrol* stays easy —
  only staying unnoticed for longer got harder), and a fresh patrol waypoint
  now lands near recently loud ground roughly 60% of the time instead of
  anywhere on the map uniformly — a hunter reading sign of habitation rather
  than touring empty corners, using the same global noise position the crows
  already do (§1), not a new information leak. What this does not settle:
  whether that is *enough* compensation for 9x the area, which is a playtest
  question rather than a code one.

---

*This document indexes `doc/world/PLAN.md` (§1–§52) and `doc/world/GREYKING.md`.
Where it disagrees with either, they win. Keep it a list — the reasoning lives in
PLAN.md, and the detail belongs in the §50 documents as they get written.*
