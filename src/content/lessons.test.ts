import { describe, expect, it } from "vitest";

import { validateTextSet } from "../engine/text/provider";
import { languages } from "../i18n";
import { drillTexts, textById, textsByIds } from "./drills";
import {
  PASS_ACCURACY,
  lessonById,
  lessonBySlug,
  lessonHref,
  lessons,
  lessonsCopy,
  localizedDigits,
} from "./lessons";
import { practiceTexts } from "./texts";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COPY_FIELDS = ["title", "summary", "intro", "keys"] as const;

describe("the lesson path", () => {
  it("has the twelve lessons of Section 8, in order", () => {
    expect(lessons).toHaveLength(12);
    expect(lessons.map((lesson) => lesson.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("keeps ids and slugs unique, and slugs url-safe", () => {
    const ids = new Set<string>();
    const slugs = new Set<string>();

    for (const lesson of lessons) {
      expect(ids.has(lesson.id), lesson.id).toBe(false);
      expect(slugs.has(lesson.slug), lesson.slug).toBe(false);
      expect(lesson.slug, lesson.id).toMatch(SLUG);
      ids.add(lesson.id);
      slugs.add(lesson.slug);
    }
  });

  it("passes every lesson at the Section 8 accuracy", () => {
    expect(PASS_ACCURACY).toBe(90);
  });

  it("carries every piece of copy in every language", () => {
    for (const lesson of lessons) {
      for (const lang of languages) {
        for (const field of COPY_FIELDS) {
          expect(lesson[field][lang].trim(), `${lesson.id}.${field}.${lang}`).not.toBe("");
        }
      }
    }
  });

  it("resolves every drill id without dropping one", () => {
    for (const lesson of lessons) {
      expect(lesson.drillIds.length, lesson.id).toBeGreaterThan(0);

      for (const id of lesson.drillIds) {
        expect(textById(id), `${lesson.id} -> ${id}`).toBeDefined();
      }
      expect(textsByIds(lesson.drillIds), lesson.id).toHaveLength(lesson.drillIds.length);
    }
  });

  it("looks a lesson up by id and by slug", () => {
    const first = lessons[0];

    expect(lessonById(first.id)).toBe(first);
    expect(lessonBySlug(first.slug)).toBe(first);
    expect(lessonBySlug("no-such-lesson")).toBeUndefined();
    expect(lessonById("no-such-lesson")).toBeUndefined();
  });

  it("links each lesson in the language it is rendered in", () => {
    const first = lessons[0];

    expect(lessonHref(first, "bn")).toBe(`/lessons/${first.slug}`);
    expect(lessonHref(first, "en")).toBe(`/en/lessons/${first.slug}`);
  });

  it("renders lesson numbers in the page's own digits", () => {
    expect(localizedDigits(1, "en")).toBe("1");
    expect(localizedDigits(12, "bn")).toBe("১২");
  });

  it("completes the index copy in every language", () => {
    for (const lang of languages) {
      for (const [key, value] of Object.entries(lessonsCopy[lang])) {
        expect(value.trim(), `${lang}:${key}`).not.toBe("");
      }
    }
  });
});

describe("lesson drills", () => {
  it("is valid content, all of it still unreviewed", () => {
    const report = validateTextSet(drillTexts);

    expect(report.errors).toEqual([]);
    expect(report.unreviewed).toHaveLength(drillTexts.length);
  });

  it("does not reuse a practice text id", () => {
    const practiceIds = new Set(practiceTexts.map((text) => text.id));

    for (const drill of drillTexts) {
      expect(practiceIds.has(drill.id), drill.id).toBe(false);
    }
  });

  it("gives every drill a text of its own", () => {
    const texts = new Set<string>();

    for (const drill of drillTexts) {
      expect(texts.has(drill.text), drill.id).toBe(false);
      texts.add(drill.text);
    }
  });
});
