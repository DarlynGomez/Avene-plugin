import { describe, expect, it } from "vitest";

import { displayLabel, LABELS, startsWithLabel } from "./labels";

describe("labels", () => {
  it("has exactly three canonical labels", () => {
    expect(LABELS).toEqual(["Detected", "Decision", "Needs check"]);
  });

  it("shows plain words to everyone but developers", () => {
    expect(displayLabel("Detected", "developer")).toBe("Detected");
    expect(displayLabel("Detected", "pm")).toBe("Measured");
    expect(displayLabel("Decision", "client")).toBe("Decided");
    expect(displayLabel("Needs check", "higherUp")).toBe("Still to check");
  });

  it("recognizes a label with an optional owner and nothing else", () => {
    expect(startsWithLabel("Detected: x")).toBe(true);
    expect(startsWithLabel("Needs check (owner: PM): x")).toBe(true);
    expect(startsWithLabel("Needs check (owner: Boss): x")).toBe(false);
    expect(startsWithLabel("Note: x")).toBe(false);
  });
});
