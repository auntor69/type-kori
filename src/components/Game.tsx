import { useEffect, useRef, useState } from "preact/hooks";

import { transliterate } from "../engine/input/phonetic";
import type { InputEngineId } from "../engine/input/types";
import { createWordBank, drawWords } from "../engine/wordbank";
import { localizePath, useTranslations, type Lang } from "../i18n";
import { loadAndApplySettings, onSettingsChange } from "../lib/applySettings";
import {
  GAME_LEVELS,
  GAME_LEVEL_ORDER,
  backspaceTyped,
  createGame,
  gameSummary,
  isGameOver,
  resumeGame,
  setTyped,
  tick,
  wordProgress,
  type GameLevel,
  type GameState,
} from "../lib/game";
import { buildVocabulary } from "../lib/run";

interface Props {
  lang: Lang;
}

/** How often the game's own clock runs. The fall is CSS; this only spawns. */
const TICK_MS = 100;

const CHIP_BASE = "rounded-pill px-2.5 py-1 text-xs font-medium transition-colors duration-150 ease-out";
const CHIP_ON = `${CHIP_BASE} bg-accent text-on-accent`;
const CHIP_OFF = `${CHIP_BASE} text-muted hover:text-text`;
const BUTTON_BASE = "rounded-control px-4 py-2 text-sm transition-colors duration-150 ease-out";
const PRIMARY_BUTTON = `${BUTTON_BASE} bg-accent font-semibold text-on-accent hover:opacity-90`;
const SECONDARY_BUTTON = `${BUTTON_BASE} border border-border bg-surface font-medium text-text hover:bg-surface-2`;

/**
 * Falling words: type each word before it reaches the bottom of the field.
 *
 * The words are drawn from the same curated vocabulary the endless practice
 * stream uses, so this is the same material under a clock rather than a separate
 * word list. Three things are worth knowing about how it works:
 *
 *   - the fall is a CSS animation (`tk-fall` in `src/styles/global.css`) whose
 *     duration is the level's `fallMs`. The island ticks ten times a second only
 *     to send words in and to notice escapes, so a dropped frame cannot make a
 *     word jump;
 *   - a reader who asked for reduced motion gets the list view instead: the same
 *     words, the same clock, no movement — each word shows its remaining time;
 *   - the input mode follows the app's own setting. In built-in phonetic mode the
 *     islands feeds Roman keys through the same `transliterate` the practice test
 *     uses, and a provisionally wrong buffer is not counted as a miss (see
 *     `setTyped`'s `forgiving` option).
 */
