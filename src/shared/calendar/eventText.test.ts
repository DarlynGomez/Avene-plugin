import { describe, expect, it } from "vitest";

import { eventBody, eventTitle, firstLink } from "./eventText";
import { FILE_URL, item } from "./fixtures";

describe("eventTitle", () => {
  it("is a single triage for one item and a batch for more", () => {
    expect(eventTitle(1)).toBe("Design Review: A11y Triage (1 item)");
    expect(eventTitle(3)).toBe("Design Review: Batch A11y Triage (3 items)");
  });
});

describe("eventBody", () => {
  it("lists the measured ratio, colors, background layer, token and a deep link", () => {
    const body = eventBody([item()], FILE_URL);
    expect(body).toContain("1. sage/muted on white");
    expect(body).toContain("Measured 2.17:1, needs 4.5:1");
    expect(body).toContain("Text #9CB5B1 on #FFFFFF");
    expect(body).toContain("Background layer: Main Card");
    expect(body).toContain("Token: sage/muted");
    expect(body).toContain("Deferred 3 times, 101 layers share this pair");
    expect(body).toContain(
      "Open in Figma: https://www.figma.com/design/KEY/Checkout?node-id=12-34"
    );
  });

  it("cuts the ratio instead of rounding it up", () => {
    expect(eventBody([item({ measuredRatio: 4.4999 })], FILE_URL)).toContain("Measured 4.49:1");
  });

  it("numbers several items and leaves out what it does not know", () => {
    const body = eventBody([
      item(),
      item({ name: "teal on mint", binding: null, layers: 1, deferCount: 1, nodeId: "1:2" })
    ]);
    expect(body).toContain("2. teal on mint");
    expect(body).toContain("Deferred 1 time, 1 layer share this pair");
    expect(body.split("Token:")).toHaveLength(2);
    expect(body).not.toContain("Open in Figma");
  });

  it("says nothing about conformance", () => {
    expect(eventBody([item()], FILE_URL)).not.toMatch(/\b(compliant|passes|meets)\b/i);
  });
});

describe("firstLink", () => {
  it("is the first item's link, or null with no address or no items", () => {
    expect(firstLink([item()], FILE_URL)).toContain("node-id=12-34");
    expect(firstLink([item()])).toBeNull();
    expect(firstLink([], FILE_URL)).toBeNull();
  });
});
