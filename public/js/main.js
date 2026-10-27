/* ============================================================
   MAIN — the entry point
   ------------------------------------------------------------
   Three jobs, in order of how much they matter:

   1. Draw the isometric plates (js/figures.js). Local ESM, no
      network, so they always come up.
   2. Spin up the 3D hangar (js/scene.js). Loaded dynamically so
      that a failed CDN — or a machine without WebGL — degrades
      to the paper theme instead of a blank page.
   3. The chrome: preloader, custom cursor, the nav that hides
      on the way down and sticks on the way up.
   ============================================================ */

import { initFigures } from "./figures.js";
import { initEngines } from "./engine.js";

/* the classic-script fallback in index.html watches for this */
window.__hangarBoot = true;

const body = document.body;
const preloader = document.getElementById("preloader");
const preloaderFill = document.getElementById("preloaderFill");
const preloaderNote = document.getElementById("preloaderNote");

/* ------------------------------------------------------------
   1. THE PLATES
   ------------------------------------------------------------ */

initFigures();
initEngines();

/* ------------------------------------------------------------
   2. PRELOADER
   ------------------------------------------------------------ */

let progress = 0;
const progressTimer = window.setInterval(() => {
    progress = Math.min(88, progress + 4 + Math.random() * 9);
    if (preloaderFill)
        preloaderFill.style.width = progress + "%";
}, 170);

let released = false;
function release() {
    if (released)
        return;
    released = true;
    window.clearInterval(progressTimer);
    if (preloaderFill)
        preloaderFill.style.width = "100%";
    if (preloaderNote)
        preloaderNote.textContent = "bay open";
    window.setTimeout(() => {
        body.classList.remove("is-loading");
        body.classList.add("is-ready");
    }, 260);
}

/* never let a slow asset hold the page hostage */
window.setTimeout(release, 3200);

/* ------------------------------------------------------------
   3. THE HANGAR
   ------------------------------------------------------------ */

import("./scene.js")
    .then((module) => {
        module.initScene({ onReady: release });
    })
    .catch((error) => {
        console.warn("Hangar scene unavailable —", error);
        document.documentElement.classList.add("no-scene");
        release();
    });

/* ------------------------------------------------------------
   4. CUSTOM CURSOR
   ------------------------------------------------------------ */

const cursor = document.getElementById("cursor");
const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (cursor && fine) {
    body.classList.add("has-cursor");
    const dot = cursor.querySelector(".cursor__dot");
    const ring = cursor.querySelector(".cursor__ring");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let scale = 1;
    let target = 1;

    window.addEventListener("pointermove", (event) => {
        mx = event.clientX;
        my = event.clientY;
        if (dot)
            dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;

        const hit = event.target instanceof Element ? event.target : null;
        if (hit && hit.closest(".iso-stage")) {
            cursor.dataset.state = "drag";
            target = 2.3;
        } else if (hit && hit.closest("a, button, [role='button'], input, .instrument__canvas")) {
            cursor.dataset.state = "link";
            target = 1.7;
        } else {
            cursor.dataset.state = "";
            target = 1;
        }
    }, { passive: true });

    document.addEventListener("mouseleave", () => {
        cursor.dataset.state = "hidden";
    });
    document.addEventListener("mouseenter", () => {
        if (cursor.dataset.state === "hidden")
            cursor.dataset.state = "";
    });

    (function follow() {
        rx += (mx - rx) * 0.17;
        ry += (my - ry) * 0.17;
        scale += (target - scale) * 0.14;
        if (ring)
            ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${scale.toFixed(3)})`;
        requestAnimationFrame(follow);
    })();
}

/* ------------------------------------------------------------
   5. NAV BEHAVIOUR
   ------------------------------------------------------------ */

const navbar = document.getElementById("navbar");

if (navbar) {
    let last = window.scrollY;
    window.addEventListener("scroll", () => {
        const y = window.scrollY;
        navbar.classList.toggle("is-stuck", y > 30);
        if (y > 320 && y > last + 4)
            navbar.classList.add("is-hidden");
        else if (y < last - 4)
            navbar.classList.remove("is-hidden");
        last = y;
    }, { passive: true });
}
