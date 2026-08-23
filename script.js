// Eventech — minimal interactions

(function () {
  'use strict';

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
})();
