/** The looks the renderer can draw, a dot is the one in use and the other two are kept, unused */
export type MarkerStyle = "annotation" | "dot" | "ring";

export const MARKER_STYLES: readonly MarkerStyle[] = ["annotation", "dot", "ring"];

/**
 * The one look markers are drawn in, for everyone and in a study session alike
 * Chosen after comparing the three in development, and changing this line is all it takes to go back
 * to the annotation with no text or to the ring, both of which are still in the code
 */
export const MARKER_STYLE: MarkerStyle = "dot";
