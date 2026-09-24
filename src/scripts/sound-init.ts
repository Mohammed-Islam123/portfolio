/**
 * sound-init — global sound state + arming. ON BY DEFAULT (user request).
 *
 * Consolidates the old useSound() React hook into a single vanilla
 * controller imported once from the Layout:
 *
 *  • reads capability + stored preference, enables the SoundEngine
 *  • arms the AudioContext on the first pointer/keydown (autoplay policy)
 *  • `toggleSound()` flips state, persists to localStorage, and
 *    broadcasts `mi-sound-change` so every SoundToggle LED in the page
 *    stays in sync
 *
 * Components play sounds through `playSound()` — a thin wrapper that is
 * a no-op when sound is off (the engine no-ops internally anyway, but
 * the wrapper also skips when the browser is not sound-capable, matching
 * the old hook's `capable` gate).
 *
 * Astro lifecycle: INIT ONCE. Module state survives SPA navigations;
 * SoundToggle UIs re-read state in their connectedCallback.
 */

import { sound, isSoundCapable } from "../lib/sound";

const STORAGE_KEY = "mi-sound";
// dispatched whenever sound is toggled — so the footer LED and any other
// consumer stay in sync within the tab.
export const SOUND_SYNC_EVENT = "mi-sound-change";

let enabled = false;
let initialized = false;

function readState() {
  const can = isSoundCapable();
  let want = false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // default ON unless the user explicitly opted out ("off")
    want = can && stored !== "off";
  } catch {
    /* ignore */
  }
  enabled = want;
  if (want) {
    // arm: sound.enable() creates/resumes the context; the resume only
    // takes effect once a gesture fires — the listeners below cover that.
    sound.enable();
  }
}

if (typeof window !== "undefined" && !initialized) {
  initialized = true;
  readState();

  // resume the AudioContext on the first user gesture (autoplay policy).
  // sound.enable() is a no-op if already running.
  const arm = () => {
    if (enabled) sound.enable();
  };
  window.addEventListener("pointerdown", arm, { passive: true });
  window.addEventListener("keydown", arm, { passive: true });

  // keep in sync if another controller instance broadcasts a change
  window.addEventListener(SOUND_SYNC_EVENT, (e) => {
    const detail = (e as CustomEvent<boolean>).detail;
    if (typeof detail === "boolean") enabled = detail;
  });
}

export function isSoundOn(): boolean {
  return enabled;
}

export function isSoundCapableNow(): boolean {
  return isSoundCapable();
}

export function toggleSound(): void {
  enabled = !enabled;

  if (enabled) {
    sound.enable(); // called from a click — satisfies autoplay policy
    sound.play("toggle");
  } else {
    sound.disable();
  }
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    /* ignore */
  }

  // broadcast to SoundToggle UIs in this tab
  window.dispatchEvent(new CustomEvent<boolean>(SOUND_SYNC_EVENT, { detail: enabled }));
}

export function playSound(name: Parameters<typeof sound.play>[0]): void {
  if (enabled) sound.enable();
  sound.play(name);
}
