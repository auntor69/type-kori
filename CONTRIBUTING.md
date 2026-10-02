# Contributing to Type Kori

Thank you for wanting to help — **টাইপ করি** gets better with every reviewed
text, every found bug and every well-argued suggestion. This guide explains how
the repository works so your first PR goes smoothly.

## The ground rules

1. **Everything must actually work.** A setting, a feature, a command: if it
   ships, it ships working. Code and tests are written together, not afterwards.
2. **Bangla text needs a native speaker.** Every practice text, lesson drill and
   phonetic rule carries a `reviewed` flag. Unreviewed content ships flagged and
   listed in `docs/VERIFY.md` — never silently, never marked done.
3. **Original work only.** Code is MIT; text in `content/` is CC0. The phonetic
   grammar is written from scratch (the well-known reference implementations are
   GPL/MPL/unlicensed and cannot be copied). Do not paste code or text you do
   not have the licence for.
4. **No attribution strings anywhere.** The repo enforces an authorship guard:
   commit messages and tracked files are scanned, and CI runs the same scan.
   Write your work, not your tooling.

## Getting started

```sh
git clone https://github.com/auntor69/type-kori.git
cd type-kori
bun install
git config core.hooksPath .githooks   # enables the commit-msg guard
bun run dev
```

- [Bun](https://bun.sh) ≥ 1.4 for development; Node ≥ 22 for the `scripts/`
  helpers.
- The dev server binds `0.0.0.0` and reads `PORT` (default `4321`).

## The gates (all of them must pass)

```sh
bun run typecheck       # tsc -b --noEmit, TS 7 strict + verbatimModuleSyntax
bun run test            # 450 unit tests, Vitest
bun run test:scripts    # the attribution guard's own tests
bun run validate:text   # content validator (55 items awaiting review is normal)
bun run check:attribution
bun run build           # must produce a clean static build
```

CI runs exactly these on every push and PR. A PR that fails any gate is not
reviewable.

## How to work

- **Branches**: short, kebab-case, descriptive — `fix/word-chips-goal`,
  `feat/ghost-race`.
- **Commits**: lowercase Conventional-Commits style, one line, focused on the
  *why* — `fix: the word-count chips end the run exactly at their goal`. The
  commit-msg hook rejects attribution patterns.
- **Tests**: new logic ships with new tests (the engine is pure and
  deterministic — see `src/engine/`, `src/lib/run.test.ts` for the house
  style). Bug fixes add a test that fails without the fix.
- **i18n**: the Bangla and English dictionaries are parity-tested
  (`src/i18n/`); a new key goes into both, always.
- **Decisions**: if you change a behaviour or deviate from
  `docs/MASTERPLAN.md`, add one dated entry to `docs/DECISIONS.md` with the
  reason. Non-obvious choices get recorded, or they get relitigated.

## Pull requests

- One topic per PR, rebased on current `main` (or merge `main` in — no
  surprise force-pushes).
- The PR description says what changed, *why*, and how it was verified. "How
  it was verified" is not optional: say which tests you ran, or which command
  proved it.
- PRs are reviewed by the maintainer; nothing merges itself.

## Reporting bugs

Open a GitHub issue with the bug-report form: what you typed, what you
expected, what happened, browser and OS. A screenshot of the practice area
helps more than a paragraph.

## Suggesting features

Open a GitHub issue with the feature-request form: the problem first, the
proposed behaviour second. Features that need a backend or accounts are out of
scope by design — see `docs/MASTERPLAN.md`.

## Translating and reviewing content

The highest-value contribution is a native-speaker review: go through
`docs/VERIFY.md`, check the flagged items on a real keyboard, and open a PR
flipping the `reviewed` flags you can vouch for. Practice texts live in
`src/content/texts.ts` with per-item provenance; drills in
`content/lessons/drills.json`.
