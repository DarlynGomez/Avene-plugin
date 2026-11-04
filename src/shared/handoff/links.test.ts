import { describe, expect, it } from "vitest";

import { finding } from "./handoffFixtures";
import { attachLinks, nodeLink, parseFileUrl } from "./links";

const REF = { fileKey: "KEY", fileName: "Checkout" };

describe("parseFileUrl", () => {
  it("accepts design and file addresses on figma.com and www.figma.com", () => {
    expect(parseFileUrl("https://www.figma.com/design/KEY/Checkout?node-id=1-2")).toEqual(REF);
    expect(parseFileUrl("https://figma.com/file/KEY/Checkout")).toEqual(REF);
    expect(parseFileUrl("  https://www.figma.com/design/KEY/Checkout  ")).toEqual(REF);
  });

  it("uses the branch key for a branch address", () => {
    expect(parseFileUrl("https://www.figma.com/design/KEY/branch/BR1/Checkout")).toEqual({
      fileKey: "BR1",
      fileName: "Checkout"
    });
  });

  it("falls back to a default name when the address has none", () => {
    expect(parseFileUrl("https://www.figma.com/design/KEY")?.fileName).toBe("file");
  });

  it.each([
    undefined,
    "",
    "http://www.figma.com/design/KEY/x",
    "https://figma.com.evil.com/design/KEY/x",
    "https://evil.com/design/KEY/x",
    "https://www.figma.com@evil.com/design/KEY/x",
    "https://notfigma.com/design/KEY/x",
    "https://www.figma.com/board/KEY/x",
    "https://www.figma.com/design/",
    "javascript:alert(1)"
  ])("rejects %s", (url) => {
    expect(parseFileUrl(url)).toBeNull();
  });
});

describe("nodeLink", () => {
  it("turns colons into dashes", () => {
    expect(nodeLink(REF, "12:34")).toBe("https://www.figma.com/design/KEY/Checkout?node-id=12-34");
  });

  it("keeps a semicolon in an instance child id", () => {
    expect(nodeLink(REF, "I12:3;45:6")).toBe(
      "https://www.figma.com/design/KEY/Checkout?node-id=I12-3;45-6"
    );
  });

  it("gives no link without a file address or with an unsafe id", () => {
    expect(nodeLink(null, "1:2")).toBeNull();
    expect(nodeLink(REF, "")).toBeNull();
    expect(nodeLink(REF, "1:2&x=y")).toBeNull();
    expect(nodeLink(REF, "1:2 3")).toBeNull();
  });
});

describe("attachLinks", () => {
  it("adds a link per finding, or none at all with no address", () => {
    expect(attachLinks([finding()], REF)[0].link).toContain("node-id=1-1");
    expect(attachLinks([finding()], null)[0].link).toBeUndefined();
  });
});
