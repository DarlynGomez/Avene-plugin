import { parseIssueId } from "../../shared/issues/issueId";
import { isPersistedIssueFields, type PersistedIssueFields } from "../../shared/issues/issueSchema";
import type { Issue } from "../../shared/issues/issueTypes";
import { STORAGE_KEY_ISSUES } from "../storage/storageKeys";

export type IssueRecordMap = Record<string, Issue>;
type PersistedMap = Record<string, PersistedIssueFields>;

function parsePersistedMap(raw: string): PersistedMap {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const validEntries = Object.entries(parsed as Record<string, unknown>).filter(([, value]) =>
      isPersistedIssueFields(value)
    );
    return Object.fromEntries(validEntries) as PersistedMap;
  } catch (error) {
    console.error("loadIssues: stored record was not valid JSON", error);
    return {};
  }
}

/** Rule id and node id live in the map key so rebuild the issue from both */
function toIssue(id: string, fields: PersistedIssueFields): Issue | null {
  const parsed = parseIssueId(id);
  return parsed ? { id, ruleId: parsed.ruleId, nodeId: parsed.nodeId, ...fields } : null;
}

/** Inverse of toIssue, stores only what cannot be derived from the key */
function toPersistedFields(issue: Issue): PersistedIssueFields {
  return {
    state: issue.state,
    severityAtLastDetection: issue.severityAtLastDetection,
    encounterCount: issue.encounterCount,
    lastDetectedAt: issue.lastDetectedAt,
    ignoredReason: issue.ignoredReason,
    ignoredAt: issue.ignoredAt,
    deferredAt: issue.deferredAt,
    severityAtIgnore: issue.severityAtIgnore,
    changedSinceIgnore: issue.changedSinceIgnore
  };
}

/**
 * Loads the record without checking that nodes exist
 * Never prune here, a node just deleted must be marked resolved by the scan and not dropped
 */
export function loadRawIssues(): IssueRecordMap {
  const persisted = parsePersistedMap(figma.root.getPluginData(STORAGE_KEY_ISSUES));
  const entries = Object.entries(persisted)
    .map(([id, fields]): readonly [string, Issue] | null => {
      const issue = toIssue(id, fields);
      return issue ? [id, issue] : null;
    })
    .filter((entry): entry is readonly [string, Issue] => entry !== null);
  return Object.fromEntries(entries);
}

/**
 * Loads the record and drops entries whose node is gone
 * A node deleted while closed is never scanned again, and plugin data has a size limit
 */
export async function loadIssues(): Promise<IssueRecordMap> {
  const record = loadRawIssues();

  const survivors = await Promise.all(
    Object.entries(record).map(async ([id, issue]): Promise<readonly [string, Issue] | null> => {
      const node = await figma.getNodeByIdAsync(issue.nodeId);
      return node ? [id, issue] : null;
    })
  );

  return Object.fromEntries(
    survivors.filter((entry): entry is readonly [string, Issue] => entry !== null)
  );
}

export interface IssueSaveResult {
  saved: boolean;
  error?: string;
}

/** Replaces the whole map on every write */
export function saveIssues(record: IssueRecordMap): IssueSaveResult {
  const persisted: PersistedMap = {};
  for (const [id, issue] of Object.entries(record)) {
    persisted[id] = toPersistedFields(issue);
  }

  try {
    figma.root.setPluginData(STORAGE_KEY_ISSUES, JSON.stringify(persisted));
    return { saved: true };
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : String(error);
    console.error("saveIssues: figma.root.setPluginData failed", error);
    return { saved: false, error: message };
  }
}
