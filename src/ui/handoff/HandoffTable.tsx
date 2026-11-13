import { Search } from "lucide-react";

import type { HandoffTableModel, TableGroup, TableRow } from "../../shared/handoff/tableTypes";
import styles from "./HandoffTable.module.css";

interface HandoffTableProps {
  model: HandoffTableModel;
  onShow: (nodeIds: readonly string[]) => void;
}

/** The magnifier that finds the row's layers in the file */
function ShowButton({ row, onShow }: { row: TableRow; onShow: HandoffTableProps["onShow"] }) {
  return (
    <button
      type="button"
      className={styles.show}
      onClick={() => onShow(row.nodeIds)}
      disabled={row.nodeIds.length === 0}
      aria-label={`Show ${row.element} in Figma`}
    >
      <Search size={14} aria-hidden="true" />
    </button>
  );
}

/** The element's name, then where it is and anything short to know about it, with the magnifier at the end of the line that has the room */
function ElementBlock({ row, onShow }: { row: TableRow; onShow: HandoffTableProps["onShow"] }) {
  const facts = [row.location, ...row.details].filter((part) => part !== "");
  const button = <ShowButton row={row} onShow={onShow} />;
  // With nothing to say about where it is, the magnifier would sit alone on a line, so it follows the name
  if (facts.length === 0) {
    return (
      <span className={styles.name}>
        {row.element}
        <span className={styles.afterName}>{button}</span>
      </span>
    );
  }
  return (
    <>
      <span className={styles.name}>{row.element}</span>
      <span className={styles.where}>
        {facts.map((fact) => (
          <span key={fact}>{fact} · </span>
        ))}
        {button}
      </span>
    </>
  );
}

function ItemRows({
  row,
  contrast,
  onShow
}: {
  row: TableRow;
  contrast: boolean;
  onShow: HandoffTableProps["onShow"];
}) {
  const columns = contrast ? 3 : 2;
  return (
    <tbody>
      <tr>
        <th scope="row" className={styles.element}>
          <ElementBlock row={row} onShow={onShow} />
        </th>
        {contrast && (
          <td className={`${styles.contrast} ${styles.fit}`}>
            <span className={styles.measured}>{row.contrast?.measured}</span>
            {row.contrast?.required && (
              <span className={styles.needs}>needs {row.contrast.required}</span>
            )}
          </td>
        )}
        <td
          className={`${row.status.needsAction ? styles.statusStrong : styles.statusQuiet} ${styles.fit}`}
        >
          {row.status.text}
        </td>
      </tr>
      {(row.detail || row.notes.length > 0) && (
        <tr>
          <td colSpan={columns} className={styles.detail}>
            {row.detail && (
              <span className={row.detail.muted ? styles.quiet : styles.line}>
                {row.detail.text}
              </span>
            )}
            {row.notes.map((note) => (
              <span key={note.text} className={note.tone === "quiet" ? styles.note : styles.line}>
                {note.text}
              </span>
            ))}
          </td>
        </tr>
      )}
    </tbody>
  );
}

function Group({ group, onShow }: { group: TableGroup; onShow: HandoffTableProps["onShow"] }) {
  const id = `handoff-group-${group.id}`;
  const contrast = group.id === "contrast";
  return (
    <section className={styles.group}>
      <h2 id={id} className={styles.groupTitle}>
        {group.title} <span className={styles.count}>{group.rows.length}</span>
      </h2>
      <div className={styles.box}>
        <table className={styles.table} aria-labelledby={id}>
          <thead>
            <tr>
              <th scope="col">{contrast ? "Element" : "Image"}</th>
              {contrast && (
                <th scope="col" className={styles.fit}>
                  Contrast
                </th>
              )}
              <th scope="col" className={`${styles.right} ${styles.fit}`}>
                Status
              </th>
            </tr>
          </thead>
          {group.rows.map((row) => (
            <ItemRows key={row.id} row={row} contrast={contrast} onShow={onShow} />
          ))}
        </table>
      </div>
    </section>
  );
}

/** The model as a document: the file as the title, a section for each kind of issue, and the footer once */
export function HandoffTable({ model, onShow }: HandoffTableProps) {
  const { header } = model;
  return (
    <article className={styles.wrap} aria-labelledby="handoff-title">
      <header>
        <p id="handoff-title" className={styles.title}>
          {header.title}
        </p>
        <p className={styles.subtitle}>{header.subtitle}</p>
        <p className={styles.counts}>
          <strong>{header.counts.needAction} need action</strong>, {header.counts.decided} decided
          {header.counts.deferred > 0 && `, ${header.counts.deferred} deferred, not listed`}
        </p>
      </header>
      {model.empty && <p className={styles.empty}>{model.empty}</p>}
      {model.groups.map((group) => (
        <Group key={group.id} group={group} onShow={onShow} />
      ))}
    </article>
  );
}
