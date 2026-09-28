import { useEffect, useRef, useState } from "preact/hooks";

import { practiceTexts } from "../content/texts";
import { collectMistakes, renderProgress, type ClusterState, type WordStatus } from "../engine/compare";
import { createPhoneticEngine } from "../engine/input/phonetic";
import { createSystemEngine } from "../engine/input/system";
import type { EngineAction, InputEngine, InputEngineId } from "../engine/input/types";
import { formatDuration } from "../engine/metrics";
import {
  createSession,
  reduce,
  sessionStats,
  type SessionEvent,
  type SessionState,
} from "../engine/session";
import {
  createRng,
  pickText,
  wordsOf,
  type Difficulty,
  type PracticeText,
} from "../engine/text/provider";
import { useTranslations, type Lang } from "../i18n";
import { loadAndApplySettings, onSettingsChange } from "../lib/applySettings";
import {
  clearCustomText,
  customPracticeText,
  loadCustomText,
  saveCustomText,
  type StoredCustomText,
} from "../lib/customText";
import {
  loadLessonProgress,
  newRunId,
  recordLessonResult,
  recordRun,
  type LessonProgress,
} from "../lib/progress";
import { defaultSettings } from "../lib/settings";
import CustomText from "./CustomText";

/** Everything the runner needs for one lesson, resolved at build time. */
export interface LessonRun {
  id: string;
  title: string;
  passAccuracy: number;
  texts: PracticeText[];
}

interface Props {
  lang: Lang;
  /** Fixed seed keeps the first text identical on the server and after hydration. */
  seed?: number;
  /** Lesson mode: a fixed drill set with a pass criterion instead of a timed test. */
  lesson?: LessonRun;
}

interface RunModel {
  text: PracticeText;
  durationMs: number | null;
  session: SessionState;
  history: readonly string[];
}

const DURATIONS: readonly (number | null)[] = [null, 60_000, 180_000, 300_000];
const HISTORY_LIMIT = 6;

function createEngine(mode: InputEngineId): InputEngine {
  return mode === "avro-phonetic" ? createPhoneticEngine() : createSystemEngine();
}

function createRun(options: {
  pool: readonly PracticeText[];
  durationMs: number | null;
  seed: number;
  history?: readonly string[];
  difficulty?: Difficulty | "all";
}): RunModel {
  const { pool, durationMs, seed, history = [], difficulty = "all" } = options;
  const text = pickText(pool, { difficulty, exclude: [...history], rng: createRng(seed) }) ?? pool[0];

  return {
    text,
    durationMs,
    session: createSession({ targetWords: wordsOf(text), durationMs }),
    history: [...history, text.id].slice(-HISTORY_LIMIT),
  };
}

function clusterClass(state: ClusterState, isNext: boolean): string {
  const caret = isNext ? " border-s-2 border-s-accent ps-0.5" : "";

  switch (state) {
    case "correct":
      // Typed text is the page's foreground colour: nothing glows, it simply
      // steps out of the dim untyped field — the monkeytype convention.
      return `text-text${caret}`;
    case "wrong":
      return `text-wrong underline decoration-wrong decoration-2 underline-offset-4${caret}`;
    case "extra":
      return `text-wrong/80${caret}`;
    default:
      return `text-pending${caret}`;
  }
}

function wordClass(status: WordStatus): string {
  switch (status) {
    case "correct":
      return "opacity-70";
    case "active":
      return "rounded-control bg-accent-soft";
    default:
      return "";
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div class="flex min-w-[4.5rem] flex-col">
      <span class="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span class="text-lg font-semibold tabular-nums leading-tight text-text">{value}</span>
    </div>
  );
}

