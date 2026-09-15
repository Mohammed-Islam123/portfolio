/**
 * SOUND ENGINE — tiny WebAudio synth, no audio files.
 * Opt-in via the footer toggle. Off on reduced-motion only.
 *
 * Sounds are programmable envelopes around simple oscillators —
 * soft ticks, not arcade beeps. Designed to be felt, not heard.
 *
 * Mobile note: sound IS enabled on mobile now (previously disabled).
 * Browsers block AudioContext until a user gesture, but the useSound
 * hook arms the context on the first pointerdown/keydown — so on mobile
 * the first tap resumes the context and subsequent taps play sounds.
 * Hover sounds won't fire on touch (no hover events), but click/toggle
 * sounds on buttons, cells, and nav items will. This matches the user's
 * expectation that sound should work on mobile too.
 */

type SoundName = "hover" | "click" | "toggle" | "section";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;

  /** must be called from a user gesture (click) to satisfy autoplay policy */
  enable() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  get isEnabled() {
    return this.enabled;
  }

  /** play a named sound — no-op if disabled or no ctx */
  play(name: SoundName) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => this.play(name));
      return;
    }
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (name) {
      case "hover": {
        // soft high tick
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.035, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }
      case "click": {
        // short low tap
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.06, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }
      case "toggle": {
        // two-tone confirm
        osc.type = "sine";
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(784, now + 0.06);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      case "section": {
        // soft whoosh — filtered noise burst
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 600;
        filter.Q.value = 0.8;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.0001, now);
        ng.gain.exponentialRampToValueAtTime(0.03, now + 0.02);
        ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        noise.connect(filter);
        filter.connect(ng);
        ng.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.26);
        // skip the osc we created above
        osc.disconnect();
        gain.disconnect();
        return;
      }
    }
  }
}

// singleton
export const sound = new SoundEngine();

export const isSoundCapable = () => {
  if (typeof window === "undefined") return false;
  // sound is capable on ALL devices now (including mobile). The AudioContext
  // is armed on first user gesture (pointerdown/keydown) in useSound, which
  // satisfies mobile autoplay policies. The only remaining gate is
  // prefers-reduced-motion (a11y — users who reduce motion likely don't
  // want sound either). The old mobile gate is removed per user request.
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return !reduced;
};
