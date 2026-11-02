import { Award, Briefcase, Code2, Info, Users } from "lucide-react";
import { useId, type ComponentType } from "react";

import type { Audience } from "../../shared/handoff/types";
import styles from "./AudiencePicker.module.css";
import { StepCard } from "./StepCard";

export const AUDIENCE_NAMES: Record<Audience, string> = {
  developer: "Developers",
  pm: "Product managers",
  higherUp: "Leadership",
  client: "Client"
};

interface Reader {
  tag: string;
  about: string;
  Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}

const READERS: Record<Audience, Reader> = {
  developer: {
    tag: "RAW HEX CODES",
    about:
      "Includes raw hex values, exact contrast ratios, and links to each layer for front-end engineering.",
    Icon: Code2
  },
  pm: {
    tag: "TASK SCOPE",
    about: "What needs work, what was left as it is, and what waits on a decision. No color codes.",
    Icon: Briefcase
  },
  higherUp: {
    tag: "SIGN-OFFS",
    about: "A short summary and the decisions that are waiting for someone to approve.",
    Icon: Award
  },
  client: {
    tag: "PLAIN ENGLISH",
    about:
      "A clear report of what was checked and decided, in plain words. A draft for you to send.",
    Icon: Users
  }
};

interface AudiencePickerProps {
  value: Audience;
  onChange: (audience: Audience) => void;
}

/** Four cards, one per reader, with what each one gets written underneath */
export function AudiencePicker({ value, onChange }: AudiencePickerProps) {
  const name = useId();
  return (
    <StepCard step={2} title="Who is it for?" aside={<em>Adapts language and code</em>}>
      <div className={styles.grid} role="radiogroup" aria-label="Who is it for?">
        {(Object.keys(READERS) as Audience[]).map((audience) => {
          const { tag, Icon } = READERS[audience];
          const on = value === audience;
          return (
            <label key={audience} className={styles.card}>
              <input
                className={styles.input}
                type="radio"
                name={name}
                checked={on}
                aria-labelledby={`${name}-${audience}`}
                onChange={() => onChange(audience)}
              />
              <span className={`${styles.face} ${on ? styles.faceOn : ""}`}>
                <span className={styles.top}>
                  <Icon size={18} aria-hidden />
                  <span className={styles.tag}>{tag}</span>
                </span>
                <span id={`${name}-${audience}`} className={styles.name}>
                  {AUDIENCE_NAMES[audience]}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p className={styles.about}>
        <Info size={16} aria-hidden />
        {READERS[value].about}
      </p>
    </StepCard>
  );
}
