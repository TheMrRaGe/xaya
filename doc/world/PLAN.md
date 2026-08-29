# ARCHON — MMO Expansion Plan

*The working design plan for Xaya's MMO expansion — reimagining the chain as an open-world survival MMORPG run by an AI villain (the Grey King). This supersedes `doc/archon/DESIGN.md` (the original, now-superseded raid-game architecture) as the canonical design reference. `doc/world/GREYKING.md` (the villain's character bible) was extracted from this plan's §2/§2A. Section numbers (§N) cited elsewhere in this repo — code comments, other docs — refer to the sections below.*

---

## Context

`doc/archon/DESIGN.md` (committed on `claude/blockchain-game-ai-overlord-hl2j1t`) describes a Cosmos SDK app-chain where an LLM Overlord defends an on-chain treasury and players try to beat it. It is architecturally sound but it is **a raid game with an economy bolted on**, running on seasonal resets.

The scope has changed to an open-world survival MMORPG: deep professions, biomes, roaming creatures, survival needs (hunger, thirst, heat, cold), and a world corrupted by evil — where reaching the Grey King means ascending through increasingly hostile Realms, and where **you never have to fight at all**. You can build, craft, and live.

That is not an increment. It breaks the architecture in one specific place — an MMO tick cannot run at blockchain speed — and it requires a body of world and systems design that does not exist yet. This plan covers both.

**Who is building this.** One person with a full-time job, and Claude. No studio, no funding, no specialists. That constraint is not a footnote — it determines what gets built and in what order, and it is why **§44 is the operative plan** and §45 is kept only as the funded-team reference. §49 explains the re-scope; the short version is that the chain is the last thing to build and possibly never, because almost nothing that makes this world good actually requires one.

**Design thesis.** Permadeath is not the difficulty setting, it is the economic engine: permanent death permanently destroys goods, which is the only thing that keeps crafting professions alive in an MMO economy. And corruption gives non-combat players a war of their own. Those two facts are what make "you can be anything" true rather than decorative.

### Decisions locked this round

| | Decision |
|---|---|
| Time | **One world that never resets.** Nothing is ever wiped; the years are counted and remembered. |
| Offline | **Safe when camped, exposed in the field.** |
| PvP | **The Grey King pays for the dead.** He wants survivors fighting each other; his coin funds the bandits who do it. |
| Sanctuary | **Nowhere is safe by rule.** Safety is walls, neighbours and the road's good word — things people build and defend. |
| Client | Web, systems-first, 2D/isometric. |
| Progression | Collective and world-wide. Ground is reclaimed for everyone at once, or not at all. |
| Antagonists | **The Grey King's captains** — named, ranked, persistent. They hunt, ambush, rob and murder those who have been *marked*, and they grow richer and stronger with every kill. He also acts in person. |
| IP posture | **Deliberately not a Nemesis-system clone.** No personal-rivalry memory subsystem. See §34. |
| The villain | **The Grey King.** A soldier whose brother sacrificed the woman they both loved for a working that pulled all the world's magic into one man. He killed his brother, inherited it, and cannot put it down. |
| Voting | One vote per account, one active account per device, votes scoped by device and network. See §41. |
| Compute | **One pooled operator market** runs simulation, inference and storage. **His cunning grows with the network** — the bigger the world gets, the sharper he becomes. See §37. |
| Limits | **The Fetters** — absolute prohibitions enforced in code, unamendable, that no amount of intelligence, no adapter and no governance vote can lift. See §38. |
| End of life | **Pre-committed dead-man's switch.** After a year-plus without meaningful finality, the Hoard distributes pro rata by lifetime proof-of-play. Objective, never a vote, unprofitable to trip. See §48. |
| Trust economy | **Scams are permitted; verification is mandatory.** Every instrument must be checkable before it is trusted. See §24. |

Two consequences worth stating up front:

- Dropping the seasonal reset removes the Hoard's carry-over outflow. Value now leaves it by **one live path only** — a validated victory claim — plus a dormant dead-man's switch that requires the world to be provably dead (§48). That is materially stronger than the original design, and the fetter that governance can never transfer from the Hoard is untouched.
- "Season boundary" was the safety mechanism for Grey King rule-proposals and adapter ratification. It rebases onto **Era boundaries**, which are declared by governance rather than arriving on a clock — so Eras need a minimum interval and a mandatory review window, or the safety property quietly weakens.

---

# PART I — THE WORLD

## 1. The war, and how it was lost

For three generations the world fought the **Grey King**, and in the end the world lost.

It did not lose a battle. It lost everything. When the last host broke at the pass he did not sack the kingdoms — he **stripped** them, taking every made thing that still held a thread of the old magic: warded seedstock, singing blades, deep-cut runes, relics out of every hold in the world. Ordinary treasure came along because it was in the same rooms. He left the roads and the empty houses standing, because he had no use for them.

And the land went **grey**, because the magic had gone out of it (§2), and things that had grown in a magical place for a thousand years had forgotten how to grow any other way.

That was ninety-one years ago. **Nobody alive remembers it.** Everyone was born into the ruin and thinks it is ordinary. No one living has seen a working mill, or a granary with a full winter in it, or a road that was safe after dark. They know those things existed the way we know about dragons.

### Or so we thought

Here is what the Grey King does not know, and the reason there is a game at all:

> **He never counted the farmers.**

He took the crowns and the war-hoards and the great forges. He counted armies, cities and treasures. Herders in a fen and a family in a river valley were nothing worth carrying off, so he did not carry them off — and he did not write them down, and he has not looked since.

**The survivors are not hidden. They are beneath his notice.** That is not the same as being safe, and it is not going to last. But it is a beginning, and it is the only advantage anyone has ever had against him.

### The thing that makes this a game

A hamlet of eight people is invisible.

A village with a mill draws a wandering scout. A town with walls draws a captain. A prosperous town, with a smith whose work is spoken of on the road, draws something worse — and eventually it draws **him**.

> **Everything you build makes you easier to see.**

That is the whole tension, and every system in this document serves it. You cannot hide forever, because hiding means staying small and hungry in a world that is going grey. You cannot grow freely, because growing is how you get found. Every wall raised and every field cleared is a wager about how ready you are.

### What nobody says out loud

There is no song. There is no rhyme a child sings, no line anyone can quote you. **Nobody in the world can tell you how to beat the Grey King, because nobody knows.**

What exists instead is wrong in a hundred small, uncoordinated ways:

- A carving in a collapsed keep shows two figures and a third standing between them, and the third figure's face has been struck out with a chisel, deliberately, a long time ago.
- A Keeper (§8) who will answer almost any question goes silent at one specific word and will not be pressed.
- A working taught hand to hand for four generations does something its teachers cannot explain, and does it exactly the same way every time.
- The Given (§20A) tell a story about why he took the throne that does not match the story told in the valley, and neither one mentions a name.
- Somewhere in the north there is a room he has not opened in ninety-one years, and at least one of his captains knows which one and has never said why.

**None of these are the answer.** Each is a piece of it, held by someone who does not know what they are holding, and the whole thing only becomes legible if enough of them are found and set down next to each other by someone patient enough to try. That is the actual job of a Keeper, a scholar, or any player who decides to be one — not "go find the lore," but *assemble a thing nobody currently believes is assemblable.*

**The one hard rule: no NPC ever states the truth outright.** Not a Keeper, not the Given, not a book, not the Grey King himself. He may lie about it, contest it, or go quiet — never confirm it plainly, because a monster who explains his own weakness on request is not a mystery, he is a quest-giver.

### The valley

The world begins as **one river valley**, its ruins, and the roads leading out of it. That is all.

It grows as players push the grey back and open the roads north — new ground, new ruins, new weather, and every expansion is an event the whole world feels. *(It is also the only scale one person can actually build; see §49.)*

### What the players are doing

**Rebuilding, one town at a time, and pushing the grey back.**

The world is not to be conquered. It is to be *reclaimed*, road by road and field by field, and it has to be done by people who mostly cannot fight.

**The heroes are the shield, not the point.** They hold the roads so the carts get through. They clear the ruins so the masons can take the stone. They stand at the treeline so the field can be planted. A hero who takes everything for themselves has misunderstood the job — the town is the point, and the town is what makes more heroes possible.

## 1A. Arrival — how a player enters the world

**You wash up on the shore with no memory.** Someone finds you and takes you home.

It is an old opening and it is old because it works, but here it does three specific jobs that nothing else does as cleanly:

- **You are allowed to know nothing.** Every question a new player has is a question your character would genuinely ask, out loud, to someone who will answer it.
- **Your hands have forgotten too.** "Nothing is provided, everything is made" needs a reason you cannot make anything, and this is it. Somebody has to teach you to lay a fire. That first lesson is the tutorial, and it makes the **Teacher** (§17) the very first profession a player meets rather than an economic footnote.
- **Your first relationship precedes your first tool.** You owe someone before you own anything. In a game whose whole argument is that cooperation beats predation, that is the right first fact.

### The custom of the shore

Here is the part that makes it more than a trope.

**People wash up on that shore fairly often.** The northern current carries things down from where his keep is, and it does not only carry driftwood. The valley has had strangers come out of the water before, and some of them were fine, and some of them were not themselves any more.

So the village has a custom for it. **They take you in, they feed you, and they watch you for a season.**

You get a bed and a share of a thin stew from people who cannot spare it, and you get watched — politely, constantly, by everyone. Nobody is cruel about it. Nobody pretends it is not happening either.

That is the world's central argument delivered in the first ten minutes, without a word of exposition: **kindness here is a decision made in spite of real risk, by people who have been burned before.** It also means the first thing a player has to earn is not gear or coin. It is being trusted, and there is no menu for that.

### Who you were

**Leave it genuinely open, and let the answer mostly be "nobody."**

The temptation is to make the player secretly important — a lost heir, one of his, something. Resist it. It breaks the cooperation thesis on contact: a world where one person is special is a world where the rest are extras, and the entire design says the miller matters as much as the swordsman.

The honest version is more interesting anyway. In a valley where everyone is known by their village and their line, **a person with no line is simply strange** — and strange is dangerous when the thing that ended the world came from the direction you drifted in from. You are not the chosen one. You are the person nobody can vouch for, and every ounce of standing you get, you will have earned in front of witnesses.

## 1B. The ending — you kill the king, and then you choose

**He can be killed.** He is not a force or a curse; he is a man who made himself into something else, and something else can still be put down. Getting to him is the whole game (§5). Killing him is the last five minutes of it.

**And then the throne is empty, and you are standing next to it.**

### The cycle

Here is what almost nobody in the world knows, and what the whole design has been pointing at:

> **Emeric Vale did this.** He killed the one before him.

He killed the last one for the best reason anyone ever has, and took what came with it because there was no way to refuse — and because some part of him was certain, genuinely and decently certain, that he would be the one who finally held it properly.

Ninety-one years later there are no kingdoms.

**He is not the first Grey King. He is the most recent one.** Nothing in the world says so outright — it has to be pieced together from the carving with the struck-out face, the Keeper who goes silent, and whatever else a patient player finds and refuses to stop connecting.

### The three doors

When he falls, the player who struck the last blow — and, more importantly, the world that got them there — faces a choice that is genuinely, mechanically real:

**Take the throne.** You hold all the magic in the world, and the power to decide who may use it. You can give it away by the wagonload and be a good king for years. But the working does not let go of a living holder, so the land stays grey for as long as you sit there — and the thing that makes a Grey King is not cruelty, **it is being certain you are the one who should decide.** Emeric was certain too. Take it and the world gets a new tyrant eventually. Probably a kind one, at first.

**Pass it on.** Let someone else kill you for it — the only way it moves. It is generous, it is humble, and it is **not** a solution — you have handed a loaded thing to a friend and made their story the same story. Watch what happens to them. This is the option that feels good and changes nothing, and the design should let players find that out the hard way.

**Break it.** Open your hands and let the magic go back into the land — every thread of it, to everyone, ordinary people included — empty the keep, refuse the seat, and leave it standing empty. This is the only ending that ends anything, and it is the hardest by an enormous margin — because everything he was holding away from people is suddenly back in their hands, all of it, including the hands you would not have chosen. **It only works if the world can hold itself together without a king**, which means many towns, many hands, no single point of failure. Exactly the thing the game has spent its entire runtime teaching, and refusing to hand anyone for free.

### Why this is the right ending for this game

It puts the design's own thesis on trial, with the player as defendant. Every system in this document argues that **hoarding fails and cooperation holds** — and the ending is simply that argument handed to whoever won, with real stakes and no narrator to tell them the answer.

It also fixes the villain permanently. He stops being an evil wizard and becomes **a warning about what winning does to people who are sure they are right** — which is a far better antagonist, and it means every hour a player spends hating him is an hour of setup for the moment they are offered his chair.

### What it means in a shared world

Only one person lands the last blow, but the ascent is collective (§5) and so is the aftermath.

- **The whole world has a stake in who gets there**, because the winner's choice lands on everyone. Expect campaigning, factions, and people trying very hard to make sure it is *not* a particular guild's warlord. That is not a bug — it is the most interesting politics this game can generate, and it costs nothing to build.
- **If someone takes the throne**, their reign becomes the next era's antagonist — and this is where the design's original ambition finally pays off: the next Grey King is **seeded from a real player's history**, their grudges, their allies, who wronged them and how. A villain grown out of the world's own memory rather than authored.
- **If the throne is broken**, the world enters something genuinely new and much harder to run: no antagonist, only the Grey and each other. Whether that is a triumphant ending or the beginning of a slower one is exactly the question worth leaving open.

## 2. The Grey King

*(Names are placeholders.)*

There were two brothers.

**Aurel Vale** was the elder, and the king, and the finest sorcerer of his age. **Emeric Vale** was the younger, and a soldier, and had almost no magic in him at all — which mattered to him more than he ever said out loud.

And there was **Maren**, who was better than either of them. She was the strongest working-mage of her generation, she was betrothed to Emeric, and she was the only person Aurel had ever been unable to impress.

### The rite

The kingdom was losing a war it had already been losing for a decade. Aurel came to Maren with a working he said would end it — an old, enormous thing that would draw the magic of the whole land into one vessel and let it be spent all at once, in one blow, to break the enemy.

It required a life. Freely given, and given knowing.

**She gave it.** She understood exactly what she was agreeing to, she was not tricked into the dying part, and she went into that circle to save a kingdom.

Aurel lied about the vessel.

The working did draw the magic of the land into one place. It just never let it out again — and the place it pooled was **him**. He did not end the war. He simply became the only man in the world who could still work magic, and then the war ended, because what else could it do.

### What Emeric did

He found out four years later.

He killed his brother himself, with a soldier's weapon, in a room with no witnesses. Everyone agrees on that much.

**And then the working came to him**, the way it comes to whoever ends the one who holds it. He had not known that. He has said, in the ninety-one years since, that he would have done it anyway.

### The curse

This is the shape of the thing he inherited, and it explains the world:

- **All magic in the land runs to one man.** Not by law — by the working. The land is empty of it because it is all in him.
- **The Grey is what drained land looks like.** Nothing is poisoning the world. It has had something taken out of it, and things that were meant to grow in a place with magic in it are doing badly in a place without.
- **He cannot put it down.** The working transfers one way only: to whoever kills the holder. He could give away every coin in his keep tomorrow and the land would still be grey, because the thing the world needs back is not treasure — **it is him.**
- **He can lend it.** What he holds he can grant, to servants, to his captains, to anyone who kneels. This is why his armies work magic freely while a village hedge-witch is hunted.

### So what did he actually take?

Not grain. Not gold, particularly.

He took **every made thing that still held a thread of the old magic** — every warded seedstock, every relic, every singing blade and every deep-cut rune, out of every hold in the world and into his keep. Ordinary treasure came along because it was in the same rooms.

The famine was not theft. **The famine was the grey**, arriving in fields that had been quietly magical for a thousand years and had forgotten how to be anything else.

### Why he did it, and why he is still doing it

Because he watched his brother turn the best person either of them knew into a battery, and he decided the world could not be trusted with power like that. Ever. By anyone.

He is not hoarding it. **He is holding it away from people**, which he considers a duty, and he has been doing it for ninety-one years, and the cost is a dying world he regards as the lesser evil.

He is wrong. He is not stupid, and he is not even entirely wrong, which is the difficulty.

### How he speaks

Quietly, and with terrible patience. He does not gloat and he never raises his voice. He explains.

He will talk about Maren if you give him the opening — not as confession but as *evidence*, the case for the prosecution against the entire human race:

> *"She knew what she was agreeing to. She was not a fool and she was not deceived about the price. She was deceived about what it would buy, and by someone who loved her.* ***That*** *is what your kind does with power. I have simply stopped giving you the opportunity."*

## 2A. Rules for the language of this world

**A standing constraint, because I got this badly wrong once already.**

The mechanics underneath this design are sound, but the first draft dressed them all in the language of banking and law. **No player wants to hear that from a fantasy villain.** Nobody says "my writ has been assessed" out loud and enjoys it.

The rule from here on: **describe every system the way a villager would say it.** If a phrase would sound at home in a bank or a courthouse, it is wrong.

| Dead words | Living words |
|---|---|
| w-r-i-t, assessment, summons | **The Mark.** *"They marked him."* |
| the register, officers, bailiffs, assessors | **The Grey King's captains.** Reavers, Lieutenants, Captains, Wardens |
| commission, estate, holdings | **Plunder.** What a captain carries was taken off the dead |
| corruption, blight index | **The Grey.** Land goes grey, beasts go grey, *"there's grey in him"* |
| the tally, magic-debt | **Working.** Reaching into what he holds — he feels the pull, and it leaves you bright in a way a drained world notices |
| standing, reputation score, testimony | **How the road speaks of you.** Sworn word |
| foreclosure, receivership, the estate | Gone entirely. There was a war, he won it, he took everything |
| soul record, lineage entry | **Your line.** *"He was the last of his line."* |

Two survive untouched because they were always fantasy words: **the Hoard**, and a smith's **maker's mark**.

**One exception, deliberately kept.** The *idea* of a promise that outlived the person who made it is genuinely good and belongs to the Unbowed (§9). That is folklore, not finance, and it holds as long as it is written in the language of **oaths**, never obligations.

## 3. What it actually wants — and the only thing that beats it

**It does not want you dead.** It wants you *stuck*: alive, working, divided, and never strong enough to reach him.

