import type { GroupableFinding } from "./groupingTypes";

export interface SecondaryGroup {
  key: string;
  instances: readonly GroupableFinding[];
}

function groupBy(
  findings: readonly GroupableFinding[],
  keyOf: (finding: GroupableFinding) => string
): SecondaryGroup[] {
  const byKey = new Map<string, GroupableFinding[]>();
  for (const finding of findings) {
    const key = keyOf(finding);
    const group = byKey.get(key);
    if (group) {
      group.push(finding);
    } else {
      byKey.set(key, [finding]);
    }
  }
  return [...byKey.entries()].map(([key, instances]) => ({ key, instances }));
}

/** Buckets by screen id because screen names can repeat */
export function groupByScreen(findings: readonly GroupableFinding[]): SecondaryGroup[] {
  return groupBy(findings, (finding) => finding.screenId);
}

const SEVERITY_ORDER: readonly string[] = ["high", "medium", "low"];

/** Buckets by severity band, high first and low last whatever order the findings arrived in */
export function groupBySeverity(findings: readonly GroupableFinding[]): SecondaryGroup[] {
  const rank = (key: string) => {
    const at = SEVERITY_ORDER.indexOf(key);
    return at === -1 ? SEVERITY_ORDER.length : at;
  };
  return groupBy(findings, (finding) => finding.severity).sort((a, b) => rank(a.key) - rank(b.key));
}
