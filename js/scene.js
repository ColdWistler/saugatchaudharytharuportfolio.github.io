/* ============================================================
   SCENE — the cinematic layer behind the page
   ------------------------------------------------------------
   The RAPTORM86 flight model hangs on a slim sting above a lit
   floor plate, one warm key light, a cold rim, drifting dust and
   a slow bloom-and-grain grade.

   Two grades of the same shot: an indigo night with a sunset
   horizon and a magenta counter-light, and a bleached daylight
   poster with a cyan sky and a teal shadow side. The theme
   repaints the sky, floor, materials and lights in place.

   The camera is choreographed by the scroll: every section with
   a data-station attribute owns a camera station, and the
   camera eases between them. Modelled on the dioramas engine —
   a 3D scene that carries the page rather than decorating a
   hero — and kept deliberately light: one shadowed spot, a few
   thousand triangles, no heavy post stack.
   ============================================================ */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------
   Geometry: an aeroplane built from primitives
   ------------------------------------------------------------ */

function nacaShape(chord, thickness = 0.12, steps = 22) {
    const yt = (x) => 5 * thickness * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    for (let i = 0; i <= steps; i++) {
        const x = 1 - i / steps;
        shape.lineTo(x * chord, yt(x) * chord);
    }
    for (let i = steps; i >= 0; i--) {
        const x = i / steps;
        shape.lineTo(x * chord, -yt(x) * chord);
    }
    shape.closePath();
    return shape;
}

function airfoilGeometry(chord, span, thickness = 0.12) {
    const shape = nacaShape(chord, thickness);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: span, bevelEnabled: false, curveSegments: 2 });
    geometry.translate(0, 0, -span / 2);
    geometry.rotateY(Math.PI / 2);
    geometry.computeVertexNormals();
    return geometry;
}

