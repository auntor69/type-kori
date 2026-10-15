import type { Lang } from "../i18n";

/**
 * Long-form guide pages (docs/MASTERPLAN.md Section 11).
 *
 * These are the pages a search engine can actually read: the practice tool is
 * JavaScript, so the surrounding prose is what makes the site discoverable. The
 * copy is written for this project — no scraped or borrowed text — and, like all
 * Bangla copy here, it is a first draft for a native speaker (docs/VERIFY.md).
 */

export interface Localized {
  bn: string;
  en: string;
}

export interface GuideSection {
  heading: Localized;
  paragraphs: Localized[];
}

export interface Guide {
  /** URL segment: `/guide/<slug>`. */
  slug: string;
  title: Localized;
  /** Meta description and the list blurb. */
  summary: Localized;
  sections: GuideSection[];
}

export function localized(value: Localized, lang: Lang): string {
  return value[lang];
}

export const guides: Guide[] = [
  {
    slug: "how-to-type-bangla",
    title: {
      bn: "কম্পিউটারে বাংলা টাইপ করা শিখুন",
      en: "How to type Bangla on a computer",
    },
    summary: {
      bn: "শূন্য থেকে শুরু: কোন পদ্ধতিতে বাংলা লেখা যায়, কোনটি আপনার জন্য ভালো, আর কীভাবে অভ্যাস শুরু করবেন।",
      en: "From zero: the ways to type Bangla on a PC, which one suits you, and how to start practising.",
    },
    sections: [
      {
        heading: {
          bn: "বাংলা লেখার দুটি পথ",
          en: "Two ways to write Bangla",
        },
        paragraphs: [
          {
            bn: "কম্পিউটারে বাংলা লেখার দুটি প্রধান পথ আছে। একটি হলো ফোনেটিক পদ্ধতি — আপনি ইংরেজি হাতে টাইপ করবেন, সফটওয়্যার সেটিকে বাংলা বানাবে। অন্যটি হলো নির্দিষ্ট কীবোর্ড লেআউট — প্রতিটি কী-তে একটি নির্দিষ্ট বাংলা অক্ষর বসানো থাকে, আর আপনি সেগুলো সরাসরি চাপবেন।",
            en: "There are two main ways to write Bangla on a computer. The first is phonetic: you type in Roman letters and software converts them to Bangla. The second is a fixed keyboard layout: every key carries one Bangla character, and you press it directly.",
          },
          {
            bn: "দুটিরই সুবিধা আছে। ফোনেটিক শিখতে সহজ, কারণ আপনার হাত ইংরেজি কীবোর্ড চেনে। নির্দিষ্ট লেআউট শিখতে একটু সময় লাগে, কিন্তু একবার অভ্যস্ত হলে গতি অনেক বেশি হয় — দ্রুতগতির পেশাদার বাংলা টাইপিস্টরা সাধারণত নির্দিষ্ট লেআউটই ব্যবহার করেন।",
            en: "Both have advantages. Phonetic is easier to start with, because your fingers already know the English keyboard. A fixed layout takes longer to learn, but once it is in your fingers it is much faster — professional Bangla typists generally use a fixed layout.",
          },
        ],
      },
      {
        heading: {
          bn: "আপনার কম্পিউটারে বাংলা চালু করা",
          en: "Getting Bangla working on your machine",
        },
        paragraphs: [
          {
            bn: "উইন্ডোজে Avro Keyboard সবচেয়ে পরিচিত, আর এতে ফোনেটিক ও নির্দিষ্ট — দুটো ধরণেরই লেআউট আছে। লিনাক্সে সাধারণত ibus-avro ব্যবহার করা হয়। ম্যাকেও Avro ধরণের সফটওয়্যার পাওয়া যায়। যেকোনো একটি ইনস্টল করলেই আপনি এই সাইটে সাথে সাথে প্র্যাকটিস শুরু করতে পারবেন।",
            en: "On Windows, Avro Keyboard is the best-known choice and ships both phonetic and fixed layout modes. On Linux, ibus-avro is common. Mac has Avro-style options too. Install any one of them and you can start practising here immediately.",
          },
          {
            bn: "যদি কোনো সফটওয়্যার ইনস্টল করতে না চান, এই সাইটের নিজের ফোনেটিক মোড দিয়ে শুরু করতে পারেন — এতে রোমান হাতে টাইপ করলেই বাংলা হয়ে যাবে। দুটো পথের ফলাফল একইভাবে মাপা হয়, তাই কোনোটিই আপনার অগ্রগতির হিসাব নষ্ট করবে না।",
            en: "If you would rather not install anything, start with this site's own phonetic mode — you type Roman letters and Bangla appears. Both routes are scored the same way, so neither will skew your progress.",
          },
        ],
      },
      {
        heading: {
          bn: "শুরুর তিনটি অভ্যাস",
          en: "Three habits to start with",
        },
        paragraphs: [
          {
            bn: "প্রথম অভ্যাস: আঙুল হোম রো-তে রাখুন। নির্দিষ্ট লেআউটে ডান হাতের তর্জনী জ আর বাম হাতের তর্জনী ফ-এর উপরে থাকে; এখান থেকেই সব আঙুল নিজের জায়গায় ফিরে আসে। এই সাইটের অন-স্ক্রিন কীবোর্ড প্রতিটি কী কোন আঙুলের, তা রঙ দিয়ে দেখায়।",
            en: "First habit: keep your fingers on the home row. In the fixed layouts the right index rests on জ and the left index on ফ; every finger returns there. This site's on-screen keyboard colours each key by the finger that reaches it.",
          },
          {
            bn: "দ্বিতীয় অভ্যাস: নির্ভুলতাকে আগে রাখুন। শুরুতে গতি নিজে থেকেই আসবে যদি আপনি ভুল কম করেন। তৃতীয় অভ্যাস: প্রতিদিন অল্প হলেও টাইপ করুন — পনেরো মিনিট প্রতিদিন, সপ্তাহে দুইবার এক ঘণ্টার চেয়ে বেশি কাজে দেয়।",
            en: "Second habit: put accuracy first. Speed comes on its own if you keep mistakes down. Third habit: practise a little every day — fifteen minutes daily beats one hour twice a week.",
          },
        ],
      },
    ],
  },
  {
    slug: "avro-probhat-national-layouts",
    title: {
      bn: "অভ্র ফোনেটিক, প্রভাত ও জাতীয় কীবোর্ড",
      en: "Avro phonetic, Probhat and the national keyboard",
    },
    summary: {
      bn: "তিনটি ভিন্ন জিনিস: অভ্র ফোনেটিক একটি অনুবাদ ইঞ্জিন, প্রভাত ও জাতীয় (বিডিএস ১৭৩৮) নির্দিষ্ট লেআউট — কোনটি কী, আর কোনটি বেছে নেবেন।",
      en: "Three different things: Avro phonetic is a transliteration engine, while Probhat and the national layout (BDS 1738) are fixed layouts.",
    },
    sections: [
      {
        heading: {
          bn: "অভ্র ফোনেটিক আসলে কী",
          en: "What Avro phonetic really is",
        },
        paragraphs: [
          {
            bn: "অভ্র ফোনেটিক একটি নির্দিষ্ট কীবোর্ড লেআউট নয়, বরং একটি অনুবাদ (ট্রান্সলিটারেশন) ইঞ্জিন। আপনি সাধারণ ইংরেজি অক্ষরে টাইপ করেন, আর সফটওয়্যার সেটিকে বাংলা বানায়। যেমন ami bangla likhi লিখলে আমি বাংলা লিখি হয়। এটি OmicronLab-এর তৈরি, এবং উইন্ডোজে Avro Keyboard নামে, লিনাক্সে ibus-avro নামে আর ম্যাকে Avro-ধরণের সফটওয়্যার হিসেবে পাওয়া যায়।",
            en: "Avro phonetic is not a fixed keyboard layout but a transliteration engine. You type ordinary Roman letters and the software converts them to Bangla: ami bangla likhi becomes আমি বাংলা লিখি. It comes from OmicronLab, and reaches you as Avro Keyboard on Windows, ibus-avro on Linux, and Avro-style software on macOS.",
          },
          {
            bn: "মনে রাখার মতো একটি পার্থক্য: Avro Keyboard সফটওয়্যারটি ফোনেটিক ইঞ্জিনের সাথে প্রভাত ও জাতীয় (Jatiya) নামের নির্দিষ্ট লেআউটও দেয়। অর্থাৎ ‘অভ্র’ আর ‘প্রভাত’ এক জিনিস নয় — একই ইনস্টলারে দুটো ভিন্ন পদ্ধতি থাকতে পারে।",
            en: "One difference worth holding on to: the Avro Keyboard application ships fixed layouts — Probhat and National (Jatiya) — alongside its phonetic engine. So Avro and Probhat are not the same thing; one installer can give you both kinds of typing.",
          },
        ],
      },
      {
        heading: {
          bn: "এই সাইটে ইংরেজি লিখে বাংলা পাওয়া",
          en: "Typing English and getting Bangla on this site",
        },
        paragraphs: [
          {
            bn: "এই সাইটের নিজের ফোনেটিক মোডে কিছুই ইনস্টল করতে হয় না: সেটিংস খুলে ইনপুট মোড ‘বিল্ট-ইন ফোনেটিক’ বেছে নিলেই রোমান অক্ষরে টাইপ করা বাংলা হয়ে যাবে। প্র্যাকটিসের উপরে থাকা মোড বাটন থেকেও এক ক্লিকে বদলানো যায়, আর সিস্টেম কীবোর্ড মোডে ইংরেজি অক্ষর ঢুকতে থাকলে যে সতর্কবার্তা আসে, তার পাশের বাটনেই এক ক্লিকে এই মোড চালু হয়।",
            en: "This site's own phonetic mode needs nothing installed: open Settings, pick Built-in phonetic as the input mode, and Roman keystrokes become Bangla. The mode button above the practice area switches it in one click, and if you are in system-keyboard mode while Roman letters keep arriving, the notice that appears carries the same one-click switch.",
          },
          {
            bn: "এই মোডে অন-স্ক্রিন কীবোর্ড পরের যে কী-টি চাপতে হবে তা দেখায় — রোমান অক্ষর, আর দরকার হলে শিফট কী-টিও আলাদা করে, যাতে T (ট) আর t (ত) গুলিয়ে না যায়। কোন অক্ষরে কোন বাংলা আসে, তার পুরো তালিকা আছে কীবোর্ড গাইড পাতায়, আর সেটি ইঞ্জিনের নিজের নিয়ম ফাইল থেকেই তৈরি হয় — তাই গাইড আর ইঞ্জিন কখনো আলাদা কথা বলবে না।",
            en: "In this mode the on-screen keyboard shows the next Roman key to press, and highlights Shift as its own key cap when a capital is needed, so T for ট cannot be confused with t for ত. The complete press-this-get-that table lives on the phonetic keyboard guide, generated from the engine's own rule file — so the guide and the engine can never disagree.",
          },
          {
            bn: "সৎভাবে একটি কথা: এই ইঞ্জিন আমাদের নিজের লেখা নিয়ম, যা অভ্র ফোনেটিকের প্রকাশিত নিয়মগুলো অনুসরণ করে — অভ্রর কোড নকল করা নয়। অভ্রর নিজের অভিধানে দেড় লাখেরও বেশি শব্দ থাকে; এখানে ব্যতিক্রমী শব্দের তালিকা ছোট, আর প্রতিটি নিয়ম এখনো একজন নেটিভ স্পিকারের চূড়ান্ত যাচাইয়ের অপেক্ষায়। তাই গতি বাড়ানোর আগে নিয়মগুলো একবার চোখ বুলিয়ে নিন।",
            en: "One honest note: this engine is our own grammar of the conventions Avro publishes — no Avro code is copied. Avro's own dictionary holds well over a hundred thousand words; the exception list here is small, and every rule still awaits a native speaker's final check. Read the rule table once before you chase speed.",
          },
        ],
      },
      {
        heading: {
          bn: "প্রভাত লেআউট",
          en: "The Probhat layout",
        },
        paragraphs: [
          {
            bn: "প্রভাত একটি নির্দিষ্ট, ইউনিকোডভিত্তিক লেআউট — অনুবাদ ইঞ্জিন নয়। এটি একুশে (Ekushey) নামের বাংলা কম্পিউটিং প্রকল্পের কাজ, আর অভ্র কীবোর্ডের সাথে ঐচ্ছিক লেআউট হিসেবে এবং লিনাক্সের প্রায় সব ডিস্ট্রিবিউশনে (XKB-এ bd(probhat)) পাওয়া যায়।",
            en: "Probhat is a fixed, Unicode-based layout — not a transliteration engine. It comes from the Ekushey Bangla computing project and travels with Avro Keyboard as an optional layout and with almost every Linux distribution (as bd(probhat) in XKB).",
          },
          {
            bn: "এর সাজসজ্জা ফোনেটিকের মতো শোনায়, কিন্তু ব্যবহার করতে হয় মুখস্থ করেই: প্রতিটি কী-তে একটি নির্দিষ্ট অক্ষর বসানো। স্বরচিহ্নগুলো উপরের ও ডান দিকের সারিতে থাকে, আর একটি বর্ণের পাশেই তার কার-চিহ্ন — তাই অক্ষর ও চিহ্ন একসাথে চোখে পড়ে। যুক্তাক্ষর লেখা হয় ব্যঞ্জন, হসন্ত (/), ব্যঞ্জন — এই ক্রমে।",
            en: "Its arrangement may look sound-based, but you still learn it by position: every key carries one fixed character. Vowel signs sit on the top and right rows, next to the vowel letters they belong to, so a letter and its sign are read together. A conjunct is typed as consonant, hasanta (/), consonant.",
          },
        ],
      },
      {
        heading: {
          bn: "জাতীয় কীবোর্ড ও বিডিএস ১৭৩৮",
          en: "The national keyboard and BDS 1738",
        },
        paragraphs: [
          {
            bn: "বিডিএস ১৭৩৮ একটি কীবোর্ড লেআউটের মান — কোন কী-তে কোন অক্ষর বসবে তা ঠিক করে দেয়। এটি কোনো এনকোডিং মান নয়; অক্ষরগুলো ইউনিকোডে না অন্য কোথাও থাকবে, সেটি ইনপুট সফটওয়্যারের ব্যাপার। বাংলাদেশ কম্পিউটার কাউন্সিলের উদ্যোগে যে জাতীয় লেআউট তৈরি হয়, সেটিই ২০০৪ সালে বিডিএস ১৭৩৮:২০০৪ হিসেবে দাঁড়ায়, আর এতে চারটি স্তর থাকে: সাধারণ, শিফট, AltGr এবং Shift+AltGr।",
            en: "BDS 1738 is a keyboard-layout standard: it fixes which character sits on which key. It is not an encoding standard — whether the characters are Unicode or something else is the input software's business. The layout produced by the Bangladesh Computer Council initiative became BDS 1738:2004, and it has four levels: normal, Shift, AltGr and Shift+AltGr.",
          },
          {
            bn: "এখানেই সবচেয়ে বড় বিভ্রান্তি। ২০০৪-এর জাতীয় লেআউট আর বিজয় এক নয়; বিজয় একটি আলাদা লেআউট ও সফটওয়্যার, যা মুনির ধাঁচের টাইপরাইটার লেআউট থেকে এসেছে। অথচ পরবর্তী সংস্করণ ২০১৮-এর মানটিকে অনেক সূত্র বিজয়-ভিত্তিক বলে বর্ণনা করে, তাই ‘জাতীয় মান’ বললে কোন বছরের, আর কোন ম্যাপিং — সেটি স্পষ্ট করা জরুরি।",
            en: "This is where most of the confusion lives. The 2004 national layout and Bijoy are not the same mapping: Bijoy is a separate layout and software family descended from Munir-style typewriter layouts. Yet the later revision, the 2018 standard, is widely described as Bijoy-derived — so when someone says “the national standard”, it is worth asking which year and which mapping they mean.",
          },
          {
            bn: "এই সাইটের অন-স্ক্রিন কীবোর্ড জাতীয় (বিডিএস ১৭৩৮) ও প্রভাত — দুটো লেআউটই আঁকতে পারে, সেটিংসে বেছে নিলে। প্রতিটি সারি একটি সূত্র ধরে লেখা হয়েছে এবং একজন নেটিভ স্পিকার যাচাই করার আগে ‘যাচাই বাকি’ হিসেবেই থাকে, তাই আসল কীবোর্ডে মিলিয়ে দেখা ভালো।",
            en: "This site's on-screen keyboard can draw both fixed layouts — National (BDS 1738) and Probhat — once you pick one in Settings. Each row was written from a documented source and stays marked as awaiting a native speaker's check, so do compare it against a real keyboard.",
          },
        ],
      },
      {
        heading: {
          bn: "কোনটি শিখবেন",
          en: "Which one to learn",
        },
        paragraphs: [
          {
            bn: "ফোনেটিক দিয়ে শুরু করা সহজ — ইনস্টল ছাড়াই এখনই শুরু করা যায়, আর হাত ইংরেজি কীবোর্ড চেনে। নির্দিষ্ট লেআউট (প্রভাত বা জাতীয়) শিখতে বেশি সময় লাগে, কিন্তু অভ্যস্ত হলে গতি অনেক বাড়ে, আর চাকরির টাইপিং পরীক্ষায় বেশিরভাগ প্রার্থী নির্দিষ্ট লেআউটই ব্যবহার করেন।",
            en: "Phonetic is the easy start — nothing to install, and your hands already know the English keyboard. A fixed layout (Probhat or the national one) takes longer to learn but pays off in speed, and most candidates in job typing tests use one.",
          },
          {
            bn: "একটি পরামর্শ: একটির উপরেই ভরসা রাখুন। একবার যেটি বেছে নিলেন, সেটিতেই অন্তত কয়েক সপ্তাহ অনুশীলন করুন; মাঝে মাঝে বদলালে কোনো পদ্ধতিই আঙুলে বসে না।",
            en: "One piece of advice: commit to one. Whichever you pick, give it a few weeks; switching every other day keeps neither method in your fingers.",
          },
        ],
      },
    ],
  },
  {
    slug: "avro-phonetic-cheat-sheet",
    title: {
      bn: "ফোনেটিক টাইপিং চিটশিট",
      en: "Avro phonetic cheat sheet",
    },
    summary: {
      bn: "কোন ইংরেজি অক্ষরে কোন বাংলা অক্ষর আসে — সবচেয়ে দরকারি নিয়মগুলো এক পাতায়।",
      en: "Which Roman letters give which Bangla characters — the patterns that matter, on one page.",
    },
    sections: [
      {
        heading: {
          bn: "স্বরবর্ণ কীভাবে আসে",
          en: "How the vowels appear",
        },
        paragraphs: [
          {
            bn: "ফোনেটিক ইঞ্জিনে a লিখলে আ, i লিখলে ই, u লিখলে উ, e লিখলে এ, O লিখলে ও আসে। কিন্তু এই বর্ণগুলো কোনো ব্যঞ্জনের পরে বসলে তারা বর্ণ হয়ে যায় না — বরং কার-চিহ্ন হয়ে যায়। যেমন k + a = কা, m + i = মি, k + O = কো।",
            en: "In the phonetic engine, a gives আ, i gives ই, u gives উ, e gives এ and O gives ও. But after a consonant these letters do not become separate letters — they become the vowel signs. So k + a is কা, m + i is মি and k + O is কো.",
          },
          {
            bn: "ছোট হাতের o হলো অ-কার, অর্থাৎ বাংলার সহজ স্বরটি লেখা হয় না। ব্যঞ্জনের পরে বসলে এটি কোনো চিহ্ন লেখে না, কেবল দুটি ব্যঞ্জনকে আলাদা রাখে: kor = কর, sokale = সকালে, kemon = কেমন। আর দীর্ঘ স্বর দরকার হলে বড় হাতের অক্ষর লিখুন: I = ঈ, U = ঊ, অর্থাৎ ক + I = কী এবং ক + U = কূ।",
            en: "A lowercase o is the inherent vowel — the ordinary Bangla vowel that is simply not written. After a consonant it writes nothing and only keeps two consonants apart: kor is কর, sokale is সকালে, kemon is কেমন. For the long vowels, use the capital letter: I is ঈ and U is ঊ, so k + I is কী and k + U is কূ.",
          },
        ],
      },
      {
        heading: {
          bn: "ব্যঞ্জন ও যুক্তাক্ষর",
          en: "Consonants and conjuncts",
        },
        paragraphs: [
          {
            bn: "বেশিরভাগ ব্যঞ্জন ইংরেজি বর্ণ থেকে অনুমান করা যায়: k = ক, g = গ, j = জ, t = ত, d = দ, n = ন, p = প, b = ব, m = ম। মোটা ধ্বনির জন্য h যোগ করুন: kh = খ, gh = ঘ, th = থ, dh = ধ, ph = ফ, bh = ভ।",
            en: "Most consonants follow the sound: k is ক, g is গ, j is জ, t is ত, d is দ, n is ন, p is প, b is ব, m is ম. Add h for the aspirated ones: kh is খ, gh is ঘ, th is থ, dh is ধ, ph is ফ, bh is ভ.",
          },
          {
            bn: "দুটি ব্যঞ্জন পাশাপাশি লিখলে স্বয়ংক্রিয়ভাবে হসন্ত বসে যায় এবং যুক্তাক্ষর তৈরি হয়। যেমন tt = ত্ত, nt = ন্ত, kk = ক্ক। ইংরেজি বড় হাতের অক্ষর আলাদা ধ্বনি দেয়: T = ট, D = ড, N = ণ — এগুলো মূর্ধন্য বর্ণ।",
            en: "Two consonants typed in a row take an automatic hasanta and form a conjunct: tt is ত্ত, nt is ন্ত, kk is ক্ক. Capital letters give the retroflex set: T is ট, D is ড, N is ণ.",
          },
        ],
      },
      {
        heading: {
          bn: "সংখ্যা ও যতিচিহ্ন",
          en: "Digits and punctuation",
        },
        paragraphs: [
          {
            bn: "১ থেকে ০ পর্যন্ত বাংলা অঙ্ক ইংরেজি সংখ্যার কী থেকেই আসে, তাই 2026 লিখলে ২০২৬ দেখা যাবে। দাঁড়ি দিতে . (পূর্ণছেদ) ব্যবহার করুন।",
            en: "Bengali digits come from the number keys, so typing 2026 renders ২০২৬. For the danda, the Bangla full stop, use the period key.",
          },
        ],
      },
    ],
  },
  {
    slug: "bangla-typing-test-tips",
    title: {
      bn: "টাইপিং টেস্টের প্রস্তুতি",
      en: "Bangla typing test tips",
    },
    summary: {
      bn: "চাকরির টাইপিং পরীক্ষার জন্য: কী মাপা হয়, কীভাবে প্রস্তুতি নেবেন, আর কোন ভুলগুলো এড়াবেন।",
      en: "For a job typing test: what is measured, how to prepare, and the mistakes to avoid.",
    },
    sections: [
      {
        heading: {
          bn: "পরীক্ষায় কী মাপা হয়",
          en: "What a test measures",
        },
        paragraphs: [
          {
            bn: "বাংলাদেশের অধিকাংশ চাকরির টাইপিং পরীক্ষায় গতি (শব্দ প্রতি মিনিট) ও নির্ভুলতা — দুটোই দেখা হয়। শুধু গতি বেশি হলেই হয় না; বেশিরভাগ প্রতিষ্ঠান নির্ভুলতার জন্য আলাদা ন্যূনতম শর্তও রাখে। তাই দ্রুত কিন্তু ভুলে ভরা টাইপিং প্রায়ই ধীর কিন্তু নির্ভুল টাইপিংয়ের চেয়ে কম নম্বর পায়।",
            en: "Most Bangladeshi job typing tests look at both speed (words per minute) and accuracy. High speed alone is not enough; most employers also set a minimum accuracy. Fast typing full of errors usually scores below slower typing that is clean.",
          },
          {
            bn: "এই সাইটে WPM = সঠিক শব্দ ÷ অতিক্রান্ত মিনিট, আর নির্ভুলতা = সঠিক ক্লাস্টার ÷ মোট লক্ষ্য ক্লাস্টার। অর্থাৎ ভুল করে পরে শুধরে নিলেও নির্ভুলতা কিছুটা কমে, কারণ শুরুর ভুলটি হিসাবে ধরা পড়ে।",
            en: "Here, WPM is correct words ÷ elapsed minutes, and accuracy is correct clusters ÷ total target clusters. So even correcting a mistake costs a little accuracy, because the original slip is counted.",
          },
        ],
      },
      {
        heading: {
          bn: "দুই সপ্তাহের প্রস্তুতি",
          en: "A two-week preparation plan",
        },
        paragraphs: [
          {
            bn: "প্রথম সপ্তাহে গতি নিয়ে ভাববেন না — শুধু নির্ভুলতা। প্রতিদিন পনেরো মিনিট করে অক্ষর প্র্যাকটিস করুন। এই সাইটের দুর্বল অক্ষর ড্রিল ও স্মার্ট ড্রিল ঠিক সেই কাজটিই করে: আপনার নিজের ভুল থেকে তৈরি ড্রিল।",
            en: "In the first week, ignore speed — drill accuracy only. Fifteen minutes of letter practice a day. This site's weak-key drill and smart drill do exactly that: they are built from your own mistakes.",
          },
          {
            bn: "দ্বিতীয় সপ্তাহে সময় ধরে প্র্যাকটিস শুরু করুন — পাঁচ মিনিটের টেস্ট, দিনে দুবার। প্রতিটি টেস্টের পরে ভুলের তালিকা দেখুন; যে অক্ষরগুলো বারবার আসছে, সেগুলো আলাদা করে অভ্যাস করুন।",
            en: "In the second week, add timed runs — a five-minute test, twice a day. Read the mistake list after every run and drill the characters that keep coming up.",
          },
        ],
      },
      {
        heading: {
          bn: "পরীক্ষার দিন",
          en: "On the day",
        },
        paragraphs: [
          {
            bn: "পরীক্ষার আগে কীবোর্ডটি একটু দেখে নিন — সর্বত্র একই লেআউট থাকে না। ক্যাপস লক বন্ধ আছে কিনা নিশ্চিত করুন, কারণ চালু থাকলে ফোনেটিক মোডে ফল বদলে যায়। দ্রুত শুরু না করে প্রথম কয়েকটি শব্দে ছন্দ ধরে নিন; ছন্দ পেলে গতি নিজে থেকেই আসে।",
            en: "Glance at the keyboard before you start — layouts are not identical everywhere. Make sure caps lock is off, because it changes what a phonetic keyboard produces. Do not rush the first few words; find the rhythm and speed follows.",
          },
        ],
      },
    ],
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}

export function guideTitle(guide: Guide, lang: Lang): string {
  return guide.title[lang];
}
