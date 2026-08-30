/**
 * The core sim tick — pure of rendering, pure of the DOM, runs at a fixed
 * 10 Hz per doc/world/PLAN.md §21 ("world/survival sim at 10 Hz"). Everything
 * in here is integers; nothing in here reads a clock, iterates a Map/object
 * in insertion-order-dependent ways for anything that matters, or calls
 * Math.random. See src/sim/fixed.ts and src/sim/rng.ts for why.
 *
 * It holds any number of souls (Stage C). One tick takes one Input per
 * soul, in player-id order, and returns every death that happened in it —
 * which is the same shape a server or a chain would hand it, so nothing
 * above this file needs to know which one is driving.
 */
import { TILE, clamp, distSq } from "./fixed.js";
import { Rng } from "./rng.js";
import { World, WORLD_W, WORLD_H, Tile, VILLAGE_X, VILLAGE_Y, isSolid } from "./world.js";
import {
  Player,
  Pack,
  HandItem,
  Lieutenant,
  Tradeable,
  TRADEABLES,
  NEED_MAX,
  HEALTH_MAX,
  DeathCause,
  newPlayer,
  newLieutenant,
} from "./entities.js";
import { stepToward, moveWithCollision, walkable, terrainSpeedPct } from "./move.js";
import { OverlordAction, GRIEF_PER_DEATH, GRIEF_DECAY_EVERY, isColdSnap, isBlighted } from "./director.js";
import {
  Skill,
  Skills,
  XP,
  gain,
  level,
  mastery,
  bestSkill,
  teachingCeiling,
  woodPerTree,
  noiseScale,
  strikeBonus,
  butcherBonus,
  mealValue,
  cloakDurability,
  charcoalYield,
  smeltBonus,
  swordBonus,
  fishChance,
} from "./skills.js";
import {
  Creature,
  STATS,
  spawnCreatures,
  stepCreature,
  woundCreature,
  isCarcass,
  checkSnares,
  CREATURE_RESPAWN_TICKS,
  BOAR_GORE_DAMAGE,
  BOAR_GORE_COOLDOWN,
  WOLF_BITE_DAMAGE,
  WOLF_BITE_COOLDOWN,
} from "./creatures.js";
import { Npc, spawnNpcs, stepNpc, woundNpc } from "./npc.js";
import { DIALOGUE_TREES, ROOT_NODE } from "./dialogue.js";
import { Scout, newScout, stepScout, woundScout, SCOUT_SPOT_RADIUS } from "./scout.js";

export const TICK_HZ = 10;

const PLAYER_SPEED = 300; // fixed-point units/tick — 3 tiles/sec
const PLAYER_SPEED_DIAG = 212; // 300/sqrt(2): a diagonal must not be a sprint
const LIEUTENANT_SPEED = 260; // slightly slower than a soul: fleeing must work (doc/world/PLAN.md §21)
/**
 * Patrol used to be 60% of hunt speed. The Verge is now nine times its
 * original area and §44 forbids the obvious fix — a second Lieutenant — so
 * the one there is has to cover more ground on his own. This still keeps
 * him well under the player's 300: outrunning a patrol must stay easy,
 * only staying unnoticed for longer should get harder.
 */
const LIEUTENANT_PATROL_SPEED = Math.trunc(LIEUTENANT_SPEED * 0.75);
/**
 * How often a fresh patrol waypoint is drawn near recently loud ground
 * instead of anywhere on the map — a hunter reads sign of habitation
 * rather than touring empty corners, which is what keeps coverage
 * meaningful over a much bigger Verge without adding a second officer
 * (doc/world/CONTENT.md's Lieutenant-coverage gap).
 */
const PATROL_NOISE_BIAS_PCT = 60;
const PATROL_BIAS_JITTER = TILE * 10;

const HYDRATION_DRAIN_EVERY = 1; // ticks per -1 hydration
const SATIETY_DRAIN_EVERY = 2;
const WARMTH_DRAIN_EVERY = 3;
const WARMTH_DRAIN_EVERY_CLOAKED = 6; // a hide cloak halves what the cold takes
const WARMTH_REGEN_NEAR_FIRE = 2; // per tick, while within FIRE_RADIUS

const STARVE_DAMAGE_PER_TICK = 1; // per depleted need, per tick
const LIEUTENANT_DAMAGE_PER_TICK = 4;

const CONTACT_RADIUS = TILE * 0.6;
const STRIKE_RADIUS = TILE * 1.2; // how close to hit, or to butcher
const TRADE_RADIUS = TILE * 1.5; // how close to hand something over
const TALK_RADIUS = TILE * 1.5; // same reach as trading
const FIRE_RADIUS = TILE * 2;
/**
 * Raised from 4/3 (tiles of base radius / of noise-scaled radius on top of
 * it): the pathing fix below means a lake or a wood can no longer just
 * stall him forever once he's actually hunting, so his reach could
 * finally afford to grow without also making him unbeatable. At max noise,
 * by night, he now notices from 11 tiles rather than 9 — a real increase,
 * not a rounding change.
 */
const BASE_DETECTION_RADIUS = TILE * 5;
const NIGHT_DETECTION_BONUS = TILE * 2;
const NOISE_DETECTION_SCALE = TILE * 4; // at max noise, this much extra radius
const LOSE_INTEREST_RADIUS = TILE * 9; // hysteresis so fleeing actually works

/**
 * The counterweight to the radius increase above: a fresh hunt doesn't
 * open at full pace. For ALERT_TICKS he's moving at ALERT_SPEED — faster
 * than a patrol, well short of a real hunt — and the moment always says so
 * out loud (tickLieutenant), not just the first time it ever happens. That
 * is the "more time to prepare" this trades for the wider reach: a real,
 * legible couple of seconds where the honest move is already to be
 * running, before he's actually gaining on you.
 */
export const ALERT_TICKS = 20; // ~2s
const LIEUTENANT_ALERT_SPEED = Math.trunc(LIEUTENANT_SPEED * 0.8);

/**
 * How he actually gets to where he's going while hunting, instead of
 * `stepToward`'s straight line: a plain BFS over the tile grid (every edge
 * costs the same, so Dijkstra/A* would buy nothing a queue doesn't already
 * give for free), recomputed only when the cached route is missing, stale,
 * or the target has moved well off the end of it — not every tick. Patrol
 * and the crow-drift still walk a straight line; getting briefly hung up
 * while ambling is far less noticeable than doing it mid-chase, and it
 * would triple the replanning this does for no real benefit.
 */
const PATH_RECOMPUTE_TICKS = 50; // ~5s between replans while a hunt is already under way
const PATH_STALE_RADIUS = TILE * 3; // replan early if the target's drifted this far past the route's own end

const NOISE_MAX = 1000;
const NOISE_PER_GATHER = 120;
const NOISE_PER_CRAFT = 250;
const NOISE_PER_STRIKE = 90; // a struggle carries
const NOISE_PER_COOK = 60;
const NOISE_DECAY_EVERY = 4; // ticks per -1 noise

/** Above this the crows gather over your work — and the Lieutenant reads crows. */
export const CROW_THRESHOLD = 250;
const CROW_SPEED = 90;

const FIRE_WOOD_COST = 5;
const FIRE_FEED_WOOD = 1;
const FIRE_FUEL_PER_WOOD = 300; // 30s of burning per log
const FIRE_LOW_FUEL = 200; // when to warn that it is dying

const SPEAR_WOOD_COST = 3;
const SPEAR_DAMAGE = 3;
const SPEAR_DURABILITY = 12; // strikes: about four deer, or two boar
const FIST_DAMAGE = 1;

const CLOAK_HIDE_COST = 2; // how long it then lasts is up to the tailor — see skills.ts

/**
 * Stone tools. The point of them is not that they are better numbers — it
 * is that stone is *free and loud* while everything else here is scarce and
 * quiet, so a tool is a trade of attention for yield rather than a trade of
 * time for yield. An axe pays that back: it is the one tool that makes you
 * quieter than having no tool at all.
 */
const KNIFE_STONE_COST = 1;
const KNIFE_WOOD_COST = 1;
const KNIFE_DURABILITY = 20; // butcherings
const KNIFE_BONUS = 1; // extra meat and hide off a carcass

const AXE_STONE_COST = 2;
const AXE_WOOD_COST = 1;
const AXE_DURABILITY = 25; // chops
const AXE_WOOD_BONUS = 2; // extra logs per tree
const AXE_QUIET = 65; // percent of the usual noise a chop makes

const CORDAGE_HIDE_COST = 1;
const CORDAGE_PER_HIDE = 2;

const SNARE_CORDAGE_COST = 2;
const SNARE_WOOD_COST = 1;

const NOISE_PER_CHIP = 260; // hammering stone is the loudest work in the Verge
const NOISE_PER_ORE = 320; // and a vein is worse — this is the loudest work there is
/**
 * Copper is the rarer find (world.ts's mineral clusters), but it is a
 * softer seam than a true ore vein and it shows on the surface more often
 * — working one is louder than a rock outcrop but not the shout a vein is.
 */
const NOISE_PER_COPPER = 290;
/** Clay is soil, not a vein (§3.1) — as quiet as picking a bush clean. */
const NOISE_PER_CLAY = 40;
/** A wildflower meadow costs nothing to be heard at — quieter even than clay. */
const NOISE_PER_MEADOW = 20;
const MEADOW_SATIETY = 90; // less than a bush's 200 — foraging flowers, not fruit
/** A thicket's denser wood costs more to take and more to be heard taking. */
const THICKET_WOOD_BONUS = 2;
const THICKET_NOISE_BONUS_PCT = 140; // percent of a normal chop's noise
const NOISE_PER_RUIN_DIG = 140; // digging through rubble carries, but quieter than stone or ore
const RUIN_CROWN_CHANCE_PCT = 15; // rubble far more often than a crown
const CROWN_MELT_COST = 1;
const CROWN_MELT_YIELD = 1; // no smithing XP for it — running a crown through fire teaches nothing a real smelt does

/**
 * The sword chain (doc/world/PLAN.md §15's worked example, compressed to what
 * one soul can do alone): ore + charcoal → bar → sword. Charcoal costs three
 * logs for one lump on purpose — a real charcoal burn wastes most of the
 * wood as heat, and that waste is what makes this chain expensive rather
 * than merely long.
 */
const CHARCOAL_WOOD_COST = 3; // base yield is 1; charcoalYield(skills) in skills.ts is what a smith improves on

const SMELT_ORE_COST = 2;
const SMELT_CHARCOAL_COST = 1;
const BAR_YIELD = 1;

const SWORD_BAR_COST = 2;
const SWORD_WOOD_COST = 1; // the haft
const SWORD_CORDAGE_COST = 1; // binding the grip
const SWORD_DAMAGE = 6; // double the spear
const SWORD_DURABILITY = 30; // and outlasts it by more than double

/**
 * Copper — a second, shorter metal line rather than a second version of the
 * same one (doc/world/CONTENT.md, closing §3.1's "soil, timber, clay,
 * copper": the Verge's own metal is copper, not iron). It smelts alone,
 * with no charcoal, which is most of why it is *reachable earlier* than
 * the real sword rather than merely a rarer find (world.ts's mineral
 * clusters make copper rarer than ore, not more common) — and it forges
 * into a real but weaker blade, sitting between the spear and the sword
 * rather than obsoleting either.
 */
const COPPER_SMELT_COST = 3; // copper alone, no charcoal
const COPPER_BAR_YIELD = 1;
const COPPER_SWORD_BAR_COST = 2; // same shape as the real sword's recipe
const COPPER_SWORD_WOOD_COST = 1;
const COPPER_SWORD_CORDAGE_COST = 1;
const COPPER_SWORD_DAMAGE = 4; // between the spear's 3 and the sword's 6
const COPPER_SWORD_DURABILITY = 18; // between the spear's 12 and the sword's 30

/**
 * Verge pottery's first product (doc/world/CONTENT.md): a fired clay
 * vessel, worth more to a Cook than to anyone else. Clay alone, no wood —
 * this is shaped and fired, not hafted.
 */
const POT_CLAY_COST = 3;
const POT_DURABILITY = 15; // meals
const POT_MEAL_BONUS = 100; // extra satiety per meal cooked with one in hand

/**
 * Wearables beyond the one cloak (doc/world/CONTENT.md §5.2), both from the
 * same hide/cordage leatherworking line, each answering a specific need
 * the way the cloak answers cold rather than being a second cloak.
 */
const BOOTS_HIDE_COST = 2;
const BOOTS_CORDAGE_COST = 1;
const BOOTS_DURABILITY = 300; // marsh-steps
/** Added to marsh's speed percent while worn — a player-only modifier layered on top of move.ts's shared terrainSpeedPct, not a change to it. */
const BOOTS_MARSH_BONUS_PCT = 25;

const GLOVES_HIDE_COST = 2;
const GLOVES_CORDAGE_COST = 1;
const GLOVES_DURABILITY = 25; // digs — same order as an axe's chops
const GLOVES_QUIET_PCT = 70; // percent of the usual noise, same shape as AXE_QUIET

const GLUE_PER_BUTCHER = 1; // connective tissue nobody was carrying meat or hide for
const PITCH_PER_BURN = 1; // wood tar, the same fire that makes charcoal makes a little of this too

/**
 * Fishing — the Fisher's answer to hunger (doc/world/PLAN.md §17), and the
 * one food chain that needs no fire, no butchering and no waiting elsewhere:
 * just cordage, a shoreline, and held-down patience. It is meant to feel
 * slower than the snare per tick spent (fishChance in skills.ts sits well
 * under trapChance's) because a snare is paid for by hours spent *away*,
 * and this is paid for by hours spent *here* — the reward should track
 * which currency was actually spent.
 */
const FISHING_LINE_CORDAGE_COST = 2;
const FISHING_LINE_WOOD_COST = 1;
const FISHING_LINE_DURABILITY = 25; // casts that land a fish
const FISH_SATIETY = 140; // between raw meat's 120 and a hot meal's 500+
const NOISE_PER_FISH = 15; // sitting at the water's edge is nearly silent
const NOISE_PER_MARSH_STEP = 4; // squelching carries; only while actually moving through it

