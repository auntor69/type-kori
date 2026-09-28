/**
 * Bangla text handling: normalization, code point classification and the
 * grapheme cluster splitter.
 *
 * A visual "character" in Bangla can be several code points (a conjunct, a
 * consonant with vowel signs, a nukta form), so everything that scores or colours
 * text works on clusters, never on raw code points or on a global index.
 *
 * The splitter is implemented here rather than delegated to `Intl.Segmenter`:
 * how that handles Indic conjuncts depends on the browser's ICU version, and
 * scoring must not change between browsers.
 */

export const NUKTA = "\u09bc";
export const HASANTA = "\u09cd";
export const CHANDRABINDU = "\u0981";
export const ANUSVARA = "\u0982";
export const VISARGA = "\u0983";
export const KHANDA_TA = "\u09ce";
export const ZWNJ = "\u200c";
export const ZWJ = "\u200d";

export type CharClass =
  | "independent-vowel"
  | "consonant"
  | "vowel-sign"
  | "syllable-mark"
  | "hasanta"
  | "nukta"
  | "joiner"
  | "bengali-digit"
  | "ascii-digit"
  | "punctuation"
  | "space"
  | "latin"
  | "other";

function inRange(codePoint: number, from: number, to: number): boolean {
  return codePoint >= from && codePoint <= to;
}

/** অ আ ই ঈ উ ঊ ঋ ঌ এ ঐ ও ঔ, plus the rare vocalic letters. */
export function isIndependentVowel(codePoint: number): boolean {
  return (
    inRange(codePoint, 0x0985, 0x098c) ||
    inRange(codePoint, 0x098f, 0x0990) ||
    inRange(codePoint, 0x0993, 0x0994) ||
    inRange(codePoint, 0x09e0, 0x09e1)
  );
}

/**
 * The consonants, including the khanda ta (its own code point, never a
 * ত + hasanta pair) and the precomposed nukta letters, which normalization
 * normally decomposes before this is reached.
 */
export function isConsonant(codePoint: number): boolean {
  return (
    inRange(codePoint, 0x0995, 0x09b9) ||
    codePoint === 0x09ce ||
    codePoint === 0x09dc ||
    codePoint === 0x09dd ||
    codePoint === 0x09df ||
    codePoint === 0x09f0 ||
    codePoint === 0x09f1
  );
}

/** Vowel signs (kar) and the length marks that behave like them. */
export function isVowelSign(codePoint: number): boolean {
  return (
    inRange(codePoint, 0x09be, 0x09c4) ||
    inRange(codePoint, 0x09c7, 0x09c8) ||
    inRange(codePoint, 0x09cb, 0x09cc) ||
    codePoint === 0x09d7 ||
    inRange(codePoint, 0x09e2, 0x09e3)
  );
}

/** Chandrabindu, anusvara, visarga. */
export function isSyllableMark(codePoint: number): boolean {
  return codePoint === 0x0981 || codePoint === 0x0982 || codePoint === 0x0983;
}

export function isJoiner(codePoint: string | undefined): boolean {
  return codePoint === ZWNJ || codePoint === ZWJ;
}

export function isBengaliDigit(codePoint: number): boolean {
  return inRange(codePoint, 0x09e6, 0x09ef);
}

export function isBengaliLetter(codePoint: number): boolean {
  return isIndependentVowel(codePoint) || isConsonant(codePoint);
}

