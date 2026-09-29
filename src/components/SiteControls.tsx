import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { localizePath, useTranslations, type Lang } from "../i18n";
import {
  loadAndApplySettings,
  setOverlayOpen,
  updateSettings,
  watchSystemTheme,
} from "../lib/applySettings";
import { funboxModes } from "../lib/funbox";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  MIN_ACCURACY_CHOICES,
  MIN_WPM_CHOICES,
  SOUND_VOLUME_MAX,
  SOUND_VOLUME_MIN,
  clampFontSize,
  defaultSettings,
  type CaretStyle,
  type Settings,
  type StopOnError,
} from "../lib/settings";
import {
  exportTheme,
  getTheme,
  searchThemes,
  themeCategories,
  themeLabel,
  allThemes,
  type ThemeCategory,
} from "../lib/themes";

interface Props {
  lang: Lang;
}

type Tab = "behavior" | "appearance" | "theme" | "data";

const STOP_ON_ERROR_OPTIONS: readonly StopOnError[] = ["off", "letter", "word"];
const CARET_STYLES: readonly CaretStyle[] = ["bar", "underline", "off"];
const CONFIDENCE_OPTIONS = ["off", "on", "max"] as const;
const QUICK_RESTART_OPTIONS = ["off", "esc", "tab", "enter"] as const;
const INDICATE_OPTIONS = ["off", "below", "replace"] as const;
const HISTORY_OPTIONS = ["off", "recent", "always"] as const;
const SOUND_OPTIONS = ["off", "click", "error", "both"] as const;

/** One labelled row: explanation on the left, control on the right. */
function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: preact.ComponentChildren;
}) {
  return (
    <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-b border-border py-4 last:border-b-0">
      <div class="min-w-0 max-w-md flex-1">
        <h4 class="text-sm font-semibold text-text">{label}</h4>
        {hint !== undefined && <p class="mt-1 text-xs leading-relaxed text-muted">{hint}</p>}
      </div>
      <div class="shrink-0">{children}</div>
    </div>
  );
}

