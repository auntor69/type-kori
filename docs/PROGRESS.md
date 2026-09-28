# Progress

Checklist copied from Section 16 of `docs/MASTERPLAN.md`. Ticked as each item is
finished, with the date and the commit hash.

## Phase 0 — Foundation

- [ ] Save masterplan to `docs/MASTERPLAN.md`
- [ ] Create `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/VERIFY.md`
- [ ] README and license
- [ ] Scaffold the static-site + TypeScript app
- [ ] CI running lint / type-check / tests
- [ ] Deploy an empty page

*Done when:* a preview URL loads, CI is green, the attribution guard (hook + CI
script + test) is in place, and `git shortlog -sne --all` shows only the owner.

## Phase 1 — Design system and shell

- [ ] Design tokens (light/dark)
- [ ] Fonts, self-hosted and subset
- [ ] Layout, header, navigation
- [ ] Settings drawer
- [ ] i18n (`bn` / `en`)
- [ ] Theme switching

*Done when:* every shell page is responsive, passes axe, and the Bangla font
renders correctly.

## Phase 2 — Engine core (System mode)

- [ ] Cluster splitter and normalization
- [ ] Comparison
- [ ] Metrics
- [ ] Session state machine
- [ ] Typing area island
- [ ] Results screen

*Done when:* unit tests cover the Section 7.3 pitfalls; a user with a Bangla
system keyboard installed can complete a run with correct scoring.

## Phase 3 — Built-in Avro Phonetic mode

- [ ] Rule table and engine
- [ ] Backspace handling
- [ ] Composing display
- [ ] "OS keyboard is on" warning
- [ ] Cheat-sheet data

*Done when:* 200+ test cases pass and a native speaker signs off the first 100 in
`docs/VERIFY.md`.

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

- [ ] Prerendered content pages and guides
- [ ] Sitemap and structured data
- [ ] OG images
- [ ] Service worker
- [ ] Performance budget

*Done when:* Lighthouse ≥ 95 in all four categories on home and a lesson page.

## Phase 7 — QA and launch

- [ ] Cross-browser and cross-OS pass
- [ ] Content sign-off
- [ ] Privacy page
- [ ] README polish
- [ ] Release `v0.1.0`
- [ ] Submit to Search Console and share in communities

*Done when:* the Launch Checklist (Section 19) is fully ticked.
