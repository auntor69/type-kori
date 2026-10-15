# Progress

Checklist copied from Section 16 of `docs/MASTERPLAN.md`. Ticked as each item is
finished, with the date and the commit hash. Owner-requested work that no phase
covers is appended at the end under its own heading.

## Phase 0 — Foundation

- [x] Save masterplan to `docs/MASTERPLAN.md` — 2026-09-28 · `cf0738d`
      (merged in `74cc14b`)
- [x] Create `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/VERIFY.md` —
      2026-09-28 · `cf0738d`
- [x] README and license — 2026-09-28 · `cf0738d`
- [x] Scaffold the static-site + TypeScript app — 2026-09-28 · `6cdc80b`
- [x] CI running lint / type-check / tests — 2026-09-28 · `6cdc80b`
      (type-check, unit tests, script tests, content validation, attribution
      check and build; ESLint/Prettier still deferred, see `DECISIONS.md`)
- [x] Deploy an empty page — 2026-09-28 · `2abf86d` (preview URL loads;
      production deploy from the Deploy button is still to do)

*Done when:* a preview URL loads, CI is green, the attribution guard (hook + CI
script + test) is in place, and `git shortlog -sne --all` shows only the owner.
**Met.** Verified with `git shortlog -sne --all` and
`git log --format='%an <%ae>%n%b' | sort -u`: one identity, no trailers.

## Phase 1 — Design system and shell

- [x] Design tokens (light/dark) — 2026-09-28 · `2abf86d`
- [x] Fonts, self-hosted and subset — 2026-09-28 · `2abf86d`
- [x] Layout, header, navigation — 2026-09-28 · `2abf86d`
- [x] Settings drawer — 2026-09-28 · `2abf86d`
- [x] i18n (`bn` / `en`) — 2026-09-28 · `2abf86d`
- [x] Theme switching — 2026-09-28 · `2abf86d`

*Done when:* every shell page is responsive, passes axe, and the Bangla font
renders correctly. **Partly met:** the pages are responsive and the Bangla face
renders, but axe is not wired into CI yet, so the accessibility pass is still
outstanding (Phase 7, or earlier if wanted).

## Phase 2 — Engine core (System mode)

- [x] Cluster splitter and normalization — 2026-09-28 · `2abf86d`
- [x] Comparison — 2026-09-28 · `2abf86d`
- [x] Metrics — 2026-09-28 · `2abf86d`
- [x] Session state machine — 2026-09-28 · `2abf86d`
- [x] Typing area island — 2026-09-28 · `2abf86d`
- [x] Results screen — 2026-09-28 · `2abf86d`

*Done when:* unit tests cover the Section 7.3 pitfalls; a user with a Bangla
system keyboard installed can complete a run with correct scoring. **Unit tests
are in (114 passing, including the tricky-word table cross-checked against
`Intl.Segmenter`); the run on a real PC with a real keyboard is the owner's
check.** The 26 practice texts are still `reviewed: false`.

## Phase 3 — Built-in Avro Phonetic mode

- [x] Rule table and engine — 2026-09-28 · `f6c272e` (own grammar, long-match
      scan, context rule, automatic hasanta; 60 rows: 9 vowels, 36 consonants,
      4 marks, 1 explicit conjunct, 10 digits)
- [x] Backspace handling — 2026-09-28 · `f6c272e` (removes one Roman keystroke
      and re-renders, then hands back to the session)
- [x] Composing display — 2026-09-28 · `f6c272e` (the `x → য` line under the text)
- [x] "OS keyboard is on" warning — 2026-09-28 · `f6c272e` (a Bangla character
      arriving while built-in mode is on, or an input-method composition event)
- [ ] Cheat-sheet data

