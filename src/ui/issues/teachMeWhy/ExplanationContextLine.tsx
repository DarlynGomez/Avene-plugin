import { ArrowLeft } from "lucide-react";

import type { ElementRole } from "../../../shared/teachMeWhy/explanationTypes";
import styles from "./ExplanationContextLine.module.css";

interface ExplanationContextLineProps {
  name: string;
  role: ElementRole;
  measured: string;
  required: string;
  onBack: () => void;
}

/** Names the issue and its measured values, it stays in view while the explanation scrolls */
export function ExplanationContextLine({
  name,
  role,
  measured,
  required,
  onBack
}: ExplanationContextLineProps) {
  return (
    <div className={styles.line}>
      <div className={styles.text}>
        <p className={styles.name}>{role === "unknown" ? name : `${capitalise(role)}: ${name}`}</p>
        <p className={styles.detail}>
          {measured} now, {required} needed
        </p>
      </div>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={14} aria-hidden="true" />
        <span>Back to issue</span>
      </button>
    </div>
  );
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
