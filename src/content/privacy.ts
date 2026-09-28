import type { Lang } from "../i18n";

export interface PrivacyCopy {
  title: string;
  description: string;
  intro: string;
  sections: { title: string; body: string }[];
}

export const privacyCopy: Record<Lang, PrivacyCopy> = {
  bn: {
    title: "গোপনীয়তা | Type Kori",
    description:
      "Type Kori কোনো অ্যাকাউন্ট, কুকি বা ট্র্যাকার ব্যবহার করে না। সেটিংস ও ফলাফল শুধু আপনার ব্রাউজারে থাকে।",
    intro:
      "ছোট করে বললে: Type Kori আপনার সম্পর্কে কোনো তথ্য সংগ্রহ করে না, কোথাও পাঠায় না, আর কোনো বিজ্ঞাপন দেখায় না।",
    sections: [
      {
        title: "কোনো অ্যাকাউন্ট নেই",
        body: "সাইন-আপ, লগইন বা পাসওয়ার্ড কিছুই লাগে না। আমরা আপনার নাম, ইমেইল বা অন্য কোনো পরিচয় জানি না।",
      },
      {
        title: "কুকি ও ট্র্যাকার নেই",
        body: "কোনো কুকি সেট করা হয় না এবং কোনো তৃতীয় পক্ষের অ্যানালিটিক্স, বিজ্ঞাপন বা সোশ্যাল স্ক্রিপ্ট লোড করা হয় না।",
      },
      {
        title: "আপনার ডেটা আপনার ডিভাইসে",
        body: "সেটিংস, রান-হিস্ট্রি ও ফলাফল ব্রাউজারের localStorage-এ জমা থাকে। এক্সপোর্ট ও ইমপোর্টের মাধ্যমে সেটিও সম্পূর্ণ আপনার নিজের নিয়ন্ত্রণে থাকে, আর রিসেট করলে সব মুছে যায়।",
      },
      {
        title: "কাস্টম লেখা কোথাও যায় না",
        body: "আপনি যে লেখাই প্র্যাকটিস করুন, সেটি ব্রাউজারেই থাকে। কোনো সার্ভারে পাঠানো হয় না — কারণ এই সাইটে সার্ভারই নেই।",
      },
      {
        title: "ফন্টও নিজের হোস্ট করা",
        body: "ফন্ট ফাইল এই সাইট থেকেই লোড হয়, গুগল ফন্ট বা অন্য কোনো ফন্ট সার্ভার থেকে নয়। তাই টাইপিংয়ের সময় কোন অক্ষর লেখা হচ্ছে সেটি বাইরে যায় না।",
      },
    ],
  },

  en: {
    title: "Privacy | Type Kori",
    description:
      "Type Kori uses no accounts, no cookies and no trackers. Settings and results stay in your browser.",
    intro:
      "The short version: Type Kori collects nothing about you, sends nothing anywhere, and shows no advertising.",
    sections: [
      {
        title: "No accounts",
        body: "There is no sign-up, no login and no password. We do not know your name, your email or anything else about you.",
      },
      {
        title: "No cookies, no trackers",
        body: "No cookies are set, and no third-party analytics, advertising or social scripts are loaded.",
      },
      {
        title: "Your data stays on your device",
        body: "Settings, run history and results are stored in your browser's localStorage. Export and import keep them entirely under your control, and reset deletes the lot.",
      },
      {
        title: "Custom text never leaves the page",
        body: "Whatever you practise with is kept in the browser. It is never sent to a server, because this site does not have one.",
      },
      {
        title: "Fonts are self-hosted",
        body: "The font files are served from this site rather than a font CDN, so no third party learns anything from your session.",
      },
    ],
  },
};
