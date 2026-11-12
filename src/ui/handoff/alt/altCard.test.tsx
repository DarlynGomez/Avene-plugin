import { cleanup, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { capturePosts, layer, mountPanel, openAlt } from "./altHarness";

beforeEach(() => void capturePosts());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const cards = () =>
  screen
    .getAllByRole("heading", { level: 3 })
    .filter((h) => h.closest("li")?.hasAttribute("data-image-hash"));

async function open(
  layers = [
    layer("9:1", "h1", "Hero banner product photography"),
    layer("9:2", "h1", "Hero copy", "s2"),
    layer("9:3", "h2", "Logo")
  ]
) {
  const user = userEvent.setup();
  await mountPanel({ layers });
  await openAlt(user);
  return user;
}

describe("an alt text card", () => {
  it("has the name, the facts in one line, and no thumbnail", async () => {
    await open();
    const card = cards()[0].closest("li") as HTMLElement;
    expect(
      within(card).getByRole("heading", { name: "Hero banner product photography" })
    ).toBeInTheDocument();
    expect(card).toHaveTextContent("2 layers • 2 screens • 120 × 80px");
    expect(card.querySelector("img, svg[class*=thumb]")).toBeNull();
  });

  it("has Add Note and Mark Decorative on the left, and Locate and a flag on the right", async () => {
    await open();
    const card = cards()[0].closest("li") as HTMLElement;
    expect(within(card).getByRole("button", { name: "Add Note" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Mark Decorative" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /^Locate all 2 layers/ })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Flag as important" })).toBeInTheDocument();
  });

  it("lists its layers under Related grouped issues with a count of the others", async () => {
    await open();
    const card = cards()[0].closest("li") as HTMLElement;
    expect(within(card).getByText("Related grouped issues")).toBeInTheDocument();
    expect(within(card).getByText("+1")).toBeInTheDocument();
    expect(within(card).getByText("Hero copy")).toBeInTheDocument();
    const single = cards()[1].closest("li") as HTMLElement;
    expect(within(single).queryByText("Related grouped issues")).toBeNull();
  });

  it("can be flagged, and a flagged one is listed first", async () => {
    const user = await open();
    expect(cards().map((c) => c.textContent)).toEqual(["Hero banner product photography", "Logo"]);
    const logo = cards()[1].closest("li") as HTMLElement;
    await user.click(within(logo).getByRole("button", { name: "Flag as important" }));
    expect(within(logo).getByRole("button", { name: "Remove important flag" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(cards().map((c) => c.textContent)).toEqual(["Logo", "Hero banner product photography"]);
  });
});

describe("the question mark on an alt text card", () => {
  it("says what an image needs, with its own name as the example, and offers its lesson", async () => {
    const user = await open();
    const card = cards()[0].closest("li") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "Why this surfaced" }));
    const popover = within(card).getByRole("status");
    expect(within(popover).getByText("WCAG Requirement")).toBeInTheDocument();
    expect(within(popover).getByText("WCAG 1.1.1 (Level A)")).toBeInTheDocument();
    expect(popover).toHaveTextContent('raw filenames like "Hero banner product photography"');
    expect(
      within(popover).getByRole("button", { name: "Learn more in Teach Me Why" })
    ).toBeInTheDocument();
  });

  it("opens the Teach Me Why tab on the alt text lesson, scrolled to the top", async () => {
    const user = await open();
    const card = cards()[0].closest("li") as HTMLElement;
    const region = card.closest("div[class*=scrollRegion]") as HTMLElement;
    Object.defineProperty(region, "scrollTop", { value: 480, writable: true });
    await user.click(within(card).getByRole("button", { name: "Why this surfaced" }));
    await user.click(screen.getByRole("button", { name: "Learn more in Teach Me Why" }));
    expect(screen.getByRole("tab", { name: /Teach Me Why/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(
      await screen.findByRole("heading", { name: "Alternative Text for Images" })
    ).toBeInTheDocument();
    expect(region.scrollTop).toBe(0);
  });
});
