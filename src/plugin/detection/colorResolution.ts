import type { BackgroundSource, RGBColor } from "../../shared/issues/issueTypes";

/** One node paint reduced to what resolution needs */
export type PaintLayer =
  | { kind: "solid"; color: RGBColor; opacity: number }
  | { kind: "unresolvable" } // a gradient, image, or video: opaque, but not a single color
  | { kind: "empty" }; // no paint at all, the walk continues past it

/** One node in the chain from the text node itself up through its ancestors to the page */
export interface ChainLayer {
  fill: PaintLayer | "mixed";
  nodeOpacity: number;
  blendMode: string;
  visible: boolean;
  /** Which layer this is, so a resolved background can name its source */
  source: BackgroundSource;
  /** Why this layer is not a plain opaque color even if its first fill is one, present only when something is */
  notPlain?: readonly string[];
}

export interface ColorResolutionResult {
  foreground: RGBColor | null;
  foregroundAlpha: number | null;
  background: RGBColor | null;
  backgroundAlpha: number | null;
  backgroundSource: BackgroundSource | null;
  indeterminateReasons: readonly string[];
}

interface ResolvedFill {
  color: RGBColor;
  alpha: number;
}

/**
 * Blend modes that do not change compositing, so they are not indeterminate
 * Frames and groups default to PASS_THROUGH, flagging that would hit nearly every frame
 */
const NON_BLOCKING_BLEND_MODES = new Set(["NORMAL", "PASS_THROUGH"]);

function checkLayerValidity(layer: ChainLayer, reasons: Set<string>): void {
  if (!layer.visible) {
    reasons.add("node-invisible");
  }
  if (layer.nodeOpacity < 1) {
    reasons.add("opacity-below-one");
  }
  if (!NON_BLOCKING_BLEND_MODES.has(layer.blendMode)) {
    reasons.add("blend-mode");
  }
  for (const reason of layer.notPlain ?? []) {
    reasons.add(reason);
  }
}

/** Resolves one layer fill to a colour and alpha, noting why it could not */
function resolveFill(fill: PaintLayer | "mixed", reasons: Set<string>): ResolvedFill | null {
  if (fill === "mixed") {
    reasons.add("fill-mixed");
    return null;
  }
  if (fill.kind === "unresolvable") {
    reasons.add("fill-unresolvable");
    return null;
  }
  if (fill.kind === "empty") {
    return null;
  }
  if (fill.opacity < 1) {
    reasons.add("opacity-below-one");
  }
  return { color: fill.color, alpha: fill.opacity };
}

/**
 * Resolves foreground and background from a plain chain, first entry is the text node
 * The rest are ancestors ending with the page background
 * Never guesses, any indeterminate reason blanks both colours
 */
export function resolveColors(chain: readonly ChainLayer[]): ColorResolutionResult {
  const [textLayer, ...ancestors] = chain;
  if (!textLayer) {
    return {
      foreground: null,
      foregroundAlpha: null,
      background: null,
      backgroundAlpha: null,
      backgroundSource: null,
      indeterminateReasons: ["missing-node-data"]
    };
  }

  const reasons = new Set<string>();
  checkLayerValidity(textLayer, reasons);
  const resolvedForeground = resolveFill(textLayer.fill, reasons);
  if (
    resolvedForeground === null &&
    textLayer.fill !== "mixed" &&
    textLayer.fill.kind === "empty"
  ) {
    reasons.add("no-foreground-fill");
  }

  let resolvedBackground: ResolvedFill | null = null;
  let backgroundSource: BackgroundSource | null = null;
  for (const layer of ancestors) {
    checkLayerValidity(layer, reasons);
    if (layer.fill !== "mixed" && layer.fill.kind === "empty") {
      continue;
    }
    resolvedBackground = resolveFill(layer.fill, reasons);
    backgroundSource = layer.source;
    break;
  }
  if (resolvedBackground === null) {
    reasons.add("no-background-resolved");
  }

  if (reasons.size > 0 || resolvedForeground === null || resolvedBackground === null) {
    return {
      foreground: null,
      foregroundAlpha: null,
      background: null,
      backgroundAlpha: null,
      backgroundSource: null,
      indeterminateReasons: Array.from(reasons)
    };
  }
  return {
    foreground: resolvedForeground.color,
    foregroundAlpha: resolvedForeground.alpha,
    background: resolvedBackground.color,
    backgroundAlpha: resolvedBackground.alpha,
    backgroundSource,
    indeterminateReasons: []
  };
}
