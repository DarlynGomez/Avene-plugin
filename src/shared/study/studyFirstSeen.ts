import type { StudyEvent } from "./studyEvents";

export interface FirstSeen {
  detected: ReadonlySet<string>;
  responded: ReadonlySet<string>;
}

/** Which issues already have a first detection or first response in a log, for the builders to check */
export function firstSeenFromEvents(events: readonly StudyEvent[]): FirstSeen {
  const detected = new Set<string>();
  const responded = new Set<string>();
  for (const event of events) {
    if (event.type === "issue_first_detected") detected.add(event.issueId);
    if (event.type === "issue_first_response") responded.add(event.issueId);
  }
  return { detected, responded };
}
