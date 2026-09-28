/**
 * Weak-key drills: turn the recorded error map (target cluster → miss counts)
 * into a focused practice text. The engine already records every mistyped
 * cluster (Section 7.5), so the drill is a pure transform over stored data.
 */

import type { PracticeText } from "../engine/text/provider";
import { splitClusters } from "../engine/unicode";

export interface WeakKey {
  cluster: string;
  missed: number;
}

/**
 * The clusters the user misses most, strongest first, capped. A key is one
 * typeable unit: a bare grapheme (ক, ি) or a hasanta-led conjunct (্ষ, ্র).
 * Entries that split into several such units (কখ) are dropped.
 */
export function topWeakKeys(
  errorMap: Readonly<Record<string, { missed: number; seen: number }>>,
  limit = 10,
): WeakKey[] {
  return Object.entries(errorMap)
    .filter(([cluster]) => {
      if (cluster.length === 0) return false;
      const parts = splitClusters(cluster);
      return parts.length === 1 || (parts.length === 2 && parts[0] === "্");
    })
    .map(([cluster, counts]) => ({ cluster, missed: counts.missed }))
    .sort((a, b) => b.missed - a.missed || a.cluster.localeCompare(b.cluster, "bn"))
    .slice(0, limit);
}

/**
 * Build one drill text: every weak cluster woven into short real Bangla words,
 * the weakest cluster appearing most. Returns null when there is nothing to
 * drill yet (no mistakes recorded, or no single-cluster entries).
 */
export function buildWeakKeyText(
  errorMap: Readonly<Record<string, { missed: number; seen: number }>>,
  syllables: readonly string[],
  now: number = Date.now(),
): PracticeText | null {
  const weak = topWeakKeys(errorMap);
  if (weak.length === 0 || syllables.length === 0) return null;

  // Repetition weight: the top cluster appears three times as often as the
  // weakest of the set, so focus follows the misses without becoming chant.
  const maxMissed = weak[0].missed;
  const words: string[] = [];

  for (const { cluster, missed } of weak) {
    const weight = Math.max(1, Math.round((missed / maxMissed) * 3));
    const carrier = syllables.find((syllable) => syllable.includes(cluster));
    const word = carrier ?? cluster;

    for (let i = 0; i < weight; i += 1) words.push(word);
  }

  // Interleave so identical words never sit next to each other.
  for (let i = words.length - 1; i > 0; i -= 1) {
    if (words[i] === words[i - 1]) {
      const swap = (i + 1) % words.length;
      [words[i], words[swap]] = [words[swap], words[i]];
    }
  }

  void now;

  return {
    id: "weak-keys",
    text: words.join(" "),
    difficulty: "hard",
    topic: "weak keys",
    source: "original",
    reviewed: true,
  };
}
