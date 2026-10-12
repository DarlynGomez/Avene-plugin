import type { Root, RootDecision } from "../../../shared/grouping/groupingTypes";
import type { GroupBy, RootSection } from "../../../shared/grouping/sectionRoots";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import type { ParticipantVisibility } from "../../../shared/study/participantVisibility";
import type { ActionError } from "../hooks/useIssues";
import { useMarkerSignals } from "../hooks/useMarkerSignals";
import { DecisionsView } from "./DecisionsView";
import { FilterBar, type FilterCounts, type StateFilter } from "./FilterBar";
import styles from "./LiveWatchBody.module.css";
import { ToReviewList } from "./ToReviewList";

export type BodyVisibility = Pick<
  ParticipantVisibility,
  "filterAndGrouping" | "issueList" | "ignoredTrayAndDecisions" | "decisionOffers"
>;

interface LiveWatchBodyProps {
  visibility: BodyVisibility;
  actionError: ActionError | null;
  stateFilter: StateFilter;
  onStateFilterChange: (filter: StateFilter) => void;
  counts: FilterCounts;
  filteredSections: readonly RootSection[];
  decisionRoots: readonly Root[];
  groupBy: GroupBy;
  onGroupByChange: (groupBy: GroupBy) => void;
  issuesById: ReadonlyMap<string, IssueSummary>;
  decisions: Readonly<Record<string, RootDecision>>;
  canAdjust: boolean;
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
  onReopen: (issueIds: readonly string[], signature: string, clearDecision: boolean) => void;
}

/** Body of the Live Watch tab, error, filters and the active list */
export function LiveWatchBody(props: LiveWatchBodyProps) {
  const { notice } = useMarkerSignals();

  return (
    <>
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {props.actionError && (
        <p role="alert" className={styles.error}>
          {props.actionError.message}
        </p>
      )}
      {props.visibility.filterAndGrouping && (
        <FilterBar
          groupBy={props.groupBy}
          onGroupByChange={props.onGroupByChange}
          stateFilter={props.stateFilter}
          onStateFilterChange={props.onStateFilterChange}
          counts={props.counts}
        />
      )}
      {!props.visibility.issueList ? null : props.stateFilter === "ignored" &&
        props.visibility.ignoredTrayAndDecisions ? (
        <DecisionsView
          roots={props.decisionRoots}
          decisions={props.decisions}
          issuesById={props.issuesById}
          onReopen={props.onReopen}
        />
      ) : (
        <ToReviewList
          sections={props.filteredSections}
          issuesById={props.issuesById}
          decisions={props.decisions}
          ignoredRoots={props.decisionRoots.filter((root) => root.stateBreakdown.ignored)}
          onRestoreIgnored={props.onReopen}
          showOffers={props.visibility.decisionOffers}
          showTray={props.visibility.ignoredTrayAndDecisions}
          canAdjust={props.canAdjust}
          selectedInstances={props.selectedInstances}
          onToggleInstanceSelected={props.onToggleInstanceSelected}
          onSelectAllInstances={props.onSelectAllInstances}
          onShowOnCanvas={props.onShowOnCanvas}
          onLocate={props.onLocate}
          onAdjust={props.onAdjust}
          onIgnore={props.onIgnore}
          onDefer={props.onDefer}
          onToggleImportant={props.onToggleImportant}
          onApplyDecisionOffer={props.onApplyDecisionOffer}
          onRestoreDeferred={props.onRestoreDeferred}
        />
      )}
    </>
  );
}
