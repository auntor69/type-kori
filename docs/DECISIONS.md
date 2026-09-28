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
  only matches when the next word is an assistant- or editor-style suffix, so the
  word on its own, a `cursor: pointer` declaration and "move the cursor" all stay
  legal. Everything else from the Section 0 list is matched on word boundaries.
  See `scripts/check-attribution.mjs` and `docs/VERIFY.md`.
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
  into one action (`append` / `compose` / `backspace` / `commit` / `ignore`) for
  the session reducer, instead of the stateful `EngineState` sketch in Section 7.1.
  The session owns all state, so the engine stays trivial to test. The phonetic
  engine reports the whole current word through a `compose` action rather than a
  delta, because its output changes as more keys arrive.

## Phase 3 — built-in phonetic mode

- 2026-09-28 — **The phonetic grammar is written for this project; nothing was
  copied.** Section 7.6 makes a licence check a precondition, and the check comes
  out badly: `imerfanahmed/avro-php` (the reference implementation other ports
  derive from) is **GPL-3.0**, `sarim/ibus-avro` is **MPL** (1.1 on OmicronLab's
  own page, 2.0 in the repository), and the official jQuery port `jsAvroPhonetic`
  states no licence at all. None of those can be relicensed under this project's
  MIT licence, and keeping an MPL or GPL file beside MIT code would make the
  repository mixed-licence, which contradicts Section 15. Section 0 also forbids
  acknowledging any author but the owner, and MIT requires keeping a copied work's
  copyright notice — the two rules cannot both be satisfied by vendoring a table.
  So the grammar was written from documented behaviour, every row records where it
  came from, and the sources are listed in the data file itself.
- 2026-09-28 — **The reference behaviour is dictionary-driven, so a rule engine
  cannot match it exactly.** OmicronLab's own documentation advertises a ~150,000
  word dictionary with auto-correct, and the divergence is easy to demonstrate:
  the reference spells `kemon` as কেমন (inherent vowel unwritten) but `bhalo` as
  ভালো (explicit ো). Identical Roman endings, different Bangla. No rule table can
  decide that, and shipping a dictionary is out of scope (Section 20 rejects
  runtime data of that kind, and there is no backend). Known divergences are
  recorded as failing-our-expectation tests in `src/engine/input/phonetic.test.ts`
  so they cannot be mistaken for working behaviour.
- 2026-09-28 — **Built-in mode is an opt-in preview, not the default.** Section 3.1
  says built-in mode is the default, and Phase 3's acceptance test is 200+ cases
  plus a native speaker signing off the first 100. The second half is not done, and
  the divergence above is a real defect for a learning tool: a learner who cannot
  produce the target word from the engine gets no useful practice. So `system`
  stays the default, the drawer labels built-in mode as a preview with the warning
  in plain sight, and the option exists mostly so the owner and their testers can
  exercise it to produce the sign-off data. Flip the default in
  `src/lib/settings.ts` once `docs/VERIFY.md` is clear.
- 2026-09-28 — **Every grammar row carries a `source` and a `nativeReviewed` flag,
  and a test enforces both.** A row cannot cite a source that is not declared in
  the file's own `meta.sources`, and every row must still be `nativeReviewed: false`
  until a human signs it off. The test fails the moment someone quietly marks rows
  as reviewed.
