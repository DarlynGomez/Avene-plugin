import { STUDY_BUILD } from "../shared/studyBuild";

declare const __CADT_BUILD__:
  { commit: string; dirty: boolean | null; builtAt: string; studyBuild: boolean } | undefined;

/** Set when the sandbox bundle is built, so a report can say exactly which build ran, and whether it was the study build */
export const BUILD_INFO =
  typeof __CADT_BUILD__ === "undefined"
    ? { commit: "unknown", dirty: null, builtAt: "unknown", studyBuild: STUDY_BUILD }
    : __CADT_BUILD__;
