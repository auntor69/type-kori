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
  user made minutes earlier for no benefit.- 2026-09-28 — **A pasted custom text is validated strictly, never repaired.**
  Section 5.2.5 asks for "Bangla text only, length limits". The checks are NFC
  normalization, whitespace collapsed to single spaces (newlines flattened, since
  the typing area does its own layout), a Bengali-block-only rule, and the limits
  12-1200 characters in 3-200 words. Anything else is reported and the run cannot
  start. The alternative - quietly converting ASCII digits to Bengali ones, or
  stripping emoji - would score a run against text the user never pasted, and the
  numbers on the results screen would be measuring something else. Latin letters
  get their own message because pasting English by mistake is the common case.
- 2026-09-28 — **Custom text lives in `tk:v1:custom` and rides in the backup file,
  without a version bump.** It is user data, not a setting: it never leaves the
  device, but losing it on an export/import round trip would be a surprise, so
  `createBackup` carries it and `applyBackup` writes it. The backup version stays
  **1** for the same reason lessons did: a file exported before the field existed
  simply has none, which reads as no custom text. Import replaces rather than
  merges, so such a file clears any stored custom text - the progress page says
  import replaces the data in this browser. `docs/VERIFY.md` item 25 asks the owner
  to confirm that is what they want.
- 2026-09-28 — **A custom run is untimed and takes over the pool.** A pasted
  passage is a fixed target, so the duration buttons are hidden and the run ends
  with the last word; a timer would only cut the user off mid-passage. While such a
  run is on screen the toolbar shows a "practising your own text" chip and a way
  back to the built-in library, and the progress page records the run with the text
  id `custom`.
- 2026-09-28 — **`PracticeText.source` gained a `"custom"` value.** The alternative
  was to call a paste "original", which is a claim about provenance the app cannot
  make. The build-time content validator still accepts only `"original"`, so no
  custom text can ever be counted as reviewed library content, and the review  flag on a custom text is set because the flag asks whether a native speaker checked
  text *this project* wrote, which is not a question about the user's paste.
- 2026-09-28 — **Minimal, typography-first home page.** The owner asked for a
  better UI with less text and approved a minimalist direction. The home page was
  rebuilt around the practice island: a centred hero (wordmark, three-word h1,
  one-sentence lead), the typing test immediately below it, and the old feature
  grid, how-it-works cards, input-mode cards and closing card replaced by
  borderless text sections — five feature one-liners, three numbered steps, four
  short FAQ rows, one CTA block. The `homeCopy` interface lost `eyebrow`,
  `secondaryCta`, `keyboardNote`, `toolsTitle`, `toolsLead`, `modesTitle`,
  `modesLead`, `modes`, `featuresLead` and `closingBody`, and gained `tagline`,
  `footnote` and `closingCta`. The input-mode distinction lives in the practice
  toolbar's mode chip, so a dedicated home section was redundant. Colours, radii
  and motion still come from the Section 6 tokens in `src/styles/tokens.css`; the
  redesign changed layout and copy, not the palette. The header nav's "how it
  works" link became a "FAQ" link (`nav.faq` added to both locales). Drop
  shadows were removed from the practice results and custom-text panels for a
  flat look; `--shadow-soft` stays defined for the settings drawer.
- 2026-09-28 — **The home page is only the test.** After seeing the first
  minimal pass the owner asked why any explanatory sections existed at all —
  monkeytype ships nothing like them. The features, how-it-works and FAQ
  sections were deleted outright, along with the closing CTA block, the FAQ
  JSON-LD schema, the `nav.how`/`nav.faq` links and keys, and every `homeCopy`
  field except `tagline`, `h1`, `lead` and `footnote`. Lessons, progress and
  privacy remain reachable from the header and footer, so nothing user-facing
  was lost — only prose that repeated the toolbar. The formula definitions that
  used to live in the FAQ are already printed on the results screen.
