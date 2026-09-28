import { localizePath, type Lang } from "../i18n";

/**
 * The lesson path from Section 8 of docs/MASTERPLAN.md: twelve short lessons from
 * the vowels to conjuncts, numbers and real-world text. A lesson is a fixed set of
 * drill texts plus a pass criterion, not a new kind of run.
 *
 * All Bangla copy here is a first draft for a native speaker to review
 * (`docs/VERIFY.md`), and every drill text is `reviewed: false`.
 */
export interface Lesson {
  id: string;
  slug: string;
  order: number;
  title: Record<Lang, string>;
  summary: Record<Lang, string>;
  /** The two or three lines shown before the drill (Section 5.2). */
  intro: Record<Lang, string>;
  /** "Today's keys" — the letters, signs or shapes the lesson drills. */
  keys: Record<Lang, string>;
  /** Drill texts by id. A lesson may reference a practice text as well as a drill. */
  drillIds: readonly string[];
}

/** Section 8: a lesson is passed at 90% accuracy or better. */
export const PASS_ACCURACY = 90;

export const lessons: readonly Lesson[] = [
  {
    id: "lesson-01",
    slug: "getting-ready",
    order: 1,
    title: { bn: "শুরু করার প্রস্তুতি", en: "Getting ready" },
    summary: {
      bn: "বসার ভঙ্গি, হাতের অবস্থান আর প্রথম দিনের হালকা ওয়ার্ম-আপ।",
      en: "Posture, hand position and a light first warm-up.",
    },
    intro: {
      bn: "চেয়ারে সোজা হয়ে বসুন, কাঁধ শিথিল রাখুন আর দুই হাত কীবোর্ডে হালকাভাবে রাখুন। এই প্রথম পাঠটি শুধু আঙুল গরম করার জন্য — সময়ের চাপ নেই, নিচের লেখাটি যত ধীরে খুশি টাইপ করুন।",
      en: "Sit up straight, keep your shoulders loose and rest both hands lightly on the keyboard. This first lesson is only a warm-up: there is no clock, so type the drill below as slowly as you like.",
    },
    keys: { bn: "অ আ ই ঈ উ ঊ", en: "অ আ ই ঈ উ ঊ — the first vowels" },
    drillIds: ["drill-01", "drill-02"],
  },
  {
    id: "lesson-02",
    slug: "vowels",
    order: 2,
    title: { bn: "স্বরবর্ণ", en: "Vowels" },
    summary: {
      bn: "স্বরবর্ণগুলো চিনে নিন, তারপর প্রথম ছোট ছোট শব্দ লিখুন।",
      en: "Learn the independent vowels, then your first short words.",
    },
    intro: {
      bn: "বাংলায় এগারোটি স্বরবর্ণ আছে। এগুলো কারও সাহায্য ছাড়াই আলাদা করে লেখা যায়। প্রতিটি বর্ণ একবার করে টাইপ করুন, তারপর চেনা ছোট শব্দে হাত পাকান।",
      en: "Bangla has eleven independent vowels. They stand on their own, without a consonant in front of them. Type each one once, then move on to familiar short words.",
    },
    keys: { bn: "অ আ ই ঈ উ ঊ ঋ এ ঐ ও ঔ", en: "অ আ ই ঈ উ ঊ ঋ এ ঐ ও ঔ" },
    drillIds: ["drill-03", "drill-04", "drill-05"],
  },
  {
    id: "lesson-03",
    slug: "consonants-ka",
    order: 3,
    title: { bn: "ব্যঞ্জনবর্ণ ১ — ক বর্গ", en: "Consonants 1 — the ka group" },
    summary: {
      bn: "ক খ গ ঘ ঙ দিয়ে শুরু, তারপর সহজ শব্দ।",
      en: "Start with ক খ গ ঘ ঙ, then build easy words.",
    },
    intro: {
      bn: "প্রথমে ক বর্গের পাঁচটি বর্ণ। প্রতিটি আলাদা করে টাইপ করার পর ছোট পরিচিত শব্দে সেগুলো ব্যবহার করুন। গতি পরে আসবে, আগে নির্ভুলতা।",
      en: "The five letters of the ka group come first. Type them one at a time, then use them in short familiar words. Speed comes later; accuracy comes first.",
    },
    keys: { bn: "ক খ গ ঘ ঙ", en: "ক খ গ ঘ ঙ" },
    drillIds: ["drill-06", "drill-07", "drill-08"],
  },
  {
    id: "lesson-04",
    slug: "consonants-cha-tta",
    order: 4,
    title: { bn: "ব্যঞ্জনবর্ণ ২ — চ ও ট বর্গ", en: "Consonants 2 — the cha and tta groups" },
    summary: {
      bn: "চ ছ জ ঝ, ট ঠ ড ঢ, তারপর ত থ দ ধ ন।",
      en: "চ ছ জ ঝ, ট ঠ ড ঢ, then ত থ দ ধ ন.",
    },
    intro: {
      bn: "এই পাঠে দুই বর্গের বর্ণ একসাথে আসে। ট বর্গের বর্ণ জিভ একটু পিছিয়ে উচ্চারণ করতে হয়, তাই টাইপ করার সময় তাড়াহুড়ো করবেন না।",
      en: "Two groups arrive together here. The tta group is made a little further back in the mouth, so take your time instead of rushing.",
    },
    keys: { bn: "চ ছ জ ঝ ট ঠ ড ঢ ত থ দ ধ ন", en: "চ ছ জ ঝ ট ঠ ড ঢ ত থ দ ধ ন" },
    drillIds: ["drill-09", "drill-10", "drill-11"],
  },
  {
    id: "lesson-05",
    slug: "consonants-pa",
    order: 5,
    title: {
      bn: "ব্যঞ্জনবর্ণ ৩ — প, অন্তঃস্থ ও ঊষ্ম",
      en: "Consonants 3 — pa, semi-vowels and sibilants",
    },
    summary: {
      bn: "প ফ ব ভ ম, য র ল শ ষ স হ, আর ড় ঢ় য়।",
      en: "প ফ ব ভ ম, then য র ল শ ষ স হ, and ড় ঢ় য়.",
    },
    intro: {
      bn: "শেষ ব্যঞ্জন দল। ড়, ঢ় আর য় লেখা হয় মূল বর্ণের নিচে নুকতা দিয়ে; অ্যাপ এদের প্রত্যেকটিকে একটি অক্ষর হিসেবেই গোনে।",
      en: "The last consonant set. ড়, ঢ় and য় are written with a dot under the base letter, and each still counts as one character.",
    },
    keys: {
      bn: "প ফ ব ভ ম য র ল শ ষ স হ ড় ঢ় য়",
      en: "প ফ ব ভ ম য র ল শ ষ স হ ড় ঢ় য়",
    },
    drillIds: ["drill-12", "drill-13", "drill-14"],
  },
  {
    id: "lesson-06",
    slug: "vowel-signs",
    order: 6,
    title: { bn: "কার-চিহ্ন", en: "Vowel signs" },
    summary: {
      bn: "া ি ী ু ূ ৃ ে ৈ ো ৌ — ব্যঞ্জনের সঙ্গে যুক্ত হওয়া চিহ্ন।",
      en: "া ি ী ু ূ ৃ ে ৈ ো ৌ — the signs that attach to a consonant.",
    },
    intro: {
      bn: "স্বরবর্ণের যুক্ত রূপই কার-চিহ্ন। ক-এর সঙ্গে যোগ করলে কা, কি, কু লেখা হয়। চিহ্নটি ব্যঞ্জনের পরে আসে, তাই ক্রমটা মনে রাখুন।",
      en: "Vowel signs are the joined forms of the vowels. Added to ক they give কা, কি, কু. The sign follows the consonant, so keep the order in mind.",
    },
    keys: { bn: "া ি ী ু ূ ৃ ে ৈ ো ৌ", en: "া ি ী ু ূ ৃ ে ৈ ো ৌ" },
    drillIds: ["drill-15", "drill-16", "drill-17"],
  },
  {
    id: "lesson-07",
    slug: "marks",
    order: 7,
    title: {
      bn: "চন্দ্রবিন্দু, অনুস্বার, বিসর্গ ও খণ্ড ত",
      en: "Chandrabindu, anusvara, visarga and khanda ta",
    },
    summary: {
      bn: "ঁ ং ঃ আর ৎ — শব্দের উপরে, পরে আর ভিতরে বসা চিহ্ন।",
      en: "ঁ ং ঃ and ৎ — the marks above, after and inside a word.",
    },
    intro: {
      bn: "চন্দ্রবিন্দু ও অনুস্বার নাসিক ধ্বনি বোঝায়, বিসর্গ সামান্য শ্বাসের। খণ্ড ত (ৎ) নিজেই একটি বর্ণ — এটিকে ত আর হসন্ত মিলে হয়েছে ভাববেন না।",
      en: "Chandrabindu and anusvara mark nasal sounds, visarga a light breath. Khanda ta (ৎ) is its own letter — it is not a ত with a hasanta under it.",
    },
    keys: { bn: "ঁ ং ঃ ৎ", en: "ঁ ং ঃ ৎ" },
    drillIds: ["drill-18", "drill-19", "drill-20"],
  },
  {
    id: "lesson-08",
    slug: "conjuncts-common",
    order: 8,
    title: { bn: "যুক্তাক্ষর ১ — সবচেয়ে প্রচলিত", en: "Conjuncts 1 — the most common" },
    summary: { bn: "ক্ষ স্ত ন্দ ত্র জ্ঞ প্র ক্র।", en: "ক্ষ স্ত ন্দ ত্র জ্ঞ প্র ক্র." },
    intro: {
      bn: "দুই বা ততোধিক ব্যঞ্জন মিলে যুক্তাক্ষর তৈরি করে, আর মাঝের হসন্ত প্রায় অদৃশ্য থাকে। অ্যাপ পুরো যুক্তাক্ষরকে একটি অক্ষর ধরে মিলিয়ে দেখে, তাই রং কখনো এলোমেলো হয় না।",
      en: "Two or more consonants joined by a hasanta make a conjunct, and the hasanta itself is almost invisible. The editor compares the whole conjunct as one character, so the colours never drift.",
    },
    keys: { bn: "ক্ষ স্ত ন্দ ত্র জ্ঞ প্র ক্র", en: "ক্ষ স্ত ন্দ ত্র জ্ঞ প্র ক্র" },
    drillIds: ["drill-21", "drill-22", "drill-23"],
  },
  {
    id: "lesson-09",
    slug: "conjuncts-hard",
    order: 9,
    title: { bn: "যুক্তাক্ষর ২ — রেফ, য-ফলা, র-ফলা", en: "Conjuncts 2 — reph, ya-phala, ra-phala" },
    summary: {
      bn: "র্ক র্ত র্ন দিয়ে শুরু, তারপর কঠিন যুক্তাক্ষর।",
      en: "Start with র্ক র্ত র্ন, then the harder conjuncts.",
    },
    intro: {
      bn: "রেফ (র্) ব্যঞ্জনের আগে বসে, র-ফলা (্র) পরে। বাংলা লেখার সবচেয়ে কঠিন অংশ এইটুকু, তাই ধীরে টাইপ করুন।",
      en: "Reph (র্) sits before its consonant and ra-phala (্র) after it. This is the hardest part of writing Bangla, so type slowly.",
    },
    keys: { bn: "র্ক র্ত ্র ্য ্ব", en: "র্ক র্ত ্র ্য ্ব" },
    drillIds: ["drill-24", "drill-25", "drill-26"],
  },
  {
    id: "lesson-10",
    slug: "numbers",
    order: 10,
    title: { bn: "সংখ্যা ও যতিচিহ্ন", en: "Numbers and punctuation" },
    summary: {
      bn: "০ থেকে ৯, দাঁড়ি, কমা আর প্রশ্নচিহ্ন।",
      en: "০ to ৯, the danda, the comma and the question mark.",
    },
    intro: {
      bn: "বাংলা সংখ্যার আকার আলাদা: ০ ১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯। বাক্যের শেষে বসে দাঁড়ি (।), ইংরেজি পূর্ণচ্ছেদ নয়।",
      en: "Bengali digits have their own shapes: ০ ১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯. A sentence ends with the danda (।), not a full stop.",
    },
    keys: { bn: "০ ১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯ । , ?", en: "০ ১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯ । , ?" },
    drillIds: ["drill-27", "drill-28", "drill-29"],
  },
  {
    id: "lesson-11",
    slug: "sentences",
    order: 11,
    title: { bn: "পুরো বাক্য ও অনুচ্ছেদ", en: "Full sentences and paragraphs" },
    summary: {
      bn: "শব্দ থেকে বাক্যে, তারপর বাক্য থেকে অনুচ্ছেদে।",
      en: "From words to sentences, then sentences to paragraphs.",
    },
    intro: {
      bn: "এতদিন যা শিখেছেন তা এখন পুরো বাক্যে প্রয়োগ করুন। আগে ছোট বাক্য, পরে লম্বা বাক্য — লক্ষ্য গতি নয়, নির্ভুলতা।",
      en: "Put everything so far into whole sentences. Short sentences first, longer ones after — the goal is accuracy, not speed.",
    },
    keys: { bn: "ছোট ও মাঝারি বাক্য", en: "Short and medium sentences" },
    drillIds: ["easy-01", "easy-05", "medium-01", "medium-05"],
  },
  {
    id: "lesson-12",
    slug: "real-world",
    order: 12,
    title: { bn: "প্রকৃত লেখা", en: "Real-world text" },
    summary: {
      bn: "পরীক্ষার খাতা, অফিসের লেখা আর খবর-ধাঁচের অনুচ্ছেদ।",
      en: "Exam papers, office writing and a news-style paragraph.",
    },
    intro: {
      bn: "শেষ পাঠ। এখানকার লেখা আসে সত্যিকারের কাজ থেকে — পরীক্ষার প্রশ্নপত্র, শিক্ষকের প্রশ্নের উত্তর, প্রতিবেদনের মতো বাক্য। ধীরে শুরু করুন আর নির্ভুলতা ধরে রাখুন।",
      en: "The last lesson. This text comes from real work: an exam paper, a teacher's answers and report-style sentences. Start slowly and hold on to your accuracy.",
    },
    keys: { bn: "মিশ্র বাক্য", en: "Mixed sentences" },
    drillIds: ["medium-04", "medium-08", "hard-01", "hard-05"],
  },
];

