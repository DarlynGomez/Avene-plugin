import { FACT_LIBRARY } from "./facts";

/** The names of the sources behind a set of facts, each once, in the order they first appear */
export function sourceNamesFor(factIds: readonly string[]): string[] {
  const names: string[] = [];
  for (const id of factIds) {
    const fact = FACT_LIBRARY.find((candidate) => candidate.id === id);
    for (const part of fact?.source.split(";") ?? []) {
      const name = part.trim();
      if (name !== "" && !names.includes(name)) names.push(name);
    }
  }
  return names;
}
