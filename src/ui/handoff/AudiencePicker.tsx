import { Award, Briefcase, Code2, Users } from "lucide-react";
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
  Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}

const READERS: Record<Audience, Reader> = {
  developer: {
    tag: "RAW HEX CODES",
    Icon: Code2
  },
  pm: {
    tag: "TASK SCOPE",
    Icon: Briefcase
  },
  higherUp: {
    tag: "SIGN-OFFS",
    Icon: Award
  },
  client: {
    tag: "PLAIN ENGLISH",
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
    </StepCard>
  );
}
