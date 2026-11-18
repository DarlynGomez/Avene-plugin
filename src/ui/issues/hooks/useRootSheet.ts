import { useCallback, useState } from "react";

import type { Root } from "../../../shared/grouping/groupingTypes";

export type RootSheetKind = "adjust" | "ignore";

export interface SheetTarget {
  signature: string;
  kind: RootSheetKind;
  /** The instances on the card Adjust was opened from, a section card holds only part of its root */
  issueIds?: ReadonlySet<string>;
}

/** Which root has an open adjust or ignore sheet, at most one */
export function useRootSheet() {
  const [sheet, setSheet] = useState<SheetTarget | null>(null);

  const openAdjust = useCallback((root: Root) => {
    const issueIds = new Set(root.instances.map((instance) => instance.issueId));
    setSheet({ signature: root.signature, kind: "adjust", issueIds });
  }, []);

  const openIgnore = useCallback((signature: string) => {
    setSheet({ signature, kind: "ignore" });
  }, []);

  const closeSheet = useCallback(() => setSheet(null), []);

  return { sheet, openAdjust, openIgnore, closeSheet };
}
