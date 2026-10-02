<!--
One topic per PR. The description answers three questions: what, why, and how
it was verified. PRs are reviewed by the maintainer — nothing merges itself.
-->

## What

<!-- A short, factual summary of the change. -->

## Why

<!-- The problem it solves, or the decision it records. Link the issue. -->

## How it was verified

<!-- Which gates you ran and what they showed: typecheck, test, test:scripts,
     validate:text, check:attribution, build — plus any manual or scripted
     verification (e.g. scripts/verify-layout.mjs against a served build). -->

## Checklist

- [ ] `bun run typecheck`
- [ ] `bun run test` (new logic ships with new tests; bug fixes add a failing test first)
- [ ] `bun run test:scripts`
- [ ] `bun run validate:text`
- [ ] `bun run check:attribution`
- [ ] `bun run build`
- [ ] New i18n keys added to **both** `bn.json` and `en.json`
- [ ] Behaviour changes recorded in `docs/DECISIONS.md`
- [ ] No new runtime dependency without a written reason
