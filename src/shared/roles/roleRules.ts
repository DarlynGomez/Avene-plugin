import { matchedPattern } from "./nameMatch";
import type { RoleInputs } from "./roleInputs";
import type { DecidedRole, RoleLabel } from "./roleLabels";
import { NAME_RULES, SHAPE, SHAPE_REASONS, UNDECIDED_REASONS, type NameRule } from "./roleRuleData";
import { sizeRatio } from "./screenCensus";

/** A role or unsure, with the sentence that says why, the ruleId is null when no rule decided */
export interface RoleDecision {
  role: RoleLabel;
  ruleId: string | null;
  reason: string;
  /** Why the role is unsure, absent for a decision */
  undecided?: "none" | "conflict";
}

interface NameHit {
  rule: NameRule;
  reason: string;
}

const decided = (role: DecidedRole, ruleId: string, reason: string): RoleDecision => ({
  role,
  ruleId,
  reason
});
const unsure = (undecided: "none" | "conflict", reason?: string): RoleDecision => ({
  role: "unsure",
  ruleId: null,
  reason: reason ?? UNDECIDED_REASONS[undecided],
  undecided
});

/** The names a rule may read, in the order they are tried, with whether each is the own name */
function namesFor(rule: NameRule, input: RoleInputs): { name: string; own: boolean }[] {
  const names: { name: string; own: boolean }[] = [];
  if (!input.autoRename) names.push({ name: input.layerName, own: true });
  if (rule.reach === "near") {
    if (input.parentName !== null) names.push({ name: input.parentName, own: false });
    return names;
  }
  for (const name of input.ancestorNames) names.push({ name, own: false });
  if (input.componentName !== null) names.push({ name: input.componentName, own: false });
  return names;
}

function nameHit(rule: NameRule, input: RoleInputs): NameHit | null {
  if (rule.maxWords !== null && input.wordCount > rule.maxWords) return null;
  for (const { name, own } of namesFor(rule, input)) {
    if (matchedPattern(name, rule.patterns) === null) continue;
    return { rule, reason: (own ? rule.ownReason : rule.otherReason).replace("{name}", name) };
  }
  return null;
}

/** Tier A. Null means no name rule matched, a decision or a conflict otherwise */
function byName(input: RoleInputs): RoleDecision | null {
  let hits = NAME_RULES.flatMap((rule) => nameHit(rule, input) ?? []);
  if (hits.length === 0) return null;
  const roles = (list: NameHit[]) => new Set(list.map((hit) => hit.rule.role));
  if (hits.some((hit) => hit.rule.id === "N2") && roles(hits).size > 1) {
    return unsure("conflict");
  }
  // A button's label is button text, so N1 is tried before N5
  if (hits.some((hit) => hit.rule.id === "N1")) {
    hits = hits.filter((hit) => hit.rule.id !== "N5");
  }
  if (roles(hits).size > 1) return unsure("conflict");
  const [first] = hits;
  return decided(first.rule.role, first.rule.id, first.reason);
}

/** Tier B. Runs only when the screen has enough text to compare with */
function byShape(input: RoleInputs): RoleDecision | null {
  const ratio = sizeRatio(input.fontSizePx, input.screenTextCensus);
  if (ratio === null || input.charCount === 0) return null;
  const { wordCount: words, fontWeight: weight } = input;
  const bold = weight !== null && weight >= SHAPE.boldWeight;
  const light = weight !== null && weight < SHAPE.boldWeight;
  const hasParentShape =
    input.parentHasSolidFill &&
    input.parentHeight !== null &&
    input.parentHeight <= SHAPE.buttonParentMaxHeight &&
    input.parentWidth !== null &&
    input.parentWidth > input.textWidth;

  if (hasParentShape && words <= SHAPE.buttonMaxWords) {
    return decided("button text", "S1", SHAPE_REASONS.S1);
  }
  if (ratio >= SHAPE.headingBigRatio && words <= SHAPE.headingBigMaxWords) {
    return decided("heading", "S2", SHAPE_REASONS.S2);
  }
  if (bold && ratio >= SHAPE.headingBoldRatio && words <= SHAPE.headingBoldMaxWords) {
    return decided("heading", "S3", SHAPE_REASONS.S3);
  }
  if (light && ratio <= SHAPE.captionMaxRatio) {
    if (words >= SHAPE.captionMinWords) return decided("caption", "S4", SHAPE_REASONS.S4);
    // Position is used here and nowhere else, a small note at the foot of the screen
    const bottom = input.centerYFraction !== null && input.centerYFraction >= SHAPE.bottomBandFrom;
    if (bottom) return decided("caption", "S4", SHAPE_REASONS.S4Bottom);
  }
  if (
    light &&
    ratio > SHAPE.bodyMinRatioAbove &&
    ratio < SHAPE.bodyMaxRatioBelow &&
    words >= SHAPE.bodyMinWords
  ) {
    return decided("body", "S5", SHAPE_REASONS.S5);
  }
  return null;
}

/** Names first, then shape. Anything neither decides is unsure and goes on to the model path */
export function decideRole(input: RoleInputs): RoleDecision {
  return byName(input) ?? byShape(input) ?? unsure("none");
}
