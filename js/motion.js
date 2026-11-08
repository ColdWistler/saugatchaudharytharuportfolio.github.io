/* ============================================================
   MOTION — the choreography layer
   ------------------------------------------------------------
   A small, vanilla Motion (motion.dev) conductor for the page:
   hero entrance, in-view section and card reveals, live stat
   counters, press feedback, a pointer spotlight on plates, and
   a scroll-progress rail.

   Rules it follows:
     - transform / opacity / filter only (no layout properties)
     - reveal once, never re-animate on scroll-up
     - no motion at all under prefers-reduced-motion
     - the nav stays usable even when motion is disabled
   ============================================================ */

import { animate, inView, press, scroll } from "motion";
import { addLoop, finePointer, rafThrottle, reducedMotion } from "./perf.js";

const EASE = [0.16, 1, 0.3, 1];
const EASE_PRESS = [0.25, 0.46, 0.45, 0.94];

const STAGGER = 0.055;

/* ------------------------------------------------------------
   Nav tracking — must run even when motion is reduced
   ------------------------------------------------------------ */

function initNavTracking() {
    const links = Array.from(document.querySelectorAll(".nav-link"));
    const sections = Array.from(document.querySelectorAll("section[data-station]"));
    if (!links.length || !sections.length)
        return;

    const byId = new Map();
    for (const link of links) {
        const id = (link.getAttribute("href") || "").replace(/^#/, "");
        if (id)
            byId.set(id, link);
    }

    const menu = document.querySelector(".nav-menu");
    let pill = null;

    if (menu && !reducedMotion && window.innerWidth > 860) {
        pill = document.createElement("span");
        pill.className = "nav-pill";
        pill.setAttribute("aria-hidden", "true");
        menu.appendChild(pill);
    }

    let active = null;

    function setActive(id) {
        const link = byId.get(id);
        if (!link || link === active)
            return;

        if (active)
            active.classList.remove("active");
        active = link;
        active.classList.add("active");

        if (pill) {
            const left = link.offsetLeft;
            const width = link.offsetWidth;
            animate(pill, { x: left, width }, {
                type: "spring",
                stiffness: 380,
                damping: 34,
                mass: 0.7,
            });
        }
    }

    const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting)
                setActive(entry.target.id);
        }
    }, { rootMargin: "-42% 0px -52% 0px", threshold: 0 });

    for (const section of sections)
        io.observe(section);

    setActive("home");
    window.addEventListener("resize", rafThrottle(() => {
        if (active && pill) {
            animate(pill, { x: active.offsetLeft, width: active.offsetWidth }, {
                type: "spring", stiffness: 380, damping: 34,
            });
        }
    }), { passive: true });
}

/* ------------------------------------------------------------
   Hero entrance
   ------------------------------------------------------------ */

function initHero() {
    const hero = document.querySelector(".hero");
    if (!hero)
        return;

    const items = [
        { sel: ".kicker", y: 14, blur: 4, delay: 0.02, duration: 0.55 },
        { sel: ".hero__lede", y: 18, blur: 6, delay: 0.3, duration: 0.7 },
        { sel: ".hero__typed", y: 12, blur: 4, delay: 0.38, duration: 0.55 },
        { sel: ".hero__actions", y: 14, blur: 4, delay: 0.46, duration: 0.55 },
        { sel: ".specs", y: 16, blur: 4, delay: 0.54, duration: 0.6 },
    ];

    const entries = [];
    for (const item of items) {
        const el = hero.querySelector(item.sel);
        if (!el)
            continue;
        el.style.opacity = "0";
        el.style.transform = `translate3d(0, ${item.y}px, 0)`;
        el.style.willChange = "transform, opacity, filter";
        entries.push({ el, ...item });
    }

    /* The name is split into masked lines so it rises out of the
       page rather than sliding as a single block. */
    const lines = Array.from(hero.querySelectorAll(".hero-line__inner"));
    for (const line of lines) {
        line.style.transform = "translate3d(0, 118%, 0) rotate(2.2deg)";
        line.style.willChange = "transform";
    }

    /* let the first paint land before animating */
    requestAnimationFrame(() => {
        lines.forEach((line, i) => {
            const clean = () => {
                line.style.willChange = "";
                line.style.transform = "";
            };
            animate(
                line,
                {
                    transform: [
                        "translate3d(0, 118%, 0) rotate(2.2deg)",
                        "translate3d(0, 0, 0) rotate(0deg)",
                    ],
                },
                { duration: 1.05, delay: 0.04 + i * 0.09, ease: EASE }
            ).finished.then(clean, clean);
        });

        for (const { el, y, blur, delay, duration } of entries) {
            const clean = () => {
                el.style.willChange = "";
                el.style.opacity = "";
                el.style.transform = "";
                el.style.filter = "";
            };
            animate(
                el,
                {
                    opacity: [0, 1],
                    transform: [`translate3d(0, ${y}px, 0)`, "translate3d(0, 0, 0)"],
                    filter: [`blur(${blur}px)`, "blur(0px)"],
                },
                { duration, delay, ease: EASE }
            ).finished.then(clean, clean);
        }
    });
}

