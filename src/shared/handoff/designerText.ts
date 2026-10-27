import { buildItems } from "./buildItems";
import type { Audience, DesignerTextHit, HandoffInput, HandoffItem } from "./types";

const HEX = /#[0-9A-Fa-f]{3,8}\b/g;
const DIGITS = /\d+/g;

/** Only these versions are meant to be free of hex, the designer's own words are not rewritten */
const CHECKED: readonly Audience[] = ["pm", "higherUp", "client"];

function hitsIn(item: string, field: string, text: string | undefined): DesignerTextHit[] {
  if (!text) return [];
  const hexes = [...text.matchAll(HEX)].map((m) => ({
    item,
    field,
    kind: "hex" as const,
    match: m[0]
  }));
  const stripped = text.replace(HEX, " ");
  const runs = [...stripped.matchAll(DIGITS)].map((m) => ({
    item,
    field,
    kind: "digits" as const,
    match: m[0]
  }));
  return [...hexes, ...runs];
}

function shown(items: readonly HandoffItem[], audience: Audience): HandoffItem[] {
  const left = items.filter((item) => item.kind === "left");
  return audience === "higherUp" ? left.filter((item) => item.meta.signOff === "needs") : left;
}

/** Hex values and digit runs in the designer text a version prints, found and reported, never changed */
export function findDesignerTextHits(input: HandoffInput, audience: Audience): DesignerTextHit[] {
  if (!CHECKED.includes(audience)) return [];
  const hits = shown(buildItems(input).items, audience).flatMap((item) => {
    const id = item.signature;
    return [
      ...hitsIn(id, "reason", item.decision?.reason),
      ...hitsIn(id, "mitigation", item.meta.mitigation),
      ...hitsIn(id, "decidedBy", item.meta.decidedBy),
      ...hitsIn(id, "revisitTrigger", item.meta.revisitTrigger),
      ...hitsIn(id, "signedBy", item.meta.signedBy)
    ];
  });
  if (audience !== "pm") return hits;
  const questions = input.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => question.owner === "PM")
    .flatMap(({ question, index }) => hitsIn(`question:${index}`, "text", question.text));
  return [...hits, ...questions];
}
