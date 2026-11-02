import { Square } from "lucide-react";

import { buildTickets } from "../../shared/handoff/ticket";
import type { Audience, HandoffInput } from "../../shared/handoff/types";
import styles from "./Document.module.css";

const HEADINGS = new Set(["Acceptance criteria", "Layers"]);

/** Each ticket as a card: the title, why it matters, then the criteria as a checklist */
export function TicketCards({ input, audience }: { input: HandoffInput; audience: Audience }) {
  const tickets = buildTickets(input, audience === "developer");
  if (tickets.length === 0) {
    return (
      <p className={styles.notice}>
        Nothing needs a ticket. No text contrast item needs developer action.
      </p>
    );
  }
  return (
    <div className={styles.scroll} tabIndex={0} aria-label="Tickets">
      {tickets.map((ticket) => (
        <section key={ticket.title} className={styles.panel} aria-label={ticket.title}>
          {ticket.lines.map((line, i) => {
            if (line.startsWith("Title: "))
              return (
                <strong key={i} className={styles.itemName}>
                  {line.slice(7)}
                </strong>
              );
            if (HEADINGS.has(line))
              return (
                <h4 key={i} className={styles.sectionHead}>
                  {line}
                </h4>
              );
            if (line.startsWith("- [ ] ")) {
              return (
                <p key={i} className={styles.check}>
                  <Square size={16} aria-hidden="true" />
                  <span>{line.slice(6)}</span>
                </p>
              );
            }
            return (
              <p key={i} className={styles.row}>
                {line}
              </p>
            );
          })}
        </section>
      ))}
    </div>
  );
}
