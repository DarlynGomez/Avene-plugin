import type { Root } from "../../../shared/grouping/groupingTypes";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import type { SheetTarget } from "../hooks/useRootSheet";
import { AdjustPopup } from "../adjust/AdjustPopup";
import { IgnoreSheet } from "./IgnoreSheet";
import { SheetOverlay } from "./SheetOverlay";

interface RootSheetHostProps {
  sheet: SheetTarget | null;
  /**
   * Every root that is not decided, ignoring the state filter
   * So an open sheet does not vanish when the filter changes
   */
  roots: readonly Root[];
  issuesById: ReadonlyMap<string, IssueSummary>;
  /** Keyed by root signature */
  selectedInstances: Readonly<Record<string, ReadonlySet<string>>>;
  aiAssistanceLevel: number | null;
  /** True when the block has ended, the adjust sheet then closes itself through Cancel */
  endAdjustRequested: boolean;
  onCloseAdjust: () => void;
  onCancelIgnore: () => void;
  onRecordIgnore: (root: Root, reason: string) => void;
}

/**
 * Renders the open sheet as one overlay over the whole panel, found by signature
 * A card lives in the scrolling list but the sheet must cover the panel
 */
export function RootSheetHost({
  sheet,
  roots,
  issuesById,
  selectedInstances,
  aiAssistanceLevel,
  endAdjustRequested,
  onCloseAdjust,
  onCancelIgnore,
  onRecordIgnore
}: RootSheetHostProps) {
  if (!sheet) {
    return null;
  }
  const root = roots.find((candidate) => candidate.signature === sheet.signature);
  if (!root) {
    return null;
  }

  if (sheet.kind === "adjust") {
    const representativeIssue = issuesById.get(root.representativeIssueId);
    if (!representativeIssue) {
      return null;
    }
    return (
      <SheetOverlay>
        <AdjustPopup
          root={root}
          representativeIssue={representativeIssue}
          selectedInstanceIds={selectedInstances[root.signature] ?? new Set()}
          aiAssistanceLevel={aiAssistanceLevel ?? 1}
          endRequested={endAdjustRequested}
          onClose={onCloseAdjust}
        />
      </SheetOverlay>
    );
  }

  return (
    <SheetOverlay>
      <IgnoreSheet
        instanceCount={root.instances.length}
        onRecord={(reason) => onRecordIgnore(root, reason)}
        onCancel={onCancelIgnore}
      />
    </SheetOverlay>
  );
}
