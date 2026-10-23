/* ============================================================
   ENGINE — schematic sheet
   ------------------------------------------------------------
   Three animated technical plates drawn with the vendored iso
   kit, in the same isometric language as FIG 01 / FIG 02:

   FIG 03  High-bypass turbofan, cut away
           The nacelle is sliced open along a 90° wedge facing
           the camera, so the plate shows a solid outer casing,
           a sectioned skin and the whole spool stack inside:
           fan, compressor, annular combustor, turbine, exhaust
           cone. Move the throttle and the rotor groups spin at
           the true projected rate, the burner lights and the
           readouts follow.

   FIG 04  Flight-control actuator
           A hydraulic cylinder driving a bellcrank and pushrod
           into an elevator horn. The crank, rod and surface are
           solved in 3-D every frame.

   FIG 05  Fuel system schematic
           Tank, boost pump, filter, fuel-control unit, manifold
           and nozzles, with the flow path animated.

   Geometry note: everything is built once, then animated with
   affine transforms. A rotation about a 3-D axis is a linear
   map in the iso plane, so the exact projected spin is a single
   SVG `matrix()` — no per-frame geometry rebuild.
   ============================================================ */

import * as k from "./iso-kit.js";

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const REDUCED = "(prefers-reduced-motion: reduce)";

/* ------------------------------------------------------------
   0. Drawing helpers
   ------------------------------------------------------------ */

const shade = (d, n) => `<path class="iso-shade" data-shade="${n}" d="${d}"/>`;
const topFill = (d) => `<path class="iso-top" d="${d}"/>`;
const stroke = (d, tone = "lo", cls = "") => `<path class="iso-line${cls ? " " + cls : ""}" data-tone="${tone}" d="${d}"/>`;

/* Direction, in the y–z plane, that points at the camera.
   The shells are cut either side of it. */
function nearAngle(P) {
    const { cosA, sinE, cosE } = k.cameraOf(P);
    return Math.atan2(sinE, cosA * cosE);
}

const AXES = {
    x: [[0, 1, 0], [0, 0, 1]],
    y: [[1, 0, 0], [0, 0, 1]],
    z: [[1, 0, 0], [0, 1, 0]],
};

/* Exact projected rotation about a 3-D axis through `at`.
   The iso projection is linear, so rotating the two basis
   vectors of the perpendicular plane and re-expressing them in
   the projected basis gives the 2×2 screen matrix. */
function spinTransform(P, axis, phi, at) {
    const [u, v] = AXES[axis].map((dir) => k.axisVector(P, dir));
    const det = u[0] * v[1] - u[1] * v[0];
    const [cx, cy] = k.iso(at, P);
    if (!det)
        return "";
    const c = Math.cos(phi), s = Math.sin(phi);
    const p = [u[0] * c + v[0] * s, u[1] * c + v[1] * s];
    const q = [v[0] * c - u[0] * s, v[1] * c - u[1] * s];
    const m = [
        (p[0] * v[1] - p[1] * u[1]) / det,
        (q[0] * v[1] - q[1] * u[1]) / det,
        (p[1] * u[0] - p[0] * v[0]) / det,
        (q[1] * u[0] - q[0] * v[0]) / det,
    ];
    return `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) matrix(${m.map((n) => n.toFixed(5)).join(" ")} 0 0) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`;
}

const lerp = (a, b, t) => a + (b - a) * t;

function profileAt(profile, s) {
    if (s <= profile[0][0]) return profile[0][1];
    for (let i = 1; i < profile.length; i++) {
        const [s1, r1] = profile[i];
        if (s <= s1) {
            const [s0, r0] = profile[i - 1];
            return lerp(r0, r1, (s - s0) / (s1 - s0 || 1));
        }
    }
    return profile[profile.length - 1][1];
}

/* ============================================================
   1. FIG 03 — high-bypass turbofan, cut away
   ============================================================ */

const LENGTH = 436;

/* Station s runs 0 (intake lip) → 436 (exhaust); radius in the
   same arbitrary unit. All profiles are [station, radius]. */
