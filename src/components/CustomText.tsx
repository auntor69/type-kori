import { useMemo, useState } from "preact/hooks";

import { useTranslations, type Lang } from "../i18n";
import {
  CUSTOM_DURATION_OPTIONS,
  CUSTOM_LIBRARY_MAX,
  CUSTOM_MAX_CHARS,
  CUSTOM_MIN_CHARS,
  CUSTOM_NAME_MAX,
  CUSTOM_NUMERALS,
  CUSTOM_WORD_OPTIONS,
  activeCustomItem,
  checkCustomText,
  countDigits,
  countWords,
  customRunOptions,
  normalizeName,
  repairDigits,
  suggestName,
  type CustomLibrary,
  type CustomNumerals,
  type CustomProblem,
  type CustomRunOptions,
} from "../lib/customText";

interface Props {
  lang: Lang;
  /** Everything this browser has saved, newest first. */
  library: CustomLibrary;
  /** True while a run of a custom text is on screen. */
  active: boolean;
  /** False when the last write was refused (private mode, quota, policy). */
  storageOk: boolean;
  /** Start a run. The name goes along, so starting a paste also names it. */
  onStart: (text: string, options: CustomRunOptions, name: string) => void;
  /** Save without starting. Returns false when the library is full. */
  onSave: (name: string, text: string) => boolean;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onUseBuiltin: () => void;
  onClose: () => void;
}

const FIELD_CLASS =
  "w-full resize-y rounded-control border border-border bg-bg p-3 text-sm leading-relaxed text-text outline-none transition-colors duration-150 ease-out focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent";

const NAME_CLASS =
  "w-full rounded-control border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors duration-150 ease-out focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent";

const CHIP_BASE = "rounded-pill px-2.5 py-1 text-xs font-medium transition-colors duration-150 ease-out";
const CHIP_ON = `${CHIP_BASE} bg-accent text-on-accent`;
const CHIP_OFF = `${CHIP_BASE} text-muted hover:text-text`;

const BUTTON_BASE = "rounded-control px-4 py-2 text-sm transition-colors duration-150 ease-out";
const PRIMARY_BUTTON = `${BUTTON_BASE} bg-accent font-semibold text-on-accent hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`;
const SECONDARY_BUTTON = `${BUTTON_BASE} border border-border bg-surface font-medium text-text hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50`;

/**
 * The paste-and-practise panel (Section 5.2.5).
 *
 * It is a plain form over the validators in `src/lib/customText.ts`. Three things
 * it does beyond the obvious:
 *
 *   - a paste can be **named and kept**, so a term's worth of exam questions
 *     lives in a list instead of one slot that the next paste overwrites;
 *   - its **numerals can be repaired** into Bengali or Western digits. The target
 *     is what the app scores against, so a passage whose numerals are not the
 *     ones the learner's keyboard produces can never be typed correctly, however
 *     careful they are;
 *   - the run can be **bounded** by a timer or a word goal, or left to run to the
 *     end of the passage. A paste is a fixed target, so this is the only thing
 *     that makes it raceable.
 *
 * Paste is allowed here and nowhere else (Section 7.3.10) — the typing area still
 * blocks it.
 */
