import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { participantVisibility } from "../../../shared/study/participantVisibility";
import type { StudySession } from "../../../shared/study/studyTypes";
import { StudyStateContext } from "../../study/StudyStateContext";
import { ModuleLibrary } from "./ModuleLibrary";

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

const M01_VIDEO = "Web Accessibility Perspectives: Colors with Good Contrast";

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value: online });
  fireEvent(window, new Event(online ? "online" : "offline"));
}

beforeEach(() => setOnline(true));
afterEach(() => cleanup());

describe("Teach Me Why module library", () => {
  it("filters topics and opens a separate lesson screen", () => {
    const onSelectModule = vi.fn();
    const { rerender } = render(
      <ModuleLibrary selectedModuleId={null} onSelectModule={onSelectModule} />
    );
    expect(screen.getByRole("tablist", { name: "Topic categories" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search topics" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "aging eyes" } });
    expect(screen.getAllByRole("button", { name: /Explore topic/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Why Text Contrast Matters/ }));
    expect(onSelectModule).toHaveBeenCalledWith("M01");

    rerender(<ModuleLibrary selectedModuleId="M01" onSelectModule={onSelectModule} />);

    expect(screen.getByRole("heading", { name: "Why Text Contrast Matters" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Why Text Contrast Matters module" })
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Lesson" })).toHaveTextContent(
      "Contrast measures the difference in lightness"
    );
    expect(screen.queryByTitle(M01_VIDEO)).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Topic categories" })).not.toBeInTheDocument();
  });

  it("searches lesson details as well as topic titles", () => {
    render(<ModuleLibrary selectedModuleId={null} onSelectModule={() => {}} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "buttons" } });

    expect(
      screen.getByRole("button", { name: /Contrast for Interface Parts/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Placeholder and Decorative Text/ })
    ).toBeInTheDocument();
  });

  describe("the lesson is text only", () => {
    const study = {
      type: "STUDY_STATE" as const,
      session: SESSION,
      visibility: participantVisibility(SESSION),
      refusal: null
    };
    const open = (id: string, inSession: boolean) =>
      render(
        <StudyStateContext.Provider value={inSession ? study : null}>
          <ModuleLibrary selectedModuleId={id} onSelectModule={() => {}} />
        </StudyStateContext.Provider>
      );

    it.each([
      ["online, outside a study session", true, false],
      ["offline", false, false],
      ["during a study session", true, true]
    ])("shows no video and no article link %s", (_name, online, inSession) => {
      setOnline(online);
      for (const id of ["M01", "M02"]) {
        open(id, inSession);
        expect(screen.getByRole("region", { name: "Lesson" })).toBeInTheDocument();
        expect(screen.queryByTitle(M01_VIDEO)).not.toBeInTheDocument();
        expect(document.querySelector("iframe")).toBeNull();
        expect(screen.queryByRole("region", { name: "Video" })).not.toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Load video" })).not.toBeInTheDocument();
        expect(screen.queryByText(/unavailable/i)).not.toBeInTheDocument();
        cleanup();
      }
    });
  });

  it("filters topics by the category tabs", () => {
    render(<ModuleLibrary selectedModuleId={null} onSelectModule={() => {}} />);
    // The label is the category word, shown capitalized by the stylesheet, so the accessible name is the word itself
    fireEvent.click(screen.getByRole("tab", { name: /^cognitive$/i }));

    expect(screen.getAllByRole("button", { name: /Explore topic/ })).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: /Placeholder and Decorative Text/ })
    ).toBeInTheDocument();
  });
});