- 2026-09-28 — **The home page is only the test, and settings gained real
  depth.** The owner pushed further: no tagline, no lead, no footnote — the page
  is one muted title line plus the practice island (`homeCopy` is now only
  `h1`). In the same pass the settings drawer became a tabbed dialog in the
  monkeytype mould: behavior (difficulty, stop-on-error letter/word, blind mode,
  live WPM, input mode), appearance (text size, caret style bar/underline/off,
  show-all-lines), theme, and data. `src/lib/themes.ts` adds a registry of 18
  concrete palettes (serika, paper, nord, gruvbox, terminal, …) applied by
  overriding the Section 6 CSS custom properties at runtime; a serialized
  snapshot of the chosen palette is cached under `tk:v1:theme:<id>` so the
  no-flash inline bootstrap can apply it before any module loads. `theme: "dark"
  /"light"` legacy values are no longer valid in stored settings — `parseSettings`
  repairs them to `system` — and backups carrying them re-resolve the same way.
  Difficulty filtering, stop-on-error, blind mode, the caret styles, live-WPM
  hiding and single-line mode are wired into the practice island; the current
  run is never rebuilt mid-run by a settings change, only the next text is.
- 2026-09-28 — **Footer removed; header reduced to icons; words mode, weak-key
  drills, sound and Bengali numerals added.** The owner asked for a total
  monkeytype-style chrome: `SiteFooter.astro` was deleted outright and the
  header became a logo plus icon-only buttons (lessons, progress, language,
  settings) with no border. The theme registry grew to 39 concrete palettes
  (dracula, tokyonight, catppuccin, rosepine, everforest, onedark, solarized
  pair, githubdark, monokai, synthwave, cyberpunk, radical, and Bangla-specific
  ones: `bd` and `shapla`). Settings gained a numerals choice (latin/Bengali
  digits via `src/lib/numerals.ts`, applied to every stat and result) and a
  sound choice (off/click/error/both, synthesised with WebAudio in
  `src/lib/sound.ts`, no audio assets). The toolbar gained a words-mode group
  (10/25/50/100 committed words, untimed, target truncated to the goal) and a
  weak-key drill button that builds one practice text from the stored error
  map via `src/lib/weakKeys.ts` — disabled until at least one mistake is on
  record. A drill run is exited by the same controls as a custom run.
- 2026-09-28 — **Dark palette re-tuned toward monkeytype's "serika dark".** The
  owner asked for monkeytype-inspired styling. The dark values in
  `src/styles/tokens.css` changed (light mode is untouched): background and
  surfaces became warm charcoal (`#2c2e31` / `#323437`), foreground text warm
  off-white (`#d1d0c9`), the accent warm amber (`#e2b714`), and the dark
  `--correct` value became the foreground colour itself so typed text simply
  steps out of the dim untyped field instead of glowing green. Error red moved to
  monkeytype's `#ca4754`. The typing area lost its card border — the words are
  the UI — the caret became a vertical bar on the next cluster, the practice
  toolbar is centred, and untyped text uses the same `--pending` value as
  `--muted` for the dim "to do" state. This is a deliberate deviation from the
  literal Section 6 dark hex values; the token names, `light-dark()` structure
  and light palette are unchanged.
- 2026-09-29 — **The practice test is an endless word stream, like monkeytype's
  default.** A fixed passage ends, which makes speed testing about the passage
  rather than the typist. The default run now generates its target: an untimed run
  on the built-in library starts with twelve words drawn from every curated text
  and drill at the chosen difficulty, and the island appends twelve more whenever
  the caret gets within twelve words of the end, so the words never run out. Tab
  finishes the run and shows the results for everything typed.
  - **Infinity is explicit, not inferred.** `SessionState` gained an `infinite`
    flag (default false) alongside the new `extend` and `end` events. An early
    draft inferred infinity from "no timer and no word goal", which silently broke
    custom pastes, lesson drills and weak-key drills — all of them fixed targets
    that must still finish at their last word (`src/lib/customText.test.ts` caught
    it). Only `infinite: true` keeps a run going past its last target word.
  - **The word bank is deterministic and never repeats back to back.**
    `src/engine/wordbank.ts` weights each word by how often it occurs in the
    curated corpus, draws with `mulberry32` from a seed, skips words in the recent
    window where it can (the island passes the last eight target words; the bank
    caps the set at forty), and refuses a word that would repeat the one
    immediately before it. Extensions chain a monotone seed
    (`seed * 1664525 + 1013904223 mod 2^31-1`) so a long run never redraws a line,
    and starvation falls back to cycling rather than stalling.
  - **The rendered window is bounded.** An endless target must not grow the DOM,
    so only `activeIndex - 12 … activeIndex + 24` words render (1 and 12 when
    "show all lines" is off). Committed words outside the window are still scored
    — the session keeps the whole target — they are just not painted.
