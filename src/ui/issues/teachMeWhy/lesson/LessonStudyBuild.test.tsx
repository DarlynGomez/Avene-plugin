import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";

import { ModuleDetailScreen } from "../ModuleDetailScreen";
import { blockNames, FULL_LESSON, PLAIN_LESSON } from "./lessonFixture";

afterEach(cleanup);

const show = (module = FULL_LESSON) =>
  render(<ModuleDetailScreen module={module} onBack={() => undefined} />);

describe("the lesson page in the study build, which is what a plain run is", () => {
  it("keeps the order: header, objectives, the text with its callout, the source line, takeaways last", () => {
    const { container } = show();
    expect(blockNames(container)).toEqual([
      "header",
      "What you will learn",
      "Lesson",
      "Source:",
      "Key takeaways"
    ]);
  });

  it("has no clip, no link, no frame and nothing that could fetch from the network", () => {
    const { container } = show();
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector("iframe, img, video, audio, object, embed")).toBeNull();
    expect(container.querySelector("[src], [href], [srcset], [poster]")).toBeNull();
    expect(screen.queryByText("Prefer to watch?")).toBeNull();
    expect(screen.queryByText("Read more")).toBeNull();
  });

  it("names the article as plain text only", () => {
    show();
    const article = FULL_LESSON.optionalArticle;
    expect(screen.getByText(`Source: ${article?.title}, ${article?.author}`).tagName).toBe("P");
  });

  it("shows the title once as the h1, the subtitle, no context line, and the reading minutes", () => {
    show();
    expect(screen.getAllByText(FULL_LESSON.title)).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(FULL_LESSON.title);
    expect(screen.getByText(FULL_LESSON.subtitle as string)).toBeInTheDocument();
    expect(screen.queryByText(FULL_LESSON.context)).toBeNull();
    expect(
      screen.getByText(`Lesson · ${FULL_LESSON.timeBudgetMinutes.reading} min read`)
    ).toBeInTheDocument();
  });

  it("puts every section heading at h2, under the one h1", () => {
    show();
    const levels = screen.getAllByRole("heading").map((h) => Number(h.tagName.slice(1)));
    expect(levels[0]).toBe(1);
    expect(levels.slice(1).every((level) => level === 2)).toBe(true);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "What you will learn",
      "The size rule",
      "Key takeaways"
    ]);
  });

  it("lists the objectives in order, and the takeaways with the quiz count and the Start button", () => {
    show();
    const learn = screen.getByRole("region", { name: "What you will learn" });
    expect(within(learn).getByRole("list").tagName).toBe("OL");
    expect(within(learn).getAllByRole("listitem")).toHaveLength(
      FULL_LESSON.learningObjectives.length
    );
    const takeaways = screen.getByRole("region", { name: "Key takeaways" });
    expect(within(takeaways).getAllByRole("listitem")).toHaveLength(
      FULL_LESSON.keyTakeaways.length
    );
    expect(within(takeaways).getByText("Check your understanding")).toBeInTheDocument();
    expect(within(takeaways).getByText("3 questions")).toBeInTheDocument();
    expect(within(takeaways).getByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("shows the callout paragraph inside its card, once, with a real table", () => {
    show();
    const callout = screen.getByRole("region", { name: "The size rule" });
    const paragraph = FULL_LESSON.lessonParagraphs[2];
    expect(within(callout).getByText(paragraph)).toBeInTheDocument();
    expect(screen.getAllByText(paragraph)).toHaveLength(1);
    const table = within(callout).getByRole("table", { name: "Which text counts as large" });
    const heads = within(table).getAllByRole("columnheader");
    expect(heads.map((h) => h.textContent)).toEqual(["Sample", "Size and weight", "Needs"]);
    for (const head of heads) expect(head).toHaveAttribute("scope", "col");
    const samples = table.querySelectorAll("tbody tr td:first-child span");
    expect(samples).toHaveLength(4);
    for (const sample of samples) expect(sample).toHaveAttribute("aria-hidden", "true");
  });

  it("leaves the source line out for a lesson with no article", () => {
    const { container } = show(PLAIN_LESSON);
    expect(screen.queryByText(/^Source:/)).toBeNull();
    expect(blockNames(container)).toEqual([
      "header",
      "What you will learn",
      "Lesson",
      "Key takeaways"
    ]);
  });

  it("has All topics, and no Back to issue when not opened from an issue", () => {
    show();
    expect(screen.getByRole("button", { name: "All topics" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to issue" })).toBeNull();
  });
});
