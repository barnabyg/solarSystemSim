import * as THREE from "three";
import { CameraRig, type CameraState } from "./camera/camera";
import { SolarSystemScene } from "./scene/scene";
import { dateToDaysSinceJ2000, SimClock, simDateToIso } from "./time/clock";
import { initTimeControls } from "./ui/time-controls";

// Ticket #5 camera: the camera rig (free flight & focus) drives the view.
// The scene supplies the rig's hooks — body positions, focus distances, and
// picking — and the rig's canvas input handles drag/scroll/click.

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
initTimeControls(clock);

let solarSystem!: SolarSystemScene;
const cameraRig = new CameraRig(window.innerWidth / window.innerHeight, {
  getBodyPosition: (name) => solarSystem.bodyWorldPosition(name),
  getFocusDistance: (name) => solarSystem.focusDistance(name),
  pickBody: (clientX, clientY) => solarSystem.pickBody(clientX, clientY)
});
cameraRig.attach(renderer.domElement);
solarSystem = new SolarSystemScene(clock, cameraRig.camera, app);

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
// so the camera tests can observe the view.
let booted = false;
let lastSimDateIso = "";
let lastCameraText = "";
const bootStatus = document.getElementById("boot-status");
const simDateEl = document.getElementById("sim-date");
const cameraStateEl = document.getElementById("camera-state");
const e2eCamera = window as unknown as { __cameraState?: CameraState };

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

  if (!booted) {
    booted = true;
    if (bootStatus) {
      bootStatus.textContent = "booted";
      bootStatus.removeAttribute("hidden");
    }
  }
});
