export interface MarkerLabelInput {
  measuredRatio: number;
  requiredRatio: number;
  /** The root is important, said in words because colour never carries it */
  important: boolean;
  /** Open and important instances of the root on this screen */
  layersHere: number;
}

/** Cut, never rounded up, so a failing ratio can not read as passing */
function floorTwo(value: number): string {
  return (Math.floor(value * 100 + 1e-9) / 100).toFixed(2);
}

/** 4.5 and 3, without a trailing zero */
function trimmed(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** A short neutral measurement for the canvas, nothing that reads as an error */
export function markerLabel(input: MarkerLabelInput): string {
  const measurement = `Contrast ${floorTwo(input.measuredRatio)}, needs ${trimmed(input.requiredRatio)}`;
  const layers = input.layersHere > 1 ? `. ${input.layersHere} layers here` : "";
  return `${input.important ? "Important. " : ""}${measurement}${layers}`;
}
