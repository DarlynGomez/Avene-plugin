import { buildAudienceDoc } from "./audiences";
import { DECISION, finding, ignoredFinding, input } from "./handoffFixtures";
import type { Audience, DocSection, HandoffInput } from "./types";

/** Values that must never reach the model: names, colors, a reason, a person, a link */
export const SECRETS = [
  "Helper text",
  "Promo banner",
  "Payment",
  "#9A9A9A",
  "#FF7A1A",
  "Brand campaign color",
  "Sam Lee",
  "figma.com"
];

export function sampleInput(over: Partial<HandoffInput> = {}): HandoffInput {
  return input({
    fileUrl: "https://www.figma.com/design/KEY/Checkout",
    findings: [
      finding({ link: "https://www.figma.com/design/KEY/Checkout?node-id=1-1" }),
      ignoredFinding()
    ],
    decisions: {
      [DECISION.signature]: { ...DECISION, reason: "Brand campaign color for the launch" }
    },
    meta: { [DECISION.signature]: { signOff: "needs", leaveOut: false, decidedBy: "Sam Lee" } },
    ...over
  });
}

export const docFor = (audience: Audience, over: Partial<HandoffInput> = {}) =>
  buildAudienceDoc(sampleInput(over), audience);

/** A reword that keeps every id and label, as a good model reply would */
export const reword = (lines: readonly string[]): string[] =>
  lines.map((line) =>
    line
      .replace("This is the only layer", "This is the sole layer")
      .replace("Not bound", "It is not bound")
      .replace("Highest severity open:", "The highest severity still open:")
  );

/** A section of a document by id, a missing one is a mistake in the test */
export function sectionOf(doc: { sections: readonly DocSection[] }, id: string): DocSection {
  const found = doc.sections.find((section) => section.id === id);
  if (!found) throw new Error(`no section ${id}`);
  return found;
}
