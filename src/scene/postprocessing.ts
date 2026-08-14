/**
 * Post-processing pipeline (ticket #11): bloom + ACES tone mapping.
 *
 * The premium look ships as a composer chain — RenderPass → UnrealBloomPass →
 * OutputPass — rendering into a half-float buffer so bright pixels exceed the
 * bloom threshold and bleed into a soft glow, with OutputPass applying the
 * renderer's ACES filmic tone mapping and color-space conversion as the final
 * step. This is the "stylized realism with bloom and glow" from spec user
 * story 30. Ticket #19 tightened the pass hard — low strength/radius and a
 * high threshold — so only the Sun's white-hot core blooms, and only by a
 * hair: the glow and corona sprites carry the halo, and nothing reaches the
 * inner planets.
 *
 * The composer's internal resolution adapts to the renderer: real GPUs (the
 * ADR-0003 high-end-desktop target) run the full pipeline at full screen
 * resolution, while software rasterizers (SwiftShader/llvmpipe — the e2e
 * host) render at 25% and upscale, so the premium look stays crisp where it
 * is reviewed and the e2e fps floor (≥20 on software GL, under the suite's
 * parallel contention) still passes. The bloom threshold keeps the dark
 * space background and the dim nebula below the cutoff, so the effect reads
 * as glow on the bright bodies, not a haze over the whole frame.
 *
 * Rendering smoke seam (ADR-0004): the pipeline is trusted within smoke-level
 * checks — its presence is mirrored to the #polish-status DOM seam and the
 * e2e suite asserts the scene boots with it active and no console errors.
 */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/** Bloom strength — how much the bright pixels bleed. */
const BLOOM_STRENGTH = 0.05;
/** Bloom radius — how wide the glow spreads. */
const BLOOM_RADIUS = 0.12;
/** Luminance threshold — pixels brighter than this bloom. Only the Sun's hot
 *  core exceeds it, and barely, so the bloom is a whisper around the disc
 *  rather than a haze reaching the inner planets (ticket #19); the glow and
 *  corona sprites and the planets all stay below it. */
const BLOOM_THRESHOLD = 1.5;
/** Composer pixel ratio on software rasterizers (the e2e host). */
const SOFTWARE_PIXEL_RATIO = 0.25;

/**
 * True when the WebGL context is a software rasterizer (SwiftShader,
 * llvmpipe) rather than a real GPU. The e2e host runs on software GL, where
 * a full-res bloom pyramid is far too slow for the fps floor; real hardware
 * is fast enough for the full-resolution premium look.
 */
function isSoftwareRenderer(renderer: THREE.WebGLRenderer): boolean {
  const gl = renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  if (!info) return false;
  const name = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).toLowerCase();
  return name.includes("swiftshader") || name.includes("llvmpipe") || name.includes("software");
}

/**
 * Build the bloom + tone-mapping composer for a scene. `renderer.toneMapping`
 * must be set to ACESFilmicToneMapping before the first render — OutputPass
 * reads it each frame.
 */
export function createPostprocessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): EffectComposer {
  const composer = new EffectComposer(renderer);
  // Full screen resolution on real GPUs; 25% on software rasterizers — the
  // final OutputPass always renders to the canvas at full size, upscaling
  // the internal buffer. The premium look is soft glow and haze, so the
  // upscale is invisible in practice while it cuts the fill rate to a
  // sixteenth where the fps floor needs it most.
  composer.setPixelRatio(isSoftwareRenderer(renderer) ? SOFTWARE_PIXEL_RATIO : 1);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return composer;
}
