/**
 * SOUND ENGINE — tiny WebAudio synth, no audio files.
 * Controlled by the shared nav/footer preference and armed by a user gesture.
 */

type SoundName = "hover" | "click" | "toggle" | "section";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = false;
  private volume = 1;
  private resuming: Promise<boolean> | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  private lastHover = -Infinity;
  private noiseBuffer: AudioBuffer | null = null;

  setVolume(value: number) {
    if (!Number.isFinite(value)) return;
    this.volume = Math.min(1, Math.max(0, value));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        this.enabled ? this.volume : 0,
        this.ctx.currentTime,
        0.015,
      );
    }
  }

  /** must be called from a user gesture (click) to satisfy autoplay policy */
  enable() {
    if (!isSoundCapable()) return;
    if (this.enabled && this.ctx?.state === "running") return;
    if (!this.ctx || this.ctx.state === "closed") {
      try {
        const AC = window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
        this.resuming = null;
        this.noiseBuffer = null;
        this.voices.clear();
        this.lastHover = -Infinity;
      } catch {
        void this.ctx?.close().catch(() => {});
        this.ctx = null;
        this.master = null;
        return;
      }
    }
    this.enabled = true;
    this.setVolume(this.volume);
    // A new gesture can unlock a context whose earlier resume is still pending.
    this.resuming = null;
    void this.resume();
  }

  disable() {
    this.enabled = false;
    this.setVolume(this.volume);
  }

  get isEnabled() {
    return this.enabled;
  }

  private resume(): Promise<boolean> {
    const ctx = this.ctx;
    if (!ctx || ctx.state === "closed") return Promise.resolve(false);
    if (ctx.state === "running") return Promise.resolve(true);
    if (this.resuming) return this.resuming;
    try {
      const resumed = ctx.resume().then(() => ctx.state === "running", () => false);
      this.resuming = resumed;
      void resumed.then(() => { if (this.resuming === resumed) this.resuming = null; });
      return resumed;
    } catch {
      return Promise.resolve(false);
    }
  }

  private startVoice(source: AudioScheduledSourceNode, nodes: AudioNode[], now: number, duration: number) {
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      nodes.forEach((node) => node.disconnect());
    };
    source.start(now);
    source.stop(now + duration);
  }

  /** play a named sound — no-op if disabled or no ctx */
  play(name: SoundName) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    if (ctx.state !== "running") {
      if (name !== "hover") void this.resume().then((running) => {
        if (running && this.enabled && this.ctx === ctx) this.play(name);
      });
      return;
    }
    const now = ctx.currentTime;
    // Three voices at a maximum envelope of 0.32 leave output headroom.
    if (this.voices.size >= 3) return;
    if (name === "hover") {
      if (now - this.lastHover < 0.08) return;
      this.lastHover = now;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.master ?? ctx.destination);

    switch (name) {
      case "hover": {
        // soft high tick
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.14, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        this.startVoice(osc, [gain], now, 0.09);
        break;
      }
      case "click": {
        // A midrange tap remains clearer on small speakers.
        osc.type = "triangle";
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.32, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        this.startVoice(osc, [gain], now, 0.13);
        break;
      }
      case "toggle": {
        // two-tone confirm
        osc.type = "sine";
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(784, now + 0.06);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.26, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        this.startVoice(osc, [gain], now, 0.2);
        break;
      }
      case "section": {
        // soft whoosh — filtered noise burst
        if (!this.noiseBuffer) {
          this.noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.25), ctx.sampleRate);
          const data = this.noiseBuffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
          }
        }
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 600;
        filter.Q.value = 0.8;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.0001, now);
        ng.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
        ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        noise.connect(filter);
        filter.connect(ng);
        ng.connect(this.master ?? ctx.destination);
        this.startVoice(noise, [filter, ng], now, 0.26);
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
  return typeof window !== "undefined" && Boolean(window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
};
