import { useEffect, useRef, useState } from "preact/hooks";

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
  type Settings,
  type ThemeChoice,
} from "../lib/settings";

interface Props {
  lang: Lang;
}

const THEMES: readonly ThemeChoice[] = ["light", "dark", "system"];

function ThemeIcon({ theme }: { theme: ThemeChoice }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.7",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  } as const;

  if (theme === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
      </svg>
    );
  }

  if (theme === "dark") {
    return (
      <svg {...common}>
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M8 20h8M12 17v3" />
    </svg>
  );
}

export default function SiteControls({ lang }: Props) {
  const t = useTranslations(lang);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [open, setOpen] = useState(false);
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

  const cycleTheme = () => {
    const index = THEMES.indexOf(settings.theme);
    commit({ theme: THEMES[(index + 1) % THEMES.length] });
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={cycleTheme}
        class="inline-flex size-10 items-center justify-center rounded-control text-muted transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-text"
        aria-label={`${t("a11y.themeToggle")} — ${t(`theme.${settings.theme}`)}`}
        title={`${t("nav.theme")}: ${t(`theme.${settings.theme}`)}`}
      >
        <ThemeIcon theme={settings.theme} />
      </button>

      <button
        type="button"
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
            class="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto border-l border-border bg-surface p-6 shadow-xl outline-none"
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

            {!storageAvailable && (
              <p class="mt-4 rounded-control border border-accent-2/40 bg-surface-2 p-3 text-xs text-muted">
                {t("settings.storageUnavailable")}
              </p>
            )}

            {/* Input mode */}
            <section class="mt-6">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">
                {t("settings.inputMode")}
              </h3>
              <div role="radiogroup" aria-label={t("settings.inputMode")} class="mt-3 grid gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={settings.inputMode === "system"}
                  onClick={() => commit({ inputMode: "system" })}
                  class={`rounded-card border p-3 text-left transition-colors duration-150 ease-out ${
                    settings.inputMode === "system"
                      ? "border-accent bg-accent-soft"
                      : "border-border hover:bg-surface-2"
                  }`}
                >
                  <span class="block text-sm font-medium text-text">
                    {t("practice.mode.system")}
                  </span>
                  <span class="mt-1 block text-xs text-muted">
                    {t("practice.mode.systemHint")}
                  </span>
                </button>

                {/*
                  Built-in mode is a preview, not a default: its grammar is ours
                  and no native speaker has signed off the rules yet, so the
                  warning is part of the option rather than a footnote.
                */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={settings.inputMode === "avro-phonetic"}
                  onClick={() => commit({ inputMode: "avro-phonetic" })}
                  class={`rounded-card border p-3 text-left transition-colors duration-150 ease-out ${
                    settings.inputMode === "avro-phonetic"
                      ? "border-accent bg-accent-soft"
                      : "border-border hover:bg-surface-2"
                  }`}
                >
                  <span class="flex items-center gap-2 text-sm font-medium text-text">
                    {t("practice.mode.builtin")}
                    <span class="rounded-pill bg-surface-2 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-muted">
                      {t("practice.mode.preview")}
                    </span>
                  </span>
                  <span class="mt-1 block text-xs text-muted">
                    {t("practice.mode.builtinHint")}
                  </span>
                  <span class="mt-2 block text-xs text-accent-2">
                    {t("practice.mode.builtinWarning")}
                  </span>
                </button>
              </div>
            </section>

            {/* Theme */}
            <section class="mt-6">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">
                {t("settings.theme")}
              </h3>
              <div class="mt-3 grid grid-cols-3 gap-2">
                {THEMES.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    aria-pressed={settings.theme === theme}
                    onClick={() => commit({ theme })}
                    class={`flex flex-col items-center gap-1.5 rounded-card border p-3 text-xs font-medium transition-colors duration-150 ease-out ${
                      settings.theme === theme
                        ? "border-accent bg-accent-soft text-text"
                        : "border-border text-muted hover:bg-surface-2 hover:text-text"
                    }`}
                  >
                    <ThemeIcon theme={theme} />
                    {t(`theme.${theme}`)}
                  </button>
                ))}
              </div>
            </section>

            {/* Text size */}
            <section class="mt-6">
              <div class="flex items-baseline justify-between">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("settings.fontSize")}
                </h3>
                <span class="text-xs tabular-nums text-muted">{settings.fontSize}px</span>
              </div>
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
                class="mt-3 w-full accent-accent"
              />
            </section>

            {/* Data */}
            <section class="mt-6 border-t border-border pt-5">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">
                {t("settings.data")}
              </h3>
              <p class="mt-2 text-xs leading-relaxed text-muted">{t("settings.dataNote")}</p>
              <a
                href={localizePath("/progress", lang)}
                class="mt-3 inline-block text-xs font-medium text-accent hover:underline"
              >
                {t("settings.openProgress")}
              </a>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
