/**
 * sound-init — global sound state + arming. ON BY DEFAULT (user request).
 *
 * Consolidates the old useSound() React hook into a single vanilla
 * controller imported once from the Layout:
 *
 *  • reads capability + stored preference, enables the SoundEngine
 *  • arms the AudioContext on the first pointer/keydown (autoplay policy)
 *  • `toggleSound()` and `setSoundVolume()` persist the visitor's settings
 *    and broadcast `mi-sound-change` so nav and footer controls stay in sync
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
const VOLUME_STORAGE_KEY = "mi-sound-volume";
const DEFAULT_VOLUME = 75;
// Dispatched for mute and volume changes so every control stays in sync.
export const SOUND_SYNC_EVENT = "mi-sound-change";

let enabled = false;
let volume = DEFAULT_VOLUME;
let initialized = false;

function readState() {
  const can = isSoundCapable();
  let want = can;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // default ON unless the user explicitly opted out ("off")
    want = can && stored !== "off";
    const savedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (savedVolume !== null) {
      const parsed = Number(savedVolume);
      if (Number.isFinite(parsed)) volume = Math.min(100, Math.max(0, parsed));
    }
  } catch {
    /* ignore */
  }
  sound.setVolume(volume / 100);
  enabled = want && volume > 0;
  if (enabled) {
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

export function getSoundVolume(): number {
  return volume;
}

function broadcast() {
  window.dispatchEvent(new CustomEvent<boolean>(SOUND_SYNC_EVENT, { detail: enabled }));
}

export function toggleSound(): void {
  if (!isSoundCapable()) return;
  if (!enabled && volume === 0) {
    volume = DEFAULT_VOLUME;
    sound.setVolume(volume / 100);
    try { localStorage.setItem(VOLUME_STORAGE_KEY, String(volume)); } catch { /* ignore */ }
  }
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
  broadcast();
}

export function setSoundVolume(value: number): void {
  if (!isSoundCapable() || !Number.isFinite(value)) return;
  volume = Math.min(100, Math.max(0, Math.round(value)));
  sound.setVolume(volume / 100);
  enabled = volume > 0;
  if (enabled) sound.enable();
  else sound.disable();
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch { /* ignore */ }
  broadcast();
}

export function playSound(name: Parameters<typeof sound.play>[0]): void {
  if (enabled) sound.enable();
  sound.play(name);
}
