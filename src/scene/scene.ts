/**
 * Scene module: builds the Three.js scene — the Sun, eight planets, thirteen
 * moons, five dwarf planets and the asteroid belt on their Keplerian orbits,
 * with orbit lines, name labels, and a starfield backdrop (tickets #4 and
 * #8), plus the ticket #11 visual polish: bloom and tone mapping (wired in
 * main.ts via the composer), atmosphere shells, Saturn's rings with gaps, the
 * Sun's glow and corona, a dense starfield with a faint nebula backdrop, and
 * soft shadows from the Sun's point light. Positions come from the pure
 * orbit/scale modules at the clock's sim date. The camera is owned by the
 * camera rig (ticket #5); the scene receives it for rendering and label
 * projection, and supplies the rig's hooks — body positions, focus distances,
 * and picking. The scene is thin wiring: it is trusted within smoke-level
 * checks (ADR-0004), not unit-tested.
 */

import * as THREE from "three";
import {
  ASTEROID_BELT,
  DWARF_VISUALS,
  MOON_VISUALS,
  PLANET_VISUALS,
  SUN,
  SUN_NAME,
  type BodyVisual
} from "../body/catalog";
import { createRng } from "../lib/random";
import {
  DWARF_ELEMENTS,
  MOON_ELEMENTS,
  PLANET_ELEMENTS,
  PLANET_NAMES,
  type DwarfName,
  type MoonName,
  type PlanetName
} from "../orbit/elements";
import { orbitalPeriodDays, positionAt, type OrbitalElements, type Vec3 } from "../orbit/kepler";
import {
  compressedMoonOrbitRadius,
  eclipticToWorld,
  moonOrbitMaxRadius,
  scaleDistanceRatio,
  scaleMoonPosition,
  scalePosition,
  scaleRadius,
  type MoonOrbitNeighborhood,
  type ScaleMode
} from "../scale/scale";
import type { SimClock } from "../time/clock";
import { createAtmosphereShell, createNebula, createRings, createStarfield, createSunGlow } from "./polish";

/** Sample points per orbit line; 256 keeps lines smooth and rebuilds cheap. */
const ORBIT_SEGMENTS = 256;
/**
 * Seed for the belt's deterministic layout (ticket #13). The stylized belt is
 * built from random particle orbits and tints; a fixed seed makes it render
 * identically on every boot, which the golden screenshot suite needs.
 */
const BELT_RNG_SEED = 0xb31f;
/**
 * Rebuild orbit lines when the sim date has drifted this many days. Element
 * rates are per century (~1e-4 deg/day of shape drift), so a month of sim
 * time is invisible — and every body's period is longer than 30 days, so a
 * body always sits exactly on its freshly sampled line. This covers the
 * heliocentric lines (planets + dwarf planets) and the planetocentric moon
 * lines: the moon elements carry apsidal and nodal precession rates too, so
 * their shapes drift slowly and need the same refresh.
 */
const ORBIT_REBUILD_DAYS = 30;

/**
 * Visuals of every body that can be a moon's primary — the eight planets and
 * the five dwarf planets (Charon orbits Pluto). One map, so a moon's primary
 * needs no kind dispatch.
 */
const PRIMARY_VISUALS: Record<PlanetName | DwarfName, BodyVisual> = {
  ...PLANET_VISUALS,
  ...DWARF_VISUALS
};

/** Visuals of every body in the roster, keyed by canonical name. */
const ALL_VISUALS: Record<string, BodyVisual> = {
  [SUN_NAME]: SUN,
  ...PLANET_VISUALS,
  ...MOON_VISUALS,
  ...DWARF_VISUALS
};

/**
 * Orbital neighborhoods of the moon primaries (ticket #20): the extreme
 * heliocentric distances of each primary and of the adjacent planets' orbits,
 * fed to `moonOrbitMaxRadius`. Neighbors are the adjacent planets in
 * Sun-outward order — the orbit lines a moon's orbit must never cross (issue
 * #20). Dwarf-planet orbits are deliberately not neighbors: counting Ceres
 * (between Mars and Jupiter) would crush Jupiter's moon system into a sliver
 * under the clamp, and Pluto's orbit already crosses Neptune's (its perihelion
 * dips inside), leaving no finite gap either way — so Charon's tiny orbit is
 * unclamped.
 */
