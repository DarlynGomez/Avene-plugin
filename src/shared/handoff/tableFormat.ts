const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 2026-11-13T10:00:00.000Z as 13 Nov 2026, from the date part so the time zone cannot move the day */
export function shortDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return iso.slice(0, 10);
  return `${day} ${MONTHS[month - 1] ?? ""} ${year}`.replace("  ", " ");
}

/** The measured ratio cut to two decimals and never rounded up, the same value the cards print, padded to two places */
export function measuredText(ratio: number): string {
  return `${(Math.floor(ratio * 100 + 1e-6) / 100).toFixed(2)}:1`;
}

export const neededText = (ratio: number): string => `${ratio}:1`;
