import type { ChainLayer, PaintLayer } from "../colorResolution";

const NORMAL_BLEND_MODE = "NORMAL";

/** The part of a node this file reads, not every node has fills */
interface PartialPaintNode {
  fills?: ReadonlyArray<Paint> | typeof figma.mixed;
  opacity?: number;
  blendMode?: BlendMode;
  visible?: boolean;
  effects?: ReadonlyArray<Effect>;
}

const PASSING_BLEND_MODES = new Set(["NORMAL", "PASS_THROUGH"]);
const BLUR_EFFECTS = new Set(["LAYER_BLUR", "BACKGROUND_BLUR"]);

/**
 * What makes a surface more than one plain opaque color, beyond what the layer already says
 * More than one visible fill shows the top one over the others, a blend mode on a fill mixes it with what is below,
 * and a blur changes what is seen through the shape, none of these are measured here, they are only named
 */
function notPlainReasons(
  fills: ReadonlyArray<Paint> | typeof figma.mixed | undefined,
  effects: ReadonlyArray<Effect> | undefined
): string[] {
  const reasons: string[] = [];
  if (fills !== undefined && fills !== figma.mixed) {
    const visible = fills.filter((fill) => fill.visible !== false);
    if (visible.length > 1) reasons.push("multiple-visible-fills");
    if (visible.some((fill) => !PASSING_BLEND_MODES.has(fill.blendMode ?? "NORMAL"))) {
      reasons.push("blend-mode");
    }
  }
  if ((effects ?? []).some((effect) => effect.visible !== false && BLUR_EFFECTS.has(effect.type))) {
    reasons.push("blur-effect");
  }
  return reasons;
}

function classifyFill(fills: ReadonlyArray<Paint> | typeof figma.mixed): PaintLayer | "mixed" {
  if (fills === figma.mixed) {
    return "mixed";
  }
  const visible = fills.find((fill) => fill.visible !== false);
  if (!visible) {
    return { kind: "empty" };
  }
  if (visible.type !== "SOLID") {
    return { kind: "unresolvable" };
  }
  return {
    kind: "solid",
    color: { r: visible.color.r, g: visible.color.g, b: visible.color.b },
    opacity: visible.opacity ?? 1
  };
}

/**
 * Reduces any node in the ancestor walk to a plain layer
 * Nodes without fills such as groups count as unpainted so the walk continues
 */
export function extractNodeLayer(node: BaseNode): ChainLayer {
  const partial = node as PartialPaintNode;
  return {
    fill: partial.fills !== undefined ? classifyFill(partial.fills) : { kind: "empty" },
    nodeOpacity: partial.opacity ?? 1,
    blendMode: partial.blendMode ?? NORMAL_BLEND_MODE,
    visible: partial.visible ?? true,
    source: { kind: "node", nodeId: node.id, nodeName: node.name }
  };
}

/**
 * A node read as something the text sits on, a shape behind it or a container around it
 * The same as any layer, plus the reasons it is not a plain opaque color, which the text itself is not held to
 */
export function extractBackgroundLayer(node: BaseNode): ChainLayer {
  const partial = node as PartialPaintNode;
  const layer = extractNodeLayer(node);
  const notPlain = notPlainReasons(partial.fills, partial.effects);
  return notPlain.length > 0 ? { ...layer, notPlain } : layer;
}

/** The page background is the final fallback and is read from backgrounds not fills */
export function extractPageBackgroundLayer(page: PageNode): ChainLayer {
  const notPlain = notPlainReasons(page.backgrounds, undefined);
  return {
    fill: classifyFill(page.backgrounds),
    nodeOpacity: 1,
    blendMode: NORMAL_BLEND_MODE,
    visible: true,
    source: { kind: "page" },
    ...(notPlain.length > 0 ? { notPlain } : {})
  };
}
