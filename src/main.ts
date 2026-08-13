import * as THREE from "three";

// Tracer scene: a single spinning body with lighting. Ticket #2 (project
// scaffold) exists to prove the toolchain — the real solar system arrives
// with ticket #4 (walking skeleton scene).

const app = document.getElementById("app");
if (!app) throw new Error("missing #app mount point");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060f);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 4);
camera.lookAt(0, 0, 0);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(0.8, 32, 32),
  new THREE.MeshStandardMaterial({
    color: 0xffcc66,
    emissive: 0xff8800,
    emissiveIntensity: 0.6
  })
);
scene.add(sun);

const light = new THREE.DirectionalLight(0xffffff, 2.5);
light.position.set(3, 2, 4);
scene.add(light);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// e2e seam: the boot marker is set only after the first frame has actually
// rendered, so tests asserting it prove the render loop is alive.
let booted = false;
renderer.setAnimationLoop(() => {
  sun.rotation.y += 0.01;
  renderer.render(scene, camera);
  if (!booted) {
    booted = true;
    const status = document.getElementById("boot-status");
    if (status) {
      status.textContent = "booted";
      status.removeAttribute("hidden");
    }
  }
});
