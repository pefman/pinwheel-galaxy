# Cosmic Soundscape — a generative, reactive ambient soundscape

- **Date added:** 2026-08-22
- **Version:** 0.12.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## What + why

Pinwheel Galaxy is a *visual* generative instrument — every other layer is
something you watch. The Cosmic Soundscape gives the galaxy a second sense: a
generative ambient soundscape that *plays* the galaxy the way the starfield
renders it. Live, sample-free Web-Audio synthesis is the natural audio for a
live-generated visual — it stays in tune with whatever is being generated,
exactly as this feature stays in tune with the visible galaxy. It adds a fresh,
on-brand sensory dimension with zero backend cost and turns a glance into an
experience.

It is **muted by default**, purely additive, and non-breaking: the starfield,
dock, presets, recipes and Galaxy of the Day are untouched, and the default
galaxy looks (and sounds) exactly as before — silent, by design.

## How it works (high-level)

- `lib/soundscape.ts` (new) holds the **pure**, deterministic musical model:
  - Each theme maps to a distinct modal scale + tonic, so the sound is always
    consonant with the colour palette:
    violet → minor pentatonic, aurora → lydian, ember → mixolydian,
    azure → dorian, monochrome → whole-tone.
  - `composeVoice` derives the tempo (BPM) from the spin speed and the sparkle
    density from the star count, and maps the sky-layer toggles to voice
    triggers: nebula → a sustained pad, constellations → a slow arpeggio
    walking the scale, variable stars → bright high-octave twinkle, comet →
    periodic upward sweeps.
  - The same galaxy always yields the same voice, so the sound is a faithful
    reflection of the visible galaxy rather than decoration.
- `lib/useSoundscape.ts` (new) is the client runtime: a tiny `SoundscapeEngine`
  that owns a few oscillators and gain nodes, synthesising every tone at
  runtime. It rebuilds the pad and re-arms a per-beat scheduler whenever the
  voice changes, scheduling shimmer / twinkle / comet events on tempo.
- `lib/useGalaxyParams.ts` gained a shareable `?sound=` toggle (muted by
  default, so a quiet galaxy keeps a tidy URL) and a `toggleSound` setter.
- `app/page.tsx` drives `useSoundscape(config, recipe, sound)` and adds a
  compact **Sound** chip to the Galaxy Dock; `installSoundscapeGesture()`
  revives the audio context on the first click/keypress.

### Pure model — `lib/soundscape.ts`

| Export | Meaning |
|-------|---------|
| `THEME_SCALES` | theme → `{ mode, offsets, rootMidi }` |
| `midiToFreq(midi)` | MIDI note → Hz (MIDI 69 = A4 = 440 Hz) |
| `composeVoice(config, recipe)` | pure galaxy → `SoundscapeVoice` |
| `describeVoice(voice, themeLabel)` | e.g. "Minor pentatonic · 66 BPM · Aurora" |
| `TEMPO` / `SHIMMER` | derived-value ranges (BPM 40–160, sparkle 0.1–0.6) |

## Key files / components

- `lib/soundscape.ts` (new) — the pure musical model.
- `lib/soundscape.test.ts` (new) — 8 unit tests.
- `lib/useSoundscape.ts` (new) — the `useSoundscape` hook + `SoundscapeEngine`.
- `lib/useGalaxyParams.ts` — the shareable `?sound=` toggle + `toggleSound`.
- `app/page.tsx` — drives the hook and adds the **Sound** dock chip.

## User-facing behavior

- The galaxy is silent on load (polite, and required by browser autoplay
  policies). Click **Sound: On** in the dock (a violet-tinted chip next to the
  sky layers) and the galaxy gains a slow, ambient pad tuned to the current
  theme; enable Nebula for the sustained chord, Constellations for a walking
  arpeggio, Variable Stars for high twinkle, and a Comet for periodic sweeps.
  Change the theme or spin speed and the sound follows in real time.
- Toggle it off and the volume fades out instantly; a `?sound=on` link
  pre-arms the toggle but still waits for a gesture before playing.

## How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, click **Sound: On** in the dock.
3. Change the theme — the scale and tonic change; change the Spin knob — the
   tempo speeds up or slows down.
4. Turn on Nebula, Constellations and a Comet and hear the layers compose.
5. Toggle it off — the sound fades out; the galaxy keeps working in silence.

## Code-based verification

- `npm run build` passes (static prerender).
- `npm test` — 90/90 unit tests pass, including 8 in
  `lib/soundscape.test.ts`: scale/tonic mapping, tempo and density ranges, the
  layer triggers, determinism, and the description.

## Known limitations / follow-ups

- Audio is muted by default and gated behind the first user gesture, so it
  never plays unprompted — a follow-up could offer a remembered opt-in.
- The engine uses a single fixed master gain and a simple per-beat scheduler;
  future cycles could add reverb/delay or beat-sync the comet sweeps precisely
  to an AATime-accurate clock.
- State is shareable via `?sound=on` (pre-arm only); persisting the toggle
  across reloads like the other layers is a natural follow-up.