- 2026-09-29 — **Deeper settings, a command palette, funbox modes, a theme for
  every country flag, and a deeper progress page — one pass.** All of it is
  beyond `MASTERPLAN.md`, which is why it is recorded here; the phase checklist is
  untouched.
  - **Twelve new settings, each one wired to something that actually happens.**
    `quickRestart` (off/esc/tab/enter — **`esc` stays the default**, so the
    documented shortcut and the earlier accessibility reasoning are unchanged),
    `confidenceMode` (on = backspace stops at the word being typed, max = no
    backspace at all), `indicateTypos` (off/below/replace), `hideExtraLetters`,
    `minWpm` and `minAccuracy` (`0` = off; a run that drops below either ends
    early and says why, with a four-second and twenty-cluster grace period so a
    fresh run cannot fail on its own first word), `wordHistory` (off/results/
    always — **off by default**, so the results screen people already know does
    not change under them), `focusMode`, `capsLockWarning` (**on by default**: a
    locked keyboard changes what the phonetic engine produces), `soundVolume`,
    `funbox`, and `themeFavourites` (in the settings, so favourites ride along in
    the backup file). Settings that monster keyboards have but this app cannot do
    honestly — a layout-specific opposite-shift mode, free-target zen typing —
    were left out rather than faked.
  - **A bug from the previous batch, found and fixed**: the typing island binds
    its key handler once, and the handler read `sound` from the first render's
    closure, so the sound feature never played anything. Every value the handler
    needs now goes through a `prefsRef` that is refreshed on each render.
  - **The command bar is one island with two faces**: `Ctrl+K` opens the palette,
    `Ctrl+/` the command line, both over the same `parseCommand` grammar (unit
    tested at the grammar level, so `theme dracula`, `time 60`, `conf max` and
    `goto progress` all go through one code path). Run-level commands (`time`,
    `words`, `restart`, `next`, `end`, `weak`, `custom`) are broadcast as a window
    event and handled by the island that owns them; settings commands are written
    through `updateSettings`, so the settings module keeps a single writer and the
    practice island picks them up on the existing settings event.
  - **Overlays are tracked by name.** Both the settings drawer and the command bar
    set the attribute that pauses typing; with a boolean, closing either one would
    have cleared it while the other was still open.
  - **Funbox modes are transforms of the curated stream**, never new content:
    `numbers` (Bengali digits woven in), `punctuation` (danda, commas, quotes),
    `backwards` (cluster order reversed, so a conjunct stays one unit) and
    `memory` (only the word being typed and the next one stay visible). Invented
    text would need a native speaker before it could ship, and a transform needs
    nobody.
  - **A theme for every country flag, derived rather than hand-written.**
    `src/lib/flags.ts` holds 196 countries with two to five dominant flag colours
    each, and `flagTheme` computes the palette from them, every colour pushed
    until it clears a WCAG contrast floor (4.5:1 for text, 3.2:1 for muted,
    accent and wrong). The unit test re-checks all 196 palettes against those
    floors, so no flag can ship an unreadable theme. The derivation itself was
    rebuilt the same day — see the last entry in this file. **The colour lists are
    this project's reading of each flag's dominant colours, not an official
    specification** — they exist to make a recognisable theme, not to document
    flags. The theme registry therefore went from 40 hand-written palettes to
    ~250 themes, and the picker gained category chips (all/dark/light/flags/
    favourites), search over ids and names, a star per row, and a JSON export;
    the theme tab renders every theme at once, which is a few hundred small
    nodes in a modal and was measured as acceptable rather than assumed.
  - **Progress depth**: a run now records which test produced it (`time 60`,
    `words 25`, `∞`, `lesson`, `custom`, with the funbox mode appended when one is
    on), which is what makes personal bests per test type possible. The field is
    optional, so history recorded before it existed still loads and no backup
    version bump was needed. The page also gained streaks, 21 badges and a
    miss-rate heat grid — the grid sorts by rate rather than by raw count, because
    a cluster missed twice out of twice is a stronger signal than one missed three
    times out of a hundred.
  - **`--on-accent` became part of a theme.** Button labels are drawn on top of
    the accent, and a flag's accent can land anywhere on the lightness scale, so
    `ThemeDef` gained an optional `onAccent` (default: the token pair, white on a
    light theme and `#2c2e31` on a dark one). The flag palettes set it, and the
    variable is published and cleared with the rest of the palette.

