import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { localizePath, useTranslations, type Lang } from "../i18n";
import {
  loadAndApplySettings,
  setDrawerOpen,
  updateSettings,
  watchSystemTheme,
} from "../lib/applySettings";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  clampFontSize,
  defaultSettings,
  type CaretStyle,
  type Settings,
  type StopOnError,
} from "../lib/settings";
import { themes } from "../lib/themes";

interface Props {
  lang: Lang;
}

type Tab = "behavior" | "appearance" | "theme" | "danger";

const STOP_ON_ERROR_OPTIONS: readonly StopOnError[] = ["off", "letter", "word"];
const CARET_STYLES: readonly CaretStyle[] = ["bar", "underline", "off"];

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
function Segmented<T extends string>({
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
          key={option}
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

/** A plain on/off switch. */
function Switch({
  value,
  label,
  onChange,
}: {
  value: boolean;
  label: string;
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
        off
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
        on
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
    setDrawerOpen(open);
    return () => setDrawerOpen(false);
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

  const filteredThemes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return themes;
    return themes.filter((theme) => theme.id.includes(q));
  }, [query]);

  const themeTabs: readonly { id: Tab; label: string }[] = [
    { id: "behavior", label: t("settings.tab.behavior") },
    { id: "appearance", label: t("settings.tab.appearance") },
    { id: "theme", label: t("settings.tab.theme") },
    { id: "danger", label: t("settings.tab.danger") },
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

                <Row label={t("settings.stopOnError")} hint={t("settings.stopOnErrorHint")}>
                  <Segmented
                    value={settings.stopOnError}
                    options={STOP_ON_ERROR_OPTIONS}
                    labels={(option) => t(`settings.stopOnError.${option}`)}
                    onChange={(stopOnError) => commit({ stopOnError })}
                  />
                </Row>

                <Row label={t("settings.blindMode")} hint={t("settings.blindModeHint")}>
                  <Switch
                    value={settings.blindMode}
                    label={t("settings.blindMode")}
                    onChange={(blindMode) => commit({ blindMode })}
                  />
                </Row>

                <Row label={t("settings.liveWpm")} hint={t("settings.liveWpmHint")}>
                  <Switch
                    value={settings.liveWpm}
                    label={t("settings.liveWpm")}
                    onChange={(liveWpm) => commit({ liveWpm })}
                  />
                </Row>

                <Row label={t("settings.sound")} hint={t("settings.soundHint")}>
                  <Segmented
                    value={settings.sound}
                    options={["off", "click", "error", "both"] as const}
                    labels={(option) => t(`settings.sound.${option}`)}
                    onChange={(sound) => commit({ sound })}
                  />
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
                    onChange={(showAllLines) => commit({ showAllLines })}
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

                <ul class="mt-3 grid gap-1">
                  <li>
                    <button
                      type="button"
                      onClick={() => commit({ theme: "system" })}
                      aria-pressed={settings.theme === "system"}
                      class={`flex w-full items-center justify-between rounded-control px-3 py-2 text-left text-sm transition-colors duration-150 ease-out ${
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
                  </li>

                  {filteredThemes.map((theme) => (
                    <li key={theme.id}>
                      <button
                        type="button"
                        onClick={() => commit({ theme: theme.id })}
                        aria-pressed={settings.theme === theme.id}
                        class={`flex w-full items-center justify-between rounded-control px-3 py-2 text-left text-sm transition-colors duration-150 ease-out ${
                          settings.theme === theme.id
                            ? "bg-accent-soft text-text"
                            : "text-muted hover:bg-surface-2 hover:text-text"
                        }`}
                      >
                        {theme.id}
                        <span class="flex gap-1">
                          <span class="size-3.5 rounded-full border border-border" style={`background:${theme.bg}`} />
                          <span class="size-3.5 rounded-full border border-border" style={`background:${theme.text}`} />
                          <span class="size-3.5 rounded-full border border-border" style={`background:${theme.accent}`} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === "danger" && (
              <div class="mt-2">
                <Row label={t("settings.data")} hint={t("settings.dataNote")}>
                  <a
                    href={localizePath("/progress", lang)}
                    class="rounded-control bg-surface-2 px-3 py-1.5 text-xs font-medium text-text transition-colors duration-150 ease-out hover:bg-accent hover:text-on-accent"
                  >
                    {t("settings.openProgress")}
                  </a>
                </Row>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
