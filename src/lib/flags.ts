/**
 * Country-flag themes: one palette per country, built out of that flag's own
 * colours.
 *
 * The table holds facts (an ISO code, an English name, the flag's colours) and
 * the palette is *computed* by `flagTheme`, so a flag can never ship a theme
 * whose text is unreadable on its background — the derivation pushes each colour
 * until it clears a WCAG contrast floor, and the unit test re-checks every
 * generated theme against it.
 *
 * Convention: **the first colour is the flag's field** — the one that covers
 * the most cloth (Argentina's celeste, Japan's white, Libya's black). Every
 * other entry follows in no particular order.
 *
 * The palette is then the flag, read as a page:
 *
 * - the **page** is the field itself, deepened or paled but never recoloured.
 *   Deepening happens in HSL, which keeps the chroma: Argentina is a deep
 *   celeste rather than charcoal. A pale field (white, gold) makes a light
 *   theme; everything else is a dark page in its own colour.
 * - the **accent** is the flag's most vivid colour that is neither its page nor
 *   its ink: Argentina's sun, Vietnam's star, Bangladesh's disc.
 * - the **text** is the flag's own white on a dark page, and its darkest ink on
 *   a light one.
 * - the **panel** leans toward the field colour, so the flag's second colour is
 *   visible in the interface and not only in the page.
 * - the **error mark** is the flag's own red when it has one that is not the
 *   page, and a plain red when it does not.
 *
 * The colours are this project's reading of each flag's dominant colours, not an
 * official specification (see docs/DECISIONS.md).
 */

import {
  contrastRatio,
  ensureContrastToward,
  ensureLighterThan,
  hueDistance,
  hueOf,
  lightnessOf,
  luminance,
  mix,
  saturation,
  withLightness,
} from "./colors";
import type { ThemeDef } from "./themes";

export interface FlagCountry {
  /** ISO 3166-1 alpha-2, lowercase. */
  readonly code: string;
  readonly name: string;
  /** The flag's field colour first, then the other dominant colours. */
  readonly colors: readonly string[];
}

/** Contrast floors the derivation guarantees, and the test asserts. */
export const FLAG_TEXT_CONTRAST = 4.5;
export const FLAG_SOFT_CONTRAST = 3.2;

/** A field at or below this luminance makes a dark page, anything else a light one. */
const DARK_FIELD_MAX = 0.5;
/** Every dark page is deepened to this HSL lightness — and never lightened to it. */
const PAGE_LIGHTNESS = 0.16;
/** A light page is pushed at least this light, so text always has room. */
const LIGHT_PAGE_MIN = 0.86;
/** Below this saturation a colour is a neutral: no hue worth preserving. */
const NEUTRAL = 0.08;
/** Two hues closer than this read as the same colour. */
const HUE_GAP = 25;
/** Below this saturation a colour is a neutral, and never an accent. */
const VIVID = 0.15;
/** At or above this luminance a colour is ink (a flag's white), not an accent. */
const INK_LIGHT = 0.8;
/** The error mark for a flag with no red of its own. */
const WRONG_RED = "#e5484d";
/** Text drawn on an accent-coloured button in a dark theme. */
const ON_ACCENT_DARK = "#000000";
/** A table entry with no colours at all still has to generate something. */
const FALLBACK = "#888888";

