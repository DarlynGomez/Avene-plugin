import { FACT_LIBRARY, isShippable } from "../../src/shared/teachMeWhy/facts";
import { parseCsv } from "./csv";

export interface Flag {
  line: number;
  key: string;
  reasons: string[];
}

const NUMBER = /\d+(?:\.\d+)?:\d+(?:\.\d+)?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?/g;
const numbersIn = (text: string) => text.match(NUMBER) ?? [];

/** Read only, a row is flagged for a person to read twice and nothing is changed */
export function flagRows(csvText: string, phrases: readonly string[]): Flag[] {
  const [header, ...rows] = parseCsv(csvText);
  const col = (name: string) => header.indexOf(name);
  const flags: Flag[] = [];
  rows.forEach((row, index) => {
    const cell = (name: string) => (col(name) >= 0 ? (row[col(name)] ?? "") : "");
    const text = [cell("text"), cell("edited_text")].join("\n");
    const ids = cell("fact_ids")
      .split(/[\s,;]+/)
      .filter((id) => id !== "");
    const used = ids.flatMap((id) => FACT_LIBRARY.filter((fact) => fact.id === id));
    const reasons: string[] = [];

    // Slots are written as braces so they hold no digits, every other number needs a used fact
    const permitted = new Set(used.flatMap((fact) => numbersIn(fact.plain)));
    const stray = [...new Set(numbersIn(text))].filter((value) => !permitted.has(value));
    if (stray.length > 0)
      reasons.push(`number outside the slots and used facts: ${stray.join(", ")}`);

    const unverified = ids.filter(
      (id) => !used.some((fact) => fact.id === id && isShippable(fact))
    );
    if (unverified.length > 0) reasons.push(`fact not verified: ${unverified.join(", ")}`);

    const lower = text.toLowerCase();
    // A warning only, larger text is not an option for text that is not large
    if (/normal:\d$/.test(cell("key")) && /\b(larger|bigger)\b/.test(lower)) {
      reasons.push("warning: larger or bigger on a normal size key");
    }
    // Direction words are not a failure, a person reads the row twice
    const direction = [
      ...new Set(lower.match(/\bdark(?:er|en\w*)\b|\blight(?:er|en\w*)\b/g) ?? [])
    ];
    if (direction.length > 0) reasons.push(`read twice: ${direction.join(", ")}`);

    const hit = phrases.filter((phrase) => lower.includes(phrase.toLowerCase()));
    if (hit.length > 0) reasons.push(`read twice: ${hit.join(", ")}`);

    if (reasons.length > 0) flags.push({ line: index + 2, key: cell("key"), reasons });
  });
  return flags;
}
