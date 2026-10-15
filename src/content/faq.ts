import { CUSTOM_MAX_CHARS, CUSTOM_MIN_CHARS, CUSTOM_MIN_WORDS } from "../lib/customText";
import { RUN_LIMIT } from "../lib/progress";
import type { Localized } from "./guides";

/**
 * The FAQ and the About page (docs/MASTERPLAN.md Section 11: `/faq` explains how
 * WPM and accuracy are calculated, exactly as Section 7.5 defines them).
 *
 * Answers must stay true to the code: the numbers here are imported from the
 * modules that enforce them, so a limit can never be advertised differently from
 * the one that is applied. Bangla copy is a first draft for a native speaker.
 */

export interface FaqItem {
  question: Localized;
  answer: Localized;
}

export const faqItems: FaqItem[] = [
  {
    question: {
      bn: "WPM কীভাবে হিসাব করা হয়?",
      en: "How is WPM calculated?",
    },
    answer: {
      bn: "WPM = সঠিক শব্দ ÷ অতিক্রান্ত মিনিট। শুধু কমিট হওয়া শব্দ হিসাবে ধরা হয়, অর্থাৎ যেগুলো আপনি স্পেস বা এন্টার দিয়ে শেষ করেছেন; চলতি শব্দটি রান শেষে কমিট হয়। একটি শব্দ সঠিক তখনই, যখন তার চূড়ান্ত ইউনিকোড লেখা লক্ষ্যের সাথে মিলে যায়।",
      en: "WPM is correct words ÷ elapsed minutes. Only committed words count — the ones you finished with space or Enter; the word in progress is committed when the run ends. A word is correct when its final Unicode text matches the target.",
    },
  },
  {
    question: {
      bn: "নির্ভুলতা ও নিয়মিততা মানে কী?",
      en: "What do accuracy and consistency mean?",
    },
    answer: {
      bn: "নির্ভুলতা = সঠিক ক্লাস্টার ÷ কমিট হওয়া শব্দের মোট লক্ষ্য ক্লাস্টার, শতাংশে। বাঙলায় একটি দৃশ্যমান অক্ষর একাধিক কোড পয়েন্ট হতে পারে, তাই হিসাব হয় ক্লাস্টার ধরে। নিয়মিততা বলে আপনার গতি কতটা সমান ছিল: ১০০ মানে ঘড়ির মতো সমান, আর কম মানে গতি ওঠানামা করেছে।",
      en: "Accuracy is correct clusters ÷ total target clusters in committed words, as a percentage. A Bangla character can be several code points, so everything is counted in clusters. Consistency says how steady your speed was: 100 is a metronome, lower means it went up and down.",
    },
  },
  {
    question: {
      bn: "আমার ডেটা কোথায় থাকে? কেউ দেখতে পায়?",
      en: "Where is my data stored? Can anyone see it?",
    },
    answer: {
      bn: "সবকিছু আপনার ব্রাউজারেই থাকে — সেটিংস, রান-হিস্ট্রি, ভুলের তালিকা, নিজের লেখা। কোনো অ্যাকাউন্ট নেই, কোনো সার্ভার নেই, কোনো ট্র্যাকার নেই। অগ্রগতির পাতায় একটি JSON ফাইলে সব এক্সপোর্ট করা যায়, আর সেটি ইমপোর্ট করে অন্য কম্পিউটারে নেওয়া যায়।",
      en: "Everything stays in your browser: settings, run history, the error map, your own pasted text. There is no account, no server, no tracker. The progress page exports it all as one JSON file, which you can import on another computer.",
    },
  },
  {
    question: {
      bn: "নিজের লেখা দিয়ে প্র্যাকটিস করা যায়?",
      en: "Can I practise my own text?",
    },
    answer: {
      bn: `হ্যাঁ। প্র্যাকটিস পাতায় “নিজের লেখা” খুলে যেকোনো বাংলা লেখা পেস্ট করুন। শর্ত শুধু তিনটি: শুধু বাংলা, ${CUSTOM_MIN_CHARS}–${CUSTOM_MAX_CHARS} অক্ষর, আর অন্তত ${CUSTOM_MIN_WORDS} শব্দ। লেখাটি কোথাও আপলোড হয় না — শুধু এই ব্রাউজারে জমা থাকে।`,
      en: `Yes. On the practice page open "Your own text" and paste any Bangla passage. The only rules are: Bangla only, ${CUSTOM_MIN_CHARS}–${CUSTOM_MAX_CHARS} characters, and at least ${CUSTOM_MIN_WORDS} words. It is never uploaded — it is kept in this browser.`,
    },
  },
  {
    question: {
      bn: "কত রান সংরক্ষিত থাকে?",
      en: "How many runs are kept?",
    },
    answer: {
      bn: `সর্বশেষ ${RUN_LIMIT}টি রান সংরক্ষিত থাকে, সবচেয়ে নতুনটি আগে। এর পরে পুরোনো রান মুছে যায়। আপনি যেকোনো সময় সব ডেটা এক্সপোর্ট করে রাখতে পারেন, অথবা এক ক্লিকে সব মুছে ফেলতে পারেন।`,
      en: `The most recent ${RUN_LIMIT} runs are kept, newest first; older ones fall off. You can export everything at any time, or delete it all with one button.`,
    },
  },
  {
    question: {
      bn: "ইন্টারনেট ছাড়া কাজ করে?",
      en: "Does it work offline?",
    },
    answer: {
      bn: "হ্যাঁ। প্রথমবার খোলার পরে সাইটটি ইনস্টল করে রাখলে ইন্টারনেট ছাড়াও কাজ করে — ফন্ট, সব লেখা ও অ্যাপের অংশ ব্রাউজারে জমা থাকে। বিল্ট-ইন ফোনেটিক মোড ছাড়া আর কিছুই চালাতে ইন্টারনেট লাগে না।",
      en: "Yes. After the first visit you can install it and it keeps working with no network — the fonts, all the texts and the app shell are cached. Nothing needs the network to run apart from the initial download.",
    },
  },
];

