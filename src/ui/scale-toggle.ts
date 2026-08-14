/**
 * Scale toggle UI (ticket #10): the button that flips between compressed
 * scale (the playable default) and true-scale mode (real distances with
 * readable bodies — ADR-0002). Thin DOM wiring: the button mirrors the
 * current mode (label + aria-pressed) and calls `onChange` on click; main.ts
 * applies the mode to the scene and reframes the camera. Tested at the
 * UI-interaction seam (ADR-0004) by the e2e suite, not unit-tested.
 */

import type { ScaleMode } from "../scale/scale";

export interface ScaleToggleOptions {
  /** Mode at startup. Defaults to compressed (the spec default). */
  initialMode?: ScaleMode;
  /** Fired with the new mode on every toggle click. */
  onChange(mode: ScaleMode): void;
}

/** Button label per mode: the button reads out the mode it is currently in. */
const MODE_LABEL: Record<ScaleMode, string> = {
  compressed: "Scale: Compressed",
  true: "Scale: True scale"
};

export function initScaleToggle(options: ScaleToggleOptions): void {
  const button = getElement<HTMLButtonElement>("scale-toggle");
  let mode: ScaleMode = options.initialMode ?? "compressed";

  function sync(): void {
    button.textContent = MODE_LABEL[mode];
    button.setAttribute("aria-pressed", String(mode === "true"));
  }

  button.addEventListener("click", () => {
    mode = mode === "compressed" ? "true" : "compressed";
    sync();
    options.onChange(mode);
  });

  sync();
}

function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id} element`);
  return el as T;
}
