import { cleanup, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { capturePosts, mountPanel, openAlt } from "./altHarness";
import { described, pluginResponder, stubServer } from "./altServers";

vi.mock("../../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../../shared/handoffFlags")>()),
  FEATURE_ALT_ANNOTATIONS: false,
  FEATURE_ALT_SUGGEST_LIVE: false
}));

// Mounting the whole panel is slow on a loaded machine
vi.setConfig({ testTimeout: 15000 });

let posted: ReturnType<typeof capturePosts>;

beforeEach(() => {
  posted = capturePosts(
    pluginResponder([
      {
        imageHash: "h-hero",
        modelId: "vision:v1",
        style: "concise",
        kind: "describe",
        text: "A hero banner",
        at: "2026-11-05T10:00:00.000Z"
      }
    ]).handle
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function openHero() {
  const user = userEvent.setup();
  await mountPanel();
  await openAlt(user);
  await user.click(screen.getAllByRole("button", { name: "Add Note" })[0]);
  return user;
}

describe("with live suggestions off", () => {
  it("still shows a saved suggestion, with no call to the server and no picture taken", async () => {
    const { fetchStub } = stubServer(() => described("never asked"));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Generate with AI" }));
    expect(
      within(await screen.findByRole("region", { name: "AI suggestion" })).getByText(
        "A hero banner"
      )
    ).toBeInTheDocument();
    expect(fetchStub).not.toHaveBeenCalled();
    expect(posted.some((m) => m.type === "HANDOFF_ALT_CROP_REQUEST")).toBe(false);
  });

  it("says one plain line for a picture with nothing saved, and sends nothing anywhere", async () => {
    const { fetchStub } = stubServer(() => described("never asked"));
    const user = userEvent.setup();
    await mountPanel();
    await openAlt(user);
    await user.click(screen.getAllByRole("button", { name: "Add Note" })[1]);
    await user.click(screen.getByRole("button", { name: "Generate with AI" }));
    expect(
      await within(screen.getByRole("dialog")).findByText(/Live suggestions are not turned on/)
    ).toBeInTheDocument();
    expect(fetchStub).not.toHaveBeenCalled();
    expect(posted.some((m) => m.type === "HANDOFF_ALT_CROP_REQUEST")).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says so over the list, hides Prepare suggestions, and writing a note still works", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await openAlt(user);
    expect(screen.getByText(/Live suggestions are not turned on/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Prepare suggestions" })).toBeNull();
    await user.click(screen.getAllByRole("button", { name: "Add Note" })[0]);
    await user.click(screen.getByLabelText("Description"));
    await user.paste("By hand");
    await user.click(screen.getByRole("button", { name: "Save alt text" }));
    expect(posted.filter((m) => m.type === "HANDOFF_ALT_SET")[0]).toMatchObject({
      text: "By hand",
      source: "designer"
    });
  });

  it("shows the rewind button as not available, and pressing it asks for nothing", async () => {
    const { fetchStub } = stubServer(() => described("never asked"));
    const user = userEvent.setup();
    await mountPanel();
    await openAlt(user);
    await user.click(screen.getAllByRole("button", { name: "Add Note" })[0]);
    const again = screen.getByRole("button", { name: "Generate again" });
    expect(again).toHaveAttribute("aria-disabled", "true");
    await user.click(again);
    expect(fetchStub).not.toHaveBeenCalled();
    expect(posted.some((m) => m.type === "HANDOFF_ALT_CROP_REQUEST")).toBe(false);
  });
});
