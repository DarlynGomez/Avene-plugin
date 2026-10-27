import { COMPLIANCE_TERMS } from "./data/complianceTerms";
import { scanText, type BlockContext } from "./scan";
import type { Violation } from "./types";

const TERMS = COMPLIANCE_TERMS.map((source) => new RegExp(source, "gi"));

/** R5: a claim of compliance or a pass, in any use of the word */
export function checkClaims(sentences: readonly string[], c: BlockContext): Violation[] {
  return sentences.flatMap((sentence) => {
    const text = scanText(c, sentence);
    return TERMS.flatMap((term) =>
      [...text.matchAll(term)].map((m): Violation => ({
        rule: "R5",
        detail: "A compliance claim",
        match: m[0]
      }))
    );
  });
}
