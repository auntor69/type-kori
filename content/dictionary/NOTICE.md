# The word list behind built-in phonetic mode

Built-in phonetic mode (`avro-phonetic`) is a rule engine: it can spell Bangla,
but it cannot know which spellings are words. Real Avro ships a word list for
exactly that, and so does this project — the file next to this notice is the
source it is built from.

## What is vendored

| File | What it is |
|---|---|
| `bn_BD.dic` | The source word list, verbatim and unmodified. |
| `COPYING` | The licence the source word list is distributed under, verbatim. |

**Source:** LibreOffice `dictionaries` repository, `bn_BD` — the Bengali
(Bangladesh) Hunspell spell-check dictionary.

- Repository: https://github.com/LibreOffice/dictionaries
- Directory: https://github.com/LibreOffice/dictionaries/tree/master/bn_BD
- Pinned revision: `e7b61087d7d42eba51425eae74643ea5623c574a`
  (https://github.com/LibreOffice/dictionaries/commit/e7b61087d7d42eba51425eae74643ea5623c574a)
- File fetched:
  https://raw.githubusercontent.com/LibreOffice/dictionaries/e7b61087d7d42eba51425eae74643ea5623c574a/bn_BD/bn_BD.dic
- Size and digest of the file as vendored:
  `2237684` bytes,
  `sha256 cfc78b361861a726d22f0654d7c4e0b47f843c4a9e8b605c4c99e91ea683e116`
- Entries in the file: `87 639` (its own count line).

## Licence

`bn_BD.dic` is distributed under the **GNU General Public License, version 2
only**, as stated by the `COPYING` file vendored here, which is the copy that
ships beside the dictionary upstream.

> Copyright 2018 Jacob Thomas, Bengal Creative Media LTD

The notice above is quoted from the header of `bn_BD.aff`, which is part of the
same upstream dictionary and carries the same licence.

**This is data, not code, and it is not under the project's MIT licence.** The
application's own source stays MIT; `content/dictionary/` and anything generated
from it are GPL-2.0-only. Concretely, that means:

- the source word list and the generated index may be copied, modified and
  redistributed **only** under GPL-2.0, and this notice and `COPYING` must travel
  with them;
- the generated index shipped to browsers
  (`public/dictionary/bn.txt`, see below) is a derived work of this file and
  carries the same licence and the same attribution requirement;
- if that is not acceptable, built-in mode still works: delete
  `content/dictionary/`, stop generating the index, delete the served copy, and
  the engine falls back to its rules alone. Nothing else in the project depends
  on this directory. See *Removing it* at the end of this notice.

## What is derived from it

Nothing in this directory is modified by the build. The derivation happens in
`scripts/build-dictionary.ts`, which writes the index the engine reads:

1. every line is normalized to NFC;
2. the Hunspell affix flags after a `/` are dropped, and the count line and the
   lines that are a single combining mark are skipped (`bn_BD.aff` is not used,
   so inflected forms it would generate are not added — only the base entries
   the `.dic` lists are);
3. a word the grammar cannot spell is dropped (`isTypeable`);
4. a spelling whose rule output is already a word in this list is dropped,
   because overriding it would be a guess with no frequency data behind it;
5. what is left — spellings the rules get wrong — is serialized as the index.

## Removing it

Run `bun scripts/build-dictionary.ts --out /dev/null` to see the pipeline still
work without shipping anything, then delete `content/dictionary/`,
`public/dictionary/`, and the `--out` half of the `build` script in
`package.json`. The loader in `src/engine/input/dictionarySource.ts` treats a
failed fetch as "no word list" and the engine returns to its rules.
