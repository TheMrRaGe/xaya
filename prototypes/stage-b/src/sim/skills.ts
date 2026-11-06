/**
 * Skill, earned by doing.
 *
 * No perks, no classes, no starting traits — every soul arrives at zero and
 * every soul can learn everything. What separates two players is only the
 * hours they have each put in, and which hours they chose.
 *
 * That is also what eventually makes trade necessary rather than polite.
 * Early on nobody barters firewood, because an hour of chopping gets anyone
 * the same three logs. Later, when the woodcutter's hour yields twice what
 * yours does and yours is better spent skinning, giving each other things
 * stops being a courtesy and starts being arithmetic.
 *
 * Skills belong to the *character*, not the soul, and die with it (§6.1:
 * zero material advantage carries forward). A master is therefore always
 * mortal and always scarce, and losing one is an event — which is precisely
 * what gives their work value.
 */

export type Skill =
  | "woodcraft"
  | "hunting"
  | "butchery"
  | "cooking"
  | "tailoring"
  | "trapping"
  | "smithing"
  | "fishing";

export const SKILLS: readonly Skill[] = [
  "woodcraft",
  "hunting",
  "butchery",
  "cooking",
  "tailoring",
  "trapping",
  "smithing",
  "fishing",
];

export type Skills = Record<Skill, number>; // experience, not level

export function newSkills(): Skills {
  return {
    woodcraft: 0,
    hunting: 0,
    butchery: 0,
    cooking: 0,
    tailoring: 0,
    trapping: 0,
    smithing: 0,
    fishing: 0,
  };
}

/** Experience for one use of each verb. */
export const XP = {
  chop: 10,
  strike: 5,
  kill: 20,
  butcher: 15,
  cook: 12,
  stitch: 40,
  snare: 8, // coiling and setting one
  trap: 25, // a catch, earned while you were somewhere else entirely
  char: 8, // smothering a fire down to charcoal
  smelt: 15, // running ore
  forge: 40, // a sword — the chain's whole payoff
  line: 8, // knotting a fishing line
  catch: 15, // a fish on the line — present effort, unlike a trap's absent one
  /**
   * Copper needs no charcoal burn to run, which is most of why it is
   * "reachable earlier" (doc/world/CONTENT.md) rather than merely rarer —
   * a genuine smelt and a genuine forge, just a shorter one, so it earns
   * real smithing on the way to a weaker blade rather than none at all.
   */
  copperSmelt: 8,
  copperForge: 20,
  /** One lesson passed to a student — same order as a smelt or a catch. */
  teach: 15,
} as const;

export const MAX_LEVEL = 9;

/**
 * Level from experience, integers only.
 *
 * A square-root curve on purpose: the first levels come quickly, so a fresh
 * soul is competent within minutes and death never drops anyone back to
 * useless, while the top of the range stays far enough away that reaching
 * it is a thing other players notice. The constants are placeholders sized
 * for a playtest — the real Realms are slower at everything.
 */
export function level(xp: number): number {
  if (xp <= 0) return 0;
  let n = 0;
  while (n < MAX_LEVEL && (n + 1) * (n + 1) * 8 <= xp) n++;
  return n;
}

export function gain(skills: Skills, skill: Skill, xp: number): boolean {
  const before = level(skills[skill]);
  skills[skill] += xp;
  return level(skills[skill]) > before;
}

/** Logs off one tree: 3 at nothing, 6 at mastery. */
export function woodPerTree(skills: Skills): number {
  return 3 + Math.trunc(level(skills.woodcraft) / 3);
}

/**
 * Skill is quiet. A practised woodcutter takes the tree with fewer, better
 * strokes, so the crows are slower to notice — which makes competence and
 * safety the same stat, and is the most important thing in this file.
 */
export function noiseScale(skills: Skills, skill: Skill): number {
  return 100 - level(skills[skill]) * 5; // percent, 100 down to 55
}

/** Extra damage a strike carries: 0 at nothing, 3 at mastery. */
export function strikeBonus(skills: Skills): number {
  return Math.trunc(level(skills.hunting) / 3);
}

/** Extra meat and hide off a carcass: 0 at nothing, 2 at mastery. */
export function butcherBonus(skills: Skills): number {
  return Math.trunc(level(skills.butchery) / 4);
}

