/* ============================================================
   ANIMATED COMPONENTS — vanilla ports of the AnimatedCOmponents/
   Fibre Arc, Pixel Drift and Radial Reveal Button pieces.
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  var pixelInstances = [];
  var currentFibre = null;
  var ditherInstances = [];

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function componentColors() {
    var s = getComputedStyle(document.documentElement);
    return {
      ink: s.getPropertyValue('--ink').trim() || '#ECE9E0',
      accent: s.getPropertyValue('--accent').trim() || '#DE8453',
      accentInk: s.getPropertyValue('--accent-ink').trim() || '#E9A878',
      paper: s.getPropertyValue('--paper').trim() || '#151410'
    };
  }

  /* ------------------------------------------------------------
     RADIAL REVEAL BUTTON
     ------------------------------------------------------------ */
  function initRadialButtons() {
    document.querySelectorAll('.btn-radial:not(.is-radial-ready)').forEach(function (btn) {
      var overlay = document.createElement('span');
      overlay.className = 'btn-radial-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.innerHTML = btn.innerHTML;
      btn.appendChild(overlay);
      btn.classList.add('is-radial-ready');

      var state = { r: 0, anchorX: 100, anchorY: 100, max: 160, tween: null };

      function applyClip() {
        var val = 'circle(' + state.r.toFixed(2) + 'px at ' +
          state.anchorX.toFixed(1) + '% ' + state.anchorY.toFixed(1) + '%)';
        overlay.style.clipPath = val;
        overlay.style.webkitClipPath = val;
      }

      function measure() {
        var rect = btn.getBoundingClientRect();
        state.max = Math.max(30, Math.hypot(rect.width, rect.height));
      }

      function anchorTo(e) {
        var rect = btn.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var px = e.clientX - rect.left;
        var py = e.clientY - rect.top;
        state.anchorX = (px / rect.width) * 100;
        state.anchorY = (py / rect.height) * 100;
      }

      function growTo(to) {
        if (state.tween) cancelAnimationFrame(state.tween);
        var from = state.r;
        var start = null;
        function ease(x) {
          return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        }
        function step(ts) {
          if (start === null) start = ts;
          var p = Math.min((ts - start) / 450, 1);
          state.r = from + (to - from) * ease(p);
          applyClip();
          if (p < 1) state.tween = requestAnimationFrame(step);
          else state.tween = null;
        }
        state.tween = requestAnimationFrame(step);
      }

      btn.addEventListener('pointerenter', function (e) {
        measure();
        anchorTo(e);
        applyClip();
        if (state.r < state.max - 0.5) growTo(state.max);
      });
      btn.addEventListener('pointerleave', function (e) {
        measure();
        anchorTo(e);
        growTo(0);
      });

      applyClip();
    });
  }

  /* ------------------------------------------------------------
     PIXEL DRIFT — particle text
     ------------------------------------------------------------ */
  function destroyPixelInstances() {
    for (var i = 0; i < pixelInstances.length; i++) pixelInstances[i].destroy();
    pixelInstances = [];
  }

  function initPixelDrift() {
    destroyPixelInstances();
    var containers = document.querySelectorAll('[data-pixel-drift]');
    for (var c = 0; c < containers.length; c++) {
      var handle = createPixelDrift(containers[c]);
      if (handle) pixelInstances.push(handle);
    }
  }

  function createPixelDrift(container) {
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    container.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      return;
    }

    var text = container.getAttribute('data-text') || 'HELLO';
    var colors = componentColors();
    var palette = [colors.ink, colors.accent, colors.ink];
    var mouseEnabled = true;
    var mcRadius = 150;
    var mcForce = 40;
    var particleSize = 14;
    var replay = true;

    var count = 0;
    var ox = new Float32Array(0), oy = new Float32Array(0);
    var sx = new Float32Array(0), sy = new Float32Array(0);
    var pxArr = new Float32Array(0), pyArr = new Float32Array(0);
    var repX = new Float32Array(0), repY = new Float32Array(0);
    var cIdx = new Uint8Array(0);

    var cssW = 0, cssH = 0, dpr = 1;
    var formVal = 0, reverse = false, hidden = true, entered = false;
    var lastFrame = null, raf = null, ro = null, io = null;
    var prevMx = -99999, prevMy = -99999, mouseSpeed = 0;
    var smoothX = -99999, smoothY = -99999;
    var pointer = { x: -99999, y: -99999, active: false };
    var sentinel = null;
    var buckets = palette.map(function () { return []; });

    function fitFontLines(measureCtx, lines, family, maxW, maxH, cap) {
      if (!lines.length) return cap;
      var lo = 8, hi = cap, best = lo;
      for (var iter = 0; iter < 14; iter++) {
        var mid = (lo + hi) / 2;
        var w = 0;
        for (var i = 0; i < lines.length; i++) {
          measureCtx.font = '700 ' + mid + 'px ' + family;
          w = Math.max(w, measureCtx.measureText(lines[i]).width);
        }
        var lh = mid * 1.25;
        if (w <= maxW && lh * lines.length <= maxH) { best = mid; lo = mid; }
        else { hi = mid; }
      }
      return Math.max(8, Math.floor(best));
    }

    function sampleText() {
      var W = cssW, H = cssH;
      if (W <= 0 || H <= 0) return;
      var lines = String(text).split('\n');
      var off = document.createElement('canvas');
      off.width = Math.max(1, Math.floor(W * dpr));
      off.height = Math.max(1, Math.floor(H * dpr));
      var offCtx = off.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return;
      offCtx.scale(dpr, dpr);
      var family = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
      var maxW = W * 0.94, maxH = H * 0.94;
      var eff = fitFontLines(offCtx, lines, family, maxW, maxH, 140);
      var lh = eff * 1.25;
      var startY = H * 0.5 - lh * lines.length * 0.5 + lh * 0.5;
      offCtx.clearRect(0, 0, W, H);
      offCtx.fillStyle = '#fff';
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      for (var li = 0; li < lines.length; li++) {
        offCtx.font = '700 ' + eff + 'px ' + family;
        offCtx.fillText(lines[li], W / 2, startY + li * lh);
      }

      var img = offCtx.getImageData(0, 0, Math.floor(W * dpr), Math.floor(H * dpr));
      var data = img.data;
      var stride = 3;
      var candidates = 0;
      for (var y = 0; y < H; y += stride) {
        for (var x = 0; x < W; x += stride) {
          var ix = Math.floor(x * dpr), iy = Math.floor(y * dpr);
          if (data[(iy * img.width + ix) * 4 + 3] > 128) candidates++;
        }
      }
      var alloc = Math.min(candidates, 20000);
      var newOx = new Float32Array(alloc), newOy = new Float32Array(alloc);
      var newSx = new Float32Array(alloc), newSy = new Float32Array(alloc);
      var newPx = new Float32Array(alloc), newPy = new Float32Array(alloc);
      var newC = new Uint8Array(alloc);
      var i = 0;
      for (var y = 0; y < H && i < alloc; y += stride) {
        for (var x = 0; x < W && i < alloc; x += stride) {
          var ix = Math.floor(x * dpr), iy = Math.floor(y * dpr);
          if (data[(iy * img.width + ix) * 4 + 3] > 128) {
            newOx[i] = x; newOy[i] = y;
            var ang = Math.random() * Math.PI * 2;
            var rad = Math.max(W, H) * (0.6 + Math.random() * 0.5);
            newSx[i] = W / 2 + Math.cos(ang) * rad;
            newSy[i] = H / 2 + Math.sin(ang) * rad;
            newPx[i] = newSx[i]; newPy[i] = newSy[i];
            newC[i] = Math.floor(Math.random() * palette.length);
            i++;
          }
        }
      }
      count = i;
      ox = newOx; oy = newOy; sx = newSx; sy = newSy;
      pxArr = newPx; pyArr = newPy;
      repX = new Float32Array(alloc); repY = new Float32Array(alloc); cIdx = newC;
      formVal = 0; lastFrame = null;
    }

    function resize() {
      var rect = container.getBoundingClientRect();
      var w = Math.floor(rect.width), h = Math.floor(rect.height);
      if (w <= 0 || h <= 0) return;
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      cssW = w; cssH = h;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sampleText();
    }

    function drawFrame() {
      ctx.clearRect(0, 0, cssW, cssH);
      var now = performance.now();
      var last = lastFrame || now;
      var dt = Math.min(64, Math.max(0, now - last));
      lastFrame = now;

      var target = reverse ? 0 : 1;
      var formMs = 1400;
      var v = formVal;
      if (v < target) v = Math.min(target, v + dt / formMs);
      else if (v > target) v = Math.max(target, v - dt / formMs);
      formVal = v;
      if (reverse && v <= 0) { hidden = true; return; }
      if (hidden) return;

      function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
      var factor = ease(v);
      var forming = v < 1;

      mouseSpeed *= 0.88;
      var active = !forming && mouseEnabled && pointer.active;
      if (active) {
        var lerpFactor = Math.max(0.08, 0.3 - mouseSpeed * 0.006);
        if (smoothX < -9000) { smoothX = pointer.x; smoothY = pointer.y; }
        else {
          smoothX += (pointer.x - smoothX) * lerpFactor;
          smoothY += (pointer.y - smoothY) * lerpFactor;
        }
      } else {
        smoothX = -99999; smoothY = -99999;
      }
      var mx = smoothX, my = smoothY;
      var repCutoff = Math.max(1, mcRadius);
      var repCutoffSq = repCutoff * repCutoff;
      var rF = mcForce;
      var drawSize = Math.max(1, particleSize / 4);
      var half = drawSize / 2;

      for (var b = 0; b < buckets.length; b++) buckets[b].length = 0;

      for (var i = 0; i < count; i++) {
        if (forming) {
          pxArr[i] = sx[i] + (ox[i] - sx[i]) * factor;
          pyArr[i] = sy[i] + (oy[i] - sy[i]) * factor;
          buckets[cIdx[i]].push(i);
          continue;
        }
        var inZone = false;
        if (active) {
          var dx = ox[i] - mx, dy = oy[i] - my;
          var distSq = dx * dx + dy * dy;
          if (distSq > 0 && distSq < repCutoffSq) {
            var dist = Math.sqrt(distSq);
            var nx = dx / dist, ny = dy / dist;
            var falloff = 1 - dist / repCutoff;
            var push = falloff * mouseSpeed * rF * 0.05;
            repX[i] += nx * push; repY[i] += ny * push;
            var tRx = nx * (repCutoff - dist), tRy = ny * (repCutoff - dist);
            repX[i] += (tRx - repX[i]) * 0.06;
            repY[i] += (tRy - repY[i]) * 0.06;
            inZone = true;
          }
        }
        if (!inZone) { repX[i] *= 0.97; repY[i] *= 0.97; }
        pxArr[i] = ox[i] + repX[i];
        pyArr[i] = oy[i] + repY[i];
        buckets[cIdx[i]].push(i);
      }

      ctx.globalAlpha = forming ? Math.min(1, Math.max(0, factor)) : 1;
      for (var b = 0; b < buckets.length; b++) {
        var bucket = buckets[b];
        if (!bucket.length) continue;
        ctx.fillStyle = palette[b];
        for (var k = 0; k < bucket.length; k++) {
          var id = bucket[k];
          ctx.fillRect(pxArr[id] - half, pyArr[id] - half, drawSize, drawSize);
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop() {
      drawFrame();
      raf = requestAnimationFrame(loop);
    }

    function onMove(e) {
      if (!mouseEnabled) return;
      var rect = canvas.getBoundingClientRect();
      var scaleX = rect.width > 0 ? cssW / rect.width : 1;
      var scaleY = rect.height > 0 ? cssH / rect.height : 1;
      var mx = (e.clientX - rect.left) * scaleX;
      var my = (e.clientY - rect.top) * scaleY;
      if (prevMx > -9000) {
        var ddx = mx - prevMx, ddy = my - prevMy;
        mouseSpeed = Math.sqrt(ddx * ddx + ddy * ddy);
      }
      prevMx = mx; prevMy = my;
      pointer.x = mx; pointer.y = my; pointer.active = true;
    }

    function onLeave() {
      pointer.x = -99999; pointer.y = -99999; pointer.active = false;
      prevMx = -99999; prevMy = -99999;
    }

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointercancel', onLeave);

    function enterNow() {
      if (entered) return;
      entered = true;
      reverse = false;
      hidden = false;
    }

    function tryEnter() {
      if (entered) return;
      var r = container.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      var onScreen = r.bottom >= 0 && r.top <= (window.innerHeight || 0);
      if (onScreen) enterNow();
    }

    sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;pointer-events:none;';
    container.appendChild(sentinel);

    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) enterNow();
        else if (replay) {
          entered = false;
          hidden = true;
          reverse = false;
          formVal = 0;
        }
      });
    }, { threshold: 0 });
    io.observe(sentinel);
    tryEnter();
    setTimeout(tryEnter, 60);
    setTimeout(tryEnter, 250);
    setTimeout(tryEnter, 600);

    ro = new ResizeObserver(resize);
    ro.observe(container);

    function destroy() {
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      if (sentinel && sentinel.parentNode) sentinel.parentNode.removeChild(sentinel);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onLeave);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }

    resize();
    raf = requestAnimationFrame(loop);

    return { destroy: destroy };
  }

  /* ------------------------------------------------------------
     FIBRE ARC — WebGL strand shader
     ------------------------------------------------------------ */
  function initFibreArc() {
    if (currentFibre) { currentFibre.destroy(); currentFibre = null; }
    var canvas = document.getElementById('fibreArcCanvas');
    if (!canvas) return;
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false });
    if (!gl) return;

    var VERT_SRC = 'attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }';
    var FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uHover;

