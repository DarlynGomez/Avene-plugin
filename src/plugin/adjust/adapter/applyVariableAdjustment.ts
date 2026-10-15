import { contrastRatio } from "../../../shared/colour/contrastRatio";
import { rgbToHex } from "../../../shared/colour/colorHex";
import type { AdjustOptionChoice } from "../../../shared/adjustMessageTypes";
import type { RGBColor } from "../../../shared/issues/issueTypes";
import { logAdjustEvent } from "./adjustLogging";
import { captureAdjustLogState } from "./adjustLogCapture";
import { restorePreview } from "./previewState";

export interface ApplyVariableAdjustmentResult {
  ok: boolean;
  reason?: string;
}

function withPreservedAlpha(current: VariableValue | undefined, color: RGBColor): RGBA | RGB {
  if (current && typeof current === "object" && "a" in current) {
    return { ...color, a: current.a };
  }
  return color;
}

/**
 * Writes the colour to the variable for the current mode so every consumer changes
 * The consequence was already shown, so only the representative is rechecked
 * Restore the preview first, it detaches the binding and this layer would miss the write
 */
export async function applyVariableAdjustment(
  representative: TextNode,
  variable: Variable,
  modeId: string,
  issueId: string,
  color: RGBColor,
  optionChosen: AdjustOptionChoice,
  wheelOpened: boolean,
  hexRejected: boolean,
  consumerCount: number
): Promise<ApplyVariableAdjustmentResult> {
  const before = await captureAdjustLogState(representative);
  if (!before) {
    return { ok: false, reason: "That node's contrast can no longer be evaluated." };
  }
  if (contrastRatio(color, before.background) < before.requiredRatio) {
    return { ok: false, reason: "That color no longer meets the required contrast ratio." };
  }

  await restorePreview();
  variable.setValueForMode(modeId, withPreservedAlpha(variable.valuesByMode[modeId], color));
  figma.commitUndo();

  await logAdjustEvent({
    issueId,
    optionChosen,
    beforeHex: before.hex,
    beforeRatio: before.ratio,
    afterHex: rgbToHex(color),
    afterRatio: contrastRatio(color, before.background),
    wasBound: true,
    wheelOpened,
    hexRejected,
    abandoned: false,
    scope: "variable",
    instanceCount: consumerCount,
    loggedAt: new Date().toISOString()
  });

  return { ok: true };
}
