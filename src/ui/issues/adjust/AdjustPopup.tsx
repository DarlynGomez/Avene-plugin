import type { Root } from "../../../shared/grouping/groupingTypes";
import { contrastRatio } from "../../../shared/colour/contrastRatio";
import { keepHue } from "../../../shared/colour/keepHue";
import { parseHex } from "../../../shared/colour/hexInput";
import { paletteMatch } from "../../../shared/colour/paletteMatch";
import {
  backgroundSourceName,
  readContrastEvidence
} from "../../../shared/issues/contrastEvidenceView";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import styles from "./AdjustPopup.module.css";
import { AdjustActions } from "./components/AdjustActions";
import { AdjustBody } from "./components/AdjustBody";
import { AdjustHeader } from "./components/AdjustHeader";
import { BindingNotice } from "./components/BindingNotice";
import { ScopeSection } from "./components/ScopeSection";
import { useAdjustMessages } from "./useAdjustMessages";
import { useEndRequest } from "./useEndRequest";
import { useAdjustSession } from "./useAdjustSession";
import { useAdjustVariableScope } from "./useAdjustVariableScope";

interface AdjustPopupProps {
  root: Root;
  representativeIssue: IssueSummary;
  /** Instances checked in the related issues list, if any */
  selectedInstanceIds: ReadonlySet<string>;
  /** The raw 1 to 4 calibration answer for how much CADT should do on its own */
  aiAssistanceLevel: number;
  /** Set when the study block ends, closes through the same path as Cancel */
  endRequested?: boolean;
  onClose: () => void;
}

/**
 * Three option cards, the third expands into the wheel, level 2 shows the wheel alone
 * Preview and apply use the checked instances, or just the representative
 */
export function AdjustPopup({
  root,
  representativeIssue: issue,
  selectedInstanceIds,
  aiAssistanceLevel,
  endRequested = false,
  onClose
}: AdjustPopupProps) {
  const evidence = readContrastEvidence(issue.ruleId, issue.evidence);
  const background = evidence ? parseHex(evidence.backgroundHex) : null;
  const current = evidence ? parseHex(evidence.foregroundHex) : null;
  const optionA =
    evidence && background && current ? keepHue(current, background, evidence.requiredRatio) : null;

  const scopeIds =
    selectedInstanceIds.size > 0 ? [...selectedInstanceIds] : [root.representativeIssueId];

  const { options, actionError, applied, preview, clearPreview, apply, abandon } =
    useAdjustMessages(issue.id);
  const { variableScope, variableConsequence, requestVariableConsequence, applyVariable } =
    useAdjustVariableScope(issue.id);
  const session = useAdjustSession({
    aiAssistanceLevel,
    optionA,
    scopeIds,
    applied,
    variableScope,
    preview,
    clearPreview,
    apply,
    abandon,
    requestVariableConsequence,
    applyVariable,
    onClose
  });

  useEndRequest(endRequested, session.handleCancel);

  const headline = `Adjust contrast for “${issue.nodeName}”`;

  if (!evidence || !background || !current || !optionA) {
    return (
      <div className={styles.popup}>
        <AdjustHeader title={headline} onClose={onClose} />
        <p className={styles.diagnostic}>
          This issue&rsquo;s contrast evidence could not be read, so there is nothing to adjust
          here. Close this and reopen it; if it keeps happening, the finding itself is stale and a
          rescan should clear it.
        </p>
      </div>
    );
  }

  const optionB = options
    ? paletteMatch(current, options.palette, background, evidence.requiredRatio)
    : null;

  return (
    <div className={styles.popup} onKeyDown={session.handleKeyDown}>
      <AdjustHeader title={headline} onClose={session.handleCancel} />
      {options?.binding && <BindingNotice binding={options.binding} />}
      <AdjustBody
        aiAssistanceLevel={aiAssistanceLevel}
        sampleText={issue.nodeName}
        background={background}
        backgroundAncestorName={backgroundSourceName(evidence)}
        requiredRatio={evidence.requiredRatio}
        optionA={optionA}
        optionB={optionB}
        wheelColor={session.wheelColor}
        focused={session.focused}
        onFocusOption={session.focusOption}
        onOpenWheel={session.openWheel}
        onColorChange={session.selectWheelColor}
        onHexRejected={session.onHexRejected}
      />
      {(root.instances.length > 1 || variableScope) && (
        <ScopeSection
          scope={session.scope}
          onScopeChange={session.setScope}
          scopeCount={scopeIds.length}
          checkedCount={selectedInstanceIds.size}
          totalInstances={root.instances.length}
          variableScope={variableScope}
          variableConsequence={variableConsequence}
        />
      )}

      {actionError && (
        <p role="alert" className={styles.error}>
          {actionError}
        </p>
      )}

      <AdjustActions
        canApply={
          session.activeColor !== null &&
          contrastRatio(session.activeColor, background) >= evidence.requiredRatio
        }
        onCancel={session.handleCancel}
        onApply={session.handleApply}
      />
    </div>
  );
}
