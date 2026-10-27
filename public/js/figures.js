/* ============================================================
   FIGURES — isometric technical drawings for the portfolio
   ------------------------------------------------------------
   Two plates, drawn with the vendored iso kit:

   FIG 01  6-DOF wind-tunnel rig  (Project RAPTORM86)
           A vertical-span wing on a rotary sting. Drag across
           the plate to set the angle of attack: the wing pitches,
           the elevator deflects, the smoke trace re-shapes and
           the readouts follow the same lift/drag model the
           wind-tunnel canvas in the algorithms section uses.

   FIG 02  D3QN training console
           State vector, dueling heads, prioritised replay ring
           and target network. Hover (or press) to run training
           steps and watch the forward pass light up.

   The drawings follow the anatomy craft rules: many small solid
   parts, four-tone shading, hairline strokes, one lit accent,
   no chart junk, every number on screen is live.
   ============================================================ */

import * as k from "./iso-kit.js";

const DEG = Math.PI / 180;

/* ------------------------------------------------------------
   Geometry helpers
   ------------------------------------------------------------ */

/* Symmetric NACA 00xx section, in the x–z plane, nose at x = 0.
   Counter-clockwise so the outward normals point out of the skin. */
function nacaSection(chord, thickness = 0.12, steps = 26) {
    const yt = (x) => 5 * thickness * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x);
    const upper = [];
    const lower = [];
    for (let i = 0; i <= steps; i++) {
        const x = 1 - i / steps;
        upper.push([x * chord, yt(x) * chord]);
    }
    for (let i = 1; i < steps; i++) {
        const x = i / steps;
        lower.push([x * chord, -yt(x) * chord]);
    }
    return [...upper, ...lower];
}

/* Rotate a section about the span axis (y) — the angle of attack. */
function pitchSection(section, pivot, degrees) {
    const a = -degrees * DEG;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return section.map(([x, z]) => {
        const dx = x - pivot;
        return [pivot + dx * cos - z * sin, dx * sin + z * cos];
    });
}

/* Extrude a section (x–z plane) along the span axis (y). */
function prismY(section, y0, y1, P, light = [-0.45, -0.62, 0.65]) {
    const l = Math.hypot(light[0], light[1], light[2]);
    const L = [light[0] / l, light[1] / l, light[2] / l];
    const faces = [];
    for (let i = 0; i < section.length; i++) {
        const a = section[i];
        const b = section[(i + 1) % section.length];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const len = Math.hypot(dx, dz) || 1;
        const nx = dz / len;
        const nz = -dx / len;
        if (k.depthOf([nx, 0, nz], P) <= 0.02)
            continue;
        const dot = nx * L[0] + nz * L[2];
        const shade = Math.min(3, Math.max(0, Math.floor((dot * 0.5 + 0.5) * 4)));
        faces.push({
            shade,
            d: k.pathOf([
                k.iso([a[0], y0, a[1]], P),
                k.iso([b[0], y0, b[1]], P),
                k.iso([b[0], y1, b[1]], P),
                k.iso([a[0], y1, a[1]], P),
            ], true),
        });
    }
    const points = [];
    for (const [x, z] of section) {
        points.push(k.iso([x, y0, z], P));
        points.push(k.iso([x, y1, z], P));
    }
    const hull = hullOf(points);
    const capNear = k.depthOf([0, 1, 0], P) > 0;
    const cap = k.pathOf(section.map(([x, z]) => k.iso([x, capNear ? y1 : y0, z], P)), true);
    const capOutline = k.pathOf(section.map(([x, z]) => k.iso([x, capNear ? y1 : y0, z], P)), true);
    return { hull, faces, cap, capOutline, capNear };
}

function hullOf(points) {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
            lower.pop();
        lower.push(p);
    }
    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
            upper.pop();
        upper.push(p);
    }
    return k.pathOf([...lower.slice(0, -1), ...upper.slice(0, -1)], true);
}

