import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import { PROMPT_VERSION, SYSTEM_PROMPT } from "./prompt";
import { reviewCsv, REVIEW_COLUMNS } from "./reviewCsv";
import { markFailedRows, revalidate } from "./revalidate";
import type { ItemResult, Progress } from "./types";

const words = (count: number) => Array.from({ length: count }, () => "word").join(" ");
const good = `{measured} {required} change the text to {fix} ${words(30)}`;
function item(key: string, text: string, status: ItemResult["status"] = "completed"): ItemResult {
  return { key, status, text, factIds: [], reasons: [], attemptReasons: [], attempts: 1 };
}
const header = { model: "m", digest: null, promptVersion: "1", inputsHash: "h", generatedAt: "d" };
const progress: Progress = {
  header,
  items: {
    "body:low:normal:1": item("body:low:normal:1", good),
    "body:high:normal:1": item("body:high:normal:1", `${good} low – very`),
    "body:high:large:1": item("body:high:large:1", `${good} low — very`),
    "body:low:large:1": item("body:low:large:1", "bad", "failed")
  }
};

describe("the prompt", () => {
  it("asks for no dashes and carries a newer version", () => {
    expect(SYSTEM_PROMPT).toContain('Use commas, full stops or "and" instead of dashes');
    expect(PROMPT_VERSION).toBe("8");
  });
});

describe("revalidate", () => {
  it("marks only the rows that now fail, with the reason, and leaves the rest alone", () => {
    const { progress: next, failed } = revalidate(progress);
    expect([...failed.keys()].sort()).toEqual(["body:high:large:1", "body:high:normal:1"]);
    expect(next.items["body:high:normal:1"]).toMatchObject({ status: "failed", reasons: ["dash"] });
    expect(next.items["body:low:normal:1"]).toBe(progress.items["body:low:normal:1"]);
    expect(next.items["body:low:large:1"]).toBe(progress.items["body:low:large:1"]);
  });
  it("changes only the validation cell of a failing row in the csv", () => {
    const csv = toCsv([
      [...REVIEW_COLUMNS],
      ["body:low:normal:1", "1", good, "", "", "ok", "approve", "", "DG"],
      ["body:high:normal:1", "1", "t", "", "", "ok", "", "", ""]
    ]);
    const out = markFailedRows(csv, new Map([["body:high:normal:1", ["dash"]]]));
    expect(out).toBe(
      toCsv([
        [...REVIEW_COLUMNS],
        ["body:low:normal:1", "1", good, "", "", "ok", "approve", "", "DG"],
        ["body:high:normal:1", "1", "t", "", "", "failed: dash", "", "", ""]
      ])
    );
  });
});

describe("reviewCsv keeps what a reviewer entered", () => {
  it("carries a decision over only while the text is unchanged", () => {
    const previous = toCsv([
      [...REVIEW_COLUMNS],
      ["body:low:normal:1", "1", good, "", "", "ok", "approve", "", "DG"],
      ["body:high:normal:1", "1", "old", "", "", "ok", "approve", "", "DG"]
    ]);
    const next: Progress = {
      header,
      items: {
        "body:low:normal:1": item("body:low:normal:1", good),
        "body:high:normal:1": item("body:high:normal:1", "new words")
      }
    };
    const rows = reviewCsv(next, previous).trim().split("\r\n");
    expect(rows[1].endsWith("ok,approve,,DG")).toBe(true);
    expect(rows[2].endsWith("ok,,,")).toBe(true);
  });
});
