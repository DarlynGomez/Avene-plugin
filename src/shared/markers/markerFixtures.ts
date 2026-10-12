import type { GroupableFinding, Root, RootDisplayState } from "../grouping/groupingTypes";
import type { IssueState } from "../issues/issueTypes";

export function instance(
  id: string,
  screenId: string,
  state: IssueState,
  documentOrder: number,
  overrides: Partial<GroupableFinding> = {}
): GroupableFinding {
  return {
    issueId: `contrast:${id}`,
    nodeId: id,
    nodeName: `Layer ${id}`,
    screenId,
    screenName: `Screen ${screenId}`,
    state,
    severity: "high",
    measuredRatio: 2.17,
    requiredRatio: 4.5,
    foregroundHex: "#9CB5B1",
    backgroundHex: "#FFFFFF",
    foregroundBinding: null,
    backgroundBinding: null,
    documentOrder,
    ...overrides
  };
}

export function root(
  signature: string,
  instances: GroupableFinding[],
  displayState: RootDisplayState = "open"
): Root {
  return {
    signature,
    foregroundHex: "#9CB5B1",
    backgroundHex: "#FFFFFF",
    foregroundBinding: null,
    requiredRatio: 4.5,
    instances,
    representativeIssueId: instances[0]?.issueId ?? "",
    backgroundBindings: [],
    displayState,
    stateBreakdown: {}
  };
}
