# Verify

Things a human must confirm. Bangla text, key mappings and phonetic rules are
never guessed silently — anything uncertain is listed here and marked in the code
with `// TODO(verify-native-speaker)`.

Status: `open` (needs a native speaker), `resolved` (checked, note who and when).

## Open

| # | Item | Where | Question |
|---|---|---|---|
| 1 | Bangla UI microcopy | `src/i18n/bn.json` | Every Bangla string is a first draft written for this project. Read them all and fix wording, tone and spelling. |
| 2 | Practice text review | `content/texts/*.json` | All 26 texts are original and carry `"reviewed": false` until checked. Nothing unreviewed ships once `validate:text --strict` is switched on. |
| 3 | Landing page copy | `src/content/home.ts`, `src/content/privacy.ts` | Same review, for the longer prose. |
| 4 | Sample sentence quality | `content/texts/*.json` | Are the texts natural everyday Bangla, or do they read like translations? The `medium` and `hard` sets especially. |
| 5 | Zero-width joiner strictness | `src/engine/compare.ts`, Section 7.3.3 | Text that uses U+200C/U+200D must be typed exactly. Is that too strict for real users, or is it the right call? |
| 6 | Attribution blocklist tuning | `scripts/check-attribution.mjs` | Confirm the tuned list (notably the contextual `cursor` rule) is strict enough for the owner's expectations. |
| 7 | First-text difficulty | `src/components/Practice.tsx` | The first run always draws an `easy` text and *Next* draws from the whole library. Does that feel right on a real PC? |
| 8 | Vectorised logo and favicon | `src/components/Logo.astro`, `public/favicon.svg` | The mark draws ট with an SVG `<text>` element, so it depends on a Bengali font being installed. A path-based asset is needed before launch. |
| 9 | Bengali font size | `src/styles/tokens.css` | The Bengali subset is ~105 KB (WOFF2, variable). Decide whether to drop the weight axis or trim the character set further. |
| 10 | Brand checks (Section 1A) | `docs/DECISIONS.md` | Domain availability, GitHub name, social handles, and a search for existing products called "Type Kori". |
| 11 | Phonetic grammar sign-off | `src/engine/input/phonetic-rules.json` | Phase 3 needs the first 100 rules signed off one by one. Every row is `nativeReviewed: false` today. Change a row to `true` only after checking it against a real Avro Keyboard or a native speaker. |
| 12 | Rows marked `unsourced` | `src/engine/input/phonetic-rules.json` | These have no written source at all and are the most likely to be wrong: the retroflex keys (T, Th, D, Dh) and ণ, the whole প/ফ/ভ group, য, ড়, ঢ়, স, and the ঁ and ঃ marks. |
| 13 | `kemon` divergence | `src/engine/input/phonetic.test.ts` | The engine outputs কেমোন where the reference outputs কেমন, because the reference uses a dictionary and we do not. Decide whether that is acceptable in a preview or whether word-final vowels need a special rule. |
| 14 | `ng` is ambiguous | `phonetic-rules.json` | `ng` is treated as the anusvara ং (which is what `bangla` → বাংলা needs), so ন + hasanta + গ cannot be typed in one run. Is the anusvara the right priority? |
| 15 | Guide contradictions | `phonetic-rules.json` | The published guide's table says `cha` is চ while its own example `achen` → আছেন needs `ch` to be ছ. We followed the example. Confirm which is right, and what key should give চ. |
| 16 | Bengali digit output | `phonetic-rules.json` | Section 7.3.5 says the digit output must be configurable and that Avro produces Bengali digits. Confirm that `1` → ১ is what users expect in this mode. |

## Resolved

| # | Item | Resolution |
|---|---|---|
| — | — | — |
