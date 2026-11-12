/** The lessons a participant can open from a finding, on in this build and refused during a study session */
export const FEATURE_MODULES = true;

/** The compile time flag only ever narrows, a study session switches the lessons off, an ended block still counts */
export function modulesAllowed(flag: boolean, studyActive: boolean): boolean {
  return flag && !studyActive;
}
