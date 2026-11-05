import { cleanup, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FEATURE_ALT_SUGGEST_LIVE } from "../../../shared/handoffFlags";
import { capturePosts, mountPanel } from "./altHarness";
import { described, pluginResponder, stubServer } from "./altServers";

let posted: ReturnType<typeof capturePosts>;

beforeEach(() => {
  posted = capturePosts(
    pluginResponder([
      {
        imageHash: "h-hero",
        modelId: "vision:v1",
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
  await user.selectOptions(screen.getByRole("combobox", { name: "Check" }), "alt");
  await user.click(screen.getAllByRole("button", { name: "Add note" })[0]);
  return user;
}

describe("with live suggestions committed off", () => {
  it("is off in the committed code", () => {
    expect(FEATURE_ALT_SUGGEST_LIVE).toBe(false);
  });

  it("still shows a saved suggestion, with no call to the server and no picture taken", async () => {
    const { fetchStub } = stubServer(() => described("never asked"));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
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
    await user.selectOptions(screen.getByRole("combobox", { name: "Check" }), "alt");
    await user.click(screen.getAllByRole("button", { name: "Add note" })[1]);
    await user.click(screen.getByRole("button", { name: "Suggest" }));
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
    await user.selectOptions(screen.getByRole("combobox", { name: "Check" }), "alt");
    expect(screen.getByText(/Live suggestions are not turned on/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Prepare suggestions" })).toBeNull();
    await user.click(screen.getAllByRole("button", { name: "Add note" })[0]);
    await user.click(screen.getByLabelText("Description"));
    await user.paste("By hand");
    await user.click(screen.getByRole("button", { name: "Save alt text" }));
    expect(posted.filter((m) => m.type === "HANDOFF_ALT_SET")[0]).toMatchObject({
      text: "By hand",
      source: "designer"
    });
  });
});
