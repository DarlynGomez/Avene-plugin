import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { solidFill, writeFill } from "./paintWriter";

const FIGMA_MIXED = Symbol("figma.mixed");

beforeEach(() => {
  vi.stubGlobal("figma", { mixed: FIGMA_MIXED, loadFontAsync: vi.fn().mockResolvedValue(undefined) });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function textNode(overrides: Record<string, unknown> = {}) {
  return {
    fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }],
    getRangeFontName: vi.fn().mockReturnValue({ family: "Inter", style: "Regular" }),
    setRangeFills: vi.fn(),
    ...overrides
  } as unknown as TextNode;
}

describe("solidFill", () => {
  it("is a single opaque solid paint carrying exactly the given color", () => {
    expect(solidFill({ r: 0.1, g: 0.2, b: 0.3 })).toEqual([
      { type: "SOLID", color: { r: 0.1, g: 0.2, b: 0.3 }, opacity: 1 }
    ]);
  });
});

describe("writeFill", () => {
  it("assigns the whole node's fills when no range is given", async () => {
    const node = textNode();
    const fills = solidFill({ r: 1, g: 0, b: 0 });
    await writeFill(node, fills);
    expect(node.fills).toBe(fills);
  });

  it("writes nothing else on the node besides fills", async () => {
    const node = textNode({ opacity: 1, visible: true });
    await writeFill(node, solidFill({ r: 0, g: 1, b: 0 }));
    expect(node.opacity).toBe(1);
    expect(node.visible).toBe(true);
  });

  it("loads the font for the range before writing per segment, for mixed-fill text", async () => {
    const node = textNode();
    const fills = solidFill({ r: 0, g: 0, b: 1 });
    await writeFill(node, fills, { start: 0, end: 5 });

    expect(figma.loadFontAsync).toHaveBeenCalledWith({ family: "Inter", style: "Regular" });
    expect(node.setRangeFills).toHaveBeenCalledWith(0, 5, fills);
  });

  it("skips loading a font when the range's font name is itself mixed", async () => {
    const node = textNode({ getRangeFontName: vi.fn().mockReturnValue(FIGMA_MIXED) });
    await writeFill(node, solidFill({ r: 0, g: 0, b: 1 }), { start: 0, end: 5 });

    expect(figma.loadFontAsync).not.toHaveBeenCalled();
    expect(node.setRangeFills).toHaveBeenCalled();
  });
});
