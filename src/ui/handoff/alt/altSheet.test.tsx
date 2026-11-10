import { cleanup, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ALT_MAX_CHARS } from "../../../shared/handoff/alt/altLimits";
import { capturePosts, mountPanel, openAlt } from "./altHarness";

vi.mock("../../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../../shared/handoffFlags")>()),
  FEATURE_ALT_ANNOTATIONS: false,
  FEATURE_ALT_SUGGEST_LIVE: false
}));

// Mounting the whole panel is slow on a loaded machine
vi.setConfig({ testTimeout: 15000 });

let posted: ReturnType<typeof capturePosts>;
beforeEach(() => {
  posted = capturePosts();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const alts = () => posted.filter((m) => m.type === "HANDOFF_ALT_SET");

async function openHeroSheet() {
  const user = userEvent.setup();
  await mountPanel();
  await openAlt(user);
  const opener = screen.getAllByRole("button", { name: "Add Note" })[0];
  await user.click(opener);
  return { user, opener, dialog: screen.getByRole("dialog") };
}

describe("the alt text sheet", () => {
  it("opens over the panel, takes focus, and names the layer", async () => {
    const { dialog } = await openHeroSheet();
    expect(within(dialog).getByRole("heading", { name: "Draft Alt Text" })).toBeInTheDocument();
    expect(within(dialog).getByText("Hero")).toBeInTheDocument();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("saves through the note message with the designer as the source, and gives focus back", async () => {
    const { user, opener } = await openHeroSheet();
    await user.click(screen.getByLabelText("Description"));
    await user.paste("A sunny cafe table");
    await user.click(screen.getByRole("button", { name: "Save alt text" }));
    expect(alts()).toEqual([
      {
        type: "HANDOFF_ALT_SET",
        nodeId: "9:1",
        text: "A sunny cafe table",
        decorative: false,
        source: "designer"
      }
    ]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("counts the characters against the limit and only suggests, never blocks, a long one", async () => {
    const { user } = await openHeroSheet();
    expect(screen.getByText(`0/${ALT_MAX_CHARS}`)).toBeInTheDocument();
    await user.click(screen.getByLabelText("Description"));
    await user.paste("x".repeat(ALT_MAX_CHARS + 5));
    expect(screen.getByText(`${ALT_MAX_CHARS + 5}/${ALT_MAX_CHARS}`)).toBeInTheDocument();
    expect(screen.getByText(/A little long/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save alt text" })).toBeEnabled();
  });

  it("clears and disables the text for a decorative image and saves it as decorative", async () => {
    const { user } = await openHeroSheet();
    const field = screen.getByLabelText("Description");
    await user.type(field, "Something");
    await user.click(screen.getByLabelText(/Decorative element/));
    expect(field).toBeDisabled();
    expect(field).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Save alt text" }));
    expect(alts()).toEqual([
      { type: "HANDOFF_ALT_SET", nodeId: "9:1", text: "", decorative: true, source: "designer" }
    ]);
  });

  it("starts ticked when opened from Mark decorative", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await openAlt(user);
    await user.click(screen.getAllByRole("button", { name: "Mark Decorative" })[0]);
    expect(screen.getByLabelText(/Decorative element/)).toBeChecked();
  });

  it("needs words or the decorative mark before it can be saved", async () => {
    await openHeroSheet();
    expect(screen.getByRole("button", { name: "Save alt text" })).toBeDisabled();
  });

  it("gives a short plain hint about useful alt text and no standard's name", async () => {
    const { dialog } = await openHeroSheet();
    expect(
      within(dialog).getByText(/what the image is for, not only what it looks like/i)
    ).toBeInTheDocument();
    expect(dialog.textContent).not.toMatch(/WCAG/);
  });

  it("closes with Escape and gives focus back, without sending anything", async () => {
    const { user, opener } = await openHeroSheet();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
    expect(alts()).toEqual([]);
  });

  it("closes from Cancel and from the close button", async () => {
    const { user } = await openHeroSheet();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("apply this note to all layers", () => {
  async function openAvatarSheet() {
    const user = userEvent.setup();
    await mountPanel();
    await openAlt(user);
    await user.click(screen.getAllByRole("button", { name: "Add Note" })[1]);
    return user;
  }

  it("is not there for a picture used once", async () => {
    await openHeroSheet();
    expect(screen.queryByLabelText(/Apply this note to all/)).toBeNull();
  });

  it("is unchecked by default, with the reason, and writes only the one layer", async () => {
    const user = await openAvatarSheet();
    const box = screen.getByLabelText(/Apply this note to all 2 layers/);
    expect(box).not.toBeChecked();
    expect(screen.getByText(/each layer keeps its own words/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText("Description"));
    await user.paste("A profile photo");
    await user.click(screen.getByRole("button", { name: "Save alt text" }));
    expect(alts().map((m) => m.nodeId)).toEqual(["9:2"]);
  });

  it("writes every layer of the picture when it is ticked, and nothing else", async () => {
    const user = await openAvatarSheet();
    await user.click(screen.getByLabelText(/Apply this note to all 2 layers/));
    await user.click(screen.getByLabelText("Description"));
    await user.paste("A profile photo");
    await user.click(screen.getByRole("button", { name: "Save alt text" }));
    expect(alts().map((m) => m.nodeId)).toEqual(["9:2", "9:3"]);
    expect(posted.some((m) => m.type.startsWith("HANDOFF_ANNOTAT"))).toBe(false);
  });
});

describe("with annotations switched off", () => {
  it("has no annotation control even for a layer with a saved note", async () => {
    const user = userEvent.setup();
    await mountPanel({
      notes: { "9:1": [{ category: "alt", text: "A hero", updatedAt: "2026-11-05T10:00:00.000Z" }] }
    });
    await openAlt(user);
    await user.click(screen.getAllByRole("button", { name: "Edit Note" })[0]);
    expect(screen.queryByText(/^Annotation:/)).toBeNull();
    expect(posted.some((m) => m.type.startsWith("HANDOFF_ANNOTAT"))).toBe(false);
  });
});

describe("a note that could not be saved", () => {
  it("shows one plain line", async () => {
    const { user } = await openHeroSheet();
    await user.click(screen.getByLabelText("Description"));
    await user.paste("x");
    await user.click(screen.getByRole("button", { name: "Save alt text" }));
    const { act } = await import("@testing-library/react");
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            pluginMessage: {
              type: "HANDOFF_WRITE_RESULT",
              target: "notes",
              saved: false,
              error: "That layer is no longer in the file"
            }
          }
        })
      );
    });
    expect(screen.getByText("That layer is no longer in the file")).toBeInTheDocument();
  });
});