*Done when:* 200+ test cases pass and a native speaker signs off the first 100 in
`docs/VERIFY.md`. **Partly met:** 221 tests pass and 100 of them cover the phonetic
engine (including an end-to-end run wired the way the typing area wires it), but
only a handful assert the reference behaviour (the six starter cases
in Section 7.6 plus three documented examples). The rest pin down our own grammar
and the engine's structure, which is regression protection, not proof of
correctness. The sign-off has not happened, so the mode stays an opt-in preview
and the phase is **not** complete. See items 11-16 in `docs/VERIFY.md`.

## Phase 4 — Content and lessons

- [x] Curriculum pages — 2026-09-28 · working tree (`/lessons` and
      `/lessons/[slug]`, plus the English mirrors: twelve lessons with their own
      copy, a real crawlable link per lesson, `ItemList` on the index and
      `BreadcrumbList` on each lesson page)
- [x] Lesson runner with pass criteria — 2026-09-28 · working tree (the typing
      island takes a lesson: a fixed drill set, untimed, and a pass/fail banner at
      90% accuracy; the best result so far is shown beside the criterion)
- [ ] Text library — 26 practice texts and 29 lesson drills today, against the
      ~150 reviewed texts the phase asks for
- [x] Build-time content validator — 2026-09-28 · working tree (now also validates
      `content/lessons/drills.json`, rejects a drill that shadows a practice text
      id, and fails on a lesson pointing at a drill id that does not exist)
- [x] Custom text mode — 2026-09-28 · working tree (**Your own text** on the
      practice page opens a paste box; the text is cleaned, checked against the
      Bangla-only and length rules, stored under `tk:v1:custom`, carried in the
      backup file, and drilled as one untimed run)

*Done when:* 12 lessons and ~150 reviewed texts are in. **Partly met:** the twelve
lessons exist and every link, drill id and copy field is checked by a test, so the
mechanics of the phase are in place. Every item on the checklist is now built. What
is missing is volume and review: 55 authored items (26 practice texts, 29 drills)
are still `reviewed: false`, against a target of ~150 reviewed texts, so
`validate:text --strict` still fails. The Bangla in the lesson copy, the drills and
the custom-text panel is a first draft and is listed in `docs/VERIFY.md`.

## Phase 5 — Progress and persistence

- [x] Storage module with versioning — 2026-09-28 · working tree (primitives now
      shared by settings, runs and the error map; the memory fallback enumerates
      its keys, so reset works without `localStorage`)
- [x] Run history — 2026-09-28 · working tree (one record per finished run, newest
      first, capped at the Section 9 limit of 500)
- [x] Error map — 2026-09-28 · working tree (seen/missed per target cluster,
      merged into `tk:v1:errorMap` after every run; the most-missed bars read it)
- [x] Progress page — 2026-09-28 · working tree (`/progress` and `/en/progress`:
      best speed, average accuracy, total typing time, a hand-rolled SVG speed
      chart, the most-missed clusters, and a table of the last 20 runs)
- [x] Export / import / reset — 2026-09-28 · working tree (one JSON file with the
      settings, the runs and the error map; import validates the app marker and the
      schema version; reset is a two-step button)

*Done when:* data survives reloads, import/export round-trips, and the
storage-unavailable path works. **Met by unit tests** — 28 tests for the run
history, error map, aggregates and backup, plus 14 for the storage primitives:
the round-trip, the 500-run cap, every corrupt-value path, the failed-write path
and the memory fallback are covered. The suite is now 260 tests across 11 files,
and `bun tsc -b --noEmit` is clean. Confirming the file download and upload in a
real browser is the owner's check. The 26 practice texts are still
`reviewed: false`; nothing here depends on them.

## Phase 6 — SEO, PWA, performance

- [x] Prerendered content pages and guides — 2026-10-11 · working tree
      (`/guides` + `/guide/<slug>`, `/faq`, `/about` and `/keyboard`, each with its
      `/en/` mirror; the copy lives in `src/content/` and `src/content/guides.test.ts`
      holds the structural rules)
