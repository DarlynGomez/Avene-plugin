import { Eye } from "lucide-react";

import type { GroupableFinding } from "../../../shared/grouping/groupingTypes";
import { InstanceRow } from "./InstanceRow";
import styles from "./InstanceList.module.css";

interface InstanceListProps {
  instances: readonly GroupableFinding[];
  representativeIssueId: string;
  selectedIds: ReadonlySet<string>;
  onToggleSelected: (issueId: string) => void;
  onSelectAll: () => void;
  onShowOnCanvas: () => void;
  onLocate: (issueId: string) => void;
}

/** The representative goes first, the rest keep their order */
function representativeFirst(
  instances: readonly GroupableFinding[],
  representativeIssueId: string
): GroupableFinding[] {
  const representative = instances.find((i) => i.issueId === representativeIssueId);
  if (!representative) {
    return [...instances];
  }
  return [representative, ...instances.filter((i) => i.issueId !== representativeIssueId)];
}

/**
 * Nothing is pre selected and the list scrolls inside a fixed height so long lists stay light
 * The representative sorts first and reads Current, it is the one a single adjust targets
 */
export function InstanceList({
  instances,
  representativeIssueId,
  selectedIds,
  onToggleSelected,
  onSelectAll,
  onShowOnCanvas,
  onLocate
}: InstanceListProps) {
  const ordered = representativeFirst(instances, representativeIssueId);
  const allSelected = selectedIds.size === instances.length && instances.length > 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <span className={styles.count}>
          {selectedIds.size} of {instances.length} selected for Adjust
        </span>
        <div className={styles.toolbarActions}>
          <button type="button" className={styles.toolbarButton} onClick={onShowOnCanvas}>
            <Eye size={12} aria-hidden="true" />
            <span>
              Focus {instances.length} {instances.length === 1 ? "layer" : "layers"}
            </span>
          </button>
          <button type="button" className={styles.toolbarButton} onClick={onSelectAll}>
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
      </div>

      <ul className={styles.list}>
        {ordered.map((instance) => (
          <InstanceRow
            key={instance.issueId}
            instance={instance}
            isCurrent={instance.issueId === representativeIssueId}
            selected={selectedIds.has(instance.issueId)}
            onToggleSelected={() => onToggleSelected(instance.issueId)}
            onLocate={() => onLocate(instance.issueId)}
          />
        ))}
      </ul>
    </div>
  );
}
