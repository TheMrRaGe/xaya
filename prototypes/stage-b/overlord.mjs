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
/** A slow local model must never pile requests up behind itself. */
const TIMEOUT_MS = 20_000;

/**
 * The Understudy. Pure code, no network, no cost — and the only thing
 * speaking until you point the server at a model. Grouped so the line at
 * least matches the shape of what happened.
 */
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
 * One request to an OpenAI-compatible chat endpoint. Deliberately plain:
 * that shape is spoken by Ollama, LM Studio, llama.cpp, vLLM and every
 * hosted free tier worth pointing at, so there is nothing to install here
 * and nothing to rewrite when you change your mind about the model.
 */
async function askModel({ url, model, key, system, prompt }) {
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
  return tidy(data?.choices?.[0]?.message?.content);
}

/**
 * @param {(line: string) => void} say  where a finished line goes
 */
export async function createOverlord(say) {
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
    pending.push(`Soul #${death.lineage}, ${death.mastery}, is dead — ${death.cause}.`);
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

  function digest(world) {
    const lines = pending.slice(-12).map((l) => `- ${l}`).join("\n");
    return [
      `It is ${world.night ? "night" : "day"} in the Verge.`,
      `Souls alive: ${world.souls}.${world.crows ? " The crows have gathered over something loud." : ""}`,
      "",
      "Since you last spoke, the world recorded:",
      lines || "- nothing worth recording",
      "",
      "Say one line aloud to everyone in the Verge. One sentence, two at the",
      "outside. Do not explain a rule, do not use numbers, do not narrate for",
      "a reader, and do not repeat yourself. Reply with the line and nothing else.",
    ].join("\n");
  }

  async function speak(world) {
    const shouldSpeak = deaths > 0 || pending.length >= 2;
    const now = Date.now();
    if (!shouldSpeak || inFlight || now - lastSpokeAt < MIN_GAP_MS) return;

    lastSpokeAt = now;
    turn++;
    const notices = pending;
    const hadDeath = deaths > 0;
    const prompt = digest(world);
    pending = [];
    deaths = 0;

    if (!system) {
      say(understudy(notices, hadDeath));
      return;
    }

    inFlight = true;
    calls++;
    try {
      const line = await askModel({ url, model, key, system, prompt });
      say(line || understudy(notices, hadDeath));
      failures = 0;
    } catch (err) {
      // A model that isn't there is not a reason for the world to go quiet.
      failures++;
      if (failures <= 3) {
        console.log(`the Grey King fell silent (${err.message}) — the Understudy speaks`);
        if (failures === 3) console.log("(further failures go unmentioned; the Understudy has it)");
      }
      say(understudy(notices, hadDeath));
    } finally {
      inFlight = false;
    }
  }

  return {
    note,
    noteDeath,
    /** Called every tick. Cheap, and almost always does nothing. */
    consider(world) {
      void speak(world);
    },
    get stats() {
      return { enabled: Boolean(system), model, url, calls, failures, waiting: pending.length };
    },
  };
}
