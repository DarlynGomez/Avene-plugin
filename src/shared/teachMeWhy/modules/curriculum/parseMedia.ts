import type { ModuleVideoData, OptionalArticleData } from "../moduleTypes";

const clock = /^(\d+):(\d{2})$/;

/** 1:12 as 72, null when the text is not a clip time */
function seconds(text: string): number | null {
  const parts = clock.exec(text.trim());
  return parts ? Number(parts[1]) * 60 + Number(parts[2]) : null;
}

function yesNoUnknown(text: string): boolean | null {
  if (/^yes$/i.test(text.trim())) return true;
  if (/^no$/i.test(text.trim())) return false;
  return null;
}

const VIDEO =
  /^"(.+)" by (.+?)\. URL: (\S+?)\. Timestamps: (\S+) to (\S+?)\. Clip length: (\S+?)\. Captions available: (\w+)\. Transcript available: (\w+)\. Embedding allowed: (\w+)\. License or terms: (.+?)\. Why chosen:/;

/** The Video line of a module, null for "None included", a problem string when it cannot be read */
export function parseVideo(text: string): ModuleVideoData | null | string {
  if (/^None included\.?$/i.test(text.trim())) return null;
  const found = VIDEO.exec(text);
  if (!found) return `the Video line could not be read: ${text.slice(0, 60)}`;
  const [, title, publisher, url, start, end, length, captions, transcript, embed, license] = found;
  const id = /[?&]v=([\w-]+)/.exec(url)?.[1];
  const parsed = [seconds(start), seconds(end), seconds(length)];
  if (!id || parsed.includes(null))
    return `the Video line has a bad URL or time: ${text.slice(0, 60)}`;
  return {
    provider: "youtube",
    videoId: id,
    title,
    publisher,
    startSeconds: parsed[0] as number,
    endSeconds: parsed[1] as number,
    durationSeconds: parsed[2] as number,
    captionsAvailable: yesNoUnknown(captions) === true,
    transcriptAvailable: yesNoUnknown(transcript),
    embeddingAllowed: yesNoUnknown(embed) === true,
    license
  };
}

const ARTICLE = /^"(.+)" by (.+?)\. URL: (\S+?)\. Minutes to read: (\d+)\./;

/** The Optional article line, null for "None", a problem string when it cannot be read */
export function parseArticle(text: string): OptionalArticleData | null | string {
  if (/^None\.?$/i.test(text.trim())) return null;
  const found = ARTICLE.exec(text);
  if (!found) return `the Optional article line could not be read: ${text.slice(0, 60)}`;
  return { title: found[1], author: found[2], url: found[3], minutesToRead: Number(found[4]) };
}
