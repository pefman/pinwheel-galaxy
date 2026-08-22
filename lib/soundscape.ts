/**
 * Cosmic Soundscape — the pure, musical mapping for the generative soundscape.
 *
 * The starfield is visual; this module gives the galaxy a *sound*. It is the
 * side-effect-free half of the feature: given a `GalaxyConfig` (the visible
 * galaxy) and a `GalaxyRecipe` (the active sky layers) it composes a
 * `SoundscapeVoice` — a scale, a tonic, a pulse tempo and a set of layer
 * triggers. The audio runtime (`useSoundscape`) turns that voice into live,
 * Web-Audio-synthesised sound.
 *
 * Design goals, mirrored in the tests:
 *   - **In tune.** Every theme maps to a musical scale, so whatever the galaxy
 *     looks like, the sound stays consonant.
 *   - **Reactive.** Spin speed drives the tempo; star density drives sparkle
 *     density; the nebula adds a sustained pad; variable stars twinkle; a comet
 *     triggers an upward sweep. Nothing is random here — the voice is a pure
 *     function of the galaxy, so it is deterministic and shareable.
 *   - **Backend-free and offline-first.** No samples, no network, no deps.
 */

import type { GalaxyConfig } from "./galaxyPresets";
import type { GalaxyRecipe } from "./recipe";

/**
 * A musical scale as semitone offsets from the tonic, plus a human name and a
 * tonic MIDI note (MIDI 69 = A4 = 440 Hz).
 */
interface ThemeScale {
  mode: string;
  offsets: number[];
  /** MIDI note number for the tonic. */
  rootMidi: number;
}

/**
 * Each theme maps to a distinct modal scale so the soundscape matches the
 * colour palette's character:
 *   - violet  → minor pentatonic (dark, cinematic)
 *   - aurora  → lydian (bright, floating, "space")
 *   - ember   → mixolydian (warm, rolling)
 *   - azure   → dorian (cool, reflective)
 *   - monochrome → whole-tone (aimless, metallic, fits the silver palette)
 */
export const THEME_SCALES: Record<string, ThemeScale> = {
  violet: { mode: "minor pentatonic", offsets: [0, 3, 5, 7, 10], rootMidi: 45 },
  aurora: { mode: "lydian", offsets: [0, 2, 4, 6, 9, 11], rootMidi: 40 },
  ember: { mode: "mixolydian", offsets: [0, 2, 4, 5, 7, 9, 11], rootMidi: 43 },
  azure: { mode: "dorian", offsets: [0, 2, 3, 5, 7, 9, 10], rootMidi: 48 },
  monochrome: { mode: "whole-tone", offsets: [0, 2, 4, 6, 8, 10], rootMidi: 41 },
};

/** The tempo (BPM) a galaxy pulses at, derived from its spin speed. */
export const TEMPO = {
  min: 40,
  max: 160,
} as const;

/** The sparkle density a galaxy gets, derived from its star count. */
export const SHIMMER = {
  min: 0.1,
  max: 0.6,
} as const;

/** A composed voice: everything the audio engine needs to render a galaxy. */
export interface SoundscapeVoice {
  /** Scale name, e.g. "minor pentatonic". */
  mode: string;
  /** Semitone offsets within one octave. */
  offsets: number[];
  /** Tonic frequency in Hz. */
  rootFreq: number;
  /** Pulse tempo in beats per minute. */
  bpm: number;
  /** Nebula → a sustained chord pad. */
  hasPad: boolean;
  /** Constellations → a slow arpeggio walking the scale. */
  hasArpeggio: boolean;
  /** Star-driven sparkle density (0..1 chance per beat). */
  shimmerDensity: number;
  /** Variable stars → bright, high-octave sparkles layered on top. */
  hasTwinkle: boolean;
  /** Comet → periodic upward sweeps. */
  hasGlissando: boolean;
}

/** MIDI note number → frequency in Hz (MIDI 69 = A4 = 440 Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Compose a `SoundscapeVoice` for a galaxy. Pure and deterministic: the same
 * galaxy always yields the same voice, which is what makes the sound a faithful
 * reflection of the visible galaxy rather than a decorative afterthought.
 */
export function composeVoice(
  config: GalaxyConfig,
  recipe: Partial<GalaxyRecipe>,
): SoundscapeVoice {
  const scale = THEME_SCALES[config.theme] ?? THEME_SCALES.violet;
  const bpm = clamp(
    TEMPO.min + config.rpm * ((TEMPO.max - TEMPO.min) / 20),
    TEMPO.min,
    TEMPO.max,
  );
  const shimmerDensity =
    SHIMMER.min +
    ((config.stars - 120) / (640 - 120)) * (SHIMMER.max - SHIMMER.min);

  return {
    mode: scale.mode,
    offsets: scale.offsets,
    rootFreq: midiToFreq(scale.rootMidi),
    bpm,
    hasPad: !!recipe.nebula,
    hasArpeggio: !!recipe.constellation,
    shimmerDensity: clamp(shimmerDensity, SHIMMER.min, SHIMMER.max),
    hasTwinkle: !!recipe.variable,
    hasGlissando: !!recipe.comet,
  };
}

/**
 * A compact, human-readable description of a voice for accessibility and the
 * dock label, e.g. "Minor pentatonic · 66 BPM · Aurora".
 */
export function describeVoice(voice: SoundscapeVoice, themeLabel: string): string {
  return `${voice.mode} · ${voice.bpm} BPM · ${themeLabel}`;
}

/** Clamp `v` into the inclusive range `[min, max]`. */
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
