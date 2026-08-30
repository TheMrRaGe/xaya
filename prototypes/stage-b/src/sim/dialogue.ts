/**
 * Conversation trees — static content, not a live model. §27's Intelligence
 * Tiers reserve a real model for Captains and Wardens and give even a
 * Lieutenant only "light template"; a villager is well below that. This is
 * the whole of what one can say: a hand-authored graph, the same shape a
 * classic dialogue tree always is.
 *
 * The Teacher's tree is the actual tutorial (doc/world/PLAN.md §1A:
 * "somebody has to teach you to lay a fire — that first lesson is the
 * tutorial"), delivered as a character rather than a tooltip, and it
 * teaches nothing mechanically — no free skill, no free XP. skills.ts is
 * explicit that "every soul arrives at zero and every soul can learn
 * everything" only by doing; a conversation that quietly handed out a
 * shortcut would contradict the one file most responsible for saying so.
 * What it hands over is the same thing a Teacher-in-fiction actually could:
 * words.
 *
 * A villager's tree instead answers the standing question the way the
 * "expelled from normal towns" design intends, in the one place Stage B
 * currently has anything resembling a town: how far a conversation gets
 * depends on how the road speaks of you (tick.ts's `pickRoot`, chosen once
 * at the moment a conversation opens), not on anything in this file, which
 * stays plain content.
 */

export interface DialogueOption {
  /** Shown next to the number key that picks it. */
  label: string;
  /** Next node id, or null to end the conversation here. */
  next: string | null;
}

export interface DialogueNode {
  text: string;
  options: DialogueOption[];
}

export type DialogueTree = Record<string, DialogueNode>;

const TEACHER_TREE: DialogueTree = {
  root: {
    text:
      '"Washed up, were you. Well. You will want to eat before anything else finds a reason to want you." ' +
      "She looks at your empty hands. \"Do you know how to lay a fire yet?\"",
    options: [
      { label: "No. Show me.", next: "fire" },
      { label: "I can manage.", next: "food" },
    ],
  },
  fire: {
    text:
      '"Press F, standing on open ground, with wood in your pack. Feed it more wood the same way before it dies, ' +
      'or you will be doing this again in the dark." She waits. "And?"',
    options: [{ label: "What do I eat?", next: "food" }],
  },
  food: {
    text:
      '"Hunt what you can catch, or strip a bush. Stand over what you killed and press E to butcher it, E again ' +
      'at a fire to cook it, and 4 to eat. A hungry soul makes mistakes, and this valley does not forgive many of ' +
      "those.\"",
    options: [
      { label: "I'll remember it.", next: null },
      { label: "Who are you?", next: "who" },
    ],
  },
  who: {
    text:
      '"Someone who teaches, because someone has to, and it may as well be someone who remembers being taught." ' +
      "She does not offer a name. \"You will have questions for a season yet. Ask them of someone.\"",
    options: [{ label: "I'll remember it.", next: null }],
  },
};

const VILLAGER_TREE: DialogueTree = {
  root: {
    text: '"You\'re the one who washed up." A nod, not unfriendly. "Settling in, then?"',
    options: [
      { label: "Trying to.", next: "settling" },
      { label: "I'll remember it.", next: null },
    ],
  },
  settling: {
    text: '"Good. Keep your fires low, and you\'ll do fine here."',
    options: [{ label: "I'll remember it.", next: null }],
  },
  wary: {
    text: "They keep a hand near their belt and answer only what you asked, nothing more.",
    options: [
      { label: "I'll remember it.", next: null },
      { label: "Say more.", next: "wary_more" },
    ],
  },
  wary_more: {
    text: '"The road talks. I\'ve heard what it says about you. That\'s all I\'ll say on it."',
    options: [{ label: "I'll remember it.", next: null }],
  },
  refuse: {
    text: "They look through you the way you'd look through a Reaver, and say nothing at all.",
    options: [],
  },
};

export const DIALOGUE_TREES: Readonly<Record<string, DialogueTree>> = {
  teacher: TEACHER_TREE,
  villager: VILLAGER_TREE,
};

export const ROOT_NODE = "root";
