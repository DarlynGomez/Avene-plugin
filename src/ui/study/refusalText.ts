import type { StudyRefusal } from "../../shared/study/studyMessageTypes";

/** Plain words for the researcher, the reasons are already written to be read */
export function refusalText(refusal: StudyRefusal): string {
  if (refusal.code === "save-failed") {
    return `The change could not be saved, so nothing was changed. ${refusal.reason}`;
  }
  return refusal.reason;
}
