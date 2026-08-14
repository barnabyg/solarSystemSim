/**
 * Visual polish (ticket #11): the premium look, built procedurally — no image
 * assets, everything generated at runtime. This module supplies the scene's
 * polish pieces:
 *
 * - **Atmosphere shells** — a slightly larger sphere with a fresnel rim-glow
 *   shader (BackSide, additive), hugging a body so the day-lit limb glows in
 *   the body's atmosphere color (Venus' yellow-white, Earth's blue, Titan's
 *   orange haze). Body meshes are unit spheres scaled to the display radius,
 *   and each shell is a child of its body, so it rides along and re-scales
 *   with the body in both scale modes.
 * - **Saturn's rings** — a flat annulus with the catalog's band data baked
 *   into a 1D texture and sampled by radius in a shader, so the bands and the
 *   Cassini division (a genuine gap) render from the data. A child of Saturn's
 *   mesh, tilted by the real ~26.7° ring inclination.
 * - **Sun glow & corona** — additive billboard sprites around the Sun, so the
 *   bright core bleeds into a warm glow that the bloom pass amplifies.
 * - **Dense starfield** — two point layers (many small dim stars, fewer
 *   larger bright ones) for depth.
 * - **Nebula backdrop** — a huge BackSide sphere with a procedural canvas
 *   texture of faint color blotches, drawn behind everything.
 *
 * Rendering smoke seam (ADR-0004): the pieces are trusted within smoke-level
 * checks — presence counts are mirrored to the #polish-status DOM seam and the
 * e2e suite asserts them alongside "boots with no console errors". The pure
 * band-lookup math is unit-tested at the data seam.
 */

import * as THREE from "three";
import type { AtmosphereVisual, RingBand, RingVisual } from "../body/catalog";

/** Atmosphere shell radius, in units of the body's radius. */
const ATMOSPHERE_SHELL_RADIUS = 1.15;
/** Saturn's ring inclination, radians (~26.7° from the orbital plane). */
const RING_TILT = 0.466;
/** Samples across the ring radius for the band texture. */
const RING_TEXTURE_WIDTH = 256;
/** Outer radius of the starfield shell, world units. */
const STARFIELD_OUTER = 500;

/** Fresnel atmosphere shader: glow strongest at the day-lit limb. */
const ATMOSPHERE_VERTEX = /* glsl */ `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vNormal;
void main() {
  float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
  gl_FragColor = vec4(uColor, 1.0) * intensity * uIntensity;
}
`;

/**
 * Ring shader: color and alpha come from a 1D band texture sampled by the
 * vertex's local radius, normalized between the ring's inner and outer edges.
 * Gaps in the data (the Cassini division) bake to transparent texels.
 */
const RING_VERTEX = /* glsl */ `
varying vec2 vLocal;
void main() {
  vLocal = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RING_FRAGMENT = /* glsl */ `
