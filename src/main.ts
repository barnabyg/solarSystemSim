import * as THREE from "three";
import { initSoundscape, type SoundscapeState } from "./audio/soundscape";
import { CameraRig, type CameraState } from "./camera/camera";
import type { Vec3 } from "./orbit/kepler";
import { SolarSystemScene } from "./scene/scene";
import { dateToDaysSinceJ2000, SimClock, simDateToIso } from "./time/clock";
import { initFactCard } from "./ui/fact-card";
import { initScaleToggle } from "./ui/scale-toggle";
import { initTimeControls } from "./ui/time-controls";

// Ticket #5 camera: the camera rig (free flight & focus) drives the view.
// The scene supplies the rig's hooks — body positions, focus distances, and
// picking — and the rig's canvas input handles drag/scroll/click.
// Ticket #9 fact card: inspecting a body (canvas click or label click, both
// of which focus it) opens the card; releasing focus closes it.
// Ticket #10 scale toggle: flipping the mode re-draws the system at real
// distances (true scale) or the playable compressed scale, then reframes the
// camera by the system-scale ratio so the view stays coherent.
// Ticket #12 soundscape: a procedural ambient pad plus UI blips, muted by a
// toggle in the control bar. Browsers block autoplay, so the AudioContext is
// created on load and resumed by the first user gesture; the UI modules blip
// at their own interaction points and the seams below mirror the state for
// the e2e suite.

const app = document.getElementById("app");
if (!app) throw new Error("missing #app mount point");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

// Sim date starts at today's real date; warp defaults to one sim-day per
// real second so motion is immediately visible.
const clock = new SimClock({ daysSinceJ2000: dateToDaysSinceJ2000(new Date()) });

// Ticket #6 time controls: the bottom-center control bar (pause, warp
// slider, presets), keyboard shortcuts, and tab-blur pause all write to the
// clock; the corner readout below mirrors it every frame.
const soundscape = initSoundscape();
initTimeControls(clock, soundscape);

// Ticket #9 fact card: opens when a body is inspected and closes when focus
// is released (clicking away in the scene). Escape and the card's own close
// button are handled inside the card module.
const factCard = initFactCard(soundscape);

let solarSystem!: SolarSystemScene;
const cameraRig = new CameraRig(
  window.innerWidth / window.innerHeight,
  {
    getBodyPosition: (name) => solarSystem.bodyWorldPosition(name),
    getFocusDistance: (name) => solarSystem.focusDistance(name),
    pickBody: (clientX, clientY) => solarSystem.pickBody(clientX, clientY)
  },
  {
    onInspect: (name) => factCard.show(name),
    onRelease: () => factCard.hide()
  }
);
cameraRig.attach(renderer.domElement);
solarSystem = new SolarSystemScene(clock, cameraRig.camera, app);

// Ticket #10 scale toggle: the button flips the scene between compressed
// scale (default) and true-scale mode, then reframes the camera by the
// system-scale ratio so the same view stays framed and bodies remain
// findable at real distances. The active mode is mirrored to the #scale-mode
// seam (compressed | true) for the e2e suite.
const scaleModeEl = document.getElementById("scale-mode");
/** Mirror the active scale mode to the #scale-mode seam for the e2e suite. */
function mirrorScaleMode(mode: string): void {
  if (!scaleModeEl) return;
  scaleModeEl.textContent = mode;
  scaleModeEl.dataset.mode = mode;
}
mirrorScaleMode("compressed");
initScaleToggle({
  onChange: (mode) => {
    solarSystem.setScaleMode(mode);
    const ratio = solarSystem.systemScaleRatio;
    cameraRig.adjustScale(mode === "true" ? ratio : 1 / ratio);
    mirrorScaleMode(mode);
  }
});

// The one-line hint stays up until the first interaction. It is
// pointer-events: none, so clicks and drags pass through it to the canvas —
// the first canvas interaction dismisses it.
const hint = document.getElementById("hint");
function dismissHint(): void {
  if (hint && !hint.hidden) hint.hidden = true;
}
renderer.domElement.addEventListener("pointerdown", dismissHint);
renderer.domElement.addEventListener("wheel", dismissHint);