export default function Practice({ lang, seed = 1, lesson }: Props) {
  const t = useTranslations(lang);

  const [customSaved, setCustomSaved] = useState<StoredCustomText | null>(null);
  const [customRun, setCustomRun] = useState<PracticeText | null>(null);
  const [customPanelOpen, setCustomPanelOpen] = useState(false);
  const [customStorageOk, setCustomStorageOk] = useState(true);

  // A lesson drills a fixed set, untimed, and a custom run drills exactly the
  // text the user pasted. On the practice page the first text is deliberately an
  // easy one: a beginner should not meet a conjunct-heavy sentence in the first
  // five seconds.
  const pool = lesson?.texts ?? (customRun !== null ? [customRun] : practiceTexts);

  const [model, setModel] = useState<RunModel>(() =>
    createRun({ pool, durationMs: null, seed, difficulty: lesson === undefined ? "easy" : "all" }),
  );
  const [now, setNow] = useState(0);
  const [mode, setMode] = useState<InputEngineId>(defaultSettings.inputMode);
  const [osKeyboard, setOsKeyboard] = useState(false);
  const [lessonRecord, setLessonRecord] = useState<LessonProgress | null>(null);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const engineRef = useRef<InputEngine>(createEngine(defaultSettings.inputMode));

  // Apply the stored theme, text size and input mode as soon as the island is up.
  useEffect(() => {
    const stored = loadAndApplySettings();
    setMode(stored.inputMode);
    engineRef.current = createEngine(stored.inputMode);
  }, []);

  // The settings drawer can change the input mode while a run is on screen.
  useEffect(
    () =>
      onSettingsChange((settings) => {
        setMode((current) => {
          if (current === settings.inputMode) return current;
          engineRef.current = createEngine(settings.inputMode);
          setOsKeyboard(false);
          setModel((run) => ({
            ...run,
            session: reduce(run.session, { type: "restart", at: Date.now() }),
          }));
          return settings.inputMode;
        });
      }),
    [],
  );

  const apply = (event: SessionEvent) => {
    setModel((current) => ({ ...current, session: reduce(current.session, event) }));
    if ("at" in event) setNow(event.at);
  };

  const restart = () => {
    engineRef.current.reset();
    setOsKeyboard(false);
    setModel((current) => ({
      ...current,
      session: reduce(current.session, { type: "restart", at: Date.now() }),
    }));
  };

  const nextText = () => {
    engineRef.current.reset();
    setOsKeyboard(false);
    setModel((current) =>
      createRun({
        pool,
        durationMs: current.durationMs,
        seed: Date.now() % 0x7fff_ffff,
        history: current.history,
      }),
    );
  };

  const chooseDuration = (durationMs: number | null) => {
    engineRef.current.reset();
    setOsKeyboard(false);
    setModel((current) =>
      createRun({
        pool,
        durationMs,
        seed: Date.now() % 0x7fff_ffff,
        history: current.history,
      }),
    );
  };

  //
  // Custom text (Section 4.8). Starting one stores the paste, switches the pool
  // to it and starts a fresh untimed run - a pasted passage is a fixed target,
  // and a timer on it would only cut the user off before the end.
  const startCustomRun = (text: string) => {
    const item = customPracticeText(text);

    setCustomRun(item);
    setCustomSaved({ text: item.text, savedAt: Date.now() });
    setCustomStorageOk(saveCustomText(text) !== null);
    setCustomPanelOpen(false);
    engineRef.current.reset();
    setOsKeyboard(false);
    setModel(
      createRun({
        pool: [item],
        durationMs: null,
        seed: Date.now() % 0x7fff_ffff,
        difficulty: "all",
      }),
    );
  };

  const useBuiltinTexts = () => {
    setCustomRun(null);
    engineRef.current.reset();
    setOsKeyboard(false);
    setModel(
      createRun({
        pool: practiceTexts,
        durationMs: null,
        seed: Date.now() % 0x7fff_ffff,
        history: [],
      }),
    );
  };

  /** Forget the stored paste, and stop practising it if it was on screen. */
  const dropCustomText = () => {
    clearCustomText();
    setCustomSaved(null);
    setCustomStorageOk(true);
    if (customRun !== null) useBuiltinTexts();
  };

  // The best result for this lesson so far, read once on mount.
  useEffect(() => {
    if (lesson === undefined) return;
    setLessonRecord(loadLessonProgress()[lesson.id] ?? null);
  }, [lesson]);

  // The text this browser kept from an earlier paste, if any. Read after mount,
  // never during it, so the first paint matches what the server rendered.
  useEffect(() => {
    setCustomSaved(loadCustomText());
  }, []);

  // One listener for the whole document: the first keystroke anywhere starts the
  // run, so there is nothing to click before the first word.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (document.documentElement.hasAttribute("data-tk-drawer")) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, button, a[href], [contenteditable='true']")) return;
      if (target?.matches("textarea:not([data-tk-input])")) return;

      if (event.key === "Escape") {
        event.preventDefault();
        restart();
        return;
      }

      const action: EngineAction = engineRef.current.translate({
        key: event.key,
        code: event.code,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        isComposing: event.isComposing,
      });

      const at = Date.now();

      switch (action.type) {
        case "append":
          event.preventDefault();
          apply({ type: "input", text: action.text, at });
          break;
        case "compose":
          event.preventDefault();
          apply({ type: "compose", text: action.text, composing: action.composing, at });
          break;
        case "backspace":
          event.preventDefault();
          apply({ type: "backspace", at });
          break;
        case "commit":
          event.preventDefault();
          apply({ type: "commit", at });
          break;
        case "ignore":
          // A Bangla character arrived from an installed keyboard while the
          // built-in engine was on: say so instead of dropping it silently.
          if (action.reason === "wrong-script") setOsKeyboard(true);
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // The tick drives the clock display and ends a timed run.
  useEffect(() => {
    if (model.session.state !== "running") return;

    const id = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      setModel((current) => ({ ...current, session: reduce(current.session, { type: "tick", at }) }));
    }, 250);

    return () => window.clearInterval(id);
  }, [model.session.state]);

  const { session } = model;
  const finished = session.state === "finished";
  const stats = sessionStats(session, now);
  const view = renderProgress(session.target, session.committed, session.active);
  const mistakes = finished ? collectMistakes(session.committed, session.target) : [];
  const timed = model.durationMs !== null;
  const countdown = timed ? Math.max(0, (model.durationMs ?? 0) - stats.elapsedMs) : 0;

  // A finished run is recorded exactly once: the key is the run's own identity, so
  // later re-renders (a resize, a settings broadcast) cannot double-count it.
  const recordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (session.state !== "finished") return;

    const key = `${session.startedAt ?? 0}:${session.finishedAt ?? 0}:${model.text.id}`;
    if (recordedRef.current === key) return;
    recordedRef.current = key;

    recordRun(
      {
        id: newRunId(),
        ts: session.finishedAt ?? Date.now(),
        mode,
        textId: model.text.id,
        wpm: stats.wpm,
        kpm: stats.kpm,
        accuracy: stats.accuracy,
        // Time actually spent typing, which is what the results screen shows.
        durationMs: Math.round(stats.elapsedMs),
        errors: collectMistakes(session.committed, session.target).map((mistake) => ({
          expected: mistake.expected ?? "",
          typed: mistake.actual ?? "",
        })),
      },
      session.committed,
    );

    if (lesson !== undefined) {
      const passed = stats.accuracy >= lesson.passAccuracy;
      recordLessonResult(lesson.id, {
        accuracy: stats.accuracy,
        wpm: stats.wpm,
        passed,
        at: session.finishedAt ?? Date.now(),
      });
      setLessonRecord(loadLessonProgress()[lesson.id] ?? null);
    }
  }, [
    session.state,
    session.startedAt,
    session.finishedAt,
    model.text.id,
    mode,
    lesson,
  ]);

  const focusInput = () => inputRef.current?.focus();

  const summary = finished
    ? `${t("results.wpm")} ${stats.wpm}, ${t("results.accuracy")} ${stats.accuracy}%, ${t(
        "results.time",
      )} ${formatDuration(stats.elapsedMs)}`
    : "";

  return (
    <div>
      {/* Toolbar: quiet, centred, one row. */}
      <div class="flex flex-wrap items-center justify-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
          <span class="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          {mode === "avro-phonetic" ? t("practice.mode.builtin") : t("practice.mode.system")}
          {mode === "avro-phonetic" && (
            <span class="rounded-pill bg-surface-2 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide">
              {t("practice.mode.preview")}
            </span>
          )}
        </span>

        {lesson !== undefined && (
          <>
            <span class="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
              {t("lesson.criterion")}
              <span class="tabular-nums text-text">{lesson.passAccuracy}%</span>
            </span>

            {lessonRecord !== null && (
              <span class="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
                {t("lesson.bestAccuracy")}
                <span class="tabular-nums text-text">{lessonRecord.bestAccuracy}%</span>
              </span>
            )}
          </>
        )}

        {lesson === undefined && customRun === null && (
          <div
            role="group"
            aria-label={t("practice.time")}
            class="inline-flex items-center rounded-pill border border-border bg-surface p-0.5"
          >
            {DURATIONS.map((duration) => (
              <button
                key={String(duration)}
                type="button"
                aria-pressed={model.durationMs === duration}
                onClick={() => chooseDuration(duration)}
                class={`rounded-pill px-2.5 py-1 text-xs font-medium transition-colors duration-150 ease-out ${
                  model.durationMs === duration
                    ? "bg-accent text-on-accent"
                    : "text-muted hover:text-text"
                }`}
              >
                {duration === null ? "∞" : `${duration / 60_000}m`}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={restart}
          class="rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-150 ease-out hover:text-text"
        >
          {t("practice.restart")}
        </button>

        {customRun === null && (
          <button
            type="button"
            onClick={nextText}
            class="rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-150 ease-out hover:text-text"
          >
            {lesson === undefined ? t("practice.nextText") : t("lesson.nextDrill")}
          </button>
        )}

        {lesson === undefined && (
          <>
            {customRun !== null && (
              <span class="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
                <span class="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                {t("custom.active")}
              </span>
            )}

            {customRun !== null && (
              <button
                type="button"
                onClick={useBuiltinTexts}
                class="rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-150 ease-out hover:text-text"
              >
                {t("custom.useBuiltin")}
              </button>
            )}

            <button
              type="button"
              onClick={() => setCustomPanelOpen((open) => !open)}
              aria-expanded={customPanelOpen}
              aria-controls="custom-text-panel"
              class="rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-150 ease-out hover:text-text"
            >
              {t("custom.open")}
            </button>
          </>
        )}
      </div>

      {/* Custom text setup (Section 5.2.5): paste, validate, practise. */}
      {lesson === undefined && customPanelOpen && (
        <CustomText
          lang={lang}
          saved={customSaved}
          active={customRun !== null}
          storageOk={customStorageOk}
          onStart={startCustomRun}
          onUseBuiltin={useBuiltinTexts}
          onClear={dropCustomText}
          onClose={() => setCustomPanelOpen(false)}
        />
      )}

      {/* Typing area: borderless, monkeytype-style — the words are the UI. */}
      <div
        class="relative mt-6 rounded-card transition-colors duration-150 ease-out focus-within:outline-none"
        onClick={focusInput}
      >
        <div
          lang="bn"
          role="group"
          aria-label={t("practice.typingArea")}
          class="typing-text flex select-none flex-wrap content-start gap-x-[0.55em] gap-y-2 px-5 py-6 sm:px-7 sm:py-8"
        >
          {view.words.map((word, wordIndex) => {
            const nextCluster = word.status === "active"
              ? word.clusters.findIndex((cluster) => cluster.state !== "correct")
              : -1;

            return (
              <span key={wordIndex} class={`inline-flex ${wordClass(word.status)}`}>
                {word.clusters.map((cluster, clusterIndex) => (
                  <span
                    key={clusterIndex}
                    class={clusterClass(cluster.state, clusterIndex === nextCluster)}
                  >
                    {cluster.target}
                  </span>
                ))}
                {word.extra.map((cluster, extraIndex) => (
                  <span key={`extra-${extraIndex}`} class={clusterClass("extra", false)}>
                    {cluster}
                  </span>
                ))}
              </span>
            );
          })}
        </div>

        <textarea
          ref={inputRef}
          data-tk-input
          aria-label={t("practice.typingArea")}
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck={false}
          onPaste={(event) => event.preventDefault()}
          onCompositionStart={() => setOsKeyboard(true)}
          onCompositionUpdate={() => setOsKeyboard(true)}
          class="absolute inset-0 h-full w-full cursor-text resize-none border-0 bg-transparent p-0 text-transparent caret-transparent outline-none"
        />
      </div>

      {/* Built-in mode: the Roman keystrokes behind the current word (Section 5.3) */}
      {mode === "avro-phonetic" && session.composing.length > 0 && (
        <p class="mt-3 text-sm text-muted">
          <span class="sr-only">{t("practice.composingLabel")}: </span>
          <span class="font-mono text-accent">{session.composing}</span>
          <span aria-hidden="true"> → </span>
          <span lang="bn" class="font-bangla text-text">{session.active}</span>
        </p>
      )}

      {session.state === "idle" && (
        <p class="mt-3 text-sm text-muted">{t("practice.startHint")}</p>
      )}

      {session.warning === "latin" && (
        <p
          role="status"
          class="mt-3 rounded-card border border-accent-2/40 bg-surface-2 px-4 py-2.5 text-sm text-text"
        >
          {t("practice.latinWarning")}
        </p>
      )}

      {osKeyboard && mode === "avro-phonetic" && (
        <p
          role="status"
          class="mt-3 rounded-card border border-accent-2/40 bg-surface-2 px-4 py-2.5 text-sm text-text"
        >
          {t("practice.osKeyboardOn")}
        </p>
      )}

      {/* Live stats */}
      <div class="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-border pt-5">
        <Stat label={t("practice.wpm")} value={String(stats.wpm)} />
        <Stat
          label={t("practice.accuracy")}
          value={stats.targetClusters > 0 ? `${stats.accuracy}%` : "—"}
        />
        <Stat
          label={t("practice.time")}
          value={formatDuration(timed ? countdown : stats.elapsedMs)}
        />
        <Stat label={t("practice.kpm")} value={String(stats.kpm)} />
        <Stat
          label={t("results.correct")}
          value={`${stats.correctWords}/${session.target.length}`}
        />
      </div>

      <p aria-live="polite" class="sr-only">
        {summary}
      </p>

      {/* Results */}
      {finished && (
        <section
          aria-labelledby="results-heading"
          class="mt-6 rounded-card border border-border bg-surface p-6"
        >
          <h3 id="results-heading" class="text-sm font-semibold uppercase tracking-wide text-muted">
            {t("results.heading")}
          </h3>

          {lesson !== undefined && (
            <p
              role="status"
              class={`mt-3 rounded-card border px-4 py-2.5 text-sm font-medium text-text ${
                stats.accuracy >= lesson.passAccuracy
                  ? "border-accent/40 bg-accent-soft"
                  : "border-accent-2/40 bg-surface-2"
              }`}
            >
              {stats.accuracy >= lesson.passAccuracy ? t("lesson.passed") : t("lesson.failed")}
            </p>
          )}

          <div class="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <div class="text-5xl font-semibold tabular-nums leading-none text-accent">
                {stats.wpm}
              </div>
              <div class="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
                {t("results.wpm")}
              </div>
            </div>
            <Stat label={t("results.accuracy")} value={`${stats.accuracy}%`} />
            <Stat label={t("results.time")} value={formatDuration(stats.elapsedMs)} />
            <Stat label={t("results.kpm")} value={String(stats.kpm)} />
            <Stat
              label={t("results.words")}
              value={`${stats.correctWords} ${t("results.correct").toLowerCase()} · ${stats.incorrectWords} ${t(
                "results.incorrect",
              ).toLowerCase()}`}
            />
            <Stat label={t("results.corrected")} value={String(stats.correctedMistakes)} />
          </div>

          <div class="mt-5 border-t border-border pt-4">
            <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("results.mistakes")}
            </h4>
            {mistakes.length === 0 ? (
              <p class="mt-2 text-sm text-muted">{t("results.noMistakes")}</p>
            ) : (
              <ul class="mt-2 grid gap-2">
                {mistakes.slice(0, 8).map((mistake) => (
                  <li
                    key={mistake.wordIndex}
                    class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                  >
                    <span lang="bn" class="font-bangla text-xs text-muted">
                      {mistake.target}
                    </span>
                    <span class="text-xs text-muted">
                      {t("results.expected")}{" "}
                      <span lang="bn" class="font-bangla font-medium text-correct">
                        {mistake.expected ?? "—"}
                      </span>
                    </span>
                    <span class="text-xs text-muted">
                      {t("results.typed")}{" "}
                      <span lang="bn" class="font-bangla font-medium text-wrong">
                        {mistake.actual ?? "—"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p class="mt-4 text-xs leading-relaxed text-muted">
            {t("results.definitionWpm")} {t("results.definitionAccuracy")}
          </p>

          <div class="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={restart}
              class="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-opacity duration-150 ease-out hover:opacity-90"
            >
              {t("results.retry")}
            </button>
            {customRun === null ? (
              <button
                type="button"
                onClick={nextText}
                class="rounded-control border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface-2"
              >
                {lesson === undefined ? t("results.newText") : t("lesson.nextDrill")}
              </button>
            ) : (
              <button
                type="button"
                onClick={useBuiltinTexts}
                class="rounded-control border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface-2"
              >
                {t("custom.useBuiltin")}
              </button>
            )}
          </div>
        </section>
      )}

      <p class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          <kbd class="keycap">Esc</kbd> {t("practice.restart")}
        </span>
        <span>{t("practice.offlineNote")}</span>
      </p>
    </div>
  );
}