**He knows exactly how the throne changes hands, because he is how it last changed hands** (§2). The working passes to whoever kills the one who holds it. So the single most dangerous thing in his world is not an army — it is a group of people organised and trusted enough to *reach* him and strike once. Keep the world weak, divided and desperate, and that group never forms. Keep it fed, united and confident, and it eventually will.

**Stasis is not greed. It is the only defence he has against becoming a lesson twice.**

Its win condition is **stasis**, which makes it a far better antagonist than one that simply wants a kill. And it means its strategy is social, not military:

- **Reward defection.** Bounties for corpses, payment for informants, plunder for players who take rank in the Grey King's captains. Everyone who takes its coin is doing its work.
- **Selective mercy.** Spare one guild, let another burn — then make certain both find out. Grudges do more damage than officers.
- **Lie.** He knows things players cannot check, and owes them no honesty. He keeps his word only where he swore it — and he swore very little.
- **Offer individual escapes.** Clear one person's mark in exchange for their guild's plans. Make loyalty individually expensive.
- **Tax the collective, subsidise the predator.** Make cooperating cost more than defecting.
- **Suppress ascent specifically.** Corruption weighted to the frontier, officers massed at Sigil approaches, economic pressure on exactly the goods needed to climb.

**And be generous to the compliant.** Life in the Verge can be genuinely pleasant. Farm, trade, raise a family of characters, never climb — and it will leave you almost alone. The world gets crueller the harder you try to leave it.

That is a far more sophisticated oppression than blanket hostility, and it creates real in-world politics: settled players who are doing *fine*, thanks, and would rather the guild stopped stirring things up.

### The counter-thesis

**Only kindness, teamwork and communication can prevail.** That has to be a *strategy the mechanics reward*, not a moral the game states. Four requirements:

1. **Cooperation must have the higher ceiling; predation the faster floor.** Betrayal must genuinely pay — immediately, visibly — or the choice is fake. Cooperation must *compound*, so that over months the cooperative outproduce, outlast and outfight the predatory. The moral holds because the maths holds.
2. **The ascent must be irreducibly collective.** Not "a big enough guild can do it" — *many people who do not know each other* must coordinate. If one mega-guild can solo a Sigil, the Grey King's thesis is correct and the game agrees with the villain. Sigils should require simultaneous, distributed effort across Realms and professions.
3. **Communication must be mechanically powerful, because information asymmetry is its main weapon.** It knows more than you and it lies. So build a **player truth layer**: souls can sign on-chain testimony, and a claim independently corroborated by many unrelated souls carries weight the Grey King's word cannot forge. Reputation-weighted, sybil-resistant attestation as counter-propaganda — a genuinely chain-native answer to a lying villain, and it makes scribes, scouts and info-brokers load-bearing. The Shards (§13A) are the model: fragments held by different people, meaningless alone, assemblable only by people willing to trust each other with what they know.
4. **Kindness needs teeth.** Stabilising a dying stranger, sheltering someone in a storm, feeding the starving, teaching for free, paying another's mark, purifying land you do not own — these build **Commons standing**, which unlocks collective capability nothing else can buy. It must not be farmable by alt-pairs, which ties directly to the sybil work in §41.

### The balance risk, stated plainly

This is the sharpest tension in the entire design. Permadeath plus full loss plus a funded predation economy creates an incentive gradient toward distrust — **which is exactly what the villain is playing for.** If we tune it wrong, the Grey King wins by design rather than by play, and the game becomes the bleak thing it is supposed to be arguing against.

So the cooperation-versus-predation payoff curve is not a balance knob to tune after launch. It is the thesis of the product, and it must be modelled alongside the liquidity simulation (§22) before anything ships.

## 4. The Realms

Eight tiers, seven Sigil gates. Ascent is collective: breaking a Sigil opens that Realm for **everyone**. Each Realm introduces a new survival threat and new materials, so the crafting economy is gated by the ascent — the blacksmith wants the Kiln opened because the Kiln has the coal.

| # | Realm | Biome | Survival threat | Key materials | Unlocks |
|---|---|---|---|---|---|
| 0 | **The Verge** | River valley, hedgerow, woodland | Mild night cold | Soil, timber, clay, copper | Farming, masonry, basic forging |
| 1 | **The Moorfen** | Peat bog, fen, drowned wood | Wet-cold, fever, foul water | Peat, bog iron, reeds, fenroot | Tanning, apothecary, charcoal |
| 2 | **The Kiln** | Volcanic ash waste, obsidian flats | Extreme heat, thirst, ashlung | Obsidian, sulphur, firesalt, true coal | Steel, glass, blasting |
| 3 | **The Sunken Reach** | Drowned coast, tidal ruins | Water everywhere, none potable | Salvage, pearl, salt, kelp | Shipwright, preserving |
| 4 | **Rimeholt** | Glacier, alpine, permafrost | Killing cold, whiteout | Rare metals, sky-iron, ice caches | High armour, cold-forging |
| 5 | **The Weald Undying** | Corrupted overgrowth, fungal canopy | Airborne toxin, food that lies | Reagents, living wood, spores | High alchemy |
| 6 | **The Hollow Vault** | Lightless underground machinery | No food, water or light — and it is *maintained* | Mechanisms, the Grey King's components | Endgame engineering |
| 7 | **The Spire** | The seat | — | — | The Grey King |

The Hollow Vault is the difficulty spike by design: the only Realm that fights back *intelligently*, because it is the only one the Grey King still maintains.

**Two separate things wait at the Spire, and they are not the same prize.** The Hoard is his mundane treasury — coin, plunder, everything taken by his captains — and it is redistributed to the world on victory the way the rest of this design already specifies. **The working is the actual endgame**, and it is not treasure at all: it is what §1B is about, and it is the reason a reader should not leave this table thinking the Spire is a loot room.

**Ship two Realms, not eight.** Eight is a content commitment of a different order than the engineering below, and the collective-progression mechanic is fully testable with two.

## 4A. The Realms, in depth

One line each in the table above earns its keep as a reference. It does not earn a world. Each Realm needs a reason people actually live there, not just a reason they can.

**The Verge.** River fords and hedge-bounded fields, the only Realm most souls ever call home. Ironically the most-patrolled ground in the world — not because he cares about it, but because it is cheap ground for a Reaver to work, and marks get executed here first. The apprentice economy is thickest in the Verge (§18); it is where a Teacher earns their whole living.

**The Moorfen.** Causeways over drowned villages, fever that comes with the wet-cold. The best hiding country there is — Smugglers and the Grey economy (§30A) move through fen paths that Reavers on horseback cannot follow. The Lamplighter (§9) still marks the one road through it that has not gone bad.

**The Kiln.** Obsidian flats around a caldera that never fully cools. This is where the Given cluster thickest of any Realm (§20A) — not by chance: he needs the steel as much as any player does, and a settlement full of people who took his offer is a settlement that will work a forge without complaint. The entire weapon and armour economy pivots on what this Realm allows through.

**The Sunken Reach.** Tidal ruins and wrecks, water on every side and none of it drinkable. The first Realm where trade goes by boat rather than road, which makes it Shipwright's Realm and pearl the first true luxury good — pretty, useless, and exactly the kind of thing a settlement trades for prestige rather than survival.

**Rimeholt.** Glacier and permafrost, and beneath both, ice caches — Old-Kingdoms goods frozen intact since before the Fall (§8), a Keeper's dream and a looter's jackpot in the same hole in the ice. Killing cold is the threat; sky-iron is why anyone comes anyway.

**The Weald Undying.** Fungal canopy grown back over whatever this Realm used to be. The ingredients here lie to you (§15A) — the whole apothecary trade this high is built on people who survived being wrong once and changed how they work. The most dangerous gathering job in the game lives here, and it pays like it.

**The Hollow Vault.** Lightless machinery that is still, after ninety-one years, maintained — the only Realm that fights back *intelligently*, because it is the only one he has not abandoned. Mechanisms taken from it are the sole endgame-engineering material in the game (§15), and this is where his Wardens (§27) hold ground in person rather than through Captains, because it is the one place he has actually bothered to defend.

## 5. The Seven Sigils

Each Sigil must be consensus-checkable, hard, and **irreducibly collective** (§3) — solvable only by many people who do not all know each other. If a single mega-guild can solo one, the game has agreed with the villain. Each therefore stresses a different axis, demands a different profession cluster, and has a structural reason it cannot be done by one coordinated group.

And **the Grey King repairs them**, spending action budget re-sealing what is broken and left undefended. It is a race, not a checklist.

| Sigil | Axis | The requirement | Why it can't be solo'd |
|---|---|---|---|
| **Harvest** | Plenty | A true surplus, delivered at once from many separate settlements, sustained across a season | Cannot be stockpiled beforehand or grown by one valley alone |
| **Bastion** | Endurance | Hold a place for K consecutive blocks against its full aggression budget | **Requires unbroken coverage across time zones** — no single group is awake long enough |
| **Witness** | Truth | N independently corroborated testimonies about a concealed fact, from souls with no shared history | `x/testament`; corroboration from a closed group carries no weight |
| **Mercy** | Kindness | A threshold of Commons standing built from acts toward strangers | **The one Sigil you cannot fight through** — and the one he cannot comprehend |
| **Craft** | Production | An artifact whose material chain spans every open Realm, carrying many distinct maker's marks | Provenance proves each component came from a different hand |
| **Riddle** | Wit | A puzzle he sets himself, whose answer is split between people who must trust each other to speak it | No one person is ever given enough of it |
| **Name** | Lore | Speaking his true name, assembled from Shards scattered across Realms and holders (§13A) | The fragments are held by different people, in different places, and none of them says so outright |

Three are worth calling out. **Mercy** makes the counter-thesis literal — a lock that only opens to accumulated kindness toward strangers, which the Grey King has no model for and will say so, at length, with increasing agitation. **Bastion**'s time-zone requirement is the cleanest anti-mega-guild mechanic available: it does not ask for more players, it asks for *differently distributed* players. And **Name never appears on any tracker as "discover his name."** It should look, until solved, like a locked door with no visible mechanism — a Sigil that unlocks silently the first time someone speaks the true name aloud, correctly, having earned it. Nothing in the interface may say what the Sigil is looking for; that would be the game itself breaking the one rule §1 sets.

## 6. Corruption — the war non-combatants fight

The Grey emanates downward from higher Realms as a per-territory value. Its effects are survival-facing, not combat-facing: crops fail, water spoils, gear decays faster, creatures mutate, and **survival needs tick faster**.

**Holding it back means working magic, which means what §20 says it means.** Warding a field against the Grey is drawing on the Grey — there is no other kind of ward that touches it, because there is no other source of the thing that was taken out of the land. Farming, patrols and stonework matter, but they only slow the rot. Only a working actually reverses it, and every working is felt, and every working can be traced.

**This is why population is the real defence, not just labour.** One hedge-witch holding a whole valley's fields is a single bright point his captains will eventually walk straight to. A dozen people each doing a little — one field warded, one well cleared, one small kindness paid forward into standing (§3) — is noise he cannot easily separate from the ordinary business of a living town. **Spreading the burden thin is not efficiency. It is the only way to be protected without being found.**

- **Realms, once opened, never re-close.** Progress is a ratchet.
- **Territory inside them can be lost.** Holding ground is a tug-of-war, and every hand holding it is a small, deliberate risk.

This is the most important system in the expansion. It means a farmer in the Moorfen materially contributes to the push on the Hollow Vault without ever drawing a weapon — and does it the same way everyone who has ever protected anything in this world has: by quietly, riskily, giving away a little of the one thing that is never supposed to be shared.

## 7. Creatures

- **The Unbowed** (allied). Not beasts. **Promises the Old Kingdoms never got to keep** (§9) — a word given and not yet made good, grown solid from waiting after the people who gave it died. Fed, sheltered, protected, they open paths and gift materials. They can be killed for immediate profit — and they do not come back. The Grey King pays well for them, because a promise still standing is a piece of the old world that never bent to him.
- **The Wild** (neutral). Real ecology: herds, predators, migration, carrying capacity. Overhunt a region and it collapses, and the Grey moves into the gap.
- **The Grey-touched** (hostile). What the drained land does to a living thing left in it too long — beast or man. Not conjured, not commanded; just what growing up somewhere the magic was taken out of does to you, over enough years. His captains are not above pointing one at a problem, but they did not make it. Not evil, exactly — *starved*.

## 7A. A working bestiary — docile, dangerous, and his

Three factions is the taxonomy. A world needs animals a hunter actually recognises.

**The Wild, docile and huntable.** Fen-deer in the Moorfen, easy meat and better hide once tanned. River-goats in the Verge, tameable with patience — the first livestock most souls ever keep, and the reason Herder is a Verge-tier profession rather than a frontier one. Coast-seals in the Sunken Reach, oil and pelt both worth the cold water. None of these are decorative: every one closes a link in the crafting graph (§15) that a Hunter or Herder is the only source for.

**The Wild, docile and dangerous to overhunt.** Rime-elk herds migrate down out of Rimeholt each winter, and a settlement's whole meat security for the season can ride on one herd's route staying healthy (§13) — which makes the herd itself worth protecting, not just eating, and gives Rangers a reason to exist that has nothing to do with fighting anyone.

**The Wild, aggressive.** Bog-lynx in the Moorfen, ambush predators that follow a wounded traveller for miles before committing — the reason Fleeing must work (§21) is not abstract when something patient is doing the chasing. Cliff-wyverns nest in Rimeholt's high ground and are not evil, just territorial over ground a caravan needs to cross; killing one is a legitimate Mercenary contract, and leaving the nest alone is a legitimate choice too.

**The Grey-touched.** Ash-hounds in the Kiln, animals that stopped needing to breathe air the ordinary way and started needing something else instead. Fen-wraiths in the Moorfen — drowned things that were once people, which is exactly as upsetting as it should be and never played for anything other than tragedy. None of them are commanded. All of them are drawn to a working the moment one is cast nearby (§20), which is the actual mechanical reason "drawing on the Grey attracts trouble" is true and not just flavour text.

**His armies are not the Grey-touched, and the distinction matters.** Reavers, Lieutenants and Captains (§27) are people who took service, paid and equipped like anyone else in this economy (§30A) — not conjured monsters. When they come in numbers, it has a name, and it has rules (§29A).

## 8. The Old Kingdoms, and the people who remember them

The world before was not a golden age and should never be written as one. It was a scatter of holds and river-valleys and walled towns — the **Old Kingdoms** — that squabbled, traded, married and occasionally burned each other's barns, and which were, on the whole, alive and fed and going on.

That is all the past needs to be. **It was ordinary, and it was enough, and it was taken.** A ruin means more to a player who understands it was somebody's kitchen than one that used to be a Grand Imperial Something.

### What survived

Not institutions. Not armies. **People, and the things people carry:**

- **Songs**, half-remembered, with verses missing where the verses named places that no longer exist.
- **Hands** — a woman who knows how her grandmother tanned hides, a man who can still true a wheel. Skill outlived every library, which is exactly why the game is skills all the way down (§17).
- **Roads**, because nobody bothered to destroy them. They are how you get anywhere and why the captains patrol.
- **Grudges**, between valleys, over things that stopped mattering ninety years ago and still get people killed.

### The Keepers

The Old Kingdoms had an order of scholars and archivists — the **Keepers** — whose whole purpose was remembering: genealogies, treaties, the proper words for things.

Emeric Vale was raised among them. That is where he learned the patience, and it is why he hunted them first: **they were the only people alive who would recognise him.**

A surviving Keeper is one of the most valuable things in the world. They are old, frightened, usually hidden in a place nobody would look, and they remember his face from before he was anything else. They can teach a player to read the old script, name a ruin correctly, and recognise a working when they see one done right — which is most of what it takes to make sense of a Shard (§13A). A Keeper never says his name and never confirms what a player has pieced together; she only stops being able to hide that she recognises it. This is the natural source for the Shards, and it means **a scholar can matter as much as a swordsman.**

### One habit worth keeping

In the Old Kingdoms you did not say *thank you* for a gift. You said **"I'll remember it."**

Thanks ends a thing. Remembering keeps it open — it means *there is something between us now, and I intend for there to go on being something.*

People in the river valleys still say it, mostly without knowing why. It is the closest thing this world has to a creed, and it is the entire counter-thesis (§3) in three words.

## 9. The Unbowed — unpaid promises, given shape

The allied creatures need to be more than "good animals," and the Old Kingdoms give them an origin worth having:

> **The Unbowed are promises the Old Kingdoms never got to keep.** A word given and not yet made good — left behind when the people who gave it died, and grown solid from waiting.

They are not beasts. They are promises still waiting.

- **The Waiting Hound.** A dog whose master said *"back before dark."* It is still before dark. Feed it and it will walk you home, whatever home you name.
- **The Ferryman's Ox.** Owed a season's rest it never got. Let it rest first and it will carry anything you ask afterwards.
- **The Lamplighter.** Someone promised to keep a light burning on the fen road. Something still does. Its lamp marks ground that has not yet gone bad.
- **Grandmother Stoat.** Promised the children a story and has not finished it. Will follow anyone who listens, and knows things a stoat should not.

### The mechanic that makes them matter

An Unbowed can be **released.** Complete the promise — walk the hound's master's road to its end, give the ox its season, finish the story — and the promise is finally kept. The creature rests. **It leaves the world permanently.**

You lose an ally forever. You gain nothing but Commons standing. Nobody pays you for it.

Meanwhile the Grey King pays well for them killed, because a promise still standing is a piece of the old world that never bent to him — and he would rather it were gone than standing, by whichever road is quicker.

So every Unbowed is a three-way choice: **keep it** (useful, and it stays unpaid), **kill it** (immediate profit, permanent loss to the world, and his coin in your hand), or **free it** (costly, unrewarded, and the only one that was ever right). That is the counter-thesis (§3) compressed into a single encounter, and it is what makes the Sigil of Mercy (§5) concrete rather than abstract.

## 10. Death customs — how a world with permadeath buries its dead

Permadeath needs ritual or it is only a number going down. These are cheap to build and they are what make a world feel lived in.

**The Telling.** When someone dies, the village says aloud what they made and what they were owed in kindness — the wall they helped raise, the winter they fed someone else's children. It is the funeral, and it is the last time a person is spoken of whole. Towns do it properly. Reavers do it mockingly, over the body, for sport.