const MOON_PRIMARY_NEIGHBORHOODS: Record<PlanetName | DwarfName, MoonOrbitNeighborhood> = (() => {
  const neighborhoods = {} as Record<PlanetName | DwarfName, MoonOrbitNeighborhood>;
  for (let i = 0; i < PLANET_NAMES.length; i++) {
    const name = PLANET_NAMES[i];
    const e = PLANET_ELEMENTS[name];
    const inner = i > 0 ? PLANET_ELEMENTS[PLANET_NAMES[i - 1]] : null;
    const outer = i < PLANET_NAMES.length - 1 ? PLANET_ELEMENTS[PLANET_NAMES[i + 1]] : null;
    neighborhoods[name] = {
      perihelionAu: e.a0 * (1 - e.e0),
      aphelionAu: e.a0 * (1 + e.e0),
      innerNeighborAphelionAu: inner ? inner.a0 * (1 + inner.e0) : null,
      outerNeighborPerihelionAu: outer ? outer.a0 * (1 - outer.e0) : null
    };
  }
  const pluto = DWARF_ELEMENTS.Pluto;
  const neptune = PLANET_ELEMENTS.Neptune;
  neighborhoods.Pluto = {
    perihelionAu: pluto.a0 * (1 - pluto.e0),
    aphelionAu: pluto.a0 * (1 + pluto.e0),
    innerNeighborAphelionAu: neptune.a0 * (1 + neptune.e0),
    outerNeighborPerihelionAu: null
  };
  return neighborhoods;
})();

/**
 * A body's label kind for the ticket #21 size hierarchy: the Sun leads,
 * planets next, dwarf planets in between, moons recede — so overlapping
 * labels stay readable at the overview zoom.
 */
type LabelKind = "sun" | "planet" | "moon" | "dwarf";

/**
 * A moon's rendered state: its mesh (a child of `group`), the group that
 * rides along at the primary's world position, and the primary it orbits.
 * The planetocentric orbit line lives in the same group.
 */
interface MoonRender {
  mesh: THREE.Mesh;
  group: THREE.Object3D;
  primary: PlanetName | DwarfName;
}

