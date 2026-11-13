import type { HandoffTableModel, TableGroup } from "../../shared/handoff/tableTypes";
import styles from "./HandoffTable.module.css";
import { StatusMark } from "./StatusMark";

interface HandoffTableProps {
  model: HandoffTableModel;
  onShow: (nodeIds: readonly string[]) => void;
}

const COLUMNS = ["Location", "Measured", "Needed", "Status", "Decision", "Decides", "Note"];

const dash = (text: string) => (text === "" ? "None" : text);

function GroupTable({ group, onShow }: { group: TableGroup; onShow: HandoffTableProps["onShow"] }) {
  const id = `handoff-group-${group.id}`;
  return (
    <section aria-labelledby={id} className={styles.group}>
      <h4 id={id} className={styles.groupTitle}>
        {group.title}
      </h4>
      <div className={styles.scroll} tabIndex={0} role="region" aria-label={`${group.title} table`}>
        <table className={styles.table}>
          <caption className={styles.caption}>
            {group.title}, {group.rows.length} {group.rows.length === 1 ? "row" : "rows"}, one for
            each item
          </caption>
          <thead>
            <tr>
              <th scope="col">Element</th>
              {COLUMNS.map((name) => (
                <th key={name} scope="col">
                  {name}
                </th>
              ))}
              <th scope="col">Find</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.element}</th>
                <td>{dash(row.location)}</td>
                <td>{row.measured ?? "None"}</td>
                <td>{row.required ?? "None"}</td>
                <td>
                  <StatusMark status={row.status} />
                </td>
                <td>{dash(row.decision)}</td>
                <td>{dash(row.decidedBy)}</td>
                <td>{dash(row.note)}</td>
                <td>
                  <button
                    type="button"
                    className={styles.find}
                    onClick={() => onShow(row.nodeIds)}
                    disabled={row.nodeIds.length === 0}
                    aria-label={`Show ${row.element} on the canvas`}
                  >
                    Show
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The model as a table: a heading and a real table for each kind of issue, and the footer said once */
export function HandoffTable({ model, onShow }: HandoffTableProps) {
  const { header, footer } = model;
  const { counts } = header;
  return (
    <div className={styles.wrap}>
      <h3 className={styles.title}>
        Accessibility handoff: {header.fileName}
        {header.screens.length > 0 ? `, ${header.screens.join(", ")}` : ""}
      </h3>
      <p className={styles.meta}>
        Made {header.date}
        {header.buildId ? `, build ${header.buildId}` : ""}. {counts.rows}{" "}
        {counts.rows === 1 ? "row" : "rows"} in {counts.groups}{" "}
        {counts.groups === 1 ? "group" : "groups"}.
      </p>
      {model.empty && <p className={styles.empty}>{model.empty}</p>}
      {model.groups.map((group) => (
        <GroupTable key={group.id} group={group} onShow={onShow} />
      ))}
      <footer className={styles.footer}>
        <p>{footer.notCovered}</p>
        <p>{footer.limitation}</p>
      </footer>
    </div>
  );
}
