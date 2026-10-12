import { vi } from "vitest";

type Handler = (event: { documentChanges: unknown[] }) => void;

export interface FakeNode {
  id: string;
  type: "TEXT";
  annotations: Annotation[];
  getPluginData: (key: string) => string;
  setPluginData: (key: string, value: string) => void;
}

export interface FakeCategory {
  id: string;
  label: string;
  color: string;
  isPreset: boolean;
  remove: () => void;
}

interface Options {
  userId?: string | null;
  readOnly?: boolean;
}

/** A small stand in for the parts of figma the marker adapter touches, with a call log */
export function createFakeFigma(options: Options = {}) {
  const nodes = new Map<string, FakeNode>();
  const categories: FakeCategory[] = [];
  const calls: string[] = [];
  const documentChange: Handler[] = [];
  const closeHandlers: Array<() => void> = [];
  const state = { readOnly: options.readOnly ?? false };
  let nextCategory = 1;

  function emit(id: string, properties: string[]) {
    for (const handler of documentChange) {
      handler({ documentChanges: [{ type: "PROPERTY_CHANGE", id, properties }] });
    }
  }

  function addNode(id: string, annotations: Annotation[] = [], tag = ""): FakeNode {
    const data = new Map<string, string>(tag ? [["cadt.marker.v1", tag]] : []);
    let current = annotations;
    const node: FakeNode = {
      id,
      type: "TEXT",
      get annotations() {
        return current;
      },
      set annotations(value: Annotation[]) {
        if (state.readOnly) throw new Error("Cannot write to internal and read-only nodes");
        calls.push(`annotations:${id}`);
        current = value;
        emit(id, ["annotations"]);
      },
      getPluginData: (key) => data.get(key) ?? "",
      setPluginData: (key, value) => {
        if (state.readOnly) throw new Error("Cannot write to internal and read-only nodes");
        calls.push(`tag:${id}`);
        if (value === "") data.delete(key);
        else data.set(key, value);
        emit(id, ["pluginData"]);
      }
    } as FakeNode;
    nodes.set(id, node);
    return node;
  }

  function addCategory(label: string): FakeCategory {
    const category: FakeCategory = {
      id: `cat:${nextCategory++}`,
      label,
      color: "red",
      isPreset: false,
      remove: () => {
        calls.push(`category:remove:${label}`);
        categories.splice(categories.indexOf(category), 1);
      }
    };
    categories.push(category);
    return category;
  }

  const commitUndo = vi.fn(() => void calls.push("commit"));

  function install() {
    vi.stubGlobal("figma", {
      currentUser: options.userId === null ? null : { id: options.userId ?? "u1", sessionId: 1 },
      annotations: {
        getAnnotationCategoriesAsync: async () => [...categories],
        addAnnotationCategoryAsync: async ({ label }: { label: string }) => {
          if (state.readOnly) throw new Error("Cannot write to internal and read-only nodes");
          calls.push("category:add");
          return addCategory(label);
        }
      },
      getNodeByIdAsync: async (id: string) => nodes.get(id) ?? null,
      root: {
        findAllWithCriteria: () =>
          [...nodes.values()].filter((node) => node.getPluginData("cadt.marker.v1") !== "")
      },
      commitUndo,
      on: (type: string, handler: Handler & (() => void)) => {
        if (type === "documentchange") documentChange.push(handler);
        if (type === "close") closeHandlers.push(handler);
      }
    });
  }

  return {
    nodes,
    categories,
    calls,
    commitUndo,
    state,
    addNode,
    addCategory,
    install,
    runCloseHandlers: () => closeHandlers.forEach((handler) => handler()),
    documentChangeHandlers: documentChange
  };
}

export const tag = (userId: string, sessionId: string) => JSON.stringify({ userId, sessionId });
