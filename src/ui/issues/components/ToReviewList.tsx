import { matchRootDecision } from "../../../shared/grouping/decisionMatch";
import type { DecisionMatch, Root, RootDecision } from "../../../shared/grouping/groupingTypes";
import type { RootSection } from "../../../shared/grouping/sectionRoots";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import { IgnoredTray } from "./IgnoredTray";
import { RootCard } from "./RootCard";
import styles from "./ToReviewList.module.css";

const EMPTY_SELECTION: ReadonlySet<string> = new Set();
const NO_OFFER: DecisionMatch = { offered: false, decision: null, reason: "no-match" };

interface ToReviewListProps {
  sections: readonly RootSection[];
  issuesById: ReadonlyMap<string, IssueSummary>;
  decisions: Readonly<Record<string, RootDecision>>;
  ignoredRoots: readonly Root[];
  onRestoreIgnored: (
    issueIds: readonly string[],
    signature: string,
    clearDecision: boolean
  ) => void;
  canAdjust: boolean;
  /** Both default to shown, the study session turns them off */
  showOffers?: boolean;
  showTray?: boolean;
  selectedInstances: Readonly<Record<string, ReadonlySet<string>>>;
  onToggleInstanceSelected: (signature: string, issueId: string) => void;
  onSelectAllInstances: (root: Root) => void;
  onShowOnCanvas: (root: Root) => void;
  onLocate: (issueId: string) => void;
  onAdjust: (signature: string) => void;
  onIgnore: (signature: string) => void;
  onDefer: (root: Root) => void;
  onToggleImportant: (root: Root) => void;
  onApplyDecisionOffer: (root: Root, decision: RootDecision) => void;
  onRestoreDeferred: (root: Root) => void;
}

/** Sectioned list, unsectioned for root cause grouping and headed sections otherwise */
export function ToReviewList(props: ToReviewListProps) {
  const { sections, issuesById, decisions } = props;

  if (sections.length === 0) {
    return (
      <div className={styles.sections}>
        <p className={styles.empty}>Nothing to review. Nice work.</p>
        {(props.showTray ?? true) && (
          <IgnoredTray
            roots={props.ignoredRoots}
            decisions={decisions}
            onRestore={props.onRestoreIgnored}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.sections}>
      {sections.map((section) => (
        <section key={section.key}>
          {section.label && <h3 className={styles.sectionLabel}>{section.label}</h3>}
          <ul className={styles.list}>
            {section.roots.map((root) => {
              // Ignored instances mean a decision still covers part of this root
              const decisionOffer =
                root.stateBreakdown.ignored || props.showOffers === false
                  ? NO_OFFER
                  : matchRootDecision(root, decisions);
              // A partly reopened root can still hold its old decision on some instances
              // The offer banner is for new matches, this note is for a decision already made on part of it
              const recordedReason =
                root.stateBreakdown.ignored && props.showOffers !== false
                  ? (decisions[root.signature]?.reason ?? null)
                  : null;
              return (
                <RootCard
                  key={root.signature}
                  root={root}
                  representativeIssue={issuesById.get(root.representativeIssueId)}
                  canAdjust={props.canAdjust}
                  decisionOffer={decisionOffer}
                  recordedReason={recordedReason}
                  selectedInstanceIds={props.selectedInstances[root.signature] ?? EMPTY_SELECTION}
                  onToggleInstanceSelected={(issueId) =>
                    props.onToggleInstanceSelected(root.signature, issueId)
                  }
                  onSelectAllInstances={() => props.onSelectAllInstances(root)}
                  onShowOnCanvas={() => props.onShowOnCanvas(root)}
                  onLocate={props.onLocate}
                  onAdjust={() => props.onAdjust(root.signature)}
                  onIgnore={() => props.onIgnore(root.signature)}
                  onDefer={() => props.onDefer(root)}
                  onToggleImportant={() => props.onToggleImportant(root)}
                  onApplyDecisionOffer={() =>
                    decisionOffer.decision &&
                    props.onApplyDecisionOffer(root, decisionOffer.decision)
                  }
                  onRestoreDeferred={() => props.onRestoreDeferred(root)}
                />
              );
            })}
          </ul>
        </section>
      ))}
      {(props.showTray ?? true) && (
        <IgnoredTray
          roots={props.ignoredRoots}
          decisions={decisions}
          onRestore={props.onRestoreIgnored}
        />
      )}
    </div>
  );
}
