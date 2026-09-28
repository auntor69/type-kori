import type { Lang } from "../i18n";

/**
 * The home page is the test — there is no other copy. The title and the
 * description metadata still come from `meta.*` in the i18n files.
 */
export interface HomeCopy {
  /** The wordmark line above the test. */
  h1: string;
}

export const homeCopy: Record<Lang, HomeCopy> = {
  bn: { h1: "বাংলা টাইপিং" },
  en: { h1: "Bangla typing" },
};