const PROFILES = {
    nacelleOuter: [[0, 72], [12, 86], [32, 93], [66, 96], [130, 96], [190, 94], [250, 89], [320, 78], [380, 64], [415, 51], [436, 40]],
    nacelleInner: [[0, 60], [12, 73], [32, 80], [66, 80], [130, 79], [190, 77], [250, 72], [320, 63], [380, 52], [415, 41], [436, 31]],
    coreOuter: [[58, 54], [100, 52], [170, 48], [240, 44], [300, 40], [350, 36], [400, 30]],
    coreInner: [[58, 47], [100, 45], [170, 41], [240, 37], [300, 33], [350, 29], [400, 23]],
    drum: [[40, 27], [72, 27], [92, 23], [168, 23], [186, 26], [244, 26], [264, 21], [330, 19], [352, 15]],
    spinner: [[0, 0], [6, 9], [16, 18], [26, 23], [34, 25]],
    cone: [[352, 19], [372, 16], [400, 11], [424, 5], [436, 0]],
};

const MODULES = [
    { id: "fan", s: 54, r: 79, side: -1, label: "FAN", note: "WIDE-CHORD · 18 BLADES" },
    { id: "comp", s: 132, r: 37, side: 1, label: "COMPRESSOR", note: "AXIAL · 9 STAGES" },
    { id: "comb", s: 216, r: 34, side: -1, label: "COMBUSTOR", note: "ANNULAR · 16 NOZZLES" },
    { id: "turb", s: 310, r: 30, side: 1, label: "TURBINE", note: "4 STAGES · COOLED" },
    { id: "nozzle", s: 418, r: 34, side: -1, label: "NOZZLE", note: "CONVERGENT" },
];

