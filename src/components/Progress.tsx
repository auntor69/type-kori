import { useEffect, useMemo, useState } from "preact/hooks";

import { formatDuration } from "../engine/metrics";
import { localizePath, useTranslations, type Lang } from "../i18n";
import { earnedCount, evaluateBadges, currentStreak, longestStreak } from "../lib/badges";
import { parseTestType } from "../lib/run";
import {
  applyBackup,
  averageAccuracy,
  backupFileName,
  bestWpm,
  clusterHeat,
  createBackup,
  loadErrorMap,
  loadLessonProgress,
  loadRuns,
  mostMissed,
  parseBackupText,
  personalBests,
  resetAll,
  totalTypingMs,
  wpmSeries,
  type ErrorMap,
  type LessonProgressMap,
  type RunRecord,
} from "../lib/progress";

interface Props {
  lang: Lang;
}

/** How many runs the table shows before the page would get long. */
const HISTORY_ROWS = 20;

const BASE_BUTTON = "rounded-control px-4 py-2 text-sm transition-colors duration-150 ease-out";
const PRIMARY_BUTTON = `${BASE_BUTTON} bg-accent font-semibold text-on-accent hover:opacity-90`;
const SECONDARY_BUTTON = `${BASE_BUTTON} border border-border bg-surface font-medium text-text hover:bg-surface-2`;
const DANGER_BUTTON = `${BASE_BUTTON} bg-accent-2 font-semibold text-on-accent hover:opacity-90`;

/** A total, not a single run: `2h 14m`, `14m`, `48s`. */
function formatTotal(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes >= 60) return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  if (totalMinutes > 0) return `${totalMinutes}m`;
  return `${Math.round(ms / 1000)}s`;
}

/**
 * A single `time` test, stored in whole seconds: `1m`, `5m`, `30s`. Minutes are
 * used only when they divide exactly, so a 90-second test never reads as `1m`.
 */
function formatTestSeconds(seconds: number): string {
  return seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60}m` : `${seconds}s`;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div class="rounded-card border border-border bg-surface p-4">
      <div class="text-2xl font-semibold tabular-nums leading-none text-text">{value}</div>
      <div class="mt-1.5 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

/**
 * The speed trend, drawn by hand: a polyline is a handful of bytes and needs no
 * chart library (Section 12's budget).
 */
function TrendChart({ points, label, note }: { points: number[]; label: string; note: string }) {
  const width = 320;
  const height = 96;
  const pad = 8;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;

  const coordinates = points.map((value, index) => ({
    x: pad + index * step,
    y: height - pad - (value / max) * (height - pad * 2),
  }));

  return (
    <figure class="mt-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}. ${note}`}
        class="h-24 w-full"
      >
        <polyline
          points={coordinates.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}
          fill="none"
          stroke="var(--accent)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        {coordinates.map((point) => (
          <circle key={point.x} cx={point.x} cy={point.y} r="2.5" fill="var(--accent)" />
        ))}
      </svg>
      <figcaption class="mt-1 text-xs text-muted">{note}</figcaption>
    </figure>
  );
}

