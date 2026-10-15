import { h, hydrate, type Attributes, type ComponentType } from "preact";

/**
 * Deferred island hydration: the server-rendered markup *is* the page, and the
 * component's modules join it at the first interaction instead of at load.
 *
 * On load the page holds nothing but HTML — no component bundle is fetched or
 * evaluated, so the main thread stays idle and the words on screen are already
 * the words. The first key, tap or focus starts one dynamic import; keystrokes
 * that arrive while the engine is loading are queued and replayed on their
 * original targets the moment the component's listeners are attached, so a
 * keystroke is delayed at worst, never dropped.
 */

/** The component dispatches this on `document` once its input listeners are attached. */
export const PRACTICE_READY_EVENT = "tk:practice-ready";

/** A keydown worth replaying once the island can hear it. */
interface KeySnapshot {
  target: EventTarget | null;
  key: string;
  code: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  repeat: boolean;
  isComposing: boolean;
}

interface Options<P> {
  /** Container whose children are the server-rendered component markup. */
  root: HTMLElement;
  /** The exact props that markup was rendered with. */
  props: P;
  /** Dynamic import of the component — kept off the load path on purpose. */
  load: () => Promise<{ default: ComponentType<P> }>;
  /** Event the component dispatches when replaying input became safe. */
  readyEvent?: string;
  /** Hydrate right away instead of waiting: a share link carries its run in the query string. */
  immediate?: boolean;
}

export function deferHydration<P>(options: Options<P>): void {
  const { root, props, load, readyEvent, immediate = false } = options;

  let loading = false;
  let ready = false;
  const queue: KeySnapshot[] = [];

  /** Load the component's modules and hydrate them onto the server markup. */
  const start = () => {
    if (loading) return;
    loading = true;
    // Touch and focus were the invitation; once loading is under way they
    // cannot do more, so they stop watching.
    window.removeEventListener("pointerdown", start, true);
    window.removeEventListener("focusin", start, true);

    void load()
      .then(({ default: Component }) => {
        hydrate(h(Component, props as Attributes & P), root);
      })
      .catch((error: unknown) => {
        // The page stays server-rendered; say so rather than failing silently.
        console.error("[deferred-hydration] could not hydrate", error);
        finish();
      });
  };

  /** The component is listening: stop watching and replay what we queued. */
  function finish() {
    if (!loading || ready) return;
    ready = true;
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("pointerdown", start, true);
    window.removeEventListener("focusin", start, true);
    if (readyEvent !== undefined) document.removeEventListener(readyEvent, finish);
    void replay(queue.splice(0, queue.length));
  }

  /**
   * Replay the queued keystrokes — one microtask apart.
   *
   * A real typist's keys arrive in separate tasks and the component commits
   * between them; a burst delivered synchronously would not, and a run-ending
   * key (Tab) would read the model the island hydrated with instead of the run
   * the keys before it just started. Yielding lets each keystroke commit before
   * the next is dispatched, so the component sees the same sequence it would
   * have seen had it been listening all along. Microtasks cannot interleave
   * with real input, so nothing can slip in between.
   */
  async function replay(pending: KeySnapshot[]): Promise<void> {
    for (const key of pending) {
      await Promise.resolve();
      // Replay on the element the key was pressed on, so the component applies
      // exactly the same filters (typing in a field, on a button) it would
      // have applied had it been listening all along.
      const target =
        key.target instanceof Element && document.contains(key.target) ? key.target : document.body;
      target.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: key.key,
          code: key.code,
          shiftKey: key.shiftKey,
          altKey: key.altKey,
          ctrlKey: key.ctrlKey,
          metaKey: key.metaKey,
          repeat: key.repeat,
          isComposing: key.isComposing,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  }

  /** The first keystroke starts the engine and is kept for the replay. */
  function onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented) return;
    start();
    queue.push({
      target: event.target,
      key: event.key,
      code: event.code,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      repeat: event.repeat,
      isComposing: event.isComposing,
    });
  }

  if (readyEvent !== undefined) document.addEventListener(readyEvent, finish);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("pointerdown", start, true);
  window.addEventListener("focusin", start, true);
  if (immediate) start();
}
