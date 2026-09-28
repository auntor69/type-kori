/**
 * Bengali numeral rendering. The digits map one-to-one onto ASCII, so the
 * conversion is a pure string transform with no locale machinery — and it is
 * unit-tested like one.
 */

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

/** Render a number (or digit string) in the requested numeral style. */
export function formatNumeral(
  value: number | string,
  style: "latin" | "bengali",
): string {
  const raw = String(value);

  if (style !== "bengali") return raw;

  return raw.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)]);
}
