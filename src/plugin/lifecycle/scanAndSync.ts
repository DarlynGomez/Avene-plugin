import { reconcileScanResults } from "../accountability/reconcileFindings";
import { runDetection } from "../detection/engine";
import { loadRawIssues, saveIssues, type IssueRecordMap } from "../accountability/issueStore";
import { buildIssueFirstDetected } from "../../shared/study/studyEventBuilders";
import type { StudyEvent } from "../../shared/study/studyEvents";
import { emitStudy } from "../study/adapter/studyEmitter";
import { buildIssuesUpdatedMessage } from "./issueDisplay";
import { logFindings } from "./logFindings";
import { resolveTextNodeSnapshot } from "./resolveSnapshot";

/** Once per issue per block, including during post-task designing, nothing outside a session */
function recordFirstDetections(record: IssueRecordMap, nodeIds: ReadonlySet<string>): void {
  const scanned = Object.values(record).filter((issue) => nodeIds.has(issue.nodeId));
  const at = new Date().toISOString();
  emitStudy((ctx, seen) =>
    scanned.flatMap((issue): StudyEvent[] => {
      const event = buildIssueFirstDetected(
        ctx,
        at,
        { id: issue.id, severity: issue.severityAtLastDetection },
        seen.detected
      );
      return event ? [event] : [];
    })
  );
}

/**
 * Detects, reconciles into the record, saves and pushes the list to the UI
 * All detection output reaches the store here
 */
export async function scanAndSync(nodeIds: ReadonlySet<string>, label: string): Promise<void> {
  const findings = await runDetection(nodeIds, resolveTextNodeSnapshot);
  logFindings(label, nodeIds, findings);

  if (nodeIds.size === 0) {
    return;
  }

  const record = loadRawIssues();
  const updated = reconcileScanResults(record, nodeIds, findings, new Date().toISOString());

  const saveResult = saveIssues(updated);
  if (!saveResult.saved) {
    console.error(`${label}: failed to persist the issue record`, saveResult.error);
    return;
  }

  recordFirstDetections(updated, nodeIds);
  figma.ui.postMessage(await buildIssuesUpdatedMessage(updated));
}
