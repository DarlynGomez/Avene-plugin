import { buildEligibilityMap } from "../../src/shared/teachMeWhy/eligibilityMap";
import { checkFactText, checkFactTextStrict } from "../../src/shared/teachMeWhy/factChecks";
import { EXCLUSIVE_GROUPS } from "../../src/shared/teachMeWhy/factEligibility";
import { FACT_LIBRARY } from "../../src/shared/teachMeWhy/facts";
import { sourceNamesFor } from "../../src/shared/teachMeWhy/sourceNames";

/** Read only, prints what a participant would read and where each fact may be offered */
const problems = checkFactText(FACT_LIBRARY);
console.log(
  `Facts: ${FACT_LIBRARY.length}, all verified: ${FACT_LIBRARY.every((f) => f.excerptVerified || f.readStatus === "full")}`
);
console.log(
  problems.length === 0
    ? "Shipped fields (plain, source): no en or em dash, no WCAG, compliance, compliant, violation, AA or AAA"
    : problems
);
console.log("\nAlso banned by the voice rules, not in the list above:");
for (const p of checkFactTextStrict(FACT_LIBRARY))
  console.log(`  ${p.id} ${p.field}: ${p.problem}`);

console.log("\nBased on line for each fact, with its length in characters:");
for (const fact of FACT_LIBRARY) {
  const line = `Based on: ${sourceNamesFor([fact.id]).join("; ")}`;
  console.log(`  ${fact.id} (${line.length}) ${line}`);
}

console.log(
  `\nExclusive groups: ${EXCLUSIVE_GROUPS.map((g) => g.join(" or ")).join(", ")}. * marks a row added on 2026-10-14`
);
console.table(
  buildEligibilityMap().map((row) => ({
    fact: row.id,
    offered: row.rows.join(", ") || "none",
    note: row.note
  }))
);
