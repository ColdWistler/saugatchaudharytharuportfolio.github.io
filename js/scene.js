/* ============================================================
   SCENE — the cinematic layer behind the page
   ------------------------------------------------------------
   A dark hangar: the RAPTORM86 flight model hangs on a slim
   sting above a lit floor plate, one warm key light, a cold rim,
   drifting dust and a slow bloom-and-grain grade.

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

function buildModel() {
    const group = new THREE.Group();

    const skin = new THREE.MeshStandardMaterial({ color: 0xb4bcc6, roughness: 0.38, metalness: 0.22 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x23282f, roughness: 0.52, metalness: 0.45 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xff9a3c, roughness: 0.35, metalness: 0.2, emissive: 0xff6a10, emissiveIntensity: 0.55 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0d1218, roughness: 0.08, metalness: 0.9 });
    const glow = new THREE.MeshBasicMaterial({ color: 0xffb066 });

    /* fuselage */
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 3.6, 8, 28), skin);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.85, 28), skin);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -2.2;
    nose.castShadow = true;
    group.add(nose);

    const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.1, 28), skin);
    tailCone.rotation.x = Math.PI / 2;
    tailCone.position.z = 2.25;
    tailCone.scale.set(1, 1, 1);
    tailCone.castShadow = true;
    group.add(tailCone);

    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 2.2, 6, 20), dark);
    belly.rotation.x = Math.PI / 2;
    belly.scale.set(0.92, 0.92, 0.7);
    belly.position.set(0, -0.14, 0.3);
    group.add(belly);

    /* accent stripe */
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.06, 3.5), accent);
    stripe.position.set(0.3, 0.06, 0.1);
    group.add(stripe);
    const stripe2 = stripe.clone();
    stripe2.position.x = -0.3;
    group.add(stripe2);

    /* canopy */
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), glass);
    canopy.scale.set(0.9, 0.72, 1.9);
    canopy.position.set(0, 0.24, -0.55);
    group.add(canopy);

    /* wing */
    const wing = new THREE.Mesh(airfoilGeometry(1.45, 6.2, 0.12), skin);
    wing.position.set(0, -0.02, 0.15);
    wing.castShadow = true;
    wing.receiveShadow = true;
    group.add(wing);

    const wingTip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 1.2), accent);
    wingTip.position.set(3.05, 0, 0.1);
    group.add(wingTip);
    const wingTip2 = wingTip.clone();
    wingTip2.position.x = -3.05;
    group.add(wingTip2);

    /* tail surfaces */
    const stab = new THREE.Mesh(airfoilGeometry(0.72, 1.9, 0.1), skin);
    stab.position.set(0, 0.02, 1.95);
    stab.castShadow = true;
    group.add(stab);

    const finGeometry = airfoilGeometry(0.86, 1.15, 0.1);
    const fin = new THREE.Mesh(finGeometry, skin);
    fin.rotation.z = Math.PI / 2;
    fin.position.set(0, 0.42, 1.95);
    fin.castShadow = true;
    group.add(fin);

    /* engine nacelle */
    const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 1.05, 28), dark);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(0, -0.52, 0.1);
    nacelle.castShadow = true;
    group.add(nacelle);

    const intake = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 10, 28), skin);
    intake.position.set(0, -0.52, -0.42);
    group.add(intake);

    const exhaust = new THREE.Mesh(new THREE.CircleGeometry(0.19, 28), glow);
    exhaust.position.set(0, -0.52, 0.62);
    exhaust.rotation.y = Math.PI;
    group.add(exhaust);

    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.5), dark);
    pylon.position.set(0, -0.32, 0.05);
    group.add(pylon);

    /* the sting: a slim column down to the floor plate */
    const sting = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.1, 16), dark);
    sting.position.set(0, -1.6, 0.2);
    sting.castShadow = true;
    group.add(sting);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 20), skin);
    collar.position.set(0, -0.62, 0.2);
    group.add(collar);

    group.position.y = 2.35;
    group.name = "raptor";

    return { group, glow };
}

/* ------------------------------------------------------------
   Floor: a lit plate with a fading technical grid
   ------------------------------------------------------------ */

function buildFloor() {
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uBase: { value: new THREE.Color(0x070a0e) },
            uLine: { value: new THREE.Color(0x2b3d4d) },
            uPool: { value: new THREE.Color(0x2a1c10) },
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
                col *= 1.0 - smoothstep(12.0, 30.0, d);
                gl_FragColor = vec4(col, 1.0);
            }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70, 1, 1), material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.72;
    return floor;
}

