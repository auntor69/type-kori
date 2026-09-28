import { describe, expect, it } from "vitest";

import { splitClusters } from "../engine/unicode";
import { buildWeakKeyText, topWeakKeys } from "./weakKeys";

describe("topWeakKeys", () => {
  it("ranks by misses, strongest first", () => {
    const keys = topWeakKeys({
      "ক": { missed: 1, seen: 5 },
      "্ষ": { missed: 9, seen: 12 },
      "্র": { missed: 4, seen: 8 },
    });

    expect(keys.map((key) => key.cluster)).toEqual(["্ষ", "্র", "ক"]);
  });

  it("keeps only well-formed clusters", () => {
    const keys = topWeakKeys({ "ক": { missed: 3, seen: 5 }, "কখ": { missed: 9, seen: 9 } });
    expect(keys.map((key) => key.cluster)).toEqual(["ক"]);
  });

  it("returns nothing when the map is empty", () => {
    expect(topWeakKeys({})).toEqual([]);
  });
});

describe("buildWeakKeyText", () => {
  const syllables = ["কষ্ট", "জ্ঞান", "স্কুল", "ক্ষমা", "দ্বার"];

  it("returns null with no recorded mistakes", () => {
    expect(buildWeakKeyText({}, syllables)).toBeNull();
  });

  it("returns null with no carrier syllables", () => {
    expect(buildWeakKeyText({ "ক": { missed: 2, seen: 4 } }, [])).toBeNull();
  });

  it("weaves every weak cluster into the drill", () => {
    const text = buildWeakKeyText(
      {
        "ক": { missed: 6, seen: 8 },
        "ষ": { missed: 2, seen: 3 },
      },
      syllables,
    );

    expect(text).not.toBeNull();
    const drill = text?.text ?? "";
    expect(drill).toContain("ক");
    expect(drill).toContain("ষ");
    // The stronger miss (ক via কষ্ট) repeats more often than ষ via কষ্ট alone.
    expect(drill.split(" ").length).toBeGreaterThanOrEqual(3);
  });
});
