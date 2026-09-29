/**
 * The command line: one text input in, one typed command out.
 *
 * Parsing is separated from execution so the grammar can be unit tested, and so
 * the palette and the command line can share it — the palette simply builds the
 * same strings the user could type. Anything the parser does not recognise
 * returns `null`, and the interface says so instead of guessing.
 */

import type { Difficulty } from "../engine/text/provider";
import { funboxModes, type FunboxMode } from "./funbox";
import { isThemeId, type ThemeId } from "./themes";
import type { CaretStyle, ConfidenceMode, IndicateTypos, NumeralStyle, QuickRestart, StopOnError, WordHistory } from "./settings";

export type Command =
  /** Run-level commands the practice island owns. */
  | { kind: "run"; name: "time"; durationMs: number | null }
  | { kind: "run"; name: "words"; goal: number | null }
  | { kind: "run"; name: "restart" }
  | { kind: "run"; name: "next" }
  | { kind: "run"; name: "end" }
  | { kind: "run"; name: "weak" }
  | { kind: "run"; name: "custom" }
  /** Settings the drawer owns. */
  | { kind: "setting"; name: "theme"; theme: "system" | ThemeId }
  | { kind: "setting"; name: "lang"; lang: "bn" | "en" }
  | { kind: "setting"; name: "difficulty"; difficulty: Difficulty | "all" }
  | { kind: "setting"; name: "funbox"; funbox: FunboxMode }
  | { kind: "setting"; name: "sound"; sound: "off" | "click" | "error" | "both" }
  | { kind: "setting"; name: "volume"; volume: number }
  | { kind: "setting"; name: "caret"; caret: CaretStyle }
  | { kind: "setting"; name: "font"; fontSize: number }
  | { kind: "setting"; name: "numerals"; numerals: NumeralStyle }
  | { kind: "setting"; name: "stopOnError"; stopOnError: StopOnError }
  | { kind: "setting"; name: "confidence"; confidence: ConfidenceMode }
  | { kind: "setting"; name: "quickRestart"; quickRestart: QuickRestart }
  | { kind: "setting"; name: "typos"; indicateTypos: IndicateTypos }
  | { kind: "setting"; name: "wordHistory"; history: WordHistory }
  | { kind: "setting"; name: "blind"; blindMode: boolean }
  | { kind: "setting"; name: "focus"; focusMode: boolean }
  | { kind: "setting"; name: "liveWpm"; liveWpm: boolean }
  | { kind: "setting"; name: "hideExtra"; hideExtraLetters: boolean }
  | { kind: "setting"; name: "capsWarning"; capsLockWarning: boolean }
  /** Navigation. */
  | { kind: "go"; path: "/" | "/lessons" | "/progress" | "/privacy" };

const ON = new Set(["on", "true", "yes", "1", "enable", "enabled"]);
const OFF = new Set(["off", "false", "no", "0", "disable", "disabled"]);

function onOff(token: string): boolean | null {
  const value = token.toLowerCase();
  if (ON.has(value)) return true;
  if (OFF.has(value)) return false;
  return null;
}

