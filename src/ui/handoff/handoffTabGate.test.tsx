import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { participantVisibility } from "../../shared/study/participantVisibility";
import type { StudySession } from "../../shared/study/studyTypes";
import { IssuePanel } from "../issues/IssuePanel";
import { StudyStateContext } from "../study/StudyStateContext";
import { emit } from "./fixtures";

vi.mock("../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../shared/handoffFlags")>()),
  FEATURE_HANDOFF: true
}));

afterEach(cleanup);

const SESSION: StudySession = {
  schemaVersion: 1,
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  consentConfirmedAt: "t",
  phase: "designing",
  startedAt: "t",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};

function panel(session: StudySession | null) {
  const state = session
    ? {
        type: "STUDY_STATE" as const,
        session,
        visibility: participantVisibility(session),
        refusal: null
      }
    : null;
  render(
    <StudyStateContext.Provider value={state}>
      <IssuePanel aiAssistanceLevel={3} />
    </StudyStateContext.Provider>
  );
  act(() => emit({ type: "ISSUES_UPDATED", issues: [], decisions: {} }));
}

describe("the Handoff tab", () => {
  it("is there when the build has handoff and no study session is running", () => {
    panel(null);
    expect(screen.getByRole("tab", { name: "Handoff" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Handoff" }));
    expect(screen.getByRole("tab", { name: "Handoff" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Live Watch/ })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it.each(["designing", "reviewing", "ended"] as const)(
    "is absent while a study session is in the %s phase",
    (phase) => {
      panel({ ...SESSION, phase });
      expect(screen.queryByRole("tab", { name: "Handoff" })).toBeNull();
    }
  );

  it("comes back after the researcher exits study mode", () => {
    panel({ ...SESSION, phase: "ended", exitedAt: "t" });
    expect(screen.getByRole("tab", { name: "Handoff" })).toBeInTheDocument();
  });
});
