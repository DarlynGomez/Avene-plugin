export interface MarkerLabelInput {
  measuredRatio: number;
  requiredRatio: number;
  /** The root is important, said with a leading mark because colour never carries it */
  important: boolean;
  /** Open and important instances of the root on this screen */
  layersHere: number;
}

/** Every label markerLabel produces: 2.2, 2.2 x3, ! 2.2, ! 2.2 x3 */
export const MARKER_LABEL_PATTERN = /^(?:! )?\d+\.\d(?: x\d+)?$/;

/** The longer format an earlier build wrote, kept so leftovers of it can still be cleaned up */
export const LEGACY_MARKER_LABEL_PATTERN =
  /^(?:Important\. )?Contrast \d+\.\d{2}, needs [\d.]+(?:\. \d+ layers here)?$/;

/** Whether a label is one of ours, in the current or the earlier format */
export function isMarkerLabel(label: string): boolean {
  return MARKER_LABEL_PATTERN.test(label) || LEGACY_MARKER_LABEL_PATTERN.test(label);
}

/**
 * One decimal, rounded, except that a ratio still under what is needed is never shown as the
 * needed number, which would read as passing
 */
function oneDecimal(measured: number, required: number): string {
  const rounded = Math.round(measured * 10 + 1e-9) / 10;
  if (measured < required && rounded >= required) {
    return (Math.floor(measured * 10 + 1e-9) / 10).toFixed(1);
  }
  return rounded.toFixed(1);
}

/**
 * Figma sizes the callout from its label, so this is as small as a label gets
 * Markers say where to look, the panel card carries the measured and the required ratio
 */
export function markerLabel(input: MarkerLabelInput): string {
  const ratio = oneDecimal(input.measuredRatio, input.requiredRatio);
  const layers = input.layersHere > 1 ? ` x${input.layersHere}` : "";
  return `${input.important ? "! " : ""}${ratio}${layers}`;
}
