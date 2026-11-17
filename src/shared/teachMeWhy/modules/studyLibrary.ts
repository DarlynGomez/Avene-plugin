/**
 * The lessons offered in the study build, M09, M11 and M12 are outside the text only detection and M10 is a contested topic
 * The topic list shows only these in the study build, a demo build shows every lesson
 */
export const STUDY_LIBRARY_MODULES: readonly string[] = [
  "M01",
  "M02",
  "M03",
  "M04",
  "M05",
  "M06",
  "M07",
  "M08"
];

/** The lessons a reader can open in this build, in their usual order */
export function libraryModules<T extends { id: string }>(
  modules: readonly T[],
  studyBuild: boolean
): T[] {
  return studyBuild
    ? modules.filter((module) => STUDY_LIBRARY_MODULES.includes(module.id))
    : [...modules];
}
