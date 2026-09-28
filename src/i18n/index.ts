import bn from "./bn.json";
import en from "./en.json";

export const languages = ["bn", "en"] as const;
export type Lang = (typeof languages)[number];

export type Dictionary = Record<string, string>;

export const dictionaries: Record<Lang, Dictionary> = { bn, en };

/** Bangla is the default: it lives at the site root, English under `/en/`. */
export const defaultLang: Lang = "bn";

export function langFromPath(pathname: string): Lang {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "bn";
}

/** Mirror a site-root-relative path into another language. */
export function localizePath(path: string, lang: Lang): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (lang === "bn") return clean;
  return clean === "/" ? "/en/" : `/en${clean}`;
}

/** Drop the `/en` prefix from a pathname. */
export function stripLang(pathname: string, lang: Lang): string {
  if (lang !== "en") return pathname;
  const stripped = pathname.replace(/^\/en(?=\/|$)/, "");
  return stripped.length === 0 ? "/" : stripped;
}

/** The same page in the other language, for the header's language link. */
export function mirrorPath(pathname: string, target: Lang): string {
  return localizePath(stripLang(pathname, langFromPath(pathname)), target);
}

export type Translate = (key: string) => string;

/**
 * Look up UI strings for a language. Missing keys fall back to Bangla and then
 * to the key itself, so a gap never renders an empty label.
 */
export function useTranslations(lang: Lang): Translate {
  const dictionary = dictionaries[lang];
  return (key) => dictionary[key] ?? dictionaries[defaultLang][key] ?? key;
}

export function languageLabel(lang: Lang): string {
  return lang === "bn" ? "বাংলা" : "English";
}
