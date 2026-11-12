import type { LearningModule } from "../moduleTypes";
import { parseCurriculum, type ParsedModule } from "./parseModules";
import { parseQuizzes } from "./parseQuizzes";

/** Used for a module the repo does not hold yet, the document names no category */
export const DEFAULT_CATEGORY: LearningModule["category"] = "visual";

export interface BuildResult {
  /** Path inside the modules folder to the text of the file, empty when there are problems */
  files: Record<string, string>;
  problems: string[];
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

function moduleFile(parsed: ParsedModule, kept: Record<string, unknown> | undefined): unknown {
  const { forDevelopers, internalNote, ...rest } = parsed;
  return {
    id: rest.id,
    title: rest.title,
    category: kept?.category ?? DEFAULT_CATEGORY,
    context: rest.context,
    estimatedMinutes: rest.estimatedMinutes,
    timeBudgetMinutes: rest.timeBudgetMinutes,
    whyItMatters: rest.whyItMatters,
    learningObjectives: rest.learningObjectives,
    lessonParagraphs: rest.lessonParagraphs,
    video: rest.video,
    optionalArticle: rest.optionalArticle,
    keyTakeaways: rest.keyTakeaways,
    reviewFlags: rest.reviewFlags,
    ...(internalNote === undefined ? {} : { internalNote }),
    forDevelopers
  };
}

/**
 * Every file the curriculum document decides: a lesson and a quiz per module, and the manifest
 * Fields the document does not speak of, such as the category, are carried over from the files already in the repo
 */
export function buildCurriculumFiles(
  text: string,
  existing: Record<string, Record<string, unknown>>
): BuildResult {
  const lessons = parseCurriculum(text);
  const quizzes = parseQuizzes(text);
  const problems = [...lessons.problems, ...quizzes.problems];
  const total = lessons.modules.reduce((sum, module) => sum + module.estimatedMinutes, 0);
  if (lessons.statedTotalMinutes !== 41.5)
    problems.push("the introduction does not state 41.5 minutes");
  if (total !== 41.5) problems.push(`the module minutes add up to ${total}, not 41.5`);
  for (const module of lessons.modules) {
    const { reading, video, quiz } = module.timeBudgetMinutes;
    if (reading + video + quiz !== module.estimatedMinutes) {
      problems.push(`${module.id}: the time budget parts do not add up to the total`);
    }
    if (!quizzes.files.some((file) => file.moduleId === module.id)) {
      problems.push(`${module.id}: no quiz`);
    }
  }
  if (lessons.modules.length !== 12)
    problems.push(`${lessons.modules.length} modules, expected 12`);
  if (problems.length > 0) return { files: {}, problems };

  const files: Record<string, string> = {};
  for (const module of lessons.modules) {
    files[`${module.id}.json`] = json(moduleFile(module, existing[module.id]));
  }
  for (const quiz of quizzes.files) files[`quizzes/${quiz.moduleId}.json`] = json(quiz);
  files["index.json"] = json({
    schemaVersion: 1,
    reportedTotalMinutes: 41.5,
    modules: lessons.modules.map((module) => ({
      id: module.id,
      file: `${module.id}.json`,
      quizFile: `quizzes/${module.id}.json`
    }))
  });
  return { files, problems };
}
