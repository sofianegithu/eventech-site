// Eventech — minimal interactions

(function () {
  'use strict';

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
