import { useCallback, useEffect, useState } from "react";

import type { RootDecision } from "../../../shared/grouping/groupingTypes";
import { isIssue } from "../../../shared/issues/issueSchema";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import type { IssuesPluginMessage, UiToPluginMessage } from "../../../shared/messageTypes";

function isIssueSummary(value: unknown): boolean {
  if (!isIssue(value)) {
    return false;
  }
  return typeof (value as unknown as Record<string, unknown>).nodeName === "string";
}

function isIssuesMessage(value: unknown): value is IssuesPluginMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const message = value as Record<string, unknown>;
  if (message.type === "ISSUES_UPDATED") {
    return (
      Array.isArray(message.issues) &&
      message.issues.every(isIssueSummary) &&
      typeof message.decisions === "object" &&
      message.decisions !== null
    );
  }
  if (message.type === "ROOT_ACTION_FAILED") {
    return Array.isArray(message.issueIds) && typeof message.message === "string";
  }
  return (
    message.type === "ISSUE_ACTION_FAILED" &&
    typeof message.issueId === "string" &&
    typeof message.message === "string"
  );
}

function sendMessage(message: UiToPluginMessage) {
  window.parent.postMessage({ pluginMessage: message }, "*");
}

export interface ActionError {
  issueIds: readonly string[];
  message: string;
}

/** Subscribes to issue and decision records and exposes every designer action */
export function useIssues() {
  const [issues, setIssues] = useState<readonly IssueSummary[]>([]);
  const [decisions, setDecisions] = useState<Readonly<Record<string, RootDecision>>>({});
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<ActionError | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (!isIssuesMessage(message)) {
        return;
      }
      if (message.type === "ISSUES_UPDATED") {
        setIssues(message.issues);
        setDecisions(message.decisions);
        setActionError(null);
        setLoading(false);
      } else if (message.type === "ISSUE_ACTION_FAILED") {
        setActionError({ issueIds: [message.issueId], message: message.message });
      } else if (message.type === "ROOT_ACTION_FAILED") {
        setActionError({ issueIds: message.issueIds, message: message.message });
      }
    }

    window.addEventListener("message", handleMessage);
    sendMessage({ type: "ISSUES_SUBSCRIBE" });
    // A silent sandbox must not leave the panel loading forever
    const timeout = window.setTimeout(() => setLoading(false), 3000);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const focusIssue = useCallback((issueId: string) => {
    sendMessage({ type: "ISSUE_FOCUS", issueId });
  }, []);

  const deferRoot = useCallback((issueIds: string[], signature?: string) => {
    sendMessage({ type: "ROOT_DEFER", issueIds, ...(signature && { signature }) });
  }, []);

  const markRootImportant = useCallback((issueIds: string[], signature?: string) => {
    sendMessage({ type: "ROOT_MARK_IMPORTANT", issueIds, ...(signature && { signature }) });
  }, []);

  const unmarkRootImportant = useCallback((issueIds: string[], signature?: string) => {
    sendMessage({ type: "ROOT_UNMARK_IMPORTANT", issueIds, ...(signature && { signature }) });
  }, []);

  const ignoreRoot = useCallback(
    (issueIds: string[], reason: string, signature: string, fromDecisionOffer: boolean) => {
      sendMessage({ type: "ROOT_IGNORE", issueIds, reason, signature, fromDecisionOffer });
    },
    []
  );

  const reopenRoot = useCallback(
    (issueIds: readonly string[], signature: string, clearDecision: boolean) => {
      sendMessage({ type: "ROOT_REOPEN", issueIds: [...issueIds], signature, clearDecision });
    },
    []
  );

  const restoreDeferredRoot = useCallback((issueIds: string[], signature?: string) => {
    sendMessage({ type: "ROOT_RESTORE_DEFERRED", issueIds, ...(signature && { signature }) });
  }, []);

  const showOnCanvas = useCallback((nodeIds: string[], signature?: string) => {
    sendMessage({ type: "SHOW_ON_CANVAS", nodeIds, ...(signature && { signature }) });
  }, []);

  const restoreSelection = useCallback(() => {
    sendMessage({ type: "RESTORE_SELECTION" });
  }, []);

  return {
    issues,
    decisions,
    loading,
    actionError,
    focusIssue,
    deferRoot,
    markRootImportant,
    unmarkRootImportant,
    ignoreRoot,
    reopenRoot,
    restoreDeferredRoot,
    showOnCanvas,
    restoreSelection
  };
}