function buildEngine() {
    /* fit to the true silhouette, not a loose box, so the engine
       fills the plate */
    const bounds = [];
    for (const profile of Object.values(PROFILES))
        for (const [s, r] of profile)
            for (let i = 0; i < 24; i++) {
                const t = (i / 24) * TAU;
                bounds.push([s, r * Math.cos(t), r * Math.sin(t)]);
            }
    const P = k.fitProjection(bounds, 1000, 560, { pad: 48, azimuth: 58, elevation: 28 });

    const pt = (s, r, t) => k.iso([s, r * Math.cos(t), r * Math.sin(t)], P);
    const onAxis = (s) => k.iso([s, 0, 0], P);

    const NEAR = nearAngle(P);
    const WEDGE = 45 * DEG;
    const SIL = 90 * DEG;

    const strip = (profile, t0, t1) => {
        const a = profile.map(([s, r]) => pt(s, r, t0));
        const b = profile.map(([s, r]) => pt(s, r, t1)).reverse();
        return k.pathOf([...a, ...b], true);
    };
    const cutFace = (outer, inner, t) => {
        const a = outer.map(([s, r]) => pt(s, r, t));
        const b = inner.map(([s, r]) => pt(s, r, t)).reverse();
        return k.pathOf([...a, ...b], true);
    };
    const ring = (s, r, steps = 40) => {
        const out = [];
        for (let i = 0; i < steps; i++) out.push(pt(s, r, (i / steps) * TAU));
        return k.pathOf(out, true);
    };
    /* the flat face of a stage: an annulus at one station */
    const faceRing = (s, r0, r1, t0, t1, steps = 16) => {
        const a = [], b = [];
        for (let i = 0; i <= steps; i++) {
            const t = t0 + (t1 - t0) * (i / steps);
            a.push(pt(s, r1, t));
            b.push(pt(s, r0, t));
        }
        return k.pathOf([...a, ...b.reverse()], true);
    };
    const stageTicks = (s, r0, r1, n, t0, t1) => {
        const out = [];
        for (let i = 0; i < n; i++) {
            const t = t0 + (t1 - t0) * (i / (n - 1));
            out.push(stroke(k.pathOf([pt(s, r0, t), pt(s, r1, t)]), "faint", "eng-hair"));
        }
        return out.join("");
    };
    /* one compressor / turbine stage as a sectioned disc */
    const stage = (s, r0, r1, tone, ticks = 5) => {
        const t0 = NEAR - 96 * DEG, t1 = NEAR + 96 * DEG;
        return shade(faceRing(s, r0, r1, t0, t1), tone)
            + stageTicks(s, r0, r1, ticks, t0 + 14 * DEG, t1 - 14 * DEG)
            + stroke(faceRing(s, r0, r1, t0, t1), "faint", "eng-hair");
    };
    const stageStack = (list) => `<g class="eng-rotor" data-spin="${list.spin}" data-station="${list.at}">${list.stages.join("")}</g>`;

    const bladeRing = (s, chord, r0, r1, count, twist, sweep = 200 * DEG) => {
        const out = [];
        for (let i = 0; i < count; i++) {
            const t = NEAR - sweep / 2 + (i / Math.max(1, count - 1)) * sweep + 0.08;
            out.push(k.pathOf([pt(s, r0, t), pt(s, r1, t + twist), pt(s + chord, r1, t + twist), pt(s + chord, r0, t)], true));
        }
        return out;
    };
    const rotor = (paths, name, station) => `<g class="eng-rotor" data-spin="${name}" data-station="${station}">${paths.map((d) => shade(d, 2) + stroke(d, "faint", "eng-hair")).join("")}</g>`;

    const body = [`
        <defs>
            <radialGradient id="flameGrad" cx="46%" cy="50%" r="58%">
                <stop offset="0%" style="stop-color:var(--accent-2);stop-opacity:.95"/>
                <stop offset="48%" style="stop-color:var(--accent);stop-opacity:.62"/>
                <stop offset="100%" style="stop-color:var(--accent);stop-opacity:0"/>
            </radialGradient>
        </defs>`];

    /* --- far wall of the nacelle, seen through the cut --- */
    body.push(shade(strip(PROFILES.nacelleOuter, NEAR + SIL, NEAR + 3 * SIL), 1));
    body.push(shade(strip(PROFILES.nacelleInner, NEAR + SIL, NEAR + 3 * SIL), 0));
    for (const s of [96, 170, 250, 330])
        body.push(stroke(strip([[s - 3, profileAt(PROFILES.nacelleInner, s)], [s + 3, profileAt(PROFILES.nacelleInner, s)]], NEAR + SIL, NEAR + 3 * SIL), "faint", "eng-hair"));

    /* --- the casing, cut open --- */
    const upperNear = [NEAR + WEDGE, NEAR + 68 * DEG];
    const lowerNear = [NEAR - 68 * DEG, NEAR - WEDGE];
    const upperFar = [NEAR + 68 * DEG, NEAR + SIL];
    const lowerFar = [NEAR - SIL, NEAR - 68 * DEG];

    body.push(topFill(strip(PROFILES.nacelleOuter, ...upperNear)));
    body.push(shade(strip(PROFILES.nacelleOuter, ...upperFar), 2));
    body.push(shade(strip(PROFILES.nacelleOuter, ...lowerNear), 1));
    body.push(shade(strip(PROFILES.nacelleOuter, ...lowerFar), 2));

    /* section faces */
    const faceA = cutFace(PROFILES.nacelleOuter, PROFILES.nacelleInner, NEAR + WEDGE);
    const faceB = cutFace(PROFILES.nacelleOuter, PROFILES.nacelleInner, NEAR - WEDGE);
    body.push(shade(faceA, 3));
    body.push(shade(faceB, 3));
    body.push(`<path class="eng-hatch" d="${faceA}"/>`);
    body.push(`<path class="eng-hatch" d="${faceB}"/>`);
    body.push(stroke(faceA, "hi", "eng-cut"));
    body.push(stroke(faceB, "hi", "eng-cut"));

    body.push(stroke(strip(PROFILES.nacelleOuter, NEAR - SIL, NEAR + SIL), "lo"));
    body.push(stroke(strip(PROFILES.nacelleInner, NEAR + WEDGE, NEAR + SIL), "faint", "eng-hair"));
    body.push(stroke(strip(PROFILES.nacelleInner, NEAR - SIL, NEAR - WEDGE), "faint", "eng-hair"));
    body.push(stroke(ring(0, 60), "mid"));

    /* --- shaft and exhaust cone --- */
    body.push(shade(strip([[36, 6], [364, 6]], NEAR - SIL, NEAR + SIL), 2));
    body.push(topFill(strip(PROFILES.cone, NEAR - SIL, NEAR + SIL)));
    body.push(shade(strip(PROFILES.cone, NEAR - SIL, NEAR + SIL), 2));
    body.push(stroke(strip(PROFILES.cone, NEAR - SIL, NEAR + SIL), "lo"));

    /* --- drum, behind the blades --- */
    body.push(topFill(strip(PROFILES.drum, NEAR - SIL, NEAR + SIL)));
    body.push(shade(strip(PROFILES.drum, NEAR - SIL, NEAR + SIL), 2));
    body.push(stroke(strip(PROFILES.drum, NEAR - SIL, NEAR + SIL), "lo"));
    for (const s of [92, 168, 186, 244, 264])
        body.push(stroke(ring(s, profileAt(PROFILES.drum, s)), "faint", "eng-hair"));

    /* --- rotating assemblies, far station first --- */
    body.push(stageStack({
        spin: "lpt", at: 311,
        stages: [330, 318, 304, 292].map((s, i) => stage(s, profileAt(PROFILES.drum, s), [29, 30, 31, 31][i], i % 2 ? 2 : 3, 9)),
    }));

    /* the burner sits between compressor and turbine */
    const flameA = [[190, 26], [198, 31], [208, 34], [224, 34], [236, 30], [246, 26]];
    body.push(`<g class="eng-burner"><path class="eng-flame" d="${strip(flameA, NEAR - 76 * DEG, NEAR + 76 * DEG)}"/>${stroke(strip(flameA, NEAR - 76 * DEG, NEAR + 76 * DEG), "faint", "eng-hair")}</g>`);

    body.push(stageStack({
        spin: "hpc", at: 136,
        stages: [172, 160, 148, 136, 124, 112, 100].map((s, i) => stage(s, profileAt(PROFILES.drum, s), [38, 38, 37, 37, 36, 35, 34][i], i % 2 ? 3 : 2, 7)),
    }));

    body.push(stageStack({
        spin: "lpc", at: 79,
        stages: [86, 72].map((s, i) => stage(s, profileAt(PROFILES.drum, s), [42, 43][i], i % 2 ? 2 : 3, 8)),
    }));

    /* fan */
    const fanBlades = [];
    for (let i = 0; i < 16; i++) {
        const t = NEAR - 0.62 + (i / 15) * 1.24;
        fanBlades.push(k.pathOf([pt(44, 27, t), pt(52, 78, t + 15 * DEG), pt(60, 78, t + 15 * DEG), pt(54, 27, t)], true));
    }
    body.push(`<g class="eng-rotor eng-fan" data-spin="fan" data-station="52">${fanBlades.map((d) => shade(d, 2)).join("")}${fanBlades.map((d) => stroke(d, "faint", "eng-hair")).join("")}</g>`);

    /* spinner and hub, nearest */
    body.push(shade(ring(40, 27), 1));
    body.push(stroke(ring(40, 27), "lo"));
    body.push(topFill(strip(PROFILES.spinner, NEAR - SIL, NEAR + SIL)));
    body.push(shade(strip(PROFILES.spinner, NEAR - SIL, NEAR + SIL), 3));
    body.push(stroke(strip(PROFILES.spinner, NEAR - SIL, NEAR + SIL), "lo"));

    /* --- core cowl as a transparent casing, over the rotors --- */
    const core = [];
    core.push(stroke(strip(PROFILES.coreOuter, NEAR - SIL, NEAR + SIL), "lo"));
    core.push(stroke(strip(PROFILES.coreInner, NEAR - SIL, NEAR + SIL), "faint", "eng-hair"));
    for (const s of [100, 170, 240, 300, 350, 400])
        core.push(stroke(ring(s, profileAt(PROFILES.coreOuter, s)), "faint", "eng-hair"));
    body.push(`<g class="eng-core">${core.join("")}</g>`);

    /* --- airflow --- */
    const bypass = k.pathOf([pt(6, 68, NEAR), pt(96, 68, NEAR), pt(200, 69, NEAR), pt(320, 58, NEAR), pt(430, 36, NEAR)]);
    const coreFlow = k.pathOf([pt(18, 42, NEAR - 10 * DEG), pt(80, 37, NEAR - 10 * DEG), pt(160, 34, NEAR - 10 * DEG), pt(260, 31, NEAR - 10 * DEG), pt(360, 25, NEAR - 10 * DEG), pt(424, 15, NEAR - 10 * DEG)]);
    body.push(`<path class="iso-line eng-flow" data-tone="lit" data-flow="" d="${bypass}"/>`);
    body.push(`<path class="iso-line eng-flow" data-tone="lit" data-flow="" d="${coreFlow}"/>`);


    const svg = k.figureSvg({
        width: 1000,
        height: 560,
        label: "Cutaway of a high-bypass turbofan: fan, compressor, combustor and turbine visible through the opened nacelle",
        className: "eng-svg",
        body: `<defs><pattern id="engHatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><line x1="0" y1="0" x2="0" y2="5" stroke="var(--anatomy-mid)" stroke-width=".5" opacity=".45"/></pattern></defs>${body.join("")}`,
    });

    return { svg, P, NEAR };
}

