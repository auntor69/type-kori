import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { languageLabel, localizePath, mirrorPath, useTranslations, type Lang } from "../i18n";
import { loadAndApplySettings, setOverlayOpen, updateSettings } from "../lib/applySettings";
import { emitRunCommand, parseCommand, type Command } from "../lib/commands";
import { funboxModes } from "../lib/funbox";
import { clampFontSize, defaultSettings, type Settings } from "../lib/settings";
import { searchThemes, themeLabel, allThemes } from "../lib/themes";

interface Props {
  lang: Lang;
}

type Mode = "closed" | "palette" | "line";

/** One row in the palette. `run` is what happens when it is chosen. */
interface Entry {
  id: string;
  group: "test" | "appearance" | "theme" | "go" | "run";
  label: string;
  hint?: string;
  run: () => void;
}

export default function CommandBar({ lang }: Props) {
  const t = useTranslations(lang);

  const [mode, setMode] = useState<Mode>("closed");
  const [query, setQuery] = useState("");
  const [line, setLine] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const settingsRef = useRef(settings);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSettings(loadAndApplySettings());
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // The palette can be opened from anywhere, including the typing area, so the
  // shortcut lives on the document rather than on a focused element.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLine("");
        setError(null);
        setMode((current) => (current === "closed" ? "palette" : "closed"));
        return;
      }
      if (command && event.key === "/") {
        event.preventDefault();
        setError(null);
        setMode((current) => (current === "closed" ? "line" : "closed"));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // While the bar is open the practice island must not read keystrokes, and
  // Escape has to close this rather than restart the test.
  useEffect(() => {
    setOverlayOpen("command", mode !== "closed");
    return () => setOverlayOpen("command", false);
  }, [mode]);

  useEffect(() => {
    if (mode === "closed") {
      triggerRef.current?.focus();
      return;
    }
    inputRef.current?.focus();
  }, [mode]);

  const close = () => {
    setMode("closed");
    setQuery("");
    setLine("");
    setError(null);
  };

  const commit = (patch: Partial<Settings>) => {
    const next: Settings = { ...settingsRef.current, ...patch };
    setSettings(next);
    updateSettings(next);
  };

  /** Execute a parsed command. Returns false when it could not be applied. */
  const execute = (command: Command): boolean => {
    if (command.kind === "go") {
      window.location.assign(localizePath(command.path, lang));
      return true;
    }

    if (command.kind === "run") {
      emitRunCommand(command);
      return true;
    }

    switch (command.name) {
      case "theme":
        commit({ theme: command.theme });
        return true;
      case "lang":
        window.location.assign(mirrorPath(window.location.pathname, command.lang));
        return true;
      case "difficulty":
        commit({ difficulty: command.difficulty });
        return true;
      case "funbox":
        commit({ funbox: command.funbox });
        return true;
      case "sound":
        commit({ sound: command.sound });
        return true;
      case "volume":
        commit({ soundVolume: command.volume });
        return true;
      case "caret":
        commit({ caretStyle: command.caret });
        return true;
      case "font":
        commit({ fontSize: clampFontSize(command.fontSize) });
        return true;
      case "numerals":
        commit({ numerals: command.numerals });
        return true;
      case "stopOnError":
        commit({ stopOnError: command.stopOnError });
        return true;
      case "confidence":
        commit({ confidenceMode: command.confidence });
        return true;
      case "quickRestart":
        commit({ quickRestart: command.quickRestart });
        return true;
      case "typos":
        commit({ indicateTypos: command.indicateTypos });
        return true;
      case "wordHistory":
        commit({ wordHistory: command.history });
        return true;
      case "blind":
        commit({ blindMode: command.blindMode });
        return true;
      case "focus":
        commit({ focusMode: command.focusMode });
        return true;
      case "liveWpm":
        commit({ liveWpm: command.liveWpm });
        return true;
      case "hideExtra":
        commit({ hideExtraLetters: command.hideExtraLetters });
        return true;
      case "capsWarning":
        commit({ capsLockWarning: command.capsLockWarning });
        return true;
      default:
        return false;
    }
  };

  const onLineSubmit = () => {
    const command = parseCommand(line);
    if (command === null || !execute(command)) {
      setError(t("command.unknown"));
      return;
    }
    close();
  };

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [];

    // Test type.
    for (const minutes of [1, 3, 5, 10] as const) {
      list.push({
        id: `time-${minutes}`,
        group: "test",
        label: `${t("command.time")} · ${minutes}m`,
        run: () => emitRunCommand({ kind: "run", name: "time", durationMs: minutes * 60_000 }),
      });
    }
    list.push({
      id: "time-infinite",
      group: "test",
      label: `${t("command.time")} · ∞`,
      run: () => emitRunCommand({ kind: "run", name: "time", durationMs: null }),
    });

    for (const goal of [10, 25, 50, 100] as const) {
      list.push({
        id: `words-${goal}`,
        group: "test",
        label: `${t("command.words")} · ${goal}`,
        run: () => emitRunCommand({ kind: "run", name: "words", goal }),
      });
    }
    list.push({
      id: "words-infinite",
      group: "test",
      label: `${t("command.words")} · ∞`,
      run: () => emitRunCommand({ kind: "run", name: "words", goal: null }),
    });

    // Funbox.
    for (const funbox of funboxModes) {
      list.push({
        id: `funbox-${funbox}`,
        group: "test",
        label: `${t("command.funbox")} · ${t(`command.funbox.${funbox}`)}`,
        hint: funbox === settings.funbox ? t("command.current") : undefined,
        run: () => commit({ funbox }),
      });
    }

    // Run control.
    list.push({
      id: "restart",
      group: "run",
      label: t("practice.restart"),
      run: () => emitRunCommand({ kind: "run", name: "restart" }),
    });
    list.push({
      id: "next",
      group: "run",
      label: t("practice.nextText"),
      run: () => emitRunCommand({ kind: "run", name: "next" }),
    });
    list.push({
      id: "end",
      group: "run",
      label: t("practice.endTest"),
      run: () => emitRunCommand({ kind: "run", name: "end" }),
    });
    list.push({
      id: "weak",
      group: "run",
      label: t("practice.weakDrill"),
      run: () => emitRunCommand({ kind: "run", name: "weak" }),
    });
    list.push({
      id: "custom",
      group: "run",
      label: t("custom.open"),
      run: () => emitRunCommand({ kind: "run", name: "custom" }),
    });

    // Appearance toggles.
    list.push({
      id: "blind",
      group: "appearance",
      label: `${t("settings.blindMode")} · ${settings.blindMode ? t("command.on") : t("command.off")}`,
      run: () => commit({ blindMode: !settings.blindMode }),
    });
    list.push({
      id: "focus",
      group: "appearance",
      label: `${t("settings.focusMode")} · ${settings.focusMode ? t("command.on") : t("command.off")}`,
      run: () => commit({ focusMode: !settings.focusMode }),
    });
    list.push({
      id: "liveWpm",
      group: "appearance",
      label: `${t("settings.liveWpm")} · ${settings.liveWpm ? t("command.on") : t("command.off")}`,
      run: () => commit({ liveWpm: !settings.liveWpm }),
    });
    list.push({
      id: "numerals",
      group: "appearance",
      label: `${t("settings.numerals")} · ${
        settings.numerals === "bengali" ? t("settings.numerals.bengali") : t("settings.numerals.latin")
      }`,
      run: () => commit({ numerals: settings.numerals === "bengali" ? "latin" : "bengali" }),
    });
    for (const caret of ["bar", "underline", "off"] as const) {
      list.push({
        id: `caret-${caret}`,
        group: "appearance",
        label: `${t("settings.caretStyle")} · ${t(`settings.caretStyle.${caret}`)}`,
        run: () => commit({ caretStyle: caret }),
      });
    }

    // Themes: every match for what has been typed, plus a short default list.
    const themeMatches = searchThemes(query, "all");
    const themeRows = query.trim().length > 0 ? themeMatches.slice(0, 12) : themeMatches.slice(0, 4);
    for (const theme of themeRows) {
      list.push({
        id: `theme-${theme.id}`,
        group: "theme",
        label: themeLabel(theme),
        hint: settings.theme === theme.id ? t("command.current") : undefined,
        run: () => commit({ theme: theme.id }),
      });
    }
    list.push({
      id: "theme-system",
      group: "theme",
      label: t("theme.system"),
      run: () => commit({ theme: "system" }),
    });

    // Navigation.
    for (const path of ["/", "/lessons", "/progress", "/privacy"] as const) {
      list.push({
        id: `go-${path}`,
        group: "go",
        label:
          path === "/"
            ? t("nav.practice")
            : path === "/lessons"
              ? t("nav.lessons")
              : path === "/progress"
                ? t("nav.progress")
                : t("nav.privacy"),
        run: () => window.location.assign(localizePath(path, lang)),
      });
    }

    // Language.
    const other: Lang = lang === "bn" ? "en" : "bn";
    list.push({
      id: "lang",
      group: "go",
      label: `${t("nav.language")} · ${languageLabel(other)}`,
      run: () => window.location.assign(mirrorPath(window.location.pathname, other)),
    });

    return list;
  }, [query, settings, lang, t]);

  const filtered = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return entries;
    return entries.filter((entry) => {
      const haystack = `${entry.id} ${entry.label}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [entries, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const choose = (index: number) => {
    const entry = filtered[index];
    if (entry === undefined) return;
    entry.run();
    close();
  };

  const onPanelKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (mode === "line") return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(filtered.length - 1, current + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      choose(active);
    }
  };

  const totalThemes = allThemes.length;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => {
          setError(null);
          setMode("palette");
        }}
        class="inline-flex size-10 items-center justify-center rounded-control text-muted transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-text"
        aria-label={t("command.open")}
        aria-haspopup="dialog"
        aria-expanded={mode !== "closed"}
        title={t("command.open")}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m5 8 3 4-3 4" />
          <path d="M12 16h7" />
          <rect x="2" y="3" width="20" height="18" rx="2" />
        </svg>
      </button>

      {mode !== "closed" && (
        <div class="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
          <div
            class="absolute inset-0"
            style="background-color: var(--overlay)"
            onClick={close}
            aria-hidden="true"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={mode === "palette" ? t("command.open") : t("command.line")}
            onKeyDown={onPanelKeyDown}
            class="relative w-full max-w-xl overflow-hidden rounded-card border border-border-strong bg-bg"
          >
            {mode === "palette" ? (
              <input
                ref={inputRef}
                type="text"
                value={query}
                onInput={(event) => setQuery(event.currentTarget.value)}
                placeholder={t("command.placeholder")}
                aria-label={t("command.placeholder")}
                class="w-full border-0 border-b border-border bg-transparent px-4 py-3 text-sm text-text outline-none"
              />
            ) : (
              <div class="flex items-center gap-2 border-b border-border px-4 py-3">
                <span class="font-mono text-sm text-accent" aria-hidden="true">
                  &gt;
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={line}
                  onInput={(event) => {
                    setLine(event.currentTarget.value);
                    setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onLineSubmit();
                    }
                  }}
                  placeholder={t("command.linePlaceholder")}
                  aria-label={t("command.line")}
                  autocomplete="off"
                  spellcheck={false}
                  class="w-full border-0 bg-transparent font-mono text-sm text-text outline-none"
                />
              </div>
            )}

            {mode === "palette" && (
              <ul class="max-h-[52vh] overflow-y-auto py-1">
                {filtered.length === 0 && (
                  <li class="px-4 py-3 text-sm text-muted">{t("command.empty")}</li>
                )}
                {filtered.map((entry, index) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(index)}
                      class={`flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm transition-colors duration-100 ease-out ${
                        index === active ? "bg-accent-soft text-text" : "text-muted hover:bg-surface-2"
                      }`}
                    >
                      <span class="truncate">{entry.label}</span>
                      <span class="flex shrink-0 items-center gap-2">
                        {entry.hint !== undefined && (
                          <span class="text-[0.65rem] uppercase tracking-wide text-accent">
                            {entry.hint}
                          </span>
                        )}
                        <span class="text-[0.65rem] uppercase tracking-wide text-muted/70">
                          {entry.group}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {mode === "line" && (
              <div class="px-4 py-3 text-xs leading-relaxed text-muted">
                <p>{t("command.lineExamples")}</p>
                <p class="mt-1 font-mono text-text">
                  theme dracula · time 60 · words 25 · funbox numbers · goto progress
                </p>
                {error !== null && (
                  <p role="status" class="mt-2 text-wrong">
                    {error}
                  </p>
                )}
              </div>
            )}

            <div class="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-[0.7rem] text-muted">
              <span>
                <kbd class="keycap">Ctrl</kbd> <kbd class="keycap">K</kbd> {t("command.hintPalette")}
              </span>
              <span>
                <kbd class="keycap">Ctrl</kbd> <kbd class="keycap">/</kbd>{" "}
                {t("command.hintLine")}
              </span>
              <span>
                {totalThemes} {t("command.themes")}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
