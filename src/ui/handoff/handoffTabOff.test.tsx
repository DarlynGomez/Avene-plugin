import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FEATURE_HANDOFF } from "../../shared/handoffFlags";
import { IssuePanel } from "../issues/IssuePanel";
import { emit } from "./fixtures";

// The demo commit turns the flag on, this file keeps proving what a build with it off does
vi.mock("../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../shared/handoffFlags")>()),
  FEATURE_HANDOFF: false
}));

afterEach(cleanup);

describe("the Handoff tab in a build with the committed flag", () => {
  it("is absent, and the panel shows no tab row of its own", () => {
    expect(FEATURE_HANDOFF).toBe(false);
    render(<IssuePanel aiAssistanceLevel={3} />);
    act(() => emit({ type: "ISSUES_UPDATED", issues: [], decisions: {} }));
    expect(screen.queryByRole("tab", { name: "Handoff" })).toBeNull();
  });
});