function svgSolid(shape, { tone = "hi", lit = false, capTone = "top" } = {}) {
    const parts = [`<path class="iso-fill" d="${shape.hull}"/>`];
    for (const face of shape.faces)
        parts.push(`<path class="iso-shade" data-shade="${face.shade}" d="${face.d}"/>`);
    parts.push(`<path class="iso-top" d="${shape.cap}"/>`);
    parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${shape.hull}"/>`);
    if (capTone !== "none")
        parts.push(`<path class="iso-line" data-tone="faint" d="${shape.capOutline}"/>`);
    if (lit)
        parts.push("");
    return `<g class="iso-solid"${lit ? ' data-lit=""' : ""}>${parts.join("")}</g>`;
}

/* ------------------------------------------------------------
   Aero model — the same lift curve the wind-tunnel canvas uses
   ------------------------------------------------------------ */
const AERO = {
    alpha0: -2.2,
    slope: 5.5,
    stall: 12,
    cl(a) {
        const linear = this.slope * (a - this.alpha0) * DEG;
        if (a <= this.stall)
            return Math.max(0, linear);
        return Math.max(0, linear - 0.15 * (a - this.stall) * (a - this.stall));
    },
    cd(a) {
        const cl = this.cl(a);
        return 0.03 + 0.045 * cl * cl + (a > this.stall ? 0.02 * (a - this.stall) : 0);
    },
    separated(a) {
        return a > this.stall;
    },
    q: 0.5 * 1.225 * 28 * 28,
};

/* ------------------------------------------------------------
   FIG 01 — the wind-tunnel rig
   ------------------------------------------------------------ */

const RIG = {
    plate: { x: -196, y: -118, w: 392, d: 236, r: 14 },
    table: { x: 0, y: 0, r: 82 },
    pivotX: 34,
    pivotZ: 96,
    chord: 132,
    span: 148,
    tipZ: 96,
};