export const flagCountries: readonly FlagCountry[] = [
  { code: "af", name: "Afghanistan", colors: ["#000000", "#d32011", "#007a36"] },
  { code: "al", name: "Albania", colors: ["#e41e20", "#000000"] },
  { code: "dz", name: "Algeria", colors: ["#006233", "#d21034", "#ffffff"] },
  { code: "ad", name: "Andorra", colors: ["#10069f", "#fedf00", "#d0103a"] },
  { code: "ao", name: "Angola", colors: ["#ce1126", "#000000", "#ffec00"] },
  { code: "ag", name: "Antigua and Barbuda", colors: ["#ce1126", "#000000", "#0072c6", "#fcd116"] },
  { code: "ar", name: "Argentina", colors: ["#74acdf", "#ffffff", "#f6b40e"] },
  { code: "am", name: "Armenia", colors: ["#d90012", "#0033a0", "#f2a800"] },
  { code: "au", name: "Australia", colors: ["#00008b", "#ffffff", "#ff0000"] },
  { code: "at", name: "Austria", colors: ["#ed2939", "#ffffff"] },
  { code: "az", name: "Azerbaijan", colors: ["#00b5e2", "#ef3340", "#509e2f", "#ffffff"] },
  { code: "bs", name: "Bahamas", colors: ["#00abc9", "#fae042", "#000000"] },
  { code: "bh", name: "Bahrain", colors: ["#ce1126", "#ffffff"] },
  { code: "bd", name: "Bangladesh", colors: ["#006a4e", "#f42a41"] },
  { code: "bb", name: "Barbados", colors: ["#00267f", "#ffc726", "#000000"] },
  { code: "by", name: "Belarus", colors: ["#c8313e", "#4aa657", "#ffffff"] },
  { code: "be", name: "Belgium", colors: ["#000000", "#fdda24", "#ef3340"] },
  { code: "bz", name: "Belize", colors: ["#002b7f", "#ce1126", "#ffffff"] },
  { code: "bj", name: "Benin", colors: ["#008751", "#fcd116", "#e8112d"] },
  { code: "bt", name: "Bhutan", colors: ["#ff4e12", "#ffd520", "#ffffff"] },
  { code: "bo", name: "Bolivia", colors: ["#d52b1e", "#f9e300", "#007934"] },
  { code: "ba", name: "Bosnia and Herzegovina", colors: ["#002f6c", "#fecb00", "#ffffff"] },
  { code: "bw", name: "Botswana", colors: ["#6da9d2", "#ffffff", "#000000"] },
  { code: "br", name: "Brazil", colors: ["#009739", "#fedd00", "#012169"] },
  { code: "bn", name: "Brunei", colors: ["#fce300", "#000000", "#cf1126", "#ffffff"] },
  { code: "bg", name: "Bulgaria", colors: ["#ffffff", "#00966e", "#d62612"] },
  { code: "bf", name: "Burkina Faso", colors: ["#ef2b2d", "#009e49", "#fcd116"] },
  { code: "bi", name: "Burundi", colors: ["#ce1126", "#ffffff", "#1eb53a"] },
  { code: "kh", name: "Cambodia", colors: ["#032ea1", "#e00025", "#ffffff"] },
  { code: "cm", name: "Cameroon", colors: ["#007a5e", "#ce1126", "#fcd116"] },
  { code: "ca", name: "Canada", colors: ["#d80621", "#ffffff"] },
  { code: "cv", name: "Cabo Verde", colors: ["#003893", "#ffffff", "#cf2027", "#f7d116"] },
  { code: "cf", name: "Central African Republic", colors: ["#003082", "#289728", "#ffce00", "#d21034", "#ffffff"] },
  { code: "td", name: "Chad", colors: ["#002664", "#c60c30", "#fecb00"] },
  { code: "cl", name: "Chile", colors: ["#0039a6", "#ffffff", "#d52b1e"] },
  { code: "cn", name: "China", colors: ["#de2910", "#ffde00"] },
  { code: "co", name: "Colombia", colors: ["#fcd116", "#003893", "#ce1126"] },
  { code: "km", name: "Comoros", colors: ["#3a75c4", "#fcd116", "#ffffff", "#ce1126", "#3d8e33"] },
  { code: "cg", name: "Congo", colors: ["#009543", "#fbde4a", "#dc241f"] },
  { code: "cd", name: "DR Congo", colors: ["#007fff", "#f7d618", "#ce1021"] },
  { code: "cr", name: "Costa Rica", colors: ["#002b7f", "#ffffff", "#ce1126"] },
  { code: "ci", name: "Côte d'Ivoire", colors: ["#f77f00", "#ffffff", "#009e60"] },
  { code: "hr", name: "Croatia", colors: ["#ff0000", "#ffffff", "#171796"] },
  { code: "cu", name: "Cuba", colors: ["#002a8f", "#ffffff", "#cf142b"] },
  { code: "cy", name: "Cyprus", colors: ["#ffffff", "#d57800", "#435125"] },
  { code: "cz", name: "Czechia", colors: ["#ffffff", "#d7141a", "#11457e"] },
  { code: "dk", name: "Denmark", colors: ["#c8102e", "#ffffff"] },
  { code: "dj", name: "Djibouti", colors: ["#6ab2e7", "#12ad2b", "#ffffff", "#d7141a"] },
  { code: "dm", name: "Dominica", colors: ["#006b3f", "#fcd116", "#000000", "#ffffff", "#d41c30"] },
  { code: "do", name: "Dominican Republic", colors: ["#002d62", "#ce1126", "#ffffff"] },
  { code: "ec", name: "Ecuador", colors: ["#ffd100", "#0072ce", "#ef3340"] },
  { code: "eg", name: "Egypt", colors: ["#ce1126", "#ffffff", "#000000", "#c09300"] },
  { code: "sv", name: "El Salvador", colors: ["#0f47af", "#ffffff", "#ffd100"] },
  { code: "gq", name: "Equatorial Guinea", colors: ["#3e9a00", "#ffffff", "#e32118", "#0073ce"] },
  { code: "er", name: "Eritrea", colors: ["#12ad2b", "#4189dd", "#ea0437", "#ffc726"] },
  { code: "ee", name: "Estonia", colors: ["#0072ce", "#000000", "#ffffff"] },
  { code: "sz", name: "Eswatini", colors: ["#3e5eb9", "#ffd900", "#b10c0c"] },
  { code: "et", name: "Ethiopia", colors: ["#078930", "#fcdd09", "#da121a", "#0f47af"] },
  { code: "fj", name: "Fiji", colors: ["#68bfe5", "#ffffff", "#d21034"] },
  { code: "fi", name: "Finland", colors: ["#ffffff", "#002f6c"] },
  { code: "fr", name: "France", colors: ["#002395", "#ffffff", "#ed2939"] },
  { code: "ga", name: "Gabon", colors: ["#009e60", "#fcd116", "#3a75c4"] },
  { code: "gm", name: "Gambia", colors: ["#ce1126", "#0c1c8c", "#3a7728", "#ffffff"] },
  { code: "ge", name: "Georgia", colors: ["#ffffff", "#ff0000"] },
  { code: "de", name: "Germany", colors: ["#000000", "#dd0000", "#ffce00"] },
  { code: "gh", name: "Ghana", colors: ["#ce1126", "#fcd116", "#006b3f", "#000000"] },
  { code: "gr", name: "Greece", colors: ["#0d5eaf", "#ffffff"] },
  { code: "gd", name: "Grenada", colors: ["#ce1126", "#fcd116", "#007a5e"] },
  { code: "gt", name: "Guatemala", colors: ["#4997d0", "#ffffff"] },
  { code: "gn", name: "Guinea", colors: ["#ce1126", "#fcd116", "#009460"] },
  { code: "gw", name: "Guinea-Bissau", colors: ["#ce1126", "#fcd116", "#009e49", "#000000"] },
  { code: "gy", name: "Guyana", colors: ["#009e49", "#ffffff", "#fcd116", "#ce1126", "#000000"] },
  { code: "ht", name: "Haiti", colors: ["#00209f", "#d21034", "#ffffff"] },
  { code: "hn", name: "Honduras", colors: ["#0073cf", "#ffffff"] },
  { code: "hu", name: "Hungary", colors: ["#ce2939", "#ffffff", "#477050"] },
  { code: "is", name: "Iceland", colors: ["#02529c", "#ffffff", "#dc1e35"] },
  { code: "in", name: "India", colors: ["#ff9933", "#ffffff", "#138808", "#000080"] },
  { code: "id", name: "Indonesia", colors: ["#ce1126", "#ffffff"] },
  { code: "ir", name: "Iran", colors: ["#239f40", "#ffffff", "#da0000"] },
  { code: "iq", name: "Iraq", colors: ["#ce1126", "#ffffff", "#000000", "#007a3d"] },
  { code: "ie", name: "Ireland", colors: ["#169b62", "#ffffff", "#ff883e"] },
  { code: "il", name: "Israel", colors: ["#0038b8", "#ffffff"] },
  { code: "it", name: "Italy", colors: ["#009246", "#ffffff", "#ce2b37"] },
  { code: "jm", name: "Jamaica", colors: ["#009b3a", "#fed100", "#000000"] },
  { code: "jp", name: "Japan", colors: ["#ffffff", "#bc002d"] },
  { code: "jo", name: "Jordan", colors: ["#000000", "#ffffff", "#007a3d", "#ce1126"] },
  { code: "kz", name: "Kazakhstan", colors: ["#00afca", "#fec50c"] },
  { code: "ke", name: "Kenya", colors: ["#000000", "#bb0000", "#006600", "#ffffff"] },
  { code: "ki", name: "Kiribati", colors: ["#ce1126", "#ffffff", "#003f87", "#fcd116"] },
  { code: "kp", name: "North Korea", colors: ["#024fa2", "#ed1c27", "#ffffff"] },
  { code: "kr", name: "South Korea", colors: ["#ffffff", "#cd2e3a", "#0047a0", "#000000"] },
  { code: "kw", name: "Kuwait", colors: ["#007a3d", "#ffffff", "#ce1126", "#000000"] },
  { code: "kg", name: "Kyrgyzstan", colors: ["#e8112d", "#ffef00"] },
  { code: "la", name: "Laos", colors: ["#ce1126", "#002868", "#ffffff"] },
  { code: "lv", name: "Latvia", colors: ["#9e3039", "#ffffff"] },
  { code: "lb", name: "Lebanon", colors: ["#ed1c24", "#ffffff", "#00a651"] },
  { code: "ls", name: "Lesotho", colors: ["#00209f", "#ffffff", "#000000", "#009543"] },
  { code: "lr", name: "Liberia", colors: ["#bf0a30", "#ffffff", "#002868"] },
  { code: "ly", name: "Libya", colors: ["#000000", "#e70013", "#239e46"] },
  { code: "li", name: "Liechtenstein", colors: ["#002b7f", "#ce1126", "#ffd83d"] },
  { code: "lt", name: "Lithuania", colors: ["#fdb913", "#006a44", "#c1272d"] },
  { code: "lu", name: "Luxembourg", colors: ["#ed2939", "#ffffff", "#00a1de"] },
  { code: "mg", name: "Madagascar", colors: ["#fc3d32", "#007e3a", "#ffffff"] },
  { code: "mw", name: "Malawi", colors: ["#000000", "#ce1126", "#339e35"] },
  { code: "my", name: "Malaysia", colors: ["#cc0001", "#ffffff", "#010066", "#ffcc00"] },
  { code: "mv", name: "Maldives", colors: ["#d21034", "#007e3a", "#ffffff"] },
  { code: "ml", name: "Mali", colors: ["#14b53a", "#fcd116", "#ce1126"] },
  { code: "mt", name: "Malta", colors: ["#ffffff", "#cf142b"] },
  { code: "mh", name: "Marshall Islands", colors: ["#003893", "#ffffff", "#dd7500"] },
  { code: "mr", name: "Mauritania", colors: ["#006233", "#ffc400", "#d01c1f"] },
  { code: "mu", name: "Mauritius", colors: ["#ea2839", "#1a206d", "#ffd500", "#00a551"] },
  { code: "mx", name: "Mexico", colors: ["#006847", "#ffffff", "#ce1126"] },
  { code: "fm", name: "Micronesia", colors: ["#75b2dd", "#ffffff"] },
  { code: "md", name: "Moldova", colors: ["#003da5", "#ffd200", "#cc092f"] },
  { code: "mc", name: "Monaco", colors: ["#ce1126", "#ffffff"] },
  { code: "mn", name: "Mongolia", colors: ["#c4272e", "#0066b3", "#f9cf02"] },
  { code: "me", name: "Montenegro", colors: ["#c40308", "#d4af3a", "#1c1c1c"] },
  { code: "ma", name: "Morocco", colors: ["#c1272d", "#006233"] },
  { code: "mz", name: "Mozambique", colors: ["#009739", "#000000", "#fce100", "#d21034", "#ffffff"] },
  { code: "mm", name: "Myanmar", colors: ["#fecb00", "#34b233", "#ea2839", "#ffffff"] },
  { code: "na", name: "Namibia", colors: ["#003580", "#009543", "#d21034", "#ffffff", "#ffce00"] },
  { code: "nr", name: "Nauru", colors: ["#002170", "#ffffff", "#ffb20f"] },
  { code: "np", name: "Nepal", colors: ["#dc143c", "#003893", "#ffffff"] },
  { code: "nl", name: "Netherlands", colors: ["#ae1c28", "#ffffff", "#21468b"] },
  { code: "nz", name: "New Zealand", colors: ["#00247d", "#ffffff", "#cc142b"] },
  { code: "ni", name: "Nicaragua", colors: ["#0067c6", "#ffffff"] },
  { code: "ne", name: "Niger", colors: ["#e05206", "#ffffff", "#0db02b"] },
  { code: "ng", name: "Nigeria", colors: ["#008751", "#ffffff"] },
  { code: "mk", name: "North Macedonia", colors: ["#d20000", "#ffe600", "#000000"] },
  { code: "no", name: "Norway", colors: ["#ba0c2f", "#ffffff", "#00205b"] },
  { code: "om", name: "Oman", colors: ["#db161b", "#ffffff", "#008000"] },
  { code: "pk", name: "Pakistan", colors: ["#01411c", "#ffffff"] },
  { code: "pw", name: "Palau", colors: ["#4aadd6", "#ffde00"] },
  { code: "ps", name: "Palestine", colors: ["#000000", "#ffffff", "#007a3d", "#ce1126"] },
  { code: "pa", name: "Panama", colors: ["#005293", "#ffffff", "#d21034"] },
  { code: "pg", name: "Papua New Guinea", colors: ["#000000", "#ce1126", "#fcd116", "#ffffff"] },
  { code: "py", name: "Paraguay", colors: ["#d52b1e", "#ffffff", "#0038a8"] },
  { code: "pe", name: "Peru", colors: ["#d91023", "#ffffff"] },
  { code: "ph", name: "Philippines", colors: ["#0038a8", "#ce1126", "#ffffff", "#fcd116"] },
  { code: "pl", name: "Poland", colors: ["#ffffff", "#dc143c"] },
  { code: "pt", name: "Portugal", colors: ["#046a38", "#da291c", "#ffd100"] },
  { code: "qa", name: "Qatar", colors: ["#8a1538", "#ffffff"] },
  { code: "ro", name: "Romania", colors: ["#002b7f", "#fcd116", "#ce1126"] },
  { code: "ru", name: "Russia", colors: ["#ffffff", "#0039a6", "#d52b1e"] },
  { code: "rw", name: "Rwanda", colors: ["#00a1de", "#fad201", "#20603d"] },
  { code: "kn", name: "Saint Kitts and Nevis", colors: ["#009e60", "#fcd116", "#000000", "#ce1126"] },
  { code: "lc", name: "Saint Lucia", colors: ["#66ccff", "#ffffff", "#000000", "#fcd116"] },
  { code: "vc", name: "Saint Vincent and the Grenadines", colors: ["#009e60", "#fcd116", "#002674", "#ffffff"] },
  { code: "ws", name: "Samoa", colors: ["#ce1126", "#ffffff", "#002b7f"] },
  { code: "sm", name: "San Marino", colors: ["#5eb6e4", "#ffffff"] },
  { code: "st", name: "São Tomé and Príncipe", colors: ["#12ad2b", "#ffce00", "#d21034", "#000000"] },
  { code: "sa", name: "Saudi Arabia", colors: ["#006c35", "#ffffff"] },
  { code: "sn", name: "Senegal", colors: ["#00853f", "#fdef42", "#e31b23"] },
  { code: "rs", name: "Serbia", colors: ["#c6363c", "#0c4076", "#ffffff"] },
  { code: "sc", name: "Seychelles", colors: ["#003f87", "#fcd856", "#d62828", "#007a3d", "#ffffff"] },
  { code: "sl", name: "Sierra Leone", colors: ["#1eb53a", "#ffffff", "#0072c6"] },
  { code: "sg", name: "Singapore", colors: ["#ef3340", "#ffffff"] },
  { code: "sk", name: "Slovakia", colors: ["#ffffff", "#0b4ea2", "#ee1c25"] },
  { code: "si", name: "Slovenia", colors: ["#ffffff", "#005da4", "#ed1c24"] },
  { code: "sb", name: "Solomon Islands", colors: ["#0051ba", "#215b33", "#fcd116", "#ffffff"] },
  { code: "so", name: "Somalia", colors: ["#4189dd", "#ffffff"] },
  { code: "za", name: "South Africa", colors: ["#007a4d", "#ffb612", "#de3831", "#002395", "#000000"] },
  { code: "ss", name: "South Sudan", colors: ["#000000", "#da121a", "#ffffff", "#0f47af", "#078930"] },
  { code: "es", name: "Spain", colors: ["#aa151b", "#f1bf00"] },
  { code: "lk", name: "Sri Lanka", colors: ["#8d153a", "#ff7900", "#00534e", "#ffb700"] },
  { code: "sd", name: "Sudan", colors: ["#d21034", "#ffffff", "#000000", "#007229"] },
  { code: "sr", name: "Suriname", colors: ["#377e3f", "#ffffff", "#b40a2d", "#ecc81d"] },
  { code: "se", name: "Sweden", colors: ["#006aa7", "#fecc00"] },
  { code: "ch", name: "Switzerland", colors: ["#d52b1e", "#ffffff"] },
  { code: "sy", name: "Syria", colors: ["#ce1126", "#ffffff", "#000000", "#007a3d"] },
  { code: "tw", name: "Taiwan", colors: ["#fe0000", "#000095", "#ffffff"] },
  { code: "tj", name: "Tajikistan", colors: ["#cc0000", "#ffffff", "#006600", "#f8c300"] },
  { code: "tz", name: "Tanzania", colors: ["#1eb53a", "#00a3dd", "#000000", "#fcd116"] },
  { code: "th", name: "Thailand", colors: ["#a51931", "#f4f5f8", "#2d2a4a"] },
  { code: "tl", name: "Timor-Leste", colors: ["#dc241f", "#ffc726", "#000000", "#ffffff"] },
  { code: "tg", name: "Togo", colors: ["#006a4e", "#ffce00", "#d21034", "#ffffff"] },
  { code: "to", name: "Tonga", colors: ["#c10000", "#ffffff"] },
  { code: "tt", name: "Trinidad and Tobago", colors: ["#da1a35", "#000000", "#ffffff"] },
  { code: "tn", name: "Tunisia", colors: ["#e70013", "#ffffff"] },
  { code: "tr", name: "Türkiye", colors: ["#e30a17", "#ffffff"] },
  { code: "tm", name: "Turkmenistan", colors: ["#00843d", "#d22630", "#ffffff", "#f2a900"] },
  { code: "tv", name: "Tuvalu", colors: ["#00247d", "#ffffff", "#fcd116"] },
  { code: "ug", name: "Uganda", colors: ["#000000", "#fcdc04", "#d90000", "#ffffff"] },
  { code: "ua", name: "Ukraine", colors: ["#005bbb", "#ffd500"] },
  { code: "ae", name: "United Arab Emirates", colors: ["#00732f", "#ffffff", "#000000", "#ff0000"] },
  { code: "gb", name: "United Kingdom", colors: ["#012169", "#ffffff", "#c8102e"] },
  { code: "us", name: "United States", colors: ["#3c3b6e", "#ffffff", "#b22234"] },
  { code: "uy", name: "Uruguay", colors: ["#ffffff", "#0038a8", "#fcd116"] },
  { code: "uz", name: "Uzbekistan", colors: ["#0099b5", "#ffffff", "#1eb53a", "#ce1126"] },
  { code: "vu", name: "Vanuatu", colors: ["#000000", "#fdce12", "#009543", "#d21034"] },
  { code: "va", name: "Vatican City", colors: ["#ffffff", "#ffd700"] },
  { code: "ve", name: "Venezuela", colors: ["#ffcc00", "#00247d", "#cf142b", "#ffffff"] },
  { code: "vn", name: "Vietnam", colors: ["#da251d", "#ffff00"] },
  { code: "ye", name: "Yemen", colors: ["#ce1126", "#ffffff", "#000000"] },
  { code: "zm", name: "Zambia", colors: ["#198a00", "#000000", "#ef7d00", "#de2010"] },
  { code: "zw", name: "Zimbabwe", colors: ["#006400", "#ffd200", "#d40000", "#000000", "#ffffff"] },
];