uniform sampler2D uBands;
uniform float uInner;
uniform float uOuter;
varying vec2 vLocal;
void main() {
  float radius = length(vLocal);
  float u = (radius - uInner) / (uOuter - uInner);
  // Soft fade at the ring's extreme edges so the annulus ends blend away.
  float edge = smoothstep(0.0, 0.02, u) * smoothstep(1.0, 0.98, u);
  vec4 band = texture2D(uBands, vec2(u, 0.5));
  gl_FragColor = vec4(band.rgb, band.a * edge);
}
`;

/**
 * The color and opacity of a ring at `radius` (in body-radius units), or null
 * where no band covers the radius (a gap or the space beyond the ring system).
 * Pure function of the catalog data — the unit-tested data seam (ADR-0004).
 * Values are 0..1.
 */
export interface RingSample {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function ringColorAt(bands: RingBand[], radius: number): RingSample | null {
  const color = new THREE.Color();
  for (const band of bands) {
    if (radius >= band.inner && radius <= band.outer) {
      color.setHex(band.color);
      return { r: color.r, g: color.g, b: color.b, a: band.opacity };
    }
  }
  return null;
}

/**
 * Build a 1D RGBA texture of the ring's radial appearance from the catalog's
 * band data: each texel is the color/opacity at that fraction of the ring
 * radius, so the shader needs only a texture sample per pixel.
 */
function buildRingTexture(bands: RingBand[], inner: number, outer: number): THREE.DataTexture {
  const data = new Uint8Array(RING_TEXTURE_WIDTH * 4);
  for (let i = 0; i < RING_TEXTURE_WIDTH; i++) {
    const radius = inner + ((outer - inner) * (i + 0.5)) / RING_TEXTURE_WIDTH;
    const sample = ringColorAt(bands, radius);
    data[i * 4] = sample ? Math.round(sample.r * 255) : 0;
    data[i * 4 + 1] = sample ? Math.round(sample.g * 255) : 0;
    data[i * 4 + 2] = sample ? Math.round(sample.b * 255) : 0;
    data[i * 4 + 3] = sample ? Math.round(sample.a * 255) : 0;
  }
  const texture = new THREE.DataTexture(data, RING_TEXTURE_WIDTH, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * An atmosphere shell for a body with `atmosphere` data: a unit sphere scaled
 * ATMOSPHERE_SHELL_RADIUS (the body mesh's own scale carries the display
 * radius). Add as a child of the body mesh.
 */
export function createAtmosphereShell(atmosphere: AtmosphereVisual): THREE.Mesh {
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(atmosphere.color) },
        uIntensity: { value: atmosphere.intensity }
      },
      vertexShader: ATMOSPHERE_VERTEX,
      fragmentShader: ATMOSPHERE_FRAGMENT,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })
  );
  shell.scale.setScalar(ATMOSPHERE_SHELL_RADIUS);
  return shell;
}

/**
 * A ring system: a flat annulus in the body's equatorial plane, radii in
 * body-radius units (so the body mesh's scale — the display radius — carries
 * them), tilted by the real ring inclination. Add as a child of the body
 * mesh.
 */
export function createRings(rings: RingVisual): THREE.Mesh {
  const inner = rings.bands[0].inner;
  const outer = rings.bands[rings.bands.length - 1].outer;
  const geometry = new THREE.RingGeometry(inner, outer, 128);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uBands: { value: buildRingTexture(rings.bands, inner, outer) },
      uInner: { value: inner },
      uOuter: { value: outer }
    },
    vertexShader: RING_VERTEX,
    fragmentShader: RING_FRAGMENT,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2 + RING_TILT;
  return mesh;
}

/** A soft radial glow texture used by the Sun's glow and corona sprites. */
function createGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.25, "rgba(255, 230, 180, 0.85)");
  gradient.addColorStop(0.6, "rgba(255, 190, 120, 0.35)");
  gradient.addColorStop(1, "rgba(255, 160, 90, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/**
 * The Sun's glow and corona: two additive billboard sprites, children of the
 * Sun's mesh, so they scale with the Sun's display radius in both scale
 * modes. The inner sprite is the hot core glow; the outer one the faint
 * corona. Both carry colors above the bloom threshold, so the bloom pass
 * (which runs before OutputPass tone-maps the composed frame) picks them up
 * and spreads the glow.
 */
export function createSunGlow(): THREE.Group {
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: new THREE.Color(1.6, 1.3, 0.9),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      transparent: true
    })
  );
  glow.scale.set(3, 3, 1);

  const corona = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: new THREE.Color(1.1, 0.85, 0.5),
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      transparent: true
    })
  );
  corona.scale.set(6, 6, 1);

  const group = new THREE.Group();
  group.add(glow, corona);
  return group;
}

/** One starfield layer of `count` fixed-size points on a shell. */
function createStarLayer(count: number, size: number, opacity: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [0xffffff, 0xfff6e6, 0xd6e4ff, 0xffd9b3];
  const tint = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 250 + Math.random() * (STARFIELD_OUTER - 250);
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
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false
    })
  );
}

/** A dense starfield: many small dim stars plus fewer larger bright ones. */
export function createStarfield(): { group: THREE.Group; count: number } {
  const group = new THREE.Group();
  const small = createStarLayer(5000, 1.1, 0.8);
  const large = createStarLayer(800, 2.0, 1.0);
  group.add(small, large);
  // The count is derived from the layers actually built, so the seam that
  // mirrors it cannot drift from the construction.
  const count = (small.geometry.getAttribute("position") as THREE.BufferAttribute).count +
    (large.geometry.getAttribute("position") as THREE.BufferAttribute).count;
  return { group, count };
}

/**
 * The nebula backdrop: a huge BackSide sphere carrying a procedural canvas
 * texture of faint color blotches, drawn additively behind everything
 * (renderOrder -10 beats the transparent sorting so stars and orbit lines
 * stay in front).
 */
export function createNebula(): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const palette = [
    [52, 42, 120],
    [38, 74, 132],
    [96, 52, 128],
    [46, 96, 110],
    [110, 60, 96]
  ];
  for (let i = 0; i < 42; i++) {
    const [r, g, b] = palette[i % palette.length];
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 80 + Math.random() * 220;
    const alpha = 0.10 + Math.random() * 0.14;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(650, 48, 32),
    new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      fog: false
    })
  );
  mesh.renderOrder = -10;
  return mesh;
}
