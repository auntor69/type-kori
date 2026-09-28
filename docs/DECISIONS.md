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

## Phase 5 — progress and persistence

- 2026-09-28 — **The system keyboard stays the default input mode, and built-in
  phonetic mode stays an opt-in preview.** Phase 3 left this open, because
  Section 3.1 names built-in mode as the default while Phase 3's acceptance test
  needs a native speaker. The owner reviewed the licence analysis and the
  dictionary divergence above and confirmed the system keyboard is the right
  default: it needs nothing installed, it works with whichever layout the user
  already has, and it makes no correctness claim the app cannot keep. Nothing in
  `src/lib/settings.ts` had to change; this line records the owner's decision so
  the deviation from Section 3.1 is not mistaken for an oversight.
- 2026-09-28 — **The v1.1 fixed-layout and on-screen-keyboard workstream is
  dropped.** Sections 3.2, 4 (v1.1), 5.3 and 7.8 plan the national layout
  (BDS 1738) and Probhat with an on-screen keyboard, finger colours and key hints.
  The owner's call is that a rendered keyboard is unnecessary: the user already
  has their own system keyboard, and System mode deliberately supports every
  layout for zero engine work. Nothing had been built for it, so this is a scope
  change only — which also means the `layout` and `sound` fields in the Section 9
  settings schema are not implemented. If the feature is ever revived, the
  interface already carries `KeyboardEvent.code` through to the engine, which is
  the first half of Section 7.8.
- 2026-09-28 — **Phase 5 was built before Phase 4.** The plan works phase by
  phase. Phase 3's outstanding criterion is a native speaker signing off the first
  100 rules, and Phase 4's is 12 lessons plus ~150 native-reviewed texts; both are
  the owner's to give, and neither should be faked. Phase 5 is the one remaining
  MVP phase whose *Done when* is entirely in reach without inventing Bangla, so it
  was taken next. Nothing here blocks Phase 4, and Phase 3's sign-off can happen in
  parallel.
- 2026-09-28 — **Storage primitives moved to `src/lib/storage.ts`.** Settings,
  runs and the error map all need the same versioned-key, memory-fallback,
  defensive-JSON behaviour, so it was extracted and `settings.ts` now re-exports
  it unchanged. One behaviour was fixed on the way: the in-memory fallback now
  enumerates its own keys, so "reset all data" also works in a browser that
  refuses `localStorage` — which is exactly what Phase 5's storage-unavailable
  criterion tests.
- 2026-09-28 — **A stored run's `durationMs` is the time actually spent typing**,
  not the timer the test was started with. Section 9 lists `durationMs` without
  saying which; the results screen shows elapsed time, a total on the progress
  page only means something as real time typed, and the timer setting is a
  per-session choice rather than a property of the record.
- 2026-09-28 — **The error map is keyed by target cluster.** `missed` and `seen`
  are counted per target cluster, so "most missed" can name the letters and vowel
  signs a learner actually struggles with. A typed cluster past the end of the
  target word is already scored as a wrong word and is not attributed to a cluster
  it does not correspond to; only committed words are counted, like every other
  number.
- 2026-09-28 — **The backup file carries the settings too.** Section 9 says
  "export/import progress", but Section 3.5's promise is that a user can move
  devices. One file that restored the history and the error map while silently
  dropping the theme, text size and input mode would not do that, so the file is
  `{ app, version, exportedAt, settings, runs, errorMap }`. Import checks the app
  marker and the schema version and refuses anything else, so an unrelated JSON
  file cannot half-overwrite the user's data.
- 2026-09-28 — **Reset is a two-step button, not a browser `confirm()`.** Section 9
  asks for a confirmation; an in-page second step keeps the keyboard flow intact,
  is announced through `role="status"`, and needs no DOM stubbing in tests.
- 2026-09-28 — **The speed chart is a hand-rolled SVG polyline.** Section 10 allows
  hand-rolled SVG or one tiny library; a polyline plus circles is a few hundred
  bytes and keeps the progress page inside the Section 12 budget. The same numbers
  are also in the run table, so the chart is never the only way to read the data.

## Phase 4 — content and lessons

- 2026-09-28 — **A lesson drill is a content item shaped exactly like a practice
  text.** Section 8 fixes the shape of a text (`id`, `text`, `difficulty`, `topic`,
  `source`, `reviewed`) and Section 10 wants unreviewed content to fail the build.
  Giving the drills the same shape means one validator and one review flag cover
  both kinds of content, and a drill gets the same comparison rules as a practice
  text. The drills live in `content/lessons/drills.json`, and `src/content/drills.ts`
  resolves an id across both sets so a lesson can use a drill or a practice text.
- 2026-09-28 — **The drills are letter and sign drills first, words second, and the
  last two lessons reuse the existing library.** Section 8's early lessons are about
  the letters themselves, so those drills are alphabet drills (ক খ গ ঘ ঙ, কা কি কু)
  rather than invented vocabulary. Lessons 11 and 12 point at the practice texts
  that already exist instead of duplicating sentences into a second file. Every
  drill is `reviewed: false` and listed in `docs/VERIFY.md`; nothing here is
  silently guessed.
- 2026-09-28 — **A lesson is untimed and does not use `stopOnError`.** Section 7.4.5
  offers "stop on error" for beginner lessons, but that option refuses to commit a
  wrong word, which would make every committed word correct and the Section 8 pass
  criterion (90% accuracy) meaningless. Lessons therefore run the normal scoring path
  with no timer: the drill ends when the text is finished.
- 2026-09-28 — **Lesson progress is stored under `tk:v1:lessons` as Section 9
  describes it** (`bestAccuracy`, `bestWpm`, `completedAt`), written after every
  finished lesson run, and it is part of the backup file. The backup schema version
  stays at **1**: a file exported before lessons existed simply has no `lessons` key,
  which reads as empty, and bumping the version would have invalidated an export the
  user made minutes earlier for no benefit.
- 2026-09-28 — **The lessons index is prerendered HTML with no completion ticks
  yet.** The list has to be crawlable (Section 11), so the links and the lesson copy
  are static. Marking a passed lesson on that list needs a client island, which is
  deferred rather than shipping a list that is empty without JavaScript; the best
  result for a lesson is already shown on the lesson page itself.
