import { LEARNING_MODULES } from "../src/shared/teachMeWhy/modules/modules";
import { STUDY_LIBRARY_MODULES } from "../src/shared/teachMeWhy/modules/studyLibrary";

/**
 * A lesson in the study library with an open review flag is a lesson nobody has signed off
 * Run this before the freeze, it is not part of the test suite
 */
interface Acknowledgement {
  moduleId: string;
  /** The day the research team accepted the open flag, as YYYY-MM-DD */
  date: string;
  /** One line on why it is accepted */
  reason: string;
}

/** Empty until a person decides, each entry needs a date and a one line reason */
const REVIEW_FLAGS_ACKNOWLEDGED: readonly Acknowledgement[] = [];

let blocked = 0;
for (const id of STUDY_LIBRARY_MODULES) {
  const lesson = LEARNING_MODULES.find((candidate) => candidate.id === id);
  if (!lesson) {
    console.error(`${id}: is in the study library and is not a lesson`);
    blocked += 1;
    continue;
  }
  if (lesson.reviewFlags.length === 0) continue;
  const accepted = REVIEW_FLAGS_ACKNOWLEDGED.find((entry) => entry.moduleId === id);
  const state = accepted ? `acknowledged ${accepted.date}: ${accepted.reason}` : "OPEN";
  console.log(`${id} ${lesson.title} [${state}]`);
  for (const flag of lesson.reviewFlags) console.log(`  ${flag}`);
  if (!accepted) blocked += 1;
}
console.log(blocked === 0 ? "no open review flags in the study library" : `${blocked} open`);
process.exit(blocked === 0 ? 0 : 1);