function buildRig(alpha, trimmed) {
    const P = k.fitProjection([
        ...k.boxCorners(RIG.plate, 0, 16),
        ...k.boxCorners(RIG.plate, 16, 40),
        [RIG.pivotX - RIG.chord, -RIG.span / 2, RIG.pivotZ],
        [RIG.pivotX + RIG.chord, RIG.span / 2, RIG.pivotZ],
        [RIG.pivotX - RIG.chord, -RIG.span / 2, RIG.pivotZ + 40],
    ], 900, 560, { pad: 46, elevation: 30, azimuth: 42 });

    const parts = [];
    const tone = { lo: "lo", mid: "mid", hi: "hi" };

    /* --- base plate, feet, rule --- */
    parts.push(k.solidSvg(k.slabOf(RIG.plate, 0, 16, P, 8, 1.6), { tone: "lo" }));
    const feet = k.corners(RIG.plate, 26).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
    for (const [x, y] of feet) {
        parts.push(k.solidSvg(k.cylinder(x, y, 9, -6, 4, P, 20), { tone: "lo" }));
        parts.push(k.solidSvg(k.cylinder(x, y, 6.4, -2, 4, P, 20), { tone: "lo" }));
    }
    parts.push(k.lineSvg(k.planOutline(k.insetPlan(RIG.plate, 8), 16, P), { tone: "faint" }));

    /* --- rule strip along the near edge --- */
    const strip = { x: RIG.plate.x + 26, y: RIG.plate.y + RIG.plate.d - 26, w: RIG.plate.w - 52, d: 8, r: 1 };
    parts.push(k.solidSvg(k.slabOf(strip, 16, 1.2, P, 3), { tone: "lo", crease: "none" }));
    const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 10, 5, strip.y + 0.6, 17.2, [2.4, 5.4], P);
    parts.push(k.lineSvg(ticks.minor, { tone: "lo" }));
    parts.push(k.lineSvg(ticks.major, { tone: "mid" }));

    /* --- label plate with engraved rules --- */
    const labelPlan = { x: RIG.plate.x + 30, y: RIG.plate.y + 26, w: 92, d: 34, r: 3 };
    parts.push(k.solidSvg(k.slabOf(labelPlan, 16, 1.6, P, 4), { tone: "lo" }));
    parts.push(k.lineSvg(k.planOutline(k.insetPlan(labelPlan, 5), 17.6, P), { tone: "faint" }));
    parts.push(k.lineSvg(k.lineOnTop([labelPlan.x + 9, labelPlan.y + 9], [labelPlan.x + 9 + 58, labelPlan.y + 9], 17.6, P), { tone: "lo", free: true }));
    parts.push(k.lineSvg(k.lineOnTop([labelPlan.x + 9, labelPlan.y + 17], [labelPlan.x + 9 + 42, labelPlan.y + 17], 17.6, P), { tone: "lo", free: true }));
    parts.push(k.lineSvg(k.lineOnTop([labelPlan.x + 9, labelPlan.y + 25], [labelPlan.x + 9 + 30, labelPlan.y + 25], 17.6, P), { tone: "lo", free: true }));

    /* --- rotary table --- */
    const table = RIG.table;
    parts.push(k.solidSvg(k.slabOf({ x: table.x - table.r - 16, y: table.y - table.r - 16, w: (table.r + 16) * 2, d: (table.r + 16) * 2, r: 10 }, 16, 8, P, 8, 1.2), { tone: "lo" }));
    parts.push(k.solidSvg(k.cylinder(table.x, table.y, table.r, 24, 10, P, 64, 1), { tone: "mid" }));
    parts.push(k.lineSvg(k.knurl(table.x, table.y, table.r, 24.6, 33.4, 72, P), { tone: "lo" }));
    const deg = k.radialTicks(table.x, table.y, table.r - 12, 24, 3, 34, [4, 9], P);
    parts.push(k.lineSvg(deg.minor, { tone: "lo" }));
    parts.push(k.lineSvg(deg.major, { tone: "mid" }));
    parts.push(k.lineSvg(k.ring(table.x, table.y, table.r - 24, 34, P, 48), { tone: "faint" }));

    /* --- sting: column, bearing, clevis --- */
    const stingX = RIG.pivotX;
    parts.push(k.solidSvg(k.slabOf({ x: stingX - 26, y: -22, w: 52, d: 44, r: 4 }, 34, 10, P, 4, 0.8), { tone: "mid" }));
    parts.push(k.solidSvg(k.cylinder(stingX, 0, 11, 44, RIG.pivotZ - 34, P, 28), { tone: "mid" }));
    parts.push(k.lineSvg(k.sideArc(stingX, 0, 11, 60, P, 20), { tone: "faint" }));
    parts.push(k.lineSvg(k.sideArc(stingX, 0, 11, RIG.pivotZ - 40, P, 20), { tone: "faint" }));
    parts.push(k.solidSvg(k.cylinder(stingX, 0, 17, RIG.pivotZ - 34, 12, P, 28, 0.8), { tone: "hi" }));
    parts.push(k.lineSvg(k.knurl(stingX, 0, 17, RIG.pivotZ - 33, RIG.pivotZ - 24, 40, P), { tone: "lo" }));

    /* --- the wing: a vertical-span section on the span axis --- */
    const section = pitchSection(nacaSection(RIG.chord, 0.12, 22), RIG.pivotX, alpha);
    const wing = prismY(section, -RIG.span / 2, RIG.span / 2, P);
    parts.push(svgSolid(wing, { tone: "hi" }));

    /* --- elevator: a wedge hinged at the trailing edge --- */
    const trim = 6 + trimmed * 16;
    const hingeX = RIG.pivotX + RIG.chord - 16;
    const hingeZ = RIG.pivotZ;
    const elevator = pitchSection([
        [hingeX, hingeZ - 4],
        [hingeX + 30, hingeZ - 2],
        [hingeX + 30, hingeZ + 2],
        [hingeX, hingeZ + 4],
    ], hingeX, trim);
    const elevatorShape = prismY(elevator, -RIG.span / 2 + 6, RIG.span / 2 - 6, P);
    parts.push(svgSolid(elevatorShape, { tone: "mid" }));

    /* --- trim actuator: housing, gland, rod --- */
    const actX = stingX - 34;
    const actY = 0;
    parts.push(k.solidSvg(k.slabOf({ x: actX - 16, y: actY - 14, w: 32, d: 28, r: 3 }, 34, 6, P, 4), { tone: "mid" }));
    parts.push(k.solidSvg(k.cylinder(actX, actY, 7, 40, 34, P, 24), { tone: "mid" }));
    parts.push(k.solidSvg(k.cylinder(actX, actY, 9, 70, 8, P, 24, 0.6), { tone: "hi" }));
    const rodLength = 6 + trimmed * 10;
    const hornZ = hingeZ - 22 - trimmed * 14;
    const rod = k.slabOf({ x: actX - 3, y: actY - 3, w: 6, d: 6, r: 2 }, 78, rodLength, P, 3);
    parts.push(`<g class="iso-rod" transform="${k.translateAlong(P, [0, 0, rodLength / 2])}">${k.solidSvg(rod, { tone: "hi" })}</g>`);
    parts.push(k.solidSvg(k.slabOf({ x: actX - 7, y: actY - 12, w: 14, d: 24, r: 3 }, 78 + rodLength, 5, P, 3), { tone: "mid" }));

    /* --- dial gauge reading the angle of attack --- */
    const gaugeX = RIG.plate.x + 108;
    const gaugeY = 30;
    parts.push(k.solidSvg(k.slabOf({ x: gaugeX - 26, y: gaugeY - 20, w: 52, d: 40, r: 4 }, 16, 5, P, 4), { tone: "lo" }));
    parts.push(k.solidSvg(k.cylinder(gaugeX, gaugeY, 5.5, 21, 52, P, 20), { tone: "mid" }));
    parts.push(k.solidSvg(k.cylinder(gaugeX, gaugeY, 26, 73, 9, P, 48, 0.8), { tone: "hi" }));
    parts.push(k.lineSvg(k.knurl(gaugeX, gaugeY, 26, 73.4, 81.6, 56, P), { tone: "lo" }));
    parts.push(k.lineSvg(k.ring(gaugeX, gaugeY, 21, 82, P, 44), { tone: "faint" }));
    const gaugeTicks = k.radialTicks(gaugeX, gaugeY, 21, 30, 5, 82, [2.4, 5], P, -210 * DEG, 240 * DEG);
    parts.push(k.lineSvg(gaugeTicks.minor, { tone: "lo" }));
    parts.push(k.lineSvg(gaugeTicks.major, { tone: "mid" }));
    const needleAngle = (-210 + (alpha + 12) / 30 * 240) * DEG;
    parts.push(k.lineSvg(k.lineOnTop(
        [gaugeX + Math.sin(needleAngle) * -6, gaugeY + Math.cos(needleAngle) * 6],
        [gaugeX + Math.sin(needleAngle) * 18, gaugeY + Math.cos(needleAngle) * 18],
        82.4, P), { tone: "lit" }));
    parts.push(k.lineSvg(k.ring(gaugeX, gaugeY, 2.6, 82.4, P, 16), { tone: "mid" }));

    /* --- smoke trace over the section, drawn in the camera-facing plane --- */
    const traceY = RIG.span / 2 + 10;
    const traces = [];
    const offsets = [-46, -26, -10, 8, 26, 44];
    for (const off of offsets) {
        const path = [];
        for (let i = 0; i <= 46; i++) {
            const x = RIG.pivotX - RIG.chord - 54 + (i / 46) * (RIG.chord * 2 + 116);
            let z = off;
            const rel = (x - RIG.pivotX) / RIG.chord;
            const near = Math.abs(rel) < 0.62;
            if (near) {
                const t = (rel + 0.62) / 1.24;
                const bulge = Math.sin(t * Math.PI);
                const surface = off >= 0 ? 8 + 10 * bulge : -8 - 10 * bulge;
                const blend = 0.82;
                z = off * (1 - blend * bulge) + surface * blend * bulge;
                if (off > 0 && alpha > AERO.stall) {
                    const chaos = Math.sin(i * 1.7 + off) * (alpha - AERO.stall) * 0.55;
                    z += chaos * bulge;
                }
            }
            path.push([x, z]);
        }
        traces.push(k.pathOf(path.map(([x, z]) => k.iso([x, traceY, RIG.pivotZ + z], P))));
    }
    parts.push(`<g class="iso-trace" data-flow="1">${traces.map((d) => `<path class="iso-line" data-tone="faint" data-flow="" d="${d}"/>`).join("")}</g>`);

    /* --- pressure taps on the upper surface --- */
    const taps = [];
    for (let i = 0; i < 5; i++) {
        const x = RIG.pivotX - RIG.chord * 0.42 + i * RIG.chord * 0.2;
        taps.push(k.iso([x, RIG.span / 2 + 1, RIG.pivotZ + 7.4], P));
    }
    parts.push(k.dotsSvg(taps, { size: 1.1, tone: "hi" }));

    return {
        svg: k.figureSvg({ width: 900, height: 560, label: "Isometric drawing of a six degree of freedom wind tunnel rig with a pitched wing", body: parts }),
        viewBox: "0 0 900 560",
    };
}

