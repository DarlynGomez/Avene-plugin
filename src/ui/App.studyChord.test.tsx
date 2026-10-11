import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

function respond(message: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
}

function chord() {
  fireEvent.keyDown(window, {
    key: "K",
    code: "KeyK",
    ctrlKey: true,
    altKey: true,
    shiftKey: true
  });
}

describe("researcher chord from the calibration screen", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens over calibration without saving or skipping anything", async () => {
    const posted: string[] = [];
    vi.spyOn(window.parent, "postMessage").mockImplementation((data: unknown) => {
      const type = (data as { pluginMessage?: { type?: string } }).pluginMessage?.type;
      if (type) posted.push(type);
      if (type === "CALIBRATION_LOAD") {
        setTimeout(
          () => respond({ type: "CALIBRATION_LOADED", profile: null, resolvedScope: null }),
          0
        );
      }
    });

    render(<App />);
    const welcome = await screen.findByRole("heading", {
      name: "Let's set up how CADT works for you."
    });
    chord();

    expect(screen.getByRole("dialog", { name: "Researcher controls" })).toBeInTheDocument();
    expect(posted).not.toContain("CALIBRATION_SAVE");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(welcome).toBeInTheDocument();
    expect(posted).not.toContain("CALIBRATION_SAVE");
  });
});