export default function Progress({ lang }: Props) {
  const t = useTranslations(lang);

  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [errorMap, setErrorMap] = useState<ErrorMap>({});
  const [lessons, setLessons] = useState<LessonProgressMap>({});
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // The stored data only exists in the browser, so it is read after mount: the
  // prerendered page and the first client render then agree.
  useEffect(() => {
    setRuns(loadRuns());
    setErrorMap(loadErrorMap());
    setLessons(loadLessonProgress());
    setReady(true);
  }, []);

  const missed = useMemo(() => mostMissed(errorMap), [errorMap]);
  const heat = useMemo(() => clusterHeat(errorMap), [errorMap]);
  const points = useMemo(() => wpmSeries(runs), [runs]);
  const bests = useMemo(() => personalBests(runs), [runs]);
  const badges = useMemo(() => evaluateBadges({ runs, lessons }), [runs, lessons]);
  const streak = useMemo(() => currentStreak(runs), [runs]);
  const bestStreak = useMemo(() => longestStreak(runs), [runs]);
  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    [lang],
  );

  const exportAll = () => {
    const backup = createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = backupFileName(backup.exportedAt);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const importFile = async (file: File | undefined) => {
    if (file === undefined) return;

    const backup = parseBackupText(await file.text());
    if (backup === null) {
      setMessage("progress.importFailed");
      return;
    }

    applyBackup(backup);
    setRuns(loadRuns());
    setErrorMap(loadErrorMap());
    setLessons(loadLessonProgress());
    setMessage("progress.importOk");
  };

  const onPickFile = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    // Clear the field so picking the same file twice still fires a change event.
    input.value = "";
    void importFile(file);
  };

  // Reset is a two-step action rather than a browser confirm, so it stays inside
  // the page and can be announced to assistive technology.
  const reset = () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      setMessage(null);
      return;
    }

    resetAll();
    setRuns([]);
    setErrorMap({});
    setLessons({});
    setConfirmingReset(false);
    setMessage("progress.resetDone");
  };

  /** `time 60 · numbers` reads as বাংলা, not as the stored string. */
  const testTypeLabel = (testType: string): string => {
    const parsed = parseTestType(testType);

    const base =
      parsed.kind === "time"
        ? `${t("command.time")} ${formatTestSeconds(parsed.value ?? 0)}`
        : parsed.kind === "words"
          ? `${t("command.words")} ${parsed.value ?? 0}`
          : parsed.kind === "endless"
            ? t("progress.testType.endless")
            : parsed.kind === "unknown"
              ? t("progress.testType.unknown")
              : t(`progress.testType.${parsed.kind}`);

    return parsed.funbox === "none" ? base : `${base} · ${t(`command.funbox.${parsed.funbox}`)}`;
  };

  if (!ready) {
    return <div class="h-44 rounded-card border border-border bg-surface" aria-hidden="true" />;
  }

  return (
    <div class="grid gap-5">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label={t("progress.runs")} value={String(runs.length)} />
        <StatTile label={t("progress.bestWpm")} value={String(bestWpm(runs))} />
        <StatTile
          label={t("progress.avgAccuracy")}
          value={runs.length > 0 ? `${averageAccuracy(runs)}%` : "—"}
        />
        <StatTile label={t("progress.totalTime")} value={formatTotal(totalTypingMs(runs))} />
        <StatTile
          label={t("progress.streak")}
          value={`${streak} · ${bestStreak}`}
        />
        <StatTile
          label={t("progress.badges")}
          value={`${earnedCount(badges)}/${badges.length}`}
        />
      </div>

      {runs.length === 0 ? (
        <div class="rounded-card border border-border bg-surface p-6 text-center">
          <p class="text-sm leading-relaxed text-muted">{t("progress.empty")}</p>
          <a href={`${localizePath("/", lang)}#practice`} class={`mt-4 inline-block ${PRIMARY_BUTTON}`}>
            {t("progress.emptyCta")}
          </a>
        </div>
      ) : (
        <>
          <section
            aria-labelledby="progress-trend"
            class="rounded-card border border-border bg-surface p-5"
          >
            <h2
              id="progress-trend"
              class="text-xs font-semibold uppercase tracking-wide text-muted"
            >
              {t("progress.trend")}
            </h2>
            <TrendChart
              points={points}
              label={t("progress.trend")}
              note={t("progress.trendNote")}
            />
          </section>

          <section
            aria-labelledby="progress-bests"
            class="rounded-card border border-border bg-surface p-5"
          >
            <h2
              id="progress-bests"
              class="text-xs font-semibold uppercase tracking-wide text-muted"
            >
              {t("progress.bests")}
            </h2>

            <div class="mt-3 overflow-x-auto">
              <table class="w-full border-collapse text-sm">
                <caption class="sr-only">{t("progress.bests")}</caption>
                <thead>
                  <tr class="text-left text-xs uppercase tracking-wide text-muted">
                    <th scope="col" class="py-2 pr-4 font-semibold">
                      {t("progress.bestsTest")}
                    </th>
                    <th scope="col" class="py-2 pr-4 text-right font-semibold">
                      {t("progress.columnWpm")}
                    </th>
                    <th scope="col" class="py-2 pr-4 text-right font-semibold">
                      {t("progress.columnAccuracy")}
                    </th>
                    <th scope="col" class="py-2 text-right font-semibold">
                      {t("progress.bestsRuns")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bests.map((best) => (
                    <tr key={best.testType} class="border-t border-border">
                      <td class="py-2 pr-4 text-xs text-text">{testTypeLabel(best.testType)}</td>
                      <td class="py-2 pr-4 text-right font-medium tabular-nums text-text">
                        {best.bestWpm}
                        {best.latestWpm < best.bestWpm && (
                          <span class="ms-2 text-xs tabular-nums text-muted">
                            ({best.latestWpm})
                          </span>
                        )}
                      </td>
                      <td class="py-2 pr-4 text-right tabular-nums text-muted">
                        {best.bestAccuracy}%
                      </td>
                      <td class="py-2 text-right tabular-nums text-muted">{best.runs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section
            aria-labelledby="progress-badges"
            class="rounded-card border border-border bg-surface p-5"
          >
            <h2
              id="progress-badges"
              class="text-xs font-semibold uppercase tracking-wide text-muted"
            >
              {t("progress.badges")} · {earnedCount(badges)}/{badges.length}
            </h2>

            <ul class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((badge) => (
                <li
                  key={badge.id}
                  class={`rounded-control border px-3 py-2 ${
                    badge.earned
                      ? "border-accent/50 bg-accent-soft"
                      : "border-border bg-surface-2"
                  }`}
                >
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class={`text-sm font-medium ${
                        badge.earned ? "text-text" : "text-muted"
                      }`}
                    >
                      {t(`badge.${badge.id}`)}
                    </span>
                    <span class="text-[0.65rem] uppercase tracking-wide text-muted">
                      {t(`badge.group.${badge.group}`)}
                    </span>
                  </div>
                  <span
                    class="mt-2 block h-1 overflow-hidden rounded-pill bg-bg/40"
                    aria-hidden="true"
                  >
                    <span
                      class={`block h-full rounded-pill ${badge.earned ? "bg-accent" : "bg-muted"}`}
                      style={`width: ${Math.round(badge.progress * 100)}%`}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="progress-missed"
            class="rounded-card border border-border bg-surface p-5"
          >
            <h2
              id="progress-missed"
              class="text-xs font-semibold uppercase tracking-wide text-muted"
            >
              {t("progress.missed")}
            </h2>

            {missed.length === 0 ? (
              <p class="mt-3 text-sm text-muted">{t("progress.noMissed")}</p>
            ) : (
              <ul class="mt-4 grid gap-2">
                {missed.map((entry) => {
                  const worst = missed[0].missed;
                  const width = Math.max(6, Math.round((entry.missed / worst) * 100));

                  return (
                    <li key={entry.cluster} class="flex items-center gap-3">
                      <span lang="bn" class="font-bangla w-8 text-center text-lg text-text">
                        {entry.cluster}
                      </span>
                      <span
                        class="h-2 flex-1 overflow-hidden rounded-pill bg-surface-2"
                        aria-hidden="true"
                      >
                        <span
                          class="block h-full rounded-pill bg-accent-2"
                          style={`width: ${width}%`}
                        />
                      </span>
                      <span class="w-16 text-right text-xs tabular-nums text-muted">
                        {entry.missed}/{entry.seen}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="progress-heat"
            class="rounded-card border border-border bg-surface p-5"
          >
            <h2
              id="progress-heat"
              class="text-xs font-semibold uppercase tracking-wide text-muted"
            >
              {t("progress.heat")}
            </h2>
            <p class="mt-2 text-xs leading-relaxed text-muted">{t("progress.heatNote")}</p>

            {heat.length === 0 ? (
              <p class="mt-3 text-sm text-muted">{t("progress.noHeat")}</p>
            ) : (
              <ul class="mt-4 flex flex-wrap gap-2">
                {heat.map((entry) => (
                  <li
                    key={entry.cluster}
                    class="flex min-w-[4.5rem] flex-col items-center rounded-control border border-border px-3 py-2"
                    style={`background-color: color-mix(in oklab, var(--wrong) ${Math.round(
                      entry.rate * 60,
                    )}%, var(--surface-2))`}
                    title={`${Math.round(entry.rate * 100)}%`}
                  >
                    <span lang="bn" class="font-bangla text-lg leading-none text-text">
                      {entry.cluster}
                    </span>
                    <span class="mt-1 text-[0.65rem] tabular-nums text-muted">
                      {entry.missed}/{entry.seen}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="progress-history"
            class="rounded-card border border-border bg-surface p-5"
          >
            <h2
              id="progress-history"
              class="text-xs font-semibold uppercase tracking-wide text-muted"
            >
              {t("progress.history")}
            </h2>

            <div class="mt-3 overflow-x-auto">
              <table class="w-full border-collapse text-sm">
                <caption class="sr-only">{t("progress.history")}</caption>
                <thead>
                  <tr class="text-left text-xs uppercase tracking-wide text-muted">
                    <th scope="col" class="py-2 pr-4 font-semibold">
                      {t("progress.columnWhen")}
                    </th>
                    <th scope="col" class="py-2 pr-4 font-semibold">
                      {t("progress.columnMode")}
                    </th>
                    <th scope="col" class="py-2 pr-4 text-right font-semibold">
                      {t("progress.columnWpm")}
                    </th>
                    <th scope="col" class="py-2 pr-4 text-right font-semibold">
                      {t("progress.columnAccuracy")}
                    </th>
                    <th scope="col" class="py-2 text-right font-semibold">
                      {t("progress.columnTime")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(0, HISTORY_ROWS).map((run) => (
                    <tr key={run.id} class="border-t border-border">
                      <td class="py-2 pr-4 whitespace-nowrap text-muted">
                        {dateFormat.format(run.ts)}
                      </td>
                      <td class="py-2 pr-4 text-text">
                        {run.mode === "avro-phonetic"
                          ? t("practice.mode.builtin")
                          : t("practice.mode.system")}
                      </td>
                      <td class="py-2 pr-4 text-right font-medium tabular-nums text-text">
                        {run.wpm}
                      </td>
                      <td class="py-2 pr-4 text-right tabular-nums text-muted">
                        {run.accuracy}%
                      </td>
                      <td class="py-2 text-right tabular-nums text-muted">
                        {formatDuration(run.durationMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="progress-data" class="rounded-card border border-border bg-surface p-5">
        <h2
          id="progress-data"
          class="text-xs font-semibold uppercase tracking-wide text-muted"
        >
          {t("settings.data")}
        </h2>

        <p class="mt-2 text-xs leading-relaxed text-muted">{t("progress.exportNote")}</p>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportAll} class={PRIMARY_BUTTON}>
            {t("progress.export")}
          </button>

          <label class={`cursor-pointer ${SECONDARY_BUTTON}`}>
            {t("progress.import")}
            <input
              type="file"
              accept="application/json,.json"
              class="sr-only"
              onChange={onPickFile}
            />
          </label>

          {confirmingReset ? (
            <>
              <button type="button" onClick={reset} class={DANGER_BUTTON}>
                {t("progress.resetConfirm")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                class={SECONDARY_BUTTON}
              >
                {t("progress.cancel")}
              </button>
            </>
          ) : (
            <button type="button" onClick={reset} class={SECONDARY_BUTTON}>
              {t("progress.reset")}
            </button>
          )}
        </div>

        <p class="mt-3 text-xs leading-relaxed text-muted">{t("progress.importNote")}</p>

        {message !== null && (
          <p role="status" class="mt-3 text-sm text-text">
            {t(message)}
          </p>
        )}
      </section>
    </div>
  );
}