export class SolarSystemScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /** DOM layer that carries the body name labels. */
  readonly labelLayer: HTMLDivElement;

  private readonly sunMesh: THREE.Mesh;
  private readonly planetMeshes = new Map<PlanetName, THREE.Mesh>();
  private readonly dwarfMeshes = new Map<DwarfName, THREE.Mesh>();
  private readonly moons = new Map<MoonName, MoonRender>();
  /** Heliocentric orbit lines (planets + dwarf planets), by body name. */
  private readonly orbitLines = new Map<PlanetName | DwarfName, THREE.Line>();
  /** Planetocentric moon orbit lines, by moon name (children of the moon's
   *  group, so they ride along with the primary). */
  private readonly moonLines = new Map<MoonName, THREE.Line>();
  private readonly labels = new Map<string, HTMLDivElement>();
  private readonly belt: THREE.Points;
  /** One stylized particle per asteroid, on real Keplerian elements. */
  private readonly beltParticles: OrbitalElements[];
  private readonly beltPositions: Float32Array;
  private readonly clock: SimClock;
  /** Active scale mode (ticket #10): compressed by default, true-scale when
   *  the toggle is on. All scale dispatch flows through this field. */
  private scaleMode: ScaleMode = "compressed";
  /** Meshes the camera rig picks against (Sun + planets + dwarfs + moons). */
  private readonly pickables: THREE.Object3D[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly pickNdc = new THREE.Vector2();
  /** Sim date at which the heliocentric orbit lines were last sampled. */
  private lineEpochDays = -Infinity;
  private readonly tmp = new THREE.Vector3();
  private readonly moonWorld = new THREE.Vector3();
  /** Atmosphere shells (ticket #11), one per atmosphere-bearing body. */
  private readonly atmosphereShells: THREE.Mesh[] = [];
  /** Total ring bands across all ring systems (ticket #11) — the seam. */
  private ringBandTotal = 0;
  /** The Sun's glow and corona sprites (ticket #11). */
  private readonly sunGlow: THREE.Group;
  /** Dense starfield layers and the nebula backdrop (ticket #11). */
  private readonly starfield: THREE.Group;
  private readonly starfieldCount: number;

  constructor(clock: SimClock, camera: THREE.PerspectiveCamera, root: HTMLElement) {
    this.clock = clock;
    this.camera = camera;

    this.scene.background = new THREE.Color(0x05060f);

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
      this.labels.set(name, this.createLabel(name, "planet"));
    }

    for (const name of Object.keys(DWARF_ELEMENTS) as DwarfName[]) {
      const mesh = this.buildDwarf(name);
      this.dwarfMeshes.set(name, mesh);
      this.scene.add(mesh);
      this.labels.set(name, this.createLabel(name, "dwarf"));
    }

    for (const name of Object.keys(MOON_ELEMENTS) as MoonName[]) {
      const moon = this.buildMoon(name);
      this.moons.set(name, moon);
      this.scene.add(moon.group);
      this.labels.set(name, this.createLabel(name, "moon"));
    }

    this.labels.set(SUN_NAME, this.createLabel(SUN_NAME, "sun"));
    this.pickables.push(
      this.sunMesh,
      ...this.planetMeshes.values(),
      ...this.dwarfMeshes.values(),
      ...[...this.moons.values()].map((m) => m.mesh)
    );

    const belt = this.buildBelt();
    this.belt = belt.points;
    this.beltParticles = belt.particles;
    this.beltPositions = belt.positions;
    this.scene.add(this.belt);

    // Ticket #11 polish: the Sun's glow rides on the Sun's mesh (so it scales
    // with the display radius in both scale modes), the dense starfield and
    // the nebula backdrop frame the whole system.
    this.sunGlow = createSunGlow();
    this.sunMesh.add(this.sunGlow);
    const starfield = createStarfield();
    this.starfield = starfield.group;
    this.starfieldCount = starfield.count;
    this.scene.add(this.starfield);
    const nebula = createNebula();
    this.scene.add(nebula);

    this.rebuildOrbitLines();
  }

  /** Number of labeled, focusable bodies: Sun + planets + moons + dwarfs. */
  get bodyCount(): number {
    return this.labels.size;
  }

  /** Number of particles in the stylized asteroid belt. */
  get beltParticleCount(): number {
    return this.beltParticles.length;
  }

  /** Number of atmosphere shells (ticket #11): one per atmosphere body. */
  get atmosphereShellCount(): number {
    return this.atmosphereShells.length;
  }

  /** Number of ring bands across all ring systems (ticket #11). */
  get ringBandCount(): number {
    return this.ringBandTotal;
  }

  /** Number of Sun glow/corona layers (ticket #11). */
  get sunGlowLayerCount(): number {
    return this.sunGlow.children.length;
  }

  /** Number of points in the dense starfield (ticket #11). */
  get starCount(): number {
    return this.starfieldCount;
  }

  /** Whether the nebula backdrop is present (ticket #11) — it always is. */
  get hasNebula(): boolean {
    return true;
  }

  /**
   * Ratio of the true-scale system size to the compressed size, measured at
   * Neptune's semi-major axis: the factor the camera zooms out by when the
   * toggle flips to true scale (and its inverse to flip back), so the same
   * view stays framed in both modes.
   */
  get systemScaleRatio(): number {
    return scaleDistanceRatio(PLANET_ELEMENTS.Neptune.a0);
  }

  /**
   * Switch the scene's scale mode (compressed ↔ true-scale): every body mesh
   * is re-sized to the mode's display radius and the orbit lines are
   * re-sampled at the new mapping (they are otherwise cached for 30 sim
   * days, so a toggle must invalidate them).
   */
  setScaleMode(mode: ScaleMode): void {
    this.scaleMode = mode;
    this.applyBodyScale();
    this.rebuildOrbitLines();
  }

  /**
   * Rendered display radius (mesh scale) of a body, or null if unknown —
   * the scale-toggle e2e seam. Reads the actual mesh transform, like the
   * belt seam reads the rendered particle buffer.
   */
  bodyScale(name: string): number | null {
    let mesh: THREE.Object3D | undefined;
    if (name === SUN_NAME) mesh = this.sunMesh;
    else if (this.planetMeshes.has(name as PlanetName)) mesh = this.planetMeshes.get(name as PlanetName);
    else if (this.dwarfMeshes.has(name as DwarfName)) mesh = this.dwarfMeshes.get(name as DwarfName);
    else if (this.moons.has(name as MoonName)) mesh = this.moons.get(name as MoonName)?.mesh;
    return mesh ? mesh.scale.x : null;
  }

  /** Current world position of a belt particle — the e2e motion seam. */
  beltParticlePosition(index: number): Vec3 {
    const i = index * 3;
    return { x: this.beltPositions[i], y: this.beltPositions[i + 1], z: this.beltPositions[i + 2] };
  }

  /**
   * Advance the scene one frame: move every body to its position at the
   * clock's current sim date, keep the belt particles on their orbits, and
   * keep the labels glued to the bodies. Call once per frame, before the
   * camera rig's update and the render.
   */
  sync(): void {
    const t = this.clock.simDate;
    for (const [name, mesh] of this.planetMeshes) {
      const world = eclipticToWorld(scalePosition(positionAt(PLANET_ELEMENTS[name], t), this.scaleMode));
      mesh.position.set(world.x, world.y, world.z);
      this.syncLabel(this.labels.get(name)!, world);
    }
    for (const [name, mesh] of this.dwarfMeshes) {
      const world = eclipticToWorld(scalePosition(positionAt(DWARF_ELEMENTS[name], t), this.scaleMode));
      mesh.position.set(world.x, world.y, world.z);
      this.syncLabel(this.labels.get(name)!, world);
    }
    for (const [name, moon] of this.moons) {
      // The group rides on the primary's world position; the mesh holds the
      // planetocentric offset, so the moon orbits the primary as it moves.
      const primaryWorld = this.bodyWorldPosition(moon.primary);
      moon.group.position.set(primaryWorld!.x, primaryWorld!.y, primaryWorld!.z);
      const offset = this.moonOffset(name, t);
      moon.mesh.position.set(offset.x, offset.y, offset.z);
      this.syncLabel(this.labels.get(name)!, this.moonWorldPosition(name)!);
    }
    this.syncLabel(this.labels.get(SUN_NAME)!, { x: 0, y: 0, z: 0 });
    this.syncBelt(t);

    if (Math.abs(t - this.lineEpochDays) >= ORBIT_REBUILD_DAYS) {
      this.rebuildOrbitLines();
    }
  }

  /** World position of a body (Sun, planet, dwarf, or moon), or null if
   *  unknown. */
  bodyWorldPosition(name: string): Vec3 | null {
    if (name === SUN_NAME) return { x: 0, y: 0, z: 0 };
    const planet = this.planetMeshes.get(name as PlanetName);
    if (planet) return { x: planet.position.x, y: planet.position.y, z: planet.position.z };
    const dwarf = this.dwarfMeshes.get(name as DwarfName);
    if (dwarf) return { x: dwarf.position.x, y: dwarf.position.y, z: dwarf.position.z };
    const moon = this.moons.get(name as MoonName);
    if (moon) return this.moonWorldPosition(name as MoonName);
    return null;
  }

  /** Preferred focus orbit distance for a body, in world units. */
  focusDistance(name: string): number {
    const radiusKm = this.bodyRadiusKm(name);
    if (!radiusKm) return 3;
    return Math.max(scaleRadius(radiusKm, this.scaleMode) * 4, 2.5);
  }

  /** Physical radius [km] of a body, or undefined for unknown names. */
  private bodyRadiusKm(name: string): number | undefined {
    return ALL_VISUALS[name]?.radiusKm;
  }

  /** The body whose mesh is under a client-space screen point, or null. */
  pickBody(clientX: number, clientY: number): string | null {
    this.pickNdc.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pickNdc, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
    if (!hit) return null;
    return (hit.object.userData.name as string | undefined) ?? null;
  }

  /**
   * Rendered orbit radius of a moon's far point (apocenter) in the active
   * scale mode — the ticket #20 e2e seam. Mirrors the orbit the scene draws:
   * clamped to the primary's neighborhood in compressed mode, untouched in
   * true-scale mode. Returns null for unknown names.
   */
  moonOrbitRadius(name: MoonName): number | null {
    const orbit = MOON_ELEMENTS[name];
    if (!orbit) return null;
    const primary = PRIMARY_VISUALS[orbit.primary];
    const displayRadius = scaleRadius(primary.radiusKm, this.scaleMode);
    return compressedMoonOrbitRadius(
      primary.radiusKm,
      displayRadius,
      orbit.elements.a0 * (1 + orbit.elements.e0),
      this.moonOrbitMaxDisplayRadius(orbit.primary)
    );
  }

  /**
   * The neighborhood bound applied to a moon's orbit in the active scale mode —
   * the ticket #20 e2e seam. Null when no bound applies (true-scale mode, or a
   * primary with no finite gap to its neighbors).
   */
  moonOrbitBound(name: MoonName): number | null {
    const orbit = MOON_ELEMENTS[name];
    if (!orbit) return null;
    if (this.scaleMode !== "compressed") return null;
    return moonOrbitMaxRadius(MOON_PRIMARY_NEIGHBORHOODS[orbit.primary], "compressed");
  }

  /**
   * Neighborhood clamp for a moon orbit in the active mode (ticket #20):
   * `moonOrbitMaxRadius`'s bound in compressed mode, undefined in true-scale
   * mode (which must stay exactly as it was) and when the primary has no
   * finite gap. Passed to the moon orbit functions, so the drawn orbit — mesh
   * and line alike — never leaves the primary's neighborhood.
   */
  private moonOrbitMaxDisplayRadius(primary: PlanetName | DwarfName): number | undefined {
    if (this.scaleMode !== "compressed") return undefined;
    return moonOrbitMaxRadius(MOON_PRIMARY_NEIGHBORHOODS[primary], "compressed") ?? undefined;
  }

  /**
   * The Sun's disc: an unlit sphere bright enough (HDR values, tone mapping
   * disabled) to exceed the bloom threshold, so the core reads white-hot and
   * the glow/corona sprites (added by the constructor) bleed around it. It
   * never casts shadows — the point light sits at its center, so the disc
   * must not occlude the light it emits.
   */
  private buildSun(): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 32),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(2.2, 1.9, 1.4),
        toneMapped: false
      })
    );
    mesh.userData.name = SUN_NAME;
    this.setBodyScale(mesh, SUN.radiusKm);
    return mesh;
  }

  /**
   * The Sun is the light source: bodies are lit from its side. A neutral
   * ambient keeps the dark side faintly readable so no body disappears.
   * Ticket #11 soft shadows: the point light casts (PCFSoft shadow mapping is
   * enabled on the renderer in main.ts) and every body mesh casts/receives,
   * so a moon transiting a planet, or a planet passing in front of another,
   * drops a soft shadow. The Sun's own disc never casts — the light sits at
   * its center, so occluding it would shadow everything.
   */
  private addLights(): void {
    const light = new THREE.PointLight(0xfff2d9, 3, 0, 0);
    light.castShadow = true;
    // A point light renders six cube faces; 256² is the sweet spot between
    // the soft-shadow look and the fill rate — bodies are small in world
    // units and PCFSoft feathers the edges, so the low resolution reads as
    // soft shadowing. The far plane clears the outer system in both scale
    // modes (Eris sits at ~203 units in true scale). This matters on the e2e
    // host's software GL; the ADR-0003 60 fps target is the real budget.
    light.shadow.mapSize.set(256, 256);
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 260;
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.02;
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  }

  private buildPlanet(name: PlanetName): THREE.Mesh {
    const visual = PLANET_VISUALS[name];
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 16),
      new THREE.MeshStandardMaterial({ color: visual.color })
    );
    mesh.userData.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.setBodyScale(mesh, visual.radiusKm);
    // Ticket #11: the atmosphere shell and (for Saturn) the rings are
    // children of the body mesh, so they ride along and re-scale with it in
    // both scale modes. Both are transparent and never cast shadows.
    this.attachAtmosphere(mesh, visual);
    if (visual.rings) {
      const rings = createRings(visual.rings);
      this.ringBandTotal += visual.rings.bands.length;
      mesh.add(rings);
    }
    return mesh;
  }

  private buildDwarf(name: DwarfName): THREE.Mesh {
    const visual = DWARF_VISUALS[name];
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 12),
      new THREE.MeshStandardMaterial({ color: visual.color })
    );
    mesh.userData.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.setBodyScale(mesh, visual.radiusKm);
    return mesh;
  }

  /**
   * Build a moon's frame: a group that rides on the primary's world
   * position, holding the moon mesh (moved each frame to its planetocentric
   * offset). The planetocentric orbit line is created and refreshed by
   * `rebuildOrbitLines` into the same group.
   */
  private buildMoon(name: MoonName): MoonRender {
    const orbit = MOON_ELEMENTS[name];
    const group = new THREE.Object3D();
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshStandardMaterial({ color: MOON_VISUALS[name].color })
    );
    mesh.userData.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.setBodyScale(mesh, MOON_VISUALS[name].radiusKm);
    // Titan's thick orange haze (ticket #11) — a shell like the planets'.
    this.attachAtmosphere(mesh, MOON_VISUALS[name]);
    group.add(mesh);
    return { mesh, group, primary: orbit.primary };
  }

  /**
   * Ticket #11: attach an atmosphere shell to a body mesh that has
   * `atmosphere` data (the planets and Titan). The shell is a child of the
   * body mesh, so it rides along and re-scales with it in both scale modes;
   * it is transparent, additive, and never casts shadows. Shared by the
   * planet and moon builders so the attachment logic lives in one place.
   */
  private attachAtmosphere(mesh: THREE.Mesh, visual: BodyVisual): void {
    if (!visual.atmosphere) return;
    const shell = createAtmosphereShell(visual.atmosphere);
    this.atmosphereShells.push(shell);
    mesh.add(shell);
  }

  /**
   * Size a body mesh to the active mode's display radius. Meshes are unit
   * spheres; the mesh scale carries the radius, so a mode change is one
   * scalar per mesh — no geometry rebuild. Raycasting and lighting respect
   * the transform, so picking keeps working at either scale.
   */
  private setBodyScale(mesh: THREE.Mesh, radiusKm: number): void {
    mesh.scale.setScalar(scaleRadius(radiusKm, this.scaleMode));
  }

  /** Re-size every body mesh to the active mode's display radius. */
  private applyBodyScale(): void {
    this.setBodyScale(this.sunMesh, SUN.radiusKm);
    for (const [name, mesh] of this.planetMeshes) {
      this.setBodyScale(mesh, PLANET_VISUALS[name].radiusKm);
    }
    for (const [name, mesh] of this.dwarfMeshes) {
      this.setBodyScale(mesh, DWARF_VISUALS[name].radiusKm);
    }
    for (const [name, moon] of this.moons) {
      this.setBodyScale(moon.mesh, MOON_VISUALS[name].radiusKm);
    }
  }

  /** Planetocentric offset of a moon at `days`, in world units. */
  private moonOffset(name: MoonName, days: number): Vec3 {
    const orbit = MOON_ELEMENTS[name];
    const primary = PRIMARY_VISUALS[orbit.primary];
    const displayRadius = scaleRadius(primary.radiusKm, this.scaleMode);
    const offset = scaleMoonPosition(
      primary.radiusKm,
      displayRadius,
      positionAt(orbit.elements, days),
      this.moonOrbitMaxDisplayRadius(orbit.primary)
    );
    return eclipticToWorld(offset);
  }

  /** World position of a moon: its group's position plus its local offset. */
  private moonWorldPosition(name: MoonName): Vec3 {
    const moon = this.moons.get(name)!;
    this.moonWorld.copy(moon.group.position).add(moon.mesh.position);
    return { x: this.moonWorld.x, y: this.moonWorld.y, z: this.moonWorld.z };
  }

  /**
   * Planetocentric orbit positions for one full period, in world units. The
   * period comes from the JPL mean-longitude rate (360° × 36525 / Ldot) —
   * Kepler's third law does not apply to the moon elements' tiny AU
   * semi-major axes. Sampled fresh on the rebuild cadence so the slow
   * apsidal/nodal precession of the elements never leaves the moon off its
   * line.
   */
  private sampleMoonOrbit(name: MoonName, days: number): Float32Array {
    const orbit = MOON_ELEMENTS[name];
    const primary = PRIMARY_VISUALS[orbit.primary];
    const displayRadius = scaleRadius(primary.radiusKm, this.scaleMode);
    const maxRadius = this.moonOrbitMaxDisplayRadius(orbit.primary);
    const period = (360 * 36525) / orbit.elements.Ldot;
    const points = new Float32Array((ORBIT_SEGMENTS + 1) * 3);
    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      const t = (i / ORBIT_SEGMENTS) * period;
      const p = eclipticToWorld(
        scaleMoonPosition(primary.radiusKm, displayRadius, positionAt(orbit.elements, days + t), maxRadius)
      );
      points[i * 3] = p.x;
      points[i * 3 + 1] = p.y;
      points[i * 3 + 2] = p.z;
    }
    return points;
  }

  private orbitLineMaterial(): THREE.LineBasicMaterial {
    return new THREE.LineBasicMaterial({ color: 0x4a5a8a, transparent: true, opacity: 0.4 });
  }

  private createLabel(name: string, kind: LabelKind): HTMLDivElement {
    const el = document.createElement("div");
    // Ticket #21: the kind class and data-kind drive the label-size hierarchy
    // (Sun > planets > dwarf planets > moons) in index.html's stylesheet —
    // the e2e suite asserts the computed sizes through data-kind.
    el.className = `body-label body-label--${kind}`;
    el.dataset.body = name;
    el.dataset.kind = kind;
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
    const heliocentric: (PlanetName | DwarfName)[] = [
      ...this.planetMeshes.keys(),
      ...this.dwarfMeshes.keys()
    ];
    for (const name of heliocentric) {
      const points = this.sampleOrbit(name, this.lineEpochDays);
      let line = this.orbitLines.get(name);
      if (!line) {
        line = new THREE.Line(new THREE.BufferGeometry(), this.orbitLineMaterial());
        line.userData.name = name;
        this.orbitLines.set(name, line);
        this.scene.add(line);
      }
      this.setLinePoints(line, points);
    }
    // Moon lines are planetocentric, so they live inside the moon's group
    // (which rides on the primary) and only the geometry needs refreshing.
    for (const [name, moon] of this.moons) {
      const points = this.sampleMoonOrbit(name, this.lineEpochDays);
      let line = this.moonLines.get(name);
      if (!line) {
        line = new THREE.Line(new THREE.BufferGeometry(), this.orbitLineMaterial());
        line.userData.name = name;
        this.moonLines.set(name, line);
        moon.group.add(line);
      }
      this.setLinePoints(line, points);
    }
  }

  private setLinePoints(line: THREE.Line, points: Float32Array): void {
    const geometry = line.geometry as THREE.BufferGeometry;
    geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
    geometry.computeBoundingSphere();
  }

  /** Heliocentric orbit positions for one full period, in world units. */
  private sampleOrbit(name: PlanetName | DwarfName, days: number): Float32Array {
    const elements =
      name in PLANET_ELEMENTS
        ? PLANET_ELEMENTS[name as PlanetName]
        : DWARF_ELEMENTS[name as DwarfName];
    const period = orbitalPeriodDays(elements.a0);
    const points = new Float32Array((ORBIT_SEGMENTS + 1) * 3);
    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      const t = (i / ORBIT_SEGMENTS) * period;
      const world = eclipticToWorld(scalePosition(positionAt(elements, days + t), this.scaleMode));
      points[i * 3] = world.x;
      points[i * 3 + 1] = world.y;
      points[i * 3 + 2] = world.z;
    }
    return points;
  }

  /**
   * Build the stylized asteroid belt (ticket #8): one point per particle,
   * each on real Keplerian elements sampled from the catalog's belt
   * parameters — semi-major axes in [inner, outer], small eccentricities,
   * inclinations capped so the band stays within the catalog's vertical
   * half-thickness, and mean motions from Kepler's third law. Positions are
   * recomputed every frame, so the field rotates differentially — inner
   * particles lap outer ones exactly as the real belt does.
   */
  private buildBelt(): { points: THREE.Points; particles: OrbitalElements[]; positions: Float32Array } {
    const { innerRadiusAu, outerRadiusAu, halfThicknessAu, particleCount } = ASTEROID_BELT;
    /** Belt eccentricities stay small; real main-belt values cluster near 0.1. */
    const MAX_ECCENTRICITY = 0.15;
    // The inclination cap is per-particle: i_max(a) = atan2(halfThicknessAu,
    // a·(1 + e_max)) keeps |z| ≲ halfThicknessAu even at aphelion, so the
    // band honors the catalog's vertical half-thickness at every radius.
    const maxInclination = (a: number) =>
      (Math.atan2(halfThicknessAu, a * (1 + MAX_ECCENTRICITY)) * 180) / Math.PI;
    // Deterministic layout (ticket #13): a fixed-seed PRNG instead of
    // Math.random(), so the belt renders identically every boot — the golden
    // screenshot suite needs a stable scene. The per-frame motion (syncBelt)
    // is unaffected; only the construction is reproducible.
    const rand = createRng(BELT_RNG_SEED);
    const particles: OrbitalElements[] = [];
    for (let i = 0; i < particleCount; i++) {
      const a = innerRadiusAu + rand() * (outerRadiusAu - innerRadiusAu);
      particles.push({
        a0: a,
        adot: 0,
        e0: rand() * MAX_ECCENTRICITY,
        edot: 0,
        I0: rand() * maxInclination(a),
        Idot: 0,
        L0: rand() * 360,
        Ldot: (360 * 36525) / orbitalPeriodDays(a),
        peri0: rand() * 360,
        peridot: 0,
        node0: rand() * 360,
        nodedot: 0
      });
    }

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const base = new THREE.Color(0x9a8f82);
    for (let i = 0; i < particleCount; i++) {
      const p = eclipticToWorld(scalePosition(positionAt(particles[i], this.clock.simDate), this.scaleMode));
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      const dim = 0.5 + rand() * 0.5;
      colors[i * 3] = base.r * dim;
      colors[i * 3 + 1] = base.g * dim;
      colors[i * 3 + 2] = base.b * dim;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.06,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    return { points: new THREE.Points(geometry, material), particles, positions };
  }

  private syncBelt(t: number): void {
    const arr = this.beltPositions;
    for (let i = 0; i < this.beltParticles.length; i++) {
      const p = eclipticToWorld(scalePosition(positionAt(this.beltParticles[i], t), this.scaleMode));
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    }
    const attribute = (this.belt.geometry as THREE.BufferGeometry).getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    attribute.needsUpdate = true;
  }
}
