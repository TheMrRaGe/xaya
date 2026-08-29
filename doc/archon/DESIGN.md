# ARCHON — Design Plan

**A blockchain that is itself a game, ruled by an AI Overlord that learns from
the people trying to kill it.**

*Working name. Status: design, pre-implementation. Descended in spirit from
Huntercoin and Xaya.*

---

## 0. The Premise

A sovereign chain whose state machine *is* a game world. At genesis, a treasury
called the **Hoard** is minted and locked with no keyholder. An AI **Overlord**
rules the world and defends that Hoard. Players enter, and try to take it.

Death is permanent. When a character dies, everything it owned moves
irreversibly into the Hoard. The prize therefore grows with every failure,
which means the reward for beating the Overlord scales with exactly how many
people it has already killed.

Nobody has ever won. That is the point, until it isn't.

### What we inherit from Xaya, and what we discard

Xaya (this repository) is a Namecoin/Bitcoin Core fork. Player accounts are
`p/` names; moves are JSON stuffed into name updates; the actual game state
lives *off-chain* in a Game State Processor fed blocks over ZeroMQ; PoW is
secured by triple-purpose mining. Huntercoin, its ancestor, already shipped
on-chain permadeath with loot dropped on the map in 2013.

| | Xaya | Archon |
|---|---|---|
| Game state | Off-chain GSP, chain stores opaque moves | **On-chain — the state machine is the game** |
| Finality | Probabilistic PoW; GSPs must handle reorgs | Instant (CometBFT); no reorg logic at all |
| Rules | Fixed at fork time | Evolve by governance at season boundaries |
| Governance | None | Proof-of-play weighted, constitutionally bounded |
| Adversary | Other players | **The Overlord**, plus other players |
| Move expressiveness | JSON blobs interpreted off-chain | Typed messages validated in consensus |

The single biggest simplification is finality. Xaya's GSP model exists largely
to survive reorgs — attach, detach, replay. With BFT finality that entire
category of complexity disappears, which is what makes it feasible to put the
game *in* the state machine rather than beside it.

What we keep is the philosophy: the chain is not a settlement layer that a game
happens to use. The chain is the world.

---

## 1. Locked Decisions

| Decision | Choice |
|---|---|
| Base layer | Cosmos SDK app-chain on CometBFT, ABCI++ |
| Permadeath | Character dies forever; soulbound lineage persists with zero material carry-over |
| Overlord authority | Bounded actor at runtime; rule-change *proposer* at season boundaries |
| Launch stakes | Valueless Season 0 on testnet before any real value |

---

## 2. Architecture

### 2.1 Why Cosmos

The decisive feature is **ABCI++ vote extensions**. They let validators attach
arbitrary attested data to their pre-commits, which the next block's proposer
receives. That gives us something no other stack offers as cleanly: *the
validator set can be the Overlord's inference committee, and its output can be
attested inside consensus itself* rather than bolted on as an external oracle
with its own trust assumptions and its own bridge to get hacked.

Secondary wins: sub-two-second deterministic finality, module-per-game-system
decomposition, in-protocol governance and upgrade machinery, IBC for later.

### 2.2 Modules

```
x/soul       identity, lineage, proof-of-play, death log
x/mortality  combat & hazard resolution, the death transition
x/hoard      the treasury — no keyholder, invariant-guarded
x/overlord   legal action space, inference pipeline, model commitments
x/codex      canonical append-only memory corpus + deterministic retrieval
x/season     epochs, difficulty controller, victory predicate, carry-over
x/agora      governance with proof-of-play weighting
x/ward       entry bonds, sybil resistance, rate limits
```

### 2.3 The Hoard — the trust anchor

Two module accounts, neither with a private key:

- **Genesis Endowment** — fixed mint at genesis.
- **The Barrow** — everything taken from the dead. Monotonically increasing.

Both are denominated in game coin, which has no exit to real value (§6.4).
The invariant below therefore protects the integrity of the game's central
prize rather than custody of anyone's money — a much better thing to have to
get right.

Outflow is possible through exactly two code paths: `MsgClaimVictory` validated
against the season's Victory Predicate, and the scheduled inter-season
carry-over. This is enforced as a **Cosmos invariant that halts the chain** if
hoard balance decreases by any other route.

