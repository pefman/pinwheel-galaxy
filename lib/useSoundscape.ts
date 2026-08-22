"use client";

/**
 * useSoundscape — the runtime half of the Cosmic Soundscape feature.
 *
 * Turns a `SoundscapeVoice` (see `lib/soundscape.ts`) into live,
 * Web-Audio-synthesised sound. Every tone is generated at runtime from
 * oscillators — no samples, no network, no dependencies — and the graph is
 * rebuilt whenever the galaxy changes, so the sound tracks the visible
 * galaxy: the theme sets the scale, the spin sets the tempo, the layers add a
 * pad / arpeggio / twinkle / comet sweep.
 *
 * Progressive enhancement by design:
 *   - **Muted by default.** Audio never starts until the visitor interacts,
 *     which is both polite and required by browser autoplay policies.
 *   - **Graceful degradation.** If `AudioContext` is unavailable, the user
 *     muted, or `prefers-reduced-motion` is on, the hook is a no-op and the
 *     galaxy keeps working perfectly well in silence.
 *   - **Cheap.** The graph is tiny (a few oscillators and gain nodes) and the
 *     only per-beat work is scheduling a couple of short tones.
 */

import { useEffect, useRef } from "react";
import { composeVoice, type SoundscapeVoice } from "./soundscape";
import type { GalaxyConfig } from "./galaxyPresets";
import type { GalaxyRecipe } from "./recipe";

/** A browser AudioContext, or `undefined` before the first one is made. */
type Ctx = AudioContext | undefined;

/**
 * The audio engine: owns the graph and the per-beat schedulers. Constructed
 * once per hook instance and torn down on unmount. All audio work is guarded
 * so the module is safe to import on the server (where `window` is absent).
 */
class SoundscapeEngine {
  private ctx: AudioContext;
  private master: GainNode;
  private padGain: GainNode | null = null;
  private started = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
  }

  /** Start the graph and begin a running pad, if the voice asks for one. */
  private ensureStarted(voice: SoundscapeVoice) {
    if (this.started) return;
    this.started = true;
    if (voice.hasPad) this.startPad(voice);
  }

  /** A soft, slowly-breathing chord built from the scale's tonic triad. */
  private startPad(voice: SoundscapeVoice) {
    const ctx = this.ctx;
    const degrees = [0, 2, 4]; // first three scale degrees
    const chain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    chain.connect(this.master);
    for (const deg of degrees) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = this.scaleFreq(voice, deg);
      osc.connect(chain);
      osc.start();
    }
    chain.gain.value = 0.0001;
    this.padGain = chain;
    // Gentle LFO so the pad "breathes" rather than sitting flat.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain).connect(chain.gain);
    lfo.start();
  }

  /** Frequency of a scale degree (auto-transposed across octaves). */
  private scaleFreq(voice: SoundscapeVoice, degree: number): number {
    const oct = Math.floor(degree / voice.offsets.length);
    const off = voice.offsets[degree % voice.offsets.length];
    const midi = 69 + Math.log2(voice.rootFreq / 440) * 12 + oct * 12 + off;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /** Schedule one percussive/bell tone at `time`. */
  private tone(
    voice: SoundscapeVoice,
    degree: number,
    time: number,
    duration: number,
    gain: number,
    type: OscillatorType = "sine",
    oct = 0,
  ) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = this.scaleFreq(voice, degree) * Math.pow(2, oct);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(g).connect(this.master);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  /** Schedule an upward glissando sweep (the comet). */
  private glissando(voice: SoundscapeVoice, time: number) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(this.scaleFreq(voice, 0), time);
    osc.frequency.exponentialRampToValueAtTime(
      this.scaleFreq(voice, voice.offsets.length) * 2,
      time + 1.6,
    );
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.06, time + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 1.6);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2200;
    osc.connect(g).connect(filter).connect(this.master);
    osc.start(time);
    osc.stop(time + 1.7);
  }

  /**
   * Apply a new voice: rebuild the pad if its presence changed, and (re)arm the
   * per-beat scheduler with the new tempo/layer settings.
   */
  setVoice(voice: SoundscapeVoice) {
    this.ensureStarted(voice);
    // Rebuild the pad only when its presence flips, to avoid re-triggering.
    const wantPad = voice.hasPad;
    if (wantPad && !this.padGain) this.startPad(voice);
    if (!wantPad && this.padGain) this.stopPad();
    this.scheduleLoop(voice);
  }

  /** Set the master volume smoothly (used for the mute/unmute toggle). */
  setMasterGain(value: number) {
    this.master.gain.setTargetAtTime(
      value,
      this.ctx.currentTime,
      0.05,
    );
  }

  private stopPad() {
    try {
      this.padGain?.disconnect();
    } catch {
      /* already detached */
    }
    this.padGain = null;
  }

  /** A setTimeout loop that schedules one beat's worth of sound each tick. */
  private scheduleLoop(voice: SoundscapeVoice) {
    const ctx = this.ctx;
    const beat = 60 / voice.bpm; // seconds per beat
    let next = ctx.currentTime + 0.1;

    const step = () => {
      if (!this.started) return;
      this.renderBeat(voice, next);
      next += beat;
      this._timer = setTimeout(step, Math.max(0, (next - ctx.currentTime) * 1000));
    };
    this._timer = setTimeout(step, Math.max(0, (next - ctx.currentTime) * 1000));
  }

  /** Schedule the events for a single beat. */
  private renderBeat(voice: SoundscapeVoice, time: number) {
    // Arpeggio walks the scale in a steady cycle.
    if (voice.hasArpeggio) {
      const ctx = this.ctx;
      // A tiny lookahead clock so the cycle advances even across beats.
      this._arp = (this._arp ?? 0) + 1;
      const degree = this._arp % voice.offsets.length;
      this.tone(voice, degree, time, 1.8, 0.11, "triangle");
    }

    // Sparkle: a random scale note, more often with more stars.
    if (Math.random() < voice.shimmerDensity) {
      const degree = Math.floor(Math.random() * voice.offsets.length);
      this.tone(voice, degree, time, 0.5, 0.07, "sine", 1);
    }

    // Twinkle: bright high-octave sparkles layered on top when active.
    if (voice.hasTwinkle && Math.random() < voice.shimmerDensity) {
      const degree = Math.floor(Math.random() * voice.offsets.length);
      this.tone(voice, degree, time, 0.35, 0.05, "sine", 2);
    }

    // Comet: a periodic upward sweep roughly every eight beats.
    if (voice.hasGlissando) {
      this._comet = (this._comet ?? 0) + 1;
      if (this._comet % 8 === 0) this.glissando(voice, time);
    }
  }

  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _arp?: number;
  private _comet?: number;

  /** Resume a suspended context (after a user gesture clears autoplay). */
  resume() {
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  disconnect() {
    this.started = false;
    if (this._timer) clearTimeout(this._timer);
    try {
      this.padGain?.disconnect();
    } catch {
      /* ignore */
    }
    this.master.disconnect();
    try {
      this.ctx.close();
    } catch {
      /* ignore */
    }
  }
}

