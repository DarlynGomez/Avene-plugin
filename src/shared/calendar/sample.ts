import type { FocusItem } from "./types";

/** An invented finding for the test event, so the designer can see what a real one carries */
export const SAMPLE_ITEM: FocusItem = {
  signature: "sample",
  name: "text/muted on surface/card",
  measuredRatio: 2.17,
  requiredRatio: 4.5,
  foregroundHex: "#9CB5B1",
  backgroundHex: "#FFFFFF",
  binding: "text/muted",
  ancestor: "Page background",
  layers: 3,
  deferCount: 3,
  nodeId: "1:2"
};