function buildModel(P) {
    const group = new THREE.Group();

    const skin = new THREE.MeshStandardMaterial({ color: P.skin, roughness: 0.38, metalness: 0.22 });
    const dark = new THREE.MeshStandardMaterial({ color: P.dark, roughness: 0.52, metalness: 0.45 });
    const accent = new THREE.MeshStandardMaterial({ color: P.accent, roughness: 0.35, metalness: 0.2, emissive: P.accentGlow, emissiveIntensity: 0.55 });
    const glass = new THREE.MeshStandardMaterial({ color: P.glass, roughness: 0.08, metalness: 0.9 });
    const glow = new THREE.MeshBasicMaterial({ color: P.glow });

    const add = (mesh, shade = true) => {
        mesh.castShadow = shade;
        mesh.receiveShadow = shade;
        group.add(mesh);
        return mesh;
    };

    /* --- fuselage: a slim cargo pod with a blunt nose --------- */
    const body = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 3.3, 8, 28), skin));
    body.rotation.x = Math.PI / 2;

    const nose = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 20), skin));
    nose.scale.set(1, 0.94, 1.3);
    nose.position.set(0, 0, -1.92);

    /* payload doors down each flank */
    for (const x of [-0.295, 0.295]) {
        const door = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.24, 1.05), dark));
        door.position.set(x, -0.03, -0.3);
    }

    /* gimballed sensor turret under the nose */
    const turret = add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), glass));
    turret.scale.set(1, 0.9, 1.2);
    turret.position.set(0, -0.24, -1.46);

    /* dorsal spine and a blade antenna */
    const spine = add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 1.5), dark));
    spine.position.set(0, 0.31, 0.15);
    const antenna = add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.02, 0.46, 8), dark), false);
    antenna.position.set(0, 0.56, 1.15);

    /* --- high wing with winglets and navigation lights -------- */
    const wing = add(new THREE.Mesh(airfoilGeometry(1.5, 6.4, 0.13), skin));
    wing.position.set(0, 0.3, -0.15);

    for (const side of [-1, 1]) {
        const winglet = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.62), accent));
        winglet.position.set(side * 3.19, 0.42, -0.12);
        winglet.rotation.z = side * -0.16;

        const light = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 12, 10),
            new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff2f7e : 0x35e0d0 }),
        );
        light.position.set(side * 3.16, 0.36, 0.34);
        group.add(light);

        /* struts from the belly up to the wing */
        const strut = add(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.62, 10), dark));
        strut.position.set(side * 1.25, 0.12, -0.12);
        strut.rotation.z = side * 0.18;
    }

    /* --- twin tail booms and the tailplane -------------------- */
    for (const side of [-1, 1]) {
        const boom = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 14), dark));
        boom.rotation.x = Math.PI / 2;
        boom.position.set(side * 1.15, 0.24, 1.7);

        const fin = add(new THREE.Mesh(airfoilGeometry(0.72, 1.0, 0.1), skin));
        fin.rotation.z = Math.PI / 2;
        fin.position.set(side * 1.15, 0.74, 2.8);
    }

    const stab = add(new THREE.Mesh(airfoilGeometry(0.62, 2.7, 0.1), skin));
    stab.position.set(0, 0.26, 2.85);

    /* --- pusher motor and propeller --------------------------- */
    const motor = add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.5, 20), dark));
    motor.rotation.x = Math.PI / 2;
    motor.position.set(0, 0.3, 2.05);

    const prop = new THREE.Group();
    prop.name = "prop";
    prop.position.set(0, 0.3, 2.34);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), skin);
    prop.add(hub);
    for (const side of [-1, 1]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.78, 0.03), dark);
        blade.position.y = side * 0.4;
        blade.rotation.z = side * 0.22;
        blade.castShadow = true;
        prop.add(blade);
    }
    group.add(prop);

    /* --- payload: the cargo pod under the wing ---------------- */
    const pod = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 1.05, 8, 22), dark));
    pod.rotation.x = Math.PI / 2;
    pod.scale.set(0.95, 1, 0.78);
    pod.position.set(0, -0.44, 0.42);

    const podBand = add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.16), accent), false);
    podBand.position.set(0, -0.2, 0.42);

    /* --- SkyHook: the recovery hook on the wing shoulder ------ */
    const hookPylon = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.3, 12), dark));
    hookPylon.position.set(0, 0.5, -0.42);

    const hook = add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 26, Math.PI * 1.35), accent));
    hook.position.set(0, 0.72, -0.42);
    hook.rotation.z = -Math.PI * 0.34;

    /* capture horns either side of the hook mouth */
    for (const side of [-1, 1]) {
        const horn = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 8), accent), false);
        horn.position.set(side * 0.16, 0.9, -0.42);
        horn.rotation.z = side * 0.42;
    }

    /* the capture strop hanging out of the hook: the SkyHook grabs
       a line on approach and the strop is what it keeps hold of */
    const strop = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), dark), false);
    strop.position.set(0, 0.44, -0.42);
    strop.material = new THREE.MeshBasicMaterial({ color: P.dark, transparent: true, opacity: 0.7 });

    /* the display sting, up to the cargo pod */
    const sting = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.1, 16), dark));
    sting.position.set(0, -1.6, 0.2);

    const collar = add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 20), skin));
    collar.position.set(0, -0.66, 0.2);

    group.position.y = 2.35;
    group.name = "skylark";

    return { group, glow, prop, materials: { skin, dark, accent, glass } };
}

/* ------------------------------------------------------------
   Floor: a lit plate with a fading technical grid
   ------------------------------------------------------------ */

