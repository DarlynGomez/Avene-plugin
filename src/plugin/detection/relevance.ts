/**
 * Property names the rules care about, as plain strings
 * Fills, text, font, visibility, opacity and parent, a reparent can change the background
 * Moves and resizes never trigger a rescan
 */
const RELEVANT_PROPERTIES = new Set<string>([
  "fills",
  "characters",
  "fontSize",
  "fontName",
  "visible",
  "opacity",
  "parent"
]);

/** Whether a PROPERTY_CHANGE naming these properties should trigger a rescan */
export function isRelevantPropertyChange(changedProperties: readonly string[]): boolean {
  return changedProperties.some((property) => RELEVANT_PROPERTIES.has(property));
}

const PAINT_PROPERTIES = new Set<string>(["fills", "visible", "opacity", "parent"]);
const MOVE_PROPERTIES = new Set<string>(["x", "y", "width", "height", "relativeTransform"]);

/** Whether the change alters what a layer paints, which the text on or in it has to be measured against */
export function isPaintChange(changedProperties: readonly string[]): boolean {
  return changedProperties.some((property) => PAINT_PROPERTIES.has(property));
}

/** A text that was moved or resized may now sit on something else, other layers moving never rescan */
export function isTextMove(changedProperties: readonly string[]): boolean {
  return changedProperties.some((property) => MOVE_PROPERTIES.has(property));
}