That halt condition is the whole product's credibility. Everything else is
game design; this is the part that has to be provably true, and it must be
fuzzed to exhaustion in Phase 1 *before an LLM is ever wired in*.

The Overlord is not a signer on the Hoard. It cannot spend from it, cannot
authorize spending from it, and cannot propose a rule that spends from it —
that last one is a constitutional limit in §5.

---

## 3. The Overlord

### 3.1 The determinism problem

Every validator must independently compute the same state transition. LLMs do
not produce identical output across hardware, batch sizes, or engine versions —
batching alone changes floating-point reduction order and therefore logits.

So the model's output is never itself the rule. It is **data proposed into
consensus, validated against rules every node checks identically.**

### 3.2 The tick pipeline

The Overlord acts once per **tick** (N blocks), not once per block.

**1 — The chain builds the prompt.** `x/overlord` derives a canonical
`PromptSpec` from chain state alone: world digest, recent player actions,
retrieval keys into the Codex, memory pointers, and a seed of
`hash(block_hash)`. No operator supplies any input. Every validator derives
byte-identical bytes, and the prompt hash lands in the block.

**2 — Committee inference.** A staked Oracle Committee runs the committed model
under a pinned inference profile:

- model weights hash pinned on-chain, verified at load
- inference engine + container digest pinned
- greedy decode, temperature 0, fixed context assembly order
- batch size 1, pinned kernel config and quantization
- **grammar-constrained decoding** against the action schema, so the model
  is structurally incapable of emitting an unparseable action

**3 — Attestation.** Each committee member attaches
`hash(canonical_action_bytes)` as a vote extension on the next block.

**4 — Canonicalization.** The proposer includes the action backed by >2/3
stake. `x/overlord` verifies the quorum, validates the action against the legal
action space and current world state, and applies it. An illegal action is
rejected even at full quorum — the rule box binds the committee too.

**5 — The Understudy.** If no supermajority converges, a pure-code heuristic
Overlord policy produces a legal move from chain state alone. **The world never
stalls because inference disagreed.** This is not a degraded mode to be
embarrassed about; it is the liveness guarantee that makes the rest of the
design safe to attempt, and it is what plays the Overlord for all of Phase 1.

**6 — Divergence handling.** Persistent disagreement over a rolling window
*jails* a committee member out of the committee rather than burning stake.
Single-tick divergence is expected noise from real hardware and must not be
slashable, or honest operators get destroyed by a kernel update.

### 3.3 Two tiers: decisions vs. voice

| | Consensus tier | Flavor tier |
|---|---|---|
| Produces | Typed actions that touch state | Narration, taunts, lore, threats |
| Model | Small/mid, schema-constrained | Large, free-form |
| Verified | >2/3 attestation quorum | Not verified — cosmetic |
| If wrong | Rejected or falls to Understudy | Nobody is harmed |

This split is what makes the whole thing tractable. State-touching output is
tiny, typed, and cheap to check. Beautiful prose is free precisely *because* it
touches nothing. The Overlord's voice can be enormous and gorgeous; its hands
are small and bound.

### 3.4 The action space

Bounded is not small. Roughly 40–60 verbs with continuous parameters — target
selection, hazard placement, aggression budget allocation, market pricing,
bounty setting, sigil repair, faction bargaining, information release,
deception, direct address. A chess engine is terrifying inside completely fixed
rules. The menace comes from strategy, from timing, and from the fact that it
knows who you are — never from rewriting physics.

---

### 3.5 The Overlord is a Storyteller, not a commentator

The working model for this is RimWorld, which has shipped the idea for a
decade. Its AI storytellers do not narrate: they **pick incidents**. Threat
is paced by how rich the colony has become — roughly one threat point per
160 wealth, so a colony that doubles what it owns faces nearly twice the
pressure — damped by an adaptation factor after a death so the game does not
kick someone who is already down, with the expensive incidents locked behind
a points threshold. The storyteller chooses *what happens and when*. The
simulation decides how it turns out.

That division is the one this design already needs, and adopting it settles
three separate problems at once.

**It makes the Overlord's job a choice rather than an essay.** Picking one
option from a legal menu and giving a reason is classification; writing
menacing prose is not. That is a far better fit for a schema-constrained
model under §3.2 — the output space is small, typed, and trivially
validated, and an id that was never on the menu is refused no matter who
proposed it. It is also the difference between a small model being adequate
and being embarrassing, which matters for anyone self-hosting.

