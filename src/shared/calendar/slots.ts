const MORNING_HOUR = 10;
const AFTERNOON_HOUR = 14;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pad = (value: number, width = 2) => String(value).padStart(width, "0");
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const isWeekday = (date: Date) => date.getDay() >= 1 && date.getDay() <= 5;

/** The next working day after the one given, at midnight */
export function nextWorkday(from: Date): Date {
  const day = startOfDay(from);
  do {
    day.setDate(day.getDate() + 1);
  } while (!isWeekday(day));
  return day;
}

/** Morning at ten or afternoon at two on the next working day */
export function suggestStart(now: Date, part: "morning" | "afternoon"): Date {
  const day = nextWorkday(now);
  day.setHours(part === "morning" ? MORNING_HOUR : AFTERNOON_HOUR);
  return day;
}

export function endOf(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60_000);
}

export function formatClock(date: Date): string {
  const hours = date.getHours();
  const shown = hours % 12 === 0 ? 12 : hours % 12;
  return `${shown}:${pad(date.getMinutes())} ${hours < 12 ? "AM" : "PM"}`;
}

/** Tomorrow when it is a working day, otherwise the weekday it falls on */
export function dayLabel(now: Date, start: Date): string {
  const tomorrow = startOfDay(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return startOfDay(start).getTime() === tomorrow.getTime()
    ? "Tomorrow"
    : DAY_NAMES[start.getDay()];
}

export function partLabel(start: Date): string {
  return start.getHours() < 12 ? "morning" : "afternoon";
}

/** A date and a time as typed into the two fields, null when either is not a real moment */
export function customStart(dateText: string, timeText: string): Date | null {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  const time = /^(\d{2}):(\d{2})$/.exec(timeText);
  if (!date || !time) return null;
  const [year, month, day, hour, minute] = [date[1], date[2], date[3], time[1], time[2]].map(
    Number
  );
  const moment = new Date(year, month - 1, day, hour, minute);
  const real =
    moment.getFullYear() === year &&
    moment.getMonth() === month - 1 &&
    moment.getDate() === day &&
    hour < 24 &&
    minute < 60;
  return real ? moment : null;
}

/** Local wall time with no zone, so a calendar reads it in the owner's own zone */
export function localStamp(date: Date): string {
  const day = `${pad(date.getFullYear(), 4)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function utcStamp(date: Date): string {
  const day = `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
  return `${day}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

/** Value for a date field and a time field */
export function fieldValues(date: Date): { date: string; time: string } {
  return {
    date: `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  };
}
