import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const AT = "2026-11-05T10:00:00.000Z";

/** One valid message for every type the sandbox answers, so the audit does not depend on which type was thought of */
export const VALID: Record<string, Record<string, unknown>> = {
  HANDOFF_DATA_REQUEST: {},
  HANDOFF_NOTES_SET: { nodeId: "1:1", notes: [{ category: "name", text: "Menu", updatedAt: AT }] },
  HANDOFF_META_SET: {
    signature: "#9A9A9A|#FFFFFF|unbound|4.5",
    meta: { signOff: "needs", leaveOut: false }
  },
  HANDOFF_FILE_URL_SET: { url: "https://www.figma.com/design/KEY/Checkout" },
  HANDOFF_DRAFTS_SET: { drafts: {} },
  HANDOFF_ALT_INVENTORY_REQUEST: {},
  HANDOFF_ALT_SET: { nodeId: "1:1", text: "A sign", decorative: false, source: "designer" },
  HANDOFF_ALT_CROP_REQUEST: { nodeId: "1:1" },
  HANDOFF_ALT_CACHE_REQUEST: {},
  HANDOFF_ALT_CACHE_SET: { entries: [] },
  HANDOFF_AI_RESET: {},
  HANDOFF_ANNOTATE: { nodeId: "1:1" },
  HANDOFF_ANNOTATION_UPDATE: { nodeId: "1:1" },
  HANDOFF_ANNOTATION_REMOVE: { nodeId: "1:1" },
  HANDOFF_ANNOTATION_STATUS_REQUEST: { nodeIds: ["1:1"] }
};

/** Every message type the two sandbox handlers switch on, read from their source */
export function handledTypes(): string[] {
  const files = ["./handoffProtocol.ts", "./annotationProtocol.ts"];
  return files.flatMap((file) => {
    const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
    return [...source.matchAll(/case "(HANDOFF_[A-Z_]+)":/g)].map((match) => match[1]);
  });
}

export const messageOf = (type: string): Record<string, unknown> => ({ type, ...VALID[type] });
