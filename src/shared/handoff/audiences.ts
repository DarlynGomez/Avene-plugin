import { buildDoc } from "./buildDoc";
import { buildItems } from "./buildItems";
import { findDesignerTextHits } from "./designerText";
import { structureHash } from "./hash";
import { CLIENT_LINE, HIGHER_UP_LINE, NOT_COVERED_LINE } from "./fixedLines";
import { actionLines, leftLines } from "./itemLines";
import { pmSummaryLines } from "./pmSummary";
import { advisorySection, changeLines, questionLines } from "./sectionLines";
import { createSlots } from "./slots";
import { summaryLines } from "./summaryLines";
import type {
  Audience,
  AudienceDoc,
  DocSection,
  HandoffInput,
  HandoffItem,
  HandoffQuestion,
  LineOptions,
  Owner
} from "./types";

/** Hex values belong to developers only, clients also see no names and no internal status */
const OPTIONS: Record<Audience, LineOptions> = {
  developer: { hex: true, names: true, status: true },
  pm: { hex: false, names: true, status: true },
  higherUp: { hex: false, names: false, status: true },
  client: { hex: false, names: false, status: false }
};

const QUESTION_OWNER: Partial<Record<Audience, Owner>> = { developer: "Dev", pm: "PM" };

function part(id: string, title: string, lines: readonly string[]): DocSection[] {
  return lines.length > 0 ? [{ id, title, lines }] : [];
}

function questionsFor(audience: Audience, all: readonly HandoffQuestion[]): HandoffQuestion[] {
  const owner = QUESTION_OWNER[audience];
  return owner ? all.filter((question) => question.owner === owner) : [];
}

/** Template selection and order for one reader, no model involved */
export function buildAudienceDoc(input: HandoffInput, audience: Audience): AudienceDoc {
  const base = buildDoc(input);
  const o = OPTIONS[audience];
  const slots = createSlots();
  const { items, deferredLayers } = buildItems(input);
  const questions = questionsFor(audience, input.questions);
  const scope = input.screens.length === 1 ? input.screens[0].name : input.fileName;
  const of = (kind: HandoffItem["kind"]) => items.filter((item) => item.kind === kind);
  const waiting = of("left").filter((item) => item.meta.signOff === "needs");
  const advisory = advisorySection(items, slots, o.names);

  const summary =
    audience === "higherUp"
      ? pmSummaryLines(items, scope, slots).slice(0, 2)
      : summaryLines(items, deferredLayers, questions.length, slots, o);
  const action = of("action").flatMap((item) => actionLines(item, slots, o));
  const left = (list: readonly HandoffItem[]) => list.flatMap((item) => leftLines(item, slots, o));
  const tail = [
    ...(advisory ? [advisory] : []),
    { id: "notCovered", title: "Not covered", lines: [NOT_COVERED_LINE] }
  ];

  const sections: Record<Audience, DocSection[]> = {
    developer: [
      ...part("summary", "Summary", summary),
      ...part("action", "Needs developer action", action),
      ...part("changes", "Changes made in this file", changeLines(input.changes, slots)),
      ...part("questions", "Open questions", questionLines(questions, slots)),
      ...tail
    ],
    pm: [
      ...part("summary", "Summary", summary),
      ...part("left", "Knowingly left as-is", left(of("left"))),
      ...part("questions", "Open questions", questionLines(questions, slots)),
      ...tail
    ],
    higherUp: [
      ...part("summary", "Summary", summary),
      ...part("waiting", "Decisions waiting", left(waiting)),
      ...tail
    ],
    client: [
      ...part("summary", "Summary", summary),
      ...part("left", "What was decided", left(of("left"))),
      ...tail
    ]
  };
  const notices = { developer: [], pm: [], higherUp: [HIGHER_UP_LINE], client: [CLIENT_LINE] }[
    audience
  ];
  return {
    audience,
    header: base.header,
    hash: base.hash,
    structureHash: structureHash(sections[audience], slots.table()),
    sections: sections[audience],
    slots: slots.table(),
    notices,
    warnings: findDesignerTextHits(input, audience)
  };
}
