/**
 * Soundscape module (ticket #12): a subtle procedural ambient pad plus short
 * UI feedback blips, synthesized at runtime with the Web Audio API — the sim
 * ships zero audio assets (guarded by the zero-assets e2e test). Everything
 * routes through one master gain, so the mute toggle silences the pad and
 * every blip together. Browsers block autoplay until a user gesture, so the
 * context is created on load but resumed on the first pointerdown/keydown:
 * ambient audio starts as soon as the browser allows, never behind a
 * click-to-enable wall. Audio synthesis internals are out of test scope
 * (ADR-0004); the user-facing promises — ambient starts and mutes, blips
 * play on key interactions, mute silences everything — are verified at the
 * UI-interaction seam by the e2e suite through the window.__soundscape
 * mirror.
 *
 * Ticket #22: the pad must evolve, not drone. The original two-bank pad
 * crossfaded on an 83-second loop and was always on, reading as a static
 * drone. The pad now breathes on three independent time scales that beat
 * against each other instead of locking into a loop — every voice swells and
 * fades on its own slow cycle (so the voicing continuously thins and
 * re-forms, giving sparse passages), the chord banks morph over ~3.5
 * minutes, the whole pad swells on a ~2.5-minute cycle, and a scheduled
 * "rest" sinks it to near-silence for a few seconds every couple of minutes
 * (jittered, so the pattern itself never repeats).
 */

import { getElement } from "../ui/dom";

export type BlipKind = "inspect" | "release" | "toggle" | "warp";

export interface SoundscapeState {
  /** AudioContext state; "unavailable" when the browser has no Web Audio. */
  contextState: AudioContextState | "unavailable";
  muted: boolean;
  /** Whether the ambient pad is live (it may still be silent pre-gesture). */
  ambient: boolean;
  /**
   * Blips scheduled to the audio graph, per kind. Mute-suppressed blips are
   * never scheduled, so counts are exact with respect to mute (a muted
   * interaction leaves the count unchanged). A blip scheduled while the
   * context is still suspended under the browser's autoplay policy still
   * counts — it plays as soon as the browser allows.
   */
  blips: Record<BlipKind, number>;
}

export interface Soundscape {
  blip(kind: BlipKind): void;
  /** Live state mirror, republished to the e2e seam each frame. */
  readonly state: SoundscapeState;
}

/** Two slow-morphing chord banks (A minor add 9 ↔ F major 7), each voice a
 *  gently detuned sine so the pad never sounds static. */
const PAD_BANKS: number[][] = [
  [110.0, 130.81, 164.81, 196.0, 246.94], // A2 C3 E3 G3 B3
  [174.61, 220.0, 261.63, 329.63] // F3 A3 C4 E4
];
const PAD_VOICE_GAIN = 0.03;
const PAD_DETUNE_CENTS = 4;
/** Crossfade period of the chord banks (~3.5 min per full cycle): the
 *  harmony morphs slower than the old 83 s loop (ticket #22). */
const PAD_CROSSFADE_HZ = 1 / 210;
/** Per-voice breathing (ticket #22): each voice's gain rides a slow sine
 *  between silence and PAD_VOICE_GAIN on its own incommensurate rate, so the
 *  chord voicing continuously thins out and re-forms instead of sustaining
 *  one static texture. */
const PAD_BREATH_HZ_MIN = 1 / 240; // slowest voice cycle: 4 min
const PAD_BREATH_HZ_MAX = 1 / 90; // fastest voice cycle: 90 s
const PAD_BREATH_DEPTH = 0.5; // voice gain swings ±50% around its center
/** Global swell (ticket #22): the whole pad (voices + noise air bed) swells
 *  and sinks on a ~2.5 min cycle, so it breathes as one body. */
const PAD_SWELL_HZ = 1 / 150;
const PAD_SWELL_CENTER = 0.55;
const PAD_SWELL_DEPTH = 0.45; // swell gain ∈ [0.1, 1.0]
/** Occasional near-silence (ticket #22): a scheduled "rest" sinks the pad to
 *  near-silence for a few seconds roughly every couple of minutes. */
const PAD_REST_FIRST_S = 8; // first rest shortly after the pad establishes
const PAD_REST_PERIOD_MS = 140_000; // ~2.3 min between rests
const PAD_REST_PERIOD_JITTER_MS = 45_000; // ±45 s, so rests never lock into a loop
const PAD_REST_NADIR = 0.02; // near-silent floor during a rest
const PAD_REST_FADE_S = 4; // seconds to sink to the nadir
const PAD_REST_HOLD_S = 7; // seconds held near-silent
const PAD_REST_RISE_S = 10; // seconds to swell back up
/** Sweep of the shared pad lowpass, centered on 620 Hz. */
const PAD_SWEEP_HZ = 0.025;
const PAD_SWEEP_DEPTH = 160;

