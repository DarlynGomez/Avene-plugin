import { useCallback, useState } from "react";

import type { Root } from "../../../shared/grouping/groupingTypes";

/** Count shown on the canvas banner and its two actions */
export function useSelectionBanner(
  showOnCanvas: (nodeIds: string[], signature?: string) => void,
  restoreSelection: () => void
) {
  const [showingCount, setShowingCount] = useState<number | null>(null);

  const show = useCallback(
    (root: Root) => {
      showOnCanvas(
        root.instances.map((instance) => instance.nodeId),
        root.signature
      );
      setShowingCount(root.instances.length);
    },
    [showOnCanvas]
  );

  const restore = useCallback(() => {
    restoreSelection();
    setShowingCount(null);
  }, [restoreSelection]);

  return { showingCount, show, restore };
}