- 2026-09-29 — **Verification pass on the deep-settings batch, with fixes.**
  - **`time` counts seconds, not minutes.** The command grammar originally
    multiplied a bare `time 60` by 60,000, so the documented example started a
    one-hour test — every other typing trainer counts seconds, and the palette's
    own rows said minutes while the settings row next to it says 1m/3m. Bare
    numbers are now seconds (`time 60` = one minute, `time 90` = 90 s), an
    explicit suffix overrides (`time 5m`, `time 45s`), the cap is 3,600 s, and
    the palette offers 15/30/60/120 s. `testTypeFor`/`parseTestType` store
    seconds, so the personal-bests buckets now coincide with the duration
    buttons: a 60-second command run and a 1m button run land in the same
    `time 60` group. A run shorter than a minute reads as `90s`, never as `1.5m`.
    Old records that stored minutes under `time N` now parse as seconds — with
    no deployed users yet, re-reading those few labels is cheaper than a parser
    that has to guess the unit forever.
  - **A run is pinned to the funbox it started with.** The stored mode used to be
    read live everywhere: the first run of a session rendered with `none` (the
    state default) before settings loaded, a mid-run change mixed two modes into
    one stream (some words reversed, some not), and the run recorded whichever
    mode was live at the end. `RunModel` now carries `funbox`, the stream
    extensions inherit it, the results label uses it, and the settings change
    waits for the next run — which is also what the hint text now says.
  - **The badge catalogue is actually 21.** The docs said 21 badges but the code
    built 20. The missing milestone is `endless10` — ten endless runs, read from
    the recorded test type via `parseTestType`, so runs that used a funbox still
    count. A test now pins the catalogue length so the count cannot drift again.

