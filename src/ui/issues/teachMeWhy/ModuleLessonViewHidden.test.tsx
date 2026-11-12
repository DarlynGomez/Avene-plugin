import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";

import type { LearningModule } from "../../../shared/teachMeWhy/modules/moduleTypes";
import { ModuleLessonView } from "./ModuleLessonView";

afterEach(cleanup);

const SENTINEL = "SENTINEL-HIDDEN-TEXT";

describe("the lesson view", () => {
  it("does not show the internal note, the review flags, the developer note or a tested learning point", () => {
    const lesson = {
      id: "M99",
      title: "A lesson",
      category: "visual",
      context: "Context line",
      estimatedMinutes: 3,
      timeBudgetMinutes: { reading: 2, video: 0, quiz: 1 },
      whyItMatters: "Why it matters",
      learningObjectives: ["Objective one"],
      lessonParagraphs: ["A paragraph"],
      video: null,
      optionalArticle: null,
      keyTakeaways: ["Takeaway one"],
      reviewFlags: [`${SENTINEL} flag`],
      internalNote: `${SENTINEL} note`,
      forDevelopers: `${SENTINEL} developers`,
      testedLearningPoint: `${SENTINEL} tested`
    } as LearningModule;
    const { container } = render(<ModuleLessonView module={lesson} />);
    expect(container.textContent).toContain("A paragraph");
    expect(container.textContent).not.toContain(SENTINEL);
  });
});
