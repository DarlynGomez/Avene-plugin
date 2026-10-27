/** Handoff documents are off in every build but the demo branch, which turns it on in one commit */
export const FEATURE_HANDOFF = true;

/** The compile time flag only ever narrows, a study session switches handoff off */
export function handoffAllowed(flag: boolean, studyActive: boolean): boolean {
  return flag && !studyActive;
}
