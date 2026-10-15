/** One text node of a screen, as the census sees it */
export interface ScreenTextEntry {
  fontSizePx: number | null;
  charCount: number;
}

/**
 * Everything the rules read about one text node, plain data from the snapshot adapter
 * The characters themselves never leave the adapter, only their counts
 */
export interface RoleInputs {
  fontSizePx: number | null;
  /** Null when the weight is mixed */
  fontWeight: number | null;
  charCount: number;
  wordCount: number;
  layerName: string;
  /** Only a layer where this is false has a name the designer chose */
  autoRename: boolean;
  parentName: string | null;
  /** Nearest first, at most three, ending at the screen frame */
  ancestorNames: readonly string[];
  componentName: string | null;
  parentWidth: number | null;
  parentHeight: number | null;
  parentHasSolidFill: boolean;
  textWidth: number;
  centerXFraction: number | null;
  centerYFraction: number | null;
  /** Every text node on the same screen, the node itself included */
  screenTextCensus: readonly ScreenTextEntry[];
}
