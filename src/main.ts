import * as THREE from "three";
import { SolarSystemScene } from "./scene/scene";
import { dateToDaysSinceJ2000, SimClock, simDateToIso } from "./time/clock";

// Walking skeleton (ticket #4): the Sun and eight planets render on their
// Keplerian orbits from the clock's sim date, which starts at today's real
// date at the default one-sim-day-per-real-second warp.

const app = document.getElementById("app");
if (!app) throw new Error("missing #app mount point");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

// Sim date starts at today's real date; warp defaults to one sim-day per
// real second so motion is immediately visible.
const clock = new SimClock({ daysSinceJ2000: dateToDaysSinceJ2000(new Date()) });
const solarSystem = new SolarSystemScene(clock, app, window.innerWidth / window.innerHeight);

window.addEventListener("resize", () => {
  solarSystem.resize(window.innerWidth / window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// e2e seams: the boot marker is set only after the first frame has actually
// rendered; the sim-date readout mirrors the clock for the "starts at today"
// and "time advances" smoke checks.
let booted = false;
let lastSimDateIso = "";
const bootStatus = document.getElementById("boot-status");
const simDateEl = document.getElementById("sim-date");

const frameTimer = new THREE.Clock();
renderer.setAnimationLoop(() => {
  // Clamp the frame delta so a long tab-away doesn't jump the sim forward.
  const dt = Math.min(frameTimer.getDelta(), 0.25);
  clock.tick(dt);
  solarSystem.renderFrame(renderer);

  const iso = simDateToIso(clock.simDate).slice(0, 10);
  if (iso !== lastSimDateIso) {
    lastSimDateIso = iso;
    if (simDateEl) simDateEl.textContent = iso;
  }

  if (!booted) {
    booted = true;
    if (bootStatus) {
      bootStatus.textContent = "booted";
      bootStatus.removeAttribute("hidden");
    }
  }
});
