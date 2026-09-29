# Type Kori

**টাইপ করি** — _Bangla Typing Trainer_

Learn and practice typing Bangla on a PC keyboard: structured lessons, speed
tests and honest progress tracking. Free, no sign-up, no ads, and no data leaves
your device.

Learn Bangla typing. Free, fast, no sign-up.

## What it is

A static website. The content pages are prerendered HTML; the typing area is a
small interactive island. There is no backend, no database, no account, and no
third-party tracker. Progress lives in `localStorage`.

Two input modes:

- **System keyboard mode** — you already have a Bangla keyboard (Avro Keyboard,
  an OS layout, …). The app compares the Unicode your keyboard produces against
  the target text. Any layout works, and the app scores what you actually typed.
- **Built-in mode (preview)** — the app converts Roman keystrokes into Bangla
  itself, so nothing needs to be installed. Native speakers have not signed off the
  rules yet, so it stays an opt-in preview and the system keyboard remains the
  default.

A word counts as correct when its final Unicode text matches the target after
normalization, no matter which keystrokes produced it.

Finished runs, the error map, lesson results and the settings all live in
`localStorage`. The progress page summarises them and can export, import or reset
them as one JSON file.

## Lessons

`/lessons` is a path of twelve short lessons, from the vowels to conjuncts, numbers
and real-world text. Each lesson is a fixed drill set with no timer, passed at 90%
accuracy. The curriculum and its copy are in `src/content/lessons.ts`, the drill
texts in `content/lessons/drills.json`, and every drill carries the same
`reviewed` flag as a practice text.

## Your own text

On the practice page, **Your own text** opens a paste box: paste an exam question
or a paragraph from a book and, once it passes the checks (Bangla only, 12–1200
characters in 3–200 words), it becomes the target of one untimed run. The text is
kept in `localStorage` (never uploaded), it travels with the export/import file,
and "reset all data" on the progress page removes it too.

## Beyond the basics

The practice test streams words endlessly, like monkeytype: untimed runs on the
built-in library never run out, because the island appends a fresh line whenever
the caret gets near the end. `Tab` ends the run and shows the results.

`Ctrl+K` (or the terminal icon in the header) opens the **command palette**, and
`Ctrl+/` opens the **command line** — the same grammar either way:

```
theme dracula      time 60        words 25       funbox numbers
conf max           typos below    blind on       goto progress
```

Settings go deep: quick restart key, confidence mode, minimum speed and accuracy,
indicate typos, hide extra letters, words history, focus mode, sound volume, and
funbox modes that twist the stream (Bengali numerals, punctuation, reversed
words, or words you have to remember).

The theme gallery ships ~250 palettes: the built-in ones, community classics, and
one derived from every country flag (search "Bangladesh", or filter by *flags*).
Themes can be starred and exported as JSON.

The progress page keeps personal bests per test type, streaks, 21 badges, a
miss-rate heat grid and the speed trend.

## Requirements

- [Bun](https://bun.sh) ≥ 1.4 for development and scripts.
- Node ≥ 22 for the `scripts/` helpers that run outside Bun.

## Stack

Astro (static output) + TypeScript, Preact for the interactive islands, Tailwind
CSS v4 with the CSS-variable tokens in `src/styles/tokens.css`, Vitest for unit
tests. Content pages are prerendered HTML; only the typing area and the settings
drawer ship JavaScript. There is no backend.

Nothing is fetched from a third-party server at runtime: the fonts are
self-hosted and there is no analytics or advertising script. Astro's build-time
telemetry is disabled in CI with `ASTRO_TELEMETRY_DISABLED=1`, and can be disabled
locally the same way (or with `bunx astro telemetry disable`).

## Run it

```sh
bun install
bun run dev
```

The dev server binds to `0.0.0.0` and reads `PORT` from the environment
(falling back to `4321`), so the hosted preview keeps working.

Other scripts:

| Command | What it does |
|---|---|
| `bun run dev` | Dev server |
| `bun run build` | Production build to `dist/` |
| `bun run preview` | Serve the built output |
| `bun run typecheck` | `tsc -b --noEmit` |
| `bun run test` | Unit tests (Vitest) |
| `bun run test:scripts` | Unit tests for the `scripts/` helpers |
| `bun run check:attribution` | Authorship guard: tracked files + commit messages |
| `bun run validate:text` | Content validator: characters, encodings, review flags |

Pages: `/` (practice), `/lessons` (the twelve-lesson path, one page per lesson),
`/progress` (history and data), `/privacy`. Every page has an English mirror under
`/en/`.

## Test

```sh
bun run test           # engine, metrics, storage
bun run test:scripts   # the attribution guard
bun run typecheck
```

Pure logic (the typing engine, metrics, cluster splitting, storage) is unit
tested. Tests are written together with the code, not afterwards.

## Git hook

The repository enforces authorship rules locally. Enable the hook once per clone:

```sh
git config core.hooksPath .githooks
```

`.githooks/commit-msg` rejects a commit message that contains attribution
patterns, and CI runs the same check (`scripts/check-attribution.mjs`) over the
changed range and over every tracked file. `docs/MASTERPLAN.md` and the guard
script itself are the only files excluded from the file scan.

## Project documents

- `docs/MASTERPLAN.md` — the plan. Read this before changing anything.
- `docs/PROGRESS.md` — the roadmap checklist, ticked phase by phase.
- `docs/DECISIONS.md` — every deviation from the plan and every non-obvious choice.
- `docs/VERIFY.md` — open questions that need a native Bangla speaker.

## Contributing

Contributions of reviewed practice texts, translations and test cases for the
typing engine are welcome. Every text needs a native-speaker review before it
ships, and every rule of pure logic needs a test. See `docs/MASTERPLAN.md`
Sections 8, 13 and 15.

## The phonetic grammar

`src/engine/input/phonetic-rules.json` is this project's own grammar for the
well-known Avro phonetic conventions. It is **not** copied from an existing
implementation: the reference implementations are GPL-3.0, MPL, or state no
licence at all, so none of them can be relicensed under MIT. Every row records
where it came from in the file's own `meta.sources`, and a row is only marked
`nativeReviewed: true` once a human has checked it against a real keyboard.
Built-in mode therefore ships as an opt-in preview, not the default. The full
licence analysis is in `docs/DECISIONS.md`.

## License

- Code: MIT — see `LICENSE`.
- Lesson and practice text: original content of this project, released under CC0
  (`content/`), unless a file states otherwise.
- The phonetic grammar: original to this project, MIT, like the rest of the code.
