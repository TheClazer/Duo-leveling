// Day-boundary helper. Both users are in IST (Bible §17). Compute "today" in
// Asia/Kolkata on BOTH server (UTC on Vercel) and client so they always agree on
// which calendar day it is — otherwise habit streaks / checklist carry-over roll
// at midnight UTC (05:30 IST) instead of local midnight.
const IST = "Asia/Kolkata";

/** YYYY-MM-DD for the given instant, in IST. (en-CA formats as ISO date.) */
export function istDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** istDateString shifted by whole days (can be negative). */
export function istDateStringOffset(days: number, from: Date = new Date()): string {
  return istDateString(new Date(from.getTime() + days * 86_400_000));
}
