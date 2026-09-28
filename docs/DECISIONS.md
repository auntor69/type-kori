# Decisions

One dated line per deviation from `docs/MASTERPLAN.md` or non-obvious choice,
with the reason. Newest last.

- 2026-09-28 — Package manager is **Bun**, not npm or pnpm. The build/preview
  environment is Bun-based and manages a single committed `bun.lock`. CI uses
  `oven-sh/setup-bun`, and the two `scripts/` helpers that must run in plain Node
  are plain `.mjs` run with `node --test`.
- 2026-09-28 — The dev server does not run on the framework's default port. It
  reads `PORT` from the environment and binds to all interfaces, because the
  preview host injects the port and requires `0.0.0.0`. HMR is disabled, also a
  host requirement.
- 2026-09-28 — Fonts come from the `@fontsource-variable` packages instead of a
  hand-run `pyftsubset` pipeline. Same result (self-hosted, subset by
  `unicode-range`, WOFF2, no request to Google's servers) without adding a Python
  toolchain to a Node-only build image.
- 2026-09-28 — Tailwind CSS v4 (CSS-first `@theme` tokens, no
  `tailwind.config.js`) with the design tokens from Section 6 defined as the
  source of truth in `src/styles/tokens.css`.
- 2026-09-28 — ESLint and Prettier are deliberately **not** installed yet, to
  keep the dependency count minimal while the engine is being written. The CI
  gate is type-check + unit tests + script tests + content validation +
  attribution check + build. Lint/format is added before Phase 3 (Section 10
  requires it eventually); this line is the reminder.
- 2026-09-28 — The attribution guard's blocklist omits the bare word `cursor`.
  This project talks about the text cursor constantly (and CSS uses
  `cursor: pointer`), so a bare match produced false positives. Instead `cursor`
  only matches in an attribution-like context (e.g. `Cursor AI`, `cursor.ai`,
  `Cursor IDE`). Everything else from the Section 0 list is matched on word
  boundaries. See `scripts/check-attribution.mjs` and `docs/VERIFY.md`.
- 2026-09-28 — WPM and accuracy formulas are frozen exactly as written in
  Section 7.5: WPM = correct words ÷ elapsed minutes, KPM = keystrokes ÷ elapsed
  minutes, accuracy = correct clusters ÷ target clusters in committed words.
  Hand-calculated examples live in `src/engine/metrics.test.ts`.
- 2026-09-28 — **Keystrokes (for KPM) are input events plus backspaces**, not
  code points. One key press in system mode can deliver a whole conjunct, so
  counting code points would inflate KPM by the length of every conjunct. This
  keeps KPM a measure of raw effort.
- 2026-09-28 — **`Esc` restarts a run; `Tab` is left alone.** The wireframe in
  Section 5.3 lists `Tab + Enter` as restart, but that requires swallowing `Tab`,
  which would trap keyboard users inside the typing area. Accessibility is a hard
  acceptance criterion (Section 6), so `Esc` is the documented shortcut and the
  hint under the typing area says so.
- 2026-09-28 — **Zero-width joiners are compared strictly** (Section 7.3.3): text
  that uses U+200C/U+200D must be reproduced exactly. This is what the plan asks
  for, but it does mean a user who omits a joiner the target has will see the
  cluster marked wrong. Flagged in `docs/VERIFY.md` for a native speaker to
  confirm before launch; a tolerance setting can be added later if it turns out to
  be a real annoyance.
- 2026-09-28 — **The language switch is a real anchor in the header** instead of a
  control inside the settings drawer. Section 5.3 lists language in the drawer,
  but the switch has to be a crawlable link and to appear in the prerendered HTML
  for the `hreflang` mirroring to mean anything (Section 11), and a real `<a>`
  does both.
- 2026-09-28 — **The first practice text is always an `easy` one**, then *Next*
  draws from the whole library. Section 5.1 asks for a forgiving first
  impression; a first-time visitor should not land on a conjunct-heavy sentence.
- 2026-09-28 — **Unreviewed content is a warning, not a build failure, until the
  review pass exists.** Section 10 wants unreviewed content to fail the build, but
  every text is unreviewed right now, so a hard failure would block all work.
  `bun run validate:text --strict` fails on it and is switched on once
  `docs/VERIFY.md` is clear.
- 2026-09-28 — `scripts/validate-text.ts` is TypeScript run by Bun, not the
  `.mjs` named in Section 10, so that it reuses the same `validateTextSet` module
  that has unit tests instead of duplicating the rules in a second file.
- 2026-09-28 — **Phases 0, 1 and 2 were delivered in one pass** rather than one
  phase per turn. The build environment runs and shows the project after every
  turn, so stopping after Phase 0 would have presented an empty page; the plan's
  own first-week list groups them the same way. Phase 3 and later still wait for
  the owner's go-ahead.
- 2026-09-28 — **No backend of any kind**, including none of the hosted
  framework's server features: no Convex, no auth, no database. Sections 3.5 and
  20 rule them out, and everything the app needs is already in the browser.
- 2026-09-28 — **Dark mode uses the CSS `light-dark()` function** rather than a
  duplicated dark token block. One token list, and a reader without JavaScript
  still gets the theme their operating system asks for; a forced choice only sets
  `color-scheme` on the root.
- 2026-09-28 — **`InputEngine` is a pure translator** that turns one key event
  into one action (`append` / `backspace` / `commit` / `ignore`) for the session
  reducer, instead of the stateful `EngineState` sketch in Section 7.1. The
  session owns all state, so the engine stays trivial to test. The phonetic
  engine will report its Roman buffer through the optional `composing` field on an
  `append` action.
