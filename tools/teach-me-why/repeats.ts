import { keyToString, parseKeyString } from "../../src/shared/teachMeWhy/explanationKey";
import { findRepeats } from "../../src/shared/teachMeWhy/repetition";
import { REPEAT_MESSAGE } from "./retryMessage";
import type { Progress } from "./types";

/** The three depths of each key, with the later depth of any repeat marked failed so it can be redone */
export function markRepeats(progress: Progress): string[] {
  const marked: string[] = [];
  const groups = new Set(
    Object.keys(progress.items).map((name) => name.split(":").slice(0, 3).join(":"))
  );
  for (const group of groups) {
    const items = [1, 2, 3].map((depth) => progress.items[`${group}:${depth}`]);
    if (items.some((item) => !item || item.status !== "completed")) continue;
    const texts = { 1: items[0].text, 2: items[1].text, 3: items[2].text };
    for (const repeat of findRepeats(texts)) {
      const key = parseKeyString(`${group}:${repeat.depth}`);
      if (!key) continue;
      const item = progress.items[keyToString(key)];
      const reason = `repeat: ${repeat.why} (depth ${repeat.other})`;
      item.status = "failed";
      item.reasons = [...new Set([...item.reasons, "repeat"])];
      item.attemptReasons.push(["repeat"]);
      item.messages = [
        REPEAT_MESSAGE(
          repeat.other,
          repeat.why === "same opening" ? "opening" : "opening and main claim"
        )
      ];
      marked.push(`${keyToString(key)} ${reason}`);
    }
  }
  return marked;
}