/**
 * The bow — Stage B's first ranged weapon, and the first thing to spend
 * glue and pitch (doc/world/CONTENT.md §4: "a graph with no waste is a
 * graph where nothing is a bargain"), which had piled up with nowhere to
 * go since the wearables pass. Two recipes close two of §7.2's
 * named-but-unbuilt professions at once: a **Bowyer** builds the bow
 * (wood, cordage and the pitch that seals the string-wraps), a
 * **Fletcher** fletches the arrows (wood and the glue that binds feather
 * to shaft) — the same real-world division of labour the two names imply,
 * rather than one soul doing both under a single verb.
 *
 * No ninth skill for either: crafting neither trains anything (matching
 * the spear and the knife, not the axe), and a shot that hits still trains
 * `hunting` same as a melee strike does — a bow is another hunting weapon,
 * not a new trade to master. What it buys is reach, not extra damage: see
 * doStrike's melee-first, bow-only-if-nothing's-already-in-arm's-reach
 * fallback, and BOW_DAMAGE below sitting under even a bare spear's bite.
 */
const BOW_WOOD_COST = 3;
const BOW_CORDAGE_COST = 2; // the string
const BOW_PITCH_COST = 1; // seals the string-wraps
const BOW_DURABILITY = 20; // shots
const BOW_DAMAGE = 2; // less than a spear's 3 — the trade is reach, not bite
const BOW_RADIUS = TILE * 6; // five tiles past melee's reach
const NOISE_PER_BOWSHOT = 45; // half a melee strike's — a released arrow, not a grapple

const ARROW_WOOD_COST = 1;
const ARROW_GLUE_COST = 1;
const ARROWS_PER_BATCH = 2; // same shape as cordage's 2-per-hide

/**
 * Outlawry, scoped to what one Lieutenant can actually enforce (§25/§28,
 * doc/world/PLAN.md §2A: this is "standing," never "reputation score" out
 * loud). A kill costs standing and marks the killer the same tick — the
 * Grey King's forces go looking for you, same as an Overlord-chosen mark
 * already does. Fall far enough and that flips: §29 has notorious
 * player-killers taking rank in his Host outright, and a soul that far
 * gone reads to a Lieutenant as already his, not as prey. He stops
 * looking. Nothing yet earns standing back — that is Commons standing's
 * job (§3), and nothing here builds it.
 */
const STANDING_KILL_PENALTY = 40;
/**
 * Worse than killing another soul — one and a half times the cost. The
 * standing design's "expelled from normal towns" idea was always meant to
 * answer to the people a normal town actually is, and a villager cannot
 * fight back the way another player can.
 */
const NPC_KILL_STANDING_PENALTY = 60;
/** At or below this he stops hunting you at all — roughly three kills. Exported so the HUD can read the same line the sim does. */
export const NOTORIOUS_STANDING = -100;

/**
 * Plunder off a body (§28/§30's "the plunder is on the floor," §11.3's own
 * gap list: "no plunder off the body"). Everything a killed soul carried
 * spills where they fell — a lootable pile, not a transfer straight to the
 * killer's pack, so a third soul can beat the killer to it exactly the way
 * a felled deer already works. Crowns are the one exception: they never
 * touch the ground. Most of a hoard of crowns is taken before the body is
 * even cold — his due, the same "he pays for the dead, and takes his cut
 * first" shape §30A already gives officers — and the rest goes to whoever
 * actually swung, a small, real incentive for outlawry that a lootable
 * pile alone doesn't provide (someone else can always out-loot a killer,
 * but nobody can out-loot a cut that already landed).
 */
const KILLER_CROWN_CUT_PCT = 20; // the rest is the King's, and simply gone
const LOOT_ROT_TICKS = 1800; // ~3 minutes before the valley reclaims an unclaimed pile
const LOOT_RADIUS = TILE * 1.2; // same reach as a carcass
/** Wear-counter tools, not stackable counts — looting takes whichever is better rather than summing two "one bow"s into a nonsense number. Everything else in Pack (materials, and `snare`'s carried count) stacks normally. */
const LOOT_TOOL_KEYS: ReadonlyArray<keyof Pack> = [
  "spear",
  "cloak",
  "knife",
  "axe",
  "boots",
  "gloves",
  "sword",
  "copperSword",
  "fishingLine",
  "pot",
  "bow",
];

/**
 * A Scout who gets away reports — the consequence lands on the same
 * noise/crow machinery a struggle or a working already feeds (§1), rather
 * than a new information channel of its own. Killing enough of them
 * before they escape means this never fires at all, which is the whole
 * point of building the fragile, fleeing kind of Reaver first: he is
 * entirely optional to deal with, right up until he isn't.
 */
const SCOUT_LOCATE_THRESHOLD = 3; // reports against one soul before the King has a rough fix
const SCOUT_LOCATE_NOISE = 500; // comfortably past CROW_THRESHOLD — a guaranteed, immediate tell

/**
 * The Bounty Board — a fixed point near the village rather than a new tile
 * or a player-held Sheriff role, the same "smallest thing that answers the
 * ask" call the rest of this file makes. No target picker either: pressing
 * U simply funds a price on whichever other known soul the road already
 * points at hardest, in whichever direction the poster's own standing
 * looks from — a lawful soul funds it from their own crowns and it lands
 * on the worst soul around; a notorious one spends from the dead stockpile
 * (dropLoot above) and it lands on the best. No escrow beyond the post
 * itself and no refund if the target dies some other way first
 * (resolveBounty) — the same laissez-faire the rest of §12's economy
 * already runs on.
 */
export const BOARD_X = (VILLAGE_X + 4) * TILE; // clear of the houses' own wander bubble
export const BOARD_Y = VILLAGE_Y * TILE;
const BOARD_RADIUS = TILE * 1.5; // same reach as trading or talking
const BOUNTY_POST_AMOUNT = 5; // crowns per press — several presses to build a real price, same shape every other verb here has

/**
 * Magic (doc/world/PLAN.md §9), settled for Stage B: not gone, illegal —
 * every soul still carries a little of it, and using it is a hanging
 * offence rather than a physical impossibility. No recipe and no reagent:
 * the price of a cast is entirely the risk it carries, which is why both
 * spells cost nothing to learn and nothing to hold, only something to use.
 *
 * A bolt reuses doStrike's own strikeNearest at BOLT_RADIUS — same
 * melee-creature-soul-NPC targeting the bow already shares — so a cast
 * that kills still trains `hunting` and still costs standing the ordinary
 * way if the target was another soul; what's new here is on top of that,
 * not instead of it. Heal has no target and no ordinary consequence to
 * layer onto — its whole cost is what's below.
 *
 * Every cast is the loudest thing in the Verge (louder even than mining,
 * §1's own "a ward big enough to hold a town is a shout" made numeric) and
 * carries a real chance — not a certainty, or no hedge-witch would ever
 * risk it — of a mark landing the same tick, the same applyOutlawry a kill
 * already uses, at roughly a third of a kill's own cost. Two independent
 * risks, on purpose: noise brings the Lieutenant eventually; a mark brings
 * him — or the road's opinion of you — immediately.
 */
const BOLT_DAMAGE = 5;
const BOLT_RADIUS = TILE * 6; // same reach as a bow
const BOLT_COOLDOWN_TICKS = 30; // 3s between casts
const HEAL_AMOUNT = 30;
const HEAL_COOLDOWN_TICKS = 100; // 10s — healing is the stronger of the two
const NOISE_PER_CAST = 400; // past NOISE_PER_ORE (320) — a working outshouts even a vein
const MAGIC_MARK_CHANCE: readonly [number, number] = [1, 5]; // one cast in five draws his notice
const MAGIC_STANDING_PENALTY = 15; // a third of a kill's — being caught working is serious, not fatal

/**
 * Commons standing (doc/world/PLAN.md §3): "kindness needs teeth." Of the
 * acts §3 names — stabilising a stranger, sheltering someone, feeding the
 * starving, teaching for free, paying another's mark, purifying land you do
 * not own — only one has anywhere to happen in Stage B: there is no Mortal
 * Wound, no shelter, no teaching verb, no currency to owe, no corruption to
 * clear. Feeding a hungry soul does not have that problem — G already
 * exists — so it is the only one built. §3 also warns this must not be
 * farmable by alt-pairs; nothing here stops two cooperating players trading
 * scraps back and forth for standing, which is a real gap, left open on
 * purpose rather than guarded by a mechanism nobody asked for yet.
 */
const FOOD_ITEMS: ReadonlySet<Tradeable> = new Set(["rawMeat", "cookedMeat", "fish"]);
const COMMONS_SATIETY_THRESHOLD = 300; // genuinely hungry, not just peckish
const COMMONS_STANDING_GAIN = 15; // several acts to undo one kill's -40 — cooperation is the slower climb

/**
 * Teaching for free is the second of §3's six kindness acts Stage B has
 * anywhere to put (doGive above already built the first, feeding). "A
 * passable X" (skills.ts's own RANKS[2]) or better, since level 0 or 1 has
 * nothing worth passing on — the blind leading the blind isn't a lesson.
 */
const TEACH_MIN_LEVEL = 2;

const RAW_SPOIL_EVERY = 900; // ~90s per piece of raw meat lost to rot

const REGROW_TICKS = 900; // ~90s

/**
 * What stops a Lieutenant camping the place he made a kill.
 *
 * Three things were compounding. The crows sit over wherever you were last
 * loud, which after a fight is your corpse; a patrolling Lieutenant walks
 * toward the crows; and every new soul used to arrive at the same fixed
 * tile. So he stood on the spot and killed each soul as it appeared, which
 * is not difficulty, it is a locked door.
 */
const KILL_REST_TICKS = 400; // 40s in which he is satisfied and ignores everything
const RESPAWN_GRACE_TICKS = 120; // 12s in which a new soul is beneath his notice
const SPAWN_CLEAR_TILES = 8; // how far a new soul arrives from him
const SPAWN_CLEAR_CROWS = 4; // and from whatever the birds are still watching

const DAY_TICKS = 3000;
const NIGHT_TICKS = 3000;

export interface Input {
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
  gather: boolean; // E — chop, chip, pick, drink, or butcher whatever is to hand
  strike: boolean; // space
  build: boolean; // F — feed a fire, or build one
  makeSpear: boolean; // 1
  cook: boolean; // 2 — at a fire
  makeCloak: boolean; // 3 — at a fire
  eat: boolean; // 4
  makeKnife: boolean; // 5
  makeAxe: boolean; // 6
  makeCordage: boolean; // 7 — needs a knife
  setSnare: boolean; // 8 — place one you are carrying
  makeCharcoal: boolean; // 9 — at a fire, smother wood down
  smelt: boolean; // 0 — at a fire, ore and charcoal to a bar
  makeSword: boolean; // B — bar, wood and cordage, once each
  makeFishingLine: boolean; // L — cordage and wood, no fire needed
  fish: boolean; // C — hold at the water's edge with a line in hand
  cycleOffer: boolean; // T — what you would hand over
  give: boolean; // G — hand one over to whoever is standing next to you
  makePot: boolean; // P — clay, at a fire
  makeBoots: boolean; // O — 2 hide 1 cord
  makeGloves: boolean; // V — 2 hide 1 cord
  /**
   * H — talk to whoever is nearest, or close the conversation you're
   * already in. While talking, the numbered keys (1-9) below stop
   * crafting and pick a reply instead — see stepPlayer.
   */
  talk: boolean;
  /**
   * K — pass a little of your best skill on to whoever's nearest. Free, the
   * same as G is: this is §3's "teaching for free" kindness act, not §18's
   * paid apprentice economy, which needs a currency Stage B doesn't have.
   */
  teach: boolean;
  makeBow: boolean; // R — wood, cordage and pitch, no fire needed
  makeArrow: boolean; // N — wood and glue, needs a knife in hand, no fire needed
  /** U — post crowns to the Bounty Board, at the board itself. See doPostBounty for who it actually funds and who it lands on. */
  postBounty: boolean;
  /** Z — cast a bolt at whatever's nearest, melee-range first then bow-range, the same targeting doStrike already uses. Free to attempt; not free to be caught doing. */
  castBolt: boolean;
  /** M — cast a heal on yourself. Same risk as a bolt, no target. */
  castHeal: boolean;
  /** I — cycle the main hand through whatever weapons you actually own. Equipping a bow always empties the off hand (below); see doCycleMainHand. */
  cycleMainHand: boolean;
  /** J — cycle the off hand the same way, restricted to one-handers and skipping whatever's already in the main hand. Does nothing while a bow is equipped — both hands are already full. */
  cycleOffHand: boolean;
}

export const NO_INPUT: Input = {
  dx: 0,
  dy: 0,
  gather: false,
  strike: false,
  build: false,
  makeSpear: false,
  cook: false,
  makeCloak: false,
  eat: false,
  makeKnife: false,
  makeAxe: false,
  makeCordage: false,
  setSnare: false,
  makeCharcoal: false,
  smelt: false,
  makeSword: false,
  makeFishingLine: false,
  fish: false,
  cycleOffer: false,
  give: false,
  makePot: false,
  makeBoots: false,
  makeGloves: false,
  talk: false,
  teach: false,
  makeBow: false,
  makeArrow: false,
  postBounty: false,
  castBolt: false,
  castHeal: false,
  cycleMainHand: false,
  cycleOffHand: false,
};

export interface DeathEvent {
  id: number;
  lineage: number;
  cause: DeathCause;
  tick: number;
  wood: number;
  kills: number;
  /** What this character was best at. Goes on the Barrow-list as a name, not as a bonus. */
  mastery: string;
}

/**
 * Every hand-over, in order. Stage C has no currency and no escrow — one
 * soul gives, the other receives — but the ledger is kept from the first
 * trade because DESIGN §6.8 says trades must be authoritative, logged and
 * replayable if cash-out is ever to be possible, and that is free to do now
 * and impossible to retrofit.
 */
export interface TradeRecord {
  tick: number;
  from: number;
  to: number;
  item: Tradeable;
}

