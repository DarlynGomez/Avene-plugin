import { ALT_CATEGORY_LABEL } from "../../../shared/handoff/alt/annotationText";

/** The category's color, one of the few the typings allow, any other than the markers' red */
const CATEGORY_COLOR = "teal";

/** The id of our category, found by its own label and never the marker category, null when it is not there */
export async function findAltCategoryId(): Promise<string | null> {
  const categories = await figma.annotations.getAnnotationCategoriesAsync();
  return categories.find((category) => category.label === ALT_CATEGORY_LABEL)?.id ?? null;
}

/** Looked up every time, so one the designer deleted is made again; the marker category is not touched here */
export async function ensureAltCategory(): Promise<string> {
  const existing = await findAltCategoryId();
  if (existing !== null) return existing;
  const made = await figma.annotations.addAnnotationCategoryAsync({
    label: ALT_CATEGORY_LABEL,
    color: CATEGORY_COLOR
  });
  return made.id;
}