/** A segmented control, monkeytype-style: the active segment is filled. */
function Segmented<T extends string | number>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T;
  options: readonly T[];
  labels: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    <div role="radiogroup" class="flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          class={`rounded-control px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out ${
            value === option
              ? "bg-accent text-on-accent"
              : "bg-surface-2 text-muted hover:text-text"
          }`}
        >
          {labels(option)}
        </button>
      ))}
    </div>
  );
}

/** A plain on/off switch. Its labels are translated, like every other control. */
function Switch({
  value,
  label,
  offLabel,
  onLabel,
  onChange,
}: {
  value: boolean;
  label: string;
  offLabel: string;
  onLabel: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} class="flex gap-1">
      <button
        type="button"
        role="radio"
        aria-checked={value === false}
        onClick={() => onChange(false)}
        class={`rounded-control px-4 py-1.5 text-xs font-medium transition-colors duration-150 ease-out ${
          value === false ? "bg-accent text-on-accent" : "bg-surface-2 text-muted hover:text-text"
        }`}
      >
        {offLabel}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === true}
        onClick={() => onChange(true)}
        class={`rounded-control px-4 py-1.5 text-xs font-medium transition-colors duration-150 ease-out ${
          value === true ? "bg-accent text-on-accent" : "bg-surface-2 text-muted hover:text-text"
        }`}
      >
        {onLabel}
      </button>
    </div>
  );
}

export default function SiteControls({ lang }: Props) {
  const t = useTranslations(lang);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("behavior");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ThemeCategory>("all");
  const [storageAvailable, setStorageAvailable] = useState(true);

  const settingsRef = useRef(settings);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    setSettings(loadAndApplySettings());
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => watchSystemTheme(() => settingsRef.current), []);

  useEffect(() => {
    setOverlayOpen("settings", open);
    return () => setOverlayOpen("settings", false);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (open) panelRef.current?.focus();
    else triggerRef.current?.focus();
  }, [open]);

  const commit = (patch: Partial<Settings>) => {
    const next: Settings = { ...settings, ...patch };
    setSettings(next);
    setStorageAvailable(updateSettings(next));
  };

  const toggleFavourite = (id: string) => {
    const favourites = settings.themeFavourites;
    commit({
      themeFavourites: favourites.includes(id)
        ? favourites.filter((entry) => entry !== id)
        : [...favourites, id],
    });
  };

  const filteredThemes = useMemo(
    () => searchThemes(query, category, settings.themeFavourites),
    [query, category, settings.themeFavourites],
  );

  const notOff = (value: number) => (value === 0 ? t("settings.disabled") : String(value));

  const exportCurrentTheme = () => {
    if (settings.theme === "system") return;

    const blob = new Blob([exportTheme(getTheme(settings.theme))], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `type-kori-theme-${settings.theme}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const themeTabs: readonly { id: Tab; label: string }[] = [
    { id: "behavior", label: t("settings.tab.behavior") },
    { id: "appearance", label: t("settings.tab.appearance") },
    { id: "theme", label: t("settings.tab.theme") },
    { id: "data", label: t("settings.tab.danger") },
  ];

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen(true)}
        class="inline-flex size-10 items-center justify-center rounded-control text-muted transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-text"
        aria-label={t("nav.settings")}
        aria-expanded={open}
        title={t("nav.settings")}
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
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4Z" />
        </svg>
      </button>

      {open && (
        <div class="fixed inset-0 z-40">
          <div
            class="absolute inset-0"
            style="background-color: var(--overlay)"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("settings.heading")}
            tabIndex={-1}
            class="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto border-l border-border bg-bg p-6 outline-none"
          >
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-lg font-semibold text-text">{t("settings.heading")}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                class="rounded-control px-3 py-1.5 text-sm font-medium text-muted transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-text"
              >
                {t("settings.close")}
              </button>
            </div>

            {/* Tabs */}
            <div role="tablist" class="mt-4 flex flex-wrap gap-1">
              {themeTabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => setTab(item.id)}
                  class={`rounded-control px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out ${
                    tab === item.id
                      ? "bg-accent text-on-accent"
                      : "bg-surface-2 text-muted hover:text-text"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {!storageAvailable && (
              <p class="mt-4 rounded-control border border-accent-2/40 bg-surface-2 p-3 text-xs text-muted">
                {t("settings.storageUnavailable")}
              </p>
            )}

            {tab === "behavior" && (
              <div class="mt-2">
                <Row label={t("settings.difficulty")} hint={t("settings.difficultyHint")}>
                  <Segmented
                    value={settings.difficulty}
                    options={["all", "easy", "medium", "hard"] as const}
                    labels={(option) => t(`settings.difficulty.${option}`)}
                    onChange={(difficulty) => commit({ difficulty })}
                  />
                </Row>

                <Row label={t("settings.funbox")} hint={t("settings.funboxHint")}>
                  <Segmented
                    value={settings.funbox}
                    options={funboxModes}
                    labels={(option) => t(`command.funbox.${option}`)}
                    onChange={(funbox) => commit({ funbox })}
                  />
                </Row>

                <Row label={t("settings.stopOnError")} hint={t("settings.stopOnErrorHint")}>
                  <Segmented
                    value={settings.stopOnError}
                    options={STOP_ON_ERROR_OPTIONS}
                    labels={(option) => t(`settings.stopOnError.${option}`)}
                    onChange={(stopOnError) => commit({ stopOnError })}
                  />
                </Row>

                <Row label={t("settings.confidence")} hint={t("settings.confidenceHint")}>
                  <Segmented
                    value={settings.confidenceMode}
                    options={CONFIDENCE_OPTIONS}
                    labels={(option) => t(`settings.confidence.${option}`)}
                    onChange={(confidenceMode) => commit({ confidenceMode })}
                  />
                </Row>

                <Row label={t("settings.quickRestart")} hint={t("settings.quickRestartHint")}>
                  <Segmented
                    value={settings.quickRestart}
                    options={QUICK_RESTART_OPTIONS}
                    labels={(option) => t(`settings.quickRestart.${option}`)}
                    onChange={(quickRestart) => commit({ quickRestart })}
                  />
                </Row>

                <Row label={t("settings.minWpm")} hint={t("settings.minWpmHint")}>
                  <Segmented
                    value={settings.minWpm}
                    options={MIN_WPM_CHOICES}
                    labels={notOff}
                    onChange={(minWpm) => commit({ minWpm })}
                  />
                </Row>

                <Row label={t("settings.minAccuracy")} hint={t("settings.minAccuracyHint")}>
                  <Segmented
                    value={settings.minAccuracy}
                    options={MIN_ACCURACY_CHOICES}
                    labels={notOff}
                    onChange={(minAccuracy) => commit({ minAccuracy })}
                  />
                </Row>

                <Row label={t("settings.blindMode")} hint={t("settings.blindModeHint")}>
                  <Switch
                    value={settings.blindMode}
                    label={t("settings.blindMode")}
                    offLabel={t("command.off")}
                    onLabel={t("command.on")}
                    onChange={(blindMode) => commit({ blindMode })}
                  />
                </Row>

                <Row label={t("settings.liveWpm")} hint={t("settings.liveWpmHint")}>
                  <Switch
                    value={settings.liveWpm}
                    label={t("settings.liveWpm")}
                    offLabel={t("command.off")}
                    onLabel={t("command.on")}
                    onChange={(liveWpm) => commit({ liveWpm })}
                  />
                </Row>

                <Row label={t("settings.capsLockWarning")} hint={t("settings.capsLockWarningHint")}>
                  <Switch
                    value={settings.capsLockWarning}
                    label={t("settings.capsLockWarning")}
                    offLabel={t("command.off")}
                    onLabel={t("command.on")}
                    onChange={(capsLockWarning) => commit({ capsLockWarning })}
                  />
                </Row>

                <Row label={t("settings.sound")} hint={t("settings.soundHint")}>
                  <Segmented
                    value={settings.sound}
                    options={SOUND_OPTIONS}
                    labels={(option) => t(`settings.sound.${option}`)}
                    onChange={(sound) => commit({ sound })}
                  />
                </Row>

                <Row label={t("settings.soundVolume")} hint={t("settings.soundVolumeHint")}>
                  <div class="flex items-center gap-3">
                    <input
                      type="range"
                      min={SOUND_VOLUME_MIN}
                      max={SOUND_VOLUME_MAX}
                      step={5}
                      value={settings.soundVolume}
                      aria-label={t("settings.soundVolume")}
                      onInput={(event) =>
                        commit({ soundVolume: Number(event.currentTarget.value) })
                      }
                      class="w-40 accent-accent"
                    />
                    <span class="w-10 text-right text-xs tabular-nums text-muted">
                      {settings.soundVolume}
                    </span>
                  </div>
                </Row>

                <Row label={t("settings.inputMode")} hint={t("settings.inputModeHint")}>
                  <Segmented
                    value={settings.inputMode}
                    options={["system", "avro-phonetic"] as const}
                    labels={(option) =>
                      option === "system"
                        ? t("practice.mode.system")
                        : t("practice.mode.builtin")
                    }
                    onChange={(inputMode) => commit({ inputMode })}
                  />
                </Row>

                {settings.inputMode === "avro-phonetic" && (
                  <p class="mt-2 rounded-control border border-accent-2/40 bg-surface-2 p-3 text-xs text-muted">
                    {t("practice.mode.builtinWarning")}
                  </p>
                )}
              </div>
            )}

            {tab === "appearance" && (
              <div class="mt-2">
                <Row label={t("settings.fontSize")} hint={t("settings.fontSizeHint")}>
                  <div class="flex items-center gap-3">
                    <input
                      type="range"
                      min={FONT_SIZE_MIN}
                      max={FONT_SIZE_MAX}
                      step={1}
                      value={settings.fontSize}
                      aria-label={t("settings.fontSize")}
                      onInput={(event) =>
                        commit({ fontSize: clampFontSize(Number(event.currentTarget.value)) })
                      }
                      class="w-40 accent-accent"
                    />
                    <span class="w-10 text-right text-xs tabular-nums text-muted">
                      {settings.fontSize}px
                    </span>
                  </div>
                </Row>

                <Row label={t("settings.caretStyle")} hint={t("settings.caretStyleHint")}>
                  <Segmented
                    value={settings.caretStyle}
                    options={CARET_STYLES}
                    labels={(option) => t(`settings.caretStyle.${option}`)}
                    onChange={(caretStyle) => commit({ caretStyle })}
                  />
                </Row>

                <Row label={t("settings.showAllLines")} hint={t("settings.showAllLinesHint")}>
                  <Switch
                    value={settings.showAllLines}
                    label={t("settings.showAllLines")}
                    offLabel={t("command.off")}
                    onLabel={t("command.on")}
                    onChange={(showAllLines) => commit({ showAllLines })}
                  />
                </Row>

                <Row label={t("settings.indicateTypos")} hint={t("settings.indicateTyposHint")}>
                  <Segmented
                    value={settings.indicateTypos}
                    options={INDICATE_OPTIONS}
                    labels={(option) => t(`settings.indicateTypos.${option}`)}
                    onChange={(indicateTypos) => commit({ indicateTypos })}
                  />
                </Row>

                <Row
                  label={t("settings.hideExtraLetters")}
                  hint={t("settings.hideExtraLettersHint")}
                >
                  <Switch
                    value={settings.hideExtraLetters}
                    label={t("settings.hideExtraLetters")}
                    offLabel={t("command.off")}
                    onLabel={t("command.on")}
                    onChange={(hideExtraLetters) => commit({ hideExtraLetters })}
                  />
                </Row>

                <Row label={t("settings.wordHistory")} hint={t("settings.wordHistoryHint")}>
                  <Segmented
                    value={settings.wordHistory}
                    options={HISTORY_OPTIONS}
                    labels={(option) => t(`settings.wordHistory.${option}`)}
                    onChange={(wordHistory) => commit({ wordHistory })}
                  />
                </Row>

                <Row label={t("settings.focusMode")} hint={t("settings.focusModeHint")}>
                  <Switch
                    value={settings.focusMode}
                    label={t("settings.focusMode")}
                    offLabel={t("command.off")}
                    onLabel={t("command.on")}
                    onChange={(focusMode) => commit({ focusMode })}
                  />
                </Row>

                <Row label={t("settings.numerals")} hint={t("settings.numeralsHint")}>
                  <Segmented
                    value={settings.numerals}
                    options={["latin", "bengali"] as const}
                    labels={(option) => t(`settings.numerals.${option}`)}
                    onChange={(numerals) => commit({ numerals })}
                  />
                </Row>
              </div>
            )}

            {tab === "theme" && (
              <div class="mt-2">
                <input
                  type="search"
                  value={query}
                  placeholder={t("settings.themeSearch")}
                  onInput={(event) => setQuery(event.currentTarget.value)}
                  class="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors duration-150 ease-out focus:border-accent"
                  aria-label={t("settings.themeSearch")}
                />

                <div class="mt-2 flex flex-wrap items-center gap-1">
                  {themeCategories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={category === item}
                      onClick={() => setCategory(item)}
                      class={`rounded-pill px-2.5 py-1 text-[0.7rem] font-medium transition-colors duration-150 ease-out ${
                        category === item
                          ? "bg-accent-soft text-text"
                          : "bg-surface-2 text-muted hover:text-text"
                      }`}
                    >
                      {t(`settings.themeCategory.${item}`)}
                    </button>
                  ))}

                  <span class="ms-auto text-[0.7rem] tabular-nums text-muted">
                    {filteredThemes.length}/{allThemes.length}
                  </span>
                </div>

                <ul class="mt-3 grid gap-1">
                  <li class="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => commit({ theme: "system" })}
                      aria-pressed={settings.theme === "system"}
                      class={`flex flex-1 items-center justify-between rounded-control px-3 py-2 text-left text-sm transition-colors duration-150 ease-out ${
                        settings.theme === "system"
                          ? "bg-accent-soft text-text"
                          : "text-muted hover:bg-surface-2 hover:text-text"
                      }`}
                    >
                      {t("theme.system")}
                      <span class="flex gap-1">
                        <span class="size-3.5 rounded-full border border-border" style="background:#fafaf9" />
                        <span class="size-3.5 rounded-full border border-border" style="background:#2c2e31" />
                      </span>
                    </button>
                    <span class="size-8" aria-hidden="true" />
                  </li>

                  {filteredThemes.map((theme) => {
                    const favourite = settings.themeFavourites.includes(theme.id);

                    return (
                      <li key={theme.id} class="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => commit({ theme: theme.id })}
                          aria-pressed={settings.theme === theme.id}
                          class={`flex flex-1 items-center justify-between gap-3 rounded-control px-3 py-2 text-left text-sm transition-colors duration-150 ease-out ${
                            settings.theme === theme.id
                              ? "bg-accent-soft text-text"
                              : "text-muted hover:bg-surface-2 hover:text-text"
                          }`}
                        >
                          <span class="truncate">{themeLabel(theme)}</span>
                          <span class="flex shrink-0 gap-1">
                            <span class="size-3.5 rounded-full border border-border" style={`background:${theme.bg}`} />
                            <span class="size-3.5 rounded-full border border-border" style={`background:${theme.text}`} />
                            <span class="size-3.5 rounded-full border border-border" style={`background:${theme.accent}`} />
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleFavourite(theme.id)}
                          aria-pressed={favourite}
                          aria-label={
                            favourite ? t("settings.themeUnfavourite") : t("settings.themeFavourite")
                          }
                          title={
                            favourite ? t("settings.themeUnfavourite") : t("settings.themeFavourite")
                          }
                          class={`inline-flex size-8 shrink-0 items-center justify-center rounded-control text-sm transition-colors duration-150 ease-out hover:bg-surface-2 ${
                            favourite ? "text-accent" : "text-muted/60 hover:text-text"
                          }`}
                        >
                          {favourite ? "★" : "☆"}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={exportCurrentTheme}
                    disabled={settings.theme === "system"}
                    class="rounded-control bg-surface-2 px-3 py-1.5 text-xs font-medium text-text transition-colors duration-150 ease-out hover:bg-accent hover:text-on-accent disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("settings.themeExport")}
                  </button>
                  <span class="text-xs text-muted">{t("settings.themeNote")}</span>
                </div>
              </div>
            )}

            {tab === "data" && (
              <div class="mt-2">
                <Row label={t("settings.data")} hint={t("settings.dataNote")}>
                  <a
                    href={localizePath("/progress", lang)}
                    class="rounded-control bg-surface-2 px-3 py-1.5 text-xs font-medium text-text transition-colors duration-150 ease-out hover:bg-accent hover:text-on-accent"
                  >
                    {t("settings.openProgress")}
                  </a>
                </Row>

                <Row label={t("settings.commandHint")} hint={t("settings.commandHintBody")}>
                  <kbd class="keycap">Ctrl</kbd>
                </Row>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
