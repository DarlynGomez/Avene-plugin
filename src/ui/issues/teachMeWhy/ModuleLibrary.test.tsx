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
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "aging" } });
    expect(screen.getAllByRole("button", { name: /Explore topic/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Why Text Contrast Matters/ }));
    expect(onSelectModule).toHaveBeenCalledWith("M01");

    rerender(<ModuleLibrary selectedModuleId="M01" onSelectModule={onSelectModule} />);

    expect(
      screen.getByRole("heading", { name: "Why Text Contrast Matters" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Why Text Contrast Matters module" })
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Lesson" })).toHaveTextContent(
      "Text contrast measures the difference in lightness"
    );
    expect(
      screen.getByTitle("Web Accessibility Perspectives: Colors with Good Contrast")
    ).toHaveAttribute("src", expect.stringContaining("youtube-nocookie.com/embed/a9kNUv6N8Rk"));
    expect(screen.queryByRole("tablist", { name: "Topic categories" })).not.toBeInTheDocument();
  });

  it("searches lesson details as well as topic titles", () => {
    render(<ModuleLibrary selectedModuleId={null} onSelectModule={() => {}} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "buttons" } });

    expect(screen.getByRole("button", { name: /Contrast for Interface Parts/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Text Size and Weight/ })).toBeInTheDocument();
  });

  it("enables optional article links online outside a study session", () => {
    render(<ModuleLibrary selectedModuleId="M02" onSelectModule={() => {}} />);

    expect(
      screen.getByRole("link", {
        name: "Challenges of Situational Impairments during Interaction with Mobile Devices"
      })
    ).toHaveAttribute("href", "https://www.jorgegoncalves.com/docs/ozchi17.pdf");
  });

  it("shows a local video placeholder offline with an option to retry, and disables article links", () => {
    setOnline(false);
    render(<ModuleLibrary selectedModuleId="M02" onSelectModule={() => {}} />);

    expect(screen.queryByTitle("Alternatives to Low-Contrast Text")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Can't confirm an internet connection");
    fireEvent.click(screen.getByRole("button", { name: "Load video" }));
    expect(screen.getByTitle("Alternatives to Low-Contrast Text")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Challenges of Situational Impairments/ })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/unavailable offline/)).toBeInTheDocument();
  });

  it("does not load embeds or external articles during an active study session", () => {
    const state = {
      type: "STUDY_STATE" as const,
      session: SESSION,
      visibility: participantVisibility(SESSION),
      refusal: null
    };
    render(
      <StudyStateContext.Provider value={state}>
        <ModuleLibrary selectedModuleId="M02" onSelectModule={() => {}} />
      </StudyStateContext.Provider>
    );

    expect(screen.queryByTitle("Alternatives to Low-Contrast Text")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("during a study session");
    expect(screen.queryByRole("button", { name: "Load video" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Challenges of Situational Impairments/ })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/during study sessions/)).toBeInTheDocument();
  });

  it("filters topics by the category tabs", () => {
    render(<ModuleLibrary selectedModuleId={null} onSelectModule={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: "Cognitive" }));

    expect(screen.getAllByRole("button", { name: /Explore topic/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Placeholder and Decorative Text/ })).toBeInTheDocument();
  });
});