const float PI  = 3.14159265;
const float TAU = 6.28318531;

float sat(float x){ return clamp(x, 0.0, 1.0); }
float pw(float x, float e){ return pow(max(x, 1e-5), e); }
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 34.56); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm3(vec2 p){ float s = 0.0, a = 0.5; for(int i = 0; i < 3; i++){ s += a * vnoise(p); p = p * 2.07 + vec2(4.1, 2.3); a *= 0.5; } return s; }

uniform vec3 uBg, uBase, uAccent, uHigh;
uniform float uStrands, uCurve, uSpread, uThin, uComb, uReach, uDir;

void main(){
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0);
  float t = uTime;
  vec2 apex = vec2(0.34, 0.20);

  float cs = cos(uDir), sn = sin(uDir);
  mat2 rot = mat2(cs, sn, -sn, cs);
  vec2 q  = rot * p;
  vec2 pm = q - rot * ((uMouse - 0.5) * vec2(ar, 1.0));
  vec2 ps = q - normalize(pm + vec2(1e-5)) * uComb * 0.10 * sat(uHover)
            * exp(-dot(pm, pm) / max(uReach * uReach, 1e-4));
  float core = 0.0, halo = 0.0;
  for(int i = 0; i < 26; i++){
    float fi = float(i);
    float f = fi / 25.0;
    float on = sat(uStrands - fi);
    float jit = hash21(vec2(fi, 1.7));
    float k = uCurve * (0.55 + 1.30 * f + 0.10 * jit);
    float ax = apex.x + (f - 0.5) * uSpread * 0.18;
    float ay = apex.y + (f - 0.5) * uSpread * 0.14 + 0.012 * sin(t * 0.5 + fi);
    float dx = ps.x - ax;
    float yc = ay - k * dx * dx;
    float sl = -2.0 * k * dx;
    float dd = abs(ps.y - yc) / sqrt(1.0 + sl * sl);
    float w = uThin * (0.0016 + 0.0032 * jit);
    core += on * pw(w / (w + dd), 3.2);
    halo += on * pw(w * 11.0 / (w * 11.0 + dd), 1.9) * 0.085;
  }
  float env = mix(0.20, 1.0, sat((ps.x + 0.52) / 0.95));
  core *= env; halo *= env;
  vec3 col = uBg;
  col += uBase * halo * 1.5;
  col += mix(uAccent, uHigh, sat(core * 0.75)) * core * 1.4;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

    function compile(type, src) {
      var sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    function parseColor(input, fb) {
      var str = String(input || '').trim();
      if (str.charAt(0) === '#') {
        var hex = str.slice(1);
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        if (hex.length >= 6) {
          var r = parseInt(hex.slice(0, 2), 16);
          var g = parseInt(hex.slice(2, 4), 16);
          var b = parseInt(hex.slice(4, 6), 16);
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255];
        }
        return fb;
      }
      var m = str.match(/[\d.]+/g);
      if (m && m.length >= 3) {
        return [
          Math.min(255, parseFloat(m[0])) / 255,
          Math.min(255, parseFloat(m[1])) / 255,
          Math.min(255, parseFloat(m[2])) / 255
        ];
      }
      return fb;
    }

    var vs = compile(gl.VERTEX_SHADER, VERT_SRC);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    var locs = {};
    function u(name) {
      if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name);
      return locs[name];
    }

    var bg = parseColor('#010309', [0.004, 0.012, 0.04]);
    var _colors = componentColors();
    var base = parseColor(_colors.accent, [0.435, 0.784, 1.0]);
    var acc = parseColor(_colors.accentInk, [1.0, 1.0, 1.0]);
    var high = parseColor(_colors.paper, [1.0, 1.0, 1.0]);

    function retheme() {
      var c = componentColors();
      base = parseColor(c.accent, [0.435, 0.784, 1.0]);
      acc = parseColor(c.accentInk, [1.0, 1.0, 1.0]);
      high = parseColor(c.paper, [1.0, 1.0, 1.0]);
    }

    var speed = 70 / 50;
    var ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 };
    var raf = 0, last = performance.now(), clock = 0;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    function render(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock = (clock + dt * speed) % 3600;

      var k = 1 - Math.exp(-6 * dt);
      ptr.on += (ptr.onTarget - ptr.on) * k;
      ptr.x += ((ptr.onTarget > 0 ? ptr.tx : 0.5) - ptr.x) * k;
      ptr.y += ((ptr.onTarget > 0 ? ptr.ty : 0.5) - ptr.y) * k;

      var cw = canvas.clientWidth || 1;
      var ch = canvas.clientHeight || 1;
      var bw = Math.max(1, Math.round(cw * DPR));
      var bh = Math.max(1, Math.round(ch * DPR));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      gl.viewport(0, 0, bw, bh);

      gl.uniform2f(u('uRes'), bw, bh);
      gl.uniform1f(u('uTime'), clock);
      gl.uniform2f(u('uMouse'), ptr.x, 1 - ptr.y);
      gl.uniform1f(u('uHover'), Math.min(1, ptr.on) * 2);
      gl.uniform3f(u('uBg'), bg[0], bg[1], bg[2]);
      gl.uniform3f(u('uBase'), base[0], base[1], base[2]);
      gl.uniform3f(u('uAccent'), acc[0], acc[1], acc[2]);
      gl.uniform3f(u('uHigh'), high[0], high[1], high[2]);
      gl.uniform1f(u('uStrands'), 26);
      gl.uniform1f(u('uReach'), 0.30);
      gl.uniform1f(u('uDir'), 0);
      gl.uniform1f(u('uCurve'), 0.20);
      gl.uniform1f(u('uSpread'), 1.0);
      gl.uniform1f(u('uThin'), 1.0);
      gl.uniform1f(u('uComb'), 1.70);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    }

    function track(e) {
      var r = canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      ptr.tx = clamp01((e.clientX - r.left) / r.width);
      ptr.ty = clamp01((e.clientY - r.top) / r.height);
      ptr.onTarget = 1;
    }

    function onLeave() { ptr.onTarget = 0; }

    canvas.addEventListener('pointermove', track);
    canvas.addEventListener('pointerenter', track);
    canvas.addEventListener('pointerleave', onLeave);

    function destroy() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointermove', track);
      canvas.removeEventListener('pointerenter', track);
      canvas.removeEventListener('pointerleave', onLeave);
    }

    currentFibre = { destroy: destroy, retheme: retheme };
    raf = requestAnimationFrame(render);
  }

  // --- Init + theme re-coloring ---
  initRadialButtons();
  initPixelDrift();
  initFibreArc();

  document.addEventListener('theme:change', function () {
    initPixelDrift();
    if (currentFibre && currentFibre.retheme) currentFibre.retheme();
  });
});