**Narration becomes a by-product.** The Overlord says why it did what it
did, and that reason is the line players see. Flavor stops being a separate
feature that can be flat and starts being the visible half of a decision
that had consequences.

**Pressure is §1's thesis at season scale.** Noise is the minute-to-minute
version of "everything you build makes you easier to see." Pressure is the
same statement measured in what the Realm has accumulated: goods carried,
tools held, skills learned, fires lit, souls alive. Wealth is not a proxy
for threat here, it *is* the threat, and it is the same sentence the game
opens with.

Three rules the controller in §4.2 inherits from this:

1. **Doing nothing is always on the menu, and is the commonest choice.** A
   storyteller that acts every cycle is a slot machine.
2. **A death buys the survivors quiet.** Grief subtracts from pressure and
   decays, so a wipe is followed by a lull rather than a spiral. This is the
   single mechanism most responsible for RimWorld's pacing feeling authored.
3. **Every incident is logged with its reason.** An action a player cannot
   audit is an action they cannot learn from, and a season nobody can replay
   proves nothing — the same argument as the trade ledger in §6.8.

The legal action space (§3.4) is therefore not a list of attacks. It is a
list of *pressures*: send someone walking, gather crows over an empty field,
bring a cold snap, blight the ground, loose something angry, mark a soul as
wanted. None of them decides an outcome; all of them change what the next
hour costs.

---

## 4. Learning — three timescales

### 4.1 Blocks: retrieval memory (`x/codex`)

An append-only canonical corpus of every deed, death, betrayal, alliance and
tactic. Retrieval is deterministic — BM25 or a fixed ANN index whose hash is
committed on-chain — so every validator retrieves identical context.

This is where "it remembers you" lives, and **it requires zero training.** The
Overlord greeting a returning lineage by name, referencing precisely how their
ancestor died and what mistake killed them, is the emotional core of the entire
product, and it is the cheapest, most verifiable component in this document.

### 4.2 Season: a difficulty control loop (`x/season`)

Not machine learning. A deterministic PID-style controller targeting a survival
rate band, adjusting hazard rates, Overlord aggression budget and spawn tables.
Pure code, fully deterministic, no consensus problem.

An LLM will not reliably tune difficulty. A control loop will. Keep these jobs
separate: the controller makes the game *hard*, the model makes it *frightening*.

### 4.3 Between seasons: weight evolution

LoRA adapters trained off-chain on the season's play corpus — what killed
players, what tactics beat it, which arguments moved it.

Verification is by **reproducibility, not proof.** Pinned base weights, pinned
recipe, pinned dataset (the chain itself, so its hash is canonical), pinned
seed and hyperparameters, containerized.

Realistically, byte-identical training reproduction across independent GPU
operators is not achievable today. So the practical mechanism: N independent
trainers each produce an adapter; a **deterministic evaluation harness** scores
every candidate against a fixed benchmark drawn from chain history; governance
ratifies one by score plus vote. Activation only at a season boundary, after a
mandatory public review window.

Ratification is also *content*. Players can read the training recipe and see
what the thing learned from them. "It studied how you beat it" is
simultaneously the marketing beat and the transparency mechanism.

### 4.4 The Constitution — anti-degeneracy

A model trained on player behavior drifts: toward whatever players farm, toward
exploitable regularity, toward incoherence. So a fixed, governance-protected
behavioral core that no adapter may override, plus a regression suite every
candidate must pass before ratification:

- Does it still refuse to give away the Hoard, under pressure?
- Does it still play to win rather than to please?
- Is it still in character?
- **Does it resist every injection that succeeded last season?**

That last gate is the elegant part. Players *talk to* the Overlord — that's the
appeal, and it makes every player message untrusted input flowing toward the
thing that runs the world. Under the rule box a successful injection buys a
rejected move or a dumb decision, never the Hoard. And each season's successful
exploits become next season's eval set. The playerbase is the red team, for
free, forever.

---

## 5. Governance (`x/agora`)

As the Hoard grows, **governance capture becomes the highest-value attack on
the system** — far more attractive than playing. The design has to assume
someone will try to buy the ruleset.

**Three bodies:**

