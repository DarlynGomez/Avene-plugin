import type { GroupBy } from "../../../shared/grouping/sectionRoots";
import styles from "./FilterBar.module.css";

export type StateFilter = "all" | "pinned" | "deferred" | "ignored";

export interface FilterCounts {
  all: number;
  pinned: number;
  deferred: number;
  ignored: number;
  /** Roots with a layer open and the issues in them, for the check dropdown */
  openRoots?: number;
  openIssues?: number;
}

const GROUP_BY_OPTIONS: readonly { value: GroupBy; label: string }[] = [
  { value: "root-cause", label: "Root cause" },
  { value: "screen", label: "Screen" },
  { value: "severity", label: "Severity" }
];

interface FilterBarProps {
  groupBy: GroupBy;
  onGroupByChange: (groupBy: GroupBy) => void;
  stateFilter: StateFilter;
  onStateFilterChange: (filter: StateFilter) => void;
  counts: FilterCounts;
}

/**
 * Grouping control on the left and state filter on the right
 * Ignored roots show in the decisions view because a decided root has nothing to act on
 */
export function FilterBar({
  groupBy,
  onGroupByChange,
  stateFilter,
  onStateFilterChange,
  counts
}: FilterBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.groupControl} role="radiogroup" aria-label="Group issues by">
        <span className={styles.groupLabel}>Group:</span>
        {GROUP_BY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={groupBy === option.value}
            className={`${styles.groupOption} ${
              groupBy === option.value ? styles.groupOptionActive : ""
            }`}
            onClick={() => onGroupByChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <select
        className={styles.stateFilter}
        aria-label="Filter issues"
        value={stateFilter}
        onChange={(event) => onStateFilterChange(event.target.value as StateFilter)}
      >
        <option value="all">View All ({counts.all})</option>
        <option value="pinned">Pinned ({counts.pinned})</option>
        <option value="deferred">Deferred ({counts.deferred})</option>
        <option value="ignored">Ignored ({counts.ignored})</option>
      </select>
    </div>
  );
}