/** 🇧🇩 from `bd`, with no image and no data table. */
export function flagEmoji(code: string): string {
  return code
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 2)
    .replace(/[a-z]/g, (letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 97));
}

export function flagThemeId(code: string): string {
  return `flag-${code.toLowerCase()}`;
}/**
 * A text colour that clears `ratio` against `bg` while keeping `hue`'s hue.
 *
 * A colour that already clears the ratio is kept exactly as it is — that is
 * what keeps Ukraine's yellow and Kazakhstan's gold as accents. Otherwise the
 * hue is walked toward white and toward black in small steps, and the first
 * candidate in each direction that clears the floor is taken: whichever passing
 * candidate sits closest to the original lightness wins, so the colour moves by
 * as little as readability demands. Both walks are bounded.
 */
function textOnBackground(hue: string, bg: string, ratio: number): string {
  if (contrastRatio(hue, bg) >= ratio) return hue;

  const lighter = ensureContrastToward(hue, bg, ratio, "light");
  const darker = ensureContrastToward(hue, bg, ratio, "dark");
  const lightOk = contrastRatio(lighter, bg) >= ratio;
  const darkOk = contrastRatio(darker, bg) >= ratio;

  if (lightOk && darkOk) {
    const drift = (candidate: string) => Math.abs(luminance(candidate) - luminance(hue));
    return drift(lighter) <= drift(darker) ? lighter : darker;
  }
  return lightOk ? lighter : darker;
}

