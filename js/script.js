document.addEventListener('DOMContentLoaded', function () {
  // --- Theme Toggle ---
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeToggle.addEventListener('click', function () {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
    // Redraw canvases with new theme colors
    if (sortingState.initialized) sortingState.resize();
    mlDrawActive();
  });

  function updateThemeIcon(theme) {
    themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }

  // --- Hamburger Menu ---
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');

  hamburger.addEventListener('click', function () {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
  });

  document.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      navMenu.classList.remove('active');
      hamburger.classList.remove('active');
    });
  });

  // --- Active Nav on Scroll ---
  var sections = document.querySelectorAll('section');
  var navItems = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', function () {
    var current = '';
    sections.forEach(function (section) {
      if (window.scrollY >= section.offsetTop - 200) {
        current = section.getAttribute('id');
      }
    });
    navItems.forEach(function (item) {
      item.classList.remove('active');
      if (item.getAttribute('href') === '#' + current) {
        item.classList.add('active');
      }
    });
  });

  // --- Smooth Scroll (custom eased speed) ---
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function smoothScrollTo(targetY, duration) {
    var startY = window.scrollY;
    var diff = targetY - startY;
    var startTime = null;
    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      window.scrollTo(0, startY + diff * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        smoothScrollTo(target.offsetTop - 60, 650);
      }
    });
  });

  // --- Parallax ---
  var parallaxOn = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  var parallaxTick = false;

  function updateParallax() {
    parallaxTick = false;
    var viewCenter = window.innerHeight / 2;
    document.querySelectorAll('[data-parallax]').forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0;
      var rect = el.getBoundingClientRect();
      var delta = (rect.top + rect.height / 2) - viewCenter;
      var translate = Math.max(-100, Math.min(100, delta * speed));
      el.style.transform = 'translate3d(0,' + translate + 'px,0)';
    });
  }

  if (parallaxOn) {
    window.addEventListener('scroll', function () {
      if (!parallaxTick) {
        parallaxTick = true;
        requestAnimationFrame(updateParallax);
      }
    });
    updateParallax();
  }

  // --- Typing Effect ---
  var typingText = document.getElementById('typing-text');
  var phrases = [
    'Building Intelligent Systems',
    'Learning Through Trial and Error',
    'Code | Break | Fix | Repeat'
  ];
  var phraseIndex = 0;
  var charIndex = 0;
  var isDeleting = false;

  function typeEffect() {
    var currentPhrase = phrases[phraseIndex];
    if (isDeleting) {
      typingText.textContent = currentPhrase.substring(0, charIndex - 1);
      charIndex--;
    } else {
      typingText.textContent = currentPhrase.substring(0, charIndex + 1);
      charIndex++;
    }
    var speed = isDeleting ? 50 : 100;
    if (!isDeleting && charIndex === currentPhrase.length) {
      speed = 2000;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      speed = 500;
    }
    setTimeout(typeEffect, speed);
  }
  typeEffect();

  // --- Scroll Reveal ---
  var revealElements = document.querySelectorAll('.project-card, .skill-group, .algorithm-container');
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });

  revealElements.forEach(function (el, i) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.5s ease ' + (i % 4) * 0.08 + 's, transform 0.5s ease ' + (i % 4) * 0.08 + 's';
    observer.observe(el);
  });

  // --- Sorting Visualization ---
  var sortingState = {
    initialized: false,
    array: [],
    size: 50,
    canvas: null,
    ctx: null,
    resize: function () {}
  };

  function initSortingVisualization() {
    var canvas = document.getElementById('sortingCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    sortingState.canvas = canvas;
    sortingState.ctx = ctx;
    sortingState.initialized = true;

    function getColors() {
      var s = getComputedStyle(document.documentElement);
      return {
        bg: s.getPropertyValue('--insert').trim(),
        bar: s.getPropertyValue('--ink').trim(),
        highlight: s.getPropertyValue('--accent').trim()
      };
    }

    function resizeCanvas() {
      canvas.width = canvas.parentElement.clientWidth - 48;
      canvas.height = 250;
      generateArray();
    }

    function generateArray() {
      sortingState.array = [];
      for (var i = 0; i < sortingState.size; i++) {
        sortingState.array.push(Math.random());
      }
      drawArray();
    }

    function drawArray(highlightIndices) {
      highlightIndices = highlightIndices || [];
      var colors = getColors();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var barWidth = canvas.width / sortingState.size;
      for (var i = 0; i < sortingState.array.length; i++) {
        var h = sortingState.array[i] * (canvas.height - 20) + 10;
        ctx.fillStyle = highlightIndices.indexOf(i) !== -1 ? colors.highlight : colors.bar;
        ctx.fillRect(i * barWidth, canvas.height - h, barWidth - 2, h);
      }
    }

    async function bubbleSort() {
      for (var i = 0; i < sortingState.array.length; i++) {
        for (var j = 0; j < sortingState.array.length - i - 1; j++) {
          if (sortingState.array[j] > sortingState.array[j + 1]) {
            var tmp = sortingState.array[j];
            sortingState.array[j] = sortingState.array[j + 1];
            sortingState.array[j + 1] = tmp;
            drawArray([j, j + 1]);
            await new Promise(function (r) { setTimeout(r, 15); });
          }
        }
      }
      drawArray([]);
    }

    async function quickSort(start, end) {
      start = start || 0;
      end = end === undefined ? sortingState.array.length - 1 : end;
      if (start >= end) return;
      var pi = await partition(start, end);
      await quickSort(start, pi - 1);
      await quickSort(pi + 1, end);
    }

    async function partition(start, end) {
      var pivot = sortingState.array[end];
      var i = start - 1;
      for (var j = start; j < end; j++) {
        if (sortingState.array[j] < pivot) {
          i++;
          var tmp = sortingState.array[i];
          sortingState.array[i] = sortingState.array[j];
          sortingState.array[j] = tmp;
          drawArray([i, j, end]);
          await new Promise(function (r) { setTimeout(r, 15); });
        }
      }
      var tmp2 = sortingState.array[i + 1];
      sortingState.array[i + 1] = sortingState.array[end];
      sortingState.array[end] = tmp2;
      drawArray([i + 1]);
      await new Promise(function (r) { setTimeout(r, 15); });
      return i + 1;
    }

    async function mergeSort(start, end) {
      start = start || 0;
      end = end === undefined ? sortingState.array.length - 1 : end;
      if (start >= end) return;
      var mid = Math.floor((start + end) / 2);
      await mergeSort(start, mid);
      await mergeSort(mid + 1, end);
      await merge(start, mid, end);
    }

    async function merge(start, mid, end) {
      var left = sortingState.array.slice(start, mid + 1);
      var right = sortingState.array.slice(mid + 1, end + 1);
      var i = 0, j = 0, k = start;
      while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) {
          sortingState.array[k] = left[i]; i++;
        } else {
          sortingState.array[k] = right[j]; j++;
        }
        drawArray([k]);
        await new Promise(function (r) { setTimeout(r, 12); });
        k++;
      }
      while (i < left.length) {
        sortingState.array[k] = left[i]; drawArray([k]);
        await new Promise(function (r) { setTimeout(r, 12); });
        i++; k++;
      }
      while (j < right.length) {
        sortingState.array[k] = right[j]; drawArray([k]);
        await new Promise(function (r) { setTimeout(r, 12); });
        j++; k++;
      }
    }

    document.querySelectorAll('.sort-btn[data-algorithm]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var algo = this.getAttribute('data-algorithm');
        if (algo === 'bubble') await bubbleSort();
        else if (algo === 'quick') await quickSort();
        else if (algo === 'merge') await mergeSort();
      });
    });

    document.getElementById('resetSort').addEventListener('click', generateArray);
    sortingState.resize = resizeCanvas;
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  // --- ML Algorithms Visualization (K-Means / kNN / Linear Regression / Decision Tree) ---
  var ml = {
    canvas: null, ctx: null, model: 'kmeans', frame: 0, iter: 0, k: 3,
    points: [], centroids: [], assignments: [],
    query: null, kNeighbors: 7, pred: 0, closest: [],
    reg: null, target: null, converged: false,
    tree: null, treeTotal: 0, treeDepth: 0, reveal: 0
  };

  function getMlColors() {
    var s = getComputedStyle(document.documentElement);
    return {
      ink: s.getPropertyValue('--ink').trim(),
      muted: s.getPropertyValue('--ink-muted').trim(),
      accent: s.getPropertyValue('--accent').trim(),
      accentInk: s.getPropertyValue('--accent-ink').trim(),
      rule: s.getPropertyValue('--rule').trim()
    };
  }

  function mlClamp(v) { return Math.min(0.96, Math.max(0.04, v)); }

  function mlGauss() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function mlDist2(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function mlToPx(nx, ny) {
    return {
      x: 26 + nx * (ml.canvas.width - 52),
      y: 18 + ny * (ml.canvas.height - 36)
    };
  }

  function mlInitKMeans() {
    var centers = [[0.28, 0.3], [0.72, 0.7], [0.4, 0.78]];
    ml.points = [];
    for (var c = 0; c < centers.length; c++) {
      for (var i = 0; i < 14; i++) {
        ml.points.push({
          x: mlClamp(centers[c][0] + mlGauss() * 0.05),
          y: mlClamp(centers[c][1] + mlGauss() * 0.05),
          cls: c
        });
      }
    }
    ml.centroids = [];
    var first = ml.points[Math.floor(Math.random() * ml.points.length)];
    ml.centroids.push({ x: first.x, y: first.y });
    while (ml.centroids.length < ml.k) {
      var best = null, bd = -1;
      for (var i = 0; i < ml.points.length; i++) {
        var dmin = Infinity;
        for (var j = 0; j < ml.centroids.length; j++) {
          var d = mlDist2(ml.points[i], ml.centroids[j]);
          if (d < dmin) dmin = d;
        }
        if (dmin > bd) { bd = dmin; best = ml.points[i]; }
      }
      ml.centroids.push({ x: best.x, y: best.y });
    }
    ml.assignments = new Array(ml.points.length).fill(-1);
    ml.iter = 0;
    ml.converged = false;
  }

  function mlKMeansStep() {
    var changed = false;
    for (var i = 0; i < ml.points.length; i++) {
      var best = 0, bd = Infinity;
      for (var j = 0; j < ml.centroids.length; j++) {
        var d = mlDist2(ml.points[i], ml.centroids[j]);
        if (d < bd) { bd = d; best = j; }
      }
      if (ml.assignments[i] !== best) { changed = true; ml.assignments[i] = best; }
    }
    var sums = [], cnt = [];
    for (var j = 0; j < ml.centroids.length; j++) { sums[j] = { x: 0, y: 0 }; cnt[j] = 0; }
    for (var i = 0; i < ml.points.length; i++) {
      var a = ml.assignments[i];
      if (a < 0) continue;
      sums[a].x += ml.points[i].x; sums[a].y += ml.points[i].y; cnt[a]++;
    }
    for (var j = 0; j < ml.centroids.length; j++) {
      if (cnt[j] > 0) { ml.centroids[j].x = sums[j].x / cnt[j]; ml.centroids[j].y = sums[j].y / cnt[j]; }
    }
    ml.iter++;
    if (!changed) ml.converged = true;
  }

  function mlSse() {
    var s = 0;
    for (var i = 0; i < ml.points.length; i++) {
      if (ml.assignments[i] < 0) continue;
      s += mlDist2(ml.points[i], ml.centroids[ml.assignments[i]]);
    }
    return s;
  }

  function mlDrawKMeans() {
    var colors = getMlColors(), ctx = ml.ctx;
    var pal = [colors.accent, colors.ink, colors.accentInk];
    ctx.clearRect(0, 0, ml.canvas.width, ml.canvas.height);
    for (var i = 0; i < ml.points.length; i++) {
      var a = ml.assignments[i], p = mlToPx(ml.points[i].x, ml.points[i].y);
      if (a >= 0) {
        var cp = mlToPx(ml.centroids[a].x, ml.centroids[a].y);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(cp.x, cp.y);
        ctx.strokeStyle = pal[a];
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = a >= 0 ? pal[a] : colors.muted;
      ctx.fill();
    }
    for (var j = 0; j < ml.centroids.length; j++) {
      var c = mlToPx(ml.centroids[j].x, ml.centroids[j].y);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
      ctx.strokeStyle = pal[j];
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c.x - 10, c.y); ctx.lineTo(c.x + 10, c.y);
      ctx.moveTo(c.x, c.y - 10); ctx.lineTo(c.x, c.y + 10);
      ctx.stroke();
    }
  }

  function mlInitKnn() {
    ml.points = [];
    var c1 = [0.3, 0.32], c2 = [0.72, 0.68];
    for (var i = 0; i < 16; i++) {
      ml.points.push({ x: mlClamp(c1[0] + mlGauss() * 0.07), y: mlClamp(c1[1] + mlGauss() * 0.07), cls: 0 });
    }
    for (var j = 0; j < 16; j++) {
      ml.points.push({ x: mlClamp(c2[0] + mlGauss() * 0.07), y: mlClamp(c2[1] + mlGauss() * 0.07), cls: 1 });
    }
    ml.query = { x: 0.5, y: 0.5 };
    ml.closest = [];
    ml.pred = 0;
    ml.iter = 0;
  }

  function mlUpdateKnnQuery() {
    ml.query.x = 0.52 + 0.17 * Math.sin(ml.frame * 0.004 + 1.1);
    ml.query.y = 0.5 + 0.2 * Math.cos(ml.frame * 0.0055);
    var ranked = ml.points.map(function (p, i) { return { p: p, d: mlDist2(p, ml.query), i: i }; })
      .sort(function (a, b) { return a.d - b.d; });
    ml.closest = ranked.slice(0, ml.kNeighbors);
    var v0 = 0, v1 = 0;
    for (var i = 0; i < ml.closest.length; i++) {
      if (ml.closest[i].p.cls === 0) v0++; else v1++;
    }
    ml.pred = v0 >= v1 ? 0 : 1;
  }

  function mlDrawKnn() {
    var colors = getMlColors(), ctx = ml.ctx;
    ctx.clearRect(0, 0, ml.canvas.width, ml.canvas.height);
    var closeIdx = {};
    for (var j = 0; j < ml.closest.length; j++) closeIdx[ml.closest[j].i] = true;
    for (var i = 0; i < ml.points.length; i++) {
      var pt = ml.points[i], p = mlToPx(pt.x, pt.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = pt.cls === 0 ? colors.ink : colors.accent;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7.5, 0, Math.PI * 2);
      ctx.strokeStyle = closeIdx[i] ? colors.accentInk : colors.rule;
      ctx.globalAlpha = closeIdx[i] ? 0.9 : 0.15;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    var q = mlToPx(ml.query.x, ml.query.y);
    for (var j = 0; j < ml.closest.length; j++) {
      var kp = mlToPx(ml.closest[j].p.x, ml.closest[j].p.y);
      ctx.beginPath();
      ctx.moveTo(q.x, q.y);
      ctx.lineTo(kp.x, kp.y);
      ctx.strokeStyle = ml.pred === 0 ? colors.ink : colors.accent;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.rect(q.x - 6, q.y - 6, 12, 12);
    ctx.strokeStyle = colors.rule;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function mlInitReg() {
    var m = -0.55, b = 0.62;
    ml.target = { m: m, b: b };
    ml.points = [];
    for (var i = 0; i < 34; i++) {
      var x = 0.12 + Math.random() * 0.76;
      ml.points.push({ x: x, y: mlClamp(m * x + b + mlGauss() * 0.09) });
    }
    ml.reg = { m: 0, b: 0.5 };
    ml.iter = 0;
    ml.converged = false;
  }

  function mlRegStep() {
    var n = ml.points.length, m = ml.reg.m, b = ml.reg.b, gm = 0, gb = 0;
    for (var i = 0; i < n; i++) {
      var e = m * ml.points[i].x + b - ml.points[i].y;
      gm += e * ml.points[i].x;
      gb += e;
    }
    ml.reg.m -= 0.15 * gm / n;
    ml.reg.b -= 0.15 * gb / n;
    ml.iter++;
    if (Math.abs(gm / n) < 0.0004 && Math.abs(gb / n) < 0.0004) ml.converged = true;
  }

  function mlRegLoss() {
    var s = 0, n = ml.points.length, m = ml.reg.m, b = ml.reg.b;
    for (var i = 0; i < n; i++) {
      var e = m * ml.points[i].x + b - ml.points[i].y;
      s += e * e;
    }
    return s / n;
  }

  function mlDrawReg() {
    var colors = getMlColors(), ctx = ml.ctx;
    ctx.clearRect(0, 0, ml.canvas.width, ml.canvas.height);
    function drawLine(m, b, style, dash, alpha) {
      var p1 = mlToPx(0.04, mlClamp(m * 0.04 + b));
      var p2 = mlToPx(0.96, mlClamp(m * 0.96 + b));
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = style;
      ctx.globalAlpha = alpha;
      ctx.setLineDash(dash);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    drawLine(ml.target.m, ml.target.b, colors.rule, [4, 4], 0.6);
    drawLine(ml.reg.m, ml.reg.b, colors.accent, [], 1);
    for (var i = 0; i < ml.points.length; i++) {
      var p = mlToPx(ml.points[i].x, ml.points[i].y);
      var ly = mlToPx(ml.points[i].x, mlClamp(ml.reg.m * ml.points[i].x + ml.reg.b));
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(ly.x, ly.y);
      ctx.strokeStyle = colors.accent;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = colors.ink;
      ctx.fill();
    }
  }

  function mlGini(labels) {
    var counts = {}, s = 0, n = labels.length;
    for (var i = 0; i < n; i++) counts[labels[i]] = (counts[labels[i]] || 0) + 1;
    for (var c in counts) { var p = counts[c] / n; s += p * (1 - p); }
    return s;
  }

  function mlMajority(labels) {
    var counts = {}, best = labels[0], bestN = 0;
    for (var i = 0; i < labels.length; i++) {
      var v = labels[i], n = (counts[v] || 0) + 1;
      counts[v] = n;
      if (n > bestN) { bestN = n; best = v; }
    }
    return best;
  }

  function mlTrainTree(points, xmin, ymin, xmax, ymax, depth) {
    var labels = points.map(function (p) { return p.cls; });
    var g = mlGini(labels);
    var bounds = { xmin: xmin, ymin: ymin, xmax: xmax, ymax: ymax };
    if (depth === 0 || g === 0 || points.length < 3) {
      return { bounds: bounds, cls: mlMajority(labels) };
    }
    var best = null;
    for (var axis = 0; axis < 2; axis++) {
      var sorted = points.slice().sort(function (a, b) { return axis === 0 ? a.x - b.x : a.y - b.y; });
      for (var i = 1; i < sorted.length; i++) {
        var t = axis === 0 ? (sorted[i - 1].x + sorted[i].x) / 2 : (sorted[i - 1].y + sorted[i].y) / 2;
        if (t <= (axis === 0 ? xmin : ymin) || t >= (axis === 0 ? xmax : ymax)) continue;
        var left = points.filter(function (p) { return axis === 0 ? p.x < t : p.y < t; });
        var right = points.filter(function (p) { return axis === 0 ? p.x >= t : p.y >= t; });
        if (!left.length || !right.length) continue;
        var w = (left.length / points.length) * mlGini(left.map(function (p) { return p.cls; }))
              + (right.length / points.length) * mlGini(right.map(function (p) { return p.cls; }));
        if (!best || w < best.w) {
          best = { axis: axis, t: t, w: w, left: left, right: right };
        }
      }
    }
    if (!best || best.w >= g) return { bounds: bounds, cls: mlMajority(labels) };
    var node = { axis: best.axis === 0 ? 'x' : 'y', t: best.t, bounds: bounds };
    if (best.axis === 0) {
      node.left = mlTrainTree(best.left, xmin, ymin, best.t, ymax, depth - 1);
      node.right = mlTrainTree(best.right, best.t, ymin, xmax, ymax, depth - 1);
    } else {
      node.left = mlTrainTree(best.left, xmin, ymin, xmax, best.t, depth - 1);
      node.right = mlTrainTree(best.right, xmin, best.t, xmax, ymax, depth - 1);
    }
    return node;
  }

  function mlInitTree() {
    ml.points = [];
    for (var i = 0; i < 12; i++) {
      ml.points.push({ x: mlClamp(0.25 + mlGauss() * 0.06), y: mlClamp(0.5 + mlGauss() * 0.2), cls: 0 });
    }
    for (var i = 0; i < 12; i++) {
      ml.points.push({ x: mlClamp(0.66 + mlGauss() * 0.055), y: mlClamp(0.7 + mlGauss() * 0.06), cls: 1 });
    }
    for (var i = 0; i < 12; i++) {
      ml.points.push({ x: mlClamp(0.66 + mlGauss() * 0.055), y: mlClamp(0.3 + mlGauss() * 0.06), cls: 2 });
    }
    ml.tree = mlTrainTree(ml.points, 0.04, 0.04, 0.96, 0.96, 3);
    ml.treeTotal = 0;
    ml.treeDepth = 0;
    var q = [ml.tree];
    while (q.length) {
      var n = q.shift();
      ml.treeTotal++;
      ml.treeDepth = Math.max(ml.treeDepth, n._d || 0);
      if (n.left) { n.left._d = (n._d || 0) + 1; q.push(n.left); }
      if (n.right) { n.right._d = (n._d || 0) + 1; q.push(n.right); }
    }
    ml.reveal = 0;
    ml.iter = 0;
    ml.converged = false;
  }

  function mlDrawTree() {
    var colors = getMlColors(), ctx = ml.ctx;
    var pal = [colors.accent, colors.ink, colors.accentInk];
    ctx.clearRect(0, 0, ml.canvas.width, ml.canvas.height);
    var order = [];
    (function collect(node) {
      order.push(node);
      if (node.left) { collect(node.left); collect(node.right); }
    })(ml.tree);
    var shown = Math.min(ml.reveal, order.length);
    for (var i = 0; i < shown; i++) {
      var n = order[i], r = n.bounds;
      if (!n.left) {
        var a = mlToPx(r.xmin, r.ymax), b = mlToPx(r.xmax, r.ymin);
        ctx.fillStyle = pal[n.cls];
        ctx.globalAlpha = 0.18;
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.globalAlpha = 1;
      } else {
        var p1, p2;
        if (n.axis === 'x') {
          p1 = mlToPx(n.t, r.ymin);
          p2 = mlToPx(n.t, r.ymax);
        } else {
          p1 = mlToPx(r.xmin, n.t);
          p2 = mlToPx(r.xmax, n.t);
        }
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = colors.rule;
        ctx.globalAlpha = 0.9;
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }
    for (var j = 0; j < ml.points.length; j++) {
      var pt = ml.points[j], p = mlToPx(pt.x, pt.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = pal[pt.cls];
      ctx.fill();
    }
  }

  function mlReset() {
    if (ml.model === 'kmeans') mlInitKMeans();
    else if (ml.model === 'knn') mlInitKnn();
    else if (ml.model === 'linear') mlInitReg();
    else mlInitTree();
    mlDrawActive();
  }

  function mlDrawActive() {
    if (!ml.ctx) return;
    if (ml.model === 'kmeans') mlDrawKMeans();
    else if (ml.model === 'knn') mlDrawKnn();
    else if (ml.model === 'linear') mlDrawReg();
    else mlDrawTree();
    mlUpdateReadouts();
  }

  function mlUpdateReadouts() {
    var r1 = document.getElementById('mlRead1');
    var r2 = document.getElementById('mlRead2');
    if (!r1 || !r2) return;
    if (ml.model === 'kmeans') {
      r1.textContent = ml.converged ? 'converged' : 'Iter ' + ml.iter;
      r2.textContent = 'k = ' + ml.k + ' \u00b7 SSE ' + mlSse().toFixed(2);
    } else if (ml.model === 'knn') {
      r1.textContent = 'k = ' + ml.kNeighbors;
      r2.textContent = 'Predicted: class ' + (ml.pred === 0 ? 'A' : 'B');
    } else if (ml.model === 'linear') {
      r1.textContent = ml.converged ? 'converged' : 'Iter ' + ml.iter;
      r2.textContent = 'Loss ' + mlRegLoss().toFixed(4);
    } else {
      r1.textContent = ml.reveal >= ml.treeTotal ? 'trained' : 'Nodes ' + ml.reveal + '/' + ml.treeTotal;
      r2.textContent = 'Depth ' + ml.treeDepth;
    }
  }

  function mlLoop() {
    ml.frame++;
    if (ml.model === 'kmeans' && !ml.converged && ml.frame % 26 === 0) mlKMeansStep();
    if (ml.model === 'knn') mlUpdateKnnQuery();
    if (ml.model === 'linear' && !ml.converged && ml.frame % 4 === 0) {
      for (var i = 0; i < 8; i++) mlRegStep();
    }
    if (ml.model === 'tree' && ml.reveal < ml.treeTotal && ml.frame % 30 === 0) {
      ml.reveal++;
      if (ml.reveal >= ml.treeTotal) ml.converged = true;
    }
    mlDrawActive();
    requestAnimationFrame(mlLoop);
  }

  function mlDrawStatic() {
    if (!ml.ctx) return;
    if (ml.model === 'kmeans') {
      for (var i = 0; i < 12; i++) mlKMeansStep();
    } else if (ml.model === 'knn') {
      mlUpdateKnnQuery();
    } else if (ml.model === 'linear') {
      for (var j = 0; j < 400; j++) mlRegStep();
    } else {
      ml.reveal = ml.treeTotal;
      ml.converged = true;
    }
    mlDrawActive();
  }

  function initML() {
    ml.canvas = document.getElementById('mlCanvas');
    if (!ml.canvas) return;
    ml.ctx = ml.canvas.getContext('2d');
    ml.canvas.width = ml.canvas.parentElement.clientWidth - 48;
    ml.canvas.height = 250;
    var kc = document.getElementById('mlKControls');
    function setKControlsVisible() {
      kc.style.display = ml.model === 'kmeans' ? 'flex' : 'none';
    }
    mlReset();
    setKControlsVisible();
    document.querySelectorAll('.ml-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var m = this.getAttribute('data-ml');
        if (!m) return;
        ml.model = m;
        document.querySelectorAll('.ml-btn').forEach(function (b) {
          b.classList.toggle('is-active', b.getAttribute('data-ml') === ml.model);
        });
        mlReset();
        setKControlsVisible();
      });
    });
    document.getElementById('resetML').addEventListener('click', mlReset);
    document.querySelectorAll('.ml-kbtn').forEach(function (kb) {
      kb.addEventListener('click', function () {
        var k = parseInt(this.getAttribute('data-k'), 10);
        if (!k || k === ml.k) return;
        ml.k = k;
        document.querySelectorAll('.ml-kbtn').forEach(function (b) {
          b.classList.toggle('is-active', b.getAttribute('data-k') === String(ml.k));
        });
        mlReset();
      });
    });
  }

  // --- Flight HUD Demo (flagship telemetry) ---
  var hud = { canvas: null, ctx: null, t: 0, frame: 0 };

  function getHudColors() {
    var s = getComputedStyle(document.documentElement);
    return {
      sky: s.getPropertyValue('--surface').trim(),
      ground: s.getPropertyValue('--paper').trim(),
      horizon: s.getPropertyValue('--accent').trim(),
      line: s.getPropertyValue('--ink-muted').trim(),
      ink: s.getPropertyValue('--ink').trim()
    };
  }

  function initFlightHud() {
    hud.canvas = document.getElementById('flightHud');
    if (!hud.canvas) return;
    hud.ctx = hud.canvas.getContext('2d');
    hud.canvas.width = hud.canvas.parentElement.clientWidth;
    hud.canvas.height = 260;
  }

  function updateHudReadouts() {
    var ias = 60 + Math.sin(hud.t * 0.013) * 1.8;
    var alt = 1000 + Math.sin(hud.t * 0.007) * 12;
    var hdg = (90 + hud.t * 0.055) % 360;
    var aoa = 4.2 + Math.sin(hud.t * 0.018) * 1.3;
    var iasEl = document.getElementById('hudIas');
    var altEl = document.getElementById('hudAlt');
    var hdgEl = document.getElementById('hudHdg');
    var aoaEl = document.getElementById('hudAoa');
    if (iasEl) iasEl.textContent = ias.toFixed(1) + ' m/s';
    if (altEl) altEl.textContent = Math.round(alt) + ' m';
    if (hdgEl) hdgEl.textContent = String(Math.round(hdg) % 360).padStart(3, '0') + '\u00b0';
    if (aoaEl) aoaEl.textContent = (aoa >= 0 ? '+' : '') + aoa.toFixed(1) + '\u00b0';
  }

  function drawFlightHud() {
    var canvas = hud.canvas, ctx = hud.ctx;
    if (!ctx) return;
    var w = canvas.width, h = canvas.height;
    var colors = getHudColors();
    var cx = w / 2, cy = h / 2;
    var t = hud.t;
    var bank = Math.sin(t * 0.012) * 0.12 + Math.sin(t * 0.031) * 0.03;
    var pitch = Math.sin(t * 0.021) * 0.07 + Math.sin(t * 0.008) * 0.05;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = colors.sky;
    ctx.fillRect(0, 0, w, h);

    var pitchPx = 150;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-bank);
    var horizonY = pitch * pitchPx;

    ctx.beginPath();
    ctx.rect(-w, horizonY, w * 2, h * 2);
    ctx.fillStyle = colors.ground;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-w, horizonY);
    ctx.lineTo(w, horizonY);
    ctx.strokeStyle = colors.horizon;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.fillStyle = colors.ink;
    ctx.font = '10px "JetBrains Mono", monospace';
    for (var a = -25; a <= 25; a += 5) {
      var y = horizonY - (a * Math.PI / 180) * pitchPx;
      var half = a % 10 === 0 ? 42 : 26;
      ctx.beginPath();
      ctx.moveTo(-half, y);
      ctx.lineTo(half, y);
      ctx.stroke();
      if (a !== 0) {
        var label = Math.abs(a) + '\u00b0';
        ctx.fillText(label, -half - 34, y + 4);
        ctx.fillText(label, half + 10, y + 4);
      }
    }
    ctx.restore();

    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 46, cy);
    ctx.lineTo(cx + 46, cy);
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx, cy + 14);
    ctx.lineTo(cx + 12, cy);
    ctx.stroke();

    ctx.fillStyle = colors.horizon;
    ctx.beginPath();
    ctx.moveTo(cx, 12);
    ctx.lineTo(cx - 6, 24);
    ctx.lineTo(cx + 6, 24);
    ctx.closePath();
    ctx.fill();
  }

  function hudLoop() {
    hud.t += 1;
    hud.frame++;
    if (hud.frame % 12 === 0) updateHudReadouts();
    drawFlightHud();
    requestAnimationFrame(hudLoop);
  }

  // --- RL Training Curve (D3QN) ---
  var rl = { canvas: null, ctx: null, points: [], done: false };

  function rlRewardAt(ep) {
    var base = 4825 * (1 - Math.exp(-ep / 55));
    var early = 900 * Math.exp(-ep / 14);
    var noise = ((Math.sin(ep * 12.9898 + 78.233) * 43758.5453) % 1) * 240;
    return Math.max(0, base + early + noise - 240);
  }

  function initRL() {
    rl.canvas = document.getElementById('rlCanvas');
    if (!rl.canvas) return;
    rl.ctx = rl.canvas.getContext('2d');
    rl.canvas.width = rl.canvas.parentElement.clientWidth - 48;
    rl.canvas.height = 250;
    rl.points = [];
    rl.done = false;
    updateRlReadouts();
    drawRl();
  }

  function updateRlReadouts() {
    var best = 0;
    for (var i = 0; i < rl.points.length; i++) {
      if (rl.points[i] > best) best = rl.points[i];
    }
    var epEl = document.getElementById('rlEpisode');
    var bestEl = document.getElementById('rlBestReward');
    if (epEl) epEl.textContent = rl.points.length;
    if (bestEl) bestEl.textContent = Math.round(best);
  }

  function drawRl() {
    var canvas = rl.canvas, ctx = rl.ctx;
    if (!ctx) return;
    var w = canvas.width, h = canvas.height;
    var colors = { line: cssVar('--ink-muted') };
    var accent = cssVar('--accent');
    var maxEp = 200, maxR = 5000;
    var padL = 46, padR = 16, padT = 16, padB = 26;
    var pw = w - padL - padR;
    var ph = h - padT - padB;

    function px(ep) { return padL + (ep / maxEp) * pw; }
    function py(r) { return padT + (1 - Math.min(r, maxR) / maxR) * ph; }

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = colors.line;

    for (var g = 0; g <= 5; g++) {
      var val = g * 1000;
      var gy = py(val);
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(padL + pw, gy);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(String(val), padL - 40, gy + 3);
    }
    for (var g = 0; g <= 4; g++) {
      var eps = g * 50;
      var gx = px(eps);
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.moveTo(gx, padT);
      ctx.lineTo(gx, padT + ph);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(String(eps), gx - 6, padT + ph + 16);
    }

    if (rl.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(px(0), py(rl.points[0]));
      for (var i = 1; i < rl.points.length; i++) {
        ctx.lineTo(px(i), py(rl.points[i]));
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (rl.points.length > 0) {
      var cur = rl.points[rl.points.length - 1];
      ctx.beginPath();
      ctx.arc(px(rl.points.length - 1), py(cur), 4, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }
  }

  function rlLoop() {
    if (rl.points.length < 200) {
      rl.points.push(rlRewardAt(rl.points.length));
    }
    drawRl();
    updateRlReadouts();
    requestAnimationFrame(rlLoop);
  }

  // --- Wind-Tunnel Aero Flow (mirrors RAPTORM86 wind_tunnel.tscn) ---
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function clampNum(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smoothstep(e0, e1, x) {
    var t = clampNum((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function nacaProfile(t, m, p) {
    function thick(x) {
      return 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x);
    }
    function camber(x) {
      if (x <= 0 || x >= 1) return 0;
      if (x < p) return (m / (p * p)) * (2 * p * x - x * x);
      return (m / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * x - x * x);
    }
    return { thick: thick, camber: camber };
  }
  var naca = nacaProfile(0.12, 0.02, 0.4);

  function wtClFromAoa(deg) {
    var cla = 5.5, a0 = -2.2;
    var linear = cla * (deg - a0) * Math.PI / 180;
    if (deg <= 12) return Math.max(0, linear);
    return Math.max(0, linear - 0.15 * (deg - 12) * (deg - 12));
  }

  var wt = { canvas: null, ctx: null, t: 0, frame: 0, particles: [] };

  function initWindTunnel() {
    wt.canvas = document.getElementById('windTunnel');
    if (!wt.canvas) return;
    wt.ctx = wt.canvas.getContext('2d');
    wt.canvas.width = wt.canvas.parentElement.clientWidth;
    wt.canvas.height = 240;
    wt.t = 0;
    wt.frame = 0;
    wt.particles = [];
    var n = 150;
    for (var i = 0; i < n; i++) {
      var k = (i / n) * 2.4 - 1.2;
      wt.particles.push({ px: Math.random() * wt.canvas.width, py: wt.canvas.height / 2 + k * wt.canvas.height * 0.30, k: k, prev: null });
    }
  }

  function wtStepAndDraw() {
    var canvas = wt.canvas, ctx = wt.ctx;
    if (!ctx) return;
    var w = canvas.width, h = canvas.height;
    var cx = w * 0.5, cy = h * 0.5;
    var line = cssVar('--ink-muted');
    var body = cssVar('--surface');
    var bg = cssVar('--paper');
    var ink = cssVar('--ink');
    var accent = cssVar('--accent');
    var aoa = 8 - 8 * Math.cos(wt.t * 0.0105);
    if (aoa < 0) aoa = 0;
    var A = aoa * Math.PI / 180;
    var chord = Math.min(w * 0.42, h * 0.9);
    var L = chord / 2;
    var stalled = aoa > 12;
    var sep = stalled ? clampNum((aoa - 12) / 6, 0, 1) : 0;
    var cl = wtClFromAoa(aoa);
    var cd = 0.03 + 0.045 * cl * cl;
    var vx = 2.0;
    var cosA = Math.cos(A), sinA = Math.sin(A);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    for (var i = 0; i < wt.particles.length; i++) {
      var p = wt.particles[i];
      var dx = p.px - cx, dy = p.py - cy;
      var lx = dx * cosA + dy * sinA;
      var ly = -dx * sinA + dy * cosA;
      var tn = lx / L;
      var xs = clampNum((tn + 1) / 2, 0, 1);
      var cam = naca.camber(xs) * chord;
      var thk = naca.thick(xs) * chord;
      var free = p.k * chord * 0.36;
      var stream = cam + free + (p.k >= 0 ? thk * 0.9 : -thk * 0.9);
      var bl = smoothstep(0.72, 1.18, Math.abs(tn));
      var target = stream * (1 - bl) + free * bl;
      if (stalled && p.k > 0.05 && tn > -0.25) {
        var s = (tn + 0.25) / 1.25;
        target += (Math.random() - 0.5) * chord * 0.55 * sep * s;
      }
      if (tn > 1.02) {
        target += (Math.random() - 0.5) * chord * (0.015 + 0.06 * sep);
      }
      var newLy = ly + (target - ly) * 0.14;
      var oldX = p.px, oldY = p.py;
      p.px = cx + lx * cosA - newLy * sinA;
      p.py = cy + lx * sinA + newLy * cosA;
      if (p.prev) {
        ctx.strokeStyle = line;
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(p.prev.x, p.prev.y);
        ctx.lineTo(p.px, p.py);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      p.prev = { x: oldX, y: oldY };
      p.px += vx;
      if (p.px > w + 50) {
        p.px = -20;
        p.k = Math.random() * 2.4 - 1.2;
        p.py = cy + p.k * chord * 0.36;
        p.prev = null;
      }
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(A);
    ctx.beginPath();
    for (var u = 0; u <= 24; u++) {
      var xf = u / 24;
      ctx.lineTo(-L + (2 * L) * xf, -(naca.camber(xf) + naca.thick(xf)) * chord);
    }
    for (var u = 24; u >= 0; u--) {
      var xf2 = u / 24;
      ctx.lineTo(-L + (2 * L) * xf2, -(naca.camber(xf2) - naca.thick(xf2)) * chord);
    }
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    if (cl > 0.02) {
      var len = 22 + cl * 42;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - len);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - len + 8);
      ctx.lineTo(cx, cy - len);
      ctx.lineTo(cx + 5, cy - len + 8);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('L', cx + 8, cy - len + 4);
    }
    ctx.fillStyle = ink;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('\u03b1 = ' + aoa.toFixed(1) + '\u00b0', 10, 16);

    wt.t++;
    wt.frame++;
    if (wt.frame % 10 === 0) {
      var aoaEl = document.getElementById('wtAoa');
      var clEl = document.getElementById('wtCl');
      var cdEl = document.getElementById('wtCd');
      var flowEl = document.getElementById('wtFlow');
      if (aoaEl) aoaEl.textContent = aoa.toFixed(1) + '\u00b0';
      if (clEl) clEl.textContent = cl.toFixed(2);
      if (cdEl) cdEl.textContent = cd.toFixed(2);
      if (flowEl) flowEl.textContent = stalled ? (aoa > 14 ? 'STALLED' : 'SEPARATING') : 'ATTACHED';
    }
  }

  // --- Numerical Integration — Euler vs RK4 (flight_core integrator) ---
  var ITG_DT = 0.25, ITG_END = 16, ITG_W = 2, ITG_TH0 = 0.9;
  var itg = { canvas: null, ctx: null, t: 0, done: false, wait: 0, data: [], euler: null, rk: null };

  function itgReset() {
    itg.t = 0; itg.done = false; itg.wait = 0; itg.data = [];
    itg.euler = { th: ITG_TH0, om: 0 };
    itg.rk = { th: ITG_TH0, om: 0 };
  }

  function initIntegrator() {
    itg.canvas = document.getElementById('integratorCanvas');
    if (!itg.canvas) return;
    itg.ctx = itg.canvas.getContext('2d');
    itg.canvas.width = itg.canvas.parentElement.clientWidth - 48;
    itg.canvas.height = 250;
    itgReset();
    itgDraw();
  }

  function itgStep() {
    if (itg.done) {
      itg.wait++;
      if (itg.wait > 110) itgReset();
      return;
    }
    var exact = ITG_TH0 * Math.cos(itg.t * ITG_W);
    var e = itg.euler;
    var eTh = e.om, eOm = -4 * Math.sin(e.th);
    e.th += ITG_DT * eTh;
    e.om += ITG_DT * eOm;
    var r = itg.rk;
    var k1o = -4 * Math.sin(r.th), k1t = r.om;
    var k2o = -4 * Math.sin(r.th + ITG_DT / 2 * k1t), k2t = r.om + ITG_DT / 2 * k1o;
    var k3o = -4 * Math.sin(r.th + ITG_DT / 2 * k2t), k3t = r.om + ITG_DT / 2 * k2o;
    var k4o = -4 * Math.sin(r.th + ITG_DT * k3t), k4t = r.om + ITG_DT * k3o;
    r.th += ITG_DT / 6 * (k1t + 2 * k2t + 2 * k3t + k4t);
    r.om += ITG_DT / 6 * (k1o + 2 * k2o + 2 * k3o + k4o);
    itg.data.push({ t: itg.t, ex: exact, eu: e.th, rk: r.th });
    itg.t += ITG_DT;
    if (itg.t >= ITG_END) itg.done = true;
  }

  function legendColor(cls) {
    var el = document.querySelector('.legend-dot.' + cls);
    return el ? getComputedStyle(el).backgroundColor : '#888';
  }

  function itgDraw() {
    var canvas = itg.canvas, ctx = itg.ctx;
    if (!ctx) return;
    var w = canvas.width, h = canvas.height;
    var line = cssVar('--ink-muted');
    var padL = 40, padR = 14, padT = 14, padB = 26;
    var pw = w - padL - padR, ph = h - padT - padB;
    var yRange = 3.2;
    function px(t) { return padL + (t / ITG_END) * pw; }
    function py(th) {
      var c = clampNum(th, -yRange, yRange);
      return padT + (1 - (c + yRange) / (2 * yRange)) * ph;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    ctx.fillStyle = line;
    for (var g = -2; g <= 2; g++) {
      var gy = py(g);
      ctx.globalAlpha = g === 0 ? 0.4 : 0.2;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(padL + pw, gy);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText((g > 0 ? '+' : '') + g, padL - 32, gy + 3);
    }
    for (var g = 0; g <= 8; g++) {
      var tt = g * 2;
      var gx = px(tt);
      ctx.beginPath();
      ctx.moveTo(gx, padT + ph);
      ctx.lineTo(gx, padT + ph + 4);
      ctx.stroke();
      ctx.fillText(String(tt) + 's', gx - 7, padT + ph + 16);
    }
    function polyline(arr, idx, color, width) {
      ctx.beginPath();
      ctx.moveTo(px(arr[0].t), py(arr[0][idx]));
      for (var i = 1; i < arr.length; i++) ctx.lineTo(px(arr[i].t), py(arr[i][idx]));
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }
    if (itg.data.length > 1) {
      var eu = legendColor('legend-eu');
      var rk = legendColor('legend-rk');
      var acc = legendColor('legend-acc');
      polyline(itg.data, 'eu', eu, 1.1);
      polyline(itg.data, 'rk', rk, 1.6);
      polyline(itg.data, 'ex', acc, 1.6);
    }
    if (itg.data.length) {
      var last = itg.data[itg.data.length - 1];
      var tEl = document.getElementById('intTime');
      var errEl = document.getElementById('intErr');
      if (tEl) tEl.textContent = last.t.toFixed(2) + 's';
      if (errEl) {
        var err = Math.abs(last.eu - last.ex) / (2 * yRange) * 100;
        errEl.textContent = Math.min(99, err).toFixed(1) + '%';
      }
    }
  }

  // --- 1976 US Standard Atmosphere (flight_core) ---
  var ZMAX = 20000;
  var atm = { canvas: null, ctx: null, t: 0, frame: 0, curve: [] };

  function stdAtmosphere(zm) {
    var g = 9.80665, R = 287.053, L = 0.0065, T0 = 288.15, p0 = 101325;
    var T, p;
    if (zm <= 11000) {
      T = T0 - L * zm;
      p = p0 * Math.pow(T / T0, g / (R * L));
    } else {
      var T11 = T0 - L * 11000;
      var p11 = p0 * Math.pow(T11 / T0, g / (R * L));
      T = T11;
      p = p11 * Math.exp(-g * (zm - 11000) / (R * T));
    }
    return { T: T, p: p, rho: p / (R * T) };
  }

  function initAtmosphere() {
    atm.canvas = document.getElementById('atmosphereCanvas');
    if (!atm.canvas) return;
    atm.ctx = atm.canvas.getContext('2d');
    atm.canvas.width = atm.canvas.parentElement.clientWidth - 48;
    atm.canvas.height = 250;
    atm.curve = [];
    for (var i = 0; i <= 200; i++) {
      var z = (i / 200) * ZMAX;
      atm.curve.push({ z: z, s: stdAtmosphere(z) });
    }
    atmDraw();
  }

  function atmDraw() {
    var canvas = atm.canvas, ctx = atm.ctx;
    if (!ctx) return;
    var w = canvas.width, h = canvas.height;
    var line = cssVar('--ink-muted');
    var ink = cssVar('--ink');
    var accent = cssVar('--accent');
    var padL = 44, padT = 16, padB = 26;
    var pw = w - padL - 16, ph = h - padT - padB;
    var xMax = 1.35;
    var alt = 8 - 8 * Math.cos(atm.t * 0.0105);
    var zm = alt * 1000;
    var st = stdAtmosphere(zm);
    function py(z) { return padT + (1 - z / ZMAX) * ph; }
    function px(rho) { return padL + Math.min(rho, xMax) / xMax * pw; }

    ctx.clearRect(0, 0, w, h);
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = line;
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var zk = g * 5;
      var gy = py(zk * 1000);
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(padL + pw, gy);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(String(zk) + 'km', padL - 34, gy + 3);
    }
    ctx.fillText('\u03c1 kg/m\u00b3', padL + pw - 4, padT - 5);

    ctx.beginPath();
    ctx.moveTo(px(atm.curve[0].s.rho), py(atm.curve[0].z));
    for (var i = 1; i < atm.curve.length; i++) {
      var pt = atm.curve[i];
      ctx.lineTo(px(pt.s.rho), py(pt.z));
    }
    ctx.lineTo(px(atm.curve[atm.curve.length - 1].s.rho), py(ZMAX));
    ctx.lineTo(px(atm.curve[0].s.rho), py(ZMAX));
    ctx.closePath();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    var gx = px(st.rho), gy = py(zm);
    ctx.strokeStyle = ink;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(padL + pw, gy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(gx, gy, 4, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.stroke();

    atm.t++;
    atm.frame++;
    if (atm.frame % 10 === 0) {
      var altEl = document.getElementById('atmAlt');
      var tEl = document.getElementById('atmTemp');
      var pEl = document.getElementById('atmPress');
      var rEl = document.getElementById('atmRho');
      if (altEl) altEl.textContent = alt.toFixed(1) + ' km';
      if (tEl) tEl.textContent = (st.T - 273.15).toFixed(0) + '\u00b0C';
      if (pEl) pEl.textContent = (st.p / 1000).toFixed(1) + ' kPa';
      if (rEl) rEl.textContent = st.rho.toFixed(3) + ' kg/m\u00b3';
    }
  }

  function vizLoop() {
    wtStepAndDraw();
    itgStep();
    itgDraw();
    atmDraw();
    requestAnimationFrame(vizLoop);
  }

  // --- Init ---
  initSortingVisualization();
  initML();
  initFlightHud();
  initRL();
  initWindTunnel();
  initIntegrator();
  initAtmosphere();

  if (parallaxOn) {
    hudLoop();
    rlLoop();
    vizLoop();
    mlLoop();
  } else {
    updateHudReadouts();
    drawFlightHud();
    for (var e = 0; e < 200; e++) rl.points.push(rlRewardAt(e));
    updateRlReadouts();
    drawRl();
    for (var s = 0; s < 100; s++) { itgStep(); }
    wtStepAndDraw();
    itgDraw();
    atmDraw();
    mlDrawStatic();
  }

  window.addEventListener('resize', function () {
    if (ml.canvas) {
      ml.canvas.width = ml.canvas.parentElement.clientWidth - 48;
      ml.canvas.height = 250;
      mlReset();
    }
    if (hud.canvas) {
      hud.canvas.width = hud.canvas.parentElement.clientWidth;
      hud.canvas.height = 260;
    }
    if (rl.canvas) {
      rl.canvas.width = rl.canvas.parentElement.clientWidth - 48;
      rl.canvas.height = 250;
      drawRl();
    }
    if (wt.canvas) {
      wt.canvas.width = wt.canvas.parentElement.clientWidth;
      wt.canvas.height = 240;
      initWindTunnel();
    }
    if (itg.canvas) {
      itg.canvas.width = itg.canvas.parentElement.clientWidth - 48;
      itg.canvas.height = 250;
      itgReset();
      itgDraw();
    }
    if (atm.canvas) {
      atm.canvas.width = atm.canvas.parentElement.clientWidth - 48;
      atm.canvas.height = 250;
      initAtmosphere();
    }
  });
});
