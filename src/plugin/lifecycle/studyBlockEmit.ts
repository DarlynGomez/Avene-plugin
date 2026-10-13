import {
  buildBlockEnded,
  buildBlockStarted,
  buildIssueFirstDetected
} from "../../shared/study/studyEventBuilders";
import type { StudyEvent } from "../../shared/study/studyEvents";
import { STUDY_PROFILE_VERSION } from "../../shared/study/studyProfile";
import type { StudySession } from "../../shared/study/studyTypes";
import { loadRawIssues } from "../accountability/issueStore";
import { emitStudy } from "../study/adapter/studyEmitter";

/** The first events of a block, the issues already in the file become its starting issues */
export function emitBlockStarted(session: StudySession): void {
  const startingIssues = Object.values(loadRawIssues());
  emitStudy((ctx, seen) => {
    const events: StudyEvent[] = [buildBlockStarted(ctx, session.startedAt, STUDY_PROFILE_VERSION)];
    for (const issue of startingIssues) {
      const detected = buildIssueFirstDetected(
        ctx,
        session.startedAt,
        { id: issue.id, severity: issue.severityAtLastDetection },
        seen.detected,
        true
      );
      if (detected) events.push(detected);
    }
    return events;
  });
}

export function emitBlockEnded(session: StudySession): void {
  const rows = Object.values(loadRawIssues()).map((issue) => ({
    id: issue.id,
    state: issue.state,
    severity: issue.severityAtLastDetection
  }));
  const at = session.endedAt ?? new Date().toISOString();
  emitStudy((ctx) => buildBlockEnded(ctx, at, rows));
}