/**
 * Everything the Overlord has done, in order. Kept for the same reason the
 * trade ledger is (§6.8): an action a player cannot audit is an action they
 * cannot learn from, and a season nobody can replay proves nothing.
 */
export interface Incident {
  tick: number;
  action: OverlordAction;
  why: string;
}

/**
 * A dead soul's pack, spilled where they fell — PLAN §8.5's "the plunder is
 * on the floor," said of an officer's death, now true of a player's own.
 * Only a soul-on-soul kill drops one (§11.3): starvation, the cold, a boar,
 * a wolf or the Lieutenant take a life and nothing of what it carried —
 * only another soul's blade leaves something for the ground to keep. Crowns
 * never land here at all; see `dropLoot` for where those actually go.
 */
export interface LootPile {
  x: number;
  y: number;
  pack: Pack;
  diedAtTick: number;
}

/**
 * A price on a specific soul's head, posted at the Bounty Board (doPostBounty)
 * and paid out whole to whoever actually lands the kill (resolveBounty) —
 * or, if something else takes that soul first, forfeited to the dead
 * stockpile rather than refunded to whoever posted it (§28's "five ways to
 * answer a mark" names none of this; it's a narrower, player-run cousin of
 * that system, not an implementation of it).
 */
export interface Bounty {
  targetId: number;
  amount: number;
}

export interface SimState {
  tick: number;
  world: World;
  players: Player[];
  lieutenant: Lieutenant;
  creatures: Creature[];
  npcs: Npc[];
  /** The Grey King's Scouts currently out — sent by the Overlord (director.ts's send_scout), not part of the fixed roster. */
  scouts: Scout[];
  trades: TradeRecord[];
  incidents: Incident[];
  lootPiles: LootPile[];
  bounties: Bounty[];
  /**
   * PLAN's own "his coin funds the bandits who do it" (top-level decisions
   * table), made literal: the King's cut of every kill's crowns lands here
   * rather than vanishing, and it's the only funding source a notorious
   * soul has at the Bounty Board — an outlaw spends the dead's money, a
   * lawful soul spends their own.
   */
  deadStockpile: number;
  noise: number;
  /** What the Storyteller has done to the Verge, and for how long (§3.5). */
  grief: number; // recent deaths buy the survivors quiet
  coldUntil: number;
  blightUntil: number;
  marked: number; // a soul the Lieutenant wants above all others, or -1
  noiseX: number; // where the last loud thing happened — the crows remember it
  noiseY: number;
  crowX: number; // the flock's drifting centre
  crowY: number;
  rng: Rng;
  lastDamageSource: DeathCause[]; // per player id
  /** Who last struck them, per player id, or -1 — only meaningful alongside a "killed by another soul" cause; see dropLoot/resolveBounty in kill(). */
  lastKilledBy: number[];
  log: string[];
  flags: {
    firstGather: boolean;
    firstSighting: boolean;
    firstKill: boolean;
    firstCrows: boolean;
    firstTrade: boolean;
    firstStone: boolean;
    firstSnare: boolean;
    firstOre: boolean;
    firstSword: boolean;
    firstFish: boolean;
    firstSoulKill: boolean;
    firstNotorious: boolean;
    firstCommonsStanding: boolean;
    firstCrown: boolean;
    firstCrownMelted: boolean;
    firstClay: boolean;
    firstCopper: boolean;
    firstCopperBar: boolean;
    firstCopperSword: boolean;
    firstPot: boolean;
    firstBoots: boolean;
    firstGloves: boolean;
    firstNpcKill: boolean;
    firstTeaching: boolean;
    firstBow: boolean;
    firstBounty: boolean;
    firstMagic: boolean;
    firstScoutLocate: boolean;
  };
}

export function newSim(seed: number, players: Player[]): SimState {
  const rng = new Rng(seed);
  const world = new World(seed);
  const lieutenant = newLieutenant(18 * TILE, 12 * TILE);
  const first = players[0];
  return {
    tick: 0,
    world,
    players,
    lieutenant,
    creatures: spawnCreatures(world, rng, players),
    npcs: spawnNpcs(),
    scouts: [],
    trades: [],
    incidents: [],
    lootPiles: [],
    bounties: [],
    deadStockpile: 0,
    noise: 0,
    grief: 0,
    coldUntil: 0,
    blightUntil: 0,
    marked: -1,
    noiseX: first ? first.x : 0,
    noiseY: first ? first.y : 0,
    crowX: first ? first.x : 0,
    crowY: first ? first.y : 0,
    rng,
    lastDamageSource: players.map(() => "starved" as DeathCause),
    lastKilledBy: players.map(() => -1),
    log: [],
    flags: {
      firstGather: false,
      firstSighting: false,
      firstKill: false,
      firstCrows: false,
      firstTrade: false,
      firstStone: false,
      firstSnare: false,
      firstOre: false,
      firstSword: false,
      firstFish: false,
      firstSoulKill: false,
      firstNotorious: false,
      firstCommonsStanding: false,
      firstCrown: false,
      firstCrownMelted: false,
      firstClay: false,
      firstCopper: false,
      firstCopperBar: false,
      firstCopperSword: false,
      firstPot: false,
      firstBoots: false,
      firstGloves: false,
      firstNpcKill: false,
      firstTeaching: false,
      firstBow: false,
      firstBounty: false,
      firstMagic: false,
      firstScoutLocate: false,
    },
  };
}

/**
 * Somewhere for a new soul to wash up: walkable, well away from the
 * Lieutenant, and not under the crows. A fixed arrival tile is what turns
 * one bad death into ten.
 */
function findSpawn(state: SimState): { x: number; y: number } {
  const { world, rng, lieutenant } = state;
  const fromHim = SPAWN_CLEAR_TILES * TILE * (SPAWN_CLEAR_TILES * TILE);
  const fromBirds = SPAWN_CLEAR_CROWS * TILE * (SPAWN_CLEAR_CROWS * TILE);
  for (let attempt = 0; attempt < 64; attempt++) {
    const x = rng.nextInt(WORLD_W) * TILE;
    const y = rng.nextInt(WORLD_H) * TILE;
    if (!walkable(world, x, y)) continue;
    if (distSq(x, y, lieutenant.x, lieutenant.y) < fromHim) continue;
    if (state.noise >= CROW_THRESHOLD && distSq(x, y, state.crowX, state.crowY) < fromBirds) continue;
    return { x, y };
  }
  // The Verge is small; on an unlucky roll, settle for the far corner from
  // him rather than dropping a soul in his lap.
  const x = lieutenant.x > ((WORLD_W - 1) * TILE) / 2 ? 0 : (WORLD_W - 1) * TILE;
  const y = lieutenant.y > ((WORLD_H - 1) * TILE) / 2 ? 0 : (WORLD_H - 1) * TILE;
  return { x, y };
}

/** A soul joins the Verge. The authority above the sim calls this, not `newPlayer`. */
export function addSoul(state: SimState, lineage: number): Player {
  const spot = findSpawn(state);
  const player = newPlayer(lineage, state.players.length, spot.x, spot.y, state.tick + RESPAWN_GRACE_TICKS);
  state.players.push(player);
  state.lastDamageSource.push("starved");
  state.lastKilledBy.push(-1);
  return player;
}

/** The next soul in a lineage takes over a slot. Ids are stable; souls are not. */
export function replaceSoul(state: SimState, id: number, lineage: number): Player {
  const spot = findSpawn(state);
  const player = newPlayer(lineage, id, spot.x, spot.y, state.tick + RESPAWN_GRACE_TICKS);
  state.players[id] = player;
  state.lastDamageSource[id] = "starved";
  state.lastKilledBy[id] = -1;
  if (state.lieutenant.target === id) {
    state.lieutenant.state = "patrol";
    state.lieutenant.target = -1;
  }
  return player;
}

export function isNight(tick: number): boolean {
  return tick % (DAY_TICKS + NIGHT_TICKS) >= DAY_TICKS;
}

function tileOfUnits(u: number): number {
  return Math.floor(u / TILE);
}

function say(state: SimState, line: string): void {
  state.log.push(line);
  if (state.log.length > 40) state.log.shift();
}

/**
 * The campfire tile close enough to matter, if there is one.
 *
 * This used to compare a soul against the corner of its own tile, which is
 * always inside the fire radius — so warmth never drained, cold never killed
 * anyone, and the fire (the one object that trades safety for visibility)
 * was decoration.
 */
function fireTileNear(world: World, x: number, y: number): { x: number; y: number } | null {
  const px = tileOfUnits(x);
  const py = tileOfUnits(y);
  const reach = Math.ceil(FIRE_RADIUS / TILE);
  for (let ty = py - reach; ty <= py + reach; ty++) {
    for (let tx = px - reach; tx <= px + reach; tx++) {
      if (world.get(tx, ty) !== Tile.Campfire) continue;
      if (distSq(x, y, tx * TILE, ty * TILE) <= FIRE_RADIUS * FIRE_RADIUS) return { x: tx, y: ty };
    }
  }
  return null;
}

/**
 * Advance the world by exactly one tick. `inputs` is indexed by player id;
 * anything missing is treated as a soul standing still. Returns every death
 * that happened this tick, in player-id order.
 */
export function stepTick(state: SimState, inputs: ReadonlyArray<Input>): DeathEvent[] {
  const { world, lieutenant } = state;
  state.tick++;
  const deaths: DeathEvent[] = [];

  for (const player of state.players) {
    if (!player.alive) continue;
    const input = inputs[player.id] ?? NO_INPUT;
    const death = stepPlayer(state, player, input);
    if (death) deaths.push(death);
  }

  if (!isBlighted(state)) world.tickRegrowth(state.tick);
  if (world.tickFires(state.tick) > 0) say(state, "A fire burns out. The cold comes back in.");
  // Unclaimed plunder doesn't wait forever — same shape ash takes a burnt-out fire back.
  if (state.lootPiles.length > 0) {
    state.lootPiles = state.lootPiles.filter((pile) => state.tick - pile.diedAtTick < LOOT_ROT_TICKS);
  }
  if (state.grief > 0 && state.tick % GRIEF_DECAY_EVERY === 0) state.grief--;
  if (state.tick % NOISE_DECAY_EVERY === 0) state.noise = clamp(state.noise - 1, 0, NOISE_MAX);

  // --- the crows drift toward whatever was last loud ---
  const crow = stepToward(state.crowX, state.crowY, state.noiseX, state.noiseY, CROW_SPEED);
  state.crowX = crow.x;
  state.crowY = crow.y;
  if (state.noise >= CROW_THRESHOLD && !state.flags.firstCrows) {
    state.flags.firstCrows = true;
    say(state, "The Grey King: “Crows. They keep better watch than my Lieutenants, and they work for nothing.”");
  }

  // --- beasts ---
  const ctx = {
    world,
    rng: state.rng,
    tick: state.tick,
    souls: state.players,
    noise: state.noise,
    noiseMax: NOISE_MAX,
    night: isNight(state.tick),
  };
  for (const c of state.creatures) {
    stepCreature(c, ctx);
    // A charging boar and a hunting wolf both bite the same way: contact,
    // a cooldown, and whoever the beast currently holds a grudge against.
    const biting = (c.kind === "hedge-boar" && c.state === "charge") || (c.kind === "wolf" && c.state === "hunt");
    if (!biting || c.goreCooldown > 0) continue;
    const target = state.players[c.angryAt];
    if (!target || !target.alive) continue;
    if (distSq(c.x, c.y, target.x, target.y) > CONTACT_RADIUS * CONTACT_RADIUS) continue;
    const damage = c.kind === "hedge-boar" ? BOAR_GORE_DAMAGE : WOLF_BITE_DAMAGE;
    const cause: DeathCause = c.kind === "hedge-boar" ? "gored by a boar" : "savaged by wolves";
    target.health = clamp(target.health - damage, 0, HEALTH_MAX);
    state.lastDamageSource[target.id] = cause;
    c.goreCooldown = c.kind === "hedge-boar" ? BOAR_GORE_COOLDOWN : WOLF_BITE_COOLDOWN;
  }

  // --- the village ---
  for (const npc of state.npcs) stepNpc(npc, world, state.rng, state.tick);

  // --- the Grey King's Scouts: report if they get away, vanish either way ---
  for (const scout of state.scouts) stepScout(scout, world, state.players, state.tick);
  state.scouts = state.scouts.filter((scout) => {
    if (!scout.alive) return false; // killed — bought time, nothing more happens
    if (scout.state === "fleeing" && state.tick >= scout.reportAtTick) {
      const target = state.players[scout.spottedId];
      if (target && target.alive) {
        target.scoutReports++;
        say(state, `A Scout breaks off, out of reach. Soul #${target.lineage} was seen.`);
        if (target.scoutReports >= SCOUT_LOCATE_THRESHOLD) {
          target.scoutReports = 0;
          bumpNoise(state, SCOUT_LOCATE_NOISE, target);
          say(state, `Enough of his Scouts have found Soul #${target.lineage}. He knows roughly where they are.`);
          if (!state.flags.firstScoutLocate) {
            state.flags.firstScoutLocate = true;
            say(state, "The Grey King: “Three of the same story. I don't need a fourth to know where to look.”");
          }
        }
      }
      return false; // reported — this one is done, killed or not
    }
    return true;
  });

  // A trapline pays out whether or not anyone is standing there.
  for (const catch_ of checkSnares(state.creatures, ctx)) {
    world.clearSnare(catch_.idx);
    const owner = state.players[catch_.owner];
    if (owner && owner.alive) {
      learn(state, owner, "trapping", XP.trap);
      say(state, `Soul #${owner.lineage}'s snare has taken something. It is still there, waiting to be cut out.`);
    } else {
      say(state, "A snare has taken something. It is still there, waiting to be cut out.");
    }
  }

  // --- the Lieutenant, and whoever he catches ---
  tickLieutenant(state);
  const quarry = state.players[lieutenant.target];
  if (quarry && quarry.alive && distSq(quarry.x, quarry.y, lieutenant.x, lieutenant.y) <= CONTACT_RADIUS * CONTACT_RADIUS) {
    lieutenant.contactTicks++;
    quarry.health = clamp(quarry.health - LIEUTENANT_DAMAGE_PER_TICK, 0, HEALTH_MAX);
    state.lastDamageSource[quarry.id] = "cut down by a Lieutenant";
  } else {
    lieutenant.contactTicks = 0;
  }

  // Damage lands after everything has moved, so a death is resolved once.
  for (const player of state.players) {
    if (!player.alive || player.health > 0) continue;
    deaths.push(kill(state, player));
  }

  return deaths;
}