/* ============================================================
   2. FIG 04 — flight-control actuator
   ------------------------------------------------------------
   A rudder circuit in plan: hydraulic barrel, piston rod,
   bellcrank, pushrod, rudder. Every joint is solved in 3-D each
   frame, so the rod always lands on the crank pin and the
   pushrod always lands on the rudder horn.
   ============================================================ */

const ACT = {
    pivot: [150, 94],
    radius: 27,
    hinge: [214, 92],
    horn: [206, 92],
    rodZ: 19,
    neutral: 0.34,
    swing: 0.42,
};

function buildActuator() {
    const P = k.fitProjection(
        [[0, 28, 0], [244, 28, 0], [0, 176, 0], [244, 176, 0], [0, 28, 48], [244, 176, 48]],
        920, 470, { pad: 44, azimuth: 45, elevation: 30 },
    );
    const at = (x, y, z) => k.iso([x, y, z], P);
    const box = (plan, z, h, opts = {}) => k.solidSvg(k.slabOf(plan, z, h, P, 6), { crease: "faint", ...opts });
    const poly = (pts, z, h, opts = {}) => k.solidSvg(k.extrude(pts, z, h, P, { convex: false }), { crease: "faint", ...opts });

    const { pivot, radius, hinge, neutral, rodZ } = ACT;
    const pin = [pivot[0] + radius * Math.cos(neutral), pivot[1] + radius * Math.sin(neutral)];

    const body = [];

    /* base plate and rail */
    body.push(box({ x: 8, y: 32, w: 220, d: 126, r: 5 }, 0, 6, { tone: "faint" }));
    body.push(box({ x: 18, y: 62, w: 196, d: 6, r: 2 }, 6, 3, { tone: "faint" }));

    /* hydraulic barrel, end cap, port block */
    body.push(box({ x: 22, y: 74, w: 62, d: 40, r: 9 }, 6, 20));
    body.push(box({ x: 84, y: 79, w: 9, d: 30, r: 3 }, 6, 22, { tone: "mid" }));
    body.push(box({ x: 30, y: 58, w: 15, d: 16, r: 2 }, 6, 15, { tone: "mid" }));
    body.push(box({ x: 30, y: 114, w: 15, d: 16, r: 2 }, 6, 15, { tone: "mid" }));

    /* pivot pedestal and hub */
    body.push(box({ x: pivot[0] - 9, y: pivot[1] - 9, w: 18, d: 18, r: 2 }, 6, 12, { tone: "faint" }));

    /* bellcrank, built at its neutral angle then spun */
    const arm = poly([
        [pivot[0] - 5, pivot[1] - 8],
        [pin[0] - Math.cos(neutral) * 2, pin[1] - Math.sin(neutral) * 8 - 6],
        [pin[0] + Math.cos(neutral) * 2, pin[1] + Math.sin(neutral) * 8 + 6],
        [pivot[0] - 5, pivot[1] + 8],
    ], 12, 11);
    body.push(`<g class="act-crank">${arm}${box({ x: pivot[0] - 7, y: pivot[1] - 7, w: 14, d: 14, r: 7 }, 12, 13, { tone: "mid" })}</g>`);

    /* rudder, hinged about the vertical line */
    const blade = k.slabOf({ x: hinge[0], y: 40, w: 12, d: 104, r: 4 }, 4, 14, P, 6);
    const horn = k.slabOf({ x: hinge[0] - 12, y: hinge[1] - 5, w: 14, d: 10, r: 2 }, 12, 8, P, 6);
    body.push(`<g class="act-rudder">${k.solidSvg(blade, { crease: "faint" })}${k.solidSvg(horn, { tone: "mid", crease: "faint" })}</g>`);
    body.push(box({ x: hinge[0] - 6, y: hinge[1] - 4, w: 12, d: 8, r: 2 }, 0, 22, { tone: "faint" }));

    /* live linkages */
    body.push(`<path class="iso-line act-rod" data-tone="hi" d="${k.pathOf([at(93, 94, rodZ), at(pin[0], pin[1], rodZ)])}"/>`);
    body.push(`<path class="iso-line act-push" data-tone="mid" d="${k.pathOf([at(pin[0], pin[1], rodZ), at(ACT.horn[0], ACT.horn[1], rodZ)])}"/>`);
    body.push(`<circle class="act-joint" cx="${at(pin[0], pin[1], rodZ)[0].toFixed(1)}" cy="${at(pin[0], pin[1], rodZ)[1].toFixed(1)}" r="2.4"/>`);

    const svg = k.figureSvg({
        width: 920,
        height: 470,
        label: "Isometric schematic of a rudder actuator: hydraulic barrel, bellcrank, pushrod and rudder",
        className: "act-svg",
        body: body.join(""),
    });

    return { svg, P };
}

