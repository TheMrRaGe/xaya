#!/usr/bin/env python3
"""
Stage A — talk to the Grey King.

The whole test: does a stranger, with no hints, find him unsettling?

Setup:
    pip install anthropic
    export ANTHROPIC_API_KEY=your-key-here   # or `ant auth login`

Run:
    python greyking_chat.py

Commands, typed at the prompt:
    /die     — ask him how you die. He narrates it, in character, and the
               conversation ends. This is the one explicit hook Stage A's
               own plan calls for ("he tells you how you died").
    /quit    — leave without dying. Also Ctrl-C / Ctrl-D.

Every conversation is auto-saved to transcripts/ on exit — that's the actual
Stage A gate: show these to twenty strangers, unprompted, and see if any of
them says something like "that's creepy" without being told what to look for.
"""

import datetime
import pathlib
import sys

import anthropic

MODEL = "claude-opus-5"
BIBLE_PATH = pathlib.Path(__file__).parent.parent.parent / "doc" / "world" / "GREYKING.md"
TRANSCRIPT_DIR = pathlib.Path(__file__).parent / "transcripts"

DEATH_PROMPT = (
    "[The player's strength gives out. Whatever has been happening to them "
    "in this conversation, it ends here. Narrate their death, in character, "
    "the way you would if you had just been told of it — not a system "
    "message, not a game-over screen. This is the last thing you say to them.]"
)


def load_system_prompt() -> str:
    if not BIBLE_PATH.exists():
        sys.exit(
            f"Can't find the character bible at {BIBLE_PATH}.\n"
            "Run this from prototypes/stage-a/, or fix BIBLE_PATH."
        )
    return BIBLE_PATH.read_text(encoding="utf-8")


def save_transcript(history: list[dict]) -> pathlib.Path:
    TRANSCRIPT_DIR.mkdir(exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    path = TRANSCRIPT_DIR / f"{stamp}.md"
    lines = ["# Grey King — transcript", f"_{stamp}_", ""]
    for turn in history:
        speaker = "**You:**" if turn["role"] == "user" else "**Grey King:**"
        lines.append(f"{speaker} {turn['content']}")
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def main() -> None:
    system_prompt = load_system_prompt()
    client = anthropic.Anthropic()
    history: list[dict] = []

    print("You are standing before the Grey King. (/die to see how it ends, /quit to leave)\n")

    while True:
        try:
            user_input = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not user_input:
            continue
        if user_input in ("/quit", "/exit"):
            break

        dying = user_input == "/die"
        message = DEATH_PROMPT if dying else user_input
        history.append({"role": "user", "content": message})

        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=1024,
                system=system_prompt,
                messages=history,
            )
        except anthropic.APIStatusError as e:
            print(f"\n[the connection falters — {e.status_code}: {e.message}]\n")
            history.pop()
            continue
        except anthropic.APIConnectionError as e:
            print(f"\n[the connection falters — {e}]\n")
            history.pop()
            continue

        reply = "".join(block.text for block in response.content if block.type == "text")
        history.append({"role": "assistant", "content": reply})
        print(f"\n{reply}\n")

        if dying:
            break

    if history:
        path = save_transcript(history)
        print(f"\n[transcript saved to {path}]")


if __name__ == "__main__":
    main()