/* ------------------------------------------------------------
   FIG 02 — the D3QN training console
   ------------------------------------------------------------ */

function buildConsole(state) {
    const P = k.fitProjection([
        ...k.boxCorners({ x: -210, y: -104, w: 420, d: 208, r: 12 }, 0, 16),
        ...k.boxCorners({ x: -210, y: -104, w: 420, d: 208, r: 12 }, 16, 96),
        [210, 104, 40],
    ], 900, 520, { pad: 44, elevation: 28, azimuth: 44 });

    const parts = [];

    /* base plate */
    parts.push(k.solidSvg(k.slabOf({ x: -210, y: -104, w: 420, d: 208, r: 12 }, 0, 16, P, 8, 1.6), { tone: "lo" }));
    parts.push(k.lineSvg(k.planOutline(k.insetPlan({ x: -210, y: -104, w: 420, d: 208, r: 12 }, 9), 16, P), { tone: "faint" }));

    /* input column: 16 state taps on a riser */
    const inputX = -160;
    parts.push(k.solidSvg(k.slabOf({ x: inputX - 24, y: -18, w: 48, d: 36, r: 4 }, 16, 62, P, 4, 0.8), { tone: "mid" }));
    const stateDots = [];
    for (let i = 0; i < 16; i++) {
        const row = i % 8;
        const col = Math.floor(i / 8);
        stateDots.push(k.iso([inputX - 12 + col * 24, -12 + row * 3.4, 78], P));
    }
    parts.push(k.dotsSvg(stateDots, { size: 1.5, tone: "hi", pulse: true }));

    /* two hidden layers as racks of slabs */
    const layerX = [-78, 22];
    for (let l = 0; l < 2; l++) {
        const x = layerX[l];
        const h = 46 + l * 16;
        parts.push(k.solidSvg(k.slabOf({ x: x - 22, y: -54, w: 44, d: 108, r: 4 }, 16, h, P, 4, 0.8), { tone: "mid" }));
        const nodes = [];
        for (let i = 0; i < 16; i++) {
            const row = i % 8;
            const col = Math.floor(i / 8);
            nodes.push(k.iso([x - 10 + col * 20, -38 + row * 10, 16 + h], P));
        }
        const lit = state.pulseLayer === l;
        parts.push(k.dotsSvg(nodes, { size: lit ? 2.1 : 1.5, tone: lit ? "hi" : "mid", pulse: lit }));
    }

    /* dueling head: a value stream and an advantage stream */
    const headX = 116;
    parts.push(k.solidSvg(k.slabOf({ x: headX - 20, y: -46, w: 40, d: 92, r: 4 }, 16, 70, P, 4, 0.8), { tone: "mid" }));
    parts.push(k.solidSvg(k.slabOf({ x: headX - 8, y: 8, w: 44, d: 38, r: 4 }, 86, 16, P, 4, 0.8), { tone: "hi", lit: state.pulseLayer === 2 }));
    const valueDot = k.iso([headX + 14, 27, 102], P);
    parts.push(k.dotsSvg([valueDot], { size: 2.6, tone: "hi", pulse: state.pulseLayer === 2 }));
    const advDots = [];
    for (let i = 0; i < 7; i++)
        advDots.push(k.iso([headX - 22 + (i % 4) * 16, -36 + Math.floor(i / 4) * 12, 86], P));
    parts.push(k.dotsSvg(advDots, { size: state.pulseLayer === 3 ? 2.2 : 1.5, tone: state.pulseLayer === 3 ? "hi" : "mid", pulse: state.pulseLayer === 3 }));

    /* target network, ghosted behind the head */
    parts.push(`<g opacity=".45">${k.solidSvg(k.slabOf({ x: headX - 20, y: -46, w: 40, d: 92, r: 4 }, 16, 70, P, 4, 0.8), { tone: "lo" })}</g>`);

    /* prioritised replay ring */
    const ringX = -78;
    const ringY = 74;
    parts.push(k.solidSvg(k.cylinder(ringX, ringY, 46, 16, 16, P, 48, 0.8), { tone: "mid" }));
    parts.push(k.lineSvg(k.ring(ringX, ringY, 38, 32, P, 44), { tone: "faint" }));
    const sectors = [];
    const filled = state.buffer;
    for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const r0 = 20;
        const r1 = 20 + (i < filled ? 16 : 0);
        const p0 = k.iso([ringX + Math.cos(a) * r0, ringY + Math.sin(a) * r0, 32], P);
        const p1 = k.iso([ringX + Math.cos(a) * r1, ringY + Math.sin(a) * r1, 32], P);
        sectors.push(`<path class="iso-line" data-tone="${i < filled ? "mid" : "faint"}" d="M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}"/>`);
    }
    parts.push(`<g class="iso-sectors">${sectors.join("")}</g>`);
    parts.push(k.solidSvg(k.cylinder(ringX, ringY, 15, 32, 5, P, 32, 0.6), { tone: "hi" }));

    /* the update path, from ring to head */
    parts.push(k.wireSvg(k.iso([ringX + 30, ringY - 24, 36], P), k.iso([headX - 22, -20, 86], P), {
        via: [k.iso([ringX + 86, ringY - 60, 36], P), k.iso([headX - 60, -40, 60], P)],
        tone: "mid",
        flow: true,
    }));

    /* reward meter on the plate */
    const meterX = 34;
    const meterY = 62;
    parts.push(k.solidSvg(k.slabOf({ x: meterX - 16, y: meterY - 54, w: 32, d: 108, r: 3 }, 16, 5, P, 4), { tone: "lo" }));
    const bars = 12;
    for (let i = 0; i < bars; i++) {
        const on = state.rewardPct > i / bars;
        const h = 4 + i * 3.4;
        parts.push(k.solidSvg(k.slabOf({ x: meterX - 9, y: meterY + 40 - h, w: 18, d: 7, r: 1 }, 21, on ? 3 : 1.4, P, 2), { tone: on ? "hi" : "lo", lit: on && i === bars - 1 }));
    }

    return {
        svg: k.figureSvg({ width: 900, height: 520, label: "Isometric drawing of a dueling double DQN training console", body: parts }),
        viewBox: "0 0 900 520",
    };
}

