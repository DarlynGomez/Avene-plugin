import { Header } from "./components/Header";
import { LiveWatchBody } from "./components/LiveWatchBody";
import { RootSheetHost } from "./components/RootSheetHost";
import { SelectionBanner } from "./components/SelectionBanner";
import { useEscapePrecedence } from "./hooks/useEscapePrecedence";
import { useInstanceSelection } from "./hooks/useInstanceSelection";
import { useIssues } from "./hooks/useIssues";
import { useMainTabs } from "./hooks/useMainTabs";
import { useSheetGating } from "./hooks/useSheetGating";
import { ExplanationLinkContext } from "./teachMeWhy/ExplanationLinkContext";
import { TeachMeWhyTab } from "./teachMeWhy/TeachMeWhyTab";
import { StudyMessagePanel } from "../study/StudyMessagePanel";
import { useParticipantVisibility } from "../study/useParticipantVisibility";
import { usePanelView } from "./hooks/usePanelView";
import { instanceIds, useRootHandlers } from "./hooks/useRootHandlers";
import { useRootSheet } from "./hooks/useRootSheet";
import { useSelectionBanner } from "./hooks/useSelectionBanner";
import styles from "./IssuePanel.module.css";

interface IssuePanelProps {
  /**
   * The raw 1 to 4 answer for how much CADT should do on its own
   * Null when no profile is loaded, which gates the Adjust control on each card
   */
  aiAssistanceLevel: number | null;
}

/**
 * The issue panel, owns filter and grouping choice
 * Selection, sheet and banner state live in their own hooks
 */
export function IssuePanel({ aiAssistanceLevel }: IssuePanelProps) {
  const {
    issues,
    decisions,
    loading,
    actionError,
    focusIssue,
    deferRoot,
    markRootImportant,
    unmarkRootImportant,
    ignoreRoot,
    reopenRoot,
    restoreDeferredRoot,
    showOnCanvas,
    restoreSelection
  } = useIssues();

  const visibility = useParticipantVisibility();
  const { selectedInstances, toggleInstanceSelected, selectAllInstances } = useInstanceSelection();
  const { sheet, openAdjust, openIgnore, closeSheet } = useRootSheet();
  const {
    showingCount,
    show: showRootOnCanvas,
    restore: restoreShownSelection
  } = useSelectionBanner(showOnCanvas, restoreSelection);

  const view = usePanelView(issues, decisions);
  const canAdjust = (aiAssistanceLevel ?? 1) >= 2 && visibility.adjustSheet;
  const { endAdjustRequested } = useSheetGating(visibility, sheet, closeSheet);
  const tabs = useMainTabs(visibility, view.reviewRoots, view.decisionRoots);

  useEscapePrecedence(sheet, closeSheet, showingCount, restoreShownSelection);
  const { handleToggleImportant, handleApplyDecisionOffer, handleRecordIgnore } = useRootHandlers({
    markRootImportant,
    unmarkRootImportant,
    ignoreRoot,
    closeSheet
  });

  const sheets = (
    <RootSheetHost
      sheet={sheet}
      roots={view.reviewRoots}
      issuesById={view.issuesById}
      selectedInstances={selectedInstances}
      aiAssistanceLevel={aiAssistanceLevel}
      endAdjustRequested={endAdjustRequested}
      onCloseAdjust={closeSheet}
      onCancelIgnore={closeSheet}
      onRecordIgnore={handleRecordIgnore}
    />
  );

  // Feedback withheld or the block over, the hooks above keep collecting while this shows
  if (visibility.message !== null) {
    return (
      <>
        <StudyMessagePanel message={visibility.message} showWordmark={visibility.wordmark} />
        {sheets}
      </>
    );
  }

  if (loading) {
    return <p className={styles.status}>Loading issues...</p>;
  }

  return (
    <ExplanationLinkContext.Provider value={tabs.openExplanation}>
      <main className={styles.panel} aria-label="Accessibility issues">
        <Header
          visibility={visibility}
          headline={view.headline}
          activeMainTab={tabs.activeTab}
          onMainTabChange={tabs.onMainTabChange}
        />
        {showingCount !== null && visibility.showOnCanvas && (
          <SelectionBanner count={showingCount} onRestore={restoreShownSelection} />
        )}
        <div className={styles.scrollRegion}>
          {tabs.activeTab === "teach-me-why" ? (
            <TeachMeWhyTab state={tabs.teachMeWhy} />
          ) : (
            <LiveWatchBody
              visibility={visibility}
              actionError={actionError}
              stateFilter={view.stateFilter}
              onStateFilterChange={view.setStateFilter}
              counts={view.counts}
              filteredSections={view.filteredSections}
              decisionRoots={view.decisionRoots}
              groupBy={view.groupBy}
              onGroupByChange={view.setGroupBy}
              issuesById={view.issuesById}
              decisions={decisions}
              canAdjust={canAdjust}
              selectedInstances={selectedInstances}
              onToggleInstanceSelected={toggleInstanceSelected}
              onSelectAllInstances={selectAllInstances}
              onShowOnCanvas={showRootOnCanvas}
              onLocate={focusIssue}
              onAdjust={openAdjust}
              onIgnore={openIgnore}
              onDefer={(root) => deferRoot(instanceIds(root), root.signature)}
              onToggleImportant={handleToggleImportant}
              onApplyDecisionOffer={handleApplyDecisionOffer}
              onRestoreDeferred={(root) => restoreDeferredRoot(instanceIds(root), root.signature)}
              onReopen={reopenRoot}
            />
          )}
        </div>
        {sheets}
      </main>
    </ExplanationLinkContext.Provider>
  );
}
