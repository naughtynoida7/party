// scroll.js — single scrubbed ScrollTrigger maps scroll → flight progress,
// draws the trail, fades the intro, and counter-scrolls one headline at a time.
import { app } from "./scene.js";

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (!gsap || !ScrollTrigger) console.error("[party-plane] GSAP failed to load.");
gsap.registerPlugin(ScrollTrigger);

const hasDrawSVG = typeof window.DrawSVGPlugin !== "undefined";
if (hasDrawSVG) gsap.registerPlugin(window.DrawSVGPlugin);

const trail = document.getElementById("trail");
const intro = document.getElementById("intro");
const introBlur = document.getElementById("introblur");
const loader = document.getElementById("loader");
const lines = gsap.utils.toArray(".line").map((el) => ({
  el, at: parseFloat(el.dataset.at),
}));

const WIN = 0.14; // half-width (in progress) a headline stays on screen

let burst = false;

function render(p) {
  app.setProgress(p);

  // intro title + its frosted backdrop fade out together over the first slice
  // of scroll — the blur stays while "HOUSE PARTY" is up, then clears with it
  const introOp = Math.max(0, 1 - p / 0.06);
  intro.style.opacity = String(introOp);
  introBlur.style.opacity = String(introOp);

  // headlines are gated behind the intro so nothing overlaps "HOUSE PARTY"
  // (fully hidden while the title is up, allowed in only as it fades out)
  const gate = 1 - introOp;

  // counter-scroll headlines: text slides left as the plane flies right.
  // slide distance scales with viewport width so it never flies off small screens
  const slide = window.innerWidth * 0.9;
  for (const { el, at } of lines) {
    const d = p - at;                         // signed distance from this line's moment
    const k = Math.abs(d) / WIN;              // 0 at centre → 1 at edge
    const op = (k >= 1 ? 0 : Math.cos(k * Math.PI / 2)) * gate; // smooth in/out
    el.style.opacity = op.toFixed(3);
    if (op > 0) el.style.transform = `translate(calc(-50% - ${d * slide}px), -50%)`;
  }

  // finale confetti burst once near the end
  if (p > 0.93 && !burst) { app.triggerBurst(); burst = true; }
  if (p < 0.85) burst = false;
}

ScrollTrigger.create({
  trigger: "#spacer",
  start: "top top",
  end: "bottom bottom",
  scrub: true,
  onUpdate: (self) => render(self.progress),
});

// trail draws in across the whole scroll
if (hasDrawSVG) {
  gsap.set(trail, { drawSVG: "0%" });
  gsap.to(trail, {
    drawSVG: "100%", ease: "none",
    scrollTrigger: { trigger: "#spacer", start: "top top", end: "bottom bottom", scrub: true },
  });
} else {
  const len = trail.getTotalLength();
  gsap.set(trail, { strokeDasharray: len, strokeDashoffset: len });
  gsap.to(trail, {
    strokeDashoffset: 0, ease: "none",
    scrollTrigger: { trigger: "#spacer", start: "top top", end: "bottom bottom", scrub: true },
  });
}

if (app.reducedMotion) render(0); // sensible static first frame

// hide loader once the scene is live
(function hideLoader() {
  if (app.ready) {
    loader.classList.add("hidden");
    setTimeout(() => loader.remove(), 600);
  } else requestAnimationFrame(hideLoader);
})();

window.addEventListener("load", () => ScrollTrigger.refresh());