function kill(state: SimState, player: Player): DeathEvent {
  player.alive = false;
  // A conversation doesn't survive the soul having it.
  player.talkingTo = null;
  player.dialogueNode = null;
  const cause = state.lastDamageSource[player.id] ?? "starved";
  say(state, `Soul #${player.lineage} is dead — ${cause}.`);

  state.grief += GRIEF_PER_DEATH;
  if (state.marked === player.id) state.marked = -1;

  const { lieutenant } = state;
  if (lieutenant.target === player.id) {
    lieutenant.state = "patrol";
    lieutenant.target = -1;
  }
  if (cause === "cut down by a Lieutenant") {
    // He has what he came for. He rests, and he rests somewhere else.
    lieutenant.restUntil = state.tick + KILL_REST_TICKS;
    lieutenant.waypointX = (WORLD_W - 1) * TILE - lieutenant.x;
    lieutenant.waypointY = (WORLD_H - 1) * TILE - lieutenant.y;
  }

  // Plunder and any bounty both hinge on whether another soul actually did
  // this — starvation, the cold, a boar, a wolf and the Lieutenant himself
  // leave nothing behind and collect nothing either.
  const killer = cause === "killed by another soul" ? state.players[state.lastKilledBy[player.id] ?? -1] : undefined;
  if (killer) dropLoot(state, killer, player);
  resolveBounty(state, player.id, killer ?? null);

  return {
    id: player.id,
    lineage: player.lineage,
    cause,
    tick: state.tick,
    wood: player.pack.wood,
    kills: player.kills,
    mastery: mastery(player.skills),
  };
}

function stepPlayer(state: SimState, player: Player, input: Input): DeathEvent | null {
  const { world } = state;
  const pack = player.pack;

  // --- magic cooldowns, ticking down whether or not either verb is pressed ---
  if (player.boltCooldown > 0) player.boltCooldown--;
  if (player.healCooldown > 0) player.healCooldown--;

  // --- movement ---
  if (input.dx !== 0 || input.dy !== 0) {
    // The ground under a soul's feet as they push off governs the whole
    // step — how fast it lets them go, and whether it announces them.
    const onMarsh = world.get(Math.floor(player.x / TILE), Math.floor(player.y / TILE)) === Tile.Marsh;
    const base = input.dx !== 0 && input.dy !== 0 ? PLAYER_SPEED_DIAG : PLAYER_SPEED;
    // Boots are a player-only modifier layered on top of the shared
    // terrainSpeedPct (move.ts) rather than a change to it — a Lieutenant
    // or a beast crossing the same marsh still gets the bare 55%.
    let speedPct = terrainSpeedPct(world, player.x, player.y);
    if (onMarsh && pack.boots > 0) speedPct = Math.min(100, speedPct + BOOTS_MARSH_BONUS_PCT);
    const speed = Math.trunc((base * speedPct) / 100);
    const moved = moveWithCollision(world, player.x, player.y, player.x + input.dx * speed, player.y + input.dy * speed);
    player.x = clamp(moved.x, 0, (WORLD_W - 1) * TILE);
    player.y = clamp(moved.y, 0, (WORLD_H - 1) * TILE);
    // Squelching through a marsh carries; standing in one, waiting, does not.
    if (onMarsh) {
      bumpNoise(state, NOISE_PER_MARSH_STEP, player);
      if (pack.boots > 0) {
        pack.boots--;
        if (pack.boots === 0) say(state, "The boots finally give out — soaked through and stitched apart at the seam.");
      }
    }
  }

  const px = tileOfUnits(player.x);
  const py = tileOfUnits(player.y);
  const lit = fireTileNear(world, player.x, player.y);
  player.atFire = lit !== null;
  // Fires warn once, on the way down, so the wood run is a decision and not
  // a surprise.
  if (lit && world.fuelAt(lit.x, lit.y) === FIRE_LOW_FUEL) say(state, "A fire is burning low. It wants more wood.");

  // --- needs drain ---
  if (state.tick % HYDRATION_DRAIN_EVERY === 0) player.needs.hydration = clamp(player.needs.hydration - 1, 0, NEED_MAX);
  if (state.tick % SATIETY_DRAIN_EVERY === 0) player.needs.satiety = clamp(player.needs.satiety - 1, 0, NEED_MAX);

  let coldEvery = pack.cloak > 0 ? WARMTH_DRAIN_EVERY_CLOAKED : WARMTH_DRAIN_EVERY;
  // A cold snap takes twice as much, cloak or no cloak.
  if (isColdSnap(state)) coldEvery = Math.max(1, Math.trunc(coldEvery / 2));
  if (player.atFire) {
    player.needs.warmth = clamp(player.needs.warmth + WARMTH_REGEN_NEAR_FIRE, 0, NEED_MAX);
  } else if (state.tick % coldEvery === 0) {
    player.needs.warmth = clamp(player.needs.warmth - 1, 0, NEED_MAX);
    // A cloak is spent by the cold it keeps off you, not by the clock.
    if (pack.cloak > 0) {
      pack.cloak--;
      if (pack.cloak === 0) say(state, "A cloak gives out — the hide is worn through.");
    }
  }

  // --- starvation damage ---
  if (player.needs.hydration === 0) {
    player.health -= STARVE_DAMAGE_PER_TICK;
    state.lastDamageSource[player.id] = "died of thirst";
  }
  if (player.needs.satiety === 0) {
    player.health -= STARVE_DAMAGE_PER_TICK;
    state.lastDamageSource[player.id] = "starved";
  }
  if (player.needs.warmth === 0) {
    player.health -= STARVE_DAMAGE_PER_TICK;
    state.lastDamageSource[player.id] = "froze";
  }
  player.health = clamp(player.health, 0, HEALTH_MAX);

  // Raw meat rots on a schedule; cooked meat keeps. The pressure that makes
  // a fire worth walking back to.
  if (state.tick % RAW_SPOIL_EVERY === 0 && pack.rawMeat > 0) {
    pack.rawMeat--;
    say(state, "A piece of raw meat has turned. Cook it next time.");
  }

  // --- talking, which takes over the numbered keys while it's happening ---
  if (input.talk) doTalk(state, player);

  if (player.talkingTo !== null) {
    // A conversation borrows the same nine keys crafting already uses —
    // one more context-sensitive verb, the same shape E/gather already is
    // — rather than adding a second numbered row nobody could remember.
    const replies: boolean[] = [
      input.makeSpear,
      input.cook,
      input.makeCloak,
      input.eat,
      input.makeKnife,
      input.makeAxe,
      input.makeCordage,
      input.setSnare,
      input.makeCharcoal,
    ];
    const chosen = replies.findIndex((pressed) => pressed);
    if (chosen >= 0) doDialogueChoice(state, player, chosen);
  } else {
    // --- the verbs ---
    if (input.gather) doGather(state, player, px, py);
    if (input.strike) doStrike(state, player);
    if (input.build) doBuild(state, player, px, py);
    if (input.makeSpear) doMakeSpear(state, player);
    if (input.cook) doCook(state, player);
    if (input.makeCloak) doMakeCloak(state, player);
    if (input.eat) doEat(state, player);
    if (input.makeKnife) doMakeKnife(state, player);
    if (input.makeAxe) doMakeAxe(state, player);
    if (input.makeCordage) doMakeCordage(state, player);
    if (input.setSnare) doSetSnare(state, player, px, py);
    if (input.makeCharcoal) doMakeCharcoal(state, player);
    if (input.smelt) doSmelt(state, player);
    if (input.makeSword) doMakeSword(state, player);
    if (input.makeFishingLine) doMakeFishingLine(state, player);
    if (input.fish) doFish(state, player, px, py);
    if (input.cycleOffer) cycleOffer(player);
    if (input.give) doGive(state, player);
    if (input.teach) doTeach(state, player);
    if (input.makePot) doMakePot(state, player);
    if (input.makeBoots) doMakeBoots(state, player);
    if (input.makeGloves) doMakeGloves(state, player);
    if (input.makeBow) doMakeBow(state, player);
    if (input.makeArrow) doMakeArrow(state, player);
    if (input.postBounty) doPostBounty(state, player);
    if (input.castBolt) doCastBolt(state, player);
    if (input.castHeal) doCastHeal(state, player);
    if (input.cycleMainHand) doCycleMainHand(state, player);
    if (input.cycleOffHand) doCycleOffHand(state, player);
  }

  // A death still has to land even mid-conversation — starvation and the
  // Lieutenant's contact damage above don't pause for a chat.
  return player.health <= 0 ? kill(state, player) : null;
}

/** E — loot a body first if there is one at hand, then butcher a carcass, since either is what you meant before any terrain is. */
function doGather(state: SimState, player: Player, px: number, py: number): void {
  const { world } = state;
  const pack = player.pack;

  const pileIdx = nearestLootPile(state, player);
  if (pileIdx >= 0) {
    const pile = state.lootPiles[pileIdx]!;
    for (const key of TRADEABLES) pack[key] += pile.pack[key];
    pack.snare += pile.pack.snare;
    for (const key of LOOT_TOOL_KEYS) pack[key] = Math.max(pack[key], pile.pack[key]);
    state.lootPiles.splice(pileIdx, 1);
    say(state, `Soul #${player.lineage} takes what's left of the dead.`);
    return;
  }

  const carcass = nearestCreature(state, player, isCarcass);
  if (carcass) {
    const stats = STATS[carcass.kind];
    const extra = butcherBonus(player.skills);
    // A knife is the difference between taking a carcass apart and tearing
    // it apart. It wears, like everything else.
    const blade = pack.knife > 0 ? KNIFE_BONUS : 0;
    if (pack.knife > 0) {
      pack.knife--;
      if (pack.knife === 0) say(state, "The knife's edge is gone. It is a stone again.");
    }
    const meat = stats.meat + extra + blade;
    const hide = Math.max(0, stats.hide === 0 ? 0 : stats.hide + extra + blade);
    pack.rawMeat += meat;
    pack.hide += hide;
    // Connective tissue and scrap, off every carcass regardless of size —
    // nobody was carrying meat or hide for this part (§15's "a graph with
    // no waste is a graph where nothing is a bargain").
    pack.glue += GLUE_PER_BUTCHER;
    carcass.butchered = true;
    carcass.respawnAtTick = state.tick + CREATURE_RESPAWN_TICKS;
    say(state, `You butcher the ${carcass.kind}: ${meat} meat, ${hide} hide, ${GLUE_PER_BUTCHER} glue.`);
    learn(state, player, "butchery", XP.butcher);
    return;
  }

  const dirs: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (const [ddx, ddy] of dirs) {
    const gx = px + ddx;
    const gy = py + ddy;
    const t = world.get(gx, gy);
    if (t === Tile.Tree || t === Tile.Thicket) {
      const thicket = t === Tile.Thicket;
      world.harvest(gx, gy, state.tick, REGROW_TICKS);
      // An axe is more wood and *less* noise — the one tool that makes you
      // safer by being better, which is the same argument skill makes.
      const axed = pack.axe > 0;
      pack.wood += woodPerTree(player.skills) + (axed ? AXE_WOOD_BONUS : 0) + (thicket ? THICKET_WOOD_BONUS : 0);
      let noise = skilledNoise(NOISE_PER_GATHER, player, "woodcraft");
      // A denser stand costs more to be heard taking, same trade a rock
      // outcrop already makes between yield and quiet.
      if (thicket) noise = Math.trunc((noise * THICKET_NOISE_BONUS_PCT) / 100);
      if (axed) {
        noise = Math.trunc((noise * AXE_QUIET) / 100);
        pack.axe--;
        if (pack.axe === 0) say(state, "The axe head splits. Back to breaking branches by hand.");
      }
      bumpNoise(state, noise, player);
      learn(state, player, "woodcraft", XP.chop);
      if (!state.flags.firstGather) {
        state.flags.firstGather = true;
        say(state, "The Grey King: “...Someone is cutting wood in the Verge. How ordinary. How loud.”");
      }
      return;
    }
    if (t === Tile.Rock) {
      // A rock does not run out. What it costs is being heard.
      pack.stone++;
      bumpNoise(state, glovedNoise(state, NOISE_PER_CHIP, player), player);
      if (!state.flags.firstStone) {
        state.flags.firstStone = true;
        say(state, "The Grey King: “Stone on stone. I can hear that from the Spire, and so can everything nearer.”");
      }
      return;
    }
    if (t === Tile.Ore) {
      // Same deal as a rock, one tier up: never runs out, and the loudest
      // thing you can do in the Verge.
      pack.ore++;
      bumpNoise(state, glovedNoise(state, NOISE_PER_ORE, player), player);
      if (!state.flags.firstOre) {
        state.flags.firstOre = true;
        say(state, "The Grey King: “Ore, now. You are digging for something worth taking.”");
      }
      return;
    }
    if (t === Tile.Copper) {
      // Same rule as ore, one seam rarer — see world.ts's mineral clusters.
      pack.copper++;
      bumpNoise(state, glovedNoise(state, NOISE_PER_COPPER, player), player);
      if (!state.flags.firstCopper) {
        state.flags.firstCopper = true;
        say(state, "The Grey King: “Copper. Older than the ore, and it was mine first too.”");
      }
      return;
    }
    if (t === Tile.Ruin) {
      // Never runs out, like Rock and Ore — but a ruin is not a resource,
      // it is a chance. Most digging turns up nothing at all.
      bumpNoise(state, NOISE_PER_RUIN_DIG, player);
      if (state.rng.chance(RUIN_CROWN_CHANCE_PCT, 100)) {
        pack.crowns++;
        say(state, "An old crown, out of the rubble. Someone minted this for a kingdom that is gone.");
        if (!state.flags.firstCrown) {
          state.flags.firstCrown = true;
          say(state, "The Grey King: “I remember whose face that was. He thought his mint would outlast me too.”");
        }
      } else {
        say(state, "Rubble, and more rubble. Whatever this room held, it isn't here anymore.");
      }
      return;
    }
    if (t === Tile.Bush) {
      world.harvest(gx, gy, state.tick, REGROW_TICKS);
      player.needs.satiety = clamp(player.needs.satiety + 200, 0, NEED_MAX);
      bumpNoise(state, Math.trunc(NOISE_PER_GATHER / 3), player);
      return;
    }
    if (t === Tile.Water) {
      player.needs.hydration = clamp(player.needs.hydration + 400, 0, NEED_MAX);
      return;
    }
    if (t === Tile.Clay) {
      // Soil, not a vein (§3.1) — as ordinary and as quiet as picking a bush.
      pack.clay++;
      bumpNoise(state, NOISE_PER_CLAY, player);
      if (!state.flags.firstClay) {
        state.flags.firstClay = true;
        say(state, "The Grey King: “Clay. Even a hedge-witch's kiln needs a pot to hold the water.”");
      }
      return;
    }
    if (t === Tile.Meadow) {
      // Foraged, not farmed — never depletes, the same reasoning as Rock and Ore.
      player.needs.satiety = clamp(player.needs.satiety + MEADOW_SATIETY, 0, NEED_MAX);
      bumpNoise(state, NOISE_PER_MEADOW, player);
      return;
    }
  }
}

