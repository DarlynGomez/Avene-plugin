import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleCalibrationMessage } from "../plugin/lifecycle/calibrationProtocol";
import { STORAGE_KEY_PROFILE, STORAGE_KEY_STUDY_SESSION } from "../plugin/storage/storageKeys";
import { App } from "../ui/App";

const SESSION = {
  schemaVersion: 1,
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "post-task",
  consentConfirmedAt: "2026-10-06T09:00:00.000Z",
  phase: "designing",
  startedAt: "2026-10-06T09:00:00.000Z",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};
const STORED = {
  schemaVersion: 1,
  completedAt: "2026-09-01T00:00:00.000Z",
  loggingConsent: false,
  answers: { projectType: "game" }
};

let fileData: Map<string, string>;
let userData: Map<string, unknown>;

function respond(message: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
}

/** The real sandbox calibration handler behind the postMessage boundary */
function realSandbox() {
  vi.stubGlobal("figma", {
    root: {
      getPluginData: (key: string) => fileData.get(key) ?? "",
      setPluginData: (key: string, value: string) => void fileData.set(key, value)
    },
    clientStorage: {
      getAsync: async (key: string) => userData.get(key),
      setAsync: async (key: string, value: unknown) => void userData.set(key, value)
    }
  });
  vi.spyOn(window.parent, "postMessage").mockImplementation((data: unknown) => {
    const message = (data as { pluginMessage?: { type?: string } }).pluginMessage;
    if (message?.type === "CALIBRATION_LOAD") {
      void handleCalibrationMessage({ type: "CALIBRATION_LOAD" }, respond);
    }
    if (message?.type === "ISSUES_SUBSCRIBE") {
      setTimeout(() => respond({ type: "ISSUES_UPDATED", issues: [], decisions: {} }), 0);
    }
  });
}

beforeEach(() => {
  fileData = new Map();
  userData = new Map();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function expectPanelAndNoCalibration() {
  await waitFor(() =>
    expect(screen.getByRole("main", { name: "Accessibility issues" })).toBeInTheDocument()
  );
  expect(
    screen.queryByRole("heading", { name: "Let's set up how CADT works for you." })
  ).toBeNull();
  expect(screen.queryByText(/Skip for now/)).toBeNull();
  expect(screen.queryByText(/Start designing/)).toBeNull();
}

// Lives outside ui and plugin on purpose, it joins the real UI to the real sandbox handler
describe("calibration during a study session", () => {
  it("never renders for a file and user with no stored calibration", async () => {
    fileData.set(STORAGE_KEY_STUDY_SESSION, JSON.stringify(SESSION));
    realSandbox();

    render(<App />);

    await expectPanelAndNoCalibration();
  });

  it("never renders when a stored profile exists with different answers", async () => {
    fileData.set(STORAGE_KEY_STUDY_SESSION, JSON.stringify(SESSION));
    fileData.set(STORAGE_KEY_PROFILE, JSON.stringify(STORED));
    userData.set(STORAGE_KEY_PROFILE, STORED);
    realSandbox();

    render(<App />);

    await expectPanelAndNoCalibration();
    expect(fileData.get(STORAGE_KEY_PROFILE)).toBe(JSON.stringify(STORED));
  });

  it("still shows calibration on a file with no session and no stored calibration", async () => {
    realSandbox();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Let's set up how CADT works for you." })
    ).toBeInTheDocument();
  });
});
