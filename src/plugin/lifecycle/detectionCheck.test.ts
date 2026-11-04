import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hintsFor } from "../../shared/debug/detectionHints";
import { formatReport } from "../../shared/debug/detectionReport";
import { buildTree, type Tree } from "../roles/testing/fakeFigma";
import { collectCheckData } from "./detectionCheckData";
import { runDetectionCheck } from "./detectionCheck";

vi.mock("../study/adapter/studySessionStore", () => ({
  readRawStudySession: () => "",
  activeStudySession: () => null
}));
vi.mock("../accountability/issueStore", () => ({ loadRawIssues: () => ({}) }));

const rgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16) / 255,
  g: parseInt(hex.slice(3, 5), 16) / 255,
  b: parseInt(hex.slice(5, 7), 16) / 255
});
let tree: Tree;

/** A page the way Figma presents it, around the fake screen the other plugin tests share */
function stubFigma(texts: unknown[], extra: Record<string, unknown> = {}) {
  const base = (globalThis as unknown as { figma: Record<string, unknown> }).figma;
  const page = {
    name: "Page 1",
    id: "0:1",
    selection: [] as unknown[],
    findAllWithCriteria: () => texts
  };
  vi.stubGlobal("figma", {
    ...base,
    apiVersion: "1.0.0",
    editorType: "figma",
    command: "detection-check",
    pluginId: "99",
    currentPage: page,
    root: { ...(base.root as object), children: [page] },
    showUI: vi.fn(),
    ...extra
  });
  return page;
}

beforeEach(() => {
  tree = buildTree();
});
afterEach(() => vi.unstubAllGlobals());

describe("the detection check", () => {
  it("flags light grey 14 px text on white, the pair that fails at any size", async () => {
    const text = tree.text("t1", "Test", "Test", 14, 400, {
      fills: [{ type: "SOLID", color: rgb("#B6ADA5") }]
    });
    stubFigma([text]);
    const data = await collectCheckData();
    expect(data.text.flagged).toBe(1);
    expect(data.text.rows[0]).toMatchObject({
      verdict: "flagged",
      sizeClass: "normal",
      required: 4.5,
      charCount: 4
    });
    expect(data.text.rows[0].measured).toBeCloseTo(2.21, 1);
    expect(data.writeTest).toMatch(/^ok/);
    expect(data.errors).toEqual([]);
  });

  it("explains why black text on red passes when it is large, which is the case a reviewer hit", async () => {
    tree.screen.fills = [{ type: "SOLID", color: rgb("#BB2D23") }];
    const text = tree.text("t1", "Test", "Test", 40, 400, {
      fills: [{ type: "SOLID", color: rgb("#000000") }]
    });
    stubFigma([text]);
    const data = await collectCheckData();
    expect(data.text.rows[0]).toMatchObject({ verdict: "passes", sizeClass: "large", required: 3 });
    expect(data.text.flagged).toBe(0);
    expect(hintsFor(data)[0]).toMatch(/passes the contrast rule/);
  });

  it("makes the same text fail once it is small enough to need 4.5", async () => {
    tree.screen.fills = [{ type: "SOLID", color: rgb("#BB2D23") }];
    const text = tree.text("t1", "Test", "Test", 20, 400, {
      fills: [{ type: "SOLID", color: rgb("#000000") }]
    });
    stubFigma([text]);
    expect((await collectCheckData()).text.rows[0]).toMatchObject({
      verdict: "flagged",
      sizeClass: "normal"
    });
  });

  it("reports that the plugin cannot save when writing to the file fails", async () => {
    const text = tree.text("t1", "Test", "Test", 14, 400);
    const root = (globalThis as unknown as { figma: { root: Record<string, unknown> } }).figma.root;
    stubFigma([text], {
      root: {
        ...root,
        setPluginData: () => {
          throw new Error("no permission");
        },
        children: []
      }
    });
    const data = await collectCheckData();
    expect(data.writeTest).toBe("FAILED, no permission");
    expect(hintsFor(data)[0]).toMatch(/cannot save to this file/);
    expect(data.errors).toContain("saving: no permission");
  });

  it("records a failure to load pages and carries on", async () => {
    stubFigma([tree.text("t1", "Test", "Test", 14, 400)], {
      loadAllPagesAsync: () => Promise.reject(new Error("too many pages"))
    });
    const data = await collectCheckData();
    expect(data.loadAllPages).toBe("too many pages");
    expect(data.text.total).toBe(1);
  });

  it("reports an empty page, and lists the selected layers first", async () => {
    const page = stubFigma([]);
    expect((await collectCheckData()).text.total).toBe(0);
    const a = tree.text("t1", "First", "One", 14, 400);
    const b = tree.text("t2", "Second", "Two", 14, 400);
    const withTwo = stubFigma([a, b]);
    withTwo.selection = [b];
    const data = await collectCheckData();
    expect(data.text.rows.map((r) => r.id)).toEqual(["t2", "t1"]);
    expect(data.selection[0]).toContain("Second");
    expect(page.name).toBe("Page 1");
  });

  it("describes the layers behind the text with their fills", async () => {
    const frame = tree.frame("f1", "Card", { fills: [{ type: "SOLID", color: rgb("#BB2D23") }] });
    const text = tree.text("t1", "Test", "Test", 14, 400, { parent: frame });
    stubFigma([text]);
    expect((await collectCheckData()).text.rows[0].chain[0]).toBe(
      'FRAME "Card", SOLID #BB2D23 opacity 1'
    );
  });

  it("opens the report window and prints it to the console without saving anything", async () => {
    const showUI = vi.fn();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    stubFigma([tree.text("t1", "Test", "Test", 14, 400)], { showUI });
    await runDetectionCheck();
    expect(showUI).toHaveBeenCalledTimes(2);
    expect(showUI.mock.calls[1][0]).toContain("CADT detection check");
    expect(showUI.mock.calls[1][0]).toContain("Copy report");
    expect(log.mock.calls[0][0]).toContain("[CADT debug]");
    log.mockRestore();
  });

  it("never throws, and keeps the text of the design out of the report", async () => {
    const text = tree.text("t1", "Test", "a private sentence", 14, 400);
    stubFigma([text]);
    const data = await collectCheckData();
    const report = formatReport(data, hintsFor(data), "t");
    expect(report).not.toContain("private sentence");
  });
});
