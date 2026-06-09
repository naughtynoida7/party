// plane.js — a party-painted low-poly airplane (procedural, no external asset).
// Built facing +X, tail-fin +Y (up), wings span ±Z  →  clean side profile when
// travelling horizontally across the screen.
import * as THREE from "three";

export const PARTY_COLORS = [0xff3ea5, 0xffd23f, 0x21d4c4, 0x8a5cff, 0xff8a3d];

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.5, metalness: 0.08, flatShading: true, ...opts,
  });
}

// confetti "livery": white body sprinkled with party-coloured dots
function liveryTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff8f0";
  ctx.fillRect(0, 0, 256, 256);
  const cols = ["#ff3ea5", "#ffd23f", "#21d4c4", "#8a5cff", "#ff8a3d"];
  for (let i = 0; i < 90; i++) {
    // deterministic scatter
    const x = (Math.sin(i * 12.9898) * 0.5 + 0.5) * 256;
    const y = (Math.sin(i * 78.233) * 0.5 + 0.5) * 256;
    const r = 4 + (i % 4) * 2;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildPlane() {
  const plane = new THREE.Group();

  // fuselage with confetti livery
  const fuselage = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.7, 3.2, 6, 16).rotateZ(Math.PI / 2),
    mat(0xffffff, { map: liveryTexture(), roughness: 0.55 })
  );
  plane.add(fuselage);

  // nose cone
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 1.3, 16).rotateZ(-Math.PI / 2),
    mat(0xff3ea5)
  );
  nose.position.x = 2.4;
  plane.add(nose);

  // cockpit glass
  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7),
    mat(0x8fefff, { roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.85 })
  );
  cockpit.position.set(0.6, 0.5, 0);
  plane.add(cockpit);

  // main wings (span along ±Z)
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 7.4), mat(0x21d4c4));
  wing.position.set(0.1, -0.05, 0);
  plane.add(wing);
  [-1, 1].forEach((s) => {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.5), mat(0x8a5cff));
    tip.position.set(0.1, 0, s * 3.7);
    plane.add(tip);
  });

  // tail fin (up) + horizontal stabiliser
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.16), mat(0xffd23f));
  fin.position.set(-2.0, 0.65, 0);
  plane.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 3.0), mat(0xff8a3d));
  stab.position.set(-2.1, 0.15, 0);
  plane.add(stab);

  // spinning propeller
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.3, 10).rotateZ(Math.PI / 2),
    mat(0x221033)
  );
  hub.position.x = 3.05;
  plane.add(hub);
  const prop = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1.7, 0.3),
      mat(0xfff8f0, { transparent: true, opacity: 0.9 })
    );
    blade.rotation.x = (i / 3) * Math.PI * 2;
    prop.add(blade);
  }
  prop.position.x = 3.1;
  plane.add(prop);

  plane.userData = { prop };
  return plane;
}
