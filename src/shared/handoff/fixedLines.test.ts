import { describe, expect, it } from "vitest";

import { buildDoc, renderDoc } from "./buildDoc";
import { CLIENT_LINE, HIGHER_UP_LINE, NOT_COVERED_LINE } from "./fixedLines";
import { input } from "./handoffFixtures";

describe("fixed lines", () => {
  it("are byte identical to the agreed text", () => {
    expect(NOT_COVERED_LINE).toBe(
      "Needs check: Not covered by this check: keyboard behavior, screen reader output, code order, and the quality of alt text. Some text layers may not be evaluated. Avene checks text contrast in the design file only. Test the rest on the built page."
    );
    expect(CLIENT_LINE).toBe("Draft for the designer to send. Not a conformance statement.");
    expect(HIGHER_UP_LINE).toBe(
      "Whether these items affect a conformance claim depends on what the organization has claimed. Avene makes no conformance claim."
    );
  });

  it("ends every document with the Not covered line, even an empty one", () => {
    const lines = renderDoc(buildDoc(input())).split("\n");
    expect(lines[lines.length - 1]).toBe(NOT_COVERED_LINE);
  });
});
