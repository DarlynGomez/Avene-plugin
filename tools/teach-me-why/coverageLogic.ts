import { contrastRatio } from "../../src/shared/colour/contrastRatio";
import { rgbToHex } from "../../src/shared/colour/colorHex";
import { parseHex } from "../../src/shared/colour/hexInput";
import { deriveRoots } from "../../src/shared/grouping/deriveRoots";
import type { GroupableFinding } from "../../src/shared/grouping/groupingTypes";
import {
  buildExplanationKey,
  keyToString,
  type InstanceRoles
} from "../../src/shared/teachMeWhy/explanationKey";
import {
  ELEMENT_ROLES,
  type ElementRole,
  type ExplanationKey
} from "../../src/shared/teachMeWhy/explanationTypes";
import { computeSeverity } from "../../src/plugin/detection/rules/contrast/severity";
import { classifyTextSize } from "../../src/plugin/detection/rules/contrast/textSizeClass";
import {
  BOLD_MIN_FONT_WEIGHT,
  CONTRAST_THRESHOLD_LARGE_TEXT,
  CONTRAST_THRESHOLD_NORMAL_TEXT
} from "../../src/plugin/detection/rules/contrast/thresholds";
import type { GroundTruthRow } from "./groundTruth";

export interface RootCoverage {
  task: string;
  root: string;
  instances: number;
  representative: string;
  measured: number;
  required: number;
  role: ElementRole;
  /** What a rule decides today for the representative, null when no rule decides roles */
  ruleRole: ElementRole | null;
  key: ExplanationKey;
  /** Keys that apply if the participant confirms any of the seven roles */
  anyRoleKeys: ExplanationKey[];
  /** Names the plugin root and the csv root label disagree about, if they do */
  notes: string[];
}

export interface TaskCoverage {
  task: string;
  failingInstances: number;
  roots: RootCoverage[];
}

/** No rule decides an element role yet, so the plugin's answer is none */
export const noRuleRole = (): ElementRole | null => null;

function toFinding(row: GroundTruthRow, order: number): GroundTruthFindingResult {
  const fg = parseHex(row.fg);
  const bg = parseHex(row.bg);
  if (!fg || !bg) return { error: `${row.task} ${row.id}: fg or bg is not a hex colour` };
  const isBold = row.weight >= BOLD_MIN_FONT_WEIGHT;
  const required =
    classifyTextSize(row.sizePx, isBold) === "large"
      ? CONTRAST_THRESHOLD_LARGE_TEXT
      : CONTRAST_THRESHOLD_NORMAL_TEXT;
  const measured = contrastRatio(fg, bg);
  if (measured >= required) return { passing: true };
  return {
    finding: {
      issueId: row.id,
      nodeId: row.id,
      nodeName: row.text,
      screenId: row.screen,
      screenName: row.screen,
      state: "open",
      severity: computeSeverity(measured, required),
      measuredRatio: measured,
      requiredRatio: required,
      foregroundHex: rgbToHex(fg),
      backgroundHex: rgbToHex(bg),
      foregroundBinding: null,
      backgroundBinding: null,
      documentOrder: order
    }
  };
}
type GroundTruthFindingResult =
  { error: string } | { passing: true } | { finding: GroupableFinding };

/** The plugin's own grouping and representative pick, then the key, for one task */
export function analyzeTask(
  task: string,
  rows: readonly GroundTruthRow[],
  ruleRoleOf: (row: GroundTruthRow) => ElementRole | null = noRuleRole
): { coverage: TaskCoverage; errors: string[] } {
  const errors: string[] = [];
  const findings: GroupableFinding[] = [];
  const rowById = new Map<string, GroundTruthRow>();
  rows.forEach((row, order) => {
    const result = toFinding(row, order);
    if ("error" in result) errors.push(result.error);
    else if ("finding" in result) {
      findings.push(result.finding);
      rowById.set(row.id, row);
    }
  });

  const roots = deriveRoots(findings).map((root): RootCoverage => {
    const representative = root.instances.find((i) => i.issueId === root.representativeIssueId);
    const row = rowById.get(root.representativeIssueId);
    if (!representative || !row) throw new Error("A root has no representative");
    const rolesFor = (): InstanceRoles => ({ confirmed: null, ruleDecided: row.role });
    const labels = [...new Set(root.instances.map((i) => rowById.get(i.issueId)?.root ?? ""))];
    const notes: string[] = [];
    if (labels.length > 1) notes.push(`plugin root spans csv roots ${labels.join(" and ")}`);
    const ruleRole = ruleRoleOf(row);
    if (ruleRole !== row.role)
      notes.push(`csv role ${row.role} but the plugin decides ${ruleRole ?? "none"}`);
    return {
      task,
      root: labels.join("+"),
      instances: root.instances.length,
      representative: root.representativeIssueId,
      measured: representative.measuredRatio,
      required: representative.requiredRatio,
      role: row.role,
      ruleRole,
      key: buildExplanationKey(root, 1, rolesFor),
      anyRoleKeys: ELEMENT_ROLES.map((confirmed) =>
        buildExplanationKey(root, 1, () => ({ confirmed, ruleDecided: ruleRole }))
      ),
      notes
    };
  });
  // A csv root label split across two plugin roots is also worth knowing
  const seen = new Map<string, number>();
  for (const root of roots)
    for (const label of root.root.split("+")) seen.set(label, (seen.get(label) ?? 0) + 1);
  for (const root of roots) {
    if (root.root.split("+").some((label) => (seen.get(label) ?? 0) > 1)) {
      root.notes.push(`csv root ${root.root} is split across several plugin roots`);
    }
  }
  return { coverage: { task, failingInstances: findings.length, roots }, errors };
}

/** Distinct keys without depth, as role:severity:size */
export function distinctKeys(keys: readonly ExplanationKey[]): string[] {
  return [...new Set(keys.map((key) => keyToString({ ...key, depth: 1 }).replace(/:1$/, "")))];
}

/** The three review rows every distinct key needs */
export function reviewRowKeys(distinct: readonly string[]): string[] {
  return distinct.flatMap((name) => [1, 2, 3].map((depth) => `${name}:${depth}`));
}
