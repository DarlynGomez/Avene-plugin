import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ISSUE_ID = "contrast:1:1";
const WHITE_PAGE = { type: "PAGE", backgrounds: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }] };

function textNode(overrides: Record<string, unknown> = {}) {
  return {
    id: "1:1",
    name: "Body copy",
    type: "TEXT",
    fontSize: 16,
    fontName: { family: "Inter", style: "Regular" },
    fontWeight: 400,
    fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }],
    opacity: 1,
    blendMode: "NORMAL",
    visible: true,
    parent: WHITE_PAGE,
    ...overrides
  };
}

function profileWithConsent(loggingConsent: boolean) {
  return {
    schemaVersion: 1,
    completedAt: "2026-09-08T00:00:00.000Z",
    loggingConsent,
    answers: {}
  };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isAdjustMessage", () => {
  it("accepts ADJUST_CLEAR_PREVIEW with no other fields", async () => {
    const { isAdjustMessage } = await import("./isAdjustMessage");
    expect(isAdjustMessage({ type: "ADJUST_CLEAR_PREVIEW" })).toBe(true);
  });

  it("requires a string issueId for ADJUST_OPTIONS_REQUEST", async () => {
    const { isAdjustMessage } = await import("./isAdjustMessage");
    expect(isAdjustMessage({ type: "ADJUST_OPTIONS_REQUEST", issueId: ISSUE_ID })).toBe(true);
    expect(isAdjustMessage({ type: "ADJUST_OPTIONS_REQUEST" })).toBe(false);
  });

  it("requires issueId, issueIds, and a color for ADJUST_PREVIEW", async () => {
    const { isAdjustMessage } = await import("./isAdjustMessage");
    expect(
      isAdjustMessage({
        type: "ADJUST_PREVIEW",
        issueId: ISSUE_ID,
        issueIds: [ISSUE_ID],
        color: { r: 0, g: 0, b: 0 }
      })
    ).toBe(true);
    expect(
      isAdjustMessage({ type: "ADJUST_PREVIEW", issueId: ISSUE_ID, color: { r: 0, g: 0, b: 0 } })
    ).toBe(false);
    expect(isAdjustMessage({ type: "ADJUST_PREVIEW", issueId: ISSUE_ID })).toBe(false);
  });

  it("requires issueId, issueIds, a color, option, and both session flags for ADJUST_APPLY", async () => {
    const { isAdjustMessage } = await import("./isAdjustMessage");
    const full = {
      type: "ADJUST_APPLY",
      issueId: ISSUE_ID,
      issueIds: [ISSUE_ID],
      color: { r: 0, g: 0, b: 0 },
      optionChosen: "a",
      wheelOpened: false,
      hexRejected: false
    };
    expect(isAdjustMessage(full)).toBe(true);
    expect(isAdjustMessage({ ...full, optionChosen: undefined })).toBe(false);
    expect(isAdjustMessage({ ...full, wheelOpened: undefined })).toBe(false);
  });

  it("requires issueId, issueIds, and both session flags for ADJUST_ABANDONED", async () => {
    const { isAdjustMessage } = await import("./isAdjustMessage");
    expect(
      isAdjustMessage({
        type: "ADJUST_ABANDONED",
        issueId: ISSUE_ID,
        issueIds: [ISSUE_ID],
        scope: "instances",
        wheelOpened: true,
        hexRejected: false
      })
    ).toBe(true);
    expect(isAdjustMessage({ type: "ADJUST_ABANDONED", issueId: ISSUE_ID })).toBe(false);
    expect(
      isAdjustMessage({
        type: "ADJUST_ABANDONED",
        issueId: ISSUE_ID,
        issueIds: [ISSUE_ID],
        wheelOpened: true,
        hexRejected: false
      })
    ).toBe(false);
  });

  it("rejects an unrecognized type and non-objects", async () => {
    const { isAdjustMessage } = await import("./isAdjustMessage");
    expect(isAdjustMessage({ type: "ISSUE_DEFER" })).toBe(false);
    expect(isAdjustMessage(null)).toBe(false);
  });
});