export default function CustomText({
  lang,
  library,
  active,
  storageOk,
  onStart,
  onSave,
  onDelete,
  onClearAll,
  onUseBuiltin,
  onClose,
}: Props) {
  const t = useTranslations(lang);

  // The panel opens on whatever the learner last used, which is what they asked
  // for by reopening it.
  const initial = activeCustomItem(library) ?? library.items[0] ?? null;
  const [name, setName] = useState(initial?.name ?? "");
  const [draft, setDraft] = useState(initial?.text ?? "");
  const [numerals, setNumerals] = useState<CustomNumerals>("keep");
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [wordGoal, setWordGoal] = useState<number | null>(null);
  const [notice, setNotice] = useState<"saved" | "full" | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { dateStyle: "short" }),
    [lang],
  );

  const check = useMemo(() => checkCustomText(draft), [draft]);
  const problem: CustomProblem | undefined = check.problems[0];
  // The repaired text is the target the run scores against, so validation runs on
  // the cleaned text and the repair is applied last: repairing first would let a
  // hand-edited numeral sneak past the checks.
  const target = useMemo(() => repairDigits(check.text, numerals), [check.text, numerals]);
  const digitCounts = useMemo(() => countDigits(check.text), [check.text]);

  const openItem = (id: string) => {
    const item = library.items.find((candidate) => candidate.id === id);
    if (item === undefined) return;
    setName(item.name);
    setDraft(item.text);
    setNotice(null);
  };

  return (
    <section
      id="custom-text-panel"
      aria-labelledby="custom-text-heading"
      class="mt-4 rounded-card border border-border bg-surface p-5"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="max-w-2xl">
          <h3 id="custom-text-heading" class="font-bangla text-base font-semibold text-text">
            {t("custom.heading")}
          </h3>
          <p class="font-bangla mt-1 text-sm leading-relaxed text-muted">{t("custom.lead")}</p>
        </div>

        <button type="button" onClick={onClose} class={SECONDARY_BUTTON}>
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

      <form
        class="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!check.ok) return;
          onStart(
            target,
            customRunOptions({ durationSeconds, wordGoal }),
            normalizeName(name, suggestName(check.text)),
          );
        }}
      >
        <label class="block text-xs font-medium uppercase tracking-wide text-muted" for="custom-text-name">
          {t("custom.nameLabel")}
        </label>
        <input
          id="custom-text-name"
          type="text"
          class={`mt-1.5 ${NAME_CLASS}`}
          value={name}
          placeholder={t("custom.namePlaceholder")}
          maxLength={CUSTOM_NAME_MAX}
          autocomplete="off"
          spellcheck={false}
          onInput={(event) => setName(event.currentTarget.value)}
        />

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
          onInput={(event) => {
            setDraft(event.currentTarget.value);
            setNotice(null);
          }}
          class={`font-bangla mt-3 ${FIELD_CLASS}`}
        />

        <div id="custom-text-status" class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span class="tabular-nums">
            {check.words} {t("custom.wordsLabel")}
          </span>
          <span class="tabular-nums">
            {check.chars} {t("custom.charsLabel")}
          </span>
          <span class="tabular-nums">
            {t("custom.limitLabel")}: {CUSTOM_MIN_CHARS}–{CUSTOM_MAX_CHARS} {t("custom.charsLabel")}
          </span>
          {(digitCounts.ascii > 0 || digitCounts.bengali > 0) && (
            <>
              <span class="tabular-nums">
                {t("custom.asciiDigits")}: {digitCounts.ascii}
              </span>
              <span class="tabular-nums">
                {t("custom.bengaliDigits")}: {digitCounts.bengali}
              </span>
            </>
          )}
        </div>

        {problem !== undefined && problem !== "empty" && (
          <p class="mt-2 text-xs text-wrong">{t(`custom.error.${problem}`)}</p>
        )}

        {/* Numerals: the target has to match what the keyboard produces, so the
            learner picks the system their own keyboard emits. */}
        <fieldset class="mt-5 rounded-control border border-border p-3">
          <legend class="px-1 text-xs font-medium uppercase tracking-wide text-muted">
            {t("custom.numerals")}
          </legend>
          <div class="flex flex-wrap gap-1.5">
            {CUSTOM_NUMERALS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={numerals === option}
                onClick={() => setNumerals(option)}
                class={numerals === option ? CHIP_ON : CHIP_OFF}
              >
                {t(`custom.numerals.${option}`)}
              </button>
            ))}
          </div>
          <p class="mt-2 text-xs leading-relaxed text-muted">{t("custom.numeralsHint")}</p>
        </fieldset>

        {/* Run length. A paste is one fixed target, so without this it can only
            ever be an untimed run to the end. */}
        <fieldset class="mt-4 rounded-control border border-border p-3">
          <legend class="px-1 text-xs font-medium uppercase tracking-wide text-muted">
            {t("custom.goal")}
          </legend>
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-pressed={durationSeconds === null && wordGoal === null}
              onClick={() => {
                setDurationSeconds(null);
                setWordGoal(null);
              }}
              class={durationSeconds === null && wordGoal === null ? CHIP_ON : CHIP_OFF}
            >
              {t("custom.goal.full")}
            </button>

            <span class="ms-2 text-xs text-muted">{t("practice.time")}</span>
            {CUSTOM_DURATION_OPTIONS.map((seconds) => (
              <button
                key={`time-${seconds}`}
                type="button"
                aria-pressed={durationSeconds === seconds}
                onClick={() => {
                  setDurationSeconds(seconds);
                  setWordGoal(null);
                }}
                class={durationSeconds === seconds ? CHIP_ON : CHIP_OFF}
              >
                {seconds}s
              </button>
            ))}

            <span class="ms-2 text-xs text-muted">{t("practice.words")}</span>
            {CUSTOM_WORD_OPTIONS.map((goal) => (
              <button
                key={`words-${goal}`}
                type="button"
                aria-pressed={wordGoal === goal}
                onClick={() => {
                  setWordGoal(goal);
                  setDurationSeconds(null);
                }}
                class={wordGoal === goal ? CHIP_ON : CHIP_OFF}
              >
                {goal}
              </button>
            ))}
          </div>
        </fieldset>

        <div class="mt-4 flex flex-wrap gap-2">
          <button type="submit" disabled={!check.ok} class={PRIMARY_BUTTON}>
            {t("custom.start")}
          </button>

          <button
            type="button"
            disabled={!check.ok}
            onClick={() => {
              const stored = onSave(normalizeName(name, suggestName(check.text)), target);
              setNotice(stored ? "saved" : "full");
            }}
            class={SECONDARY_BUTTON}
          >
            {t("custom.save")}
          </button>

          <button
            type="button"
            onClick={() => {
              setDraft("");
              setName("");
              setNotice(null);
            }}
            class={SECONDARY_BUTTON}
          >
            {t("custom.clear")}
          </button>

          {active && (
            <button type="button" onClick={onUseBuiltin} class={SECONDARY_BUTTON}>
              {t("custom.useBuiltin")}
            </button>
          )}
        </div>

        <p role="status" class="mt-3 text-xs leading-relaxed text-muted">
          {notice === "saved" ? t("custom.saved") : notice === "full" ? t("custom.libraryFull") : t("custom.saveHint")}
        </p>
      </form>

      {/* The library: every paste this browser keeps, newest first. */}
      <section aria-labelledby="custom-library-heading" class="mt-6 border-t border-border pt-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h4 id="custom-library-heading" class="text-xs font-medium uppercase tracking-wide text-muted">
            {t("custom.library")} · {library.items.length}/{CUSTOM_LIBRARY_MAX}
          </h4>

          {library.items.length > 0 &&
            (confirmingClear ? (
              <span class="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmingClear(false);
                    setDraft("");
                    setName("");
                  }}
                  class="rounded-pill border border-accent-2 bg-accent-2/10 px-3 py-1.5 text-xs font-medium text-text transition-colors duration-150 ease-out hover:bg-accent-2/20"
                >
                  {t("custom.clearAllConfirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  class="rounded-pill border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-150 ease-out hover:text-text"
                >
                  {t("progress.cancel")}
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                class="rounded-pill border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-150 ease-out hover:text-text"
              >
                {t("custom.clearAll")}
              </button>
            ))}
        </div>

        {library.items.length === 0 ? (
          <p class="mt-2 text-sm leading-relaxed text-muted">{t("custom.libraryEmpty")}</p>
        ) : (
          <ul class="mt-3 grid gap-2">
            {library.items.map((item) => (
              <li
                key={item.id}
                class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border border-border bg-bg px-3 py-2"
              >
                <span class="font-bangla min-w-0 flex-1 truncate text-sm text-text">{item.name}</span>
                <span class="tabular-nums text-xs text-muted">
                  {countWords(item.text)} {t("custom.wordsLabel")}
                </span>
                <span class="text-xs text-muted">{dateFormat.format(item.savedAt)}</span>
                <span class="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openItem(item.id)}
                    class="rounded-pill border border-border px-3 py-1 text-xs font-medium text-text transition-colors duration-150 ease-out hover:bg-surface-2"
                  >
                    {t("custom.openItem")}
                  </button>
                  <button
                    type="button"
                    aria-label={`${t("custom.delete")}: ${item.name}`}
                    onClick={() => {
                      onDelete(item.id);
                      if (item.id === initial?.id) {
                        setDraft("");
                        setName("");
                      }
                    }}
                    class="rounded-pill border border-border px-3 py-1 text-xs font-medium text-muted transition-colors duration-150 ease-out hover:text-text"
                  >
                    {t("custom.delete")}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
