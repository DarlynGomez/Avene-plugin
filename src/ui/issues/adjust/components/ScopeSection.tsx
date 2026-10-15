import { Check, Info } from "lucide-react";

import type { AdjustVariableScope } from "../../../../shared/adjustMessageTypes";
import type { AdjustScope } from "../useAdjustSession";
import type { VariableConsequenceData } from "../useAdjustVariableScope";
import styles from "./ScopeSection.module.css";

interface ScopeSectionProps {
  scope: AdjustScope;
  onScopeChange: (scope: AdjustScope) => void;
  scopeCount: number;
  /** Layers the designer checked, scopeCount cannot tell none from one */
  checkedCount: number;
  totalInstances: number;
  variableScope: AdjustVariableScope | null;
  variableConsequence: VariableConsequenceData | null;
}

function instancesLabel(checkedCount: number): string {
  if (checkedCount === 0) {
    return "Change only the current instance";
  }
  return checkedCount === 1 ? "Change this layer" : `Change ${checkedCount} layers`;
}

function instancesDetail(scopeCount: number, remaining: number): string {
  const layerWord = scopeCount === 1 ? "layer" : "layers";
  const suffix = remaining > 0 ? ` ${remaining} more in this group left unchanged.` : "";
  return `Changes ${scopeCount} ${layerWord}.${suffix}`;
}

function variableDetail(consequence: VariableConsequenceData | null): string {
  if (!consequence) {
    return "Calculating how many layers this would change...";
  }
  const layerWord = consequence.totalConsumers === 1 ? "layer" : "layers";
  const failingClause =
    consequence.newlyFailingCount > 0 ? ` ${consequence.newlyFailingCount} would newly fail.` : "";
  return `Updates ${consequence.totalConsumers} ${layerWord}.${failingClause}`;
}

/**
 * Instances scope always, variable scope when the foreground is bound to a local variable
 * A library variable is disabled with its reason, its count is computed for the current colour
 */
export function ScopeSection({
  scope,
  onScopeChange,
  scopeCount,
  checkedCount,
  totalInstances,
  variableScope,
  variableConsequence
}: ScopeSectionProps) {
  const remaining = totalInstances - scopeCount;
  const variableDisabled = !variableScope || variableScope.remote;

  return (
    <div className={styles.section}>
      <p className={styles.heading}>2. Choose adjustment scope</p>
      <button
        type="button"
        className={styles.option}
        data-checked={scope === "instances"}
        onClick={() => onScopeChange("instances")}
      >
        <span className={styles.radio} data-checked={scope === "instances"} aria-hidden="true" />
        <span className={styles.optionBody}>
          <span className={styles.optionLabelRow}>
            <span className={styles.optionLabel}>{instancesLabel(checkedCount)}</span>
            <span
              className={styles.infoIcon}
              title="Every layer checked in Related grouped issues, or just this one if none are checked"
            >
              <Info size={14} aria-hidden="true" />
            </span>
          </span>
          <span className={styles.optionDetail}>{instancesDetail(scopeCount, remaining)}</span>
        </span>
        {scope === "instances" && <Check className={styles.check} size={18} aria-hidden="true" />}
      </button>
      {variableScope && (
        <button
          type="button"
          className={styles.option}
          data-checked={scope === "variable"}
          disabled={variableDisabled}
          onClick={() => onScopeChange("variable")}
        >
          <span className={styles.radio} data-checked={scope === "variable"} aria-hidden="true" />
          <span className={styles.optionBody}>
            <span className={styles.optionLabelRow}>
              <span className={styles.optionLabel}>
                Update variable &ldquo;{variableScope.name}&rdquo;
              </span>
              <span
                className={styles.infoIcon}
                title={`Writes ${variableScope.collectionName} / ${variableScope.modeName}. Every layer bound to this variable changes, including layers that currently pass.`}
              >
                <Info size={14} aria-hidden="true" />
              </span>
            </span>
            <span className={styles.optionDetail}>
              {variableScope.remote
                ? "Library color. Edit it in its source file."
                : variableDetail(variableConsequence)}
            </span>
          </span>
          {scope === "variable" && <Check className={styles.check} size={18} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
