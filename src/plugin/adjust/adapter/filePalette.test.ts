import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const FIGMA_MIXED = Symbol("figma.mixed");

function solidFill(color: { r: number; g: number; b: number }, overrides: Record<string, unknown> = {}) {
  return { type: "SOLID", color, ...overrides };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFigma(nodes: unknown[], overrides: Record<string, unknown> = {}) {
  vi.stubGlobal("figma", {
    mixed: FIGMA_MIXED,
    variables: { getVariableByIdAsync: vi.fn() },
    getStyleByIdAsync: vi.fn(),
    currentPage: { findAll: (predicate: (node: unknown) => boolean) => nodes.filter(predicate) },
    ...overrides
  });
}

describe("collectFilePalette", () => {
  it("collects a distinct color once even when several nodes share it", async () => {
    const red = { r: 1, g: 0, b: 0 };
    stubFigma([
      { id: "1:1", fills: [solidFill(red)] },
      { id: "1:2", fills: [solidFill(red)] }
    ]);

    const { collectFilePalette } = await import("./filePalette");
    const palette = await collectFilePalette();

    expect(palette).toEqual([{ color: red, name: null }]);
  });

  it("collects distinct colors from different nodes", async () => {
    stubFigma([
      { id: "1:1", fills: [solidFill({ r: 1, g: 0, b: 0 })] },
      { id: "1:2", fills: [solidFill({ r: 0, g: 1, b: 0 })] }
    ]);

    const { collectFilePalette } = await import("./filePalette");
    const palette = await collectFilePalette();

    expect(palette).toHaveLength(2);
  });

  it("names a color bound to a variable", async () => {
    const green = { r: 0, g: 1, b: 0 };
    stubFigma(
      [{ id: "1:1", fills: [solidFill(green, { boundVariables: { color: { id: "var:1" } } })] }],
      { variables: { getVariableByIdAsync: vi.fn().mockResolvedValue({ name: "sage/muted" }) } }
    );

    const { collectFilePalette } = await import("./filePalette");
    const palette = await collectFilePalette();

    expect(palette).toEqual([{ color: green, name: "sage/muted" }]);
  });

  it("skips an invisible fill", async () => {
    stubFigma([{ id: "1:1", fills: [solidFill({ r: 1, g: 0, b: 0 }, { visible: false })] }]);

    const { collectFilePalette } = await import("./filePalette");
    expect(await collectFilePalette()).toEqual([]);
  });

  it("skips a node whose fills are mixed", async () => {
    stubFigma([{ id: "1:1", fills: FIGMA_MIXED }]);

    const { collectFilePalette } = await import("./filePalette");
    expect(await collectFilePalette()).toEqual([]);
  });

  it("ignores a fill type that is not solid", async () => {
    stubFigma([{ id: "1:1", fills: [{ type: "GRADIENT_LINEAR" }] }]);

    const { collectFilePalette } = await import("./filePalette");
    expect(await collectFilePalette()).toEqual([]);
  });
});
