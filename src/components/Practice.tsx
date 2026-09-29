import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { practiceTexts } from "../content/texts";
import { collectMistakes, renderProgress, type ClusterState, type WordStatus } from "../engine/compare";
import { createPhoneticEngine } from "../engine/input/phonetic";
import { createSystemEngine } from "../engine/input/system";
import type { EngineAction, InputEngine, InputEngineId } from "../engine/input/types";
import { formatDuration } from "../engine/metrics";
import { reduce, sessionStats, type SessionEvent } from "../engine/session";
import type { Difficulty, PracticeText } from "../engine/text/provider";
import { useTranslations, type Lang } from "../i18n";
import { loadAndApplySettings, onSettingsChange, updateSettings } from "../lib/applySettings";
import { onRunCommand, type RunCommand } from "../lib/commands";
import type { FunboxMode } from "../lib/funbox";
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
import {
  allowsBackspace,
  defaultSettings,
  type CaretStyle,
  type ConfidenceMode,
  type IndicateTypos,
  type QuickRestart,
  type Settings,
  type WordHistory,
} from "../lib/settings";
import { formatNumeral } from "../lib/numerals";
import { loadErrorMap } from "../lib/progress";
import {
  buildVocabulary,
  createRun,
  extendStream,
  HISTORY_LIMIT,
  STREAM_BUFFER,
  testTypeFor,
  type RunModel,
} from "../lib/run";
import { playSound } from "../lib/sound";
import { minimumFailure } from "../lib/thresholds";
import { buildWeakKeyText, topWeakKeys } from "../lib/weakKeys";
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

/** Time-mode chips in **seconds**, monkeytype-style. */
const TIME_CHIPS: readonly number[] = [15, 30, 60, 120];
const WORD_GOALS: readonly number[] = [10, 25, 50, 100];
const TEST_MODES = ["time", "words", "zen", "custom"] as const;
type TestMode = (typeof TEST_MODES)[number];
/** How many typed words the results screen lists back. */
const WORD_HISTORY_ROWS = 40;

function createEngine(mode: InputEngineId): InputEngine {
  return mode === "avro-phonetic" ? createPhoneticEngine() : createSystemEngine();
}

