// scene.js — three.js world. Fixed camera. The plane is placed so it rides
// exactly on the screen-space dotted flight path (#route): we sample the SVG
// path, unproject that screen point onto the z=0 plane, and sit the plane there.
import * as THREE from "three";
import { buildPlane, PARTY_COLORS } from "./plane.js";

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export const app = {
  progress: 0,
  setProgress(p) { this.progress = Math.min(1, Math.max(0, p)); },
  triggerBurst() {},
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  ready: false,
};

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 28);
camera.lookAt(0, 0, 0);

// lights — soft and sunny
scene.add(new THREE.HemisphereLight(0xffffff, 0xffe3f1, 1.05));
const sun = new THREE.DirectionalLight(0xfff3c4, 1.15);
sun.position.set(6, 10, 12);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x8a5cff, 0.45);
rim.position.set(-8, 2, 6);
scene.add(rim);

// the plane
const plane = buildPlane();
plane.scale.setScalar(0.92);
scene.add(plane);

// ---- screen-path → world placement ----
const routePath = document.getElementById("route");
let routeLen = routePath.getTotalLength();
const Z0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z = 0 plane
const ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();

// SVG uses viewBox 0 0 1000 1000 with preserveAspectRatio="none" (stretches to
// fill the viewport), so viewBox→screen→ndc is a direct linear map.
function worldAt(f, out) {
  const len = Math.min(1, Math.max(0, f)) * routeLen;
  const p = routePath.getPointAtLength(len);   // viewBox units (0..1000)
  _ndc.set((p.x / 1000) * 2 - 1, -((p.y / 1000) * 2 - 1));
  ray.setFromCamera(_ndc, camera);
  ray.ray.intersectPlane(Z0, out);
  return out;
}

const _p1 = new THREE.Vector3();
const _p2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qYaw = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, -0.28); // gentle 3/4 view
const _qBank = new THREE.Quaternion();
let prevHeading = 0;

function placePlane(f) {
  worldAt(f, _p1);
  worldAt(Math.min(1, f + 0.004), _p2);
  plane.position.copy(_p1);

  _dir.copy(_p2).sub(_p1);
  if (_dir.lengthSq() < 1e-6) _dir.set(1, 0, 0);
  _dir.normalize();

  // nose along travel direction (side profile), then a slight yaw for a 3/4 look
  _q.setFromUnitVectors(X_AXIS, _dir);

  // bank into turns from heading change
  const heading = Math.atan2(_dir.y, _dir.x);
  let dh = heading - prevHeading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  prevHeading = heading;
  const roll = THREE.MathUtils.clamp(dh * 30, -0.7, 0.7);
  _qBank.setFromAxisAngle(_dir, roll);

  plane.quaternion.copy(_qBank).multiply(_q).multiply(_qYaw);
}

// ---------------- light confetti trail + finale burst ----------------
const CONFETTI = 360;
function dot() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d");
  x.beginPath(); x.arc(16, 16, 14, 0, Math.PI * 2); x.fillStyle = "#fff"; x.fill();
  return new THREE.CanvasTexture(c);
}
const cGeo = new THREE.BufferGeometry();
const cPos = new Float32Array(CONFETTI * 3);
const cCol = new Float32Array(CONFETTI * 3);
const cVel = new Float32Array(CONFETTI * 3);
const cLife = new Float32Array(CONFETTI);
for (let i = 0; i < CONFETTI; i++) cPos[i * 3 + 1] = -9999;
cGeo.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
cGeo.setAttribute("color", new THREE.BufferAttribute(cCol, 3));
const confetti = new THREE.Points(cGeo, new THREE.PointsMaterial({
  size: 0.42, map: dot(), vertexColors: true, transparent: true,
  alphaTest: 0.4, depthWrite: false, sizeAttenuation: true,
}));
confetti.frustumCulled = false;
scene.add(confetti);

let cur = 0;
const _c = new THREE.Color();
function spawn(origin, count, spread, up) {
  for (let n = 0; n < count; n++) {
    const i = cur; cur = (cur + 1) % CONFETTI;
    const ix = i * 3;
    cPos[ix] = origin.x + Math.sin(i * 12.98) * spread;
    cPos[ix + 1] = origin.y + Math.cos(i * 4.14) * spread * 0.5;
    cPos[ix + 2] = origin.z + Math.sin(i * 7.23) * spread;
    cVel[ix] = Math.sin(i * 3.7) * 0.05;
    cVel[ix + 1] = up + Math.cos(i * 2.1) * 0.03;
    cVel[ix + 2] = Math.cos(i * 5.3) * 0.05;
    _c.setHex(PARTY_COLORS[i % PARTY_COLORS.length]);
    cCol[ix] = _c.r; cCol[ix + 1] = _c.g; cCol[ix + 2] = _c.b;
    cLife[i] = 2.0 + (i % 5) * 0.25;
  }
  cGeo.attributes.position.needsUpdate = true;
  cGeo.attributes.color.needsUpdate = true;
}
app.triggerBurst = () => spawn(plane.position, 200, 5, 0.18);

// ---------------- render loop ----------------
const clock = new THREE.Clock();
const _tail = new THREE.Vector3();
let smooth = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  smooth += (app.progress - smooth) * Math.min(1, dt * 8);
  placePlane(app.reducedMotion ? app.progress : smooth);

  plane.userData.prop.rotation.x += dt * 20;

  // sparse confetti from the tail (skip for reduced motion)
  if (!app.reducedMotion && (clock.elapsedTime * 60 | 0) % 2 === 0) {
    plane.localToWorld(_tail.set(-2.6, 0.05, 0));
    spawn(_tail, 1, 0.25, -0.005);
  }

  for (let i = 0; i < CONFETTI; i++) {
    if (cLife[i] <= 0) continue;
    const ix = i * 3;
    cVel[ix + 1] -= dt * 0.8;
    cPos[ix] += cVel[ix]; cPos[ix + 1] += cVel[ix + 1]; cPos[ix + 2] += cVel[ix + 2];
    cLife[i] -= dt;
    if (cLife[i] <= 0) cPos[ix + 1] = -9999;
  }
  cGeo.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  routeLen = routePath.getTotalLength();
}
window.addEventListener("resize", onResize);

placePlane(0);
requestAnimationFrame(tick);
app.ready = true;

export { scene, camera };