function buildFloor(P) {
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uBase: { value: new THREE.Color(P.floorBase) },
            uLine: { value: new THREE.Color(P.floorLine) },
            uPool: { value: new THREE.Color(P.floorPool) },
            uFog: { value: new THREE.Color(P.fog) },
            uFogDensity: { value: P.fogDensity },
        },
        vertexShader: `
            varying vec3 vWorld;
            void main() {
                vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
            }`,
        fragmentShader: `
            uniform vec3 uBase;
            uniform vec3 uLine;
            uniform vec3 uPool;
            uniform vec3 uFog;
            uniform float uFogDensity;
            varying vec3 vWorld;
            float grid(vec2 p, float step, float width) {
                vec2 c = p / step;
                vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
                return 1.0 - smoothstep(0.0, width, min(g.x, g.y));
            }
            void main() {
                float d = length(vWorld.xz);
                float fade = exp(-d * 0.075);
                float lines = grid(vWorld.xz, 1.0, 1.1) * 0.22 + grid(vWorld.xz, 5.0, 1.3) * 0.42;
                vec3 col = uBase + uLine * lines * fade;
                col += uPool * exp(-d * d * 0.014) * 1.4;

                /* Fade to the fog rather than to black: a custom shader
                   gets no automatic fog, and a hard black rim reads as
                   a tear along the horizon in daylight. */
                float dist = distance(vWorld, cameraPosition);
                float fogF = clamp(1.0 - exp(-pow(dist * uFogDensity, 2.0)), 0.0, 1.0);
                col = mix(col, uFog, fogF);
                col = mix(uFog, col, 1.0 - smoothstep(24.0, 36.0, d));
                gl_FragColor = vec4(col, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70, 1, 1), material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.72;
    return floor;
}

function buildDust(count = 620, color = 0xffd9b0) {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 1] = Math.random() * 7 - 0.5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
        seeds[i] = Math.random() * 100;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const ctx = sprite.getContext("2d");
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(sprite);

    const material = new THREE.PointsMaterial({
        size: 0.055,
        map: texture,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color,
        sizeAttenuation: true,
    });
    const points = new THREE.Points(geometry, material);
    points.userData.seeds = seeds;
    return points;
}

/* ------------------------------------------------------------
   Grade pass: vignette, grain, a whisper of chromatic aberration
   ------------------------------------------------------------ */

const GradeShader = {
    uniforms: {
        tDiffuse: { value: null },
        uVignette: { value: 1.05 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uVignette;
        varying vec2 vUv;
        void main() {
            vec3 col = texture2D(tDiffuse, vUv).rgb;
            vec2 c = vUv - 0.5;
            float r2 = dot(c, c);
            col *= mix(0.66, 1.0, smoothstep(0.95, 0.18, r2 * uVignette));
            gl_FragColor = vec4(col, 1.0);
        }`,
};

/* ------------------------------------------------------------
   Palettes — night neon and daylight cel
   ------------------------------------------------------------
   Same composition both ways, which is what sells it: an indigo
   sunset with a magenta counter-light at night, and a bleached
   cyan-and-cream poster by day. */
const PALETTES = {
    dark: {
        skyTop: 0x07051c, skyMid: 0x2b0d44, skyHorizon: 0xb8331f, skyGround: 0x05030f,
        sun: 0xff7a3c, sunSize: 0.17,
        fog: 0x120a2a, fogDensity: 0.028,
        floorBase: 0x0a0722, floorLine: 0x2f6f9e, floorPool: 0x4a1230,
        skin: 0xd8d0ea, dark: 0x241d4a, accent: 0xff6a35, accentGlow: 0xff3d10,
        glass: 0x0a0a24, glow: 0xff9a5a, dust: 0xffc9a0,
        key: 0xffb27a, keyIntensity: 260,
        rim: 0x35e0d0, rimIntensity: 1.8,
        kick: 0xff2f7e, kickIntensity: 14,
        hemiSky: 0x2c2a72, hemiGround: 0x08040f, hemiIntensity: 0.5,
        ring: 0x35e0d0, shaft: 0xffb27a, shaftOpacity: 0.055,
        plate: 0x11162c,
        exposure: 1.05, env: 0.32,
        bloomStrength: 0.58, bloomRadius: 0.62, bloomThreshold: 0.72,
        vignette: 1.05,
    },
    light: {
        skyTop: 0x4bb8d8, skyMid: 0x8fd6e8, skyHorizon: 0xffd9a0, skyGround: 0xe8d8ba,
        sun: 0xfff2c8, sunSize: 0.22,
        fog: 0xe8d9bd, fogDensity: 0.016,
        floorBase: 0x9c8e72, floorLine: 0x54818e, floorPool: 0xffcf96,
        skin: 0xcfc5b0, dark: 0x17394a, accent: 0xd93b18, accentGlow: 0xff5a2a,
        glass: 0x0d3540, glow: 0xffb27a, dust: 0xffffff,
        key: 0xfff2da, keyIntensity: 430,
        rim: 0x1f8fa8, rimIntensity: 2.8,
        kick: 0xff5a3c, kickIntensity: 12,
        hemiSky: 0xa8dcea, hemiGround: 0xe0cbaa, hemiIntensity: 0.24,
        ring: 0x0b7d8e, shaft: 0xffe7bd, shaftOpacity: 0.02,
        plate: 0xd9c9a8,
        exposure: 0.92, env: 0.16,
        bloomStrength: 0.2, bloomRadius: 0.5, bloomThreshold: 0.9,
        vignette: 0.5,
    },
};

