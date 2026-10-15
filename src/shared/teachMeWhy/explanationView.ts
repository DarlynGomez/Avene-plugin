import type { Root } from "../grouping/groupingTypes";
import { buildExplanationKey, type InstanceRoles } from "./explanationKey";
import type { Depth, ExplanationEntry, ExplanationKey, ExplanationTable } from "./explanationTypes";
import { fillSlots, slotValues, unfilledSlots } from "./fillSlots";
import { sameHueFix } from "./fixColour";
import { lookupExplanation } from "./lookupExplanation";
import { sourceNamesFor } from "./sourceNames";

/** Everything the card shows, built from the table and the plugin's own measurements */
export interface ExplanationView {
  key: ExplanationKey;
  entry: ExplanationEntry;
  /** Only an approved entry is AI written, a fixed template is not */
  isAi: boolean;
  text: string;
  /** Source names for the facts used, empty for a template or when none were used */
  basedOn: string[];
  measured: string;
  required: string;
}

export function buildExplanationView(
  root: Root,
  depth: Depth,
  table: ExplanationTable,
  rolesFor: (nodeId: string) => InstanceRoles | undefined,
  fontSizePx: number | null = null
): ExplanationView {
  const key = buildExplanationKey(root, depth, rolesFor);
  const representative = root.instances.find((i) => i.issueId === root.representativeIssueId);
  const measuredRatio = representative?.measuredRatio ?? 0;
  const backgroundHex = representative?.backgroundHex ?? root.backgroundHex;
  const details = {
    foregroundHex: root.foregroundHex,
    backgroundHex,
    fontSizePx,
    fixHex: sameHueFix(root.foregroundHex, backgroundHex, root.requiredRatio)
  };
  const approved = lookupExplanation(table, key);
  // A text that needs a value this issue cannot give, such as a fix colour, shows the template
  const needsMissing = unfilledSlots(approved.text, measuredRatio, root.requiredRatio, details);
  const entry = needsMissing.length > 0 ? table.fallbacks[`${depth}`] : approved;
  const isAi = entry.status === "approved";
  const values = slotValues(measuredRatio, root.requiredRatio);
  return {
    key,
    entry,
    isAi,
    text: fillSlots(entry.text, measuredRatio, root.requiredRatio, details),
    basedOn: isAi ? sourceNamesFor(entry.factIds) : [],
    ...values
  };
}
