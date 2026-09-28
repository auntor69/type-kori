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
- **Built-in mode** — the app converts Roman keystrokes into Bangla itself, so
  nothing needs to be installed. (Phase 3 of the roadmap.)

A word counts as correct when its final Unicode text matches the target after
normalization, no matter which keystrokes produced it.

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

## License

- Code: MIT — see `LICENSE`.
- Lesson and practice text: original content of this project, released under CC0
  (`content/`), unless a file states otherwise.
