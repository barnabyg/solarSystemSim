/**
 * Time controls UI (ticket #6): the bottom-center control bar — pause
 * toggle, log-scale warp slider, and the 1× / 1 h/s / 1 d/s / 1 mo/s
 * presets — plus the keyboard shortcuts (Space pauses, ←/→ step a sim day,
 * +/- double/halve the warp) and the tab-blur pause. Thin DOM wiring: every
 * state change flows through applyWarp/setPaused, which write to the clock
 * and mirror the change to the controls together, so the UI never drifts
 * from the sim state. Tested at the UI-interaction seam (ADR-0004) by the
 * e2e suite, not unit-tested.
 */

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

/** Shortcuts never steal keys from form controls or buttons. */
function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
}

export function initTimeControls(clock: SimClock): void {
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

  pauseBtn.addEventListener("click", () => setPaused(!clock.paused));

  for (const btn of presetBtns) {
    btn.addEventListener("click", () => applyWarp(Number(btn.dataset.warpPreset)));
  }

  slider.addEventListener("input", () => applyWarp(sliderToWarp(Number(slider.value))));

  window.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isInteractive(event.target)) return;
    switch (event.key) {
      case " ":
        event.preventDefault();
        setPaused(!clock.paused);
        break;
      case "ArrowLeft":
        event.preventDefault();
        clock.step(-1);
        break;
      case "ArrowRight":
        event.preventDefault();
        clock.step(1);
        break;
      case "+":
      case "=":
        event.preventDefault();
        applyWarp(adjustWarp(clock.warp, 1));
        break;
      case "-":
      case "_":
        event.preventDefault();
        applyWarp(adjustWarp(clock.warp, -1));
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

function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id} element`);
  return el as T;
}
