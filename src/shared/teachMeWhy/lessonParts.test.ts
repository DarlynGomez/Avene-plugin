import { describe, expect, it } from "vitest";

import { bodyParts, clipTime, readingMinutes, videoUrl } from "./lessonParts";
import { LEARNING_MODULES } from "./modules/modules";
import { quizQuestionCount } from "./modules/quizCounts";

const lesson = (id: string) => {
  const found = LEARNING_MODULES.find((module) => module.id === id);
  if (!found) throw new Error(`${id} is not a lesson`);
  return found;
};

describe("the parts of a lesson page", () => {
  it("writes a clip length as minutes and two digit seconds", () => {
    expect(clipTime(80)).toBe("1:20");
    expect(clipTime(60)).toBe("1:00");
    expect(clipTime(9)).toBe("0:09");
  });

  it("points a clip at the privacy enhanced player with the times from the data and captions on", () => {
    const video = lesson("M06").video;
    if (!video) throw new Error("M06 has a video");
    const url = new URL(videoUrl(video));
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("www.youtube-nocookie.com");
    expect(url.pathname).toBe(`/embed/${video.videoId}`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      start: "0",
      end: "80",
      rel: "0",
      cc_load_policy: "1",
      playsinline: "1"
    });
  });

  it("makes the first paragraph the lead and puts the callout's paragraph where it was", () => {
    const m04 = lesson("M04");
    const parts = bodyParts(m04);
    expect(parts.map((part) => part.kind)).toEqual(
      m04.lessonParagraphs.map((_, i) => (i === 0 ? "lead" : i === 2 ? "callout" : "paragraph"))
    );
    expect(parts.map((part) => part.text)).toEqual(m04.lessonParagraphs);
    expect(bodyParts(lesson("M01")).filter((part) => part.kind === "callout")).toEqual([]);
  });

  it("shows the reading minutes, and counts three questions for every lesson's quiz", () => {
    for (const module of LEARNING_MODULES) {
      expect(readingMinutes(module)).toBe(module.timeBudgetMinutes.reading);
      expect(quizQuestionCount(module.id), module.id).toBe(3);
    }
    expect(quizQuestionCount("M99")).toBeNull();
  });
});