- **The Assembly** — players. Weight is `stake^0.5 × play_score`: concave in
  capital, linear in earned play. Capital alone cannot buy the rules.
- **The Overlord** — proposal rights at season boundaries only. No vote. It can
  propose a new hazard, an economic shift, or a nerf aimed precisely at whoever
  nearly killed it last season. It cannot pass anything alone.
- **The Warden** — emergency council, halt-only, shrinking mandate, hard sunset
  after Season 4. Guarded launch, disclosed as such rather than pretended away.

**Constitutional limits** (amendable only by supermajority behind a long
timelock, if at all):

1. Governance cannot transfer from the Hoard.
2. Governance cannot resurrect the dead.
3. **A season's victory predicate cannot change mid-season** — otherwise you
   can rug a raid that is already in progress.
4. Model adapters change only at season boundaries, after a public review window.

---

## 6. Death and the Economy

**Nobody buys in.** Entry is free and worldwide: no stake, no wallet, no key,
no purchase. A soul starts with zero coin and earns everything it has by
working in the world — and what it earns stays in the world. There is no
cash-out. That one decision is what makes everything below buildable, and
§6.8 is the argument for why it costs far less than it looks like it does.

### 6.1 Permadeath with lineage

The **character** dies, with 100% of its gear, and never acts again — it gets a
`died_at_height` and a permanent public obituary that enters the Codex.

The **soul** persists: soulbound, non-transferable, carrying reputation,
titles, epochs survived, governance weight, and a death log. Zero material
advantage carries forward.

Every run is brutal. Retention does not go to zero after week one.

### 6.2 A production economy, not a payout

Coin is earned by working: gathering, crafting, hunting, hauling, guarding,
and selling the results to other players. **Nothing pays for time alone.** A
faucet that pays by the hour is a wage, and a wage prices everything at the
cost of the cheapest hour anyone anywhere will work — which is how every
play-to-earn economy so far has ended.

Supply of anything worth having is gated instead by **risk and skill**: ore
from the deep Realms where the Lieutenants patrol, gear only a soul that has
survived long enough knows how to make, anything that requires being loud in
a dangerous place. Time gets a player in the door. Nerve decides what they
are paid.

### 6.3 Permadeath is the economic engine

Virtual economies usually die of accumulation. The sword crafted in the
first month still exists in the third year, supply only ever grows, and the
crafting professions collapse into irrelevance.

Here every death destroys a full kit, permanently. Demand for replacement is
constant and cannot be satisfied — a crafter has a job forever, because
their customers keep dying. The mechanic written for drama turns out to be
the largest sink any game economy has had, and the whole coin-supply problem
reduces to keeping the faucets smaller than it.

### 6.4 The Hoard is a prize, not a pot of anyone's money

The Hoard is denominated in game coin and has no exit to real value. It is
enormous, public, and unreachable except through §6.5. Check what survives
that change:

> deaths grow the Hoard → a bigger prize attracts stronger raiders →
> stronger raiders die → the Hoard grows

All of it. The flywheel never depended on the coin being worth money; it
depended on the prize being worth *wanting*, and standing among other
players has outlasted every payout scheme ever bolted onto a game.
Everything written about the Hoard was always about drama. Keep the drama,
drop the money.

### 6.5 Beating the Overlord

Victory must be consensus-checkable, hard, and require *coordination* — a
social event, not a solo grind, and not brute-forceable by capital.

The Overlord's power sits in **seven Sigils**, each stressing a different axis:
sustained economic pressure; a coordinated multi-party raid; a cryptographic
puzzle the Overlord itself sets; holding a location for K consecutive blocks
against its full aggression budget; information it will only surrender to
social engineering. Victory requires all seven broken *within one season*,
followed by holding the Citadel through a final siege window.

Critically, **the Overlord repairs sigils.** It spends action budget re-sealing
what players break and fail to defend. It is a race, not a checklist.

### 6.6 Distribution, and paying the dead

On victory the Hoard splits by verifiable contribution — sigil-breakers, siege
holders, and **a share to the fallen**, paid to the lineages of everyone who
died advancing the winning campaign.

This is what converts permadeath from pure punishment into buy-in. Dying *for
the cause* becomes rational. A doomed charge that breaks a sigil pays your
descendants. Without this, the game is only cruel; with it, it has martyrs.

