import type { Root } from "../../shared/grouping/groupingTypes";

/** How a root is named on its card and in the explanation, foreground on background */
export function rootName(root: Root, representativeBackgroundBinding: string | null): string {
  const fg = root.foregroundBinding ?? root.foregroundHex;
  const bg = representativeBackgroundBinding ?? root.backgroundHex;
  return `${fg} on ${bg}`;
}
