/**
 * Camera module: free flight & focus (ticket #5).
 *
 * Two states (CONTEXT.md):
 * - **free flight** — the default. The viewpoint orbits a fixed scene point
 *   (the view target, initially the Sun): left-drag rotates, right-drag pans
 *   the target in the view plane, scroll zooms the orbit distance.
 * - **focus** — one body is selected: the camera orbits the body and follows
 *   it as it moves. Clicking a body focuses it; clicking empty space releases
 *   back to free flight.
 *
 * Focusing animates a smooth transition from the current view to the body:
 * the view target and orbit distance ease in over TRANSITION_SECONDS (drag
 * and zoom stay live during the transition). Releasing anchors free flight at
 * the point being orbited, so the view never jumps.
 *
 * The rig owns the camera and all camera state. The scene supplies three
 * hooks — body world positions, preferred focus distances, and picking
 * (which body is under a screen point) — so the rig stays generic. Input is
 * attached to the renderer's canvas. The app supplies optional events so UI
 * can follow inspection: `onInspect` fires whenever a body is focused
 * (canvas click or a direct `focus()` call) and `onRelease` whenever focus
 * returns to free flight.
 *
 * Behavior is verified at the rendering-smoke / UI-interaction e2e seams
 * (ADR-0004); this module is not unit-tested.
 */

import * as THREE from "three";
import { clamp } from "../lib/math";
import type { Vec3 } from "../orbit/kepler";

/** Opening view: the whole compressed system fills the frame (same placement
 *  as the walking skeleton's overview camera). */
const INITIAL_POSITION = { x: 14, y: 12, z: 22 } as const;
const INITIAL_DISTANCE = Math.hypot(
  INITIAL_POSITION.x,
  INITIAL_POSITION.y,
  INITIAL_POSITION.z
);
/** Yaw (azimuth around world +Y) and pitch (elevation above the horizon). */
const INITIAL_YAW = Math.atan2(INITIAL_POSITION.x, INITIAL_POSITION.z);
const INITIAL_PITCH = Math.asin(INITIAL_POSITION.y / INITIAL_DISTANCE);

/** Radians of rotation per pixel of drag. */
const DRAG_SENSITIVITY = 0.005;
/** Exponential zoom factor per wheel deltaY unit. */
const WHEEL_SENSITIVITY = 0.0012;
/** Zoom limits, world units. */
const MIN_DISTANCE = 0.6;
const MAX_DISTANCE = 90;
/** Pitch clamp: just short of the poles so the view never flips. */
const MAX_PITCH = Math.PI / 2 - 0.02;
/** Pointer travel (px) under which a press-release counts as a click. */
const CLICK_MOVE_PX = 6;
/** Duration of the focus transition, seconds. */
const TRANSITION_SECONDS = 0.7;

export type CameraMode = "free" | "focus";

export interface CameraState {
  mode: CameraMode;
  /** Focused body name, or null in free flight. */
  focused: string | null;
  /** The point the camera orbits and looks at, world units. */
  target: [number, number, number];
  /** Orbit angles around the target. */
  yaw: number;
  pitch: number;
  /** Orbit radius around the target, world units. */
  distance: number;
  /** Camera world position. */
  position: [number, number, number];
}

export interface CameraRigHooks {
  /** World position of a body, or null if unknown. */
  getBodyPosition(name: string): Vec3 | null;
  /** Preferred orbit distance when focusing a body, world units. */
  getFocusDistance(name: string): number;
  /** The body under a client-space screen point, or null for empty space. */
  pickBody(clientX: number, clientY: number): string | null;
}

/** Optional inspection events the app can subscribe to (ticket #9 fact card). */
export interface CameraRigEvents {
  /** Fired whenever a body is focused — by a canvas click or a direct
   *  `focus()` call (e.g. clicking a body label). */
  onInspect?(name: string): void;
  /** Fired whenever focus is released back to free flight. */
  onRelease?(): void;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;

  private readonly hooks: CameraRigHooks;
  private readonly events: CameraRigEvents;
  private mode: CameraMode = "free";
  private focused: string | null = null;
  /** Current orbit/look point, world units. */
  private readonly target = new THREE.Vector3(0, 0, 0);
  private yaw = INITIAL_YAW;
  private pitch = INITIAL_PITCH;
  private distance = INITIAL_DISTANCE;
  /** Transition progress 0..1; 1 when no transition is running. */
  private transition = 1;
  private readonly startTarget = new THREE.Vector3();
  private startDistance = INITIAL_DISTANCE;
  private endDistance = INITIAL_DISTANCE;
  /** True once the user scrolls during a transition: distance stops easing. */
  private distanceLocked = false;
  /** Current camera position, recomputed every update. */
  private readonly position = new THREE.Vector3();

  private element: HTMLElement | null = null;
  private dragging = false;
  private dragButton = -1;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragMoved = 0;
  private readonly tmp = new THREE.Vector3();

  constructor(aspect: number, hooks: CameraRigHooks, events: CameraRigEvents = {}) {
    this.hooks = hooks;
    this.events = events;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
    this.apply();
    // Prime the inverse matrix so the first frame's label projection is
    // already correct (the renderer refreshes it every frame from here on).
    this.camera.updateMatrixWorld(true);
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
  }

