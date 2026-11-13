// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { contrastRatio } from "../colour/contrastRatio";
import { parseHex } from "../colour/hexInput";
import { TOKEN_VALUES } from "../../ui/theme/tokens";
import { buildRootSignature } from "../issues/rootSignature";
import { DECISION, finding, ignoredFinding, input } from "./handoffFixtures";
import { buildTableHtml, escapeHtml, handoffHtmlFileName } from "./tableHtml";
import { buildHandoffTable } from "./tableModel";
import type { HtmlTheme } from "./tableHtmlStyle";
import type { HandoffInput } from "./types";

const THEME: HtmlTheme = {
  ink: TOKEN_VALUES["--color-ink"],
  muted: TOKEN_VALUES["--color-muted"],
  background: TOKEN_VALUES["--color-background"],
  card: TOKEN_VALUES["--color-card"],
  line: TOKEN_VALUES["--color-line"]
};
const AT = "2026-10-27T10:00:00.000Z";

function sig() {
  const f = ignoredFinding();
  return buildRootSignature({
    foregroundHex: f.foregroundHex,
    backgroundHex: f.backgroundHex,
    foregroundBinding: f.foregroundBinding,
    requiredRatio: f.requiredRatio
  });
}

function source(count: 0 | 1 | 5, name = "Helper text"): HandoffInput {
  if (count === 0) return input();
  if (count === 1) return input({ findings: [finding({ nodeName: name })] });
  const s = sig();
  return input({
    findings: [finding({ nodeName: name }), ignoredFinding()],
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
    imageLayers: [
      {
        nodeId: "9:1",
        name: "Dog photo",
        screenId: "s1",
        screenName: "Payment",
        width: 1,
        height: 1,
        imageHash: "a"
      },
      {
        nodeId: "9:2",
        name: "Menu photo",
        screenId: "s1",
        screenName: "Payment",
        width: 1,
        height: 1,
        imageHash: "b"
      }
    ]
  });
}

const html = (count: 0 | 1 | 5, name?: string) =>
  buildTableHtml(buildHandoffTable(source(count, name), "developer", "abc1234"), THEME);
const parse = (text: string) => new DOMParser().parseFromString(text, "text/html");