/* ------------------------------------------------------------
   Wiring
   ------------------------------------------------------------ */

function mountStyle() {
    if (document.getElementById("iso-kit-style"))
        return;
    const style = document.createElement("style");
    style.id = "iso-kit-style";
    style.textContent = k.ISO_CSS;
    document.head.appendChild(style);
}

function stageOf(name) {
    return document.querySelector(`[data-figure="${name}"] [data-stage]`);
}

function readoutOf(name) {
    return document.querySelector(`[data-figure="${name}"] [data-readout]`);
}

function renderRig() {
    const stage = stageOf("rig");
    if (!stage)
        return;
    const alpha = rigState.alpha;
    const trimmed = rigState.trim;
    stage.innerHTML = buildRig(alpha, trimmed).svg;
    const readout = readoutOf("rig");
    if (readout) {
        const cl = AERO.cl(alpha);
        const cd = AERO.cd(alpha);
        const flow = AERO.separated(alpha) ? (alpha > 15 ? "STALLED" : "SEPARATING") : "ATTACHED";
        readout.textContent = `α ${alpha.toFixed(1)}°  ·  C_L ${cl.toFixed(2)}  ·  C_D ${cd.toFixed(3)}  ·  q ${AERO.q.toFixed(0)} Pa  ·  ${flow}`;
    }
}

