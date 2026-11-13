import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { finding, input } from "../../shared/handoff/handoffFixtures";
import { NOT_COVERED_LINE } from "../../shared/handoff/fixedLines";
import { buildHandoffTable } from "../../shared/handoff/tableModel";
import type { HandoffInput } from "../../shared/handoff/types";
import { HandoffTable } from "./HandoffTable";

afterEach(cleanup);

function items(count: number): HandoffInput {
  const hexes = ["#999999", "#8A8A8A", "#AAAAAA", "#9C9C9C", "#B0B0B0"].slice(0, count);
  return input({
    findings: hexes.map((hex, i) =>
      finding({
        foregroundHex: hex,
        issueId: `contrast:${i}`,
        nodeId: `${i}:1`,
        nodeName: `Layer ${i + 1}`,
        documentOrder: i
      })
    )
  });
}

function show(count: number, onShow: (ids: readonly string[]) => void = () => undefined) {
  return render(
    <HandoffTable model={buildHandoffTable(items(count), "developer", "abc1234")} onShow={onShow} />
  );
}

describe("the handoff table with nothing in it", () => {
  it("says so in one sentence, has no table, and still shows the footer", () => {
    show(0);
    expect(screen.getByText("No findings to hand off yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(NOT_COVERED_LINE)).toBeInTheDocument();
    expect(screen.getByText(/^Checks: text contrast/)).toBeInTheDocument();
  });
});

describe("the handoff table with one item", () => {
  it("is a real table with a caption, column headers and a row header", () => {
    show(1);
    const table = screen.getByRole("table", { name: /Text contrast, 1 row/ });
    const heads = within(table).getAllByRole("columnheader");
    expect(heads.map((h) => h.textContent)).toEqual([
      "Element",
      "Location",
      "Measured",
      "Needed",
      "Status",
      "Decision",
      "Decides",
      "Note",
      "Find"
    ]);
    for (const head of heads) expect(head).toHaveAttribute("scope", "col");
    const rowHeader = within(table).getByRole("rowheader", { name: "Layer 1" });
    expect(rowHeader).toHaveAttribute("scope", "row");
    expect(table.querySelector("caption")).not.toBeNull();
  });

  it("shows the status as words and a shape that is hidden from a screen reader, never color alone", () => {
    show(1);
    const cell = screen.getByText("Detected").parentElement as HTMLElement;
    expect(cell).toHaveTextContent("Detected");
    const shape = cell.querySelector("svg");
    expect(shape).not.toBeNull();
    expect(shape).toHaveAttribute("aria-hidden", "true");
    expect(shape?.querySelector("path")).not.toBeNull();
  });

  it("shows the measurement and who decides", () => {
    show(1);
    const row = screen.getByRole("row", { name: /Layer 1/ });
    expect(within(row).getByText("2.8:1")).toBeInTheDocument();
    expect(within(row).getByText("4.5:1")).toBeInTheDocument();
    expect(within(row).getByText("Dev")).toBeInTheDocument();
  });

  it("has a button that finds the layers, named for the row", () => {
    const onShow = vi.fn();
    show(1, onShow);
    fireEvent.click(screen.getByRole("button", { name: "Show Layer 1 on the canvas" }));
    expect(onShow).toHaveBeenCalledWith(["0:1"]);
  });
});

describe("the handoff table with five items", () => {
  it("has five rows under one table, the title above and the footer once below", () => {
    show(5);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(screen.getAllByText(NOT_COVERED_LINE)).toHaveLength(1);
    expect(screen.getByText(/5 rows in 1 group/)).toBeInTheDocument();
    expect(screen.getByText(/build abc1234/)).toBeInTheDocument();
  });

  it("has the headings in order, the title and then the group, with the table named by its caption", () => {
    show(5);
    const levels = screen.getAllByRole("heading").map((h) => h.tagName);
    expect(levels).toEqual(["H3", "H4"]);
    expect(screen.getByRole("heading", { level: 4, name: "Text contrast" })).toBeInTheDocument();
  });

  it("scrolls across inside its own box that a keyboard can reach", () => {
    show(5);
    const region = screen.getByRole("region", { name: "Text contrast table" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toContainElement(screen.getByRole("table"));
  });

  it("says nothing about a model and gives every row a status in words", () => {
    const { container } = show(5);
    expect(container.textContent).not.toMatch(/language model|\bAI\b/);
    for (const row of screen.getAllByRole("row").slice(1)) {
      expect(within(row).getByText("Detected")).toBeInTheDocument();
    }
  });
});