function buildDust(count = 900) {
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
        color: 0xffd9b0,
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
        uTime: { value: 0 },
        uVignette: { value: 1.05 },
        uGrain: { value: 0.055 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uVignette;
        uniform float uGrain;
        varying vec2 vUv;
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        void main() {
            vec2 c = vUv - 0.5;
            float r2 = dot(c, c);
            vec2 shift = c * r2 * 0.0035;
            vec3 col;
            col.r = texture2D(tDiffuse, vUv + shift).r;
            col.g = texture2D(tDiffuse, vUv).g;
            col.b = texture2D(tDiffuse, vUv - shift).b;
            float vig = smoothstep(0.95, 0.18, r2 * uVignette);
            col *= mix(0.62, 1.0, vig);
            float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 91.7) - 0.5;
            col += g * uGrain;
            gl_FragColor = vec4(col, 1.0);
        }`,
};

/* ------------------------------------------------------------
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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070a);
    scene.fog = new THREE.FogExp2(0x05070a, 0.03);

    const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 120);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.32;

    const { group, glow } = buildModel();
    scene.add(group);

    const floor = buildFloor();
    scene.add(floor);

    const dust = buildDust();
    scene.add(dust);

    /* the plate the sting stands on */
    const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.3, 0.12, 64),
        new THREE.MeshStandardMaterial({ color: 0x11161c, roughness: 0.6, metalness: 0.35 })
    );
    plate.position.y = -0.66;
    plate.receiveShadow = true;
    scene.add(plate);

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.13, 0.016, 8, 96),
        new THREE.MeshBasicMaterial({ color: 0xff8a2b })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.6;
    scene.add(ring);

    /* lighting */
    const key = new THREE.SpotLight(0xffd6a8, 260, 26, 0.62, 0.7, 2);
    key.position.set(4.2, 7.4, 3.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0012;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    scene.add(key);
    scene.add(key.target);
    key.target.position.set(0, 2.2, 0);

    const rim = new THREE.DirectionalLight(0x6d9bff, 1.6);
    rim.position.set(-5.5, 3.2, -5.5);
    scene.add(rim);

    const kick = new THREE.PointLight(0xff8a2b, 12, 9, 2);
    kick.position.set(1.6, 0.4, 1.6);
    scene.add(kick);

    scene.add(new THREE.HemisphereLight(0x24374d, 0x04060a, 0.5));

    /* light shafts */
    const shaftMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color(0xffc98c) }, uOpacity: { value: 0.06 } },
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

    /* post stack */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.62, 0.62, 0.72);
    composer.addPass(bloom);

    composer.addPass(new OutputPass());

    const grade = new ShaderPass(GradeShader);
    composer.addPass(grade);

    /* ---------------- choreography ---------------- */

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener("pointermove", (event) => {
        pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
        if (reduced)
            dirty = true;
    }, { passive: true });

    const sections = STATIONS.map((station) => document.getElementById(station.id)).filter(Boolean);
    const state = { index: 0, blend: 0 };
    let dirty = true;
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
    window.addEventListener("resize", () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h);
        composer.setSize(w, h);
        bloom.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        anchor();
        measure();
    });
    window.addEventListener("load", () => {
        anchor();
        measure();
    });
    if (document.fonts && document.fonts.ready)
        document.fonts.ready.then(() => { anchor(); measure(); });

    anchor();
    measure();

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
    composer.render();
    if (typeof options.onReady === "function")
        options.onReady();

    /* ---------------- loop ---------------- */

    const clock = new THREE.Clock();
    let light = true;
    let firstFrame = true;

    function themeIsLight() {
        return document.documentElement.getAttribute("data-theme") === "light";
    }

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

    function frame() {
        requestAnimationFrame(frame);
        if (document.hidden)
            return;

        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        const wantLight = !themeIsLight();
        if (wantLight !== light) {
            light = wantLight;
            canvas.classList.toggle("is-hidden", !light);
            dirty = true;
        }
        if (!light)
            return;

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

        glow.opacity = 0.75 + Math.sin(t * 2.1) * 0.12 * drift;
        key.intensity = 250 + Math.sin(t * 0.7) * 12 * drift;

        if (!reduced) {
            const positions = dust.geometry.attributes.position.array;
            const seeds = dust.userData.seeds;
            for (let i = 0; i < seeds.length; i++) {
                positions[i * 3 + 1] += dt * (0.035 + (seeds[i] % 1) * 0.05);
                positions[i * 3] += Math.sin(t * 0.25 + seeds[i]) * dt * 0.03;
                if (positions[i * 3 + 1] > 6.5)
                    positions[i * 3 + 1] = -0.5;
            }
            dust.geometry.attributes.position.needsUpdate = true;
        }

        grade.uniforms.uTime.value = t;
        composer.render();

        if (firstFrame) {
            firstFrame = false;
            if (typeof options.onReady === "function")
                options.onReady();
        }
    }

    /* hold the first frame until the page has faded in */
    requestAnimationFrame(frame);

    /* A small console handle: inspect the rig, or jump the camera
       to the station you are reading instead of waiting for it. */
    const handle = {
        renderer,
        scene,
        camera,
        stations: STATIONS,
        model: group,
        snap() {
            cameraPos.copy(wantedPos);
            cameraTarget.copy(wantedTarget);
            camera.fov = wantedFov;
            camera.updateProjectionMatrix();
            dirty = true;
        },
    };
    window.__hangar = handle;
    return handle;
}