function number(token: string): number | null {
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

const STOP_ON_ERROR: readonly StopOnError[] = ["off", "letter", "word"];
const CONFIDENCE: readonly ConfidenceMode[] = ["off", "on", "max"];
const QUICK_RESTART: readonly QuickRestart[] = ["off", "esc", "tab", "enter"];
const INDICATE: readonly IndicateTypos[] = ["off", "below", "replace"];
const WORD_HISTORY: readonly WordHistory[] = ["off", "recent", "always"];
const CARET: readonly CaretStyle[] = ["bar", "underline", "off"];
const SOUND: readonly ("off" | "click" | "error" | "both")[] = ["off", "click", "error", "both"];
const NUMERALS: readonly NumeralStyle[] = ["latin", "bengali"];
const DIFFICULTIES: readonly (Difficulty | "all")[] = ["all", "easy", "medium", "hard"];

/** Accept a short prefix, so `conf max` and `confidence max` both work. */
function matches(token: string, candidate: string): boolean {
  return candidate.startsWith(token) && token.length > 0;
}

function pick<T extends string>(token: string, options: readonly T[]): T | null {
  const value = token.toLowerCase();
  return options.find((option) => option === value) ?? options.find((option) => matches(value, option)) ?? null;
}

/**
 * Parse one command line. Returns null for anything unrecognised — including a
 * known verb with a missing or unknown argument, so the caller can never apply
 * half a command.
 */
export function parseCommand(input: string): Command | null {
  const tokens = input
    .trim()
    .replace(/^[/>:\s]+/, "")
    .split(/\s+/)
    .filter((token) => token.length > 0);

  const [verb, ...rest] = tokens;
  if (verb === undefined) return null;

  const argument = rest.join(" ").toLowerCase();
  const word = rest[0]?.toLowerCase() ?? "";

  switch (verb.toLowerCase()) {
    case "time":
    case "t": {
      if (word === "" || word === "infinite" || word === "inf" || word === "∞") {
        return { kind: "run", name: "time", durationMs: null };
      }
      const minutes = number(word.replace(/m$/, ""));
      if (minutes === null || minutes < 0 || minutes > 600) return null;
      return { kind: "run", name: "time", durationMs: Math.round(minutes * 60_000) };
    }

    case "words":
    case "w": {
      if (word === "" || word === "infinite" || word === "inf" || word === "∞") {
        return { kind: "run", name: "words", goal: null };
      }
      const goal = number(word.replace(/w$/, ""));
      if (goal === null || goal < 1 || goal > 1000) return null;
      return { kind: "run", name: "words", goal: Math.round(goal) };
    }

    case "restart":
    case "retry":
      return { kind: "run", name: "restart" };
    case "next":
      return { kind: "run", name: "next" };
    case "end":
    case "finish":
      return { kind: "run", name: "end" };
    case "weak":
      return { kind: "run", name: "weak" };
    case "custom":
      return { kind: "run", name: "custom" };

    case "theme": {
      if (word === "system" || word === "auto") return { kind: "setting", name: "theme", theme: "system" };
      return isThemeId(argument) ? { kind: "setting", name: "theme", theme: argument } : null;
    }

    case "lang":
    case "language": {
      if (word === "bn" || word === "bangla") return { kind: "setting", name: "lang", lang: "bn" };
      if (word === "en" || word === "english") return { kind: "setting", name: "lang", lang: "en" };
      return null;
    }

    case "difficulty":
    case "diff": {
      const difficulty = pick(word, DIFFICULTIES);
      return difficulty === null ? null : { kind: "setting", name: "difficulty", difficulty };
    }

    case "funbox":
    case "fun": {
      const funbox = pick(word, funboxModes);
      return funbox === null ? null : { kind: "setting", name: "funbox", funbox };
    }

    case "sound": {
      const sound = pick(word, SOUND);
      return sound === null ? null : { kind: "setting", name: "sound", sound };
    }

    case "volume":
    case "vol": {
      const volume = number(word);
      if (volume === null || volume < 0 || volume > 100) return null;
      return { kind: "setting", name: "volume", volume: Math.round(volume) };
    }

    case "caret": {
      const caret = pick(word, CARET);
      return caret === null ? null : { kind: "setting", name: "caret", caret };
    }

    case "font":
    case "size": {
      const fontSize = number(word);
      if (fontSize === null) return null;
      return { kind: "setting", name: "font", fontSize };
    }

    case "numerals":
    case "numerals.": {
      const numerals = pick(word, NUMERALS);
      return numerals === null ? null : { kind: "setting", name: "numerals", numerals };
    }

    case "stop": {
      // `stop off`, `stop letter`, `stop word`
      const stopOnError = pick(word, STOP_ON_ERROR);
      return stopOnError === null ? null : { kind: "setting", name: "stopOnError", stopOnError };
    }

    case "confidence":
    case "conf": {
      const confidence = pick(word, CONFIDENCE);
      return confidence === null ? null : { kind: "setting", name: "confidence", confidence };
    }

    case "quickrestart":
    case "restartkey": {
      const quickRestart = pick(word, QUICK_RESTART);
      return quickRestart === null ? null : { kind: "setting", name: "quickRestart", quickRestart };
    }

    case "typos":
    case "typo": {
      const indicateTypos = pick(word, INDICATE);
      return indicateTypos === null ? null : { kind: "setting", name: "typos", indicateTypos };
    }

    case "history": {
      const history = pick(word, WORD_HISTORY);
      return history === null ? null : { kind: "setting", name: "wordHistory", history };
    }

    case "blind":
    case "focus":
    case "livewpm":
    case "hideextra":
    case "capswarning": {
      const flag = onOff(word);
      if (flag === null) return null;
      switch (verb.toLowerCase()) {
        case "blind":
          return { kind: "setting", name: "blind", blindMode: flag };
        case "focus":
          return { kind: "setting", name: "focus", focusMode: flag };
        case "livewpm":
          return { kind: "setting", name: "liveWpm", liveWpm: flag };
        case "hideextra":
          return { kind: "setting", name: "hideExtra", hideExtraLetters: flag };
        default:
          return { kind: "setting", name: "capsWarning", capsLockWarning: flag };
      }
    }

    case "goto":
    case "go": {
      if (word === "practice" || word === "home" || word === "") return { kind: "go", path: "/" };
      if (word.startsWith("lesson")) return { kind: "go", path: "/lessons" };
      if (word.startsWith("progress") || word === "stats") return { kind: "go", path: "/progress" };
      if (word.startsWith("privacy")) return { kind: "go", path: "/privacy" };
      return null;
    }

    default:
      return null;
  }
}

/** The event name the practice island subscribes to for run-level commands. */
export const COMMAND_EVENT = "tk:command";

export type RunCommand = Extract<Command, { kind: "run" }>;

export function emitRunCommand(command: RunCommand): void {
  window.dispatchEvent(new CustomEvent<RunCommand>(COMMAND_EVENT, { detail: command }));
}

export function onRunCommand(listener: (command: RunCommand) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<RunCommand>).detail;
    if (detail) listener(detail);
  };

  window.addEventListener(COMMAND_EVENT, handler);
  return () => window.removeEventListener(COMMAND_EVENT, handler);
}