/** Per-kind blip envelope: pitch [Hz], peak gain, decay [s]. */
const BLIP_SHAPES: Record<BlipKind, { freq: number; gain: number; decay: number }> = {
  /** Soft chime when a body is inspected / the fact card opens. */
  inspect: { freq: 523.25, gain: 0.08, decay: 0.35 },
  /** Lower, softer note when inspection ends / the card closes. */
  release: { freq: 392.0, gain: 0.05, decay: 0.3 },
  /** Short tick for pause/resume. */
  toggle: { freq: 440.0, gain: 0.05, decay: 0.18 },
  /** Shortest, highest tick for warp changes. */
  warp: { freq: 659.25, gain: 0.04, decay: 0.12 }
};

/**
 * Build the engine: the AudioContext, the master gain everything feeds, and
 * the live state mirror. Returns a null engine (state "unavailable") when the
 * browser has no Web Audio API, so the app still runs silently.
 */
function createEngine(): {
  ctx: AudioContext | null;
  master: GainNode | null;
  state: SoundscapeState;
} {
  const state: SoundscapeState = {
    contextState: "unavailable",
    muted: false,
    ambient: false,
    blips: { inspect: 0, release: 0, toggle: 0, warp: 0 }
  };
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return { ctx: null, master: null, state };

  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  startPad(ctx, master);
  state.contextState = ctx.state;
  state.ambient = true;
  return { ctx, master, state };
}

/**
 * The ambient pad: two chord banks crossfaded by one slow LFO, through a
 * shared lowpass whose cutoff slowly sweeps, plus a faint filtered-noise air
 * bed. Ticket #22 shapes it to evolve rather than drone — every voice
 * breathes on its own slow cycle (startVoice), the banks morph over ~3.5
 * minutes, the whole pad swells on a ~2.5-minute cycle, and a scheduled rest
 * sinks it to near-silence every couple of minutes. The pad stages stay well
 * under the master's unity gain, so the pad reads as a subtle backdrop
 * rather than music.
 */
function startPad(ctx: AudioContext, master: GainNode): void {
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 620;
  padFilter.Q.value = 0.6;

  const sweep = ctx.createOscillator();
  sweep.frequency.value = PAD_SWEEP_HZ;
  const sweepAmp = ctx.createGain();
  sweepAmp.gain.value = PAD_SWEEP_DEPTH;
  sweep.connect(sweepAmp);
  sweepAmp.connect(padFilter.frequency);

  const noise = createNoiseSource(ctx);
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.008;
  noise.connect(noiseGain);
  noiseGain.connect(padFilter);

  // One LFO crossfades the two banks: bank A rides 0.5 + 0.5·lfo, bank B
  // 0.5 − 0.5·lfo, so their gains always sum to unity and the harmony
  // breathes without ever going silent. Slowed to ~3.5 min per cycle so the
  // morphing is gradual (ticket #22).
  const lfo = ctx.createOscillator();
  lfo.frequency.value = PAD_CROSSFADE_HZ;
  const lfoAmp = ctx.createGain();
  lfoAmp.gain.value = 0.5;
  const invert = ctx.createGain();
  invert.gain.value = -1;
  lfo.connect(lfoAmp);

  for (let bank = 0; bank < PAD_BANKS.length; bank++) {
    const bankGain = ctx.createGain();
    bankGain.gain.value = 0.5;
    if (bank === 0) {
      lfoAmp.connect(bankGain.gain);
    } else {
      lfoAmp.connect(invert);
      invert.connect(bankGain.gain);
    }
    bankGain.connect(padFilter);
    for (const freq of PAD_BANKS[bank]) startVoice(ctx, freq, bankGain);
  }

  // Ticket #22: the pad's global breathing lives between the filter and the
  // master, so the voices and the noise air bed swell and rest as one body.
  // Two gain stages in series (gains multiply), so the LFO-driven swell and
  // the scheduled rests never interfere with each other's automation.
  const swellGain = ctx.createGain();
  swellGain.gain.value = PAD_SWELL_CENTER;
  const swell = ctx.createOscillator();
  swell.frequency.value = PAD_SWELL_HZ;
  const swellAmp = ctx.createGain();
  swellAmp.gain.value = PAD_SWELL_DEPTH;
  swell.connect(swellAmp);
  swellAmp.connect(swellGain.gain);
  padFilter.connect(swellGain);

  const restGain = ctx.createGain();
  restGain.gain.value = 1;
  swellGain.connect(restGain);
  restGain.connect(master);

  startRests(ctx, restGain);

  lfo.start();
  sweep.start();
  noise.start();
  swell.start();
}

