import { describe, expect, it } from "vitest";

import { finding, input } from "./handoffFixtures";
import { NOT_COVERED_LINE } from "./fixedLines";
import { buildHandoffTable } from "./tableModel";
import { renderTableText } from "./tableText";

const text = (findings = [finding()], buildId: string | null = "abc1234") =>
  renderTableText(buildHandoffTable(input({ findings }), "developer", buildId));

describe("renderTableText", () => {
  it("is a header, a plain text table for each group, and the footer", () => {
    const lines = text().split("\n");
    expect(lines[0]).toBe("Accessibility handoff: Checkout, Payment");
    expect(lines[1]).toBe("Made 2026-10-27, build abc1234");
    expect(lines).toContain("## Text contrast");
    const head = lines.find((line) => line.startsWith("Element"));
    expect(head).toMatch(
      /^Element +\| Location +\| Measured \| Needed \| Status +\| Decision \| Decides \| Note$/
    );
    expect(lines.at(-2)).toBe(NOT_COVERED_LINE);
    expect(lines.at(-1)).toMatch(/^Checks: text contrast/);
  });

  it("has a line for each row and the same cells as the model", () => {
    const rows = text([
      finding(),
      finding({ foregroundHex: "#888888", issueId: "contrast:2", nodeId: "2", nodeName: "Caption" })
    ])
      .split("\n")
      .filter((line) => /\d\.\d+:1/.test(line));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("Helper text");
    expect(rows[0]).toContain("Detected");
    expect(rows[0]).toContain("2.8:1");
  });

  it("fills an empty cell with a dash and keeps a pipe in a cell from breaking the columns", () => {
    const row = text()
      .split("\n")
      .find((line) => line.startsWith("Helper text"));
    expect(row).toContain("-");
    const piped = text([finding({ nodeName: "A | B" })]);
    expect(piped).toContain("A/B");
  });

  it("says there is nothing when there is nothing, and still ends with the footer", () => {
    const empty = text([]);
    expect(empty).toContain("No findings to hand off yet.");
    expect(empty).not.toContain("## ");
    expect(empty).toContain(NOT_COVERED_LINE);
  });

  it("leaves the build out when it is not known", () => {
    expect(text([finding()], null).split("\n")[1]).toBe("Made 2026-10-27");
  });
});
