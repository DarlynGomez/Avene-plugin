import { useCallback, useEffect, useMemo, useState } from "react";

import { offerFor, type DraftOffer } from "../../shared/handoff/blockDraft";
import { newestEntry, type DraftCache } from "../../shared/handoff/draftCache";
import { applyEdit, warningsFor } from "../../shared/handoff/editDraft";
import type { Audience, AudienceDoc } from "../../shared/handoff/types";
import { askDraftServer } from "./draftClient";
import { blockKey, draftableSections, runDrafts } from "./runDrafts";

interface Pick {
  chosen: "template" | "model";
  filled: string[] | null;
  edited: boolean[];
}

export interface BlockView {
  id: string;
  title: string;
  offer: DraftOffer;
  chosen: "template" | "model";
  filled: string[];
  edited: boolean[];
  warnings: string[];
  note: string;
}

const BLANK: Pick = { chosen: "template", filled: null, edited: [] };
const ALL: readonly Audience[] = ["developer", "pm", "higherUp", "client"];
const describe = (v: { detail: string; match?: string }) =>
  v.match ? `${v.detail}: ${v.match}` : v.detail;

/** Drafts for the chosen reader: what is offered, what is chosen, edits with their checks, and the runs */
export function useDrafts(
  docs: Readonly<Record<Audience, AudienceDoc>>,
  audience: Audience,
  saved: DraftCache,
  onSave: (cache: DraftCache) => void
) {
  const [cache, setCache] = useState(saved);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setCache(saved), [saved]);
  const doc = docs[audience];

  const blocks: BlockView[] = useMemo(
    () =>
      draftableSections(doc).map((section) => {
        const key = blockKey(audience, section.id);
        const offer = offerFor(newestEntry(cache, audience, section.id), section, doc);
        const pick = picks[key] ?? BLANK;
        const ready = offer.state === "ready";
        const filled = ready ? (pick.filled ?? offer.filled) : [];
        const chosen = ready ? pick.chosen : "template";
        const warnings =
          chosen === "model"
            ? warningsFor(filled, { templateLines: section.lines, slots: doc.slots }).map(describe)
            : [];
        return {
          id: section.id,
          title: section.title,
          offer,
          chosen,
          filled,
          edited: pick.edited,
          warnings,
          note: notes[key] ?? ""
        };
      }),
    [doc, audience, cache, picks, notes]
  );

  const choose = useCallback(
    (blockId: string, chosen: "template" | "model") =>
      setPicks((p) => ({
        ...p,
        [blockKey(audience, blockId)]: { ...(p[blockKey(audience, blockId)] ?? BLANK), chosen }
      })),
    [audience]
  );

  const edit = useCallback(
    (blockId: string, index: number, shown: string) => {
      const block = blocks.find((b) => b.id === blockId);
      const section = doc.sections.find((s) => s.id === blockId);
      if (!block || !section) return;
      const key = blockKey(audience, blockId);
      const result = applyEdit(block.filled, index, shown, audience, {
        templateLines: section.lines,
        slots: doc.slots
      });
      setNotes((n) => ({
        ...n,
        [key]:
          result.blocked.length > 0
            ? "That change was not kept. It held a number, a color code or a claim that CADT cannot stand behind."
            : ""
      }));
      if (result.blocked.length > 0) return;
      const edited = block.edited.length ? [...block.edited] : block.filled.map(() => false);
      edited[index] = true;
      setPicks((p) => ({ ...p, [key]: { chosen: block.chosen, filled: result.filled, edited } }));
    },
    [blocks, doc, audience]
  );

  const run = useCallback(
    async (all: boolean) => {
      setBusy(true);
      const result = await runDrafts(
        { ask: (r) => askDraftServer(r), now: () => new Date().toISOString() },
        docs,
        all ? ALL : [audience],
        cache,
        (done, total) => setStatus(`Drafting ${Math.min(done + 1, total)} of ${total}...`)
      );
      setCache(result.cache);
      setNotes((n) => ({ ...n, ...result.notes }));
      setPicks({});
      if (result.cache !== cache) onSave(result.cache);
      setStatus(
        result.stopped ??
          "Drafts are ready to look at. Template text stays until you choose a draft."
      );
      setBusy(false);
    },
    [docs, audience, cache, onSave]
  );

  const chosenText = Object.fromEntries(
    blocks.filter((b) => b.chosen === "model").map((b) => [b.id, b.filled])
  );
  const aiTitles = blocks.filter((b) => b.chosen === "model").map((b) => b.title);
  const draftWarnings = blocks
    .filter((b) => b.chosen === "model")
    .flatMap((b) => b.warnings.map((w) => `${b.title}: ${w}`));
  return { blocks, choose, edit, run, status, busy, chosenText, aiTitles, draftWarnings };
}
