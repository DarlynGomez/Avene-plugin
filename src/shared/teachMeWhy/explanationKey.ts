import type { Root } from "../grouping/groupingTypes";
import {
  ELEMENT_ROLES,
  type Depth,
  type ElementRole,
  type ExplanationKey,
  type SizeClass
} from "./explanationTypes";

/** The roles known for one layer, either may be missing */
export interface InstanceRoles {
  confirmed: ElementRole | null;
  ruleDecided: ElementRole | null;
}

/** The confirmed role wins, then the one a rule decided, else unknown */
export function selectRole(roles: InstanceRoles | undefined): ElementRole {
  return roles?.confirmed ?? roles?.ruleDecided ?? "unknown";
}

/** The detection rule asks for 3 on large text and 4.5 on everything else */
export function sizeClassFromRequired(requiredRatio: number): SizeClass {
  return requiredRatio <= 3 ? "large" : "normal";
}

/** Role and severity come from the representative instance, the one the card shows */
export function buildExplanationKey(
  root: Root,
  depth: Depth,
  rolesFor: (nodeId: string) => InstanceRoles | undefined
): ExplanationKey {
  const representative = root.instances.find(
    (instance) => instance.issueId === root.representativeIssueId
  );
  if (!representative) {
    throw new Error("buildExplanationKey: the representative is not among the root instances");
  }
  return {
    role: selectRole(rolesFor(representative.nodeId)),
    severity: representative.severity,
    size: sizeClassFromRequired(root.requiredRatio),
    depth
  };
}

export function keyToString(key: ExplanationKey): string {
  return `${key.role}:${key.severity}:${key.size}:${key.depth}`;
}

/** The reverse of keyToString, null when the text is not one of the 126 keys */
export function parseKeyString(text: string): ExplanationKey | null {
  const [role, severity, size, depth, ...extra] = text.trim().split(":");
  const valid =
    extra.length === 0 &&
    ELEMENT_ROLES.includes(role as ElementRole) &&
    ["low", "medium", "high"].includes(severity) &&
    ["normal", "large"].includes(size) &&
    ["1", "2", "3"].includes(depth);
  if (!valid) return null;
  return {
    role: role as ElementRole,
    severity: severity as ExplanationKey["severity"],
    size: size as SizeClass,
    depth: Number(depth) as Depth
  };
}
