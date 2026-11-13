declare const __STUDY_BUILD__: boolean | undefined;

/**
 * True in the study build, false in a demo build made with the env var STUDY_BUILD=0
 * Set when the bundles are built, and true whenever nothing set it, so a plain run is the study build
 */
export const STUDY_BUILD: boolean = typeof __STUDY_BUILD__ === "undefined" ? true : __STUDY_BUILD__;
