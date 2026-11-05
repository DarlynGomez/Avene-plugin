import { cleanup, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { capturePosts, layer, mountPanel } from "./altHarness";

let posted: ReturnType<typeof capturePosts>;
beforeEach(() => {
  posted = capturePosts();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const checkSelect = () => screen.getByRole("combobox", { name: "Check" });

describe("the check dropdown", () => {
  it("is there when handoff is on, with a count for each check", async () => {
    await mountPanel();
    expect(within(checkSelect()).getByRole("option", { name: "All checks" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Color & Contrast (1 root • 1 issue)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Alt text & Media Descriptions (2 roots • 3 issues)" })
    ).toBeInTheDocument();
  });

  it("is not in the page while a study session is running", async () => {
    await mountPanel({ study: true });
    expect(screen.queryByRole("combobox", { name: "Check" })).toBeNull();
    expect(posted.filter((m) => m.type.startsWith("HANDOFF"))).toEqual([]);
  });

  it("is a native select, reached by Tab and changed with the keyboard", async () => {
    const user = userEvent.setup();
    await mountPanel();
    checkSelect().focus();
    await user.keyboard("{ArrowDown}");
    expect(checkSelect()).toHaveFocus();
    await user.selectOptions(checkSelect(), "alt");
    expect(
      screen.getByText("3 image layers need an alt text note across 2 screens.")
    ).toBeInTheDocument();
  });

  it("forgets the choice when the panel is closed, it is kept for the session only", async () => {
    const user = userEvent.setup();
    const { unmount } = await mountPanel();
    await user.selectOptions(checkSelect(), "alt");
    unmount();
    await mountPanel();
    expect(checkSelect()).toHaveValue("all");
  });
});

describe("the counts", () => {
  it("add both kinds in the tab badge and the line over the list", async () => {
    await mountPanel();
    expect(screen.getByText("4 issues across 2 screens.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Live Watch/ })).toHaveTextContent("4");
  });

  it("stay apart in All checks, with the alt text section under the contrast list", async () => {
    await mountPanel();
    const alt = screen.getByRole("heading", { name: "Alt text & Media Descriptions" });
    const contrast = screen.getByText("sage/muted on #FFFFFF");
    expect(contrast.compareDocumentPosition(alt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("option", { name: "View All (1)" })).toBeInTheDocument();
    expect(
      screen.getByText("3 image layers need an alt text note across 2 screens.")
    ).toBeInTheDocument();
  });

  it("show only the contrast list for Contrast and only the alt text list for Alt text", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await user.selectOptions(checkSelect(), "contrast");
    expect(screen.queryByRole("heading", { name: /Alt text/ })).toBeNull();
    expect(screen.getByText("sage/muted on #FFFFFF")).toBeInTheDocument();
    await user.selectOptions(checkSelect(), "alt");
    expect(screen.queryByText("sage/muted on #FFFFFF")).toBeNull();
    expect(screen.getByRole("radiogroup", { name: "Group image layers by" })).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Group issues by" })).toBeNull();
  });

  it("leave the headline as it was when no image layer needs a note", async () => {
    await mountPanel({ layers: [] });
    expect(screen.getByText("1 color causes 1 of 1 issues.")).toBeInTheDocument();
  });
});

describe("the alt text view", () => {
  it("says what is left in plain words, in the singular too", async () => {
    const user = userEvent.setup();
    await mountPanel({ layers: [layer("9:1", "a", "Hero")] });
    await user.selectOptions(checkSelect(), "alt");
    expect(
      screen.getByText("1 image layer needs an alt text note across 1 screen.")
    ).toBeInTheDocument();
  });

  it("is encouraging when everything has a note or a mark, and when there are no images", async () => {
    const user = userEvent.setup();
    const at = "2026-11-05T10:00:00.000Z";
    await mountPanel({
      layers: [layer("9:1", "a", "Hero")],
      notes: { "9:1": [{ category: "alt", text: "A hero", updatedAt: at }] }
    });
    await user.selectOptions(checkSelect(), "alt");
    expect(
      screen.getByText("Every image layer has a note or is marked decorative. Nice work.")
    ).toBeInTheDocument();
    cleanup();
    await mountPanel({ layers: [] });
    await userEvent.setup().selectOptions(checkSelect(), "alt");
    expect(screen.getByText("No image layers on this page yet.")).toBeInTheDocument();
  });

  it("makes one card for each picture, listing the layers and screens it is used on", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await user.selectOptions(checkSelect(), "alt");
    const cards = screen.getAllByRole("heading", { level: 3 });
    expect(cards.map((c) => c.textContent)).toEqual(["Hero", "Avatar"]);
    const card = cards[1].closest("li") as HTMLElement;
    expect(card).toHaveTextContent("2 layers");
    expect(card).toHaveTextContent("2 screens");
    expect(within(card).getByText("Avatar copy")).toBeInTheDocument();
  });

  it("groups by screen with the same control", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await user.selectOptions(checkSelect(), "alt");
    await user.click(screen.getByRole("radio", { name: "Screen" }));
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cart" })).toBeInTheDocument();
  });

  it("never calls an image layer failed, missing or a violation", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await user.selectOptions(checkSelect(), "alt");
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/failed|violation/i);
    expect(text).not.toMatch(/WCAG|\b1\.1\.1\b/);
    expect(screen.queryByText(/missing/i)).toBeNull();
  });
});

describe("Locate", () => {
  it("selects through the plugin's own selection adapter and is not a re-encounter", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await user.selectOptions(checkSelect(), "alt");
    posted.length = 0;
    await user.click(
      screen.getByRole("button", { name: "Locate all 2 layers using Avatar on the canvas" })
    );
    expect(posted).toEqual([{ type: "SHOW_ON_CANVAS", nodeIds: ["9:2", "9:3"] }]);
    expect(posted.some((m) => m.type === "ISSUE_FOCUS")).toBe(false);
  });

  it("locates one layer from its own row", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await user.selectOptions(checkSelect(), "alt");
    posted.length = 0;
    await user.click(screen.getByRole("button", { name: "Locate Avatar copy on the canvas" }));
    expect(posted).toEqual([{ type: "SHOW_ON_CANVAS", nodeIds: ["9:3"] }]);
  });
});
