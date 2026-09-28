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

- [x] Rule table and engine — 2026-09-28 · `PENDING` (own grammar, long-match
      scan, context rule, automatic hasanta; 39 rows + 10 digits)
- [x] Backspace handling — 2026-09-28 · `PENDING` (removes one Roman keystroke
      and re-renders, then hands back to the session)
- [x] Composing display — 2026-09-28 · `PENDING` (the `x → য` line under the text)
- [x] "OS keyboard is on" warning — 2026-09-28 · `PENDING` (a Bangla character
      arriving while built-in mode is on, or an input-method composition event)
- [ ] Cheat-sheet data

*Done when:* 200+ test cases pass and a native speaker signs off the first 100 in
`docs/VERIFY.md`. **Partly met:** 214 tests pass and 93 of them cover the phonetic
engine, but only a handful assert the reference behaviour (the six starter cases
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

*Done when:* 12 lessons and ~150 reviewed texts are in.

## Phase 5 — Progress and persistence

- [ ] Storage module with versioning
- [ ] Run history
- [ ] Error map
- [ ] Progress page
- [ ] Export / import / reset

*Done when:* data survives reloads, import/export round-trips, and the
storage-unavailable path works.

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
have presented an empty page. Phase 3 and later wait for the owner's go-ahead.
