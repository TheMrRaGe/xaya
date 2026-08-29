/**
 * The Grey King's voice — the flavor tier, and only the flavor tier.
 *
 * DESIGN §3.3 splits the Overlord in two: a consensus tier that emits typed
 * actions touching state, and a flavor tier that narrates. This is the
 * second one. It reads what happened, says something about it, and can
 * never change anything — no decision here is load-bearing, which is why it
 * is safe to build now, years before the first one exists.
 *
 * Two rules it must never break:
 *
 *   1. It never blocks the tick. Requests are fired and forgotten; the
 *      world runs at 10 Hz whether or not anyone is listening.
 *   2. It always has something to say. With no model, no network, or a bad
 *      reply, the Understudy speaks instead — §3.2's liveness guarantee in
 *      miniature. The world never stalls because inference was unavailable.
 *
 * It has two jobs. Given a menu of legal actions it is the **Storyteller**:
 * it picks one and says why, and the reason it gives is the line players
 * see — so narration arrives as a by-product of a decision rather than as
 * the product. Given no menu it only narrates. Picking from a list is
 * classification rather than creative writing, which is why a three-billion
 * parameter model can do the first job well and the second one badly.
 *
 * It never applies anything itself. It returns a choice; the authority
 * validates it against the menu and applies it, and an id that was not on
 * the menu is refused — DESIGN §3.2, where an illegal action is rejected no
 * matter who proposed it.
 *
 * **It talks to whatever model you point it at, and the default is one
 * running on your own machine.** Any OpenAI-compatible `/chat/completions`
 * endpoint works — Ollama, LM Studio, llama.cpp's server, or a hosted free
 * tier — so the voice costs nothing to run and is tied to no vendor. There
 * is no SDK here on purpose: it is one `fetch` against a shape every local
 * runner already speaks.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BIBLE = new URL("../../doc/world/GREYKING.md", import.meta.url);

/** Ollama's OpenAI-compatible endpoint, which is the zero-setup default. */
const DEFAULT_URL = "http://127.0.0.1:11434/v1";
/** Small on purpose: one line of dialogue is not a reasoning problem. */
const DEFAULT_MODEL = "llama3.2:3b";

/** Don't speak more often than this, however much is happening. */
const MIN_GAP_MS = Number(process.env.OVERLORD_MIN_GAP_MS ?? 25_000);
/**
 * A slow local model must never pile requests up behind itself — but a cold
 * one is *very* slow. Measured on a 3B: about twenty seconds to load and
 * process the character bible, then half a second per line once it is
 * resident and the prompt prefix is cached. So the ceiling is generous and
 * the model gets warmed at startup; a late line costs nothing, because
 * none of this is on the tick.
 */
const TIMEOUT_MS = Number(process.env.OVERLORD_TIMEOUT_MS ?? 45_000);

/**
 * The Understudy. Pure code, no network, no cost — and the only thing
 * speaking until you point the server at a model. Grouped so the line at
 * least matches the shape of what happened.
 */
/** What the Understudy says for each kind of incident it falls back to. */
const INCIDENT_LINES = {
  nothing: "Carry on. I am not going anywhere.",
  false_crows: "Birds, over there. You should probably go and look.",
  send_lieutenant: "One of mine is walking. Not at you. Near you.",
  cold_snap: "The cold is mine tonight. Spend your wood or don't.",
  blight: "Nothing will grow for a while. That was me.",
  loose_a_boar: "Something with tusks has taken an interest in you.",
  loose_the_wolves: "I sent two. They do not tire the way you do.",
  mark: "One of you is wanted. The rest of you may relax.",
};

const UNDERSTUDY = {
  death: [
    "Another one stops moving. The Verge keeps what it is owed.",
    "They lasted longer than most. That is not a compliment.",
    "I did not need to watch. I was told.",
  ],
  fire: [
    "A light, in my Verge. How considerate — I do so hate looking.",
    "Warmth is a confession. Yours carries for miles.",
  ],
  trade: [
    "You are giving things away. To each other. How new.",
    "Two of you, cooperating. I will remember which two.",
  ],
  quiet: [
    "You have gone quiet. That is the first sensible thing anyone has done today.",
    "Nothing is happening. I can wait longer than you can.",
  ],
};

function pick(list, n) {
  return list[n % list.length];
}

/**
 * Four lines in his voice, shown to the model every time.
 *
 * A character bible describes; a small model imitates. Three billion
 * parameters will read a page about who someone is and still answer in
 * generic portentous fantasy — including itself in "we", which the Grey
 * King would never do. Four examples fix more of that than four more pages
 * of description would.
 */
const VOICE = [
  "Someone has lit a fire in my Verge. How careless. How warm.",
  "That one lasted eleven days. The record is nineteen, and he is also dead.",
  "You are cutting my trees. Cut quietly and I may not send anyone.",
  "Two of you, sharing. I will remember which two.",
];

