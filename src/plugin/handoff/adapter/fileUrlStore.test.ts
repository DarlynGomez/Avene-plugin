import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTree } from "../../roles/testing/fakeFigma";
import { loadFileUrl, saveFileUrl } from "./fileUrlStore";

const URL = "https://www.figma.com/design/KEY/Checkout?node-id=1-2";

beforeEach(() => void buildTree());
afterEach(() => vi.unstubAllGlobals());

describe("file url store", () => {
  it("round trips a valid address", () => {
    expect(loadFileUrl()).toBeNull();
    expect(saveFileUrl(`  ${URL} `)).toEqual({ saved: true });
    expect(loadFileUrl()).toBe(URL);
  });

  it("refuses an address that is not a figma file and keeps the old one", () => {
    saveFileUrl(URL);
    for (const bad of [
      "https://evil.com/design/KEY/x",
      "http://www.figma.com/design/KEY/x",
      "text"
    ]) {
      expect(saveFileUrl(bad).saved).toBe(false);
    }
    expect(loadFileUrl()).toBe(URL);
  });

  it("clears with an empty string and ignores stored data that is no longer valid", () => {
    saveFileUrl(URL);
    expect(saveFileUrl("")).toEqual({ saved: true });
    expect(loadFileUrl()).toBeNull();
    figma.root.setPluginData(
      "cadt.handoff.file.v1",
      JSON.stringify({ v: 1, url: "https://evil.com/x" })
    );
    expect(loadFileUrl()).toBeNull();
    figma.root.setPluginData("cadt.handoff.file.v1", "{broken");
    expect(loadFileUrl()).toBeNull();
  });
});