/**
 * Space — hit the nearest living thing in reach. Loud, always, whenever it
 * lands. Tries melee first, at STRIKE_RADIUS; only when nothing at all is
 * that close does it fall back to a bow shot at BOW_RADIUS, if one is
 * strung and loaded — a bow is reach a soul reaches for, not a first
 * choice, so anything already within arm's length is met with whatever's
 * in the other hand exactly as before.
 */
/** A hand's own base damage — 0 for "none," or for a hand still labelled with a weapon that's since broken or was never actually forged. */
function handDamage(pack: Pack, hand: HandItem, skills: Skills): number {
  if (hand === "sword" && pack.sword > 0) return SWORD_DAMAGE + swordBonus(skills);
  if (hand === "copperSword" && pack.copperSword > 0) return COPPER_SWORD_DAMAGE;
  if (hand === "spear" && pack.spear > 0) return SPEAR_DAMAGE;
  return 0;
}

function doStrike(state: SimState, player: Player): void {
  const pack = player.pack;

  // Two-handed: equipping a bow always empties the other hand (below), so
  // there is never a separate melee weapon to prefer here the way the old
  // auto-pick had to. One reach covers close and far alike — if something
  // is already in your face with a bow drawn, the honest answer is still
  // to loose it, not to stand there empty-handed.
  if (player.mainHand === "bow") {
    if (pack.bow < 1 || pack.arrow < 1) return; // the bow itself, or the arrows, ran out since it was equipped
    const shot = strikeNearest(state, player, BOW_RADIUS, BOW_DAMAGE + strikeBonus(player.skills), () => spendArrow(state, pack));
    if (shot) bumpNoise(state, skilledNoise(NOISE_PER_BOWSHOT, player, "hunting"), player);
    return;
  }

  // Whatever's actually in each hand, chosen by the player (doCycleMainHand/
  // doCycleOffHand) rather than picked automatically. Dual-wielding two
  // one-handers adds half the off-hand weapon's own base damage on top of
  // the main hand's full damage — a real, if modest, reason to carry two
  // different weapons rather than one.
  const mainDamage = handDamage(pack, player.mainHand, player.skills);
  const offDamage = handDamage(pack, player.offHand, player.skills);
  const damage = (mainDamage > 0 ? mainDamage : FIST_DAMAGE) + Math.trunc(offDamage / 2) + strikeBonus(player.skills);
  const hit = strikeNearest(state, player, STRIKE_RADIUS, damage, () => {
    spendHand(state, pack, player.mainHand);
    if (offDamage > 0) spendHand(state, pack, player.offHand);
  });
  if (hit) bumpNoise(state, skilledNoise(NOISE_PER_STRIKE, player, "hunting"), player);
}

/** After any successful cast — the noise and the risk every working carries (§9), regardless of which spell or what it hit. */
function afterCast(state: SimState, player: Player): void {
  bumpNoise(state, NOISE_PER_CAST, player);
  if (state.rng.chance(...MAGIC_MARK_CHANCE)) {
    applyOutlawry(state, player, MAGIC_STANDING_PENALTY);
    if (!state.flags.firstMagic) {
      state.flags.firstMagic = true;
      say(state, "The Grey King: “Someone still remembers the words. I made those cost blood for a reason, and I have not forgotten why.”");
    }
  }
}

/** Z — a bolt at whatever's nearest, the same melee-then-bow reach doStrike already uses. No ingredient, no tool — only the risk in afterCast. */
function doCastBolt(state: SimState, player: Player): void {
  if (player.boltCooldown > 0) return;
  const hit = strikeNearest(state, player, BOLT_RADIUS, BOLT_DAMAGE, () => {
    player.boltCooldown = BOLT_COOLDOWN_TICKS;
  });
  if (hit) afterCast(state, player);
}

/** M — heal yourself. No target, same risk. */
function doCastHeal(state: SimState, player: Player): void {
  if (player.healCooldown > 0 || player.health >= HEALTH_MAX) return;
  player.health = clamp(player.health + HEAL_AMOUNT, 0, HEALTH_MAX);
  player.healCooldown = HEAL_COOLDOWN_TICKS;
  say(state, `Soul #${player.lineage} closes a wound that shouldn't have closed that fast.`);
  afterCast(state, player);
}

/**
 * Resolve one hit against whichever of a creature, a soul or an NPC is
 * nearest within `radius` — the shape doStrike's melee pass and its bow
 * fallback both need, differing only in reach, damage and what the hit
 * spends. Returns whether anything was actually there to hit, so doStrike
 * knows whether to bump noise at all (a swing or a shot at nothing makes
 * none) and whether the bow is worth trying next.
 */
function strikeNearest(state: SimState, player: Player, radius: number, damage: number, spend: () => void): boolean {
  // Whichever living thing is nearer gets hit — a beast, another soul, a
  // villager, or now a Scout. "The nearest living thing in reach" was
  // always the honest description of this verb.
  const creatureTarget = nearestCreature(state, player, (c) => c.state !== "dead", radius);
  const creatureSq = creatureTarget ? distSq(creatureTarget.x, creatureTarget.y, player.x, player.y) : Number.MAX_SAFE_INTEGER;
  const soulTarget = nearestSoul(state, player, radius);
  const soulSq = soulTarget ? distSq(soulTarget.x, soulTarget.y, player.x, player.y) : Number.MAX_SAFE_INTEGER;
  const npcTarget = nearestNpc(state, player, radius);
  const npcSq = npcTarget ? distSq(npcTarget.x, npcTarget.y, player.x, player.y) : Number.MAX_SAFE_INTEGER;
  const scoutTarget = nearestScout(state, player, radius);
  const scoutSq = scoutTarget ? distSq(scoutTarget.x, scoutTarget.y, player.x, player.y) : Number.MAX_SAFE_INTEGER;
  if (!creatureTarget && !soulTarget && !npcTarget && !scoutTarget) return false;

  // Whichever is actually nearest gets hit, checked in the same
  // "closer wins" shape the beast-vs-soul choice already used.
  if (scoutTarget && scoutSq <= creatureSq && scoutSq <= soulSq && scoutSq <= npcSq) {
    const killed = woundScout(scoutTarget, damage);
    spend();
    // No standing cost and no outlawry mark: he is the King's own agent,
    // not the "expelled from normal towns" case a villager or a player
    // kill answers to. A little hunting XP, same as any other kill —
    // silencing him before he reports is still a real hunt.
    learn(state, player, "hunting", killed ? XP.kill : XP.strike);
    if (killed) {
      player.kills++;
      say(state, "The Scout goes down before he can turn and run.");
    }
    return true;
  }

  if (npcTarget && npcSq <= creatureSq && npcSq <= soulSq && npcSq <= scoutSq) {
    const killed = woundNpc(npcTarget, damage, state.tick);
    spend();
    if (killed) {
      player.kills++;
      say(state, `${npcTarget.name} goes down.`);
      if (!state.flags.firstNpcKill) {
        state.flags.firstNpcKill = true;
        say(state, "The Grey King: “One of the harmless ones. That costs more than coin, where you're going to feel it.”");
      }
      // No hunting XP here — a real hunt teaches something; killing someone
      // who couldn't fight back doesn't, and shouldn't pretend to.
      applyOutlawry(state, player, NPC_KILL_STANDING_PENALTY);
    }
    return true;
  }

  if (soulTarget && soulSq <= creatureSq && soulSq <= scoutSq) {
    soulTarget.health = clamp(soulTarget.health - damage, 0, HEALTH_MAX);
    state.lastDamageSource[soulTarget.id] = "killed by another soul";
    state.lastKilledBy[soulTarget.id] = player.id; // read by kill() below, for loot and any bounty
    const killed = soulTarget.health <= 0;
    learn(state, player, "hunting", killed ? XP.kill : XP.strike);
    spend();
    if (killed) {
      player.kills++;
      say(state, `Soul #${soulTarget.lineage} goes down.`);
      if (!state.flags.firstSoulKill) {
        state.flags.firstSoulKill = true;
        say(state, "The Grey King: “There. Now you understand what I have always wanted from this valley.”");
      }
      applyOutlawry(state, player, STANDING_KILL_PENALTY);
    }
    return true;
  }

  const quarry = creatureTarget!;
  const killed = woundCreature(quarry, damage, state.tick, player.id);
  learn(state, player, "hunting", killed ? XP.kill : XP.strike);
  spend();

  if (killed) {
    player.kills++;
    say(state, `The ${quarry.kind} goes down. Stand over it and press E.`);
    if (!state.flags.firstKill) {
      state.flags.firstKill = true;
      say(state, "The Grey King: “Blood in the Verge. Good. It makes you easier to follow.”");
    }
  } else if (quarry.kind === "hedge-boar") {
    say(state, "The boar turns on you.");
  }
  return true;
}

/**
 * The plunder off a soul-on-soul kill: crowns split (killer's cut now, the
 * King's share simply gone), everything else spilled as a lootable pile at
 * the victim's feet — see LootPile and KILLER_CROWN_CUT_PCT above.
 */
function dropLoot(state: SimState, killer: Player, victim: Player): void {
  const crowns = victim.pack.crowns;
  if (crowns > 0) {
    const cut = Math.trunc((crowns * KILLER_CROWN_CUT_PCT) / 100);
    killer.pack.crowns += cut;
    // Not vanished — banked. The one funding source a notorious soul has
    // at the Bounty Board (doPostBounty), same coin the top-level "his coin
    // funds the bandits who do it" decision already promised.
    state.deadStockpile += crowns - cut;
    victim.pack.crowns = 0;
    say(
      state,
      cut > 0
        ? `Soul #${killer.lineage} takes ${cut} crowns off the body. The rest is gone before it hits the ground — his due.`
        : `What few crowns Soul #${victim.lineage} carried are gone before they hit the ground — his due.`,
    );
  }

  const dropped: Pack = { ...victim.pack };
  state.lootPiles.push({ x: victim.x, y: victim.y, pack: dropped, diedAtTick: state.tick });
  say(state, `Soul #${victim.lineage}'s pack spills across the ground. Someone will take it, or the valley will.`);
}

/**
 * Pay a bounty on a dead soul to whoever actually killed them, or forfeit
 * it to the dead stockpile if nothing did (starvation, the cold, a boar, a
 * wolf, the Lieutenant himself) — nobody swung for it, so nobody collects.
 */
function resolveBounty(state: SimState, targetId: number, killer: Player | null): void {
  const idx = state.bounties.findIndex((b) => b.targetId === targetId);
  if (idx < 0) return;
  const bounty = state.bounties[idx]!;
  state.bounties.splice(idx, 1);
  if (killer) {
    killer.pack.crowns += bounty.amount;
    say(state, `Soul #${killer.lineage} collects a ${bounty.amount}-crown bounty off the body.`);
  } else {
    state.deadStockpile += bounty.amount;
    say(state, `A bounty goes unclaimed — the crowns fall back into the stockpile.`);
  }
}

/**
 * U — post crowns to the Bounty Board. No picker: a lawful soul (standing
 * above NOTORIOUS_STANDING) spends their own crowns and always funds the
 * worst other soul currently known; a notorious one spends the dead
 * stockpile instead and always funds the best — the two poles standing
 * already gives us, rather than a name the poster has to somehow choose.
 */
function doPostBounty(state: SimState, player: Player): void {
  if (distSq(player.x, player.y, BOARD_X, BOARD_Y) > BOARD_RADIUS * BOARD_RADIUS) return;

  const outlaw = player.standing <= NOTORIOUS_STANDING;
  let target: Player | null = null;
  for (const other of state.players) {
    if (other.id === player.id || !other.alive) continue;
    if (!target || (outlaw ? other.standing > target.standing : other.standing < target.standing)) target = other;
  }
  if (!target) return;

  if (outlaw) {
    if (state.deadStockpile < BOUNTY_POST_AMOUNT) return;
    state.deadStockpile -= BOUNTY_POST_AMOUNT;
  } else {
    if (player.pack.crowns < BOUNTY_POST_AMOUNT) return;
    player.pack.crowns -= BOUNTY_POST_AMOUNT;
  }

  let bounty = state.bounties.find((b) => b.targetId === target!.id);
  if (!bounty) {
    bounty = { targetId: target.id, amount: 0 };
    state.bounties.push(bounty);
  }
  bounty.amount += BOUNTY_POST_AMOUNT;
  say(
    state,
    outlaw
      ? `Soul #${player.lineage} spends the dead's own coin — ${bounty.amount} crowns now on Soul #${target.lineage}'s head.`
      : `Soul #${player.lineage} posts ${BOUNTY_POST_AMOUNT} crowns on Soul #${target.lineage}'s head — ${bounty.amount} now, on the board.`,
  );
  if (!state.flags.firstBounty) {
    state.flags.firstBounty = true;
    say(state, "The Grey King: “A price on each other's heads. I used to be the only one who could set one. How democratic.”");
  }
}

