import PDFDocument from "pdfkit";
import { describe, expect, it } from "vitest";

import { buildRootSignature } from "../../issues/rootSignature";
import { TOKEN_VALUES } from "../../../ui/theme/tokens";
import { DECISION, finding, ignoredFinding, input } from "../handoffFixtures";
import { buildHandoffTable } from "../tableModel";
import type { HtmlTheme } from "../tableHtmlStyle";
import type { HandoffInput } from "../types";
import { BOTTOM, PAGE } from "./pdfDraw";
import { loadPdfFonts } from "./pdfFonts";
import { facts, outline, structureTree } from "./pdfStructure";
import { buildTablePdf, handoffPdfFileName } from "./tablePdf";
import { makeCleaner } from "./pdfText";
import type { ItemPlacement } from "./pdfTable";

const THEME: HtmlTheme = {
  ink: TOKEN_VALUES["--color-ink"],
  muted: TOKEN_VALUES["--color-muted"],
  background: TOKEN_VALUES["--color-background"],
  card: TOKEN_VALUES["--color-card"],
  line: TOKEN_VALUES["--color-line"]
};
const AT = "2026-10-27T10:00:00.000Z";
const fonts = loadPdfFonts();

function sig() {
  const f = ignoredFinding();
  return buildRootSignature({
    foregroundHex: f.foregroundHex,
    backgroundHex: f.backgroundHex,
    foregroundBinding: f.foregroundBinding,
    requiredRatio: f.requiredRatio
  });
}

function layer(id: string, name: string) {
  return {
    nodeId: id,
    name,
    screenId: "s1",
    screenName: "Payment",
    width: 1,
    height: 1,
    imageHash: id
  };
}

/** An open item, a kept one, a changed color, and two pictures, one with alt text and one without */
function five(): HandoffInput {
  const s = sig();
  return input({
    findings: [finding(), ignoredFinding()],
    decisions: { [s]: { ...DECISION, signature: s } },
    changes: [
      {
        nodeName: "Continue button",
        beforeHex: "#F28C28",
        beforeRatio: 3.58,
        afterHex: "#C2410C",
        afterRatio: 5.18,
        instanceCount: 1,
        requiredRatio: 4.5,
        screenName: "Checkout",
        nodeId: "5:1"
      }
    ],
    notes: [
      {
        nodeId: "9:1",
        nodeName: "Dog photo",
        note: { category: "alt", text: "A dog", updatedAt: AT }
      }
    ],
    imageLayers: [layer("9:1", "Dog photo"), layer("9:2", "Menu photo")]
  });
}

/** Many open items with a color pair each so none of them group, for a document longer than a page */
function long(count: number): HandoffInput {
  return input({
    findings: Array.from({ length: count }, (_, i) =>
      finding({
        issueId: `contrast:${i}:1`,
        nodeId: `${i}:1`,
        nodeName:
          i % 7 === 0
            ? `A long layer name that wraps across more than one line, number ${i}, with extra words`
            : `Layer ${i}`,
        foregroundHex:
          `#${(40 + i * 3).toString(16).padStart(2, "0")}9A${(20 + i).toString(16).padStart(2, "0")}`.toUpperCase(),
        measuredRatio: 2 + (i % 20) / 10
      })
    )
  });
}

async function make(source: HandoffInput, placements?: ItemPlacement[]) {
  const model = buildHandoffTable(source, "developer", "abc1234");
  return buildTablePdf(model, THEME, fonts, { compress: false, placements });
}

const TABLE_HEAD3 = ["TR", "  TH:Column", "  TH:Column", "  TH:Column"];
const ROW3 = ["TR", "  TH:Row", "  TD", "  TD"];
const DETAIL = (span: number) => ["TR", `  TD:span${span}`, "    P"];
const indent = (lines: string[], by: number) => lines.map((l) => " ".repeat(by) + l);

