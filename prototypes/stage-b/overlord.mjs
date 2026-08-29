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
 *   2. It always has something to say. With no key, no network, or a failed
 *      request, the Understudy speaks instead — §3.2's liveness guarantee
 *      in miniature. The world never stalls because inference was
 *      unavailable.
 *
 * Off unless OVERLORD=1, because it spends real money.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const MODEL = "claude-opus-5";
const BIBLE = new URL("../../doc/world/GREYKING.md", import.meta.url);

/** Don't speak more often than this, however much is happening. */
const MIN_GAP_MS = 25_000;
/** A hard ceiling on one server's spend. Raise it deliberately. */
const MAX_CALLS = Number(process.env.OVERLORD_MAX_CALLS) || 200;

/**
 * The Understudy. Pure code, no network, no cost — and the only thing
 * speaking in the default configuration. Grouped so the line at least
 * matches the shape of what happened.
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
 * @param {(line: string) => void} say  where a finished line goes
 */
export async function createOverlord(say) {
  const enabled = process.env.OVERLORD === "1";
  let client = null;
  let system = null;
  let calls = 0;
  let lastSpokeAt = 0;
  let inFlight = false;
  let turn = 0;
  /** Notices from the world since he last spoke. */
  let pending = [];
  let lastNoted = "";
  let deaths = 0;

  if (enabled) {
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      client = new Anthropic();
      system = await readFile(fileURLToPath(BIBLE), "utf-8");
      console.log(`the Grey King is listening (${MODEL}, max ${MAX_CALLS} lines)`);
    } catch (err) {
      console.log(`the Grey King is mute (${err.message}) — the Understudy will speak`);
      client = null;
    }
  } else {
    console.log("the Grey King is played by the Understudy — set OVERLORD=1 for the real one");
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

  /** Reads the notices it is given, because by now `pending` has been cleared. */
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
      `Tick ${world.tick}. It is ${world.night ? "night" : "day"} in the Verge.`,
      `Souls alive: ${world.souls}. Noise in the world: ${world.noise} of 1000${world.crows ? " — the crows have gathered" : ""}.`,
      "",
      "Since you last spoke, the world recorded:",
      lines || "- nothing worth recording",
      "",
      "Say one line to everyone in the Verge. One sentence, two at the outside.",
      "You are speaking aloud to them, not narrating for a reader. Never explain",
      "a rule, never mention a tick or a number, and never repeat yourself.",
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

    if (!client || calls >= MAX_CALLS) {
      say(understudy(notices, hadDeath));
      return;
    }

    inFlight = true;
    calls++;
    try {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 1000,
        // One short line of dialogue is not a reasoning problem.
        output_config: { effort: "low" },
        // A menacing villain narrating deaths is exactly the kind of thing a
        // classifier may decline; on a decline the call rescues itself.
        betas: ["server-side-fallback-2026-06-01"],
        fallbacks: [{ model: "claude-opus-4-8" }],
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join(" ")
        .trim();

      if (response.stop_reason === "refusal" || !text) {
        say(understudy(notices, hadDeath));
      } else {
        say(text.replace(/\s+/g, " "));
      }
    } catch (err) {
      // A dead network is not a dead world.
      console.log(`the Grey King fell silent (${err.message}) — the Understudy speaks`);
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
      return { enabled: Boolean(client), calls, waiting: pending.length };
    },
  };
}
