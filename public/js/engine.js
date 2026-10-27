/* ============================================================
   SYSTEMS — schematic sheet
   ------------------------------------------------------------
   Three animated plates drawn with the vendored iso kit, in the
   same isometric language as FIG 01 / FIG 02. They show the
   systems this portfolio is actually about:

   FIG 03  AirSim world, cut away
           A simulated volume with the agent inside it: waypoint
           gate discs, a swept sensor fan, a reward field and the
           symbolic rule band floating above the policy. Scrub
           the episode and the aircraft flies the circuit, the
           rays sweep and the guard stays in sync.

   FIG 04  Neuro-symbolic control loop
           Observe → encode → propose → verify → act, solved on
           one ring. A neural proposal travels the loop and the
           symbolic layer either clears it or amends it, which is
           the whole point of the hybrid architecture.

   FIG 05  Training pipeline
           Replay buffer → prioritised sampler → policy and
           target nets → symbolic guard → AirSim step, with the
           reward returning to the buffer. The pulse is the batch.
   ============================================================ */

import * as k from "./iso-kit.js";

const REDUCED = "(prefers-reduced-motion: reduce)";
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/* ------------------------------------------------------------
   0. Drawing helpers
   ------------------------------------------------------------ */

const stroke = (d, tone = "lo", cls = "") => `<path class="iso-line${cls ? " " + cls : ""}" data-tone="${tone}" d="${d}"/>`;

const lerp = (a, b, t) => a + (b - a) * t;

/* Arrowhead in screen space, drawn at the end of a→b. */
function headAt(a, b, size = 7) {
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const wing = (offset) => `${(b[0] + Math.cos(angle + offset) * size).toFixed(1)},${(b[1] + Math.sin(angle + offset) * size).toFixed(1)}`;
    return `<path class="iso-head" d="M ${wing(2.6)} L ${b[0].toFixed(1)} ${b[1].toFixed(1)} L ${wing(-2.6)} Z"/>`;
}

/* Text that sits on the iso plane, optionally nudged down-screen. */
function face(transform, text, { size = 8, tone = "faint", anchor = "middle", dy = 0 } = {}) {
    const label = k.faceTextSvg(transform, text, { size, tone, anchor });
    return dy ? `<g transform="translate(0 ${dy})">${label}</g>` : label;
}

/* ------------------------------------------------------------
   1. Shared frame clock
   ------------------------------------------------------------ */

const systems = [];
let loop = 0;
let last = 0;
let budget = 0;

function frame(now) {
    loop = requestAnimationFrame(frame);
    if (document.hidden) {
        last = now;
        return;
    }
    /* 30 fps is plenty for these mechanisms and halves the work */
    if (now - budget < 32)
        return;
    budget = now;

    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    for (const system of systems)
        if (system.visible)
            system.update(dt, t);
}

function start() {
    if (loop)
        return;
    last = performance.now();
    loop = requestAnimationFrame(frame);
}

function watch(stage, system) {
    system.visible = true;
    systems.push(system);
    if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((entries) => {
            system.visible = entries[0].isIntersecting;
        }, { rootMargin: "160px" });
        io.observe(stage);
    }
    start();
}

/* ============================================================
   2. FIG 03 — the AirSim world
   ============================================================ */

const SIM_WPS = [
    { x: 110, y: 318, label: "W1" },
    { x: 186, y: 148, label: "W2" },
    { x: 356, y: 112, label: "W3" },
    { x: 454, y: 252, label: "W4" },
];

const SIM_RULES = [
    { x: 112, y: 70, label: "R1" },
    { x: 254, y: 70, label: "R2" },
    { x: 396, y: 70, label: "R3" },
    { x: 516, y: 70, label: "R4" },
];

/* The flight the agent is asked to fly, as a closed Catmull-Rom
   through four gates. */
const SIM_PATH = [
    [110, 318, 150],
    [186, 148, 172],
    [356, 112, 146],
    [454, 252, 164],
];