/* ============================================================
   3. FIG 05 — fuel system
   ============================================================ */

const FUEL = [
    { id: "tank", label: "TANK", plan: { x: 16, y: 60, w: 92, d: 74, r: 5 }, z: 0, h: 34 },
    { id: "pump", label: "BOOST PUMP", plan: { x: 132, y: 74, w: 30, d: 30, r: 8 }, z: 0, h: 24 },
    { id: "filter", label: "FILTER", plan: { x: 176, y: 72, w: 26, d: 34, r: 6 }, z: 0, h: 26 },
    { id: "fcu", label: "FCU", plan: { x: 218, y: 66, w: 38, d: 46, r: 4 }, z: 0, h: 28 },
    { id: "man", label: "MANIFOLD", plan: { x: 272, y: 60, w: 104, d: 14, r: 6 }, z: 0, h: 10 },
];

function buildFuel() {
    const P = k.fitProjection(
        [[0, 48, 0], [392, 48, 0], [0, 150, 0], [392, 150, 0], [0, 48, 44], [392, 150, 44]],
        940, 430, { pad: 40, azimuth: 45, elevation: 30 },
    );
    const at = (x, y, z) => k.iso([x, y, z], P);
    const body = [];

    body.push(k.solidSvg(k.slabOf({ x: 6, y: 44, w: 380, d: 104, r: 6 }, 0, 5, P, 6), { tone: "faint", crease: "faint" }));

    for (const part of FUEL) {
        body.push(k.solidSvg(k.slabOf(part.plan, part.z, part.h, P, 8), { crease: "faint", tone: part.id === "fcu" ? "hi" : "lo" }));
    }

    /* four nozzles off the manifold */
    for (let i = 0; i < 4; i++) {
        const x = 286 + i * 24;
        body.push(k.solidSvg(k.cylinder(x, 67, 6, 10, 16, P, 18), { crease: "faint", tone: "mid" }));
    }

    /* the fuel line, drawn at deck height with dashes running forward */
    const z = 20;
    const run = (from, to) => k.pathOf([at(from[0], from[1], z), at(to[0], to[1], z)]);
    const pipes = [
        run([108, 96], [132, 89]),
        run([162, 89], [176, 89]),
        run([202, 89], [218, 89]),
        run([256, 89], [272, 67]),
        run([272, 67], [368, 67]),
    ];
    body.push(`<path class="iso-line fuel-line fuel-flow" data-tone="lit" data-flow="" d="${pipes.join("")}"/>`);

    const svg = k.figureSvg({
        width: 940,
        height: 430,
        label: "Isometric schematic of a fuel system: tank, boost pump, filter, fuel-control unit, manifold and nozzles",
        className: "fuel-svg",
        body: body.join(""),
    });

    return { svg, P };
}