- [x] Sitemap and structured data — 2026-09-28 · `2abf86d` (sitemap, canonical,
      hreflang, `WebApplication` and `FAQPage` JSON-LD are in; the FAQ page and
      its JSON-LD are now generated from the same `src/content/faq.ts`, so the two
      cannot disagree)
- [x] OG images — 2026-10-11 · working tree (one 1200x630 card per built page,
      title in either script, generated into `dist/og/` by `scripts/generate-og.mjs`
      at build time — resvg + a shipped Noto Sans Bengali TTF, so no Bengali font
      has to be installed on the build machine; `public/og.png` stays the
      site-wide fallback)
- [x] Service worker — 2026-10-02 · `public/sw.js` (hand-written, production-only:
      network-first navigations, stale-while-revalidate assets; `src/lib/pwa.test.ts`
      and `scripts/sw.test.mjs` cover the precache list and the registration gate)
- [x] Performance budget — 2026-10-15 · working tree (the mobile gap was the
      last piece; see below)

*Done when:* Lighthouse ≥ 95 in all four categories on home and a lesson page.
The accessibility half of that is now enforced (axe over every built page in CI).
A real-browser run on 2026-10-13 (built `dist/`, desktop preset) gives:

| page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` (home) | 99 | 100 | 100 | 100 |
| `/lessons/vowels/` | 100 | 100 | 100 | 100 |
| `/en/` | 100 | 100 | 100 | 100 |

The four fixes that run drove are in `docs/DECISIONS.md` (the settled first frame,
`scrollbar-gutter: stable`, the two font preloads, the light muted token, the
decorative logo mark).

**The mobile gap is closed, and it was a *when*, not a *what*.** Mobile-emulated
*Performance* had been 76–89, everything else 100, with 480–1,170 ms of Total
Blocking Time from hydrating the practice island under Lighthouse's 4× CPU
throttle. Nothing on the page needs the engine until a key is pressed, so
`src/lib/deferredHydration.ts` now keeps its modules off the load path: the
server-rendered words *are* the page, and the first key, tap or focus starts one
dynamic import that hydrates onto the existing markup. Keystrokes pressed while
it loads are buffered and replayed on their original targets, so typing waits at
worst and is never dropped. On 2026-10-15, same built `dist/` and same sandbox:
desktop 100/100/100/100 on all three pages, mobile Performance 96–98 with every
other category at 100 and TBT down to ~200 ms. The product decision the earlier
note flagged is taken and recorded in `docs/DECISIONS.md`; the invariants are
held by `scripts/verify-layout.mjs`, which asserts that the engine is not
fetched before an interaction, that a run typed while it loads still finishes,
and that the practice block — words, on-screen board and live stats — sits
inside the first viewport.

## Phase 7 — QA and launch

- [ ] Cross-browser and cross-OS pass
- [ ] Content sign-off
- [x] Privacy page — 2026-09-28 · `2abf86d`
- [ ] README polish
- [ ] Release `v0.1.0`
- [ ] Submit to Search Console and share in communities

*Done when:* the Launch Checklist (Section 19) is fully ticked.

## Beyond the plan (owner-requested)

Work the owner asked for that no phase covers. Recorded here so the ledger stays
in one place; the reasoning is in `DECISIONS.md`.

- 2026-09-29 · `faf6b7b` — monkeytype-style endless word stream: the untimed
  practice test generates its target instead of using a fixed passage, and Tab
  ends the run.
- 2026-09-29 — minimal, monkeytype-only interface: footer removed, icon-only
  header, borderless typing area, ~250 themes including one derived from every
  country flag, a deeper settings drawer, a `Ctrl+K` command palette with a
  command line, funbox modes (numbers, punctuation, backwards, memory), focus
  mode, and a deeper progress page (personal bests per test type, streaks,
  badges, miss-rate heat grid).

## Note on phase order

Phases 0–2 were delivered in one pass (see `DECISIONS.md`), because the build
environment shows the running project after every turn and Phase 0 alone would
have presented an empty page. Phase 3's code is complete but its acceptance needs
a native speaker, and Phase 4 needs native-reviewed content, so those two are
gated on the owner rather than on engineering. Phase 5 was therefore taken next:
it is the one remaining MVP phase whose acceptance criteria need no Bangla
judgement. Phase 4 follows, and Phase 3's sign-off can happen in parallel.
- 2026-09-29 — verification pass over the batch above, with fixes: the command
  grammar's `time` now counts seconds (the documented `time 60` started a
  one-hour test), a run keeps the funbox mode it started with instead of picking
  up mid-run changes, and the badge catalogue is a real 21 (new `endless10`
  milestone; docs said 21, code built 20). The command palette's duration rows
  are 15/30/60/120 s, and the personal-bests buckets now coincide with the
  duration buttons.
- 2026-09-29 — flag palettes rebuilt after the owner rejected them: the missing
  flag colours were added to the table (Azerbaijan, Comoros, Cyprus, Dominica),
  two invented/wrong ones removed (Kazakhstan, Micronesia) and two fields
  reordered to the widest band (Libya, Uruguay); the derivation now reads the
  palette off the flag itself — page from the field's own hue and chroma, accent
  from the flag's most vivid colour, text from the flag's white or darkest ink,
  panel leaning toward the field.
- 2026-10-10 — first five from the owner's feature shortlist: a **consistency**
  score (each run now stores the per-second speed it was sampled from), a
  **mistake notebook** of the words actually mistyped plus a drill built from
  them (`?mistakes=1` on the practice page), the **daily challenge** seeded from
  the date so every device draws the same words (`?daily=YYYY-MM-DD`, no server),
  a **new personal best** moment on the results screen, and a live clean-word
  **combo** counter. `RunRecord.errors` now also carries the target word, which
  is what makes the notebook about words rather than clusters.
- 2026-10-11 — the second batch, all verified in a real browser before landing:
  - **Content pages.** `/guides` with a page per guide in both locales, a real
    `/faq` (the same rows feed the `FAQPage` JSON-LD), an `/about`, and a
    `/keyboard` whose tables are generated from `phonetic-rules.json` — the
    cheat sheet and the engine cannot drift because they share one source.
  - **Result share card.** A finished run becomes a 1200x630 PNG painted on a
    canvas in the browser; nothing is uploaded and no service is called.
  - **Shareable test links.** Time, words, funbox, difficulty, layout and a
    custom text all encode into the query string, so one link opens one exact
    exercise; a broken field is dropped rather than taking the link down.
  - **A per-run detail view** on the progress page: the run's own stats, its
    consistency recomputed from the samples, and a link that repeats the test
    when the test type has a preset worth encoding.
  - **Custom text grew up** into a named library (the old single-paste key is
    migrated) with digit repair, so an exam question carrying `25 নম্বর` is
    usable instead of rejected.
  - **A typing game** (`/game`): falling words, three speeds, one point per
    cluster, drawn from the same curated vocabulary as the endless stream.
  - **Accessibility became a gate.** `bun run test:a11y` runs axe-core over every
    built page and fails the build on a violation; CI runs it after `bun run build`.
  - **Per-page social cards**, generated into `dist/` at build time from a
    shipped Bengali TTF.

  Verification of the batch turned up a real hole in the built-in phonetic
  preview: a Roman keyboard could not produce `।` at all, while 14 of the 26
  practice texts, one drill and the punctuation funbox all contain one, so those
  runs could not be finished. The grammar now maps the period key to the danda
  (one `unsourced` row, listed in `docs/VERIFY.md` item 42) and the dictionary
  step ignores trailing punctuation, so the sentence-final word keeps its
  exception (`kemon.` is কেমন।, not কেমোন।).

  The suite is 665 tests across 39 files plus the `scripts/` helpers, and
  `bun tsc -b --noEmit` is clean. The Bangla these features introduced is a first
  draft and is listed in `docs/VERIFY.md` (items 23–42).