/* The sky is baked once per theme into a 2:1 equirect texture
   instead of being shaded per pixel every frame. Same gradient,
   same low sun, one cheap textured quad instead of a full-screen
   fragment shader. */
function hexCss(value) {
    return "#" + value.toString(16).padStart(6, "0");
}

function skyTexture(P) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    /* The camera is pitched down about twenty degrees, so the whole
       frame sits in a narrow band just under the horizon. The useful
       part of the gradient is therefore squeezed into v 0.38–0.56:
       cyan overhead, warm haze at the horizon line, ground below. */
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0.0, hexCss(P.skyTop));
    gradient.addColorStop(0.38, hexCss(P.skyMid));
    gradient.addColorStop(0.485, hexCss(P.skyMid));
    gradient.addColorStop(0.515, hexCss(P.skyHorizon));
    gradient.addColorStop(0.56, hexCss(P.fog));
    gradient.addColorStop(1.0, hexCss(P.skyGround));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);

    const sx = 316;
    const sy = 118;
    const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, 78);
    sun.addColorStop(0, hexCss(P.sun) + "f2");
    sun.addColorStop(0.34, hexCss(P.sun) + "5c");
    sun.addColorStop(1, hexCss(P.sun) + "00");
    ctx.fillStyle = sun;
    ctx.fillRect(sx - 78, sy - 78, 156, 156);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
}

/* ------------------------------------------------------------/* ------------------------------------------------------------
   Camera stations — one per section
   ------------------------------------------------------------ */

/* Stations are described on an orbit rather than in cartesian space,
   so the camera reads as one continuous sweep around the airframe
   instead of nine unrelated viewpoints.

     az   degrees around Y — 0 is dead astern, 180 is nose-on
     el   degrees above the horizon
     dist units from the target; the airframe is ~6.4 across, so
          ~12 units puts it in the right-hand third at ~46% width

   The azimuth decreases steadily from 165° to -115°, one long
   three-quarter orbit that ends nose-on for the contact panel. */

const D2R = Math.PI / 180;

const STATIONS = [
    { id: "home", az: 148, el: 15, dist: 13.2, fov: 34, target: [0, 2.1, 0] },
    { id: "featured", az: 118, el: 2, dist: 11.8, fov: 36, target: [0, 2.2, 0] },
    { id: "research", az: 90, el: 8, dist: 12.4, fov: 36, target: [0, 2.2, 0] },
    { id: "algorithms", az: 55, el: 30, dist: 11.4, fov: 40, target: [0, 1.9, 0] },
    { id: "about", az: 22, el: -2, dist: 11.2, fov: 40, target: [0, 2.25, 0] },
    { id: "projects", az: -12, el: 14, dist: 11.8, fov: 38, target: [0, 2.2, 0] },
    { id: "other-projects", az: -46, el: 3, dist: 11.8, fov: 38, target: [0, 2.2, 0] },
    { id: "skills", az: -80, el: -6, dist: 12.4, fov: 36, target: [0, 2.2, 0] },
    { id: "schematics", az: -96, el: 9, dist: 12.6, fov: 36, target: [0, 2.2, 0] },
    { id: "contact", az: -112, el: 5, dist: 13.6, fov: 33, target: [0, 2.25, 0] },
].map((station) => {
    const az = station.az * D2R;
    const el = station.el * D2R;
    const flat = Math.cos(el) * station.dist;
    return {
        ...station,
        pos: [
            station.target[0] + Math.sin(az) * flat,
            station.target[1] + Math.sin(el) * station.dist,
            station.target[2] + Math.cos(az) * flat,
        ],
    };
});

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */

