import { FACT_LIBRARY, FACT_MATRIX, isShippable } from "./facts";
import type { Depth, ElementRole, ExplanationKey, Fact } from "./explanationTypes";

/** Never offered, F11 does not apply to flat colour and F25 is only study framing */
export const NEVER_OFFER: ReadonlySet<string> = new Set(["F11", "F25"]);

/** Only one of each group may be offered in a single explanation */
export const EXCLUSIVE_GROUPS: readonly (readonly string[])[] = [
  ["F15", "F18"],
  ["F22", "F23"]
];

/** Single person accounts, the prompt presents them as stories and never as statistics */
export const STORY_FACTS: ReadonlySet<string> = new Set(["F17", "F23"]);

/** F03 says larger text needs less contrast, so it is offered on large keys only */

/** Facts limited to some roles, F21 is about colour differences between elements */
const ONLY_ROLES: Readonly<Record<string, readonly ElementRole[]>> = { F21: ["button text"] };

/**
 * Rows added for the newer facts on 2026-10-14, kept apart from the matrix of the first plan
 * Depth 2 is who is affected or the situation, depth 3 is the principle and the designer lesson
 * F05, F08 and F14 still have no row
 */
export const ADDED_MATRIX: Record<ElementRole, Partial<Record<Depth, readonly string[]>>> = {
  heading: { 2: ["F20"], 3: ["F22", "F23", "F24"] },
  body: { 2: ["F07", "F18", "F19", "F20"], 3: ["F22", "F23", "F24"] },
  caption: { 2: ["F07", "F19", "F20"], 3: ["F22", "F23", "F24"] },
  label: { 2: ["F07", "F20"], 3: ["F22", "F23", "F24"] },
  "button text": { 2: ["F07", "F20", "F21"], 3: ["F22", "F23", "F24"] },
  decorative: {},
  unknown: { 2: ["F07", "F18", "F20"], 3: ["F22", "F23", "F24"] }
};

function rowIds(role: ElementRole, depth: Depth): string[] {
  const approved = FACT_MATRIX[role][depth] ?? [];
  const added = ADDED_MATRIX[role][depth] ?? [];
  return [...new Set([...approved, ...added])];
}

export function isAdded(role: ElementRole, depth: Depth, id: string): boolean {
  return (
    (ADDED_MATRIX[role][depth] ?? []).includes(id) && !(FACT_MATRIX[role][depth] ?? []).includes(id)
  );
}

/** Facts that may be offered for a key, depth 1 gets none and only verified facts are ever offered */
export function eligibleFacts(key: ExplanationKey): readonly Fact[] {
  if (key.depth === 1) return [];
  return rowIds(key.role, key.depth)
    .filter((id) => !NEVER_OFFER.has(id))
    .filter((id) => !(id === "F03" && key.size === "normal"))
    .filter((id) => ONLY_ROLES[id] === undefined || ONLY_ROLES[id].includes(key.role))
    .flatMap((id) => FACT_LIBRARY.filter((fact) => fact.id === id && isShippable(fact)));
}

/** The groups an explanation used more than one fact from */
export function exclusiveViolations(usedIds: readonly string[]): string[][] {
  return EXCLUSIVE_GROUPS.map((group) => group.filter((id) => usedIds.includes(id))).filter(
    (hits) => hits.length > 1
  );
}

/** Facts with no row at all in either matrix, listed so none is forgotten */
export function unassignedFacts(): string[] {
  const placed = new Set<string>();
  for (const role of Object.keys(FACT_MATRIX) as ElementRole[]) {
    for (const depth of [2, 3] as const) rowIds(role, depth).forEach((id) => placed.add(id));
  }
  return FACT_LIBRARY.filter((fact) => !placed.has(fact.id) && !NEVER_OFFER.has(fact.id)).map(
    (fact) => fact.id
  );
}
