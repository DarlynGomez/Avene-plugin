import type { LearningModule, ModuleVideoData } from "./modules/moduleTypes";

/** 80 seconds as 1:20 */
export function clipTime(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** The privacy enhanced player page for the clip, opened in the browser and never embedded here */
export function videoUrl(video: ModuleVideoData): string {
  const url = new URL(
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.videoId)}`
  );
  url.searchParams.set("start", String(video.startSeconds));
  url.searchParams.set("end", String(video.endSeconds));
  url.searchParams.set("rel", "0");
  url.searchParams.set("cc_load_policy", "1");
  url.searchParams.set("playsinline", "1");
  return url.toString();
}

export type BodyPart =
  | { kind: "lead"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "callout"; text: string };

/** The lesson paragraphs in order: the first is the lead, the callout's paragraph sits in its card */
export function bodyParts(module: LearningModule): BodyPart[] {
  const calloutAt = module.callout?.paragraphIndex ?? -1;
  return module.lessonParagraphs.map((text, index) => {
    if (index === calloutAt) return { kind: "callout", text };
    return { kind: index === 0 ? "lead" : "paragraph", text };
  });
}

/** The reading time the eyebrow shows, the same in every build */
export const readingMinutes = (module: LearningModule): number => module.timeBudgetMinutes.reading;
