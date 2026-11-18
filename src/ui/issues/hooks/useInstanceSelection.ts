import { useCallback, useEffect, useState } from "react";

import { pruneSelections, selectionWithin } from "../../../shared/grouping/instanceScope";
import type { Root } from "../../../shared/grouping/groupingTypes";

function instanceIds(root: Root): string[] {
  return root.instances.map((instance) => instance.issueId);
}

/**
 * Checked instances per root for adjust, keyed by signature, nothing pre selected
 * A tick on an instance that leaves its root, a fixed one, is dropped so it never comes back
 */
export function useInstanceSelection(roots: readonly Root[]) {
  const [selectedInstances, setSelectedInstances] = useState<
    Readonly<Record<string, ReadonlySet<string>>>
  >({});

  useEffect(() => {
    setSelectedInstances((prev) => pruneSelections(prev, roots));
  }, [roots]);

  const toggleInstanceSelected = useCallback((signature: string, issueId: string) => {
    setSelectedInstances((prev) => {
      const current = new Set(prev[signature] ?? []);
      if (current.has(issueId)) {
        current.delete(issueId);
      } else {
        current.add(issueId);
      }
      return { ...prev, [signature]: current };
    });
  }, []);

  const selectAllInstances = useCallback((root: Root) => {
    setSelectedInstances((prev) => {
      const current = selectionWithin(prev[root.signature] ?? new Set<string>(), root);
      const allSelected = current.size === root.instances.length && root.instances.length > 0;
      return {
        ...prev,
        [root.signature]: allSelected ? new Set<string>() : new Set(instanceIds(root))
      };
    });
  }, []);

  return { selectedInstances, toggleInstanceSelected, selectAllInstances };
}