const rigState = { alpha: 6, trim: 0.25 };

function mountRig() {
    const stage = stageOf("rig");
    if (!stage)
        return;
    const plate = stage.closest(".iso-plate");
    let dragging = false;

    const setFromEvent = (event) => {
        const rect = stage.getBoundingClientRect();
        const t = (event.clientX - rect.left) / rect.width;
        rigState.alpha = Math.max(-4, Math.min(20, (t - 0.24) / 0.52 * 24 - 4));
        rigState.trim = Math.max(0, Math.min(1, rigState.alpha / 18));
        renderRig();
    };

    stage.addEventListener("pointerdown", (event) => {
        dragging = true;
        stage.setPointerCapture(event.pointerId);
        stage.classList.add("is-grabbing");
        setFromEvent(event);
    });
    stage.addEventListener("pointermove", (event) => {
        if (dragging)
            setFromEvent(event);
    });
    const stop = (event) => {
        dragging = false;
        stage.classList.remove("is-grabbing");
        if (event.pointerId !== undefined && stage.hasPointerCapture && stage.hasPointerCapture(event.pointerId))
            stage.releasePointerCapture(event.pointerId);
    };
    stage.addEventListener("pointerup", stop);
    stage.addEventListener("pointercancel", stop);

    stage.tabIndex = 0;
    stage.setAttribute("role", "slider");
    stage.setAttribute("aria-label", "Angle of attack");
    stage.setAttribute("aria-valuemin", "-4");
    stage.setAttribute("aria-valuemax", "20");
    stage.addEventListener("keydown", (event) => {
        const step = event.shiftKey ? 1 : 0.5;
        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            rigState.alpha = Math.min(20, rigState.alpha + step);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            rigState.alpha = Math.max(-4, rigState.alpha - step);
        } else {
            return;
        }
        event.preventDefault();
        rigState.trim = Math.max(0, Math.min(1, rigState.alpha / 18));
        renderRig();
    });

    renderRig();
}

