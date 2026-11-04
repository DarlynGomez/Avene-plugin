import type { FocusItem } from "./types";

export function item(over: Partial<FocusItem> = {}): FocusItem {
  return {
    signature: "#9CB5B1|#FFFFFF|sage/muted|4.5",
    name: "sage/muted on white",
    measuredRatio: 2.1799,
    requiredRatio: 4.5,
    foregroundHex: "#9CB5B1",
    backgroundHex: "#FFFFFF",
    binding: "sage/muted",
    ancestor: "Main Card",
    layers: 101,
    deferCount: 3,
    nodeId: "12:34",
    ...over
  };
}

export const FILE_URL = "https://www.figma.com/design/KEY/Checkout";
