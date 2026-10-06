import type { FreshFileInputs } from "../../../shared/study/freshFile";
import { loadDecisions } from "../../accountability/decisionStore";
import { loadRawIssues } from "../../accountability/issueStore";
import { loadAdjustLog } from "../../adjust/adapter/adjustLogging";
import { readRawStudySession } from "./studySessionStore";

/** Reads the four stores the fresh file check needs, nothing is written */
export function gatherFreshFileInputs(): FreshFileInputs {
  return {
    hasSession: readRawStudySession() !== "",
    decisionCount: Object.keys(loadDecisions()).length,
    adjustLogCount: loadAdjustLog().length,
    issues: Object.values(loadRawIssues())
  };
}