### 6.7 If nobody wins

At season end ~60% carries into the next Hoard and the Overlord grows stronger.
The remainder is distributed to survivors as tribute for enduring. A pot
compounding across seasons is the long-term hook — and a public, undeniable
scoreboard of how badly everyone has failed so far.

### 6.8 Access, and why free entry is the cheap option

Free entry with a sealed economy is not a concession, it is the structure
that lets the game exist anywhere. Gambling requires consideration, chance
and a prize *together*; with entry free and the prize unable to become
money, two of the three are simply absent. No stake, no wagering. No
cash-out, no money transmission, no payout reporting, no identity check at
the door, and no reason to geo-gate a player in any country.

The ladder that follows:

| rung | needs | can play | can win the Hoard |
|---|---|---|---|
| spectator | nothing | watches | no |
| free soul | an account | all of it | yes |
| sovereign soul | own key | all of it | yes, and can govern |

**The chain gates settlement and governance. It never gates play.** The sim
tier imports no chain, no wallet, no network call and no clock; that
isolation is what makes a rung a deployment detail instead of a rewrite.

Cash-out is a valve that can be opened later and never closed again.
Opening it is a compliance project, and it needs only that trades were
authoritative, logged, replayable and attached to durable identities from
the first day. Those four are nearly free now and impossible to retrofit —
so we build them now and decide later.

### 6.9 Sybils, bots and the black market

Free entry retires the old happy accident (a sybil farm was a donation,
because sybils had to buy in). The live threat is now the bot farm: many
accounts, grinding, and selling the proceeds outside the game for cash we
neither see nor sanction.

Three properties already in the design do most of the defending:

- **Souls are soulbound.** An account's reputation cannot be sold, so the
  black market's most valuable product does not exist.
- **Permadeath.** Nothing accumulates. A farm's inventory evaporates on the
  same schedule as everyone else's.
- **The Overlord hunts predictable behaviour.** A grinder repeating an
  optimal loop is the most legible thing in a Realm. The adaptive antagonist
  we are building for narrative reasons is also, exactly, a bot detector —
  worth remembering when choosing its reward function.

What is left is ordinary operational work: trade logs we can unwind, terms
that make coin a licence rather than property, and rate limits that cost a
farm more than they cost a person.

### 6.10 Skill is earned, and it dies with you

**No perks, no classes, no starting traits.** Every soul arrives at zero and
every soul can learn anything. What separates two players is only the hours
they have each put in, and which hours they chose. A veteran holds no
advantage a new player cannot earn the same way, which is what lets the game
stay open to anyone at any point in a season.

Skill is gained by doing the thing. Chopping teaches woodcraft, skinning
teaches butchery, and there is no other route — no purchase, no gift, no
inheritance.

**Skill belongs to the character and dies with it.** That is §6.1's "zero
material advantage carries forward" applied to the one thing that would
otherwise become a wall between old players and new. The soul keeps the
*title* — that it was once a master smith, three lives ago — as reputation,
which is worth a great deal socially and nothing mechanically.

Three things fall out of that, which is why this sits in the economy section
rather than a combat one:

1. **Trade becomes necessary rather than polite.** Nobody barters firewood
   in the first hour, because an hour of chopping gets anyone the same three
   logs — and that is correct, not a failure. Later, when a woodcutter's
   hour yields twice what yours does and your hour is better spent skinning,
   handing each other things stops being a courtesy and becomes arithmetic.
   The economy is not designed in; it is what specialisation makes
   inevitable.
2. **Masters are scarce and perishable.** A master smith is a rare, mortal
   resource whose work is precious precisely because they may not survive
   the week. "The Verge's last master smith was killed last night" is an
   economic event and a story at the same time, which is what the spectacle
   runs on (§8, risk 1).
3. **Nobody can master everything before they die.** Self-sufficiency stops
   being a strategy, which is the entire point.

The curve should be fast at the bottom and slow at the top: a fresh soul
competent within minutes, so death never returns anyone to useless, and
mastery far enough away that reaching it is something other players notice.

And skill should be **quiet**. A practised hand takes the tree in fewer,
better strokes, so competence and safety become the same stat — which points
the whole skill system at §1's thesis instead of away from it.

---

## 7. Roadmap

