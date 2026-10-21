import { rgbToHex } from "../../shared/colour/colorHex";
import { contrastRatio } from "../../shared/colour/contrastRatio";
import type { TextRow } from "../../shared/debug/detectionReport";
import { snapshotTextNode } from "../detection/adapter/snapshot";
import { contrastRule } from "../detection/rules/contrast/contrastRule";
import {
  CONTRAST_THRESHOLD_LARGE_TEXT,
  CONTRAST_THRESHOLD_NORMAL_TEXT
} from "../detection/rules/contrast/thresholds";
import { classifyTextSize } from "../detection/rules/contrast/textSizeClass";

function describeFills(fills: unknown): string {
  if (fills === figma.mixed) return "mixed fills";
  if (!Array.isArray(fills) || fills.length === 0) return "no fill";
  return fills
    .map((paint: Paint) => {
      const shown = paint.visible === false ? " (hidden)" : "";
      return paint.type === "SOLID"
        ? `SOLID ${rgbToHex(paint.color)} opacity ${paint.opacity ?? 1}${shown}`
        : `${paint.type}${shown}`;
    })
    .join(" + ");
}

function describeLayer(node: BaseNode): string {
  const parts = [`${node.type} "${node.name}"`];
  const paint = node as Partial<GeometryMixin & BlendMixin & SceneNodeMixin>;
  parts.push(describeFills(paint.fills ?? []));
  if (paint.opacity !== undefined && paint.opacity < 1) parts.push(`opacity ${paint.opacity}`);
  if (paint.blendMode && !["NORMAL", "PASS_THROUGH"].includes(paint.blendMode))
    parts.push(`blend ${paint.blendMode}`);
  if (paint.visible === false) parts.push("HIDDEN");
  return parts.join(", ");
}

function chainOf(node: TextNode): string[] {
  const layers: string[] = [];
  for (
    let parent: BaseNode | null = node.parent;
    parent && parent.type !== "PAGE" && layers.length < 8;
    parent = parent.parent
  ) {
    layers.push(describeLayer(parent));
  }
  return layers;
}

/** The same snapshot and rule live detection uses, run here without saving anything */
export async function rowFor(node: TextNode): Promise<TextRow> {
  const snapshot = await snapshotTextNode(node);
  const finding = contrastRule.evaluate(snapshot);
  const { foreground, background, fontSizePx, isBold } = snapshot;
  const measured = foreground && background ? contrastRatio(foreground, background) : null;
  const sizeClass =
    fontSizePx !== null && isBold !== null ? classifyTextSize(fontSizePx, isBold) : null;
  const evaluated =
    snapshot.indeterminateReasons.length === 0 && measured !== null && sizeClass !== null;
  return {
    id: node.id,
    name: node.name,
    visible: node.visible,
    charCount: node.characters.length,
    fontSize: node.fontSize === figma.mixed ? "mixed" : String(node.fontSize),
    fontWeight: node.fontWeight === figma.mixed ? "mixed" : String(node.fontWeight),
    fontStyle: node.fontName === figma.mixed ? "mixed" : node.fontName.style,
    chain: chainOf(node),
    foreground: foreground
      ? `${rgbToHex(foreground)} alpha ${snapshot.foregroundAlpha}`
      : "not resolved",
    background: background
      ? `${rgbToHex(background)} alpha ${snapshot.backgroundAlpha}, from ${JSON.stringify(snapshot.backgroundSource)}`
      : "not resolved",
    indeterminate: [...snapshot.indeterminateReasons],
    sizeClass: sizeClass ?? "unknown",
    required:
      sizeClass === null
        ? null
        : sizeClass === "large"
          ? CONTRAST_THRESHOLD_LARGE_TEXT
          : CONTRAST_THRESHOLD_NORMAL_TEXT,
    measured,
    verdict: finding ? "flagged" : evaluated ? "passes" : "not evaluated"
  };
}