/** The most saturated colour of `list`, or null when every entry is a neutral. */
function vividOf(list: readonly string[]): string | null {
  return (
    [...list]
      .filter((color) => saturation(color) > VIVID)
      .sort((a, b) => saturation(b) - saturation(a))[0] ?? null
  );
}

/**
 * The flag's own red, when it has one that is not its page: the error mark.
 * Restricted to the red band of the hue circle, so Argentina's sun gold and
 * Kazakhstan's gold are never mistaken for one.
 */
function reddest(colors: readonly string[], field: string): string | null {
  const neutralField = saturation(field) < NEUTRAL;
  const isRed = (color: string) => {
    const hue = hueOf(color);
    return saturation(color) > 0.3 && (hue >= 335 || hue <= 20);
  };

  return (
    [...colors]
      .filter((color) => isRed(color) && (neutralField || hueDistance(color, field) >= HUE_GAP))
      .sort((a, b) => saturation(b) - saturation(a))[0] ?? null
  );
}

/**
 * The page colour: the flag's field, deepened or paled, never recoloured.
 *
 * A dark field is set to `PAGE_LIGHTNESS` in HSL, which keeps its hue and its
 * chroma — mix it with black instead and Argentina's celeste turns to slate. A
 * field that is already darker than that (Germany's black) is left exactly as
 * it is. A pale field makes a light page: a saturated one is washed toward white
 * so the page is readable, a neutral one is already a page.
 */
