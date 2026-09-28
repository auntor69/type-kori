import type { Lang } from "../i18n";

/**
 * The whole home page is the test. Everything a returning visitor might need
 * (lessons, progress, privacy) lives in the header and footer, so the copy
 * below is all there is.
 */
export interface HomeCopy {
  /** One quiet line under the wordmark. */
  tagline: string;
  h1: string;
  /** A single sentence. */
  lead: string;
  /** Small print under the typing area. */
  footnote: string;
}

export const homeCopy: Record<Lang, HomeCopy> = {
  bn: {
    tagline: "ফ্রি · সাইন-আপ নেই · বিজ্ঞাপন নেই",
    h1: "বাংলা টাইপিং",
    lead: "কীবোর্ডে বাংলা টাইপ শিখুন — শুরু করুন নিচের লেখাটি দিয়ে।",
    footnote: "ফিজিক্যাল কীবোর্ডে সবচেয়ে ভালো · ডেটা শুধু আপনার ব্রাউজারে",
  },

  en: {
    tagline: "Free · no sign-up · no ads",
    h1: "Bangla typing",
    lead: "Learn to type Bangla on a keyboard — start with the text below.",
    footnote: "Best with a physical keyboard · data stays in your browser",
  },
};
