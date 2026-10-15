import { ELEMENT_ROLES, type Depth, type ElementRole } from "./explanationTypes";
import {
  NEVER_OFFER,
  STORY_FACTS,
  eligibleFacts,
  isAdded,
  unassignedFacts
} from "./factEligibility";
import { FACT_LIBRARY } from "./facts";

export interface EligibilityRow {
  id: string;
  /** Where the fact is offered, role and depth, with * for a row added on 2026-10-14 */
  rows: string[];
  note: string;
}

const DEPTHS: readonly Depth[] = [2, 3];

/** One line per fact saying which role and depth rows it may be offered to */
export function buildEligibilityMap(): EligibilityRow[] {
  const unassigned = new Set(unassignedFacts());
  return FACT_LIBRARY.map((fact) => {
    const rows: string[] = [];
    for (const role of ELEMENT_ROLES as readonly ElementRole[]) {
      for (const depth of DEPTHS) {
        const sizes = (["normal", "large"] as const).filter((size) =>
          eligibleFacts({ role, severity: "medium", size, depth }).some((c) => c.id === fact.id)
        );
        if (sizes.length > 0) {
          const only = sizes.length === 1 ? ` (${sizes[0]} only)` : "";
          rows.push(`${role} D${depth}${isAdded(role, depth, fact.id) ? "*" : ""}${only}`);
        }
      }
    }
    const notes: string[] = [];
    if (NEVER_OFFER.has(fact.id)) notes.push("never offered");
    if (unassigned.has(fact.id)) notes.push("unassigned, no row yet");
    if (STORY_FACTS.has(fact.id)) notes.push("a story, never a statistic");
    return { id: fact.id, rows, note: notes.join(", ") };
  });
}