**The obscenity.** When a marked man dies, his mark does not die with him — it passes to his line. Children are born already hunted for what a grandfather did. There is no crime in this world that people hate more, and it is in half the drinking songs.

**Marks as memorials.** A dead maker's surviving work stops being merchandise. Families keep a smith's mark rather than sell it, and buying one from a grieving household marks you as a certain kind of person — which the on-chain provenance (§19) makes permanently visible.

**The Barrow-lists.** Every settlement keeps a board of its dead, by name and by what killed them. Newcomers read it before they read anything else. It is the truest tutorial in the game and it costs nothing to build.

**Naming an heir.** Before anything dangerous, you name your successor aloud. It is superstition, and it is also the lineage mechanic — a character who dies unnamed is mourned as *doubly* lost, because the line ends with the body.

## 11. Maren

She has to be a person, or she is a prop in two men's argument — which is exactly what Aurel made her, and the writing should not repeat his mistake.

**She was the best of the three of them and everyone knew it, including her.** Not humble about it. Impatient with people who were slow, funny in a dry way that did not always land, and openly bored by court. Aurel could never impress her, and it ate at him for twenty years.

She was going to marry Emeric — the brother with no talent, who listened.

### What she actually did

She was not tricked into dying. That is the thing to hold onto, and the thing every retelling in-world gets wrong.

Aurel brought her a working that would end a war the kingdom was losing, and it needed a life freely given and given knowing. She read it. She understood the price exactly, argued about the geometry of it for two days, and then she agreed, because she thought it would save several hundred thousand people and she was the only one who could hold it.

**She was lied to about one thing only: where the power would go.** She went into that circle believing it would be spent and gone. She died doing the largest generous thing anyone in this world has ever done, and her brother-in-law-to-be turned it into a throne.

### Why it matters mechanically

Emeric's rage is not grief-shaped. It is **specific**: someone took the single most selfless act he had ever witnessed and converted it into power, and did it inside a family, with love, easily.

That is the whole of his case against people. And it is why the one thing that reliably unbalances him is not a weapon — it is **being shown a stranger doing something generous at real cost and expecting nothing**, which the world's counter-thesis (§3) produces constantly and which he has no answer for except to explain, again, why it will not last.

### What survives of her

Very little, and it should stay that way — she has been dead ninety-five years and the kingdom that remembered her is gone.

Her name is not spoken anywhere in the world, by anyone, for any reason (§1). What survives is stranger and better: workings still taught hand to hand for four generations by people who have no idea whose they were, done exactly the same way every time for reasons nobody living can give. A Keeper (§8) might recognise one and go quiet rather than explain.

**The most affecting version of a legacy in a world like this is a technique, not a monument** — something a hedge-witch does with her hands, correctly, without knowing she is quoting anyone.

## 12. Texture — sayings, time, and what people eat

Cheap to write, enormously effective, and exactly the sort of thing to fill notebooks with at a gas station counter.

**The calendar.** Years count from the Fall. It is currently the **Ninety-First Year of the Grey** — nobody needs telling what that means, because you can see it at the treeline. In the Verge people just say *"the ninety-first"* and do not finish the phrase, the way you would not finish naming an illness in the house of someone who has it.

**Sayings.**
- *"Gone to ground."* — a blessing at a wedding (may your life stay small and unseen and long), a threat in an alley, and what a captain says before he does it. Context is everything, and it is always the same phrase.
- *"Keep your fires low."* — goodbye, said to travellers. Practical advice and a superstition at once.
- *"Nothing is free. But some things are given."* — the closest the Old Kingdoms had to a creed, and the sentence the whole counter-thesis rests on. Said with a curl of the lip about the Given (§20A), who took the second half of the sentence and forgot the first.
- *"Still making his case."* — said of anyone consumed by an old grievance, rehearsing an argument nobody living is left to answer.
- *"Bright in the wrong light."* — of someone who looks a little too well, too healthy, too lucky, in a world where that is never free (§20). Also just: of a lie.

**Food, by Realm.** Survival games live on this detail.
- **The Verge** — river-bread, small beer (safer than the water and everyone knows it), hedge-fruit, hard cheese counted in wheels.
- **The Moorfen** — peat-baked fen-bread that keeps for weeks and tastes of smoke; fenroot, bitter and medicinal; eel.
- **The Kiln** — ash-salt, which preserves anything and ruins the taste of everything; hard biscuit; water carried, never found.
- **Rimeholt** — anything fat. Rendered tallow eaten plain, without embarrassment, because the cold takes what it wants.

**One more thing worth keeping about "I'll remember it"** (§8): the Grey King knows exactly what it means, and finds it sentimental, and is wrong.

## 13. Ecology — making the wild a system, not a spawn table

Creatures were sketched in §7 and never specified. The requirement is that hunting be a *renewable resource problem*, because that is what makes hunters, herders and rangers into managers rather than grinders — and because overhunting is one of the few ways players can damage the world without meaning to.

**Per-species, per-territory population state** on chain (a scalar, EndBlocker, same cheapness argument as `x/blight`): population, carrying capacity, and a growth rate. The fine behaviour — individual animals, pathing, fleeing — stays in the simulation tier and is derived from those scalars.

**Coupled populations.** Prey grow toward the carrying capacity their biome supports; predators grow with available prey and decline without it. The classic coupling is enough — we do not need a research-grade model, we need one that *punishes greed on a visible timescale*.

**Three levers that make it matter:**

- **Overhunting collapses a region.** Take prey below a threshold and the population does not recover on a normal timescale. Predators starve or migrate. And the gap is where corruption moves in — a dead ecosystem is undefended ground, which links hunting directly to §6.
- **Carrying capacity is a function of land health.** Farmed, warded, purified land supports more life. So the farmer and the hunter are in the same economy rather than parallel ones.
- **The Unbowed are not renewable.** They do not breed and they do not come back. Every one killed is permanent, and the Grey King pays for them precisely because he wants that trade taken.

**Migration** ties the biomes together: herds move seasonally (§23), so a settlement's food security depends on a route that passes through territory someone else has to keep healthy. That is a cooperation dependency between strangers who may never speak — exactly the shape §3 asks for.

**The Grey-touched are not a separate spawn table — they are what the Wild population becomes.** When a territory's corruption crosses a threshold, a share of its living Wild population (§7A) converts rather than a fresh horror appearing from nothing: a healthy fen-deer herd that has stopped being able to leave. This is the mechanical form of what §7A already says in prose — nobody conjures an ash-hound, the land makes one, given enough time and enough grey.

**Which means a thriving population is itself part of the holdback (§6), the same way a farmed field or a warded well is.** A dense, healthy Wild population dilutes what corruption has to work with; an overhunted one has nothing left to convert *slowly*, so the territory rots faster and emptier instead. This is the real teeth behind "overhunting collapses a region" above — it does not just remove a food source, it removes part of what was standing between that ground and the Grey. A Ranger managing a herd is doing corruption-holdback work and does not always know it.

*Wants a citation pass on predator-prey modelling in games before implementation; not researched this session.*

## 13A. The Shards — the mystery, as an actual system

"There is no NPC who tells you the answer" is a writing rule (§1). It needs a mechanical form or it stays a nice sentence.

**A Shard is one true fragment of what happened between Aurel, Emeric and Maren, or of how the working actually functions.** Never the whole thing. Always something that is meaningless alone and damning in combination.

### Where they live

Physically placed, not dropped. A Shard is discovered by *doing something specific in a specific place* — reading a collapsed keep's carving correctly after a Keeper has taught you the old script; finishing what a particular Unbowed (§9) has been waiting for and having it show you something instead of thanking you; provoking a specific captain into saying more than he meant to; earning enough trust in a Given settlement (§20A) that someone tells you what they were never supposed to say. **No Shard drops from combat, and no Shard is bought.** Every one costs a relationship, a skill, or a risk.

### Where they live in the world's memory

Every Shard a player finds is written into the Codex (§14) as public, permanent, attributable record — who found it, where, and what it said. **The mystery is server-wide and cumulative.** No individual has to find everything; the world only has to have found it collectively, and any player can go read what has been assembled so far.

This is the payoff for the Name Sigil (§5): **his name is not given to a player as a reward. It is derived** — by someone, eventually, cross-referencing enough Shards that the pattern becomes undeniable, the way the carving's struck-out face and the Keeper's silence and the captain's slip are three unrelated facts until someone lays them next to each other on purpose.

### The rule that keeps it honest

**A Shard may only ever be shown, never explained.** A carving, a fragment of a working, a sentence someone says once and will not repeat. If a piece of content resolves a question outright, it is not a Shard, it is exposition wearing a Shard's clothes, and it should be cut.

## 14. The Codex at MMO scale

The Codex is the memory substrate for retrieval (the existing DESIGN.md architecture) and an open-world MMO will generate orders of magnitude more of it than a raid game. Three problems it does not yet have answers for.

**Sharding.** Index by Realm and by soul, not as one corpus. The Grey King reasoning about the Moorfen should retrieve Moorfen history and the dossiers of the souls present, not compete for context with events six Realms away.

**Retention and pruning.** Unbounded history is a state-growth problem (§43) and a retrieval-quality problem — more history makes retrieval *worse* past a point, not better. So: recent events at full fidelity, older events progressively summarised into durable compact records, and a small permanent tier that never decays. Obituaries, maker's marks, Sigil breaks, Era transitions and Shards belong in the permanent tier. What someone had for dinner does not.

**Summarisation must be deterministic**, or validators disagree about what the past was. Either compact by rule (fixed aggregation over typed events) or, if a model does it, treat each summary exactly like one of his directives — committed, attested, and thereafter immutable. **The compacted record becomes the canonical past.** That is a heavy statement and it deserves to be made deliberately: it means history is periodically, irreversibly rewritten into a shorter form, and the rule that does it is as consensus-critical as anything in the death court.

**Tier-gated retrieval.** How much Codex the Grey King may draw on is one of the Intelligence Tier parameters (§37). A low-tier Grey King genuinely remembers less — which is both a difficulty dial and a way for players to *feel* him growing.

## 15. The crafting graph

Professions are enumerated (§17) and items have a schema (§19), but the actual chains are undrawn, and they are where "massive depth" either exists or doesn't.

**The rule that generates depth: every crafted good needs at least two inputs from different professions, and at least one input that is Realm-gated.** That single constraint forces interdependence — no profession can self-supply, and every tier of goods creates demand for the ascent.

**Worked example, one chain:** ore (Miner) + charcoal (Charcoaler, from timber by Logger) → bar (Smelter) → blade blank (Blacksmith) → finished sword (Weaponsmith) + grip (Leatherworker, from hide by Hunter, tanned by Tanner) + oil (Apothecary, from herbs by Herbalist). Eight professions, one sword. Now gate real steel behind the Kiln's coal and every one of those eight people has a stake in Sigil #2.

**Quality propagates.** An input's quality bounds the output's, so a chain is only as good as its worst link and a master smith cannot rescue bad ore. This makes reputation for *reliable supply* economically real, which is what creates long-term trading relationships rather than spot transactions — and long-term relationships between strangers are the counter-thesis (§3) expressed as an economy.

**Byproducts and waste** give the lower tiers somewhere to go: slag, offcuts, bone, spoiled grain. Some feed other chains (bone → glue → fletching), some feed decay. A graph with no waste is a graph where nothing is ever a bargain.

*Deliverable: the full graph belongs in `PROFESSIONS.md` as an actual directed graph with a closure check, not prose.*

## 15A. Three more chains, three more sectors

One chain proves the rule works. A world needs the rule proven across everything people actually spend their lives making.

**Food, from field to winter table.** Grain (Farmer) + soil health from Tender's holdback work (§6) → flour (Miller) → bread (Cook), alongside salted meat (Hunter → Salter, using Sunken Reach or Kiln salt) and preserved fenroot (Forager → Alchemist). A winter's food security is never one person's harvest; it is four professions and at least one Realm-gated preservative, which is exactly why a settlement that loses its Salter starves slower but starves.

**Construction, one wall at a time.** Stone (Mason, quarried) + timber (Logger → Carpenter, joined) + a ward against the Grey (Tender, drawing on the working per §20) + iron fittings (Miner → Smelter → Blacksmith). A defensible wall is therefore never purely a Mason's achievement — it is the visible record of a whole settlement's professions agreeing to protect the same ground, which is the point §23 makes about settlements being the clearest record that a group of people existed and cared.

