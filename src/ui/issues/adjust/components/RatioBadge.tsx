import { passLevel } from "../../../../shared/colour/passLevel";
import styles from "./RatioBadge.module.css";

interface RatioBadgeProps {
  achievedRatio: number;
  requiredRatio: number;
}

/** A neutral pill with ratio and pass level, or how far short it falls, inline beside the title */
export function RatioBadge({ achievedRatio, requiredRatio }: RatioBadgeProps) {
  const reaches = achievedRatio >= requiredRatio;
  const verdict = reaches
    ? passLevel(achievedRatio, requiredRatio)
    : `below ${Number(requiredRatio.toFixed(2))}`;

  return (
    <span className={styles.badge}>
      {achievedRatio.toFixed(2)}:1 (<span className={styles.level}>{verdict}</span>)
    </span>
  );
}
