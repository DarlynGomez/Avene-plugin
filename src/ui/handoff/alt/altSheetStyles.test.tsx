import { cleanup, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { capturePosts, mountPanel, openAlt } from "./altHarness";
import { described, pluginResponder, stubServer } from "./altServers";

const copyText = vi.hoisted(() => vi.fn(async () => true));

vi.mock("../../study/downloadFile", async (original) => ({
  ...(await original<typeof import("../../study/downloadFile")>()),
  copyText
}));
vi.mock("../../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../../shared/handoffFlags")>()),
  FEATURE_ALT_SUGGEST_LIVE: true,
  FEATURE_ALT_ANNOTATIONS: false
}));
vi.setConfig({ testTimeout: 15000 });

let posted: ReturnType<typeof capturePosts>;
beforeEach(() => {
  copyText.mockClear();
  posted = capturePosts(pluginResponder().handle);
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

const chooseStyle = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(screen.getByRole("radio", { name }));
const generate = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Generate with AI" }));
const box = () => screen.findByRole("region", { name: "AI suggestion" });
const bodyOf = (stub: ReturnType<typeof stubServer>, call: number) =>
  JSON.parse(
    (stub.fetchStub.mock.calls[call] as unknown as [string, RequestInit])[1].body as string
  );

describe("the Draft Alt Text sheet", () => {
  it("has the decorative switch, the three settings with Concise chosen, Generate with AI, Copy and the rewind button", async () => {
    stubServer(() => described("A sign"));
    await openHero();
    expect(screen.getByRole("heading", { name: "Draft Alt Text" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Decorative element/ })).not.toBeChecked();
    expect(
      within(screen.getByRole("radiogroup", { name: "How to word it" }))
        .getAllByRole("radio")
        .map((r) => r.textContent)
    ).toEqual(["Concise", "Descriptive", "Functional"]);
    expect(screen.getByRole("radio", { name: "Concise" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Generate with AI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate again" })).toBeInTheDocument();
    expect(screen.getByText("0/125")).toBeInTheDocument();
  });

  it("changes the setting with a click and keeps only one chosen", async () => {
    stubServer(() => described("A sign"));
    const user = await openHero();
    await chooseStyle(user, "Functional");
    expect(screen.getByRole("radio", { name: "Functional" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("radio", { name: "Concise" })).toHaveAttribute("aria-checked", "false");
  });

  it("asks the server with the setting that is chosen", async () => {
    const stub = stubServer(() => described("A sign"));
    const user = await openHero();
    await chooseStyle(user, "Descriptive");
    await generate(user);
    await box();
    expect(bodyOf(stub, 0).style).toBe("descriptive");
  });

  it("uses the most recent generation for a setting, and a different setting asks again", async () => {
    const stub = stubServer((call) => described(`Version ${call}`));
    const user = await openHero();
    await generate(user);
    expect(within(await box()).getByText("Version 1")).toBeInTheDocument();
    await generate(user);
    expect(within(await box()).getByText("Version 1")).toBeInTheDocument();
    expect(stub.state.calls).toBe(1);

    await chooseStyle(user, "Descriptive");
    expect(screen.queryByRole("region", { name: "AI suggestion" })).toBeNull();
    await generate(user);
    expect(within(await box()).getByText("Version 2")).toBeInTheDocument();
    expect(stub.state.calls).toBe(2);

    await chooseStyle(user, "Concise");
    await generate(user);
    expect(within(await box()).getByText("Version 1")).toBeInTheDocument();
    expect(stub.state.calls).toBe(2);
    const saved = posted.filter((m) => m.type === "HANDOFF_ALT_CACHE_SET").at(-1)?.entries as {
      style: string;
    }[];
    expect(saved.map((e) => e.style).sort()).toEqual(["concise", "descriptive"]);
  });

  it("asks again with the rewind button and replaces what was saved for that setting", async () => {
    const stub = stubServer((call) => described(`Version ${call}`));
    const user = await openHero();
    await generate(user);
    await box();
    await user.click(screen.getByRole("button", { name: "Generate again" }));
    await waitFor(() => expect(stub.state.calls).toBe(2));
    expect(within(await box()).getByText("Version 2")).toBeInTheDocument();
    const saved = posted.filter((m) => m.type === "HANDOFF_ALT_CACHE_SET").at(-1)?.entries as {
      text: string;
    }[];
    expect(saved).toHaveLength(1);
    expect(saved[0].text).toBe("Version 2");
    await generate(user);
    expect(within(await box()).getByText("Version 2")).toBeInTheDocument();
    expect(stub.state.calls).toBe(2);
  });

  it("copies what is in the field, and says so", async () => {
    stubServer(() => described("A sign"));
    const user = await openHero();
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
    await user.click(screen.getByLabelText("Description"));
    await user.paste("My own words");
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(copyText).toHaveBeenCalledWith("My own words");
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("turns off Generate, Copy and the field when the image is decorative", async () => {
    stubServer(() => described("A sign"));
    const user = await openHero();
    await user.click(screen.getByRole("switch", { name: /Decorative element/ }));
    expect(screen.getByLabelText("Description")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Generate with AI" })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Generate again" })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
  });

  it("is operable with the keyboard from the switch to the buttons", async () => {
    stubServer(() => described("A sign"));
    const user = await openHero();
    screen.getByRole("switch", { name: /Decorative element/ }).focus();
    await user.keyboard("{Tab}");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Concise" }));
    await user.keyboard("{Tab}{Tab}{Tab}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Generate with AI" }));
  });
});
