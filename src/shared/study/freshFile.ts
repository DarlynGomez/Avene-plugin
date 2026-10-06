import type { Issue } from "../issues/issueTypes";

/** Plain facts about a file, gathered by the storage layer */
export interface FreshFileInputs {
  /** True when the session key holds anything, even something unreadable */
  hasSession: boolean;
  decisionCount: number;
  adjustLogCount: number;
  issues: readonly Pick<
    Issue,
    "state" | "encounterCount" | "ignoredReason" | "ignoredAt" | "changedSinceIgnore"
  >[];
}

export type FreshFileResult = { fresh: true } | { fresh: false; reason: string };

const SUFFIX = " Use a fresh copy of the task file.";

/** Still exactly as the detector created it, so nobody has responded to it */
function isDetectorCreated(issue: FreshFileInputs["issues"][number]): boolean {
  return (
    issue.state === "open" &&
    issue.encounterCount === 0 &&
    issue.ignoredReason === undefined &&
    issue.ignoredAt === undefined &&
    issue.changedSinceIgnore === undefined
  );
}

/** A file is fresh when it holds nothing a participant or researcher originated */
export function checkFreshFile(inputs: FreshFileInputs): FreshFileResult {
  if (inputs.hasSession) {
    return { fresh: false, reason: `This file already has a study session.${SUFFIX}` };
  }
  if (!inputs.issues.every(isDetectorCreated)) {
    return { fresh: false, reason: `This file already has recorded responses to issues.${SUFFIX}` };
  }
  if (inputs.decisionCount > 0) {
    return { fresh: false, reason: `This file already has recorded decisions.${SUFFIX}` };
  }
  if (inputs.adjustLogCount > 0) {
    return { fresh: false, reason: `This file already has Adjust log entries.${SUFFIX}` };
  }
  return { fresh: true };
}
