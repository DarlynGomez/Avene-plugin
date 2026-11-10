import { cleanup, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { capturePosts, layer, mountPanel, openAlt } from "./altHarness";

let posted: ReturnType<typeof capturePosts>;
beforeEach(() => {
  posted = capturePosts();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const header = (name: RegExp) => screen.getByRole("button", { name });
const contrastHeader = () => header(/Color & Contrast/);
const altHeader = () => header(/Alt Text & Media Descriptions/);
const altBody = () =>
  document.getElementById(altHeader().getAttribute("aria-controls") ?? "") as HTMLElement;

describe("the two sections", () => {
  it("are rows with a name, a bubble that holds the count, and an arrow", async () => {
    await mountPanel();
    expect(within(contrastHeader()).getByText("1 root • 1 issue")).toBeInTheDocument();
    expect(within(altHeader()).getByText("2 roots • 3 issues")).toBeInTheDocument();
    expect(contrastHeader()).toHaveAttribute("aria-expanded", "true");
    expect(altHeader()).toHaveAttribute("aria-expanded", "false");
  });

  it("are not in the page while a study session is running", async () => {
    await mountPanel({ study: true });
    expect(screen.queryByRole("button", { name: /Alt Text & Media Descriptions/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Color & Contrast/ })).toBeNull();
    expect(posted.filter((m) => m.type.startsWith("HANDOFF"))).toEqual([]);
  });

  it("open and close with a click or the keyboard, each on its own", async () => {
    const user = userEvent.setup();
    await mountPanel();
    altHeader().focus();
    await user.keyboard("{Enter}");
    expect(altHeader()).toHaveAttribute("aria-expanded", "true");
    expect(contrastHeader()).toHaveAttribute("aria-expanded", "true");
    await user.click(contrastHeader());
    expect(contrastHeader()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("sage/muted on #FFFFFF")).toBeNull();
    await user.keyboard(" ");
    expect(contrastHeader()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("sage/muted on #FFFFFF")).toBeInTheDocument();
  });

  it("keep what is open for the session only, so a new panel starts as it did", async () => {
    const user = userEvent.setup();
    const { unmount } = await mountPanel();
    await openAlt(user);
    unmount();
    await mountPanel();
    expect(altHeader()).toHaveAttribute("aria-expanded", "false");
  });

  it("show the contrast list as it was, inside their section", async () => {
    await mountPanel();
    expect(screen.getByText("sage/muted on #FFFFFF")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "View All (1)" })).toBeInTheDocument();
  });
});

describe("the counts", () => {
  it("add both kinds in the tab badge and the line over the list", async () => {
    await mountPanel();
    expect(screen.getByText("4 issues across 2 screens.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Live Watch/ })).toHaveTextContent("4");
  });

  it("stay apart in the two bubbles and under the two names", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await openAlt(user);
    expect(
      screen.getByText("3 image layers need an alt text note across 2 screens.")
    ).toBeInTheDocument();
    expect(within(contrastHeader()).queryByText(/3 issues/)).toBeNull();
  });

  it("leave the headline as it was when no image layer needs a note", async () => {
    await mountPanel({ layers: [] });
    expect(screen.getByText("1 color causes 1 of 1 issues.")).toBeInTheDocument();
  });
});

describe("the alt text section", () => {
  it("says what is left in plain words, in the singular too", async () => {
    const user = userEvent.setup();
    await mountPanel({ layers: [layer("9:1", "a", "Hero")] });
    await openAlt(user);
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
    await openAlt(user);
    expect(
      screen.getByText("Every image layer has a note or is marked decorative. Nice work.")
    ).toBeInTheDocument();
    cleanup();
    await mountPanel({ layers: [] });
    await openAlt(userEvent.setup());
    expect(screen.getByText("No image layers on this page yet.")).toBeInTheDocument();
  });

  it("makes one card for each picture, listing the layers and screens it is used on", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await openAlt(user);
    const cards = within(altBody()).getAllByRole("heading", { level: 3 });
    expect(cards.map((c) => c.textContent)).toEqual(["Hero", "Avatar"]);
    const card = cards[1].closest("li") as HTMLElement;
    expect(card).toHaveTextContent("2 layers");
    expect(card).toHaveTextContent("2 screens");
    expect(within(card).getByText("Avatar copy")).toBeInTheDocument();
  });

  it("follows the one Group control: by screen it makes a section for each screen, by severity it lists by picture", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await openAlt(user);
    await user.click(screen.getByRole("radio", { name: "Screen" }));
    expect(within(altBody()).getByRole("button", { name: /^Home/ })).toBeInTheDocument();
    expect(within(altBody()).getByRole("button", { name: /^Cart/ })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Severity" }));
    expect(within(altBody()).queryByRole("button", { name: /^Cart/ })).toBeNull();
    expect(
      within(altBody())
        .getAllByRole("heading", { level: 3 })
        .map((c) => c.textContent)
    ).toEqual(["Hero", "Avatar"]);
  });

  it("never calls an image layer failed or a violation, and cites no criterion in its own lines", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await openAlt(user);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/failed|violation/i);
    expect(screen.queryByText(/missing/i)).toBeNull();
  });
});

describe("Locate", () => {
  it("selects through the plugin's own selection adapter and is not a re-encounter", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await openAlt(user);
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
    await openAlt(user);
    posted.length = 0;
    await user.click(screen.getByRole("button", { name: "Locate Avatar copy on the canvas" }));
    expect(posted).toEqual([{ type: "SHOW_ON_CANVAS", nodeIds: ["9:3"] }]);
  });
});
