import type { Lang } from "../i18n";

/**
 * Long-form prose for the progress page. The island below it has the data; this
 * is here so the page is still worth reading, and worth indexing, without
 * JavaScript (Section 11).
 */
export interface ProgressCopy {
  title: string;
  description: string;
  h1: string;
  lead: string;
  whatTitle: string;
  whatBody: string;
  formulaTitle: string;
  formulas: { term: string; body: string }[];
  dataTitle: string;
  dataBody: string;
}

export const progressCopy: Record<Lang, ProgressCopy> = {
  bn: {
    title: "অগ্রগতি | Type Kori",
    description:
      "আপনার বাংলা টাইপিংয়ের হিস্ট্রি: গতি, নির্ভুলতা আর যে অক্ষরগুলো বেশি ভুল হয়। সবই শুধু আপনার ব্রাউজারে থাকে।",
    h1: "আপনার অগ্রগতি",
    lead: "শেষ করা প্রতিটি রান শুধু এই ব্রাউজারেই জমা থাকে। কোথাও আপলোড হয় না, আর লগইন করার কিছু নেই।",
    whatTitle: "কী সংরক্ষিত হয়",
    whatBody:
      "প্রতিটি শেষ করা রানের জন্য এক লাইন: কখন হয়েছিল, কোন ইনপুট মোড, গতি, নির্ভুলতা আর কত সময় টাইপ করেছেন। ভুল গণনা হয় বাংলা অক্ষরগুচ্ছ ধরে, তাই কোন অক্ষর বা কার-চিহ্নে বারবার ভুল হচ্ছে তা তালিকায় স্পষ্ট দেখা যায়।",
    formulaTitle: "সংখ্যাগুলো কীভাবে হিসাব হয়",
    formulas: [
      { term: "WPM", body: "সঠিক শব্দ ÷ অতিক্রান্ত মিনিট। শুধু কমিট করা শব্দ হিসাব হয়।" },
      {
        term: "নির্ভুলতা",
        body: "সঠিক অক্ষরগুচ্ছ ÷ কমিট করা শব্দের মোট লক্ষ্য অক্ষরগুচ্ছ।",
      },
      {
        term: "সবচেয়ে বেশি ভুল",
        body: "একটি লক্ষ্য অক্ষরগুচ্ছ কতবার ভুল হয়েছে ÷ সেটি মোট কতবার এসেছে।",
      },
    ],
    dataTitle: "এক্সপোর্ট, ইমপোর্ট, রিসেট",
    dataBody:
      "এক্সপোর্ট করলে সেটিংস, হিস্ট্রি ও ভুলের তালিকা নিয়ে একটি JSON ফাইল নামে। ইমপোর্ট সেই ফাইল পড়ে এই ব্রাউজারের ডেটা বদলে দেয়, তাই অন্য কম্পিউটারে যাওয়াটা একটি ফাইলের কাজ। রিসেট করলে Type Kori-র সব কী মুছে যায়, আর কিছুই না।",
  },

  en: {
    title: "Progress | Type Kori",
    description:
      "Your Bangla typing history: speed, accuracy and the characters you miss most. Everything stays in your browser.",
    h1: "Your progress",
    lead: "Every finished run is kept in this browser only. Nothing is uploaded, and there is no account to sign into.",
    whatTitle: "What is recorded",
    whatBody:
      "One line per finished run: when it happened, which input mode you used, your speed, your accuracy and how long you typed. Mistakes are counted per Bangla cluster, so the most-missed list can name the exact letters and vowel signs that catch you out.",
    formulaTitle: "How the numbers are calculated",
    formulas: [
      { term: "WPM", body: "Correct words ÷ elapsed minutes. Only committed words count." },
      { term: "Accuracy", body: "Correct clusters ÷ total target clusters in committed words." },
      { term: "Most missed", body: "How often a target cluster was mistyped ÷ how often it appeared." },
    ],
    dataTitle: "Export, import, reset",
    dataBody:
      "Export downloads a single JSON file holding your settings, history and error map. Import reads that file back and replaces the data in this browser, so moving to another computer is one file. Reset deletes every key Type Kori owns, and nothing else.",
  },
};
