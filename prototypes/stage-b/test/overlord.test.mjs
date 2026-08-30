// The Grey King's voice, without spending anything. These check the
// Understudy path and the rules the flavor tier must never break: it
// answers what actually happened, it does not talk over itself, and it
// never hears its own words back.
//
//     node test/overlord.test.mjs
import { createOverlord, tidy, parseChoice } from "../overlord.mjs";

let failures = 0;
const check = (name, cond, detail = "") => {
  console.log(cond ? `  ok   ${name}` : `  FAIL ${name} ${detail}`);
  if (!cond) failures++;
};

const WORLD = { tick: 100, night: false, souls: 2, noise: 300, crows: true };
const settle = () => new Promise((r) => setTimeout(r, 50));

async function fresh() {
  const said = [];
  const o = await createOverlord((line) => said.push(line));
  return { o, said };
}

{
  const { o, said } = await fresh();
  o.note("You build a fire. It will keep you warm. It will also be seen.");
  o.note("Soul #3 hands Soul #4 one wood.");
  o.consider(WORLD);
  await settle();
  check("he answers what happened", said.length === 1 && /light|Warmth/.test(said[0]), JSON.stringify(said));
}

{
  const { o, said } = await fresh();
  o.noteDeath({ lineage: 3, cause: "cut down by a Lieutenant", mastery: "a fair butcher" });
  o.consider(WORLD);
  await settle();
  check("a death outranks everything else", said.length === 1 && /stops moving|compliment|watch/.test(said[0]), JSON.stringify(said));
}

{
  const { o, said } = await fresh();
  o.note("Soul #1 hands Soul #2 one wood.");
  o.consider(WORLD);
  await settle();
  check("one notice is not worth speaking over", said.length === 0, JSON.stringify(said));
}

{
  const { o, said } = await fresh();
  o.note("You build a fire.");
  o.note("Soul #1 hands Soul #2 one wood.");
  o.consider(WORLD);
  await settle();
  o.note("You build a fire.");
  o.note("Soul #1 hands Soul #2 one hide.");
  o.consider(WORLD);
  await settle();
  check("he does not talk over himself", said.length === 1, `${said.length} lines`);
}

{
  const { o, said } = await fresh();
  o.note("The Grey King: “I said this already.”");
  o.note("The Grey King: “And this.”");
  o.consider(WORLD);
  await settle();
  check("he never hears his own words back", said.length === 0, JSON.stringify(said));
}

{
  const { o } = await fresh();
  check("off by default, so it cannot spend anything", o.stats.enabled === false && o.stats.calls === 0);
}

// Small local models wrap, prefix, ramble and think out loud. None of that
// should ever reach a player, and none of it means the answer was bad.
{
  check("a plain line survives untouched", tidy("The crows are yours now.") === "The crows are yours now.");
  check("wrapping quotes come off", tidy('"The crows are yours now."') === "The crows are yours now.");
  check("curly quotes come off too", tidy("“The crows are yours now.”") === "The crows are yours now.");
  check("it stops announcing itself", tidy("Grey King: You built a light.") === "You built a light.");
  check("thinking out loud is discarded", tidy("<think>who died?</think> Another one stops.") === "Another one stops.");
  const rambled = tidy("One. Two. Three. Four.");
  check("two sentences at the outside", rambled === "One. Two.", rambled);
  check("and nothing runs on forever", tidy("x".repeat(400)).length <= 240);
  check("an empty answer stays empty", tidy("") === "" && tidy(null) === "");
}

// A decision has to survive the ways a small model writes it down. It
// reliably writes the CHOICE line and reliably forgets the SAY label, and an
// id that was never on the menu must never be honoured.
{
  const MENU = [{ id: 0 }, { id: 1 }, { id: 2 }];

  const both = parseChoice("CHOICE: 2\nSAY: The cold is mine tonight.", MENU);
  check("a well-formed answer parses", both.offerId === 2 && both.line === "The cold is mine tonight.", JSON.stringify(both));

  const noLabel = parseChoice("CHOICE: 1\nYou are cutting my trees.", MENU);
  check("a forgotten SAY label is forgiven", noLabel.offerId === 1 && noLabel.line === "You are cutting my trees.", JSON.stringify(noLabel));

  const offMenu = parseChoice("CHOICE: 9\nSAY: I do as I please.", MENU);
  check("an id that was never offered is refused", offMenu.offerId === null, JSON.stringify(offMenu));

  const noChoice = parseChoice("I think I shall wait.", MENU);
  check("no choice at all is refused", noChoice.offerId === null);

  const messy = parseChoice("<think>hmm</think>\nCHOICE - 0\nSAY - \u201cWait.\u201d", MENU);
  check("dashes and quotes and thinking are all survivable", messy.offerId === 0 && messy.line === "Wait.", JSON.stringify(messy));
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