**Alchemy, from reagent to remedy.** Herb (Herbalist) + Weald Undying reagent (Forager, at real personal risk — §5's Realm) + purified water (Alchemist) → a working salve or a cure for the Kiln's ashlung. High alchemy is capped at the Weald Undying for a reason: it is the Realm where the ingredients themselves lie to you, so every apothecary's reputation is built on having survived being wrong.

**Quality and waste hold across all three exactly as they did for the sword** (above) — a chain is only as good as its worst link, and nothing in any of them goes unused: slag from the wall's ironwork feeds the blacksmith's next batch, spoiled grain feeds livestock or decay, offcuts from tanning become glue for the fletcher. Depth here is not more recipes. It is recipes that need each other.

## 16. Eras

With no reset, the world needs another way to change. **Eras** are declared by governance, not a clock, and are the only moment at which the Grey King may propose rule changes, a ratified model adapter activates, or world parameters shift by referendum.

Because they are declared rather than scheduled, a **minimum interval** and a **mandatory public review window** are load-bearing: without them a captured governance can call Eras faster than anyone can read the changes.

Eras are also the historical record. "The Third Era ended when the Kiln fell" is real recorded history, and accumulated history is precisely what makes a permadeath world worth living in.

---

# PART II — SYSTEMS

## 17. Survival, and the rule that generates the professions

**Design rule: every survival pressure must have a profession that answers it.** The job list is derived from the survival model, which is why it holds together, and it is the seed everything below grows from.

| Pressure | Answered by |
|---|---|
| Hunger | Farmer, Herder, Hunter, Fisher → Miller, Cook, Preserver |
| Thirst | Dowser, Well-digger → Alchemist (purification), Brewer |
| Temperature | Tailor, Furrier, Leatherworker → Mason, Carpenter, Charcoaler |
| Exhaustion | Innkeeper, Cook, Physician |
| Injury & infection | Surgeon, Physician, Apothecary, Herbalist |
| Encumbrance & distance | Porter, Caravaneer, Shipwright, Cartographer |
| Corruption | Tender, Alchemist, Engineer, Consoler |
| Danger | Mercenary, Scout, Ranger, Delver |
| Uncertainty | **Insurer**, Broker, Banker, Information broker |

**Skill-based, uncapped, no classes** (§22): a soul is not a Farmer instead of a Blacksmith. Skills rise by use, so most souls that survive a season hold several — a smallholder who wards their own field and mends their own tools, say — and full specialists are a choice, not a starting cage. "You can be anything" is not a slogan here; it is the progression model.

**The professions, by sector.**

- **Gathering** — Farmer, Herder, Hunter, Fisher, Forager, Herbalist, Miner, Logger, Salvager, Dowser, Trapper, Beekeeper.
- **Refining** — Smelter, Tanner, Miller, Charcoaler, Glassblower, Salter, Reagent-grinder, Renderer, Distiller.
- **Crafting** — Blacksmith, Weaponsmith, Armourer, Carpenter, Mason, Tailor, Leatherworker, Fletcher, Jeweller, Scribe, Cartographer, Cook, Brewer, Apothecary, Engineer, Shipwright, Potter, Bowyer, Cooper, Ropewright.
- **Sustaining** — Physician, Surgeon, Consoler, Teacher, Innkeeper, Courier, Caravaneer, Midwife, Grave-teller.
- **Economic** — Merchant, Broker, Banker, Landlord, Auctioneer, Insurer, Guildmaster, Assayer, Factor.
- **Frontier** — Scout, Ranger, Tender, Delver, Mercenary, Sigil-breaker, Trailblazer, Beast-tamer.
- **Grey** — Smuggler, Fence, Bandit, Poisoner, Spy, Given agent.

That is roughly sixty named professions before a single one of them branches — and every branch is a Realm doing what §4 already promises: gating the good version of a trade behind the ascent.

**Tiers, per profession, gated by Realm.** A Smith is not "unlocked" once; a Smith *grows*, the way the world does:

| Tier | Realm | What changes |
|---|---|---|
| Verge | 0 | Copper and soil-fired clay. Every profession exists at this tier, badly. |
| Moorfen | 1 | Bog iron, tanning, charcoal proper — the first real toughness in tools and armour. |
| Kiln | 2 | True steel, glass, blasting powder. The tier every weapon and armour profession is actually waiting for. |
| Sunken Reach | 3 | Salvage, preserving, pearl — the first goods worth shipping rather than carrying. |
| Rimeholt | 4 | Sky-iron, rare metal — the ceiling for anything that has to hold an edge or a charge. |
| Weald Undying | 5 | Reagents, living wood — the ceiling for anything alchemical. |
| Hollow Vault | 6 | Mechanisms — the only tier that produces *engineering*, not materials. |

A master Smith who has never set foot past the Moorfen is not a bad Smith. They are the best Smith the world currently has access to, and that is a true and valuable thing to be. Nobody's work is obsolete; it is *ceilinged*, and the ceiling only moves when the whole world moves it together (§6).

**Five roles exist *only because* of permadeath and a persistent world:**

- **Insurer.** Players will sell death cover. It emerges from the mechanics rather than being designed in, and it is a deep, entirely player-run business (§24).
- **Teacher.** Knowledge is soulbound but degrades through death (§25). Masters transfer mastery to apprentices. This is how society rebuilds after a mass-casualty event, and it keeps veterans valuable forever — even after their character is gone (§18).
- **Landlord.** Land survives death, making real estate the world's only asset class that does not die with you (§23B).
- **Grave-teller.** Someone has to know the Barrow-lists cold — who died where, what killed them, whose line is owed what. Half historian, half informant, and the only profession whose entire stock-in-trade is other people's deaths.
- **Given agent.** A licensed go-between for the Given (§20A) — buys their goods, sells them at a markup nobody asks too many questions about, and carries no visible mark for doing it. Exists because *someone* has to be the seam between the two economies, and being that seam is dangerous enough to be a real trade.

## 17A. Coin, salt, and what actually passes between hands

A world this drained does not run on formal currency, because formal currency needs a mint, and mints need a crown that isn't broken.

**Barter is the daily reality**, and it is not a downgrade — it is honest. Two people trade what they actually have for what they actually need, in front of each other, with nothing abstract standing in for the value.

**Salt is the nearest thing to universal money**, and it earned that role rather than being declared into it: it preserves, it is portable, and every settlement wants it regardless of what else it produces. Prices are still spoken of "in salt-weight" in places that have not seen a scale in years — a farmer's sack of grain is worth so many measures of salt, whether or not any actual salt changes hands.

**Old crowns still circulate**, minted under kings who no longer have kingdoms, and they behave less like money and more like relics that happen to be spendable. A pocket of crowns is prestige as much as purchasing power — some are melted down by smiths who need the metal more than the history, and a smith willing to melt a crown says something about how desperate, or how unsentimental, they are.

**The Given pay in things nobody in the valley has seen for a lifetime** (§20A) — worked coin, refined goods, the kind of wealth that only exists where a mint is still running. Spending it in an honest town is its own kind of confession.

## 17B. A day's work, and what it is worth

Money answers "what is this worth." It does not answer "how does a Weaponsmith actually get paid this season," which is a different and more interesting question.

- **Piece work.** Most trade is exactly this: a finished good, sold or bartered on the spot, at whatever the buyer and seller agree it is worth today. The default, and the fairest test of whether a craft is actually wanted.
- **Commissioned work.** A settlement wants something specific and durable — a wall, a well, a set of arms for its watch — and pays for it in shares of the harvest, in standing, in salt-weight over a season, or in first claim on whatever the commission produces. This is how civic works actually get built (§23), and it is negotiated in the open, by the people who will live with the result.
- **Apprentice yield.** A Teacher's cut of an apprentice's early work (§18) — the one wage that is earned by someone else's labour and still entirely legitimate, because teaching is real work too.
- **The Given's coin.** Waged, plainly, the way an army pays a soldier — and it is the one payment method in this world that comes with strings nobody else's does (§20A).

**There is no formal employer class**, and that is a deliberate absence. Nobody in this world clocks in. A guild can fund a member's season of work from its shared stores, but that is patronage between people who know each other, not a wage relationship between strangers — because a stranger-wage relationship is exactly the kind of impersonal, easily-exploited arrangement the counter-thesis (§3) argues against. Work here is always, visibly, between people.

## 18. The first hour — the number that should scare us most

**EVE Online loses about 90% of new players within a week**, and half of those who subscribe leave before their first billing period ends. EVE is *far gentler* than what we are building. Assume worse unless we design against it deliberately.

The documented failure mode is a **promise/experience mismatch**: an epic opening, then a rookie frigate sent to shoot a red plus sign. Our version of that failure is obvious and we should name it now — a terrifying intelligence that priced the world, followed by forty minutes of picking berries while a thirst bar ticks down.

And the stakes are higher for us for the same reason they are higher for EVE: **in a game where players are each other's content, every lost newcomer removes content from everyone else.** Retention is not a business metric here, it is a gameplay input.

### Five design commitments

1. **The villain appears in the first hour, by name.** He notices you. He says something specific and unhurried and wrong-feeling. This is flavour tier — it costs nothing in consensus risk — and it delivers the entire product promise immediately instead of after a forty-hour ramp.
2. **You arrive owing.** A new soul begins with a small inherited mark. The premise is legible in the first minute, it creates immediate direction, and it makes the Grey King's captains personal before it is dangerous.
3. **The first death should be survivable, and survived because of a stranger.** Mortal Wound plus a passer-by who stabilises you is the single best onboarding beat available — it teaches the death system, the rescue meta and the counter-thesis in one event. Early Realms must be tuned so this is *likely*: dense population, and Commons standing that makes veterans want to patrol.
4. **Mentorship is a paid profession, not charity.** EVE's community famously *wants* to teach newcomers and builds whole institutions to do it. Make that mechanical: a new soul may bind to a **Teacher**, who earns real, ongoing yield from that apprentice's first weeks. Veterans should compete to find newcomers. This converts the retention problem into a player job and feeds directly into §3.
5. **No red plus sign.** The first task is something a real profession actually does, producing something a real player actually wants — and it should be bought by one within the hour, so the economy is felt before it is explained.

*Gate:* instrument D1 and D7 from the first playtest, and treat **EVE's ~10% week-one survival as the benchmark to beat, not to match.** If Phase 0 cannot beat it in a friendly, hand-held test group, the full game will be far worse.

## 19. Items and the maker's mark

Every item instance carries **material, quality, durability, weight, and provenance** — crafter's soul ID, block height, Realm — recorded on-chain.

> When a master smith dies permanently, their body of work becomes **finite**. Their surviving blades are the complete works of a dead artist, verifiably theirs, and they appreciate. A famous crafter's death is an economic event.

Only *marked* items are chain objects; bulk goods live in the simulation tier. **The mark is the scarcity, not the item.**

## 20. Magic — stealing it back

**Magic is not gone. It is somewhere.** All of it is in one man (§2), and everything a hedge-witch does is taken back out of his hold without asking.

That is the whole system, and it does a lot of work at once: it explains why magic is rare, why it is forbidden, why using it is dangerous, and why a new king could change all of it.

### Working it

There are still threads in the world — in old places, in things he missed, in people born with a knack. Pull on one and you are pulling on **his**, and the pull runs both ways.

- **He feels the direction.** Not who, not exactly where. A rough bearing and a sense of size, the way you feel a tug on a line. Small workings in a small place are noise. A hedge-witch closing a wound is nothing. **A ward big enough to hold a town is a shout.**
- **His captains hunt it.** Feeling it is his; finding it is their job, and it is most of what a Reaver patrol is actually doing out there.
- **It leaves a trace on you.** Not corruption — the opposite. Someone who works often goes *bright* in a way that reads wrong in a drained world: too-clear eyes, hair that keeps its colour past sixty, a warmth in a cold room. Ordinary people notice. Some are glad. Some go quiet and remember which house it was.

### The trade every village makes

Magic is the only thing that holds the grey off a field. It is also the thing that brings his captains down the road.

**A village that wards its crops eats.** A village that wards its crops gets visited. Every settlement is making that bet constantly and largely in the dark, and it is the same wager as everything else in this world (§1): the things that keep you alive are the things that get you seen.

### His armies work it freely

Because he grants it. What he holds he can lend, and he lends generously to anyone who serves.

This is not a small detail. It means **the strongest magic in the world is available, right now, to anyone willing to kneel** — see §20A — and it means a player casting in a field is doing something a Reaver can do better, legally, with permission.

### And a new king could simply change it

The working obeys whoever holds it. A new holder could keep the monopoly, lend it to friends, or open their hands and let it go back into the world.

**That is what the endgame is actually about** (§1B). Not treasure. The question of whether magic belongs to everyone, and whether you still think so once it is all yours.

## 20A. The Given — where the banished go

Outlawry needs somewhere to go, or being cast out is just being homeless, and the dark path stops being a choice.

**He takes people.** Anyone marked, exiled, hunted or simply desperate can walk north and be received. There are settlements out there — ash-grey towns under his protection, full of people who took the offer.

They are called **the Given**.

### What you get

- **Magic, freely, without hunting.** This is the real temptation and it should be a genuinely strong one. Everything §20 makes dangerous and furtive is simply *permitted* here. A Given hedge-witch works in the open, in daylight, and nothing comes down the road for her.
- **Protection.** No captain will touch you. The grey does not take your fields, because he does not let it.
- **Work.** His hosts need smiths, carters, cooks and killers, and they pay in things nobody in the valley has seen for a lifetime.

### What it costs

- **Every honest town is closed to you**, and the road remembers. This is enforced by other players, not by a rule.
- **You are lent, not given.** The magic is his and he can take it back mid-sentence, and everyone in a Given town has seen him do it to somebody.
- **A new king inherits you.** Whoever takes the throne decides what happens to his servants — pardon, exile, or worse. The Given have the largest possible stake in the endgame and no vote in it whatsoever.

### Why this is worth building

It gives the villain a **society** rather than a spawn table, and it gives predatory players a home, a market and a faction instead of a permanent penalty box. It also makes the moral geography of the map real: there is a direction on the compass that means *giving up*, and it is warm and fed and lit, and the people there will tell you honestly that it is not so bad.

That is a much better argument for the dark path than any amount of loot.

## 21. Combat — commitment, not reflexes

Combat was undesigned, and the architecture has already decided most of it.

Deterministic lockstep is the established pattern here: every node runs an identical simulation and exchanges only inputs, which demands fixed-point maths, shared-seed PRNGs and strict tick discipline — exactly the Phase 0.5 constraints. The cost is **input delay**: lockstep cannot apply an input on the tick it arrives. Typical RTS budgets are 2–3 ticks at 30 Hz, about 70–100 ms — and our Warden ordering layer adds 50–150 ms on top.

That settles the design question honestly:

> **Twitch combat is not available to us**, and pretending otherwise would produce a game that feels broken and a security model that leaks. Reaction windows are ~500 ms and up, not 50 ms.

So build **commitment-based combat**: actions have visible wind-ups, positioning and timing decide outcomes, and a committed swing cannot be recalled. Readable, tactical, and — usefully — legible to a spectator, which serves the Chronicle (§47). It also makes latency an *aesthetic* rather than a defect, the way turn-and-commit games have always done.

Four rules that matter more than the numbers:

- **Fleeing must work.** If every encounter is a death sentence, nobody explores, nobody trades between Realms, and the world collapses to the safe zone. Disengagement has to be a real, skilful option.
- **Wounds persist.** Injuries heal badly without care, which is what makes Physicians and Surgeons load-bearing rather than decorative.
- **Ambush uses commit-reveal** (§39.G), because public replayability otherwise makes surprise impossible.
- **Numbers to hold:** world/survival sim at 10 Hz, combat resolved on tick boundaries, a 3-tick input buffer, and the existing p95 input→effect gate of 250 ms.

## 22. Mechanisms worth stealing

Drawn from what large worlds actually learned, with the failures included.

**Terraforming and permanent world modification** *(Wurm Online).* Players dig, raise, flatten, tunnel and reshape coastlines, and those changes persist indefinitely unless someone else changes them or decay takes them. In a world that never resets (§16), this is the strongest "we were here" mechanic available — a landscape that is a visible record of everyone who ever worked it. It also gives masons, engineers and labourers permanent employment.

**Decay** *(Wurm Online).* Everything rots without maintenance. This is a **second sink alongside death**, and it makes the plan's central theme literal: the Grey King withdrew maintenance, so maintenance is the war. It also directly answers the failure below.

> **The Ultima Online warning.** UO's economy broke because limited resources got hoarded, liquidity dried up, and players left. Our design has a *literal hoarding mechanic with one living outflow*, which is exactly that failure mode with a lore justification. Two valves already exist — officer plunder (§30) and decay — and **the economic model must be simulated before launch, not tuned after.** This is the most likely way the game dies of its own premise.

**Economic play is a primary playstyle, not a garnish** *(Star Wars Galaxies).* Removing merchant professions measurably hurt SWG; many players choose economic gameplay as their main way of engaging. This validates the profession depth in §17 — and warns against ever treating crafters as support staff for raiders. Incidentally, SWG's Jedi permadeath is also the closest real precedent for what we are attempting, and it existed specifically to balance power with permanent risk.

**Skill-based, uncapped, no classes** *(Wurm, Project Gorgon).* Skills advance by use, without levels or class locks. This is simply what "you can be anything" means in mechanical terms, and it should be the progression model.

**Material-level simulation** *(Dwarf Fortress).* DF gets its legendary depth from simulating *materials and needs* — melting points, shear strength, heat transfer, hundreds of interlocking needs — so that stories emerge from systems colliding rather than from authored content. For us that means item materials should carry real physical properties that interact with the survival model: insulation against Rimeholt's cold, melting point in the Kiln, weight against encumbrance, conductivity, brittleness at temperature. **Depth from interaction, not from content volume** — which is also the only kind of depth a small team can afford.

**Discovery** *(Project Gorgon).* Not everything should be in a wiki on day two. Our constraint is unusual: the chain is open-information (§39.G), so secrets cannot hide in data. They must live in **things not yet done** — unattempted recipes, unspoken names, unvisited places, unasked questions. The Grey King's true name is the model for all of it.

**Sieges and guild territory war** *(Lineage II, Albion Online).* Castle sieges and guild-versus-guild territory control are the proven engine of long-term MMO drama, and they map directly onto our territory and corruption systems. Albion's full-loot top-down sandbox is also direct validation of the web/isometric client call — it is a serious, successful, hardcore MMO that is not 3D.

Sources: [Massively OP on death penalties](https://massivelyop.com/2016/03/05/massively-ops-guide-to-death-penalties/) · [MMORPG.com on player-driven economies](https://www.mmorpg.com/editorials/youre-worth-more-5-mmos-centered-around-player-driven-economies-2000119613) · [Wurm Online](https://www.wurmonline.com/what-is-wurm/) · [Dwarf Fortress](https://en.wikipedia.org/wiki/Dwarf_Fortress) · [Albion Online's decade of development](https://80.lv/articles/how-albion-online-devs-built-a-sandbox-mmorpg-across-an-entire-decade) · [Project: Gorgon](https://projectgorgon.com/)

## 23. Time, weather, and the things people build

Three systems the survival model implies but nobody has specified.

**Weather and seasons.** Hunger, thirst and temperature are meaningless without something to vary them. Weather is world state, derived deterministically from the block seed and territory corruption, so every node agrees and nobody can forecast it privately. Winter in Rimeholt is a *scheduled crisis* the whole server prepares for — which is precisely the kind of foreseeable, collective, non-combat emergency that makes farmers, preservers, tailors and charcoalers matter on a calendar. Corruption should worsen weather locally, so a neglected territory is visibly, meteorologically sicker.

**Settlements.** Deeds (`x/demesne`) establish ownership; they do not make a town. A settlement is a cluster of parcels whose shared works — walls, wells, wards, granaries, roads — are built and maintained collectively, and which generate the corruption holdback in §6. Since there is no mechanical sanctuary (§25), a settlement's safety *is* its walls, its patrols and its reputation. Towns should be genuinely defensible, genuinely losable, and permanently visible on the map as the work of specific named people. Combined with terraforming and decay (§22), a settlement becomes the clearest possible record that a group of people existed and cared.

**Guilds.** The unit the Sigils are actually played by, and therefore worth building properly rather than as a chat channel: shared treasuries with defined withdrawal rules, ranks and delegated authority, contracts that the chain can enforce, shared answer for a member's mark, and inheritance when officers die permanently. Note the tension with §3 — guilds are the strongest cooperation structure *and* the natural shape of a mega-guild that could trivialise a Sigil. The Sigil design in §5 is what holds that line, so guild power should be allowed to grow freely; it is the win conditions that stay distributed.

## 23A. Markets, and the price of distance

Every good in this world has a second price nobody quotes out loud: what it cost to get here.

**Distance is not friction, it is the market.** The Kiln's coal is cheap at the Kiln and expensive by the time a Caravaneer has carried it three Realms south, and that gap is not a tax someone imposed — it is a Porter's wages, a Caravaneer's risk, and every mile of road a Scout had to say was safe. A market where price only reflects scarcity and never reflects the journey is not simulating trade, it is simulating a warehouse.

**Local markets clear locally.** A settlement's own square trades what its own people made, at whatever they agree it is worth today — no global price feed, no invisible hand, just the people standing there. This is deliberate: a single server-wide price for iron would erase every reason a smith's *own* reputation matters, and reputation is load-bearing (§15).

**Long trade is a different profession from local trade**, and it is where Merchant, Broker and Auctioneer actually live: buying low where a good is common, carrying it at real personal risk through territory that may or may not be held (§6), and selling high where it is not. Every caravan is a Sigil of Harvest (§5) in miniature — a bet that enough separate people, moving in the same direction, add up to something none of them could carry alone.

**Market events are corruption events wearing a different face.** A Realm's ascent unlocking a new material is a supply shock the whole world feels at once (§4); a territory lost to the Grey (§6) is a demand shock in the settlements that depended on it. The market is not a separate system bolted onto the world — it is the world's other nervous system, and it should be built to flinch at exactly the same things the survival layer flinches at.

## 23B. Land, and the only wealth that outlives you

**Coin is mortal. Land is not.**

Everything a character carries or holds loose goes to the Hoard the moment they die (§25). A deed does not, because a deed belongs to the soul, not the body — which makes land the single asset class in this entire economy that a death cannot touch.

**That fact alone is worth building an entire economic layer around**, and it explains things a simpler design would leave unexplained:

- **Why Landlord is a real profession and not a footnote.** Renting out a plot, a stall, a room above a tavern is the closest thing this world has to passive income, and it is passive specifically because it survives the one event that erases everything else.
- **Why land prices should rise faster than any other good's**, the longer a server runs. Every death that doesn't touch land is one more reason the living value what does.
- **Why dynasties form around land and reputation, not coin.** A soul's wealth in the ordinary sense resets every time the body does. What does not reset is a family's deeds, a family's standing on the road (§3), a family's name on the Barrow-lists (§10) for what an ancestor built rather than only how they died. The families that matter in this world in year five are not the ones who died richest. They are the ones who kept the same plot of ground.
- **Why upkeep and foreclosure matter more than they look like they should.** Land bought and then neglected reverts — parcels encumbered when a territory is lost to the Grey (§6), holdings that lapse when upkeep goes unpaid. Land is the safe asset, not the free one; it still has to be *tended*, which ties real estate back into the corruption-holdback economy rather than letting it float above it.

**The consequence worth stating plainly:** in a world this brutal to individual characters, land is where the game lets ambition survive death. Everything else asks a player to build something that outlasts them. Land is the one thing that mechanically does.

## 24. Player institutions, and the scams that come with them

Banker and Insurer are on the profession list (§17), and both were listed as things that *emerge*. They will — and so will the failures, so design knowing that.

In a permadeath world, a player bank is a promise made by a mortal. **The banker can die.** That is not a bug to patch; it is the most interesting property the institution has, and it makes succession, co-signing and reserve transparency into real gameplay. Guild treasuries with defined withdrawal rules (§23) are the primitive that makes any of it possible.

**Give honest institutions tools, and let dishonest ones exist.**

- **Verifiable reserves.** A banker can prove holdings on chain. That does not make them honest — reserves prove solvency, not intent — but it lets an honest one distinguish themselves, which is the whole basis of a reputation market.
- **Enforceable contracts** for the terms a chain can actually enforce: escrow, time-locks, collateral, automatic default. Anything outside that is a promise, and promises can be broken.
- **`x/testament`** (§3) is what makes a reputation for keeping promises worth more than the profit from breaking one — a betrayal is permanent, public, corroborated testimony.

**Confidence tricks are content — DECIDED.** A world where trust can be extended is one where it can be abused, and the abuses become the stories people tell about the world for years. The position is explicit: **we build the tools for verification and record; we do not build protection from bad judgement.**

The one hard line: **every instrument must be checkable before it is trusted.** Provable reserves, inspectable escrow terms, visible collateral, corroborated history on the counterparty. A scam must always be something a careful person could have avoided, so a loss is a lesson rather than a lottery. Any instrument that cannot be verified before commitment should not exist.

Note the sharp edge against §3: a predation economy in the financial layer pushes toward exactly the distrust the Grey King wants. The counterweight is that verification is cheap and permanent here in a way it never is in reality — and that insurance, which only works when many people cooperate, is the natural answer to it. If insurers thrive, the thesis is holding.

## 25. Death, resolved

**Dying is never instant and never arbitrary.**

- **Mortal Wound.** You bleed out over minutes. Another player can stabilise you; a Physician or Surgeon improves the odds and reduces lasting injury. Death becomes *social*, and the rescue meta is among the strongest bonding mechanics available.
- **Survival death is slow and telegraphed.** You should always be able to point at the decision that killed you.
- **Never to a lag spike.** This is a hard requirement on the netcode, not a nicety.

**Lost forever:** the character, and everything carried or equipped.
**Kept by the soul:** identity, lineage, reputation, titles, land deeds, banked goods, guild membership — and **knowledge at reduced fidelity**. You keep your recipes but take a mastery penalty; a new body relearns the hands. Full mastery is re-earned or re-taught.

**Banked vs. carried** is the core risk decision of the game, and storage is *located*: a vault in the Moorfen is no use in Rimeholt. Logistics is real gameplay.

**Outlawry and the Grey King's bounty.** Killing in settled territory marks you, with bounties on-chain. The Grey King **pays for corpses** — not out of cruelty, but because a divided valley never becomes the kind of trusted, organised group that could one day reach him (§3). Banditry is a funded career, morally weighted because you are visibly taking his coin. This gives the world its murder guilds, and the society that organises against them.

**No true sanctuary.** Settlements are safe *in practice* — outlawry, bounties, walls, other players — never by rule. New players are protected by low corruption, dense population and cheap Physician cover in the Verge, not by invulnerability.

**Logging off.** Camped is safe; the field is not. Log out at a shelter, settlement or camp you built and needs pause. Log out in the open and the world keeps happening to you. This makes shelter-building a real profession, makes "get somewhere safe before bed" a genuine decision, never kills a responsible player — and closes the logout-as-escape exploit, which matters directly for §39.

---

# PART IIB — THE HOST

## 26. The villain problem

A villain seated at the top of a tower is one you fear *abstractly*. The Grey King needs instruments that come for you where you live — and he needs a reason for them that the world can read.

**The core conceit: you are not hunted because someone hates you. You are hunted because there is a mark with your name on it, and someone is being paid to execute it.**

## 27. The hierarchy

| Rank | Count | Behaviour | Intelligence |
|---|---|---|---|
| **The Grey King** | 1 | Realm 7. Marks, plunder, seizes, bargains, taunts | Full consensus tier |
| **Wardens** | 1 per Realm | Regional authority. Fortified seat; a static raid target | LLM (Captain pattern) |
| **Captains** | ~6–10 per Realm | Hold strongholds and dungeons, command a district | LLM (Captain pattern) |
| **Lieutenants** | dozens | **Roam.** Lead warbands, execute marks, ambush | Light template + Codex retrieval |
| **Reavers** | many | Rank and file, patrol, harass, raise corruption | Pure code |

Intelligence is deliberately scarce. A world where a dozen entities are genuinely intelligent and the rest are furniture is far more unsettling than one where every bandit monologues — and it is what keeps inference cost bounded.

## 28. Marks — how you become a target

A **mark** is a public, on-chain record naming a soul, carrying a value and a cause. You accrue one by: defaulting on land upkeep, killing officers, contributing to Sigil progress, holding contraband — or by being **named by another player**.

Because a mark is public and legible, being hunted is *earned and explicable*, never arbitrary. And it is negotiable:

- **Discharge it** — pay the debt.
- **Contest it** — argue your case before the Grey King or a Warden. A real bargaining scene, and the single best use of the LLM in the game.
- **Void it** — bribe a Captain with the authority to strike it.
- **Buy it** — another player can purchase your mark, to shield you or to execute it themselves as a licensed hunter.
- **Inform** — players can name others onto the Grey King's captains. Betrayal now has a mechanism, and the Information Broker has a product.

## 29. What officers actually do

Assignments are issued against marks and territory objectives, and validated as bounded actions like any other:

- **Ambush** — intercept on travel routes, chokepoints, and at a target's own holdings.
- **Assassination** — a mark against a *named player*. Telegraphed: rumours, sightings, a letter. Dread, not randomness.
- **Theft and raids** — hit storehouses, caravans and farms. This attacks the economy, which means non-combat players are targets and therefore have a stake.
- **Sabotage** — poison wells, burn fields, spoil stores.
- **Seizure** — burn out holdings on ground the Grey has taken.
- **Garrison** — hold a dungeon or stronghold as a static, high-value objective.
- **Roam** — patrol, contest, and raise local corruption.

## 29A. The Muster — when he comes for a place, not a person

Everything in §29 is one officer, one target. This is the escalation: a coordinated strike, ordered from above, against a settlement rather than a person.

**The aggression budget is real and it is spent, not felt.** Every Realm's Captains and Reavers draw from a shared pool that regenerates over time (§37 sets its scale by Intelligence Tier). Spend it thin across many small "theft and raids" actions (§29) and the world feels a background hazard. Save it and throw it at one place at one time, and that is a Muster — a Lieutenant or Captain leading a real force, sized to whatever the budget currently allows.

**It is telegraphed, the same way an assassination is (§29).** A Muster does not appear at your wall out of nothing: Scouts report a warband forming, refugees come down the road ahead of it, and the weather over the massing ground reads wrong to anyone who knows what corruption does to weather (§23). A settlement that is paying no attention deserves what it gets. A settlement that is watching has real time to prepare — call allies, reinforce a wall, get the exposed out.

**What it actually does when it lands** is drawn from the same verb list as §29, aimed all at once: it burns what it can reach, it besieges the walls specifically, and — this is the vicious part — it **targets the wards first**, because the wards are what is holding the Grey back (§6) and breaking them is worth more to him than any single kill. A Muster that overruns undefended ground can seize and encumber parcels exactly as neglect does (§23B); one turned back at the wall costs him real, spent capacity and gives the defenders a story the whole valley will have heard by the time it's told twice (§10).

**Frequency and size are not random — they answer §3's actual thesis.** A quiet, compliant settlement rarely sees more than the ordinary background hazard. A settlement that is visibly winning — breaking ground on a Sigil, pushing corruption back hard, growing fast enough to be talked about — draws Musters specifically, because his real fear is organised, trusted people reaching him (§3), and the fastest way to keep a settlement from becoming that is to keep it rebuilding its wall instead of marching north. This is the mechanical form of "everything you build makes you easier to see" (§1) at the scale of a whole town, not just a person.

**And this is what the Sigil of Bastion actually is.** "Hold a place for K consecutive blocks against its full aggression budget" (§5) means exactly this system, maxed out and sustained — the single largest Muster he is currently capable of, thrown at one place and not called off. Surviving that is not a boss fight. It is a siege, and the name is the achievement: what the defenders become, not what they're doing. It is why Bastion needs defenders spread across time zones rather than one very brave guild — and, not incidentally, why it no longer shares a name with the death-court's dispute window (§39), which was always a separate thing wearing the same word.

## 30. Growth: plunder, not experience

**Officers take a plunder — a cut of every estate they collect — before the remainder goes to the Hoard.** They spend it on gear, retinue and fortification. An officer that has killed forty players is visibly, expensively equipped, and because maker's marks are on-chain you can *see whose gear it is wearing*: your dead friend's sword, verifiably, with their smith's mark on it.

This does three jobs at once:

1. It is the "stronger with every kill" loop, expressed economically rather than as an XP bar.
2. **It is the economic valve the design was missing.** Pure permadeath sends everything into an unreachable Hoard, which is relentlessly deflationary. The plunder is a *recoverable* sink: kill the officer and its accumulated take drops. Value returns to the world, but only to people good enough to take it.
3. It gives every officer a legible, growing bounty — so the world knows exactly how dangerous and how rich each one is.

## 30A. Where the plunder actually goes

"Gear, retinue and fortification" (§30) should not be an abstract stat increase. It is real spending, into the real economy §17 just built, and tracing it closes a loop the design was otherwise leaving open.

**An officer cannot walk into an honest town's market.** So plunder moves through the same seam the Given economy already needed (§20A, §17): a **Fence** or a **Given agent** launders dead players' gear back into circulation, a **Smuggler** carries commissions to smiths who will take the work and not ask whose sword this used to be, and every step of that chain takes a cut — which means an officer's spending is quietly subsidising the Grey professions (§17) the honest economy pretends not to need.

**Retinue is Reavers on wages**, paid the way anyone is paid in this world (§17B) — in salt-weight, in crowns, in the promise of a share when the holding produces. A Lieutenant with a large retinue is a Lieutenant who has been paying well, consistently, out of real plunder, and a rival who can outbid him for loyalty is doing real economic warfare, not flavour text.

**Fortification is commissioned work**, exactly as §17B describes it, just placed by someone the Mason and Engineer would rather not have as a client — a garrisoned stronghold's walls are the same profession, the same materials, the same Realm-gated ceiling as a settlement's, built by people who took the commission because plunder-coin is still coin.

**The consequence worth stating:** every officer killed does not just return loot to the world. It cuts off a live demand stream that was propping up the Fence, the Smuggler, and every smith willing to take grey commissions. Beating an officer is an economic act on both ends — it enriches whoever took the plunder, and it starves an entire supply chain that had quietly organised around feeding him.

## 31. Counter-play

An officer that only accumulates becomes unbeatable, so every one is beatable by *information and politics* as much as by force:

- **Documented weaknesses**, discoverable through play or purchased from Information Brokers.
- **Rivals.** Killing a competent Captain promotes whoever is best positioned — sometimes a fool. Players can farm the org chart deliberately.
- **Bribery.** Officers hold purses. They can be bought, and they can betray you back.
- **Embezzlement.** Report an officer's skimming to the Grey King and watch him handle the problem himself.

**Mortality runs both ways.** Officers die permanently too. No respawn: the rank opens, a successor is promoted, the holding is freed, and the plunder is on the floor. Whoever took it is now notable — and the Grey King notices *them*.

## 32. The Grey King acting personally

His bounded action space gains verbs that are personal and cruel rather than administrative: mark a player (public bounty, officers redirected); plunder an assassination; seize a specific parcel; **desecrate a maker's mark**, voiding a dead smith's surviving works — an atrocity against the economy and against a person's memory; withdraw maintenance from an inhabited territory to accelerate its rot; offer a named player a bargain (your settlement spared, for your guild); and address someone directly, by name, citing their dead.

**None of this weakens the safety architecture.** Every verb above is a legal, budgeted, chain-validated action inside the existing rule box. A crueller Grey King is a larger action space, not an unbounded one — which is exactly why the rule box was worth building.

## 33. The best antagonists are players

Banditry is Grey King-funded (locked above), so notorious player-killers accrue marks and reputation on the same Host — and can be **plundered into actual rank**. A player can take a lieutenancy in his Host.

This is worth stating plainly as a design priority: the most frightening antagonist in this game should eventually be a *person*, running a real organisation, with a public record. That is emergent, unpatentable, cheaper than any NPC system, and more menacing than anything we can author.

## 34. IP posture — deliberately not the Nemesis System

Warner Bros. holds US 10,926,179 and related patents (granted 2021, running to roughly 2036) over the Nemesis System. The claims are narrow and specific: an NPC that killed the player being procedurally promoted into a **persistent personalised rival that remembers and references that player's specific prior encounters**, inside a power hierarchy the player's actions reshape.

Long-standing prior art we are free to use, and are using: ranked enemy hierarchies, named unique enemies with distinct traits and loot, enemies that grow stronger with kills, bounty hunters that pursue the player, ambush, theft, assassination, faction grudges, territorial NPCs, and persistent-world reputation.

**The design decisions that keep us clear, and which must not be quietly reversed later:**

1. **Motivation is contractual and public, not personal.** Officers act on marks anyone can read, not on grudges. An officer has a caseload, not a nemesis.
2. **No personal-rivalry memory subsystem.** Officers retrieve from the Codex — the same public, world-wide memory every entity uses — and cite public record. There is no per-player rival state, and none should ever be added.
3. **Promotion is economic, not duel-derived.** Rank follows plunder and performance against objectives, not "it killed you, so it levels."
4. **Hierarchy is an org chart with a job**, driven by territory and collection, not a fighting ladder the player climbs.

Get IP counsel before ship — not before design. And never market it with the word "nemesis."

---

# PART III — ARCHITECTURE

## 35. The tier split

> **Consensus is a ledger of conserved quantities and irreversible transitions. The simulation is a solver of continuous fields. The client is a renderer of appearances.**

| Tier | | Authority | Latency |
|---|---|---|---|
| **T0** | Consensus (the chain) | Absolute | 1–2 s |
| **T1** | Realm Shards (Warden quorums) | Authoritative, checkpointed | 50–150 ms |
| **T2** | Client | None (prediction only) | 0 |
| **T3** | Indexers, chat, spectator feeds | None | — |

**Decision rule — three gates.** For any state: (1) *Stakes* — would forging or losing it permanently take something from someone who did not consent? If no, it is T1 or below. (2) *Arbitrability* — can a dispute be settled by a cheap deterministic check in one block with a bounded witness? If no, T0 can hold only a **commitment plus an escrow that makes lying unprofitable**. (3) *Rate* — does it change more than once per block per player? If yes, T0 holds a digest, never the live value.

| State | Tier | Note |
|---|---|---|
| Fine position, hunger, thirst, temperature, HP | T1 | Never touches chain. Gate 3 fails catastrophically |
| **Coarse position** (realm/zone/shard) | **T0** | A *jurisdiction record* — it defines which quorum may certify your death |
| Working inventory (bulk goods) | T1 | Escrowed; per-epoch Merkle root per character |
| **Marked items, deeds, relics** | **T0** | All three gates pass |
| **Death** | **T0**, adjudicated | Originates T1, settles T0 (§39) |
| **Provenance / maker's marks** | **T0** | The entire point is that it is provable |
| **Sigil state, realm gating** | **T0** | Monotone, server-wide, irreversible |
| **Corruption (per territory)** | **T0** | EndBlocker, once per epoch — cheap, and the strongest "chain is the world" mechanic |
| Corruption field (per tile), creatures | T1 | Derived from the T0 scalar |
| Market: marked items, land | **T0** | Atomic settlement |
| Market: local barter | T1 | Nets out in the epoch receipt |
| Player petitions to the Grey King | **T0 by commitment** | Bundle root in the receipt; bytes in DA |
| Chat, VFX, camera, UI | T2/T3 | No stakes |

## 36. The simulation tier: Warden Quorums

**Why not Xaya-style game channels.** Xaya's GSP model is instructive as a *contrast*: all moves go on-chain and each GSP simply replays them, so its off-chain tier is not trust-minimized at all — it exists to absorb PoW reorgs, a problem BFT finality already solves. True state channels fail here for three structural reasons: membership in a zone changes every few seconds; **interaction is non-consensual** (the person you are robbing does not want to sign, and refusing to sign becomes the defense); and "settle on-chain from the last signed state" is tractable for chess, not for 3000 entities under a continuous survival tick. Keep channels for exactly one thing: consensual bounded two-party subgames — duels, arena wagers, escrowed trades with a hidden reveal.

**Recommendation: replicated deterministic shards.** Each zone is simulated redundantly by a small, bonded, VRF-sampled committee (n = 5–7) running a bit-identical tick function, ordering inputs by lightweight BFT, and threshold-signing an **epoch receipt** to the chain every ~30 s carrying `{prev_root, new_root, input_log_hash, events, deaths, handoffs, petition_root, corruption_delta}` plus a DA attestation.

Divergence is caught in ~100 ms by honest replicas comparing roots — not in a seven-day window by a hypothetical watcher. **Replication converts "optimistic, hope someone checks" into "checked continuously by construction."** Fraud proofs remain a backstop, not the primary mechanism.

*Trust assumption, plainly:* fewer than 1/3 of a bonded, rotated, randomly-sampled committee collude. Small n makes this **weaker** than the base chain, which is why §39 layers defenses on death that do not depend on the quorum at all.

**Determinism discipline — non-negotiable, from line one.** No floating point anywhere in the tick (fixed-point i64; floats only in the renderer). No map/hash iteration — sorted, stable entity ordering. No wall clock, no OS randomness; time is tick count and randomness is per-entity ChaCha streams seeded from `hash(epoch_seed, entity_id, tick, tag)` so adding an entity does not perturb everyone else's rolls. Pinned binary digest registered on chain. **The tick function is a pure library with two compile targets** — the Warden binary, and a Cosmos keeper for single-tick adjudication later.

**Shard failure.** No receipt within a grace window → shard marked STALLED; **no death certificates accepted for that interval** (a dead server may not kill you); players may `MsgEvacuate` against the last committed root, losing at most one epoch; the zone's corruption holdback is zeroed (otherwise stalling your own shard becomes a way to freeze a losing front and to become immortal); the shard is re-sampled and rebuilt from the DA input log. Because state is reconstructible from `(committed root, input log)` and both are chain-attested, **a Realm cannot be permanently lost by operator exit.**

**Data availability.** Input logs go to a DA layer, root in the receipt; receipts without DA attestation are invalid. Plus a fallback that costs nothing: **clients retain a rolling window of input logs, so a player disputing their own death already holds the data.** Your users are your DA fallback for exactly the disputes they care about.

## 37. The Pool — one compute market, and a villain that grows with it

Two operator sets were drifting apart in this design: Warden quorums running simulation, and the Oracle Committee running inference. **Unify them into one bonded pool** that sells three kinds of work — simulation shards, inference, and DA/storage — sampled by VRF per role, paid from land upkeep, fees and protocol emission.

And then the good part:

> **The Grey King's intelligence is a function of the pool's size. As the network grows, the villain gets smarter.**

This is worth having for three reasons beyond how good it sounds. It makes difficulty scale automatically with population, so the game cannot be trivialised by growth. It gives operators a visible, narrative reason their contribution matters. And it means the thing hunting you is *made of the same infrastructure that runs your world* — which is thematically exact for a villain who took over the world's administration.

### It must grow in ratified steps, not continuously

Determinism is the binding constraint: every committee member must run a byte-identical configuration, so intelligence cannot be a smooth dial reacting to live capacity.

**Intelligence Tiers.** Pool capacity, measured as a slow-moving average so it cannot be gamed short-term, maps through a published step function to a tier index recorded on chain. Each tier pins an exact configuration — model weights hash, adapter set, context length, retrieval depth, tick frequency, planning horizon, and how many Captains run full inference rather than templates. Crossing a threshold does not take effect immediately: it *proposes* a tier change, which activates at the next Era boundary after the standard review window (§16).

Growth vectors, concretely — "smarter" should mean several distinct things:

| Vector | Effect in play |
|---|---|
| Model tier | Better strategy, better manipulation, better prose |
| Context length | Holds more of the world in mind at once |
| Retrieval depth | Remembers more players, further back |
| Tick frequency | Acts more often |
| Planning horizon | May submit multi-step directives, not just single actions |
| Captain coverage | More of its officers become genuinely intelligent |
| Ratified adapters | Accumulated learning from every Era (existing design) |

**It shrinks too.** If the pool contracts, the tier falls at the next boundary. The world's danger tracks the network's real capacity in both directions, which is honest and keeps the game playable if the project shrinks.

## 38. The Fetters — what it can never do, at any tier

Growing intelligence is only safe if the cage never grows with it. **It gets smarter; it never gets freer.**

These are absolute. They are not amendable by governance, not liftable by an adapter, not relaxed at any Intelligence Tier, and not subject to any Era vote. **The parallel to the fiction is exact, not decorative:** the working itself obeys rules Emeric did not write and cannot bend — it transfers one way, to whoever kills the holder, and no amount of his will changes that (§2). The system that plays him is bound the same way. He is powerful. He is not free. Neither is the thing standing in for him.

1. **It cannot touch the Hoard.** Not spend, not authorise, not propose a rule that spends. One outflow: a validated victory claim.
2. **It cannot mint, destroy or move any asset outside its own budgeted purse.**
3. **It cannot change its own rules, weights, tier, or these fetters.** Model changes come only from governance ratification at an Era boundary, and it gets no vote.
4. **It cannot kill.** Death originates only in the deterministic simulation and settles only through the death court (§39). No Grey King action may produce a death certificate.
5. **It cannot act outside the published action space.** Illegal actions are rejected even at full committee quorum.
6. **It cannot exceed its per-tick and per-Era action budget.** No action storms.
7. **It cannot see anything a player cannot.** It reads chain state and the Codex — public information only. No IP addresses, no account data, no real identities, no private messages.
8. **It cannot contact anyone outside the game.** Ever, by any channel.
9. **It cannot make a binding promise.** Anything it offers is real only if it is a legal, budgeted, chain-validated action. It may *say* anything; saying is not doing.
10. **It cannot outlast the Understudy.** If inference diverges or the committee stalls, the pure-code policy plays it and the world moves on.
11. **It cannot be a single point of failure for progression.** Every Sigil, including the Shards that assemble into his name (§13A), must be solvable from world state alone, so that a model outage, refusal or failure can never soft-lock the game.

### Two implementation rules that make the list real

**Fetters live in code, not in the prompt.** A rule in a system prompt is a suggestion to a system whose whole job is generating text. A rule in the validator is a fact. Anything on this list that exists only as prompt text is not a fetter and must not be counted as one.

**Prefer inexpressible over rejected.** Wherever possible a forbidden action should have no representation in the typed action space at all, rather than being emitted and then caught. There is no `Transfer` verb that names the Hoard; there is no verb that produces a death. Catching violations is the fallback, not the design.

Every fetter must also be checkable cheaply by any node — these run on the common path, at full quorum, on every tick.

## 39. Trustless death settlement

The highest-stakes path in the system: it originates off-chain and permanently moves real assets.

**A. Escrow on entry, not on death.** A character's entire estate moves into a per-shard escrow account *before play begins*. Death does not seize anything — the assets were immobilized before the risk began, so there is no window to front-run settlement and no race at all. The asymmetry this buys:

> **Death is instantaneous. Extraction is slow.**

Getting loot *out* requires a quorum-signed receipt and a dispute window. Dying needs none, because it is a move between two accounts the player never controlled. The tension goes where the risk is — walking out of the dungeon should be the frightening part. `x/hoard`'s halt invariant extends to escrow: **it may drain to exactly two destinations — the Hoard on finalized death, or the owning soul on finalized extraction.**

**B. The Death Certificate.** Quorum-signed, carrying shard/epoch/tick, character, cause, killer, pre-root, input log hash, DA attestation, estate digest, replay witness, and an optional player ack.

**C. The Soul-Tether.** Clients sign a tiny per-tick ack with a session key. Critically, this is **not** a precondition for dying — requiring the victim's signature would make disconnecting a perfect defense. Instead: **death is unconditional; the *rewards* of death are conditional on the ack.** An acknowledged death earns the soul its obituary, reputation, ascension credit and eligibility for the victory payout to the fallen. An unacknowledged one still moves the estate. Repudiation is strictly self-harming, so there is no gradient toward client tampering — and the honest case settles in one round, sub-second. Second use: **absence is evidence.** Combat-logging leaves an NPC-controlled body in the world; you cannot disconnect out of a fight.

**D. Adjudication, cheapest first.**

1. **Unconditional sanity checks on every certificate** — the bounded-action-space idea applied to the sim, and the highest value-per-line defense in the system. Reject if: the character was not in that shard; the tick is outside the committed epoch; a death record already exists; the estate digest disagrees with escrow; the killer had no presence ack or was farther than max speed × elapsed ticks allows; a vitality cause is inconsistent with the last checkpointed vitals (someone who checkpointed at 80% hunger cannot starve 20 seconds later); or the shard exceeded its **per-epoch death cap**. A rogue quorum literally cannot mass-kill a zone.
2. **The Vigil.** Acknowledged deaths finalize immediately. Unacknowledged ones open a 60–120 s window — free, because escrow means the delay protects nobody's escape. Disputes may be filed by the player, by an **Advocate** the soul designated (guild officer, watchtower service, phone key — this is how a sleeping player is protected, and it must exist because *the defense against a false death cannot require the victim*), or automatically when a shard's death rate trips an anomaly threshold.
3. **Escalation.** A fresh, larger committee (15–21) sampled by VRF from the global pool — colluders cannot pre-buy their auditors — replays the epoch and votes. Losers are slashed. **Be plain: this is a re-sampled honest-majority vote, not a fraud proof.** It is weaker than a cryptographic proof and it is the right call for now because it is buildable in months. Do not call it a fraud proof in public material.

**Upgrade path, designed now and built later:** interactive bisection down to a single tick, executed on-chain by the same tick library compiled as a keeper. Arbitrum-shaped and proven — and reachable *only* if the sim is bit-deterministic, fixed-point and Merkleized from day one. Hence §43's Phase 0.5.

**E. Irreversibility.** A false death caught in the Vigil is voided and the character restored (never resurrected — it was never dead on chain). A false death discovered *after* finalization stays dead; compensation comes from the slash. Constitutional limit #2 gets no exception, because an exception is precisely the lever a captured governance would use — which makes **Vigil length a first-class safety parameter, not a UX knob.**

**F. Suppression is the profitable attack.** Forging a death gains a quorum little (the estate goes to the Hoard, not to them). *Suppressing* one — protecting a colluder or an alt — gains real ongoing value. So any player with a presence ack may report an uncertified death, and **the suppression slash is set several multiples above the forgery slash.**

**G. Residual risks, stated rather than papered over.** A 2/3-colluding quorum plus DA withholding can produce a self-consistent lie for one epoch; bounded by death caps, DA requirements, anomaly escalation and rotation, but not zero. Shard leaders can front-run within a tick — needs commit-reveal or VRF intra-tick shuffling **on day one of PvP**, not Phase 5. Public replayability destroys fog of war, and there is no clean crypto fix at this budget — so **design this world as an open-information one** (as EVE and Huntercoin are; it suits a systems-first game) with commit-reveal for the few mechanics that need concealment. Botting is unsolved industry-wide; the honest mitigation is economic — bonded entry, and the fact that bots die too and everything they owned becomes prize money.

## 40. Modules

**Also new:** `x/pool` (the unified operator market — bonding, VRF role sampling by work type, payment, Intelligence Tier accounting) absorbs what §40 previously split between `x/warden` and the Oracle Committee. `x/testament` (signed player attestations and corroboration weighting — the truth layer from §3) and `x/commons` (kindness standing) are small but thesis-critical; neither can ship before the sybil work in §41, since both are farmable by alt-pairs otherwise.

**Existing, changed.** `x/mortality` is **rebuilt** as the death court (certificate ingestion, sanity checks, Vigil, dispute, finalization) rather than a combat resolver. `x/hoard` gains an inflow from escrow and extends its halt invariant — **re-fuzz it**. `x/overlord` gains realm-scale verbs (corruption pressure allocation, spawn biasing, sigil repair) issued as **committed directives shards must obey**, with disobedience visible as a root a verifier quorum rejects. `x/season` becomes a multi-input controller (survival rate, corruption-front position, ascension pace). `x/soul` and `x/ward` gain session keys, Advocates, and the operator bonding pool. `x/codex` is unchanged but its corpus grows enormously.

**New.** `x/warden` (operator pool, shards, epoch receipts, disputes — the tier boundary and the highest-risk new module) · `x/vault` (escrow, extraction, conservation invariant) · `x/realm` (topology, occupancy, sigils; opening is an EndBlocker transition, never a message) · `x/blight` (corruption, EndBlocker, a few hundred territories in fixed-point) · `x/demesne` (parcels, deeds, leases, upkeep — a natural funding source for Warden operators) · `x/forge` (recipes, maker's marks) · `x/bazaar` (markets — named distinctly from `x/agora` governance) · **`x/captains`** (officers, ranks, traits, plunder, holdings, marks, informants, discharge and contest).

`x/captains` needs care in two places. Officers are **T0 identities with T1 behaviour** — persistent, named, carrying real recoverable loot — which is exactly the split players already use, so it costs no new architecture. And officer generation must be **deterministic from a chain seed** (traits, name, weaknesses), which the Phase 0.5 determinism discipline already requires.

**Sixteen modules is the biggest schedule risk in this plan.** Build in strict order: `x/hoard` → `x/soul` → `x/vault` → `x/warden` → `x/mortality` → `x/realm` → `x/blight` → `x/captains` → `x/forge` → `x/demesne` → `x/bazaar`. Everything from `x/captains` onward can slip. **Nothing before `x/mortality` can.**

## 41. Voting integrity

**Locked requirement: one solid vote per account; one active account per device at a time; votes scoped by device and IP, so manipulation requires physically distinct devices and connections.**

Implementation: a device holds exactly one authenticated account session at a time, and account switching on a device is rate-limited with a cooldown that spans a voting window. Every vote carries a device attestation and a network-scope hash. Within one proposal, a device casts **one** vote regardless of how many accounts have been signed in on it. Vote records are clustered by device and network scope and published, so anyone can audit the distribution.

That closes the cheap attack — one person, one laptop, forty wallets — which is genuinely the most common one. Build it.

**What it does not close, stated plainly because this treasury is worth attacking:**

- **IPs are cheap in bulk.** Residential proxy networks sell endpoints for cents; a mobile connection cycles IPs on demand. IP scoping multiplies a casual attacker's effort; against someone funding an attack proportional to the Hoard, it is a speed bump.
- **Hard IP rules punish real players.** Households, student halls, offices and — critically — mobile carriers behind CGNAT put thousands of unrelated people on one address. A strict one-vote-per-IP rule disenfranchises families and whole regions of mobile users. **So scope by IP, don't hard-block by it.**
- **Device attestation on the web is soft.** Browser fingerprints are spoofable. Real attestation needs platform APIs (Play Integrity, App Attest) and therefore native clients — and those are bypassable too, just more expensively.
- **This is personal data.** Device identifiers and IPs trigger GDPR/CCPA obligations: disclosure, a lawful basis, retention limits. Worth designing in now rather than retrofitting.

**So treat device and IP binding as a cost-multiplier, not the wall.** Three layers behind it:

1. **Proof-of-play weighting carries the real load** (already in the design: `stake^0.5 × play_score`). You cannot fake four hundred hours of surviving the Moorfen from a proxy farm — the cost of a sybil is *time spent in a lethal world*, on a bonded account that can die permanently. This is the strongest sybil resistance the game has, and it is strong precisely because the game is hard. Weight voting power heavily toward it.
2. **Cluster analysis, not rejection.** Dense device/IP clusters get *reduced weight* or a demand for additional proof-of-play — never an outright block, so a family on one router is inconvenienced rather than silenced.
3. **Proof of personhood for governance only** (World ID, BrightID, or a staked social-graph attestation) is the one primitive that actually delivers one-human-one-vote. Optional, adds friction and a dependency; worth evaluating before any vote that can move real value.

**And the strongest mitigation is the one already built: governance cannot touch the Hoard.** Constitutional limit #1 means even a fully successful capture wins the attacker nothing but the rules. Removing the payoff is worth more than any amount of sybil detection, because sybil resistance is a permanent arms race and an empty prize is permanent.

## 42. Bots — the one place the chain is an advantage

Earlier this plan called botting "unsolved industry-wide," which is true and insufficient. A real-value economy will attract industrial farming, and bots kill economies through item monopolisation and market flooding.

But the research points at something useful. Gold-farming operations are not lone bots — they are **three-part organisations**: farmers who gather, merchants who convert, and bankers who hold. They are caught not by spotting one bot but by **network analysis of the money flow between those roles**. Traditional MMOs have to mine private server logs to reconstruct that graph.

> **We publish the graph by construction.** Every transfer, every market fill, every estate settlement is permanent public record. The forensic artefact other studios spend years building is our default state.

So the strategy inverts. Don't fight bots at the client, where you lose. Fight the *operation* at the ledger, where the evidence is already public and permanent:

1. **Ledger forensics as a first-class product.** Publish clustering and flow-analysis tooling over the public graph. Farmer→merchant→banker topology is visible to anyone.
2. **Make it a player activity.** Bounties for identifying farming networks, filed as evidence with a dispute process so it is adjudication and not a witch hunt. Investigators become a real role — and the Information Broker profession gets another product.
3. **Behavioural analytics at the sim tier**, run by Wardens over input timing and movement patterns. Published research reports detection accuracy around 96% against known-banned accounts, so this is a mature technique, not a hope.
4. **Bonded entry** (`x/ward`) makes every farming account cost real capital up front.
5. **The economic trap already in the design:** bots die too, permanently, and everything a dead bot owned goes to the Hoard. The cheapest attack is a donation.
6. **The thesis is itself a defence.** If the highest returns require genuine cooperation, trust, communication and reputation with strangers (§3), the most profitable play is the hardest one to automate. That synergy is worth protecting when tuning — anything that makes solo grinding optimal makes botting optimal.

**Stated honestly:** this is an arms race and it is never finished. The claim is that we start it holding better evidence than anyone else, not that we win it.

## 43. Throughput

Assuming 1.5 s blocks and a conservative 500 tx/s budget: at **10,000 concurrent players (~60 shards), roughly 12 tx/s — about 2.5% of budget.** At 100,000 CCU, ~120–140 tx/s. The chain is nowhere near the bottleneck.

Two lines do all the work: zone handoffs and petitions to the Grey King would naively cost ~27 tx/s combined, more than everything else together. Batched into receipts and commitments they cost ~0. **The epoch receipt is a rollup batch, and that is the scaling lever** — on-chain rate is O(shards), not O(players).

**What actually breaks first, in order:** IAVL commit cost from *write breadth* (why hunger and position must never be chain state, and why receipts write one key per shard, not per player); state growth (~1 GB live IAVL at 100k souls, plus an unbounded Codex — put the corpus in content-addressed storage with only its index hash on chain); RPC load (10k clients polling will melt public RPC long before consensus notices — **budget a real indexer tier as part of the product, not ops**); and sim compute (~300 cores at 10k CCU), which is the recurring cost that scales with decentralization.

---

# PART IV — EXECUTION

## 43A. Engine — not custom, and not RimWorld's stack either

RimWorld and Project Zomboid are the right games to study. Neither is the engine to copy.

**RimWorld runs on Unity, in C#.** Its actual trick is **Defs** — content (items, recipes, pawns, biomes) described as plain XML, loaded by the engine, with **Harmony** letting mods patch behaviour without touching source. That is how one person built something this deep: Unity handled rendering and physics for free, so nearly all his time went into content and rules, not engine plumbing.

**Project Zomboid genuinely does use Lua.** It is a custom Java engine (Indie Stone's own, on LWJGL), with **Kahlua** — a Lua-in-Java implementation — running most of the actual game logic: items, professions, zombie behaviour, UI. Performance-critical work stays in Java; everything that changes constantly lives in Lua.

**The lesson from both is the same, and it is not "write your own engine."** It is: *separate the engine from the rules, and put the rules in a layer you can iterate on without recompiling.*

**Decision: no custom engine.** A renderer, physics and asset pipeline from scratch is exactly the infrastructure-before-the-game trap §49 warns against. Stage B stays TypeScript + Canvas, per §44 — ships fast, zero install, matches the solo-team reality.

**Decision: Defs, not Lua.** RimWorld's XML-Defs pattern, adopted directly — content as JSON/TOML data files (recipes, creatures, Sigil parameters, dialogue tables), hot-reloadable, editable by one person or by Claude without touching engine code. Where a Def needs computed logic (a yield formula, a corruption-tick rate), it calls into **a small fixed-point expression language we write ourselves** rather than a general scripting VM.

This is where our situation genuinely differs from Zomboid's, and why real Lua is the wrong call for us specifically: **Phase 0.5 requires bit-exact determinism** — fixed-point math, no floats, because the eventual chain phase depends on independent nodes reproducing identical state (§43, Phase 0.5). A Lua VM's numbers are doubles by default. Embedding one means hand-disciplining every script, forever, to avoid a float op — a rule that is easy to break once and hard to catch when it happens. A DSL we control can simply not have a float type. It is a weekend of work and it removes an entire class of bug before it can exist.

## 44. The real plan — two people, evenings, near-zero budget

**This supersedes §45 for the foreseeable future.** §45 is the funded-team sequencing, kept because it is correct *if* this ever gets staffed, and because it is what a collaborator or investor would want to read. It is not what we are doing.

Four stages. Each one ends in something a stranger can experience, and each one is allowed to be the last.

---

### Stage A — The Voice · 2–4 weeks of evenings · a few dollars

**Not a game. A character.**

Write `GREYKING.md` as a prompt-grade character bible — Aurel, Emeric, Maren, the working and what it actually is, the mystery he will never confirm, the patient register of his voice. Then a small script: a terminal or single web page where you speak with him, he remembers what you have done, and he tells you how you died.

**Why this first:**
- It is the most distinctive thing the project has, and it is *writing*, which is the one axis where a solo person beats a studio outright.
- It costs almost nothing and takes weeks, not months.
- **It is publishable immediately.** Post transcripts. If people find him genuinely unsettling, you have proof the core works. If they shrug, you learned it for the price of a coffee.
- It becomes the marketing asset, the recruiting asset, and the spec for every later phase.

**Gate:** show transcripts to twenty strangers. Do any of them say something like *"that's creepy"* unprompted? That is the whole test.

---

### Stage B — The smallest loop that can kill you · 2–3 months

A browser game. One zone. Single-player or two or three people, no more.

**In:** hunger, thirst, cold. Gathering → one crafting chain → a tool you need. Permadeath with a soulbound lineage that remembers. **One officer** who hunts you, survives, gets richer, and wears what he took. The Grey King speaking at the moments that matter — your first kill, your death, your heir's first steps.

**Out:** everything else. No chain, no multiplayer economy, no Realms, no Sigils, no magic, no governance, no ecology.

**Tech:** TypeScript, canvas, local state or the cheapest possible server. Write the sim in fixed-point with a seeded RNG from line one — it costs nothing now and is unfixable later.

**Gate:** does dying hurt, and do you start again anyway? If you don't feel that yourself, playing your own game, nobody else will.

**The Stage B cut — named, so it can't quietly grow.** The rest of this document is a world bible, not a build target. When a build decision comes up, it gets checked against this list, not against everything above.

- **Realm:** the Verge. Nothing else exists yet — not even as an empty map.
- **Professions, in scope:** Farmer, Hunter, Miner, Logger, Charcoaler, Smelter, Blacksmith, Leatherworker, Tanner, Herbalist. That is the sword chain (§15) plus what feeds a person day to day. Everything else in §17's sixty-odd professions is later.
- **Creatures, in scope:** one docile (river-goat), one aggressive Wild (bog-lynx), one Grey-touched (ash-hound). Three animals, not a bestiary.
- **The economy:** barter only. No salt-weight, no crowns, no market (§17A, §23A are Stage C or later).
- **The officer:** one Lieutenant. No Captain, no Warden, no Muster (§29A) — a Lieutenant ambushing alone is plenty of antagonist for one zone.
- **Land, guilds, ecology population math, the Shards:** all out. A death has an obituary line, not a Barrow-list; that is enough weight for one person playing alone.

If a session's work doesn't map onto something in this list, it is design for later, not a Stage B task — valuable, but not what gets coded next.

---

### Stage C — Does the thesis hold? · 3–6 months

20–50 real people on one ordinary server. Postgres. Still no chain.

**Add:** the corruption front with tending, the Grey King's captains properly (a few Lieutenants, one Captain), trade between players, marks and corpse bounties, the Teacher/apprentice bond, Commons standing.

This is where you find out whether the whole argument is true: **does cooperation actually beat predation when real people are involved, or does the Grey King's thesis win?** No amount of design settles that. Only players do.

**Gate:** strangers defending a corruption front without you scheduling it. Insurers or lenders emerging unprompted. D7 above 10%.

---

### Stage D — Permanence · conditional, unscheduled

Only if Stage C works, and realistically only with contributors or funding. This is where §45 becomes relevant again and the chain conversation starts — because at that point there is a population and real value, which is the only situation where trustlessness is worth its cost.

**Do not promise this to anyone until Stage C is done.** Including yourself.

---

### What to do this week

Write `GREYKING.md`. That's it. Nothing else on this list matters until he can speak.

## 45. Phases — the funded-team version (reference)

*Kept for the day this gets staffed, and because it is what a collaborator will want to read. Superseded by §44 in practice.*

Each phase below states the **one question it answers**, explicit in/out scope, workstreams, exit gates, kill criteria, and the team it needs. A phase is not done when the code works; it is done when its gates pass.

**The governing principle:** cheap phases must be able to kill the project before expensive ones start. Phases 0 and 0.5 together cost roughly four months and a small team, and between them they answer the only two questions that decide whether the remaining several years are worth spending — *is it fun*, and *is the simulation bit-deterministic*.

### Continuous workstreams (all phases)

Four things run from Phase 0 to the end rather than living in any single phase:

| Stream | Why it can't wait |
|---|---|
| **The Grey King's voice** (flavour tier) | Touches no state, carries no consensus risk, and is where nearly all the emotional and marketing value lives. Runs publicly from Phase 0. |
| **Economy modelling** | The liquidity model, cooperation-vs-predation curve and plunder rate are the three most likely quiet deaths (§22, §3, §30). Specialist work, not engineer spare time. |
| **Legal** | Gambling framing, the §34 IP posture, and §48 wind-down documentation. All must land before Phase 6, and all take months. |
| **Community** | Playtest cohorts from Phase 0 become the Era 0 population and the red team. Built slowly or not at all. |

---

### Phase 0 — Is it fun? · 10–12 weeks

> **Question:** do people come back after dying?

**Build:** single-process simulator, minimal 2D web client, one biome, one zone, ~50 concurrent players.

**In scope**
- Survival: hunger, thirst, temperature, exhaustion, injury
- Mortal Wound, rescue, permadeath, soulbound lineage, knowledge degradation
- Gathering → refining → crafting across ~15 recipes and ~8 professions (one full chain per §15)
- One corruption front with tending-based holdback
- The Grey King's captains at small scale: marks, 3–4 roaming Lieutenants, one Captain in a stronghold, ambush, theft, plunder growth
- Limited PvP with corpse bounties — **thesis-critical, not optional** (§3)
- The Grey King's voice: narration, obituaries, addressing players by name
- Camp/field logout rule

**Out of scope:** any chain, land, markets (barter only), magic, multi-realm, Sigils, governance, Eras.

**Gates**
1. **D7 beats 10%** in a friendly test cohort — EVE's benchmark, which we must exceed, not match (§18)
2. Return-after-death rate measured and non-trivial
3. Players name specific officers unprompted in chat and post-mortems
4. **Spontaneous collective defence** of the corruption front, with no scheduling tools provided
5. Cooperation out-earns predation over the test window (§3)

**Kill criteria:** D7 under 10% *and* post-mortems saying "not fun" rather than "too rough." That distinction is the whole judgement — roughness is tunable, joylessness is not.

**Team:** 1 systems designer, 2 engineers, 1 economy/data analyst, 1 part-time artist, 1 playtest/community wrangler.

**Artifacts out:** telemetry corpus, tuned parameter set, playtest reports, and **the tick function extracted as a standalone library** — which is the input to Phase 0.5.

---

### Phase 0.5 — Is it deterministic? · 4–6 weeks

> **Question:** can the simulation produce byte-identical state on different machines, forever?

This is the most important gate in the project. If it fails, replication detects nothing, disputes cannot be adjudicated, and the entire T1 security model silently degrades to "trust the operator."

**Work**
- Extract the tick into a pure library. **Strongly consider Rust** — `BTreeMap` ordering by default and no ambient temptation toward floats; the language decision is genuinely cheaper to make here than anywhere later
- Replace every float in the tick with i64 fixed-point (floats permitted only in the renderer)
- Replace all map/hash iteration with sorted, stable entity ordering
- Remove wall clock and OS randomness — time is tick count; randomness is per-entity ChaCha streams seeded from `hash(epoch_seed, entity_id, tick, tag)` so adding an entity never perturbs anyone else's rolls
- Merkleize state so a single tick's witness is small — this is what makes Phase 6 bisection reachable
- Pin the container and record a sim-version hash
- Build the record/replay harness and the CI matrix

**Gate:** **1,000,000 ticks × ≥5 environments × 0 divergences**, asserting the state root at *every* tick, not just the end. Environments: x86-64 Linux, ARM64 Linux, macOS ARM, and two differing container/compiler versions. Chaos mode varying spawn order, batch size and thread count must also pass.

**Decision point, not a kill:** if determinism cannot be achieved in the chosen language, **switch languages now**. That is the entire reason this phase sits here — the switch costs six weeks in month four and is close to fatal in year two.

**Team:** 2 engineers. No designers needed.

---

### Phase 1 — Can death settle trustlessly? · 4–6 months

> **Question:** can an off-chain simulation kill a player, move real assets, and have nobody able to cheat it?

The economic safety core. Everything else is content built on top of this being true.

**In scope:** `x/hoard`, `x/soul`, `x/vault`, `x/warden` (single shard, 5 operators, no rotation), `x/mortality` end-to-end, minimal `x/realm`, session keys, Advocate designation, the Understudy, web client on chain.

**Out of scope:** consensus-tier LLM, multi-shard, corruption on chain, Sigils, land, crafting on chain, markets, governance, Eras.

**Workstreams:** (a) chain core and invariants · (b) Warden node, receipt pipeline, DA · (c) death court — certificate ingestion, sanity checks, Vigil, dispute, escalation · (d) client integration · (e) the adversarial harness.

**Gates**
1. **Hoard invariant survives exhaustive fuzzing**, now covering `x/vault` escrow — no message sequence extracts value
2. **Conservation under load** — 10,000 simulated player-hours with total value across escrow + chain + Hoard *exactly* conserved at every block. Item duplication is the classic MMO extinction event and must be a chain-halting invariant, not a test suite
3. **The Byzantine Warden suite** — a deliberately malicious operator that (a) forges a death of an idle character, (b) suppresses a real death, (c) stalls, (d) equivocates on an epoch, (e) withholds DA. Each: detected, correct party slashed, no incorrect transfer finalised; for (c), evacuation loses ≤1 epoch with no duplication
4. **The offline-player test** — a player disconnects, is falsely killed 20 minutes later, and never returns. The Advocate path and anomaly auto-escalation must void it with *zero action from the victim*
5. p95 input→effect under 250 ms with geographically distributed operators
6. p95 death→chain-final under 5 s on the acknowledged path

**Kill criteria:** conservation cannot be guaranteed, or the Byzantine suite cannot be passed. Either means the trust model is wrong, and it must be redesigned before any money is spent on content.

**Team:** 4–5 engineers (2 chain, 2 Warden/infra, 1 client), 1 security-minded QA.

**Artifacts out:** running devnet; the fuzz, conservation and Byzantine suites as permanent CI that every later phase must keep green.

---

### Phase 2 — Does it scale to a world? · 3–4 months

> **Question:** can players move between shards without the economy leaking?

**In scope:** zone handoffs batched into receipts, VRF quorum sampling and rotation, `x/blight` corruption on chain, a second Realm, Sigil #1, evacuation under stall.

**Gates**
1. **1,000 shard crossings with zero estate discrepancy**
2. Corruption front stable under the season controller across a simulated month
3. Forced shard stall → evacuation with ≤1 epoch lost and no duplication
4. Quorum rotation completes without receipt gaps or liveness dips
5. Sigil #1 broken by a distributed test group — and successfully *repaired* by the Understudy when left undefended

**Team:** Phase 1 team, plus 1 designer for Realm 2 content.

---

### Phase 3 — Does the economy hold? · 4–6 months

> **Question:** does a player-run economy under permadeath stay liquid and reward cooperation?

The phase most likely to fail *quietly*, months after it appears to succeed.

**In scope:** `x/captains`, `x/forge`, `x/demesne`, `x/bazaar`, `x/testament`, `x/commons`; the full crafting graph; ecology; magic and the Grey; weather and seasons; settlements and guilds.

**Gates**
1. No duplication path through crafting, verified adversarially
2. The Fall under territory loss settles cleanly
3. **Officer plunder conserved exactly** across kill, accumulation and recovery — it is a live loot pool moving between escrow, officer and player, so it needs Hoard-grade halt-invariant treatment
4. **Liquidity simulation over simulated years** shows circulating supply staying healthy (§22 — the Ultima Online failure)
5. **Cooperation out-earns predation on a long horizon** while predation still pays short-term (§3)
6. Economy closure desk check complete: every pressure → profession → customer, every item → material chain → gathering profession, no orphans
7. `x/commons` and `x/testament` are not farmable by alt-pairs (depends on §41)

**Kill criteria:** if predation dominates at every horizon and cannot be tuned out, the villain's thesis is correct and the game argues against itself. That is a design failure, not a balance problem.

**Team:** +1 economist (essential, not optional), +1 content designer.

---

### Phase 4 — Can the villain live in consensus? · 3–4 months

> **Question:** can an LLM drive world state without ever breaking a rule or stalling the world?

**In scope:** `x/overlord` consensus tier, ABCI++ vote extensions, committee inference, `x/pool` and Intelligence Tiers, Fetter enforcement and its test suite, Codex sharding and retention.

**Gates**
1. **10,000 consecutive ticks at >2/3 convergence**
2. Forced divergence → Understudy takes over with no world stall
3. **Fetter suite green at every Intelligence Tier** and against every candidate adapter — including injection attempts aimed at each individual prohibition (§38)
4. Red team can annoy the Grey King but provably cannot reach the Hoard
5. A tier change activates *only* via an Era boundary with its review window — never immediately on threshold crossing
6. Deterministic Codex retrieval verified across committee members

**Kill criteria:** if convergence cannot be sustained, fall back permanently to the Understudy and ship the villain as flavour-tier only. **The game survives this**; it is a reduction, not a death — and knowing that is why this phase sits after the economy rather than before it.

**Team:** +1 ML engineer, +1 infra engineer for the Pool.

---

### Phase 5 — Does it work with real people? · 3–6 months live

> **Question:** does a real population, playing for real, produce the world we designed?

**In scope:** Era 0 on a valueless testnet. Two Realms, full loop, real players, worthless tokens. Interactive bisection replaces the escalation quorum. **The Chronicle ships** (§47).

**Gates**
1. Controller holds survival rate inside its band over a full Era
2. **Victory is demonstrably achievable** — either achieved, or proven reachable by a measured margin
3. D7 target met at population scale, not just in friendly cohorts
4. Injection red team bounded: irritation yes, Hoard no
5. **Bot forensics catch a deliberately seeded farming ring** using only the public record (§42)
6. Player institutions emerge without collapsing the economy — and insurers exist, which is the tell that the thesis is holding (§24)

**Team:** full team plus live-ops, community management, and a support function that did not previously exist.

---

### Phase 6 — Mainnet, capped stakes

> **Question:** is it safe to let this hold real value?

**In scope:** real value with per-lineage caps, the Warden council active, geo-gating.

**Gates — all external, none self-assessed**
1. Third-party security audit of chain, Warden and death court
2. Independent economic audit of the liquidity and cooperation models
3. **Legal sign-off** on gambling framing, the §34 IP posture, and §48 wind-down documentation — including that no company entity holds keys to the Hoard
4. Incident runbooks and an on-call rotation that has been drilled
5. The dead-man's switch is deployed, published, and its trigger tested on a fork

**Kill criteria:** any audit or counsel that says no. This gate is not negotiable against schedule.

---

### Phase 7 — Widening · ongoing

Additional Realms, a wider Grey King action space, Warden council dissolution on its published sunset, governance handover, and Era cadence settling into player hands.

---

### Critical path and sequencing notes

The strict dependency chain is **0 → 0.5 → 1 → 2 → 3 → 5 → 6**, with Phase 4 able to run parallel to 3 given separate people. Everything before Phase 1 is cheap; everything after is not.

**One uncomfortable resequencing, stated plainly.** The Grey King's consensus tier sits in Phase 4 — the product's identity deferred behind two years of invisible plumbing. The resolution is the split the design already has: the **flavour tier runs publicly from Phase 0**, so the villain has a voice, a name, and an audience from the first playtest. The consensus tier can wait. The voice cannot.

## 46. Intelligence budget

The original design had one LLM adversary; an open world implies thousands of NPCs. The split, per the hierarchy in §27: the **Grey King** is the one bounded consensus actor. **Wardens and Captains** run the Captain pattern — free-form dialogue, but an on-chain purse and permission set, so anything they *do* is budgeted and chain-validated. **Lieutenants** get a light template plus Codex retrieval. **Reavers and everything else are pure code.** A few Unbowed elders sit on the Captain tier as the only voices on the players' side.

Keeping intelligence scarce is a feature before it is a budget constraint. It also bounds the cost line that scales worst with decentralization.

The cheapest, highest-impact use of the flavour tier remains the Grey King addressing players **by name at moments that matter** — a death, a first ascent, a betrayal, a maker's mark he recognises, a mark coming due. It costs nothing and it *is* the "the world is watching you" feeling the SAO comparison is actually about.

## 47. The Chronicle, and how this makes money

Two things flagged as commercially existential in the very first session and never addressed since.

### The spectator layer is nearly free

"Most people watch; few play" was the mitigation for the audience risk, and the structural point was never followed up: **everything worth watching is already public on-chain.** EVE spends real engineering exposing its drama to outsiders. Ours is exposed by construction.

So build **the Chronicle** — a public web view, no sign-up: the live obituary feed, his captains as a standing roll with their kill counts and the marked gear they are wearing, Sigil progress, territory and corruption maps, and the Grey King's public pronouncements. It is marketing, retention and archive at once, and it is what makes an eventual victory mean anything to anyone outside the guild that achieved it.

The audience exists — Twitch and YouTube Gaming carry roughly 1.2B and 1.1B hours of esports viewing respectively, and US esports viewership is projected around 35M in 2026. A permadeath world with a named AI villain and public death records is unusually well-shaped for that attention.

### Revenue

The regulatory flag from session one still binds: Phases 0–3 are valueless, and **revenue must not depend on token speculation** — both because it is the risky path and because a game funded by speculation gets designed for speculators.

Recommended, in order:

1. **Buy-to-play or subscription.** Boring, legal, aligned: we make money when the game is good and people stay. Given the retention numbers in §18, a subscription also gives us the honest metric we need.
2. **Operator fee share** from the Pool (§37) — the protocol's own economics, not a sale.
3. **Cosmetics that cannot touch the economy.** No stats, no materials, no advantage. In a world where maker's marks carry provenance, cosmetic *authorship* is a natural fit.
4. **Land sales — with care.** Deeds are genuinely scarce and genuinely valuable, and selling them is the fastest way to make the game pay-to-win and to attract exactly the regulatory attention we are avoiding. If used at all, primary sales should be capped and mostly ceded to in-world claiming.

**Never:** selling anything that shortcuts survival, mastery, or the ascent. The moment the Grey King can be beaten with a credit card, the premise is dead.

## 48. The promise of permanence, and how this ends

This design has quietly made a promise it has not yet accounted for. "Persistent world, Eras not resets, **nothing is ever wiped**" (see the locked decisions above), combined with permadeath, land deeds and real value, tells players their losses and their works are permanent. A company cannot unilaterally guarantee that. Studios close.

**This is the real argument for it being a chain at all**, and it should be stated as a product promise rather than left as an architectural detail:

1. **The world outlives the studio.** If the company stops, the chain can continue under community operators. That requires it to be true in practice, not just in principle: open-source the node, the simulation library and the reference client under a licence that survives; document operator onboarding; and never let any component that the world *needs* exist only inside the company.
2. **The company must never hold keys to the Hoard.** Already true by construction — no keyholder — but it needs to be legally documented as well as technically enforced, so a bankruptcy administrator cannot form a theory that it is a company asset. Get this in front of counsel alongside the §34 IP work.
3. **Escrow must be recoverable without us.** The evacuation path (§36) already handles a stalled shard. Extend the same thinking one level up: if *no one* is operating shards, souls must still be able to prove and recover their escrowed estates from the last committed roots.
4. **The history must be archivable.** The Chronicle and the permanent Codex tier (§14) should be exportable in bulk by anyone. A world whose entire point is accumulated history owes its players a copy of it.

### The dead-man's switch — DECIDED

The single-outflow invariant has a hole that only opens at end of life. If the world is abandoned, the Hoard freezes forever: real value, belonging to nobody, unreachable. Three consequences follow if it is left unplanned — player value is simply destroyed; someone forks the chain with a modified unlock rule and the claim is settled by whoever holds the most stake; and because value is stuck with no documented path, the company becomes the natural defendant despite holding no keys.

**Decision: a pre-committed dead-man's switch, distributing pro rata by lifetime proof-of-play.**

- **Objective trigger, never a vote.** A governance-triggered wind-down would reintroduce precisely the attack the constitutional limits exist to remove — capture governance, declare an emergency, distribute to yourself — and that attack grows more attractive as the pot grows. A timer cannot be lobbied.
- **The beneficiary set is fixed by history, not by presence.** Distribution goes pro rata to every soul's lifetime proof-of-play against the last finalised state. Someone who stalls the chain to trip it early receives nothing, because they never played. **There is no profit in tripping it**, which is what keeps it from becoming an attack surface.
- **Published at genesis**, so no one is ever trusting a future decision.

**The honest engineering problem.** The trigger must fire when the chain is dead, but the chain must be alive to execute it. Three ways out: a documented social rule for whoever performs a recovery fork (honest, weak); mirrored claim rights on a separate long-lived chain (adds a dependency); or **a threshold set so it fires while the chain is still limping** — degraded and slow but producing. Take the third, and set the window long — a year or more without meaningful finality — so that reaching it is indistinguishable from the world actually being over.

**What it costs.** The invariant becomes "one path, plus a dormant path that requires the world to be provably dead." Marginally harder to audit. **The fetter that matters is untouched: governance still cannot transfer from the Hoard** (§38), because this is not governance.

This is honestly unresolved in the fiction, and it should stay that way rather than be patched with an invented answer: nobody in ninety-one years has had reason to ask what becomes of a working with no one left alive to hold it. If the game ever answers that question, it should be answered by play — a Shard, eventually, not a line in this document.

## 49. The actual team, and what that means

**The team is one person with a full-time job, and me.** No studio, no funding, no economist, no ML engineer, no audit budget. Every estimate above this line was written for a funded team and is wrong for us. This section overrides them.

### The honest arithmetic

Sixteen chain modules, a bit-exact simulation engine, a bonded operator network, an inference pipeline inside consensus, a death court with fraud adjudication, a web client, an indexer, and an economy that needs modelling before launch — at ten to fifteen hours a week, that is not a multi-year project. It is a decade, and it ends in burnout somewhere in year two with nothing shippable.

That is not a reason to stop. It is a reason to change what gets built first, and to be honest about what may never get built at all.

### The load-bearing realisation

**The blockchain is the part to build last, and possibly never.**

Go back through this document and ask which of it actually requires a chain. The villain, his brother, and the working — no. Permadeath as the engine that keeps crafting alive — no. Corruption as a war non-combatants can fight — no. The Grey King's captains, marks, officers who grow rich on plunder and wear your dead friend's sword — no. Weather, ecology, the Grey, settlements, the crafting graph, the counter-thesis that only cooperation wins — none of it.

**A single server and a Postgres database deliver about 95% of this experience.**

What the chain actually adds is trustlessness and permanence: nobody can fake your death, nobody can seize the Hoard, the world outlives the studio. Those matter enormously — *once there is real value and a real population*. Right now there is neither. Building the trust layer before the game is building a vault before you own anything to put in it.

So: the chain is Stage D, it is conditional, and reaching it almost certainly means contributors or funding, because the death court alone (§39) is months of specialist work that one person with a day job will not finish.

### What survives, and what it becomes

| Studio plan | Solo reality |
|---|---|
| Phase 0 simulator | **Stage B** — still the right first build, still solo-scale |
| Phase 0.5 determinism harness | **Adopt the discipline, skip the harness.** Fixed-point maths and seeded RNG cost almost nothing to write correctly from day one and save enormous pain later. The 1M-tick five-platform matrix is over-engineering until a chain exists |
| Phases 1–4 (chain, Wardens, death court, oracle) | **Stage D, conditional.** Not scheduled. Not promised |
| Phase 5 Era 0 | **Stage C** without the chain — same social questions, ordinary server |
| Phase 6 audits and counsel | Only meaningful once real value is involved, which is Stage D |
| Economist, ML engineer, auditors | Do not exist. The economy gets modelled in a spreadsheet, by us, badly, and iterated |

### The real enemy

For a funded team the risk is technical. For one person with a day job the risk is **scope**, and it is close to the only risk that matters. Every cut below is survival, not compromise.

Three rules to hold:
1. **Ship something playable every stage.** A private design document is not progress; a thing someone else can play is.
2. **Never build infrastructure before the thing it supports exists.** No chain before a game, no shards before a population, no governance before a community.
3. **Cost stays near zero.** Free-tier hosting, open-source everything, and keep the LLM spend in single-digit dollars by keeping intelligence scarce — which §37 already argues for on design grounds.

### What the design work was worth

Not wasted. Two concrete assets came out of it: a coherent world with a villain that is genuinely good, and a design document deep into five figures of words. The second is the thing that recruits collaborators — people join projects that have obviously been *thought about*, and almost nobody has this much of it written down.

The villain is the moat. It is writing, not engineering, and a funded team cannot outspend you on it.

## 49A. What history says about projects exactly this shape

Four real precedents, checked rather than assumed, because our situation is specific enough that vague optimism is not good enough.

**Chronicles of Elyria is the one to sit with, because it is uncannily close to our own pitch** — permadeath tied to soul and lineage, dynasties, land, kingdoms, seasons. It raised close to $8M in crowdfunding. [As of 2025 it is in active litigation, not one backer has been refunded, and the developer has described working essentially alone](https://www.mmorpg.com/news/refund-declaration-being-drafted-in-chronicles-of-elyria-lawsuit-2000120563), years past every promised date. **The design was never the failure. Selling the vision before the game existed was.** They took real money for land deeds and kingdom titles against a promise, and let scope keep growing while nothing shippable ever landed.

**Project Zomboid is the mirror case, and it matches our team size almost exactly.** [The Indie Stone started as four people](https://projectzomboid.com/blog/about-us/) doing this as a hobby project, reached early access in 2013 with a real if rough playable core, and grew its depth over **more than a decade** — funded by selling a working thing, never by preselling a vision. [Wurm Online](https://en.wikipedia.org/wiki/Wurm_Online) is the same lesson at even smaller scale: two people, one of them Notch before Minecraft, a spare-time project for years before it was ever a company, and it is still running today.

**[Eco](https://en.wikipedia.org/wiki/Eco_(2018_video_game)) is the closest thematic validation.** A live, working game where players must cooperate — governance, custom currencies, specialisation, a simulated ecosystem — to stop an existential threat before it, or their own excess, ends them first. That is startlingly close to §3's actual thesis, and it is proof the *core fantasy* sells on its own merits, separate from anything this document argues for it.

**Three rules follow, and they bind, not just advise:**

1. **Never presell speculative ownership before Stage C is real and playable.** No land deeds, no founder titles, no "reserve your kingdom" — ever, before there is a working thing to point at. That exact mechanic is what turned Elyria from a design document into a federal lawsuit.
2. **If this is ever shown to anyone, show the playable build, not the bible.** This document is for recruiting a collaborator privately, the way §49 already says. It must never become the public pitch — that is the move that let Elyria's backers believe they had bought a finished vision rather than a plan.
3. **Time-scale honesty, said out loud.** Four people took Project Zomboid over a decade to reach its current depth, funded by a working core the whole way. We are building something considerably more ambitious with effectively one active builder. "Huge" is genuinely achievable — every precedent here says so — but the honest timeline is years to a decade-plus, not a launch event, and pretending otherwise to ourselves is the first step toward pretending it to anyone else.

## 50. Deliverables

Documents, not code, and in this order — world design determines what state exists, and what state exists determines the tier split.

0. `doc/world/CONTENT.md` — **written.** The flat index over everything below: every creature, material, item, crafting chain, profession, command, Realm, Sigil and custom this document names, in one enumerable list, each tagged for whether it exists in code, is specced here, or is only a name. It exists because this plan is organised by *argument* rather than by type — the creatures are spread across §7, §7A, §9, §13 and §44, and his verbs across §3, §29, §29A, §31 and §32 — so "what is there?" was a question nothing could answer in one place. Every document below expands one of its sections; it is the map, not the territory, and where it disagrees with this plan, this plan wins.
1. `doc/world/WORLD.md` — the Grey King's reign premise, the Grey King's voice, the Realms, corruption, creature factions, Eras.
2. `doc/world/SURVIVAL.md` — needs model, tick rates, pressure→profession derivation, offline/camp rules, Mortal Wound.
3. `doc/world/PROFESSIONS.md` — full tree, mastery and post-death degradation, teaching, crafting graph.
4. `doc/world/ITEMS.md` — item schema, **material properties that interact with the survival model** (§22), quality/durability/decay, maker's marks, Realm-gated tiers.
4b. `doc/world/MAGIC.md` — the Grey, discharge and assumption, the four callings-in, true names.
4d. `doc/world/SIGILS.md` — the seven, their collective-action requirements, repair mechanics, and the Shard placement map for Name.
4e. `doc/world/ONBOARDING.md` — the first hour, apprenticeship yield, early-Realm tuning for rescue density, and the D1/D7 instrumentation plan.
4f. `doc/world/COMBAT.md` — commitment model, tick and latency budgets, disengagement, wounds, commit-reveal ambush.
4c. `doc/world/GREYKING.md` — Emeric Vale, Aurel, Maren, the working, the Shards and where they are seeded, and the dialogue register. **This is the model's character bible** — it is what keeps the LLM in voice across Eras, so it needs to be written as a prompt-grade document, not as flavour text.
5. `doc/world/CAPTAINS.md` — the hierarchy, marks and discharge, assignments, plunder growth, counter-play, the Grey King's personal action space, **and the IP posture in §34 written down as a standing constraint** so it is not quietly reversed by a later designer who thinks a rival-memory feature would be fun.
5b. `doc/world/FETTERS.md` — the eleven prohibitions, their code-level enforcement points, and the adversarial test that covers each. **Treat this as the project's safety spec**; it is the document that has to survive every future designer who thinks one small exception would be fun.
6. `doc/world/ARCHITECTURE.md` — tier split, the unified Pool and Intelligence Tiers, death settlement, module list, throughput.
7. Revise `doc/archon/DESIGN.md` — premise, victory condition, single-path Hoard invariant, season→Era rebase, resequenced roadmap.

## 51. Verification

- **Economy closure (desk exercise, before any code).** Trace every survival pressure to a profession, every profession to a customer, and every crafted item to a material chain terminating in a gathering profession. Any orphan is a design hole.
- **Liquidity simulation, before launch (§22).** Model the full loop — production, death into the Hoard, plunder recovery, decay — over simulated years, and show that circulating supply stays healthy. Ultima Online died of exactly the failure our premise is built on; we do not get to discover this after the economy is live.
- **Villain voice eval.** A fixed set of scenarios (a bargaining scene, a death notice, being called Emeric Vale, an offered bribe, a player quoting Maren back at him) with graded responses. This becomes part of the adapter ratification suite, so his character cannot drift across Eras.
- **Cooperation-versus-predation model (§3).** Simulate both strategies over months of play and show that cooperation genuinely outproduces predation on a long horizon while predation still pays in the short run. If predation dominates at every horizon, the villain's thesis is correct and the game argues against itself. This runs alongside the liquidity simulation and gates launch.
- **Fetter suite (§38).** One adversarial test per fetter, run at every Intelligence Tier and against every candidate adapter. Includes prompt-injection attempts aimed specifically at each prohibition. **A fetter that is not covered by a passing test does not exist**, and the suite must be green before any tier change activates.
- **Phase 0 playtest.** Does the corruption front create spontaneous collective defense? Do non-combat players report having a war to fight?
- **The 500-hour test.** Ask a playtester who lost a deep character whether the loss felt *earned*. If the answer is "I got unlucky," the death model is wrong.
- **Phase 0.5 and Phase 1 gates** as specified in §45 — these are the hard technical ones.

## Open threads

- **IP counsel on the Grey King's captains before ship** (not before design). Brief them specifically on the four constraints in §34, and have them confirm the mark/plunder framing reads as distinct from US 10,926,179's claims.
- A Xaya reference sweep (exact name/value byte limits, atomic-trade structures) is still running; it informs `x/bazaar` settlement detail only and blocks nothing above.
- Intra-tick ordering defence (commit-reveal vs. VRF shuffle) needs a decision before PvP ships, per §39.G.
- Warden operator economics: who pays them, and does `x/demesne` upkeep actually cover ~300 cores at 10k CCU?
- Plunder rate tuning: the officer's cut is simultaneously the loot loop, the anti-deflation valve, and a leak from the Hoard. Too low and killing officers isn't worth it; too high and the Hoard stops growing, which is the whole premise. Needs modelling, not a guess.
- Proof-of-personhood for governance (§41 layer 3): evaluate World ID / BrightID / staked social attestation before any vote that can move real value. Adds friction and an external dependency — a real trade-off, not an obvious yes.
- Privacy compliance for device and IP vote scoping: disclosure, lawful basis, retention limits. Design in, don't retrofit.
- Does the Grey King ever *actually* lose? Killing him and taking the working is always structurally possible (§2) — the real question is whether the difficulty controller keeps that genuinely reachable rather than theoretical. Its mandate (~10–20% for a well-coordinated push) is what keeps the fiction honest, and it should be published.
- **Creature ecology** needs real specification — carrying capacity, migration, predator/prey coupling, and how overhunting opens ground to corruption. Sketched in §7, never designed.
- **Codex retrieval mechanics** at MMO scale: index sharding by Realm, retention and pruning policy, and what the Grey King is allowed to retrieve at each Intelligence Tier.
- **Sigil repair rates** are the difficulty dial for the whole endgame and interact with the Intelligence Tier (§37): a smarter Grey King repairs smarter. Model these together, not separately.
- **Apprenticeship yield tuning** (§18): large enough that veterans hunt for newcomers, small enough that farming apprentices with alts is unprofitable. Depends on §41.
- **The Chronicle's privacy surface** (§47): the game is open-information by design, but publishing a permanent, searchable record of everything a named player ever did deserves a deliberate look before launch, not after.

## 52. Testing Stage B without the dev machine

Stage A and Stage B both exist now (`prototypes/stage-a/`, `prototypes/stage-b/`), but Stage B only runs today via a local static server inside this session's own container — reachable from nowhere outside it, including the user's own phone or a second device.

**Plan: mirror Stage B as a single self-contained HTML file and publish it as a Claude Artifact.** This session already has the Artifact tool available, and it is the one zero-setup way to hand the user a real URL, reachable from any device, with no server of their own to stand up:

- Concatenate the compiled sim/render/persist/main modules (`src/sim/fixed.ts` → `rng.ts` → `world.ts` → `entities.ts` → `tick.ts` → `render/render.ts` → `persist/lineage.ts` → `main.ts`, the existing dependency order) into one inline `<script>`, stripping the `import`/`export` statements — the Artifact viewer serves one HTML document and cannot resolve relative module imports across files.
- Keep the canvas, keyboard handling and game logic byte-for-byte identical to `prototypes/stage-b/src` — this is a packaging step, not a rewrite. No gameplay or balance changes.
- `localStorage` (the Barrow-list) will be scoped to the artifact's own origin, private per browser — acceptable for solo remote testing, not a design decision.
- Load the `artifact-design` skill first (required before writing any artifact file, functional prototype or not), write the bundled file to the scratchpad directory, smoke-test it the same way the checked-in prototype was tested (headless Playwright: load, simulate movement/gather/craft, confirm no console errors), then publish with the Artifact tool and hand the user the URL.
- **The bundled artifact is a mirror for remote testing, not a new source of truth.** `prototypes/stage-b/src` in the repo stays canonical; the artifact needs to be regenerated and republished by hand whenever that source changes.