/**
 * Make a small model's answer usable.
 *
 * Local models under 8B routinely wrap the line in quotes, prefix it with
 * "Grey King:", keep explaining after the line is over, or think out loud in
 * `<think>` tags. None of that should reach a player, and none of it means
 * the answer was bad — so clean it up rather than throw it away.
 */
export function tidy(raw) {
  if (!raw) return "";
  let text = String(raw)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*(the\s+)?grey king\s*[:—-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Strip one wrapping pair of quotes, straight or curly.
  const first = text[0];
  const last = text[text.length - 1];
  if (text.length > 1 && "\"'“‘".includes(first) && "\"'”’".includes(last)) {
    text = text.slice(1, -1).trim();
  }

  // Two sentences at the outside, whatever it thought it was writing.
  const sentences = text.match(/[^.!?]+[.!?]+["'”’]?|[^.!?]+$/g);
  if (sentences && sentences.length > 2) text = sentences.slice(0, 2).map((s) => s.trim()).join(" ");

  if (text.length > 240) text = `${text.slice(0, 237).trimEnd()}...`;
  return text;
}

/**
 * Pull the decision back out, forgiving the ways a small model gets it
 * wrong. It reliably writes the CHOICE line and then reliably forgets the
 * SAY label, so anything after the choice is taken as the line.
 */
export function parseChoice(text, menu) {
  const choice = text.match(/CHOICE\s*[:\-]?\s*(\d+)/i);
  const id = choice ? Number(choice[1]) : NaN;
  const legal = menu.some((offer) => offer.id === id);

  const labelled = text.match(/SAY\s*[:\-]\s*([\s\S]+)/i);
  const trailing = choice ? text.slice(choice.index + choice[0].length) : "";
  return { offerId: legal ? id : null, line: tidy(labelled ? labelled[1] : trailing) };
}

/**
 * One request to an OpenAI-compatible chat endpoint. Deliberately plain:
 * that shape is spoken by Ollama, LM Studio, llama.cpp, vLLM and every
 * hosted free tier worth pointing at, so there is nothing to install here
 * and nothing to rewrite when you change your mind about the model.
 */
async function askModel({ url, model, key, system, prompt, raw = false }) {
  const response = await fetch(`${url.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      max_tokens: 160,
      temperature: 0.9,
      stream: false,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${response.status} ${detail}`.slice(0, 160));
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  // A decision comes back as two labelled lines; tidying it here would eat
  // the labels. The line inside it is tidied after parsing.
  return raw ? String(content).replace(/<think>[\s\S]*?<\/think>/gi, "").trim() : tidy(content);
}

/**
 * @param {(line: string) => void} say  where a finished line goes
 * @param {(choice: {offerId: number|null, line: string}) => void} [decide]
 *   where a chosen incident goes. `offerId: null` means "you pick" — the
 *   authority falls back to its own weighted choice.
 */
export async function createOverlord(say, decide) {
  const enabled = process.env.OVERLORD === "1";
  const url = process.env.OVERLORD_URL || DEFAULT_URL;
  const model = process.env.OVERLORD_MODEL || DEFAULT_MODEL;
  const key = process.env.OVERLORD_KEY || "";

  let system = null;
  let calls = 0;
  let failures = 0;
  let lastSpokeAt = 0;
  let inFlight = false;
  let turn = 0;
  /** Notices from the world since he last spoke. */
  let pending = [];
  let lastNoted = "";
  let deaths = 0;

  if (enabled) {
    try {
      system = await readFile(fileURLToPath(BIBLE), "utf-8");
      console.log(`the Grey King is listening (${model} at ${url})`);
      // Wake him before anyone needs him. Loading the weights and reading
      // the bible is the expensive part and it happens exactly once, so pay
      // for it at boot rather than in front of a player.
      void askModel({ url, model, key, system, prompt: "Say nothing. Reply with a single full stop." })
        .then(() => console.log("the Grey King is awake"))
        .catch((err) => console.log(`the Grey King did not stir (${err.message}) — first line may be slow`));
    } catch (err) {
      console.log(`the Grey King is mute (${err.message}) — the Understudy will speak`);
      system = null;
    }
  } else {
    console.log("the Grey King is played by the Understudy — set OVERLORD=1 for a real model");
  }

  /** A notice from the world. Anything the log would show a player. */
  function note(line) {
    // Never feed him his own words back.
    if (line.startsWith("The Grey King:")) return;
    if (line === lastNoted) return; // the log can re-offer a line when it trims
    lastNoted = line;
    pending.push(line);
    if (pending.length > 24) pending.shift();
  }

  function noteDeath(death) {
    deaths++;
    const who = `Soul #${death.lineage}, ${death.mastery}`;
    pending.push(
      death.cause === "cut down by a Lieutenant"
        ? `Your Lieutenant killed ${who}.`
        : `${who} died. The cause was: ${death.cause}.`,
    );
  }

  /** Reads the notices it is handed, because by now `pending` has been cleared. */
  function understudy(notices, hadDeath) {
    const kind = hadDeath
      ? "death"
      : notices.some((l) => /fire/i.test(l))
        ? "fire"
        : notices.some((l) => /hands/i.test(l))
          ? "trade"
          : "quiet";
    return pick(UNDERSTUDY[kind], turn);
  }

  /** The storyteller's prompt: what happened, and what may happen next. */
  function menuPrompt(world, menu) {
    const lines = pending.slice(-12).map((l) => `- ${l}`).join("\n");
    return [
      `It is ${world.night ? "night" : "day"} in the Verge.`,
      `Souls alive: ${world.souls}.${world.crows ? " The crows have gathered over something loud." : ""}`,
      `What they have built weighs ${world.pressure} against them.`,
      "",
      "Since you last acted, the world recorded:",
      lines || "- nothing worth recording",
      "",
      "You may do exactly one of these, and nothing else:",
      ...menu.map((offer) => `  ${offer.id}) ${offer.what}`),
      "",
      "Most of the time the right answer is 0. Choose cruelty when they have",
      "grown comfortable, and patience when they have just buried someone.",
      "",
      "Things you said on other days, for tone only. Never reuse them:",
      ...VOICE.map((line) => `  ${line}`),
      "",
      "Reply with exactly two lines and nothing else:",
      "CHOICE: <the number>",
      "SAY: <one sentence, aloud, to everyone in the Verge>",
    ].join("\n");
  }


  function digest(world) {
    const lines = pending.slice(-12).map((l) => `- ${l}`).join("\n");
    return [
      `It is ${world.night ? "night" : "day"} in the Verge.`,
      `Souls alive: ${world.souls}.${world.crows ? " The crows have gathered over something loud." : ""}`,
      "",
      "Since you last spoke, the world recorded:",
      lines || "- nothing worth recording",
      "",
      "Say one line aloud to everyone in the Verge, about something in that",
      "list and nothing else. You are watching them do it; you are not doing",
      "it. One sentence, two at the outside. No riddles and no proverbs.",
      "Do not explain a rule, do not use numbers, do not narrate for a reader,",
      "and never say *we* or *us* — you are not one of them.",
      "",
      "Things you said on other days, for tone only. Never reuse them, and",
      "never answer today with yesterday's subject:",
      ...VOICE.map((line) => `  ${line}`),
      "",
      "Reply with your line and nothing else.",
    ].join("\n");
  }

  async function speak(world, menu) {
    const directing = Boolean(menu && menu.length > 1 && decide);
    const shouldSpeak = directing || deaths > 0 || pending.length >= 2;
    const now = Date.now();
    if (!shouldSpeak || inFlight || now - lastSpokeAt < MIN_GAP_MS) return;

    lastSpokeAt = now;
    turn++;
    const notices = pending;
    const hadDeath = deaths > 0;
    const prompt = directing ? menuPrompt(world, menu) : digest(world);
    pending = [];
    deaths = 0;

    if (!system) {
      // No model: the authority picks by weight, and says so in his voice.
      if (directing) decide({ offerId: null, line: understudy(notices, hadDeath) });
      else say(understudy(notices, hadDeath));
      return;
    }

    inFlight = true;
    calls++;
    try {
      const answer = await askModel({ url, model, key, system, prompt, raw: directing });
      if (process.env.OVERLORD_DEBUG === "1") console.log(`[overlord] raw: ${answer}`);
      if (directing) {
        const choice = parseChoice(answer, menu);
        const chosen = menu.find((offer) => offer.id === choice.offerId);
        decide({
          offerId: choice.offerId,
          line: choice.line || (chosen ? INCIDENT_LINES[chosen.action.kind] : understudy(notices, hadDeath)),
        });
      } else {
        say(answer || understudy(notices, hadDeath));
      }
      failures = 0;
    } catch (err) {
      // A model that isn't there is not a reason for the world to go quiet.
      failures++;
      if (failures <= 3) {
        console.log(`the Grey King fell silent (${err.message}) — the Understudy speaks`);
        if (failures === 3) console.log("(further failures go unmentioned; the Understudy has it)");
      }
      if (directing) decide({ offerId: null, line: understudy(notices, hadDeath) });
      else say(understudy(notices, hadDeath));
    } finally {
      inFlight = false;
    }
  }

  return {
    note,
    noteDeath,
    /**
     * Called every tick. Cheap, and almost always does nothing. Pass the
     * menu of legal actions to get a decision; pass none to get commentary.
     */
    consider(world, menu = null) {
      void speak(world, menu);
    },
    /**
     * Whether he is due to act. The authority asks first, because building
     * the menu draws on the world's random stream — doing that every tick
     * would make the Verge's luck depend on how often we polled it.
     */
    ready() {
      return !inFlight && Date.now() - lastSpokeAt >= MIN_GAP_MS;
    },
    /** What the Understudy would say about an incident it was handed. */
    lineFor(kind) {
      return INCIDENT_LINES[kind] ?? INCIDENT_LINES.nothing;
    },
    get stats() {
      return { enabled: Boolean(system), model, url, calls, failures, waiting: pending.length };
    },
  };
}
