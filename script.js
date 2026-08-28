// Eventech — minimal interactions

(function () {
  'use strict';

  // ---- Three.js hero scene: a structured 3D grid with a data wave
  // moving through it. Few points, deliberate structure, tech feel.
  function setupHeroScene() {
    if (!window.THREE) return;
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    const isLowPower = window.innerWidth < 768;

    // Scene + camera + renderer
    const scene = new THREE.Scene();
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 0, 9);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isLowPower });
    } catch (e) {
      return;
    }
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // ---- Grid definition (sparse + quiet: the scene is a texture, not a feature)
    const cols = isLowPower ? 12 : 16;
    const rows = isLowPower ? 6  : 8;
    const spacing = 0.42;
    const particleCount = cols * rows;

    const positions  = new Float32Array(particleCount * 3);
    const basePos    = new Float32Array(particleCount * 3);
    const sizes      = new Float32Array(particleCount);
    const baseSizes  = new Float32Array(particleCount);
    const phases     = new Float32Array(particleCount);
    const colors     = new Float32Array(particleCount * 3);

    // Hand-picked coral "lit" points — placed for visual balance, not random.
    // Kept to 4 to stay as a quiet accent, not a feature.
    const coralIndexSet = new Set();
    const coralLayout = [
      [3, 2],  [11, 3],  [7, 5],  [4, 6]
    ];
    coralLayout.forEach(([c, r]) => {
      if (c < cols && r < rows) coralIndexSet.add(r * cols + c);
    });
    const coralIndices = Array.from(coralIndexSet);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = (c - (cols - 1) / 2) * spacing;
        const y = (r - (rows - 1) / 2) * spacing;

        // Tiny per-point offset so the grid feels alive, not stenciled
        const ox = (Math.random() - 0.5) * 0.05;
        const oy = (Math.random() - 0.5) * 0.05;

        basePos[i * 3]     = x + ox;
        basePos[i * 3 + 1] = y + oy;
        basePos[i * 3 + 2] = 0;
        positions[i * 3]     = basePos[i * 3];
        positions[i * 3 + 1] = basePos[i * 3 + 1];
        positions[i * 3 + 2] = 0;

        // Size: small, uniform; coral ones are just a touch larger, never loud
        const isCoral = coralIndexSet.has(i);
        baseSizes[i] = isCoral ? 1.2 : (0.45 + Math.random() * 0.35);
        sizes[i] = baseSizes[i];

        phases[i] = Math.random() * Math.PI * 2;

        if (isCoral) {
          colors[i * 3]     = 1.0;
          colors[i * 3 + 1] = 0.357;
          colors[i * 3 + 2] = 0.290;
        } else {
          colors[i * 3]     = 0.039;
          colors[i * 3 + 1] = 0.039;
          colors[i * 3 + 2] = 0.039;
        }
      }
    }

    // ---- Particle material (custom shader for soft round points + per-particle size)
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size',      new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (340.0 / max(-mv.z, 0.1));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float a = pow(1.0 - d * 2.0, 1.6) * 0.6;
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    // Very subtle 3D tilt — just a hint of depth, not a hero feature
    particles.rotation.x = -0.10;
    scene.add(particles);

    // ---- Mesh lines: connect each point to its right + bottom neighbor.
    // Rebuilt every frame because particles move with the wave.
    const horizLineCount = (cols - 1) * rows;
    const vertLineCount  = cols * (rows - 1);
    const totalLineCount  = horizLineCount + vertLineCount;
    const lineArr = new Float32Array(totalLineCount * 2 * 3);

    // Build the connectivity map (which indices are connected) once
    const lineConnections = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (c < cols - 1) lineConnections.push([i, i + 1]);
        if (r < rows - 1) lineConnections.push([i, (r + 1) * cols + c]);
      }
    }

    // Initial fill (will be updated every frame)
    for (let li = 0; li < lineConnections.length; li++) {
      const [a, b] = lineConnections[li];
      const base = li * 6;
      lineArr[base]     = positions[a * 3];
      lineArr[base + 1] = positions[a * 3 + 1];
      lineArr[base + 2] = positions[a * 3 + 2];
      lineArr[base + 3] = positions[b * 3];
      lineArr[base + 4] = positions[b * 3 + 1];
      lineArr[base + 5] = positions[b * 3 + 2];
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(lineArr, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x0a0a0a,
      transparent: true,
      opacity: 0.04,
      depthWrite: false
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    lines.rotation.x = -0.10;
    scene.add(lines);

    // ---- Mouse parallax
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    document.addEventListener('mousemove', onMove, { passive: true });

    // ---- Visibility + resize
    let isVisible = true;
    document.addEventListener('visibilitychange', () => {
      isVisible = !document.hidden;
    });
    const onResize = () => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw === 0 || ch === 0) return;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    };
    window.addEventListener('resize', onResize);

    // ---- Animation loop
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      if (!isVisible) return;

      const t = clock.getElapsedTime();
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      // ---- 1) Quiet data wave through the grid.
      // Two interfering sine waves, low amplitude — barely a shimmer.
      for (let i = 0; i < particleCount; i++) {
        const base = i * 3;
        const x = basePos[base];
        const y = basePos[base + 1];

        // Primary traveling wave (low amplitude)
        const wave1 = Math.sin(x * 0.55 - t * 0.95) * 0.12;
        // Secondary wave at an angle, slower, even smaller
        const wave2 = Math.cos((x * 0.30 + y * 0.40) + t * 0.55) * 0.07;
        // Tiny per-point breathing
        const breath = Math.sin(t * 0.6 + phases[i]) * 0.02;

        positions[base + 2] = wave1 + wave2 + breath;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // ---- 2) Coral points breathe very gently — read as "lit", not "pulsing"
      for (let k = 0; k < coralIndices.length; k++) {
        const i = coralIndices[k];
        const pulse = 1.1 + Math.sin(t * 1.4 + i * 0.7) * 0.25;
        sizes[i] = pulse;
      }
      particleGeo.attributes.size.needsUpdate = true;

      // ---- 3) Rebuild line positions to follow the wave
      for (let li = 0; li < lineConnections.length; li++) {
        const [a, b] = lineConnections[li];
        const base = li * 6;
        lineArr[base]     = positions[a * 3];
        lineArr[base + 1] = positions[a * 3 + 1];
        lineArr[base + 2] = positions[a * 3 + 2];
        lineArr[base + 3] = positions[b * 3];
        lineArr[base + 4] = positions[b * 3 + 1];
        lineArr[base + 5] = positions[b * 3 + 2];
      }
      lineGeo.attributes.position.needsUpdate = true;

      // ---- 4) Subtle global line opacity breathing (stays whisper-quiet)
      lineMat.opacity = 0.035 + Math.sin(t * 0.4) * 0.012;

      // ---- 5) Almost imperceptible mouse parallax on top of the static tilt
      particles.rotation.y = mouse.x * 0.04;
      particles.rotation.x = -0.10 - mouse.y * 0.02;
      lines.rotation.y = particles.rotation.y;
      lines.rotation.x = particles.rotation.x;

      renderer.render(scene, camera);
    }
    animate();
  }

  // Kick off when the page is ready (Three.js is loaded with `defer`, so it's available by DOMContentLoaded).
  // Use double-rAF so layout is settled before we measure the canvas.
  const initScene = () => {
    requestAnimationFrame(() => requestAnimationFrame(setupHeroScene));
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScene);
  } else if (document.readyState === 'interactive') {
    window.addEventListener('load', initScene);
  } else {
    initScene();
  }

  // ---- Rotating word in hero title
  const rotator = document.querySelector('.hero__rotator');
  if (rotator) {
    const words = Array.from(rotator.querySelectorAll('span'));
    if (words.length > 1) {
      let idx = 0;
      const cycle = () => {
        const current = words[idx];
        const nextIdx = (idx + 1) % words.length;
        const next = words[nextIdx];
        current.classList.remove('is-active');
        current.classList.add('is-leaving');
        next.classList.add('is-active');
        // Update aria-label for accessibility
        rotator.setAttribute('aria-label', next.textContent);
        // Cleanup after transition
        setTimeout(() => current.classList.remove('is-leaving'), 520);
        idx = nextIdx;
      };
      // Start cycling every 2.6s — pauses on tab hidden to be respectful
      let timer = setInterval(cycle, 2600);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          clearInterval(timer);
        } else {
          timer = setInterval(cycle, 2600);
        }
      });
    }
  }

  // ---- Count-up animation for hero stats
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const formatNumber = (n, target) => {
      // If target has a decimal, preserve it
      const decimals = (String(target).split('.')[1] || '').length;
      return decimals ? n.toFixed(decimals) : Math.round(n).toString();
    };
    const animateCount = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const duration = 1400;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = formatNumber(target * eased, target) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach((c) => {
        // Start from 0 visually before observer fires
        const suffix = c.dataset.suffix || '';
        c.textContent = '0' + suffix;
        io.observe(c);
      });
    } else {
      // Fallback: just set the final values
      counters.forEach((c) => {
        const target = parseFloat(c.dataset.count);
        const suffix = c.dataset.suffix || '';
        c.textContent = Math.round(target) + suffix;
      });
    }
  }

  // ---- Nav scroll state
  const nav = document.querySelector('.nav');
  const onScroll = () => {
    if (!nav) return;
    if (window.scrollY > 8) {
      nav.classList.add('is-scrolled');
    } else {
      nav.classList.remove('is-scrolled');
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---- Cursor dot (desktop only)
  const cursor = document.querySelector('.cursor-dot');
  if (cursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;

    window.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
    });

    const render = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    // Grow on interactive elements
    const interactives = document.querySelectorAll('a, button, .work__row, .service-card');
    interactives.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.style.width = '28px';
        cursor.style.height = '28px';
        cursor.style.mixBlendMode = 'difference';
      });
      el.addEventListener('mouseleave', () => {
        cursor.style.width = '8px';
        cursor.style.height = '8px';
      });
    });
  }

  // ---- Reveal on scroll
  const targets = document.querySelectorAll(
    '.section-head, .service-card, .work__row, .process__step, .about__quote, .about__pillar, .cta__inner, .logos, .hero__meta'
  );
  targets.forEach((el, i) => {
    el.classList.add('reveal');
    // Stagger the first batch lightly
    if (i < 4) el.setAttribute('data-delay', String((i % 4) + 1));
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add('is-visible'));
  }

  // ---- Smooth scroll for in-page links
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---- Contact form (FormSubmit AJAX, no signup, no key in client)
  const form = document.getElementById('contact-form');
  if (form) {
    const sent = document.getElementById('cta-sent');
    const errorEl = document.getElementById('cta-error');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtn = submitBtn ? submitBtn.innerHTML : '';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (sent) sent.hidden = true;
      if (errorEl) errorEl.hidden = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Sending…</span>';
      }
      try {
        const data = new FormData(form);
        // Honeypot: if filled, silently succeed without sending
        if (data.get('_honey')) {
          if (sent) sent.hidden = false;
          form.reset();
          return;
        }
        const r = await fetch('https://formsubmit.co/ajax/help@eventech.cloud', {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });
        if (r.ok) {
          if (sent) sent.hidden = false;
          form.reset();
        } else {
          throw new Error('non-2xx');
        }
      } catch (err) {
        if (errorEl) errorEl.hidden = false;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtn;
        }
      }
    });
  }
})();
