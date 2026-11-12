import module01 from "./M01.json";
import module02 from "./M02.json";
import module03 from "./M03.json";
import module04 from "./M04.json";
import module05 from "./M05.json";
import module06 from "./M06.json";
import module07 from "./M07.json";
import module08 from "./M08.json";
import module09 from "./M09.json";
import module10 from "./M10.json";
import module11 from "./M11.json";
import module12 from "./M12.json";
import type { LearningModule, ModuleVideoData } from "./moduleTypes";

const CATEGORIES = ["visual", "motor", "cognitive", "system"] as const;

/** What a lesson file holds before its category and video provider are checked, JSON cannot say a string is one of a few */
type RawModule = Omit<LearningModule, "category" | "video"> & {
  category: string;
  video: (Omit<ModuleVideoData, "provider"> & { provider: string }) | null;
};

/** Checks the two words a lesson file can get wrong, so a bad file stops here and not on a screen */
function toModule(raw: RawModule): LearningModule {
  const category = CATEGORIES.find((name) => name === raw.category);
  if (!category) throw new Error(`Lesson ${raw.id} has an unknown category: ${raw.category}`);
  if (raw.video && raw.video.provider !== "youtube") {
    throw new Error(`Lesson ${raw.id} has an unknown video provider: ${raw.video.provider}`);
  }
  return { ...raw, category, video: raw.video as ModuleVideoData | null };
}

export const LEARNING_MODULES: LearningModule[] = [
  toModule(module01),
  toModule(module02),
  toModule(module03),
  toModule(module04),
  toModule(module05),
  toModule(module06),
  toModule(module07),
  toModule(module08),
  toModule(module09),
  toModule(module10),
  toModule(module11),
  toModule(module12)
];
