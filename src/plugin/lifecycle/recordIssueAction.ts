import type { IssueRecordMap } from "../accountability/issueStore";
import { emitIssueAction } from "../study/emitIssueAction";

/** The participant acted on one issue, the study log hears about it once the change has saved */
export function recordIssueAction(
  action: "defer" | "pin" | "ignore" | "reopen" | "locate",
  issueId: string,
  record: IssueRecordMap,
  reason?: string
): void {
  emitIssueAction({
    action,
    target: { kind: "issue", issueId },
    issueIds: [issueId],
    instanceCount: 1,
    resultingState: record[issueId]?.state ?? "open",
    reason: reason === undefined ? undefined : { text: reason, source: "ignore_sheet" }
  });
}
