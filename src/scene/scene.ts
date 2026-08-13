/**
 * Scene module: builds the Three.js scene for the walking skeleton (ticket #4)
 * — the Sun and eight planets on their Keplerian orbits, orbit lines, name
 * labels, and a basic starfield backdrop. Positions come from the pure
 * orbit/scale modules at the clock's sim date, so the scene itself is thin
 * wiring: it is trusted within smoke-level checks (ADR-0004), not unit-tested.
 */

import * as THREE from "three";
import { PLANET_VISUALS, SUN, SUN_NAME } from "../body/catalog";
import { PLANET_ELEMENTS, type PlanetName } from "../orbit/elements";
import { orbitalPeriodDays, positionAt, type Vec3 } from "../orbit/kepler";
import { compressedRadius, eclipticToWorld, scalePosition } from "../scale/scale";
import type { SimClock } from "../time/clock";

/** Sample points per orbit line; 256 keeps lines smooth and rebuilds cheap. */
const ORBIT_SEGMENTS = 256;
/**
 * Rebuild orbit lines when the sim date has drifted this many days. Element
 * rates are per century (~1e-4 deg/day of shape drift), so a month of sim
 * time is invisible — and every planet's period is longer than 30 days, so a
 * body always sits exactly on its freshly sampled line.
 */
const ORBIT_REBUILD_DAYS = 30;
/** Overview camera placement: the whole compressed system fills the frame. */
const CAMERA_POSITION = { x: 14, y: 12, z: 22 } as const;

export class SolarSystemScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /** DOM layer that carries the body name labels. */
  readonly labelLayer: HTMLDivElement;

  private readonly clock: SimClock;
  private readonly sunMesh: THREE.Mesh;
  private readonly planetMeshes = new Map<PlanetName, THREE.Mesh>();
  private readonly orbitLines = new Map<PlanetName, THREE.Line>();
  private readonly labels = new Map<PlanetName, HTMLDivElement>();
  private readonly sunLabel: HTMLDivElement;
  /** Sim date at which the orbit lines were last sampled. */
  private lineEpochDays = -Infinity;
  private readonly tmp = new THREE.Vector3();

  constructor(clock: SimClock, root: HTMLElement, aspect: number) {
    this.clock = clock;

    this.scene.background = new THREE.Color(0x05060f);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
    this.camera.position.set(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
    this.camera.lookAt(0, 0, 0);
    // The renderer refreshes matrixWorldInverse every frame; prime it once so
    // the first frame's label projection is already correct.
    this.camera.updateMatrixWorld(true);
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();

    this.labelLayer = document.createElement("div");
    this.labelLayer.className = "label-layer";
    root.appendChild(this.labelLayer);

    this.sunMesh = this.buildSun();
    this.scene.add(this.sunMesh);
    this.addLights();

    for (const name of Object.keys(PLANET_ELEMENTS) as PlanetName[]) {
      const mesh = this.buildPlanet(name);
      this.planetMeshes.set(name, mesh);
      this.scene.add(mesh);
      this.labels.set(name, this.createLabel(name));
    }

    this.sunLabel = this.createLabel(SUN_NAME);
    this.addStarfield();
    this.rebuildOrbitLines();
  }

  /**
   * Advance the scene one frame: move every body to its position at the
   * clock's current sim date, keep the labels glued to the bodies, and draw.
   * Call once per rendered frame.
   */
  renderFrame(renderer: THREE.WebGLRenderer): void {
    this.sync();
    renderer.render(this.scene, this.camera);
  }

  /** Update the camera for a new viewport aspect ratio. */
  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  private sync(): void {
    const t = this.clock.simDate;
    for (const [name, mesh] of this.planetMeshes) {
      const world = eclipticToWorld(scalePosition(positionAt(PLANET_ELEMENTS[name], t)));
      mesh.position.set(world.x, world.y, world.z);
      this.syncLabel(this.labels.get(name)!, world);
    }
    this.syncLabel(this.sunLabel, { x: 0, y: 0, z: 0 });

    if (Math.abs(t - this.lineEpochDays) >= ORBIT_REBUILD_DAYS) {
      this.rebuildOrbitLines();
    }
  }

  private buildSun(): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(compressedRadius(SUN.radiusKm), 48, 32),
      new THREE.MeshBasicMaterial({ color: SUN.color })
    );
    mesh.userData.name = SUN_NAME;
    return mesh;
  }

  /** The Sun is the light source: bodies are lit from its side. A neutral
   *  ambient keeps the dark side faintly readable so no planet disappears. */
  private addLights(): void {
    this.scene.add(new THREE.PointLight(0xfff2d9, 3, 0, 0));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  }

  private buildPlanet(name: PlanetName): THREE.Mesh {
    const visual = PLANET_VISUALS[name];
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(compressedRadius(visual.radiusKm), 32, 16),
      new THREE.MeshStandardMaterial({ color: visual.color })
    );
    mesh.userData.name = name;
    return mesh;
  }

  private createLabel(name: string): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "body-label";
    el.dataset.body = name;
    el.textContent = name;
    this.labelLayer.appendChild(el);
    return el;
  }

  private syncLabel(el: HTMLDivElement, world: Vec3): void {
    this.tmp.set(world.x, world.y, world.z).project(this.camera);
    // Points behind the camera project outside [-1, 1] on either side; hide
    // the label rather than letting it mirror onto the screen.
    if (Math.abs(this.tmp.z) > 1) {
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    const x = (this.tmp.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-this.tmp.y * 0.5 + 0.5) * window.innerHeight;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -150%)`;
  }

  private rebuildOrbitLines(): void {
    this.lineEpochDays = this.clock.simDate;
    for (const name of this.planetMeshes.keys()) {
      const points = this.sampleOrbit(name, this.lineEpochDays);
      let line = this.orbitLines.get(name);
      if (!line) {
        line = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({ color: 0x4a5a8a, transparent: true, opacity: 0.4 })
        );
        line.userData.name = name;
        this.orbitLines.set(name, line);
        this.scene.add(line);
      }
      const geometry = line.geometry as THREE.BufferGeometry;
      geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
      geometry.computeBoundingSphere();
    }
  }

  /** Heliocentric orbit positions for one full period, in world units. */
  private sampleOrbit(name: PlanetName, days: number): Float32Array {
    const elements = PLANET_ELEMENTS[name];
    const period = orbitalPeriodDays(elements.a0);
    const points = new Float32Array((ORBIT_SEGMENTS + 1) * 3);
    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      const t = (i / ORBIT_SEGMENTS) * period;
      const world = eclipticToWorld(scalePosition(positionAt(elements, days + t)));
      points[i * 3] = world.x;
      points[i * 3 + 1] = world.y;
      points[i * 3 + 2] = world.z;
    }
    return points;
  }

  /** A dense backdrop of fixed-size star points. */
  private addStarfield(): void {
    const count = 2500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [0xffffff, 0xfff6e6, 0xd6e4ff, 0xffd9b3];
    const tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 250 + Math.random() * 250;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      const dim = 0.6 + Math.random() * 0.4;
      tint.setHex(palette[Math.floor(Math.random() * palette.length)]);
      colors[i * 3] = tint.r * dim;
      colors[i * 3 + 1] = tint.g * dim;
      colors[i * 3 + 2] = tint.b * dim;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 1.4,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    this.scene.add(new THREE.Points(geometry, material));
  }
}