/** What a hot meal is worth: 500 at nothing, 770 at mastery. */
export function mealValue(skills: Skills): number {
  return 500 + level(skills.cooking) * 30;
}

/** How long a cloak lasts: 400 cold ticks at nothing, 940 at mastery. */
export function cloakDurability(skills: Skills): number {
  return 400 + level(skills.tailoring) * 60;
}

/**
 * A snare's odds of catching whatever walks onto it this tick, as
 * [numerator, denominator] for `Rng.chance`. One in three at nothing —
 * a trapline is a thing you come back to, not a thing you watch — rising to
 * better than two in three at mastery, because a trapper's snares are set
 * where the hare actually runs rather than where the grass is open.
 */
export function trapChance(skills: Skills): readonly [number, number] {
  return [33 + level(skills.trapping) * 4, 100];
}

/**
 * The sword chain, unlike every other one in this file, used to run on bare
 * pack checks — no skill made it faster, safer or better, which quietly
 * broke the principle every other skill here already proves: a chain should
 * not lock a soul out for lacking a skill, but it should reward one for
 * having it. Self-supply was already *possible* (one soul can do every step
 * alone); it was not yet *earned*. Smithing closes that gap.
 *
 * Mining itself stays exempt on purpose — a vein is loud no matter how good
 * you are at working one, the same deal stone already makes (§ NOISE_PER_ORE
 * in tick.ts). Smithing only pays out at the fire, on what you do with what
 * you dug up.
 */

/** Charcoal off one burn: 1 at nothing, 2 at mastery — less of the wood wasted as heat. */
export function charcoalYield(skills: Skills): number {
  return 1 + Math.trunc(level(skills.smithing) / 5);
}

/** Extra bar off one smelt: 0 at nothing, 2 at mastery. */
export function smeltBonus(skills: Skills): number {
  return Math.trunc(level(skills.smithing) / 4);
}

/** Extra damage a self-forged sword carries, on top of its base bite: 0 at nothing, 3 at mastery. */
export function swordBonus(skills: Skills): number {
  return Math.trunc(level(skills.smithing) / 3);
}

/**
 * A line's odds of a bite this tick, as [numerator, denominator] for
 * `Rng.chance`. Deliberately slower than a snare (§ trapChance) rather than
 * faster: trapping pays for hours spent *elsewhere*, and fishing is the one
 * food source that asks for nothing but hours spent *right here, patiently*
 * — a fair trade needs the wait to still mean something even once a soul
 * is good at it. Four in a hundred at nothing, rising to about one in
 * five at mastery.
 */
export function fishChance(skills: Skills): readonly [number, number] {
  return [4 + level(skills.fishing) * 2, 100];
}

const TITLES: Record<Skill, string> = {
  woodcraft: "woodcutter",
  hunting: "hunter",
  butchery: "butcher",
  cooking: "cook",
  tailoring: "tailor",
  trapping: "trapper",
  smithing: "smith",
  fishing: "fisher",
};

const RANKS = ["", "a poor", "a passable", "a fair", "a good", "a skilled", "a fine", "an expert", "a master", "a master"];

/** Whichever skill a soul has put the most hours into — ties fall to woodcraft. */
export function bestSkill(skills: Skills): Skill {
  let best: Skill = "woodcraft";
  for (const skill of SKILLS) if (skills[skill] > skills[best]) best = skill;
  return best;
}

/**
 * What a soul was best at, for the Barrow-list. Reputation, not advantage —
 * the next soul inherits the story and none of the skill.
 */
export function mastery(skills: Skills): string {
  const best = bestSkill(skills);
  const rank = level(skills[best]);
  if (rank === 0) return "green, and never got the chance";
  return `${RANKS[rank]} ${TITLES[best]}`;
}

/**
 * The ceiling a taught skill may reach — always one level short of the
 * teacher's own (doc/world/PLAN.md §7.3/§25: "masters transfer mastery to
 * apprentices"). A teacher at level L can raise a student as far as level
 * L-1 and no further, so a lesson can build an expert but never another
 * master out of someone else's hands: the top rank stays something only
 * doing it yourself can earn, exactly the same rule §6.10 already applies
 * to everyone doing it the first time. See doTeach in tick.ts.
 */
export function teachingCeiling(teacherLevel: number): number {
  return Math.max(0, teacherLevel * teacherLevel * 8 - 1);
}
