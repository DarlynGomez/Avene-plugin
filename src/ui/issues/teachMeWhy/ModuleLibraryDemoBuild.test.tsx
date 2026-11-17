import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ModuleLibrary } from "./ModuleLibrary";

// These tests are about the demo build, so the study build switch is off here
vi.mock("../../../shared/studyBuild", () => ({ STUDY_BUILD: false }));

afterEach(cleanup);

describe("the topic list in the demo build", () => {
  it("offers all twelve lessons", () => {
    render(<ModuleLibrary selectedModuleId={null} onSelectModule={() => {}} />);
    expect(screen.getByText("12 of 12 topics")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Contrast for Interface Parts/ })
    ).toBeInTheDocument();
  });

  it("finds a lesson by its video title, since the clip is shown here", () => {
    render(<ModuleLibrary selectedModuleId={null} onSelectModule={() => {}} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Web Accessibility Perspectives" }
    });
    expect(screen.getByRole("button", { name: /Why Text Contrast Matters/ })).toBeInTheDocument();
  });
});
