/** Handoff documents are off in every committed build, the demo branch turns it on locally */
export const FEATURE_HANDOFF = false;

/** The compile time flag only ever narrows, a study session switches handoff off */
export function handoffAllowed(flag: boolean, studyActive: boolean): boolean {
  return flag && !studyActive;
}