describe("the exported page", () => {
  it.each([0, 1, 5] as const)("parses with %i items, one h1, a main and a title", (count) => {
    const raw = html(count);
    expect(raw.startsWith("<!doctype html>")).toBe(true);
    const doc = parse(raw);
    expect(doc.documentElement.getAttribute("lang")).toBe("en");
    expect(doc.title).toBe("Checkout: accessibility handoff");
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelectorAll("main")).toHaveLength(1);
    expect(doc.querySelectorAll("table")).toHaveLength(count === 0 ? 0 : count === 1 ? 1 : 2);
  });

  it("gives every table a caption and every th a scope", () => {
    const doc = parse(html(5));
    for (const table of doc.querySelectorAll("table")) {
      expect(table.querySelector("caption")?.textContent).toMatch(/, \d+ rows?$/);
    }
    const heads = doc.querySelectorAll("th");
    expect(heads.length).toBeGreaterThan(0);
    for (const th of heads) expect(["col", "row"]).toContain(th.getAttribute("scope"));
  });

  it("prints the status as plain text, with no shape drawn beside it", () => {
    const raw = html(5);
    const doc = parse(raw);
    const open = [...doc.querySelectorAll("td")].find((td) => td.textContent === "Open");
    expect(open).toBeDefined();
    expect(open?.children).toHaveLength(0);
    expect(raw).not.toMatch(/shape/);
  });

  it("puts the review line under the count line, and who reviewed it when someone did", () => {
    const lines = [...parse(html(5)).querySelectorAll("header p")].map((p) => p.textContent);
    expect(lines.at(-1)).toBe("Not yet reviewed by a person.");
    const model = buildHandoffTable(
      input({ findings: [finding()], reviewer: { name: "Priya N.", date: AT } }),
      "developer"
    );
    const reviewed = parse(buildTableHtml(model, THEME)).querySelectorAll("header p");
    expect(reviewed[reviewed.length - 1].textContent).toBe("Reviewed by Priya N., 27 Oct 2026");
  });

  it("links a row to its layer only when the file address is known, and escapes the link", () => {
    expect(parse(html(1)).querySelector("a")).toBeNull();
    const model = buildHandoffTable(
      input({
        findings: [finding({ nodeName: "Card" })],
        fileUrl: "https://www.figma.com/design/AbC123xyz/My-file"
      }),
      "developer"
    );
    const link = parse(buildTableHtml(model, THEME)).querySelector("tbody th a");
    expect(link?.getAttribute("href")).toBe(
      "https://www.figma.com/design/AbC123xyz/My-file?node-id=1-1"
    );
    expect(link?.textContent).toBe("Open in Figma");
    expect(link?.getAttribute("aria-label")).toBe("Open in Figma: Card");
  });

  it("has the same words as the screen model, the footer and the not reviewed line", () => {
    const text = parse(html(5)).body.textContent ?? "";
    for (const word of [
      "Helper text",
      "Promo banner",
      "Continue button",
      "Dog photo",
      "Menu photo"
    ]) {
      expect(text).toContain(word);
    }
    expect(text).not.toContain("Not covered by this check");
    expect(text).toContain("Not yet reviewed by a person.");
    expect(text).toContain("Build abc1234");
    expect(text).toContain("2 need action, 3 decided");
  });

  it("loads nothing and runs nothing", () => {
    const raw = html(5);
    const doc = parse(raw);
    expect(
      doc.querySelector("script, img, link, iframe, object, embed, svg, video, audio")
    ).toBeNull();
    expect(raw).not.toMatch(/https?:|url\(|@import|<img|\son\w+=/i);
  });

  it("escapes a layer name that holds markup and quotes", () => {
    const name = `<script>alert("x")</script> & 'q'`;
    const raw = html(1, name);
    expect(raw).not.toContain("<script>");
    expect(raw).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;");
    const doc = parse(raw);
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelector("tbody th")?.textContent).toContain(name);
  });

  it("escapes the file name in the title and the h1", () => {
    const model = buildHandoffTable(input({ fileName: `A "B" <i>` }), "developer");
    const doc = parse(buildTableHtml(model, THEME));
    expect(doc.title).toBe(`A "B" <i>: accessibility handoff`);
    expect(doc.querySelector("h1")?.textContent).toBe(`A "B" <i>`);
    expect(doc.querySelector("h1 i")).toBeNull();
  });

  it("keeps rows together when printed", () => {
    expect(html(1)).toMatch(/@media print[\s\S]*break-inside:\s*avoid/);
  });

  it("uses only the colors it was given", () => {
    const allowed = new Set(Object.values(THEME).map((hex) => hex.toLowerCase()));
    // Only the style block, the text of an Adjusted row names colors of its own
    const style = parse(html(5)).querySelector("style")?.textContent ?? "";
    const used = (style.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).map((hex) => hex.toLowerCase());
    expect(used.length).toBeGreaterThan(0);
    for (const hex of used) expect(allowed.has(hex)).toBe(true);
  });

  it("reaches 4.5 to 1 for every text color on every surface it sits on", () => {
    const ratio = (fg: string, bg: string) => {
      const a = parseHex(fg);
      const b = parseHex(bg);
      if (!a || !b) throw new Error("bad hex");
      return contrastRatio(a, b);
    };
    for (const fg of [THEME.ink, THEME.muted]) {
      for (const bg of [THEME.card, THEME.background]) {
        expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("the escape and the file name", () => {
  it("escapes the five characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
  it("names the file for the day the handoff was made", () => {
    expect(handoffHtmlFileName("2026-11-13T10:00:00.000Z")).toBe("avene-handoff-2026-11-13.html");
  });
});
