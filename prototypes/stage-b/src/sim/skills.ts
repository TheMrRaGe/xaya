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

export type Skill = "woodcraft" | "hunting" | "butchery" | "cooking" | "tailoring";

export const SKILLS: readonly Skill[] = ["woodcraft", "hunting", "butchery", "cooking", "tailoring"];

export type Skills = Record<Skill, number>; // experience, not level

export function newSkills(): Skills {
  return { woodcraft: 0, hunting: 0, butchery: 0, cooking: 0, tailoring: 0 };
}

/** Experience for one use of each verb. */
export const XP = {
  chop: 10,
  strike: 5,
  kill: 20,
  butcher: 15,
  cook: 12,
  stitch: 40,
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

const TITLES: Record<Skill, string> = {
  woodcraft: "woodcutter",
  hunting: "hunter",
  butchery: "butcher",
  cooking: "cook",
  tailoring: "tailor",
};

const RANKS = ["", "a poor", "a passable", "a fair", "a good", "a skilled", "a fine", "an expert", "a master", "a master"];

/**
 * What a soul was best at, for the Barrow-list. Reputation, not advantage —
 * the next soul inherits the story and none of the skill.
 */
export function mastery(skills: Skills): string {
  let best: Skill = "woodcraft";
  for (const skill of SKILLS) if (skills[skill] > skills[best]) best = skill;
  const rank = level(skills[best]);
  if (rank === 0) return "green, and never got the chance";
  return `${RANKS[rank]} ${TITLES[best]}`;
}
