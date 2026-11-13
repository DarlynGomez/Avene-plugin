import { X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

import { eventSummary } from "../../shared/calendar/eventSummary";
import { buildIcs, eventUid, ICS_MIME } from "../../shared/calendar/ics";
import { customStart, fieldValues, suggestStart } from "../../shared/calendar/slots";
import { buildEvent, sessionMinutes } from "../../shared/calendar/suggest";
import type { CalendarSettings, FocusItem } from "../../shared/calendar/types";
import { useSheetFocus } from "../handoff/useSheetFocus";
import { copyText } from "../study/downloadFile";
import { downloadText } from "./downloadText";
import { FocusSummary } from "./FocusSummary";
import styles from "./Schedule.module.css";
import { ScheduleButtons } from "./ScheduleButtons";
import { SlotChoices } from "./SlotChoices";

interface ScheduleSheetProps {
  items: readonly FocusItem[];
  settings: CalendarSettings;
  fileUrl: string | null;
  onOpenUrl: (url: string) => void;
  /** Called when the sheet closes after the designer used a calendar button, so the counts start again */
  onScheduled: (signatures: string[]) => void;
  onClose: () => void;
}

/** Sets time aside to decide the deferred roots, the calendar gets the measured facts and a link back */
export function ScheduleSheet({
  items,
  settings,
  fileUrl,
  onOpenUrl,
  onScheduled,
  onClose
}: ScheduleSheetProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const now = useMemo(() => new Date(), []);
  const suggested = useMemo(
    () => suggestStart(now, settings.slot === "afternoon" ? "afternoon" : "morning"),
    [now, settings.slot]
  );
  const [mode, setMode] = useState<"suggested" | "custom">(
    settings.slot === "custom" ? "custom" : "suggested"
  );
  const [date, setDate] = useState(fieldValues(suggested).date);
  const [time, setTime] = useState(fieldValues(suggested).time);
  const [status, setStatus] = useState("");
  const [used, setUsed] = useState(false);
  const start = mode === "custom" ? customStart(date, time) : suggested;
  const event = start ? buildEvent(items, start, settings, fileUrl ?? undefined) : null;
  const signatures = items.map((item) => item.signature);
  const close = () => (used ? onScheduled(signatures) : onClose());
  useSheetFocus(ref, close);

  function use(message: string) {
    setUsed(true);
    setStatus(message);
  }
  return (
    <div
      ref={ref}
      className={styles.sheet}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-t`}
    >
      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h2 id={`${id}-t`} className={styles.title}>
              Schedule Focus Time
            </h2>
            <span className={styles.chip}>
              {items.length === 1 ? `Deferred ${items[0].deferCount}x` : `${items.length} items`}
            </span>
          </div>
          <p className={styles.sub}>
            {`Set aside time on your calendar to review ${items.length === 1 ? "this decision" : "these decisions"} in Figma.`}
          </p>
        </div>
        <button type="button" className={styles.close} aria-label="Close" onClick={close}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <hr className={styles.rule} />
      <FocusSummary items={items} />
      <SlotChoices
        now={now}
        suggested={suggested}
        minutes={sessionMinutes(items.length, settings)}
        mode={mode}
        onMode={setMode}
        date={date}
        time={time}
        onDate={setDate}
        onTime={setTime}
        invalid={mode === "custom" && !start}
      />
      <hr className={styles.rule} />
      <ScheduleButtons
        event={event}
        format={settings.format}
        onGoogle={(url) => {
          onOpenUrl(url);
          use("Opened in your browser. Save the event there.");
        }}
        onDownload={() => {
          if (!event || !start) return;
          downloadText(
            "avene-focus-time.ics",
            buildIcs(event, eventUid(signatures, start), new Date()),
            ICS_MIME
          );
          use("Downloaded. If nothing arrived, copy the event text instead.");
        }}
      />
      <button
        type="button"
        className={styles.link}
        disabled={!event}
        onClick={async () =>
          event &&
          use(
            (await copyText(eventSummary(event)))
              ? "Copied the event text."
              : "Copying did not work here."
          )
        }
      >
        Copy the event text instead
      </button>
      <p className={styles.status} role="status">
        {status}
      </p>
    </div>
  );
}