export interface AboutCopy {
  title: Localized;
  lead: Localized;
  paragraphs: Localized[];
}

export const aboutCopy: AboutCopy = {
  title: {
    bn: "Type Kori সম্পর্কে",
    en: "About Type Kori",
  },
  lead: {
    bn: "Type Kori (টাইপ করি) একটি বিনামূল্যের বাংলা টাইপিং ট্রেনার — বিজ্ঞাপন নেই, সাইন-আপ নেই, আর আপনার ডেটা আপনার ডিভাইসেই থাকে।",
    en: "Type Kori (টাইপ করি) is a free Bangla typing trainer — no ads, no sign-up, and your data stays on your device.",
  },
  paragraphs: [
    {
      bn: "বাংলা টাইপিং শেখার জন্য আধুনিক, বিজ্ঞাপনমুক্ত ও ইন্টারনেট ছাড়াও চলা কোনো টুল ছিল না। পুরোনো ডেস্কটপ প্রোগ্রাম, বিজ্ঞাপনে ভরা পাতা, কিংবা ইংরেজির জন্য বানানো ট্রেনার — যেগুলো বাংলার যুক্তাক্ষর ও কার-চিহ্ন ঠিকভাবে ধরতে পারে না। Type Kori সেই ফাঁকটুকু ভরার চেষ্টা।",
      en: "There was no modern, ad-free, offline-capable tool for learning Bangla typing: old desktop programs, ad-heavy pages, or trainers built for English that mishandle Bangla conjuncts and vowel signs. Type Kori is an attempt to fill that gap.",
    },
    {
      bn: "এটি সম্পূর্ণ স্ট্যাটিক সাইট — কোনো ব্যাকএন্ড নেই, কোনো ডেটাবেস নেই, কোনো অ্যাকাউন্ট নেই। সব হিসাব ব্রাউজারেই হয়, আর অগ্রগতি জমা থাকে আপনার নিজের ব্রাউজারে। কোনো সার্ভারে কিছু পাঠানো হয় না।",
      en: "It is a fully static site: no backend, no database, no account. All the scoring happens in the browser and progress is stored there. Nothing is sent to a server.",
    },
    {
      bn: "কোড ও লেখা এই প্রকল্পের নিজের। প্রশ্ন, ভুলের রিপোর্ট বা নতুন প্র্যাকটিস লেখার প্রস্তাব GitHub-এ জানাতে পারেন।",
      en: "The code and the text are original to this project. Questions, bug reports and proposed practice texts are welcome on GitHub.",
    },
  ],
};