function simPoint(u) {
    const n = SIM_PATH.length;
    const s = (((u % 1) + 1) % 1) * n;
    const i = Math.floor(s);
    const f = s - i;
    const a = SIM_PATH[i % n];
    const b = SIM_PATH[(i + 1) % n];
    const p0 = SIM_PATH[(i - 1 + n) % n];
    const p3 = SIM_PATH[(i + 2) % n];
    const cr = (v0, v1, v2, v3) => 0.5 * (2 * v1 + (-v0 + v2) * f + (2 * v0 - 5 * v1 + 4 * v2 - v3) * f * f + (-v0 + 3 * v1 - 3 * v2 + v3) * f * f * f);
    return [cr(p0[0], a[0], b[0], p3[0]), cr(p0[1], a[1], b[1], p3[1]), cr(p0[2], a[2], b[2], p3[2])];
}

function buildSim() {
    const P = k.fitProjection(
        [[20, 20, 0], [560, 20, 0], [20, 420, 0], [560, 420, 0], [20, 20, 360], [560, 420, 360]],
        1000, 600, { pad: 34, headroom: 14, azimuth: 45, elevation: 30 },
    );
    const at = (x, y, z) => k.iso([x, y, z], P);
    const origin = at(0, 0, 0);
    const body = [];

    /* ground plate */
    body.push(k.solidSvg(k.slabOf({ x: 40, y: 40, w: 520, d: 360, r: 16 }, 0, 12, P, 6), { tone: "lo", crease: "faint" }));

    const dots = [];
    for (let gx = 70; gx <= 550; gx += 40)
        for (let gy = 70; gy <= 390; gy += 40)
            dots.push(at(gx, gy, 13));
    body.push(k.dotsSvg(dots, { size: 0.55, tone: "faint" }));

    /* world bounds */
    const cs = [[60, 60], [540, 60], [540, 380], [60, 380]];
    let bounds = "";
    for (const [x, y] of cs)
        bounds += k.segment([x, y, 12], [x, y, 330], P);
    bounds += k.pathOf([...cs.map(([x, y]) => at(x, y, 330)), at(cs[0][0], cs[0][1], 330)], true);
    body.push(`<path class="iso-line" data-tone="faint" data-dashed="" d="${bounds}"/>`);

    /* reward field */
    for (const [r, tone] of [[40, "mid"], [80, "faint"], [118, "faint"], [156, "faint"]])
        body.push(stroke(k.ring(430, 300, r, 13, P, 56), tone, "sim-ring"));

    /* waypoint gates */
    for (const wp of SIM_WPS) {
        body.push(k.solidSvg(k.cylinder(wp.x, wp.y, 10, 12, 6, P, 22), { tone: "mid", crease: "faint", className: "sim-gate" }));
        body.push(stroke(k.segment([wp.x, wp.y, 18], [wp.x, wp.y, 60], P), "faint"));
        body.push(face(k.topMatrix([wp.x, wp.y], 68, P), wp.label, { size: 11, tone: "faint" }));
    }

    /* symbolic rule band above the policy */
    body.push(stroke(k.segment([86, 70, 330], [540, 70, 330], P), "faint", "sim-rule-line"));
    for (const rule of SIM_RULES) {
        body.push(k.solidSvg(
            k.slabOf({ x: rule.x - 26, y: rule.y - 15, w: 52, d: 30, r: 5 }, 324, 8, P, 4),
            { tone: "faint", crease: "faint", className: "sim-rule" },
        ));
        body.push(face(k.topMatrix([rule.x, rule.y], 333, P), rule.label, { size: 10, tone: "faint" }));
    }

    /* the agent, drawn at the origin and moved with a transform */
    const craft = [];
    craft.push(k.solidSvg(k.slabOf({ x: -46, y: -13, w: 92, d: 26, r: 7 }, 0, 3, P, 5), { tone: "lo", crease: "faint", className: "sim-wing" }));
    craft.push(k.solidSvg(k.slabOf({ x: -34, y: -6, w: 68, d: 12, r: 6 }, 3, 5, P, 5), { tone: "lo", crease: "faint", className: "sim-body" }));
    craft.push(k.solidSvg(k.slabOf({ x: -44, y: -16, w: 12, d: 32, r: 4 }, 3, 3, P, 4), { tone: "lo", crease: "faint", className: "sim-tail" }));
    body.push(`<g class="sim-uav" data-sim-uav>${craft.join("")}</g>`);

    /* sensor fan, redrawn each frame */
    for (let i = 0; i < 3; i++)
        body.push(`<path class="iso-line sim-ray" data-tone="lit" data-sim-ray="${i}" d=""/>`);

    const svg = k.figureSvg({
        width: 1000,
        height: 600,
        label: "Isometric cutaway of an AirSim training world: a fixed-wing agent flying waypoint gates inside a bounded volume, with a sensor fan, a reward field and a symbolic rule band above it",
        className: "sim-svg",
        body: body.join(""),
    });

    return { svg, P, origin, at };
}

