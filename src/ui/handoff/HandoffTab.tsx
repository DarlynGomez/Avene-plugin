import type { HandoffDataMessage } from "../../shared/handoff/handoffMessages";
import { HandoffBody } from "./HandoffBody";
import styles from "./Handoff.module.css";
import { useHandoff } from "./useHandoff";

/** Short documents for the people who build and decide, nothing here changes the design */
export function HandoffTab() {
  const handoff = useHandoff();
  if (handoff.refused) return <p className={styles.helper}>Handoff is not available right now.</p>;
  if (!handoff.data) return <p className={styles.helper}>Loading...</p>;
  return <HandoffBody data={handoff.data as HandoffDataMessage} actions={handoff} />;
}
