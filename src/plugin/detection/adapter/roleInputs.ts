import type { RoleInputs, ScreenTextEntry } from "../../../shared/roles/roleInputs";
import { resolveScreen } from "./resolveScreen";

const MAX_ANCESTORS = 3;
const FRAME_TYPES: ReadonlySet<string> = new Set(["FRAME", "COMPONENT", "INSTANCE"]);

function textEntry(node: TextNode): ScreenTextEntry {
  return {
    fontSizePx: node.fontSize === figma.mixed ? null : node.fontSize,
    charCount: node.characters.length
  };
}

/** Every visible text node on the screen the node sits on, the node itself included, one scan per screen */
export async function buildScreenCensus(node: TextNode): Promise<ScreenTextEntry[]> {
  const { screenId } = resolveScreen(node);
  const screen = screenId === node.id ? null : await figma.getNodeByIdAsync(screenId);
  if (!screen || !("findAll" in screen)) return [textEntry(node)];
  const texts = screen.findAll((candidate) => candidate.type === "TEXT" && candidate.visible);
  return texts.map((candidate) => textEntry(candidate as TextNode));
}

/** Nearest first, stopping at the screen frame or after three */
function ancestorNamesOf(node: TextNode, screenId: string): string[] {
  const names: string[] = [];
  let current: BaseNode | null = node.parent;
  while (current && current.type !== "PAGE" && names.length < MAX_ANCESTORS) {
    names.push(current.name);
    if (current.id === screenId) break;
    current = current.parent;
  }
  return names;
}

/** The main component of the nearest instance above the node, a variant carrying its set's name */
async function componentNameOf(node: TextNode): Promise<string | null> {
  let current: BaseNode | null = node.parent;
  while (current && current.type !== "PAGE") {
    if (current.type === "INSTANCE") {
      const main = await current.getMainComponentAsync();
      if (!main) return null;
      const set = main.parent?.type === "COMPONENT_SET" ? main.parent.name : null;
      return set === null ? main.name : `${set} ${main.name}`;
    }
    current = current.parent;
  }
  return null;
}

function hasSolidFill(parent: BaseNode | null): boolean {
  if (!parent || !FRAME_TYPES.has(parent.type) || !("fills" in parent)) return false;
  const fills = parent.fills;
  return (
    fills !== figma.mixed &&
    fills.some(
      (paint) => paint.type === "SOLID" && paint.visible !== false && (paint.opacity ?? 1) > 0
    )
  );
}

function centerFractions(node: TextNode, screen: BaseNode | null) {
  const box = node.absoluteBoundingBox;
  const frame = screen && "absoluteBoundingBox" in screen ? screen.absoluteBoundingBox : null;
  if (!box || !frame || frame.width === 0 || frame.height === 0) {
    return { x: null, y: null };
  }
  return {
    x: (box.x + box.width / 2 - frame.x) / frame.width,
    y: (box.y + box.height / 2 - frame.y) / frame.height
  };
}

/**
 * The properties the role rules read, one of the few files that read Figma node properties
 * The census is passed in so a caller can build it once per screen and reuse it
 */
export async function snapshotRoleInputs(
  node: TextNode,
  census: readonly ScreenTextEntry[]
): Promise<RoleInputs> {
  const { screenId } = resolveScreen(node);
  const screen = screenId === node.id ? null : await figma.getNodeByIdAsync(screenId);
  const parent = node.parent && node.parent.type !== "PAGE" ? node.parent : null;
  const fractions = centerFractions(node, screen);
  const words = node.characters.split(/\s+/).filter((word) => word !== "");
  return {
    fontSizePx: node.fontSize === figma.mixed ? null : node.fontSize,
    fontWeight: node.fontWeight === figma.mixed ? null : node.fontWeight,
    charCount: node.characters.length,
    wordCount: words.length,
    layerName: node.name,
    autoRename: node.autoRename,
    parentName: parent ? parent.name : null,
    ancestorNames: ancestorNamesOf(node, screenId),
    componentName: await componentNameOf(node),
    parentWidth: parent && "width" in parent ? parent.width : null,
    parentHeight: parent && "height" in parent ? parent.height : null,
    parentHasSolidFill: hasSolidFill(parent),
    textWidth: node.width,
    centerXFraction: fractions.x,
    centerYFraction: fractions.y,
    screenTextCensus: census
  };
}
