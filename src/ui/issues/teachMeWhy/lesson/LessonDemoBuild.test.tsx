import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ModuleDetailScreen } from "../ModuleDetailScreen";
import { blockNames, FULL_LESSON, PLAIN_LESSON } from "./lessonFixture";

// These tests are about the demo build, so the study build switch is off here
vi.mock("../../../../shared/studyBuild", () => ({ STUDY_BUILD: false }));

afterEach(cleanup);

const show = (module = FULL_LESSON, onBackToIssue?: () => void) =>
  render(
    <ModuleDetailScreen module={module} onBack={() => undefined} onBackToIssue={onBackToIssue} />
  );

describe("the lesson page in the demo build", () => {
  it("keeps the order: header, objectives, clip, the text, read more, takeaways last", () => {
    const { container } = show();
    expect(blockNames(container)).toEqual([
      "header",
      "What you will learn",
      "Prefer to watch?",
      "Lesson",
      "Read more",
      "Key takeaways"
    ]);
  });

  it("opens the clip in the browser from a typed poster, and never puts a player in the page", () => {
    const { container } = show();
    const clip = within(screen.getByRole("region", { name: "Prefer to watch?" })).getByRole("link");
    const url = new URL(clip.getAttribute("href") as string);
    expect(url.hostname).toBe("www.youtube-nocookie.com");
    expect(clip).toHaveAttribute("rel", "noopener noreferrer");
    expect(clip).toHaveAttribute("target", "_blank");
    expect(clip).toHaveTextContent("opens in your browser");
    expect(clip).toHaveTextContent(`${FULL_LESSON.video?.publisher} · Video · Captions`);
    fireEvent.click(clip);
    expect(container.querySelector("iframe, img")).toBeNull();
  });

  it("links the article with no referrer, says it opens in the browser, and shows no minutes it does not have", () => {
    show();
    const link = within(screen.getByRole("region", { name: "Read more" })).getByRole("link");
    expect(link).toHaveAttribute("href", FULL_LESSON.optionalArticle?.url);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("opens in your browser");
    expect(link).toHaveTextContent(`${FULL_LESSON.optionalArticle?.author} · Article`);
    expect(link.textContent).not.toMatch(/\d+ min/);
    expect(screen.queryByText(/^Source:/)).toBeNull();
  });

  it("adds the reading time to the article only when the data has one", () => {
    const base = FULL_LESSON.optionalArticle;
    if (!base) throw new Error("the full lesson has an article");
    const article = { ...base, minutesToRead: 6 };
    show({ ...FULL_LESSON, optionalArticle: article });
    expect(screen.getByRole("link", { name: /Article · 6 min/ })).toBeInTheDocument();
  });

  it("shows the same reading minutes as the study build", () => {
    show();
    expect(
      screen.getByText(`Lesson · ${FULL_LESSON.timeBudgetMinutes.reading} min read`)
    ).toBeInTheDocument();
  });

  it("shows no clip and no article block for a lesson that has neither", () => {
    const { container } = show(PLAIN_LESSON);
    expect(screen.queryByRole("link")).toBeNull();
    expect(blockNames(container)).toEqual([
      "header",
      "What you will learn",
      "Lesson",
      "Key takeaways"
    ]);
  });

  it("offers Back to issue beside All topics when opened from an issue, and calls it", () => {
    const back = vi.fn();
    show(FULL_LESSON, back);
    fireEvent.click(screen.getByRole("button", { name: "Back to issue" }));
    expect(back).toHaveBeenCalledTimes(1);
  });
});
