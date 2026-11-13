/** A tag in the structure tree and the table scope it carries, read back from the bytes of a PDF written without compression */
export interface TagNode {
  tag: string;
  scope?: string;
  colSpan?: number;
  children: TagNode[];
}

const text = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

function objectsOf(pdf: string): Map<number, string> {
  const found = new Map<number, string>();
  for (const m of pdf.matchAll(/(\d+) 0 obj\n([\s\S]*?)\nendobj/g)) found.set(Number(m[1]), m[2]);
  return found;
}

/** The structure tree, from the root down, so a test can assert the tag sequence the readers will walk */
export function structureTree(bytes: Uint8Array): TagNode[] {
  const pdf = text(bytes);
  const objects = objectsOf(pdf);
  const rootId = /\/StructTreeRoot (\d+) 0 R/.exec(pdf)?.[1];
  if (!rootId) return [];
  const childrenOf = (body: string): number[] => {
    const k = /\/K (\[[\s\S]*?\]|\d+ 0 R|\d+)/.exec(body)?.[1] ?? "";
    // A reference inside << >> is a page of marked content, not a child element
    return [...k.replace(/<<[^>]*>>/g, "").matchAll(/(\d+) 0 R/g)].map((m) => Number(m[1]));
  };
  const read = (id: number): TagNode | null => {
    const body = objects.get(id) ?? "";
    const tag = /\/S \/(\w+)/.exec(body)?.[1];
    if (!tag) return null;
    return {
      tag,
      scope: /\/Scope \/(\w+)/.exec(body)?.[1],
      colSpan: Number(/\/ColSpan (\d+)/.exec(body)?.[1]) || undefined,
      children: childrenOf(body).flatMap((child) => read(child) ?? [])
    };
  };
  return childrenOf(objects.get(Number(rootId)) ?? "").flatMap((id) => read(id) ?? []);
}

/** One line for each element, indented by depth, with the scope or span after the tag */
export function outline(nodes: readonly TagNode[], depth = 0): string[] {
  return nodes.flatMap((n) => [
    `${"  ".repeat(depth)}${n.tag}${n.scope ? `:${n.scope}` : ""}${n.colSpan ? `:span${n.colSpan}` : ""}`,
    ...outline(n.children, depth + 1)
  ]);
}

/** What the file says about itself outside the content: language, title, fonts and the artifact marks */
export function facts(bytes: Uint8Array) {
  const pdf = text(bytes);
  const titleRef = /\/Title (\d+) 0 R/.exec(pdf)?.[1];
  const title = titleRef
    ? /^\((.*)\)$/s.exec(objectsOf(pdf).get(Number(titleRef)) ?? "")?.[1]
    : undefined;
  return {
    lang: /\/Lang \(([^)]*)\)/.exec(pdf)?.[1],
    title,
    marked: /\/Marked true/.test(pdf),
    displayTitle: /\/DisplayDocTitle true/.test(pdf),
    pages: (pdf.match(/\/Type \/Page\n/g) ?? []).length,
    baseFonts: [...pdf.matchAll(/\/BaseFont \/(\S+)/g)].map((m) => m[1]),
    fontFiles: (pdf.match(/\/FontFile2/g) ?? []).length,
    pagination: (pdf.match(/\/Artifact\s*<<\s*\/Type \/Pagination\s*>>\s*BDC/g) ?? []).length,
    images: /\/Subtype \/Image/.test(pdf)
  };
}