function startVoice(ctx: AudioContext, freq: number, out: GainNode): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.detune.value = (Math.random() * 2 - 1) * PAD_DETUNE_CENTS;

  // Ticket #22: each voice breathes on its own slow, incommensurate cycle —
  // its gain rides a sine between silence and PAD_VOICE_GAIN — so the chord
  // voicing continuously thins and re-forms (sparse passages) instead of
  // sustaining one static texture.
  const gain = ctx.createGain();
  gain.gain.value = PAD_VOICE_GAIN * (1 - PAD_BREATH_DEPTH);
  const breath = ctx.createOscillator();
  breath.frequency.value =
    PAD_BREATH_HZ_MIN + Math.random() * (PAD_BREATH_HZ_MAX - PAD_BREATH_HZ_MIN);
  const breathAmp = ctx.createGain();
  breathAmp.gain.value = PAD_VOICE_GAIN * PAD_BREATH_DEPTH;
  breath.connect(breathAmp);
  breathAmp.connect(gain.gain);

  osc.connect(gain);
  gain.connect(out);
  osc.start();
  breath.start();
}

/**
 * Occasional near-silence (ticket #22): a self-scheduling pattern of gain
 * ramps that sinks the pad to PAD_REST_NADIR for a few seconds roughly every
 * PAD_REST_PERIOD_MS, with the interval, fade, hold and rise all jittered so
 * the pattern breathes instead of locking into a loop. Every event is
 * scheduled on the audio clock well ahead of its time, so scheduler jitter
 * never clicks or gaps the audio; while the context is suspended (autoplay
 * policy) the clock stands still and the events simply play once resumed.
 */
function startRests(ctx: AudioContext, restGain: GainNode): void {
  const period = PAD_REST_PERIOD_MS / 1000;
  const jitter = PAD_REST_PERIOD_JITTER_MS / 1000;
  let nextRest = ctx.currentTime + PAD_REST_FIRST_S;

  const schedule = (): void => {
    if (nextRest - ctx.currentTime > 15) return; // horizon already covered
    const t0 = nextRest;
    const fade = PAD_REST_FADE_S + Math.random() * 3;
    const hold = PAD_REST_HOLD_S + Math.random() * 4;
    const rise = PAD_REST_RISE_S + Math.random() * 4;
    restGain.gain.setValueAtTime(1, t0);
    restGain.gain.linearRampToValueAtTime(PAD_REST_NADIR, t0 + fade);
    restGain.gain.setValueAtTime(PAD_REST_NADIR, t0 + fade + hold);
    restGain.gain.linearRampToValueAtTime(1, t0 + fade + hold + rise);
    nextRest = t0 + period + (Math.random() * 2 - 1) * jitter;
  };

  schedule();
  setInterval(schedule, 2000);
}

/** Two seconds of white noise, looped — the pad's faint air bed. */
function createNoiseSource(ctx: AudioContext): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

export function initSoundscape(): Soundscape {
  const { ctx, master, state } = createEngine();

  // Keep the seam honest when the context flips state (e.g. suspended →
  // running on the first gesture).
  if (ctx) {
    ctx.addEventListener("statechange", () => {
      state.contextState = ctx.state;
    });
  }

  function resume(): void {
    if (ctx && ctx.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }
  }

  function blip(kind: BlipKind): void {
    if (state.muted) return;
    const shape = BLIP_SHAPES[kind];
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = shape.freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(shape.gain, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + shape.decay);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + shape.decay + 0.05);
    state.blips[kind] += 1;
  }

  function setMuted(muted: boolean): void {
    if (state.muted === muted) return;
    state.muted = muted;
    if (ctx && master) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      // Fast fade to silence (or back); the pad keeps running silently so
      // unmuting is instant and blips route through the same master.
      master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.03);
    }
    if (!muted) blip("toggle"); // soft confirm that sound is back
  }

  // The mute toggle lives in the bottom control bar; its aria-pressed state
  // is the DOM seam the e2e suite asserts.
  const muteBtn = getElement<HTMLButtonElement>("mute-btn");
  function syncMuteButton(): void {
    muteBtn.setAttribute("aria-pressed", String(state.muted));
    muteBtn.textContent = state.muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-label", state.muted ? "Unmute sound" : "Mute sound");
  }
  muteBtn.addEventListener("click", () => {
    setMuted(!state.muted);
    syncMuteButton();
  });
  syncMuteButton();

  // Browsers block autoplay until a user gesture: the first pointerdown or
  // keydown anywhere resumes the context. The listeners are deliberately not
  // once-only — resume is idempotent (a running context short-circuits), so
  // if the browser blocks the first gesture's resume, any later gesture can
  // still start the audio instead of leaving it permanently silent.
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);

  return { blip, state };
}
