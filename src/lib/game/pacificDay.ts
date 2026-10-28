const PACIFIC = "America/Los_Angeles";

type PacificParts = {
  year: number;
  month: number;
  day: number;
};

/** YEAR, ZERO-BASED MONTH, AND DAY ON THE PACIFIC CLOCK. */
export function pacificParts(date = new Date()): PacificParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: value("year"),
    month: value("month") - 1,
    day: value("day"),
  };
}

/** YYYY-MM-DD IN AMERICA/LOS_ANGELES. A DAILY OPENS AT PACIFIC MIDNIGHT. */
export function pacificDateKey(date = new Date()): string {
  const { year, month, day } = pacificParts(date);
  const monthText = String(month + 1).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return `${year}-${monthText}-${dayText}`;
}
