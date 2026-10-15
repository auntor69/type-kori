import { describe, expect, it } from "vitest";

import { aboutCopy, faqItems } from "./faq";
import { guideBySlug, guides, type Localized } from "./guides";

const BENGALI = /[\u0980-\u09ff]/u;
const LATIN = /[A-Za-z]/;

/**
 * The cheat sheet deliberately shows Bangla characters inside its English
 * copy — that is the whole point of a transliteration table — so the English
 * check is that the string carries Latin text, not that it is free of Bangla.
 */
function expectLocalized(value: Localized, where: string): void {
  expect(BENGALI.test(value.bn), `${where} bn should be Bengali`).toBe(true);
  expect(LATIN.test(value.en), `${where} en should contain Latin`).toBe(true);
}

const langs = ["bn", "en"] as const;

describe("the guides", () => {
  it("has at least one guide", () => {
    expect(guides.length).toBeGreaterThan(0);
  });

  it("uses unique, URL-safe slugs", () => {
    const slugs = guides.map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug, slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("resolves a guide by its slug", () => {
    for (const guide of guides) {
      expect(guideBySlug(guide.slug)).toBe(guide);
    }
    expect(guideBySlug("no-such-guide")).toBeUndefined();
  });

  it("has a title, summary and at least one section in both languages", () => {
    for (const guide of guides) {
      for (const lang of langs) {
        expect(guide.title[lang].trim(), `${guide.slug} title ${lang}`).not.toBe("");
        expect(guide.summary[lang].trim(), `${guide.slug} summary ${lang}`).not.toBe("");
      }
      expect(guide.sections.length, guide.slug).toBeGreaterThan(0);
      for (const section of guide.sections) {
        expect(section.heading.bn.trim()).not.toBe("");
        expect(section.heading.en.trim()).not.toBe("");
        expect(section.paragraphs.length).toBeGreaterThan(0);
        for (const paragraph of section.paragraphs) {
          expect(paragraph.bn.trim()).not.toBe("");
          expect(paragraph.en.trim()).not.toBe("");
        }
      }
    }
  });

  it("keeps every Bangla string in Bengali script", () => {
    for (const guide of guides) {
      expectLocalized(guide.title, `${guide.slug} title`);
      expectLocalized(guide.summary, `${guide.slug} summary`);
      for (const section of guide.sections) {
        expectLocalized(section.heading, `${guide.slug} heading`);
        for (const paragraph of section.paragraphs) {
          expectLocalized(paragraph, `${guide.slug} paragraph`);
        }
      }
    }
  });
});

describe("the FAQ", () => {
  it("has questions and answers in both languages", () => {
    expect(faqItems.length).toBeGreaterThan(0);
    for (const item of faqItems) {
      for (const lang of langs) {
        expect(item.question[lang].trim(), `question ${lang}`).not.toBe("");
        expect(item.answer[lang].trim(), `answer ${lang}`).not.toBe("");
      }
    }
  });

  it("asks each question once", () => {
    const questions = faqItems.map((item) => item.question.en);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("keeps the Bangla answers in Bengali script and the English ones in Latin", () => {
    for (const item of faqItems) {
      expect(BENGALI.test(item.answer.bn)).toBe(true);
      expect(LATIN.test(item.answer.en)).toBe(true);
    }
  });
});

describe("the About copy", () => {
  it("has a title, a lead and paragraphs in both languages", () => {
    for (const lang of langs) {
      expect(aboutCopy.title[lang].trim()).not.toBe("");
      expect(aboutCopy.lead[lang].trim()).not.toBe("");
    }
    expect(aboutCopy.paragraphs.length).toBeGreaterThan(0);
    for (const paragraph of aboutCopy.paragraphs) {
      for (const lang of langs) {
        expect(paragraph[lang].trim()).not.toBe("");
      }
    }
  });
});
