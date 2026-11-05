import { serializeNodeNotes, type NodeNote } from "../../../shared/handoff/noteStorage";
import { createFakeFigma, type FakeNode } from "../../markers/adapter/markerFigmaStub";
import { KEY_NODE_NOTES } from "../handoffKeys";

export const AT = "2026-11-05T10:00:00.000Z";

/** The marker stand in with plugin data on the file root too, which the notes index needs */
export function installFake() {
  const fake = createFakeFigma();
  fake.install();
  const data = new Map<string, string>();
  Object.assign(figma.root, {
    getPluginData: (key: string) => data.get(key) ?? "",
    setPluginData: (key: string, value: string) => void data.set(key, value)
  });
  return fake;
}

export const altNote = (text: string, extra: Partial<NodeNote> = {}): NodeNote => ({
  category: "alt",
  text,
  updatedAt: AT,
  ...extra
});

/** Gives a layer its alt note the way the panel's write would have left it */
export function giveNote(node: FakeNode, ...notes: NodeNote[]): void {
  node.setPluginData(KEY_NODE_NOTES, serializeNodeNotes(notes));
}

export const labelsOf = (node: FakeNode) => node.annotations.map((a) => a.label ?? "");
