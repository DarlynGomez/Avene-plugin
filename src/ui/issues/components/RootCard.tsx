import { ChevronDown, ChevronRight, Plus } from "lucide-react";

import type { DecisionMatch, Root } from "../../../shared/grouping/groupingTypes";
import { readContrastEvidence } from "../../../shared/issues/contrastEvidenceView";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import { InstanceList } from "./InstanceList";
import { RootActionsArea } from "./RootActionsArea";
import styles from "./RootCard.module.css";
import { RootCardSummary } from "./RootCardSummary";

interface RootCardProps {
  root: Root;
  representativeIssue: IssueSummary | undefined;
  canAdjust: boolean;
  decisionOffer: DecisionMatch;
  recordedReason: string | null;
  selectedInstanceIds: ReadonlySet<string>;
  onToggleInstanceSelected: (issueId: string) => void;
  onSelectAllInstances: () => void;
  onShowOnCanvas: () => void;
  onLocate: (issueId: string) => void;
  onAdjust: () => void;
  onIgnore: () => void;
  onDefer: () => void;
  onToggleImportant: () => void;
  onApplyDecisionOffer: () => void;
  onRestoreDeferred: () => void;
}

export function RootCard({
  root,
  representativeIssue,
  canAdjust,
  decisionOffer,
  recordedReason,
  selectedInstanceIds,
  onToggleInstanceSelected,
  onSelectAllInstances,
  onShowOnCanvas,
  onLocate,
  onAdjust,
  onIgnore,
  onDefer,
  onToggleImportant,
  onApplyDecisionOffer,
  onRestoreDeferred
}: RootCardProps) {
  const representativeEvidence = representativeIssue
    ? readContrastEvidence(representativeIssue.ruleId, representativeIssue.evidence)
    : null;
  const isDeferred = root.displayState === "deferred";

  return (
    <li
      className={`${styles.card} ${isDeferred ? styles.deferred : ""}`}
      data-root-signature={root.signature}
    >
      {isDeferred && (
        <button
          type="button"
          className={styles.restoreButton}
          onClick={onRestoreDeferred}
          title="Bring back and re-enable this issue"
          aria-label="Bring back and re-enable this issue"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      )}
      <div className={isDeferred ? styles.dimmedContent : undefined}>
        <RootCardSummary
          root={root}
          representativeEvidence={representativeEvidence}
          recordedReason={recordedReason}
        />

        <RootActionsArea
          root={root}
          canAdjust={canAdjust}
          decisionOffer={decisionOffer}
          onAdjust={onAdjust}
          onIgnore={onIgnore}
          onDefer={onDefer}
          onToggleImportant={onToggleImportant}
          onApplyDecisionOffer={onApplyDecisionOffer}
        />

        {root.instances.length > 1 && (
          <details className={styles.instancesDisclosure}>
            <summary className={styles.summary}>
              <span className={styles.summaryLeft}>
                <ChevronRight className={styles.chevronClosed} size={16} aria-hidden="true" />
                <ChevronDown className={styles.chevronOpen} size={16} aria-hidden="true" />
                <span>Related grouped issues</span>
                <span className={styles.countBubble}>+{root.instances.length}</span>
              </span>
            </summary>
            <InstanceList
              instances={root.instances}
              representativeIssueId={root.representativeIssueId}
              selectedIds={selectedInstanceIds}
              onToggleSelected={onToggleInstanceSelected}
              onSelectAll={onSelectAllInstances}
              onShowOnCanvas={onShowOnCanvas}
              onLocate={onLocate}
            />
          </details>
        )}
      </div>
    </li>
  );
}