- 2026-09-29 — **The flag palettes were rebuilt so that the flag *is* the
  palette.** The owner rejected the first set of flag themes, Argentina first: the
  flag is blue, white and gold, and the theme was none of them. Two defects were
  behind that, and both are fixed.
  - **The table was short of colours.** Six flags were missing a colour that is
    part of what the flag looks like — Azerbaijan's white crescent and star,
    Comoros's green triangle, Cyprus's olive branches, Dominica's red circle —
    Kazakhstan carried a third colour that is not on the flag at all, and
    Micronesia listed its field twice. Two fields also contradicted this file's
    own "most cloth" convention and are now the widest band: Libya's black and
    Uruguay's white. Every row was re-checked against independently published
    per-country flag colour tables; the remaining differences are readings of the
    same flag, not gaps.
  - **The derivation threw the flag away.** It darkened the field by mixing it
    with black, which drains chroma — Argentina's celeste (`#74acdf`) became
    slate — and it never allowed gold to survive, because a pale colour could not
    clear the contrast floor on any page it produced. The palette is now read off
    the flag: the **page** is the field itself, deepened in HSL so its hue and its
    chroma both survive (`withLightness`, new in `colors.ts`), or paled toward
    white when the field is already light; the **accent** is the flag's most vivid
    colour that is neither the page nor the ink (Argentina's sun, Vietnam's star,
    Korea's blue); the **text** is the flag's own white on a dark page and its
    darkest ink on a light one; the **panel** leans 30% toward the field so the
    flag's second colour shows up in the interface; the **error mark** is the
    flag's own red, unless that red is already the accent — the caret and the
    error mark must not be the same pixels. Ties between equally vivid colours are
    broken by hue distance from the field, which is why Germany takes gold over
    red.
  - A flag with a white or gold field makes a light theme (21 of 196); the rest
    are dark pages in their own colour. The unit test now asserts the palette is
    still the flag — every page within 15° of its field's hue, every accent within
    12° of one of the flag's colours — and pins Argentina, Ukraine, Libya and Japan
    by name. The contrast floors are unchanged, and `accent === wrong` is asserted
    away, so no theme can mark a mistake with its own caret colour.
- 2026-09-29 — **A difficulty or funbox change restarts the run on screen.** The
  old behaviour was the reported bug: difficulty only reached "Next text", so
  switching it looked like nothing happened, and a stored funbox never loaded
  after a reload at all. A settings change that shapes the word stream must be
  visible immediately, the way monkeytype restarts when the test type changes;
  a custom paste, a lesson drill and a weak-key drill are still left alone,
  because those are fixed targets by definition.
- 2026-09-29 — **The test setup lives on the homepage, not only in the drawer.**
  The toolbar above the typing area now carries monkeytype's config bar:
  punctuation and numbers toggles (funbox modes), a time / words / zen / custom
  mode row, and duration chips — seconds in time mode, word counts in words
  mode, replacing the old minute labels (the command grammar already counts
  bare `time` numbers in seconds). The drawer keeps every option; the bar is
  the quick path.
- 2026-09-29 — **The theme picker has a homepage shortcut.** A small palette
  icon in the header opens the settings drawer straight onto its theme tab,
  over one window event (`tk:open-theme-picker`) emitted by an inline script,
  because sibling islands cannot pass props. The drawer itself is unchanged.
- 2026-09-29 — **Every mode switch builds its run from one helper.** The mode
  handlers used to carry stale state across switches: a words goal survived
  into a custom run (recording the paste as `words 25` on the progress page),
  "Next" in words mode rebuilt an unbounded stream because the render's
  `infinite` flag ignored the goal, and "New text" after a custom run dealt
  the same paste again. `startBuiltinRun` now owns pool, goal and funbox, and
  a custom run or a weak drill clears the leftover goal itself.
- 2026-09-29 — **The config bar stays visible during a custom run.** The mode
  chips are the only direct way out of a paste, so hiding the bar while one
  was on screen trapped the user in `custom` mode. The twist toggles and the
  duration chips are disabled or hidden there instead — they only shape a
  generated stream, which a paste is not.
- 2026-10-02 — **`stopOnError: "letter"` now refuses the wrong character
  itself.** The two modes used to collapse into one boolean: letter and word
  both set the session's word-level refusal, so "letter" behaved exactly like
  "word" and the drawer's promise ("letter mode refuses a wrong character")
  was never kept. The session now carries a separate `stopOnLetter` flag,
  checked on `input` events cluster by cluster (overshooting the word counts
  as wrong too). The built-in phonetic engine is exempt on purpose: its
  intermediate transliterations legitimately pass through shapes that are not
  prefixes of the target, and gating `compose` would stall the conversion.
- 2026-10-02 — **The stream extends in batches of three lines, not one.**
  `extendStream` used to add 12 words each time the surplus dropped to 36; at
  100+ WPM that meant a rebuild every ~7 seconds for no visual gain, because
  a batch lands beyond the 36-word render window either way. The extension
  size is now `STREAM_EXTENSION = 3 * STREAM_BUFFER` (36), which keeps the
  caret over twenty seconds of main-thread blockage away from the end of the
  target and cuts the number of stream rebuilds to roughly one per batch.
