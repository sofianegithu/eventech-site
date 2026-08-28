// Eventech — minimal interactions

(function () {
  'use strict';

  // ---- Three.js hero scene: a quiet, breathing cloud of particles.
  // One idea, done well — no wireframes, no rings, no icosahedrons.
  function setupHeroScene() {
    if (!window.THREE) return;
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    const isLowPower = window.innerWidth < 768;

    // Scene + camera + renderer
    const scene = new THREE.Scene();
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
    camera.position.set(0, 0, 8);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isLowPower });
    } catch (e) {
      return; // graceful degrade — no scene, but the page still works
    }
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // ---- Particle field: variable sizes, drift motion, coral accent on ~3%
    const particleCount = isLowPower ? 180 : 420;
    const positions  = new Float32Array(particleCount * 3);
    const basePos    = new Float32Array(particleCount * 3);
    const sizes      = new Float32Array(particleCount);
    const baseSizes  = new Float32Array(particleCount);
    const phases     = new Float32Array(particleCount);
    const colors     = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Distribute in a flattened sphere (more horizontal than vertical — feels like a cloud, not a bubble)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.4 + Math.random() * 4.8;
      basePos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      basePos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.65;
      basePos[i * 3 + 2] = r * Math.cos(phi) * 0.7;
      positions[i * 3]     = basePos[i * 3];
      positions[i * 3 + 1] = basePos[i * 3 + 1];
      positions[i * 3 + 2] = basePos[i * 3 + 2];

      // Per-particle base size: 0.6 → 2.4 (so a few are visibly larger, most are tiny)
      const s = 0.6 + Math.pow(Math.random(), 1.7) * 1.8;
      baseSizes[i] = s;
      sizes[i] = s;

      // Per-particle phase for drift
      phases[i] = Math.random() * Math.PI * 2;

      // ~3% of particles are coral — a single warm glint somewhere in the cloud
      if (Math.random() < 0.03) {
        colors[i * 3]     = 1.0;
        colors[i * 3 + 1] = 0.357;
        colors[i * 3 + 2] = 0.290;
      } else {
        colors[i * 3]     = 0.039;
        colors[i * 3 + 1] = 0.039;
        colors[i * 3 + 2] = 0.039;
      }
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size',      new THREE.BufferAttribute(sizes, 1));

    // Custom shader: per-particle size + soft round point (no square pixels)
    const particleMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (320.0 / max(-mv.z, 0.1));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float a = pow(1.0 - d * 2.0, 1.6) * 0.55;
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ---- Breathing connection lines: rebuilt every frame from current particle positions.
    // Capped at a max number of lines to keep the cost predictable.
    const maxLines = isLowPower ? 400 : 1200;
    const lineGeo = new THREE.BufferGeometry();
    const lineArr = new Float32Array(maxLines * 2 * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(lineArr, 3));
    lineGeo.setDrawRange(0, 0);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x0a0a0a,
      transparent: true,
      opacity: 0.07,
      depthWrite: false
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // ---- Mouse parallax (gentle, just enough to feel alive)
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    document.addEventListener('mousemove', onMove, { passive: true });

    // ---- Visibility — pause when tab hidden
    let isVisible = true;
    document.addEventListener('visibilitychange', () => {
      isVisible = !document.hidden;
    });

    // ---- Resize
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
    const maxDist = isLowPower ? 0.75 : 0.85;
    const maxDistSq = maxDist * maxDist;

    function rebuildConnections() {
      // O(n²) but cheap with the early break and the line cap
      let lineIdx = 0;
      for (let i = 0; i < particleCount; i++) {
        const ix = positions[i * 3];
        const iy = positions[i * 3 + 1];
        const iz = positions[i * 3 + 2];
        for (let j = i + 1; j < particleCount; j++) {
          const dx = ix - positions[j * 3];
          const dy = iy - positions[j * 3 + 1];
          const dz = iz - positions[j * 3 + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < maxDistSq) {
            const base = lineIdx * 6;
            lineArr[base]     = ix;
            lineArr[base + 1] = iy;
            lineArr[base + 2] = iz;
            lineArr[base + 3] = positions[j * 3];
            lineArr[base + 4] = positions[j * 3 + 1];
            lineArr[base + 5] = positions[j * 3 + 2];
            lineIdx++;
            if (lineIdx >= maxLines) break;
          }
        }
        if (lineIdx >= maxLines) break;
      }
      lineGeo.setDrawRange(0, lineIdx * 2);
      lineGeo.attributes.position.needsUpdate = true;
    }

    function animate() {
      requestAnimationFrame(animate);
      if (!isVisible) return;

      const t = clock.getElapsedTime();
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      // ---- 1) Drift each particle around its base position (slow, organic)
      for (let i = 0; i < particleCount; i++) {
        const phase = phases[i];
        const base = i * 3;
        positions[base]     = basePos[base]     + Math.sin(t * 0.30 + phase)        * 0.18;
        positions[base + 1] = basePos[base + 1] + Math.cos(t * 0.22 + phase * 1.3)  * 0.18;
        positions[base + 2] = basePos[base + 2] + Math.sin(t * 0.18 + phase * 0.7)  * 0.18;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // ---- 2) Pulse wave: every 12s, a wave expands outward from center.
      // Particles at the wave front briefly get a size + alpha boost.
      const cycleT = (t % 12) / 12;            // 0..1
      const pulseR = cycleT * 7.5;             // expand to radius 7.5
      const pulseFade = 1 - cycleT;            // overall fade as wave expands
      for (let i = 0; i < particleCount; i++) {
        const base = i * 3;
        const dx = positions[base];
        const dy = positions[base + 1];
        const r = Math.sqrt(dx * dx + dy * dy);
        // Distance from current wave front
        const distFromFront = Math.abs(r - pulseR);
        // Peak boost when very close to the front
        const boost = Math.max(0, 1 - distFromFront * 1.4) * pulseFade;
        sizes[i] = baseSizes[i] + boost * 1.4;
      }
      particleGeo.attributes.size.needsUpdate = true;

      // ---- 3) Whole-cloud rotation + mouse parallax
      particles.rotation.y = t * 0.025 + mouse.x * 0.15;
      particles.rotation.x = mouse.y * 0.10;
      lines.rotation.copy(particles.rotation);

      // ---- 4) Rebuild breathing connections
      rebuildConnections();

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
