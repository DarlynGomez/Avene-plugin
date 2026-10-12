import { MARKER_CATEGORY_LABEL, MARKER_TAG_KEY, parseTag } from "./markerTags";

/** The one muted red the typings allow, annotation categories only offer fixed colours */
const CATEGORY_COLOR = "red";

export async function findCategory(): Promise<AnnotationCategory | null> {
  const categories = await figma.annotations.getAnnotationCategoriesAsync();
  return categories.find((category) => category.label === MARKER_CATEGORY_LABEL) ?? null;
}

/** Every category id in the file, for telling a category that is gone from one that exists */
export async function listCategoryIds(): Promise<Set<string>> {
  const categories = await figma.annotations.getAnnotationCategoriesAsync();
  return new Set(categories.map((category) => category.id));
}

/** Created on first use, never twice */
export async function ensureCategory(): Promise<AnnotationCategory> {
  return (
    (await findCategory()) ??
    (await figma.annotations.addAnnotationCategoryAsync({
      label: MARKER_CATEGORY_LABEL,
      color: CATEGORY_COLOR
    }))
  );
}

function hasCadtAnnotation(node: SceneNode, categoryId: string): boolean {
  return "annotations" in node && node.annotations.some((a) => a.categoryId === categoryId);
}

/** Every layer that carries a CADT tag, from any user, found without walking the whole file */
export function findTaggedNodes(): SceneNode[] {
  return figma.root.findAllWithCriteria({
    pluginData: { keys: [MARKER_TAG_KEY] }
  }) as SceneNode[];
}

/**
 * Whether any layer still uses the category through a CADT tag, ours or another user's
 * Layers the plugin is about to clean are passed in so they do not count
 */
export function categoryInUse(categoryId: string, ignoring: ReadonlySet<string>): boolean {
  return findTaggedNodes().some(
    (node) =>
      !ignoring.has(node.id) &&
      parseTag(node.getPluginData(MARKER_TAG_KEY)) !== null &&
      hasCadtAnnotation(node, categoryId)
  );
}

/** Removes the category only when nothing, from any user, still uses it */
export function removeCategoryIfUnused(
  category: AnnotationCategory,
  ignoring: ReadonlySet<string> = new Set()
): boolean {
  if (categoryInUse(category.id, ignoring)) {
    return false;
  }
  category.remove();
  return true;
}
