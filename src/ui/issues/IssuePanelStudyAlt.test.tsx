import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { participantVisibility } from "../../shared/study/participantVisibility";
import { AltChecksProvider } from "../handoff/alt/AltChecksProvider";
import { SESSION, emit, issue, LAYERS, dataMessage } from "../handoff/alt/altHarness";
import { StudyStateContext } from "../study/StudyStateContext";
import { IssuePanel } from "./IssuePanel";

// Every flag on, so the only thing that can keep the alt text checks out of the panel is the study
vi.mock("../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../shared/handoffFlags")>()),
  FEATURE_HANDOFF: true,
  FEATURE_ALT_ANNOTATIONS: true,
  FEATURE_ALT_SUGGEST_LIVE: true
}));

const study = {
  type: "STUDY_STATE" as const,
  session: SESSION,
  visibility: participantVisibility(SESSION),
  refusal: null
};

async function html(withChecks: boolean): Promise<string> {
  const panel = (
    <StudyStateContext.Provider value={study}>
      {withChecks ? (
        <AltChecksProvider>
          <IssuePanel aiAssistanceLevel={1} />
        </AltChecksProvider>
      ) : (
        <IssuePanel aiAssistanceLevel={1} />
      )}
    </StudyStateContext.Provider>
  );
  const { container, unmount } = render(panel);
  await act(async () => {
    emit({ type: "ISSUES_UPDATED", issues: [issue()], decisions: {} });
    emit({ type: "HANDOFF_ALT_INVENTORY", layers: LAYERS });
    emit(dataMessage());
  });
  // React numbers its generated ids across renders, so the numbers are not part of the comparison
  const out = container.innerHTML.replace(/_r_\d+_/g, "_r_N_");
  unmount();
  return out;
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
});

describe("while a study session is running, with every alt text flag on", () => {
  it("renders the panel exactly as the study build does, which has none of the alt text code", async () => {
    const without = await html(false);
    const withChecks = await html(true);
    expect(withChecks).toBe(without);
  });

  it("has no Check dropdown, no Alt text view, no suggest action and no annotation control", async () => {
    await html(true);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/Alt text|All checks|Suggest|Prepare suggestions|annotation/i);
    expect(screen.queryByRole("button", { name: /Alt Text & Media Descriptions/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Suggest|annotation|Add note/i })).toBeNull();
  });

  it("asks the plugin for nothing from the handoff feature, not the inventory, the notes, the saved suggestions or a crop", async () => {
    await html(true);
    expect(posted.filter((m) => m.type.startsWith("HANDOFF"))).toEqual([]);
  });

  it("sends no request to the local server", async () => {
    const fetchStub = vi.fn();
    vi.stubGlobal("fetch", fetchStub);
    await html(true);
    expect(fetchStub).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
