import { ChevronDown, ChevronRight } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { countLabel } from "../../../shared/handoff/alt/altCopy";
import styles from "./SectionAccordion.module.css";

interface SectionAccordionProps {
  title: string;
  roots: number;
  issues: number;
  /** A big section of the list, or one group inside it, the group is a size smaller */
  level?: "top" | "group";
  defaultOpen?: boolean;
  /** Give both to keep the open state outside, as the two big sections do for the session */
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}

/** A name, how much is in it, and an arrow, opening to show what is inside */
export function SectionAccordion({
  title,
  roots,
  issues,
  level = "group",
  defaultOpen = true,
  open,
  onToggle,
  children
}: SectionAccordionProps) {
  const id = useId();
  const [own, setOwn] = useState(defaultOpen);
  const isOpen = open ?? own;
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  return (
    <section className={`${styles.section} ${level === "top" ? styles.top : ""}`}>
      <h2 className={styles.heading}>
        <button
          type="button"
          className={styles.header}
          aria-expanded={isOpen}
          aria-controls={`${id}-body`}
          onClick={() => (onToggle ? onToggle() : setOwn(!own))}
        >
          <span className={styles.title}>{title}</span>
          <span className={styles.bubble}>{countLabel(roots, issues)}</span>
          <Chevron className={styles.chevron} size={18} aria-hidden="true" />
        </button>
      </h2>
      {isOpen && (
        <div id={`${id}-body`} className={styles.body}>
          {children}
        </div>
      )}
    </section>
  );
}