export function classifyCodePoint(codePoint: number): CharClass {
  if (codePoint === 0x09cd) return "hasanta";
  if (codePoint === 0x09bc) return "nukta";
  if (codePoint === 0x200c || codePoint === 0x200d) return "joiner";
  if (isIndependentVowel(codePoint)) return "independent-vowel";
  if (isConsonant(codePoint)) return "consonant";
  if (isVowelSign(codePoint)) return "vowel-sign";
  if (isSyllableMark(codePoint)) return "syllable-mark";
  if (isBengaliDigit(codePoint)) return "bengali-digit";
  if (inRange(codePoint, 0x30, 0x39)) return "ascii-digit";
  if (codePoint === 0x20 || codePoint === 0x09 || codePoint === 0x0a) return "space";
  if (inRange(codePoint, 0x21, 0x40) || inRange(codePoint, 0x5b, 0x60) || inRange(codePoint, 0x7b, 0x7e)) {
    return "punctuation";
  }
  // Danda and double danda are shared with Devanagari and are correct Bangla.
  if (codePoint === 0x0964 || codePoint === 0x0965) return "punctuation";
  if (inRange(codePoint, 0x41, 0x5a) || inRange(codePoint, 0x61, 0x7a)) return "latin";
  return "other";
}

/**
 * Normalize a target or typed string before it is compared.
 *
 * NFC is enough: the precomposed nukta letters (ড় ঢ় য়) are composition
 * exclusions, so NFC decomposes them to base letter + nukta on both sides and
 * precomposed and decomposed input compare equal. Zero-width joiners are
 * deliberately preserved — they change how a conjunct is rendered.
 */
export function normalizeText(text: string): string {
  return text.normalize("NFC");
}

function consumeNukta(codePoints: string[], index: number): number {
  return codePoints[index] === NUKTA ? index + 1 : index;
}

function isSign(codePoint: string | undefined): boolean {
  if (codePoint === undefined) return false;
  const value = codePoint.codePointAt(0) as number;
  return isVowelSign(value) || isSyllableMark(value);
}

/**
 * Split text into clusters.
 *
 * Cluster ≈ `[independent vowel | consonant(+nukta)] (hasanta consonant(+nukta))*`
 * optionally with a zero-width joiner on either side of the hasanta, followed by
 * `[vowel sign | syllable mark]*`.
 */
export function splitClusters(text: string): string[] {
  const codePoints = Array.from(normalizeText(text));
  const clusters: string[] = [];
  let index = 0;

  while (index < codePoints.length) {
    const start = index;

    if (isBengaliLetter(codePoints[index].codePointAt(0) as number)) {
      index += 1;
      index = consumeNukta(codePoints, index);

      for (;;) {
        let cursor = index;
        if (isJoiner(codePoints[cursor])) cursor += 1;
        if (codePoints[cursor] !== HASANTA) break;

        let next = cursor + 1;
        if (isJoiner(codePoints[next])) next += 1;
        if (!isConsonant(codePoints[next]?.codePointAt(0) ?? -1)) {
          // A hasanta with nothing to join: keep it, as in a standalone ত্.
          index = cursor + 1;
          break;
        }
        index = consumeNukta(codePoints, next + 1);
      }
    }

    while (index < codePoints.length && isSign(codePoints[index])) index += 1;

    // Never loop forever on a code point that starts no cluster of its own.
    if (index === start) index += 1;

    clusters.push(codePoints.slice(start, index).join(""));
  }

  return clusters;
}

/** Split into words on whitespace. Empty segments are dropped. */
export function splitWords(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/u)
    .filter((word) => word.length > 0);
}

export function countCodePoints(text: string): number {
  return Array.from(text).length;
}

/** True when the text contains characters a Bangla keyboard would not produce. */
export function hasLatinLetters(text: string): boolean {
  return /[A-Za-z]/.test(text);
}

/** True when every visible character belongs to the Bengali block. */
export function isBanglaOnly(text: string): boolean {
  for (const character of text) {
    const codePoint = character.codePointAt(0) as number;
    const kind = classifyCodePoint(codePoint);
    if (kind === "space" || kind === "punctuation" || kind === "bengali-digit") continue;
    if (kind === "independent-vowel" || kind === "consonant") continue;
    if (kind === "vowel-sign" || kind === "syllable-mark") continue;
    if (kind === "hasanta" || kind === "nukta" || kind === "joiner") continue;
    return false;
  }
  return true;
}
