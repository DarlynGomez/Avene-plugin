import type { LessonCallout, ModuleVideoData, OptionalArticleData } from "../moduleTypes";
import { validateCallout } from "./validateCallout";
import type { ParsedModule } from "./parseModules";

/**
 * What the research team adds over the curriculum document, kept in a committed file beside it
 * A video given as null removes the document's video, an object changes only the fields it names
 */
export interface LessonExtra {
  subtitle?: string;
  optionalArticle?: OptionalArticleData | null;
  video?: Partial<ModuleVideoData> | null;
  timeBudgetMinutes?: Partial<ParsedModule["timeBudgetMinutes"]>;
  callout?: LessonCallout;
}

export type LessonExtras = Record<string, LessonExtra>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function articleProblems(id: string, article: unknown): string[] {
  if (article === null) return [];
  if (!isObject(article)) return [`${id}: the article is not an object`];
  const problems: string[] = [];
  for (const key of ["title", "author", "url"]) {
    if (typeof article[key] !== "string" || article[key] === "")
      problems.push(`${id}: the article ${key} is missing`);
  }
  const minutes = article.minutesToRead;
  if (minutes !== null && !(typeof minutes === "number" && minutes > 0))
    problems.push(`${id}: the article minutes are not a positive number or null`);
  return problems;
}

/** Every problem with the extras of one lesson, checked against the lesson they change */
export function extraProblems(id: string, extra: unknown, module: ParsedModule): string[] {
  if (!isObject(extra)) return [`${id}: the extras are not an object`];
  const problems: string[] = [];
  if ("subtitle" in extra && (typeof extra.subtitle !== "string" || extra.subtitle.trim() === ""))
    problems.push(`${id}: the subtitle is not plain text`);
  if ("optionalArticle" in extra) problems.push(...articleProblems(id, extra.optionalArticle));
  if ("video" in extra && extra.video !== null && !isObject(extra.video))
    problems.push(`${id}: the video change is not an object or null`);
  if (isObject(extra.video) && !module.video)
    problems.push(`${id}: the video change has no video to change`);
  if ("callout" in extra)
    problems.push(
      ...validateCallout(extra.callout, module.lessonParagraphs.length).map((p) => `${id}: ${p}`)
    );
  return problems;
}

/** The lesson with its extras laid over it, the total minutes follow the parts */
export function applyExtra(module: ParsedModule, extra: LessonExtra | undefined): ParsedModule {
  if (!extra) return module;
  const timeBudgetMinutes = { ...module.timeBudgetMinutes, ...extra.timeBudgetMinutes };
  const { reading, video, quiz } = timeBudgetMinutes;
  const changedVideo =
    extra.video === undefined
      ? module.video
      : extra.video === null || !module.video
        ? null
        : { ...module.video, ...extra.video };
  return {
    ...module,
    ...(extra.subtitle === undefined ? {} : { subtitle: extra.subtitle }),
    ...(extra.callout === undefined ? {} : { callout: extra.callout }),
    optionalArticle:
      extra.optionalArticle === undefined ? module.optionalArticle : extra.optionalArticle,
    video: changedVideo,
    timeBudgetMinutes,
    estimatedMinutes: reading + video + quiz
  };
}
