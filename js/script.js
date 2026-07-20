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
    initNeurons();
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

  // --- Smooth Scroll ---
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        window.scrollTo({ top: target.offsetTop - 60, behavior: 'smooth' });
      }
    });
  });

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
        bg: s.getPropertyValue('--surface').trim(),
        bar: s.getPropertyValue('--border').trim(),
        highlight: s.getPropertyValue('--text-muted').trim()
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

  // --- Neural Network Visualization ---
  var neurons = [];
  var neuralLayers = [4, 6, 2];
  var neuralCanvas, neuralCtx;

  function getNeuralColors() {
    var s = getComputedStyle(document.documentElement);
    return {
      line: s.getPropertyValue('--text-muted').trim(),
      neuron: s.getPropertyValue('--border').trim(),
      neuronFill: s.getPropertyValue('--bg').trim()
    };
  }

  function initNeurons() {
    neuralCanvas = document.getElementById('neuralCanvas');
    if (!neuralCanvas) return;
    neuralCtx = neuralCanvas.getContext('2d');
    neuralCanvas.width = neuralCanvas.parentElement.clientWidth - 48;
    neuralCanvas.height = 250;

    neurons = [];
    for (var l = 0; l < neuralLayers.length; l++) {
      neurons[l] = [];
      for (var n = 0; n < neuralLayers[l]; n++) {
        neurons[l].push({
          x: (l + 1) * (neuralCanvas.width / (neuralLayers.length + 1)),
          y: (n + 1) * (neuralCanvas.height / (neuralLayers[l] + 1)),
          radius: 8,
          pulse: Math.random() * Math.PI * 2
        });
      }
    }
    document.getElementById('layerCount').textContent = neuralLayers.length;
    document.getElementById('neuronCount').textContent = neurons.flat().length;
  }

  function drawNeuralNetwork() {
    if (!neuralCtx) return;
    var colors = getNeuralColors();
    neuralCtx.clearRect(0, 0, neuralCanvas.width, neuralCanvas.height);

    for (var l = 0; l < neurons.length; l++) {
      for (var n = 0; n < neurons[l].length; n++) {
        var neuron = neurons[l][n];
        if (l < neurons.length - 1) {
          for (var n2 = 0; n2 < neurons[l + 1].length; n2++) {
            var next = neurons[l + 1][n2];
            neuralCtx.beginPath();
            neuralCtx.moveTo(neuron.x, neuron.y);
            neuralCtx.lineTo(next.x, next.y);
            neuralCtx.strokeStyle = colors.line;
            neuralCtx.globalAlpha = 0.3;
            neuralCtx.lineWidth = 1;
            neuralCtx.stroke();
            neuralCtx.globalAlpha = 1;
          }
        }
      }
    }

    for (var l = 0; l < neurons.length; l++) {
      for (var n = 0; n < neurons[l].length; n++) {
        var neuron = neurons[l][n];
        neuron.pulse += 0.04;
        var scale = 1 + Math.sin(neuron.pulse) * 0.15;
        neuralCtx.beginPath();
        neuralCtx.arc(neuron.x, neuron.y, neuron.radius * scale, 0, Math.PI * 2);
        neuralCtx.fillStyle = colors.neuronFill;
        neuralCtx.strokeStyle = colors.neuron;
        neuralCtx.lineWidth = 2;
        neuralCtx.fill();
        neuralCtx.stroke();
      }
    }

    requestAnimationFrame(drawNeuralNetwork);
  }

  // --- Init ---
  initSortingVisualization();
  initNeurons();
  drawNeuralNetwork();

  window.addEventListener('resize', function () {
    if (neuralCanvas) {
      neuralCanvas.width = neuralCanvas.parentElement.clientWidth - 48;
      neuralCanvas.height = 250;
      initNeurons();
    }
  });
});