/* ------------------------------------------------------------
   In-view reveals
   ------------------------------------------------------------ */

function hideForReveal(el) {
    el.style.opacity = "0";
    el.style.transform = "translate3d(0, 20px, 0)";
}

function playReveal(el, delay = 0, distance = 20) {
    const controls = animate(
        el,
        {
            opacity: [0, 1],
            transform: [`translate3d(0, ${distance}px, 0)`, "translate3d(0, 0, 0)"],
        },
        { duration: 0.6, delay, ease: EASE }
    );

    /* Hand transform back to the stylesheet so hover lifts still work. */
    const clean = () => {
        el.style.opacity = "";
        el.style.transform = "";
        el.style.willChange = "";
    };
    controls.finished.then(clean, clean);

    return controls;
}

function revealGroup(root, items, { amount = 0.14, stagger: step = 0.055 } = {}) {
    if (!root || !items.length)
        return;

    /* Above the fold on this load: show it now, no theatre. */
    const rect = root.getBoundingClientRect();
    const alreadyThere = rect.top < window.innerHeight * 0.92;

    if (alreadyThere) {
        items.forEach((el, i) => playReveal(el, i * step));
        return;
    }

    items.forEach(hideForReveal);

    const stop = inView(root, () => {
        items.forEach((el, i) => playReveal(el, i * step));
        stop();
    }, { amount });
}

function maskHeading(heading) {
    if (!heading)
        return null;

    const inner = document.createElement("span");
    inner.className = "mask__inner";
    while (heading.firstChild)
        inner.appendChild(heading.firstChild);
    heading.appendChild(inner);
    heading.classList.add("mask");

    return inner;
}

function initSectionReveals() {
    for (const head of document.querySelectorAll(".section__head")) {
        const kicker = head.querySelector(".kicker");
        const heading = head.querySelector(".display");
        const lede = head.querySelector(".section__lede");
        const inner = maskHeading(heading);

        if (!kicker && !lede && !inner)
            continue;

        if (kicker) {
            kicker.style.opacity = "0";
            kicker.style.transform = "translate3d(0, 14px, 0)";
        }
        if (lede) {
            lede.style.opacity = "0";
            lede.style.transform = "translate3d(0, 18px, 0)";
        }
        if (inner)
            inner.style.transform = "translate3d(0, 112%, 0)";

        const clean = (el) => {
            el.style.opacity = "";
            el.style.transform = "";
            el.style.willChange = "";
        };

        const stop = inView(head, () => {
            head.classList.add("is-revealed");

            if (inner) {
                animate(inner, {
                    transform: ["translate3d(0, 112%, 0)", "translate3d(0, 0, 0)"],
                }, { duration: 1, delay: 0.04, ease: EASE }).finished.then(
                    () => clean(inner),
                    () => clean(inner)
                );
            }
            if (kicker) {
                animate(kicker, {
                    opacity: [0, 1],
                    transform: ["translate3d(0, 14px, 0)", "translate3d(0, 0, 0)"],
                }, { duration: 0.55, delay: 0.1, ease: EASE }).finished.then(
                    () => clean(kicker),
                    () => clean(kicker)
                );
            }
            if (lede) {
                animate(lede, {
                    opacity: [0, 1],
                    transform: ["translate3d(0, 18px, 0)", "translate3d(0, 0, 0)"],
                }, { duration: 0.7, delay: 0.26, ease: EASE }).finished.then(
                    () => clean(lede),
                    () => clean(lede)
                );
            }

            stop();
        }, { amount: 0.2 });
    }

    const groups = [
        ".card-grid",
        ".skills-grid",
        ".instrument-grid",
        ".instrument-row",
        ".plate-pair",
    ];

    for (const selector of groups) {
        for (const group of document.querySelectorAll(selector)) {
            const items = Array.from(group.children);
            revealGroup(group, items, { stagger: STAGGER });
        }
    }

    /* Section-level blocks that are not inside one of the grids. */
    const single = [
        ".now",
        ".study-note",
        ".paper",
        ".skills-layout",
        ".contact-copy",
        ".signoff",
    ];

    for (const selector of single) {
        for (const el of document.querySelectorAll(selector)) {
            revealGroup(el, [el], { amount: 0.12 });
        }
    }
}

/* ------------------------------------------------------------
   Stat counters
   ------------------------------------------------------------ */

