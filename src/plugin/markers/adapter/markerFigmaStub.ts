import { vi } from "vitest";

type Handler = (event: { documentChanges: unknown[] }) => void;
type Box = { x: number; y: number; width: number; height: number };

/** A layer the stand in knows about, text layers, drawn shapes and frames alike */
export interface FakeNode {
  id: string;
  type: string;
  name: string;
  annotations: Annotation[];
  parent: unknown;
  removed: boolean;
  locked: boolean;
  absoluteBoundingBox: Box | null;
  children: FakeNode[];
  fills: unknown[];
  strokes: unknown[];
  strokeWeight: number;
  strokeAlign: string;
  x: number;
  y: number;
  width: number;
  height: number;
  getPluginData: (key: string) => string;
  setPluginData: (key: string, value: string) => void;
  remove: () => void;
  resize: (width: number, height: number) => void;
  appendChild: (child: FakeNode) => void;
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
  /** Drawing is refused too, as in a view only file */
  rejectEmptyLabel?: boolean;
}

const READ_ONLY = "Cannot write to internal and read-only nodes";

/** A small stand in for the parts of figma the marker adapter touches, with a call log */
export function createFakeFigma(options: Options = {}) {
  const nodes = new Map<string, FakeNode>();
  const categories: FakeCategory[] = [];
  const calls: string[] = [];
  const documentChange: Handler[] = [];
  const closeHandlers: Array<() => void> = [];
  const state = {
    readOnly: options.readOnly ?? false,
    rejectEmptyLabel: options.rejectEmptyLabel ?? false,
    zoom: 1
  };
  const page = {
    type: "PAGE",
    name: "Page 1",
    children: [] as FakeNode[],
    selection: [] as unknown[]
  };
  let nextCategory = 1;
  let nextShape = 1;

  /** Delivered after the plugin's own synchronous code has finished, as figma batches them */
  function emitChange(change: Record<string, unknown>) {
    void Promise.resolve().then(() => {
      for (const handler of documentChange) handler({ documentChanges: [change] });
    });
  }
  const emit = (id: string, properties: string[]) =>
    emitChange({ type: "PROPERTY_CHANGE", id, properties });

  function build(id: string, type: string, annotations: Annotation[], tag: string): FakeNode {
    const data = new Map<string, string>(tag ? [["cadt.marker.v1", tag]] : []);
    let current = annotations;
    const numbers = { x: 0, y: 0, width: 100, height: 100, strokeWeight: 0 };
    const node = {
      id,
      type,
      name: id,
      parent: page,
      removed: false,
      locked: false,
      absoluteBoundingBox: null,
      children: [],
      fills: [],
      strokes: [],
      strokeAlign: "CENTER",
      get x() {
        return numbers.x;
      },
      set x(value: number) {
        numbers.x = Math.fround(value);
      },
      get y() {
        return numbers.y;
      },
      set y(value: number) {
        numbers.y = Math.fround(value);
      },
      get width() {
        return numbers.width;
      },
      get height() {
        return numbers.height;
      },
      get strokeWeight() {
        return numbers.strokeWeight;
      },
      set strokeWeight(value: number) {
        numbers.strokeWeight = Math.fround(value);
      },
      get annotations() {
        return current;
      },
      set annotations(value: Annotation[]) {
        if (state.readOnly) throw new Error(READ_ONLY);
        if (state.rejectEmptyLabel && value.some((a) => a.label === undefined && a.categoryId)) {
          throw new Error("Annotation needs a label");
        }
        calls.push(`annotations:${id}`);
        current = value;
        emit(id, ["annotations"]);
      },
      getPluginData: (key: string) => data.get(key) ?? "",
      setPluginData: (key: string, value: string) => {
        if (state.readOnly) throw new Error(READ_ONLY);
        calls.push(`tag:${id}`);
        if (value === "") data.delete(key);
        else data.set(key, value);
        emit(id, ["pluginData"]);
      },
      remove() {
        if (state.readOnly) throw new Error(READ_ONLY);
        node.removed = true;
        calls.push(`remove:${id}`);
        nodes.delete(id);
        const siblings = (node.parent as { children?: FakeNode[] } | null)?.children;
        if (siblings) siblings.splice(siblings.indexOf(node), 1);
        node.children.forEach((child) => child.removed || child.remove());
        emitChange({ type: "DELETE", id });
      },
      resize(width: number, height: number) {
        // Figma keeps numbers as 32 bit floats, so a size that was written reads back rounded
        numbers.width = Math.fround(width);
        numbers.height = Math.fround(height);
      },
      appendChild(child: FakeNode) {
        const siblings = (child.parent as { children?: FakeNode[] } | null)?.children;
        if (siblings) siblings.splice(siblings.indexOf(child), 1);
        child.parent = node;
        node.children.push(child);
      }
    } as unknown as FakeNode;
    nodes.set(id, node);
    return node;
  }

  function addNode(id: string, annotations: Annotation[] = [], tag = "", box?: Box): FakeNode {
    const node = build(id, "TEXT", annotations, tag);
    node.absoluteBoundingBox = box ?? null;
    return node;
  }

  /** What a layer drawn by the plugin looks like to the stand in, added to the page like figma does */
  function create(type: "FRAME" | "ELLIPSE"): FakeNode {
    if (state.readOnly) throw new Error(READ_ONLY);
    const node = build(`${type === "FRAME" ? "frame" : "shape"}:${nextShape++}`, type, [], "");
    const target = (globalThis as unknown as { figma: { currentPage: typeof page } }).figma
      .currentPage;
    node.parent = target;
    target.children.push(node);
    calls.push(`create:${node.id}`);
    emitChange({ type: "CREATE", id: node.id, node });
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
          if (state.readOnly) throw new Error(READ_ONLY);
          calls.push("category:add");
          return addCategory(label);
        }
      },
      getNodeByIdAsync: async (id: string) => nodes.get(id) ?? null,
      createFrame: () => create("FRAME"),
      createEllipse: () => create("ELLIPSE"),
      currentPage: page,
      viewport: {
        get zoom() {
          return state.zoom;
        }
      },
      root: {
        children: [page],
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

  /** What an undo can do to a removed layer, it comes back with its tag and its place */
  function resurrect(node: FakeNode, parent: { children: FakeNode[] } = page) {
    node.removed = false;
    nodes.set(node.id, node);
    node.parent = parent;
    parent.children.push(node);
  }

  return {
    nodes,
    categories,
    calls,
    commitUndo,
    state,
    page,
    addNode,
    addCategory,
    install,
    emit,
    emitChange,
    resurrect,
    runCloseHandlers: () => closeHandlers.forEach((handler) => handler()),
    documentChangeHandlers: documentChange
  };
}

export const tag = (userId: string, sessionId: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ userId, sessionId, ...extra });