const consoleState = {
    episode: 0,
    reward: 0,
    rewardPct: 0,
    buffer: 0,
    pulseLayer: -1,
    timer: null,
};

function renderConsole() {
    const stage = stageOf("console");
    if (!stage)
        return;
    stage.innerHTML = buildConsole(consoleState).svg;
    const readout = readoutOf("console");
    if (readout) {
        readout.textContent = `ε ${(0.08 + 0.92 * Math.exp(-consoleState.episode / 40)).toFixed(3)}  ·  episode ${consoleState.episode}  ·  r̄ ${Math.round(consoleState.reward)}  ·  buffer ${consoleState.buffer}/24`;
    }
}

function stepConsole() {
    consoleState.episode += 1;
    consoleState.reward = Math.min(5200, consoleState.reward * 1.08 + 180);
    consoleState.rewardPct = Math.min(1, consoleState.reward / 4825);
    consoleState.buffer = Math.min(24, consoleState.buffer + 1);
    consoleState.pulseLayer = (consoleState.pulseLayer + 1) % 4;
    renderConsole();
}

function mountConsole() {
    const stage = stageOf("console");
    if (!stage)
        return;
    stage.tabIndex = 0;
    stage.setAttribute("role", "button");
    stage.setAttribute("aria-label", "Run a training step");
    stage.addEventListener("pointerenter", () => {
        if (consoleState.timer)
            return;
        consoleState.timer = setInterval(stepConsole, 900);
    });
    stage.addEventListener("pointerleave", () => {
        clearInterval(consoleState.timer);
        consoleState.timer = null;
    });
    stage.addEventListener("click", stepConsole);
    stage.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            stepConsole();
        }
    });
    renderConsole();
}

export function initFigures() {
    mountStyle();
    mountRig();
    mountConsole();
}

export const FIGURES = { AERO };