describe("the tag sequence of the file", () => {
  it("has a heading and plain paragraphs for nothing at all", async () => {
    expect(outline(structureTree(await make(input())))).toEqual([
      "Document",
      "  H1",
      "  P",
      "  P",
      "  P",
      "  P",
      "  P"
    ]);
  });

  it("has one section with a heading and a table for one open item, whose row has no line under it", async () => {
    expect(outline(structureTree(await make(input({ findings: [finding()] }))))).toEqual([
      "Document",
      "  H1",
      "  P",
      "  P",
      "  Sect",
      "    H2",
      "    Table",
      ...indent(TABLE_HEAD3, 6),
      ...indent(ROW3, 6),
      "  P",
      "  P"
    ]);
  });

  it("has a section for each group and two rows for an item that has a line under it", async () => {
    const tree = outline(structureTree(await make(five())));
    expect(tree).toEqual([
      "Document",
      "  H1",
      "  P",
      "  P",
      "  Sect",
      "    H2",
      "    Table",
      ...indent(TABLE_HEAD3, 6),
      ...indent(ROW3, 6),
      ...indent(ROW3, 6),
      ...indent(DETAIL(3), 6),
      ...indent(ROW3, 6),
      ...indent(DETAIL(3), 6),
      "  Sect",
      "    H2",
      "    Table",
      "      TR",
      "        TH:Column",
      "        TH:Column",
      ...indent(["TR", "  TH:Row", "  TD"], 6),
      ...indent(DETAIL(2), 6),
      ...indent(["TR", "  TH:Row", "  TD"], 6),
      ...indent(DETAIL(2), 6),
      "  P",
      "  P"
    ]);
  });

  it("holds every header cell as a column header and every first cell as a row header", async () => {
    const all = structureTree(await make(five()));
    const cells: { tag: string; scope?: string }[] = [];
    const walk = (nodes: typeof all) =>
      nodes.forEach((n) => {
        if (n.tag === "TH") cells.push(n);
        walk(n.children);
      });
    walk(all);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) expect(["Column", "Row"]).toContain(cell.scope);
  });
});

describe("what the file says about itself", () => {
  it("sets the language, the title and the marked flag, with no image", async () => {
    const info = facts(await make(five()));
    expect(info.lang).toBe("en-US");
    expect(info.title).toBe("Checkout: accessibility handoff");
    expect(info.marked).toBe(true);
    expect(info.displayTitle).toBe(true);
    expect(info.images).toBe(false);
  });

  it("embeds the font and uses none of the built in ones", async () => {
    const info = facts(await make(five()));
    expect(info.fontFiles).toBe(2);
    expect(info.baseFonts.length).toBeGreaterThan(0);
    for (const name of info.baseFonts) expect(name).toMatch(/AtkinsonHyperlegible/);
  });

  it("names the file for the day the handoff was made", () => {
    expect(handoffPdfFileName("2026-11-13T10:00:00.000Z")).toBe("avene-handoff-2026-11-13.pdf");
  });
});

describe("the pages", () => {
  it("never splits a row across pages, and puts a header and a page number on every page as artifacts", async () => {
    const placed: ItemPlacement[] = [];
    const bytes = await make(long(45), placed);
    const info = facts(bytes);
    expect(placed).toHaveLength(45);
    expect(info.pages).toBeGreaterThan(2);
    for (const item of placed) {
      expect(item.top).toBeGreaterThanOrEqual(PAGE.margin);
      expect(item.bottom).toBeLessThanOrEqual(BOTTOM);
    }
    expect(placed.map((p) => p.page)).toEqual([...placed.map((p) => p.page)].sort((a, b) => a - b));
    expect(new Set(placed.map((p) => p.page)).size).toBe(info.pages);
    expect(info.pagination).toBe(info.pages * 2);
  });

  it("keeps one table and one heading when the rows run onto more pages", async () => {
    const tree = outline(structureTree(await make(long(45))));
    expect(tree.filter((line) => line.trim() === "Table")).toHaveLength(1);
    expect(tree.filter((line) => line.trim() === "H2")).toHaveLength(1);
    expect(tree.filter((line) => line.includes("TH:Column"))).toHaveLength(3);
  });
});

describe("characters the font does not have", () => {
  it("become a question mark and a space, and the rest stay", () => {
    const doc = new PDFDocument({ font: false });
    doc.registerFont("Body", fonts.regular);
    doc.registerFont("Bold", fonts.bold);
    const clean = makeCleaner(doc);
    expect(clean("café € “q” ·")).toBe("café € “q” ·");
    expect(clean("a日本 b❤")).toBe("a?? b?");
    expect(clean("a\tb\nc")).toBe("a b c");
  });

  it("still makes the whole file with such a name", async () => {
    const bytes = await make(input({ findings: [finding({ nodeName: "日本語 ❤ café" })] }));
    expect(outline(structureTree(bytes)).filter((l) => l.trim() === "TH:Row")).toHaveLength(1);
  });
});
