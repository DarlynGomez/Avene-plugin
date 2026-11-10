import type { Finding } from "../../shared/issues/issueTypes";
import { isStudyActive } from "../../shared/study/studyActive";
import type { ContrastEvidence } from "../detection/rules/contrast/contrastRule";
import { describeContrastEvidence } from "../detection/rules/contrast/describeEvidence";
import { activeStudySession } from "../study/adapter/studySessionStore";

/** Evidence is typed per rule but logged generically */
const EVIDENCE_DESCRIBERS: Record<
  string,
  (evidence: unknown, severity: Finding["severity"]) => string
> = {
  contrast: (evidence, severity) => describeContrastEvidence(evidence as ContrastEvidence, severity)
};

function describeFinding(finding: Finding): string {
  const describe = EVIDENCE_DESCRIBERS[finding.ruleId];
  return describe ? describe(finding.evidence, finding.severity) : JSON.stringify(finding.evidence);
}

/**
 * Console-only reporting with one line per finding, plus a summary line
 * Prints nothing in a study session, the count included
 */
export function logFindings(
  label: string,
  nodeIds: ReadonlySet<string>,
  findings: readonly Finding[]
): void {
  if (isStudyActive(activeStudySession())) {
    return;
  }
  for (const finding of findings) {
    console.log(
      `[CADT] finding: ${finding.ruleId} node=${finding.nodeId} ${describeFinding(finding)}`
    );
  }
  console.log(`[CADT] ${label}: ${findings.length} finding(s) across ${nodeIds.size} node(s)`);
}
