/* ============================================================
   PERF — one clock, one visibility model
   ------------------------------------------------------------
   The page used to run nine independent requestAnimationFrame
   loops, most of them off-screen. This module owns a single
   rAF ticker; every loop registers with the element it paints
   and stops burning frames when that element leaves the
   viewport, the tab is hidden, or the user asked for reduced
   motion.

   It also exposes lazyInit(), which defers a demo's setup until
   it is close to the viewport, and whenIdle(), used to boot the
   3D hangar after the first paint instead of before it.
   ============================================================ */

export const reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const finePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const tasks = new Set();
let rafId = 0;
let last = performance.now();

function tick(now) {
    rafId = requestAnimationFrame(tick);

    if (document.hidden) {
        last = now;
        return;
    }

    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    for (const task of tasks) {
        if (!task.visible)
            continue;
        if (task.minInterval && now - task.last < task.minInterval)
            continue;
        task.last = now;
        task.fn(now, dt);
    }
}

function ensureTicker() {
    if (!rafId)
        rafId = requestAnimationFrame(tick);
}

/**
 * Register a paint callback on the shared ticker.
 *
 * @param {(now:number, dt:number) => void} fn
 * @param {{el?: Element|null, minInterval?: number}} [options]
 * @returns {() => void} unregister
 */
export function addLoop(fn, { el = null, minInterval = 0 } = {}) {
    const task = { fn, visible: !el, minInterval, last: 0, io: null };

    if (el && "IntersectionObserver" in window) {
        task.io = new IntersectionObserver(
            (entries) => { task.visible = entries[0].isIntersecting; },
            { rootMargin: "240px" }
        );
        task.io.observe(el);
    }

    tasks.add(task);
    ensureTicker();

    return () => {
        tasks.delete(task);
        if (task.io)
            task.io.disconnect();
    };
}

/**
 * Run `callback` once, when `el` is within `rootMargin` of the viewport.
 * Falls back to an immediate call when IntersectionObserver is missing.
 */
export function whenVisible(el, callback, { rootMargin = "320px", once = true } = {}) {
    if (!el)
        return () => {};
    if (!("IntersectionObserver" in window)) {
        callback(el);
        return () => {};
    }

    let done = false;
    const io = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting)
            return;
        if (done && once)
            return;
        done = true;
        callback(el);
        if (once)
            io.disconnect();
    }, { rootMargin });

    io.observe(el);
    return () => io.disconnect();
}

/**
 * Defer a setup function until its target element is near the viewport.
 * `selector` may be an Element, a selector string, or an array of both.
 */
export function lazyInit(selector, init, { rootMargin = "360px" } = {}) {
    const targets =
        typeof selector === "string"
            ? Array.from(document.querySelectorAll(selector))
            : Array.isArray(selector)
                ? selector
                : [selector];

    for (const el of targets) {
        if (!el)
            continue;
        whenVisible(el, () => {
            try {
                init(el);
            } catch (error) {
                console.warn("Deferred init failed:", error);
            }
        }, { rootMargin });
    }
}

/** Run after the first paint, but never later than `timeout` ms. */
export function whenIdle(callback, { timeout = 1500 } = {}) {
    if ("requestIdleCallback" in window) {
        requestIdleCallback(callback, { timeout });
    } else {
        setTimeout(callback, Math.min(timeout, 400));
    }
}

/** Collapse a burst of calls into one per animation frame. */
export function rafThrottle(fn) {
    let queued = false;
    let lastArgs = null;

    return function throttled(...args) {
        lastArgs = args;
        if (queued)
            return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            fn.apply(this, lastArgs);
        });
    };
}

/** Debounce trailing calls — used for resize, which is expensive here. */
export function debounce(fn, wait = 180) {
    let timer = 0;
    return function debounced(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
    };
}
