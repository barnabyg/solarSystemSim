/**
 * Time controls UI (ticket #6): the bottom-center control bar — pause
 * toggle, log-scale warp slider, and the 1× / 1 h/s / 1 d/s / 1 mo/s
 * presets — plus the keyboard shortcuts (Space pauses, ←/→ step a sim day,
 * +/- double/halve the warp) and the tab-blur pause. Thin DOM wiring: every
 * state change flows through applyWarp/setPaused, which write to the clock
 * and mirror the change to the controls together, so the UI never drifts
 * from the sim state. Ticket #12: the explicit interactions (pause button,
 * Space, presets, +/-) play a soft UI blip through the soundscape; the
 * slider and the tab-blur pause stay silent so feedback only marks
 * deliberate actions. Tested at the UI-interaction seam (ADR-0004) by the
 * e2e suite, not unit-tested.
 */

import type { Soundscape } from "../audio/soundscape";
import { getElement } from "./dom";
import {
  adjustWarp,
  clampWarp,
  formatWarp,
  WARP_MAX,
  WARP_MIN,
  type SimClock
} from "../time/clock";

/** Slider positions; the range maps logarithmically across [WARP_MIN, WARP_MAX]. */
const SLIDER_STEPS = 1000;
const LOG_MIN = Math.log10(WARP_MIN);
const LOG_MAX = Math.log10(WARP_MAX);

function sliderToWarp(position: number): number {
  const t = position / SLIDER_STEPS;
  return 10 ** (LOG_MIN + t * (LOG_MAX - LOG_MIN));
}

function warpToSlider(rate: number): number {
  const t = (Math.log10(rate) - LOG_MIN) / (LOG_MAX - LOG_MIN);
  return Math.round(t * SLIDER_STEPS);
}

/**
 * Whether the event target is a place where the user types: shortcuts must
 * never steal keys (Space, arrows, +/-, all of which type) from it.
 */
function isTypingTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return (target as HTMLInputElement).type !== "range";
  return false;
}

export function initTimeControls(clock: SimClock, sounds: Soundscape): void {
  const pauseBtn = getElement<HTMLButtonElement>("pause-btn");
  const slider = getElement<HTMLInputElement>("warp-slider");
  const label = getElement<HTMLSpanElement>("warp-label");
  const presetBtns = Array.from(document.querySelectorAll<HTMLButtonElement>(".preset-btn"));

  function syncPauseButton(): void {
    pauseBtn.textContent = clock.paused ? "Resume" : "Pause";
    pauseBtn.setAttribute("aria-pressed", String(clock.paused));
  }

  function syncWarpControls(): void {
    slider.value = String(warpToSlider(clock.warp));
    label.textContent = formatWarp(clock.warp);
    for (const btn of presetBtns) {
      btn.setAttribute("aria-pressed", String(Number(btn.dataset.warpPreset) === clock.warp));
    }
  }

  /** Single write path: clamp, apply to the clock, then mirror to the DOM. */
  function applyWarp(rate: number): void {
    clock.setWarp(clampWarp(rate));
    syncWarpControls();
  }

  function setPaused(paused: boolean): void {
    clock.setPaused(paused);
    syncPauseButton();
  }

  pauseBtn.addEventListener("click", () => {
    setPaused(!clock.paused);
    sounds.blip("toggle");
  });

  for (const btn of presetBtns) {
    btn.addEventListener("click", () => {
      applyWarp(Number(btn.dataset.warpPreset));
      sounds.blip("warp");
    });
  }

  slider.addEventListener("input", () => applyWarp(sliderToWarp(Number(slider.value))));

  window.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (isTypingTarget(target)) return;
    switch (event.key) {
      case " ":
        // preventDefault also suppresses the click a focused button would
        // otherwise fire, so Space always toggles pause, whatever has focus.
        event.preventDefault();
        setPaused(!clock.paused);
        sounds.blip("toggle");
        break;
      case "ArrowLeft":
      case "ArrowRight":
        // The warp slider owns its arrow keys (nudge the rate); everywhere
        // else arrows step the sim date.
        if (target?.tagName === "INPUT") return;
        event.preventDefault();
        clock.step(event.key === "ArrowLeft" ? -1 : 1);
        break;
      case "+":
      case "=":
        event.preventDefault();
        applyWarp(adjustWarp(clock.warp, 1));
        sounds.blip("warp");
        break;
      case "-":
      case "_":
        event.preventDefault();
        applyWarp(adjustWarp(clock.warp, -1));
        sounds.blip("warp");
        break;
    }
  });

  // The sim pauses when the tab loses focus (spec user story #40); the user
  // resumes manually. Both signals are covered: window blur fires on tab
  // switches and on leaving the browser window, visibilitychange on tab
  // switches that the page may not see as a blur.
  window.addEventListener("blur", () => setPaused(true));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) setPaused(true);
  });

  syncPauseButton();
  syncWarpControls();
}
