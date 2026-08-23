// Eventech — minimal interactions

(function () {
  'use strict';

  // ---- Three.js hero scene (WebGL particle + wireframe field)
  function setupHeroScene() {
    if (!window.THREE) return;
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    const isMobile = window.innerWidth < 768;
    const isLowPower = isMobile;

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
      // WebGL not available — gracefully degrade, CSS particles still show
      return;
    }
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const ink = 0x0a0a0a;
    const coral = 0xff5b4a;

    // ---- Central focal group: wireframe sphere (hero) + nested icosahedrons + 2 rings
    const group = new THREE.Group();
    scene.add(group);

    // Wireframe sphere (the hero element) — sparse, low opacity
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 24, 16),
      new THREE.MeshBasicMaterial({ color: ink, wireframe: true, transparent: true, opacity: 0.08 })
    );
    group.add(sphere);

    // Filled sphere with very low opacity, so the wireframe reads as a shell
    const sphereCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 32, 24),
      new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.025, side: THREE.BackSide })
    );
    group.add(sphereCore);

    const icoOuter = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.0, 1),
      new THREE.MeshBasicMaterial({ color: ink, wireframe: true, transparent: true, opacity: 0.05 })
    );
    group.add(icoOuter);

    const icoInner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.0, 0),
      new THREE.MeshBasicMaterial({ color: ink, wireframe: true, transparent: true, opacity: 0.10 })
    );
    group.add(icoInner);

    // One coral accent: a small ring at a tilted angle
    const coralRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.005, 8, 120),
      new THREE.MeshBasicMaterial({ color: coral, transparent: true, opacity: 0.4 })
    );
    coralRing.rotation.x = Math.PI / 2.2;
    coralRing.rotation.z = Math.PI / 5;
    group.add(coralRing);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.1, 0.004, 6, 140),
      new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.13 })
    );
    ring.rotation.x = Math.PI / 2.4;
    group.add(ring);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.7, 0.003, 6, 140),
      new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.07 })
    );
    ring2.rotation.x = Math.PI / 1.6;
    ring2.rotation.z = Math.PI / 4;
    group.add(ring2);

    // ---- Particle field (sphere distribution, 200–400 points) with a sprinkle of coral
    const particleCount = isLowPower ? 140 : 320;
    const positions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.4 + Math.random() * 4.5;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      // ~8% of particles are coral as accent points
      if (Math.random() < 0.08) {
        particleColors[i * 3]     = 1.0;
        particleColors[i * 3 + 1] = 0.357;
        particleColors[i * 3 + 2] = 0.290;
      } else {
        particleColors[i * 3]     = 0.039;
        particleColors[i * 3 + 1] = 0.039;
        particleColors[i * 3 + 2] = 0.039;
      }
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({
        size: 0.025,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true
      })
    );
    scene.add(particles);

    // ---- Connection lines (only between particles that are within distance)
    const lineVerts = [];
    const maxDist = isLowPower ? 0.7 : 0.85;
    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        const dx = positions[i * 3]     - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < maxDist) {
          lineVerts.push(
            positions[i * 3],     positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3],     positions[j * 3 + 1], positions[j * 3 + 2]
          );
        }
      }
    }
    const lines = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lineVerts, 3)),
      new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.05 })
    );
    scene.add(lines);

    // ---- Mouse interaction (gentle parallax)
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    document.addEventListener('mousemove', onMove, { passive: true });

    // ---- Visibility — pause when tab hidden to save CPU
    let isVisible = true;
    document.addEventListener('visibilitychange', () => {
      isVisible = !document.hidden;
    });

    // ---- Resize
    const onResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ---- Animation loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!isVisible) return;

      const t = clock.getElapsedTime();
      // Smooth mouse
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      // Rotate the central group — sphere + icosahedrons + rings, all drifting
      sphere.rotation.y = t * 0.05;
      sphere.rotation.x = t * 0.025;
      icoOuter.rotation.x = t * 0.04;
      icoOuter.rotation.y = t * 0.06;
      icoInner.rotation.x = -t * 0.09;
      icoInner.rotation.y = -t * 0.07;
      coralRing.rotation.y = t * 0.22;
      coralRing.rotation.z = Math.PI / 5 + t * 0.05;
      ring.rotation.z = t * 0.12;
      ring2.rotation.z = -t * 0.09;
      ring2.rotation.y = t * 0.04;

      // Subtle mouse parallax on the central group
      group.position.x = mouse.x * 0.22;
      group.position.y = mouse.y * 0.22;

      // Particle field orbits + mouse influence
      particles.rotation.y = t * 0.025 + mouse.x * 0.15;
      particles.rotation.x = t * 0.015 + mouse.y * 0.1;
      lines.rotation.copy(particles.rotation);

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
