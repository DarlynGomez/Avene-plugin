import { FACTS_ONE } from "./factData";
import { FACTS_TWO } from "./factDataMore";
import type { Depth, ElementRole, ExplanationKey, Fact } from "./explanationTypes";

export const FACT_LIBRARY: readonly Fact[] = [...FACTS_ONE, ...FACTS_TWO];

/** Fact ids each role may use at depths 2 and 3, depth 1 uses none */
export const FACT_MATRIX: Record<ElementRole, Partial<Record<Depth, readonly string[]>>> = {
  heading: { 2: ["F16", "F09"], 3: ["F01", "F02", "F03"] },
  body: { 2: ["F16", "F09", "F15"], 3: ["F01", "F02", "F03"] },
  caption: { 2: ["F16", "F17", "F12"], 3: ["F01", "F02", "F03", "F06"] },
  label: { 2: ["F10", "F16"], 3: ["F01", "F02", "F03", "F13"] },
  "button text": { 2: ["F10", "F16"], 3: ["F01", "F02", "F03", "F13"] },
  decorative: { 2: ["F04"], 3: ["F04", "F01"] },
  unknown: { 2: ["F16", "F15"], 3: ["F01", "F02", "F03"] }
};

/** Read in full, or an excerpt whose whole source was read, a summary never ships */
export function isShippable(fact: Fact): boolean {
  return fact.readStatus === "full" || (fact.readStatus === "excerpt" && fact.excerptVerified);
}

/** The matrix row for a key, as facts, whether or not they may ship yet */
export function allowedFacts(key: ExplanationKey): readonly Fact[] {
  const ids = FACT_MATRIX[key.role][key.depth] ?? [];
  return ids.flatMap((id) => FACT_LIBRARY.filter((fact) => fact.id === id));
}

/** What the study build may use, the matrix row without facts not yet cleared to ship */
export function shippableFacts(key: ExplanationKey): readonly Fact[] {
  return allowedFacts(key).filter(isShippable);
}
