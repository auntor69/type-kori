import type { Lang } from "../i18n";

export interface Card {
  title: string;
  body: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface HomeCopy {
  eyebrow: string;
  h1: string;
  lead: string;
  primaryCta: string;
  secondaryCta: string;
  lessonsCta: string;
  keyboardNote: string;
  toolsTitle: string;
  toolsLead: string;
  featuresTitle: string;
  featuresLead: string
  features: Card[];
  howTitle: string;
  how: Card[];
  modesTitle: string;
  modesLead: string;
  modes: Card[];
  faqTitle: string;
  faq: FaqItem[];
  closingTitle: string;
  closingBody: string;
}

export const homeCopy: Record<Lang, HomeCopy> = {
  bn: {
    eyebrow: "ফ্রি · সাইন-আপ নেই · বিজ্ঞাপন নেই",
    h1: "বাংলা টাইপিং শিখুন",
    lead: "কম্পিউটারের কীবোর্ডে বাংলা টাইপ করা শিখুন ও অনুশীলন করুন। যুক্তাক্ষর আর কার-চিহ্ন ঠিকভাবে মিলিয়ে দেখে, আর ফলাফল হিসাব করা হয় সৎ সূত্রে। আপনার প্রগ্রেস শুধু আপনার ব্রাউজারেই থাকে।",
    primaryCta: "টাইপ করা শুরু করুন",
    secondaryCta: "কীভাবে কাজ করে",
    lessonsCta: "বারোটি পাঠ দেখুন",
    keyboardNote:
      "বাংলা টাইপিং অনুশীলনের জন্য ফিজিক্যাল কীবোর্ডসহ কম্পিউটার সবচেয়ে ভালো। মোবাইলেও সব লেখা পড়া যাবে।",
    toolsTitle: "প্র্যাকটিস",
    toolsLead: "নিচের লেখাটি টাইপ করুন। প্রথম কী চাপার সঙ্গে সঙ্গে সময় শুরু হবে।",
    featuresTitle: "কেন Type Kori",
    featuresLead: "বাংলার জন্য তৈরি, ইংরেজি ট্রেনার থেকে অনুবাদ করা নয়।",
    features: [
      {
        title: "যুক্তাক্ষর ঠিকভাবে যাচাই",
        body: "ক্ষ, স্ত, ন্দ — বাংলার একটি অক্ষর আসলে কয়েকটি কোড পয়েন্ট দিয়ে লেখা হয়। অ্যাপ অক্ষরগুচ্ছ ধরে ধরে মিলিয়ে দেখে, তাই রঙ কখনো এলোমেলো হয় না।",
      },
      {
        title: "আপনার নিজের কীবোর্ডেই",
        body: "কম্পিউটারে যে বাংলা কীবোর্ড ইনস্টল করা আছে, সেটিই ব্যবহার করুন। কী চাপলেন নয় — কী লেখা হলো, সেটাই হিসাব হয়।",
      },
      {
        title: "ডেটা সার্ভারে যায় না",
        body: "অ্যাকাউন্ট নেই, কুকি নেই, ট্র্যাকার নেই। সেটিংস ও ফলাফল শুধু আপনার ব্রাউজারে জমা থাকে, আর চাইলে এক্সপোর্ট করা যাবে।",
      },
      {
        title: "সৎ হিসাব",
        body: "WPM, নির্ভুলতা ও সময় — সবই স্পষ্ট সূত্রে হিসাব করা এবং ফলাফলের পাতায় লেখা থাকে। বানানো প্রশংসা নেই।",
      },
    ],
    howTitle: "কীভাবে কাজ করে",
    how: [
      {
        title: "লেখাটি দেখুন",
        body: "স্ক্রিনে বাংলা লেখা হাজির। ধীরে হলেও টাইপ শুরু করুন, আলাদা করে কিছু চালু করতে হবে না।",
      },
      {
        title: "প্রথম চাপেই ঘড়ি",
        body: "প্রথম কী চাপার সঙ্গে সঙ্গে সময় শুরু হয়। শব্দ শেষ হলে স্পেস দিন, পরের শব্দে চলে যাবেন।",
      },
      {
        title: "ফলাফল দেখে শিখুন",
        body: "শেষে গতি, নির্ভুলতা, সময় আর কোথায় ভুল হয়েছে তা দেখা যাবে। আবার চেষ্টা করুন বা নতুন লেখা নিন।",
      },
    ],
    modesTitle: "দুটি ইনপুট মোড",
    modesLead: "সিস্টেম কীবোর্ড মোড ডিফল্ট; বিল্ট-ইন ফোনেটিক মোড এখন পরীক্ষামূলক প্রিভিউ হিসেবে আছে।",
    modes: [
      {
        title: "সিস্টেম কীবোর্ড",
        body: "আপনার কম্পিউটারে থাকা বাংলা কীবোর্ডই ব্যবহার করুন। যেকোনো লেআউটে কাজ করে, ইনস্টল করার কিছু নেই।",
      },
      {
        title: "বিল্ট-ইন ফোনেটিক (প্রিভিউ)",
        body: "রোমান হাতে টাইপ করলে অ্যাপ নিজেই বাংলা বানায় — ইনস্টল করার কিছু নেই। নেটিভ স্পিকার এখনো নিয়মগুলো যাচাই করেননি, তাই এটি পরীক্ষামূলক।",
      },
    ],
    faqTitle: "সাধারণ প্রশ্ন",
    faq: [
      {
        question: "WPM কীভাবে হিসাব হয়?",
        answer:
          "WPM = সঠিক শব্দ ÷ অতিক্রান্ত মিনিট। শুধু কমিট করা শব্দ, অর্থাৎ স্পেস বা এন্টার দিয়ে শেষ করা শব্দ হিসাব হয়।",
      },
      {
        question: "নির্ভুলতা কীভাবে হিসাব হয়?",
        answer:
          "নির্ভুলতা = সঠিক অক্ষরগুচ্ছ ÷ কমিট করা শব্দের মোট লক্ষ্য অক্ষরগুচ্ছ। ভুল চিহ্ন একবার দেখে ঠিক করলে সেটি আলাদা করে দেখানো হয়।",
      },
      {
        question: "আমার ডেটা কোথায় থাকে?",
        answer:
          "শুধু আপনার ব্রাউজারে। কোনো অ্যাকাউন্ট, কুকি বা ট্র্যাকার নেই, আর আপনার লেখা কোনো সার্ভারে যায় না।",
      },
      {
        question: "মোবাইলে কি কাজ করে?",
        answer:
          "সব লেখা মোবাইলে পড়া যায় এবং পেজ ভালোভাবে দেখা যায়, তবে টাইপিং অনুশীলনের জন্য ফিজিক্যাল কীবোর্ডসহ কম্পিউটারই আসল লক্ষ্য।",
      },
    ],
    closingTitle: "এখনই শুরু করুন",
    closingBody:
      "কোনো অ্যাকাউন্ট লাগবে না, কোনো ডাউনলোড নেই। উপরের প্র্যাকটিস অংশে টাইপ করা শুরু করুন, বাকিটা অ্যাপ দেখে নেবে।",
  },

  en: {
    eyebrow: "Free · no sign-up · no ads",
    h1: "Learn Bangla typing",
    lead: "Learn and practise typing Bangla on a computer keyboard. Conjuncts and vowel signs are compared properly, the numbers come from honest formulas, and your progress stays in your own browser.",
    primaryCta: "Start typing",
    secondaryCta: "How it works",
    lessonsCta: "See the twelve lessons",
    keyboardNote:
      "Bangla typing practice works best on a computer with a physical keyboard. Everything still reads well on a phone.",
    toolsTitle: "Practice",
    toolsLead: "Type the text below. The clock starts on your first keystroke.",
    featuresTitle: "Why Type Kori",
    featuresLead: "Built for Bangla, not an English trainer translated.",
    features: [
      {
        title: "Conjuncts judged correctly",
        body: "ক্ষ, স্ত, ন্দ — a single Bangla letter can be several code points. The app compares whole clusters, so the colours never drift out of place.",
      },
      {
        title: "Your own keyboard",
        body: "Use whatever Bangla keyboard is already installed. What you typed is what gets judged, not which keys you pressed to get there.",
      },
      {
        title: "Nothing leaves your device",
        body: "No accounts, no cookies, no trackers. Settings and results are stored in your browser only, and you can export them.",
      },
      {
        title: "Honest numbers",
        body: "WPM, accuracy and time all come from formulas printed on the results screen. No invented encouragement.",
      },
    ],
    howTitle: "How it works",
    how: [
      {
        title: "Read the text",
        body: "Bangla text is already on screen. Start typing, slowly is fine; there is nothing to switch on first.",
      },
      {
        title: "The clock starts on your first key",
        body: "Timing begins with the first keystroke. Press space to commit a word and move to the next one.",
      },
      {
        title: "Learn from the results",
        body: "At the end you see speed, accuracy, time and exactly where the mistakes were. Try again or take a new text.",
      },
    ],
    modesTitle: "Two input modes",
    modesLead: "System keyboard mode is the default; built-in phonetic mode is an experimental preview.",
    modes: [
      {
        title: "System keyboard",
        body: "Use the Bangla keyboard already installed on your computer. Works with any layout, nothing to install.",
      },
      {
        title: "Built-in phonetic (preview)",
        body: "Type Roman letters and the app converts them to Bangla — nothing to install. A native speaker has not verified the rules yet, so it is experimental.",
      },
    ],
    faqTitle: "Common questions",
    faq: [
      {
        question: "How is WPM calculated?",
        answer:
          "WPM = correct words ÷ elapsed minutes. Only committed words count, meaning words you finished with space or Enter.",
      },
      {
        question: "How is accuracy calculated?",
        answer:
          "Accuracy = correct clusters ÷ total target clusters in committed words. Mistakes you backspaced away are reported separately.",
      },
      {
        question: "Where is my data stored?",
        answer:
          "In your browser only. There is no account, no cookie and no tracker, and your text never goes to a server.",
      },
      {
        question: "Does it work on a phone?",
        answer:
          "Every page reads well on a phone, but practice is aimed at a computer with a physical keyboard.",
      },
    ],
    closingTitle: "Start now",
    closingBody:
      "No account and nothing to download. Start typing in the practice area above and the app takes care of the rest.",
  },
};
