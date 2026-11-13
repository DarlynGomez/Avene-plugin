import { altRows } from "./tableAltRows";
import { buildItems } from "./buildItems";
import { CHECKS_LINE, NOT_COVERED_LINE } from "./fixedLines";
import { NOT_REVIEWED_LINE } from "./fixedLines";
import { nodeLink, parseFileUrl } from "./links";
import { shortDate } from "./tableFormat";
import { adjustedRow, ignoredRow, openRow } from "./tableRows";
import {
  EMPTY_TABLE_SENTENCE,
  type GroupId,
  type HandoffTableModel,
  type TableGroup,
  type TableRow
} from "./tableTypes";
import type { Audience, HandoffInput, HandoffItem } from "./types";

const TITLES: Record<GroupId, string> = { contrast: "Text contrast", alt: "Alt text" };

/** The items an audience is shown, the ones that still fail and the ones left as they are for a developer */
function itemsFor(input: HandoffInput, audience: Audience): HandoffItem[] {
  const { items } = buildItems(input);
  if (audience === "developer") return items;
  const left = items.filter((item) => item.kind === "left");
  return audience === "higherUp" ? left.filter((item) => item.meta.signOff === "needs") : left;
}

function contrastRows(input: HandoffInput, audience: Audience): TableRow[] {
  const items = itemsFor(input, audience).map((item) =>
    item.kind === "action" ? openRow(item, audience) : ignoredRow(item, audience)
  );
  const adjusted = audience === "developer" ? input.changes.map(adjustedRow) : [];
  return [...items, ...adjusted];
}

/** Open and Needs check first, then everything else, each part in the order it came in */
function needsActionFirst(rows: readonly TableRow[]): TableRow[] {
  return [
    ...rows.filter((row) => row.status.needsAction),
    ...rows.filter((row) => !row.status.needsAction)
  ];
}

/** A link to the first layer of a row, when the file address is known */
function withLink(row: TableRow, ref: ReturnType<typeof parseFileUrl>): TableRow {
  const link = row.nodeIds.length > 0 ? nodeLink(ref, row.nodeIds[0]) : null;
  return link ? { ...row, link } : row;
}

/** The screens that have rows, in the order they first appear */
function screensOf(rows: readonly TableRow[]): string[] {
  return [...new Set(rows.map((row) => row.location).filter((name) => name !== ""))];
}

/**
 * The one table every version of the handoff reads: a row for each item, grouped by kind of issue
 * Nothing here is written by a model, and the same explanation is never printed twice
 */
export function buildHandoffTable(
  input: HandoffInput,
  audience: Audience,
  buildId: string | null = null
): HandoffTableModel {
  const ref = parseFileUrl(input.fileUrl);
  const groups: TableGroup[] = (
    [
      { id: "contrast", rows: contrastRows(input, audience) },
      { id: "alt", rows: audience === "developer" ? altRows(input) : [] }
    ] as const
  )
    .filter((group) => group.rows.length > 0)
    .map((group) => ({
      id: group.id,
      title: TITLES[group.id],
      rows: needsActionFirst(group.rows).map((row) => withLink(row, ref))
    }));
  const rows = groups.flatMap((group) => group.rows);
  const screens = screensOf(rows);
  const date = shortDate(input.generatedAt);
  const needAction = rows.filter((row) => row.status.needsAction).length;
  // Deferred is not for developers now, so it stays out of the rows and is only counted
  const { deferredLayers } = buildItems(input);
  return {
    audience,
    header: {
      title: input.fileName,
      subtitle: [
        "Accessibility handoff",
        date,
        ...(screens.length > 0 ? [screens.join(", ")] : [])
      ].join(" · "),
      date,
      screens,
      buildId,
      review: input.reviewer
        ? `Reviewed by ${input.reviewer.name}, ${shortDate(input.reviewer.date)}`
        : NOT_REVIEWED_LINE,
      counts: {
        rows: rows.length,
        groups: groups.length,
        needAction,
        decided: rows.length - needAction,
        deferred: deferredLayers
      }
    },
    groups,
    footer: { notCovered: NOT_COVERED_LINE.replace(/^Needs check: /, ""), limitation: CHECKS_LINE },
    empty: rows.length === 0 ? EMPTY_TABLE_SENTENCE : null
  };
}
