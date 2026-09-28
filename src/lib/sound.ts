/**
 * Keystroke feedback, synthesised with the WebAudio API. No audio files, no
 * requests: each sound is a few milliseconds of oscillator. Created lazily on
 * the first keystroke because browsers refuse `AudioContext` before a user
 * gesture.
 */

export type SoundKind = "click" | "error";

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (context === null) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor === undefined) return null;
    try {
      context = new Ctor();
    } catch {
      return null;
    }
  }

  // Autoplay policies suspend the context until a gesture; resume optimistically.
  if (context.state === "suspended") void context.resume().catch(() => undefined);

  return context;
}

function blip(kind: SoundKind): void {
  const ctx = audioContext();
  if (ctx === null) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.value = kind === "click" ? 620 : 190;
  gain.gain.setValueAtTime(kind === "click" ? 0.015 : 0.03, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "click" ? 0.03 : 0.08));

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

export function playSound(kind: SoundKind): void {
  try {
    blip(kind);
  } catch {
    // Sound is cosmetic; never let it break typing.
  }
}
