import type { IssueMessage } from "../../shared/messageTypes";

/** Validates both the message type and the shape its fields must carry */
export function isIssueMessage(value: unknown): value is IssueMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const message = value as Record<string, unknown>;

  switch (message.type) {
    case "ISSUES_SUBSCRIBE":
      return true;
    case "ISSUE_DEFER":
    case "ISSUE_FLAG_IMPORTANT":
    case "ISSUE_REOPEN":
    case "ISSUE_FOCUS":
      return typeof message.issueId === "string";
    case "ISSUE_IGNORE":
      return typeof message.issueId === "string" && typeof message.reason === "string";
    default:
      return false;
  }
}
