import { useEffect, useMemo } from "react";

import { focusItemsOf } from "../../shared/calendar/focusItems";
import { dueItems } from "../../shared/calendar/suggest";
import type { Root } from "../../shared/grouping/groupingTypes";
import type { IssueSummary } from "../../shared/issues/issueTypes";
import { SheetOverlay } from "../issues/components/SheetOverlay";
import { useCalendar } from "./CalendarContext";
import { ScheduleSheet } from "./ScheduleSheet";

interface CalendarLayerProps {
  /** Every root that is not decided, deferred ones included */
  roots: readonly Root[];
  issuesById: ReadonlyMap<string, IssueSummary>;
}

/** Keeps the counts to roots that still exist, and shows the sheet when a deferral reaches the trigger */
export function CalendarLayer({ roots, issuesById }: CalendarLayerProps) {
  const calendar = useCalendar();
  const liveKey = useMemo(() => roots.map((root) => root.signature).join("\n"), [roots]);
  const { available, requestState } = calendar;

  useEffect(() => {
    if (available && liveKey !== "") requestState(liveKey.split("\n"));
  }, [available, liveKey, requestState]);

  if (!available || calendar.pending === null) return null;
  const items = focusItemsOf(roots, issuesById, calendar.counts);
  const due = dueItems(items, calendar.settings.trigger);
  const shown = due.some((item) => item.signature === calendar.pending)
    ? due
    : items.filter((item) => item.signature === calendar.pending);
  if (shown.length === 0) return null;

  return (
    <SheetOverlay>
      <ScheduleSheet
        items={shown}
        settings={calendar.settings}
        fileUrl={calendar.fileUrl}
        onOpenUrl={calendar.openUrl}
        onScheduled={calendar.scheduled}
        onClose={calendar.dismiss}
      />
    </SheetOverlay>
  );
}