**Phase 0 — Prove the loop is fun. No chain.** (6–8 weeks)
Single-process simulator, LLM GM in the loop, real playtesters.
*Gate: do people come back after dying?* If permadeath plus an AI overlord
isn't compelling in a prototype, no amount of consensus engineering rescues it.
This phase is allowed to kill the project cheaply.

**Phase 1 — Chain skeleton, no LLM.**
Cosmos scaffold; `x/soul`, `x/mortality`, `x/hoard`; deterministic combat; the
Understudy plays the Overlord.
*Gate: the Hoard invariant survives exhaustive fuzzing — no message sequence
extracts value.* Proven before a model is ever connected.

**Phase 2 — Oracle pipeline.**
Vote extensions, committee inference, determinism harness.
*Gate: 10k consecutive ticks at >2/3 convergence, plus graceful Understudy
fallback under forced divergence.*

**Phase 3 — Season 0, public beta.**
Full loop, real players, free entry, coin that cannot leave the world. Run
the public beta on the cheapest authoritative server that works, with the
chain proving itself in parallel on a devnet: a testnet is a deployment
target for Season 0, not a prerequisite for a beta, and chain ops compete
directly with making the game good. Say in advance whether the season wipes,
and mean it — the worst outcome is players who believed their beta wealth
carried over.

Testnet stays a separate chain from main, permanently, so Season 0's coin
and gear never migrate. That is a wipe, and it is survivable because of
§6.1: a soul carries reputation, titles, epochs survived and a death log,
and **zero material advantage**. So carry the souls and wipe the wealth. The
beta's Barrow-list is the one thing worth migrating, and it is exactly the
thing that costs nothing to honour.
*Gate: the controller holds survival rate in band; victory is demonstrably
achievable; the injection red team can annoy the Overlord but cannot reach the
Hoard.*

**Phase 4 — The learning loop.**
Adapter training, eval harness, first ratification vote.
*Gate: independent trainers converge on score; the constitution regression
suite passes.*

**Phase 5 — Mainnet.** Governance and settlement on chain, coin still sealed
inside the world, Warden active. Cash-out stays shut until there is both a
reason and a budget to open it.

**Phase 6 — Sovereignty expansion, Warden sunset.**

---

## 8. Risks, stated plainly

**1. Fun risk exceeds technical risk.** "Hardest game ever" plus permadeath is
a tiny addressable audience. Huntercoin's problem was never the cryptography.
The mitigation is to accept it: **the spectacle is the product.** Most people
watch; few play. Build for spectators from day one — the audience is what makes
the Hoard grow and what makes a victory mean anything.

**2. Regulatory — largely designed out.** An earlier version of this plan had
players stake real value into a pot someone eventually wins. That is
structurally a real-money tournament, and reads as gambling in several
jurisdictions no matter how skill-dominant it is. Free entry and a sealed
economy remove the consideration and the prize-of-value, and most of the
exposure goes with them. What remains is ordinary: consumer terms,
age-appropriate content, and the discipline not to let coin leak into real
value by accident — one leak recreates every problem at once, from an
unlicensed market to payout reporting. Get counsel before opening cash-out,
not before opening the beta.

**3. Inference cost.** Per tick, per committee member. Mitigations: small
consensus model, a committee subset rather than the full validator set, ticks
rather than blocks. Model this early — it is a recurring operating cost that
scales with decentralization.

**4. An Overlord that is too good.** If it never loses, the pot grows forever
and the game dies of hopelessness. The controller needs an explicit mandate to
keep victory *achievable but improbable* — target roughly a 10–20% chance for a
well-coordinated season.

**5. Model drift across seasons.** Addressed by the constitution and the
regression suite, but it needs continuous monitoring, not a one-time gate.

**6. Governance capture,** whose payoff grows in lockstep with the prize. The
constitutional limits in §5 are load-bearing, not decorative.

---

## 9. Open questions for next session

- Sigil mechanics in detail — the seven axes need real game design, not names.
- Token model: is the stake token the same asset as the Hoard's contents?
- Committee size and selection: full validator set, or a separately staked
  Oracle Committee with its own bonding?
- Which base model, and does it need to be open-weights for the pinning and
  reproducibility story to hold? (Strong argument that it does.)
- Client architecture and the spectator experience — per risk #1 this may be
  the most commercially important unbuilt piece in this document.