export function initScene(options = {}) {
    const canvas = document.getElementById("scene");
    if (!canvas)
        return null;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch (error) {
        document.documentElement.classList.add("no-scene");
        return null;
    }
    if (!renderer.capabilities.isWebGL2 && !renderer.getContext()) {
        document.documentElement.classList.add("no-scene");
        return null;
    }

    /* ---- budget ------------------------------------------------
       The full rig is a post chain, soft shadows and drifting dust.
       Phones and low-core laptops get the same picture for less:
       no post pass, a smaller shadow atlas, fewer motes, a capped
       frame rate. */
    const cores = navigator.hardwareConcurrency || 8;
    const small = window.matchMedia("(max-width: 900px)").matches;
    const lowPower = small || cores <= 4;
    const usePost = !small && cores > 2;
    const maxPixels = lowPower ? 900000 : 2000000;
    const renderScale = lowPower ? 1 : 0.9;

    /* A pixel budget rather than a flat ratio: a 4K window renders a
       fraction of its area, a laptop renders near-native, and the
       softness reads as film rather than as a bug. */
    function ratioFor(w, h) {
        const dpr = window.devicePixelRatio || 1;
        const budget = Math.sqrt(maxPixels / Math.max(1, w * h));
        return Math.min(dpr, budget) * renderScale;
    }

    renderer.setPixelRatio(ratioFor(window.innerWidth, window.innerHeight));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = lowPower ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 160);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    scene.background = skyTexture(PALETTES.dark);

    scene.fog = new THREE.FogExp2(PALETTES.dark.fog, PALETTES.dark.fogDensity);

    const model = buildModel(PALETTES.dark);
    const group = model.group;
    const glow = model.glow;
    scene.add(group);

    const floor = buildFloor(PALETTES.dark);
    scene.add(floor);

    const dust = buildDust(lowPower ? 320 : 620, PALETTES.dark.dust);
    scene.add(dust);

    /* the plate the sting stands on */
    const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.3, 0.12, 64),
        new THREE.MeshStandardMaterial({ color: PALETTES.dark.plate, roughness: 0.6, metalness: 0.35 })
    );
    plate.position.y = -0.66;
    plate.receiveShadow = true;
    scene.add(plate);

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.13, 0.016, 8, 96),
        new THREE.MeshBasicMaterial({ color: PALETTES.dark.ring })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.6;
    scene.add(ring);

    /* lighting */
    const key = new THREE.SpotLight(PALETTES.dark.key, PALETTES.dark.keyIntensity, 26, 0.62, 0.7, 2);
    key.position.set(4.2, 7.4, 3.6);
    key.castShadow = true;
    key.shadow.mapSize.set(lowPower ? 512 : 1024, lowPower ? 512 : 1024);
    key.shadow.bias = -0.0012;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    scene.add(key);
    scene.add(key.target);
    key.target.position.set(0, 2.2, 0);

    const rim = new THREE.DirectionalLight(PALETTES.dark.rim, PALETTES.dark.rimIntensity);
    rim.position.set(-5.5, 3.2, -5.5);
    scene.add(rim);

    const kick = new THREE.PointLight(PALETTES.dark.kick, PALETTES.dark.kickIntensity, 9, 2);
    kick.position.set(1.6, 0.4, 1.6);
    scene.add(kick);

    const hemi = new THREE.HemisphereLight(PALETTES.dark.hemiSky, PALETTES.dark.hemiGround, PALETTES.dark.hemiIntensity);
    scene.add(hemi);

    /* light shafts */
    const shaftMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
            uColor: { value: new THREE.Color(PALETTES.dark.shaft) },
            uOpacity: { value: PALETTES.dark.shaftOpacity },
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vView;
            varying float vY;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                vView = -mv.xyz;
                vY = uv.y;
                gl_Position = projectionMatrix * mv;
            }`,
        fragmentShader: `
            uniform vec3 uColor;
            uniform float uOpacity;
            varying vec3 vNormal;
            varying vec3 vView;
            varying float vY;
            void main() {
                float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
                float body = pow(rim, 2.2);
                float fade = smoothstep(0.0, 0.55, vY) * (1.0 - smoothstep(0.75, 1.0, vY));
                gl_FragColor = vec4(uColor, body * fade * uOpacity);
            }`,
    });

    for (const [x, z, r, h] of [[3.6, 3.0, 2.4, 8.5], [-3.4, -2.6, 2.0, 7.5]]) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 40, 1, true), shaftMaterial);
        cone.position.set(x * 0.55, h / 2 - 0.6, z * 0.55);
        cone.rotation.z = x > 0 ? -0.16 : 0.14;
        cone.rotation.x = z > 0 ? 0.14 : -0.12;
        scene.add(cone);
    }

    /* ---- post stack, wide screens only ---- */
    let composer = null;
    let bloom = null;
    let grade = null;
    if (usePost) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        bloom = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5),
            PALETTES.dark.bloomStrength,
            PALETTES.dark.bloomRadius,
            PALETTES.dark.bloomThreshold
        );
        composer.addPass(bloom);
        composer.addPass(new OutputPass());
        grade = new ShaderPass(GradeShader);
        composer.addPass(grade);
    }

    function renderFrame() {
        if (composer)
            composer.render();
        else
            renderer.render(scene, camera);
    }

    /* ---- palette ---- */
    let theme = null;
    let baseKey = PALETTES.dark.keyIntensity;

    function applyPalette(mode) {
        const P = PALETTES[mode];

        const previousSky = scene.background;
        scene.background = skyTexture(P);
        if (previousSky && previousSky.dispose)
            previousSky.dispose();

        scene.fog.color.setHex(P.fog);
        scene.fog.density = P.fogDensity;

        floor.material.uniforms.uBase.value.setHex(P.floorBase);
        floor.material.uniforms.uLine.value.setHex(P.floorLine);
        floor.material.uniforms.uPool.value.setHex(P.floorPool);
        floor.material.uniforms.uFog.value.setHex(P.fog);
        floor.material.uniforms.uFogDensity.value = P.fogDensity;

        const m = model.materials;
        m.skin.color.setHex(P.skin);
        m.dark.color.setHex(P.dark);
        m.accent.color.setHex(P.accent);
        m.accent.emissive.setHex(P.accentGlow);
        m.glass.color.setHex(P.glass);
        glow.color.setHex(P.glow);
        plate.material.color.setHex(P.plate);

        key.color.setHex(P.key);
        key.intensity = P.keyIntensity;
        baseKey = P.keyIntensity;
        rim.color.setHex(P.rim);
        rim.intensity = P.rimIntensity;
        kick.color.setHex(P.kick);
        kick.intensity = P.kickIntensity;
        hemi.color.setHex(P.hemiSky);
        hemi.groundColor.setHex(P.hemiGround);
        hemi.intensity = P.hemiIntensity;

        ring.material.color.setHex(P.ring);
        shaftMaterial.uniforms.uColor.value.setHex(P.shaft);
        shaftMaterial.uniforms.uOpacity.value = P.shaftOpacity;
        dust.material.color.setHex(P.dust);

        renderer.toneMappingExposure = P.exposure;
        scene.environmentIntensity = P.env;

        if (bloom) {
            bloom.strength = P.bloomStrength;
            bloom.radius = P.bloomRadius;
            bloom.threshold = P.bloomThreshold;
        }
        if (grade)
            grade.uniforms.uVignette.value = P.vignette;

        renderer.shadowMap.needsUpdate = true;
    }

    function themeIsLight() {
        return document.documentElement.getAttribute("data-theme") === "light";
    }

    function syncTheme() {
        const mode = themeIsLight() ? "light" : "dark";
        if (mode === theme)
            return;
        theme = mode;
        applyPalette(mode);
        dirty = true;
    }

    /* ---------------- choreography ---------------- */

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let dirty = true;
    let lastInput = -1e9;

    const markInput = () => { lastInput = performance.now(); };
    for (const type of ["scroll", "wheel", "pointerdown", "touchstart"])
        window.addEventListener(type, markInput, { passive: true });

    window.addEventListener("pointermove", (event) => {
        pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
        markInput();
        if (reduced)
            dirty = true;
    }, { passive: true });

    const sections = STATIONS.map((station) => document.getElementById(station.id)).filter(Boolean);
    const state = { index: 0, blend: 0 };
    const cameraPos = new THREE.Vector3(...STATIONS[0].pos);
    const cameraTarget = new THREE.Vector3(...STATIONS[0].target);
    const wantedPos = cameraPos.clone();
    const wantedTarget = cameraTarget.clone();
    let wantedFov = STATIONS[0].fov;

    /* Each station is anchored to the scroll offset at which its
       section sits in the middle of the viewport. Reading the page
       top-to-bottom therefore walks the orbit one station at a
       time, and at scroll 0 the camera is exactly on station one —
       not half-way into station two, which is what a naive
       "progress through the current section" mapping does. */
    let keys = [];

    function anchor() {
        keys = sections.map((section) => {
            const rect = section.getBoundingClientRect();
            return window.scrollY + rect.top + rect.height * 0.5 - window.innerHeight * 0.5;
        });
        for (let i = 1; i < keys.length; i++)
            keys[i] = Math.max(keys[i], keys[i - 1] + 1);
    }

    function measure() {
        if (keys.length < 2)
            return;
        const y = window.scrollY;
        let index = 0;
        while (index < keys.length - 2 && y > keys[index + 1])
            index++;
        const span = Math.max(1, keys[index + 1] - keys[index]);
        const blend = Math.min(1, Math.max(0, (y - keys[index]) / span));
        state.index = index;
        state.blend = blend;

        const from = STATIONS[index];
        const to = STATIONS[Math.min(index + 1, STATIONS.length - 1)];
        const ease = blend * blend * (3 - 2 * blend);
        wantedPos.set(
            from.pos[0] + (to.pos[0] - from.pos[0]) * ease,
            from.pos[1] + (to.pos[1] - from.pos[1]) * ease,
            from.pos[2] + (to.pos[2] - from.pos[2]) * ease
        );
        wantedTarget.set(
            from.target[0] + (to.target[0] - from.target[0]) * ease,
            from.target[1] + (to.target[1] - from.target[1]) * ease,
            from.target[2] + (to.target[2] - from.target[2]) * ease
        );
        wantedFov = from.fov + (to.fov - from.fov) * ease;
        dirty = true;
    }

    let ticking = false;
    function onScroll() {
        if (ticking)
            return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            measure();
        });
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setPixelRatio(ratioFor(w, h));
        renderer.setSize(w, h);
        if (composer) {
            composer.setSize(w, h);
            bloom.setSize(w * 0.5, h * 0.5);
        }
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        anchor();
        measure();
        dirty = true;
    }
    window.addEventListener("resize", resize);

    window.addEventListener("load", () => {
        anchor();
        measure();
    });
    if (document.fonts && document.fonts.ready)
        document.fonts.ready.then(() => { anchor(); measure(); });

    anchor();
    measure();

    /* The page column owns the left of the screen; the model is
       pushed into the open right-hand third. The push is expressed
       as a fraction of the half-viewport, so it holds at every
       width and every station distance instead of drifting with
       the camera's focal length. */
    function frameShift() {
        const width = window.innerWidth;
        if (width < 900)
            return 0;
        if (width < 1280)
            return 0.26;
        if (width < 1600)
            return 0.40;
        return 0.44;
    }

    /* Paint one frame straight away so the hangar is already
       there when the preloader lifts. */
    camera.position.set(...STATIONS[0].pos);
    camera.lookAt(new THREE.Vector3(...STATIONS[0].target));
    camera.fov = STATIONS[0].fov;
    camera.updateProjectionMatrix();
    const opening = frameShift();
    if (opening) {
        const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.aspect;
        camera.translateX(-opening * halfWidth * camera.position.distanceTo(cameraTarget));
    }
    syncTheme();
    renderer.shadowMap.needsUpdate = true;
    renderFrame();
    if (typeof options.onReady === "function")
        options.onReady();

    /* ---------------- loop ---------------- */

    const clock = new THREE.Clock();
    let firstFrame = true;
    let lastDraw = 0;
    let frameNo = 0;

    function frame(now) {
        requestAnimationFrame(frame);
        if (document.hidden)
            return;

        /* A 30 fps ceiling on the budget rig while the page is
           moving. When nothing has happened for a moment the scene
           is just swaying to itself, so it drops to 20 fps: the
           motion is slow enough that nobody can tell, and reading
           a section stops costing a full frame budget. */
        const idle = now - lastInput > 700;
        if (idle ? now - lastDraw < 50 : lowPower && now - lastDraw < 32)
            return;
        lastDraw = now;
        frameNo++;

        syncTheme();

        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        /* shadows do not need redrawing for every sway */
        if ((frameNo & 3) === 0)
            renderer.shadowMap.needsUpdate = true;

        /* Under reduced motion the camera does not ease and the
           scene does not drift, so there is nothing to animate:
           render on change only and leave the GPU alone. */
        if (reduced) {
            if (!dirty)
                return;
            pointer.x = pointer.tx;
            pointer.y = pointer.ty;
            cameraPos.copy(wantedPos);
            cameraTarget.copy(wantedTarget);
            if (camera.fov !== wantedFov) {
                camera.fov = wantedFov;
                camera.updateProjectionMatrix();
            }
        } else {
            pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
            pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
            cameraPos.lerp(wantedPos, Math.min(1, dt * 2.4));
            cameraTarget.lerp(wantedTarget, Math.min(1, dt * 2.4));
            if (Math.abs(camera.fov - wantedFov) > 0.01) {
                camera.fov += (wantedFov - camera.fov) * Math.min(1, dt * 2.4);
                camera.updateProjectionMatrix();
            }
        }
        dirty = false;

        const drift = reduced ? 0 : 1;
        const sway = Math.sin(t * 0.13) * 0.16 * drift;
        const bob = Math.sin(t * 0.19) * 0.07 * drift;

        camera.position.set(
            cameraPos.x + pointer.x * 0.35,
            cameraPos.y - pointer.y * 0.22 + bob,
            cameraPos.z + pointer.x * 0.12
        );
        camera.lookAt(cameraTarget);
        const shift = frameShift();
        if (shift) {
            const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.aspect;
            camera.translateX(-shift * halfWidth * camera.position.distanceTo(cameraTarget));
        }

        group.rotation.y = sway + pointer.x * 0.12;
        group.rotation.z = Math.sin(t * 0.11) * 0.03 * drift;
        group.position.y = 2.35 + bob * 0.6;
        model.prop.rotation.z = t * 24 * drift;

        glow.opacity = 0.75 + Math.sin(t * 2.1) * 0.12 * drift;
        key.intensity = baseKey * (1 + Math.sin(t * 0.7) * 0.05 * drift);

        if (!reduced && (!lowPower || (frameNo & 1) === 0)) {
            const positions = dust.geometry.attributes.position.array;
            const seeds = dust.userData.seeds;
            const step = lowPower ? dt * 2 : dt;
            for (let i = 0; i < seeds.length; i++) {
                positions[i * 3 + 1] += step * (0.035 + (seeds[i] % 1) * 0.05);
                positions[i * 3] += Math.sin(t * 0.25 + seeds[i]) * step * 0.03;
                if (positions[i * 3 + 1] > 6.5)
                    positions[i * 3 + 1] = -0.5;
            }
            dust.geometry.attributes.position.needsUpdate = true;
        }

        renderFrame();

        if (firstFrame) {
            firstFrame = false;
            if (typeof options.onReady === "function")
                options.onReady();
        }
    }

    requestAnimationFrame(frame);

    /* A small console handle: inspect the rig, or jump the camera
       to the station you are reading instead of waiting for it. */
    const handle = {
        renderer,
        scene,
        camera,
        stations: STATIONS,
        model: group,
        palette: PALETTES,
        snap() {
            cameraPos.copy(wantedPos);
            cameraTarget.copy(wantedTarget);
            camera.fov = wantedFov;
            camera.updateProjectionMatrix();
            dirty = true;
        },
        theme(mode) {
            theme = null;
            applyPalette(mode || (themeIsLight() ? "light" : "dark"));
            theme = mode || (themeIsLight() ? "light" : "dark");
            dirty = true;
        },
    };
    window.__hangar = handle;
    return handle;
}
