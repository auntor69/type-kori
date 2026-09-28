import { useMemo, useState } from "preact/hooks";

import { useTranslations, type Lang } from "../i18n";
import {
  CUSTOM_MAX_CHARS,
  CUSTOM_MIN_CHARS,
  checkCustomText,
  type CustomProblem,
  type StoredCustomText,
} from "../lib/customText";

interface Props {
  lang: Lang;
  /** The text already stored in this browser, if any. */
  saved: StoredCustomText | null;
  /** True while a run of the custom text is on screen. */
  active: boolean;
  /** False when the last write was refused (private mode, quota, policy). */
  storageOk: boolean;
  onStart: (text: string) => void;
  onUseBuiltin: () => void;
  onClear: () => void;
  onClose: () => void;
}

const FIELD_CLASS =
  "font-bangla w-full resize-y rounded-control border border-border bg-bg p-3 text-sm leading-relaxed text-text outline-none transition-colors duration-150 ease-out focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent";

/**
 * The paste-and-practise panel (Section 5.2.5).
 *
 * It is a plain form over the validators in `src/lib/customText.ts`: the pasted
 * text is cleaned and checked on every keystroke, the numbers are shown against
 * the limits, and the run cannot start until the text passes. Paste is allowed
 * here and nowhere else (Section 7.3.10) - the typing area still blocks it.
 */
export default function CustomText({
  lang,
  saved,
  active,
  storageOk,
  onStart,
  onUseBuiltin,
  onClear,
  onClose,
}: Props) {
  const t = useTranslations(lang);
  const [draft, setDraft] = useState(saved?.text ?? "");

  const check = useMemo(() => checkCustomText(draft), [draft]);
  const problem: CustomProblem | undefined = check.problems[0];

  return (
    <section
      id="custom-text-panel"
      aria-labelledby="custom-text-heading"
      class="mt-4 rounded-card border border-border bg-surface p-5 shadow-[var(--shadow-soft)]"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="max-w-2xl">
          <h3 id="custom-text-heading" class="font-bangla text-base font-semibold text-text">
            {t("custom.heading")}
          </h3>
          <p class="font-bangla mt-1 text-sm leading-relaxed text-muted">{t("custom.lead")}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          class="rounded-pill border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-150 ease-out hover:text-text"
        >
          {t("custom.close")}
        </button>
      </div>

      {active && (
        <p
          role="status"
          class="mt-4 rounded-control border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-medium text-text"
        >
          {t("custom.active")}
        </p>
      )}

      {!storageOk && (
        <p
          role="status"
          class="mt-4 rounded-control border border-accent-2/40 bg-surface-2 px-4 py-2 text-sm text-text"
        >
          {t("custom.storageUnavailable")}
        </p>
      )}

      {!active && saved !== null && storageOk && (
        <p class="mt-4 text-xs text-muted">{t("custom.saved")}</p>
      )}

      <form
        class="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (check.ok) onStart(check.text);
        }}
      >
        <label class="sr-only" for="custom-text-input">
          {t("custom.textareaLabel")}
        </label>
        <textarea
          id="custom-text-input"
          lang="bn"
          dir="auto"
          rows={5}
          value={draft}
          placeholder={t("custom.placeholder")}
          spellcheck={false}
          autocomplete="off"
          autocapitalize="off"
          aria-describedby="custom-text-status"
          aria-invalid={!check.ok && draft.length > 0}
          onInput={(event) => setDraft(event.currentTarget.value)}
          class={FIELD_CLASS}
        />

        <div
          id="custom-text-status"
          class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted"
        >
          <span class="tabular-nums">
            {check.words} {t("custom.wordsLabel")}
          </span>
          <span class="tabular-nums">
            {check.chars} {t("custom.charsLabel")}
          </span>
          <span class="tabular-nums">
            {t("custom.limitLabel")}: {CUSTOM_MIN_CHARS}–{CUSTOM_MAX_CHARS} {t("custom.charsLabel")}
          </span>
        </div>

        {problem !== undefined && problem !== "empty" && (
          <p class="mt-2 text-xs text-wrong">{t(`custom.error.${problem}`)}</p>
        )}

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!check.ok}
            class="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-opacity duration-150 ease-out hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("custom.start")}
          </button>

          <button
            type="button"
            onClick={() => {
              setDraft("");
              onClear();
            }}
            class="rounded-control border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface-2"
          >
            {t("custom.clear")}
          </button>

          {active && (
            <button
              type="button"
              onClick={onUseBuiltin}
              class="rounded-control border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface-2"
            >
              {t("custom.useBuiltin")}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