describe("handleAdjustMessage", () => {
  function stubFigma(node: ReturnType<typeof textNode>, loggingConsent: boolean | null = null) {
    const commitUndo = vi.fn();
    const getNodeByIdAsync = vi
      .fn()
      .mockImplementation(async (id: string) => (id === node.id ? node : null));
    const pluginData: Record<string, string> = {};
    if (loggingConsent !== null) {
      pluginData["cadt.calibration.profile"] = JSON.stringify(profileWithConsent(loggingConsent));
    }
    const getPluginData = vi.fn((key: string) => pluginData[key] ?? "");
    const setPluginData = vi.fn((key: string, value: string) => {
      pluginData[key] = value;
    });

    vi.stubGlobal("figma", {
      mixed: Symbol("figma.mixed"),
      getNodeByIdAsync,
      commitUndo,
      loadFontAsync: vi.fn().mockResolvedValue(undefined),
      variables: { getVariableByIdAsync: vi.fn() },
      getStyleByIdAsync: vi.fn(),
      root: { getPluginData, setPluginData },
      clientStorage: { getAsync: vi.fn().mockResolvedValue(undefined) },
      currentPage: {
        findAll: (predicate: (candidate: unknown) => boolean) => [node].filter(predicate),
        findAllWithCriteria: () => [node]
      },
      ui: { postMessage: vi.fn() }
    });
    return { commitUndo, getNodeByIdAsync, pluginData };
  }

  const APPLY_ARGS = {
    issueIds: [ISSUE_ID],
    optionChosen: "a" as const,
    wheelOpened: false,
    hexRejected: false
  };

  it("replies with the file palette and binding for ADJUST_OPTIONS_REQUEST", async () => {
    const node = textNode();
    stubFigma(node);
    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();

    await handleAdjustMessage({ type: "ADJUST_OPTIONS_REQUEST", issueId: ISSUE_ID }, reply);

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ADJUST_OPTIONS_READY",
        issueId: ISSUE_ID,
        variableScope: null
      })
    );
  });

  it("previews a passing color on the node and replies ADJUST_PREVIEWED", async () => {
    const node = textNode();
    stubFigma(node);
    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();

    await handleAdjustMessage(
      {
        type: "ADJUST_PREVIEW",
        issueId: ISSUE_ID,
        issueIds: [ISSUE_ID],
        color: { r: 0, g: 0, b: 0.2 }
      },
      reply
    );

    expect(node.fills).toEqual([{ type: "SOLID", color: { r: 0, g: 0, b: 0.2 }, opacity: 1 }]);
    expect(reply).toHaveBeenCalledWith({ type: "ADJUST_PREVIEWED", issueId: ISSUE_ID });
  });

  it("restores on clear and replies ADJUST_CLEARED", async () => {
    const node = textNode();
    stubFigma(node);
    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();

    await handleAdjustMessage(
      {
        type: "ADJUST_PREVIEW",
        issueId: ISSUE_ID,
        issueIds: [ISSUE_ID],
        color: { r: 0, g: 0, b: 0.2 }
      },
      reply
    );
    await handleAdjustMessage({ type: "ADJUST_CLEAR_PREVIEW" }, reply);

    expect(node.fills).toEqual([{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }]);
    expect(reply).toHaveBeenCalledWith({ type: "ADJUST_CLEARED" });
  });

  it("applies a passing color for real, writes nothing else, and commits one undo step", async () => {
    const node = textNode({ opacity: 1, visible: true });
    const { commitUndo } = stubFigma(node);
    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();

    await handleAdjustMessage(
      { type: "ADJUST_APPLY", issueId: ISSUE_ID, color: { r: 0, g: 0, b: 0.2 }, ...APPLY_ARGS },
      reply
    );

    expect(node.fills).toEqual([{ type: "SOLID", color: { r: 0, g: 0, b: 0.2 }, opacity: 1 }]);
    expect(node.opacity).toBe(1);
    expect(node.visible).toBe(true);
    expect(commitUndo).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith({ type: "ADJUST_APPLIED", issueId: ISSUE_ID });
  });

  it("refuses to apply a color that no longer meets the required ratio, and does not commit undo", async () => {
    const node = textNode();
    const { commitUndo } = stubFigma(node);
    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();

    const failingColor = { r: 0.9, g: 0.9, b: 0.9 }; // near white, fails against a white background
    await handleAdjustMessage(
      { type: "ADJUST_APPLY", issueId: ISSUE_ID, color: failingColor, ...APPLY_ARGS },
      reply
    );

    expect(node.fills).toEqual([{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }]);
    expect(commitUndo).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ADJUST_ACTION_FAILED", issueId: ISSUE_ID })
    );
  });

  it("replies with a failure when the node no longer exists", async () => {
    stubFigma(textNode());
    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();

    await handleAdjustMessage(
      {
        type: "ADJUST_PREVIEW",
        issueId: "contrast:gone",
        issueIds: ["contrast:gone"],
        color: { r: 0, g: 0, b: 0 }
      },
      reply
    );

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ADJUST_ACTION_FAILED", issueId: "contrast:gone" })
    );
  });

  describe("logging, per ADJUST_SPEC.md section 9", () => {
    it("records an apply with before and after colors and ratios when consent is true", async () => {
      const node = textNode();
      const { pluginData } = stubFigma(node, true);
      const { handleAdjustMessage } = await import("./adjustProtocol");

      await handleAdjustMessage(
        { type: "ADJUST_APPLY", issueId: ISSUE_ID, color: { r: 0, g: 0, b: 0.2 }, ...APPLY_ARGS },
        vi.fn()
      );

      const log = JSON.parse(pluginData["cadt.adjustLog.v1"]);
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({
        issueId: ISSUE_ID,
        optionChosen: "a",
        beforeHex: "#000000",
        afterHex: "#000033",
        abandoned: false
      });
      expect(log[0].beforeRatio).toBeGreaterThan(0);
      expect(log[0].afterRatio).toBeGreaterThan(0);
    });

    it("records nothing when logging consent is false", async () => {
      const node = textNode();
      const { pluginData } = stubFigma(node, false);
      const { handleAdjustMessage } = await import("./adjustProtocol");

      await handleAdjustMessage(
        { type: "ADJUST_APPLY", issueId: ISSUE_ID, color: { r: 0, g: 0, b: 0.2 }, ...APPLY_ARGS },
        vi.fn()
      );

      expect(pluginData["cadt.adjustLog.v1"]).toBeUndefined();
    });

    it("records nothing when no calibration profile exists at all", async () => {
      const node = textNode();
      const { pluginData } = stubFigma(node, null);
      const { handleAdjustMessage } = await import("./adjustProtocol");

      await handleAdjustMessage(
        { type: "ADJUST_APPLY", issueId: ISSUE_ID, color: { r: 0, g: 0, b: 0.2 }, ...APPLY_ARGS },
        vi.fn()
      );

      expect(pluginData["cadt.adjustLog.v1"]).toBeUndefined();
    });

    it("records an abandonment with no after color, wheelOpened, and hexRejected", async () => {
      const node = textNode();
      const { pluginData } = stubFigma(node, true);
      const { handleAdjustMessage } = await import("./adjustProtocol");

      await handleAdjustMessage(
        {
          type: "ADJUST_ABANDONED",
          issueId: ISSUE_ID,
          issueIds: [ISSUE_ID],
          scope: "variable",
          wheelOpened: true,
          hexRejected: true
        },
        vi.fn()
      );

      const log = JSON.parse(pluginData["cadt.adjustLog.v1"]);
      expect(log[0]).toMatchObject({
        issueId: ISSUE_ID,
        optionChosen: null,
        afterHex: null,
        afterRatio: null,
        abandoned: true,
        scope: "variable",
        wheelOpened: true,
        hexRejected: true
      });
    });

    it("logs the original color as before when an abandon arrives mid preview", async () => {
      const node = textNode();
      const { pluginData } = stubFigma(node, true);
      const { handleAdjustMessage } = await import("./adjustProtocol");

      await handleAdjustMessage(
        {
          type: "ADJUST_PREVIEW",
          issueId: ISSUE_ID,
          issueIds: [ISSUE_ID],
          color: { r: 0.5, g: 0.5, b: 0.5 }
        },
        vi.fn()
      );
      await handleAdjustMessage(
        {
          type: "ADJUST_ABANDONED",
          issueId: ISSUE_ID,
          issueIds: [ISSUE_ID],
          scope: "variable",
          wheelOpened: false,
          hexRejected: false
        },
        vi.fn()
      );

      const log = JSON.parse(pluginData["cadt.adjustLog.v1"]);
      expect(log[0].beforeHex).toBe("#000000");
    });

    it("logs the original color as before when apply follows a different preview", async () => {
      const node = textNode();
      const { pluginData } = stubFigma(node, true);
      const { handleAdjustMessage } = await import("./adjustProtocol");

      await handleAdjustMessage(
        {
          type: "ADJUST_PREVIEW",
          issueId: ISSUE_ID,
          issueIds: [ISSUE_ID],
          color: { r: 0.5, g: 0.5, b: 0.5 }
        },
        vi.fn()
      );
      await handleAdjustMessage(
        { type: "ADJUST_APPLY", issueId: ISSUE_ID, color: { r: 0, g: 0, b: 0.2 }, ...APPLY_ARGS },
        vi.fn()
      );

      const log = JSON.parse(pluginData["cadt.adjustLog.v1"]);
      expect(log[0].beforeHex).toBe("#000000");
    });

    it("sends no reply for ADJUST_ABANDONED", async () => {
      const node = textNode();
      stubFigma(node, true);
      const { handleAdjustMessage } = await import("./adjustProtocol");
      const reply = vi.fn();

      await handleAdjustMessage(
        {
          type: "ADJUST_ABANDONED",
          issueId: ISSUE_ID,
          issueIds: [ISSUE_ID],
          scope: "variable",
          wheelOpened: false,
          hexRejected: false
        },
        reply
      );

      expect(reply).not.toHaveBeenCalled();
    });
  });
});