function pageColor(field: string, dark: boolean): string {
  if (dark) {
    return lightnessOf(field) > PAGE_LIGHTNESS ? withLightness(field, PAGE_LIGHTNESS) : field;
  }
  if (saturation(field) < NEUTRAL) return field;
  return ensureLighterThan(mix(field, "#ffffff", 0.6), LIGHT_PAGE_MIN);
}

/** The flag's own white, on a page dark enough for it, else plain white. */
function lightInk(colors: readonly string[]): string {
  return (
    [...colors]
      .filter((color) => luminance(color) >= INK_LIGHT)
      .sort((a, b) => luminance(b) - luminance(a))[0] ?? "#ffffff"
  );
}

/**
 * The accent: the flag's most vivid colour that is neither its page nor its ink.
 *
 * Near-white and near-black are the ink and the page, not an accent, and a
 * colour within `HUE_GAP` of the field would read as the page itself — so a flag
 * that offers nothing else (Denmark's white, Guatemala's white) gets a pushed
 * version of its own field, which is still recognisably that flag. The winner is
 * then walked away from the page just far enough to be seen, and no further: a
 * flag that already contrasts (Ukraine's yellow) keeps its exact colour.
 */
function accentColor(colors: readonly string[], field: string, bg: string, dark: boolean): string {
  const neutralField = saturation(field) < NEUTRAL;
  const usable = (color: string) =>
    saturation(color) > VIVID &&
    luminance(color) < INK_LIGHT &&
    (neutralField || hueDistance(color, field) >= HUE_GAP);

  // Equally vivid colours are split by how far their hue sits from the page's,
  // so Germany's black field takes gold over red and not whichever came first.
  const ranked = [...colors]
    .filter(usable)
    .sort(
      (a, b) =>
        saturation(b) - saturation(a) || hueDistance(b, field) - hueDistance(a, field),
    );
  const source = ranked[0] ?? vividOf(colors) ?? field;
  return ensureContrastToward(source, bg, FLAG_SOFT_CONTRAST, dark ? "light" : "dark");
}