function clusterClass(
  state: ClusterState,
  isNext: boolean,
  blindMode: boolean,
  caretStyle: CaretStyle,
): string {
  const caret =
    isNext && caretStyle === "bar"
      ? " border-s-2 border-s-accent ps-0.5"
      : isNext && caretStyle === "underline"
        ? " border-b-2 border-accent"
        : "";

  // Blind mode: correctness is never coloured — raw speed only.
  if (blindMode) return `text-text${caret}`;

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

/** Count of usable weak keys, computed without allocating the ranked list twice. */
function topWeakKeyCount(errorMap: Readonly<Record<string, { missed: number; seen: number }>>): number {
  return topWeakKeys(errorMap).length;
}

export default function Practice({ lang, seed = 1, lesson }: Props) {
  const t = useTranslations(lang);

  const [customSaved, setCustomSaved] = useState<StoredCustomText | null>(null);
  const [customRun, setCustomRun] = useState<PracticeText | null>(null);
  const [customPanelOpen, setCustomPanelOpen] = useState(false);
  const [customStorageOk, setCustomStorageOk] = useState(true);
  const [blindMode, setBlindMode] = useState(false);
  const [liveWpm, setLiveWpm] = useState(true);
  const [caretStyle, setCaretStyle] = useState<CaretStyle>("bar");
  const [stopOnError, setStopOnError] = useState(false);
  const [stopOnErrorWord, setStopOnErrorWord] = useState(false);
  const [storedDifficulty, setStoredDifficulty] = useState<Difficulty | "all">("all");
  const [showAllLines, setShowAllLines] = useState(true);
  const [numerals, setNumerals] = useState<"latin" | "bengali">("latin");
  const [sound, setSound] = useState<"off" | "click" | "error" | "both">("off");
  const [wordGoal, setWordGoal] = useState<number | null>(null);
  const [weakDrill, setWeakDrill] = useState<PracticeText | null>(null);
  const [quickRestart, setQuickRestart] = useState<QuickRestart>("esc");
  const [confidenceMode, setConfidenceMode] = useState<ConfidenceMode>("off");
  const [indicateTypos, setIndicateTypos] = useState<IndicateTypos>("off");
  const [hideExtraLetters, setHideExtraLetters] = useState(false);
  const [minWpm, setMinWpm] = useState(0);
  const [minAccuracy, setMinAccuracy] = useState(0);
  const [wordHistory, setWordHistory] = useState<WordHistory>("off");
  const [focusMode, setFocusMode] = useState(false);
  const [capsLockWarning, setCapsLockWarning] = useState(true);
  const [soundVolume, setSoundVolume] = useState(defaultSettings.soundVolume);
  const [funbox, setFunbox] = useState<FunboxMode>("none");
  const [capsOn, setCapsOn] = useState(false);
  /** Why a run stopped early, if the minimum speed or accuracy cut it off. */
  const [failReason, setFailReason] = useState<"wpm" | "accuracy" | null>(null);

  // A lesson drills a fixed set, untimed, and a custom run drills exactly the
  // text the user pasted. On the practice page the first text is deliberately an
  // easy one: a beginner should not meet a conjunct-heavy sentence in the first
  // five seconds.
  const pool = lesson?.texts ?? (customRun !== null ? [customRun] : practiceTexts);
  const difficulty = lesson === undefined ? storedDifficulty : "all";
  // Only a free practice run streams. A lesson, a weak-key drill and a custom
  // paste are fixed texts by definition — the user chose those exact words.
  const infinite = lesson === undefined && customRun === null && weakDrill === null;
  const vocabulary = useMemo(() => buildVocabulary(difficulty), [difficulty]);
  // Funbox only twists a generated stream: a pasted text or a lesson drill is the
  // user's own target and is shown exactly as it was written.
  const activeFunbox: FunboxMode = infinite ? funbox : "none";

  const [model, setModel] = useState<RunModel>(() =>
    createRun({
      pool,
      durationMs: null,
      seed,
      difficulty: lesson === undefined ? "easy" : "all",
      infinite,
      vocabulary,
      funbox: "none",
    }),
  );
  const [now, setNow] = useState(0);
  const [mode, setInputMode] = useState<InputEngineId>(defaultSettings.inputMode);
  const [osKeyboard, setOsKeyboard] = useState(false);
  const [lessonRecord, setLessonRecord] = useState<LessonProgress | null>(null);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const engineRef = useRef<InputEngine>(createEngine(defaultSettings.inputMode));
  // The document-level key handler is mounted once, so it reads the run through
  // this ref instead of a stale closure.
  const modelRef = useRef<RunModel | null>(null);
  modelRef.current = model;

  // The key handler is bound once, so anything it reads must come through a ref:
  // a value captured from the first render would never see a settings change.
  const prefsRef = useRef({
    sound,
    soundVolume,
    quickRestart,
    confidenceMode,
    capsLockWarning,
  });
  prefsRef.current = { sound, soundVolume, quickRestart, confidenceMode, capsLockWarning };

  // Apply the stored theme, text size and input mode as soon as the island is up.
  // The stored funbox and difficulty are loaded into state; when either differs
  // from what the first run was built with, the rebuild effect below restarts
  // the run with them, so a stored choice is on screen without a click.
  useEffect(() => {
    const stored = loadAndApplySettings();
    settingsRef.current = stored;
    setInputMode(stored.inputMode);
    engineRef.current = createEngine(stored.inputMode);
    setBlindMode(stored.blindMode);
    setLiveWpm(stored.liveWpm);
    setCaretStyle(stored.caretStyle);
    setStopOnError(stored.stopOnError !== "off");
    setStopOnErrorWord(stored.stopOnError === "word");
    setStoredDifficulty(stored.difficulty);
    setShowAllLines(stored.showAllLines);
    setNumerals(stored.numerals);
    setSound(stored.sound);
    setSoundVolume(stored.soundVolume);
    setQuickRestart(stored.quickRestart);
    setConfidenceMode(stored.confidenceMode);
    setIndicateTypos(stored.indicateTypos);
    setHideExtraLetters(stored.hideExtraLetters);
    setMinWpm(stored.minWpm);
    setMinAccuracy(stored.minAccuracy);
    setWordHistory(stored.wordHistory);
    setFocusMode(stored.focusMode);
    setCapsLockWarning(stored.capsLockWarning);
    setFunbox(stored.funbox);
  }, []);

  // The settings drawer can change the input mode while a run is on screen.
  useEffect(
    () =>
      onSettingsChange((settings) => {
        settingsRef.current = settings;
        setInputMode((current) => {
          if (current === settings.inputMode) return current;
          engineRef.current = createEngine(settings.inputMode);
          setOsKeyboard(false);
          setModel((run) => ({
            ...run,
            session: reduce(run.session, { type: "restart", at: Date.now() }),
          }));
          return settings.inputMode;
        });
        setBlindMode(settings.blindMode);
        setLiveWpm(settings.liveWpm);
        setCaretStyle(settings.caretStyle);
        setStopOnError(settings.stopOnError !== "off");
        setStopOnErrorWord(settings.stopOnError === "word");
        setStoredDifficulty(settings.difficulty);
        setShowAllLines(settings.showAllLines);
        setNumerals(settings.numerals);
        setSound(settings.sound);
        setSoundVolume(settings.soundVolume);
        setQuickRestart(settings.quickRestart);
        setConfidenceMode(settings.confidenceMode);
        setIndicateTypos(settings.indicateTypos);
        setHideExtraLetters(settings.hideExtraLetters);
        setMinWpm(settings.minWpm);
        setMinAccuracy(settings.minAccuracy);
        setWordHistory(settings.wordHistory);
        setFocusMode(settings.focusMode);
        setCapsLockWarning(settings.capsLockWarning);
        setFunbox((current) => {
          if (current === settings.funbox) return current;
          // The rebuild effect below restarts the run with the new twist, so
          // the choice is visible immediately instead of on some later run.
          return settings.funbox;
        });
      }),
    [],
  );

  // The last full settings snapshot this island knows about, so a quick control
  // here can write a complete settings object without owning the whole schema.
  const settingsRef = useRef<Settings>(defaultSettings);

  // A difficulty or funbox change is visible immediately: the run on screen is
  // rebuilt from the new choice, the way monkeytype restarts when the test type
  // changes. Before this, difficulty only reached "Next text" — switching it
  // looked like nothing happened — and a stored funbox never loaded at all.
  // The first render is skipped (the deliberate easy first text survives) and a
  // custom paste, a lesson drill or a weak-key drill is left alone: those are
  // fixed targets by definition, and a funbox must never rewrite them.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!infinite) return;

    engineRef.current.reset();
    setOsKeyboard(false);
    setFailReason(null);
    setModel((current) =>
      createRun({
        pool,
        durationMs: current.durationMs,
        seed: Date.now() % 0x7fff_ffff,
        history: current.history,
        difficulty,
        stopOnError: stopOnErrorWord || stopOnError,
        wordGoal,
        infinite,
        vocabulary,
        funbox: activeFunbox,
      }),
    );
    // Only the difficulty and the funbox drive the rebuild; the other values are
    // read as they are in the render that scheduled this effect.
  }, [difficulty, activeFunbox]);

  const apply = (event: SessionEvent) => {
    setModel((current) => ({ ...current, session: reduce(current.session, event) }));
    if ("at" in event) setNow(event.at);
  };

  /** Feedback blips; computed from the event before the state lands. */
  const applyWithSound = (event: SessionEvent) => {
    const { sound: soundMode, soundVolume: volume } = prefsRef.current;
    if (soundMode === "click" || soundMode === "both") playSound("click", volume);

    if ((soundMode === "error" || soundMode === "both") && event.type === "commit") {
      const upcoming = reduce(model.session, event).committed.at(-1);
      if (upcoming !== undefined && upcoming.correct === false) playSound("error", volume);
    }

    apply(event);
  };

  const restart = () => {
    engineRef.current.reset();
    setOsKeyboard(false);
    setFailReason(null);
    setModel((current) => ({
      ...current,
      session: reduce(current.session, { type: "restart", at: Date.now() }),
    }));
  };

  /**
   * Build a fresh run from the built-in library. Every mode switch funnels
   * through here so no handler can inherit a stale pool: the closure of a
   * render that still had a custom paste (or a weak drill) on screen would
   * otherwise build the new run from the old target.
   */
  const startBuiltinRun = (options: { durationMs: number | null; wordGoal: number | null }) => {
    if (lesson !== undefined) return;

    const { durationMs, wordGoal: goal } = options;
    engineRef.current.reset();
    setOsKeyboard(false);
    setFailReason(null);
    setWeakDrill(null);
    setCustomRun(null);
    setCustomPanelOpen(false);
    setWordGoal(goal);
    setModel(
      createRun({
        pool: practiceTexts,
        durationMs,
        seed: Date.now() % 0x7fff_ffff,
        history: [],
        difficulty,
        stopOnError: stopOnErrorWord || stopOnError,
        wordGoal: goal,
        // A bounded words run ends at its goal; timed and endless runs stream.
        infinite: goal === null,
        vocabulary,
        funbox: activeFunbox,
      }),
    );
  };

  const nextText = () => {
    if (customRun !== null) {
      // "Next" while a paste is on screen returns to the built-in library.
      startBuiltinRun({ durationMs: model.durationMs, wordGoal: null });
      return;
    }
    engineRef.current.reset();
    setOsKeyboard(false);
    setWeakDrill(null);
    setModel((current) =>
      createRun({
        pool,
        durationMs: current.durationMs,
        seed: Date.now() % 0x7fff_ffff,
        history: current.history,
        difficulty,
        stopOnError: stopOnErrorWord || stopOnError,
        wordGoal,
        // A bounded words run ends at its goal; timed and endless runs stream.
        // Passing the render's `infinite` here would turn a words-mode goal
        // into an unbounded stream that never ends at the goal.
        infinite: wordGoal === null,
        vocabulary,
        funbox: activeFunbox,
      }),
    );
  };

  const chooseDuration = (durationMs: number | null) => {
    startBuiltinRun({ durationMs, wordGoal: null });
  };

  /**
   * The config bar's active mode, derived from the run: which chip row makes
   * sense right now. `custom` wins once a paste is on screen.
   */
  const activeMode: TestMode =
    customRun !== null
      ? "custom"
      : wordGoal !== null
        ? "words"
        : model.durationMs !== null
          ? "time"
          : "zen";

  /**
   * Switch the test mode from the config bar. `time`/`words` land on their
   * first chip so the change is visible; `zen` is the endless run; `custom`
   * opens the paste panel. A custom paste and a lesson drill keep their own
   * run until the user leaves them.
   */
  const chooseMode = (testMode: TestMode) => {
    if (testMode === activeMode) return;
    if (testMode === "custom") {
      setCustomPanelOpen(true);
      return;
    }

    if (testMode === "time") {
      startBuiltinRun({ durationMs: TIME_CHIPS[0] * 1000, wordGoal: null });
      return;
    }
    if (testMode === "words") {
      startBuiltinRun({ durationMs: null, wordGoal: WORD_GOALS[0] });
      return;
    }
    startBuiltinRun({ durationMs: null, wordGoal: null });
  };

  /**
   * Stream-twist toggle for the config bar. Writing through `updateSettings`
   * stores the choice, applies it and broadcasts it, and the rebuild effect
   * above restarts the run with the new twist.
   */
  const toggleFunbox = (next: FunboxMode) => {
    if (next === funbox) return;
    const snapshot: Settings = { ...settingsRef.current, funbox: next };
    settingsRef.current = snapshot;
    updateSettings(snapshot);
  };

  /** Words mode: commit a fixed number of words, untimed. */
  const chooseWordGoal = (goal: number | null) => {
    startBuiltinRun({ durationMs: null, wordGoal: goal });
  };

  /** One focused drill over the clusters this browser mistypes most. */
  const startWeakDrill = () => {
    const drill = buildWeakKeyText(loadErrorMap(), [
      "কষ্ট", "জ্ঞান", "স্কুল", "ক্ষমা", "দ্বার", "নিশ্চয়", "উৎসব", "স্বর", "ঋণ", "যত্ন",
    ]);
    if (drill === null) return;

    engineRef.current.reset();
    setOsKeyboard(false);
    // The drill is its own fixed target: a words goal left over from the mode
    // the user was in would linger in the toolbar state and the run record.
    setWordGoal(null);
    setWeakDrill(drill);
    setModel(
      createRun({
        pool: [drill],
        durationMs: null,
        seed: Date.now() % 0x7fff_ffff,
        stopOnError: stopOnErrorWord || stopOnError,
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
    // A custom run is its own test type: any words/time goal left over from the
    // mode the user was in must go, or the results screen and the progress page
    // would record the paste as `words 25` instead of `custom`.
    setWordGoal(null);
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
    startBuiltinRun({ durationMs: model.durationMs, wordGoal: null });
  };

  // The test type recorded with a run, so personal bests can be grouped the way
  // monkeytype groups them: `time 60`, `words 25`, `∞`, `lesson`, `custom`.
  const testTypeOf = (run: RunModel): string =>
    testTypeFor({
      durationMs: run.durationMs,
      wordGoal,
      kind:
        lesson !== undefined
          ? "lesson"
          : weakDrill !== null
            ? "weak"
            : customRun !== null
              ? "custom"
              : undefined,
      funbox: run.funbox,
    });

  /**
   * Commands from the command bar. Settings-level commands are written through
   * `updateSettings` and arrive on the settings event; only the run-level ones
   * land here. The handler is kept in a ref so it always sees the current state
   * even though the subscription is mounted once.
   */
  const commandRef = useRef<(command: RunCommand) => void>(() => undefined);
  commandRef.current = (command) => {
    switch (command.name) {
      case "time":
        chooseDuration(command.durationMs);
        break;
      case "words":
        chooseWordGoal(command.goal);
        break;
      case "restart":
        restart();
        break;
      case "next":
        nextText();
        break;
      case "end":
        apply({ type: "end", at: Date.now() });
        break;
      case "weak":
        startWeakDrill();
        break;
      case "custom":
        setCustomPanelOpen(true);
        break;
    }
  };

  useEffect(() => onRunCommand((command) => commandRef.current(command)), []);

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

      const prefs = prefsRef.current;

      // Caps lock is not inert here: the built-in phonetic engine reads shifted
      // keys as different letters, so a locked keyboard every word wrong.
      if (prefs.capsLockWarning && typeof event.getModifierState === "function") {
        setCapsOn(event.getModifierState("CapsLock"));
      }

      // The restart key is a setting; `esc` is the default and the documented
      // shortcut, and `off` lets the browser keep the key entirely.
      const isRestartKey =
        (prefs.quickRestart === "esc" && event.key === "Escape") ||
        (prefs.quickRestart === "tab" && event.key === "Tab") ||
        (prefs.quickRestart === "enter" && event.key === "Enter");

      if (isRestartKey) {
        event.preventDefault();
        restart();
        return;
      }

      // Tab completes an endless run (monkeytype's zen convention) when it is not
      // busy being the restart key: the results screen then shows everything
      // typed so far. A timed or word-goal run ends on its own, so Tab is left
      // alone there.
      const current = modelRef.current;
      if (
        event.key === "Tab" &&
        current !== null &&
        current.bank !== null &&
        current.durationMs === null &&
        current.wordGoal === null &&
        current.session.state === "running"
      ) {
        event.preventDefault();
        apply({ type: "end", at: Date.now() });
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
          applyWithSound({ type: "input", text: action.text, at });
          break;
        case "compose":
          event.preventDefault();
          applyWithSound({ type: "compose", text: action.text, composing: action.composing, at });
          break;
        case "backspace":
          event.preventDefault();
          // Confidence mode: `on` refuses to walk back into a committed word,
          // `max` refuses to delete at all.
          if (
            !allowsBackspace(
              prefs.confidenceMode,
              modelRef.current?.session.active.length ?? 0,
            )
          ) {
            break;
          }
          applyWithSound({ type: "backspace", at });
          break;
        case "commit":
          event.preventDefault();
          applyWithSound({ type: "commit", at });
          break;
        case "ignore":
          // A Bangla character arrived from an installed keyboard while the
          // built-in engine was on: say so instead of dropping it silently.
          if (action.reason === "wrong-script") {
            setOsKeyboard(true);
            if (sound === "error" || sound === "both") playSound("error");
          }
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // The tick drives the clock display, ends a timed run, and applies the
  // minimum speed and accuracy the user asked to be held to.
  useEffect(() => {
    if (model.session.state !== "running") return;

    const id = window.setInterval(() => {
      const at = Date.now();
      setNow(at);

      const live = modelRef.current;
      if (live !== null && (live.session.durationMs !== null || live.session.state === "running")) {
        const stats = sessionStats(live.session, at);
        const failure = minimumFailure(stats, { minWpm, minAccuracy });

        if (failure !== null) {
          setFailReason(failure);
          if (prefsRef.current.sound === "error" || prefsRef.current.sound === "both") {
            playSound("error", prefsRef.current.soundVolume);
          }
          setModel((current) => ({
            ...current,
            session: reduce(current.session, { type: "end", at }),
          }));
          return;
        }
      }

      setModel((current) => ({ ...current, session: reduce(current.session, { type: "tick", at }) }));
    }, 250);

    return () => window.clearInterval(id);
  }, [model.session.state, minWpm, minAccuracy]);

  // Focus mode: while a run is on screen the surrounding chrome fades out. The
  // attribute is on the root because the header is rendered by Astro, not here.
  useEffect(() => {
    const active = focusMode && model.session.state === "running";
    if (active) document.documentElement.setAttribute("data-tk-focus", "on");
    else document.documentElement.removeAttribute("data-tk-focus");

    return () => document.documentElement.removeAttribute("data-tk-focus");
  }, [focusMode, model.session.state]);

  // The stream: as the caret approaches the end of the generated target, extend
  // it with a fresh line of words. This is the whole trick behind an endless run.
  useEffect(() => {
    const { bank, session } = model;
    if (bank === null) return;
    if (session.state === "finished") return;
    if (session.target.length - session.committed.length > STREAM_BUFFER) return;

    setModel((current) => {
      if (current.bank === null) return current;

      // The extension inherits the run's pinned funbox, so a settings change
      // mid-run cannot mix two modes into one stream.
      const stream = extendStream(current.bank, current.session.target, current.funbox);
      return {
        ...current,
        bank: stream.handle,
        session: reduce(current.session, { type: "extend", words: stream.words, at: Date.now() }),
      };
    });
  }, [
    model.session.committed.length,
    model.session.target.length,
    model.session.state,
    model.funbox,
  ]);

  const { session } = model;
  const finished = session.state === "finished";
  const activeIndex = session.committed.length;
  // The weak drill is only meaningful once at least one mistake was recorded.
  const weakAvailable =
    lesson === undefined && customRun === null && topWeakKeyCount(loadErrorMap()) > 0;
  const stats = sessionStats(session, now);
  // The rendered window: enough committed context to read back, enough pending
  // words that the stream never catches the caret. Rendering the whole target
  // would grow without bound in an infinite run.
  const windowStart = Math.max(0, activeIndex - (showAllLines ? 12 : 1));
  const windowEnd = Math.min(session.target.length, activeIndex + (showAllLines ? 24 : 12));
  const view = renderProgress(
    session.target.slice(windowStart, windowEnd),
    session.committed.slice(windowStart, windowEnd),
    session.active,
  );
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
        testType: testTypeOf(model),
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
    wordGoal,
    model.durationMs,
  ]);

  // A fresh run clears the reason: the notice belongs to the run that failed,
  // not to the next one.
  useEffect(() => {
    if (session.state === "idle") setFailReason(null);
  }, [session.state]);

  const focusInput = () => inputRef.current?.focus();

  const summary = finished
    ? `${t("results.wpm")} ${stats.wpm}, ${t("results.accuracy")} ${stats.accuracy}%, ${t(
        "results.time",
      )} ${formatDuration(stats.elapsedMs)}`
    : "";

  // In single-line mode the visible window slides with the caret; the stream
  // simply keeps that window populated forever.

  return (
    <div>
      {/* Toolbar: quiet, centred, one row. It fades out in focus mode. */}
      <div data-tk-chrome class="flex flex-wrap items-center justify-center gap-2">
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

        {lesson === undefined && (
          <div
            role="group"
            aria-label={t("practice.configBar")}
            class="flex flex-wrap items-center justify-center gap-2"
          >
            {/* Stream twists: monkeytype's @ punctuation / # numbers. They only
                shape a generated stream, so they sit out while a paste or a
                drill — a fixed target — is on screen. */}
            <div
              role="group"
              aria-label={t("settings.funbox")}
              class="inline-flex items-center rounded-pill border border-border bg-surface p-0.5"
            >
              <button
                type="button"
                aria-pressed={activeFunbox === "punctuation"}
                disabled={!infinite}
                onClick={() =>
                  toggleFunbox(activeFunbox === "punctuation" ? "none" : "punctuation")
                }
                class={`rounded-pill px-2.5 py-1 text-xs font-medium transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${
                  activeFunbox === "punctuation"
                    ? "bg-accent text-on-accent"
                    : "text-muted hover:text-text"
                }`}
              >
                @ {t("command.funbox.punctuation")}
              </button>
              <button
                type="button"
                aria-pressed={activeFunbox === "numbers"}
                disabled={!infinite}
                onClick={() => toggleFunbox(activeFunbox === "numbers" ? "none" : "numbers")}
                class={`rounded-pill px-2.5 py-1 text-xs font-medium transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${
                  activeFunbox === "numbers"
                    ? "bg-accent text-on-accent"
                    : "text-muted hover:text-text"
                }`}
              >
                # {t("command.funbox.numbers")}
              </button>
            </div>

            {/* Mode: monkeytype's time / words / zen / custom row. */}
            <div
              role="group"
              aria-label={t("practice.testMode")}
              class="inline-flex items-center rounded-pill border border-border bg-surface p-0.5"
            >
              {TEST_MODES.map((testMode) => (
                <button
                  key={testMode}
                  type="button"
                  aria-pressed={activeMode === testMode}
                  onClick={() => chooseMode(testMode)}
                  class={`rounded-pill px-2.5 py-1 text-xs font-medium transition-colors duration-150 ease-out ${
                    activeMode === testMode
                      ? "bg-accent text-on-accent"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {t(`practice.modeChip.${testMode}`)}
                </button>
              ))}
            </div>

            {/* Durations for the active mode: seconds in time mode, word
                counts in words mode. Hidden while a paste or a drill — a fixed
                target of its own — is on screen. */}
            <div
              role="group"
              aria-label={activeMode === "words" ? t("practice.words") : t("practice.time")}
              class={`inline-flex items-center rounded-pill border border-border bg-surface p-0.5 ${
                infinite ? "" : "hidden"
              }`}
            >
              {activeMode === "words"
                ? WORD_GOALS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      aria-pressed={wordGoal === goal}
                      onClick={() => chooseWordGoal(goal)}
                      class={`rounded-pill px-2.5 py-1 text-xs font-medium tabular-nums transition-colors duration-150 ease-out ${
                        wordGoal === goal
                          ? "bg-accent text-on-accent"
                          : "text-muted hover:text-text"
                      }`}
                    >
                      {formatNumeral(goal, numerals)}
                    </button>
                  ))
                : TIME_CHIPS.map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      aria-pressed={model.durationMs === seconds * 1000}
                      onClick={() => chooseDuration(seconds * 1000)}
                      class={`rounded-pill px-2.5 py-1 text-xs font-medium tabular-nums transition-colors duration-150 ease-out ${
                        model.durationMs === seconds * 1000
                          ? "bg-accent text-on-accent"
                          : "text-muted hover:text-text"
                      }`}
                    >
                      {formatNumeral(seconds, numerals)}
                    </button>
                  ))}
            </div>
          </div>
        )}

        {lesson === undefined && customRun === null && (
          <button
            type="button"
            onClick={startWeakDrill}
            disabled={weakAvailable === false}
            title={t("practice.weakDrill")}
            aria-label={t("practice.weakDrill")}
            class="rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-150 ease-out hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("practice.weakDrill")}
          </button>
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
            const absoluteIndex = windowStart + wordIndex;
            // Memory mode: the word being typed and the one after it stay
            // visible, everything further ahead has to be held in the head.
            const hidden =
              model.funbox === "memory" &&
              word.status === "pending" &&
              absoluteIndex > activeIndex + 1;

            return (
              <span
                key={absoluteIndex}
                class={`inline-flex ${wordClass(word.status)}${hidden ? " invisible" : ""}`}
              >
                {word.clusters.map((cluster, clusterIndex) => {
                  const typo =
                    indicateTypos !== "off" && cluster.state === "wrong" ? cluster.typed : null;
                  const classes = clusterClass(
                    cluster.state,
                    clusterIndex === nextCluster,
                    blindMode,
                    caretStyle,
                  );

                  // Replace mode shows what was typed in place of the letter;
                  // below mode keeps the letter and prints the typo under it.
                  if (typo !== null && indicateTypos === "replace") {
                    return (
                      <span key={clusterIndex} class={classes}>
                        {typo}
                      </span>
                    );
                  }

                  return (
                    <span key={clusterIndex} class={typo === null ? classes : `relative ${classes}`}>
                      {cluster.target}
                      {typo !== null && (
                        <span
                          aria-hidden="true"
                          class="absolute start-0 top-full text-[0.5em] leading-none text-wrong"
                        >
                          {typo}
                        </span>
                      )}
                    </span>
                  );
                })}
                {!hideExtraLetters &&
                  word.extra.map((cluster, extraIndex) => (
                    <span
                      key={`extra-${extraIndex}`}
                      class={clusterClass("extra", false, blindMode, caretStyle)}
                    >
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

      {capsOn && capsLockWarning && session.state !== "finished" && (
        <p
          role="status"
          class="mt-3 rounded-card border border-accent-2/40 bg-surface-2 px-4 py-2.5 text-sm text-text"
        >
          {t("practice.capsLock")}
        </p>
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

      {/* Live stats: only while the user wants them (monkeytype hides these by default). */}
      <div
        class={`mt-5 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-border pt-5 ${
          liveWpm ? "" : "hidden"
        }`}
      >
        <Stat label={t("practice.wpm")} value={formatNumeral(stats.wpm, numerals)} />
        <Stat
          label={t("practice.accuracy")}
          value={
            stats.targetClusters > 0
              ? `${formatNumeral(stats.accuracy, numerals)}%`
              : "—"
          }
        />
        <Stat
          label={t("practice.time")}
          value={formatNumeral(formatDuration(timed ? countdown : stats.elapsedMs), numerals)}
        />
        <Stat label={t("practice.kpm")} value={formatNumeral(stats.kpm, numerals)} />
        <Stat
          label={t("results.correct")}
          value={formatNumeral(
            `${stats.correctWords}/${session.committed.length}`,
            numerals,
          )}
        />
      </div>

      {/* Words history while typing, for the people who want it always on. */}
      {wordHistory === "always" && !finished && session.committed.length > 0 && (
        <p
          lang="bn"
          class="mt-3 flex flex-wrap gap-x-2 gap-y-1 font-bangla text-sm leading-relaxed"
        >
          {session.committed.slice(-WORD_HISTORY_ROWS).map((word, index) => (
            <span key={index} class={word.correct ? "text-muted" : "text-wrong"}>
              {word.target}
            </span>
          ))}
        </p>
      )}

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

          {failReason !== null && (
            <p
              role="status"
              class="mt-3 rounded-card border border-wrong/40 bg-surface-2 px-4 py-2.5 text-sm font-medium text-text"
            >
              {failReason === "wpm" ? t("results.failedWpm") : t("results.failedAccuracy")}
            </p>
          )}

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
                {formatNumeral(stats.wpm, numerals)}
              </div>
              <div class="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
                {t("results.wpm")}
              </div>
            </div>
            <Stat label={t("results.accuracy")} value={`${formatNumeral(stats.accuracy, numerals)}%`} />
            <Stat
              label={t("results.time")}
              value={formatNumeral(formatDuration(stats.elapsedMs), numerals)}
            />
            <Stat label={t("results.kpm")} value={formatNumeral(stats.kpm, numerals)} />
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

          {wordHistory !== "off" && session.committed.length > 0 && (
            <div class="mt-5 border-t border-border pt-4">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
                {t("results.history")}
              </h4>
              <p
                lang="bn"
                class="mt-2 flex flex-wrap gap-x-2 gap-y-1 font-bangla text-sm leading-relaxed"
              >
                {session.committed.slice(-WORD_HISTORY_ROWS).map((word, index) => (
                  <span key={index} class={word.correct ? "text-muted" : "text-wrong"}>
                    {word.target}
                  </span>
                ))}
              </p>
            </div>
          )}

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

      <p
        data-tk-chrome
        class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted"
      >
        {quickRestart !== "off" && (
          <span>
            <kbd class="keycap">
              {quickRestart === "esc" ? "Esc" : quickRestart === "tab" ? "Tab" : "Enter"}
            </kbd>{" "}
            {t("practice.restart")}
          </span>
        )}
        {model.bank !== null && !timed && wordGoal === null && quickRestart !== "tab" && (
          <span>
            <kbd class="keycap">Tab</kbd> {t("practice.endTest")}
          </span>
        )}
        <span>{t("practice.offlineNote")}</span>
      </p>
    </div>
  );
}