function mountSim(plate) {
    const stage = plate.querySelector("[data-sim-stage]");
    const readout = plate.querySelector("[data-sim-readout]");
    const range = plate.querySelector("[data-scrub]");
    const output = plate.querySelector("[data-scrub-val]");
    if (!stage)
        return;

    const { svg, at, origin } = buildSim();
    stage.innerHTML = svg;

    const craft = stage.querySelector("[data-sim-uav]");
    const rays = [...stage.querySelectorAll("[data-sim-ray]")];
    const rules = [...stage.querySelectorAll(".sim-rule")];
    const cells = [...plate.querySelectorAll("[data-cell]")];
    const reduced = window.matchMedia(REDUCED).matches;

    const state = { u: 0.32, hold: 0, rules: 0 };

    function paint() {
        const pos = simPoint(state.u);
        const ahead = simPoint(state.u + 0.012);
        const [px, py] = at(pos[0], pos[1], pos[2]);
        const [qx, qy] = at(ahead[0], ahead[1], ahead[2]);
        const heading = Math.atan2(qy - py, qx - px) / DEG;
        craft.setAttribute("transform", `translate(${(px - origin[0]).toFixed(2)} ${(py - origin[1]).toFixed(2)}) rotate(${heading.toFixed(2)})`);

        const feet = [
            [pos[0] + 52, pos[1] + 46, 13],
            [pos[0] - 26, pos[1] + 62, 13],
            [pos[0] + 64, pos[1] - 24, 13],
        ];
        rays.forEach((ray, i) => {
            const target = feet[i];
            const [tx, ty] = at(target[0], target[1], target[2]);
            ray.setAttribute("d", k.pathOf([[px, py], [tx, ty]]));
            ray.style.opacity = (0.35 + 0.4 * Math.abs(Math.sin(state.u * Math.PI * 4 + i))).toFixed(2);
        });

        /* the guard watches whichever rule is nearest the current heading */
        const active = Math.floor(((state.u % 1) + 1) % 1 * 4) % 4;
        rules.forEach((rule, i) => rule.classList.toggle("is-active", i === active));
        state.rules = active + 1;

        const reward = 6 + 14 * Math.sin(state.u * Math.PI * 2 - 0.6) + 9;
        if (readout)
            readout.textContent = `t ${(state.u * 42).toFixed(1)} s \u00b7 R +${reward.toFixed(1)} \u00b7 R${state.rules}`;
        if (output && document.activeElement !== range)
            output.textContent = Math.round(state.u * 100) + "%";

        const values = {
            obs: "16-D",
            policy: "7 ACT",
            guard: state.rules === 3 ? "OVERRIDE" : "PASS",
            act: `${(18 + 6 * Math.sin(state.u * Math.PI * 2)).toFixed(1)} m/s`,
            reward: `+${reward.toFixed(1)}`,
        };
        for (const cell of cells) {
            const key = cell.dataset.cell;
            if (values[key])
                cell.textContent = values[key];
        }
        encodeCell(cells, "guard", values.guard);
    }

    function encodeCell(list, key, value) {
        const cell = list.find((node) => node.dataset.cell === key);
        if (cell)
            cell.classList.toggle("is-warn", value === "OVERRIDE");
    }

    function update(dt) {
        if (state.hold > 0)
            state.hold = Math.max(0, state.hold - dt);
        else
            state.u = (state.u + dt / 42) % 1;
        paint();
    }

    if (range) {
        state.u = Number(range.value) / 100;
        range.addEventListener("input", () => {
            state.u = Number(range.value) / 100;
            state.hold = 6;
            paint();
        });
        range.addEventListener("pointerup", () => { state.hold = 6; });
    }

    paint();
    if (reduced)
        return;
    watch(stage, { update, visible: true });
}

