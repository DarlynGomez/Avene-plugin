import {
  STORAGE_KEY_ADJUST_LOG,
  STORAGE_KEY_DECISIONS,
  STORAGE_KEY_ISSUES,
  STORAGE_KEY_STUDY_SESSION
} from "../../storage/storageKeys";
import { clearStudyLog } from "./studyLogStore";

export interface StudyResetResult {
  cleared: string[];
  failed: { key: string; reason: string }[];
}

const KEYS = [
  STORAGE_KEY_STUDY_SESSION,
  STORAGE_KEY_ISSUES,
  STORAGE_KEY_DECISIONS,
  STORAGE_KEY_ADJUST_LOG
];

/**
 * Empties the session and every record a block leaves behind, for development testing only
 * Calibration is not touched, and each key is cleared on its own so one failure is still reported
 */
export function resetStudyData(): StudyResetResult {
  const result: StudyResetResult = { cleared: [], failed: [] };
  for (const key of KEYS) {
    try {
      figma.root.setPluginData(key, "");
      result.cleared.push(key);
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : String(error);
      console.error(`resetStudyData: could not clear ${key}`, error);
      result.failed.push({ key, reason });
    }
  }
  try {
    clearStudyLog();
    result.cleared.push("cadt.study.log.v1");
  } catch (error) {
    const reason = error instanceof Error && error.message ? error.message : String(error);
    console.error("resetStudyData: could not clear the study log", error);
    result.failed.push({ key: "cadt.study.log.v1", reason });
  }
  return result;
}
