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
            bn: "ফোনেটিক ইঞ্জিনে a লিখলে আ, i লিখলে ই, u লিখলে উ, e লিখলে এ, o লিখলে ও আসে। কিন্তু এই বর্ণগুলো কোনো ব্যঞ্জনের পরে বসলে তারা বর্ণ হয়ে যায় না — বরং কার-চিহ্ন হয়ে যায়। যেমন k + a = কা, m + i = মি।",
            en: "In the phonetic engine, a gives আ, i gives ই, u gives উ, e gives এ, o gives ও. But after a consonant these letters do not become separate letters — they become the vowel signs. So k + a is কা and m + i is মি.",
          },
          {
            bn: "দীর্ঘ স্বর দরকার হলে অক্ষরটি দুইবার লিখুন: ii লিখলে ঈ, uu লিখলে ঊ। এভাবে ক + ii = কী এবং ক + uu = কূ হয়।",
            en: "For the long vowels, type the letter twice: ii gives ঈ and uu gives ঊ. So k + ii is কী and k + uu is কূ.",
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
