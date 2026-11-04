import { MessageSquare } from "lucide-react";

import { displayLabel } from "../../shared/handoff/labels";
import type { NodeNote } from "../../shared/handoff/noteStorage";
import type { Audience } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";
import notes from "./NotesCard.module.css";
import { StepCard } from "./StepCard";

interface NotesCardProps {
  notesByNode: Readonly<Record<string, NodeNote[]>>;
  names: Readonly<Record<string, string>>;
  audience: Audience;
}

function kindOf(note: NodeNote): string {
  if (note.category === "alt") return note.decorative ? "DECORATIVE IMAGE" : "ALT TEXT";
  if (note.category === "heading") return `HEADING LEVEL ${note.headingLevel ?? ""}`.trim();
  return (
    { name: "CONTROL NAME", state: "MISSING STATE", question: "QUESTION" }[note.category] ?? "NOTE"
  );
}

/** What the designer wrote about layers, listed so it is clear what will print and where */
export function NotesCard({ notesByNode, names, audience }: NotesCardProps) {
  const rows = Object.entries(notesByNode).flatMap(([nodeId, list]) =>
    list.map((note) => ({ nodeId, note }))
  );
  return (
    <StepCard
      title={`Designer Statements (${rows.length})`}
      icon={<MessageSquare size={18} aria-hidden />}
      aside={`Prints under ${displayLabel("Decision", audience)}`}
    >
      {rows.length === 0 ? (
        <p className={styles.helper}>
          No notes yet. Add one to a layer and it prints in the document.
        </p>
      ) : (
        <ul className={notes.list}>
          {rows.map(({ nodeId, note }) => (
            <li key={`${nodeId}-${note.category}`} className={notes.row}>
              <span className={notes.top}>
                <strong className={notes.layer}>{names[nodeId] || nodeId}</strong>
                <span className={styles.chip}>{kindOf(note)}</span>
              </span>
              {note.text !== "" && <span className={notes.text}>{`“${note.text}”`}</span>}
              {(note.contact || note.owner) && (
                <span className={notes.owner}>{`Owner: ${note.contact ?? note.owner}`}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </StepCard>
  );
}