/** Whichever weapon a hand actually holds wears one use — a broken or unowned one has already dealt no damage via handDamage, so there's nothing here to spend either. */
function spendHand(state: SimState, pack: Pack, hand: HandItem): void {
  if (hand === "sword" && pack.sword > 0) {
    pack.sword--;
    if (pack.sword === 0) say(state, "The sword's edge finally gives out. It was a blade, once.");
  } else if (hand === "copperSword" && pack.copperSword > 0) {
    pack.copperSword--;
    if (pack.copperSword === 0) say(state, "The copper blade bends, then snaps. Soft metal was always going to give out first.");
  } else if (hand === "spear" && pack.spear > 0) {
    pack.spear--;
    if (pack.spear === 0) say(state, "A spear splinters on the last blow.");
  }
}

const MAIN_HAND_OPTIONS: readonly HandItem[] = ["none", "spear", "sword", "copperSword", "bow"];
const OFF_HAND_OPTIONS: readonly HandItem[] = ["none", "spear", "sword", "copperSword"];

function ownsHandItem(pack: Pack, item: HandItem): boolean {
  if (item === "none") return true;
  if (item === "bow") return pack.bow > 0;
  return pack[item] > 0;
}

function handLabel(item: HandItem): string {
  return item === "none" ? "empty" : item === "copperSword" ? "copper sword" : item;
}

/** I — cycle the main hand through whatever weapons you actually own, skipping anything already in the off hand (you only own one of each). Equipping a bow always empties the off hand — it takes both. */
function doCycleMainHand(state: SimState, player: Player): void {
  const pack = player.pack;
  let i = MAIN_HAND_OPTIONS.indexOf(player.mainHand);
  for (let tries = 0; tries < MAIN_HAND_OPTIONS.length; tries++) {
    i = (i + 1) % MAIN_HAND_OPTIONS.length;
    const candidate = MAIN_HAND_OPTIONS[i]!;
    if (!ownsHandItem(pack, candidate)) continue;
    if (candidate !== "none" && candidate === player.offHand) continue;
    player.mainHand = candidate;
    if (candidate === "bow") player.offHand = "none";
    say(state, `Main hand: ${handLabel(candidate)}.`);
    return;
  }
}

/** J — the off hand's own cycle: no bow (that's what makes the main hand's bow two-handed), and it does nothing at all while the main hand already is one — there is no second hand left to fill. */
function doCycleOffHand(state: SimState, player: Player): void {
  if (player.mainHand === "bow") return;
  const pack = player.pack;
  let i = OFF_HAND_OPTIONS.indexOf(player.offHand);
  for (let tries = 0; tries < OFF_HAND_OPTIONS.length; tries++) {
    i = (i + 1) % OFF_HAND_OPTIONS.length;
    const candidate = OFF_HAND_OPTIONS[i]!;
    if (!ownsHandItem(pack, candidate)) continue;
    if (candidate !== "none" && candidate === player.mainHand) continue;
    player.offHand = candidate;
    say(state, `Off hand: ${handLabel(candidate)}.`);
    return;
  }
}

/**
 * Crafting a weapon into an empty main hand equips it there automatically
 * — the one piece of the old auto-pick behaviour worth keeping, so a fresh
 * soul isn't fighting barehanded by default just because equipping is now
 * a real choice. Never overrides a hand that already holds something;
 * that's what I/J are for.
 */
function autoEquipMain(player: Player, item: HandItem): void {
  if (player.mainHand === "none") {
    player.mainHand = item;
    if (item === "bow") player.offHand = "none";
  }
}

/** What a bow shot spends: the arrow is gone every time, the bow itself wears the same way any other tool does. */
function spendArrow(state: SimState, pack: Player["pack"]): void {
  pack.arrow--;
  pack.bow--;
  if (pack.bow === 0) say(state, "The bowstring finally gives out. It is just a stick, now.");
}

/** Another living soul in strike range — never yourself, and never one still beneath the Grey King's notice (§ grace). */
function nearestSoul(state: SimState, player: Player, radius: number = STRIKE_RADIUS): Player | null {
  let best: Player | null = null;
  let bestSq = radius * radius;
  for (const other of state.players) {
    if (other.id === player.id || !other.alive || other.graceUntil > state.tick) continue;
    const d = distSq(other.x, other.y, player.x, player.y);
    if (d <= bestSq) {
      bestSq = d;
      best = other;
    }
  }
  return best;
}

/**
 * F — feed the fire you're standing at, or build a new one. Feeding first
 * is what you meant nine times in ten, and it keeps the verb to one key.
 */
function doBuild(state: SimState, player: Player, px: number, py: number): void {
  const { world } = state;
  const pack = player.pack;

  const lit = fireTileNear(world, player.x, player.y);
  if (lit) {
    if (pack.wood < FIRE_FEED_WOOD) return;
    world.feedFire(lit.x, lit.y, FIRE_FUEL_PER_WOOD);
    pack.wood -= FIRE_FEED_WOOD;
    bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 5), player);
    say(state, "You feed the fire. It answers, and so does the dark.");
    return;
  }

  if (pack.wood < FIRE_WOOD_COST) return;
  if (world.get(px, py) !== Tile.Grass) return;
  world.lightFire(px, py, FIRE_WOOD_COST * FIRE_FUEL_PER_WOOD);
  pack.wood -= FIRE_WOOD_COST;
  bumpNoise(state, NOISE_PER_CRAFT, player);
  say(state, "You build a fire. It will keep you warm. It will also be seen.");
}

function doMakeSpear(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.spear > 0 || pack.wood < SPEAR_WOOD_COST) return;
  pack.wood -= SPEAR_WOOD_COST;
  pack.spear = SPEAR_DURABILITY;
  autoEquipMain(player, "spear");
  bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 4), player);
  say(state, "You sharpen a stake into a spear. Three times the bite.");
}

function doCook(state: SimState, player: Player): void {
  const pack = player.pack;
  if (!player.atFire || pack.rawMeat < 1) return;
  pack.rawMeat--;
  pack.cookedMeat++;
  bumpNoise(state, skilledNoise(NOISE_PER_COOK, player, "cooking"), player);
  learn(state, player, "cooking", XP.cook);
  say(state, "Meat over the fire. The smell carries further than the light does.");
}

function doMakeCloak(state: SimState, player: Player): void {
  const pack = player.pack;
  if (!player.atFire || pack.cloak > 0 || pack.hide < CLOAK_HIDE_COST) return;
  pack.hide -= CLOAK_HIDE_COST;
  pack.cloak = cloakDurability(player.skills);
  learn(state, player, "tailoring", XP.stitch);
  say(state, "A hide cloak. The cold takes half as much now.");
}

/** O — hide and cordage, no fire needed. The cloak's first sibling: it answers a marsh, not the cold. */
function doMakeBoots(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.boots > 0 || pack.hide < BOOTS_HIDE_COST || pack.cordage < BOOTS_CORDAGE_COST) return;
  pack.hide -= BOOTS_HIDE_COST;
  pack.cordage -= BOOTS_CORDAGE_COST;
  pack.boots = BOOTS_DURABILITY;
  learn(state, player, "tailoring", XP.stitch);
  say(state, "Boots, stitched from hide. A marsh will still slow you — just not as much.");
  if (!state.flags.firstBoots) {
    state.flags.firstBoots = true;
    say(state, "The Grey King: “Dry feet in the Verge. A small mercy. I allow those, occasionally.”");
  }
}

/** V — hide and cordage, no fire needed. The cloak's other sibling: quieter hands at the loudest work there is. */
function doMakeGloves(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.gloves > 0 || pack.hide < GLOVES_HIDE_COST || pack.cordage < GLOVES_CORDAGE_COST) return;
  pack.hide -= GLOVES_HIDE_COST;
  pack.cordage -= GLOVES_CORDAGE_COST;
  pack.gloves = GLOVES_DURABILITY;
  learn(state, player, "tailoring", XP.stitch);
  say(state, "Gloves, stitched from hide. Stone and ore ring a little quieter in a padded hand.");
  if (!state.flags.firstGloves) {
    state.flags.firstGloves = true;
    say(state, "The Grey King: “Gloves, for the loudest work in the Verge. Practical. I still hear it.”");
  }
}

/** R — a Bowyer's half of the pair: wood, cordage and pitch, no fire needed. Reach, not extra bite (see doStrike). */
function doMakeBow(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.bow > 0 || pack.wood < BOW_WOOD_COST || pack.cordage < BOW_CORDAGE_COST || pack.pitch < BOW_PITCH_COST) return;
  pack.wood -= BOW_WOOD_COST;
  pack.cordage -= BOW_CORDAGE_COST;
  pack.pitch -= BOW_PITCH_COST;
  pack.bow = BOW_DURABILITY;
  autoEquipMain(player, "bow");
  say(state, "A stave strung and sealed. Something can finally be hit before it gets close.");
  if (!state.flags.firstBow) {
    state.flags.firstBow = true;
    say(state, "The Grey King: “A bow. Now you can be a coward at a distance instead of up close. I don't mind which.”");
  }
}

/** N — a Fletcher's half of the pair: wood and glue, needs a knife in hand, no fire. A batch, the same shape cordage already is. */
function doMakeArrow(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.knife < 1 || pack.wood < ARROW_WOOD_COST || pack.glue < ARROW_GLUE_COST) return;
  pack.wood -= ARROW_WOOD_COST;
  pack.glue -= ARROW_GLUE_COST;
  pack.arrow += ARROWS_PER_BATCH;
  say(state, `A shaft cut and fletched with glue. ${ARROWS_PER_BATCH} arrows, ready to nock.`);
}

/** 4 — cooked if you have it, raw if you are desperate. Raw sometimes bites back. */
function doEat(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.cookedMeat > 0) {
    pack.cookedMeat--;
    // A pot doesn't change what the meal is made of — it changes how far it
    // goes, the same shape an axe already makes on a chop. Read here rather
    // than at the moment of cooking: `cookedMeat` is one flat counter, with
    // no way to remember which portion was ever near a pot, so the honest
    // rule is "a working pot in your pack right now", spent one use per meal
    // actually eaten hot.
    let bonus = 0;
    if (pack.pot > 0) {
      pack.pot--;
      bonus = POT_MEAL_BONUS;
      if (pack.pot === 0) say(state, "The pot finally cracks from the fire. Verge clay was never going to last forever.");
    }
    player.needs.satiety = clamp(player.needs.satiety + mealValue(player.skills) + bonus, 0, NEED_MAX);
    player.needs.warmth = clamp(player.needs.warmth + 80, 0, NEED_MAX);
    return;
  }
  // Fish needs no fire and carries no sickness roll, so it outranks raw
  // meat even though a hot meal still beats it — the safe, unglamorous
  // fallback rather than the best food in the Verge.
  if (pack.fish > 0) {
    pack.fish--;
    player.needs.satiety = clamp(player.needs.satiety + FISH_SATIETY, 0, NEED_MAX);
    return;
  }
  if (pack.rawMeat > 0) {
    pack.rawMeat--;
    player.needs.satiety = clamp(player.needs.satiety + 120, 0, NEED_MAX);
    if (state.rng.chance(1, 4)) {
      player.health = clamp(player.health - 6, 0, HEALTH_MAX);
      say(state, "Raw meat. It stays down, but not happily.");
    }
  }
}

function doMakeKnife(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.knife > 0 || pack.stone < KNIFE_STONE_COST || pack.wood < KNIFE_WOOD_COST) return;
  pack.stone -= KNIFE_STONE_COST;
  pack.wood -= KNIFE_WOOD_COST;
  pack.knife = KNIFE_DURABILITY;
  bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 4), player);
  say(state, "A flake of stone lashed to a handle. It will take a carcass apart properly.");
}

function doMakeAxe(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.axe > 0 || pack.stone < AXE_STONE_COST || pack.wood < AXE_WOOD_COST) return;
  pack.stone -= AXE_STONE_COST;
  pack.wood -= AXE_WOOD_COST;
  pack.axe = AXE_DURABILITY;
  bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 3), player);
  learn(state, player, "woodcraft", XP.stitch);
  say(state, "An axe. More wood per tree, and fewer strokes to hear.");
}

/** Cordage is the only thing you cannot make without a tool already in hand. */
function doMakeCordage(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.knife < 1 || pack.hide < CORDAGE_HIDE_COST) return;
  pack.hide -= CORDAGE_HIDE_COST;
  pack.cordage += CORDAGE_PER_HIDE;
  learn(state, player, "tailoring", XP.cook);
  say(state, `Hide cut into ${CORDAGE_PER_HIDE} lengths of cord.`);
}

/**
 * 8 — set a snare on open ground. It is the only work in the Verge that
 * keeps paying after you have walked away from it.
 */
function doSetSnare(state: SimState, player: Player, px: number, py: number): void {
  const pack = player.pack;
  // Carrying one and setting one are separate steps: you make it wherever
  // you are and set it where the hares are, which is the whole trapline.
  if (pack.snare < 1) {
    if (pack.cordage < SNARE_CORDAGE_COST || pack.wood < SNARE_WOOD_COST) return;
    pack.cordage -= SNARE_CORDAGE_COST;
    pack.wood -= SNARE_WOOD_COST;
    pack.snare++;
    say(state, "A snare, coiled and ready. Set it somewhere a hare would run.");
    return;
  }
  if (!state.world.setSnare(px, py, player.id)) return;
  learn(state, player, "trapping", XP.snare);
  pack.snare--;
  // Setting one is nearly silent — that is the point of it.
  bumpNoise(state, 10, player);
  say(state, "You set the snare in the grass and step away from it.");
  if (!state.flags.firstSnare) {
    state.flags.firstSnare = true;
    say(state, "The Grey King: “Patience. That is new. I dislike it.”");
  }
}

