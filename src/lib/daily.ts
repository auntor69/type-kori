/**
 * The daily challenge: one fixed word stream a day, identical in every browser.
 *
 * The endless stream is already a pure function of a seed — the same seed draws
 * the same words — so "the same challenge for everyone" needs no server, no
 * account and no sync. Everyone derives the seed from the date the same way, and
 * a link carrying that date is all a challenge link has to be.
 */

/** Local calendar day as `YYYY-MM-DD`: the challenge's identity. */
export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** True for a well-formed `YYYY-MM-DD` key, including a real calendar date. */
export function isDayKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

/**
 * Fold a day key into a run seed. Deterministic and dependency-free, so the same
 * day gives the same numbers on every device; the result is kept inside the
 * 31-bit range the run seed uses, and never 0 (a seed of 0 would be a run that
 * reused the previous one's first line).
 */
export function seedFromKey(key: string): number {
  let hash = 0x2f6e2b1;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 0x7fff_ffff;
  }
  return hash === 0 ? 1 : hash;
}

/** The seed for one day's challenge. */
export function daySeed(date: Date = new Date()): number {
  return seedFromKey(dayKey(date));
}