/* ============================================================
   3. FIG 04 — neuro-symbolic control loop
   ============================================================ */

const LOOP_NODES = [
    { id: "obs", label: "OBSERVE", note: "16-D STATE" },
    { id: "enc", label: "ENCODE", note: "512 → 256" },
    { id: "pol", label: "PROPOSE", note: "7 ACTIONS" },
    { id: "ver", label: "VERIFY", note: "RULES" },
    { id: "act", label: "ACT", note: "AIRSIM" },
];

const LOOP_CENTRE = [220, 180];
const LOOP_RADIUS = 116;

function buildLoop() {
    const P = k.fitProjection(
        [[0, 0, 0], [440, 0, 0], [0, 360, 0], [440, 360, 0], [0, 0, 90], [440, 360, 90]],
        920, 500, { pad: 40, headroom: 10, azimuth: 45, elevation: 30 },
    );
    const at = (x, y, z) => k.iso([x, y, z], P);
    const body = [];

    body.push(k.solidSvg(k.slabOf({ x: 30, y: 20, w: 380, d: 320, r: 84 }, 0, 10, P, 8), { tone: "lo", crease: "faint" }));
    body.push(stroke(k.ring(LOOP_CENTRE[0], LOOP_CENTRE[1], LOOP_RADIUS, 11, P, 72), "faint", "loop-track"));
    body.push(stroke(k.ring(LOOP_CENTRE[0], LOOP_CENTRE[1], 34, 11, P, 40), "faint"));

    const nodes = LOOP_NODES.map((node, index) => {
        const angle = -90 * DEG + index * (TAU / 5);
        const x = LOOP_CENTRE[0] + LOOP_RADIUS * Math.cos(angle);
        const y = LOOP_CENTRE[1] + LOOP_RADIUS * Math.sin(angle);
        return { ...node, index, angle, x, y };
    });

    /* connections first, so the discs sit on top */
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const b = nodes[(i + 1) % nodes.length];
        const from = a.angle + 0.36;
        const to = b.angle - 0.36 + (i === nodes.length - 1 ? TAU : 0);
        const pts = [];
        for (let s = 0; s <= 10; s++) {
            const angle = lerp(from, to, s / 10);
            pts.push(at(LOOP_CENTRE[0] + LOOP_RADIUS * Math.cos(angle), LOOP_CENTRE[1] + LOOP_RADIUS * Math.sin(angle), 12));
        }
        body.push(stroke(k.pathOf(pts), "faint", "loop-link"));
        body.push(headAt(pts[pts.length - 2], pts[pts.length - 1], 6));
    }

    for (const node of nodes) {
        const plan = { x: node.x - 37, y: node.y - 33, w: 74, d: 66, r: 13 };
        body.push(`<g class="loop-node" data-node="${node.id}">${k.solidSvg(k.slabOf(plan, 11, 17, P, 6), { tone: "lo", crease: "faint" })}</g>`);
        body.push(face(k.topMatrix([node.x, node.y - 3], 29, P), node.label, { size: 13, tone: "mid", dy: -3 }));
        body.push(face(k.topMatrix([node.x, node.y + 10], 29, P), node.note, { size: 9.5, tone: "faint", dy: 5 }));
        body.push(face(k.topMatrix([node.x - 27, node.y + 19], 29, P), `0${node.index + 1}`, { size: 9, tone: "faint" }));
    }

    body.push(`<g class="loop-runner" data-loop-runner><circle class="loop-halo" r="15"/><circle class="loop-token" r="5.5"/></g>`);

    const svg = k.figureSvg({
        width: 920,
        height: 500,
        label: "Isometric control loop: observe, encode, propose with the neural policy, verify against the symbolic rules, then act in AirSim",
        className: "loop-svg",
        body: body.join(""),
    });

    return { svg, P, at, nodes };
}