/** 9 — at a fire, smother wood down to charcoal. Most of the log is heat, not char. */
function doMakeCharcoal(state: SimState, player: Player): void {
  const pack = player.pack;
  if (!player.atFire || pack.wood < CHARCOAL_WOOD_COST) return;
  pack.wood -= CHARCOAL_WOOD_COST;
  pack.charcoal += charcoalYield(player.skills);
  // The same smothered burn that makes charcoal sweats out a little tar —
  // one fire, two byproducts, no separate step to ask for the second one.
  pack.pitch += PITCH_PER_BURN;
  bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 6), player); // banking a fire down is quiet work
  learn(state, player, "smithing", XP.char);
  say(state, "Wood smothered down under ash. What is left burns far hotter than the log did, and a little tar besides.");
}

/** 0 — at a fire, ore and charcoal become a bar. The one step no tool skips. */
function doSmelt(state: SimState, player: Player): void {
  const pack = player.pack;
  if (!player.atFire) return;

  if (pack.ore >= SMELT_ORE_COST && pack.charcoal >= SMELT_CHARCOAL_COST) {
    pack.ore -= SMELT_ORE_COST;
    pack.charcoal -= SMELT_CHARCOAL_COST;
    pack.bar += BAR_YIELD + smeltBonus(player.skills);
    bumpNoise(state, NOISE_PER_CRAFT, player); // a fire hot enough to run ore is not a quiet fire
    learn(state, player, "smithing", XP.smelt);
    say(state, "Ore goes soft, then runs. A bar, dull and heavy, where stone used to be.");
    return;
  }

  // No ore and charcoal together, but copper needs no charcoal at all — a
  // real smelt, just a shorter one, which is most of why it is reachable
  // earlier than the real bar rather than only a rarer find.
  if (pack.copper >= COPPER_SMELT_COST) {
    pack.copper -= COPPER_SMELT_COST;
    pack.copperBar += COPPER_BAR_YIELD;
    bumpNoise(state, NOISE_PER_CRAFT, player);
    learn(state, player, "smithing", XP.copperSmelt);
    say(state, "Copper runs soft and fast, and needs no charcoal to do it. A duller bar than iron, but a bar.");
    if (!state.flags.firstCopperBar) {
      state.flags.firstCopperBar = true;
      say(state, "The Grey King: “Older than the ore, and it still answers a fire. Some things never stop being useful.”");
    }
    return;
  }

  // No ore, no copper, but a crown will do — "some are melted down by
  // smiths who need the metal more than the history" (doc/world/PLAN.md
  // §17A). The one thing an old crown is good for until an economy exists
  // to spend one in — the last resort, not the second choice.
  if (pack.crowns >= CROWN_MELT_COST) {
    pack.crowns -= CROWN_MELT_COST;
    pack.bar += CROWN_MELT_YIELD;
    bumpNoise(state, NOISE_PER_CRAFT, player);
    say(state, "The crown goes into the fire. What comes out, once it cools, is just a bar.");
    if (!state.flags.firstCrownMelted) {
      state.flags.firstCrownMelted = true;
      say(state, "The Grey King: “...You didn't even look at the face on it first.”");
    }
  }
}

/** P — clay, fired at a hearth, into a pot. Verge pottery's first product. */
function doMakePot(state: SimState, player: Player): void {
  const pack = player.pack;
  if (!player.atFire || pack.pot > 0 || pack.clay < POT_CLAY_COST) return;
  pack.clay -= POT_CLAY_COST;
  pack.pot = POT_DURABILITY;
  bumpNoise(state, Math.trunc(NOISE_PER_CRAFT / 4), player);
  say(state, "A pot, shaped and fired. Meat cooked in it goes further than meat cooked on a stick.");
  if (!state.flags.firstPot) {
    state.flags.firstPot = true;
    say(state, "The Grey King: “Pottery. The Old Kingdoms had furnaces for this. You have a campfire and clay.”");
  }
}

/**
 * B — bar, wood and cordage, once each. The sword chain's whole point.
 * Falls back to a copper bar, the same shape, when there is no iron bar to
 * hand — a weaker, shorter-lived blade, reachable sooner (doc/world/CONTENT.md).
 */
function doMakeSword(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.sword > 0) return; // already carrying the real thing; nothing this key does improves on it
  if (pack.bar >= SWORD_BAR_COST && pack.wood >= SWORD_WOOD_COST && pack.cordage >= SWORD_CORDAGE_COST) {
    pack.bar -= SWORD_BAR_COST;
    pack.wood -= SWORD_WOOD_COST;
    pack.cordage -= SWORD_CORDAGE_COST;
    pack.sword = SWORD_DURABILITY;
    autoEquipMain(player, "sword");
    bumpNoise(state, NOISE_PER_CRAFT, player);
    learn(state, player, "smithing", XP.forge);
    say(state, "A blade, hafted and bound. Everything else you have made was a stopgap until this.");
    if (!state.flags.firstSword) {
      state.flags.firstSword = true;
      say(state, "The Grey King: “...A sword, in the Verge. That took you longer than it should have — and I noticed every hour of it.”");
    }
    return;
  }

  if (
    pack.copperSword === 0 &&
    pack.copperBar >= COPPER_SWORD_BAR_COST &&
    pack.wood >= COPPER_SWORD_WOOD_COST &&
    pack.cordage >= COPPER_SWORD_CORDAGE_COST
  ) {
    pack.copperBar -= COPPER_SWORD_BAR_COST;
    pack.wood -= COPPER_SWORD_WOOD_COST;
    pack.cordage -= COPPER_SWORD_CORDAGE_COST;
    pack.copperSword = COPPER_SWORD_DURABILITY;
    autoEquipMain(player, "copperSword");
    bumpNoise(state, NOISE_PER_CRAFT, player);
    learn(state, player, "smithing", XP.copperForge);
    say(state, "A blade of copper, hafted and bound. Softer than iron, and it came together far sooner.");
    if (!state.flags.firstCopperSword) {
      state.flags.firstCopperSword = true;
      say(state, "The Grey King: “Copper before iron. Someone remembers the old order of things, even without meaning to.”");
    }
  }
}

/** L — knot cordage and wood into a line. No fire, no tool already in hand, just cordage. */
function doMakeFishingLine(state: SimState, player: Player): void {
  const pack = player.pack;
  if (pack.fishingLine > 0 || pack.cordage < FISHING_LINE_CORDAGE_COST || pack.wood < FISHING_LINE_WOOD_COST) return;
  pack.cordage -= FISHING_LINE_CORDAGE_COST;
  pack.wood -= FISHING_LINE_WOOD_COST;
  pack.fishingLine = FISHING_LINE_DURABILITY;
  learn(state, player, "fishing", XP.line);
  say(state, "Cordage knotted to a length of wood. Now find the water.");
}

/**
 * C — one cast, at the water's edge, with a line in hand. Like every other
 * verb here it is one attempt per press, not a hold — pressing it again is
 * how a soul keeps fishing, the same as pressing E again keeps a tree
 * coming down.
 */
function doFish(state: SimState, player: Player, px: number, py: number): void {
  const { world } = state;
  const pack = player.pack;
  if (pack.fishingLine < 1) return;
  const atWater =
    world.get(px, py) === Tile.Water ||
    world.get(px - 1, py) === Tile.Water ||
    world.get(px + 1, py) === Tile.Water ||
    world.get(px, py - 1) === Tile.Water ||
    world.get(px, py + 1) === Tile.Water;
  if (!atWater) return;

  bumpNoise(state, NOISE_PER_FISH, player);
  const [num, den] = fishChance(player.skills);
  if (!state.rng.chance(num, den)) return;

  pack.fishingLine--;
  pack.fish++;
  learn(state, player, "fishing", XP.catch);
  say(state, "A tug on the line. Fish, this time.");
  if (!state.flags.firstFish) {
    state.flags.firstFish = true;
    say(state, "The Grey King: “Patient, at the water. I have men who have waited longer for less.”");
  }
}

function cycleOffer(player: Player): void {
  const i = TRADEABLES.indexOf(player.offer);
  player.offer = TRADEABLES[(i + 1) % TRADEABLES.length] ?? "wood";
}

/** Whichever other living soul is nearest, within `radius` — shared by giving and teaching. */
function nearestOtherPlayer(state: SimState, player: Player, radius: number): Player | null {
  let best: Player | null = null;
  let bestSq = radius * radius;
  for (const other of state.players) {
    if (other.id === player.id || !other.alive) continue;
    const d = distSq(other.x, other.y, player.x, player.y);
    if (d <= bestSq) {
      bestSq = d;
      best = other;
    }
  }
  return best;
}

/**
 * G — hand one of whatever you are offering to the nearest other soul.
 *
 * Giving is one-sided on purpose. Two people who each want something the
 * other has will trade by giving twice, and that is enough to answer Stage
 * C's only question: do they? Escrow and a currency are for when the other
 * soul is a stranger, which is a later problem than this one.
 */
function doGive(state: SimState, player: Player): void {
  const pack = player.pack;
  const item = player.offer;
  if (pack[item] < 1) return;

  const recipient = nearestOtherPlayer(state, player, TRADE_RADIUS);
  if (!recipient) return;

  // Judged before the hand-over lands, on what the recipient actually
  // needed — not on what was given, or a soul buried in cooked meat could
  // still be "fed" for standing by someone topping off a full belly.
  const feedingTheHungry = FOOD_ITEMS.has(item) && recipient.needs.satiety < COMMONS_SATIETY_THRESHOLD;

  pack[item]--;
  recipient.pack[item]++;
  state.trades.push({ tick: state.tick, from: player.id, to: recipient.id, item });
  say(state, `Soul #${player.lineage} hands Soul #${recipient.lineage} one ${item}.`);
  if (!state.flags.firstTrade) {
    state.flags.firstTrade = true;
    say(state, "The Grey King: “You are giving things away. To each other. How new.”");
  }

  if (feedingTheHungry) {
    player.standing += COMMONS_STANDING_GAIN;
    say(state, `Soul #${player.lineage} feeds a starving soul. The road remembers kindness too.`);
    if (!state.flags.firstCommonsStanding) {
      state.flags.firstCommonsStanding = true;
      say(state, "The Grey King: “...Feeding each other. I would almost call it a strategy, if it were not so small.”");
    }
  }
}

/**
 * K — pass a little of your best skill on to whoever's nearest. §7.3/§25's
 * apprentice bond, crossed early and narrowly the same way PvP was
 * (doc/world/CONTENT.md's gap list) — §18's actual paid apprentice economy
 * needs a currency Stage B doesn't have, so what shipped is the part that
 * doesn't: a live master handing a living student real, if bounded, skill.
 *
 * Deliberately narrow next to the full design: always the teacher's single
 * best skill (skills.mastery's own pick, reused rather than adding a second
 * selector alongside `offer`'s T key), and skills.teachingCeiling stops it
 * one level short of the teacher's own — a lesson can build an expert but
 * never another master out of someone else's hands. A dead master teaches
 * nobody ever again; this is the only way one soul's practice outlives the
 * body that earned it, and §6.1's "skill dies with the character" stays
 * exactly as true as it always was for whoever never taught it to anyone.
 */
function doTeach(state: SimState, player: Player): void {
  const student = nearestOtherPlayer(state, player, TRADE_RADIUS);
  if (!student) return;

  const skill = bestSkill(player.skills);
  const teacherLevel = level(player.skills[skill]);
  if (teacherLevel < TEACH_MIN_LEVEL) return; // nothing worth passing on yet

  const ceiling = teachingCeiling(teacherLevel);
  if (student.skills[skill] >= ceiling) return; // taught as far as teaching alone goes

  gain(student.skills, skill, XP.teach);
  if (student.skills[skill] > ceiling) student.skills[skill] = ceiling;

  say(state, `Soul #${player.lineage} passes on a little ${skill} to Soul #${student.lineage}.`);
  player.standing += COMMONS_STANDING_GAIN; // §3's "teaching for free" — the second of six kindness acts Stage B can now perform
  if (!state.flags.firstTeaching) {
    state.flags.firstTeaching = true;
    say(state, "The Grey King: “...Passed hand to hand, now. I took the source of it once and thought that settled the matter.”");
  }
}

function nearestNpc(state: SimState, player: Player, radius: number): Npc | null {
  let best: Npc | null = null;
  let bestSq = radius * radius;
  for (const npc of state.npcs) {
    if (!npc.alive) continue;
    const d = distSq(npc.x, npc.y, player.x, player.y);
    if (d <= bestSq) {
      bestSq = d;
      best = npc;
    }
  }
  return best;
}

function nearestScout(state: SimState, player: Player, radius: number): Scout | null {
  let best: Scout | null = null;
  let bestSq = radius * radius;
  for (const scout of state.scouts) {
    if (!scout.alive) continue;
    const d = distSq(scout.x, scout.y, player.x, player.y);
    if (d <= bestSq) {
      bestSq = d;
      best = scout;
    }
  }
  return best;
}

/** Index into state.lootPiles, or -1 — an index rather than the pile itself, since looting it means splicing it out. */
function nearestLootPile(state: SimState, player: Player): number {
  let best = -1;
  let bestSq = LOOT_RADIUS * LOOT_RADIUS;
  state.lootPiles.forEach((pile, i) => {
    const d = distSq(pile.x, pile.y, player.x, player.y);
    if (d <= bestSq) {
      bestSq = d;
      best = i;
    }
  });
  return best;
}

/**
 * Killing another soul or a villager both cost standing and mark the
 * killer the same way — a shared consequence, not a shared crime. The
 * only difference is how much (see the two call sites): the standing
 * design's "expelled from normal towns" idea was always meant to answer
 * to the people a normal town actually is.
 */
function applyOutlawry(state: SimState, player: Player, penalty: number): void {
  player.standing -= penalty;
  if (player.standing > NOTORIOUS_STANDING) {
    state.marked = player.id;
    say(state, `Soul #${player.lineage} is marked. The road will remember this, even if they do not.`);
  } else if (!state.flags.firstNotorious) {
    state.flags.firstNotorious = true;
    if (state.marked === player.id) state.marked = -1;
    say(state, "The Grey King: “...Enough of them, and you stop being someone I hunt. You become someone I already own.”");
  }
}

