import { describe, expect, it } from "vitest";
import { hintsFor } from "./detectionHints";
import { formatReport, type CheckData, type TextRow } from "./detectionReport";

const row = (patch: Partial<TextRow> = {}): TextRow => ({
  id: "1:2",
  name: "Test",
  visible: true,
  charCount: 4,
  fontSize: "14",
  fontWeight: "400",
  fontStyle: "Regular",
  chain: ['FRAME "Frame 1", SOLID #FFFFFF opacity 1'],
  foreground: "#B6ADA5 alpha 1",
  background: '#FFFFFF alpha 1, from {"kind":"node"}',
  indeterminate: [],
  sizeClass: "normal",
  required: 4.5,
  measured: 2.21,
  verdict: "flagged",
  ...patch
});

const data = (patch: Partial<CheckData> = {}): CheckData => ({
  build: { commit: "abc1234", dirty: false, builtAt: "2026-10-21T10:00:00.000Z" },
  figma: {
    apiVersion: "1.0.0",
    editorType: "figma",
    command: "detection-check",
    pluginId: "1",
    page: "Page 1",
    pageCount: 1
  },
  apis: { loadAllPagesAsync: true, getNodeByIdAsync: true, findAllWithCriteria: true },
  loadAllPages: "ok",
  writeTest: "ok, wrote and read back a value",
  stored: { issueCount: 1, byState: { open: 1 }, study: "none" },
  selection: [],
  text: { total: 1, visible: 1, checked: 1, flagged: 1, rows: [row()] },
  errors: [],
  ...patch
});

describe("hintsFor", () => {
  it("has nothing to say when everything works and a text layer is flagged and saved", () => {
    expect(hintsFor(data())).toEqual([]);
  });
  it("says the plugin cannot save when the write test failed", () => {
    expect(hintsFor(data({ writeTest: "FAILED, no permission" }))[0]).toMatch(
      /cannot save to this file/
    );
  });
  it("says detection cannot start when a function is missing or the pages do not load", () => {
    expect(
      hintsFor(
        data({
          apis: { loadAllPagesAsync: false, getNodeByIdAsync: true, findAllWithCriteria: true }
        })
      )[0]
    ).toMatch(/lacks loadAllPagesAsync/);
    expect(hintsFor(data({ loadAllPages: "boom" }))[0]).toMatch(
      /Loading the pages failed \(boom\)/
    );
  });
  it("says there is no text on the page", () => {
    const empty = data({ text: { total: 0, visible: 0, checked: 0, flagged: 0, rows: [] } });
    expect(hintsFor(empty)[0]).toMatch(/no text layer on the current page/);
  });
  it("explains a pass, and names the colours that always fail", () => {
    const passing = data({
      text: {
        total: 1,
        visible: 1,
        checked: 1,
        flagged: 0,
        rows: [row({ verdict: "passes", measured: 3.5, required: 3 })]
      }
    });
    expect(hintsFor(passing)[0]).toMatch(/passes the contrast rule/);
    expect(hintsFor(passing)[0]).toMatch(/#B6ADA5 on white #FFFFFF/);
  });
  it("points at the reasons when text could not be measured", () => {
    const unmeasured = data({
      text: {
        total: 1,
        visible: 1,
        checked: 1,
        flagged: 0,
        rows: [row({ verdict: "not evaluated", indeterminate: ["background-gradient"] })]
      }
    });
    expect(hintsFor(unmeasured).join(" ")).toMatch(/could not be measured/);
  });
  it("says issues exist but none are saved, and asks for a rebuild when the build is unknown", () => {
    expect(hintsFor(data({ stored: { issueCount: 0, byState: {}, study: "none" } }))[0]).toMatch(
      /none are saved/
    );
    expect(
      hintsFor(data({ build: { commit: "unknown", dirty: null, builtAt: "unknown" } })).join(" ")
    ).toMatch(/no commit recorded/);
  });
});

describe("formatReport", () => {
  const report = formatReport(data(), hintsFor(data()), "2026-10-21T10:05:00.000Z");
  it("names the build, the page and the text layer with its numbers", () => {
    expect(report).toContain("build: abc1234, built 2026-10-21T10:00:00.000Z");
    expect(report).toContain('current page "Page 1"');
    expect(report).toContain("1 text layer(s), 1 visible, 1 checked, 1 would be flagged now");
    expect(report).toContain('1. 1:2 "Test" visible, 4 characters');
    expect(report).toContain("needs 4.50, measured 2.21, verdict: flagged");
    expect(report).toContain('inside FRAME "Frame 1", SOLID #FFFFFF opacity 1');
  });
  it("starts with what to do next, and says when nothing looks wrong", () => {
    expect(report).toMatch(/WHAT TO DO NEXT\n- Nothing looks wrong here\./);
  });
  it("lists errors and marks uncommitted changes, hidden layers and unmeasured text", () => {
    const odd = data({
      build: { commit: "abc1234", dirty: true, builtAt: "t" },
      errors: ["saving: nope"],
      text: {
        total: 1,
        visible: 0,
        checked: 1,
        flagged: 0,
        rows: [
          row({
            visible: false,
            verdict: "not evaluated",
            measured: null,
            required: null,
            indeterminate: ["hidden"]
          })
        ]
      }
    });
    const text = formatReport(odd, [], "t");
    expect(text).toContain("(uncommitted changes)");
    expect(text).toContain("HIDDEN");
    expect(text).toContain("could not be measured because: hidden");
    expect(text).toContain("ERRORS WHILE CHECKING\n- saving: nope");
    expect(text).toContain("measured none");
  });
  it("holds no characters of the text, only its length", () => {
    expect(report).not.toMatch(/characters: /);
    expect(JSON.stringify(row())).not.toContain("secret");
  });
});
