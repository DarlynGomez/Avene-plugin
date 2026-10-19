import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IssueSummary } from "../../shared/issues/issueTypes";
import type { RoleStateView } from "../../shared/roles/roleMessages";
import type { RoleServerRequest } from "../../shared/roles/roleRequest";
import { participantVisibility } from "../../shared/study/participantVisibility";
import type { StudySession } from "../../shared/study/studyTypes";
import { IssuePanel } from "../issues/IssuePanel";
import { StudyHost } from "../study/StudyHost";
import { roleServerSession } from "./roleSession";

// The explanation differs by role, so a confirmed role is visible in the words as well as the key
vi.mock("../../shared/teachMeWhy/explanationTableData", () => {
  const entry = (text: string) => ({ text, status: "approved", reviewer: "DG", factIds: [] });
  const fallback = (text: string) => ({ text, status: "fallback", reviewer: null, factIds: [] });
  return {
    EXPLANATION_TABLE: {
      fallbacks: {
        "1": fallback("Fallback one."),
        "2": fallback("Fallback two."),
        "3": fallback("Fallback three.")
      },
      entries: {
        "unknown:high:normal:2": entry("Words for text of unknown kind."),
        "caption:high:normal:2": entry("Words for a caption."),
        "button text:high:normal:2": entry("Words for button text.")
      }
    }
  };
});

const LIVE: StudySession = {
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
const POST_DESIGNING: StudySession = { ...LIVE, condition: "post-task" };
const POST_REVIEWING: StudySession = { ...POST_DESIGNING, phase: "reviewing", revealedAt: "t" };

function issue(): IssueSummary {
  return {
    id: "contrast:1:1",
    ruleId: "contrast",
    nodeId: "1:1",
    nodeName: "Subtitle",
    screenId: "s",
    screenName: "S",
    state: "open",
    severityAtLastDetection: "high",
    encounterCount: 0,
    lastDetectedAt: "2026-09-08T00:00:00.000Z",
    evidence: {
      measuredRatio: 2.21,
      requiredRatio: 4.5,
      foregroundHex: "#B6ADA5",
      backgroundHex: "#FFFFFF",
      foregroundBinding: null
    }
  };
}

const request: RoleServerRequest = {
  requestId: "r1",
  image: "aGk=",
  crop: "node",
  exportScale: 1,
  fontSizePx: 14,
  inputs: { sizeRatio: 1, fontWeight: 400, wordCount: 3, centerYFraction: 0.5 },
  backgroundHex: "#FFFFFF",
  mode: "live"
};

let posted: { type?: string; [key: string]: unknown }[];
let sandbox: RoleStateView;
let fetchMock: ReturnType<typeof vi.fn>;

function emit(message: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
  });
}

