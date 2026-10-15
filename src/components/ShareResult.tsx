import { useState } from "preact/hooks";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  drawResultCard,
  resultCardFilename,
  type CardContext,
  type CardPalette,
  type ResultCardData,
} from "../lib/shareCard";

interface Props {
  data: ResultCardData;
  label: string;
}

/** The four colours the card needs, read from the live theme. */
function readPalette(): CardPalette {
  if (typeof getComputedStyle !== "function") {
    return {
      bg: "#2c2e31",
      surface: "#323437",
      text: "#d1d0c9",
      muted: "#646669",
      accent: "#e2b714",
      wrong: "#ca4754",
    };
  }

  const style = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;

  return {
    bg: get("--bg", "#2c2e31"),
    surface: get("--surface", "#323437"),
    text: get("--text", "#d1d0c9"),
    muted: get("--muted", "#646669"),
    accent: get("--accent", "#e2b714"),
    wrong: get("--wrong", "#ca4754"),
  };
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

/**
 * Draw the finished run as a PNG and hand it to the user: the OS share sheet
 * where the browser supports files, a plain download otherwise. Nothing leaves
 * the device — the canvas is painted locally and given straight to the user.
 */
export default function ShareResult({ data, label }: Props) {
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (busy || typeof document === "undefined") return;
    setBusy(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      const context = canvas.getContext("2d");
      if (context === null) return;

      drawResultCard(context as unknown as CardContext, data, readPalette());

      const blob = await toBlob(canvas);
      if (blob === null) return;

      const file = new File([blob], resultCardFilename(data), { type: "image/png" });
      const shareData: ShareData = { files: [file], title: "Type Kori" };

      // The OS share sheet where the browser can take a file; a plain download
      // otherwise. `canShare` is missing on browsers that can only share links.
      if (typeof navigator.share === "function" && (navigator.canShare?.(shareData) ?? true)) {
        await navigator.share(shareData);
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      // Sharing is a bonus; a refused share sheet must never break the results.
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      class="rounded-control border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
