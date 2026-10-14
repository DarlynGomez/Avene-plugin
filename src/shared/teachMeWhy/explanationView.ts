import type { Root } from "../grouping/groupingTypes";
import { buildExplanationKey, type InstanceRoles } from "./explanationKey";
import type { Depth, ExplanationEntry, ExplanationKey, ExplanationTable } from "./explanationTypes";
import { fillSlots, slotValues } from "./fillSlots";
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
  rolesFor: (nodeId: string) => InstanceRoles | undefined
): ExplanationView {
  const key = buildExplanationKey(root, depth, rolesFor);
  const entry = lookupExplanation(table, key);
  const representative = root.instances.find((i) => i.issueId === root.representativeIssueId);
  const measuredRatio = representative?.measuredRatio ?? 0;
  const isAi = entry.status === "approved";
  const values = slotValues(measuredRatio, root.requiredRatio);
  return {
    key,
    entry,
    isAi,
    text: fillSlots(entry.text, measuredRatio, root.requiredRatio),
    basedOn: isAi ? sourceNamesFor(entry.factIds) : [],
    ...values
  };
}
