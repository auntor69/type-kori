import type { Lang } from "../i18n";

export interface Feature {
  title: string;
  line: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface HomeCopy {
  /** One quiet line under the wordmark. */
  tagline: string;
  h1: string;
  /** A single sentence — the old three-sentence lead is gone. */
  lead: string;
  primaryCta: string;
  lessonsCta: string;
  /** Small print under the typing area, replaces the old keyboard-note card. */
  footnote: string;
  featuresTitle: string;
  features: Feature[];
  howTitle: string;
  how: Feature[];
  faqTitle: string;
  faq: FaqItem[];
  closingTitle: string;
  closingCta: string;
}

export const homeCopy: Record<Lang, HomeCopy> = {
  bn: {
    tagline: "ফ্রি · সাইন-আপ নেই · বিজ্ঞাপন নেই",
    h1: "বাংলা টাইপিং",
    lead: "কীবোর্ডে বাংলা টাইপ শিখুন — শুরু করুন নিচের লেখাটি দিয়ে।",
    primaryCta: "শুরু করুন",
    lessonsCta: "১২টি পাঠ",
    footnote: "ফিজিক্যাল কীবোর্ডে সবচেয়ে ভালো · ডেটা শুধু আপনার ব্রাউজারে",
    featuresTitle: "কেন Type Kori",
    features: [
      { title: "যুক্তাক্ষর সঠিক", line: "ক্ষ, স্ত, ন্দ — অক্ষরগুচ্ছ ধরে মিলানো হয়।" },
      { title: "আপনার কীবোর্ড", line: "যে বাংলা কীবোর্ড ইনস্টল আছে, সেটিই চলে।" },
      { title: "কিছুই সার্ভারে যায় না", line: "অ্যাকাউন্ট নেই; সব শুধু ব্রাউজারে।" },
      { title: "নিজের লেখা", line: "লেখা পেস্ট করে সেটাতেই প্র্যাকটিস।" },
      { title: "সৎ হিসাব", line: "WPM আর নির্ভুলতার সূত্র ফলাফলেই লেখা।" },
    ],
    howTitle: "কীভাবে কাজ করে",
    how: [
      { title: "লেখাটি দেখুন", line: "প্রথম কী চাপলেই সময় শুরু।" },
      { title: "টাইপ করুন", line: "স্পেসে শব্দ কমিট হয়।" },
      { title: "ফলাফল দেখুন", line: "গতি, নির্ভুলতা, ভুলের জায়গা।" },
    ],
    faqTitle: "প্রশ্ন",
    faq: [
      {
        question: "WPM কীভাবে?",
        answer: "সঠিক শব্দ ÷ মিনিট। শুধু কমিট করা শব্দ গোনা হয়।",
      },
      {
        question: "নির্ভুলতা কীভাবে?",
        answer: "সঠিক অক্ষরগুচ্ছ ÷ কমিট করা শব্দের মোট লক্ষ্য অক্ষরগুচ্ছ।",
      },
      {
        question: "ডেটা কোথায়?",
        answer: "শুধু আপনার ব্রাউজারে — কোনো সার্ভার নেই।",
      },
      {
        question: "মোবাইলে?",
        answer: "পড়া যায়, তবে টাইপিংয়ের জন্য কম্পিউটারই ভালো।",
      },
    ],
    closingTitle: "এখনই শুরু করুন",
    closingCta: "উপরে টাইপ করা শুরু করুন",
  },

  en: {
    tagline: "Free · no sign-up · no ads",
    h1: "Bangla typing",
    lead: "Learn to type Bangla on a keyboard — start with the text below.",
    primaryCta: "Start",
    lessonsCta: "12 lessons",
    footnote: "Best with a physical keyboard · data stays in your browser",
    featuresTitle: "Why Type Kori",
    features: [
      { title: "Conjuncts judged right", line: "ক্ষ, স্ত, ন্দ — compared as whole clusters." },
      { title: "Your own keyboard", line: "Whatever Bangla layout is installed just works." },
      { title: "Nothing leaves the device", line: "No account; everything stays local." },
      { title: "Your own text", line: "Paste a passage and drill exactly that." },
      { title: "Honest numbers", line: "The WPM and accuracy formulas are printed on screen." },
    ],
    howTitle: "How it works",
    how: [
      { title: "Read", line: "The clock starts on your first key." },
      { title: "Type", line: "Space commits a word." },
      { title: "Learn", line: "Speed, accuracy, and where it went wrong." },
    ],
    faqTitle: "Questions",
    faq: [
      {
        question: "How is WPM calculated?",
        answer: "Correct words ÷ minutes. Only committed words count.",
      },
      {
        question: "How is accuracy calculated?",
        answer: "Correct clusters ÷ total target clusters in committed words.",
      },
      {
        question: "Where is my data?",
        answer: "In your browser only — there is no server.",
      },
      {
        question: "Does it work on a phone?",
        answer: "It reads fine, but practice is best on a computer.",
      },
    ],
    closingTitle: "Start now",
    closingCta: "Start typing above",
  },
};