export default function Game({ lang }: Props) {
  const t = useTranslations(lang);

  const [game, setGame] = useState<GameState | null>(null);
  const [level, setLevel] = useState<GameLevel>("normal");
  const [mode, setMode] = useState<InputEngineId>("system");
  const [roman, setRoman] = useState("");
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [reduced, setReduced] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const pausedAt = useRef<number | null>(null);

  const focusInput = () => inputRef.current?.focus();
  const over = game !== null && isGameOver(game);
  const running = game !== null && !over && !paused;

  // The input mode is the app's own setting, so the game types the way the rest
  // of the site does — including the built-in phonetic engine.
  useEffect(() => {
    setMode(loadAndApplySettings().inputMode);
    return onSettingsChange((settings) => setMode(settings.inputMode));
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // One clock for the whole game: it sends the next word in, notices escapes and
  // keeps the countdown numbers honest.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      setGame((current) => (current === null ? current : tick(current, at)));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    const config = GAME_LEVELS[level];
    const queue = drawWords(
      createWordBank(buildVocabulary("all")),
      config.total,
      Date.now() % 0x7fff_ffff,
    );
    const at = Date.now();

    setRoman("");
    setPaused(false);
    pausedAt.current = null;
    setNow(at);
    setGame(createGame({ level, queue, now: at }));
    focusInput();
  };

  const togglePause = () => {
    if (game === null || isGameOver(game)) return;

    if (paused) {
      const pausedFor = pausedAt.current === null ? 0 : Date.now() - pausedAt.current;
      pausedAt.current = null;
      setGame((current) =>
        current === null || pausedFor <= 0 ? current : resumeGame(current, Date.now(), pausedFor),
      );
      setPaused(false);
      focusInput();
      return;
    }

    pausedAt.current = Date.now();
    setPaused(true);
  };

  const setBuffer = (text: string) => {
    const at = Date.now();
    setGame((current) => (current === null ? current : setTyped(current, text, at)));
  };

  /** System keyboard: whatever the OS inserts, Bangla or not. */
  const onInput = (event: Event) => {
    const input = event as InputEvent & { currentTarget: HTMLTextAreaElement };
    // Read what arrived from the field itself rather than from `event.data`: an
    // IME commits text into the value, and `data` is null for that. Then empty
    // it again — the buffer lives in the game, not in the textarea.
    const inserted = input.currentTarget.value;
    input.currentTarget.value = "";

    if (input.inputType === "deleteContentBackward") {
      setGame((current) => (current === null ? current : backspaceTyped(current)));
      return;
    }
    // A composition in progress is not a word yet: wait for it to finish.
    if (input.isComposing === true) return;
    if (inserted.length > 0) setBuffer((game?.typed ?? "") + inserted);
  };

  /** Built-in phonetic mode: Roman keys, converted by the practice engine. */
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      togglePause();
      return;
    }
    if (mode !== "avro-phonetic") return;

    if (event.key === "Backspace") {
      event.preventDefault();
      const next = roman.slice(0, -1);
      setRoman(next);
      const at = Date.now();
      setGame((current) =>
        current === null ? current : setTyped(current, transliterate(next), at, { forgiving: true }),
      );
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setRoman("");
      setBuffer("");
      return;
    }

    if (/^[a-zA-Z]$/.test(event.key)) {
      event.preventDefault();
      const next = roman + event.key;
      setRoman(next);
      const at = Date.now();
      setGame((current) =>
        current === null ? current : setTyped(current, transliterate(next), at, { forgiving: true }),
      );
    }
  };

  /** The part of a word the learner has already typed, highlighted. */
  const highlighted = (word: string, typed: string) => {
    if (typed.length === 0 || !word.startsWith(typed)) return <>{word}</>;
    return (
      <>
        <span class="text-accent">{typed}</span>
        <span>{word.slice(typed.length)}</span>
      </>
    );
  };

  const scoreLine = (
    <dl class="flex flex-wrap items-baseline gap-x-6 gap-y-2">
      {[
        { id: "score", label: t("game.score"), value: game?.score ?? 0 },
        { id: "hits", label: t("game.hits"), value: game?.hits ?? 0 },
        { id: "misses", label: t("game.misses"), value: game?.misses ?? 0 },
        { id: "escapes", label: t("game.escapes"), value: game?.escapes ?? 0 },
        { id: "lives", label: t("game.lives"), value: game?.lives ?? 0 },
      ].map((entry) => (
        <div key={entry.id} class="flex items-baseline gap-2">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">{entry.label}</dt>
          <dd class="tabular-nums text-lg font-semibold leading-none text-text">{entry.value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <section aria-labelledby="game-heading">
      <h2 id="game-heading" class="sr-only">
        {t("game.title")}
      </h2>

      {/* Speed and controls. Changing the speed starts a new round, which is what
          the word "restart" means everywhere else in the app. */}
      <div class="flex flex-wrap items-center justify-center gap-2">
        <div
          role="group"
          aria-label={t("game.level")}
          class="inline-flex items-center rounded-pill border border-border bg-surface p-0.5"
        >
          {GAME_LEVEL_ORDER.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={level === option}
              onClick={() => setLevel(option)}
              class={level === option ? CHIP_ON : CHIP_OFF}
            >
              {t(`game.level.${option}`)}
            </button>
          ))}
        </div>

        <button type="button" onClick={start} class={PRIMARY_BUTTON}>
          {game === null || over ? t("game.start") : t("game.restart")}
        </button>

        {game !== null && !over && (
          <button type="button" onClick={togglePause} class={SECONDARY_BUTTON}>
            {paused ? t("game.resume") : t("game.pause")}
          </button>
        )}
      </div>

      {game === null ? (
        <div class="mt-6 rounded-card border border-border bg-surface p-6">
          <p class="text-sm leading-relaxed text-muted">{t("game.instructions")}</p>
          <p class="mt-3 text-sm leading-relaxed text-muted">
            {mode === "avro-phonetic" ? t("game.mode.builtin") : t("game.mode.system")}
          </p>
        </div>
      ) : over ? (
        <div class="mt-6 rounded-card border border-border bg-surface p-6" role="status">
          <h3 class="text-lg font-semibold text-text">{t("game.over.title")}</h3>
          <p class="mt-2 text-4xl font-semibold tabular-nums text-accent">
            {gameSummary(game, now).score}
          </p>
          <p class="mt-1 text-sm text-muted">{t("game.over.score")}</p>

          <dl class="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { id: "hits", label: t("game.hits"), value: `${game.hits}` },
              { id: "escapes", label: t("game.escapes"), value: `${game.escapes}` },
              { id: "misses", label: t("game.misses"), value: `${game.misses}` },
              { id: "accuracy", label: t("game.accuracy"), value: `${gameSummary(game, now).accuracy}%` },
            ].map((entry) => (
              <div key={entry.id}>
                <dt class="text-xs font-medium uppercase tracking-wide text-muted">{entry.label}</dt>
                <dd class="mt-0.5 tabular-nums text-text">{entry.value}</dd>
              </div>
            ))}
          </dl>

          <p class="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <button type="button" onClick={start} class={PRIMARY_BUTTON}>
              {t("game.over.again")}
            </button>
            <a href={localizePath("/", lang)} class="self-center font-medium text-accent hover:opacity-80">
              {t("game.over.practice")}
            </a>
          </p>
        </div>
      ) : (
        <>
          <div class="mt-5 flex flex-wrap items-center justify-between gap-3">{scoreLine}</div>

          <p class="mt-4 text-center text-xs uppercase tracking-wide text-muted">
            {t("game.typedLabel")}
          </p>
          <p
            lang="bn"
            class={`font-bangla text-center text-2xl leading-loose ${
              game.typed.length > 0 && !game.words.some((word) => word.text.startsWith(game.typed))
                ? "text-wrong"
                : "text-text"
            }`}
          >
            {game.typed.length > 0 ? game.typed : "—"}
          </p>

          <div
            class="relative mt-4 overflow-hidden rounded-card border border-border bg-surface"
            role="group"
            aria-label={t("game.field")}
            onClick={focusInput}
          >
            {reduced ? (
              <ul class="grid gap-2 p-4">
                {game.words.map((word) => (
                  <li
                    key={word.id}
                    class="flex items-center justify-between gap-3 rounded-control border border-border bg-bg px-3 py-2"
                  >
                    <span lang="bn" class="font-bangla text-xl text-text">
                      {highlighted(word.text, game.typed)}
                    </span>
                    <span class="tabular-nums text-xs text-muted">
                      {Math.max(0, (word.dueAt - now) / 1000).toFixed(1)}s
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div class="h-[22rem]">
                {game.words.map((word) => {
                  const progress = wordProgress(word, now);
                  return (
                    <span
                      key={word.id}
                      lang="bn"
                      class={`tk-falling-word font-bangla text-xl ${
                        progress > 0.75 ? "text-wrong" : "text-text"
                      }`}
                      style={{
                        insetInlineStart: `${((word.lane + 0.5) / game.config.lanes) * 100}%`,
                        animationDuration: `${game.config.fallMs}ms`,
                      }}
                    >
                      {highlighted(word.text, game.typed)}
                    </span>
                  );
                })}
              </div>
            )}

            {paused && (
              <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/85">
                <p class="text-sm font-medium text-text">{t("game.paused")}</p>
                <button type="button" onClick={togglePause} class={PRIMARY_BUTTON}>
                  {t("game.resume")}
                </button>
              </div>
            )}
          </div>

          <p class="mt-3 text-center text-xs text-muted">{t("game.footer")}</p>
          {reduced && <p class="mt-1 text-center text-xs text-muted">{t("game.reducedMotion")}</p>}
        </>
      )}

      {/* The keyboard is read from a textarea, exactly like the practice area:
          an IME, an OS layout and a phonetic keyboard all end up here. */}
      <textarea
        ref={inputRef}
        data-tk-game-input
        aria-label={t("game.inputLabel")}
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck={false}
        onInput={onInput}
        onKeyDown={onKeyDown}
        class="sr-only"
      />

      {/* One polite line for a screen reader: the score, which is what changed. */}
      <p class="sr-only" aria-live="polite">
        {t("game.score")}: {game?.score ?? 0}. {t("game.lives")}: {game?.lives ?? 0}.
      </p>
    </section>
  );
}
