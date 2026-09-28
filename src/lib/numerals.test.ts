import { describe, expect, it } from "vitest";

import { formatNumeral } from "./numerals";

describe("formatNumeral", () => {
  it("keeps latin digits untouched", () => {
    expect(formatNumeral(42, "latin")).toBe("42");
    expect(formatNumeral("12:30", "latin")).toBe("12:30");
  });

  it("converts every digit to Bengali", () => {
    expect(formatNumeral(42, "bengali")).toBe("৪২");
    expect(formatNumeral("0123456789", "bengali")).toBe("০১২৩৪৫৬৭৮৯");
  });

  it("leaves non-digits alone", () => {
    expect(formatNumeral("1m 30s", "bengali")).toBe("১m ৩০s");
    expect(formatNumeral("12%", "bengali")).toBe("১২%");
  });
});