function mountLoop(plate) {
    const stage = plate.querySelector("[data-loop-stage]");
    const readout = plate.querySelector("[data-loop-readout]");
    if (!stage)
        return;

    const { svg, at, nodes } = buildLoop();
    stage.innerHTML = svg;

    const runner = stage.querySelector("[data-loop-runner]");
    const tokens = [...stage.querySelectorAll(".loop-node")];
    const reduced = window.matchMedia(REDUCED).matches;
    const state = { phase: 0.08 };

    function paint() {
        const turn = state.phase * TAU;
        const angle = -90 * DEG + turn;
        const [x, y] = at(LOOP_CENTRE[0] + LOOP_RADIUS * Math.cos(angle), LOOP_CENTRE[1] + LOOP_RADIUS * Math.sin(angle), 20);
        runner.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);

        let active = -1;
        let blocked = false;
        for (const node of nodes) {
            let delta = Math.abs(turn - node.index * (TAU / 5)) % TAU;
            if (delta > Math.PI)
                delta = TAU - delta;
            const near = delta < 0.24;
            if (near)
                active = node.index;
            if (near && node.id === "ver")
                blocked = true;
        }
        for (const el of tokens) {
            const node = nodes.find((n) => n.id === el.dataset.node);
            const near = node && node.index === active;
            el.classList.toggle("is-active", Boolean(near));
            el.classList.toggle("is-blocked", Boolean(near && node.id === "ver"));
        }

        if (readout)
            readout.textContent = blocked ? "GUARD \u00b7 OVERRIDE R3" : "GUARD \u00b7 PASS \u00b7 7 RULES";
    }

    function update(dt) {
        state.phase = (state.phase + dt / 15) % 1;
        paint();
    }

    paint();
    if (reduced)
        return;
    watch(stage, { update, visible: true });
}

/* ============================================================
   4. FIG 05 — training pipeline
   ============================================================ */

const PIPE = [
    { id: "buf", label: "BUFFER", note: "1e6", x: 24, w: 96, h: 46 },
    { id: "smp", label: "SAMPLE", note: "β 0.4", x: 150, w: 96, h: 34 },
    { id: "net", label: "POLICY", note: "512·256", x: 276, w: 96, h: 46 },
    { id: "grd", label: "GUARD", note: "RULES", x: 402, w: 96, h: 38 },
    { id: "sim", label: "AIRSIM", note: "STEP", x: 528, w: 56, h: 42 },
];

