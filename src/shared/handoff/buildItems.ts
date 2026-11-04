import { deriveRoots } from "../grouping/deriveRoots";
import type { Severity } from "../issues/issueTypes";
import type {
  HandoffFinding,
  HandoffInput,
  HandoffItem,
  HandoffItemMeta,
  HandoffScreen
} from "./types";

const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2 };

export const DEFAULT_META: HandoffItemMeta = { signOff: "needs", leaveOut: false };

export interface BuiltItems {
  items: HandoffItem[];
  /** Layers, not roots, since no deferral time or root decision exists */
  deferredLayers: number;
}

export function highestSeverity(findings: readonly { severity: Severity }[]): Severity {
  return findings.reduce<Severity>(
    (top, finding) =>
      SEVERITY_RANK[finding.severity] > SEVERITY_RANK[top] ? finding.severity : top,
    "low"
  );
}

function itemsFor(
  kind: HandoffItem["kind"],
  findings: readonly HandoffFinding[],
  screen: HandoffScreen,
  input: HandoffInput
): HandoffItem[] {
  const built: HandoffItem[] = [];
  for (const root of deriveRoots(findings)) {
    const meta = input.meta[root.signature] ?? DEFAULT_META;
    if (meta.leaveOut) continue;
    const instances = root.instances as readonly HandoffFinding[];
    built.push({
      kind,
      signature: root.signature,
      screenId: screen.id,
      screenName: screen.name,
      condition: "standard",
      important: root.displayState === "important",
      instances,
      representative:
        instances.find((i) => i.issueId === root.representativeIssueId) ?? instances[0],
      highestSeverity: highestSeverity(instances),
      decision: input.decisions[root.signature] ?? null,
      meta
    });
  }
  return built;
}

/** Open and important are action, ignored are left as-is, deferred is a count, resolved is out */
export function buildItems(input: HandoffInput): BuiltItems {
  const items: HandoffItem[] = [];
  let deferredLayers = 0;
  for (const screen of input.screens) {
    const onScreen = input.findings.filter((finding) => finding.screenId === screen.id);
    deferredLayers += onScreen.filter((finding) => finding.state === "deferred").length;
    const action = itemsFor(
      "action",
      onScreen.filter((finding) => finding.state === "open" || finding.state === "important"),
      screen,
      input
    ).sort((a, b) => Number(b.important) - Number(a.important));
    const left = itemsFor(
      "left",
      onScreen.filter((finding) => finding.state === "ignored"),
      screen,
      input
    );
    items.push(...action, ...left);
  }
  return { items, deferredLayers };
}
