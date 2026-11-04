/** Calendar focus blocks are on for the demo build, set to false to ship without them */
export const FEATURE_CALENDAR = true;

/** The compile time flag only ever narrows, a study session switches the calendar off */
export function calendarAllowed(flag: boolean, studyActive: boolean): boolean {
  return flag && !studyActive;
}
