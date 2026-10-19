import { describe, expect, it } from "vitest";

import { parseReviewCsv, reviewCsv, type ReviewRow } from "./reviewCsv";
import { decideReviewRow } from "./reviewDecision";

const row = (patch: Partial<ReviewRow> = {}): ReviewRow => ({
  screen: "A1",
  layerName: "price",
  nodeId: "1:2",
  modelLabel: "caption",
  model: "frozen:tag",
  reviewed: "no",
  inputKey: "16|600|5|price",
  finalLabel: "caption",
  note: "",
  ...patch
});

describe("the review CSV", () => {
  it("has the columns in the agreed order", () => {
    expect(reviewCsv([row()]).split("\n")[0]).toBe(
      "screen,layer name,node id,model label,model,reviewed,input key,final label,note"
    );
  });

  it("round trips quoted commas, quotes and line breaks", () => {
    const rows = [
      row({ layerName: 'Say "hi", friend\nagain', inputKey: '16|600|5|Say "hi", friend' })
    ];
    expect(parseReviewCsv(reviewCsv(rows))).toEqual(rows);
  });

  it("reads windows line endings and a byte order mark", () => {
    const text = "\uFEFF" + reviewCsv([row(), row({ nodeId: "1:3" })]).replace(/\n/g, "\r\n");
    expect(parseReviewCsv(text)?.map((r) => r.nodeId)).toEqual(["1:2", "1:3"]);
  });

  it("finds columns by header, so a reordered file still reads", () => {
    const text = "final label,node id,reviewed,input key\nheading,1:2,yes,k\n";
    expect(parseReviewCsv(text)).toEqual([
      row({
        screen: "",
        layerName: "",
        modelLabel: "",
        model: "",
        reviewed: "yes",
        inputKey: "k",
        finalLabel: "heading",
        nodeId: "1:2"
      })
    ]);
  });

  it("refuses a file that is not an export", () => {
    expect(parseReviewCsv("")).toBeNull();
    expect(parseReviewCsv("a,b\n1,2\n")).toBeNull();
  });
});

describe("the decision for one row", () => {
  const here = { found: true, inputKey: "16|600|5|price" };

  it("skips in the agreed order", () => {
    expect(decideReviewRow(row(), { found: false, inputKey: "" })).toEqual({
      kind: "skip",
      reason: "notFound"
    });
    expect(decideReviewRow(row(), { ...here, inputKey: "other" })).toEqual({
      kind: "skip",
      reason: "layerChanged"
    });
    expect(decideReviewRow(row({ finalLabel: "title" }), here)).toEqual({
      kind: "skip",
      reason: "labelNotOnList"
    });
  });

  it("leaves a row not marked yes, writes a yes, removes an unsure", () => {
    expect(decideReviewRow(row({ reviewed: "no", finalLabel: "heading" }), here)).toEqual({
      kind: "leave"
    });
    expect(decideReviewRow(row({ reviewed: "Yes", finalLabel: "Button Text" }), here)).toEqual({
      kind: "write",
      label: "button text"
    });
    expect(decideReviewRow(row({ reviewed: "yes", finalLabel: "unsure" }), here)).toEqual({
      kind: "remove"
    });
  });
});
