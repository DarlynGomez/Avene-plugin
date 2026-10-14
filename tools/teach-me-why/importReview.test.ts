import { describe, expect, it } from "vitest";
import type { ExplanationTable } from "../../src/shared/teachMeWhy/explanationTypes";
import tableData from "../../src/shared/teachMeWhy/explanationTable.json";
import { toCsv } from "./csv";
import { buildTable } from "./importReview";
import { REVIEW_COLUMNS } from "./reviewCsv";

const base = tableData as unknown as ExplanationTable;
const generation = {
  model: "gpt-oss:120b",
  digest: null,
  promptVersion: "1",
  generatedAt: "2026-10-14T00:00:00.000Z"
};
const words = (count: number) => Array.from({ length: count }, () => "word").join(" ");
const quick = (extra = "") => `It is {measured} and needs {required}. ${extra} ${words(24)}`.trim();

function row(fields: Partial<Record<(typeof REVIEW_COLUMNS)[number], string>>): string[] {
  return REVIEW_COLUMNS.map((name) => fields[name] ?? "");
}
function csv(...rows: string[][]): string {
  return toCsv([[...REVIEW_COLUMNS], ...rows]);
}

describe("buildTable", () => {
  it("keeps an approved row and an edited row, with reviewer, facts and the record", () => {
    const result = buildTable(
      csv(
        row({ key: "body:low:normal:1", text: quick(), decision: "approve", reviewer: "DG" }),
        row({
          key: "body:high:normal:1",
          text: "ignored",
          decision: "edit",
          edited_text: quick("Edited."),
          reviewer: "GT"
        })
      ),
      base,
      generation
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.table.entries)).toEqual(["body:high:normal:1", "body:low:normal:1"]);
    expect(result.table.entries["body:high:normal:1"]).toEqual({
      text: quick("Edited."),
      status: "approved",
      reviewer: "GT",
      factIds: []
    });
    expect(result.table.generation).toEqual(generation);
    expect(result.table.fallbacks).toEqual(base.fallbacks);
    expect([result.approved, result.edited]).toEqual([1, 1]);
  });

  it("leaves a rejected row out, so its key uses the fixed template", () => {
    const result = buildTable(
      csv(row({ key: "body:low:normal:1", text: quick(), decision: "reject", reviewer: "DG" })),
      base,
      generation
    );
    expect(result).toMatchObject({ ok: true, rejected: 1 });
    expect(result.ok && result.table.entries).toEqual({});
  });

  it("counts a blank decision as not yet decided and writes nothing for it", () => {
    const result = buildTable(
      csv(row({ key: "body:low:normal:1", text: quick() })),
      base,
      generation
    );
    expect(result).toMatchObject({ ok: true, pending: 1 });
    expect(result.ok && result.table.entries).toEqual({});
  });

  it("refuses everything when an edited row fails validation", () => {
    const result = buildTable(
      csv(
        row({ key: "body:low:normal:1", text: quick(), decision: "approve", reviewer: "DG" }),
        row({
          key: "body:high:normal:1",
          text: "x",
          decision: "edit",
          edited_text: quick("WCAG says 40% of people."),
          reviewer: "GT"
        })
      ),
      base,
      generation
    );
    expect(result.ok).toBe(false);
    const errors = !result.ok ? result.errors.join("\n") : "";
    expect(errors).toContain("Row 3");
    expect(errors).toContain("banned-term");
    expect(errors).toContain("number-not-allowed");
  });

  it("checks an approved row again, so a flagged row cannot be approved as it stands", () => {
    const result = buildTable(
      csv(
        row({ key: "body:low:normal:1", text: "too short", decision: "approve", reviewer: "DG" })
      ),
      base,
      generation
    );
    expect(result.ok).toBe(false);
  });

  it("refuses a fact that is not cleared to ship", () => {
    // F16 is allowed by the matrix for body depth 2 but is an unverified excerpt
    const text = `${words(70)}`;
    const result = buildTable(
      csv(
        row({
          key: "body:low:normal:2",
          text,
          fact_ids: "F16",
          decision: "approve",
          reviewer: "DG"
        })
      ),
      base,
      generation
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toContain("fact-not-allowed");
  });

  it("refuses a missing reviewer, a bad key, a bad decision, a duplicate and empty edited text", () => {
    const result = buildTable(
      csv(
        row({ key: "body:low:normal:1", text: quick(), decision: "approve" }),
        row({ key: "nope", text: quick(), decision: "approve", reviewer: "DG" }),
        row({ key: "body:low:large:1", text: quick(), decision: "maybe", reviewer: "DG" }),
        row({ key: "body:high:large:1", text: quick(), decision: "approve", reviewer: "DG" }),
        row({ key: "body:high:large:1", text: quick(), decision: "approve", reviewer: "DG" }),
        row({ key: "body:medium:large:1", text: quick(), decision: "edit", reviewer: "DG" })
      ),
      base,
      generation
    );
    expect(!result.ok && result.errors).toHaveLength(5);
  });

  it("refuses a file without the review columns", () => {
    expect(buildTable("key,text\r\na,b\r\n", base, generation).ok).toBe(false);
  });
});
