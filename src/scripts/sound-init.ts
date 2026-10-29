/** Shared sound preference survives Astro navigation; audio starts on a gesture. */

import { sound, isSoundCapable } from "../lib/sound";
import { defaultSoundVolume } from "../config/sound";

const STORAGE_KEY = "mi-sound";
const VOLUME_STORAGE_KEY = "mi-sound-volume";
// Dispatched for mute and volume changes so every control stays in sync.
export const SOUND_SYNC_EVENT = "mi-sound-change";

let enabled = false;
let volume = defaultSoundVolume;
let initialized = false;
let armed = false;

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
}

if (typeof window !== "undefined" && !initialized) {
  initialized = true;
  readState();

  // Construct/resume audio only from a user gesture, including after interruption.
  const arm = () => {
    armed = true;
    if (enabled) sound.enable();
  };
  window.addEventListener("pointerdown", arm, { passive: true, capture: true });
  window.addEventListener("keydown", arm, { passive: true, capture: true });
  window.addEventListener("click", arm, { passive: true, capture: true });

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
    volume = defaultSoundVolume;
    sound.setVolume(volume / 100);
    try { localStorage.setItem(VOLUME_STORAGE_KEY, String(volume)); } catch { /* ignore */ }
  }
  enabled = !enabled;

  if (enabled) {
    armed = true;
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
  if (enabled) {
    armed = true;
    sound.enable();
  } else sound.disable();
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch { /* ignore */ }
  broadcast();
}

export function playSound(name: Parameters<typeof sound.play>[0]): void {
  if (!enabled || !armed) return;
  sound.play(name);
}
