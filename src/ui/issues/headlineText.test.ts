import { describe, expect, it } from "vitest";
import { formatHeadline, openCountFromHeadline } from "./headlineText";

describe("formatHeadline", () => {
  it("formats a concentrated headline with more than one color", () => {
    const text = formatHeadline({
      kind: "concentrated",
      totalOpenCount: 159,
      bindings: [
        { binding: "sage/muted", openCount: 90 },
        { binding: "#334455", openCount: 41 }
      ]
    });
    expect(text).toBe("2 colors cause 131 of 159 issues.");
  });

  it("uses singular color and causes for a single dominant binding", () => {
    const text = formatHeadline({
      kind: "concentrated",
      totalOpenCount: 100,
      bindings: [{ binding: "sage/muted", openCount: 90 }]
    });
    expect(text).toBe("1 color causes 90 of 100 issues.");
  });

  it("formats an unconcentrated headline", () => {
    const text = formatHeadline({ kind: "unconcentrated", totalOpenCount: 159, screenCount: 4 });
    expect(text).toBe("159 issues across 4 screens.");
  });

  it("formats an unconcentrated headline with singular counts", () => {
    const text = formatHeadline({ kind: "unconcentrated", totalOpenCount: 1, screenCount: 1 });
    expect(text).toBe("1 issue across 1 screen.");
  });

  it("formats a nothing-open headline", () => {
    const text = formatHeadline({ kind: "nothingOpen", decidedRootCount: 12 });
    expect(text).toBe("Nothing open. 12 decisions recorded.");
  });

  it("uses singular decision for a single decided root", () => {
    const text = formatHeadline({ kind: "nothingOpen", decidedRootCount: 1 });
    expect(text).toBe("Nothing open. 1 decision recorded.");
  });
});

describe("openCountFromHeadline", () => {
  it("reads totalOpenCount off a concentrated or unconcentrated headline", () => {
    expect(
      openCountFromHeadline({ kind: "unconcentrated", totalOpenCount: 159, screenCount: 4 })
    ).toBe(159);
  });

  it("is zero when nothing is open", () => {
    expect(openCountFromHeadline({ kind: "nothingOpen", decidedRootCount: 12 })).toBe(0);
  });
});