function initCounters() {
    for (const el of document.querySelectorAll(".stat__val")) {
        const text = el.textContent.trim();
        const match = text.match(/^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
        if (!match)
            continue;

        const [, prefix, raw, suffix] = match;
        const target = Number(raw.replace(/,/g, ""));
        if (!Number.isFinite(target) || target < 10 || !Number.isInteger(target))
            continue;

        const finalText = text;
        el.textContent = `${prefix}0${suffix}`;

        let played = false;
        const stop = inView(el, () => {
            if (played)
                return;
            played = true;

            animate(0, target, {
                duration: 1.1,
                ease: [0.22, 1, 0.36, 1],
                onUpdate: (value) => {
                    el.textContent = `${prefix}${Math.round(value).toLocaleString("en-US")}${suffix}`;
                },
                onComplete: () => { el.textContent = finalText; },
            });

            stop();
        }, { amount: 0.8 });
    }
}

/* ------------------------------------------------------------
   Press feedback
   ------------------------------------------------------------ */

function initPressFeedback() {
    const targets = document.querySelectorAll(
        ".btn, .theme-toggle, .hamburger, .card-link, .sort-btn, .ml-btn, .ml-kbtn, .skill-tag"
    );

    for (const el of targets) {
        el.style.touchAction = "manipulation";
        press(el, (element) => {
            animate(element, { scale: 0.97 }, { duration: 0.1, ease: EASE_PRESS });
            return () => {
                animate(element, { scale: 1 }, { duration: 0.24, ease: EASE });
            };
        });
    }
}

/* ------------------------------------------------------------
   Pointer spotlight — paint only, one CSS variable per move
   ------------------------------------------------------------ */

function initSpotlights() {
    if (!finePointer)
        return;

    const targets = document.querySelectorAll(
        ".card, .instrument, .skill-group, .now, .paper, .iso-plate"
    );

    for (const el of targets) {
        const move = rafThrottle((event) => {
            const rect = el.getBoundingClientRect();
            el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
            el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
        });

        el.addEventListener("pointermove", move, { passive: true });
        el.addEventListener("pointerenter", () => el.classList.add("has-spot"), { passive: true });
        el.addEventListener("pointerleave", () => el.classList.remove("has-spot"), { passive: true });
    }
}

/* ------------------------------------------------------------
   Scroll progress rail
   ------------------------------------------------------------ */

function initScrollProgress() {
    const bar = document.querySelector(".scroll-progress");
    if (!bar)
        return;

    animate(bar, { scaleX: [0, 1] }, { duration: 0 }); /* set the origin */

    scroll(
        animate(bar, { scaleX: [0, 1] }, { ease: "linear" }),
        { offset: ["start start", "end end"] }
    );
}

/* ------------------------------------------------------------
   Scroll flow — depth between the fixed hangar and the page
   ------------------------------------------------------------
   The scene is fixed, so the reading column is the only thing that
   moves. Giving the hero a slightly slower exit and the asides a
   small counter-drift makes the sections feel layered instead of
   stacked. All of it is scrubbed, so scroll position is the clock. */

function initScrollFlow() {
    const heroSection = document.querySelector(".section--hero");
    const heroWrap = heroSection && heroSection.querySelector(".wrap--hero");

    if (heroSection && heroWrap) {
        scroll(animate(heroWrap, { y: [0, -72] }, { ease: "linear" }), {
            target: heroSection,
            offset: ["start start", "end start"],
        });
    }

    const cue = heroSection && heroSection.querySelector(".scroll-cue");
    if (cue) {
        scroll(animate(cue, { opacity: [1, 0], y: [0, 16] }, { ease: "linear" }), {
            target: heroSection,
            offset: ["start start", "end start"],
        });
    }

    for (const aside of document.querySelectorAll(".split__aside")) {
        scroll(animate(aside, { y: [26, -26] }, { ease: "linear" }), {
            target: aside,
            offset: ["start end", "end start"],
        });
    }
}

/* ------------------------------------------------------------
   Pointer depth — the reading column leans with the cursor
   ------------------------------------------------------------
   The hangar already tracks the pointer. A few pixels of counter-
   drift on the hero copy ties the type to the same camera, without
   turning the page into a parallax circus. */

function initPointerDepth() {
    if (!finePointer)
        return;

    const hero = document.querySelector(".hero");
    if (!hero)
        return;

    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;

    window.addEventListener("pointermove", rafThrottle((event) => {
        tx = (event.clientX / window.innerWidth - 0.5) * 10;
        ty = (event.clientY / window.innerHeight - 0.5) * 7;
    }), { passive: true });

    addLoop(() => {
        x += (tx - x) * 0.06;
        y += (ty - y) * 0.06;
        if (Math.abs(tx - x) < 0.02 && Math.abs(ty - y) < 0.02)
            return;
        hero.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    }, { el: hero });
}

/* ------------------------------------------------------------
   Theme flip: do not let every themed property animate at once
   ------------------------------------------------------------ */

function initThemeGuard() {
    document.addEventListener("theme:change", () => {
        const root = document.documentElement;
        root.classList.add("theme-switching");
        void root.offsetHeight;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => root.classList.remove("theme-switching"));
        });
    });
}

/* ------------------------------------------------------------
   Entry point
   ------------------------------------------------------------ */

export function initMotion() {
    initNavTracking();
    initThemeGuard();

    if (reducedMotion) {
        document.documentElement.classList.add("reduced-motion");
        return;
    }

    document.documentElement.classList.add("motion-ready");

    try {
        initHero();
        initSectionReveals();
        initCounters();
        initPressFeedback();
        initSpotlights();
        initScrollProgress();
        initScrollFlow();
        initPointerDepth();
    } catch (error) {
        console.warn("Motion layer unavailable —", error);
        document.documentElement.classList.remove("motion-ready");
    }
}
