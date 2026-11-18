import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { participantVisibility } from "../../shared/study/participantVisibility";
import type { StudySession } from "../../shared/study/studyTypes";
import { AltChecksProvider } from "../handoff/alt/AltChecksProvider";
import { SESSION, emit, issue, LAYERS, dataMessage } from "../handoff/alt/altHarness";
import { StudyStateContext } from "../study/StudyStateContext";
import { IssuePanel } from "./IssuePanel";

// Every flag on, so what keeps a part of the alt text checks out of the panel is the study
vi.mock("../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../shared/handoffFlags")>()),
  FEATURE_HANDOFF: true,
  FEATURE_ALT_ANNOTATIONS: true,
  FEATURE_ALT_SUGGEST_LIVE: true,
  FEATURE_ALT_IN_STUDY: true
}));

const POST_DESIGNING: StudySession = { ...SESSION, condition: "post-task" };
const POST_REVIEWING: StudySession = {
  ...POST_DESIGNING,
  phase: "reviewing",
  revealedAt: "t"
};
const ENDED: StudySession = { ...SESSION, phase: "ended", endedAt: "t" };

/** Only what the alt text checks send, never anything a handoff document or an annotation needs */
const ALT_ONLY = new Set([
  "HANDOFF_DATA_REQUEST",
  "HANDOFF_ALT_INVENTORY_REQUEST",
  "HANDOFF_ALT_CACHE_REQUEST"
]);

async function mount(session: StudySession): Promise<void> {
  const study = {
    type: "STUDY_STATE" as const,
    session,
    visibility: participantVisibility(session),
    refusal: null
  };
  render(
    <StudyStateContext.Provider value={study}>
      <AltChecksProvider>
        <IssuePanel aiAssistanceLevel={1} />
      </AltChecksProvider>
    </StudyStateContext.Provider>
  );
  await act(async () => {
    emit({ type: "ISSUES_UPDATED", issues: [issue()], decisions: {} });
    emit({ type: "HANDOFF_ALT_INVENTORY", layers: LAYERS });
    emit(dataMessage());
  });
}

let posted: { type: string }[];
beforeEach(() => {
  posted = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((message: unknown) => {
    posted.push((message as { pluginMessage: { type: string } }).pluginMessage);
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const handoffPosts = () => posted.filter((m) => m.type.startsWith("HANDOFF"));

describe.each([
  ["a live block while designing", SESSION],
  ["a post-task block after reveal", POST_REVIEWING]
])("in %s, the alt text checks show", (_name, session) => {
  it("with the count, Prepare suggestions and Suggest all, and no annotation control", async () => {
    await mount(session);
    screen.getByRole("button", { name: /Alt Text & Media Descriptions/ }).click();
    await act(async () => undefined);
    expect(screen.getByText("3 unanswered")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare suggestions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suggest all" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/annotation/i);
  });

  it("asks the plugin only for what the checks read, never a handoff document or an annotation", async () => {
    await mount(session);
    expect(handoffPosts().length).toBeGreaterThan(0);
    expect(handoffPosts().every((m) => ALT_ONLY.has(m.type))).toBe(true);
  });

  it("still has no Handoff tab", async () => {
    await mount(session);
    expect(screen.queryByRole("tab", { name: /Handoff/ })).toBeNull();
  });
});

describe.each([
  ["a post-task block while designing", POST_DESIGNING],
  ["a block that has ended", ENDED]
])("in %s, the alt text checks are not there at all", (_name, session) => {
  it("has no alt text view and asks nothing of the plugin or the local server", async () => {
    const fetchStub = vi.fn();
    vi.stubGlobal("fetch", fetchStub);
    await mount(session);
    expect(document.body.textContent).not.toMatch(/Alt text|Suggest|Prepare suggestions/i);
    expect(screen.queryByRole("button", { name: /Alt Text & Media Descriptions/ })).toBeNull();
    expect(handoffPosts()).toEqual([]);
    expect(fetchStub).not.toHaveBeenCalled();
  });
});
