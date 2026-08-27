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

### 6.1 Permadeath with lineage

The **character** dies, with 100% of its gear, and never acts again — it gets a
`died_at_height` and a permanent public obituary that enters the Codex.

The **soul** persists: soulbound, non-transferable, carrying reputation,
titles, epochs survived, governance weight, and a death log. Zero material
advantage carries forward.

Every run is brutal. Retention does not go to zero after week one.

### 6.2 The flywheel

Deaths grow the Hoard → a bigger prize attracts stronger raiders → stronger
raiders die → the Hoard grows. Difficulty and reward scale together with no
tuning required. This is the strongest structural idea in the concept and the
design should protect it.

### 6.3 Beating the Overlord

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

### 6.4 Distribution, and paying the dead

On victory the Hoard splits by verifiable contribution — sigil-breakers, siege
holders, and **a share to the fallen**, paid to the lineages of everyone who
died advancing the winning campaign.

This is what converts permadeath from pure punishment into buy-in. Dying *for
the cause* becomes rational. A doomed charge that breaks a sigil pays your
descendants. Without this, the game is only cruel; with it, it has martyrs.

### 6.5 If nobody wins

At season end ~60% carries into the next Hoard and the Overlord grows stronger.
The remainder is distributed to survivors as tribute for enduring. A pot
compounding across seasons is the long-term hook — and a public, undeniable
scoreboard of how badly everyone has failed so far.

### 6.6 Sybils

Entry is bonded and lineage is soulbound. Perfect sybil resistance is unsolved;
the goal is to make sybils *unprofitable* rather than impossible. Note the
happy accident: since everything the dead own flows to the Hoard, **a sybil
farm is just a donation to the prize pool.** Design so the cheapest attack is
also a gift.

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

**Phase 3 — Season 0, valueless testnet.**
Full loop, real players, worthless tokens.
*Gate: the controller holds survival rate in band; victory is demonstrably
achievable; the injection red team can annoy the Overlord but cannot reach the
Hoard.*

**Phase 4 — The learning loop.**
Adapter training, eval harness, first ratification vote.
*Gate: independent trainers converge on score; the constitution regression
suite passes.*

**Phase 5 — Mainnet, capped stakes.** Real value, per-lineage caps, Warden active.

**Phase 6 — Sovereignty expansion, Warden sunset.**

---

## 8. Risks, stated plainly

**1. Fun risk exceeds technical risk.** "Hardest game ever" plus permadeath is
a tiny addressable audience. Huntercoin's problem was never the cryptography.
The mitigation is to accept it: **the spectacle is the product.** Most people
watch; few play. Build for spectators from day one — the audience is what makes
the Hoard grow and what makes a victory mean anything.

**2. Regulatory.** Players stake real value, lose it permanently into a pot
someone eventually wins. Structurally that is a real-money tournament, and in
several jurisdictions it reads as gambling regardless of how skill-dominant it
is. Not a reason to stop; a reason to get counsel before Phase 5, geo-gate, and
keep skill-determinacy documentable from the start. Phase 0–3 being valueless
buys the time to do this properly.

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
