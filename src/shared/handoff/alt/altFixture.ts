import { DECISION, finding, ignoredFinding, input } from "../handoffFixtures";
import type { HandoffInput, HandoffNote } from "../types";
import type { ImageLayer } from "./altTypes";

const AT = "2026-11-05T10:00:00.000Z";

const layer = (nodeId: string, hash: string, name: string): ImageLayer => ({
  nodeId,
  name,
  screenId: "s1",
  screenName: "Payment",
  width: 320,
  height: 180,
  imageHash: hash
});

/** Four image layers: two share a picture, and one is decorative, one holds a confirmed AI note, one has no note yet */
export const FIXTURE_LAYERS: readonly ImageLayer[] = [
  layer("9:1", "h-hero", "Hero banner"),
  layer("9:2", "h-hero", "Hero banner copy"),
  layer("9:3", "h-pattern", "Background pattern"),
  layer("9:4", "h-cart", "Cart icon")
];

const note = (nodeId: string, nodeName: string, extra: HandoffNote["note"]): HandoffNote => ({
  nodeId,
  nodeName,
  note: extra
});

/** The designer's alt text has a hex value in it on purpose, to see where it can and cannot be printed */
export const FIXTURE_NOTES: readonly HandoffNote[] = [
  note("9:1", "Hero banner", {
    category: "alt",
    text: "Brand swatch #FF7A1A on white",
    updatedAt: AT
  }),
  note("9:3", "Background pattern", { category: "alt", text: "", decorative: true, updatedAt: AT }),
  note("9:4", "Cart icon", {
    category: "alt",
    text: "Order summary icon that opens the cart",
    source: "ai",
    updatedAt: AT
  })
];

/** Three contrast items, two open and one left as it is with a reason, and the images above */
export function fixtureInput(over: Partial<HandoffInput> = {}): HandoffInput {
  return input({
    findings: [
      finding(),
      finding({
        issueId: "contrast:1:2",
        nodeId: "1:2",
        nodeName: "Caption",
        foregroundHex: "#777777",
        measuredRatio: 3.9
      }),
      ignoredFinding()
    ],
    decisions: { [DECISION.signature]: DECISION },
    notes: FIXTURE_NOTES,
    imageLayers: FIXTURE_LAYERS,
    ...over
  });
}