/**
 * Turn one flag's colours into a usable palette.
 *
 * Argentina's blue, white and gold: the page is a deep celeste, the text is the
 * flag's white, the accent is the sun's gold. Japan's white and red: the page is
 * white, the words and the accent are the flag's red. Every colour a flag
 * contributes is one of its own, moved only as far as readability demands, so a
 * theme looks like the flag it came from instead of charcoal with a tint.
 */
export function flagTheme(country: FlagCountry): ThemeDef {
  const colors = country.colors.length > 0 ? country.colors : [FALLBACK];
  const field = colors[0] ?? FALLBACK;
  const darkestInk = [...colors].sort((a, b) => luminance(a) - luminance(b))[0] ?? field;

  const dark = luminance(field) < DARK_FIELD_MAX;
  const bg = pageColor(field, dark);
  // The panel leans toward the field, so a flag's second colour is visible in
  // the interface too. A flag whose field *is* its page (pure white, pure black)
  // has nothing to lean toward and gets a plain step instead.
  const surface = field === bg ? mix(bg, dark ? "#ffffff" : "#000000", 0.07) : mix(bg, field, 0.3);
  const accent = accentColor(colors, field, bg, dark);

  const text = dark ? lightInk(colors) : textOnBackground(darkestInk, bg, FLAG_TEXT_CONTRAST);
  const muted = textOnBackground(mix(bg, text, 0.35), bg, FLAG_SOFT_CONTRAST);

  // The caret and the error mark both sit in the typing area at the same time,
  // so they must not be the same colour: a flag whose accent *is* its red
  // (France, Bangladesh) has its error mark pushed one step further away.
  const wrongSource = reddest(colors, field) ?? WRONG_RED;
  let wrong = textOnBackground(wrongSource, bg, FLAG_SOFT_CONTRAST);
  if (wrong === accent) wrong = textOnBackground(WRONG_RED, bg, FLAG_SOFT_CONTRAST);

  return {
    id: flagThemeId(country.code),
    label: `${flagEmoji(country.code)} ${country.name}`,
    dark,
    bg,
    surface,
    text,
    muted,
    accent,
    accentSoft: mix(bg, accent, dark ? 0.2 : 0.14),
    wrong,
    // The accent is a background for buttons, so the text on top of it is
    // whichever pole reads better on the accent itself.
    onAccent: contrastRatio(accent, "#ffffff") >= contrastRatio(accent, ON_ACCENT_DARK)
      ? "#ffffff"
      : ON_ACCENT_DARK,
  };
}

/** Every flag theme, in the same order as the table, derived exactly once. */
export const flagThemes: readonly ThemeDef[] = flagCountries.map(flagTheme);

/** Contrast of a theme's text against its own background, for the test. */
export function themeTextContrast(theme: ThemeDef): number {
  return contrastRatio(theme.text, theme.bg);
}

/** Flag theme id → theme, so the picker and the command parser agree. */
export const flagThemeById = new Map(flagThemes.map((theme) => [theme.id, theme]));