  /** Attach pointer and wheel input to the renderer's canvas. */
  attach(element: HTMLElement): void {
    this.element = element;
    element.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    element.addEventListener("pointermove", (e) => this.onPointerMove(e));
    element.addEventListener("pointerup", (e) => this.onPointerUp(e));
    element.addEventListener("pointercancel", () => this.endDrag());
    element.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
    element.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /** Advance the camera one frame (transitions, focus following). */
  update(dt: number): void {
    if (this.mode === "focus" && this.focused) {
      const body = this.hooks.getBodyPosition(this.focused);
      if (body) {
        if (this.transition < 1) {
          this.transition = Math.min(1, this.transition + dt / TRANSITION_SECONDS);
          const e = easeInOutCubic(this.transition);
          this.target.lerpVectors(this.startTarget, this.tmp.set(body.x, body.y, body.z), e);
          if (!this.distanceLocked) {
            this.distance = this.startDistance + (this.endDistance - this.startDistance) * e;
          }
        } else {
          this.target.set(body.x, body.y, body.z);
        }
      }
    }
    this.apply();
  }

  /** Update the camera for a new viewport aspect ratio. */
  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Focus the camera on a body: orbit it and follow it as it moves. */
  focus(name: string): void {
    this.mode = "focus";
    this.focused = name;
    this.startTarget.copy(this.target);
    this.startDistance = this.distance;
    this.endDistance = Math.max(this.hooks.getFocusDistance(name), MIN_DISTANCE);
    this.transition = 0;
    this.distanceLocked = false;
    this.events.onInspect?.(name);
  }

  /** Release focus and return to free flight from the current vantage. */
  release(): void {
    if (this.mode !== "focus") return;
    this.mode = "free";
    this.focused = null;
    this.transition = 1;
    this.distanceLocked = false;
    // The target stays where it was — free flight resumes from the point
    // being orbited, so the view does not jump.
    this.events.onRelease?.();
  }

  /** Current view state — also the e2e observation seam. */
  get state(): CameraState {
    return {
      mode: this.mode,
      focused: this.focused,
      target: [this.target.x, this.target.y, this.target.z],
      yaw: this.yaw,
      pitch: this.pitch,
      distance: this.distance,
      position: [this.position.x, this.position.y, this.position.z]
    };
  }

  /** Place the camera at `target + spherical(yaw, pitch, distance)`. */
  private apply(): void {
    const cosPitch = Math.cos(this.pitch);
    this.position.set(
      this.target.x + this.distance * cosPitch * Math.sin(this.yaw),
      this.target.y + this.distance * Math.sin(this.pitch),
      this.target.z + this.distance * cosPitch * Math.cos(this.yaw)
    );
    this.camera.position.copy(this.position);
    this.camera.lookAt(this.target);
  }

  private onPointerDown(e: PointerEvent): void {
    this.dragging = true;
    this.dragButton = e.button;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragMoved = 0;
    this.element?.setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    this.dragMoved += Math.abs(dx) + Math.abs(dy);
    if (this.dragButton === 0) {
      this.yaw -= dx * DRAG_SENSITIVITY;
      this.pitch = clamp(this.pitch + dy * DRAG_SENSITIVITY, -MAX_PITCH, MAX_PITCH);
    } else if (this.dragButton === 2) {
      this.pan(dx, dy);
    }
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
  }

  private onPointerUp(e: PointerEvent): void {
    const wasClick = this.dragButton === 0 && this.dragMoved < CLICK_MOVE_PX;
    this.endDrag();
    if (wasClick) {
      const name = this.hooks.pickBody(e.clientX, e.clientY);
      if (name) this.focus(name);
      else this.release();
    }
  }

  private endDrag(): void {
    this.dragging = false;
    this.dragButton = -1;
    this.dragMoved = 0;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.distance = clamp(
      this.distance * Math.exp(e.deltaY * WHEEL_SENSITIVITY),
      MIN_DISTANCE,
      MAX_DISTANCE
    );
    // If the user zooms mid-transition, stop easing the distance.
    this.distanceLocked = this.transition < 1;
  }

  /** Shift the view target in the camera's view plane (free flight only). */
  private pan(dx: number, dy: number): void {
    if (this.mode !== "free" || !this.element) return;
    // Camera basis from the orbit angles (see apply()): the right vector
    // lies in the horizontal plane, the up vector tilts with the pitch.
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const up = new THREE.Vector3(
      -Math.sin(this.pitch) * Math.sin(this.yaw),
      Math.cos(this.pitch),
      -Math.sin(this.pitch) * Math.cos(this.yaw)
    );
    // World units per screen pixel at the target's distance.
    const worldPerPixel =
      (2 * this.distance * Math.tan((this.camera.fov * Math.PI) / 360)) / this.element.clientHeight;
    this.target.addScaledVector(right, -dx * worldPerPixel);
    this.target.addScaledVector(up, dy * worldPerPixel);
  }
}