export function lessonBySlug(slug: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.slug === slug);
}

export function lessonById(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}

export function lessonHref(lesson: Lesson, lang: Lang): string {
  return localizePath(`/lessons/${lesson.slug}`, lang);
}

/** Lesson numbers read better in the page's own digits, not Latin ones. */
export function localizedDigits(value: number, lang: Lang): string {
  return value.toLocaleString(lang === "bn" ? "bn-BD" : "en-GB");
}

/** Prose for the lessons index. */
export interface LessonsCopy {
  title: string;
  description: string;
  h1: string;
  lead: string;
  criterion: string;
  keysLabel: string;
  startLabel: string;
}

export const lessonsCopy: Record<Lang, LessonsCopy> = {
  bn: {
    title: "পাঠ | Type Kori",
    description:
      "ধাপে ধাপে বাংলা টাইপিং শেখার বারোটি পাঠ: স্বরবর্ণ থেকে যুক্তাক্ষর আর পুরো বাক্য পর্যন্ত, প্রতিটিতে ৯০% নির্ভুলতার শর্ত।",
    h1: "পাঠগুলো",
    lead: "বারোটি ছোট পাঠে সাজানো একটি পথ। প্রতিটি পাঠে অল্প লেখা টাইপ করতে হয়, আর ৯০% নির্ভুলতা পেলেই পাঠ পাস। কোনো পাঠ লক করা নেই — যেকোনো পাঠ থেকেই শুরু করতে পারেন।",
    criterion: "পাসের শর্ত: ৯০% নির্ভুলতা",
    keysLabel: "এই পাঠের অক্ষর",
    startLabel: "পাঠ শুরু করুন",
  },
  en: {
    title: "Lessons | Type Kori",
    description:
      "Twelve short Bangla typing lessons, from the vowels to conjuncts and full sentences, each passed at 90% accuracy.",
    h1: "Lessons",
    lead: "A path of twelve short lessons. Each one is a brief drill, and you pass it at 90% accuracy or better. Nothing is locked, so you can start wherever you like.",
    criterion: "Pass at 90% accuracy",
    keysLabel: "Letters in this lesson",
    startLabel: "Start lesson",
  },
};
