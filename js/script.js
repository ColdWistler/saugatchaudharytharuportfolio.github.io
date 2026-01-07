document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');
  const shapes = document.querySelectorAll('.shape');

  initMatrixEffect();
  initSortingVisualization();
  initNeuralNetwork();
  initParallaxEffect();

  hamburger.addEventListener('click', function() {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
  });

  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      navMenu.classList.remove('active');
      hamburger.classList.remove('active');
    });
  });

  const themeToggle = document.getElementById('themeToggle');
  const themeDropdown = document.getElementById('themeDropdown');
  const themeOptions = document.querySelectorAll('.theme-option');

  const savedTheme = localStorage.getItem('theme') || 'mocha';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateActiveThemeOption(savedTheme);

  themeToggle.addEventListener('click', function(e) {
    e.stopPropagation();
    themeDropdown.classList.toggle('active');
  });

  document.addEventListener('click', function(e) {
    if (!themeDropdown.contains(e.target) && !themeToggle.contains(e.target)) {
      themeDropdown.classList.remove('active');
    }
  });

  themeOptions.forEach(option => {
    option.addEventListener('click', function() {
      const theme = this.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      updateActiveThemeOption(theme);
      themeDropdown.classList.remove('active');
    });
  });

  function updateActiveThemeOption(theme) {
    themeOptions.forEach(option => {
      option.classList.remove('active');
      if (option.getAttribute('data-theme') === theme) {
        option.classList.add('active');
      }
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      themeDropdown.classList.toggle('active');
    }

    if (themeDropdown.classList.contains('active')) {
      if (e.key === '1') {
        themeOptions[0].click();
      } else if (e.key === '2') {
        themeOptions[1].click();
      } else if (e.key === '3') {
        themeOptions[2].click();
      } else if (e.key === '4') {
        themeOptions[3].click();
      } else if (e.key === 'Escape') {
        themeDropdown.classList.remove('active');
      }
    }
  });

  const typingText = document.getElementById('typing-text');
  const phrases = [
    'Building Intelligent Systems',
    'Learning Through Trial and Error',
    'Code | Break | Fix | Repeat'
  ];
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingSpeed = 100;

  function typeEffect() {
    const currentPhrase = phrases[phraseIndex];

    if (isDeleting) {
      typingText.textContent = currentPhrase.substring(0, charIndex - 1);
      charIndex--;
      typingSpeed = 50;
    } else {
      typingText.textContent = currentPhrase.substring(0, charIndex + 1);
      charIndex++;
      typingSpeed = 100;
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
      typingSpeed = 2000;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typingSpeed = 500;
    }

    setTimeout(typeEffect, typingSpeed);
  }

  typeEffect();

  typeEffect();

  const sections = document.querySelectorAll('section');
  const navItems = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', function() {
    let current = '';

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (scrollY >= sectionTop - 200) {
        current = section.getAttribute('id');
      }
    });

    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href') === `#${current}`) {
        item.classList.add('active');
      }
    });
  });

  const projectCards = document.querySelectorAll('.project-card');
  const skillGroups = document.querySelectorAll('.skill-group');
  const skillTags = document.querySelectorAll('.skill-tag');

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  projectCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `all 0.5s ease ${index * 0.1}s`;
    observer.observe(card);
  });

  skillGroups.forEach((group, index) => {
    group.style.opacity = '0';
    group.style.transform = 'translateY(30px)';
    group.style.transition = `all 0.6s ease ${index * 0.15}s`;
    observer.observe(group);
  });

  const navbar = document.querySelector('.navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', function() {
    const currentScroll = window.pageYOffset;

    if (currentScroll <= 0) {
      navbar.style.boxShadow = 'none';
    } else {
      navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    }

    lastScroll = currentScroll;
  });

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offsetTop = target.offsetTop - 70;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });

  window.addEventListener('scroll', function() {
    const scrollY = window.pageYOffset;

    shapes.forEach((shape, index) => {
      const speed = 0.05 * (index + 1);
      shape.style.transform = `translateY(${scrollY * speed}px)`;
    });
  });

  function initMatrixEffect() {
    const canvas = document.getElementById('matrixCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '0123456789ABCDEF<>{}[];:,.?/\\|~-+*#@';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function drawMatrix() {
      ctx.fillStyle = 'rgba(30, 30, 46, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#a6e3a1';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    setInterval(drawMatrix, 50);

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }

  function initSortingVisualization() {
    const canvas = document.getElementById('sortingCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let array = [];
    const arraySize = 50;

    function resizeCanvas() {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = 300;
      generateArray();
    }

    function generateArray() {
      array = [];
      for (let i = 0; i < arraySize; i++) {
        array.push(Math.random());
      }
      drawArray();
    }

    function drawArray(highlightIndices = []) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / arraySize;
      const barHeight = canvas.height;

      for (let i = 0; i < array.length; i++) {
        const barHeightScale = array[i] * (canvas.height - 20) + 10;
        const x = i * barWidth;
        const y = canvas.height - barHeightScale;

        let color = '#89b4fa';
        if (highlightIndices.includes(i)) {
          color = '#f38ba8';
        } else if (highlightIndices.some(idx => idx === i - 1 || idx === i)) {
          color = '#cba6f7';
        }

        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth - 2, barHeightScale);
      }
    }

    async function bubbleSort() {
      for (let i = 0; i < array.length; i++) {
        for (let j = 0; j < array.length - i - 1; j++) {
          if (array[j] > array[j + 1]) {
            [array[j], array[j + 1]] = [array[j + 1], array[j]];
            drawArray([j, j + 1]);
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
      }
      drawArray([]);
    }

    async function quickSort(start = 0, end = array.length - 1) {
      if (start >= end) return;

      const pivotIndex = await partition(start, end);
      await quickSort(start, pivotIndex - 1);
      await quickSort(pivotIndex + 1, end);
    }

    async function partition(start, end) {
      const pivot = array[end];
      let i = start - 1;

      for (let j = start; j < end; j++) {
        if (array[j] < pivot) {
          i++;
          [array[i], array[j]] = [array[j], array[i]];
          drawArray([i, j, end]);
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }
      [array[i + 1], array[end]] = [array[end], array[i + 1]];
      drawArray([i + 1]);
      await new Promise(resolve => setTimeout(resolve, 20));
      return i + 1;
    }

    async function mergeSort(start = 0, end = array.length - 1) {
      if (start >= end) return;

      const mid = Math.floor((start + end) / 2);
      await mergeSort(start, mid);
      await mergeSort(mid + 1, end);
      await merge(start, mid, end);
    }

    async function merge(start, mid, end) {
      const left = array.slice(start, mid + 1);
      const right = array.slice(mid + 1, end + 1);
      let i = 0, j = 0, k = start;

      while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) {
          array[k] = left[i];
          i++;
        } else {
          array[k] = right[j];
          j++;
        }
        drawArray([k]);
        await new Promise(resolve => setTimeout(resolve, 15));
        k++;
      }

      while (i < left.length) {
        array[k] = left[i];
        drawArray([k]);
        await new Promise(resolve => setTimeout(resolve, 15));
        i++;
        k++;
      }

      while (j < right.length) {
        array[k] = right[j];
        drawArray([k]);
        await new Promise(resolve => setTimeout(resolve, 15));
        j++;
        k++;
      }
    }

    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const algorithm = this.getAttribute('data-algorithm');

        if (algorithm === 'bubble') {
          await bubbleSort();
        } else if (algorithm === 'quick') {
          await quickSort();
        } else if (algorithm === 'merge') {
          await mergeSort();
        }
      });
    });

    document.getElementById('resetSort').addEventListener('click', generateArray);

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function initParallaxEffect() {
    const parallaxBack = document.querySelector('.parallax-back');
    const parallaxMid = document.querySelector('.parallax-mid');
    const parallaxFront = document.querySelector('.parallax-front');

    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;

      if (parallaxBack) {
        parallaxBack.style.transform = `translateY(${scrolled * 0.2}px)`;
      }
      if (parallaxMid) {
        parallaxMid.style.transform = `translateY(${scrolled * 0.4}px)`;
      }
      if (parallaxFront) {
        parallaxFront.style.transform = `translateY(${scrolled * 0.6}px)`;
      }
    });
  }

  function initNeuralNetwork() {
    const canvas = document.getElementById('neuralCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 300;

    const layers = [4, 6, 2];
    let neurons = [];

    function initNeurons() {
      neurons = [];
      for (let l = 0; l < layers.length; l++) {
        neurons[l] = [];
        for (let n = 0; n < layers[l]; n++) {
          neurons[l].push({
            x: (l + 1) * (canvas.width / (layers.length + 1)),
            y: (n + 1) * (canvas.height / (layers[l] + 1)),
            radius: 8,
            pulse: 0
          });
        }
      }

      document.getElementById('layerCount').textContent = layers.length;
      document.getElementById('neuronCount').textContent = neurons.flat().length;
    }

    function drawNeuralNetwork() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let l = 0; l < neurons.length; l++) {
        for (let n = 0; n < neurons[l].length; n++) {
          const neuron = neurons[l][n];

          if (l < neurons.length - 1) {
            for (let nextN = 0; nextN < neurons[l + 1].length; nextN++) {
              const nextNeuron = neurons[l + 1][nextN];
              const gradient = ctx.createLinearGradient(
                neuron.x, neuron.y, nextNeuron.x, nextNeuron.y
              );
              gradient.addColorStop(0, 'rgba(137, 180, 250, 0.2)');
              gradient.addColorStop(1, 'rgba(203, 166, 247, 0.2)');

              ctx.beginPath();
              ctx.moveTo(neuron.x, neuron.y);
              ctx.lineTo(nextNeuron.x, nextNeuron.y);
              ctx.strokeStyle = gradient;
              ctx.lineWidth = 1;
              ctx.stroke();

              if (Math.random() > 0.95) {
                ctx.beginPath();
                ctx.arc(
                  neuron.x + (nextNeuron.x - neuron.x) * Math.random(),
                  neuron.y + (nextNeuron.y - neuron.y) * Math.random(),
                  2,
                  0,
                  Math.PI * 2
                );
                ctx.fillStyle = 'rgba(166, 227, 161, 0.8)';
                ctx.fill();
              }
            }
          }
        }
      }

      for (let l = 0; l < neurons.length; l++) {
        for (let n = 0; n < neurons[l].length; n++) {
          const neuron = neurons[l][n];
          neuron.pulse += 0.05;
          const pulseScale = 1 + Math.sin(neuron.pulse) * 0.1;

          ctx.beginPath();
          ctx.arc(neuron.x, neuron.y, neuron.radius * pulseScale, 0, Math.PI * 2);
          const gradient = ctx.createRadialGradient(
            neuron.x, neuron.y, 0,
            neuron.x, neuron.y, neuron.radius * pulseScale
          );
          gradient.addColorStop(0, '#cba6f7');
          gradient.addColorStop(1, '#89b4fa');
          ctx.fillStyle = gradient;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(neuron.x, neuron.y, neuron.radius * pulseScale + 4, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(203, 166, 247, 0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      requestAnimationFrame(drawNeuralNetwork);
    }

    initNeurons();
    drawNeuralNetwork();

    window.addEventListener('resize', () => {
      canvas.width = canvas.parentElement.clientWidth;
      initNeurons();
    });
  }
});
