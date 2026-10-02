# Security Policy

## Scope

Type Kori is a **static website with no backend**. There is no server-side
code, no database, no account system and no telemetry. Everything the user
creates — run history, custom text, settings — lives in that browser's
`localStorage` and never leaves the device unless the user exports it as a
file themselves.

That shape keeps the attack surface small, and the policy below is written for
it.

## Supported versions

Only the latest commit on `main` is supported. The deployed site at
[typekori.vercel.app](https://typekori.vercel.app) tracks it.

## Reporting a vulnerability

Please do **not** open a public issue for anything you believe is
exploitable. Use GitHub's *Report a vulnerability* button on the Security tab
of this repository — it reaches the maintainer privately.

You will get an acknowledgement within a week and a fix (or a clear statement
of the plan) as soon as the diagnosis allows.

## What matters most here

- **The custom-text paste box.** It accepts arbitrary user text and renders it
  as the typing target. Anything that smuggles markup or script through it is
  a real bug — report it.
- **Data integrity, not confidentiality-by-hiding.** The export file is
  unencrypted JSON by design: it contains nothing secret. Import validation
  matters (malformed or hostile backup files must be rejected safely), so bugs
  in `src/lib/progress.ts` import paths are treated as security-relevant.
- **Supply chain.** The dependency set is deliberately small; a new runtime
  dependency needs a reason written down in `docs/DECISIONS.md`.

## What is out of scope

- Anything requiring a malicious browser extension, a compromised device, or
  physical access — those defeat localStorage by definition.
- "Issues" in third-party services the site does not call.
- Reports that only affect unsupported branches.
