import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isPaintChange, isRelevantPropertyChange, isTextMove } from "../detection/relevance";
import { scanAndSync } from "./scanAndSync";

vi.mock("./scanAndSync", () => ({ scanAndSync: vi.fn() }));
vi.mock("../detection/adapter/dependentTexts", () => ({ dependentTextIds: () => [] }));

describe("an annotation change on a layer", () => {
  let handler: ((event: { documentChanges: unknown[] }) => void) | undefined;

  beforeEach(() => {
    handler = undefined;
    vi.mocked(scanAndSync).mockClear();
    vi.useFakeTimers();
    vi.stubGlobal("figma", {
      on: (name: string, fn: typeof handler) => {
        if (name === "documentchange") handler = fn;
      }
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("is not a property any rule reads, a paint change or a move", () => {
    expect(isRelevantPropertyChange(["annotations"])).toBe(false);
    expect(isPaintChange(["annotations"])).toBe(false);
    expect(isTextMove(["annotations"])).toBe(false);
  });

  it.each(["TEXT", "RECTANGLE", "INSTANCE", "FRAME"])(
    "triggers no rescan on a %s",
    async (type) => {
      const { registerDocumentChangeListener } = await import("./listeners");
      registerDocumentChangeListener();
      const node = { type, removed: false };
      handler?.({
        documentChanges: [{ type: "PROPERTY_CHANGE", id: "1:1", node, properties: ["annotations"] }]
      });
      await vi.advanceTimersByTimeAsync(500);
      expect(scanAndSync).not.toHaveBeenCalled();
    }
  );
});
