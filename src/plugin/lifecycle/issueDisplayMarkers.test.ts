import { afterEach, describe, expect, it, vi } from "vitest";

const markersOnIssues = vi.fn();
vi.mock("./markerRuntime", () => ({
  markersOnIssues: (...args: unknown[]) => markersOnIssues(...args)
}));
vi.mock("../accountability/decisionStore", () => ({ loadDecisions: () => ({}) }));

afterEach(() => markersOnIssues.mockClear());

describe("buildIssuesUpdatedMessage", () => {
  it("hands the list it builds to the markers, so every list that reaches the panel moves them", async () => {
    const { buildIssuesUpdatedMessage } = await import("./issueDisplay");
    const message = await buildIssuesUpdatedMessage({});

    expect(message).toEqual({ type: "ISSUES_UPDATED", issues: [], decisions: {} });
    expect(markersOnIssues).toHaveBeenCalledTimes(1);
    expect(markersOnIssues).toHaveBeenCalledWith([]);
  });
});
