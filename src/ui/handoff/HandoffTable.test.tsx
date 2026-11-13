import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { contrastRatio } from "../../shared/colour/contrastRatio";
import { parseHex } from "../../shared/colour/hexInput";
import { buildRootSignature } from "../../shared/issues/rootSignature";
import { DECISION, finding, ignoredFinding, input } from "../../shared/handoff/handoffFixtures";
import { buildHandoffTable } from "../../shared/handoff/tableModel";
import type { HandoffInput } from "../../shared/handoff/types";
import { HandoffTable } from "./HandoffTable";

afterEach(cleanup);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(HERE, "HandoffTable.module.css"), "utf8");
const tokens = Object.fromEntries(
  [
    ...readFileSync(path.join(HERE, "../theme/global.css"), "utf8").matchAll(
      /(--color-[\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g
    )
  ].map(([, name, value]) => [name, value])
);
const ratio = (fg: string, bg: string) => {
  const a = parseHex(tokens[fg]);
  const b = parseHex(tokens[bg]);
  if (!a || !b) throw new Error("unknown token");
  return contrastRatio(a, b);
};

const AT = "2026-10-27T10:00:00.000Z";
const sig = () => {
  const f = ignoredFinding();
  return buildRootSignature({
    foregroundHex: f.foregroundHex,
    backgroundHex: f.backgroundHex,
    foregroundBinding: f.foregroundBinding,
    requiredRatio: f.requiredRatio
  });
};

function source(count: 0 | 1 | 5): HandoffInput {
  if (count === 0) return input();
  if (count === 1) return input({ findings: [finding({ nodeName: "Card caption" })] });
  const s = sig();
  return input({
    findings: [finding({ nodeName: "Card caption" }), ignoredFinding({ nodeName: "Order note" })],
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

function show(count: 0 | 1 | 5, onShow: (ids: readonly string[]) => void = () => undefined) {
  return render(
    <HandoffTable
      model={buildHandoffTable(source(count), "developer", "5c37f7b")}
      onShow={onShow}
    />
  );
}

describe("with nothing in it", () => {
  it("says so in one sentence, shows no group, and still shows the footer and the build", () => {
    show(0);
    expect(screen.getByText("No findings to hand off yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText(/^Not covered by this check/)).toBeInTheDocument();
    expect(screen.getByText("Build 5c37f7b")).toBeInTheDocument();
    expect(screen.getByText("0 need action")).toBeInTheDocument();
  });
});

describe("with one item", () => {
  it("shows one group, no empty second one, and the header as the design has it", () => {
    show(1);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Text contrast 1" })).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.getByText("Checkout")).toBeInTheDocument();
    expect(screen.getByText("Accessibility handoff · 27 Oct 2026 · Payment")).toBeInTheDocument();
    expect(screen.getByText("1 need action")).toBeInTheDocument();
  });

  it("names the table by its heading and gives each column header a scope", () => {
    show(1);
    const table = screen.getByRole("table", { name: "Text contrast 1" });
    const heads = within(table).getAllByRole("columnheader");
    expect(heads.map((h) => h.textContent)).toEqual(["Element", "Contrast", "Status"]);
    for (const head of heads) expect(head).toHaveAttribute("scope", "col");
  });

  it("puts an open item in one row, with no line across it when there is nothing to say", () => {
    show(1);
    const bodies = screen.getByRole("table").querySelectorAll("tbody");
    expect(bodies).toHaveLength(1);
    expect(bodies[0].querySelectorAll("tr")).toHaveLength(1);
    expect(screen.queryByText(/No decision yet/)).toBeNull();
  });

  it("puts a decided item in a body of two rows, the second one across every column", () => {
    show(5);
    const body = screen.getByText("Order note").closest("tbody") as HTMLElement;
    const rows = body.querySelectorAll("tr");
    expect(rows).toHaveLength(2);
    expect(rows[1].querySelector("td")).toHaveAttribute("colspan", "3");
    expect(
      within(rows[1] as HTMLElement).getByText("Brand campaign color, requested by Marketing")
    ).toBeInTheDocument();
  });

  it("prints the ratio, what is needed, and the status as real text", () => {
    show(1);
    expect(screen.getByText("2.80:1")).toBeInTheDocument();
    expect(screen.getByText("needs 4.5:1")).toBeInTheDocument();
    const cell = screen.getByText("Open");
    expect(cell.tagName).toBe("TD");
  });

  it("has a Show button named for the row that finds its layers", () => {
    const onShow = vi.fn();
    show(1, onShow);
    fireEvent.click(screen.getByRole("button", { name: "Show Card caption in Figma" }));
    expect(onShow).toHaveBeenCalledWith(["1:1"]);
  });
});

describe("with five items", () => {
  it("has a section for each kind with its count, in order, and nothing but those headings", () => {
    show(5);
    expect(screen.getAllByRole("heading").map((h) => [h.tagName, h.textContent])).toEqual([
      ["H2", "Text contrast 3"],
      ["H2", "Alt text 2"]
    ]);
  });

  it("has two columns for pictures and three for contrast", () => {
    show(5);
    const [contrast, alt] = screen.getAllByRole("table");
    expect(within(contrast).getAllByRole("columnheader")).toHaveLength(3);
    expect(
      within(alt)
        .getAllByRole("columnheader")
        .map((h) => h.textContent)
    ).toEqual(["Image", "Status"]);
  });

  it("has one Show button for each row, each with the element in its name", () => {
    show(5);
    for (const name of [
      "Card caption",
      "Order note",
      "Continue button",
      "Menu photo",
      "Dog photo"
    ]) {
      expect(screen.getByRole("button", { name: `Show ${name} in Figma` })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("shows the five status words, and the line that goes with each one", () => {
    show(5);
    for (const word of ["Open", "Ignored", "Adjusted", "Needs check", "Decided"]) {
      expect(screen.getByText(word)).toBeInTheDocument();
    }
    expect(screen.getByText("Fill #F28C28 changed to #C2410C. Now 5.18:1.")).toBeInTheDocument();
    expect(screen.getByText("Brand campaign color, requested by Marketing")).toBeInTheDocument();
    expect(screen.getByText("“A dog”")).toBeInTheDocument();
    expect(screen.getByText("No alt text yet")).toBeInTheDocument();
  });

  it("shows the footer once, and the build as its own line after it", () => {
    show(5);
    expect(screen.getAllByText(/^Not covered by this check/)).toHaveLength(1);
    expect(screen.getByText("Build 5c37f7b").previousElementSibling).toHaveTextContent(
      /^Not covered/
    );
  });

  it("holds no shape, no badge and no image", () => {
    const { container } = show(5);
    expect(container.querySelector("svg, img")).toBeNull();
    expect(container.textContent).not.toMatch(/\bNone\b/);
  });
});

describe("the layout", () => {
  it("never scrolls sideways, and puts no flex or grid on a table part", () => {
    const { container } = show(5);
    expect(css).not.toMatch(/overflow(-x)?:\s*(auto|scroll)/);
    expect(css).not.toMatch(/(^|\n)\.table[^{]*\{[^}]*display:\s*(flex|grid|inline-flex)/);
    for (const part of ["table", "thead", "tbody", "tr", "td", "th"]) {
      expect(css).not.toMatch(new RegExp(`(^|\\n)${part}\\s*\\{[^}]*display:\\s*(flex|grid)`));
    }
    for (const el of container.querySelectorAll<HTMLElement>("*")) {
      expect(el.style.overflowX).toBe("");
      expect(el.getAttribute("tabindex")).toBeNull();
    }
  });

  it("lets the table size itself, with Contrast and Status fitted to their words that never wrap", () => {
    expect(css).toMatch(/table-layout:\s*auto/);
    expect(css).toMatch(/\.fit\s*\{[^}]*width:\s*1%/);
    expect(css).toMatch(/\.fit\s*\{[^}]*white-space:\s*nowrap/);
    expect(css).not.toMatch(/--handoff-fixed-column|table-layout:\s*fixed/);
    show(5);
    for (const word of ["2.80:1", "Open", "Ignored", "Needs check", "Decided"]) {
      const cell = screen.getAllByText(word)[0].closest("td, th") as HTMLElement;
      expect(cell.className).toContain("fit");
    }
    const head = screen.getAllByRole("columnheader", { name: "Contrast" })[0];
    expect(head.className).toContain("fit");
  });

  it("keeps every text readable on the surface it sits on", () => {
    expect(ratio("--color-ink", "--color-card")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("--color-muted", "--color-card")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("--color-muted", "--color-background")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("--color-ink", "--color-background")).toBeGreaterThanOrEqual(4.5);
  });

  it("makes Show look like a link and gives it a visible focus ring", () => {
    expect(css).toMatch(/\.show\s*\{[^}]*text-decoration:\s*underline/);
    expect(css).toMatch(/\.show:focus-visible\s*\{[^}]*outline/);
  });
});

describe("the lines under a row", () => {
  const sigOf = sig();
  function withDecision(extra: Partial<HandoffInput> = {}) {
    return input({
      findings: [
        ignoredFinding({ nodeName: "Order note", changedSinceIgnore: true, severity: "high" })
      ],
      decisions: { [sigOf]: { ...DECISION, signature: sigOf } },
      meta: {
        [sigOf]: {
          signOff: "needs",
          leaveOut: false,
          mitigation: "Larger type on mobile",
          revisitTrigger: "the campaign ends",
          decidedBy: "Sam Lee"
        }
      },
      ...extra
    });
  }

  it("prints the worse line first in normal weight, then the quiet fields in order", () => {
    render(
      <HandoffTable
        model={buildHandoffTable(withDecision(), "developer")}
        onShow={() => undefined}
      />
    );
    const cell = screen
      .getByText("Brand campaign color, requested by Marketing")
      .closest("td") as HTMLElement;
    const lines = [...cell.querySelectorAll("span")].map((el) => [el.textContent, el.className]);
    expect(lines.map(([text]) => text)).toEqual([
      "Brand campaign color, requested by Marketing",
      "Worse since it was decided: medium then, high now.",
      "Mitigation: Larger type on mobile",
      "Revisit: the campaign ends",
      "Decided by Sam Lee, 27 Oct 2026"
    ]);
    expect(lines[1][1]).toContain("line");
    expect(lines[2][1]).toContain("note");
  });

  it("keeps the model's drafted line out of the name cell and under the quote", () => {
    const model = buildHandoffTable(
      input({
        notes: [
          {
            nodeId: "9:1",
            nodeName: "Dog photo",
            note: { category: "alt", text: "A dog", source: "ai", updatedAt: AT }
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
          }
        ]
      }),
      "developer"
    );
    render(<HandoffTable model={model} onShow={() => undefined} />);
    const drafted = screen.getByText("Drafted by a language model, confirmed by the designer");
    expect(drafted.closest("th")).toBeNull();
    expect(drafted.closest("td")).toBe(screen.getByText("\u201CA dog\u201D").closest("td"));
    const where = screen.getByText("Dog photo").closest("th") as HTMLElement;
    expect(within(where).queryByText(/Drafted by/)).toBeNull();
  });

  it("says how many layers are deferred and not listed, only when there are some", () => {
    const deferred = input({
      findings: [finding(), finding({ issueId: "d:1", nodeId: "d:1", state: "deferred" })]
    });
    const { unmount } = render(
      <HandoffTable model={buildHandoffTable(deferred, "developer")} onShow={() => undefined} />
    );
    expect(screen.getByText(/0 decided, 1 deferred, not listed/)).toBeInTheDocument();
    unmount();
    show(1);
    expect(screen.queryByText(/deferred/)).toBeNull();
  });
});