function buildPipeline() {
    const P = k.fitProjection(
        [[0, 40, 0], [600, 40, 0], [0, 250, 0], [600, 250, 0], [0, 40, 80], [600, 250, 80]],
        920, 500, { pad: 38, headroom: 16, azimuth: 45, elevation: 30 },
    );
    const at = (x, y, z) => k.iso([x, y, z], P);
    const body = [];

    body.push(k.solidSvg(k.slabOf({ x: 10, y: 66, w: 580, d: 154, r: 16 }, 0, 8, P, 8), { tone: "lo", crease: "faint" }));

    for (const part of PIPE) {
        const plan = { x: part.x, y: 96, w: part.w, d: 110, r: 10 };
        body.push(k.solidSvg(k.slabOf(plan, 8, part.h, P, 6), { tone: "lo", crease: "faint", className: "pipe-block" }));
        body.push(face(k.topMatrix([part.x + part.w / 2, 151], 8 + part.h, P), part.label, { size: 12.5, tone: "mid", dy: 2 }));
        body.push(face(k.topMatrix([part.x + part.w / 2, 151], 8 + part.h, P), part.note, { size: 9, tone: "faint", dy: 15 }));
    }

    /* the batch moving down the line */
    for (let i = 0; i < PIPE.length - 1; i++) {
        const a = PIPE[i];
        const b = PIPE[i + 1];
        body.push(stroke(k.segment([a.x + a.w, 151, 26], [b.x, 151, 26], P), "mid", "pipe-line"));
        const [ax, ay] = at(a.x + a.w, 151, 26);
        const [bx, by] = at(b.x, 151, 26);
        body.push(headAt([ax, ay], [bx, by], 6));
    }

    /* reward returns to the buffer */
    const back = [
        at(584, 151, 10), at(600, 220, 10), at(320, 240, 10), at(10, 220, 10), at(10, 151, 10), at(22, 151, 10),
    ];
    body.push(stroke(k.pathOf(back), "faint", "pipe-return"));
    body.push(headAt(back[back.length - 2], back[back.length - 1], 6));

    body.push(`<circle class="pipe-pulse" r="4.5" data-pipe-pulse/>`);

    const svg = k.figureSvg({
        width: 920,
        height: 500,
        label: "Isometric training pipeline: replay buffer, prioritised sampler, policy and target networks, symbolic guard, AirSim step, and the reward returning to the buffer",
        className: "pipe-svg",
        body: body.join(""),
    });

    return { svg, P, at };
}

function mountPipeline(plate) {
    const stage = plate.querySelector("[data-pipeline-stage]");
    const readout = plate.querySelector("[data-pipeline-readout]");
    if (!stage)
        return;

    const { svg, at } = buildPipeline();
    stage.innerHTML = svg;

    const pulse = stage.querySelector("[data-pipe-pulse]");
    const reduced = window.matchMedia(REDUCED).matches;
    const state = { phase: 0 };

    /* the pulse walks the block centres, then loops back */
    const stops = PIPE.map((part) => at(part.x + part.w / 2, 151, 8 + part.h + 6));
    const home = [at(584, 200, 12), at(320, 236, 12), at(12, 200, 12), stops[0]];

    function paint() {
        const cycle = state.phase * (stops.length + home.length - 1);
        let x;
        let y;
        if (cycle < stops.length - 1) {
            const i = Math.min(stops.length - 2, Math.floor(Math.min(cycle, stops.length - 1.0001)));
            const f = cycle - i;
            x = lerp(stops[i][0], stops[i + 1][0], f);
            y = lerp(stops[i][1], stops[i + 1][1], f);
        } else {
            const local = cycle - (stops.length - 1);
            const i = Math.min(home.length - 2, Math.floor(Math.min(local, home.length - 1.0001)));
            const f = local - i;
            x = lerp(home[i][0], home[i + 1][0], f);
            y = lerp(home[i][1], home[i + 1][1], f);
        }
        pulse.setAttribute("cx", x.toFixed(1));
        pulse.setAttribute("cy", y.toFixed(1));

        const stageIndex = Math.min(PIPE.length - 1, Math.floor(cycle));
        pulse.style.opacity = (0.9 - 0.35 * Math.abs(cycle - stageIndex)).toFixed(2);
        if (readout)
            readout.textContent = `BATCH 256 \u00b7 \u03b3 0.99 \u00b7 ${PIPE[stageIndex].label}`;
    }

    function update(dt) {
        state.phase = (state.phase + dt / 9) % 1;
        paint();
    }

    paint();
    if (reduced)
        return;
    watch(stage, { update, visible: true });
}

/* ============================================================
   5. Entry point
   ============================================================ */

export function initEngines() {
    for (const plate of document.querySelectorAll('[data-figure="sim"]'))
        mountSim(plate);
    for (const plate of document.querySelectorAll('[data-figure="loop"]'))
        mountLoop(plate);
    for (const plate of document.querySelectorAll('[data-figure="pipeline"]'))
        mountPipeline(plate);
}
