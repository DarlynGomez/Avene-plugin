import { act, render } from "@testing-library/react";
import { vi } from "vitest";

import type { ImageLayer } from "../../../shared/handoff/alt/altTypes";
import type { NodeNote } from "../../../shared/handoff/noteStorage";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import { participantVisibility } from "../../../shared/study/participantVisibility";
import type { StudySession } from "../../../shared/study/studyTypes";
import { IssuePanel } from "../../issues/IssuePanel";
import { StudyStateContext } from "../../study/StudyStateContext";
import { AltChecksProvider } from "./AltChecksProvider";

export const SESSION: StudySession = {
  schemaVersion: 1,
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  consentConfirmedAt: "t",
  phase: "designing",
  startedAt: "t",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};

export const layer = (nodeId: string, hash: string, name: string, screen = "s1"): ImageLayer => ({
  nodeId,
  name,
  screenId: screen,
  screenName: screen === "s1" ? "Home" : "Cart",
  width: 120,
  height: 80,
  imageHash: hash
});

/** Three image layers: one picture on one screen, and one picture used on two screens */
export const LAYERS = [
  layer("9:1", "h-hero", "Hero"),
  layer("9:2", "h-avatar", "Avatar", "s1"),
  layer("9:3", "h-avatar", "Avatar copy", "s2")
];

export const issue = (): IssueSummary => ({
  id: "contrast:1:1",
  ruleId: "contrast",
  nodeId: "1:1",
  nodeName: "Body copy",
  screenId: "s1",
  screenName: "Home",
  state: "open",
  severityAtLastDetection: "high",
  encounterCount: 0,
  lastDetectedAt: "2026-11-05T00:00:00.000Z",
  evidence: {
    measuredRatio: 2.17,
    requiredRatio: 4.5,
    foregroundHex: "#9CB5B1",
    backgroundHex: "#FFFFFF",
    foregroundBinding: "sage/muted"
  }
});

export function emit(message: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
}

export const dataMessage = (notes: Record<string, NodeNote[]> = {}) => ({
  type: "HANDOFF_DATA",
  generatedAt: "2026-11-05T10:00:00.000Z",
  fileName: "Checkout",
  issues: [],
  decisions: {},
  adjustLog: [],
  notes,
  noteNames: {},
  meta: {},
  fileUrl: null,
  drafts: {}
});

/** Records what the panel posts to the plugin */
export function capturePosts() {
  const posted: { type: string; [key: string]: unknown }[] = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((message: unknown) => {
    posted.push((message as { pluginMessage: (typeof posted)[number] }).pluginMessage);
  });
  return posted;
}

interface Options {
  study?: boolean;
  layers?: ImageLayer[];
  notes?: Record<string, NodeNote[]>;
  issues?: IssueSummary[];
}

/** The Live Watch panel inside the provider, fed the way the plugin would feed it */
export async function mountPanel({
  study = false,
  layers = LAYERS,
  notes = {},
  issues = [issue()]
}: Options = {}) {
  const session = study ? SESSION : null;
  const study_ = session
    ? {
        type: "STUDY_STATE" as const,
        session,
        visibility: participantVisibility(session),
        refusal: null
      }
    : null;
  const view = render(
    <StudyStateContext.Provider value={study_}>
      <AltChecksProvider>
        <IssuePanel aiAssistanceLevel={1} />
      </AltChecksProvider>
    </StudyStateContext.Provider>
  );
  await act(async () => {
    emit({ type: "ISSUES_UPDATED", issues, decisions: {} });
    emit({ type: "HANDOFF_ALT_INVENTORY", layers });
    emit(dataMessage(notes));
  });
  return view;
}