/**
 * The Cosmic Soundscape hook. Pass it the current galaxy config + recipe and a
 * boolean `enabled` (the dock's Sound toggle). Returns nothing the caller
 * needs to render — the toggle lives in the dock — but callers should feed it
 * the `sound` state from `useGalaxyParams`.
 */
export function useSoundscape(
  config: GalaxyConfig,
  recipe: GalaxyRecipe,
  enabled: boolean,
) {
  const engine = useRef<SoundscapeEngine | null>(null);
  const ctxRef = useRef<Ctx>(undefined);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    // Never start audio unprompted: respect autoplay policies and the visitor.
    if (typeof window === "undefined" || !window.AudioContext) return;
    if (window.matchMedia?.("prefers-reduced-motion: reduce").matches) return;

    if (!engine.current) {
      try {
        const Ctor =
          (window as unknown as { AudioContext: typeof AudioContext }).AudioContext;
        ctxRef.current = new Ctor();
        engine.current = new SoundscapeEngine(ctxRef.current);
      } catch {
        // Web Audio unavailable — silently stay silent.
        return;
      }
    }
    engine.current.resume();
  }, []);

  useEffect(() => {
    if (!engine.current) return;
    if (!enabledRef.current) {
      engine.current.setMasterGain(0);
      return;
    }
    engine.current.setMasterGain(0.9);
    engine.current.setVoice(composeVoice(config, recipe));
  }, [config, recipe, enabled]);

  useEffect(() => {
    return () => {
      engine.current?.disconnect();
      engine.current = null;
    };
  }, []);

  return engine;
}

/**
 * Attach a one-time "unmute on first interaction" listener so the soundscape
 * comes alive the moment the visitor touches the galaxy — the standard, polite
 * way around browser autoplay blocks. Safe no-op where audio is unsupported.
 */
export function installSoundscapeGesture() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  const fire = () => {
    const Ctor =
      (window as unknown as { AudioContext: typeof AudioContext }).AudioContext;
    try {
      const ctx = new Ctor();
      ctx.resume().catch(() => {});
    } catch {
      /* ignore */
    }
    window.removeEventListener("pointerdown", fire);
    window.removeEventListener("keydown", fire);
  };
  window.addEventListener("pointerdown", fire);
  window.addEventListener("keydown", fire);
}
