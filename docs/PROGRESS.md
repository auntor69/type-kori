# Progress

Checklist copied from Section 16 of `docs/MASTERPLAN.md`. Ticked as each item is
finished, with the date and the commit hash.

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

- [ ] Curriculum pages
- [ ] Lesson runner with pass criteria
- [ ] Text library
- [ ] Build-time content validator
- [ ] Custom text mode

*Done when:* 12 lessons and ~150 reviewed texts are in. **Not started:** every
text needs a native-speaker review before it ships (Section 8), so the content half
of this phase is the owner's work. Phase 5 was taken first for that reason; see the
note on phase order at the end of this file.

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

- [ ] Prerendered content pages and guides (home and privacy are already
      prerendered; the guides are not written yet)
- [x] Sitemap and structured data — 2026-09-28 · `2abf86d` (sitemap, canonical,
      hreflang, `WebApplication` and `FAQPage` JSON-LD are in; re-check when the
      guide pages exist)
- [ ] OG images
- [ ] Service worker
- [ ] Performance budget

*Done when:* Lighthouse ≥ 95 in all four categories on home and a lesson page.

## Phase 7 — QA and launch

- [ ] Cross-browser and cross-OS pass
- [ ] Content sign-off
- [x] Privacy page — 2026-09-28 · `2abf86d`
- [ ] README polish
- [ ] Release `v0.1.0`
- [ ] Submit to Search Console and share in communities

*Done when:* the Launch Checklist (Section 19) is fully ticked.

## Note on phase order

Phases 0–2 were delivered in one pass (see `DECISIONS.md`), because the build
environment shows the running project after every turn and Phase 0 alone would
have presented an empty page. Phase 3's code is complete but its acceptance needs
a native speaker, and Phase 4 needs native-reviewed content, so those two are
gated on the owner rather than on engineering. Phase 5 was therefore taken next:
it is the one remaining MVP phase whose acceptance criteria need no Bangla
judgement. Phase 4 follows, and Phase 3's sign-off can happen in parallel.
