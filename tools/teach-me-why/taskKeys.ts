import { parseKeyString } from "../../src/shared/teachMeWhy/explanationKey";
import type { ExplanationKey } from "../../src/shared/teachMeWhy/explanationTypes";

/**
 * The keys the two study tasks use, from review_first.txt, one line per key and depth
 * Each is paired with the unknown role key of the same severity and size, since no role is
 * built yet and unknown is what a participant actually gets today
 */
export function taskKeys(reviewFirstText: string): ExplanationKey[] {
  const seen = new Set<string>();
  const keys: ExplanationKey[] = [];
  const add = (key: ExplanationKey) => {
    const name = `${key.role}:${key.severity}:${key.size}:${key.depth}`;
    if (!seen.has(name)) {
      seen.add(name);
      keys.push(key);
    }
  };
  for (const line of reviewFirstText.split("\n")) {
    const key = parseKeyString(line);
    if (!key) continue;
    add(key);
    add({ ...key, role: "unknown" });
  }
  return keys
    .sort((a, b) => a.depth - b.depth)
    .sort((a, b) =>
      `${a.role}${a.severity}${a.size}`.localeCompare(`${b.role}${b.severity}${b.size}`)
    );
}
