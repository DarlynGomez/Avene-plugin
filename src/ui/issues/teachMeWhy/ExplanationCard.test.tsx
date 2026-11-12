import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";

import type { ExplanationView } from "../../../shared/teachMeWhy/explanationView";
import { AI_LABEL, ExplanationCard } from "./ExplanationCard";

afterEach(cleanup);

function view(depth: 1 | 2 | 3, text: string, isAi = true): ExplanationView {
  return {
    key: { role: "body", severity: "medium", size: "normal", depth },
    entry: { text, status: isAi ? "approved" : "fallback", reviewer: "DG", factIds: [] },
    isAi,
    text,
    basedOn: [],
    measured: "2.00:1",
    required: "4.5:1"
  };
}

function renderCard(shown: ExplanationView) {
  return render(
    <ExplanationCard
      view={shown}
      hidden={false}
      onHide={() => undefined}
      onShowAgain={() => undefined}
      onDeepDive={() => undefined}
    />
  );
}

describe("ExplanationCard text blocks", () => {
  it("renders a Quick text as one paragraph and one list of three items, markers stripped", () => {
    const { container } = renderCard(view(1, "Move the colors.\n\n- One.\n- Two.\n- Three."));
    expect(container.querySelectorAll("p.text")).toHaveLength(1);
    const lists = container.querySelectorAll("ul");
    expect(lists).toHaveLength(1);
    const items = [...lists[0].querySelectorAll("li")].map((item) => item.textContent);
    expect(items).toEqual(["One.", "Two.", "Three."]);
  });

  it.each([2, 3] as const)("still renders depth %i as paragraphs only", (depth) => {
    const { container } = renderCard(view(depth, "First paragraph.\n\nSecond paragraph."));
    expect(container.querySelectorAll("p.text")).toHaveLength(2);
    expect(container.querySelector("ul")).toBeNull();
  });

  it("keeps a paragraph that merely mentions a dash as a paragraph", () => {
    const { container } = renderCard(view(2, "A dash - in the middle.\n\nNext."));
    expect(container.querySelector("ul")).toBeNull();
  });
});

describe("the AI label", () => {
  it("says the text was drafted with AI help and is not generated while Avene is used", () => {
    expect(AI_LABEL).toBe(
      "Drafted in advance with AI help and reviewed by the research team. This text is not generated while you use Avene."
    );
    expect(AI_LABEL).not.toMatch(/hand/i);
    // Live role suggestions do run in a study, so no participant text may say that no AI runs
    expect(AI_LABEL).not.toMatch(/no AI/i);
  });
  it("shows for an approved entry and not for a fallback", () => {
    const shown = renderCard(view(1, "Move.\n\n- One."));
    expect(shown.getByText(AI_LABEL)).toBeInTheDocument();
    cleanup();
    const fallback = renderCard(view(1, "Move.\n\n- One.", false));
    expect(fallback.queryByText(AI_LABEL)).not.toBeInTheDocument();
  });
});
