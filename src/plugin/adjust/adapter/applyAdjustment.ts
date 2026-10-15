import { contrastRatio } from "../../../shared/colour/contrastRatio";
import { rgbToHex } from "../../../shared/colour/colorHex";
import type { AdjustOptionChoice } from "../../../shared/adjustMessageTypes";
import type { RGBColor } from "../../../shared/issues/issueTypes";
import { logAdjustEvent } from "./adjustLogging";
import { solidFill } from "./paintWriter";
import { applyFill, restorePreview } from "./previewState";
import { captureAdjustLogState } from "./adjustLogCapture";

export interface ApplyAdjustmentResult {
  ok: boolean;
  reason?: string;
}

/** Checks the colour, writes every node in scope, commits one undo step and logs once */
export async function applyAdjustment(
  nodes: readonly TextNode[],
  issueId: string,
  color: RGBColor,
  optionChosen: AdjustOptionChoice,
  wheelOpened: boolean,
  hexRejected: boolean
): Promise<ApplyAdjustmentResult> {
  const before = await captureAdjustLogState(nodes[0]);
  if (!before) {
    return { ok: false, reason: "That node's contrast can no longer be evaluated." };
  }
  if (contrastRatio(color, before.background) < before.requiredRatio) {
    await restorePreview();
    return { ok: false, reason: "That color no longer meets the required contrast ratio." };
  }

  await Promise.all(nodes.map((node) => applyFill(node, solidFill(color))));
  figma.commitUndo();

  await logAdjustEvent({
    issueId,
    optionChosen,
    beforeHex: before.hex,
    beforeRatio: before.ratio,
    afterHex: rgbToHex(color),
    afterRatio: contrastRatio(color, before.background),
    wasBound: before.bound,
    wheelOpened,
    hexRejected,
    abandoned: false,
    scope: "instances",
    instanceCount: nodes.length,
    loggedAt: new Date().toISOString()
  });

  return { ok: true };
}
