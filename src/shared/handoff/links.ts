import type { HandoffFinding } from "./types";

export interface FileRef {
  fileKey: string;
  fileName: string;
}

/** https, figma.com or www.figma.com, a design or file path, a branch uses its own key */
const FILE_URL =
  /^https:\/\/(?:www\.)?figma\.com\/(?:design|file)\/([A-Za-z0-9]+)(?:\/branch\/([A-Za-z0-9]+))?(?:\/([^/?#]*))?/;
const NODE_ID = /^[A-Za-z0-9:;_-]+$/;
const DEFAULT_NAME = "file";

export function parseFileUrl(url: string | undefined): FileRef | null {
  const match = url ? FILE_URL.exec(url.trim()) : null;
  if (!match) return null;
  return { fileKey: match[2] ?? match[1], fileName: match[3] || DEFAULT_NAME };
}

/** Colons become dashes, a semicolon in an instance child id is kept as it is */
export function nodeLink(ref: FileRef | null, nodeId: string): string | null {
  if (!ref || !NODE_ID.test(nodeId)) return null;
  return `https://www.figma.com/design/${ref.fileKey}/${ref.fileName}?node-id=${nodeId.replace(/:/g, "-")}`;
}

/** No file address, no links, the findings come back unchanged */
export function attachLinks(
  findings: readonly HandoffFinding[],
  ref: FileRef | null
): HandoffFinding[] {
  return findings.map((finding) => {
    const link = nodeLink(ref, finding.nodeId);
    return link ? { ...finding, link } : { ...finding };
  });
}