/* ============================================================
   4. Mounting
   ============================================================ */

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
    /* 30 fps is plenty for a needle sweep and halves the path work */
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

/* ---- FIG 03 ------------------------------------------------- */

const ENGINE = {
    idle: 0.21,
    n1For: (throttle) => 21 + 79 * throttle,
    n2For: (throttle) => 58 + 42 * throttle,
    egtFor: (throttle) => 336 + 648 * Math.pow(throttle, 1.25),
    thrustFor: (throttle) => 128 * Math.pow(throttle, 1.55),
};

function mountEngine(plate) {
    const stage = plate.querySelector("[data-engine-stage]");
    const readout = plate.querySelector("[data-engine-readout]");
    const range = plate.querySelector("[data-throttle]");
    const output = plate.querySelector("[data-throttle-val]");
    if (!stage)
        return;

    const { svg, P, NEAR } = buildEngine();
    stage.innerHTML = svg;

    const rotors = [...stage.querySelectorAll("[data-spin]")].map((el) => ({
        el,
        key: el.dataset.spin,
        at: [Number(el.dataset.station), 0, 0],
    }));

    const axisFrom = k.iso([0, 0, 0], P);
    const axisTo = k.iso([LENGTH, 0, 0], P);
    const axis = [axisTo[0] - axisFrom[0], axisTo[1] - axisFrom[1]];
    const axisLen = axis[0] * axis[0] + axis[1] * axis[1];

    const reduced = window.matchMedia(REDUCED).matches;
    const state = { throttle: range ? Number(range.value) / 100 : 0.64, n1: 0.64, n2: 0.8, phi: 0, visible: true };

    const speeds = { fan: 1, lpc: 1.42, hpc: 1.72, lpt: 1.18, hpt: 1.5 };

    function paint() {
        for (const rotor of rotors) {
            const rate = speeds[rotor.key] ?? 1;
            rotor.el.setAttribute("transform", spinTransform(P, "x", state.phi * rate, rotor.at));
        }
        const burner = stage.querySelector(".eng-burner");
        if (burner)
            burner.style.opacity = (0.28 + 0.72 * state.throttle).toFixed(3);
        stage.style.setProperty("--flow-dur", (2400 - 1500 * state.throttle).toFixed(0) + "ms");
    }

    const cells = [...plate.querySelectorAll("[data-cell]")];

    function numbers() {
        const throttle = state.throttle;
        const n1 = state.n1 * 100;
        const n2 = state.n2 * 100;
        const egt = ENGINE.egtFor(throttle);
        const fn = ENGINE.thrustFor(throttle);
        const p3 = 1 + 24 * Math.pow(throttle, 1.7);
        const values = {
            fan: `N1 ${n1.toFixed(1)}%`,
            comp: `P3 ${p3.toFixed(1)} bar`,
            comb: `EGT ${egt.toFixed(0)} °C`,
            turb: `N2 ${n2.toFixed(1)}%`,
            nozzle: `FN ${fn.toFixed(1)} kN`,
        };
        for (const cell of cells)
            cell.textContent = values[cell.dataset.cell] || "";
        if (output)
            output.textContent = Math.round(throttle * 100) + "%";
        if (readout)
            readout.textContent = `N1 ${n1.toFixed(1)}% · EGT ${egt.toFixed(0)}°C · FN ${fn.toFixed(1)} kN`;
    }

    function update(dt, t) {
        const target = state.throttle;
        /* spool lag: accelerate fast, decelerate slowly */
        const gain = target > state.n1 ? 2.2 : 0.85;
        state.n1 += (target - state.n1) * Math.min(1, dt * gain * 2);
        state.n2 += (ENGINE.n2For(target) / 100 - state.n2) * Math.min(1, dt * gain * 2.4);
        const idle = 0.9 + 0.06 * Math.sin(t * 1.7);
        state.phi += dt * (0.32 + state.n1 * 5.6) * idle;
        paint();
        numbers();
    }

    if (range) {
        const onInput = () => {
            state.throttle = Number(range.value) / 100;
            if (reduced) {
                state.n1 = state.throttle;
                state.n2 = ENGINE.n2For(state.throttle) / 100;
                paint();
                numbers();
            }
        };
        range.addEventListener("input", onInput);
    }

    const rows = [...plate.querySelectorAll("[data-module]")];
    const focusOn = (id) => {
        if (plate.dataset.focus === id)
            return;
        plate.dataset.focus = id;
        for (const row of rows)
            row.classList.toggle("is-focus", row.dataset.module === id);
    };

    /* hover a module: project the pointer onto the engine axis */
    stage.addEventListener("pointermove", (event) => {
        const box = stage.getBoundingClientRect();
        const x = event.clientX - box.left;
        const y = event.clientY - box.top;
        const sx = x * (1000 / box.width);
        const sy = y * (600 / box.height);
        const u = ((sx - axisFrom[0]) * axis[0] + (sy - axisFrom[1]) * axis[1]) / axisLen;
        const s = Math.max(0, Math.min(LENGTH, u * LENGTH));
        let best = null;
        for (const m of MODULES) {
            const span = m.id === "nozzle" ? 60 : 62;
            if (s > m.s - span && s < m.s + span && (!best || Math.abs(s - m.s) < Math.abs(s - best.s)))
                best = m;
        }
        focusOn(best ? best.id : "all");
    });
    stage.addEventListener("pointerleave", () => focusOn("all"));

    if (reduced) {
        state.n1 = state.throttle;
        state.n2 = ENGINE.n2For(state.throttle) / 100;
        paint();
        numbers();
    }

    watch(stage, { update, visible: true });
}