/**
 * Which node a conversation opens on. The Teacher always starts the same
 * lesson; a villager's greeting is where "how the road speaks of you"
 * (§2A) actually shows up in play — chosen once, here, rather than the
 * static tree in dialogue.ts knowing anything about a live player.
 */
function pickRoot(npc: Npc, player: Player): string {
  if (npc.role === "teacher") return ROOT_NODE;
  if (player.standing <= NOTORIOUS_STANDING) return "refuse";
  if (player.standing < 0) return "wary";
  return ROOT_NODE;
}

/** H — talk to whoever is nearest, or close the conversation you're already in. */
function doTalk(state: SimState, player: Player): void {
  if (player.talkingTo !== null) {
    player.talkingTo = null;
    player.dialogueNode = null;
    return;
  }
  const npc = nearestNpc(state, player, TALK_RADIUS);
  if (!npc) return;
  player.talkingTo = npc.id;
  player.dialogueNode = pickRoot(npc, player);
}

/**
 * A numbered key, pressed mid-conversation: pick that reply, or do nothing
 * if the current node doesn't have one. dialogue.ts stays plain content —
 * this is the only place a choice actually moves anything.
 */
function doDialogueChoice(state: SimState, player: Player, optionIndex: number): void {
  if (player.talkingTo === null || player.dialogueNode === null) return;
  const npc = state.npcs.find((n) => n.id === player.talkingTo);
  if (!npc || !npc.alive) {
    player.talkingTo = null;
    player.dialogueNode = null;
    return;
  }
  const node = DIALOGUE_TREES[npc.role]?.[player.dialogueNode];
  const option = node?.options[optionIndex];
  if (!option) return;
  player.dialogueNode = option.next;
  if (option.next === null) player.talkingTo = null;
}

function nearestCreature(state: SimState, player: Player, pick: (c: Creature) => boolean, radius: number = STRIKE_RADIUS): Creature | null {
  let best: Creature | null = null;
  let bestSq = radius * radius;
  for (const c of state.creatures) {
    if (!pick(c)) continue;
    const d = distSq(c.x, c.y, player.x, player.y);
    if (d <= bestSq) {
      bestSq = d;
      best = c;
    }
  }
  return best;
}

/** Practice, and a word when it shows. */
function learn(state: SimState, player: Player, skill: Skill, xp: number): void {
  if (!gain(player.skills, skill, xp)) return;
  say(state, `Soul #${player.lineage}'s hands know the work better — ${skill} ${level(player.skills[skill])}.`);
}

/** Noise for an action, reduced by how well the soul does it. */
function skilledNoise(base: number, player: Player, skill: Skill): number {
  return Math.trunc((base * noiseScale(player.skills, skill)) / 100);
}

/**
 * Gloves make Rock, Ore and Copper quieter to work — the same trade an axe
 * already makes on a chop, aimed at the loudest tile in the Verge instead
 * of the quietest. Wears one use per dig, same shape as an axe per chop.
 */
function glovedNoise(state: SimState, base: number, player: Player): number {
  const pack = player.pack;
  if (pack.gloves <= 0) return base;
  pack.gloves--;
  if (pack.gloves === 0) say(state, "The gloves finally wear through at the fingers. Stone doesn't care either way.");
  return Math.trunc((base * GLOVES_QUIET_PCT) / 100);
}

function bumpNoise(state: SimState, amount: number, source: Player): void {
  state.noise = clamp(state.noise + amount, 0, NOISE_MAX);
  state.noiseX = source.x;
  state.noiseY = source.y;
}

const PATH_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * A route from one tile to another, walking around anything `isSolid`. Plain
 * breadth-first, not A* or Dijkstra — every edge costs the same here, so a
 * priority queue would buy nothing a plain FIFO queue doesn't already give
 * for free, and the map is small enough (72x48) that a full search costs
 * microseconds even so. `null` if the target is solid or simply unreachable
 * (an island of trees with no way in, say) — the caller falls back to
 * walking straight at it, same as before this existed.
 *
 * 8-directional, including diagonals that graze a solid corner: the actual
 * per-tick movement (moveWithCollision) is still the one thing that decides
 * whether a step is honoured, so a path that cuts a corner too closely just
 * becomes a slide against it, the same as walking there by hand always was
 * — this only has to get him *generally* around an obstacle, not trace its
 * exact edge.
 */
function findPath(world: World, fromTx: number, fromTy: number, toTx: number, toTy: number): Array<{ x: number; y: number }> | null {
  if (!world.inBounds(toTx, toTy) || isSolid(world.get(toTx, toTy))) return null;
  if (fromTx === toTx && fromTy === toTy) return [];

  const w = WORLD_W;
  const h = WORLD_H;
  const startIdx = fromTy * w + fromTx;
  const targetIdx = toTy * w + toTx;
  const visited = new Uint8Array(w * h);
  const cameFrom = new Int32Array(w * h).fill(-1);
  visited[startIdx] = 1;
  const queue: number[] = [startIdx];
  let head = 0;
  let found = false;
  while (head < queue.length) {
    const idx = queue[head++]!;
    if (idx === targetIdx) {
      found = true;
      break;
    }
    const x = idx % w;
    const y = Math.trunc(idx / w);
    for (const [dx, dy] of PATH_DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nidx = ny * w + nx;
      if (visited[nidx] || isSolid(world.get(nx, ny))) continue;
      visited[nidx] = 1;
      cameFrom[nidx] = idx;
      queue.push(nidx);
    }
  }
  if (!found) return null;

  const path: Array<{ x: number; y: number }> = [];
  let cur = targetIdx;
  while (cur !== startIdx) {
    path.push({ x: (cur % w) * TILE + TILE / 2, y: Math.trunc(cur / w) * TILE + TILE / 2 });
    cur = cameFrom[cur]!;
  }
  path.reverse();
  return path;
}

function tickLieutenant(state: SimState): void {
  const { lieutenant, world, rng } = state;
  const night = isNight(state.tick);
  const detectionRadius =
    BASE_DETECTION_RADIUS +
    Math.trunc((NOISE_DETECTION_SCALE * state.noise) / NOISE_MAX) +
    (night ? NIGHT_DETECTION_BONUS : 0);

  // He hunts one soul at a time — the nearest living one inside his reach.
  // With several in the Verge that makes proximity to another player a real
  // risk and a real shield at once, which is the first genuinely social
  // thing in this prototype.
  const wasHunting = lieutenant.state === "hunt";

  // A marked soul is wanted above all others, wherever they are (§3.5) —
  // unless they have fallen past NOTORIOUS_STANDING, in which case marking
  // them means nothing: he does not chase what is already his.
  const markedSoul = state.players[state.marked];
  if (markedSoul && markedSoul.alive && markedSoul.graceUntil <= state.tick && markedSoul.standing > NOTORIOUS_STANDING) {
    lieutenant.state = "hunt";
    lieutenant.target = markedSoul.id;
  }

  let nearest: Player | null = null;
  let nearestSq = Number.MAX_SAFE_INTEGER;
  for (const p of state.players) {
    // A notorious soul is invisible to him by proximity too, not only to
    // marking — the same reason, read twice.
    if (!p.alive || p.graceUntil > state.tick || p.standing <= NOTORIOUS_STANDING) continue;
    const d = distSq(lieutenant.x, lieutenant.y, p.x, p.y);
    if (d < nearestSq) {
      nearestSq = d;
      nearest = p;
    }
  }

  const resting = state.tick < lieutenant.restUntil;

  if (!resting && lieutenant.state === "patrol" && nearest && nearestSq <= detectionRadius * detectionRadius) {
    lieutenant.state = "hunt";
    lieutenant.target = nearest.id;
  } else if (lieutenant.state === "hunt") {
    const hunted = state.players[lieutenant.target];
    // A soul who is actually gone (dead, or a corpse) ends the hunt
    // outright. Otherwise, as long as a real route to them is cached, he
    // does not give up on distance alone — a soul outruns him by 40
    // units/tick in the open (PLAYER_SPEED vs. LIEUTENANT_SPEED), and that
    // speed gap is what makes fleeing actually work, not a give-up timer.
    // A wide detour around a lake or a wood legitimately reads as "farther
    // away" in a straight line while he is still closing the only distance
    // that matters, so judging by the line rather than the route would
    // make him give up mid-chase for routing around the very obstacle
    // that's supposed to make him work harder. He only truly loses the
    // scent once nothing connects him to them at all: no cached route
    // (never found one, or the last one ran out), and no straight line
    // short enough to suggest one is still findable nearby.
    const gone =
      !hunted ||
      !hunted.alive ||
      (lieutenant.path.length === 0 && distSq(lieutenant.x, lieutenant.y, hunted.x, hunted.y) > LOSE_INTEREST_RADIUS * LOSE_INTEREST_RADIUS);
    if (gone) {
      lieutenant.state = "patrol";
      lieutenant.target = -1;
      lieutenant.waypointX = lieutenant.x;
      lieutenant.waypointY = lieutenant.y;
      lieutenant.path = [];
    }
  }

  // A fresh hunt, however it started, opens with a window to react rather
  // than full pace from the first tick — and always says so, not just the
  // first time this ever happens (ALERT_TICKS above has the why).
  if (!wasHunting && lieutenant.state === "hunt") {
    lieutenant.alertUntil = state.tick + ALERT_TICKS;
    lieutenant.path = []; // a stale route from the last hunt means nothing now
    const freshTarget = state.players[lieutenant.target];
    if (freshTarget) say(state, `A Lieutenant has picked up Soul #${freshTarget.lineage}'s trail. He hasn't committed yet.`);
    if (!state.flags.firstSighting) {
      state.flags.firstSighting = true;
      say(state, "The Grey King: “One of my Lieutenants has your scent. Run, if you think it will help.”");
    }
  }

  let targetX: number;
  let targetY: number;
  let usePath = false;
  const hunted = state.players[lieutenant.target];
  if (lieutenant.state === "hunt" && hunted) {
    targetX = hunted.x;
    targetY = hunted.y;
    usePath = true;
  } else if (state.noise >= CROW_THRESHOLD && !resting) {
    // He does not need to see you. He needs to see the birds — which is the
    // whole design in one line: what you build is what gives you away.
    // Unless he has just killed someone, in which case the birds over that
    // body are the last thing that should be holding him in place.
    targetX = state.crowX;
    targetY = state.crowY;
  } else {
    const wpSq = distSq(lieutenant.x, lieutenant.y, lieutenant.waypointX, lieutenant.waypointY);
    if (wpSq < (TILE / 2) * (TILE / 2)) {
      if (rng.chance(PATROL_NOISE_BIAS_PCT, 100)) {
        // Drift toward wherever the Verge was last loud, jittered so he
        // never walks to the exact tile — that would read as him already
        // knowing where you are, which is the crows' job (§1), not a
        // patrol's.
        lieutenant.waypointX = clamp(
          state.noiseX + rng.nextInt(PATROL_BIAS_JITTER * 2 + 1) - PATROL_BIAS_JITTER,
          0,
          (WORLD_W - 1) * TILE,
        );
        lieutenant.waypointY = clamp(
          state.noiseY + rng.nextInt(PATROL_BIAS_JITTER * 2 + 1) - PATROL_BIAS_JITTER,
          0,
          (WORLD_H - 1) * TILE,
        );
      } else {
        lieutenant.waypointX = rng.nextInt(WORLD_W) * TILE;
        lieutenant.waypointY = rng.nextInt(WORLD_H) * TILE;
      }
    }
    targetX = lieutenant.waypointX;
    targetY = lieutenant.waypointY;
  }

  // Route around solid ground instead of just sliding along it, but only
  // while actually hunting — see PATH_RECOMPUTE_TICKS above for why patrol
  // and the crow-drift don't bother.
  let moveTargetX = targetX;
  let moveTargetY = targetY;
  if (usePath) {
    const last = lieutenant.path[lieutenant.path.length - 1];
    const stale =
      state.tick >= lieutenant.pathRecomputeAt ||
      lieutenant.path.length === 0 ||
      !last ||
      distSq(last.x, last.y, targetX, targetY) > PATH_STALE_RADIUS * PATH_STALE_RADIUS;
    if (stale) {
      const found = findPath(
        world,
        Math.floor(lieutenant.x / TILE),
        Math.floor(lieutenant.y / TILE),
        Math.floor(targetX / TILE),
        Math.floor(targetY / TILE),
      );
      lieutenant.path = found ?? [];
      lieutenant.pathRecomputeAt = state.tick + PATH_RECOMPUTE_TICKS;
    }
    while (lieutenant.path.length > 0 && distSq(lieutenant.x, lieutenant.y, lieutenant.path[0]!.x, lieutenant.path[0]!.y) < (TILE / 2) * (TILE / 2)) {
      lieutenant.path.shift();
    }
    if (lieutenant.path.length > 0) {
      moveTargetX = lieutenant.path[0]!.x;
      moveTargetY = lieutenant.path[0]!.y;
    }
    // No path found at all (unreachable) — fall through and walk straight
    // at it, same as every Lieutenant ever did before this existed.
  } else {
    lieutenant.path = []; // don't let a hunt's old route leak into the next one
  }

  const alerting = lieutenant.state === "hunt" && state.tick < lieutenant.alertUntil;
  const base = lieutenant.state === "hunt" ? (alerting ? LIEUTENANT_ALERT_SPEED : LIEUTENANT_SPEED) : LIEUTENANT_PATROL_SPEED;
  const speed = Math.trunc((base * terrainSpeedPct(world, lieutenant.x, lieutenant.y)) / 100);
  const next = stepToward(lieutenant.x, lieutenant.y, moveTargetX, moveTargetY, speed);
  const moved = moveWithCollision(world, lieutenant.x, lieutenant.y, next.x, next.y);
  lieutenant.x = clamp(moved.x, 0, (WORLD_W - 1) * TILE);
  lieutenant.y = clamp(moved.y, 0, (WORLD_H - 1) * TILE);
}