// Body labels are clickable: clicking a label focuses its body directly,
// without needing to hit the mesh through the canvas.
solarSystem.labelLayer.addEventListener("click", (event) => {
  const label = (event.target as HTMLElement).closest("[data-body]");
  if (!label) return;
  cameraRig.focus(label.getAttribute("data-body")!);
  dismissHint();
});

window.addEventListener("resize", () => {
  cameraRig.resize(window.innerWidth / window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// e2e seams: the boot marker is set only after the first frame has actually
// rendered; the sim-date readout mirrors the clock for the "starts at today"
// and "time advances" smoke checks; the camera state (mode / focused body /
// numeric view state) is mirrored to a hidden DOM element and to the window
// so the camera tests can observe the view. The roster seam (ticket #8)
// mirrors the scene's body and belt-particle counts so the full-roster smoke
// test can assert the whole system is present.
let booted = false;
let lastSimDateIso = "";
let lastCameraText = "";
let lastAudioText = "";
const bootStatus = document.getElementById("boot-status");
const simDateEl = document.getElementById("sim-date");
const cameraStateEl = document.getElementById("camera-state");
const rosterStatus = document.getElementById("roster-status");
const e2eCamera = window as unknown as { __cameraState?: CameraState };
const e2eScene = window as unknown as {
  __beltParticlePosition?: () => [number, number, number];
  __bodyPosition?: (name: string) => Vec3 | null;
  __bodyScale?: (name: string) => number | null;
};
const e2eAudio = window as unknown as { __soundscape?: SoundscapeState };
const audioStatusEl = document.getElementById("audio-status");

rosterStatus!.dataset.bodies = String(solarSystem.bodyCount);
rosterStatus!.dataset.belt = String(solarSystem.beltParticleCount);
rosterStatus!.textContent = `${solarSystem.bodyCount} bodies, ${solarSystem.beltParticleCount} belt particles`;
rosterStatus!.removeAttribute("hidden");
// The belt-motion seam reads the actual rendered particle buffer.
e2eScene.__beltParticlePosition = () => {
  const p = solarSystem.beltParticlePosition(0);
  return [p.x, p.y, p.z];
};
// The body-position seam (ticket #10) exposes the rendered world position of
// any body, so the scale-toggle test can assert the Earth↔Neptune distance
// relationship in both scale modes.
e2eScene.__bodyPosition = (name) => solarSystem.bodyWorldPosition(name);
// The body-scale seam reads a body's rendered mesh scale — the same
// surface the toggle test uses to assert bodies stay readable at real
// distances (they shrink from compressed size, but never below the floor).
e2eScene.__bodyScale = (name) => solarSystem.bodyScale(name);

const frameTimer = new THREE.Clock();
renderer.setAnimationLoop(() => {
  // Clamp the frame delta so a long tab-away doesn't jump the sim forward.
  const dt = Math.min(frameTimer.getDelta(), 0.25);
  clock.tick(dt);
  solarSystem.sync();
  cameraRig.update(dt);
  solarSystem.render(renderer);

  const iso = simDateToIso(clock.simDate).slice(0, 10);
  if (iso !== lastSimDateIso) {
    lastSimDateIso = iso;
    if (simDateEl) simDateEl.textContent = iso;
  }

  const cameraState = cameraRig.state;
  e2eCamera.__cameraState = cameraState;
  const cameraText =
    cameraState.mode === "focus" ? `focus:${cameraState.focused}` : cameraState.mode;
  if (cameraText !== lastCameraText) {
    lastCameraText = cameraText;
    if (cameraStateEl) cameraStateEl.textContent = cameraText;
  }

  // Ticket #12 audio seam: mirror the live soundscape state (context state,
  // mute flag, blip counts) to the window and a short string to the hidden
  // #audio-status element, so the soundscape e2e spec can observe what was
  // actually played.
  e2eAudio.__soundscape = soundscape.state;
  const audioText = `${soundscape.state.contextState}${soundscape.muted ? ",muted" : ""}`;
  if (audioText !== lastAudioText) {
    lastAudioText = audioText;
    if (audioStatusEl) audioStatusEl.textContent = audioText;
  }

  if (!booted) {
    booted = true;
    if (bootStatus) {
      bootStatus.textContent = "booted";
      bootStatus.removeAttribute("hidden");
    }
  }
});
