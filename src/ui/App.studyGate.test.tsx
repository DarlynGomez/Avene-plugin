import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { participantVisibility } from "../shared/study/participantVisibility";
import { App } from "./App";

const SESSION = {
  schemaVersion: 1 as const,
  participantId: "P01",
  block: 1 as const,
  task: "A" as const,
  condition: "post-task" as const,
  consentConfirmedAt: "t",
  phase: "designing" as const,
  startedAt: "t",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};

function respond(message: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
  });
}

describe("calibration gate in the participant interface", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("does not render calibration or consent while a session is active, even with no profile", () => {
    vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
    render(<App />);

    respond({
      type: "STUDY_STATE",
      session: SESSION,
      visibility: participantVisibility(SESSION),
      refusal: null
    });
    respond({ type: "CALIBRATION_LOADED", profile: null, resolvedScope: null });

    expect(
      screen.queryByRole("heading", { name: "Let's set up how CADT works for you." })
    ).toBeNull();
    expect(screen.queryByText(/Skip for now/)).toBeNull();
  });
});