/** Stands in for the sandbox: answers every role query with the state it holds, and keeps answers */
beforeEach(() => {
  posted = [];
  roleServerSession.reset();
  sandbox = {
    nodeId: "1:1",
    allowed: true,
    rule: null,
    suggestion: null,
    answer: null,
    request: null
  };
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(window.parent, "postMessage").mockImplementation((data: unknown) => {
    const message = (data as { pluginMessage?: { type?: string; [key: string]: unknown } })
      .pluginMessage;
    if (!message) return;
    posted.push(message);
    if (message.type === "ROLE_QUERY")
      queueMicrotask(() => emit({ type: "ROLE_STATE", state: sandbox }));
    if (message.type === "ROLE_ANSWER") {
      sandbox = {
        ...sandbox,
        answer: { role: message.role as never, response: message.response as never },
        request: null
      };
      queueMicrotask(() => emit({ type: "ROLE_STATE", state: sandbox }));
    }
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function openTab(session: StudySession | null = LIVE) {
  render(
    <StudyHost>
      <IssuePanel aiAssistanceLevel={3} />
    </StudyHost>
  );
  emit({ type: "STUDY_STATE", session, visibility: participantVisibility(session), refusal: null });
  emit({ type: "ISSUES_UPDATED", issues: [issue()], decisions: {} });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Why this surfaced" }));
  await user.click(screen.getByRole("button", { name: "Why this matters" }));
  return user;
}
const types = () => posted.map((m) => m.type);

describe("the server is unreachable", () => {
  it("is unsure with no error shown to the participant, and the panel carries on", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    sandbox = { ...sandbox, request };
    const user = await openTab();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(roleServerSession.unavailable).toBe(true));
    expect(screen.getByText("What kind of text is this?")).toBeInTheDocument();
    expect(
      screen.queryByText(/error|could not|unreachable|failed|server/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(types()).not.toContain("ROLE_SERVER_RESULT");
    // The tab still works
    await user.click(screen.getByRole("radio", { name: "Why it matters" }));
    expect(screen.getByText("Words for text of unknown kind.")).toBeInTheDocument();
  });

  it("asks only once, a second state with a request is not sent to a server that is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    sandbox = { ...sandbox, request };
    await openTab();
    await waitFor(() => expect(roleServerSession.unavailable).toBe(true));
    emit({ type: "ROLE_STATE", state: sandbox });
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("an answer from the server that is not a label", () => {
  it("a 503 is an ordinary unsure answer, it is passed on and the server is not marked down", async () => {
    fetchMock.mockResolvedValue(new Response("down", { status: 503 }));
    sandbox = { ...sandbox, request };
    await openTab();
    await waitFor(() => expect(types()).toContain("ROLE_SERVER_RESULT"));
    expect(roleServerSession.unavailable).toBe(false);
    expect(posted.find((m) => m.type === "ROLE_SERVER_RESULT")).toMatchObject({
      reply: { label: "unsure", reason: "unreachable" }
    });
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it("passes a good label on to the sandbox, which keeps it", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ label: "caption", reason: "ok", model: "m", ms: 5 }), {
        status: 200
      })
    );
    sandbox = { ...sandbox, request };
    await openTab();
    await waitFor(() => expect(types()).toContain("ROLE_SERVER_RESULT"));
    expect(posted.find((m) => m.type === "ROLE_SERVER_RESULT")).toMatchObject({
      nodeId: "1:1",
      reply: { label: "caption", model: "m" }
    });
  });
});

describe("a rule decided the role", () => {
  it("never calls the server", async () => {
    sandbox = {
      ...sandbox,
      rule: {
        role: "caption",
        ruleId: "N3",
        reason: 'Its layer name says it is a note: "subtitle".'
      }
    };
    await openTab();
    await screen.findByText(/Treated as/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(types()).not.toContain("ROLE_SERVER_RESULT");
  });
});

describe("confirming a role changes the explanation key", () => {
  it("a confirmed suggestion changes the key and so the words", async () => {
    sandbox = { ...sandbox, suggestion: { label: "caption", model: "m", live: false } };
    const user = await openTab();
    await user.click(screen.getByRole("radio", { name: "Why it matters" }));
    // A suggestion is only a question, it is not read until answered
    expect(screen.getByText("Words for text of unknown kind.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(posted.find((m) => m.type === "ROLE_ANSWER")).toMatchObject({
      nodeId: "1:1",
      role: "caption",
      response: "confirmed"
    });
    expect(await screen.findByText("Words for a caption.")).toBeInTheDocument();
    const logged = posted
      .filter((m) => m.type === "EXPLANATION_EVENT")
      .map((m) => m.event as { kind: string; key: { role: string } });
    expect(logged.find((e) => e.kind === "depth_changed")?.key.role).toBe("unknown");
    await user.click(screen.getByRole("radio", { name: "Quick" }));
    await user.click(screen.getByRole("radio", { name: "Why it matters" }));
    const changes = posted
      .filter((m) => m.type === "EXPLANATION_EVENT")
      .map((m) => m.event as { kind: string; key: { role: string }; toDepth?: number });
    expect(changes[changes.length - 1].key.role).toBe("caption");
  });

  it("changing the role to another one changes the key again", async () => {
    sandbox = {
      ...sandbox,
      rule: { role: "caption", ruleId: "N3", reason: "Its layer name says it is a note." }
    };
    const user = await openTab();
    await user.click(screen.getByRole("radio", { name: "Why it matters" }));
    expect(screen.getByText("Words for a caption.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Change" }));
    await user.click(screen.getByRole("radio", { name: /button text/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Words for button text.")).toBeInTheDocument();
  });

  it("answering not sure goes back to unknown even when a rule decided", async () => {
    sandbox = {
      ...sandbox,
      rule: { role: "caption", ruleId: "N3", reason: "Its layer name says it is a note." }
    };
    const user = await openTab();
    await user.click(screen.getByRole("radio", { name: "Why it matters" }));
    await user.click(screen.getByRole("button", { name: "Change" }));
    await user.click(screen.getByRole("radio", { name: /Not sure/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Words for text of unknown kind.")).toBeInTheDocument();
  });
});

describe("where the question appears", () => {
  it("shows in post-task reviewing and with no session", async () => {
    await openTab(POST_REVIEWING);
    expect(await screen.findByText("What kind of text is this?")).toBeInTheDocument();
    cleanup();
    await openTab(null);
    expect(await screen.findByText("What kind of text is this?")).toBeInTheDocument();
  });

  it("never asks the sandbox in post-task designing, where there is no tab", async () => {
    render(
      <StudyHost>
        <IssuePanel aiAssistanceLevel={3} />
      </StudyHost>
    );
    emit({
      type: "STUDY_STATE",
      session: POST_DESIGNING,
      visibility: participantVisibility(POST_DESIGNING),
      refusal: null
    });
    emit({ type: "ISSUES_UPDATED", issues: [issue()], decisions: {} });
    expect(types()).not.toContain("ROLE_QUERY");
    expect(screen.queryByText("What kind of text is this?")).not.toBeInTheDocument();
  });

  it("shows nothing if the sandbox says the question may not be shown", async () => {
    sandbox = { ...sandbox, allowed: false };
    await openTab();
    await waitFor(() => expect(types()).toContain("ROLE_QUERY"));
    expect(screen.queryByText("What kind of text is this?")).not.toBeInTheDocument();
  });
});
