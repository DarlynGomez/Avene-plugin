import type { Fact } from "./explanationTypes";

// Only the fields a participant can read, the reviewer note may mention anything
const DASH = /[–—]/;
const BANNED = ["WCAG", "compliance", "compliant", "violation", "AA", "AAA"];
const BANNED_PATTERNS = BANNED.map(
  (term) => new RegExp(`(?<![A-Za-z0-9])${term}(?![A-Za-z0-9])`, "i")
);
// Also banned in participant text by the voice rules, reported apart so the list above stays exact
const STRICT = [
  { label: "success criterion", pattern: /(?<![A-Za-z0-9])success\s+criterion(?![A-Za-z0-9])/i },
  { label: "criterion number", pattern: /(?<![\d.])\d+\.\d+\.\d+(?![\d.])/ }
];

export interface FactProblem {
  id: string;
  field: "plain" | "source";
  problem: string;
}

function problemsIn(fact: Fact, field: "plain" | "source", checks: typeof STRICT): FactProblem[] {
  return checks
    .filter((check) => check.pattern.test(fact[field]))
    .map((check) => ({ id: fact.id, field, problem: check.label }));
}

/** Dashes and the banned terms in plain and source only, never the reviewer note */
export function checkFactText(facts: readonly Fact[]): FactProblem[] {
  const checks = [
    { label: "en or em dash", pattern: DASH },
    ...BANNED.map((term, i) => ({ label: term, pattern: BANNED_PATTERNS[i] }))
  ];
  return facts.flatMap((fact) => [
    ...problemsIn(fact, "plain", checks),
    ...problemsIn(fact, "source", checks)
  ]);
}

/** Terms the voice rules ban that the list above leaves out, a source line can still carry them */
export function checkFactTextStrict(facts: readonly Fact[]): FactProblem[] {
  return facts.flatMap((fact) => [
    ...problemsIn(fact, "plain", STRICT),
    ...problemsIn(fact, "source", STRICT)
  ]);
}