/* ---- FIG 04 ------------------------------------------------- */

function mountActuator(plate) {
    const stage = plate.querySelector("[data-actuator-stage]");
    const readout = plate.querySelector("[data-actuator-readout]");
    if (!stage)
        return;

    const { svg, P } = buildActuator();
    stage.innerHTML = svg;

    const crank = stage.querySelector(".act-crank");
    const rudder = stage.querySelector(".act-rudder");
    const rod = stage.querySelector(".act-rod");
    const push = stage.querySelector(".act-push");
    const joint = stage.querySelector(".act-joint");

    const at = (x, y, z) => k.iso([x, y, z], P);
    const { pivot, radius, hinge, horn, rodZ, neutral, swing } = ACT;
    const rot = (p, c, a) => [
        c[0] + (p[0] - c[0]) * Math.cos(a) - (p[1] - c[1]) * Math.sin(a),
        c[1] + (p[0] - c[0]) * Math.sin(a) + (p[1] - c[1]) * Math.cos(a),
    ];

    function update(dt, t) {
        const theta = neutral + swing * Math.sin(t * 0.55);
        const pin = [pivot[0] + radius * Math.cos(theta), pivot[1] + radius * Math.sin(theta)];
        const phi = -(theta - neutral) * 0.95;
        const tip = rot(horn, hinge, phi);

        crank.setAttribute("transform", spinTransform(P, "z", theta - neutral, [pivot[0], pivot[1], 0]));
        rudder.setAttribute("transform", spinTransform(P, "z", phi, [hinge[0], hinge[1], 0]));

        const a = at(93, 94, rodZ);
        const b = at(pin[0], pin[1], rodZ);
        const c = at(tip[0], tip[1], rodZ);
        rod.setAttribute("d", k.pathOf([a, b]));
        push.setAttribute("d", k.pathOf([b, c]));
        joint.setAttribute("cx", b[0].toFixed(1));
        joint.setAttribute("cy", b[1].toFixed(1));

        if (readout) {
            const deg = 180 / Math.PI;
            const pressure = 206 + 14 * Math.sin(t * 0.55 + 0.6);
            readout.textContent = `\u03b8 ${(theta * deg).toFixed(1)}\u00b0 \u00b7 ${pressure.toFixed(0)} bar`;
        }
    }

    update(0, 0);
    if (window.matchMedia(REDUCED).matches)
        return;
    watch(stage, { update, visible: true });
}

/* ---- FIG 05 ------------------------------------------------- */

function mountFuel(plate) {
    const stage = plate.querySelector("[data-fuel-stage]");
    if (!stage)
        return;
    stage.innerHTML = buildFuel().svg;
}

/* ============================================================
   5. Entry point
   ============================================================ */

export function initEngines() {
    for (const plate of document.querySelectorAll('[data-figure="engine"]'))
        mountEngine(plate);
    for (const plate of document.querySelectorAll('[data-figure="actuator"]'))
        mountActuator(plate);
    for (const plate of document.querySelectorAll('[data-figure="fuel"]'))
        mountFuel(plate);
}
