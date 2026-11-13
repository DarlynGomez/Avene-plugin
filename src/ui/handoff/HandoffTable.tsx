import type { HandoffTableModel, TableGroup, TableRow } from "../../shared/handoff/tableTypes";
import styles from "./HandoffTable.module.css";

interface HandoffTableProps {
  model: HandoffTableModel;
  onShow: (nodeIds: readonly string[]) => void;
}

/** The element's name, then where it is, anything short to know about it, and the link that finds it */
function ElementBlock({ row, onShow }: { row: TableRow; onShow: HandoffTableProps["onShow"] }) {
  const facts = [row.location, ...row.details].filter((part) => part !== "");
  return (
    <>
      <span className={styles.name}>{row.element}</span>
      <span className={styles.where}>
        {facts.map((fact) => (
          <span key={fact}>{fact} · </span>
        ))}
        <button
          type="button"
          className={styles.show}
          onClick={() => onShow(row.nodeIds)}
          disabled={row.nodeIds.length === 0}
          aria-label={`Show ${row.element} in Figma`}
        >
          Show
        </button>
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
          <td className={styles.contrast}>
            <span className={styles.measured}>{row.contrast?.measured}</span>
            {row.contrast?.required && (
              <span className={styles.needs}>needs {row.contrast.required}</span>
            )}
          </td>
        )}
        <td className={row.status.needsAction ? styles.statusStrong : styles.statusQuiet}>
          {row.status.text}
        </td>
      </tr>
      <tr>
        <td colSpan={columns} className={row.detail.muted ? styles.detailQuiet : styles.detail}>
          {row.detail.text}
        </td>
      </tr>
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
          <colgroup>
            <col />
            {contrast && <col className={styles.fixed} />}
            <col className={styles.fixed} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">{contrast ? "Element" : "Image"}</th>
              {contrast && <th scope="col">Contrast</th>}
              <th scope="col" className={styles.right}>
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
  const { header, footer } = model;
  return (
    <article className={styles.wrap} aria-labelledby="handoff-title">
      <header>
        <p id="handoff-title" className={styles.title}>
          {header.title}
        </p>
        <p className={styles.subtitle}>{header.subtitle}</p>
        <p className={styles.counts}>
          <strong>{header.counts.needAction} need action</strong>, {header.counts.decided} decided
        </p>
      </header>
      {model.empty && <p className={styles.empty}>{model.empty}</p>}
      {model.groups.map((group) => (
        <Group key={group.id} group={group} onShow={onShow} />
      ))}
      <footer className={styles.footer}>
        <p>{footer.notCovered}</p>
        {header.buildId && <p className={styles.build}>Build {header.buildId}</p>}
      </footer>
    </article>
  );
}
